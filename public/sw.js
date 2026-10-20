// Offline support for the installed game (production builds only; registered in src/main.tsx).
// - Pages: network first, falling back to the cached shell, so a new deploy is picked up when online.
// - Hashed bundles (/assets/index-*.js|css, chunks): cache first; they never change under the same name.
// - Models, audio and icons: stale-while-revalidate; they are cached as the game loads them, so after one
//   session the world is playable offline, and a redeploy refreshes them in the background.
const VERSION = "tom-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/favicon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const hashed = /\/assets\/[^/]+-[A-Za-z0-9_-]{8}\.(js|css)$/;

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put("/", copy));
          return res;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }
  if (hashed.test(url.pathname)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => put(req, res))));
    return;
  }
  if (url.pathname.startsWith("/assets/")) {
    e.respondWith(
      caches.match(req).then((hit) => {
        const fresh = fetch(req)
          .then((res) => put(req, res))
          .catch(() => hit);
        return hit || fresh;
      }),
    );
  }
});

function put(req, res) {
  if (res.ok) {
    const copy = res.clone();
    caches.open(VERSION).then((c) => c.put(req, copy));
  }
  return res;
}
