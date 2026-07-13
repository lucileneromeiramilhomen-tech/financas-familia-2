// Service worker do PWA "Finanças da Família"
// Faz cache do "shell" do app (HTML/CSS/JS embutidos no arquivo único) para abrir
// instantaneamente e funcionar mesmo com internet ruim. Os dados em si continuam
// vindo do seu Apps Script (Google Sheets), então é necessário internet pra
// carregar/salvar lançamentos.

const CACHE_NAME = "financas-familia-v4";
const APP_SHELL = [
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Nunca cacheia chamadas ao Apps Script (dados sempre precisam ser frescos)
  if (url.hostname.includes("script.google.com")) {
    return;
  }

  // Shell do app: cache-first (abre rápido, atualiza em segundo plano)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (event.request.method === "GET" && networkResponse.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
