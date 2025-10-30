// ✅ Service Worker for Local + Push Notifications (Works on iPhone, Android, Desktop)

// Force activation immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// ✅ 1. LOCAL NOTIFICATIONS (triggered by app)
self.addEventListener('message', async (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, icon } = data;

    await self.registration.showNotification(title, {
      body,
      icon: icon || '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      renotify: true,
      tag,
      data: { url: '/' },
      requireInteraction: true,
    });
  }
});

// ✅ 2. PUSH NOTIFICATIONS (triggered from backend via web-push)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const title = data.title || '🔔 Notification';
  const body = data.body || '';
  const icon = data.icon || '/icon-192.png';
  const url = data.url || '/';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/icon-192.png',
      data: { url },
      vibrate: [150, 50, 150],
      tag: 'pwa-task-reminder',
      renotify: true,
      requireInteraction: true,
    })
  );
});

// ✅ 3. Handle clicks for both local and push notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(event.notification.data?.url || '/');
    })
  );
});
