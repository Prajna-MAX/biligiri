// Service worker: shows push notifications even when Biligiri isn't open.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Biligiri', body: event.data && event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Biligiri', {
      body: data.body || '',
      icon: '/icon-192.png',
      tag: data.tag,
      data: { url: data.url || '/' },
    })
  );
});

// Tapping the notification opens the task (reusing an open Biligiri tab if there is one)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((tabs) => {
      const tab = tabs.find((c) => new URL(c.url).origin === self.location.origin);
      if (tab) return tab.navigate(url).then((c) => (c || tab).focus());
      return self.clients.openWindow(url);
    })
  );
});
