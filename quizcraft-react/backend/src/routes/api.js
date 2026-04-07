const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate, requireVerified, requireTeacher, requireStudent } = require('../middleware/auth');
const { enforceQuizLimit, checkPlanAccess, checkAdsVisibility } = require('../middleware/subscription');
const quizController = require('../controllers/quiz');
const dashboardController = require('../controllers/dashboard');
const profileController = require('../controllers/profile');
const assignmentController = require('../controllers/assignment');
const attemptController = require('../controllers/attempt');
const notificationController = require('../controllers/notification');
const guestController = require('../controllers/guest');
const subscriptionController = require('../controllers/subscription');
const teamController = require('../controllers/team');

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

// ── Subscription ───────────────────────────────────────
router.get('/user/subscription', authenticate, subscriptionController.getCurrentSubscription);
router.post('/subscription/upgrade', authenticate, subscriptionController.upgradePlan);
router.get('/user/ads-visibility', authenticate, checkAdsVisibility, subscriptionController.getAdsVisibility);

// ── Teacher middleware bundle ──────────────────────────
const ta = [authenticate, requireVerified, requireTeacher];

// ── Team ───────────────────────────────────────────────
router.post('/team/invite', ...ta, teamController.invite);
router.post('/team/join', ...ta, teamController.join);

// ── Teacher: quiz management ───────────────────────────
router.get('/quizzes', authenticate, requireVerified, quizController.index);
router.post('/quizzes/generate', ...ta, enforceQuizLimit, upload.single('document'), quizController.store);
router.post('/quizzes/manual', ...ta, quizController.storeManualDisabled);
router.get('/quizzes/:id', authenticate, requireVerified, quizController.show);
router.patch('/quizzes/:id', ...ta, quizController.update);
router.post('/quizzes/:id/publish', ...ta, quizController.publish);
router.delete('/quizzes/:id', ...ta, quizController.destroy);
router.post('/quizzes/:id/questions', ...ta, quizController.addQuestion);
router.put('/quizzes/:id/questions/:qid', ...ta, quizController.updateQuestion);
router.delete('/quizzes/:id/questions/:qid', ...ta, quizController.deleteQuestion);
router.get('/quizzes/:id/analytics', ...ta, checkPlanAccess('analytics_dashboard'), quizController.analytics);

// ── Assignments ─────────────────────────────────────────
router.get('/assignments', authenticate, requireVerified, assignmentController.index);
router.post('/assignments', ...ta, assignmentController.store);
router.delete('/assignments/:id', ...ta, assignmentController.destroy);
router.get('/students', ...ta, assignmentController.listStudents);

// ── Student: quiz taking ───────────────────────────────
const sa = [authenticate, requireVerified, requireStudent];
router.get('/assignments/:assignmentId/attempt', ...sa, attemptController.startOrResume);
router.patch('/attempts/:id/photo', ...sa, attemptController.patchPhoto);
router.put('/attempts/:id/answers', ...sa, attemptController.saveAnswers);
router.post('/attempts/:id/submit', ...sa, attemptController.submit);
router.get('/attempts/history', ...sa, attemptController.history);
router.get('/attempts/:id/result', authenticate, requireVerified, attemptController.getResult);

// ── Public: guest quiz access (no auth) ───────────────
router.get('/public/quiz/:token', guestController.getQuizByToken);
router.post('/public/quiz/:token/start', guestController.startAttempt);
router.put('/public/attempt/:id/answers', guestController.saveAnswers);
router.post('/public/attempt/:id/submit', guestController.submitAttempt);
router.get('/public/attempt/:id/result', guestController.getResult);

// ── Teacher dashboard stats ────────────────────────────
router.get('/dashboard/stats', ...ta, dashboardController.stats);

module.exports = router;
