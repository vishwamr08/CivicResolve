/**
 * CivicResolve - Free-First Multi-Channel Notification Engine
 *
 * Channels implemented (Zero paid SMS dependencies in workflow dispatch):
 * 1. Official Resend Email SDK (`RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_ENABLED`)
 * 2. Browser Web Push (`pushService.js` via `VAPID_*` keys & Service Worker)
 * 3. Persistent In-App Notification Centre (`notifications` table)
 *
 * Guarantees:
 * - Each channel handles errors independently without blocking grievance workflows
 * - Duplicate dispatch protection per complaint & lifecycle event
 * - Controlled administrative retry with attempt tracking
 * - Never transmits live emails or pushes during automated tests (`NODE_ENV=test`)
 * - Never fabricates `status="sent"` when delivery was skipped or unconfigured
 */

const { Resend } = require('resend');
const nodemailer = require('nodemailer');
const db = require('./db');
const { sendPushNotificationToUser } = require('./pushService');

let testEmailAdapter = null;

function setTestEmailAdapter(fn) {
  testEmailAdapter = typeof fn === 'function' ? fn : null;
}

function getAppBaseUrl() {
  return (process.env.FRONTEND_URL || 'https://civicresolve-yc9v.onrender.com').replace(/\/$/, '');
}

function isEmailEnabledFlag() {
  return String(process.env.EMAIL_ENABLED || 'true').toLowerCase() !== 'false';
}

function isResendConfigured() {
  if (!isEmailEnabledFlag()) return false;
  const key = (process.env.RESEND_API_KEY || '').trim();
  return Boolean(key && !key.includes('your_') && !key.includes('re_your_'));
}

function getResendFromAddress() {
  const configured = (process.env.EMAIL_FROM || '').trim();
  if (configured && !configured.includes('your_')) {
    return configured;
  }
  return 'CivicResolve <onboarding@resend.dev>';
}

function getSmtpTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass && !host.includes('your_') && !user.includes('your_')) {
    return nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000
    });
  }
  return null;
}

function isSmtpConfigured() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  return Boolean(host && user && pass && !host.includes('your_') && !user.includes('your_'));
}

// Legacy SMS configuration checks retained solely for isolated backward unit tests
function isMsg91Configured() {
  const provider = (process.env.SMS_PROVIDER || '').toLowerCase();
  const key = process.env.MSG91_AUTH_KEY || (provider === 'msg91' ? process.env.SMS_API_KEY : null);
  return Boolean(key && !key.includes('your_'));
}

function isFast2SmsConfigured() {
  const provider = (process.env.SMS_PROVIDER || '').toLowerCase();
  const key = process.env.FAST2SMS_API_KEY || (provider === 'fast2sms' ? process.env.SMS_API_KEY : null);
  return Boolean(key && !key.includes('your_'));
}

function isExotelConfigured() {
  const provider = (process.env.SMS_PROVIDER || '').toLowerCase();
  const sid = process.env.EXOTEL_SID || process.env.EXOTEL_ACCOUNT_SID;
  const token = process.env.EXOTEL_TOKEN || (provider === 'exotel' ? process.env.SMS_API_KEY : null);
  return Boolean(sid && token && !sid.includes('your_'));
}

function isTwilioConfigured() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  return Boolean(sid && token && from && !sid.includes('your_'));
}

function isMockSmsConfigured() {
  const provider = (process.env.SMS_PROVIDER || '').toLowerCase();
  return provider === 'mock' || process.env.MOCK_SMS === 'true';
}

function isSmsConfigured() {
  const provider = (process.env.SMS_PROVIDER || '').toLowerCase();
  if (provider === 'mock') return true;
  if (provider === 'msg91') return isMsg91Configured();
  if (provider === 'exotel') return isExotelConfigured();
  if (provider === 'fast2sms') return isFast2SmsConfigured();
  if (provider === 'twilio') return isTwilioConfigured();
  return isFast2SmsConfigured() || isMsg91Configured() || isExotelConfigured() || isTwilioConfigured() || isMockSmsConfigured();
}

function isWhatsAppConfigured() {
  return false;
}

function validateIndianMobile(phone) {
  if (!phone || (typeof phone !== 'string' && typeof phone !== 'number')) return null;
  const clean = String(phone).replace(/\D/g, '');
  const last10 = clean.slice(-10);
  if (last10.length === 10 && /^[6-9]\d{9}$/.test(last10)) {
    return last10;
  }
  return null;
}

async function hasEmailEventBeenSent(refId, recipientEmail, eventType) {
  if (!refId || !recipientEmail || !eventType) return false;
  try {
    const existing = await db.prepare(`
      SELECT id FROM notification_logs
      WHERE ref_id = ? AND channel = 'email' AND LOWER(recipient) = ? AND event_type = ? AND status = 'sent'
      LIMIT 1
    `).get(refId, recipientEmail.toLowerCase().trim(), eventType);
    return Boolean(existing);
  } catch {
    return false;
  }
}

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

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generate CivicResolve Branded HTML Email Template
 */
function generateEmailTemplate({
  headline,
  recipientName,
  refId,
  status,
  messageHtml,
  detailsHtml = '',
  actionUrl = null,
  actionText = 'Track Grievance Status'
}) {
  const targetUrl = actionUrl || (refId ? `${getAppBaseUrl()}/?trackRef=${encodeURIComponent(refId)}` : getAppBaseUrl());
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #0f172a; margin: 0; padding: 24px; }
        .wrapper { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 8px 20px -4px rgba(15, 23, 42, 0.08); }
        .header { background: #1a3c6e; color: #ffffff; padding: 24px; text-align: center; border-bottom: 4px solid #f47920; }
        .logo { font-size: 22px; font-weight: 800; letter-spacing: -0.4px; color: #ffffff; margin: 0; }
        .logo span { color: #f47920; }
        .tagline { margin: 6px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #cbd5e1; font-weight: 600; }
        .content { padding: 28px 24px; font-size: 14px; line-height: 1.6; color: #334155; }
        .greeting { font-size: 17px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
        .ref-card { background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #1a3c6e; border-radius: 10px; padding: 14px 18px; margin: 20px 0; }
        .ref-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; }
        .ref-val { font-family: 'Courier New', monospace; font-size: 20px; font-weight: 800; color: #1a3c6e; margin-top: 4px; }
        .status-badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; background: #e0f2fe; color: #0369a1; margin-top: 8px; }
        .details-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
        .details-table td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
        .details-table td:first-child { font-weight: 600; color: #64748b; width: 35%; }
        .cta-btn { display: inline-block; background: #f47920; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 13px; margin: 20px 0 10px 0; text-align: center; }
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 20px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1 class="logo">Civic<span>Resolve</span></h1>
          <p class="tagline">Citizen Grievance Redressal & Monitoring Platform</p>
        </div>
        <div class="content">
          <div class="greeting">${escapeHtml(headline)}</div>
          <p>Dear <strong>${escapeHtml(recipientName || 'Citizen')}</strong>,</p>
          <p>${messageHtml}</p>

          ${refId ? `
            <div class="ref-card">
              <div class="ref-label">Complaint Reference ID</div>
              <div class="ref-val">${escapeHtml(refId)}</div>
              ${status ? `<div><span class="status-badge">Status: ${escapeHtml(status)}</span></div>` : ''}
            </div>
          ` : ''}

          ${detailsHtml}

          ${refId ? `
            <div style="text-align: center;">
              <a href="${escapeHtml(targetUrl)}" class="cta-btn">${escapeHtml(actionText)}</a>
            </div>
          ` : ''}

          <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
            You can review complete timeline updates, field inspection remarks, and official acknowledgement receipts at any time on CivicResolve.
          </p>
        </div>
        <div class="footer">
          <strong>CivicResolve Public Redressal Platform</strong><br>
          Report Issues • Track Action • Build Better Communities<br>
          Civic Helplines: Municipal Helpline (1800-425-1100 / 1100) • Electricity (1912)
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Create a persistent In-App Notification with duplicate suppression for lifecycle milestones.
 */
async function createInAppNotification({
  recipientType,
  recipientId,
  refId = null,
  title,
  message,
  eventType = 'grievance_update',
  actionUrl = null
}) {
  if (!recipientType || !title || !message) return null;

  try {
    if (refId && (eventType === 'complaint_registered' || eventType === 'complaint_resolved' || eventType === 'submission_acknowledgement' || eventType === 'resolution_certified')) {
      const normalizedEvent = eventType === 'submission_acknowledgement'
        ? 'complaint_registered'
        : eventType === 'resolution_certified'
          ? 'complaint_resolved'
          : eventType;

      const existing = recipientId !== null && recipientId !== undefined
        ? await db.prepare(`
            SELECT id FROM notifications
            WHERE recipient_type = ? AND recipient_id = ? AND ref_id = ? AND event_type IN (?, ?)
            LIMIT 1
          `).get(recipientType, recipientId, refId, eventType, normalizedEvent)
        : null;

      if (existing) {
        return { id: existing.id, duplicatePrevented: true };
      }
    }

    const effectiveUrl = actionUrl || (refId ? `/?trackRef=${encodeURIComponent(refId)}` : null);
    const result = await db.prepare(`
      INSERT INTO notifications (recipient_type, recipient_id, ref_id, title, message, event_type, action_url, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
    `).run(recipientType, recipientId ?? null, refId, title, message, eventType, effectiveUrl);

    return { id: result?.lastInsertRowid, duplicatePrevented: false };
  } catch (err) {
    console.warn('[In-App Notification Error]:', err.message);
    return null;
  }
}

/**
 * Send Email using official Resend SDK (free-tier-first), recording real status in notification_logs.
 * Falls back cleanly to SMTP only if RESEND_API_KEY is absent AND SMTP is configured.
 * Strictly blocks live external requests during NODE_ENV=test.
 */
async function sendEmail({ to, subject, html, text, refId = null, eventType = 'general_notification', skipDuplicateCheck = false }) {
  if (!to || !String(to).includes('@')) {
    return { success: false, status: 'failed', error: 'Invalid recipient email address' };
  }

  const cleanTo = String(to).trim().toLowerCase();

  if (!isEmailEnabledFlag()) {
    return { success: false, status: 'disabled', error: 'Email notifications are disabled (EMAIL_ENABLED=false).' };
  }

  // Prevent duplicate delivery on registration & resolution emails
  if (!skipDuplicateCheck && refId && ['submission_acknowledgement', 'complaint_registered', 'resolution_certified', 'complaint_resolved'].includes(eventType)) {
    const dup = await hasEmailEventBeenSent(refId, cleanTo, eventType);
    if (dup) {
      return { success: false, status: 'duplicate_prevented', error: 'Duplicate email prevented for lifecycle event.' };
    }
  }

  const logInsert = await db.prepare(`
    INSERT INTO notification_logs (ref_id, recipient, channel, event_type, status, subject, body, attempts, created_at)
    VALUES (?, ?, 'email', ?, 'sending', ?, ?, 1, CURRENT_TIMESTAMP)
  `).run(refId, cleanTo, eventType, subject, text || subject);

  const logId = logInsert?.lastInsertRowid;
  const isTestEnv = process.env.NODE_ENV === 'test';
  const mockMode = (isTestEnv && process.env.MOCK_EMAIL === 'true') || process.env.EMAIL_PROVIDER === 'mock';

  try {
    // 1. Injected Test Adapter (deterministic testing without network calls)
    if (testEmailAdapter) {
      const adapterResult = await testEmailAdapter({ from: getResendFromAddress(), to: cleanTo, subject, html, text });
      const msgId = adapterResult?.id || adapterResult?.messageId || `TEST-EMAIL-${Date.now()}`;
      if (logId) {
        await db.prepare(`UPDATE notification_logs SET status = 'sent', provider_response = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(JSON.stringify({ provider: 'test-adapter', messageId: msgId }), logId);
      }
      return { success: true, status: 'sent', provider: 'resend-test', logId, messageId: msgId };
    }

    // 2. Safe Offline Mock Mode during tests
    if (mockMode) {
      const mockId = `mock_resend_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      console.log(`[Resend Mock Adapter] Simulated Email to ${cleanTo} (${eventType}): "${subject}"`);
      if (logId) {
        await db.prepare(`UPDATE notification_logs SET status = 'sent', provider_response = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(JSON.stringify({ provider: 'mock', id: mockId }), logId);
      }
      return { success: true, status: 'sent', provider: 'mock', logId, messageId: mockId };
    }

    // Never make real external network calls in automated tests even if a key happens to be present
    if (isTestEnv) {
      const errorMsg = 'External email disabled in test environment (set MOCK_EMAIL=true or use test adapter).';
      if (logId) {
        await db.prepare(`UPDATE notification_logs SET status = 'failed', error_message = ? WHERE id = ?`).run(errorMsg, logId);
      }
      return { success: false, status: 'failed', logId, error: errorMsg };
    }

    // 3. Official Resend API Delivery
    if (isResendConfigured()) {
      const resend = new Resend(process.env.RESEND_API_KEY.trim());
      const fromAddress = getResendFromAddress();
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: [cleanTo],
        subject,
        html,
        text: text || subject
      });

      if (error) {
        throw new Error(error.message || JSON.stringify(error));
      }

      const responseStr = JSON.stringify({ provider: 'resend', id: data?.id });
      console.log(`[Notification Engine] Resend email accepted for ${cleanTo}. ID: ${data?.id}`);
      if (logId) {
        await db.prepare(`UPDATE notification_logs SET status = 'sent', provider_response = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(responseStr, logId);
      }

      return { success: true, status: 'sent', provider: 'resend', logId, messageId: data?.id };
    }

    // 4. Optional SMTP Fallback only when explicit SMTP credentials exist
    const transporter = getSmtpTransporter();
    if (transporter) {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || getResendFromAddress(),
        to: cleanTo,
        subject,
        html,
        text: text || subject
      });

      const responseStr = JSON.stringify({ provider: 'smtp', messageId: info.messageId, response: info.response });
      if (logId) {
        await db.prepare(`UPDATE notification_logs SET status = 'sent', provider_response = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?`)
          .run(responseStr, logId);
      }
      return { success: true, status: 'sent', provider: 'smtp', logId, messageId: info.messageId };
    }

    // Unconfigured: fail truthfully (never falsely report 'sent')
    const unconfiguredMsg = 'Resend API key (RESEND_API_KEY) is not configured. Email not sent.';
    console.warn(`[Notification Engine] Email halted for ${cleanTo}: ${unconfiguredMsg}`);
    if (logId) {
      await db.prepare(`UPDATE notification_logs SET status = 'failed', error_message = ? WHERE id = ?`)
        .run(unconfiguredMsg, logId);
    }
    return { success: false, status: 'failed', logId, error: unconfiguredMsg };
  } catch (err) {
    console.error(`[Notification Engine Error] Email send failed to ${cleanTo}:`, err.message);
    if (logId) {
      try {
        await db.prepare(`UPDATE notification_logs SET status = 'failed', error_message = ? WHERE id = ?`)
          .run(err.message, logId);
      } catch {}
    }
    return { success: false, status: 'failed', logId, error: err.message };
  }
}

/**
 * Legacy SMS dispatcher kept strictly for explicit unit test coverage (`test_citizen_sms_notification.js`).
 * Not invoked during free-first live workflows.
 */
async function sendSms({ to, text, refId = null, eventType = 'sms_notification' }) {
  if (!to) return { success: false, status: 'failed', error: 'No recipient phone provided' };
  const validPhone = validateIndianMobile(to);
  if (!validPhone) {
    const errorMsg = `Invalid Indian mobile number: "${to}". Must be a valid 10-digit number starting with 6-9.`;
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
  } catch {}

  if (isMockSmsConfigured()) {
    const mockMessageId = `MOCK-SMS-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    if (logId) {
      await db.prepare(`UPDATE notification_logs SET status = 'sent', provider_response = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?`)
        .run(JSON.stringify({ provider: 'mock', messageId: mockMessageId }), logId);
    }
    return { success: true, status: 'sent', provider: 'mock', messageId: mockMessageId, logId };
  }

  const errorMsg = 'Paid SMS gateway disabled (CivicResolve uses Free-First Email, Web Push & In-App channels).';
  if (logId) {
    await db.prepare(`UPDATE notification_logs SET status = 'failed', error_message = ? WHERE id = ?`).run(errorMsg, logId);
  }
  return { success: false, status: 'unconfigured', logId, error: errorMsg };
}

async function sendComplaintRegistrationSms(refId, phone) {
  if (!refId || !phone) return { success: false, status: 'skipped', error: 'Missing refId or phone' };
  const alreadySent = await hasRegistrationSmsBeenSent(refId);
  if (alreadySent) {
    return { success: false, status: 'duplicate_prevented', message: 'Registration SMS already delivered for this complaint.' };
  }
  const message = `Dear Citizen, your complaint has been successfully registered with CivicResolve. Your Complaint ID is ${refId}. You can use this ID to track your complaint status. Thank you.`;
  return sendSms({ to: phone, text: message, refId, eventType: 'complaint_registered' });
}

async function sendComplaintResolutionSms(refId, phone) {
  if (!refId || !phone) return { success: false, status: 'skipped', error: 'Missing refId or phone' };
  const alreadySent = await hasResolutionSmsBeenSent(refId);
  if (alreadySent) {
    return { success: false, status: 'duplicate_prevented', message: 'Resolution SMS already delivered for this complaint.' };
  }
  const message = `Dear Citizen, your complaint ${refId} has been marked as resolved. Thank you for using CivicResolve. Please visit the portal to review your complaint.`;
  return sendSms({ to: phone, text: message, refId, eventType: 'complaint_resolved' });
}

async function sendWhatsApp() {
  return { success: false, status: 'disabled', error: 'Paid WhatsApp channel disabled.' };
}

/**
 * Unified Free-First Multi-Channel Workflow Dispatcher
 * Orchestrates In-App Notification + Resend Email + Browser Web Push independently.
 * Never throws or blocks parent complaint workflows.
 */
async function notifyCitizenEvent({
  eventType,
  citizenId = null,
  citizenName,
  citizenEmail,
  refId,
  grievanceTitle,
  status,
  details = {}
}) {
  const results = {
    inApp: null,
    email: null,
    push: null
  };

  try {
    let headline = '';
    let messageText = '';
    let messageHtml = '';
    let detailsHtml = '';
    const deepLink = refId ? `/?trackRef=${encodeURIComponent(refId)}` : '/';

    switch (eventType) {
      case 'citizen_registration':
        headline = 'Welcome to CivicResolve!';
        messageText = 'Your citizen account has been successfully verified. You can now submit grievances and track municipal updates in real time.';
        messageHtml = messageText;
        break;

      case 'submission_acknowledgement':
      case 'complaint_registered':
        headline = 'Complaint Registered Successfully';
        messageText = `Your civic complaint "${grievanceTitle}" (ID: ${refId}) has been registered and assigned to ${details.department || 'Municipal Operations'} with a ${details.slaHours || 24}h target SLA.`;
        messageHtml = `Your civic complaint regarding "<strong>${escapeHtml(grievanceTitle)}</strong>" has been registered and prioritized by CivicResolve.`;
        detailsHtml = `
          <table class="details-table">
            <tr><td>Category:</td><td>${escapeHtml(details.category || 'General Civic')}</td></tr>
            <tr><td>Jurisdiction:</td><td>${escapeHtml(details.district || 'Chennai')} (${escapeHtml(details.ward || 'Municipal Ward')})</td></tr>
            <tr><td>Assigned Department:</td><td>${escapeHtml(details.department || 'Municipal Operations')}</td></tr>
            <tr><td>Target Resolution SLA:</td><td><strong>${escapeHtml(String(details.slaHours || 24))} Hours</strong></td></tr>
          </table>
        `;
        break;

      case 'resolution_certified':
      case 'complaint_resolved':
        headline = 'Complaint Resolved';
        messageText = `Your civic complaint ${refId} ("${grievanceTitle}") has been marked as Resolved. Remarks: ${details.remarks || 'Completed by field inspection crew.'}`;
        messageHtml = `Great news — the municipal crew has completed action on your complaint regarding "<strong>${escapeHtml(grievanceTitle)}</strong>" and marked it as <strong>Resolved</strong>.`;
        detailsHtml = `
          ${details.remarks ? `<p><strong>Action-Taken Remarks:</strong> ${escapeHtml(details.remarks)}</p>` : ''}
          ${details.department ? `<p><strong>Resolving Department:</strong> ${escapeHtml(details.department)}</p>` : ''}
          <p style="margin-top: 12px; font-weight: 600; color: #0f766e;">
            Please visit your Citizen Portal to review the resolution report, provide feedback, or appeal if work remains incomplete.
          </p>
        `;
        break;

      case 'status_update':
        headline = `Complaint Status Updated: ${status}`;
        messageText = `Your grievance ${refId} status is now "${status}". ${details.remarks ? 'Note: ' + details.remarks : ''}`;
        messageHtml = `Your grievance regarding "<strong>${escapeHtml(grievanceTitle)}</strong>" has transitioned to <strong>${escapeHtml(status)}</strong>.`;
        if (details.remarks) {
          detailsHtml = `<p><strong>Official Update:</strong> <em>"${escapeHtml(details.remarks)}"</em></p>`;
        }
        break;

      case 'department_assignment':
        headline = 'Department Allocated';
        messageText = `Grievance ${refId} has been assigned to ${details.department || 'Municipal Department'}.`;
        messageHtml = `Your grievance has been assigned to <strong>${escapeHtml(details.department || 'Municipal Department')}</strong>.`;
        break;

      case 'officer_assignment':
        headline = 'Field Officer Assigned';
        messageText = `Field officer ${details.officer || 'Duty Officer'} has been assigned to grievance ${refId}.`;
        messageHtml = `Field inspection officer <strong>${escapeHtml(details.officer || 'Duty Officer')}</strong> has been designated to inspect your complaint.`;
        break;

      default:
        headline = `Complaint Update: ${refId || 'Notice'}`;
        messageText = `Update regarding "${grievanceTitle || 'your grievance'}": Status is ${status || 'Updated'}.`;
        messageHtml = escapeHtml(messageText);
        break;
    }

    // 1. In-App Notification Channel (independent failure isolation)
    if (citizenId) {
      try {
        results.inApp = await createInAppNotification({
          recipientType: 'citizen',
          recipientId: citizenId,
          refId,
          title: refId ? `${headline} (${refId})` : headline,
          message: messageText,
          eventType,
          actionUrl: deepLink
        });
      } catch (inAppErr) {
        console.warn('[In-App Dispatch Notice]:', inAppErr.message);
      }
    }

    // 2. Resend Email Channel (independent failure isolation)
    if (citizenEmail) {
      try {
        const emailSubject = `[CivicResolve] ${headline}${refId ? ` - ${refId}` : ''}`;
        const html = generateEmailTemplate({
          headline,
          recipientName: citizenName,
          refId,
          status,
          messageHtml,
          detailsHtml,
          actionUrl: `${getAppBaseUrl()}${deepLink}`
        });
        const plainText = `${headline}${refId ? ` (${refId})` : ''}\n\nDear ${citizenName || 'Citizen'},\n\n${messageText}\n\nTrack your complaint: ${getAppBaseUrl()}${deepLink}\n\n- CivicResolve Platform`;

        results.email = await sendEmail({
          to: citizenEmail,
          subject: emailSubject,
          html,
          text: plainText,
          refId,
          eventType
        });
      } catch (emailErr) {
        console.warn('[Resend Email Dispatch Notice]:', emailErr.message);
      }
    }

    // 3. Browser Web Push Channel (VAPID, independent failure isolation)
    if (citizenId) {
      try {
        results.push = await sendPushNotificationToUser({
          userType: 'citizen',
          userId: citizenId,
          title: `CivicResolve: ${headline}`,
          body: messageText.slice(0, 180),
          url: deepLink,
          refId,
          eventType
        });
      } catch (pushErr) {
        console.warn('[Web Push Dispatch Notice]:', pushErr.message);
      }
    }
  } catch (err) {
    console.warn('[Notification Workflow Dispatcher Notice]:', err.message);
  }

  return results;
}

/**
 * Controlled Administrative Retry for Failed Email or Web Push Notification Logs
 */
async function retryNotificationLog(logId) {
  const log = await db.prepare('SELECT * FROM notification_logs WHERE id = ?').get(logId);
  if (!log) {
    return { success: false, error: 'Notification log entry not found' };
  }

  if (log.status === 'sent') {
    return { success: false, error: 'Notification was already delivered. Duplicate dispatch prevented.' };
  }

  await db.prepare("UPDATE notification_logs SET attempts = attempts + 1, status = 'sending' WHERE id = ?").run(logId);

  if (log.channel === 'email') {
    const res = await sendEmail({
      to: log.recipient,
      subject: log.subject || '[CivicResolve] Notification Retry',
      html: generateEmailTemplate({
        headline: log.subject || 'Grievance Update',
        recipientName: 'Citizen',
        refId: log.ref_id,
        messageHtml: escapeHtml(log.body || 'Please review your grievance status on CivicResolve.')
      }),
      text: log.body || 'CivicResolve notification retry.',
      refId: log.ref_id,
      eventType: log.event_type || 'email_retry',
      skipDuplicateCheck: true
    });

    if (res.success) {
      await db.prepare(`
        UPDATE notification_logs
        SET status = 'sent', provider_response = ?, sent_at = CURRENT_TIMESTAMP, error_message = NULL
        WHERE id = ?
      `).run(JSON.stringify({ retried: true, provider: res.provider, messageId: res.messageId }), logId);
      return { success: true, message: 'Email notification successfully delivered on retry' };
    }

    await db.prepare("UPDATE notification_logs SET status = 'failed', error_message = ? WHERE id = ?")
      .run(res.error || 'Email retry failed', logId);
    return { success: false, error: res.error || 'Email retry failed' };
  }

  if (log.channel === 'push') {
    const parts = String(log.recipient || '').split(':');
    const userType = parts[0];
    const userId = parseInt(parts[1], 10);
    if (!userType || isNaN(userId)) {
      const err = 'Invalid push recipient identifier in log.';
      await db.prepare("UPDATE notification_logs SET status = 'failed', error_message = ? WHERE id = ?").run(err, logId);
      return { success: false, error: err };
    }

    const pushRes = await sendPushNotificationToUser({
      userType,
      userId,
      title: log.subject || 'CivicResolve Update',
      body: log.body || 'Please review your grievance status.',
      url: log.ref_id ? `/?trackRef=${encodeURIComponent(log.ref_id)}` : '/',
      refId: log.ref_id,
      eventType: log.event_type || 'push_retry',
      skipDuplicateCheck: true
    });

    if (pushRes.success) {
      await db.prepare(`
        UPDATE notification_logs
        SET status = 'sent', provider_response = ?, sent_at = CURRENT_TIMESTAMP, error_message = NULL
        WHERE id = ?
      `).run(JSON.stringify({ retried: true, deliveredCount: pushRes.deliveredCount }), logId);
      return { success: true, message: 'Web Push notification delivered on retry' };
    }

    await db.prepare("UPDATE notification_logs SET status = 'failed', error_message = ? WHERE id = ?")
      .run(pushRes.error || pushRes.reason || 'Push retry failed', logId);
    return { success: false, error: pushRes.error || pushRes.reason || 'Push retry failed' };
  }

  if (log.channel === 'sms') {
    const res = await sendSms({
      to: log.recipient,
      text: log.body,
      refId: log.ref_id,
      eventType: log.event_type || 'sms_retry'
    });
    if (res.success) {
      await db.prepare(`
        UPDATE notification_logs
        SET status = 'sent', provider_response = ?, sent_at = CURRENT_TIMESTAMP, error_message = NULL
        WHERE id = ?
      `).run(JSON.stringify(res), logId);
      return { success: true, message: 'SMS notification delivered on retry' };
    }
    await db.prepare("UPDATE notification_logs SET status = 'failed', error_message = ? WHERE id = ?")
      .run(res.error || 'SMS retry failed', logId);
    return { success: false, error: res.error || 'SMS retry failed' };
  }

  return { success: false, error: `Retry not supported for channel "${log.channel}".` };
}

/**
 * Administrator Email Configuration Test (Resend primary, SMTP fallback)
 */
async function testEmailConnection(targetEmail, adminName = 'Administrator') {
  const html = generateEmailTemplate({
    headline: 'CivicResolve Email Notification Test',
    recipientName: adminName,
    refId: 'TEST-EMAIL-2026',
    status: 'Verified',
    messageHtml: 'This is a verification email dispatched from the CivicResolve Notification Engine via Resend API.'
  });

  return sendEmail({
    to: targetEmail,
    subject: '[CivicResolve] Email Configuration Verification',
    html,
    text: 'Verification Email from CivicResolve Administrator Console via Resend.',
    refId: 'TEST-EMAIL-2026',
    eventType: 'test_email',
    skipDuplicateCheck: true
  });
}

module.exports = {
  sendEmail,
  createInAppNotification,
  notifyCitizenEvent,
  retryNotificationLog,
  testEmailConnection,
  testSmtpConnection: testEmailConnection,
  generateEmailTemplate,
  hasEmailEventBeenSent,
  isResendConfigured,
  isEmailEnabledFlag,
  getResendFromAddress,
  setTestEmailAdapter,
  isSmtpConfigured,
  sendSms,
  sendComplaintRegistrationSms,
  sendComplaintResolutionSms,
  validateIndianMobile,
  hasResolutionSmsBeenSent,
  hasRegistrationSmsBeenSent,
  sendWhatsApp,
  isSmsConfigured,
  isFast2SmsConfigured,
  isMsg91Configured,
  isExotelConfigured,
  isTwilioConfigured,
  isMockSmsConfigured,
  isWhatsAppConfigured
};
