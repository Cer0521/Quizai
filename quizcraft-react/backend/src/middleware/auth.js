const jwt = require('jsonwebtoken');
const { dbGet } = require('../db');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
      return res.status(401).json({ message: 'Unauthenticated.' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await dbGet(
      'SELECT id, name, email, role, email_verified_at, created_at FROM users WHERE id = ?',
      [decoded.id]
    );
    if (!user) return res.status(401).json({ message: 'Unauthenticated.' });

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Unauthenticated.' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role)
      return res.status(403).json({ message: `Access denied. ${role} role required.` });
    next();
  };
}

const requireTeacher = requireRole('teacher');
const requireStudent = requireRole('student');

/**
 * requireVerified — skipped in development mode so you can test without email setup.
 * Set REQUIRE_EMAIL_VERIFICATION=true in .env to enforce it in production.
 */
async function requireVerified(req, res, next) {
  const enforce = process.env.REQUIRE_EMAIL_VERIFICATION === 'true';
  if (enforce && !req.user.email_verified_at) {
    return res.status(403).json({
      message: 'Your email address is not verified.',
      code: 'EMAIL_NOT_VERIFIED',
    });
  }
  next();
}

module.exports = { authenticate, requireVerified, requireTeacher, requireStudent };
