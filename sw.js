/**
 * Vocab Vault — Service Worker (PWA Offline & Cache)
 * Strategy: Network-First for HTML/CSS/JS (Eliminates stale black screen cache bugs)
 *           Cache-First/SWR for media assets
 */
const CACHE_NAME = 'vocab-vault-v47-webgl-multilang';

// [P1-5 解決] 弱電波（Lie-fi）時のホワイトアウト・ハングアップを防ぐ安全タイムアウト付きフェッチ
function fetchWithTimeout(request, timeoutMs = 3000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(request, { signal: controller.signal })
    .finally(() => clearTimeout(timeoutId));
}

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './css/app.css',
  './js/i18n.js',
  './js/storage.js',
  './js/anki.js',
  './js/sync.js',
  './js/ocr.js',
  './js/morphology.js',
  './js/eiken_catalog.js',
  './js/graph_layout.js',
  './js/graph_webgl.js',
  './js/graph_renderer.js',
  './js/graph_views.js',
  './js/graph.js',
  './js/feedback.js',
  './js/dictionary.js',
  './js/starter_pack.js',
  './js/export.js',
  './js/speech.js',
  './js/card_view.js',
  './js/queue.js',
  './js/modal.js',
  './js/search.js',
  './js/navigation.js',
  './js/anki_view.js',
  './js/list_view.js',
  './js/events.js',
  './js/app.js',
  './manifest.json',
  './legal/terms.html',
  './legal/privacy.html',
  './legal/tokushoho.html',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/icon.svg',
  './icons/favicon-32.png'
];

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  } else if (event.data && typeof event.data === 'object') {
    if (event.data.type === 'SHOW_NOTIFICATION' && self.registration?.showNotification) {
      const { title, options } = event.data;
      self.registration.showNotification(title || '【Vocab Vault】忘却臨界点アラート', Object.assign({
        icon: './icons/icon-192.png',
        badge: './icons/favicon-32.png',
        tag: 'vocab-forgetting-alert',
        renotify: true,
        data: { url: './?mode=anki' }
      }, options || {}));
    } else if (event.data.type === 'SCHEDULE_NOTIFICATION' && event.data.delayMs > 0) {
      setTimeout(() => {
        if (self.registration?.showNotification) {
          self.registration.showNotification(event.data.title || '【Vocab Vault】忘却臨界点アラート', Object.assign({
            icon: './icons/icon-192.png',
            badge: './icons/favicon-32.png',
            tag: 'vocab-forgetting-alert',
            renotify: true,
            data: { url: './?mode=anki' }
          }, event.data.options || {}));
        }
      }, Math.min(event.data.delayMs, 2147483647));
    }
  }
});

// インストール時にコアアセットを耐障害プリキャッシュ (単一アセット欠落でも全体アボートを防止)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await Promise.allSettled(
        PRECACHE_ASSETS.map(url =>
          cache.add(url).catch(err => {
            console.warn('[SW] Precache skipped for:', url, err);
          })
        )
      );
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
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // 外部API (Supabase, Gemini, Wiktionary, Stripe, 外部TTS音声) はキャッシュせず常にブラウザネイティブ通信に委ねる
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('generativelanguage.googleapis.com') ||
    url.hostname.includes('wiktionary.org') ||
    url.hostname.includes('stripe.com') ||
    url.hostname.includes('translate.google.com') ||
    url.hostname.includes('dictionaryapi.dev')
  ) {
    return;
  }

  const isHtml = event.request.mode === 'navigate' ||
                 event.request.headers.get('accept')?.includes('text/html') ||
                 url.pathname.endsWith('.html') ||
                 url.pathname.endsWith('/') ||
                 url.pathname === '/vocab-vault/' ||
                 url.pathname === '/vocab-vault';

  // 1. HTML (ページ遷移): Network-First (タイムアウト3秒で弱電波ハングを防ぎキャッシュへフォールバック)
  if (isHtml) {
    event.respondWith(
      fetchWithTimeout(event.request, 3000)
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
          return (await cache.match('./index.html')) || (await cache.match('./')) || new Response('Offline', { status: 503 });
        })
    );
    return;
  }

  // 2. CSS / JS: Stale-While-Revalidate (キャッシュがあれば即座に0ms返却し、バックグラウンドで最新版を更新)
  const isCode = url.pathname.endsWith('.js') || url.pathname.endsWith('.css');
  if (isCode) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cached = await cache.match(event.request, { ignoreSearch: true });
        const netPromise = fetchWithTimeout(event.request, 3000)
          .then(res => {
            if (res && res.status === 200) {
              cache.put(event.request, res.clone());
            }
            return res;
          })
          .catch(() => null);

        // キャッシュがあれば即時返却（電波ゼロ・弱電波でも爆速表示）、初回のみネットワーク待機
        return cached || (await netPromise) || new Response('Offline resource unavailable', { status: 503 });
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

// --- 観点1: 忘却臨界点スマートPush通知 ＆ タップハンドラ ---
self.addEventListener('push', event => {
  let data = {
    title: '【Vocab Vault】忘却臨界点アラート',
    body: '記憶保持率が90%を下回ろうとしている単語があります。今すぐ1分復習しましょう！'
  };
  if (event.data) {
    try {
      const parsed = event.data.json();
      if (parsed && typeof parsed === 'object') data = Object.assign(data, parsed);
    } catch {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: './icons/icon-192.png',
    badge: './icons/favicon-32.png',
    tag: 'vocab-forgetting-alert',
    renotify: true,
    data: { url: './?mode=anki' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || './';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes('vocab-vault') || client.url.includes('vocabvault') || client.url.includes('localhost') || client.url.includes('127.0.0.1')) {
          if ('focus' in client) return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

