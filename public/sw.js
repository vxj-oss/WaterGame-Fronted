// Service worker mínimo: hace que el navegador ofrezca instalar el juego como app (pantalla completa).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
