(function() {
  const host = String(window.location?.hostname || '');
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local') || host === '';
  if (!isLocal) {
    const body = document.body || document.documentElement;
    if (body) {
      body.replaceChildren();
      const wrap = document.createElement('div');
      wrap.style.cssText = 'padding:40px;font-family:sans-serif;background:#111;color:#eee;min-height:100vh';
      const h1 = document.createElement('h1');
      h1.textContent = '403 Forbidden';
      const p = document.createElement('p');
      p.textContent = 'Developer master mode is strictly disabled on non-local hosts.';
      wrap.appendChild(h1);
      wrap.appendChild(p);
      body.appendChild(wrap);
    }
    throw new Error('dev.html is blocked on non-local hosts');
  }
  window.__VV_DEV_MASTER = true;
})();

export {};
