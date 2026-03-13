const { dbGet, dbAll, dbRun } = require('../db');

// ── Teacher: list assignments for a quiz ─────────────
// ── Student: list their assignments ──────────────────
async function index(req, res) {
  try {
    if (req.user.role === 'teacher') {
      const rows = await dbAll(
        `SELECT qa.*, q.title as quiz_title, u.name as student_name, u.email as student_email
         FROM quiz_assignments qa
         JOIN quizzes q ON qa.quiz_id = q.id
         JOIN users u ON qa.student_id = u.id
         WHERE q.user_id = ?
         ORDER BY qa.assigned_at DESC`,
        [req.user.id]
      );
      return res.json({ assignments: rows });
    } else {
      const rows = await dbAll(
        `SELECT qa.*, q.title as quiz_title, q.total_questions, q.time_limit, q.description,
                u.name as teacher_name
         FROM quiz_assignments qa
         JOIN quizzes q ON qa.quiz_id = q.id
         JOIN users u ON qa.assigned_by = u.id
         WHERE qa.student_id = ?
         ORDER BY qa.assigned_at DESC`,
        [req.user.id]
      );
      // Attach latest attempt score to each assignment
      for (const row of rows) {
        const attempt = await dbGet(
          `SELECT score, total_correct, submitted_at, status FROM attempts
           WHERE assignment_id = ? AND student_id = ? AND status = 'submitted'
           ORDER BY submitted_at DESC LIMIT 1`,
          [row.id, req.user.id]
        );
        row.latest_attempt = attempt || null;
      }
      return res.json({ assignments: rows });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Teacher: assign quiz to students ─────────────────
async function store(req, res) {
  try {
    const { quiz_id, student_ids, due_date } = req.body;
    if (!quiz_id || !student_ids?.length)
      return res.status(422).json({ errors: { general: ['quiz_id and student_ids are required.'] } });

    const quiz = await dbGet('SELECT * FROM quizzes WHERE id = ? AND user_id = ?', [quiz_id, req.user.id]);
    if (!quiz) return res.status(403).json({ message: 'Forbidden or quiz not found.' });

    const results = [];
    for (const sid of student_ids) {
      try {
        await dbRun(
          'INSERT OR IGNORE INTO quiz_assignments (quiz_id, student_id, assigned_by, due_date) VALUES (?,?,?,?)',
          [quiz_id, sid, req.user.id, due_date || null]
        );
        // Create notification for student
        await dbRun(
          'INSERT INTO notifications (user_id, type, message) VALUES (?,?,?)',
          [sid, 'quiz_assigned', `You have been assigned a new quiz: "${quiz.title}"`]
        );
        results.push({ student_id: sid, status: 'assigned' });
      } catch {
        results.push({ student_id: sid, status: 'skipped' });
      }
    }
    return res.status(201).json({ results, message: 'Quiz assigned successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Teacher: revoke assignment ────────────────────────
async function destroy(req, res) {
  try {
    const assignment = await dbGet(
      'SELECT qa.*, q.user_id FROM quiz_assignments qa JOIN quizzes q ON qa.quiz_id = q.id WHERE qa.id = ?',
      [req.params.id]
    );
    if (!assignment || assignment.user_id !== req.user.id)
      return res.status(403).json({ message: 'Forbidden.' });
    await dbRun('DELETE FROM quiz_assignments WHERE id = ?', [assignment.id]);
    return res.json({ message: 'Assignment revoked.' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
}

// ── Teacher: list all students ────────────────────────
async function listStudents(req, res) {
  try {
    const students = await dbAll(
      "SELECT id, name, email, created_at FROM users WHERE role = 'student' ORDER BY name",
      []
    );
    return res.json({ students });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = { index, store, destroy, listStudents };
