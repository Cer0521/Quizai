const jwt = require('jsonwebtoken');
const { dbGet } = require('../db');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
      return res.status(401).json({ message: 'Unauthenticated.' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const normalizedId = Number.parseInt(decoded?.id, 10);
    const decodedEmail = typeof decoded?.email === 'string' ? decoded.email.trim().toLowerCase() : '';

    let rawUser;
    try {
      if (Number.isInteger(normalizedId)) {
        rawUser = await dbGet('SELECT * FROM users WHERE id = ?', [normalizedId]);
      }

      if (!rawUser && decodedEmail) {
        rawUser = await dbGet('SELECT * FROM users WHERE lower(email) = ?', [decodedEmail]);
      }
    } catch (err) {
      console.error('Auth middleware DB lookup error:', err?.message || err);
      return res.status(503).json({ message: 'Authentication service temporarily unavailable.' });
    }

    const user = rawUser
      ? {
          id: rawUser.id,
          name: rawUser.name,
          email: rawUser.email,
          role: rawUser.role,
          plan: rawUser.plan || 'FREE',
          quiz_count: rawUser.quiz_count || 0,
          billing_cycle_start: rawUser.billing_cycle_start || null,
          team_id: rawUser.team_id ?? null,
          team_role: rawUser.team_role || 'OWNER',
          email_verified_at: rawUser.email_verified_at || null,
          created_at: rawUser.created_at,
        }
      : null;
    if (!user) return res.status(401).json({ message: 'Unauthenticated.' });

    req.user = user;
    next();
  } catch (err) {
    const tokenErrorNames = new Set(['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError']);
    if (tokenErrorNames.has(err?.name)) {
      return res.status(401).json({ message: 'Unauthenticated.' });
    }

    console.error('Auth middleware token verification error:', err?.message || err);
    return res.status(503).json({ message: 'Authentication service temporarily unavailable.' });
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
