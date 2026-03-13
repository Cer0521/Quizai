const { supabaseAdmin } = require('../supabase');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
      return res.status(401).json({ message: 'Unauthenticated.' });

    const token = authHeader.split(' ')[1];

    // Verify the Supabase JWT
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ message: 'Unauthenticated.' });
    }

    // Get profile data
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    req.user = {
      id: user.id,
      name: profile?.full_name || user.user_metadata?.full_name || '',
      email: user.email,
      role: profile?.role || 'teacher',
      email_verified_at: user.email_confirmed_at,
      created_at: user.created_at
    };
    req.supabaseToken = token;
    
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
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
 * requireVerified — checks if user's email is verified
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
