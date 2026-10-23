/**
 * LocalFix SMS Gateway Service (India & Global)
 * Supports:
 * 1. MSG91 (India DLT Compliant via Flow / OTP API)
 * 2. Twilio (Global SMS API)
 * 3. Fast2SMS (Indian SMS gateway with Quick SMS / OTP route)
 *
 * Reads all credentials strictly from environment variables.
 */

/**
 * Format Indian / International phone numbers into standard format
 */
function normalizePhoneNumber(rawPhone) {
  let cleaned = String(rawPhone || '').replace(/\D/g, '');
  // If 10-digit Indian number without country code, add 91 prefix
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
}

/**
 * Send via MSG91 (DLT Compliant Flow API)
 */
async function sendViaMsg91({ phone, otp }) {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID; // DLT registered template ID
  const senderId = process.env.MSG91_SENDER_ID || 'LOCFIX';

  if (!authKey || !templateId) return false;

  const formattedPhone = normalizePhoneNumber(phone);

  const payload = {
    template_id: templateId,
    short_url: '0',
    recipients: [
      {
        mobiles: formattedPhone,
        otp: String(otp),
        variables: {
          OTP: String(otp),
          BRAND: 'LocalFix',
        },
      },
    ],
  };

  const res = await fetch('https://control.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: {
      'authkey': authKey,
      'Content-Type': 'application/json',
      'accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data.type && data.type !== 'success')) {
    throw new Error(data.message || `MSG91 SMS delivery failed: ${JSON.stringify(data)}`);
  }
  return { provider: 'msg91', response: data };
}

/**
 * Send via Twilio
 */
async function sendViaTwilio({ phone, otp, expiryMinutes = 5 }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) return false;

  let toPhone = normalizePhoneNumber(phone);
  if (!toPhone.startsWith('+')) {
    toPhone = '+' + toPhone;
  }

  const message = `Your LocalFix verification code is ${otp}. Valid for ${expiryMinutes} minutes. Do not share with anyone.`;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  const params = new URLSearchParams();
  params.append('To', toPhone);
  params.append('From', fromNumber);
  params.append('Body', message);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `Twilio SMS delivery failed with status ${res.status}`);
  }
  return { provider: 'twilio', sid: data.sid };
}

/**
 * Send via Fast2SMS (Indian Gateway)
 */
async function sendViaFast2Sms({ phone, otp }) {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) return false;

  const rawPhone = String(phone || '').replace(/\D/g, '');
  const tenDigitPhone = rawPhone.length > 10 ? rawPhone.slice(-10) : rawPhone;

  const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${apiKey}&variables_values=${otp}&route=otp&numbers=${tenDigitPhone}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: { 'cache-control': 'no-cache' },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.return === false) {
    throw new Error(data.message || `Fast2SMS delivery failed: ${JSON.stringify(data)}`);
  }
  return { provider: 'fast2sms', response: data };
}

/**
 * Main sendOtpSms dispatcher
 */
async function sendOtpSms({ phone, otp, expiryMinutes = 5 }) {
  // 1. Try MSG91
  if (process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID) {
    return await sendViaMsg91({ phone, otp });
  }

  // 2. Try Twilio
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    return await sendViaTwilio({ phone, otp, expiryMinutes });
  }

  // 3. Try Fast2SMS
  if (process.env.FAST2SMS_API_KEY) {
    return await sendViaFast2Sms({ phone, otp });
  }

  // 4. Missing credentials
  console.warn(
    '\x1b[33m%s\x1b[0m',
    `[LocalFix SMS Service] No live SMS gateway configured in backend/.env.`
  );
  console.warn(
    '\x1b[36m%s\x1b[0m',
    `[LocalFix SMS Service] Setup: Configure MSG91 (MSG91_AUTH_KEY, MSG91_TEMPLATE_ID) or Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER).`
  );

  const error = new Error(
    'SMS delivery service is not configured. Please configure MSG91 or Twilio credentials in backend/.env.'
  );
  error.code = 'SMS_NOT_CONFIGURED';
  throw error;
}

module.exports = {
  sendOtpSms,
  normalizePhoneNumber,
};
