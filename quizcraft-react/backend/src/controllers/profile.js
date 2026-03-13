const bcrypt = require('bcryptjs');
const { dbGet, dbRun } = require('../db');

// PATCH /api/profile
async function updateProfile(req, res) {
  try {
    const { name, email } = req.body;
    const userId = req.user.id;

    if (!name || !email) {
      return res.status(422).json({ errors: { general: ['Name and email are required.'] } });
    }

    // Check if email is taken by another user
    const existing = await dbGet('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
    if (existing) {
      return res.status(422).json({ errors: { email: ['The email has already been taken.'] } });
    }

    const currentUser = await dbGet('SELECT email FROM users WHERE id = ?', [userId]);
    const emailChanged = currentUser.email !== email;

    await dbRun(
      'UPDATE users SET name = ?, email = ?, email_verified_at = ?, updated_at = datetime("now") WHERE id = ?',
      [name, email, emailChanged ? null : req.user.email_verified_at, userId]
    );

    const updated = await dbGet('SELECT id, name, email, email_verified_at FROM users WHERE id = ?', [userId]);
    return res.json({ user: updated, status: 'profile-updated' });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// PUT /api/profile/password
async function updatePassword(req, res) {
  try {
    const { current_password, password, password_confirmation } = req.body;
    const userId = req.user.id;

    if (!current_password || !password || !password_confirmation) {
      return res.status(422).json({ errors: { general: ['All fields are required.'] } });
    }
    if (password !== password_confirmation) {
      return res.status(422).json({ errors: { password: ['Passwords do not match.'] } });
    }
    if (password.length < 8) {
      return res.status(422).json({ errors: { password: ['Password must be at least 8 characters.'] } });
    }

    const user = await dbGet('SELECT password FROM users WHERE id = ?', [userId]);
    const match = await bcrypt.compare(current_password, user.password);
    if (!match) {
      return res.status(422).json({ errors: { current_password: ['The provided password does not match your current password.'] } });
    }

    const hashed = await bcrypt.hash(password, 12);
    await dbRun('UPDATE users SET password = ?, updated_at = datetime("now") WHERE id = ?', [hashed, userId]);

    return res.json({ status: 'password-updated' });
  } catch (err) {
    console.error('Update password error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

// DELETE /api/profile
async function deleteAccount(req, res) {
  try {
    const { password } = req.body;
    const userId = req.user.id;

    if (!password) {
      return res.status(422).json({ errors: { password: ['Password is required.'] } });
    }

    const user = await dbGet('SELECT password FROM users WHERE id = ?', [userId]);
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(422).json({ errors: { password: ['The provided password is incorrect.'] } });
    }

    await dbRun('DELETE FROM users WHERE id = ?', [userId]);

    return res.json({ message: 'Account deleted.' });
  } catch (err) {
    console.error('Delete account error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = { updateProfile, updatePassword, deleteAccount };
