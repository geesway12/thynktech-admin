const CACHE_NAME = "thynktech-cache-v5";
const urlsToCache = [
  "/",
  "/index.html",
  "/offline.html",
  "/styles.css",
  "/favicon.ico",
  "/logo-light.png",
  "/logo-dark.png",
  "/manifest.json",

  "/app.js",
  "/admin.js",
  "/pwa.js",
  "/registers.js",

  "./appointments.js",
  "./auth.js",
  "./backup.js",
  "./db.js",
  "./export.js",
  "./helpers.js",
  "./layout.js",
  "./patients.js",
  "./reports.js",
  "./services.js",
  "./visits.js",
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

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

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(response =>
      response || fetch(event.request)
    ).catch(() => caches.match("/offline.html"))
  );
});

self.addEventListener("message", event => {
  if (event.data === "checkForUpdate") {
    self.skipWaiting();
  }
});

self.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  self.installPrompt = e;

  self.clients.matchAll().then(clients => {
    clients.forEach(client =>
      client.postMessage({ type: "installPromptAvailable" })
    );
  });
});

function broadcastMessage(message) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => client.postMessage(message));
  });
}

self.addEventListener("sync", () => {
  broadcastMessage({ type: "syncEvent" });
});