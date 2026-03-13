const { dbAll, dbRun } = require('../db');

async function index(req, res) {
  const rows = await dbAll('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30', [req.user.id]);
  return res.json({ notifications: rows });
}

async function markRead(req, res) {
  await dbRun('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
  return res.json({ message: 'Marked as read.' });
}

module.exports = { index, markRead };
