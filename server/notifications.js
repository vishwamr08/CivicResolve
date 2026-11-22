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
  const key = process.env.MSG91_AUTH_KEY;
  return Boolean(key && !key.includes('your_'));
}

/**
 * Check if Fast2SMS is configured
 */
function isFast2SmsConfigured() {
  const key = process.env.FAST2SMS_API_KEY;
  return Boolean(key && !key.includes('your_'));
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
 * Check if SMS (Fast2SMS, MSG91, or Twilio) is configured
 */
function isSmsConfigured() {
  const provider = (process.env.SMS_PROVIDER || '').toLowerCase();
  if (provider === 'fast2sms') return isFast2SmsConfigured();
  if (provider === 'msg91') return isMsg91Configured();
  if (provider === 'twilio') return isTwilioConfigured();
  return isFast2SmsConfigured() || isMsg91Configured() || isTwilioConfigured();
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
 * Dispatch SMS Notification via Fast2SMS, MSG91, or Twilio
 */
async function sendSms({ to, text, otp = null, refId = null, eventType = 'sms_notification' }) {
  if (!to) return { success: false, status: 'failed', error: 'No recipient phone provided' };

  const cleanPhone = to.replace(/\D/g, '').slice(-10);

  const logInsert = db.prepare(`
    INSERT INTO notification_logs (ref_id, recipient, channel, event_type, status, subject, body, attempts, created_at)
    VALUES (?, ?, 'sms', ?, 'sending', 'SMS Update', ?, 1, CURRENT_TIMESTAMP)
  `).run(refId, cleanPhone, eventType, text);

  const logId = logInsert.lastInsertRowid;

  // If unconfigured, fail truthfully and never pretend SMS was sent
  if (!isSmsConfigured()) {
    const errorMsg = 'SMS verification is temporarily unavailable. Please try again later.';
    console.warn(`[SMS Engine] Delivery halted for ${cleanPhone}: SMS gateway (Fast2SMS / MSG91 / Twilio) unconfigured.`);
    db.prepare(`UPDATE notification_logs SET status = 'failed', error_message = ? WHERE id = ?`)
      .run('Gateway unconfigured in server/.env', logId);
    return { success: false, status: 'unconfigured', error: errorMsg };
  }

  try {
    // 1. Fast2SMS Provider (Preferred for Indian Mobile Numbers)
    if (isFast2SmsConfigured()) {
      const apiKey = process.env.FAST2SMS_API_KEY;
      const extractedOtp = otp || (text.match(/\b\d{6}\b/) ? text.match(/\b\d{6}\b/)[0] : null);

      let payload;
      if (extractedOtp) {
        payload = {
          route: 'otp',
          variables_values: extractedOtp,
          numbers: cleanPhone
        };
      } else {
        payload = {
          route: 'v3',
          sender_id: process.env.SMS_SENDER_ID || 'TXTIND',
          message: text,
          language: 'english',
          flash: 0,
          numbers: cleanPhone
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

      db.prepare(`UPDATE notification_logs SET status = 'sent', provider_response = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(JSON.stringify(data), logId);

      return { success: true, status: 'sent', provider: 'fast2sms', messageId: data.request_id };
    }

    // 2. MSG91 Provider
    if (isMsg91Configured()) {
      const authKey = process.env.MSG91_AUTH_KEY;
      const templateId = process.env.MSG91_TEMPLATE_ID || process.env.MSG91_FLOW_ID;
      const senderId = process.env.SMS_SENDER_ID || process.env.MSG91_SENDER_ID || 'CIVICR';
      const extractedOtp = otp || (text.match(/\b\d{6}\b/) ? text.match(/\b\d{6}\b/)[0] : '');

      const res = await fetch('https://control.msg91.com/api/v5/otp', {
        method: 'POST',
        headers: {
          'authkey': authKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_id: templateId,
          mobile: '91' + cleanPhone,
          otp: extractedOtp,
          sender: senderId
        })
      });
      const data = await res.json();
      if (!res.ok || data.type === 'error') {
        throw new Error(data.message || 'MSG91 API returned failure');
      }
      db.prepare(`UPDATE notification_logs SET status = 'sent', provider_response = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(JSON.stringify(data), logId);
      return { success: true, status: 'sent', provider: 'msg91', messageId: data.request_id };
    }

    // 3. Twilio Provider
    if (isTwilioConfigured()) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromPhone = process.env.TWILIO_PHONE_NUMBER;

      const authHeader = 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', to.startsWith('+') ? to : `+91${cleanPhone}`);
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

      db.prepare(`UPDATE notification_logs SET status = 'sent', provider_response = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(JSON.stringify(data), logId);

      return { success: true, status: 'sent', provider: 'twilio', messageId: data.sid };
    }

    throw new Error('No recognized SMS provider configured');
  } catch (err) {
    console.error(`[SMS Engine Error] SMS send failed to ${cleanPhone}:`, err.message);
    db.prepare(`UPDATE notification_logs SET status = 'failed', error_message = ? WHERE id = ?`).run(err.message, logId);
    return { success: false, status: 'failed', error: err.message };
  }
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

    // 2. Send SMS if phone exists and SMS is configured
    if (citizenPhone && details.smsConsent) {
      const smsBody = `CivicResolve: Grievance ${refId || ''} update: ${headline}. Status: ${status || 'Updated'}. Track at civicresolve.gov`;
      await sendSms({
        to: citizenPhone,
        text: smsBody,
        refId,
        eventType
      });
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
  sendWhatsApp,
  notifyCitizenEvent,
  retryNotificationLog,
  testSmtpConnection,
  isSmtpConfigured,
  isSmsConfigured,
  isFast2SmsConfigured,
  isMsg91Configured,
  isTwilioConfigured,
  isWhatsAppConfigured
};
