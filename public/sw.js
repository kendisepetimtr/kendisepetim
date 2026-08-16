const STATIC_CACHE = "ks-pwa-static-v5";
const PAGE_CACHE = "ks-pwa-pages-v5";
const DATA_CACHE = "ks-pwa-data-v5";
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

function hostnameOf(hostname) {
  return String(hostname || "").toLowerCase();
}

function isPartnerHost(hostname) {
  const host = hostnameOf(hostname);
  return host === "partner.kendisepetim.com" || host === "partner.localhost";
}

function isApexMarketplaceHost(hostname) {
  const host = hostnameOf(hostname);
  if (isPartnerHost(host)) return false;
  return (
    host === "kendisepetim.com" ||
    host === "www.kendisepetim.com" ||
    host === "localhost" ||
    host === "127.0.0.1"
  );
}

function isMenuSubdomainHost(hostname) {
  const host = hostnameOf(hostname);
  if (isApexMarketplaceHost(host) || isPartnerHost(host)) return false;
  if (host.endsWith(".localhost")) return true;
  if (host.endsWith(".kendisepetim.com")) return true;
  return false;
}

function isMarketplacePwaRequest(url) {
  if (!isApexMarketplaceHost(url.hostname)) return false;
  const path = url.pathname;
  if (path.startsWith("/m/")) return false;
  if (path.startsWith("/api/")) return false;
  if (path.startsWith("/dashboard")) return false;
  if (path.startsWith("/superadmin")) return false;
  if (path.startsWith("/admin")) return false;
  if (path.startsWith("/garson")) return false;
  if (path.startsWith("/kasa")) return false;
  if (path.startsWith("/giris")) return false;
  if (path.startsWith("/kayit")) return false;
  if (path.startsWith("/beklemede")) return false;
  return true;
}

function isMenuPwaRequest(url) {
  return isMenuSubdomainHost(url.hostname);
}

function isBypassedRequest(request, url) {
  if (request.method !== "GET") return true;
  if (!isSameOrigin(url)) return true;
  if (url.pathname.startsWith("/api/")) return true;
  if (isMarketplacePwaRequest(url) || isMenuPwaRequest(url)) return false;
  return true;
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
