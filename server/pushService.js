/**
 * CivicResolve - Free-First Browser Web Push Notification Service (VAPID)
 *
 * Uses the open standard Web Push protocol with VAPID authentication (`web-push`).
 * Zero paid push provider dependencies.
 * Features:
 * - Strict subscription validation & authenticated user ownership
 * - Automatic 404/410 expired subscription cleanup
 * - Double-layer duplicate dispatch prevention
 * - Complaint deep links for instant Citizen/Admin navigation
 * - Automatic offline mock mode during automated test suites (NODE_ENV=test)
 */

const webpush = require('web-push');
const db = require('./db');

let testPushAdapter = null;

function setTestPushAdapter(fn) {
  testPushAdapter = typeof fn === 'function' ? fn : null;
}

function isWebPushEnabledFlag() {
  return String(process.env.WEB_PUSH_ENABLED || 'true').toLowerCase() !== 'false';
}

function getVapidConfig() {
  const publicKey = (process.env.VAPID_PUBLIC_KEY || '').trim();
  const privateKey = (process.env.VAPID_PRIVATE_KEY || '').trim();
  const subject = (process.env.VAPID_SUBJECT || 'mailto:grievance@civicresolve.gov').trim();
  return { publicKey, privateKey, subject };
}

function isWebPushConfigured() {
  if (!isWebPushEnabledFlag()) return false;
  const { publicKey, privateKey, subject } = getVapidConfig();
  if (!publicKey || !privateKey || !subject) return false;
  if (publicKey.includes('your_') || privateKey.includes('your_')) return false;
  return true;
}

function getPublicVapidState() {
  const { publicKey } = getVapidConfig();
  const configured = isWebPushConfigured();
  return {
    enabled: isWebPushEnabledFlag(),
    configured,
    publicKey: configured ? publicKey : null
  };
}

function validatePushSubscriptionPayload(sub) {
  if (!sub || typeof sub !== 'object') {
    throw new Error('Invalid push subscription payload.');
  }
  const endpoint = String(sub.endpoint || '').trim();
  if (!endpoint || (!endpoint.startsWith('https://') && !endpoint.startsWith('http://localhost') && !endpoint.startsWith('http://127.0.0.1'))) {
    throw new Error('Push subscription endpoint must be a valid HTTPS URL.');
  }
  if (endpoint.length > 2000) {
    throw new Error('Push subscription endpoint exceeds length limits.');
  }

  const p256dh = String(sub.keys?.p256dh || '').trim();
  const auth = String(sub.keys?.auth || '').trim();
  if (!p256dh || !auth || p256dh.length < 16 || auth.length < 8) {
    throw new Error('Push subscription is missing required encryption keys (p256dh, auth).');
  }

  return { endpoint, p256dh, auth };
}

/**
 * Register or rebind a browser Web Push subscription to an authenticated user.
 */
async function registerPushSubscription({ userType, userId, subscription, userAgent = '' }) {
  if (userType !== 'citizen' && userType !== 'admin') {
    throw new Error('Invalid user type for push subscription.');
  }

  const { endpoint, p256dh, auth } = validatePushSubscriptionPayload(subscription);
  const cleanAgent = String(userAgent || '').slice(0, 300);

  if (db.isPostgres) {
    await db.prepare(`
      INSERT INTO push_subscriptions (user_type, user_id, endpoint, p256dh, auth, user_agent, is_active, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT (endpoint) DO UPDATE SET
        user_type = EXCLUDED.user_type,
        user_id = EXCLUDED.user_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent,
        is_active = 1,
        updated_at = CURRENT_TIMESTAMP
    `).run(userType, userId, endpoint, p256dh, auth, cleanAgent);
  } else {
    await db.prepare(`
      INSERT INTO push_subscriptions (user_type, user_id, endpoint, p256dh, auth, user_agent, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (endpoint) DO UPDATE SET
        user_type = excluded.user_type,
        user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent,
        is_active = 1,
        updated_at = CURRENT_TIMESTAMP
    `).run(userType, userId, endpoint, p256dh, auth, cleanAgent);
  }

  const table = userType === 'citizen' ? 'citizens' : 'admins';
  await db.prepare(`UPDATE ${table} SET web_push_enabled = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(userId);

  return { subscribed: true, endpoint };
}

/**
 * Unsubscribe strictly owned push endpoint(s).
 */
async function removePushSubscription({ userType, userId, endpoint = null }) {
  if (userType !== 'citizen' && userType !== 'admin') {
    throw new Error('Invalid user type.');
  }

  let deletedCount = 0;
  if (endpoint && String(endpoint).trim()) {
    const res = await db.prepare(`
      DELETE FROM push_subscriptions
      WHERE user_type = ? AND user_id = ? AND endpoint = ?
    `).run(userType, userId, String(endpoint).trim());
    deletedCount = res?.changes || 0;
  } else {
    const res = await db.prepare(`
      DELETE FROM push_subscriptions
      WHERE user_type = ? AND user_id = ?
    `).run(userType, userId);
    deletedCount = res?.changes || 0;
  }

  const remaining = await db.prepare(`
    SELECT COUNT(*) as count FROM push_subscriptions
    WHERE user_type = ? AND user_id = ? AND is_active = 1
  `).get(userType, userId);

  const count = Number(remaining?.count || 0);
  const table = userType === 'citizen' ? 'citizens' : 'admins';
  await db.prepare(`UPDATE ${table} SET web_push_enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(count > 0 ? 1 : 0, userId);

  return {
    subscribed: count > 0,
    deletedCount,
    remainingSubscriptions: count
  };
}

/**
 * Inspect subscription status for authenticated user.
 */
async function getUserPushStatus(userType, userId) {
  const row = await db.prepare(`
    SELECT COUNT(*) as count FROM push_subscriptions
    WHERE user_type = ? AND user_id = ? AND is_active = 1
  `).get(userType, userId);

  const subscriptionCount = Number(row?.count || 0);
  return {
    subscribed: subscriptionCount > 0,
    subscriptionCount,
    ...getPublicVapidState()
  };
}

/**
 * Duplicate check for Web Push notifications per grievance event & recipient.
 */
async function hasPushEventBeenSent({ userType, userId, refId, eventType }) {
  if (!refId || !eventType) return false;
  const recipientKey = `${userType}:${userId}`;
  try {
    const existing = await db.prepare(`
      SELECT id FROM notification_logs
      WHERE ref_id = ? AND channel = 'push' AND event_type = ? AND recipient = ? AND status = 'sent'
      LIMIT 1
    `).get(refId, eventType, recipientKey);
    return Boolean(existing);
  } catch {
    return false;
  }
}

/**
 * Dispatch Web Push Notification to all active subscriptions of an authenticated user.
 * Handles 404/410 invalid subscription cleanup and avoids sending real network requests in tests.
 */
async function sendPushNotificationToUser({
  userType,
  userId,
  title,
  body,
  url = '/',
  refId = null,
  eventType = 'grievance_update',
  skipDuplicateCheck = false
}) {
  if (!userType || !userId) {
    return { success: false, status: 'skipped', reason: 'Missing recipient identity' };
  }

  if (!isWebPushEnabledFlag()) {
    return { success: false, status: 'disabled', reason: 'Web Push disabled by WEB_PUSH_ENABLED=false' };
  }

  if (!skipDuplicateCheck && refId && (eventType === 'complaint_registered' || eventType === 'complaint_resolved' || eventType === 'submission_acknowledgement' || eventType === 'resolution_certified')) {
    const alreadySent = await hasPushEventBeenSent({ userType, userId, refId, eventType });
    if (alreadySent) {
      return { success: false, status: 'duplicate_prevented', reason: 'Push already delivered for this event' };
    }
  }

  const subs = await db.prepare(`
    SELECT * FROM push_subscriptions
    WHERE user_type = ? AND user_id = ? AND is_active = 1
  `).all(userType, userId);

  if (!subs || subs.length === 0) {
    return { success: false, status: 'not_subscribed', reason: 'User has no active Web Push subscriptions' };
  }

  const recipientKey = `${userType}:${userId}`;
  const isTestEnv = process.env.NODE_ENV === 'test';
  const mockMode = isTestEnv || process.env.MOCK_PUSH === 'true';
  const configured = isWebPushConfigured();

  // Record audit entry in notification_logs
  const logInsert = await db.prepare(`
    INSERT INTO notification_logs (ref_id, recipient, channel, event_type, status, subject, body, attempts, created_at)
    VALUES (?, ?, 'push', ?, 'sending', ?, ?, 1, CURRENT_TIMESTAMP)
  `).run(refId, recipientKey, eventType, title, body);
  const logId = logInsert?.lastInsertRowid;

  if (!mockMode && !configured) {
    const errorMsg = 'VAPID keys not configured (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT).';
    if (logId) {
      await db.prepare(`UPDATE notification_logs SET status = 'failed', error_message = ? WHERE id = ?`)
        .run(errorMsg, logId);
    }
    return { success: false, status: 'unconfigured', logId, error: errorMsg };
  }

  if (configured && !mockMode) {
    const { publicKey, privateKey, subject } = getVapidConfig();
    webpush.setVapidDetails(subject, publicKey, privateKey);
  }

  const pushPayload = JSON.stringify({
    title,
    body,
    icon: '/civicresolve-logo.png',
    badge: '/civicresolve-logo.png',
    url: url || (refId ? `/?trackRef=${encodeURIComponent(refId)}` : '/'),
    refId,
    eventType,
    tag: refId ? `civicresolve-${refId}-${eventType}` : `civicresolve-${Date.now()}`
  });

  let deliveredCount = 0;
  let cleanedCount = 0;
  const errors = [];

  for (const sub of subs) {
    const pushSubObj = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth
      }
    };

    try {
      if (testPushAdapter) {
        await testPushAdapter(pushSubObj, pushPayload, sub);
      } else if (mockMode) {
        console.log(`[Web Push Mock Adapter] Simulated push to ${recipientKey} (${sub.endpoint.slice(0, 42)}...): "${title}" -> ${url}`);
      } else {
        await webpush.sendNotification(pushSubObj, pushPayload, { TTL: 86400 });
      }

      deliveredCount += 1;
      await db.prepare(`UPDATE push_subscriptions SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?`).run(sub.id);
    } catch (err) {
      const statusCode = err?.statusCode || err?.status;
      if (statusCode === 404 || statusCode === 410 || String(err?.message || '').includes('NotRegistered')) {
        // Automatic invalid/expired subscription cleanup
        await db.prepare(`DELETE FROM push_subscriptions WHERE id = ?`).run(sub.id);
        cleanedCount += 1;
      } else {
        errors.push(err?.message || 'Push send failure');
      }
    }
  }

  // Re-sync user flag if all subscriptions were cleaned up
  if (cleanedCount > 0) {
    const remRow = await db.prepare(`
      SELECT COUNT(*) as count FROM push_subscriptions WHERE user_type = ? AND user_id = ? AND is_active = 1
    `).get(userType, userId);
    if (Number(remRow?.count || 0) === 0) {
      const table = userType === 'citizen' ? 'citizens' : 'admins';
      await db.prepare(`UPDATE ${table} SET web_push_enabled = 0 WHERE id = ?`).run(userId);
    }
  }

  if (deliveredCount > 0) {
    if (logId) {
      await db.prepare(`
        UPDATE notification_logs
        SET status = 'sent', provider_response = ?, sent_at = CURRENT_TIMESTAMP, error_message = NULL
        WHERE id = ?
      `).run(JSON.stringify({ deliveredCount, cleanedCount, mock: Boolean(mockMode) }), logId);
    }
    return { success: true, status: 'sent', deliveredCount, cleanedCount, logId };
  }

  const errorSummary = errors.length > 0
    ? errors.join('; ')
    : (cleanedCount > 0 ? 'All push subscriptions expired and cleaned up (410/404).' : 'Push delivery failed.');

  if (logId) {
    await db.prepare(`UPDATE notification_logs SET status = 'failed', error_message = ? WHERE id = ?`)
      .run(errorSummary, logId);
  }
  return { success: false, status: 'failed', cleanedCount, logId, error: errorSummary };
}

module.exports = {
  isWebPushEnabledFlag,
  isWebPushConfigured,
  getPublicVapidState,
  validatePushSubscriptionPayload,
  registerPushSubscription,
  removePushSubscription,
  getUserPushStatus,
  hasPushEventBeenSent,
  sendPushNotificationToUser,
  setTestPushAdapter
};
