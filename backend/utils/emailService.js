/**
 * LocalFix Branded Transactional Email Service
 * Supports:
 * 1. Resend HTTP API (via RESEND_API_KEY)
 * 2. Custom SMTP / Nodemailer (Brevo, AWS SES, Gmail, Mailgun, etc.)
 *
 * All credentials are read strictly from process.env and never hardcoded.
 */

const nodemailer = require('nodemailer');

const BRAND_NAME = 'LocalFix';
const DEFAULT_FROM = process.env.EMAIL_FROM || 'LocalFix <no-reply@localfix.in>';

/**
 * Generate LocalFix Branded Responsive HTML Template
 */
function generateOtpEmailHtml({ otp, name, expiryMinutes = 5, purpose = 'login' }) {
  const isRegister = purpose === 'register';
  const heading = isRegister ? 'Confirm Your Account Registration' : 'Two-Step Login Verification';
  const actionText = isRegister
    ? 'complete your account creation on the LocalFix marketplace'
    : 'securely sign in to your LocalFix account';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your LocalFix Verification Code</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b1120;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #334155;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #0b1120;
      padding: 40px 16px;
    }
    .main-card {
      max-width: 560px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
    }
    .header {
      background: linear-gradient(135deg, #090e1a 0%, #034870 100%);
      padding: 36px 32px;
      text-align: center;
    }
    .brand-logo {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #ffffff;
      text-decoration: none;
      display: inline-block;
    }
    .brand-accent {
      color: #38bdf8;
    }
    .brand-badge {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 12px;
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.35);
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      color: #7dd3fc;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .content {
      padding: 36px 32px 28px 32px;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 12px 0;
    }
    p {
      font-size: 14px;
      line-height: 1.6;
      color: #475569;
      margin: 0 0 16px 0;
    }
    .otp-box {
      margin: 28px 0;
      padding: 20px;
      background: #f8fafc;
      border: 2px dashed #0284c7;
      border-radius: 12px;
      text-align: center;
    }
    .otp-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #0284c7;
      margin-bottom: 8px;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 38px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #0f172a;
      padding-left: 8px;
      margin: 0;
    }
    .otp-expiry {
      font-size: 12px;
      color: #64748b;
      margin-top: 8px;
    }
    .warning-box {
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 12px 16px;
      border-radius: 4px;
      margin-top: 24px;
    }
    .warning-text {
      font-size: 12px;
      line-height: 1.5;
      color: #92400e;
      margin: 0;
    }
    .footer {
      background: #f1f5f9;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer-text {
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.5;
      margin: 0 0 8px 0;
    }
    .footer-link {
      color: #0284c7;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <table role="presentation" class="wrapper" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <div class="main-card">
          <!-- Header -->
          <div class="header">
            <div class="brand-logo">Local<span class="brand-accent">Fix</span></div>
            <div><span class="brand-badge">Two-Step Security</span></div>
          </div>
          <!-- Body Content -->
          <div class="content">
            <h1>${heading}</h1>
            <p>Hello${name ? ' ' + name : ''},</p>
            <p>You requested a single-use verification code to ${actionText}. Use the 6-digit code below to proceed:</p>
            
            <div class="otp-box">
              <div class="otp-label">Verification Code</div>
              <div class="otp-code">${otp}</div>
              <div class="otp-expiry">Valid for <strong>${expiryMinutes} minutes</strong> only.</div>
            </div>

            <div class="warning-box">
              <p class="warning-text">
                <strong>Important Security Notice:</strong> Never share this code with anyone, including LocalFix technicians, customer support, or administrators. We will never ask you for your verification code.
              </p>
            </div>

            <p style="margin-top: 20px; font-size: 12px; color: #64748b;">
              If you did not initiate this request, your account may be at risk. We recommend changing your password immediately.
            </p>
          </div>
          <!-- Footer -->
          <div class="footer">
            <p class="footer-text">
              Sent securely by <strong>LocalFix</strong> — Punjab &amp; North India's Verified Home Services Marketplace.
            </p>
            <p class="footer-text">
              Questions? Visit our <a class="footer-link" href="#">Help &amp; Support Center</a>.
            </p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Send email using Resend HTTP API
 */
async function sendViaResend({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: DEFAULT_FROM,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Resend delivery failed with status ${res.status}`);
  }
  return { provider: 'resend', id: data.id };
}

/**
 * Send email using SMTP (Nodemailer)
 */
async function sendViaSmtp({ to, subject, html, text }) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return false;

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true' || Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: DEFAULT_FROM,
    to,
    subject,
    text,
    html,
  });

  return { provider: 'smtp', messageId: info.messageId };
}

/**
 * Main sendOtpEmail dispatcher
 */
async function sendOtpEmail({ email, otp, name, expiryMinutes = 5, purpose = 'login' }) {
  const subject = `Your LocalFix Verification Code: ${otp}`;
  const html = generateOtpEmailHtml({ otp, name, expiryMinutes, purpose });
  const text = `Your LocalFix verification code is ${otp}. It is valid for ${expiryMinutes} minutes. Never share this code with anyone.`;

  // 1. Try Resend if configured
  if (process.env.RESEND_API_KEY) {
    return await sendViaResend({ to: email, subject, html, text });
  }

  // 2. Try SMTP if configured
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return await sendViaSmtp({ to: email, subject, html, text });
  }

  // 3. Fallback: Neither provider is configured
  console.warn(
    '\x1b[33m%s\x1b[0m',
    `[LocalFix Email Service] No live email provider configured in backend/.env.`
  );
  console.warn(
    '\x1b[36m%s\x1b[0m',
    `[LocalFix Email Service] Setup: Add RESEND_API_KEY or (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS) to backend/.env.`
  );

  const error = new Error(
    'Email delivery service is not configured. Please configure RESEND_API_KEY or SMTP credentials in backend/.env.'
  );
  error.code = 'EMAIL_NOT_CONFIGURED';
  throw error;
}

module.exports = {
  sendOtpEmail,
  generateOtpEmailHtml,
};
