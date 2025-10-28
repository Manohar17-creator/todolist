// 📁 src/utils/notifications.js

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    alert('Notifications are not supported on this device/browser.');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

// ✅ Send message to service worker to show a notification
export function triggerNotification({ title, body, tag }) {
  if (!navigator.serviceWorker.controller) {
    console.warn('Service worker not ready.');
    return;
  }

  navigator.serviceWorker.controller.postMessage({
    type: 'SHOW_NOTIFICATION',
    title,
    body,
    tag,
    icon: '/icon-192.png'
  });
}
