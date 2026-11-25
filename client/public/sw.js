/**
 * CivicResolve Service Worker for Free-First Browser Web Push Notifications
 */

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: 'CivicResolve Update',
      body: event.data.text() || 'There is a new update on your civic grievance.',
      url: '/'
    };
  }

  const title = payload.title || 'CivicResolve Notification';
  const options = {
    body: payload.body || 'You have an update on your complaint.',
    icon: payload.icon || '/civicresolve-logo.png',
    badge: payload.badge || '/civicresolve-logo.png',
    tag: payload.tag || 'civicresolve-notification',
    renotify: true,
    data: {
      url: payload.url || '/',
      refId: payload.refId || null,
      eventType: payload.eventType || 'grievance_update'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const relativeTarget = data.url || (data.refId ? `/?trackRef=${encodeURIComponent(data.refId)}` : '/');
  const fullTargetUrl = new URL(relativeTarget, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(fullTargetUrl).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(fullTargetUrl);
      }
      return undefined;
    })
  );
});
