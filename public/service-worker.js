// Service Worker for background notifications
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

// Listen for notification scheduling
self.addEventListener('message', (event) => {
  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { task, delay } = event.data;
    
    setTimeout(() => {
      self.registration.showNotification('Task Reminder', {
        body: `${task.title} - ${task.points} points`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: task.id,
        requireInteraction: true,
        vibrate: [200, 100, 200]
      });
    }, delay);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});