const CACHE_NAME = 'js-glamour-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/index.tsx',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,600&family=Inter:wght@300;400;500;600;700;900&family=Space+Mono&display=swap'
];

// Install Event - Pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Pre-caching offline assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch Event - Strategic Caching
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Network-First for navigation and API calls
  if (request.mode === 'navigate' || request.url.includes('/.netlify/functions/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request) || caches.match('/');
      })
    );
    return;
  }

  // Cache-First for static assets (Images, Fonts, Scripts)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        // Cache new static assets on the fly
        if (
          request.url.includes('.png') || 
          request.url.includes('.jpg') || 
          request.url.includes('fonts.') ||
          request.url.includes('esm.sh')
        ) {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, networkResponse.clone());
            return networkResponse;
          });
        }
        return networkResponse;
      });
    })
  );
});