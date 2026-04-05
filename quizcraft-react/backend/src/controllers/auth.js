const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { dbGet, dbRun } = require('../db');
const { sendPasswordResetEmail, sendVerificationEmail } = require('../services/mail');

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function handleAuthError(res, scope, err) {
  console.error(`${scope} error:`, err);

  const msg = (err?.message || '').toString();
  if (msg.includes('Tenant or user not found')) {
    return res.status(503).json({
      errors: { general: ['Database auth failed. Check Supabase DATABASE_URL credentials on Render.'] },
    });
  }

  if (msg.includes('ETIMEDOUT') || msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) {
    return res.status(503).json({
      errors: { general: ['Database is unreachable right now. Please try again shortly.'] },
    });
  }

  return res.status(500).json({ errors: { general: ['Server error. Please try again.'] } });
}

async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return res.status(422).json({ errors: { general: ['All fields are required.'] } });
    if (password.length < 8)
      return res.status(422).json({ errors: { password: ['Password must be at least 8 characters.'] } });

    if (role && role !== 'teacher') {
      return res.status(422).json({ errors: { role: ['Student self-registration is disabled.'] } });
    }
    const userRole = 'teacher';

    const existing = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existing)
      return res.status(422).json({ errors: { email: ['The email has already been taken.'] } });

    const hashed = await bcrypt.hash(password, 12);
    const verifyToken = uuidv4();

    await dbRun(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashed, userRole]
    );

    await dbRun(
      'INSERT INTO password_reset_tokens (email, token) VALUES (?, ?) ON CONFLICT (email) DO UPDATE SET token = EXCLUDED.token, created_at = NOW()',
      [email, verifyToken]
    );

    const inserted = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!inserted) {
      return res.status(500).json({ errors: { general: ['Account was created but could not be loaded. Please try again.'] } });
    }
    const user = {
      id: inserted.id,
      name: inserted.name,
      email: inserted.email,
      role: inserted.role,
      plan: inserted.plan || 'FREE',
      quiz_count: inserted.quiz_count || 0,
      billing_cycle_start: inserted.billing_cycle_start || null,
      team_id: inserted.team_id ?? null,
      team_role: inserted.team_role || 'OWNER',
      email_verified_at: inserted.email_verified_at || null,
    };

    try { await sendVerificationEmail(email, verifyToken); } catch (e) { console.error('Verify email error:', e.message); }

    return res.status(201).json({ token: generateToken(user), user });
  } catch (err) {
    return handleAuthError(res, 'Register', err);
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(422).json({ errors: { general: ['Email and password are required.'] } });

    const user = await dbGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(422).json({ errors: { email: ['These credentials do not match our records.'] } });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(422).json({ errors: { email: ['These credentials do not match our records.'] } });

    const { password: _pw, ...safeUser } = user;
    return res.json({ token: generateToken(safeUser), user: safeUser });
  } catch (err) {
    return handleAuthError(res, 'Login', err);
  }
}

async function logout(req, res) { return res.json({ message: 'Logged out.' }); }

async function getUser(req, res) { return res.json({ user: req.user }); }

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const user = await dbGet('SELECT id FROM users WHERE email = ?', [email]);
    if (user) {
      const token = uuidv4();
      await dbRun(
        'INSERT INTO password_reset_tokens (email, token) VALUES (?, ?) ON CONFLICT (email) DO UPDATE SET token = EXCLUDED.token, created_at = NOW()',
        [email, token]
      );
      try { await sendPasswordResetEmail(email, token); } catch (e) { console.error(e.message); }
    }
    return res.json({ status: 'We have emailed your password reset link.' });
  } catch (err) { return handleAuthError(res, 'Forgot password', err); }
}

async function resetPassword(req, res) {
  try {
    const { token, email, password, password_confirmation } = req.body;
    if (!token || !email || !password)
      return res.status(422).json({ errors: { general: ['All fields are required.'] } });
    if (password !== password_confirmation)
      return res.status(422).json({ errors: { password: ['Passwords do not match.'] } });
    if (password.length < 8)
      return res.status(422).json({ errors: { password: ['Password must be at least 8 characters.'] } });

    const record = await dbGet('SELECT * FROM password_reset_tokens WHERE email = ? AND token = ?', [email, token]);
    if (!record) return res.status(422).json({ errors: { token: ['This password reset token is invalid.'] } });

    await dbRun('UPDATE users SET password = ?, updated_at = datetime("now") WHERE email = ?', [await bcrypt.hash(password, 12), email]);
    await dbRun('DELETE FROM password_reset_tokens WHERE email = ?', [email]);
    return res.json({ status: 'Your password has been reset.' });
  } catch (err) { return handleAuthError(res, 'Reset password', err); }
}

async function verifyEmail(req, res) {
  try {
    const { token } = req.params;
    const { email } = req.query;
    const record = await dbGet('SELECT * FROM password_reset_tokens WHERE email = ? AND token = ?', [email, token]);
    if (!record) return res.status(422).json({ message: 'Invalid verification link.' });
    await dbRun('UPDATE users SET email_verified_at = datetime("now"), updated_at = datetime("now") WHERE email = ?', [email]);
    await dbRun('DELETE FROM password_reset_tokens WHERE email = ?', [email]);
    return res.json({ status: 'Email verified successfully.' });
  } catch (err) { return handleAuthError(res, 'Verify email', err); }
}

async function resendVerification(req, res) {
  try {
    const user = req.user;
    if (user.email_verified_at) return res.json({ status: 'Email already verified.' });
    const token = uuidv4();
    await dbRun(
      'INSERT INTO password_reset_tokens (email, token) VALUES (?, ?) ON CONFLICT (email) DO UPDATE SET token = EXCLUDED.token, created_at = NOW()',
      [user.email, token]
    );
    try { await sendVerificationEmail(user.email, token); } catch (e) { console.error(e.message); }
    return res.json({ status: 'Verification link sent.' });
  } catch (err) { return handleAuthError(res, 'Resend verification', err); }
}

module.exports = { register, login, logout, getUser, forgotPassword, resetPassword, verifyEmail, resendVerification };
