self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { task, delay } = event.data;
    
    setTimeout(() => {
      self.registration.showNotification('⏰ Task Reminder', {
        body: `${task.title} - ${task.points} points`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: task.id,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: { taskId: task.id }
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