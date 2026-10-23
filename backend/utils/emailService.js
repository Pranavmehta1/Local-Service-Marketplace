/**
 * LocalFix Official Email Delivery Service
 *
 * Professional transactional email sender with Gmail SMTP & custom provider support.
 * All credentials are read securely from environment variables.
 */

const nodemailer = require('nodemailer');

/**
 * Resolve effective SMTP configuration
 */
function getSmtpConfig() {
  const user = (process.env.SMTP_USER || process.env.GMAIL_USER || '').trim();
  const rawPass = process.env.SMTP_APP_PASSWORD || process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '';
  const pass = rawPass.replace(/\s+/g, ''); // Strip any accidental spaces from Google App Password
  let host = (process.env.SMTP_HOST || '').trim();
  let port = Number(process.env.SMTP_PORT) || 0;
  let secure = process.env.SMTP_SECURE === 'true';

  const isGmail = user.toLowerCase().endsWith('@gmail.com') || host.includes('gmail');
  if (isGmail && !host) {
    host = 'smtp.gmail.com';
    port = port || 465;
    secure = port === 465;
  }

  return { user, pass, host, port: port || 587, secure, isGmail };
}

/**
 * Generate Clean, Professional Transactional HTML Template for LocalFix
 */
function generateOtpEmailHtml({ otp, expiryMinutes = 5 }) {
  const cleanOtp = String(otp || '').trim().padStart(6, '0');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your LocalFix verification code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 32px 20px 32px; border-bottom: 1px solid #f1f5f9;">
              <span style="font-size: 22px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px;">Local<span style="color: #0284c7;">Fix</span></span>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h1 style="font-size: 18px; font-weight: 600; color: #0f172a; margin: 0 0 14px 0; line-height: 1.4;">Your verification code</h1>
              <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
                Use the following 6-digit code to complete your verification on LocalFix:
              </p>
              
              <!-- 6-digit Code Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 20px 0;">
                <tr>
                  <td align="center" style="background-color: #f1f5f9; border-radius: 6px; padding: 18px 24px;">
                    <span style="font-family: SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace; font-size: 34px; font-weight: 700; letter-spacing: 8px; color: #0f172a; display: inline-block; padding-left: 8px;">${cleanOtp}</span>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0 0 16px 0;">
                This code expires in <strong>${expiryMinutes} minutes</strong>.
              </p>
              
              <div style="background-color: #fefce8; border-left: 3px solid #eab308; padding: 12px 14px; border-radius: 4px; margin: 0 0 16px 0;">
                <p style="font-size: 13px; color: #854d0e; line-height: 1.5; margin: 0;">
                  <strong>Security warning:</strong> Never share this code with anyone. LocalFix staff will never ask you for your verification code.
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 18px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9;">
              <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin: 0;">
                This is an automated account-security email from LocalFix. If you did not request this code, no action is needed.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Generate Plain-Text Fallback
 */
function generateOtpPlainText({ otp, expiryMinutes = 5 }) {
  const cleanOtp = String(otp || '').trim().padStart(6, '0');
  return `LocalFix Verification Code

Your verification code is: ${cleanOtp}

This code expires in ${expiryMinutes} minutes.

Security warning: Never share this code with anyone. LocalFix will never ask you for your code.

This is an automated account-security email from LocalFix.`;
}

/**
 * Build Nodemailer Transporter
 */
function createSmtpTransporter() {
  const { user, pass, host, port, secure, isGmail } = getSmtpConfig();
  if (!user || !pass) return null;

  if (isGmail) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

/**
 * Send email using SMTP
 */
async function sendViaSmtp({ to, subject, html, text }) {
  const { user } = getSmtpConfig();
  const transporter = createSmtpTransporter();
  if (!transporter) return false;

  // Ensure From matches authenticated address to avoid spam rejection
  const senderAddress = `"LocalFix" <${user}>`;

  const mailOptions = {
    from: senderAddress,
    to,
    subject,
    text,
    html,
    replyTo: user,
    headers: {
      'X-Priority': '1',
      'X-Auto-Response-Suppress': 'OOF, AutoReply',
    },
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { provider: 'gmail', messageId: info.messageId };
  } catch (err) {
    if (err.code === 'EAUTH' || (err.response && err.response.includes('535'))) {
      const customErr = new Error(
        'Gmail authentication failed. Verify that 2-Step Verification is enabled and you are using a 16-character Google App Password in SMTP_APP_PASSWORD.'
      );
      customErr.code = 'SMTP_AUTH_FAILED';
      throw customErr;
    }
    throw err;
  }
}

/**
 * Main sendOtpEmail dispatcher
 */
async function sendOtpEmail({ email, otp, expiryMinutes = 5, purpose = 'login' }) {
  const subject = 'Your LocalFix verification code';
  const html = generateOtpEmailHtml({ otp, expiryMinutes });
  const text = generateOtpPlainText({ otp, expiryMinutes });

  const { user, pass } = getSmtpConfig();
  if (user && pass) {
    return await sendViaSmtp({ to: email, subject, html, text });
  }

  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || `"LocalFix" <no-reply@localfix.in>`,
        to: [email],
        subject,
        html,
        text,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || `Resend delivery failed`);
    return { provider: 'resend', id: data.id };
  }

  const error = new Error(
    'Email delivery service is not configured. Please add SMTP_USER and SMTP_APP_PASSWORD to backend/.env.'
  );
  error.code = 'EMAIL_NOT_CONFIGURED';
  throw error;
}

module.exports = {
  sendOtpEmail,
  generateOtpEmailHtml,
  generateOtpPlainText,
  getSmtpConfig,
};
