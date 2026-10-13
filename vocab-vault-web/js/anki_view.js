/**
 * VocabVault - Anki Review View & SRS State Machine Module
 *
 * 【設計思想・単一責任】
 * Anki復習セッションのライフサイクル（開始・表面・裏面・レーティング・Undo・終了）、
 * 相対期日超過率（Overdue Ratio）による最適出題優先順位ソート、
 * 1日復習上限キャップおよび期日超過スヌーズ再配分の統括。
 */

(function (global) {
  'use strict';

  function $(id) {
    if (global.VocabCore && typeof global.VocabCore.$ === 'function') {
      return global.VocabCore.$(id);
    }
    return typeof document !== 'undefined' ? document.getElementById(id) : null;
  }

  function esc(s) {
    if (global.VocabCore && typeof global.VocabCore.esc === 'function') {
      return global.VocabCore.esc(s);
    }
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function fmtPho(p) {
    if (global.VocabCore && typeof global.VocabCore.fmtPho === 'function') {
      return global.VocabCore.fmtPho(p);
    }
    return p ? `[ ${p} ]` : '';
  }

  /**
   * [FSRS / 認知工学準拠] 相対期日超過率（Relative Overdue Ratio）
   * 予定インターバルに対する超過度を算出し忘却危機度順に優先ソート
   */
  function getOverdueRatio(item, now = Date.now()) {
    if (!item || typeof item !== 'object') return 0;
    const nowTs = Number.isFinite(Number(now)) ? Number(now) : Date.now();
    const rawNext = Number(item.nextReview);
    const next = Number.isFinite(rawNext) ? rawNext : nowTs;
    if (next > nowTs) return 0;
    const overdueMs = Math.max(0, nowTs - next);
    const rawInterval = Number(item.interval);
    const intervalDays = (Number.isFinite(rawInterval) && rawInterval > 0) ? rawInterval : 1.0;
    const intervalMs = Math.max(86400000, intervalDays * 86400000);
    const ratio = overdueMs / intervalMs;
    return Number.isFinite(ratio) ? ratio : 0;
  }

  /**
   * 1日の復習上限数を変更・保存
   */
  function setDailyReviewCap(val, options = {}) {
    const cap = parseInt(val, 10) || 30;
    if (options.appState) options.appState.dailyReviewCap = cap;
    if (options.lsSet) options.lsSet('vv_daily_review_cap', String(cap));
    const showToast = options.showToast || (global.VocabModal ? global.VocabModal.showToast : null);
    if (showToast) {
      showToast(`1日の最大復習数を ${cap >= 99999 ? '無制限' : cap + ' 語'} に設定しました`, 'ok');
    }
  }

  /**
   * 期日超過単語のスヌーズ・均等再配分
   */
  function rescheduleOverdueReviews(options = {}) {
    const now = Date.now();
    const list = typeof options.getList === 'function' ? options.getList() : [];
    const overdue = list.filter(i => (i.nextReview || 0) <= now);
    if (!overdue.length) {
      if (typeof alert === 'function') alert('期日超過の復習単語はありません。');
      return;
    }

    if (typeof confirm === 'function' && !confirm(`期日超過の ${overdue.length} 語を、今後7日間に均等になだらかに再分散（スヌーズ）しますか？\n（毎日の復習負担が分散され、無理なく再開できます）`)) {
      return;
    }

    overdue.forEach((item, idx) => {
      const dayOffset = (idx % 7) + 1;
      const jitterMs = Math.floor(Math.random() * 3600000 * 3);
      item.nextReview = now + dayOffset * 86400000 + jitterMs;
      item.updatedAt = now;
      item.reviewUpdatedAt = now;
    });

    if (typeof options.saveList === 'function') options.saveList(list);
    if (typeof options.onReload === 'function') options.onReload();

    const showToast = options.showToast || (global.VocabModal ? global.VocabModal.showToast : null);
    if (showToast) {
      showToast(`${overdue.length} 語の復習スケジュールを今後7日間に均等再配分しました。`, 'ok');
    }
  }

  /**
   * Anki復習セッションを開始
   */
  function startAnki(customCandidates = null, ctx = {}) {
    const now = Date.now();
    let reviewCandidates = [];
    const isCustom = Array.isArray(customCandidates) && customCandidates.length > 0;
    let allDueCount = 0;

    if (isCustom) {
      reviewCandidates = [...customCandidates];
    } else {
      const allFiltered = typeof ctx.getFiltered === 'function' ? ctx.getFiltered() : [];
      const allDue = allFiltered
        .filter(i => (i.nextReview || 0) <= now)
        .sort((a, b) => {
          const ratioA = getOverdueRatio(a, now);
          const ratioB = getOverdueRatio(b, now);
          if (Math.abs(ratioB - ratioA) > 0.01) return ratioB - ratioA;
          return (a.nextReview || 0) - (b.nextReview || 0);
        });
      allDueCount = allDue.length;
      reviewCandidates = allDue;

      if (!reviewCandidates.length) {
        if (!allFiltered.length) {
          ctx.showToast?.('復習対象の単語が登録されていません。', 'info', 3000);
          return;
        }
        if (typeof confirm === 'function' && !confirm('現在、復習期日を迎えた単語はありません（すべて定着中）。\n登録済みの単語で事前復習・総復習セッションを開始しますか？')) {
          return;
        }
        reviewCandidates = allFiltered;
      }
    }

    const appState = ctx.appState || (global.VocabCore?.App);
    const cap = isCustom ? reviewCandidates.length : (appState?.dailyReviewCap || 30);
    if (appState) {
      appState.aList = reviewCandidates.slice(0, cap);
      appState.ankiTotalCount = appState.aList.length;
      appState.ankiHistory = [];
    }

    const listView = $('listView'), ctrlForm = $('ctrlForm'), anki = $('anki');
    if (listView) listView.style.display = 'none';
    if (ctrlForm) ctrlForm.style.display = 'none';
    if (anki) anki.style.display = 'block';

    const ribListBtn = $('ribListBtn'), ribAnkiBtn = $('ribAnkiBtn');
    if (ribListBtn) ribListBtn.classList.remove('active');
    if (ribAnkiBtn) ribAnkiBtn.classList.add('active');

    if (global.VocabSRS?.updateOfflineBadgeUI) global.VocabSRS.updateOfflineBadgeUI();
    renderAnki(ctx);

    if (!isCustom && allDueCount > cap) {
      ctx.showToast?.(`期日到来単語が ${allDueCount} 語あります。学習継続のため本日は上限 ${cap} 語に設定されています。`, 'info', 4500);
    }
  }

  let swipeAttached = false;

  /**
   * 現在のAnkiカードを描画
   */
  function renderAnki(ctx = {}) {
    const appState = ctx.appState || (global.VocabCore?.App);
    const aList = appState?.aList || [];
    const ankiHistory = appState?.ankiHistory || [];
    const i = aList[0];
    if (!i) return exitAnki(ctx);

    const btnUndo = $('btnUndoAnki');
    if (btnUndo) btnUndo.style.display = ankiHistory.length ? 'inline-flex' : 'none';

    const total = appState?.ankiTotalCount || (aList.length + ankiHistory.length);
    const done = Math.max(0, total - aList.length);
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;

    const fillEl = $('aProgFill');
    if (fillEl) fillEl.style.width = `${pct}%`;
    const progEl = $('aProg');
    if (progEl) progEl.textContent = `進捗: ${done}/${total}語 (${pct}%)`;

    const aWord = $('aWord');
    if (aWord) aWord.textContent = i.word + (i.homographIndex > 1 ? ` #${i.homographIndex}` : '');

    const aPho = $('aPho');
    if (aPho) aPho.textContent = [fmtPho(i.phonetic), i.grammar_forms].filter(Boolean).join('  ');

    const aDiv = $('aDiv'), aBack = $('aBack'), aRat = $('aRat'), btnAns = $('btnAns');
    if (aDiv) aDiv.style.display = 'none';
    if (aBack) aBack.style.display = 'none';
    if (aRat) aRat.style.display = 'none';
    if (btnAns) btnAns.style.display = 'block';

    if (aBack) {
      if (global.VocabCardView?.buildRight) {
        aBack.innerHTML = global.VocabCardView.buildRight(i, {
          rootIndexMap: appState?.rootIndexMap,
          queryReg: appState?.qReg,
          viewMode: appState?.viewMode,
          lang: i.lang || appState?.lang
        });
      }
    }

    if (typeof ctx.enhanceA11y === 'function') ctx.enhanceA11y($('anki'));

    // スワイプジェスチャーを接続
    const cardEl = $('aCard');
    if (cardEl && !swipeAttached && global.VocabSRS?.attachSwipeGesture) {
      global.VocabSRS.attachSwipeGesture(cardEl, rating => procRev(rating, ctx));
      swipeAttached = true;
    }

    const lsGet = ctx.lsGet || (global.VocabCore?.lsGet);
    if (lsGet && lsGet('vv_tts_auto_anki', '1') !== '0') {
      const spkFn = ctx.speakText || (global.VocabSpeech?.speakText);
      if (spkFn) spkFn(i.word, i.lang || appState?.lang);
    }
  }

  /**
   * 解答（裏面）を表示
   */
  function showAns(ctx = {}) {
    const aDiv = $('aDiv'), aBack = $('aBack'), btnAns = $('btnAns'), aRat = $('aRat');
    if (aDiv) aDiv.style.display = 'block';
    if (aBack) aBack.style.display = 'block';
    if (btnAns) btnAns.style.display = 'none';

    if (global.VocabSRS?.triggerHaptic) global.VocabSRS.triggerHaptic('light');

    const appState = ctx.appState || (global.VocabCore?.App);
    const e = appState?.aList?.[0];
    if (!e || !aRat) return;

    aRat.style.display = 'flex';
    const predictions = global.VocabSRS?.predictIntervals ? global.VocabSRS.predictIntervals(e) : null;
    aRat.innerHTML = [['#ef4444', '1: もう一度'], ['#f97316', '2: 難しい'], ['#10b981', '3: 普通'], ['#3b82f6', '4: 簡単']].map((c, idx) => {
      const label = predictions ? predictions[idx] : (global.VocabSRS?.predDays ? (global.VocabSRS.predDays(e, idx) === 0 ? '1分後' : Math.round(global.VocabSRS.predDays(e, idx)) + '日後') : '1日後');
      return `<button type="button" class="b-rat" style="background:${c[0]}" data-act="rate" data-rate="${idx}"><span>${c[1]}</span><small>${label}</small></button>`;
    }).join('');
  }

  /**
   * レーティング判定を実行し次カードへ進む
   */
  function procRev(r, ctx = {}) {
    const appState = ctx.appState || (global.VocabCore?.App);
    if (!appState || !appState.aList) return;
    const cur = appState.aList.shift();
    if (!cur) return;

    const tL = cur.lang || appState.srcLang || appState.lang || 'en';
    const curPairKey = ctx.getActivePairKey ? ctx.getActivePairKey() : (global.VocabCore?.getActivePairConfig?.()?.key);

    let targetKey = curPairKey;
    let list = typeof ctx.getList === 'function' ? ctx.getList(targetKey) : [...(appState.entries || [])];
    let e = list.find(x => (cur.id && x.id === cur.id) || (cur.word && x.word === cur.word) || x.num === cur.num);

    if (!e && typeof ctx.findAcrossAllPairs === 'function') {
      const found = ctx.findAcrossAllPairs(cur);
      if (found) {
        e = found.entry;
        targetKey = found.pairKey;
        list = found.list;
      }
    }
    if (!e) return;

    if (global.VocabSRS?.triggerHaptic) {
      global.VocabSRS.triggerHaptic(r === 0 ? 'again' : r === 1 ? 'light' : r === 2 ? 'good' : 'easy');
    }

    if (appState.ankiHistory) {
      appState.ankiHistory.push({
        lang: tL,
        id: e.id,
        targetKey,
        prevProps: { interval: e.interval, repetition: e.repetition, efactor: e.efactor, nextReview: e.nextReview },
        requeued: r === 0
      });
      if (appState.ankiHistory.length > 20) appState.ankiHistory.shift();
    }

    const now = Date.now();
    if (global.VocabSRS) {
      const nextSRS = global.VocabSRS.calculateNextReview(e, r);
      Object.assign(e, nextSRS, { reviewUpdatedAt: now });
      if (r === 0) appState.aList.push(e);

      if (typeof navigator !== 'undefined' && !navigator.onLine && global.VocabSRS.queueOfflineReview) {
        global.VocabSRS.queueOfflineReview({ id: e.id, lang: tL, rating: r });
      }
    } else {
      let iv = Number(e.interval) || 0, rep = Number(e.repetition) || 0, ef = Number(e.efactor) || 2.5;
      if (r === 0) {
        rep = 0; iv = 0;
        e.nextReview = now + 60000;
        appState.aList.push(e);
      } else {
        iv = r === 1 ? Math.max(1, iv * 1.2) : (r === 2 ? (!rep ? 1 : iv * 2.5) : (!rep ? 4 : iv * ef));
        ef = Math.max(1.3, ef + (r === 1 ? -0.15 : r === 3 ? 0.15 : 0));
        if (r >= 2) rep++;
        e.nextReview = now + Math.round(iv * 86400000);
      }
      e.interval = Number(iv.toFixed(2));
      e.repetition = rep;
      e.efactor = Number(ef.toFixed(2));
      e.reviewUpdatedAt = now;
      e.updatedAt = now;
    }

    if (typeof ctx.saveList === 'function') ctx.saveList(targetKey, list);
    if (targetKey === curPairKey) {
      appState.entries = list;
    }

    if (appState.aList.length) {
      renderAnki(ctx);
    } else {
      ctx.showToast?.('本日の復習セッションが完了しました。記憶の定着が更新されました。', 'ok', 3500);
      exitAnki(ctx);
    }
  }

  /**
   * 直前のレーティングを取り消し (Undo)
   */
  function undoAnkiRev(ctx = {}) {
    const appState = ctx.appState || (global.VocabCore?.App);
    if (!appState || !appState.ankiHistory) return;
    const last = appState.ankiHistory.pop();
    if (!last) return;

    const curPairKey = ctx.getActivePairKey ? ctx.getActivePairKey() : (global.VocabCore?.getActivePairConfig?.()?.key);
    const targetKey = last.targetKey || curPairKey;
    const list = typeof ctx.getList === 'function' ? ctx.getList(targetKey) : [...(appState.entries || [])];
    const e = list.find(x => x.id === last.id);
    if (!e) return;

    Object.assign(e, last.prevProps, { updatedAt: Date.now(), reviewUpdatedAt: Date.now() });
    if (last.requeued && appState.aList) {
      const pIdx = appState.aList.findIndex(x => x.id === e.id);
      if (pIdx !== -1) appState.aList.splice(pIdx, 1);
    }
    if (appState.aList) appState.aList.unshift(e);

    if (typeof ctx.saveList === 'function') ctx.saveList(targetKey, list);
    if (targetKey === curPairKey) {
      appState.entries = list;
    }
    renderAnki(ctx);
  }

  /**
   * Anki復習セッションを終了し一覧へ復帰
   */
  function exitAnki(ctx = {}) {
    const anki = $('anki'), listView = $('listView'), ctrlForm = $('ctrlForm');
    if (anki) anki.style.display = 'none';
    if (listView) listView.style.display = 'block';
    if (ctrlForm) ctrlForm.style.display = 'flex';

    const ribAnkiBtn = $('ribAnkiBtn'), ribListBtn = $('ribListBtn');
    if (ribAnkiBtn) ribAnkiBtn.classList.remove('active');
    if (ribListBtn) ribListBtn.classList.add('active');

    if (typeof ctx.onReload === 'function') ctx.onReload();
    else if (global.VocabCore?.load) global.VocabCore.load();
  }

  // --- グローバルエクスポート ---
  global.VocabAnkiView = {
    getOverdueRatio,
    setDailyReviewCap,
    rescheduleOverdueReviews,
    startAnki,
    renderAnki,
    showAns,
    procRev,
    undoAnkiRev,
    exitAnki
  };
})(typeof window !== 'undefined' ? window : globalThis);
