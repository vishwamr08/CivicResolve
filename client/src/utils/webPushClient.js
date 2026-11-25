import { getApiUrl } from '../config/api';

export function isPushSupportedInBrowser() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerPushServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported in this browser.');
  }
  await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  return navigator.serviceWorker.ready;
}

function buildAuthHeaders(token, portalContext, extra = {}) {
  const headers = { ...extra };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (portalContext) headers['X-Portal-Context'] = portalContext;
  return headers;
}

export async function fetchPushStatus({ token, portalContext }) {
  const [vapidRes, statusRes] = await Promise.all([
    fetch(getApiUrl('/api/push/vapid-public-key')).then(r => r.json()).catch(() => ({ enabled: false, configured: false })),
    token
      ? fetch(getApiUrl('/api/push/status'), {
          headers: buildAuthHeaders(token, portalContext),
          credentials: 'include'
        }).then(r => (r.ok ? r.json() : null)).catch(() => null)
      : Promise.resolve(null)
  ]);

  let browserSubscribed = false;
  let browserEndpoint = null;
  if (isPushSupportedInBrowser()) {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (reg && reg.pushManager) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          browserSubscribed = true;
          browserEndpoint = sub.endpoint;
        }
      }
    } catch {}
  }

  return {
    supported: isPushSupportedInBrowser(),
    permission: typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'default',
    serverEnabled: Boolean(vapidRes?.enabled),
    serverConfigured: Boolean(vapidRes?.configured),
    publicKey: vapidRes?.publicKey || null,
    serverSubscribed: Boolean(statusRes?.subscribed),
    subscriptionCount: Number(statusRes?.subscriptionCount || 0),
    browserSubscribed,
    browserEndpoint
  };
}

export async function enableWebPushNotifications({ token, portalContext }) {
  if (!isPushSupportedInBrowser()) {
    throw new Error('Browser push notifications are not supported on this device/browser.');
  }
  if (!token) {
    throw new Error('Please sign in first to enable push notifications.');
  }

  const keyRes = await fetch(getApiUrl('/api/push/vapid-public-key')).then(r => r.json());
  if (!keyRes?.enabled || !keyRes?.configured || !keyRes?.publicKey) {
    throw new Error('Web Push VAPID keys are not configured on the server yet.');
  }

  const permission = await window.Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Notification permission is blocked in your browser settings. Please allow notifications for this site to enable push alerts.'
        : 'Notification permission request was dismissed.'
    );
  }

  const registration = await registerPushServiceWorker();
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyRes.publicKey)
    });
  }

  const saveRes = await fetch(getApiUrl('/api/push/subscribe'), {
    method: 'POST',
    headers: buildAuthHeaders(token, portalContext, { 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({ subscription: subscription.toJSON() })
  });

  const data = await saveRes.json().catch(() => ({}));
  if (!saveRes.ok) {
    throw new Error(data.error || 'Failed to save push subscription on server.');
  }

  return data;
}

export async function disableWebPushNotifications({ token, portalContext }) {
  let endpoint = null;

  if (isPushSupportedInBrowser()) {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (reg && reg.pushManager) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          endpoint = sub.endpoint;
          await sub.unsubscribe();
        }
      }
    } catch {}
  }

  const res = await fetch(getApiUrl('/api/push/unsubscribe'), {
    method: 'POST',
    headers: buildAuthHeaders(token, portalContext, { 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify({ endpoint })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Failed to disable push notifications.');
  }
  return data;
}
