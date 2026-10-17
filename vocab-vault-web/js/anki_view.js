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

  function todayYmd(date) {
    if (global.VocabStorage && typeof global.VocabStorage.getTodayString === 'function') {
      return global.VocabStorage.getTodayString(date);
    }
    const d = date instanceof Date ? date : new Date();
    const p = n => (n < 10 ? '0' + n : String(n));
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  function dayDiff(fromYmd, toYmd) {
    if (global.VocabStorage && typeof global.VocabStorage.calendarDayDiff === 'function') {
      return global.VocabStorage.calendarDayDiff(fromYmd, toYmd);
    }
    const parse = (s) => {
      const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) return NaN;
      return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    };
    return Math.round((parse(toYmd) - parse(fromYmd)) / 86400000);
  }

  // --- 【項目4解決】ストリーク（連続学習日数） & フリーズ保険 ---
  function getStreakInfo(options = {}) {
    const lsGet = options.lsGet || (global.VocabCore?.lsGet) || (k => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null));
    const streak = parseInt(lsGet('vv_streak_days', '0'), 10) || 0;
    const lastDate = lsGet('vv_last_study_date', '') || '';
    const freezeAvailable = lsGet('vv_streak_freeze_available', '1') !== '0';
    return { streak, lastDate, freezeAvailable };
  }

  function recordReviewStreak(options = {}) {
    const lsGet = options.lsGet || (global.VocabCore?.lsGet) || (k => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null));
    const lsSet = options.lsSet || (global.VocabCore?.lsSet) || ((k, v) => (typeof localStorage !== 'undefined' ? localStorage.setItem(k, v) : null));
    const showToast = options.showToast || (global.VocabModal ? global.VocabModal.showToast : null);

    const todayStr = options.todayStr || todayYmd();
    const lastDate = lsGet('vv_last_study_date', '') || '';
    let streak = parseInt(lsGet('vv_streak_days', '0'), 10) || 0;
    let freezeAvailable = lsGet('vv_streak_freeze_available', '1') !== '0';

    if (lastDate === todayStr) {
      return { streak, isNewDay: false, freezeAvailable };
    }

    if (!lastDate) {
      streak = 1;
    } else {
      const diffDays = dayDiff(lastDate, todayStr);
      if (diffDays === 1) {
        streak += 1;
        if (!freezeAvailable) {
          freezeAvailable = true;
          lsSet('vv_streak_freeze_available', '1');
        }
      } else if (diffDays === 2 && freezeAvailable) {
        freezeAvailable = false;
        lsSet('vv_streak_freeze_available', '0');
        streak += 1;
        showToast?.('ストリークフリーズが自動発動し、連続記録が守られました。', 'ok', 4000);
      } else {
        streak = 1;
      }
    }

    lsSet('vv_streak_days', String(streak));
    lsSet('vv_last_study_date', todayStr);
    return { streak, isNewDay: true, freezeAvailable };
  }

  // --- 【項目2解決】デイリーゴール（1日学習目標） ---
  function getDailyGoalInfo(options = {}) {
    const lsGet = options.lsGet || (global.VocabCore?.lsGet) || (k => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null));
    const goal = parseInt(lsGet('vv_daily_review_goal', '20'), 10) || 20;
    const todayStr = options.todayStr || todayYmd();
    const count = parseInt(lsGet(`vv_reviewed_${todayStr}`, '0'), 10) || 0;
    return { goal, count, reached: count >= goal };
  }

  function incrementDailyGoal(options = {}) {
    const lsGet = options.lsGet || (global.VocabCore?.lsGet) || (k => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null));
    const lsSet = options.lsSet || (global.VocabCore?.lsSet) || ((k, v) => (typeof localStorage !== 'undefined' ? localStorage.setItem(k, v) : null));
    const showToast = options.showToast || (global.VocabModal ? global.VocabModal.showToast : null);

    const goal = parseInt(lsGet('vv_daily_review_goal', '20'), 10) || 20;
    const todayStr = options.todayStr || todayYmd();
    const count = (parseInt(lsGet(`vv_reviewed_${todayStr}`, '0'), 10) || 0) + 1;
    lsSet(`vv_reviewed_${todayStr}`, String(count));

    if (count === goal) {
      showToast?.(`本日の復習目標（${goal}語）を達成しました。素晴らしい継続です。`, 'ok', 5000);
    }
    return { goal, count, reached: count >= goal };
  }

  /**
   * 【項目1解決】認知的過負荷を排した高速暗記裏面ビルダー（2秒要約化）
   * コアイメージと代表訳を即座に視認させ、深層語源・概念史はアコーディオンで折りたたむ
   */
  function buildAnkiBack(item, options = {}) {
    if (!item) return '';

    // 1. コアイメージ（一言）
    const coreHtml = item.core ? `
      <div class="anki-core-box">
        <span class="anki-core-badge">コアイメージ</span>
        <div class="anki-core-text">${esc(item.core)}</div>
      </div>
    ` : '';

    // 2. 代表語義（主要1〜2個を大きく表示）
    const meanings = Array.isArray(item.meanings) ? item.meanings : [];
    const primaryMeanings = meanings.slice(0, 2);
    const meaningsHtml = primaryMeanings.length ? `
      <div class="anki-meanings-box">
        ${primaryMeanings.map(m => `
          <div class="anki-meaning-row">
            ${m.pos ? `<span class="pos-badge">${esc(m.pos)}</span>` : ''}
            <span class="meaning-txt">${esc(m.text)}</span>
          </div>
        `).join('')}
      </div>
    ` : '';

    // 3. 例文（簡潔な1文）
    const ex = item.example;
    const exForeign = ex ? (ex.foreign || ex.en || ex.f || '') : '';
    const exJa = ex ? (ex.ja || ex.trans || ex.j || '') : '';
    const cleanEx = exForeign ? exForeign.replace(/<[^>]+>/g, '').trim() : '';
    const spkExBtn = cleanEx && global.VocabSpeech?.mkSpkBtn ? global.VocabSpeech.mkSpkBtn(cleanEx, item.lang || options.lang || 'en', true) : '';
    const exampleHtml = (cleanEx || exJa) ? `
      <div class="anki-example-box">
        ${cleanEx ? `<div class="anki-ex-foreign"><span>${esc(cleanEx)}</span>${spkExBtn}</div>` : ''}
        ${exJa ? `<div class="anki-ex-ja">${esc(exJa.replace(/<[^>]+>/g, ''))}</div>` : ''}
      </div>
    ` : '';

    // 4. 深層語源・概念史・派生語（折りたたみアコーディオン）
    const matrix = global.VocabMorphology?.buildCognateMatrix ? global.VocabMorphology.buildCognateMatrix(item, options.rootIndexMap || global.App?.rootIndexMap) : null;
    const matrixHtml = matrix ? (global.VocabMorphology?.renderCognateMatrixHtml ? global.VocabMorphology.renderCognateMatrixHtml(matrix) : '') : '';
    const hasEty = Boolean(item.etymology || item.history_note || (item.derivatives && item.derivatives.length) || matrixHtml);
    let etyHtml = '';
    if (hasEty) {
      const etyText = item.etymology ? `<p class="anki-ety-text"><strong>語源:</strong> ${esc(item.etymology)}</p>` : '';
      const histText = item.history_note ? `<p class="anki-hist-text"><strong>概念史・背景:</strong> ${esc(item.history_note)}</p>` : '';
      const tagsText = (Array.isArray(item.etymologyTags) && item.etymologyTags.length) ? `
        <div class="anki-ety-tags" style="margin:6px 0;">
          ${item.etymologyTags.map(t => `<span class="ety-tag">${esc(t)}</span>`).join(' ')}
        </div>
      ` : '';
      const derivsText = (Array.isArray(item.derivatives) && item.derivatives.length) ? `
        <div class="anki-derivs" style="margin-top:6px;font-size:12px;color:var(--s);">
          <strong>派生語:</strong> ${item.derivatives.slice(0, 4).map(d => `${esc(d.word)} (${esc(d.meaning || '')})`).join(', ')}
        </div>
      ` : '';

      etyHtml = `
        <details class="anki-ety-details" style="margin-top:12px;border:1px solid var(--border);border-radius:6px;padding:6px 10px;background:var(--bg-sub, rgba(0,0,0,0.02));">
          <summary class="anki-ety-summary" style="cursor:pointer;font-weight:600;font-size:12px;color:var(--s);user-select:none;">深層語源・概念史・4言語同根語を展開</summary>
          <div class="anki-ety-body" style="margin-top:8px;font-size:13px;line-height:1.5;">
            ${tagsText}
            ${etyText}
            ${matrixHtml}
            ${histText}
            ${derivsText}
          </div>
        </details>
      `;
    }

    return `
      <div class="anki-back-clean">
        ${coreHtml}
        ${meaningsHtml}
        ${exampleHtml}
        ${etyHtml}
      </div>
    `;
  }

  /**
   * 期日超過単語のスヌーズ・均等再配分（js/events.js へ一元化委譲）
   */
  function rescheduleOverdueReviews(options = {}) {
    if (global.VocabEvents && typeof global.VocabEvents.rescheduleOverdueReviews === 'function') {
      return global.VocabEvents.rescheduleOverdueReviews(options);
    }
  }

  /**
   * Anki復習セッションを開始
   */
  function startAnki(customCandidates = null, ctx = {}) {
    if (global.VocabSpeech?.stopAudioPlaylist) {
      global.VocabSpeech.stopAudioPlaylist();
    }
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

  /**
   * 復習モード管理（認識: recog / 産出: cloze）
   */
  function getAnkiMode() {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('vv_anki_mode') === 'cloze' ? 'cloze' : 'recog';
    }
    return 'recog';
  }

  function setAnkiMode(mode, ctx = {}) {
    const safeMode = mode === 'cloze' ? 'cloze' : 'recog';
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('vv_anki_mode', safeMode);
    }
    const btnRecog = $('btnAnkiRecog');
    const btnCloze = $('btnAnkiCloze');
    if (btnRecog) btnRecog.classList.toggle('active', safeMode === 'recog');
    if (btnCloze) btnCloze.classList.toggle('active', safeMode === 'cloze');

    const showToast = ctx.showToast || (global.VocabModal ? global.VocabModal.showToast : null);
    if (showToast) {
      showToast(safeMode === 'cloze' ? '復習モード: 産出 (Cloze穴埋め) に切り替えました' : '復習モード: 認識 (単語→意味) に切り替えました', 'info', 2500);
    }

    renderAnki(ctx);
  }

  function toggleAnkiMode(ctx = {}) {
    const cur = getAnkiMode();
    setAnkiMode(cur === 'recog' ? 'cloze' : 'recog', ctx);
  }

  /**
   * 産出（Cloze）穴埋め用センテンスHTMLビルダー
   */
  function buildClozeSentenceHtml(item) {
    if (!item) return '';
    const ex = item.example;
    const rawWithTags = String(ex ? (ex.foreign || ex.en || ex.f || '') : '').trim();
    const word = String(item.word || '').trim();
    const usedForm = String((ex && ex.used_form) || word).trim();

    if (!rawWithTags) {
      return `<span class="cloze-blank" data-act="reveal-cloze" data-ans="${esc(word)}">[ ????? ]</span>`;
    }

    // 1. <b>...</b> タグが存在する場合は、その箇所を最優先で穴埋め対象とする
    const boldMatch = rawWithTags.match(/<b>([\s\S]*?)<\/b>/i);
    if (boldMatch && boldMatch[1].trim()) {
      const ansText = boldMatch[1].replace(/<[^>]+>/g, '').trim();
      const idx = boldMatch.index;
      const before = esc(rawWithTags.slice(0, idx).replace(/<[^>]+>/g, ''));
      const after = esc(rawWithTags.slice(idx + boldMatch[0].length).replace(/<[^>]+>/g, ''));
      return `${before}<span class="cloze-blank" data-act="reveal-cloze" data-ans="${esc(ansText)}">[ ????? ]</span>${after}`;
    }

    const rawEx = rawWithTags.replace(/<[^>]+>/g, '').trim();
    const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // 語幹（先頭4文字以上）での派生・活用形マッチも候補に追加
    const stem = word.length >= 5 ? word.slice(0, word.length - 2) : '';
    const targetCandidates = [usedForm, word].filter(Boolean);
    let match = null;

    for (const target of targetCandidates) {
      // 活用語尾（-s, -es, -ed, -ing, -d, -ly 等）を伴う単語境界マッチ
      const regInflected = new RegExp(`\\b${escapeRegExp(target)}(?:s|es|d|ed|ing|er|est|ly|n)?\\b`, 'i');
      const mB = regInflected.exec(rawEx);
      if (mB) {
        match = { start: mB.index, len: mB[0].length, matchedText: mB[0] };
        break;
      }
      const regSimple = new RegExp(escapeRegExp(target), 'i');
      const mS = regSimple.exec(rawEx);
      if (mS) {
        match = { start: mS.index, len: mS[0].length, matchedText: mS[0] };
        break;
      }
    }

    // 語幹によるフォールバック検索（例: conceive -> conceived, conceiving）
    if (!match && stem.length >= 4) {
      const regStem = new RegExp(`\\b${escapeRegExp(stem)}[a-zA-Zäöüßéèêàù]*\\b`, 'i');
      const mStem = regStem.exec(rawEx);
      if (mStem) {
        match = { start: mStem.index, len: mStem[0].length, matchedText: mStem[0] };
      }
    }

    if (match) {
      const before = esc(rawEx.slice(0, match.start));
      const blank = `<span class="cloze-blank" data-act="reveal-cloze" data-ans="${esc(match.matchedText)}">[ ????? ]</span>`;
      const after = esc(rawEx.slice(match.start + match.len));
      return `${before}${blank}${after}`;
    }

    return `${esc(rawEx)} <br><span class="cloze-blank" data-act="reveal-cloze" data-ans="${esc(word)}">[ ????? ]</span>`;
  }

  /**
   * 産出（Cloze）ヒントバッジHTMLビルダー
   */
  const CLOZE_IDEA_SVG = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:-1px"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z"/></svg>';
  const CLOZE_BOOK_SVG = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;vertical-align:-1px"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';

  function buildClozeHintsHtml(item) {
    if (!item) return '';
    const badges = [];
    if (item.core) {
      badges.push(`<div class="cloze-hint-badge core">${CLOZE_IDEA_SVG}コアイメージ: ${esc(item.core)}</div>`);
    }
    const pos = item.meanings?.[0]?.pos;
    const meaning = item.meanings?.[0]?.text;
    if (pos || meaning) {
      badges.push(`<div class="cloze-hint-badge">${CLOZE_BOOK_SVG}${pos ? `[${esc(pos)}] ` : ''}${esc(meaning || '')}</div>`);
    }
    return badges.join('');
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
    const goalInfo = getDailyGoalInfo(ctx);
    const streakInfo = getStreakInfo(ctx);
    const progEl = $('aProg');
    if (progEl) {
      const streakBadge = streakInfo.streak > 0 ? ` [連続: ${streakInfo.streak}日]` : '';
      const goalBadge = ` [本日: ${goalInfo.count}/${goalInfo.goal}語]`;
      progEl.textContent = `進捗: ${done}/${total}語 (${pct}%)${streakBadge}${goalBadge}`;
    }

    const mode = getAnkiMode();
    const btnRecog = $('btnAnkiRecog');
    const btnCloze = $('btnAnkiCloze');
    if (btnRecog) btnRecog.classList.toggle('active', mode === 'recog');
    if (btnCloze) btnCloze.classList.toggle('active', mode === 'cloze');

    const aWord = $('aWord');
    if (aWord) aWord.textContent = i.word + (i.homographIndex > 1 ? ` #${i.homographIndex}` : '');

    const spkCurrentBtn = document.querySelector?.('.a-front .spk-btn[data-act="speak-current"]');
    if (spkCurrentBtn) {
      spkCurrentBtn.dataset.text = i.word || '';
      spkCurrentBtn.dataset.lang = i.lang || appState?.lang || 'en';
    }

    const aPho = $('aPho');
    if (aPho) aPho.textContent = [fmtPho(i.phonetic), i.grammar_forms].filter(Boolean).join('  ');

    const aFrontRecog = $('aFrontRecog');
    const aClozeWrap = $('aClozeWrap');
    const aClozeSentence = $('aClozeSentence');
    const aClozeHintBox = $('aClozeHintBox');

    if (mode === 'cloze') {
      if (aFrontRecog) aFrontRecog.style.display = 'none';
      if (aPho) aPho.style.display = 'none';
      if (aClozeWrap) {
        aClozeWrap.style.display = 'block';
        if (aClozeSentence) aClozeSentence.innerHTML = buildClozeSentenceHtml(i);
        if (aClozeHintBox) aClozeHintBox.innerHTML = buildClozeHintsHtml(i);
      }
    } else {
      if (aFrontRecog) aFrontRecog.style.display = 'flex';
      if (aPho) aPho.style.display = 'block';
      if (aClozeWrap) aClozeWrap.style.display = 'none';
    }

    // 長文・OCR抽出時の文脈ヒント（Episode Context）
    const contextBox = $('aContextBox');
    const contextText = $('aContextText');
    if (contextBox && contextText) {
      if (i.contextSentence) {
        contextBox.style.display = 'block';
        contextText.textContent = `“${i.contextSentence}”`;
      } else {
        contextBox.style.display = 'none';
      }
    }

    const aDiv = $('aDiv'), aBack = $('aBack'), aRat = $('aRat'), btnAns = $('btnAns');
    if (aDiv) aDiv.style.display = 'none';
    if (aBack) aBack.style.display = 'none';
    if (aRat) aRat.style.display = 'none';
    if (btnAns) btnAns.style.display = 'block';

    if (aBack) {
      const cleanHtml = buildAnkiBack(i, ctx);
      if (cleanHtml) {
        aBack.innerHTML = cleanHtml;
      } else if (global.VocabCardView?.buildRight) {
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
    if (mode === 'recog' && lsGet && lsGet('vv_tts_auto_anki', '1') !== '0') {
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

    // Clozeモード時は解答表示で正解単語を露出＆正解ブランク展開＆音声自動再生
    if (getAnkiMode() === 'cloze') {
      const aFrontRecog = $('aFrontRecog');
      if (aFrontRecog) aFrontRecog.style.display = 'flex';
      const aPho = $('aPho');
      if (aPho) aPho.style.display = 'block';

      const blanks = document.querySelectorAll?.('.cloze-blank');
      blanks?.forEach(b => {
        b.classList.add('revealed');
        if (b.dataset.ans) b.textContent = b.dataset.ans;
      });

      const lsGet = ctx.lsGet || (global.VocabCore?.lsGet);
      if (lsGet && lsGet('vv_tts_auto_anki', '1') !== '0') {
        const spkFn = ctx.speakText || (global.VocabSpeech?.speakText);
        if (spkFn) spkFn(e.word, e.lang || appState?.lang);
      }
    }

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
    if (global.VocabSpeech?.stopSpeech) {
      global.VocabSpeech.stopSpeech();
    }
    const appState = ctx.appState || (global.VocabCore?.App);
    if (!appState || !appState.aList) return;
    const cur = appState.aList.shift();
    if (!cur) return;

    const tL = cur.lang || appState.srcLang || appState.lang || 'en';
    const activeSrcLang = appState.srcLang || appState.lang || 'en';
    const curPairKey = ctx.getActivePairKey ? ctx.getActivePairKey() : (global.VocabCore?.getActivePairConfig?.()?.key);

    const matchEntry = x => {
      if (!x) return false;
      if (cur.id && x.id) return x.id === cur.id;
      if (cur.wordKey && x.wordKey) return x.wordKey === cur.wordKey;
      if (cur.word && x.word) {
        const sameLang = !cur.lang || !x.lang || x.lang === cur.lang;
        const sameHomo = (Number(x.homographIndex) || 1) === (Number(cur.homographIndex) || 1);
        return x.word === cur.word && sameLang && sameHomo;
      }
      return (!cur.id && !cur.word && x.num === cur.num && (!cur.lang || !x.lang || x.lang === cur.lang));
    };

    let targetKey = curPairKey;
    let list = typeof ctx.getList === 'function' ? ctx.getList(targetKey) : [...(appState.entries || [])];
    let e = (tL === activeSrcLang) ? list.find(matchEntry) : null;

    if (!e && typeof ctx.findAcrossAllPairs === 'function') {
      const found = ctx.findAcrossAllPairs(cur);
      if (found) {
        e = found.entry;
        targetKey = found.pairKey;
        list = found.list;
      }
    }
    if (!e && tL !== activeSrcLang) {
      e = list.find(matchEntry);
    }
    if (!e) {
      if (appState.aList?.length) renderAnki(ctx);
      else exitAnki(ctx);
      return;
    }

    if (global.VocabSRS?.triggerHaptic) {
      global.VocabSRS.triggerHaptic(r === 0 ? 'again' : r === 1 ? 'light' : r === 2 ? 'good' : 'easy');
    }

    if (appState.ankiHistory) {
      appState.ankiHistory.push({
        lang: tL,
        id: e.id,
        targetKey,
        prevProps: {
          interval: e.interval,
          repetition: e.repetition,
          efactor: e.efactor,
          stability: e.stability,
          difficulty: e.difficulty,
          retrievability: e.retrievability,
          nextReview: e.nextReview,
          version: e.version,
          reviewUpdatedAt: e.reviewUpdatedAt,
          updatedAt: e.updatedAt
        },
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

    incrementDailyGoal(ctx);
    recordReviewStreak(ctx);

    if (appState.aList.length) {
      renderAnki(ctx);
    } else {
      const finalGoal = getDailyGoalInfo(ctx);
      const finalStreak = getStreakInfo(ctx);
      const streakTxt = finalStreak.streak > 0 ? ` / 連続: ${finalStreak.streak}日` : '';
      ctx.showToast?.(`本日の復習完了。本日: ${finalGoal.count}語${streakTxt}`, 'ok', 4000);
      exitAnki(ctx);
    }
  }

  /**
   * 直前のレーティングを取り消し (Undo)
   */
  function undoAnkiRev(ctx = {}) {
    if (global.VocabSpeech?.stopSpeech) {
      global.VocabSpeech.stopSpeech();
    }
    const appState = ctx.appState || (global.VocabCore?.App);
    if (!appState || !appState.ankiHistory) return;
    const last = appState.ankiHistory.pop();
    if (!last) return;

    const curPairKey = ctx.getActivePairKey ? ctx.getActivePairKey() : (global.VocabCore?.getActivePairConfig?.()?.key);
    const targetKey = last.targetKey || curPairKey;
    const list = typeof ctx.getList === 'function' ? ctx.getList(targetKey) : [...(appState.entries || [])];
    const e = list.find(x => x.id === last.id);
    if (!e) return;

    const nextVersion = Math.max(Number(e.version) || 1, Number(last.prevProps?.version) || 1) + 1;
    const now = Date.now();
    Object.assign(e, last.prevProps, {
      version: nextVersion,
      updatedAt: now,
      reviewUpdatedAt: now
    });
    if (last.requeued && appState.aList) {
      const pIdx = appState.aList.findIndex(x => x.id === e.id);
      if (pIdx !== -1) appState.aList.splice(pIdx, 1);
    }
    if (appState.aList) appState.aList.unshift(e);

    // [P1-1 解決] オプティマイザ履歴ログと日次復習カウントのロールバック
    try {
      if (typeof localStorage !== 'undefined') {
        const rawLog = localStorage.getItem('vv_review_history_log');
        if (rawLog) {
          const logs = JSON.parse(rawLog);
          if (Array.isArray(logs) && logs.length > 0) {
            const lastLog = logs[logs.length - 1];
            if (lastLog && (lastLog.cardId === last.id || lastLog.id === last.id)) {
              logs.pop();
              if (global.VocabSRS?.saveReviewHistoryLog) {
                global.VocabSRS.saveReviewHistoryLog(logs);
              } else {
                localStorage.setItem('vv_review_history_log', JSON.stringify(logs));
              }
            }
          }
        }
        const todayStr = todayYmd();
        const dateKey = `vv_reviewed_${todayStr}`;
        const curCount = parseInt(localStorage.getItem(dateKey) || '0', 10);
        if (curCount > 0) {
          localStorage.setItem(dateKey, String(curCount - 1));
        }
        const legacyDateKey = `vv_rev_count_${new Date().toISOString().slice(0, 10)}`;
        const legCount = parseInt(localStorage.getItem(legacyDateKey) || '0', 10);
        if (legCount > 0) {
          localStorage.setItem(legacyDateKey, String(legCount - 1));
        }
      }
    } catch {}

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
    if (global.VocabSpeech?.stopSpeech) {
      global.VocabSpeech.stopSpeech();
    }
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

  /**
   * [アナリティクス] 過去30〜90日間の学習コミットヒートマップデータ集計
   */
  function getCommitHeatmapData(days = 63, options = {}) {
    const lsGet = options.lsGet || (global.VocabCore?.lsGet) || (k => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null));
    const now = new Date();
    const cells = [];
    let totalReviews = 0;

    const historyLogs = (global.VocabSRS?.getReviewHistoryLog ? global.VocabSRS.getReviewHistoryLog() : []);
    const logDateMap = {};
    for (let i = 0; i < historyLogs.length; i++) {
      const ts = historyLogs[i].timestamp;
      if (ts) {
        const dStr = todayYmd(new Date(ts));
        logDateMap[dStr] = (logDateMap[dStr] || 0) + 1;
      }
    }

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dateStr = todayYmd(d);
      const storageCount = parseInt(lsGet(`vv_reviewed_${dateStr}`, '0'), 10) || 0;
      const count = Math.max(storageCount, logDateMap[dateStr] || 0);
      totalReviews += count;

      let level = 0;
      if (count >= 30) level = 4;
      else if (count >= 15) level = 3;
      else if (count >= 5) level = 2;
      else if (count >= 1) level = 1;

      cells.push({ date: dateStr, count, level, dayOfWeek: d.getDay() });
    }

    const streakInfo = getStreakInfo(options);
    return { cells, totalReviews, streak: streakInfo.streak, freezeAvailable: streakInfo.freezeAvailable };
  }

  /**
   * [アナリティクス] 向こう7〜30日間の日別予測復習負荷バーチャートデータ集計
   */
  function getFutureWorkloadData(days = 14, listInput = null) {
    const list = Array.isArray(listInput) ? listInput : (global.VocabCore?.App?.entries || []);
    const now = Date.now();
    const workload = [];
    const counts = new Array(days).fill(0);
    const dateStrings = [];

    const baseDate = new Date();
    for (let d = 0; d < days; d++) {
      const targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + d);
      dateStrings.push(todayYmd(targetDate));
    }

    const todayStr = todayYmd(new Date(now));
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (!item || !item.nextReview) continue;
      const targetYmd = todayYmd(new Date(item.nextReview));
      const diffDays = dayDiff(todayStr, targetYmd);
      if (diffDays <= 0) {
        counts[0]++; // 本日または過去の期日到来分
      } else if (diffDays < days) {
        counts[diffDays]++;
      }
    }

    let maxCount = 1;
    for (let d = 0; d < days; d++) {
      if (counts[d] > maxCount) maxCount = counts[d];
      workload.push({
        dayOffset: d,
        date: dateStrings[d],
        label: d === 0 ? '本日' : d === 1 ? '明日' : d === 2 ? '明後日' : `${d}日後`,
        shortDate: dateStrings[d].slice(5),
        count: counts[d]
      });
    }

    return { workload, maxCount, totalUpcoming: counts.reduce((a, b) => a + b, 0) };
  }

  /**
   * [アナリティクス] 全体平均想起率 (Retrievability R) ゲージおよび記憶健康度
   */
  function getOverallRetrievabilityStats(listInput = null) {
    const list = Array.isArray(listInput) ? listInput : (global.VocabCore?.App?.entries || []);
    if (!list.length) {
      return { avgR: 1.0, avgPct: '100.0%', total: 0, stable: 0, borderline: 0, critical: 0, grade: 'S' };
    }

    const now = Date.now();
    let sumR = 0;
    let stable = 0;     // R >= 0.90
    let borderline = 0; // 0.70 <= R < 0.90
    let critical = 0;   // R < 0.70

    for (let i = 0; i < list.length; i++) {
      const r = global.VocabSRS?.getRetrievability ? global.VocabSRS.getRetrievability(list[i], now) : 1.0;
      sumR += r;
      if (r >= 0.90) stable++;
      else if (r >= 0.70) borderline++;
      else critical++;
    }

    const avgR = sumR / list.length;
    const avgPct = (avgR * 100).toFixed(1) + '%';
    let grade = 'S';
    if (avgR < 0.70) grade = 'C';
    else if (avgR < 0.80) grade = 'B';
    else if (avgR < 0.90) grade = 'A';

    return {
      avgR: Number(avgR.toFixed(3)),
      avgPct,
      total: list.length,
      stable,
      borderline,
      critical,
      grade
    };
  }

  /**
   * アナリティクス・ダッシュボードのHTMLを生成
   */
  function buildAnalyticsDashboardHtml(options = {}) {
    const list = options.list || (global.VocabCore?.App?.entries || []);
    const retrievability = getOverallRetrievabilityStats(list);
    const heatmap = getCommitHeatmapData(63, options);
    const workload = getFutureWorkloadData(14, list);
    const fsrsWeights = global.VocabSRS?.getUserFSRSWeights ? global.VocabSRS.getUserFSRSWeights() : null;
    const reviewLogs = global.VocabSRS?.getReviewHistoryLog ? global.VocabSRS.getReviewHistoryLog() : [];

    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - retrievability.avgR);
    const gradeColor = retrievability.grade === 'S' ? 'var(--ok, #10b981)' : retrievability.grade === 'A' ? 'var(--ac, #6366f1)' : retrievability.grade === 'B' ? '#f59e0b' : '#ef4444';

    const gaugeHtml = `
      <div class="retrievability-gauge">
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="${radius}" fill="none" stroke="var(--b)" stroke-width="8"/>
          <circle cx="50" cy="50" r="${radius}" fill="none" stroke="${gradeColor}" stroke-width="8"
            stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round"
            style="transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1);"/>
        </svg>
        <div class="retrievability-val">
          <span>${retrievability.avgPct}</span>
          <small>Grade ${retrievability.grade}</small>
        </div>
      </div>
    `;

    const heatmapCellsHtml = heatmap.cells.map(c => `
      <div class="heatmap-cell l-${c.level}" title="${c.date}: ${c.count}語復習"></div>
    `).join('');

    const chartBarsHtml = workload.workload.map(w => {
      const pct = Math.max(4, Math.round((w.count / workload.maxCount) * 100));
      const isToday = w.dayOffset === 0;
      const isHeavy = w.count >= 30;
      return `
        <div class="workload-bar-col" title="${w.date} (${w.label}): ${w.count}語">
          <span class="workload-val">${w.count > 0 ? w.count : ''}</span>
          <div class="workload-bar ${isToday ? 'today' : ''} ${isHeavy ? 'heavy' : ''}" style="height:${pct}%;"></div>
          <span class="workload-label">${w.shortDate}</span>
        </div>
      `;
    }).join('');

    const optStatusHtml = fsrsWeights
      ? `<span class="badge ok">最適化中 (${fsrsWeights.logCount || reviewLogs.length}件 / 精度+${fsrsWeights.improvement || '0'}%)</span>`
      : reviewLogs.length >= 20
        ? `<span class="badge ok">最適化可能 (${reviewLogs.length}件蓄積)</span>`
        : `<span class="badge" style="background:var(--b);color:var(--s)">初期係数 (${reviewLogs.length}/20件蓄積)</span>`;

    const curPair = global.VocabCore?.getActivePairConfig ? global.VocabCore.getActivePairConfig() : null;
    const pairLabel = curPair ? (curPair.name || curPair.label || '') : '';

    return `
      <div class="analytics-grid">
        <div class="analytics-card">
          <div class="analytics-card-hd">
            <span>全体平均想起率 (Retrievability)${pairLabel ? ` <small style="color:var(--s);font-size:11px">(${esc(pairLabel)})</small>` : ''}</span>
            <span class="badge ok">記憶健康度</span>
          </div>
          <div class="analytics-retrievability-wrap">
            ${gaugeHtml}
            <div style="flex:1;font-size:12px;line-height:1.6">
              <div style="font-weight:700;color:var(--t)">現在の記憶維持率: <strong style="color:${gradeColor}">${retrievability.avgPct}</strong></div>
              <div style="color:var(--s)">• 安定定着 (R≥90%): <strong>${retrievability.stable}語</strong></div>
              <div style="color:var(--s)">• 境界領域 (70%≤R&lt;90%): <strong>${retrievability.borderline}語</strong></div>
              <div style="color:var(--s)">• 忘却危機 (R&lt;70%): <strong style="color:#ef4444">${retrievability.critical}語</strong></div>
            </div>
          </div>
        </div>

        <div class="analytics-card">
          <div class="analytics-card-hd">
            <span>個人適応型 FSRS 重み</span>
            ${optStatusHtml}
          </div>
          <div style="font-size:12px;color:var(--s);line-height:1.6">
            <p style="margin:0 0 8px 0">直近${reviewLogs.length}件の復習ログに基づき、あなたの忘却速度に数理最適化された間隔で出題します。</p>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
              <span class="badge" style="background:var(--b);font-family:monospace;font-size:11px" title="安定度スケーリング係数">S-Scale: ${Number(fsrsWeights?.sScale || 1.0).toFixed(2)}x</span>
              <span class="badge" style="background:var(--b);font-family:monospace;font-size:11px" title="忘却曲線の減衰率（負の指数）">Decay: ${Number(fsrsWeights?.decayFactor || -0.5).toFixed(2)}</span>
              <span class="badge" style="background:var(--b);font-family:monospace;font-size:11px" title="Hard評価時の次回係数">Hard: ${Number(fsrsWeights?.wHard || 0.8).toFixed(2)}x</span>
              <span class="badge" style="background:var(--b);font-family:monospace;font-size:11px" title="Good評価時の次回係数">Good: ${Number(fsrsWeights?.wGood || 1.2).toFixed(2)}x</span>
              <span class="badge" style="background:var(--b);font-family:monospace;font-size:11px" title="Easy評価時の次回係数">Easy: ${Number(fsrsWeights?.wEasy || 1.6).toFixed(2)}x</span>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button type="button" class="btn-ac-o btn-xs" onclick="VocabAnkiView.triggerManualOptimize()">今すぐFSRS重みを最適化</button>
              <button type="button" class="btn-o btn-xs" onclick="VocabAnkiView.triggerResetWeights()">標準重みにリセット</button>
            </div>
          </div>
        </div>
      </div>

      <div class="analytics-card" style="margin-top:14px">
        <div class="analytics-card-hd">
          <span>学習コミットヒートマップ (過去9週間)</span>
          <span style="font-size:12px;color:var(--s)">累計: <strong>${heatmap.totalReviews}語</strong> | 連続: <strong>${heatmap.streak}日</strong></span>
        </div>
        <div class="heatmap-wrap">
          <div class="heatmap-grid">
            ${heatmapCellsHtml}
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;align-items:center;gap:4px;font-size:10px;color:var(--m)">
          <span>少</span>
          <div class="heatmap-cell l-0" style="display:inline-block"></div>
          <div class="heatmap-cell l-1" style="display:inline-block"></div>
          <div class="heatmap-cell l-2" style="display:inline-block"></div>
          <div class="heatmap-cell l-3" style="display:inline-block"></div>
          <div class="heatmap-cell l-4" style="display:inline-block"></div>
          <span>多</span>
        </div>
      </div>

      <div class="analytics-card" style="margin-top:14px">
        <div class="analytics-card-hd">
          <span>向こう14日間の日別予測復習負荷 (Workload Forecast)</span>
          <span style="font-size:12px;color:var(--s)">14日合計: <strong>${workload.totalUpcoming}語</strong></span>
        </div>
        <div class="workload-chart">
          ${chartBarsHtml}
        </div>
        <p style="margin:6px 0 0 0;font-size:11px;color:var(--m)">※各バーは各日に復習満期を迎える予定単語数です。緑は本日分、赤は30語以上の過密日を示します。</p>
      </div>
    `;
  }

  function renderAnalyticsDashboard(containerId = 'analyticsDashboardBody') {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = buildAnalyticsDashboardHtml();
  }

  function openAnalyticsModal() {
    renderAnalyticsDashboard('analyticsDashboardBody');
    if (typeof global.toggleModal === 'function') {
      global.toggleModal('analyticsModal', true);
    } else {
      const modal = document.getElementById('analyticsModal');
      if (modal) {
        modal.classList.add('open');
        modal.classList.add('active');
      }
    }
  }

  function closeAnalyticsModal() {
    if (typeof global.toggleModal === 'function') {
      global.toggleModal('analyticsModal', false);
    } else {
      const modal = document.getElementById('analyticsModal');
      if (modal) {
        modal.classList.remove('open');
        modal.classList.remove('active');
      }
    }
  }

  function triggerManualOptimize() {
    if (!global.VocabSRS?.optimizeFSRSWeights) return;
    const res = global.VocabSRS.optimizeFSRSWeights();
    const showToast = global.VocabModal?.showToast || alert;
    if (res.success) {
      showToast(`FSRS重みを最適化しました（学習ログ ${res.count}件、予測精度向上: ${res.improvement}）。`, 'ok', 4000);
      renderAnalyticsDashboard();
    } else {
      showToast(res.message || '学習ログが20件以上蓄積されると最適化可能です。', 'info', 3500);
    }
  }

  function triggerResetWeights() {
    if (typeof confirm === 'function' && !confirm('FSRS重み係数をデフォルトの初期値にリセットしますか？')) return;
    if (global.VocabSRS?.resetUserFSRSWeights) {
      global.VocabSRS.resetUserFSRSWeights();
      const showToast = global.VocabModal?.showToast || alert;
      showToast('FSRS重みを初期値にリセットしました。', 'ok');
      renderAnalyticsDashboard();
    }
  }

  // --- グローバルエクスポート ---
  global.VocabAnkiView = {
    getAnkiMode,
    setAnkiMode,
    toggleAnkiMode,
    buildClozeSentenceHtml,
    buildClozeHintsHtml,
    getOverdueRatio,
    setDailyReviewCap,
    getStreakInfo,
    recordReviewStreak,
    getDailyGoalInfo,
    incrementDailyGoal,
    buildAnkiBack,
    rescheduleOverdueReviews,
    startAnki,
    renderAnki,
    showAns,
    procRev,
    undoAnkiRev,
    exitAnki,
    getCommitHeatmapData,
    getFutureWorkloadData,
    getOverallRetrievabilityStats,
    buildAnalyticsDashboardHtml,
    renderAnalyticsDashboard,
    openAnalyticsModal,
    closeAnalyticsModal,
    triggerManualOptimize,
    triggerResetWeights
  };
})(typeof window !== 'undefined' ? window : globalThis);
