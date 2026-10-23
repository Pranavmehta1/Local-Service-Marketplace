#!/usr/bin/env node
/**
 * LocalFix Email Diagnostic & Verification Script
 *
 * Usage:
 *   node test-email.js [recipient@example.com]
 *
 * Tests:
 * 1. Checks backend/.env configuration.
 * 2. Validates SMTP connection and authentication with Google / SMTP host.
 * 3. Sends a real test verification email if a recipient address is provided.
 */

require('dotenv').config();
const { sendOtpEmail, verifyEmailConfig, getSmtpConfig } = require('./utils/emailService');

async function main() {
  console.log('\n======================================================');
  console.log('       LocalFix Email Delivery Diagnostic Tool        ');
  console.log('======================================================\n');

  const { user, host, port, secure, isGmail } = getSmtpConfig();

  console.log('🔍 Checking Environment Configuration:');
  console.log(`   - SMTP User:     ${user ? user : '❌ NOT CONFIGURED'}`);
  console.log(`   - SMTP Password: ${process.env.SMTP_APP_PASSWORD || process.env.SMTP_PASS ? '✅ SET (Hidden for security)' : '❌ NOT CONFIGURED'}`);
  console.log(`   - SMTP Host:     ${host || (isGmail ? 'smtp.gmail.com' : 'Default')}`);
  console.log(`   - SMTP Port:     ${port}`);
  console.log(`   - SSL/Secure:    ${secure ? 'Yes (465)' : 'No/TLS (587)'}`);
  console.log(`   - Email From:    ${process.env.EMAIL_FROM || (user ? `LocalFix <${user}>` : 'Not set')}`);

  if (!user || (!process.env.SMTP_APP_PASSWORD && !process.env.SMTP_PASS && !process.env.RESEND_API_KEY)) {
    console.error('\n❌ Email credentials are not configured in backend/.env.');
    console.error('\n📝 Required Setup Steps:');
    console.error('   1. Create or open localfix/backend/.env');
    console.error('   2. Set your official email address:');
    console.error('      SMTP_USER=LocalFix.Official@gmail.com');
    console.error('   3. Set your 16-character Google App Password:');
    console.error('      SMTP_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx');
    console.error('\nThen re-run: node test-email.js recipient@example.com\n');
    process.exit(1);
  }

  console.log('\n🔌 Testing SMTP Server Connection...');
  const verifyResult = await verifyEmailConfig();
  if (!verifyResult.ok) {
    console.error(`❌ SMTP Connection Failed: ${verifyResult.error}`);
    console.error('\n💡 Troubleshooting Tip:');
    if (isGmail) {
      console.error('   - Ensure 2-Step Verification is turned ON on your Google Account.');
      console.error('   - Generate a 16-character "App Password" at https://myaccount.google.com/apppasswords.');
      console.error('   - Do NOT use your normal Google login password.');
    }
    process.exit(1);
  }

  console.log('✅ SMTP Connection & Authentication Successful!\n');

  const recipient = process.argv[2];
  if (!recipient) {
    console.log('ℹ️  No recipient address provided.');
    console.log('   To send a live test OTP email, run:');
    console.log('   node test-email.js your-personal-email@example.com\n');
    process.exit(0);
  }

  console.log(`📨 Sending live branded test OTP to: ${recipient}...`);
  const testOtp = String(Math.floor(100000 + Math.random() * 900000));

  try {
    const result = await sendOtpEmail({
      email: recipient,
      otp: testOtp,
      name: 'LocalFix Admin',
      expiryMinutes: 5,
      purpose: 'login',
    });

    console.log('\n🎉 SUCCESS! Test verification email delivered to SMTP server.');
    console.log(`   - Provider:   ${result.provider}`);
    console.log(`   - Message ID: ${result.messageId || result.id}`);
    console.log(`   - Recipient:  ${recipient}`);
    console.log('\nPlease check your inbox (and spam/promotions folder) now.\n');
  } catch (err) {
    console.error(`\n❌ Failed to send email: ${err.message}\n`);
    process.exit(1);
  }
}

main();
