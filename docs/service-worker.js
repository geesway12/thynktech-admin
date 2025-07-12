/**
 * TechThynk Unified Service Worker Template
 * This template is used to generate app-specific service workers during deployment
 * admin and 6 will be replaced during build process
 */

const CACHE_NAME = "thynktech-admin-cache-v6";

// Base URLs that all apps need
const baseUrlsToCache = [
  "/",
  "/index.html",
  "/offline.html",
  "/styles.css",
  "/favicon.ico",
  "/favicon.svg",
  "/logo.png",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
  "/apple-touch-icon-precomposed.png",
  "/favicon-96x96.png"
];

// App-specific URLs (will be populated based on app type)
const appSpecificUrls = {
  admin: [
    "/app.js",
    "/admin.js", 
    "/pwa.js",
    "/registers.js"
  ],
  users: [
    "/app.js",
    "/pwa.js", 
    "/users.js"
  ]
};

// Core shared modules (these have flat paths in deployed version)
const coreModules = [
  "/appointments.js",
  "/auth.js", 
  "/backup.js",
  "/db.js",
  "/export.js",
  "/helpers.js",
  "/layout.js",
  "/patients.js",
  "/reports.js", 
  "/services.js",
  "/visits.js"
];

// Combine all URLs based on app type
const urlsToCache = [
  ...baseUrlsToCache,
  ...(appSpecificUrls["admin"] || []),
  ...coreModules
];

// Install: Cache core assets
self.addEventListener("install", event => {
  console.log(`[SW] Installing TechThynk admin service worker v6`);
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log(`[SW] Caching ${urlsToCache.length} resources`);
      return cache.addAll(urlsToCache);
    }).catch(error => {
      console.error('[SW] Failed to cache resources:', error);
    })
  );
});

// Activate: Clean up old caches
self.addEventListener("activate", event => {
  console.log(`[SW] Activating TechThynk admin service worker v6`);
  event.waitUntil(
    caches.keys().then(keys => {
      const deletePromises = keys
        .filter(key => key.startsWith('thynktech-admin-cache-') && key !== CACHE_NAME)
        .map(key => {
          console.log(`[SW] Deleting old cache: ${key}`);
          return caches.delete(key);
        });
      return Promise.all(deletePromises);
    })
  );
  self.clients.claim();
});

// Fetch: Cache-first strategy with network fallback
self.addEventListener("fetch", event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        console.log(`[SW] Serving from cache: ${event.request.url}`);
        return response;
      }

      console.log(`[SW] Fetching from network: ${event.request.url}`);
      return fetch(event.request).then(response => {
        // Don't cache unsuccessful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(error => {
        console.log(`[SW] Network fetch failed: ${event.request.url}`, error);
        
        // Return offline page for navigation requests
        if (event.request.destination === 'document') {
          return caches.match('/offline.html');
        }
        
        throw error;
      });
    })
  );
});

// Message handler for cache updates
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING message');
    self.skipWaiting();
  }
});

// Sync handler for background sync
self.addEventListener('sync', event => {
  console.log(`[SW] Background sync triggered: ${event.tag}`);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync tasks here
      Promise.resolve()
    );
  }
});

// Push notification handler
self.addEventListener('push', event => {
  console.log('[SW] Push message received');
  
  const options = {
    body: event.data ? event.data.text() : 'TechThynk notification',
    icon: '/icon-192.png',
    badge: '/favicon-96x96.png',
    tag: 'thynktech-notification'
  };

  event.waitUntil(
    self.registration.showNotification('TechThynk admin', options)
  );
});

console.log(`[SW] TechThynk admin service worker loaded - Cache: ${CACHE_NAME}`);
