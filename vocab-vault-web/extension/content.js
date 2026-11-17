/**
 * Vocab Vault Extension — Content Script
 * Double-click / text-selection floating collector badge
 */

(function () {
  'use strict';

  let floatingBtn = null;
  let activeSelectedWord = '';

  function getMsg(key, fallback, sub) {
    try {
      if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage) {
        const val = chrome.i18n.getMessage(key, sub);
        if (val) return val;
      }
    } catch {}
    return fallback;
  }

  function removeFloatingBtn() {
    if (floatingBtn && floatingBtn.parentNode) {
      floatingBtn.parentNode.removeChild(floatingBtn);
    }
    floatingBtn = null;
    activeSelectedWord = '';
  }

  function renderFloatingContent(container, label) {
    container.replaceChildren();
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'M12 5v14M5 12h14');
    svg.appendChild(path);
    const span = document.createElement('span');
    span.textContent = label;
    container.appendChild(svg);
    container.appendChild(span);
  }

  document.addEventListener('mouseup', (e) => {
    if (floatingBtn && floatingBtn.contains(e.target)) return;

    const sel = window.getSelection();
    const text = (sel ? sel.toString() : '').trim();

    if (sel && sel.rangeCount > 0 && text.length >= 2 && text.length <= 40 && !text.includes('\n') && /^[A-Za-zÀ-ÿ\s'-]+$/.test(text)) {
      activeSelectedWord = text;
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const addLabel = getMsg('addToVault', 'Add to Vault');

      if (!floatingBtn) {
        floatingBtn = document.createElement('div');
        floatingBtn.className = 'vv-floating-btn';
        renderFloatingContent(floatingBtn, addLabel);
        document.body.appendChild(floatingBtn);

        floatingBtn.addEventListener('mousedown', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
        });

        floatingBtn.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (!activeSelectedWord) return;

          chrome.runtime.sendMessage(
            { action: 'ADD_WORD', word: activeSelectedWord, lang: 'en' },
            (res) => {
              if (res && res.success && floatingBtn) {
                floatingBtn.classList.add('added');
                floatingBtn.replaceChildren();
                const doneSpan = document.createElement('span');
                doneSpan.textContent = getMsg('addedCount', `Added (${res.count})`, [String(res.count)]);
                floatingBtn.appendChild(doneSpan);
                setTimeout(() => {
                  removeFloatingBtn();
                }, 1000);
              }
            }
          );
        });
      }

      const top = window.scrollY + rect.bottom + 6;
      const left = Math.max(10, window.scrollX + rect.left);
      floatingBtn.style.top = `${top}px`;
      floatingBtn.style.left = `${left}px`;
    } else {
      removeFloatingBtn();
    }
  });

  document.addEventListener('mousedown', (e) => {
    if (floatingBtn && !floatingBtn.contains(e.target)) {
      removeFloatingBtn();
    }
  });
})();
