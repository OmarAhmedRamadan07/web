const CACHE_NAME = 'sut-weather-v1';
const ASSETS_TO_CACHE = [
  'index.html',
  'css/style.css',
  'js/app.js',
  'images/icon.png',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11'
];

// Install Service Worker and save the essential files in the cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Handle fetch requests
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // If the file is in the cache, return it; otherwise fetch it from the network
      return response || fetch(event.request);
    }).catch(() => {
      // If the request fails completely (Offline)
      if (event.request.mode === 'navigate') {
        return caches.match('index.html');
      }
    })
  );
});