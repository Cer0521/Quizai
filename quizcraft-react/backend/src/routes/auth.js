const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const {
  register,
  login,
  logout,
  getUser,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  refreshToken,
} = require('../controllers/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/logout', authenticate, logout);
router.get('/user', authenticate, getUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', authenticate, resendVerification);
router.post('/refresh', refreshToken);

module.exports = router;
