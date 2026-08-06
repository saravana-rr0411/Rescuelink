// Service Worker & Push Notification Handler Utility

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('[SW] Service Workers are not supported in this browser.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[SW] RescueLink Service Worker registered successfully with scope:', registration.scope);

    // Handle service worker update checks
    registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      if (installingWorker) {
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW] New Service Worker version available.');
          }
        };
      }
    };

    return registration;
  } catch (error) {
    console.error('[SW] Service Worker registration failed:', error);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('[SW] Error requesting notification permission:', err);
    return 'denied';
  }
}

export async function triggerPushNotification(payload: {
  title: string;
  message: string;
  accident_id?: string;
  status_type?: string;
  timestamp?: string;
}) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const timestamp = payload.timestamp || new Date().toISOString();
  const accidentId = payload.accident_id;
  const statusType = payload.status_type || 'emergency';

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration) {
        await registration.showNotification(payload.title, {
          body: payload.message,
          icon: '/favicon.svg',
          badge: '/favicon.svg',
          tag: `rescuelink-accident-${accidentId || 'general'}-${statusType}`,
          data: {
            accident_id: accidentId,
            url: accidentId ? `/status?accidentId=${accidentId}` : '/status',
            timestamp,
          },
        });
        return;
      }
    }
  } catch (err) {
    console.warn('[SW] ServiceWorker showNotification fallback to Window Notification API:', err);
  }

  // Window Notification Fallback
  try {
    const notif = new Notification(payload.title, {
      body: payload.message,
      icon: '/favicon.svg',
      tag: `rescuelink-accident-${accidentId || 'general'}-${statusType}`,
      data: {
        accident_id: accidentId,
        url: accidentId ? `/status?accidentId=${accidentId}` : '/status',
        timestamp,
      },
    });

    notif.onclick = () => {
      window.focus();
      if (accidentId) {
        window.location.href = `/status?accidentId=${accidentId}`;
      }
    };
  } catch (err) {
    console.warn('[SW] Window Notification failed:', err);
  }
}
