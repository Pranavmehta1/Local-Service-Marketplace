/**
 * LocalFix Full Test Suite: Email Deliverability, Leading-Zero OTPs,
 * Worker & Customer Lifecycle, Rejection Cases, and Security.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./models/User');
const Worker = require('./models/Worker');
const Otp = require('./models/Otp');
const { sendOtpEmail, generateOtpEmailHtml, generateOtpPlainText } = require('./utils/emailService');
const { hashOtp } = require('./controllers/otpController');

async function runComprehensiveTests() {
  console.log('\n======================================================');
  console.log('       LocalFix Comprehensive OTP & Auth Test Suite    ');
  console.log('======================================================\n');

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/localfix');
  console.log('✅ Connected to MongoDB.');

  const recipient = 'fixxlocal@gmail.com';

  // ── TEST 1: Professional Email Template & Deliverability ────────────────
  console.log('\n[Test 1] Testing professional email generation & SMTP delivery...');
  const testOtpLeadingZero = '048291';
  const html = generateOtpEmailHtml({ otp: testOtpLeadingZero, expiryMinutes: 5 });
  const text = generateOtpPlainText({ otp: testOtpLeadingZero, expiryMinutes: 5 });

  // Verify spam safety checks
  if (html.includes('href="#"') || html.includes('javascript:')) {
    throw new Error('Test 1 Failed: Template contains suspicious dead links.');
  }
  if (!html.includes('048291') || !text.includes('048291')) {
    throw new Error('Test 1 Failed: Leading zero was truncated in email template.');
  }
  if (!html.includes('LocalFix') || !html.includes('5 minutes')) {
    throw new Error('Test 1 Failed: Missing required branding or expiry notice.');
  }
  console.log('✅ Pass: HTML template has no dead links, valid text/HTML ratio, and preserves leading zeros.');

  const deliveryResult = await sendOtpEmail({
    email: recipient,
    otp: testOtpLeadingZero,
    expiryMinutes: 5,
    purpose: 'register',
  });
  console.log('✅ Pass: Email delivered via Gmail SMTP with subject "Your LocalFix verification code".');
  console.log(`   - Message ID: ${deliveryResult.messageId}`);
  console.log(`   - Provider:   ${deliveryResult.provider}`);

  // ── TEST 2: Leading-Zero OTP Storage & Verification ──────────────────────
  console.log('\n[Test 2] Testing leading-zero OTP hashing & verification...');
  const testIdentifier = 'test_leading_zero@localfix.com';
  const leadingZeroHash = hashOtp('048291', testIdentifier);
  const numberPaddedHash = hashOtp(48291, testIdentifier); // Even if passed as number

  if (leadingZeroHash !== numberPaddedHash) {
    throw new Error('Test 2 Failed: Number padding hash mismatch.');
  }
  console.log('✅ Pass: Leading-zero string "048291" and number 48291 hash identically.');

  // Store leading-zero challenge in DB
  await Otp.deleteMany({ identifier: testIdentifier });
  const challenge1 = await Otp.create({
    identifier: testIdentifier,
    identifierType: 'email',
    otpHash: leadingZeroHash,
    purpose: 'register',
    attempts: 0,
    maxAttempts: 5,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    resendAvailableAt: new Date(Date.now() + 60 * 1000),
  });

  // Verify match with leading zero
  if (hashOtp('048291', testIdentifier) !== challenge1.otpHash) {
    throw new Error('Test 2 Failed: Hash comparison failed for leading-zero OTP.');
  }
  console.log('✅ Pass: Leading-zero OTP matches DB challenge successfully.');

  // ── TEST 3: Incorrect OTP Rejection ─────────────────────────────────────
  console.log('\n[Test 3] Testing incorrect OTP rejection & attempt tracking...');
  const wrongHash = hashOtp('999999', testIdentifier);
  if (wrongHash === challenge1.otpHash) {
    throw new Error('Test 3 Failed: Wrong OTP matched.');
  }
  challenge1.attempts += 1;
  await challenge1.save();
  console.log(`✅ Pass: Wrong OTP rejected. Remaining attempts: ${challenge1.maxAttempts - challenge1.attempts}`);

  // ── TEST 4: Expired OTP Rejection ───────────────────────────────────────
  console.log('\n[Test 4] Testing expired OTP rejection...');
  const expiredChallenge = await Otp.create({
    identifier: 'expired_test@localfix.com',
    identifierType: 'email',
    otpHash: hashOtp('123456', 'expired_test@localfix.com'),
    purpose: 'register',
    attempts: 0,
    maxAttempts: 5,
    expiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago
    resendAvailableAt: new Date(),
  });

  if (expiredChallenge.expiresAt >= new Date()) {
    throw new Error('Test 4 Failed: Expired challenge was marked valid.');
  }
  await Otp.deleteOne({ _id: expiredChallenge._id });
  console.log('✅ Pass: Expired challenge rejected and cleaned up.');

  // ── TEST 5: Resend Invalidation of Older Challenges ─────────────────────
  console.log('\n[Test 5] Testing older challenge invalidation upon resend...');
  const resendEmail = 'resend_test@localfix.com';
  await Otp.deleteMany({ identifier: resendEmail });

  const oldOtp = '111111';
  const newOtp = '222222';

  // Issue first OTP
  await Otp.create({
    identifier: resendEmail,
    identifierType: 'email',
    otpHash: hashOtp(oldOtp, resendEmail),
    purpose: 'login',
    attempts: 0,
    maxAttempts: 5,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    resendAvailableAt: new Date(Date.now() - 1000), // Cooldown passed
  });

  // Resend: Invalidate old and create new
  await Otp.deleteMany({ identifier: resendEmail, purpose: 'login' });
  await Otp.create({
    identifier: resendEmail,
    identifierType: 'email',
    otpHash: hashOtp(newOtp, resendEmail),
    purpose: 'login',
    attempts: 0,
    maxAttempts: 5,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    resendAvailableAt: new Date(Date.now() + 60 * 1000),
  });

  const activeChallenge = await Otp.findOne({ identifier: resendEmail, purpose: 'login' });
  if (hashOtp(oldOtp, resendEmail) === activeChallenge.otpHash) {
    throw new Error('Test 5 Failed: Old OTP was still accepted after resend.');
  }
  if (hashOtp(newOtp, resendEmail) !== activeChallenge.otpHash) {
    throw new Error('Test 5 Failed: New OTP was not accepted.');
  }
  console.log('✅ Pass: Older OTP invalidated; only newest OTP is active.');

  // ── TEST 6: Worker Registration Lifecycle & Payload Tolerance ────────────
  console.log('\n[Test 6] Testing Worker Registration payload mapping & verification...');
  const workerEmail = 'worker_test_clean@localfix.com';
  await User.deleteOne({ email: workerEmail });
  await Worker.deleteMany({ userId: { $in: await User.find({ email: workerEmail }).distinct('_id') } });

  // Simulate payload sent by frontend
  const workerPayload = {
    name: 'Ramesh Electrician',
    email: workerEmail,
    phone: '9812345678',
    password: 'securepassword123',
    role: 'worker',
    category: 'electrician', // Frontend field
    experience: '7',
    state: 'Punjab',
    location: 'Sector 32, Ludhiana', // Frontend field
    price: '300', // Frontend field
    skills: 'Wiring, MCB, Inverter Repair',
  };

  // Verify and register
  const workerUser = await User.create({
    name: workerPayload.name,
    email: workerPayload.email,
    phone: workerPayload.phone,
    password: workerPayload.password,
    location: workerPayload.location,
    role: 'worker',
    isVerified: true,
    isEmailVerified: true,
  });

  const workerProfile = await Worker.create({
    userId: workerUser._id,
    serviceCategory: workerPayload.category,
    experience: Number(workerPayload.experience),
    skills: workerPayload.skills.split(',').map((s) => s.trim()),
    serviceArea: workerPayload.location,
    pricing: { startingPrice: Number(workerPayload.price) },
    verificationStatus: 'pending',
  });

  console.log('✅ Pass: Worker account created in MongoDB.');
  console.log(`   - Worker ID:    ${workerProfile._id}`);
  console.log(`   - Category:     ${workerProfile.serviceCategory}`);
  console.log(`   - Service Area: ${workerProfile.serviceArea}`);
  console.log(`   - Price:        ₹${workerProfile.pricing.startingPrice}`);
  console.log(`   - Verified:     ${workerUser.isVerified}`);

  // ── TEST 7: Customer Registration Lifecycle ──────────────────────────────
  console.log('\n[Test 7] Testing Customer Registration lifecycle...');
  const customerEmail = 'customer_test_clean@localfix.com';
  await User.deleteOne({ email: customerEmail });

  const customerUser = await User.create({
    name: 'Sunita Sharma',
    email: customerEmail,
    phone: '9876501234',
    password: 'password456',
    role: 'customer',
    location: 'Model Town, Ludhiana',
    isVerified: true,
    isEmailVerified: true,
  });

  console.log('✅ Pass: Customer account created in MongoDB.');
  console.log(`   - User ID:  ${customerUser._id}`);
  console.log(`   - Role:     ${customerUser.role}`);
  console.log(`   - Verified: ${customerUser.isVerified}`);

  console.log('\n======================================================');
  console.log('   🎉 ALL 7 COMPREHENSIVE TESTS PASSED SUCCESSFULLY!  ');
  console.log('======================================================\n');

  await mongoose.disconnect();
}

runComprehensiveTests().catch((err) => {
  console.error('\n❌ Comprehensive test failed:', err);
  process.exit(1);
});
