const STATIC_CACHE = "ks-qr-static-v4";
const PAGE_CACHE = "ks-qr-pages-v4";
const DATA_CACHE = "ks-qr-data-v4";
const ACTIVE_CACHES = [STATIC_CACHE, PAGE_CACHE, DATA_CACHE];

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys.filter((key) => !ACTIVE_CACHES.includes(key)).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

/** Yalnizca QR menu PWA rotalarinda devreye gir; giris/panel/auth rotalarina dokunma. */
function isMenuSubdomainHost(hostname) {
  const host = hostname.toLowerCase();
  if (host === "kendisepetim.com" || host === "www.kendisepetim.com") return false;
  if (host.endsWith(".localhost")) return true;
  if (host.endsWith(".kendisepetim.com")) return true;
  return false;
}

function isMenuPwaRequest(url) {
  if (url.pathname.startsWith("/m/")) return true;
  if (isMenuSubdomainHost(url.hostname) && url.pathname === "/") return true;
  return false;
}

function isBypassedRequest(request, url) {
  if (request.method !== "GET") return true;
  if (!isSameOrigin(url)) return true;
  if (!isMenuPwaRequest(url)) return true;
  if (url.pathname.startsWith("/api/")) return true;
  return false;
}

async function putInCache(cacheName, request, response) {
  if (!response || !response.ok) return response;
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
  return response;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    await putInCache(cacheName, request, response);
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response("Menu su an cevrimdisi. Lutfen internet baglantinizi kontrol edin.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (isBypassedRequest(request, url)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, PAGE_CACHE));
    return;
  }

  const isStaticAsset =
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "font" ||
    request.destination === "image" ||
    request.destination === "video" ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname.endsWith(".webmanifest") ||
    url.pathname.endsWith(".mp4") ||
    url.pathname.endsWith("/favicon") ||
    url.pathname.endsWith("/icon");

  if (isStaticAsset) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then((response) => putInCache(STATIC_CACHE, request, response))
          .catch(() => null);

        if (cached) {
          event.waitUntil(networkPromise);
          return cached;
        }

        const network = await networkPromise;
        if (network) return network;

        const fallback = await cache.match(request);
        if (fallback) return fallback;

        return new Response("Menu su an cevrimdisi. Lutfen internet baglantinizi kontrol edin.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      })(),
    );
    return;
  }

  event.respondWith(networkFirst(request, DATA_CACHE));
});
