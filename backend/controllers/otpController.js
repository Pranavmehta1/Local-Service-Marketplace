const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Otp = require('../models/Otp');
const User = require('../models/User');
const { sendOtpEmail } = require('../utils/emailService');
const { sendOtpSms, normalizePhoneNumber } = require('../utils/smsService');

const OTP_SECRET = process.env.OTP_SECRET || process.env.JWT_SECRET || 'localfix-otp-secret-salt';
const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRE_MINUTES) || 5;
const OTP_COOLDOWN_SECONDS = Number(process.env.OTP_COOLDOWN_SECONDS) || 60;
const MAX_ATTEMPTS = 5;

/**
 * Hash an OTP with server-side secret
 */
function hashOtp(otp, identifier) {
  return crypto
    .createHmac('sha256', OTP_SECRET)
    .update(`${identifier}:${otp}`)
    .digest('hex');
}

/**
 * Generate cryptographically secure 6-digit OTP
 */
function generateSecureOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Sign JWT token for user session
 */
const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

/**
 * Sanitize user object for client response
 */
const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  location: user.location,
  profileImage: user.profileImage,
  isVerified: user.isVerified,
  isEmailVerified: user.isEmailVerified,
  isPhoneVerified: user.isPhoneVerified,
});

/**
 * POST /api/otp/send
 * Body: { identifier, type: 'email'|'phone', purpose: 'login'|'register', role?: 'customer'|'worker' }
 */
const sendOtp = async (req, res, next) => {
  try {
    const { identifier: rawIdentifier, type = 'email', purpose = 'login', role } = req.body;

    if (!rawIdentifier) {
      return res.status(400).json({ message: 'Email address or phone number is required' });
    }

    const identifierType = type === 'phone' ? 'phone' : 'email';
    const identifier = identifierType === 'email'
      ? rawIdentifier.trim().toLowerCase()
      : normalizePhoneNumber(rawIdentifier);

    let user = null;

    // Check account status if logging in
    if (purpose === 'login') {
      const query = identifierType === 'email' ? { email: identifier } : { phone: identifier };
      user = await User.findOne(query);

      if (!user) {
        return res.status(404).json({
          message: `No account found with this ${identifierType}. Please check your details or register.`,
        });
      }

      if (user.isSuspended) {
        return res.status(403).json({ message: 'This account has been suspended. Please contact support.' });
      }

      if (role && user.role !== role && user.role !== 'admin') {
        return res.status(400).json({
          message: `This account is registered as a ${user.role}. Please select the correct account type.`,
        });
      }
    }

    // Rate Limiting & Cooldown check
    const existingOtp = await Otp.findOne({ identifier, purpose });
    const now = new Date();

    if (existingOtp && existingOtp.resendAvailableAt > now) {
      const waitSeconds = Math.ceil((existingOtp.resendAvailableAt - now) / 1000);
      return res.status(429).json({
        message: `Please wait ${waitSeconds} seconds before requesting a new verification code.`,
        cooldownRemaining: waitSeconds,
      });
    }

    // Invalidate existing challenge for this identifier + purpose
    if (existingOtp) {
      await Otp.deleteOne({ _id: existingOtp._id });
    }

    // Generate secure 6-digit OTP
    const rawOtp = generateSecureOtp();
    const otpHash = hashOtp(rawOtp, identifier);

    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    const resendAvailableAt = new Date(Date.now() + OTP_COOLDOWN_SECONDS * 1000);

    // Dispatch delivery through configured provider
    let deliveryInfo = null;
    try {
      if (identifierType === 'email') {
        deliveryInfo = await sendOtpEmail({
          email: identifier,
          otp: rawOtp,
          name: user ? user.name : undefined,
          expiryMinutes: OTP_EXPIRY_MINUTES,
          purpose,
        });
      } else {
        deliveryInfo = await sendOtpSms({
          phone: identifier,
          otp: rawOtp,
          expiryMinutes: OTP_EXPIRY_MINUTES,
        });
      }
    } catch (deliveryError) {
      // Return helpful configuration error if provider is not configured
      const isConfigError =
        deliveryError.code === 'EMAIL_NOT_CONFIGURED' ||
        deliveryError.code === 'SMS_NOT_CONFIGURED';

      return res.status(isConfigError ? 503 : 500).json({
        success: false,
        message: deliveryError.message,
        code: deliveryError.code || 'DELIVERY_FAILED',
        identifierType,
        identifier: identifierType === 'email' ? maskEmail(identifier) : maskPhone(identifier),
      });
    }

    // Save challenge in DB only after successful dispatch
    await Otp.create({
      identifier,
      identifierType,
      otpHash,
      purpose,
      userId: user ? user._id : null,
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
      expiresAt,
      resendAvailableAt,
    });

    res.json({
      success: true,
      message: `Verification code sent to your ${identifierType}`,
      identifierType,
      maskedIdentifier: identifierType === 'email' ? maskEmail(identifier) : maskPhone(identifier),
      cooldownSeconds: OTP_COOLDOWN_SECONDS,
      expiryMinutes: OTP_EXPIRY_MINUTES,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/otp/verify
 * Body: { identifier, otp, purpose: 'login'|'register' }
 */
const verifyOtp = async (req, res, next) => {
  try {
    const { identifier: rawIdentifier, otp, purpose = 'login', type = 'email' } = req.body;

    if (!rawIdentifier || !otp) {
      return res.status(400).json({ message: 'Identifier and 6-digit OTP code are required' });
    }

    const cleanOtp = String(otp).trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({ message: 'Invalid format. OTP must be exactly 6 digits.' });
    }

    const identifier = type === 'phone'
      ? normalizePhoneNumber(rawIdentifier)
      : rawIdentifier.trim().toLowerCase();

    const challenge = await Otp.findOne({ identifier, purpose });
    const now = new Date();

    if (!challenge) {
      return res.status(400).json({
        message: 'No active verification code found or it has expired. Please request a new code.',
      });
    }

    if (challenge.expiresAt < now) {
      await Otp.deleteOne({ _id: challenge._id });
      return res.status(400).json({
        message: 'Verification code has expired. Please request a new one.',
      });
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      await Otp.deleteOne({ _id: challenge._id });
      return res.status(429).json({
        message: 'Too many incorrect attempts. This code has been invalidated for security. Please request a new code.',
      });
    }

    // Check code
    const incomingHash = hashOtp(cleanOtp, identifier);
    if (incomingHash !== challenge.otpHash) {
      challenge.attempts += 1;
      await challenge.save();
      const remaining = challenge.maxAttempts - challenge.attempts;

      return res.status(400).json({
        message: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
        attemptsRemaining: remaining,
      });
    }

    // Success! Invalidate OTP to prevent replay attacks
    await Otp.deleteOne({ _id: challenge._id });

    // Handle Login verification: complete session
    if (purpose === 'login') {
      const query = challenge.identifierType === 'email' ? { email: identifier } : { phone: identifier };
      const user = await User.findOne(query);

      if (!user) {
        return res.status(404).json({ message: 'User account not found' });
      }

      // Mark user as verified
      user.isVerified = true;
      if (challenge.identifierType === 'email') user.isEmailVerified = true;
      if (challenge.identifierType === 'phone') user.isPhoneVerified = true;
      await user.save();

      const token = signToken(user);
      return res.json({
        success: true,
        verified: true,
        message: 'Verification successful',
        token,
        user: sanitizeUser(user),
      });
    }

    // Handle Register verification: return signed verification ticket
    const verificationToken = jwt.sign(
      { identifier, identifierType: challenge.identifierType, verified: true },
      OTP_SECRET,
      { expiresIn: '15m' }
    );

    return res.json({
      success: true,
      verified: true,
      message: 'Verification successful',
      verificationToken,
      identifier,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Mask email for privacy display (e.g., p***h@example.com)
 */
function maskEmail(email) {
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [user, domain] = parts;
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  return `${user[0]}${'*'.repeat(Math.max(1, user.length - 2))}${user[user.length - 1]}@${domain}`;
}

/**
 * Mask phone number for privacy display (e.g., +91 ••••• ••210)
 */
function maskPhone(phone) {
  const cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.length < 4) return phone;
  const last4 = cleaned.slice(-4);
  return `••••••${last4}`;
}

module.exports = {
  sendOtp,
  verifyOtp,
  maskEmail,
  maskPhone,
};
