const { randomUUID } = require('crypto');
const { dbGet, dbAll, dbRun } = require('../db');
const { getSubscriptionState } = require('../services/subscription');

async function invite(req, res) {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email) return res.status(422).json({ errors: { email: ['Email is required.'] } });

    const subscription = await getSubscriptionState(req.user.id);
    if (!subscription || subscription.plan !== 'TEAM' || subscription.team_role !== 'OWNER') {
      return res.status(403).json({ message: 'Only TEAM owners can invite members.' });
    }

    const existingMember = await dbGet(
      'SELECT id FROM users WHERE email = ? AND team_id = ? AND team_role = ?',
      [email, subscription.team_id, 'MEMBER']
    );
    if (existingMember) {
      return res.status(409).json({ message: 'This teacher is already in your team.' });
    }

    const token = randomUUID();
    await dbRun(
      `INSERT INTO team_invites (team_id, inviter_id, email, token, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [subscription.team_id, req.user.id, email, token]
    );

    const joinUrl = `${process.env.APP_URL || ''}/team/join/${token}`;
    return res.status(201).json({
      message: 'Invitation created successfully.',
      invite: {
        email,
        token,
        join_url: joinUrl,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

async function join(req, res) {
  try {
    const token = String(req.body?.token || '').trim();
    if (!token) return res.status(422).json({ errors: { token: ['Invite token is required.'] } });

    const invite = await dbGet(
      `SELECT id, team_id, email, status
       FROM team_invites
       WHERE token = ?`,
      [token]
    );
    if (!invite || invite.status !== 'pending') {
      return res.status(404).json({ message: 'Invalid or expired invite.' });
    }

    if (invite.email.toLowerCase() !== String(req.user.email || '').toLowerCase()) {
      return res.status(403).json({ message: 'This invite is for a different email.' });
    }

    await dbRun(
      `UPDATE users
       SET team_id = ?,
           team_role = 'MEMBER',
           updated_at = NOW()
       WHERE id = ?`,
      [invite.team_id, req.user.id]
    );

    await dbRun(
      `UPDATE team_invites
       SET status = 'accepted',
           accepted_at = NOW()
       WHERE id = ?`,
      [invite.id]
    );

    const teamMembers = await dbAll(
      `SELECT id, name, email, team_role, plan
       FROM users
       WHERE team_id = ?
       ORDER BY created_at ASC`,
      [invite.team_id]
    );

    return res.json({
      message: 'Successfully joined team.',
      team_id: invite.team_id,
      members: teamMembers,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = {
  invite,
  join,
};
