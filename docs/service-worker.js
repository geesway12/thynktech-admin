const CACHE_NAME = "thynktech-cache-v4";
const urlsToPreCache = [
  "/", "/index.html", "/offline.html", "/styles.css",
  "/favicon.ico", "/logo.png", "/manifest.json",
  "/app.js", "/admin.js", "/auth.js", "/appointments.js",
  "/backup.js", "/db.js", "/export.js", "/formUtils.js",
  "/idUtils.js", "/patients.js", "/pwa.js", "/reports.js",
  "/services.js", "/utils.js", "/visits.js", "/registers.js"
];

// Install: Pre-cache static assets
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToPreCache))
  );
});

// Activate: Remove old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
  broadcastMessage({ type: "updateReady" });
});

// Fetch: Handle static, dynamic, and offline fallback
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // 1. Ignore non-GET requests except for API
  if (request.method !== "GET") {
    if (request.url.includes("/api/")) {
      return event.respondWith(handleApiRequest(request));
    }
    return;
  }

  // 2. Handle dynamic GET API requests (cache-first for /api/)
  if (request.url.includes("/api/")) {
    return event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) fetchAndUpdateCache(request); // async update
        return cached || fetchAndCache(request);
      }).catch(() => caches.match("/offline.html"))
    );
  }

  // 3. Static asset fetch with offline fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        fetchAndUpdateCache(request); // update in background
        return cached;
      }
      return fetchAndCache(request).catch(() => caches.match("/offline.html"));
    })
  );
});
// API request handling: POST/PUT/DELETE (queue if offline)
async function handleApiRequest(request) {
  try {
    const response = await fetch(request.clone());
    return response;
  } catch (error) {
    // Store in IndexedDB or Sync Queue
    await queueRequest(request);
    return new Response(JSON.stringify({ status: "queued_offline" }), {
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Cache GET requests
function fetchAndCache(request) {
  return fetch(request)
    .then((response) => {
      if (isCacheable(response)) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
      }
      return response;
    })
    .catch((err) => {
      // Optionally log or report errors
      console.warn('fetchAndCache error:', err);
      throw err;
    });
}

// Background update
function fetchAndUpdateCache(request) {
  fetch(request).then((response) => {
    if (isCacheable(response)) {
      caches.open(CACHE_NAME).then((cache) => cache.put(request, response));
    }
  }).catch((err) => {
    // Optionally log or report errors
    console.warn('fetchAndUpdateCache error:', err);
  });
}

function isCacheable(response) {
  return response && response.status === 200 && response.type === "basic";
}
// Sync queued API requests
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-queued-requests") {
    event.waitUntil(replayQueuedRequests());
  }
  broadcastMessage({ type: "syncEvent" });
});

// Message: manual SW update or sync trigger
self.addEventListener("message", (event) => {
  if (event.data === "checkForUpdate") self.skipWaiting();
  if (event.data === "triggerSync") {
    if ('sync' in self.registration) {
      self.registration.sync.register("sync-queued-requests");
    } else {
      // Fallback: try to replay immediately
      replayQueuedRequests();
    }
  }
});

// Install prompt for Android
self.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  self.installPrompt = e;
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => client.postMessage({ type: "installPromptAvailable" }));
  });
});

// Send messages to app
function broadcastMessage(message) {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => client.postMessage(message));
  });
}

// --- Offline queue using IndexedDB for API requests (improved version) ---
// Uses Promises for cursor iteration and error handling
let dbPromise = null;
function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open("api-request-queue", 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        db.createObjectStore("requests", { autoIncrement: true });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject("Failed to open IDB");
    });
  }
  return dbPromise;
}

async function queueRequest(request) {
  const db = await openDb();
  const cloned = {
    url: request.url,
    method: request.method,
    headers: [...request.headers],
    body: await request.clone().text(),
  };
  const tx = db.transaction("requests", "readwrite");
  tx.objectStore("requests").add(cloned);
}

async function replayQueuedRequests() {
  const db = await openDb();
  const tx = db.transaction("requests", "readwrite");
  const store = tx.objectStore("requests");
  return new Promise((resolve, reject) => {
    const cursorReq = store.openCursor();
    cursorReq.onerror = () => reject(cursorReq.error);
    cursorReq.onsuccess = async (e) => {
      const cursor = e.target.result;
      if (!cursor) return resolve();
      const requestData = cursor.value;
      const headers = new Headers(requestData.headers);
      const req = new Request(requestData.url, {
        method: requestData.method,
        headers,
        body: requestData.body,
      });
      try {
        const res = await fetch(req);
        if (res.ok) {
          store.delete(cursor.key); // remove from queue
        }
      } catch (err) {
        // Keep request in queue
      }
      cursor.continue();
    };
  });
}

// Notify clients of SW updates
self.addEventListener("message", event => {
  if (event.data === "checkForUpdate") {
    self.skipWaiting();
  }
});

// Notify clients when a new service worker is activated (update available)
self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      broadcastMessage({ type: "updateReady" });
    })()
  );
  self.clients.claim();
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