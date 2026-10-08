/**
 * Vocab Vault — Service Worker (PWA Offline & Cache)
 * Strategy: Network-First for HTML/CSS/JS (Eliminates stale black screen cache bugs)
 *           Cache-First/SWR for media assets
 */
const CACHE_NAME = 'vocab-vault-v11-network-first';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './dev.html',
  './css/app.css',
  './js/storage.js',
  './js/anki.js',
  './js/sync.js',
  './js/ocr.js',
  './js/graph.js',
  './js/feedback.js',
  './js/starter_pack.js',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

// インストール時にコアアセットをプリキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 古いキャッシュの即座クリーンアップ
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// リクエストのルーティング
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // 外部API (Supabase, Gemini, Wiktionary, Stripe) はキャッシュせず常にネットワーク優先
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('generativelanguage.googleapis.com') ||
    url.hostname.includes('wiktionary.org') ||
    url.hostname.includes('stripe.com')
  ) {
    return;
  }

  const isHtml = event.request.mode === 'navigate' ||
                 event.request.headers.get('accept')?.includes('text/html') ||
                 url.pathname.endsWith('.html') ||
                 url.pathname.endsWith('/') ||
                 url.pathname === '/vocab-vault/' ||
                 url.pathname === '/vocab-vault';

  // 1. HTML (ページ遷移): Network-First (オンラインなら常に最新のHTMLを取得し、キャッシュ汚染を100%防止)
  if (isHtml) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(event.request, { ignoreSearch: true });
          if (cached) return cached;
          if (url.pathname.includes('dev.html')) {
            const devFallback = await cache.match('./dev.html');
            if (devFallback) return devFallback;
          }
          return (await cache.match('./index.html')) || (await cache.match('./')) || new Response('Offline', { status: 503 });
        })
    );
    return;
  }

  // 2. CSS / JS: Network-First (最新スタイル・コードを即座に反映)
  const isCode = url.pathname.endsWith('.js') || url.pathname.endsWith('.css');
  if (isCode) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match(event.request, { ignoreSearch: true })) || new Response('', { status: 404 });
        })
    );
    return;
  }

  // 3. 静的画像・アイコンなど: Stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cachedResponse = await cache.match(event.request, { ignoreSearch: true });
      const networkPromise = fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200 && (networkResponse.type === 'basic' || networkResponse.type === 'cors')) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => null);

      if (cachedResponse) return cachedResponse;
      const netRes = await networkPromise;
      if (netRes) return netRes;
      return new Response('Not found', { status: 404 });
    })
  );
});
