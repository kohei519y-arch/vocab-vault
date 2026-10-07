/**
 * Vocab Vault — Service Worker (PWA Offline & Cache)
 */
const CACHE_NAME = 'vocab-vault-v4-20261007-srs-sync';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './dev.html',
  './css/app.css',
  './js/storage.js',
  './js/anki.js',
  './js/sync.js',
  './js/feedback.js',
  './js/starter_pack.js',
  './js/app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

// インストール時にコアアセットをプリキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 古いキャッシュのクリーンアップ
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
  // GET以外のリクエストはキャッシュせず通常ネットワークへ
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

  // アプリ内静的アセット: Stale-while-revalidate 戦略
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

      if (cachedResponse) {
        // バックグラウンドでキャッシュ更新しつつ即時返却
        return cachedResponse;
      }

      // キャッシュがない場合はネットワーク待機
      const netRes = await networkPromise;
      if (netRes) return netRes;

      // オフラインかつHTMLリクエストならトップページへフォールバック
      if (event.request.headers.get('accept')?.includes('text/html') || url.pathname.endsWith('.html') || url.pathname === '/') {
        if (url.pathname.includes('dev.html')) {
          const devFallback = await cache.match('./dev.html');
          if (devFallback) return devFallback;
        }
        const fallback = (await cache.match('./')) || (await cache.match('./index.html'));
        if (fallback) return fallback;
      }

      return new Response('Offline and resource not cached.', { status: 503, statusText: 'Service Unavailable' });
    })
  );
});
