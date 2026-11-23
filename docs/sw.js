// Service worker de "Mi cielo": permite abrir todas las secciones sin internet.
// Sube CACHE cuando cambies archivos para que el teléfono descargue la versión nueva.
const CACHE = 'mi-cielo-v3';
const ASSETS = [
  './', 'index.html', 'hub.js', 'hub.css', 'manifest.webmanifest',
  'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png',
  'shared/base.css', 'shared/core.js', 'shared/icons.js', 'shared/theme-early.js',
  'finanzas/', 'finanzas/index.html', 'finanzas/app.js', 'finanzas/finanzas.css',
  'ideas/', 'ideas/index.html', 'ideas/ideas.js', 'ideas/ideas.css',
  'gatos/', 'gatos/index.html', 'gatos/gatos.js', 'gatos/gatos.css',
  'habitos/', 'habitos/index.html', 'habitos/habitos.js', 'habitos/habitos.css',
  'diario/', 'diario/index.html', 'diario/diario.js', 'diario/diario.css',
  'ajustes/', 'ajustes/index.html', 'ajustes/ajustes.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Responde desde caché al instante y actualiza en segundo plano.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(e.request, { ignoreSearch: true });
      const network = fetch(e.request)
        .then((res) => { if (res.ok) cache.put(e.request, res.clone()); return res; })
        .catch(() => cached);
      return cached || network;
    })
  );
});
