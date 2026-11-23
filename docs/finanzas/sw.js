// Service worker antiguo de Finanzas: ahora toda la app usa ../sw.js.
// Este se limpia a sí mismo para que el nuevo tome el control.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('finanzas-')).map((k) => caches.delete(k))))
      .then(() => self.registration.unregister())
  );
});
