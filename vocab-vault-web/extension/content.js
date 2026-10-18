/**
 * Vocab Vault Extension — Content Script
 * Double-click / text-selection floating collector badge
 */

(function () {
  'use strict';

  let floatingBtn = null;
  let activeSelectedWord = '';

  function removeFloatingBtn() {
    if (floatingBtn && floatingBtn.parentNode) {
      floatingBtn.parentNode.removeChild(floatingBtn);
    }
    floatingBtn = null;
    activeSelectedWord = '';
  }

  document.addEventListener('mouseup', (e) => {
    // ボタン自体のクリック時は無視
    if (floatingBtn && floatingBtn.contains(e.target)) return;

    const sel = window.getSelection();
    const text = (sel ? sel.toString() : '').trim();

    // 1〜3単語程度（2〜40文字の英単語・ラテン文字・単語）を対象とする
    if (sel && sel.rangeCount > 0 && text.length >= 2 && text.length <= 40 && !text.includes('\n') && /^[A-Za-zÀ-ÿ\s'-]+$/.test(text)) {
      activeSelectedWord = text;
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      if (!floatingBtn) {
        floatingBtn = document.createElement('div');
        floatingBtn.className = 'vv-floating-btn';
        floatingBtn.innerHTML = `
          <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          <span>Vaultに追加</span>
        `;
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
              if (res && res.success) {
                floatingBtn.classList.add('added');
                floatingBtn.innerHTML = `<span>追加完了 (${res.count})</span>`;
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
