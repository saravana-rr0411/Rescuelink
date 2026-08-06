// RescueLink Service Worker for Production Web Push & Background Notifications

self.addEventListener('install', (event) => {
  console.log('[RescueLink SW] Installing Service Worker...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[RescueLink SW] Service Worker Activated.');
  event.waitUntil(self.clients.claim());
});

// Handle incoming background Push Events
self.addEventListener('push', (event) => {
  console.log('[RescueLink SW] Push event received:', event);

  let data = {
    title: '🚨 RescueLink Alert',
    message: 'Emergency status update received.',
    accident_id: null,
    status_type: 'emergency',
    created_at: new Date().toISOString(),
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.message = event.data.text() || data.message;
    }
  }

  const notificationTitle = data.title;
  const notificationOptions = {
    body: data.message,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: `rescuelink-accident-${data.accident_id || 'general'}-${data.status_type || 'update'}`,
    renotify: true,
    data: {
      accident_id: data.accident_id,
      url: data.accident_id ? `/status?accidentId=${data.accident_id}` : '/status',
      timestamp: data.created_at || new Date().toISOString(),
    },
    actions: [
      { action: 'open_status', title: 'View Emergency Status' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});

// Handle Notification Click (App Closed, Background, or Foreground)
self.addEventListener('notificationclick', (event) => {
  console.log('[RescueLink SW] Notification clicked:', event.notification);
  event.notification.close();

  const accidentId = event.notification.data?.accident_id;
  const targetUrl = accidentId
    ? `/status?accidentId=${accidentId}`
    : '/status';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. If an app window is already open, focus it and navigate to target URL
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            accident_id: accidentId,
            url: targetUrl,
          });
          return client.focus();
        }
      }

      // 2. If no window is open (app closed), open a new window at the target URL
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
