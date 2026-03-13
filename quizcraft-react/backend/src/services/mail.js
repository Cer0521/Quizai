const nodemailer = require('nodemailer');

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT || '587'),
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
}

async function sendPasswordResetEmail(email, token) {
  const resetUrl = `${process.env.APP_URL}/reset-password/${token}?email=${encodeURIComponent(email)}`;

  const transporter = getTransporter();
  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'noreply@quizcraft.ai',
    to: email,
    subject: 'Reset Your QuizCraft AI Password',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset Your Password</h2>
        <p>You are receiving this email because we received a password reset request for your account.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">
            Reset Password
          </a>
        </p>
        <p>This password reset link will expire in 60 minutes.</p>
        <p>If you did not request a password reset, no further action is required.</p>
      </div>
    `,
  });
}

async function sendVerificationEmail(email, token) {
  const verifyUrl = `${process.env.APP_URL}/verify-email/${token}?email=${encodeURIComponent(email)}`;

  const transporter = getTransporter();
  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'noreply@quizcraft.ai',
    to: email,
    subject: 'Verify Your QuizCraft AI Email',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify Your Email Address</h2>
        <p>Please click the button below to verify your email address.</p>
        <p>
          <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#dc2626;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">
            Verify Email
          </a>
        </p>
        <p>If you did not create an account, no further action is required.</p>
      </div>
    `,
  });
}

module.exports = { sendPasswordResetEmail, sendVerificationEmail };
