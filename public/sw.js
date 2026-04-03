importScripts('/idb-helper.js');

self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon.png',
      badge: '/badge.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '2',
        url: data.url || '/'
      }
    };
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(windowClients) {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Broadcast offline status to open clients
async function notifyClients(type, payload) {
  const clientsList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clientsList) {
    client.postMessage({ type, payload });
  }
}

// Fetch Interceptor for Offline Queueing
self.addEventListener('fetch', function(event) {
  const { request } = event;

  // Intercept API mutations
  if (request.url.includes('/api/') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    event.respondWith(
      (async function() {
        try {
          // Clone request before consuming it
          const reqClone = request.clone();
          
          // Attempt the network request
          const response = await fetch(request);
          return response;
        } catch (error) {
          // Network failed (offline)
          const reqCloneForDB = request.clone();
          
          const headers = {};
          reqCloneForDB.headers.forEach((value, key) => headers[key] = value);
          
          const bodyText = await reqCloneForDB.text(); // Read body as text

          await saveRequestToQueue({
            url: reqCloneForDB.url,
            method: reqCloneForDB.method,
            headers: headers,
            body: bodyText
          });

          // Attempt to register background sync
          if ('sync' in self.registration) {
            try {
              await self.registration.sync.register('sync-tx');
            } catch(e) {
               console.warn("Background Sync registration failed:", e);
            }
          }

          // Notify frontend that we saved offline
          notifyClients('OFFLINE_QUEUED', { url: reqCloneForDB.url });

          // Mock success response so frontend doesn't crash on saving
          const mockRes = {
            success: true,
            offline: true,
            message: 'Tersimpan Offline. Menunggu sinkronisasi.',
            data: { nomor: 'offline', id: 'offline' }
          };

          return new Response(JSON.stringify(mockRes), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
          });
        }
      })()
    );
  } else if (request.url.includes('/api/') && request.method === 'GET') {
    // Basic network-first fallback for GET requests
    event.respondWith(
      fetch(request).catch(async () => {
        // Special return for detail pages requesting the pseudo 'offline' ID
        if (request.url.endsWith('/offline')) {
          return new Response(JSON.stringify({
             success: true,
             offline: true,
             data: { 
                 nomor: 'offline', 
                 kode: 'OFFLINE_SYNC_PENDING',
                 tanggal: new Date().toISOString().split('T')[0],
                 nama: 'Status: Pending Sync...',
                 keterangan: 'Menunggu koneksi internet...'
             }
          }), { headers: { 'Content-Type': 'application/json' } });
        }
        
        // Otherwise try to find it in cache if you implemented caching
        const cache = await caches.open('erp-dynamic-v1');
        const cachedRes = await cache.match(request);
        if (cachedRes) return cachedRes;

        // If completely failed, just return a mock empty so ui doesn't crash
        return new Response(JSON.stringify({ success: false, error: 'Offline network error' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
        });
      })
    );
  }
});

// Immediate takeover
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

async function triggerSync() {
  const queue = await getQueuedRequests();
  if (!queue || queue.length === 0) return;

  let anySuccess = false;

  for (const req of queue) {
    try {
      const fetchOptions = {
        method: req.method,
        headers: req.headers,
        body: req.body
      };
      
      const res = await fetch(req.url, fetchOptions);
      
      if (res.ok) {
        await deleteQueuedRequest(req.id);
        anySuccess = true;
      }
    } catch (err) {
      console.error('Failed to sync queued request:', err);
    }
  }

  if (anySuccess) {
     notifyClients('SYNC_SUCCESS', { count: queue.length });
  }
}

// Background Sync Listener
self.addEventListener('sync', function(event) {
  if (event.tag === 'sync-tx') {
    event.waitUntil(triggerSync());
  }
});

// Manual Sync trigger from frontend
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'FORCE_SYNC') {
    event.waitUntil(triggerSync());
  }
});
