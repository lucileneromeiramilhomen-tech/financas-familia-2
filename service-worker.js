// Service worker do PWA "Finanças da Família"
// Estratégia: o HTML principal (app shell) sempre busca a versão mais nova
// da rede primeiro (network-first) e só usa o cache como fallback offline.
// Isso garante que toda atualização publicada apareça na hora, sem precisar
// limpar dados do site manualmente. Ícones/manifest usam cache-first (mudam
// raramente, então não há problema em servir do cache).

const CACHE_NAME = "financas-familia-v6";
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

  const isAppShellDoc =
    event.request.mode === "navigate" ||
    event.request.destination === "document" ||
    url.pathname.endsWith(".html");

  if (isAppShellDoc) {
    // NETWORK-FIRST: sempre tenta buscar a versão mais nova publicada.
    // Só cai pro cache se estiver offline.
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Demais arquivos estáticos (ícones, manifest): cache-first, atualiza em segundo plano
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (event.request.method === "GET" && networkResponse.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
          }
          return networkResponse;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
