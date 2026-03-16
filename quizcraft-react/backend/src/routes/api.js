const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate, requireVerified, requireTeacher } = require('../middleware/auth');
const quizController = require('../controllers/quiz');
const attemptController = require('../controllers/attempt');
const subscriptionController = require('../controllers/subscription');

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

// ── Public: Quiz by share code ─────────────────────────
router.get('/quiz/share/:code', quizController.getByShareCode);

// ── Public: Guest quiz taking ──────────────────────────
router.post('/quiz/guest/start', attemptController.startGuestAttempt);
router.put('/quiz/guest/attempts/:id/answers', attemptController.saveGuestAnswers);
router.post('/quiz/guest/attempts/:id/submit', attemptController.submitGuestAttempt);
router.get('/quiz/guest/attempts/:id/result', attemptController.getGuestResult);

// ── Subscription ───────────────────────────────────────
router.get('/subscription', authenticate, subscriptionController.getSubscription);
router.post('/subscription/upgrade', authenticate, subscriptionController.upgradeSubscription);
router.post('/subscription/referral', authenticate, subscriptionController.applyReferral);
router.get('/subscription/referral-stats', authenticate, subscriptionController.getReferralStats);
router.get('/subscription/limits', authenticate, subscriptionController.checkLimits);

// ── AI Grading ─────────────────────────────────────────
router.post('/grading/grade-essay', authenticate, async (req, res) => {
  try {
    const { question, correctAnswer, studentAnswer, maxPoints } = req.body;
    const { gradeEssay } = require('../services/grading');
    
    if (!question || !studentAnswer) {
      return res.status(400).json({ message: 'Question and student answer are required.' });
    }

    const result = await gradeEssay(question, correctAnswer, studentAnswer, maxPoints || 1);
    res.json(result);
  } catch (err) {
    console.error('Grading error:', err);
    res.status(500).json({ message: err.message || 'Grading failed.' });
  }
});

router.post('/grading/grade-enumeration', authenticate, async (req, res) => {
  try {
    const { question, correctAnswers, studentAnswers, maxPoints } = req.body;
    const { gradeEnumeration } = require('../services/grading');
    
    if (!question || !studentAnswers) {
      return res.status(400).json({ message: 'Question and student answers are required.' });
    }

    const result = await gradeEnumeration(question, correctAnswers, studentAnswers, maxPoints || 1);
    res.json(result);
  } catch (err) {
    console.error('Grading error:', err);
    res.status(500).json({ message: err.message || 'Grading failed.' });
  }
});

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

// ── Authenticated quiz taking ──────────────────────────
router.get('/quizzes/:quizId/attempt', authenticate, requireVerified, attemptController.startOrResume);
router.put('/attempts/:id/answers', authenticate, requireVerified, attemptController.saveAnswers);
router.post('/attempts/:id/submit', authenticate, requireVerified, attemptController.submit);
router.get('/attempts/history', authenticate, requireVerified, attemptController.history);
router.get('/attempts/:id/result', authenticate, requireVerified, attemptController.getResult);

// ── Teacher dashboard stats ────────────────────────────
router.get('/dashboard/stats', ...ta, async (req, res) => {
  try {
    const { supabaseAdmin } = require('../supabase');
    
    // Get quiz count
    const { count: totalQuizzes } = await supabaseAdmin
      .from('quizzes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    // Get total attempts across all quizzes
    const { data: userQuizzes } = await supabaseAdmin
      .from('quizzes')
      .select('id')
      .eq('user_id', req.user.id);

    const quizIds = userQuizzes?.map(q => q.id) || [];
    
    let totalAttempts = 0;
    let avgScore = 0;

    if (quizIds.length > 0) {
      const { count, data: attempts } = await supabaseAdmin
        .from('quiz_attempts')
        .select('score', { count: 'exact' })
        .in('quiz_id', quizIds)
        .eq('is_submitted', true);

      totalAttempts = count || 0;

      if (attempts && attempts.length > 0) {
        const scores = attempts.map(a => a.score || 0);
        avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      }
    }

    // Get subscription
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    res.json({
      total_quizzes: totalQuizzes || 0,
      total_attempts: totalAttempts,
      average_score: avgScore ? parseFloat(avgScore.toFixed(1)) : 0,
      subscription: subscription || { tier: 'free', quiz_count_this_period: 0 }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
