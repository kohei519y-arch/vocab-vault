/**
 * VocabVault - Keyboard Shortcuts, Word Suggest, and UI Navigation Module
 *
 * 【設計思想・単一責任】
 * キーボードファースト操作（Linear / Vim ライクな J/K/Space/E/R/? ナビゲーション）、
 * 単語登録時のインクリメンタルサジェスト（完全一致・部分一致・印欧祖語語根）、
 * カードフォーカス枠線およびアクセシビリティスクロールの統括。
 */

(function (global) {
  'use strict';

  // 重要印欧祖語語根リスト（サジェスト用マスターデータ）
  const DEFAULT_PIE_ROOTS = [
    '*sta-', '*genh₁-', '*bʰer-', '*sekʷ-', '*men-', '*wer-',
    '*kʷel-', '*dʰeh₁-', '*weid-', '*med-', '*kap-', '*ten-'
  ];

  /**
   * 文字列エスケープヘルパー
   */
  function esc(s) {
    if (global.VocabCore && typeof global.VocabCore.esc === 'function') {
      return global.VocabCore.esc(s);
    }
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * 単語および祖語語根の候補リストを抽出・ソート
   * @param {string} query
   * @param {Array} currentList - 現在の言語ペアの登録単語配列
   * @param {Array} [pieRoots] - 祖語語根配列
   * @returns {Array} suggestions
   */
  function buildSuggestions(query, currentList = [], pieRoots = DEFAULT_PIE_ROOTS) {
    const raw = (query || '').trim().toLowerCase();
    if (!raw) return [];

    const suggestions = [];
    const list = Array.isArray(currentList) ? currentList : [];

    for (let i = 0; i < list.length; i++) {
      if (suggestions.length >= 7) break;
      const item = list[i];
      if (!item || !item.word) continue;
      const wLow = String(item.word).toLowerCase();
      const isExact = wLow === raw;
      if (isExact || wLow.startsWith(raw) || (raw.length >= 3 && wLow.includes(raw))) {
        const entry = {
          type: 'word',
          word: item.word,
          meaning: item.meanings?.[0]?.text || '',
          pos: item.meanings?.[0]?.pos || '',
          folder: item.folder || '',
          isRegistered: true,
          isExact,
          item
        };
        if (isExact) suggestions.unshift(entry);
        else suggestions.push(entry);
      }
    }

    const roots = Array.isArray(pieRoots) && pieRoots.length ? pieRoots : DEFAULT_PIE_ROOTS;
    for (let i = 0; i < roots.length; i++) {
      if (suggestions.length >= 8) break;
      const r = roots[i];
      const cleanR = r.replace(/[\*h₁-₃\-]/g, '').toLowerCase();
      if (cleanR.startsWith(raw) || r.toLowerCase().includes(raw)) {
        suggestions.push({
          type: 'root',
          word: r,
          meaning: '印欧祖語・重要語根',
          pos: 'Root',
          isRegistered: false,
          isExact: false
        });
      }
    }

    return suggestions;
  }

  /**
   * サジェスト要素の HTML を生成
   * @param {Array} suggestions
   * @param {Function} [escFn]
   * @returns {string} HTML
   */
  function renderSuggestHtml(suggestions, escFn = esc) {
    if (!Array.isArray(suggestions) || !suggestions.length) return '';

    return suggestions.map((s, idx) => {
      const jumpW = (s.item && s.item.homographIndex > 1) ? `${s.word}#${s.item.homographIndex}` : s.word;
      return `
        <div class="suggest-item ${s.isExact ? 'exact-match' : ''}" data-idx="${idx}" data-type="${s.type}" data-word="${escFn(jumpW)}">
          <div class="suggest-item-left">
            <span class="suggest-item-word">${escFn(s.word)}${s.folder ? `<small style="margin-left:6px;font-size:10px;color:var(--m)">[${escFn(s.folder)}]</small>` : ''}</span>
            <span class="suggest-item-meaning">${escFn(s.meaning)}</span>
          </div>
          <span class="suggest-item-badge ${s.isExact ? 'exact' : s.isRegistered ? 'registered' : s.type === 'root' ? 'root' : ''}">
            ${s.isExact ? '登録済(タップで移動)' : s.isRegistered ? '登録済' : s.type === 'root' ? '語根' : escFn(s.pos)}
          </span>
        </div>
      `;
    }).join('');
  }

  /**
   * カード要素のフォーカス状態を更新
   * @param {number} newIdx
   * @param {Array<HTMLElement>} cards
   * @returns {number} clampedIndex
   */
  function clampAndFocusCard(newIdx, cards) {
    if (!cards || !cards.length) return -1;
    const clampedIdx = Math.max(0, Math.min(newIdx, cards.length - 1));
    cards.forEach((c, i) => {
      if (c && c.classList && typeof c.classList.toggle === 'function') {
        c.classList.toggle('card-focused', i === clampedIdx);
      }
    });
    const targetCard = cards[clampedIdx];
    if (targetCard && typeof targetCard.scrollIntoView === 'function') {
      try {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch {
        targetCard.scrollIntoView();
      }
    }
    return clampedIdx;
  }

  /**
   * 現在フォーカスされているカードに対応する単語データを取得
   * @param {number} focusedIndex
   * @param {Array<HTMLElement>} cards
   * @param {Function} getListFn
   * @param {string} currentLang
   * @param {Function} [makeLkFn]
   * @returns {Object|null}
   */
  function getFocusedCardItem(focusedIndex, cards, getListFn, currentLang, makeLkFn) {
    if (!cards || focusedIndex < 0 || focusedIndex >= cards.length) return null;
    const targetCard = cards[focusedIndex];
    if (!targetCard) return null;
    const cardId = targetCard.dataset?.id;
    const lk = targetCard.dataset?.word;
    const tL = targetCard.dataset?.lang || currentLang;
    const list = typeof getListFn === 'function' ? getListFn(tL) : [];
    if (!Array.isArray(list)) return null;

    if (cardId) {
      const byId = list.find(i => i && i.id === cardId);
      if (byId) return byId;
    }

    const mkLk = makeLkFn || ((w, l, idx) => {
      if (global.VocabMorphology && typeof global.VocabMorphology.makeLookupKey === 'function') {
        return global.VocabMorphology.makeLookupKey(w, l, idx);
      }
      const base = l === 'de' ? String(w || '').trim() : String(w || '').trim().toLowerCase();
      return Number(idx) > 1 ? `${base}#${Number(idx)}` : base;
    });

    return list.find(i => mkLk(i.word, tL, i.homographIndex) === lk) || null;
  }

  /**
   * 単語入力サジェスト UI の初期化とイベントバインド
   * @param {Object} options
   * @returns {Object} controls
   */
  function initWordSuggest(options = {}) {
    const doc = typeof document !== 'undefined' ? document : null;
    const input = options.input || (doc ? doc.getElementById('inWord') : null);
    const box = options.box || (doc ? doc.getElementById('wordSuggestBox') : null);
    if (!input || !box) return null;

    let activeIndex = -1;

    function renderSuggestions(query) {
      const currentList = typeof options.getCurrentList === 'function' ? options.getCurrentList() : [];
      const suggestions = buildSuggestions(query, currentList, options.pieRoots);

      if (!suggestions.length) {
        box.style.display = 'none';
        box.innerHTML = '';
        activeIndex = -1;
        return;
      }

      activeIndex = -1;
      box.innerHTML = renderSuggestHtml(suggestions, options.esc || esc);
      box.style.display = 'flex';
    }

    function updateActiveSuggestion(items) {
      items.forEach((it, idx) => {
        if (it.classList) it.classList.toggle('active', idx === activeIndex);
        if (idx === activeIndex && typeof it.scrollIntoView === 'function') {
          try {
            it.scrollIntoView({ block: 'nearest' });
          } catch {}
        }
      });
    }

    function applySuggestion(el) {
      if (!el) return;
      const type = el.dataset?.type;
      const word = el.dataset?.word;
      box.style.display = 'none';
      input.value = '';
      try { input.blur(); } catch {}
      if (type === 'word') {
        if (typeof options.onJumpWord === 'function') options.onJumpWord(word);
      } else if (type === 'root') {
        if (typeof options.onOpenRootGraph === 'function') options.onOpenRootGraph(word);
      }
    }

    const onInput = e => renderSuggestions(e.target.value);
    input.addEventListener('input', onInput);

    const onKeydown = e => {
      if (box.style.display === 'none') return;
      const items = box.querySelectorAll('.suggest-item');
      if (!items.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIndex = (activeIndex + 1) % items.length;
        updateActiveSuggestion(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIndex = (activeIndex - 1 + items.length) % items.length;
        updateActiveSuggestion(items);
      } else if (e.key === 'Enter') {
        if (activeIndex >= 0) {
          e.preventDefault();
          const selItem = items[activeIndex];
          applySuggestion(selItem);
        } else {
          const firstExact = box.querySelector('.suggest-item.exact-match');
          if (firstExact) {
            e.preventDefault();
            applySuggestion(firstExact);
          }
        }
      } else if (e.key === 'Escape') {
        box.style.display = 'none';
      }
    };
    input.addEventListener('keydown', onKeydown);

    const onBoxClick = e => {
      const item = e.target.closest?.('.suggest-item');
      if (item) applySuggestion(item);
    };
    box.addEventListener('click', onBoxClick);

    const onDocClick = e => {
      if (!e.target.closest?.('#inWordWrap')) {
        box.style.display = 'none';
      }
    };
    if (doc) doc.addEventListener('click', onDocClick);

    return {
      renderSuggestions,
      applySuggestion,
      destroy: () => {
        input.removeEventListener('input', onInput);
        input.removeEventListener('keydown', onKeydown);
        box.removeEventListener('click', onBoxClick);
        if (doc) doc.removeEventListener('click', onDocClick);
      }
    };
  }

  /**
   * グローバルキーボードショートカットのディスパッチャ
   * @param {KeyboardEvent} e
   * @param {Object} ctx
   * @returns {boolean} handled
   */
  function handleGlobalKeydown(e, ctx = {}) {
    if (!e || e.isComposing) return false;
    const doc = typeof document !== 'undefined' ? document : null;
    const activeEl = doc?.activeElement;
    const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl?.tagName) || Boolean(activeEl?.isContentEditable);
    const isAnkiOpen = typeof ctx.isAnkiOpen === 'function' ? ctx.isAnkiOpen() : Boolean(ctx.isAnkiOpen);
    const anyModalOpen = typeof ctx.anyModalOpen === 'function' ? ctx.anyModalOpen() : Boolean(ctx.anyModalOpen);

    if (e.key === 'Escape') {
      if (anyModalOpen) {
        if (typeof ctx.closeAllModals === 'function') ctx.closeAllModals();
        return true;
      }
      if (isAnkiOpen) {
        if (typeof ctx.exitAnki === 'function') ctx.exitAnki();
        return true;
      }
      if (typeof ctx.getFocusedCardIndex === 'function' && ctx.getFocusedCardIndex() >= 0) {
        if (typeof ctx.clearCardFocus === 'function') ctx.clearCardFocus();
        return true;
      }
    }

    if (e.key === 'Tab' && anyModalOpen && doc?.querySelector) {
      const openModal = doc.querySelector('.modal-ov.open .modal') || doc.querySelector('.modal-ov.open');
      if (openModal && typeof openModal.querySelectorAll === 'function') {
        const focusables = Array.from(openModal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
          .filter(el => {
            if (!el || typeof el.focus !== 'function') return false;
            if (typeof el.hasAttribute === 'function' && el.hasAttribute('disabled')) return false;
            if (el.getAttribute?.('aria-hidden') === 'true') return false;
            if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
              try {
                const s = window.getComputedStyle(el);
                if (s.display === 'none' || s.visibility === 'hidden') return false;
              } catch {}
            }
            return true;
          });
        if (focusables.length > 0) {
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          const active = doc.activeElement;
          if (e.shiftKey) {
            if (active === first || (openModal.contains && !openModal.contains(active))) {
              if (typeof e.preventDefault === 'function') e.preventDefault();
              last.focus();
              return true;
            }
          } else {
            if (active === last || (openModal.contains && !openModal.contains(active))) {
              if (typeof e.preventDefault === 'function') e.preventDefault();
              first.focus();
              return true;
            }
          }
        }
      }
    }

    if ((!inInput && e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) || (e.altKey && e.code === 'KeyF')) {
      e.preventDefault();
      if (typeof ctx.focusSearch === 'function') ctx.focusSearch();
      return true;
    } else if (e.altKey && e.code === 'KeyK') {
      e.preventDefault();
      if (typeof ctx.focusInput === 'function') ctx.focusInput();
      return true;
    } else if (e.altKey && e.code === 'KeyL') {
      e.preventDefault();
      if (typeof ctx.openExtractModal === 'function') ctx.openExtractModal();
      return true;
    } else if (e.altKey && e.code === 'KeyM') {
      e.preventDefault();
      if (typeof ctx.toggleMask === 'function') ctx.toggleMask();
      return true;
    } else if (isAnkiOpen && !inInput) {
      if (e.ctrlKey || e.metaKey || e.altKey) return false;
      if (e.code === 'KeyM' || e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        if (typeof ctx.ankiToggleMode === 'function') ctx.ankiToggleMode();
        return true;
      } else if (e.code === 'KeyR' || e.key === 'r' || e.key === 'R' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        if (typeof ctx.ankiSpeak === 'function') ctx.ankiSpeak();
        return true;
      } else if (e.code === 'KeyZ' || e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (typeof ctx.ankiUndo === 'function') ctx.ankiUndo();
        return true;
      } else if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        if (typeof ctx.ankiAdvance === 'function') ctx.ankiAdvance();
        return true;
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        if (typeof ctx.ankiRate === 'function') ctx.ankiRate(parseInt(e.key, 10) - 1);
        return true;
      }
    } else if (!inInput && !anyModalOpen && !isAnkiOpen) {
      // OS標準ショートカット（Cmd+S, Cmd+D, Ctrl+R等）との衝突防止
      if (e.ctrlKey || e.metaKey || e.altKey) return false;

      // 耳学モード実行中の専用キー操作（Space: 一時停止/再開, J: 前へ, L: 次へ）
      const playlistState = global.VocabSpeech?.getPlaylistState ? global.VocabSpeech.getPlaylistState() : null;
      if (playlistState && playlistState.isRunning) {
        if (e.code === 'Space') {
          e.preventDefault();
          if (typeof ctx.togglePlaylist === 'function') ctx.togglePlaylist();
          return true;
        } else if (e.key === 'j' || e.key === 'J') {
          e.preventDefault();
          if (global.VocabSpeech?.prevPlaylistItem) global.VocabSpeech.prevPlaylistItem();
          return true;
        } else if (e.key === 'l' || e.key === 'L') {
          e.preventDefault();
          if (global.VocabSpeech?.nextPlaylistItem) global.VocabSpeech.nextPlaylistItem();
          return true;
        }
      }

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (typeof ctx.moveCardFocus === 'function') ctx.moveCardFocus(1);
        return true;
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (typeof ctx.moveCardFocus === 'function') ctx.moveCardFocus(-1);
        return true;
      } else if (e.key === 'l' || e.key === 'L' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        if (typeof ctx.togglePlaylist === 'function') ctx.togglePlaylist();
        return true;
      } else if (e.key === 's') {
        e.preventDefault();
        if (typeof ctx.speakFocusedCard === 'function') ctx.speakFocusedCard();
        return true;
      } else if (e.key === 'e') {
        e.preventDefault();
        if (typeof ctx.editFocusedCard === 'function') ctx.editFocusedCard();
        return true;
      } else if (e.key === 'd') {
        e.preventDefault();
        if (typeof ctx.deleteFocusedCard === 'function') ctx.deleteFocusedCard();
        return true;
      } else if (e.key === 'n') {
        e.preventDefault();
        if (typeof ctx.focusInput === 'function') ctx.focusInput();
        return true;
      } else if (e.key === 'r') {
        e.preventDefault();
        if (typeof ctx.startAnki === 'function') ctx.startAnki();
        return true;
      } else if (e.key === 'a') {
        e.preventDefault();
        if (typeof ctx.openAnalyticsModal === 'function') ctx.openAnalyticsModal();
        return true;
      } else if (e.key === 'g') {
        e.preventDefault();
        if (typeof ctx.openGraph === 'function') ctx.openGraph();
        return true;
      } else if (e.key === '?') {
        e.preventDefault();
        if (typeof ctx.openShortcutsModal === 'function') ctx.openShortcutsModal();
        return true;
      }
    }
    return false;
  }

  // --- グローバルエクスポート ---
  global.VocabNavigation = {
    DEFAULT_PIE_ROOTS,
    buildSuggestions,
    renderSuggestHtml,
    clampAndFocusCard,
    getFocusedCardItem,
    initWordSuggest,
    handleGlobalKeydown
  };
})(typeof window !== 'undefined' ? window : globalThis);
