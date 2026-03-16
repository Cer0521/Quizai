const { randomUUID } = require('crypto');
const { dbGet, dbAll, dbRun } = require('../db');
const { gradeAllAnswers } = require('../services/grading');

// ── Public: load quiz by share token ─────────────────
async function getQuizByToken(req, res) {
  try {
    const quiz = await dbGet(
      'SELECT id, title, description, total_questions, time_limit, show_score FROM quizzes WHERE share_token = ? AND is_published = 1',
      [req.params.token]
    );
    if (!quiz) return res.status(404).json({ message: 'Quiz not found or not published.' });

    const questions = await dbAll('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index', [quiz.id]);
    for (const q of questions) {
      q.options = await dbAll('SELECT * FROM options WHERE question_id = ? ORDER BY order_index', [q.id]);
    }

    return res.json({ quiz, questions });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Public: start a guest attempt ────────────────────
async function startAttempt(req, res) {
  try {
    const quiz = await dbGet(
      'SELECT id, title, total_questions, time_limit, show_score FROM quizzes WHERE share_token = ? AND is_published = 1',
      [req.params.token]
    );
    if (!quiz) return res.status(404).json({ message: 'Quiz not found or not published.' });

    const { name, photo_data } = req.body;
    if (!name || !name.trim()) return res.status(422).json({ message: 'Name is required.' });

    const attemptToken = randomUUID();
    const result = await dbRun(
      'INSERT INTO guest_attempts (quiz_id, attempt_token, student_display_name, photo_data) VALUES (?,?,?,?)',
      [quiz.id, attemptToken, name.trim(), photo_data || null]
    );
    const attempt = await dbGet('SELECT * FROM guest_attempts WHERE id = ?', [result.lastID]);

    const questions = await dbAll('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index', [quiz.id]);
    for (const q of questions) {
      q.options = await dbAll('SELECT * FROM options WHERE question_id = ? ORDER BY order_index', [q.id]);
    }

    return res.status(201).json({ attempt, quiz, questions, savedAnswers: [] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Public: save guest answers (auto-save) ────────────
async function saveAnswers(req, res) {
  try {
    const { attempt_token, answers } = req.body;
    if (!attempt_token) return res.status(422).json({ message: 'attempt_token is required.' });

    const attempt = await dbGet(
      "SELECT * FROM guest_attempts WHERE id = ? AND attempt_token = ? AND status = 'in_progress'",
      [req.params.id, attempt_token]
    );
    if (!attempt) return res.status(404).json({ message: 'Active attempt not found.' });
    if (!Array.isArray(answers)) return res.status(422).json({ message: 'answers must be an array.' });

    for (const ans of answers) {
      const existing = await dbGet('SELECT id FROM guest_answers WHERE guest_attempt_id = ? AND question_id = ?', [attempt.id, ans.question_id]);
      if (existing) {
        await dbRun('UPDATE guest_answers SET answer_text=?, selected_option_id=? WHERE id=?',
          [ans.answer_text || null, ans.selected_option_id || null, existing.id]);
      } else {
        await dbRun('INSERT INTO guest_answers (guest_attempt_id, question_id, answer_text, selected_option_id) VALUES (?,?,?,?)',
          [attempt.id, ans.question_id, ans.answer_text || null, ans.selected_option_id || null]);
      }
    }
    return res.json({ message: 'Answers saved.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Public: submit guest attempt + score ──────────────
async function submitAttempt(req, res) {
  try {
    const { attempt_token } = req.body;
    if (!attempt_token) return res.status(422).json({ message: 'attempt_token is required.' });

    const attempt = await dbGet(
      "SELECT * FROM guest_attempts WHERE id = ? AND attempt_token = ? AND status = 'in_progress'",
      [req.params.id, attempt_token]
    );
    if (!attempt) return res.status(404).json({ message: 'Active attempt not found.' });

    const questions = await dbAll('SELECT * FROM questions WHERE quiz_id = ?', [attempt.quiz_id]);
    const answers = await dbAll('SELECT * FROM guest_answers WHERE guest_attempt_id = ?', [attempt.id]);

    const totalCorrect = await gradeAllAnswers(questions, answers, 'guest_answers');

    const score = questions.length ? parseFloat(((totalCorrect / questions.length) * 100).toFixed(2)) : 0;
    const startedAt = new Date(attempt.started_at).getTime();
    const timeTaken = Math.floor((Date.now() - startedAt) / 1000);

    await dbRun(
      "UPDATE guest_attempts SET score=?, total_correct=?, time_taken=?, submitted_at=datetime('now'), status='submitted' WHERE id=?",
      [score, totalCorrect, timeTaken, attempt.id]
    );

    // Notify teacher
    const quiz = await dbGet('SELECT title, user_id FROM quizzes WHERE id = ?', [attempt.quiz_id]);
    if (quiz) {
      await dbRun('INSERT INTO notifications (user_id, type, message) VALUES (?,?,?)',
        [quiz.user_id, 'quiz_submitted', `${attempt.student_display_name} (guest) completed "${quiz.title}" — Score: ${score}%`]);
    }

    return res.json({ message: 'Quiz submitted!', score, total_correct: totalCorrect, total_questions: questions.length, show_score: quiz?.show_score ?? 1 });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Public: get guest result ──────────────────────────
async function getResult(req, res) {
  try {
    const { token } = req.query;
    if (!token) return res.status(422).json({ message: 'token query param is required.' });

    const attempt = await dbGet(
      "SELECT * FROM guest_attempts WHERE id = ? AND attempt_token = ? AND status = 'submitted'",
      [req.params.id, token]
    );
    if (!attempt) return res.status(404).json({ message: 'Result not found.' });

    const quiz = await dbGet('SELECT id, title, total_questions, show_score FROM quizzes WHERE id = ?', [attempt.quiz_id]);

    const questions = await dbAll('SELECT * FROM questions WHERE quiz_id = ? ORDER BY order_index', [attempt.quiz_id]);
    for (const q of questions) {
      q.options = await dbAll('SELECT * FROM options WHERE question_id = ? ORDER BY order_index', [q.id]);
      q.student_answer = await dbGet('SELECT * FROM guest_answers WHERE guest_attempt_id = ? AND question_id = ?', [attempt.id, q.id]);
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

module.exports = { getQuizByToken, startAttempt, saveAnswers, submitAttempt, getResult };
