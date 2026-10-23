const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const Otp = require('../models/Otp');
const User = require('../models/User');
const Worker = require('../models/Worker');
const { sendOtpEmail } = require('../utils/emailService');
const { sendOtpSms, normalizePhoneNumber } = require('../utils/smsService');

const OTP_SECRET = process.env.OTP_SECRET || process.env.JWT_SECRET || 'localfix-otp-secret-salt';
const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRE_MINUTES) || 5;
const OTP_COOLDOWN_SECONDS = Number(process.env.OTP_COOLDOWN_SECONDS) || 60;
const MAX_ATTEMPTS = 5;

/**
 * Hash an OTP with server-side secret
 * Always treats OTP as 6-character zero-padded string and lowercase identifier
 */
function hashOtp(otp, identifier) {
  const cleanOtp = String(otp || '').trim().padStart(6, '0');
  const cleanId = String(identifier || '').trim().toLowerCase();
  return crypto
    .createHmac('sha256', OTP_SECRET)
    .update(`${cleanId}:${cleanOtp}`)
    .digest('hex');
}

/**
 * Generate cryptographically secure 6-digit OTP string
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
  isVerified: !!user.isVerified,
  isEmailVerified: !!user.isEmailVerified,
  isPhoneVerified: !!user.isPhoneVerified,
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
    } else if (purpose === 'register') {
      // Check if user is already registered and verified
      const existingUser = await User.findOne({ email: identifier });
      if (existingUser && existingUser.isVerified) {
        return res.status(409).json({
          message: 'An account with this email is already registered and verified. Please sign in.',
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

    // Invalidate prior challenge for this identifier + purpose
    if (existingOtp) {
      await Otp.deleteOne({ _id: existingOtp._id });
    }

    // Generate secure 6-digit OTP
    const rawOtp = generateSecureOtp();
    const otpHash = hashOtp(rawOtp, identifier);

    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    const resendAvailableAt = new Date(Date.now() + OTP_COOLDOWN_SECONDS * 1000);

    // Dispatch delivery through configured provider
    try {
      if (identifierType === 'email') {
        await sendOtpEmail({
          email: identifier,
          otp: rawOtp,
          expiryMinutes: OTP_EXPIRY_MINUTES,
          purpose,
        });
      } else {
        await sendOtpSms({
          phone: identifier,
          otp: rawOtp,
          expiryMinutes: OTP_EXPIRY_MINUTES,
        });
      }
    } catch (deliveryError) {
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

    // Save challenge in DB only after successful delivery
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
 * Body: { identifier, otp, purpose: 'login'|'register', userData?: object }
 */
const verifyOtp = async (req, res, next) => {
  try {
    const { identifier: rawIdentifier, otp, purpose = 'login', type = 'email', userData } = req.body;

    if (!rawIdentifier || !otp) {
      return res.status(400).json({ message: 'Identifier and 6-digit OTP code are required' });
    }

    const cleanOtp = String(otp).trim().padStart(6, '0');
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
        message: 'Verification code has expired. Please request a new code.',
      });
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      await Otp.deleteOne({ _id: challenge._id });
      return res.status(429).json({
        message: 'Too many incorrect attempts. This code has been invalidated for security. Please request a new code.',
      });
    }

    // Timing-safe comparison of OTP hashes
    const incomingHash = hashOtp(cleanOtp, identifier);
    let isMatch = false;
    try {
      isMatch = crypto.timingSafeEqual(
        Buffer.from(incomingHash, 'hex'),
        Buffer.from(challenge.otpHash, 'hex')
      );
    } catch {
      isMatch = false;
    }

    if (!isMatch) {
      challenge.attempts += 1;
      await challenge.save();
      const remaining = challenge.maxAttempts - challenge.attempts;

      if (remaining <= 0) {
        await Otp.deleteOne({ _id: challenge._id });
        return res.status(429).json({
          message: 'Too many incorrect attempts. This code has been invalidated. Please request a new code.',
          attemptsRemaining: 0,
        });
      }

      return res.status(400).json({
        message: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
        attemptsRemaining: remaining,
      });
    }

    // ── Handle Login verification: complete session ─────────────────────────
    if (purpose === 'login') {
      const query = challenge.identifierType === 'email' ? { email: identifier } : { phone: identifier };
      const user = await User.findOne(query);

      if (!user) {
        return res.status(404).json({ message: 'User account not found' });
      }

      user.isVerified = true;
      if (challenge.identifierType === 'email') user.isEmailVerified = true;
      if (challenge.identifierType === 'phone') user.isPhoneVerified = true;
      await user.save();

      // Invalidate OTP challenge only after user is updated successfully
      await Otp.deleteOne({ _id: challenge._id });

      const token = signToken(user);
      return res.json({
        success: true,
        verified: true,
        message: 'Verification successful',
        token,
        user: sanitizeUser(user),
      });
    }

    // ── Handle Register verification ────────────────────────────────────────
    let finalUser = null;
    let finalToken = null;

    if (userData) {
      const role = userData.role === 'worker' ? 'worker' : 'customer';
      const name = (userData.name || '').trim();
      const email = identifier;
      const phone = (userData.phone || '').trim();
      const password = userData.password || 'password123';
      const location = (userData.location || userData.serviceArea || userData.area || 'Model Town, Ludhiana').trim();

      let existing = await User.findOne({ email });
      if (existing) {
        existing.name = name || existing.name;
        existing.phone = phone || existing.phone;
        existing.password = password;
        existing.location = location;
        existing.role = role;
        existing.isVerified = true;
        existing.isEmailVerified = true;
        finalUser = await existing.save();
      } else {
        finalUser = await User.create({
          name,
          email,
          phone,
          password,
          location,
          role,
          isVerified: true,
          isEmailVerified: true,
        });
      }

      if (role === 'worker') {
        const serviceCategory = userData.serviceCategory || userData.category || 'electrician';
        const serviceArea = userData.serviceArea || userData.area || location;
        const experience = Number(userData.experience) || 1;
        const startingPrice = userData.startingPrice != null
          ? Number(userData.startingPrice)
          : (userData.price != null ? Number(userData.price) : 200);
        const skills = Array.isArray(userData.skills)
          ? userData.skills
          : String(userData.skills || '').split(',').map((s) => s.trim()).filter(Boolean);

        let worker = await Worker.findOne({ userId: finalUser._id });
        if (worker) {
          worker.serviceCategory = serviceCategory;
          worker.experience = experience;
          worker.skills = skills;
          worker.serviceArea = serviceArea;
          worker.pricing = { startingPrice };
          await worker.save();
        } else {
          await Worker.create({
            userId: finalUser._id,
            serviceCategory,
            experience,
            skills,
            serviceArea,
            pricing: { startingPrice },
            verificationStatus: 'pending',
          });
        }
      }

      finalToken = signToken(finalUser);
    }

    // Invalidate OTP challenge only after registration succeeds
    await Otp.deleteOne({ _id: challenge._id });

    if (finalUser && finalToken) {
      return res.json({
        success: true,
        verified: true,
        message: 'Registration and verification successful',
        token: finalToken,
        user: sanitizeUser(finalUser),
      });
    }

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
 * Mask phone number for privacy display
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
  hashOtp,
  maskEmail,
  maskPhone,
};
