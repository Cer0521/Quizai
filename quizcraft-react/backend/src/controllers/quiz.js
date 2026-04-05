const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { dbGet, dbAll, dbRun } = require('../db');
const { getSupabaseClient } = require('../services/supabase');
const { generateFromDocument } = require('../services/gemini');
const {
  getFeatureAccess,
  incrementQuizUsage,
  isBasicQuizFormat,
} = require('../services/subscription');

function parseQuiz(row) {
  if (!row) return null;
  return {
    ...row,
    sections_config: row.sections_config ? JSON.parse(row.sections_config) : null,
    ai_response: row.ai_response ? JSON.parse(row.ai_response) : null,
  };
}

function canUseQuestionType(userPlan, questionType) {
  if (getFeatureAccess(userPlan, 'all_quiz_formats')) return true;
  return isBasicQuizFormat(questionType);
}

function resolveRequestPlan(req) {
  return req.subscription?.effective_plan || req.user?.plan || 'FREE';
}

// ── Teacher: list own quizzes ──────────────────────────
async function index(req, res) {
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.rpc('get_teacher_quizzes', { p_user_id: req.user.id });
      if (error) return res.status(500).json({ message: error.message });
      return res.json({ quizzes: data || [] });
    }

    const rows = await dbAll(
      `SELECT q.id, q.title, q.description, q.source_type, q.total_questions,
              q.is_published, q.time_limit, q.share_token, q.show_score, q.created_at,
              (SELECT COUNT(*) FROM quiz_assignments WHERE quiz_id = q.id) AS assigned_count,
              (SELECT COUNT(DISTINCT a.student_id) FROM attempts a WHERE a.quiz_id = q.id AND a.status = 'submitted') AS completed_count,
              (SELECT COUNT(DISTINCT ga.id) FROM guest_attempts ga WHERE ga.quiz_id = q.id AND ga.status = 'submitted') AS guest_completed_count
       FROM quizzes q WHERE q.user_id = ? ORDER BY q.created_at DESC`,
      [req.user.id]
    );
    // Add total completed count (registered + guests)
    const quizzesWithTotals = rows.map(q => ({
      ...q,
      total_completed: (q.completed_count || 0) + (q.guest_completed_count || 0)
    }));
    return res.json({ quizzes: quizzesWithTotals });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Teacher: get single quiz with questions ────────────
async function show(req, res) {
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.rpc('get_teacher_quiz_detail', {
        p_quiz_id: req.params.id,
        p_user_id: req.user.id,
      });
      if (error) return res.status(404).json({ message: error.message });
      return res.json({ quiz: data });
    }

    const quiz = await dbGet('SELECT * FROM quizzes WHERE id = ?', [req.params.id]);
    if (!quiz) return res.status(404).json({ message: 'Not found.' });
    if (quiz.user_id !== req.user.id) return res.status(403).json({ message: 'Forbidden.' });

    const questions = await dbAll(
      'SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index',
      [quiz.id]
    );
    for (const q of questions) {
      q.options = await dbAll('SELECT * FROM options WHERE question_id = ? ORDER BY order_index', [q.id]);
    }
    const parsed = parseQuiz(quiz);
    parsed.questions = questions;
    return res.json({ quiz: parsed });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Teacher: create quiz via AI upload ─────────────────
async function store(req, res) {
  try {
    const { title, description, total_questions, sections, time_limit } = req.body;
    const file = req.file;
    if (!title || !total_questions || !sections || !file)
      return res.status(422).json({ errors: { general: ['All fields including document are required.'] } });

    const parsedSections = typeof sections === 'string' ? JSON.parse(sections) : sections;
    const totalAssigned = parsedSections.reduce((sum, s) => sum + parseInt(s.count), 0);
    const totalQ = parseInt(total_questions);
    if (totalAssigned !== totalQ)
      return res.status(422).json({ errors: { sections: [`Sections total (${totalAssigned}) must equal Total Questions (${totalQ}).`] } });

    const mimeType = file.mimetype;
    const base64Data = fs.readFileSync(file.path).toString('base64');

    const result = await dbRun(
      `INSERT INTO quizzes (user_id, title, description, source_type, file_path, total_questions, sections_config, time_limit)
       VALUES (?, ?, ?, 'ai', ?, ?, ?, ?)`,
      [req.user.id, title, description || null, file.path, totalQ, JSON.stringify(parsedSections), time_limit || null]
    );
    const quizId = result.lastID;

    let prompt = `You are an expert educator. Create a comprehensive assessment based ONLY on the provided document. The test must have exactly ${totalQ} questions. Follow this exact blueprint:\n\n`;
    parsedSections.forEach((section, i) => {
      prompt += `Section ${i + 1}: ${section.count} Questions, Format: ${section.type}.\n`;
    });
    prompt += `\nReturn the output STRICTLY as a JSON object with a 'sections' array. Each section must have a 'title', 'type', and an array of 'questions'. Each question must have the 'question_text', an array of 'options' (if multiple choice), and the 'correct_answer'. For Essay questions, 'correct_answer' should describe the key points expected in a good answer.`;

    const aiResponse = await generateFromDocument(prompt, mimeType, base64Data);
    await dbRun('UPDATE quizzes SET ai_response = ?, updated_at = datetime("now") WHERE id = ?', [JSON.stringify(aiResponse), quizId]);

    // Persist questions + options from AI response into normalized tables
    if (aiResponse?.sections) {
      let orderIdx = 0;
      for (const section of aiResponse.sections) {
        const qType = section.type === 'True or False' ? 'true_false'
          : section.type === 'Enumeration' ? 'enumeration'
          : section.type === 'Essay' ? 'essay'
          : 'multiple_choice';
        for (const q of (section.questions || [])) {
          const qRes = await dbRun(
            'INSERT INTO questions (quiz_id, question_text, question_type, correct_answer, order_index) VALUES (?,?,?,?,?)',
            [quizId, q.question_text || q.question, qType, q.correct_answer || q.answer || '', orderIdx++]
          );
          if (q.options && Array.isArray(q.options)) {
            const labels = ['A', 'B', 'C', 'D', 'E'];
            for (let i = 0; i < q.options.length; i++) {
              await dbRun('INSERT INTO options (question_id, option_text, option_label, order_index) VALUES (?,?,?,?)',
                [qRes.lastID, q.options[i], labels[i] || String(i + 1), i]);
            }
          }
        }
      }
      await dbRun('UPDATE quizzes SET total_questions = ? WHERE id = ?', [orderIdx, quizId]);
    }

    const quiz = await dbGet('SELECT * FROM quizzes WHERE id = ?', [quizId]);

    if (req.subscription?.plan === 'FREE') {
      await incrementQuizUsage(req.user.id);
    }

    return res.status(201).json({ quiz: parseQuiz(quiz), message: 'Assessment generated successfully!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message || 'Server error.' });
  }
}

// ── Teacher: manual quiz creation disabled ────────────
async function storeManualDisabled(req, res) {
  return res.status(410).json({
    message: 'Manual quiz creation is no longer available. Please use AI Generate.',
  });
}

// ── Teacher: update quiz meta + questions ─────────────
async function update(req, res) {
  try {
    const quiz = await dbGet('SELECT * FROM quizzes WHERE id = ?', [req.params.id]);
    if (!quiz) return res.status(404).json({ message: 'Not found.' });
    if (quiz.user_id !== req.user.id) return res.status(403).json({ message: 'Forbidden.' });

    const { title, description, ai_response, time_limit, is_published, show_score } = req.body;
    if (!title) return res.status(422).json({ errors: { title: ['Title is required.'] } });

    const newAi = ai_response ? JSON.stringify(ai_response) : quiz.ai_response;
    await dbRun(
      `UPDATE quizzes SET title=?, description=?, ai_response=?, time_limit=?, is_published=?, show_score=?, updated_at=datetime('now') WHERE id=?`,
      [title, description ?? quiz.description, newAi, time_limit ?? quiz.time_limit, is_published ?? quiz.is_published, show_score ?? quiz.show_score ?? 1, quiz.id]
    );
    const updated = await dbGet('SELECT * FROM quizzes WHERE id = ?', [quiz.id]);
    return res.json({ quiz: parseQuiz(updated), message: 'Assessment updated successfully!' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Teacher: publish toggle ────────────────────────────
async function publish(req, res) {
  try {
    const quiz = await dbGet('SELECT * FROM quizzes WHERE id = ?', [req.params.id]);
    if (!quiz) return res.status(404).json({ message: 'Not found.' });
    if (quiz.user_id !== req.user.id) return res.status(403).json({ message: 'Forbidden.' });
    const newVal = quiz.is_published ? 0 : 1;
    // Generate a share token the first time this quiz is published
    const shareToken = quiz.share_token || randomUUID();
    await dbRun('UPDATE quizzes SET is_published=?, share_token=?, updated_at=datetime("now") WHERE id=?', [newVal, shareToken, quiz.id]);
    return res.json({ is_published: newVal, share_token: shareToken });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Teacher: delete quiz ───────────────────────────────
async function destroy(req, res) {
  try {
    const quiz = await dbGet('SELECT * FROM quizzes WHERE id = ?', [req.params.id]);
    if (!quiz) return res.status(404).json({ message: 'Not found.' });
    if (quiz.user_id !== req.user.id) return res.status(403).json({ message: 'Forbidden.' });
    if (quiz.file_path && fs.existsSync(quiz.file_path)) fs.unlinkSync(quiz.file_path);
    await dbRun('DELETE FROM quizzes WHERE id = ?', [quiz.id]);
    return res.json({ message: 'Assessment deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Teacher: add question ──────────────────────────────
async function addQuestion(req, res) {
  try {
    const quiz = await dbGet('SELECT * FROM quizzes WHERE id = ?', [req.params.id]);
    if (!quiz || quiz.user_id !== req.user.id) return res.status(403).json({ message: 'Forbidden.' });

    const { question_text, question_type, correct_answer, options } = req.body;
    const resolvedType = question_type || 'multiple_choice';

    const currentPlan = resolveRequestPlan(req);
    if (!canUseQuestionType(currentPlan, resolvedType)) {
      return res.status(403).json({
        message: 'This question format is not available on your current plan.',
        code: 'FEATURE_LOCKED',
        feature: 'all_quiz_formats',
        plan: currentPlan,
      });
    }

    if (!question_text || !correct_answer)
      return res.status(422).json({ errors: { general: ['Question text and correct answer are required.'] } });

    const maxIdx = await dbGet('SELECT MAX(order_index) as m FROM questions WHERE quiz_id = ?', [quiz.id]);
    const orderIndex = (maxIdx?.m ?? -1) + 1;

    const qRes = await dbRun(
      'INSERT INTO questions (quiz_id, question_text, question_type, correct_answer, order_index) VALUES (?,?,?,?,?)',
      [quiz.id, question_text, resolvedType, correct_answer, orderIndex]
    );

    if (options && Array.isArray(options)) {
      const labels = ['A', 'B', 'C', 'D', 'E'];
      for (let i = 0; i < options.length; i++) {
        await dbRun('INSERT INTO options (question_id, option_text, option_label, order_index) VALUES (?,?,?,?)',
          [qRes.lastID, options[i], labels[i] || String(i + 1), i]);
      }
    }

    await dbRun('UPDATE quizzes SET total_questions = total_questions + 1, updated_at = datetime("now") WHERE id = ?', [quiz.id]);
    const question = await dbGet('SELECT * FROM questions WHERE id = ?', [qRes.lastID]);
    question.options = await dbAll('SELECT * FROM options WHERE question_id = ? ORDER BY order_index', [qRes.lastID]);
    return res.status(201).json({ question });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Teacher: update question ───────────────────────────
async function updateQuestion(req, res) {
  try {
    const question = await dbGet('SELECT q.*, qz.user_id FROM questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE q.id = ?', [req.params.qid]);
    if (!question || question.user_id !== req.user.id) return res.status(403).json({ message: 'Forbidden.' });

    const { question_text, question_type, correct_answer, options } = req.body;
    const resolvedType = question_type || question.question_type;
    const currentPlan = resolveRequestPlan(req);
    if (!canUseQuestionType(currentPlan, resolvedType)) {
      return res.status(403).json({
        message: 'This question format is not available on your current plan.',
        code: 'FEATURE_LOCKED',
        feature: 'all_quiz_formats',
        plan: currentPlan,
      });
    }

    await dbRun('UPDATE questions SET question_text=?, question_type=?, correct_answer=? WHERE id=?',
      [question_text, resolvedType, correct_answer, question.id]);

    if (options && Array.isArray(options)) {
      await dbRun('DELETE FROM options WHERE question_id = ?', [question.id]);
      const labels = ['A', 'B', 'C', 'D', 'E'];
      for (let i = 0; i < options.length; i++) {
        await dbRun('INSERT INTO options (question_id, option_text, option_label, order_index) VALUES (?,?,?,?)',
          [question.id, options[i], labels[i] || String(i + 1), i]);
      }
    }

    const updated = await dbGet('SELECT * FROM questions WHERE id = ?', [question.id]);
    updated.options = await dbAll('SELECT * FROM options WHERE question_id = ? ORDER BY order_index', [question.id]);
    return res.json({ question: updated });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Teacher: delete question ───────────────────────────
async function deleteQuestion(req, res) {
  try {
    const question = await dbGet('SELECT q.*, qz.user_id, qz.id as quiz_fk FROM questions q JOIN quizzes qz ON q.quiz_id = qz.id WHERE q.id = ?', [req.params.qid]);
    if (!question || question.user_id !== req.user.id) return res.status(403).json({ message: 'Forbidden.' });
    await dbRun('DELETE FROM questions WHERE id = ?', [question.id]);
    await dbRun('UPDATE quizzes SET total_questions = MAX(0, total_questions - 1), updated_at = datetime("now") WHERE id = ?', [question.quiz_id]);
    return res.json({ message: 'Question deleted.' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Teacher: analytics ────────────────────────────────
async function analytics(req, res) {
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.rpc('get_quiz_analytics', {
        p_quiz_id: req.params.id,
        p_user_id: req.user.id,
      });
      if (error) return res.status(404).json({ message: error.message });
      return res.json(data);
    }

    const quiz = await dbGet('SELECT * FROM quizzes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!quiz) return res.status(404).json({ message: 'Not found.' });

    const assignments = await dbAll('SELECT * FROM quiz_assignments WHERE quiz_id = ?', [quiz.id]);
    const totalAssigned = assignments.length;
    const completed = assignments.filter(a => a.status === 'completed').length;
    const inProgress = assignments.filter(a => a.status === 'in_progress').length;
    const notStarted = assignments.filter(a => a.status === 'pending').length;

    // Get submitted attempts from registered students
    const submittedAttempts = await dbAll(
      `SELECT a.*, u.name, u.email FROM attempts a
       JOIN users u ON a.student_id = u.id
       WHERE a.quiz_id = ? AND a.status = 'submitted'
       ORDER BY a.submitted_at DESC`,
      [quiz.id]
    );

    // Get submitted attempts from guests
    const guestAttempts = await dbAll(
      `SELECT ga.*, ga.student_display_name as name, 'guest' as email
       FROM guest_attempts ga
       WHERE ga.quiz_id = ? AND ga.status = 'submitted'
       ORDER BY ga.submitted_at DESC`,
      [quiz.id]
    );

    // Combine both registered and guest attempts
    const allAttempts = [...submittedAttempts, ...guestAttempts];
    const scores = allAttempts.map(a => a.score || 0);
    const avgScore = scores.length ? (scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(2) : 0;
    const highestScore = scores.length ? Math.max(...scores) : 0;
    const lowestScore = scores.length ? Math.min(...scores) : 0;

    // Calculate pass/fail stats (passing grade is 60%)
    const passingGrade = 60;
    const passedCount = scores.filter(s => s >= passingGrade).length;
    const failedCount = scores.filter(s => s < passingGrade).length;
    const passRate = scores.length ? ((passedCount / scores.length) * 100).toFixed(2) : 0;

    const distribution = {
      low:       { range: '0–49%',   count: scores.filter(s => s < 50).length },
      medium:    { range: '50–74%',  count: scores.filter(s => s >= 50 && s < 75).length },
      high:      { range: '75–89%',  count: scores.filter(s => s >= 75 && s < 90).length },
      excellent: { range: '90–100%', count: scores.filter(s => s >= 90).length },
    };

    return res.json({
      quiz: { id: quiz.id, title: quiz.title, total_questions: quiz.total_questions },
      summary: {
        total_assigned: totalAssigned,
        total_completed: completed,
        total_in_progress: inProgress,
        total_not_started: notStarted,
        total_attempts: allAttempts.length,
        completion_rate: totalAssigned ? ((completed / totalAssigned) * 100).toFixed(2) : 0,
        average_score: parseFloat(avgScore),
        highest_score: highestScore,
        lowest_score: lowestScore,
        passed_count: passedCount,
        failed_count: failedCount,
        pass_rate: parseFloat(passRate),
        passing_grade: passingGrade,
      },
      score_distribution: distribution,
      students: allAttempts.map(a => ({
        student_id: a.student_id || null,
        name: a.name,
        email: a.email,
        score: a.score,
        total_correct: a.total_correct,
        time_taken: a.time_taken,
        submitted_at: a.submitted_at,
        status: a.status,
        photo_data: a.photo_data || null,
        is_guest: !a.student_id,
      })),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = { index, show, store, storeManualDisabled, update, publish, destroy, addQuestion, updateQuestion, deleteQuestion, analytics };
