/**
 * Vocab Vault — Unified Lazy Script Chunk Loader (src/chunk_loader.js)
 * Works across HTTP(S) PWA (offline-precached via SW), Mac WKWebView file://, and headless JSC tests.
 */
const global = typeof window !== 'undefined' ? window : globalThis;
const nativeJscLoad = typeof global.load === 'function' ? global.load : (typeof load === 'function' ? load : null);
const loadedChunks = new Map();

export function hasNativeJscLoad() {
  return typeof nativeJscLoad === 'function';
}

export function loadChunkSyncIfJsc(relPath) {
  if (typeof nativeJscLoad !== 'function') return false;
  if (typeof document !== 'undefined' && document.head && typeof document.head.appendChild === 'function') {
    return false;
  }
  try {
    const base = global.__VV_BASE_PATH__ || '.';
    nativeJscLoad(`${base}/${relPath}`);
    return true;
  } catch {
    return false;
  }
}

export function loadChunkScript(relPath) {
  if (loadedChunks.has(relPath)) return loadedChunks.get(relPath);
  if (loadChunkSyncIfJsc(relPath)) {
    const done = Promise.resolve(true);
    loadedChunks.set(relPath, done);
    return done;
  }
  if (typeof document === 'undefined' || typeof document.createElement !== 'function' || !document.head || typeof document.head.appendChild !== 'function') {
    return Promise.resolve(false);
  }
  const p = new Promise((resolve, reject) => {
    const existing = typeof document.querySelector === 'function'
      ? document.querySelector(`script[data-vv-chunk="${relPath}"]`)
      : null;
    if (existing) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = `./${relPath}`;
    script.async = true;
    script.dataset.vvChunk = relPath;
    script.onload = () => resolve(true);
    script.onerror = () => {
      loadedChunks.delete(relPath);
      reject(new Error(`Failed to load lazy chunk: ${relPath}`));
    };
    document.head.appendChild(script);
  });
  loadedChunks.set(relPath, p);
  return p;
}
