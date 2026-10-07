/* ============================================================
   WORLD MONITOR – SERVICE WORKER
   Enables background push notifications & offline support
   ============================================================ */

const CACHE_NAME = 'wm-cache-v1';

// ── Install ──
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// ── Activate ──
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Push Notification handler ──
self.addEventListener('push', (event) => {
  let data = { title: '🚨 WORLD MONITOR', body: 'New emergency alert received.' };

  try {
    data = event.data ? event.data.json() : data;
  } catch (e) {}

  const options = {
    body: data.body || data.message || 'New emergency notification',
    icon: '/assets/avatars/officer.png',
    badge: '/assets/avatars/officer.png',
    tag: data.tag || 'wm-alert-' + Date.now(),
    renotify: true,
    requireInteraction: data.risk_level === 'Very High',
    vibrate: data.risk_level === 'Very High' ? [350, 120, 350, 120, 500] : [250, 100, 250],
    data: { url: data.link || '/alerts.html', risk_level: data.risk_level || 'Medium' },
    actions: [
      { action: 'view', title: '👁 View Alert' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '🚨 Emergency Alert', options)
  );
});

// ── Notification click handler ──
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = (event.notification.data && event.notification.data.url) || '/alerts.html';

  if (event.action === 'dismiss') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing tab if open
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Open new tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// ── Background sync (future: offline report queuing) ──
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reports') {
    // Future: sync queued citizen reports
  }
});
