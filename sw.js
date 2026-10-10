// Service Worker — BECO Descargas Parciales
// Solo guarda la "cáscara" de la app (HTML, íconos, librerías).
// NUNCA guarda datos de OneDrive ni respuestas de login: esos siempre van a la red.
const VERSION = 'dp-v2';
const SHELL = ['./', './index.html', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];
const LIBS = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Librerías versionadas del CDN: caché primero
  if (LIBS.includes(url.hostname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return r;
    })));
    return;
  }

  // Cualquier otro dominio (Graph, OneDrive, login de Microsoft): no se toca
  if (url.origin !== self.location.origin) return;

  // Archivos propios: red primero (para que siempre veas la última versión), caché si no hay internet
  e.respondWith(fetch(req).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return r;
  }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html'))));
});
