/**
 * VocabVault - List View & Keyed DOM Reconciliation Engine
 *
 * 【設計思想・単一責任】
 * 単語カード一覧の描画・ページング・フィルタリング・ソート、
 * innerHTML全破棄を根絶する【Keyed DOM Reconciliation（差分更新）】エンジンによる
 * ゼロ・フリッカー（チラつき防止）＆スクロール位置／フォーカス完全維持の実現。
 */

(function (global) {
  'use strict';

  function $(id) {
    if (global.VocabCore && typeof global.VocabCore.$ === 'function') {
      return global.VocabCore.$(id);
    }
    return typeof document !== 'undefined' ? document.getElementById(id) : null;
  }

  function $$(sel) {
    if (global.VocabCore && typeof global.VocabCore.$$ === 'function') {
      return global.VocabCore.$$(sel);
    }
    return typeof document !== 'undefined' ? [...document.querySelectorAll(sel)] : [];
  }

  function esc(s) {
    if (global.VocabCore && typeof global.VocabCore.esc === 'function') {
      return global.VocabCore.esc(s);
    }
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * 【改善三：Keyed DOM Reconciliation（差分DOM更新）】
   * innerHTML = '' による全要素破棄を完全撤廃し、キー（ID/WordKey）に基づく
   * 最小限の要素移動・追加・削除・部分属性パッチを実施。
   * 
   * @param {HTMLElement} listContainer - #list コンテナ
   * @param {Array} pageItems - 現在ページで表示すべき単語配列
   * @param {Object} options - 生成オプション
   */
  function reconcileList(listContainer, pageItems = [], options = {}) {
    if (!listContainer) return;

    // 1. 待機中タスクカード・失敗カード（.loading-card, .gen-err, [data-act="retry-batch"]）を特定・維持
    const loadingCards = [];
    const seenCards = new Set();
    if (typeof listContainer.querySelectorAll === 'function') {
      const qCards = [...listContainer.querySelectorAll('.loading-card, .gen-err, [data-act="retry-batch"]')];
      qCards.forEach(c => {
        if (c && !seenCards.has(c)) { seenCards.add(c); loadingCards.push(c); }
      });
    }
    const reqQueue = options.reqQueue || (options.appState?.reqQueue) || (global.VocabCore?.App?.reqQueue) || [];
    reqQueue.forEach(t => {
      if (t.card && !t.isCancelled && !t.isDone && !seenCards.has(t.card)) {
        seenCards.add(t.card);
        loadingCards.push(t.card);
      }
    });

    // 2. 既存の通常カード要素をマップ化 (キー: data-id または data-word)
    const existingCardMap = new Map();
    const existingCards = typeof listContainer.querySelectorAll === 'function'
      ? [...listContainer.querySelectorAll('.card')].filter(c => !seenCards.has(c) && !c.classList?.contains('loading-card') && !c.classList?.contains('gen-err') && !c.querySelector?.('[data-act="retry-batch"]'))
      : [];
    existingCards.forEach(c => {
      const key = (c.dataset && (c.dataset.id || c.dataset.word)) || null;
      if (key) existingCardMap.set(key, c);
    });

    const createCardFn = options.createCardElement || (global.VocabCardView ? global.VocabCardView.createCardElement : null);
    const finalNodes = [...loadingCards];
    const activeKeys = new Set();

    // 3. 現在ページの各アイテムを差分走査
    pageItems.forEach(item => {
      const itemKey = item.id || (global.VocabMorphology ? global.VocabMorphology.makeWordKey(item.word, item.lang, item.meanings?.[0]?.pos, item.homographIndex) : item.word);
      activeKeys.add(itemKey);

      // キャッシュリビジョンシグネチャ（編集時刻、復習期日、表示モード、検索ハイライトクエリ、フォルダ等）
      const qStr = options.queryReg ? String(options.queryReg.source || '') : '';
      const vMode = options.viewMode || (options.appState?.viewMode) || 'academic';
      const rev = `${item.updatedAt || 0}:${item.interval || 0}:${item.nextReview || 0}:${vMode}:${qStr}:${item.folder || ''}:${options.crossLang ? '1' : '0'}`;

      let cardEl = existingCardMap.get(itemKey);
      if (cardEl && cardEl.dataset?.rev === rev) {
        // [完全一致で再利用] 期日バッジ等の動的属性のみ軽量パッチ
        const dueEl = typeof cardEl.querySelector === 'function' ? cardEl.querySelector('.due') : null;
        if (dueEl && global.VocabCardView) {
          const isDue = (item.nextReview || 0) <= Date.now();
          dueEl.className = `due ${isDue ? 'is-due' : 'is-fut'}`;
          dueEl.textContent = global.VocabCardView.relTime(item.nextReview);
        }
        finalNodes.push(cardEl);
      } else {
        // [新規作成 または 内容変更時の再生成]
        if (typeof createCardFn === 'function') {
          const newCard = createCardFn(item, options);
          if (newCard) {
            if (newCard.dataset) {
              newCard.dataset.id = item.id || '';
              newCard.dataset.rev = rev;
            }
            if (cardEl && typeof cardEl.replaceWith === 'function') {
              cardEl.replaceWith(newCard);
            }
            finalNodes.push(newCard);
          }
        } else if (cardEl) {
          finalNodes.push(cardEl);
        }
      }
    });

    // 4. 今回のページから外れた不要カードのみを安全に除去 (GC負荷最小化)
    existingCards.forEach(c => {
      if (seenCards.has(c)) return;
      const key = (c.dataset && (c.dataset.id || c.dataset.word)) || null;
      if (key && !activeKeys.has(key)) {
        if (typeof c.remove === 'function') c.remove();
      }
    });

    // 5. In-place DOM alignment: innerHTML = '' を撤廃し、最小限の insertBefore で位置調整
    // フォーカス（document.activeElement）、テキスト選択、スクロール位置を完全保持
    if (typeof listContainer.insertBefore === 'function' && listContainer.children !== undefined) {
      finalNodes.forEach((node, idx) => {
        if (!node) return;
        const currentAtIdx = (listContainer.children && idx < listContainer.children.length) ? listContainer.children[idx] : null;
        if (currentAtIdx !== node) {
          listContainer.insertBefore(node, currentAtIdx || null);
        }
      });
      if (listContainer.children && listContainer.children.length > finalNodes.length) {
        const finalSet = new Set(finalNodes);
        const toRemove = [];
        for (let i = 0; i < listContainer.children.length; i++) {
          const ch = listContainer.children[i];
          if (!finalSet.has(ch)) toRemove.push(ch);
        }
        toRemove.forEach(ch => ch.remove?.());
      }
    } else {
      // モックDOM環境のフォールバック
      listContainer.innerHTML = '';
      finalNodes.forEach(node => {
        if (node && typeof listContainer.appendChild === 'function') listContainer.appendChild(node);
      });
    }

    // 6. アクセシビリティ属性の補強
    if (typeof options.enhanceA11y === 'function') {
      options.enhanceA11y(listContainer);
    }
  }

  /**
   * 単語カード一覧の描画オーケストレーション
   */
  function render(ctx = {}) {
    const appState = ctx.appState || (global.VocabCore?.App);
    if (!appState) return;

    appState.focusedCardIndex = -1;
    const list = $('list'), pag = $('pag');
    if (!list || !pag) return;

    // 待機中リクエストカードを先行チェック
    const reqQueue = appState.reqQueue || [];
    let hasLoadingCards = false;
    reqQueue.forEach(t => {
      if (!t.isCancelled && !t.isDone) {
        hasLoadingCards = true;
        const hasLoadingCls = t.card && (typeof t.card.classList?.contains === 'function' ? t.card.classList.contains('loading-card') : String(t.card.className || '').includes('loading-card'));
        if (!hasLoadingCls) {
          const c = document.createElement('div');
          c.className = 'card loading-card';
          c.innerHTML = `<div class="card-acts" style="opacity:1"><button type="button" class="act-icon-btn del-btn" data-act="close-load" aria-label="キャンセル">×</button></div><div class="col-left"><span class="hw">${esc((t.items || []).map(x => x.word).join(', '))}</span></div><div class="right"><div class="load"><div class="spin"></div><span class="st-text">待機中 (${(t.items || []).length}語)...</span></div></div>`;
          t.card = c;
        }
        const alreadyInList = typeof list.contains === 'function' ? list.contains(t.card) : (Array.isArray(list.children) ? list.children.includes(t.card) : false);
        if (!alreadyInList && typeof list.appendChild === 'function') list.appendChild(t.card);
      }
    });

    const f = typeof ctx.getFiltered === 'function' ? ctx.getFiltered() : [];
    const posGroups = ctx.posGroups || [];
    const statGroups = ctx.statGroups || [];
    const posObj = posGroups.find(g => g.id === appState.posF);
    const statObj = statGroups.find(g => g.id === appState.statF);

    const parts = [
      (appState.posF && appState.posF !== 'all') ? (posObj ? posObj.label || posObj.name : appState.posF) : null,
      (appState.cat && appState.cat !== 'all') ? appState.cat : ((appState.catF && appState.catF !== 'all') ? appState.catF : null),
      (appState.fol && appState.fol !== 'all') ? `フォルダ: ${appState.fol}` : ((appState.folF && appState.folF !== 'all') ? `フォルダ: ${appState.folF}` : null),
      (appState.statF && appState.statF !== 'all') ? (statObj ? statObj.label || statObj.name : appState.statF) : null
    ].filter(Boolean);

    const headingText = parts.length ? parts.join(' › ') : 'すべての単語';
    const docHeading = $('docHeading');
    if (docHeading) docHeading.textContent = headingText;

    const docSubCount = $('docSubCount');
    if (docSubCount) docSubCount.textContent = `${f.length} 件`;

    const sortSel = $('sortSel');
    if (sortSel) sortSel.value = appState.sortBy || appState.sort || 'new';

    const btnModeAcademic = $('btnModeAcademic');
    if (btnModeAcademic) btnModeAcademic.classList.toggle('active', (appState.viewMode || 'academic') === 'academic');

    const btnModeSimple = $('btnModeSimple');
    if (btnModeSimple) btnModeSimple.classList.toggle('active', appState.viewMode === 'simple');

    // 後方互換性フォールバック（#docHeading がなく #docTitle が存在する場合）
    const titleEl = $('docTitle');
    if (titleEl && !docHeading) {
      titleEl.innerHTML = `<span>${esc(headingText)}</span><small style="margin-left:8px;font-size:12px;color:var(--s)">${f.length} 件</small>`;
    }

    if ($('sideCount')) $('sideCount').textContent = `${f.length} 件`;
    if ($('resetFiltBtn')) $('resetFiltBtn').style.display = parts.length ? 'inline' : 'none';

    // 空状態のハンドリング
    if (!f.length && !hasLoadingCards) {
      list.innerHTML = `<div class="empty"><span>単語がありません</span><p>${appState.q || parts.length ? '条件に一致する単語が見つかりませんでした。<br><button type="button" class="btn-o" style="margin-top:10px;font-size:12px" data-act="reset-filter">フィルタを解除する</button>' : '上のバーから単語・熟語・例文を入力して登録してください。'}</p></div>`;
      pag.innerHTML = '';
      return;
    }

    // ページネーション計算
    const per = (ctx.perPage && Number.isFinite(ctx.perPage)) ? ctx.perPage : ((appState.per && Number.isFinite(appState.per)) ? appState.per : 30);
    const tot = Math.max(1, Math.ceil(f.length / per));
    appState.page = Math.max(1, Math.min(appState.page, tot));
    const pageItems = f.slice((appState.page - 1) * per, appState.page * per);

    // 【改善三：Keyed DOM Reconciliation による差分更新実行】
    reconcileList(list, pageItems, {
      reqQueue: reqQueue,
      appState: appState,
      queryReg: appState.qReg,
      lang: appState.lang,
      crossLang: appState.crossLang,
      rootIndexMap: appState.rootIndexMap,
      viewMode: appState.viewMode,
      createCardElement: ctx.createCardElement,
      enhanceA11y: ctx.enhanceA11y
    });

    pag.innerHTML = tot <= 1 ? '' : `<button type="button" class="btn-o" data-act="page" data-dir="-1" ${appState.page === 1 ? 'disabled' : ''}>前へ</button><span>${appState.page} / ${tot}</span><button type="button" class="btn-o" data-act="page" data-dir="1" ${appState.page === tot ? 'disabled' : ''}>次へ</button>`;
  }

  /**
   * 指定ページを読み込んで描画
   */
  function load(p = 1, ctx = {}) {
    const appState = ctx.appState || (global.VocabCore?.App);
    if (!appState) return;

    if (p) appState.page = p;
    const curPairKey = ctx.getActivePairKey ? ctx.getActivePairKey() : (global.VocabCore?.getActivePairConfig?.()?.key);
    if (typeof ctx.getJson === 'function' && curPairKey) {
      appState.entries = ctx.getJson(curPairKey);
    }
    if (typeof ctx.buildEtyIndex === 'function') ctx.buildEtyIndex();
    if (typeof ctx.renderSidebarTree === 'function') ctx.renderSidebarTree();
    render(ctx);
    if (typeof ctx.updStats === 'function') ctx.updStats();
  }

  /**
   * フィルタが1つでもアクティブか判定
   */
  function hasActiveFilters(appState) {
    if (!appState) return false;
    return Boolean(
      (appState.q && appState.q.trim()) ||
      (appState.qStr && appState.qStr.trim()) ||
      (appState.cat && appState.cat !== 'all') ||
      (appState.catF && appState.catF !== 'all') ||
      (appState.fol && appState.fol !== 'all') ||
      (appState.folF && appState.folF !== 'all') ||
      (appState.posF && appState.posF !== 'all') ||
      (appState.statF && appState.statF !== 'all') ||
      appState.crossLang
    );
  }

  /**
   * 全フィルタを一括クリア
   */
  function resetFilters(appState, onRender) {
    if (!appState) return;
    if (typeof appState.resetFilters === 'function') {
      appState.resetFilters();
    } else {
      appState.statF = appState.cat = appState.catF = appState.posF = appState.fol = appState.folF = 'all';
      appState.q = '';
      appState.qStr = '';
      appState.qReg = null;
      appState.crossLang = false;
    }
    const qSearch = $('qSearch');
    if (qSearch) qSearch.value = '';
    if (typeof onRender === 'function') onRender();
  }

  /**
   * 単語ジャンプ（該当ページへの直接遷移とスムーズスクロール・発光）
   */
  function jumpToWord(w, tLang, ctx = {}) {
    if ($('anki')?.style.display === 'block' && typeof ctx.exitAnki === 'function') ctx.exitAnki();
    try { document?.activeElement?.blur?.(); } catch {}
    if ($('wordSuggestBox')) $('wordSuggestBox').style.display = 'none';
    if (typeof ctx.closeSidebar === 'function' && typeof window !== 'undefined' && window.innerWidth <= 768) ctx.closeSidebar();
    if (global.VocabModal && typeof global.VocabModal.closeAllModals === 'function') global.VocabModal.closeAllModals();

    const parseSpecFn = ctx.parseInputWordSpec || (global.VocabMorphology ? global.VocabMorphology.parseInputWordSpec : null);
    const spec = parseSpecFn ? parseSpecFn(w) : { cleanWord: String(w || '').trim(), homographIndex: 1 };
    const targetWord = (spec.cleanWord || '').trim();
    const homoIdx = spec.homographIndex || 1;
    if (!targetWord) return;

    const appState = ctx.appState || (global.VocabCore?.App);
    if (!appState) return;

    const sLang = tLang || appState.lang;
    let targetEntries = Array.isArray(appState.entries) ? appState.entries : [];
    let switchLang = false;

    if (sLang !== appState.lang && !appState.crossLang) {
      appState.lang = sLang;
      appState.srcLang = sLang;
      if (typeof ctx.lsSet === 'function') {
        ctx.lsSet('vv_active_lang', appState.lang);
        ctx.lsSet('vv_src_lang', appState.srcLang);
      }
      if (typeof ctx.getActivePairKey === 'function' && typeof ctx.getJson === 'function') {
        appState.entries = ctx.getJson(ctx.getActivePairKey());
        targetEntries = appState.entries;
      }
      switchLang = true;
    }

    const mkLk = (word, l, idx) => global.VocabMorphology ? global.VocabMorphology.makeLookupKey(word, l, idx) : `${word}_${l}`;
    const targetLk = mkLk(targetWord, sLang, homoIdx);
    const baseTargetLk = mkLk(targetWord, sLang, 1);
    const cleanTargetWord = targetWord.toLowerCase();

    let targetItem = targetEntries.find(it => mkLk(it.word, it.lang || sLang, it.homographIndex) === targetLk)
      || targetEntries.find(it => mkLk(it.word, it.lang || sLang, 1) === baseTargetLk)
      || targetEntries.find(it => String(it.word || '').trim().toLowerCase() === cleanTargetWord);

    if (!targetItem && !appState.crossLang && typeof ctx.getAllKnownPairs === 'function' && typeof ctx.getJson === 'function') {
      const allPairs = ctx.getAllKnownPairs();
      for (const p of allPairs) {
        if (p.src === sLang) continue;
        const list = ctx.getJson(p.key);
        const match = list.find(it => mkLk(it.word, p.src, it.homographIndex) === mkLk(targetWord, p.src, homoIdx)
          || mkLk(it.word, p.src, 1) === mkLk(targetWord, p.src, 1)
          || String(it.word || '').trim().toLowerCase() === cleanTargetWord);
        if (match) {
          targetItem = match;
          appState.srcLang = p.src;
          appState.tgtLang = p.tgt;
          appState.lang = p.src;
          if (typeof ctx.lsSet === 'function') {
            ctx.lsSet('vv_src_lang', p.src);
            ctx.lsSet('vv_tgt_lang', p.tgt);
            ctx.lsSet('vv_active_lang', p.src);
          }
          appState.entries = list;
          targetEntries = list;
          switchLang = true;
          break;
        }
      }
    }

    if (!targetItem) {
      if (typeof ctx.setSearch === 'function') ctx.setSearch(targetWord, true);
      return;
    }

    if (typeof appState.resetFilters === 'function') {
      appState.resetFilters();
    } else {
      resetFilters(appState);
    }

    const filtered = typeof ctx.getFiltered === 'function' ? ctx.getFiltered() : [];
    const itemIndex = filtered.findIndex(it =>
      it === targetItem ||
      (it.id && targetItem.id && it.id === targetItem.id) ||
      (mkLk(it.word, it.lang || sLang, it.homographIndex) === targetLk) ||
      (String(it.word || '').trim().toLowerCase() === cleanTargetWord)
    );
    const perPage = (ctx.perPage && Number.isFinite(ctx.perPage)) ? ctx.perPage : ((appState.per && Number.isFinite(appState.per)) ? appState.per : 30);
    const targetPage = itemIndex >= 0 ? Math.floor(itemIndex / perPage) + 1 : 1;

    appState.page = targetPage;
    if (typeof ctx.onRender === 'function') ctx.onRender();

    const scrollHelper = global.VocabCardView?.scrollToCard;
    const findHelper = global.VocabCardView?.findCardElement;
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => {
        const cards = [...document.querySelectorAll('#list .card')];
        const el = findHelper ? findHelper(cards, targetWord, targetLk, baseTargetLk) : null;
        if (el && scrollHelper) {
          scrollHelper(el, $('mainScroll'));
        } else {
          $('mainScroll')?.scrollTo?.({ top: 0, behavior: 'smooth' });
        }
      });
    }
  }

  // --- グローバルエクスポート ---
  global.VocabListView = {
    reconcileList,
    render,
    load,
    hasActiveFilters,
    resetFilters,
    jumpToWord
  };
})(typeof window !== 'undefined' ? window : globalThis);
