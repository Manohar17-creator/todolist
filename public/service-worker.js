// ✅ Service Worker for Local Notifications (Works on iPhone PWA + Android)

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// ✅ Listen for messages from React app
self.addEventListener('message', async (event) => {
  const data = event.data;

  if (!data) return;

  // When React app asks to show a notification
  if (data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, icon } = data;

    // ✅ This is where your showNotification() code goes:
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

// ✅ Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
