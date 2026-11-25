const nodemailer = require('nodemailer');
const db = require('./db');

/**
 * Returns a configured Nodemailer transporter or null if SMTP is unconfigured.
 */
function getSmtpTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass && !host.includes('your_') && !user.includes('your_')) {
    return nodemailer.createTransport({
      host: host,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000
    });
  }
  return null;
}

/**
 * Check if SMTP is configured in environment
 */
function isSmtpConfigured() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  return Boolean(host && user && pass && !host.includes('your_') && !user.includes('your_'));
}

/**
 * Check if MSG91 is configured
 */
function isMsg91Configured() {
  const provider = (process.env.SMS_PROVIDER || '').toLowerCase();
  const key = process.env.MSG91_AUTH_KEY || (provider === 'msg91' ? process.env.SMS_API_KEY : null);
  return Boolean(key && !key.includes('your_'));
}

/**
 * Check if Fast2SMS is configured
 */
function isFast2SmsConfigured() {
  const provider = (process.env.SMS_PROVIDER || '').toLowerCase();
  const key = process.env.FAST2SMS_API_KEY || (provider === 'fast2sms' ? process.env.SMS_API_KEY : null);
  return Boolean(key && !key.includes('your_'));
}

/**
 * Check if Exotel is configured
 */
function isExotelConfigured() {
  const provider = (process.env.SMS_PROVIDER || '').toLowerCase();
  const sid = process.env.EXOTEL_SID || process.env.EXOTEL_ACCOUNT_SID;
  const token = process.env.EXOTEL_TOKEN || (provider === 'exotel' ? process.env.SMS_API_KEY : null);
  return Boolean(sid && token && !sid.includes('your_'));
}

/**
 * Check if Twilio is configured
 */
function isTwilioConfigured() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  return Boolean(sid && token && from && !sid.includes('your_'));
}

/**
 * Check if Mock SMS Adapter is enabled (for testing/development)
 */
function isMockSmsConfigured() {
  const provider = (process.env.SMS_PROVIDER || '').toLowerCase();
  return provider === 'mock' || process.env.MOCK_SMS === 'true';
}

/**
 * Check if SMS gateway is configured
 */
function isSmsConfigured() {
  const provider = (process.env.SMS_PROVIDER || '').toLowerCase();
  if (provider === 'mock') return true;
  if (provider === 'msg91') return isMsg91Configured();
  if (provider === 'exotel') return isExotelConfigured();
  if (provider === 'fast2sms') return isFast2SmsConfigured();
  if (provider === 'twilio') return isTwilioConfigured();
  return isFast2SmsConfigured() || isMsg91Configured() || isExotelConfigured() || isTwilioConfigured() || isMockSmsConfigured();
}

/**
 * Validate and clean standard Indian mobile numbers (10 digits starting with 6-9)
 * Returns 10-digit number string or null if invalid.
 */
function validateIndianMobile(phone) {
  if (!phone || (typeof phone !== 'string' && typeof phone !== 'number')) return null;
  const clean = String(phone).replace(/\D/g, '');
  const last10 = clean.slice(-10);
  if (last10.length === 10 && /^[6-9]\d{9}$/.test(last10)) {
    return last10;
  }
  return null;
}

/**
 * Duplicate Prevention: Check if resolution SMS was already sent for this grievance
 */
async function hasResolutionSmsBeenSent(refId) {
  if (!refId) return false;
  try {
    const existing = await db.prepare(`
      SELECT id FROM notification_logs 
      WHERE ref_id = ? AND channel = 'sms' AND event_type = 'complaint_resolved' AND status = 'sent'
      LIMIT 1
    `).get(refId);
    return Boolean(existing);
  } catch {
    return false;
  }
}

/**
 * Duplicate Prevention: Check if registration SMS was already sent for this grievance
 */
async function hasRegistrationSmsBeenSent(refId) {
  if (!refId) return false;
  try {
    const existing = await db.prepare(`
      SELECT id FROM notification_logs 
      WHERE ref_id = ? AND channel = 'sms' AND event_type = 'complaint_registered' AND status = 'sent'
      LIMIT 1
    `).get(refId);
    return Boolean(existing);
  } catch {
    return false;
  }
}

/**
 * Check if WhatsApp is configured
 */
function isWhatsAppConfigured() {
  const key = process.env.WHATSAPP_API_KEY;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  return Boolean(key && phoneId && !key.includes('your_'));
}

/**
 * Generate CivicResolve Branded HTML Email Template
 */
function generateEmailTemplate({
  headline,
  recipientName,
  refId,
  status,
  message,
  detailsHtml = '',
  actionUrl = 'http://localhost:5173',
  actionText = 'Track Grievance Live'
}) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #0f172a; margin: 0; padding: 24px; }
        .wrapper { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05); }
        .header { background: #0a192f; color: #ffffff; padding: 28px 24px; text-align: center; }
        .logo { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; margin: 0; }
        .logo span { color: #14b8a6; }
        .tagline { margin: 6px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 600; }
        .content { padding: 28px 24px; font-size: 14px; line-height: 1.6; color: #334155; }
        .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
        .ref-card { background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #0d9488; border-radius: 10px; padding: 14px 18px; margin: 20px 0; }
        .ref-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
        .ref-val { font-family: 'Courier New', monospace; font-size: 20px; font-weight: 800; color: #0a192f; margin-top: 4px; }
        .status-badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: #ccfbf1; color: #0f766e; margin-top: 6px; }
        .details-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
        .details-table td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
        .details-table td:first-child { font-weight: 600; color: #64748b; width: 35%; }
        .cta-btn { display: inline-block; background: #0d9488; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 700; font-size: 13px; margin: 20px 0 10px 0; text-align: center; }
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.5; }
        .footer a { color: #0d9488; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1 class="logo">Civic<span>Resolve</span></h1>
          <p class="tagline">AI-Powered Citizen Grievance Redressal</p>
        </div>
        <div class="content">
          <div class="greeting">${headline}</div>
          <p>Hello <strong>${recipientName || 'Citizen'}</strong>,</p>
          <p>${message}</p>
          
          ${refId ? `
            <div class="ref-card">
              <div class="ref-label">Grievance Reference ID</div>
              <div class="ref-val">${refId}</div>
              ${status ? `<div><span class="status-badge">Status: ${status}</span></div>` : ''}
            </div>
          ` : ''}

          ${detailsHtml}

          ${refId ? `
            <div style="text-align: center;">
              <a href="${actionUrl}" class="cta-btn">${actionText}</a>
            </div>
          ` : ''}

          <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
            This is an automated notification from CivicResolve. You can track all inspection updates and official remarks in real time.
          </p>
        </div>
        <div class="footer">
          <strong>CivicResolve Public Redressal Platform</strong><br>
          "Report Issues. Track Action. Build Better Communities."<br>
          Emergency Civic Helplines: CM Helpline (1100) • TANGEDCO (1912) • Police (100)
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Dispatch real email via SMTP, recording precise delivery state in notification_logs
 */
async function sendEmail({ to, subject, html, text, refId = null, eventType = 'general_notification' }) {
  if (!to || !to.includes('@')) {
    return { success: false, status: 'failed', error: 'Invalid recipient email address' };
  }

  // Insert initial pending record
  const logInsert = db.prepare(`
    INSERT INTO notification_logs (ref_id, recipient, channel, event_type, status, subject, body, attempts, created_at)
    VALUES (?, ?, 'email', ?, 'sending', ?, ?, 1, CURRENT_TIMESTAMP)
  `).run(refId, to, eventType, subject, text || subject);

  const logId = logInsert.lastInsertRowid;
  const transporter = getSmtpTransporter();

  if (!transporter) {
    const errorMsg = 'SMTP provider not configured. Please configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in server/.env';
    console.warn(`[Notification Engine] Email delivery halted for ${to}: ${errorMsg}`);
    
    db.prepare(`
      UPDATE notification_logs 
      SET status = 'failed', error_message = ?
      WHERE id = ?
    `).run(errorMsg, logId);

    return {
      success: false,
      status: 'failed',
      logId,
      error: errorMsg
    };
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || '"CivicResolve Redressal" <grievance@civicresolve.gov>',
      to: to,
      subject: subject,
      html: html,
      text: text || subject
    });

    const responseStr = JSON.stringify({ messageId: info.messageId, response: info.response });
    console.log(`[Notification Engine] Email verified & sent to ${to}. MessageId: ${info.messageId}`);

    db.prepare(`
      UPDATE notification_logs 
      SET status = 'sent', provider_response = ?, sent_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(responseStr, logId);

    return {
      success: true,
      status: 'sent',
      logId,
      messageId: info.messageId
    };
  } catch (err) {
    console.error(`[Notification Engine Error] SMTP send failed to ${to}:`, err.message);

    db.prepare(`
      UPDATE notification_logs 
      SET status = 'failed', error_message = ?
      WHERE id = ?
    `).run(err.message, logId);

    return {
      success: false,
      status: 'failed',
      logId,
      error: err.message
    };
  }
}

/**
 * Dispatch SMS Notification via configured Indian/Global provider or Mock Adapter
 */
async function sendSms({ to, text, otp = null, refId = null, eventType = 'sms_notification' }) {
  if (!to) return { success: false, status: 'failed', error: 'No recipient phone provided' };

  const validPhone = validateIndianMobile(to);
  if (!validPhone) {
    const errorMsg = `Invalid Indian mobile number: "${to}". Must be a valid 10-digit number starting with 6-9.`;
    console.warn(`[SMS Engine] Validation failed for ${to}: ${errorMsg}`);
    try {
      await db.prepare(`
        INSERT INTO notification_logs (ref_id, recipient, channel, event_type, status, subject, body, error_message, attempts, created_at)
        VALUES (?, ?, 'sms', ?, 'failed', 'SMS Notification', ?, ?, 1, CURRENT_TIMESTAMP)
      `).run(refId, String(to).slice(0, 30), eventType, text, errorMsg);
    } catch {}
    return { success: false, status: 'invalid_number', error: errorMsg };
  }

  let logId = null;
  try {
    const logInsert = await db.prepare(`
      INSERT INTO notification_logs (ref_id, recipient, channel, event_type, status, subject, body, attempts, created_at)
      VALUES (?, ?, 'sms', ?, 'sending', 'SMS Notification', ?, 1, CURRENT_TIMESTAMP)
    `).run(refId, validPhone, eventType, text);
    logId = logInsert?.lastInsertRowid;
  } catch (err) {
    console.warn('[SMS Log Insert Notice]:', err.message);
  }

  // If unconfigured, fail truthfully and never pretend SMS was sent
  if (!isSmsConfigured()) {
    const errorMsg = 'SMS provider unconfigured. Please configure SMS credentials in server/.env.';
    console.warn(`[SMS Engine] Delivery halted for ${validPhone}: SMS gateway unconfigured.`);
    if (logId) {
      try {
        await db.prepare(`UPDATE notification_logs SET status = 'failed', error_message = ? WHERE id = ?`)
          .run(errorMsg, logId);
      } catch {}
    }
    return { success: false, status: 'unconfigured', logId, error: errorMsg };
  }

  try {
    // 0. Mock Provider (for automated test suite and development)
    if (isMockSmsConfigured()) {
      const mockMessageId = `MOCK-SMS-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      const responseData = {
        provider: 'mock',
        status: 'delivered',
        messageId: mockMessageId,
        recipient: `+91${validPhone}`,
        refId,
        eventType,
        timestamp: new Date().toISOString()
      };
      console.log(`[SMS Mock Adapter] Simulated SMS dispatched to +91-${validPhone} (${eventType}): "${text}"`);
      if (logId) {
        await db.prepare(`UPDATE notification_logs SET status = 'sent', provider_response = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(JSON.stringify(responseData), logId);
      }
      return { success: true, status: 'sent', provider: 'mock', messageId: mockMessageId, logId };
    }

    // 1. Fast2SMS Provider
    if (isFast2SmsConfigured()) {
      const apiKey = process.env.FAST2SMS_API_KEY || process.env.SMS_API_KEY;
      const extractedOtp = otp || (text.match(/\b\d{6}\b/) ? text.match(/\b\d{6}\b/)[0] : null);

      let payload;
      if (extractedOtp) {
        payload = {
          route: 'otp',
          variables_values: extractedOtp,
          numbers: validPhone
        };
      } else {
        payload = {
          route: 'v3',
          sender_id: process.env.SMS_SENDER_ID || 'TXTIND',
          message: text,
          language: 'english',
          flash: 0,
          numbers: validPhone
        };
      }

      const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || data.return === false) {
        throw new Error((data.message && data.message[0]) || data.message || 'Fast2SMS returned error');
      }

      if (logId) {
        await db.prepare(`UPDATE notification_logs SET status = 'sent', provider_response = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(JSON.stringify(data), logId);
      }

      return { success: true, status: 'sent', provider: 'fast2sms', messageId: data.request_id, logId };
    }

    // 2. MSG91 Provider
    if (isMsg91Configured()) {
      const authKey = process.env.MSG91_AUTH_KEY || process.env.SMS_API_KEY;
      const templateId = process.env.SMS_TEMPLATE_ID || process.env.MSG91_TEMPLATE_ID || process.env.MSG91_FLOW_ID;
      const senderId = process.env.SMS_SENDER_ID || process.env.MSG91_SENDER_ID || 'CIVICR';
      const extractedOtp = otp || (text.match(/\b\d{6}\b/) ? text.match(/\b\d{6}\b/)[0] : null);

      let endpoint = 'https://control.msg91.com/api/v5/otp';
      let payload = {
        template_id: templateId,
        mobile: '91' + validPhone,
        otp: extractedOtp,
        sender: senderId
      };

      if (!extractedOtp) {
        endpoint = 'https://control.msg91.com/api/v5/flow';
        payload = {
          template_id: templateId,
          short_url: '0',
          recipients: [
            {
              mobiles: '91' + validPhone,
              COMPLAINT_ID: refId || '',
              message: text
            }
          ]
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'authkey': authKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || data.type === 'error') {
        throw new Error(data.message || 'MSG91 API returned failure');
      }
      if (logId) {
        await db.prepare(`UPDATE notification_logs SET status = 'sent', provider_response = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(JSON.stringify(data), logId);
      }
      return { success: true, status: 'sent', provider: 'msg91', messageId: data.request_id || data.message, logId };
    }

    // 3. Exotel Provider
    if (isExotelConfigured()) {
      const sid = process.env.EXOTEL_SID || process.env.EXOTEL_ACCOUNT_SID;
      const token = process.env.EXOTEL_TOKEN || process.env.SMS_API_KEY;
      const subAccount = process.env.EXOTEL_SUB_ACCOUNT || sid;
      const callerId = process.env.EXOTEL_CALLER_ID || process.env.SMS_SENDER_ID || '08088919888';

      const authHeader = 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64');
      const params = new URLSearchParams();
      params.append('From', callerId);
      params.append('To', validPhone);
      params.append('Body', text);

      const res = await fetch(`https://api.exotel.com/v1/Accounts/${subAccount}/Sms/send.json`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.RestException?.Message || 'Exotel SMS delivery failed');
      }
      const msgId = data.SMSMessage?.Sid || 'EXOTEL-' + Date.now();
      if (logId) {
        await db.prepare(`UPDATE notification_logs SET status = 'sent', provider_response = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(JSON.stringify(data), logId);
      }
      return { success: true, status: 'sent', provider: 'exotel', messageId: msgId, logId };
    }

    // 4. Twilio Provider
    if (isTwilioConfigured()) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromPhone = process.env.TWILIO_PHONE_NUMBER;

      const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', `+91${validPhone}`);
      params.append('From', fromPhone);
      params.append('Body', text);

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Twilio API returned failure');
      }

      if (logId) {
        await db.prepare(`UPDATE notification_logs SET status = 'sent', provider_response = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(JSON.stringify(data), logId);
      }

      return { success: true, status: 'sent', provider: 'twilio', messageId: data.sid, logId };
    }

    throw new Error('No recognized SMS provider configured');
  } catch (err) {
    console.error(`[SMS Engine Error] SMS send failed to ${validPhone}:`, err.message);
    if (logId) {
      try {
        await db.prepare(`UPDATE notification_logs SET status = 'failed', error_message = ? WHERE id = ?`).run(err.message, logId);
      } catch {}
    }
    return { success: false, status: 'failed', logId, error: err.message };
  }
}

/**
 * Phase 5 A: Send Citizen Complaint Registration SMS
 * Message: "Dear Citizen, your complaint has been successfully registered with CivicResolve. Your Complaint ID is {COMPLAINT_ID}. You can use this ID to track your complaint status. Thank you."
 */
async function sendComplaintRegistrationSms(refId, phone) {
  if (!refId || !phone) return { success: false, status: 'skipped', error: 'Missing refId or phone' };

  // Double-layer duplicate prevention
  const alreadySent = await hasRegistrationSmsBeenSent(refId);
  if (alreadySent) {
    console.log(`[SMS Notification] Duplicate registration SMS prevented for ${refId}`);
    return { success: false, status: 'duplicate_prevented', message: 'Registration SMS already delivered for this complaint.' };
  }

  const message = `Dear Citizen, your complaint has been successfully registered with CivicResolve. Your Complaint ID is ${refId}. You can use this ID to track your complaint status. Thank you.`;
  return sendSms({
    to: phone,
    text: message,
    refId,
    eventType: 'complaint_registered'
  });
}

/**
 * Phase 5 B: Send Citizen Complaint Resolution SMS
 * Message: "Dear Citizen, your complaint {COMPLAINT_ID} has been marked as resolved. Thank you for using CivicResolve. Please visit the portal to review your complaint."
 */
async function sendComplaintResolutionSms(refId, phone) {
  if (!refId || !phone) return { success: false, status: 'skipped', error: 'Missing refId or phone' };

  // Double-layer duplicate prevention
  const alreadySent = await hasResolutionSmsBeenSent(refId);
  if (alreadySent) {
    console.log(`[SMS Notification] Duplicate resolution SMS prevented for ${refId}`);
    return { success: false, status: 'duplicate_prevented', message: 'Resolution SMS already delivered for this complaint.' };
  }

  const message = `Dear Citizen, your complaint ${refId} has been marked as resolved. Thank you for using CivicResolve. Please visit the portal to review your complaint.`;
  return sendSms({
    to: phone,
    text: message,
    refId,
    eventType: 'complaint_resolved'
  });
}

/**
 * Dispatch WhatsApp Notification (Configurable WhatsApp Cloud API)
 */
async function sendWhatsApp({ to, text, refId = null, eventType = 'whatsapp_notification' }) {
  if (!to) return { success: false, status: 'failed', error: 'No recipient phone provided' };

  const logInsert = db.prepare(`
    INSERT INTO notification_logs (ref_id, recipient, channel, event_type, status, subject, body, attempts, created_at)
    VALUES (?, ?, 'whatsapp', ?, 'sending', 'WhatsApp Update', ?, 1, CURRENT_TIMESTAMP)
  `).run(refId, to, eventType, text);

  const logId = logInsert.lastInsertRowid;

  if (!isWhatsAppConfigured()) {
    const errorMsg = 'WhatsApp Business API unconfigured. Set WHATSAPP_API_KEY, WHATSAPP_PHONE_NUMBER_ID in server/.env';
    db.prepare(`UPDATE notification_logs SET status = 'failed', error_message = ? WHERE id = ?`).run(errorMsg, logId);
    return { success: false, status: 'failed', error: errorMsg };
  }

  try {
    const apiKey = process.env.WHATSAPP_API_KEY;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace(/\D/g, ''),
      type: 'text',
      text: { body: text }
    };

    const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'WhatsApp Cloud API returned error');
    }

    db.prepare(`UPDATE notification_logs SET status = 'sent', provider_response = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(JSON.stringify(data), logId);

    return { success: true, status: 'sent', messageId: data.messages?.[0]?.id };
  } catch (err) {
    db.prepare(`UPDATE notification_logs SET status = 'failed', error_message = ? WHERE id = ?`).run(err.message, logId);
    return { success: false, status: 'failed', error: err.message };
  }
}

/**
 * Dispatch Event-Specific Notifications Across Available Channels
 */
async function notifyCitizenEvent({ eventType, citizenName, citizenEmail, citizenPhone, refId, grievanceTitle, status, details = {} }) {
  // Always safely run without throwing errors to the parent flow
  try {
    let headline = '';
    let message = '';
    let detailsHtml = '';

    switch (eventType) {
      case 'citizen_registration':
        headline = 'Welcome to CivicResolve!';
        message = 'Your citizen account has been successfully verified. You can now submit municipal grievances, track live field actions, and inspect guaranteed SLAs across Tamil Nadu.';
        break;

      case 'submission_acknowledgement':
        headline = 'Grievance Registered Successfully';
        message = `Your civic complaint regarding "<strong>${grievanceTitle}</strong>" has been registered and analyzed by CivicResolve AI.`;
        detailsHtml = `
          <table class="details-table">
            <tr><td>Category:</td><td>${details.category || 'General Civic'}</td></tr>
            <tr><td>Jurisdiction:</td><td>${details.district || 'Chennai'} (${details.ward || 'Municipal Ward'})</td></tr>
            <tr><td>Allocated Dept:</td><td>${details.department || 'Municipal Operations'}</td></tr>
            <tr><td>Target SLA:</td><td><strong>${details.slaHours || 24} Hours</strong></td></tr>
          </table>
        `;
        break;

      case 'department_assignment':
        headline = 'Department Assigned';
        message = `Your grievance has been assigned to the <strong>${details.department}</strong> division for field investigation.`;
        break;

      case 'officer_assignment':
        headline = 'Field Officer Dispatched';
        message = `Field inspection officer <strong>${details.officer || 'Duty Officer'}</strong> has been designated to investigate your reported incident.`;
        break;

      case 'status_update':
        headline = `Grievance Status Updated to: ${status}`;
        message = `Municipal team updated your report regarding "<strong>${grievanceTitle}</strong>".`;
        if (details.remarks) {
          detailsHtml = `<p><strong>Official Remarks:</strong> <em>"${details.remarks}"</em></p>`;
        }
        break;

      case 'additional_info_request':
        headline = 'Additional Information Requested';
        message = `The assigned field crew requires additional clarification regarding your report: "${details.remarks || 'Please provide landmark clarity'}".`;
        break;

      case 'resolution_certified':
        headline = 'Grievance Certified Resolved';
        message = `The municipal squad has completed rectification work for your report regarding "<strong>${grievanceTitle}</strong>".`;
        detailsHtml = `
          ${details.remarks ? `<p><strong>Action-Taken Report:</strong> ${details.remarks}</p>` : ''}
          ${details.evidenceUrl ? `<p><strong>Resolution Photo Proof:</strong> <a href="${details.evidenceUrl}" target="_blank">View Verified Photo</a></p>` : ''}
          <p style="margin-top: 12px; font-weight: bold; color: #0f766e;">
            Please visit your Citizen Portal to submit satisfaction feedback, or submit an Appeal if the repair is incomplete.
          </p>
        `;
        break;

      case 'appeal_update':
        headline = 'Appeal / Reopen Request Logged';
        message = `Your request to reopen grievance ${refId} has been escalated to the Zonal Supervisory Officer for re-investigation.`;
        break;

      case 'reopen_decision':
        headline = 'Supervisory Decision on Grievance';
        message = `Senior supervisory officer reviewed the appeal for grievance ${refId}. Disposition: ${details.remarks || 'Under active re-investigation.'}`;
        break;

      default:
        headline = `Grievance Update: ${refId}`;
        message = `Update regarding "${grievanceTitle}": Status is ${status}.`;
        break;
    }

    const emailSubject = `[CivicResolve] ${headline} - ${refId || 'Notice'}`;
    const html = generateEmailTemplate({
      headline,
      recipientName: citizenName,
      refId,
      status,
      message,
      detailsHtml
    });

    // 1. Send Email if email exists
    if (citizenEmail) {
      await sendEmail({
        to: citizenEmail,
        subject: emailSubject,
        html,
        text: `${headline} - Grievance ${refId || ''}. ${message}`,
        refId,
        eventType
      });
    }

    // 2. Dispatch Official Citizen SMS Notifications
    if (citizenPhone) {
      if (eventType === 'submission_acknowledgement') {
        await sendComplaintRegistrationSms(refId, citizenPhone);
      } else if (eventType === 'resolution_certified') {
        await sendComplaintResolutionSms(refId, citizenPhone);
      } else if (details.smsConsent) {
        const smsBody = `CivicResolve: Grievance ${refId || ''} update: ${headline}. Status: ${status || 'Updated'}. Track at civicresolve.gov`;
        await sendSms({
          to: citizenPhone,
          text: smsBody,
          refId,
          eventType
        });
      }
    }

  } catch (err) {
    console.warn('[Notification Dispatch Error]:', err.message);
  }
}

/**
 * Retry a failed notification log entry with duplicate-send protection
 */
async function retryNotificationLog(logId) {
  const log = db.prepare('SELECT * FROM notification_logs WHERE id = ?').get(logId);
  if (!log) {
    return { success: false, error: 'Notification log entry not found' };
  }

  if (log.status === 'sent') {
    return { success: false, error: 'Notification was already delivered. Duplicate dispatch prevented.' };
  }

  // Increment attempts
  db.prepare("UPDATE notification_logs SET attempts = attempts + 1, status = 'sending' WHERE id = ?").run(logId);

  if (log.channel === 'email') {
    const transporter = getSmtpTransporter();
    if (!transporter) {
      const errorMsg = 'SMTP provider still unconfigured. Cannot retry email.';
      db.prepare("UPDATE notification_logs SET status = 'failed', error_message = ? WHERE id = ?").run(errorMsg, logId);
      return { success: false, error: errorMsg };
    }

    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || '"CivicResolve Redressal" <grievance@civicresolve.gov>',
        to: log.recipient,
        subject: log.subject || '[CivicResolve] Notification',
        html: log.body ? `<p>${log.body}</p>` : '<p>CivicResolve notification retry.</p>',
        text: log.body
      });

      db.prepare(`
        UPDATE notification_logs 
        SET status = 'sent', provider_response = ?, sent_at = CURRENT_TIMESTAMP, error_message = NULL
        WHERE id = ?
      `).run(JSON.stringify({ messageId: info.messageId }), logId);

      return { success: true, message: 'Notification successfully delivered on retry' };
    } catch (err) {
      db.prepare("UPDATE notification_logs SET status = 'failed', error_message = ? WHERE id = ?").run(err.message, logId);
      return { success: false, error: err.message };
    }
  }

  if (log.channel === 'sms') {
    const validPhone = validateIndianMobile(log.recipient);
    if (!validPhone) {
      const err = `Invalid Indian mobile number (${log.recipient}). Cannot retry SMS.`;
      db.prepare("UPDATE notification_logs SET status = 'failed', error_message = ? WHERE id = ?").run(err, logId);
      return { success: false, error: err };
    }

    if (!isSmsConfigured()) {
      const errorMsg = 'SMS provider still unconfigured. Cannot retry SMS.';
      db.prepare("UPDATE notification_logs SET status = 'failed', error_message = ? WHERE id = ?").run(errorMsg, logId);
      return { success: false, error: errorMsg };
    }

    try {
      const res = await sendSms({
        to: validPhone,
        text: log.body,
        refId: log.ref_id,
        eventType: log.event_type || 'sms_retry'
      });

      if (res.success) {
        db.prepare(`
          UPDATE notification_logs 
          SET status = 'sent', provider_response = ?, sent_at = CURRENT_TIMESTAMP, error_message = NULL
          WHERE id = ?
        `).run(JSON.stringify(res), logId);
        return { success: true, message: 'SMS notification successfully delivered on retry' };
      } else {
        db.prepare("UPDATE notification_logs SET status = 'failed', error_message = ? WHERE id = ?").run(res.error || 'Retry failed', logId);
        return { success: false, error: res.error || 'SMS retry delivery failed' };
      }
    } catch (err) {
      db.prepare("UPDATE notification_logs SET status = 'failed', error_message = ? WHERE id = ?").run(err.message, logId);
      return { success: false, error: err.message };
    }
  }

  return { success: false, error: `Channel ${log.channel} retry not supported without credentials` };
}

/**
 * Administrator SMTP Test Delivery
 */
async function testSmtpConnection(targetEmail, adminName = 'Administrator') {
  const isConfigured = isSmtpConfigured();
  if (!isConfigured) {
    // Record failed attempt truthfully
    const result = await sendEmail({
      to: targetEmail,
      subject: '[CivicResolve] SMTP Configuration Test',
      html: '<p>Test email</p>',
      text: 'Test email from CivicResolve',
      eventType: 'test_email'
    });
    return {
      success: false,
      status: 'failed',
      message: 'SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) are not configured in server/.env.',
      logId: result.logId
    };
  }

  const html = generateEmailTemplate({
    headline: 'CivicResolve SMTP Test Email',
    recipientName: adminName,
    refId: 'TEST-SMTP-2026',
    status: 'Verified',
    message: 'This is a live test email dispatched from the CivicResolve Notification Engine. If you are reading this, your SMTP host, port, credentials, and TLS handshake are working correctly.'
  });

  const result = await sendEmail({
    to: targetEmail,
    subject: '[CivicResolve] Live SMTP Configuration Test',
    html: html,
    text: 'Live SMTP Test from CivicResolve Administrator Console.',
    refId: 'TEST-SMTP-2026',
    eventType: 'test_email'
  });

  return result;
}

module.exports = {
  sendEmail,
  sendSms,
  sendComplaintRegistrationSms,
  sendComplaintResolutionSms,
  validateIndianMobile,
  hasResolutionSmsBeenSent,
  hasRegistrationSmsBeenSent,
  sendWhatsApp,
  notifyCitizenEvent,
  retryNotificationLog,
  testSmtpConnection,
  isSmtpConfigured,
  isSmsConfigured,
  isFast2SmsConfigured,
  isMsg91Configured,
  isExotelConfigured,
  isTwilioConfigured,
  isMockSmsConfigured,
  isWhatsAppConfigured
};
