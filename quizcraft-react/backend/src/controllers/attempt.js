const { dbGet, dbAll, dbRun } = require('../db');
const { gradeAllAnswers } = require('../services/grading');

// ── Student: start or resume attempt ─────────────────
async function startOrResume(req, res) {
  try {
    const assignment = await dbGet(
      'SELECT * FROM quiz_assignments WHERE id = ? AND student_id = ?',
      [req.params.assignmentId, req.user.id]
    );
    if (!assignment) return res.status(404).json({ message: 'Assignment not found.' });

    // Check for in-progress attempt
    let attempt = await dbGet(
      "SELECT * FROM attempts WHERE assignment_id = ? AND student_id = ? AND status = 'in_progress'",
      [assignment.id, req.user.id]
    );

    if (!attempt) {
      // Create new attempt
      const result = await dbRun(
        'INSERT INTO attempts (assignment_id, student_id, quiz_id) VALUES (?,?,?)',
        [assignment.id, req.user.id, assignment.quiz_id]
      );
      await dbRun("UPDATE quiz_assignments SET status = 'in_progress' WHERE id = ?", [assignment.id]);
      attempt = await dbGet('SELECT * FROM attempts WHERE id = ?', [result.lastID]);
    }

    // Load questions
    const questions = await dbAll(
      'SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index',
      [assignment.quiz_id]
    );
    for (const q of questions) {
      q.options = await dbAll('SELECT * FROM options WHERE question_id = ? ORDER BY order_index', [q.id]);
    }

    // Load saved answers
    const savedAnswers = await dbAll('SELECT * FROM answers WHERE attempt_id = ?', [attempt.id]);

    const quiz = await dbGet('SELECT id, title, total_questions, time_limit, show_score FROM quizzes WHERE id = ?', [assignment.quiz_id]);

    return res.json({ attempt, quiz, questions, savedAnswers });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Student: save photo + display name ───────────────
async function patchPhoto(req, res) {
  try {
    const attempt = await dbGet(
      "SELECT * FROM attempts WHERE id = ? AND student_id = ? AND status = 'in_progress'",
      [req.params.id, req.user.id]
    );
    if (!attempt) return res.status(404).json({ message: 'Active attempt not found.' });
    const { student_display_name, photo_data } = req.body;
    await dbRun('UPDATE attempts SET student_display_name=?, photo_data=? WHERE id=?',
      [student_display_name || null, photo_data || null, attempt.id]);
    return res.json({ message: 'Profile saved.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Student: save answers (auto-save) ────────────────
async function saveAnswers(req, res) {
  try {
    const attempt = await dbGet(
      "SELECT * FROM attempts WHERE id = ? AND student_id = ? AND status = 'in_progress'",
      [req.params.id, req.user.id]
    );
    if (!attempt) return res.status(404).json({ message: 'Active attempt not found.' });

    const { answers } = req.body;
    if (!Array.isArray(answers)) return res.status(422).json({ message: 'answers must be an array.' });

    for (const ans of answers) {
      const existing = await dbGet('SELECT id FROM answers WHERE attempt_id = ? AND question_id = ?', [attempt.id, ans.question_id]);
      if (existing) {
        await dbRun('UPDATE answers SET answer_text=?, selected_option_id=? WHERE id=?',
          [ans.answer_text || null, ans.selected_option_id || null, existing.id]);
      } else {
        await dbRun('INSERT INTO answers (attempt_id, question_id, answer_text, selected_option_id) VALUES (?,?,?,?)',
          [attempt.id, ans.question_id, ans.answer_text || null, ans.selected_option_id || null]);
      }
    }
    return res.json({ message: 'Answers saved.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Student: submit attempt + score ──────────────────
async function submit(req, res) {
  try {
    const attempt = await dbGet(
      "SELECT * FROM attempts WHERE id = ? AND student_id = ? AND status = 'in_progress'",
      [req.params.id, req.user.id]
    );
    if (!attempt) return res.status(404).json({ message: 'Active attempt not found.' });

    const questions = await dbAll('SELECT * FROM questions WHERE quiz_id = ?', [attempt.quiz_id]);
    const answers = await dbAll('SELECT * FROM answers WHERE attempt_id = ?', [attempt.id]);

    const totalCorrect = await gradeAllAnswers(questions, answers, 'answers');

    const score = questions.length ? parseFloat(((totalCorrect / questions.length) * 100).toFixed(2)) : 0;
    const startedAt = new Date(attempt.started_at).getTime();
    const timeTaken = Math.floor((Date.now() - startedAt) / 1000);

    await dbRun(
      "UPDATE attempts SET score=?, total_correct=?, time_taken=?, submitted_at=datetime('now'), status='submitted' WHERE id=?",
      [score, totalCorrect, timeTaken, attempt.id]
    );
    await dbRun("UPDATE quiz_assignments SET status='completed' WHERE id=?", [attempt.assignment_id]);

    const quiz = await dbGet('SELECT title, user_id FROM quizzes WHERE id = ?', [attempt.quiz_id]);
    if (quiz) {
      await dbRun('INSERT INTO notifications (user_id, type, message) VALUES (?,?,?)',
        [quiz.user_id, 'quiz_submitted', `${req.user.name} completed "${quiz.title}" — Score: ${score}%`]);
    }

    return res.json({ message: 'Quiz submitted!', score, total_correct: totalCorrect, total_questions: questions.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Student/Teacher: get attempt result ──────────────
async function getResult(req, res) {
  try {
    const attempt = await dbGet("SELECT * FROM attempts WHERE id = ? AND status = 'submitted'", [req.params.id]);
    if (!attempt) return res.status(404).json({ message: 'Result not found.' });

    const quiz = await dbGet('SELECT * FROM quizzes WHERE id = ?', [attempt.quiz_id]);
    if (attempt.student_id !== req.user.id && quiz?.user_id !== req.user.id)
      return res.status(403).json({ message: 'Forbidden.' });

    const questions = await dbAll('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index', [attempt.quiz_id]);
    for (const q of questions) {
      q.options = await dbAll('SELECT * FROM options WHERE question_id = ? ORDER BY order_index', [q.id]);
      q.student_answer = await dbGet('SELECT * FROM answers WHERE attempt_id = ? AND question_id = ?', [attempt.id, q.id]);
    }

    return res.json({
      attempt,
      quiz: { id: quiz.id, title: quiz.title, total_questions: quiz.total_questions, show_score: quiz.show_score ?? 1 },
      questions,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Student: attempt history ──────────────────────────
async function history(req, res) {
  try {
    const rows = await dbAll(
      `SELECT a.*, q.title as quiz_title, q.total_questions
       FROM attempts a
       JOIN quizzes q ON a.quiz_id = q.id
       WHERE a.student_id = ? AND a.status = 'submitted'
       ORDER BY a.submitted_at DESC`,
      [req.user.id]
    );
    return res.json({ attempts: rows });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = { startOrResume, patchPhoto, saveAnswers, submit, getResult, history };
