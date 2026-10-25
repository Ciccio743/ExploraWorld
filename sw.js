// Mode hors ligne : on essaie toujours le réseau d'abord (une nouvelle version
// d'index.html déposée sur GitHub est donc prise tout de suite), et on retombe
// sur la copie en cache quand il n'y a pas de connexion.
const CACHE = "explora";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request).then(hit => hit || caches.match("./")))
  );
});
