/**
 * ThynkTech Enhanced Service Worker Template
 * Comprehensive offline support for healthcare data management
 * admin and 2025-07-12T18-31-59 will be replaced during deployment
 */

const CACHE_NAME = "thynktech-admin-cache-v2025-07-12T18-31-59";
const DATA_CACHE_NAME = "thynktech-admin-data-v2025-07-12T18-31-59";

// Core application assets
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

// App-specific URLs
const appSpecificUrls = {
  admin: [
    "/app.js",
    "/admin.js",
    "/registers.js"
  ],
  users: [
    "/app.js", 
    "/users.js"
  ]
};

// Core healthcare modules (shared)
const coreModules = [
  "/auth.js",
  "/db.js",
  "/helpers.js",
  "/layout.js", 
  "/patients.js",
  "/appointments.js",
  "/visits.js",
  "/reports.js",
  "/services.js",
  "/backup.js",
  "/export.js",
  "/forms.js",
  "/pwa.js"
];

// Healthcare data patterns for intelligent caching
const healthcareDataPatterns = [
  'patients',
  'appointments', 
  'visits',
  'services',
  'reports',
  'registers',
  'users',
  'backup',
  'localStorage'
];

// Combine all URLs based on app type
const urlsToCache = [
  ...baseUrlsToCache,
  ...(appSpecificUrls["admin"] || []),
  ...coreModules
];

// Install: Cache core assets and prepare offline infrastructure
self.addEventListener("install", event => {
  console.log(`[SW] Installing ThynkTech admin v2025-07-12T18-31-59`);
  self.skipWaiting();
  
  event.waitUntil(
    Promise.all([
      // Cache app shell
      caches.open(CACHE_NAME).then(cache => {
        console.log(`[SW] Caching ${urlsToCache.length} app resources`);
        return cache.addAll(urlsToCache).catch(error => {
          console.error('[SW] Failed to cache some resources:', error);
          // Continue even if some resources fail
          return Promise.resolve();
        });
      }),
      // Initialize data cache
      caches.open(DATA_CACHE_NAME).then(() => {
        console.log('[SW] Healthcare data cache initialized');
        return Promise.resolve();
      })
    ])
  );
});

// Activate: Clean up old caches and claim clients
self.addEventListener("activate", event => {
  console.log(`[SW] Activating ThynkTech admin v2025-07-12T18-31-59`);
  
  event.waitUntil(
    caches.keys().then(keys => {
      const deletePromises = keys
        .filter(key => 
          (key.startsWith('thynktech-admin-cache-') && key !== CACHE_NAME) ||
          (key.startsWith('thynktech-admin-data-') && key !== DATA_CACHE_NAME)
        )
        .map(key => {
          console.log(`[SW] Deleting old cache: ${key}`);
          return caches.delete(key);
        });
      return Promise.all(deletePromises);
    }).then(() => {
      // Notify all clients about the update
      return self.clients.matchAll();
    }).then(clients => {
      clients.forEach(client => {
        client.postMessage({ 
          type: 'CACHE_UPDATED',
          version: '2025-07-12T18-31-59'
        });
      });
    })
  );
  
  self.clients.claim();
});

// Fetch: Intelligent caching for healthcare applications
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  // Handle different types of requests with appropriate strategies
  if (isHealthcareDataRequest(url.pathname)) {
    event.respondWith(handleHealthcareData(request));
  } else if (isAppShellRequest(url.pathname)) {
    event.respondWith(handleAppShell(request));
  } else {
    event.respondWith(handleGenericRequest(request));
  }
});

// Check if request is for healthcare data
function isHealthcareDataRequest(pathname) {
  return healthcareDataPatterns.some(pattern => 
    pathname.toLowerCase().includes(pattern.toLowerCase())
  );
}

// Check if request is for app shell resources
function isAppShellRequest(pathname) {
  return urlsToCache.some(url => url === pathname) || 
         pathname === '/' || 
         pathname.endsWith('.html') ||
         pathname.endsWith('.css') ||
         pathname.endsWith('.js') ||
         pathname.endsWith('.json');
}

// Handle healthcare data with cache-first strategy
async function handleHealthcareData(request) {
  try {
    const cache = await caches.open(DATA_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log(`[SW] 🏥 Healthcare data from cache: ${request.url}`);
      
      // Update cache in background (stale-while-revalidate)
      fetch(request).then(response => {
        if (response && response.status === 200) {
          cache.put(request, response.clone());
          console.log(`[SW] 🔄 Updated healthcare cache: ${request.url}`);
        }
      }).catch(() => {
        // Silent fail - we have cached data
      });
      
      return cachedResponse;
    }
    
    // Not in cache, fetch from network
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
      console.log(`[SW] 📊 Cached new healthcare data: ${request.url}`);
    }
    
    return networkResponse;
  } catch (error) {
    console.log(`[SW] ❌ Healthcare data request failed: ${request.url}`, error);
    
    // For API calls, return offline-friendly response
    if (request.url.includes('/api/') || request.url.includes('json')) {
      return new Response(JSON.stringify({ 
        offline: true,
        error: 'No connection', 
        message: 'Healthcare data will sync when connection is restored',
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'X-Offline': 'true'
        }
      });
    }
    
    throw error;
  }
}

// Handle app shell with cache-first strategy
async function handleAppShell(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log(`[SW] 🎯 App shell from cache: ${request.url}`);
      return cachedResponse;
    }
    
    // Try network
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
      console.log(`[SW] 📱 Cached app shell: ${request.url}`);
    }
    
    return networkResponse;
  } catch (error) {
    console.log(`[SW] ❌ App shell request failed: ${request.url}`, error);
    
    // For navigation requests, return offline page or main app
    if (request.destination === 'document') {
      const cache = await caches.open(CACHE_NAME);
      return cache.match('/offline.html') || cache.match('/index.html');
    }
    
    throw error;
  }
}

// Handle generic requests with network-first strategy
async function handleGenericRequest(request) {
  try {
    // Try network first for generic resources
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      // Cache successful responses
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      console.log(`[SW] 🌐 Cached resource: ${request.url}`);
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback to cache
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log(`[SW] 💾 Fallback from cache: ${request.url}`);
      return cachedResponse;
    }
    
    console.log(`[SW] ❌ Request failed completely: ${request.url}`, error);
    throw error;
  }
}

// Background sync for offline data
self.addEventListener('sync', event => {
  console.log(`[SW] 🔄 Background sync: ${event.tag}`);
  
  if (event.tag === 'healthcare-data-sync') {
    event.waitUntil(syncHealthcareData());
  }
});

// Sync healthcare data when connection is restored
async function syncHealthcareData() {
  try {
    // Get any pending offline data from IndexedDB or localStorage
    const clients = await self.clients.matchAll();
    
    clients.forEach(client => {
      client.postMessage({ 
        type: 'SYNC_HEALTHCARE_DATA',
        action: 'start'
      });
    });
    
    console.log('[SW] 🏥 Healthcare data sync initiated');
    return Promise.resolve();
  } catch (error) {
    console.error('[SW] ❌ Healthcare data sync failed:', error);
    throw error;
  }
}

// Push notifications for healthcare alerts
self.addEventListener('push', event => {
  console.log('[SW] 📱 Push notification received');
  
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'ThynkTech healthcare notification',
    icon: '/icon-192.png',
    badge: '/favicon-96x96.png',
    tag: data.tag || 'thynktech-health',
    requireInteraction: data.urgent || false,
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icon-192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    data: data
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || 'ThynkTech admin', 
      options
    )
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

// Message handler for communication with main app
self.addEventListener('message', event => {
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      console.log('[SW] 🔄 Received SKIP_WAITING message');
      self.skipWaiting();
      break;
      
    case 'GET_CACHE_STATUS':
      event.ports[0].postMessage({
        cacheSize: urlsToCache.length,
        version: '2025-07-12T18-31-59',
        type: 'admin'
      });
      break;
      
    case 'CACHE_HEALTHCARE_DATA':
      if (data && data.url && data.response) {
        caches.open(DATA_CACHE_NAME).then(cache => {
          cache.put(data.url, new Response(data.response));
        });
      }
      break;
  }
});

console.log(`[SW] 🏥 ThynkTech admin Service Worker v2025-07-12T18-31-59 ready`);
console.log(`[SW] 📊 Caching strategy: App Shell (${urlsToCache.length} files) + Healthcare Data`);
