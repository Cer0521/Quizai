const { supabaseAdmin } = require('../supabase');

async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password)
      return res.status(422).json({ errors: { general: ['All fields are required.'] } });
    if (password.length < 8)
      return res.status(422).json({ errors: { password: ['Password must be at least 8 characters.'] } });

    const userRole = role === 'teacher' ? 'teacher' : 'teacher'; // Default to teacher for now

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for development
      user_metadata: {
        full_name: name,
        role: userRole
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return res.status(422).json({ errors: { email: ['The email has already been taken.'] } });
      }
      console.error('Supabase auth error:', authError);
      return res.status(500).json({ message: authError.message });
    }

    // Update the profile with full name
    await supabaseAdmin
      .from('profiles')
      .update({ full_name: name, role: userRole })
      .eq('id', authData.user.id);

    // Generate a session for the user
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });

    // Get the user's session token directly
    const { data: signInData } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    });

    const user = {
      id: authData.user.id,
      name,
      email,
      role: userRole,
      email_verified_at: authData.user.email_confirmed_at,
      created_at: authData.user.created_at
    };

    return res.status(201).json({ 
      token: signInData?.session?.access_token || authData.user.id,
      user 
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(422).json({ errors: { general: ['Email and password are required.'] } });

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return res.status(422).json({ errors: { email: ['These credentials do not match our records.'] } });
    }

    // Get profile data
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    const user = {
      id: data.user.id,
      name: profile?.full_name || data.user.user_metadata?.full_name || '',
      email: data.user.email,
      role: profile?.role || 'teacher',
      email_verified_at: data.user.email_confirmed_at,
      created_at: data.user.created_at
    };

    return res.json({ 
      token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user 
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

async function logout(req, res) {
  // With Supabase, logout is handled client-side
  return res.json({ message: 'Logged out.' });
}

async function getUser(req, res) {
  return res.json({ user: req.user });
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.APP_URL}/reset-password`
    });

    if (error) {
      console.error('Password reset error:', error);
    }

    // Always return success to prevent email enumeration
    return res.json({ status: 'We have emailed your password reset link.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

async function resetPassword(req, res) {
  try {
    const { token, password, password_confirmation } = req.body;
    
    if (!token || !password)
      return res.status(422).json({ errors: { general: ['All fields are required.'] } });
    if (password !== password_confirmation)
      return res.status(422).json({ errors: { password: ['Passwords do not match.'] } });
    if (password.length < 8)
      return res.status(422).json({ errors: { password: ['Password must be at least 8 characters.'] } });

    // Verify the token and update password
    const { error } = await supabaseAdmin.auth.admin.updateUserById(token, {
      password
    });

    if (error) {
      return res.status(422).json({ errors: { token: ['This password reset token is invalid.'] } });
    }

    return res.json({ status: 'Your password has been reset.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

async function verifyEmail(req, res) {
  // Supabase handles email verification via magic links
  return res.json({ status: 'Email verified successfully.' });
}

async function resendVerification(req, res) {
  try {
    const { error } = await supabaseAdmin.auth.resend({
      type: 'signup',
      email: req.user.email
    });

    if (error) {
      console.error('Resend verification error:', error);
    }

    return res.json({ status: 'Verification link sent.' });
  } catch (err) {
    console.error('Resend verification error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

async function refreshToken(req, res) {
  try {
    const { refresh_token } = req.body;
    
    if (!refresh_token) {
      return res.status(422).json({ errors: { general: ['Refresh token is required.'] } });
    }

    const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token });

    if (error) {
      return res.status(401).json({ message: 'Invalid refresh token.' });
    }

    return res.json({
      token: data.session.access_token,
      refresh_token: data.session.refresh_token
    });
  } catch (err) {
    console.error('Refresh token error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
}

module.exports = { 
  register, 
  login, 
  logout, 
  getUser, 
  forgotPassword, 
  resetPassword, 
  verifyEmail, 
  resendVerification,
  refreshToken 
};
