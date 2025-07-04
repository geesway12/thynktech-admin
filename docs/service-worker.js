const CACHE_NAME = "afyacare-cache-v3";
const urlsToCache = [
  "/",
  "/index.html",
  "/offline.html",
  "/styles.css",
  "/favicon.ico",
  "/logo.png",
  "/manifest.json",

  // JS modules
  "/app.js",
  "/admin.js",
  "/auth.js",
  "/appointments.js",
  "/backup.js",
  "/db.js",
  "/export.js",
  "/formUtils.js",
  "/idUtils.js",
  "/patients.js",
  "/pwa.js",
  "/reports.js",
  "/services.js",
  "/utils.js",
  "/visits.js",
];

// Install: Cache core assets
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Activate: Clean up old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: Serve cache first, then fallback to network, then offline page
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(response =>
      response || fetch(event.request)
    ).catch(() => caches.match("/offline.html"))
  );
});

// Notify clients of SW updates
self.addEventListener("message", event => {
  if (event.data === "checkForUpdate") {
    self.skipWaiting();
  }
});
// App install prompt (handled in app.js or UI)
self.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  self.installPrompt = e;
  // Clients can trigger prompt by listening for this message
  self.clients.matchAll().then(clients => {
    clients.forEach(client =>
      client.postMessage({ type: "installPromptAvailable" })
    );
  });
});

// Send message when online/offline or update is ready
function broadcastMessage(message) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => client.postMessage(message));
  });
}

// Optional: Notify clients when going offline (relies on page events)
self.addEventListener("sync", () => {
  broadcastMessage({ type: "syncEvent" });
});