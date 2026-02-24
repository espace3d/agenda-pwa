const CACHE_NAME = 'agenda-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/alarm.wav'
];

const STAGES = [
  { offset: 30 * 60 * 1000, key: '30', label: 'dans 30 minutes' },
  { offset: 10 * 60 * 1000, key: '10', label: 'dans 10 minutes' },
  { offset: 0, key: '0', label: "c'est l'heure !" },
];
const NOTIFY_WINDOW_MS = 60 * 1000;
let storedEvents = [];

async function storeEventsInCache(events) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = new Response(JSON.stringify(events));
    await cache.put('/_events_data', response);
  } catch {}
}

async function loadEventsFromCache() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match('/_events_data');
    if (!response) return [];
    return JSON.parse(await response.text());
  } catch {
    return [];
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => loadEventsFromCache()).then(events => {
      storedEvents = events;
      checkAndNotify();
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SYNC_EVENTS') {
    storedEvents = event.data.events || [];
    storeEventsInCache(storedEvents);
    checkAndNotify();
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'stop') {
    const eventId = event.notification.tag?.replace('event-', '');
    if (eventId) {
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'STOP_ALARM', eventId });
        });
      });
    }
  } else {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        if (clients.length > 0) {
          clients[0].focus();
        } else {
          self.clients.openWindow('/');
        }
      })
    );
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-events') {
    event.waitUntil(
      loadEventsFromCache().then(events => {
        storedEvents = events;
        checkAndNotify();
      })
    );
  }
});

function getNotifiedFromStorage() {
  try {
    return self.__notified || new Set();
  } catch {
    return new Set();
  }
}

function checkAndNotify() {
  const now = Date.now();
  const notified = getNotifiedFromStorage();

  storedEvents.forEach(event => {
    if (event.duration === 'day' && !event.time) return;

    const [y, m, d] = event.date.split('-').map(Number);
    const eventDate = new Date(y, m - 1, d);
    if (event.time) {
      const [h, min] = event.time.split(':').map(Number);
      eventDate.setHours(h, min, 0, 0);
    }

    const eventTime = eventDate.getTime();

    STAGES.forEach(stage => {
      const stageKey = `${event.id}-${stage.key}`;
      if (notified.has(stageKey)) return;

      const triggerAt = eventTime - stage.offset;
      const diff = now - triggerAt;

      if (diff >= 0 && diff < NOTIFY_WINDOW_MS) {
        if (!self.__notified) self.__notified = new Set();
        self.__notified.add(stageKey);

        const timeStr = event.time ? ` à ${event.time.replace(':', 'h')}` : '';
        const dateStr = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;

        self.registration.showNotification(`⏳ ${event.title}`, {
          body: `${dateStr}${timeStr} — ${stage.label}`,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: `event-${event.id}`,
          requireInteraction: true,
          silent: false,
          vibrate: [200, 100, 200, 100, 200, 100, 200, 100, 200],
          actions: [{ action: 'stop', title: 'Arrêter' }]
        });

        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'ALARM_TRIGGERED', eventId: event.id, stageKey: stage.key });
          });
        });
      }
    });
  });
}
