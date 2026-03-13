const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate, requireVerified, requireTeacher, requireStudent } = require('../middleware/auth');
const quizController = require('../controllers/quiz');
const profileController = require('../controllers/profile');
const assignmentController = require('../controllers/assignment');
const attemptController = require('../controllers/attempt');
const notificationController = require('../controllers/notification');

// ── Multer ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['application/pdf', 'text/plain'].includes(file.mimetype)) cb(null, true);
    else cb(new Error('Document must be a PDF or text file.'));
  },
});

// ── Profile ────────────────────────────────────────────
router.patch('/profile', authenticate, profileController.updateProfile);
router.put('/profile/password', authenticate, profileController.updatePassword);
router.delete('/profile', authenticate, profileController.deleteAccount);

// ── Notifications ──────────────────────────────────────
router.get('/notifications', authenticate, notificationController.index);
router.post('/notifications/read', authenticate, notificationController.markRead);

// ── Teacher: quiz management ───────────────────────────
const ta = [authenticate, requireVerified, requireTeacher];
router.get('/quizzes', authenticate, requireVerified, quizController.index);
router.post('/quizzes/generate', ...ta, upload.single('document'), quizController.store);
router.post('/quizzes/manual', ...ta, quizController.storeManual);
router.get('/quizzes/:id', authenticate, requireVerified, quizController.show);
router.patch('/quizzes/:id', ...ta, quizController.update);
router.post('/quizzes/:id/publish', ...ta, quizController.publish);
router.delete('/quizzes/:id', ...ta, quizController.destroy);
router.post('/quizzes/:id/questions', ...ta, quizController.addQuestion);
router.put('/quizzes/:id/questions/:qid', ...ta, quizController.updateQuestion);
router.delete('/quizzes/:id/questions/:qid', ...ta, quizController.deleteQuestion);
router.get('/quizzes/:id/analytics', ...ta, quizController.analytics);

// ── Assignments ─────────────────────────────────────────
router.get('/assignments', authenticate, requireVerified, assignmentController.index);
router.post('/assignments', ...ta, assignmentController.store);
router.delete('/assignments/:id', ...ta, assignmentController.destroy);
router.get('/students', ...ta, assignmentController.listStudents);

// ── Student: quiz taking ───────────────────────────────
const sa = [authenticate, requireVerified, requireStudent];
router.get('/assignments/:assignmentId/attempt', ...sa, attemptController.startOrResume);
router.put('/attempts/:id/answers', ...sa, attemptController.saveAnswers);
router.post('/attempts/:id/submit', ...sa, attemptController.submit);
router.get('/attempts/history', ...sa, attemptController.history);
router.get('/attempts/:id/result', authenticate, requireVerified, attemptController.getResult);

// ── Teacher dashboard stats ────────────────────────────
router.get('/dashboard/stats', ...ta, async (req, res) => {
  try {
    const { dbGet } = require('../db');
    const [totalQuizzes, totalStudents, totalAssignments, avgScore] = await Promise.all([
      dbGet('SELECT COUNT(*) as c FROM quizzes WHERE user_id = ?', [req.user.id]),
      dbGet("SELECT COUNT(*) as c FROM users WHERE role = 'student'", []),
      dbGet('SELECT COUNT(*) as c FROM quiz_assignments qa JOIN quizzes q ON qa.quiz_id = q.id WHERE q.user_id = ?', [req.user.id]),
      dbGet('SELECT AVG(a.score) as avg FROM attempts a JOIN quizzes q ON a.quiz_id = q.id WHERE q.user_id = ? AND a.status = "submitted"', [req.user.id]),
    ]);
    res.json({
      total_quizzes: totalQuizzes?.c || 0,
      total_students: totalStudents?.c || 0,
      total_assignments: totalAssignments?.c || 0,
      average_score: avgScore?.avg ? parseFloat(avgScore.avg.toFixed(1)) : 0,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
