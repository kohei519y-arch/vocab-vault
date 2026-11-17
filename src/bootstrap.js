/**
 * Vocab Vault — Runtime Watchdog, Client Telemetry & Service Worker Registration (js/bootstrap.js)
 * Extracted from inline scripts to support strict CSP (`script-src 'self'`).
 */
(function (global) {
  'use strict';

  const MAX_ERROR_LOG = 50;
  const errorLog = [];
  let telemetryHook = null;

  function captureError(type, message, detail) {
    const entry = {
      type: String(type || 'error'),
      message: String(message || 'Unknown error').slice(0, 400),
      detail: detail ? String(detail).slice(0, 400) : '',
      at: new Date().toISOString()
    };
    errorLog.push(entry);
    if (errorLog.length > MAX_ERROR_LOG) errorLog.shift();
    if (typeof telemetryHook === 'function') {
      try { telemetryHook(entry); } catch {}
    }
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[VocabVault Watchdog]', entry.type + ':', entry.message);
    }
  }

  if (typeof global.addEventListener === 'function') {
    global.addEventListener('error', function (e) {
      captureError('error', e?.message, e?.filename ? `${e.filename}:${e.lineno || 0}` : '');
    });
    global.addEventListener('unhandledrejection', function (e) {
      const reason = e?.reason;
      captureError('unhandledrejection', reason?.message || String(reason || 'Promise rejected'), reason?.stack || '');
    });
  }

  global.VocabTelemetry = {
    captureError,
    getErrors: () => [...errorLog],
    clearErrors: () => { errorLog.length = 0; },
    setHook: (fn) => { telemetryHook = typeof fn === 'function' ? fn : null; }
  };

  // Attach PWA manifest only on HTTP(S) origins (avoids file:// CORS error in WKWebView/WebKit)
  if (
    typeof document !== 'undefined' &&
    typeof location !== 'undefined' &&
    (location.protocol === 'https:' || location.protocol === 'http:') &&
    !document.querySelector('link[rel="manifest"]')
  ) {
    try {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = 'manifest.json';
      document.head?.appendChild(link);
    } catch {}
  }

  // Service Worker registration & update banner wiring
  if (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof location !== 'undefined' &&
    (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ) {
    let refreshing = false;
    let allowReloadOnControllerChange = Boolean(navigator.serviceWorker.controller);
    let waitingWorker = null;

    function promptSwUpdate(worker) {
      waitingWorker = worker;
      const banner = document.getElementById('swUpdateBanner');
      if (banner) {
        banner.style.display = 'flex';
        const btnUpdate = /** @type {any} */ (document.getElementById('btnSwUpdateNow'));
        if (btnUpdate && !btnUpdate._swBound) {
          btnUpdate._swBound = true;
          btnUpdate.addEventListener('click', function () {
            allowReloadOnControllerChange = true;
            if (waitingWorker) waitingWorker.postMessage('skipWaiting');
            banner.style.display = 'none';
          });
        }
      } else if (worker) {
        allowReloadOnControllerChange = true;
        worker.postMessage('skipWaiting');
      }
    }

    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!allowReloadOnControllerChange) {
        allowReloadOnControllerChange = true;
        return;
      }
      if (!refreshing) {
        refreshing = true;
        global.location.reload();
      }
    });

    if (typeof global.addEventListener === 'function') {
      global.addEventListener('load', function () {
        navigator.serviceWorker.register('./sw.js').then(function (reg) {
          try { reg.update(); } catch {}
          if (reg.waiting) promptSwUpdate(reg.waiting);
          reg.addEventListener('updatefound', function () {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', function () {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  promptSwUpdate(newWorker);
                }
              });
            }
          });
        }).catch(function (err) {
          captureError('sw-registration', err?.message || String(err));
        });
      });
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);

export {};
