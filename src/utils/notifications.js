// src/utils/notifications.js

export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    alert('Notifications are not supported on this device/browser.');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export async function triggerNotification({ title, body, tag }) {
  // Try to use service worker registration.showNotification if available
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && typeof reg.showNotification === 'function') {
        reg.showNotification(title, {
          body,
          tag,
          icon: '/icon-192.png',
          data: { url: '/' }
        });
        return;
      }
    }
  } catch (e) {
    console.warn('Failed to show SW notification, falling back:', e);
  }

  // Fallback to posting a message to active SW (if controller is ready)
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SHOW_NOTIFICATION',
      title,
      body,
      tag,
      icon: '/icon-192.png'
    });
    return;
  }

  // Final fallback: use in-page Notification API (if allowed)
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, tag, icon: '/icon-192.png' });
    } catch (e) {
      console.warn('Notification API failed as fallback', e);
    }
  }
}
