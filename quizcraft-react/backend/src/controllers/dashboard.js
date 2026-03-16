const { dbGet } = require('../db');
const { getSupabaseClient } = require('../services/supabase');

async function stats(req, res) {
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.rpc('get_teacher_dashboard_stats', {
        p_user_id: req.user.id,
      });
      if (error) return res.status(500).json({ message: error.message });
      return res.json(data || {
        total_quizzes: 0,
        total_students: 0,
        total_assignments: 0,
        average_score: 0,
      });
    }

    const [totalQuizzes, publishedQuizzes, totalStudents, totalAssignments, avgScore] = await Promise.all([
      dbGet('SELECT COUNT(*) as c FROM quizzes WHERE user_id = ?', [req.user.id]),
      dbGet('SELECT COUNT(*) as c FROM quizzes WHERE user_id = ? AND is_published = 1', [req.user.id]),
      dbGet("SELECT COUNT(*) as c FROM users WHERE role = 'student'", []),
      dbGet('SELECT COUNT(*) as c FROM quiz_assignments qa JOIN quizzes q ON qa.quiz_id = q.id WHERE q.user_id = ?', [req.user.id]),
      dbGet("SELECT AVG(a.score) as avg FROM attempts a JOIN quizzes q ON a.quiz_id = q.id WHERE q.user_id = ? AND a.status = 'submitted'", [req.user.id]),
    ]);

    const averageScore = avgScore?.avg !== null && avgScore?.avg !== undefined
      ? Number(parseFloat(avgScore.avg).toFixed(1))
      : 0;

    return res.json({
      total_quizzes: totalQuizzes?.c || 0,
      published_quizzes: publishedQuizzes?.c || 0,
      total_students: totalStudents?.c || 0,
      total_assignments: totalAssignments?.c || 0,
      average_score: averageScore,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = { stats };
