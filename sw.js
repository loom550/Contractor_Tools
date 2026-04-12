const CACHE_NAME = 'loomex-tools-v1';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/availability.html',
  '/expense-form.html',
  '/feedback.html',
  '/help.html'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_URLS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  var url = new URL(event.request.url);

  if (
    url.hostname.includes('workers.dev') ||
    url.hostname.includes('airtable.com') ||
    url.hostname.includes('sharepoint.com') ||
    url.hostname.includes('powerapps.com')
  ) return;

  event.respondWith(
    fetch(event.request).then(function(response) {
      if (response.ok && (
        event.request.url.includes('.html') ||
        event.request.url.includes('.css') ||
        event.request.url.includes('.js') ||
        event.request.url.endsWith('/')
      )) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
      }
      return response;
    }).catch(function() {
      return caches.match(event.request).then(function(cached) {
        return cached || new Response(
          '<h2 style="font-family:sans-serif;padding:32px">No connection. Please try again when online.</h2>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      });
    })
  );
});

self.addEventListener('push', function(event) {
  if (!event.data) return;

  var data = event.data.json();
  var title = data.title || 'Loomex Tools';
  var options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'loomex-general',
    data: { url: data.url || '/' },
    requireInteraction: data.requireInteraction || false
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url === targetUrl && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
