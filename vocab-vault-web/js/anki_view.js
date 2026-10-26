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
    const tL = item.tgtLang || options.tgtLang || global.App?.tgtLang || 'ja';
    const coreBadgeLabel = (tL === 'en' ? 'Core Concept' : (tL === 'de' ? 'Kernkonzept' : (tL === 'fr' ? 'Concept Clé' : (tL === 'es' ? 'Concepto Clave' : (tL === 'ko' ? '코아이미지' : (tL === 'zh' ? '核心概念' : 'コアイメージ'))))));

    // 1. コアイメージ（一言）
    const coreHtml = item.core ? `
      <div class="anki-core-box">
        <span class="anki-core-badge">${coreBadgeLabel}</span>
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
    const exTrans = ex ? (ex.trans || (tL && ex[tL]) || ex.ja || ex.j || '') : '';
    const cleanEx = exForeign ? exForeign.replace(/<[^>]+>/g, '').trim() : '';
    const spkExBtn = cleanEx && global.VocabSpeech?.mkSpkBtn ? global.VocabSpeech.mkSpkBtn(cleanEx, item.lang || options.lang || 'en', true) : '';
    const exampleHtml = (cleanEx || exTrans) ? `
      <div class="anki-example-box">
        ${cleanEx ? `<div class="anki-ex-foreign"><span>${esc(cleanEx)}</span>${spkExBtn}</div>` : ''}
        ${exTrans ? `<div class="anki-ex-ja">${esc(exTrans.replace(/<[^>]+>/g, ''))}</div>` : ''}
      </div>
    ` : '';

    // 4. 深層語源・概念史・派生語（折りたたみアコーディオン）
    const matrix = global.VocabMorphology?.buildCognateMatrix ? global.VocabMorphology.buildCognateMatrix(item, options.rootIndexMap || global.App?.rootIndexMap) : null;
    const matrixHtml = matrix ? (global.VocabMorphology?.renderCognateMatrixHtml ? global.VocabMorphology.renderCognateMatrixHtml(matrix) : '') : '';
    const hasEty = Boolean(item.etymology || item.history_note || (item.derivatives && item.derivatives.length) || matrixHtml);

    const etyLbl = (tL === 'en' ? 'Etymology' : (tL === 'de' ? 'Etymologie' : (tL === 'fr' ? 'Étymologie' : (tL === 'es' ? 'Etimología' : (tL === 'ko' ? '어원' : (tL === 'zh' ? '词源' : '語源'))))));
    const histLbl = (tL === 'en' ? 'History & Context' : (tL === 'de' ? 'Geschichte & Kontext' : (tL === 'fr' ? 'Histoire & Contexte' : (tL === 'es' ? 'Historia y Contexto' : (tL === 'ko' ? '개념사·배경' : (tL === 'zh' ? '概念史·背景' : '概念史・背景'))))));
    const drvLbl = (tL === 'en' ? 'Derivatives' : (tL === 'de' ? 'Ableitungen' : (tL === 'fr' ? 'Dérivés' : (tL === 'es' ? 'Derivados' : (tL === 'ko' ? '파생어' : (tL === 'zh' ? '衍生词' : '派生語'))))));
    const summaryLbl = (tL === 'en' ? 'Expand Deep Etymology & Cognates' : (tL === 'de' ? 'Tiefenetymologie & Kognaten anzeigen' : (tL === 'fr' ? 'Développer étymologie & mots apparentés' : (tL === 'es' ? 'Desplegar etimología profunda y cognados' : (tL === 'ko' ? '심층 어원·개념사·동근어 펼치기' : (tL === 'zh' ? '展开深层词源·概念史·同源词' : '深層語源・概念史・4言語同根語を展開'))))));

    let etyHtml = '';
    if (hasEty) {
      const hasKana = str => typeof str === 'string' && /[\u3040-\u309f\u30a0-\u30ff]/.test(str);
      const etyText = item.etymology ? `<p class="anki-ety-text"><strong>${etyLbl}:</strong> ${esc(item.etymology)}</p>` : '';
      let hn = item.history_note ? String(item.history_note).trim() : '';
      if (tL !== 'ja' && hasKana(hn)) {
        hn = item[`history_note_${tL}`] || item.history_note_trans || '';
      }
      const histText = hn ? `<p class="anki-hist-text"><strong>${histLbl}:</strong> ${esc(hn)}</p>` : '';
      const tagsText = (Array.isArray(item.etymologyTags) && item.etymologyTags.length) ? `
        <div class="anki-ety-tags" style="margin:6px 0;">
          ${item.etymologyTags.map(t => `<span class="ety-tag">${esc(t)}</span>`).join(' ')}
        </div>
      ` : '';
      const derivsText = (Array.isArray(item.derivatives) && item.derivatives.length) ? `
        <div class="anki-derivs" style="margin-top:6px;font-size:12px;color:var(--s);">
          <strong>${drvLbl}:</strong> ${item.derivatives.slice(0, 4).map(d => {
            let m = d.meaning || '';
            if (tL !== 'ja' && hasKana(m)) m = d[`meaning_${tL}`] || d.meaning_en || '';
            return `${esc(d.word)}${m ? ` (${esc(m)})` : ''}`;
          }).join(', ')}
        </div>
      ` : '';

      etyHtml = `
        <details class="anki-ety-details" style="margin-top:12px;border:1px solid var(--border);border-radius:6px;padding:6px 10px;background:var(--bg-sub, rgba(0,0,0,0.02));">
          <summary class="anki-ety-summary" style="cursor:pointer;font-weight:600;font-size:12px;color:var(--s);user-select:none;">${summaryLbl}</summary>
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
          ctx.showToast?.(global.VocabI18n?.t ? global.VocabI18n.t('anki.no_cards_to_review') : '復習対象の単語が登録されていません。', 'info', 3000);
          return;
        }
        const confirmMsg = global.VocabI18n?.t ? global.VocabI18n.t('anki.advance_review_confirm') : '現在、復習期日を迎えた単語はありません（すべて定着中）。\n登録済みの単語で事前復習・総復習セッションを開始しますか？';
        if (typeof confirm === 'function' && !confirm(confirmMsg)) {
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
      appState._sessionReviewedItems = [];
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
      const toastKey = safeMode === 'cloze' ? 'anki.mode_cloze_toast' : 'anki.mode_recog_toast';
      const defaultMsg = safeMode === 'cloze' ? '復習モード: 産出 (Cloze穴埋め) に切り替えました' : '復習モード: 認識 (単語→意味) に切り替えました';
      showToast(global.VocabI18n?.t ? global.VocabI18n.t(toastKey) : defaultMsg, 'info', 2500);
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
    // [P2-4 解決] Unicode Property Escape により西・伊・葡を含む全言語のアクセント文字境界を完全保護
    const NOT_WORD_CHAR = '[^\\p{L}\\p{M}\\p{N}_]';
    const stem = word.length >= 5 ? word.slice(0, word.length - 2) : '';
    const targetCandidates = [usedForm, word].filter(Boolean);
    let match = null;

    for (const target of targetCandidates) {
      // Unicode対応の単語境界 + 活用語尾マッチ
      const regInflected = new RegExp(`(^|${NOT_WORD_CHAR})(${escapeRegExp(target)}(?:s|es|d|ed|ing|er|est|ly|n)?)(?=${NOT_WORD_CHAR}|$)`, 'iu');
      const mB = regInflected.exec(rawEx);
      if (mB) {
        const prefixLen = mB[1] ? mB[1].length : 0;
        match = { start: mB.index + prefixLen, len: mB[2].length, matchedText: mB[2] };
        break;
      }
      // 空白を含まないフレーズや日本語等の場合のみ単純一致フォールバック
      if (/[^\p{L}\p{N}]/u.test(target) || target.length >= 6) {
        const regSimple = new RegExp(escapeRegExp(target), 'iu');
        const mS = regSimple.exec(rawEx);
        if (mS) {
          match = { start: mS.index, len: mS[0].length, matchedText: mS[0] };
          break;
        }
      }
    }

    // 語幹によるフォールバック検索（例: conceive -> conceived, conceiving）
    if (!match && stem.length >= 4) {
      const regStem = new RegExp(`(^|${NOT_WORD_CHAR})(${escapeRegExp(stem)}[\\p{L}\\p{M}\\p{N}_]*)(?=${NOT_WORD_CHAR}|$)`, 'iu');
      const mStem = regStem.exec(rawEx);
      if (mStem) {
        const prefixLen = mStem[1] ? mStem[1].length : 0;
        match = { start: mStem.index + prefixLen, len: mStem[2].length, matchedText: mStem[2] };
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
    const tL = item.tgtLang || global.App?.tgtLang || 'ja';
    const coreBadgePrefix = (tL === 'en' ? 'Core: ' : (tL === 'de' ? 'Kern: ' : (tL === 'fr' ? 'Cœur: ' : (tL === 'es' ? 'Núcleo: ' : (tL === 'ko' ? '코아이미지: ' : (tL === 'zh' ? '核心概念: ' : 'コアイメージ: '))))));
    const badges = [];
    let coreText = item.core;
    if (tL !== 'ja' && /[\u3040-\u309f\u30a0-\u30ff]/.test(coreText)) {
      coreText = item[`core_${tL}`] || item.core_en || '';
      if (/[\u3040-\u309f\u30a0-\u30ff]/.test(coreText)) coreText = '';
    }
    if (coreText) {
      badges.push(`<div class="cloze-hint-badge core">${CLOZE_IDEA_SVG}${coreBadgePrefix}${esc(coreText)}</div>`);
    }
    const pos = item.meanings?.[0]?.pos;
    let meaning = item.meanings?.[0]?.text;
    if (tL !== 'ja' && /[\u3040-\u309f\u30a0-\u30ff]/.test(meaning)) {
      meaning = item.meanings?.[0]?.[`text_${tL}`] || item.meanings?.[0]?.en || item.meanings?.[0]?.text_en || '';
      if (/[\u3040-\u309f\u30a0-\u30ff]/.test(meaning)) meaning = '';
    }
    if (pos || meaning) {
      badges.push(`<div class="cloze-hint-badge">${CLOZE_BOOK_SVG}${pos ? `[${esc(pos)}] ` : ''}${esc(meaning || '')}</div>`);
    }
    const isJa = tL === 'ja';
    const firstChar = item.word ? item.word.charAt(0) : '';
    const lenHint = item.word ? (isJa ? `${item.word.length}文字 / 先頭 '${esc(firstChar)}...'` : `${item.word.length} chars / starts with '${esc(firstChar)}...'`) : (isJa ? 'スペルを入力' : 'Type spelling');
    const phText = isJa ? `タイピング産出 (${lenHint})` : `Type recall (${lenHint})`;
    const checkBtnLbl = isJa ? '判定' : 'Check';
    const typeBox = `<div class="cloze-type-wrap" style="margin-top:10px;display:flex;gap:6px;justify-content:center;align-items:center">
      <input type="text" id="clozeTypeInput" class="cloze-type-input" data-act="cloze-input" placeholder="${phText}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" style="padding:6px 10px;border-radius:6px;border:1px solid var(--b);background:var(--bg);color:var(--t);font-size:13px;width:230px;text-align:center">
      <button type="button" class="btn-xs btn-ac-o" data-act="cloze-check">${checkBtnLbl}</button>
    </div>`;
    return badges.join('') + typeBox;
  }

  function calcLevenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const row = [];
    for (let i = 0; i <= b.length; i++) row[i] = i;
    for (let i = 1; i <= a.length; i++) {
      let prev = i;
      for (let j = 1; j <= b.length; j++) {
        const val = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
        row[j - 1] = prev;
        prev = val;
      }
      row[b.length] = prev;
    }
    return row[b.length];
  }

  function getStemVariants(word) {
    if (!word) return [];
    const w = String(word).trim().toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
    const set = new Set([w]);
    if (w.endsWith('ing')) {
      set.add(w.slice(0, -3));
      set.add(w.slice(0, -3) + 'e');
      if (w.length > 4 && w[w.length - 4] === w[w.length - 5]) set.add(w.slice(0, -4));
    }
    if (w.endsWith('ed')) {
      set.add(w.slice(0, -2));
      set.add(w.slice(0, -1));
      if (w.length > 3 && w[w.length - 3] === w[w.length - 4]) set.add(w.slice(0, -3));
    }
    if (w.endsWith('es')) {
      set.add(w.slice(0, -2));
      set.add(w.slice(0, -2) + 'e');
    }
    if (w.endsWith('s') && !w.endsWith('ss')) set.add(w.slice(0, -1));
    if (w.endsWith('ly')) set.add(w.slice(0, -2));
    return Array.from(set).filter(s => s.length >= 2);
  }

  function checkClozeTyping() {
    const inp = $('clozeTypeInput');
    const cur = global.VocabCore?.App?.aList?.[0];
    if (!inp || !cur) return;
    const rawVal = inp.value.trim();
    const val = rawVal.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
    const target = String(cur.word || '').trim().toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
    const usedForm = cur.example?.used_form ? String(cur.example.used_form).trim().toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '') : '';
    if (!val) {
      showAns();
      return;
    }
    if (val === target) {
      inp.style.borderColor = 'var(--ok)';
      const msg = global.VocabI18n?.t ? global.VocabI18n.t('anki.cloze_correct', { word: cur.word }) : `正解！「${cur.word}」を正確に産出できました。`;
      global.VocabModal?.showToast?.(msg, 'ok', 2500);
    } else if (usedForm && val === usedForm) {
      inp.style.borderColor = 'var(--ok)';
      const msg = global.VocabI18n?.t ? global.VocabI18n.t('anki.cloze_form_correct', { form: cur.example.used_form, word: cur.word }) : `正解！文中の活用形「${cur.example.used_form}」（原形: ${cur.word}）を正確に産出できました。`;
      global.VocabModal?.showToast?.(msg, 'ok', 3000);
    } else {
      const valStems = getStemVariants(val);
      const targetStems = getStemVariants(target);
      const usedStems = usedForm ? getStemVariants(usedForm) : [];
      const hasStemMatch = valStems.some(s => targetStems.includes(s) || usedStems.includes(s));
      const distTarget = calcLevenshtein(val, target);
      const distUsed = usedForm ? calcLevenshtein(val, usedForm) : 999;
      const minDistance = Math.min(distTarget, distUsed);

      if (hasStemMatch) {
        inp.style.borderColor = 'var(--ok)';
        const msg = global.VocabI18n?.t ? global.VocabI18n.t('anki.cloze_stem_ok', { input: rawVal, word: cur.word }) : `ほぼ正解（ステミング・語根一致）！入力: ${rawVal} / 正解: ${cur.word}`;
        global.VocabModal?.showToast?.(msg, 'ok', 3500);
      // [P2-⑨ 解決] 3〜4文字の短語（cat/bat等）での1文字誤認を防止するため最低文字数5以上を要求
      } else if (minDistance === 1 && target.length >= 5 && val.length >= 4) {
        inp.style.borderColor = 'var(--ok)';
        const msg = global.VocabI18n?.t ? global.VocabI18n.t('anki.cloze_typo_ok', { input: rawVal, word: cur.word }) : `ほぼ正解（1文字タイポ）！入力: ${rawVal} → 正解: ${cur.word}`;
        global.VocabModal?.showToast?.(msg, 'ok', 3500);
      } else {
        inp.style.borderColor = 'var(--ng)';
        const msg = global.VocabI18n?.t ? global.VocabI18n.t('anki.cloze_near_miss', { input: rawVal, word: cur.word }) : `惜しい！入力: ${rawVal} → 正解: ${cur.word}`;
        global.VocabModal?.showToast?.(msg, 'warn', 3500);
      }
    }
    showAns();
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
      const t = global.VocabI18n?.t || ((k, p, d) => d || k);
      const streakBadge = streakInfo.streak > 0
        ? ` [${t('anki.streak_badge', { streak: streakInfo.streak }, `連続: ${streakInfo.streak}日`)}]`
        : '';
      const goalBadge = ` [${t('anki.goal_badge', { done: goalInfo.count, goal: goalInfo.goal }, `本日: ${goalInfo.count}/${goalInfo.goal}語`)}]`;
      progEl.textContent = `${t('anki.progress_label', { done, total, pct }, `進捗: ${done}/${total}語 (${pct}%)`)}${streakBadge}${goalBadge}`;
    }

    // [P1-6 解決] サマリー表示ラッパーを非表示にし、通常カード要素の表示を復元
    const summaryWrap = $('aSessionSummaryWrap');
    if (summaryWrap) summaryWrap.style.display = 'none';
    const aCardEl = $('aCard');
    if (aCardEl && aCardEl.children) {
      Array.from(aCardEl.children).forEach(child => {
        if (!child || child.id === 'aSessionSummaryWrap' || child.classList?.contains('swipe-badge')) return;
        if (child.style) child.style.display = '';
      });
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
    if (aPho) {
      const currentLocale = global.VocabI18n?.getLocale?.() || 'ja';
      const tL = (ctx.tgtLang && ctx.tgtLang !== 'ja')
        ? ctx.tgtLang
        : (currentLocale !== 'ja' ? currentLocale : (i.tgtLang || appState?.tgtLang || 'ja'));
      const fmtGramFn = global.VocabCardView?.formatGrammarForms || global.formatGrammarForms;
      const dispGram = fmtGramFn ? fmtGramFn(i.grammar_forms, tL, i.lang) : i.grammar_forms;
      aPho.textContent = [fmtPho(i.phonetic), dispGram].filter(Boolean).join('  ');
    }

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
        if (mode === 'cloze' && i.word) {
          const escW = String(i.word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const maskedCtx = String(i.contextSentence).replace(new RegExp(`\\b${escW}(?:s|es|d|ed|ing|er|est|ly|n)?\\b`, 'gi'), '[ ????? ]');
          contextText.textContent = `“${maskedCtx}”`;
        } else {
          contextText.textContent = `“${i.contextSentence}”`;
        }
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
    const tL = e?.tgtLang || appState?.tgtLang || global.VocabI18n?.getLocale?.() || 'ja';
    const isJa = tL === 'ja';
    const predictions = global.VocabSRS?.predictIntervals ? global.VocabSRS.predictIntervals(e, tL) : null;
    const ratingLabels = isJa ? ['1: もう一度', '2: 難しい', '3: 普通', '4: 簡単'] :
      (tL === 'ko' ? ['1: 다시', '2: 어려움', '3: 기억함', '4: 쉬움'] :
      (tL === 'zh' ? ['1: 重来', '2: 困难', '3: 掌握', '4: 容易'] :
      (tL === 'de' ? ['1: Nochmal', '2: Schwer', '3: Gut', '4: Einfach'] :
      (tL === 'fr' ? ['1: Encore', '2: Difficile', '3: Bien', '4: Facile'] :
      (tL === 'es' ? ['1: Otra vez', '2: Difícil', '3: Bien', '4: Fácil'] :
      (tL === 'it' ? ['1: Ripeti', '2: Difficile', '3: Bene', '4: Facile'] :
      (tL === 'pt' ? ['1: De novo', '2: Difícil', '3: Bom', '4: Fácil'] :
      (tL === 'nl' ? ['1: Opnieuw', '2: Moeilijk', '3: Goed', '4: Makkelijk'] :
      ['1: Again', '2: Hard', '3: Good', '4: Easy']))))))));

    aRat.innerHTML = [['#ef4444', ratingLabels[0]], ['#f97316', ratingLabels[1]], ['#10b981', ratingLabels[2]], ['#3b82f6', ratingLabels[3]]].map((c, idx) => {
      const defaultPred = global.VocabSRS?.predDays ? (global.VocabSRS.predDays(e, idx) === 0 ? (isJa ? '1分後' : '1m') : Math.round(global.VocabSRS.predDays(e, idx)) + (isJa ? '日後' : 'd')) : (isJa ? '1日後' : '1d');
      const label = predictions ? predictions[idx] : defaultPred;
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
      e.updatedAt = Number(e.updatedAt) || now;
    }

    if (!appState._sessionReviewedItems) appState._sessionReviewedItems = [];
    appState._sessionReviewedItems.push({
      word: e.word || cur.word,
      lang: tL,
      rating: r,
      roots: Array.isArray(e.etymologyTags) ? e.etymologyTags : (Array.isArray(cur.etymologyTags) ? cur.etymologyTags : []),
      stabilityBefore: Number(cur.stability) || 1,
      stabilityAfter: Number(e.stability) || 1
    });

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
      const t = global.VocabI18n?.t || ((k, p, d) => d || k);
      const streakTxt = finalStreak.streak > 0
        ? ` / ${t('anki.streak_badge', { streak: finalStreak.streak }, `連続: ${finalStreak.streak}日`)}`
        : '';
      ctx.showToast?.(t('anki.session_complete_toast', { count: finalGoal.count, streak: streakTxt }, `本日の復習完了。本日: ${finalGoal.count}語${streakTxt}`), 'ok', 4000);
      showSessionSummary(ctx, appState._sessionReviewedItems || []);
    }
  }

  /**
   * 復習完了時の「今日伸びた語根ネットワーク領域」ビジュアルフィードバック
   */
  function showSessionSummary(ctx = {}, reviewedItems = []) {
    const aCard = $('aCard');
    const aDiv = $('aDiv'), aBack = $('aBack'), aRat = $('aRat'), btnAns = $('btnAns');
    if (aDiv) aDiv.style.display = 'none';
    if (aBack) aBack.style.display = 'none';
    if (aRat) aRat.style.display = 'none';
    if (btnAns) btnAns.style.display = 'none';

    const finalGoal = getDailyGoalInfo(ctx);
    const finalStreak = getStreakInfo(ctx);
    const t = global.VocabI18n?.t || ((k, p, d) => d || k);
    const streakTxt = finalStreak.streak > 0
      ? t('anki.streak_achieved', { streak: finalStreak.streak }, `${finalStreak.streak}日連続達成`)
      : '';

    // 語根ごとの成長集計
    const rootGrowthMap = new Map();
    let correctCount = 0;
    (reviewedItems || []).forEach(it => {
      if (it.rating >= 2) correctCount++;
      const sGrowth = Math.max(0, it.stabilityAfter - it.stabilityBefore);
      (it.roots || []).forEach(r => {
        if (!r || typeof r !== 'string' || !r.startsWith('*')) return;
        const cur = rootGrowthMap.get(r) || { count: 0, growth: 0 };
        cur.count++;
        cur.growth += sGrowth;
        rootGrowthMap.set(r, cur);
      });
    });

    const totalRev = reviewedItems.length;
    const accuracy = totalRev > 0 ? Math.round((correctCount / totalRev) * 100) : 100;
    const topRoots = [...rootGrowthMap.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    const tL = global.App?.tgtLang || global.VocabI18n?.getLocale?.() || 'ja';
    const isJa = tL === 'ja';

    // [P2-2 解決] 全10言語対応のセッション完了UIテキストマッピング
    const emptyRootsMsgMap = {
      ja: '語源ネットワークの記憶定着度が向上しました。',
      en: 'Etymological root network retention reinforced.',
      fr: 'La rétention du réseau étymologique a été renforcée.',
      de: 'Die Behaltensleistung des etymologischen Netzwerks wurde gestärkt.',
      es: 'Se ha reforzado la retención de la red etimológica.',
      it: 'La ritenzione della rete etimologica è stata rafforzata.',
      pt: 'A retenção da rede etimológica foi reforçada.',
      nl: 'De retentie van het etymologische netwerk is versterkt.',
      zh: '词源网络的记忆牢固度已提升。',
      ko: '어원 네트워크의 기억 정착도가 향상되었습니다.'
    };
    const sessCompTitleMap = {
      ja: '本日の復習セッション完了',
      en: 'Daily Review Session Complete',
      fr: 'Session de révision terminée',
      de: 'Tägliche Wiederholung abgeschlossen',
      es: 'Sesión de repaso completada',
      it: 'Sessione di ripasso completata',
      pt: 'Sessão de revisão concluída',
      nl: 'Herhalingssessie voltooid',
      zh: '今日复习已完成',
      ko: '오늘의 복습 세션 완료'
    };
    const todayReviewedLblMap = {
      ja: '語復習完了',
      en: 'words reviewed',
      fr: 'mots révisés',
      de: 'Wörter wiederholt',
      es: 'palabras repasadas',
      it: 'parole ripassate',
      pt: 'palavras revisadas',
      nl: 'woorden herhaald',
      zh: '词已复习',
      ko: '단어 복습 완료'
    };
    const accuracyLblMap = {
      ja: '正答率',
      en: 'Accuracy',
      fr: 'Précision',
      de: 'Genauigkeit',
      es: 'Precisión',
      it: 'Precisione',
      pt: 'Precisão',
      nl: 'Nauwkeurigheid',
      zh: '正确率',
      ko: '정답률'
    };
    const rootsHeadingMap = {
      ja: '本日成長した語根ネットワーク領域',
      en: 'Roots Strengthened Today',
      fr: 'Racines renforcées aujourd’hui',
      de: 'Heute gestärkte Wortwurzeln',
      es: 'Raíces fortalecidas hoy',
      it: 'Radici rafforzate oggi',
      pt: 'Raízes fortalecidas hoje',
      nl: 'Vandaag versterkte wortels',
      zh: '今日强化的词根网络',
      ko: '오늘 성장한 어근 네트워크'
    };
    const backBtnLblMap = {
      ja: '一覧に戻る',
      en: 'Back to List',
      fr: 'Retour à la liste',
      de: 'Zurück zur Liste',
      es: 'Volver a la lista',
      it: 'Torna all\'elenco',
      pt: 'Voltar à lista',
      nl: 'Terug naar de lijst',
      zh: '返回列表',
      ko: '목록으로 돌아가기'
    };
    const reinforcedLblMap = {
      ja: '語 定着強化',
      en: ' words reinforced',
      fr: ' mots renforcés',
      de: ' Wörter gestärkt',
      es: ' palabras reforzadas',
      it: ' parole rafforzate',
      pt: ' palavras reforçadas',
      nl: ' woorden versterkt',
      zh: ' 词定着强化',
      ko: ' 단어 정착 강화'
    };
    const stabilityUpLblMap = {
      ja: '安定度UP',
      en: 'Stability UP',
      fr: 'Stabilité +',
      de: 'Stabilität +',
      es: 'Estabilidad +',
      it: 'Stabilità +',
      pt: 'Estabilidade +',
      nl: 'Stabiliteit +',
      zh: '稳定度UP',
      ko: '안정도UP'
    };
    const treeBtnLblMap = {
      ja: '系統樹',
      en: 'Tree',
      fr: 'Arbre',
      de: 'Stammbaum',
      es: 'Árbol',
      it: 'Albero',
      pt: 'Árvore',
      nl: 'Boom',
      zh: '谱系树',
      ko: '계통수'
    };
    const analyticsBtnLblMap = {
      ja: '定着率・分析を見る',
      en: 'View Retention Analytics',
      fr: 'Voir les analyses de rétention',
      de: 'Behaltensanalysen anzeigen',
      es: 'Ver análisis de retención',
      it: 'Vedi analisi di ritenzione',
      pt: 'Ver análises de retenção',
      nl: 'Bekijk retentie-analyse',
      zh: '查看记忆定着率分析',
      ko: '기억 정착도 분석 보기'
    };
    const todayPrefixMap = {
      ja: '本日',
      en: 'Today',
      fr: 'Aujourd\'hui',
      de: 'Heute',
      es: 'Hoy',
      it: 'Oggi',
      pt: 'Hoje',
      nl: 'Vandaag',
      zh: '今日',
      ko: '오늘'
    };

    const emptyRootsMsg = emptyRootsMsgMap[tL] || emptyRootsMsgMap.en;
    const sessCompTitle = sessCompTitleMap[tL] || sessCompTitleMap.en;
    const todayReviewedLbl = todayReviewedLblMap[tL] || todayReviewedLblMap.en;
    const todayPrefix = todayPrefixMap[tL] || todayPrefixMap.en;
    const accuracyLbl = accuracyLblMap[tL] || accuracyLblMap.en;
    const rootsHeading = rootsHeadingMap[tL] || rootsHeadingMap.en;
    const backBtnLbl = backBtnLblMap[tL] || backBtnLblMap.en;
    const reinforcedLbl = reinforcedLblMap[tL] || reinforcedLblMap.en;
    const stabilityUpLbl = stabilityUpLblMap[tL] || stabilityUpLblMap.en;
    const treeBtnLbl = treeBtnLblMap[tL] || treeBtnLblMap.en;
    const analyticsBtnLbl = analyticsBtnLblMap[tL] || analyticsBtnLblMap.en;

    const rootListHtml = topRoots.length > 0 ? topRoots.map(([r, d]) => {
      const growthPct = Math.min(100, Math.round((d.growth / Math.max(1, d.count)) * 20));
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--bg-hov);border:1px solid var(--b);border-radius:6px;margin-bottom:6px">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-family:var(--mono);font-weight:700;color:var(--ac);font-size:13px">${esc(r)}</span>
            <span style="font-size:11px;color:var(--s)">${d.count}${reinforcedLbl}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:11px;font-weight:700;color:var(--ok)">+${Math.max(12, growthPct)}% ${stabilityUpLbl}</span>
            <button type="button" class="btn-xs btn-o" data-act="open-graph" data-root="${esc(r)}">${treeBtnLbl}</button>
          </div>
        </div>
      `;
    }).join('') : `<div style="font-size:12px;color:var(--s);text-align:center;padding:12px">${emptyRootsMsg}</div>`;

    if (aCard) {
      // [P1-6 解決] aCard の DOM 構造を破壊せず専用サマリーコンテナに描画
      let summaryWrap = $('aSessionSummaryWrap');
      if (!summaryWrap && typeof document !== 'undefined' && typeof document.createElement === 'function') {
        try {
          summaryWrap = document.createElement('div');
          summaryWrap.id = 'aSessionSummaryWrap';
          if (typeof aCard.appendChild === 'function') aCard.appendChild(summaryWrap);
        } catch {}
      }
      if (aCard.children) {
        try {
          Array.from(aCard.children).forEach(child => {
            if (child !== summaryWrap && child && child.style) child.style.display = 'none';
          });
        } catch {}
      }
      const targetEl = summaryWrap || aCard;
      if (targetEl && targetEl.style) targetEl.style.display = 'block';

      targetEl.innerHTML = `
        <div style="padding:24px 20px;text-align:center">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:50%;background:rgba(16,185,129,0.15);color:var(--ok);margin-bottom:12px">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2 style="font-size:18px;font-weight:750;color:var(--t);margin:0 0 6px">${sessCompTitle}</h2>
          <p style="font-size:12.5px;color:var(--s);margin:0 0 16px">${todayPrefix}: <strong>${finalGoal.count}</strong> ${todayReviewedLbl} ${streakTxt ? `(${streakTxt})` : ''} / ${accuracyLbl}: <strong>${accuracy}%</strong></p>

          <div style="text-align:left;margin-bottom:18px">
            <div style="font-size:12px;font-weight:700;color:var(--t);margin-bottom:8px">${rootsHeading}</div>
            ${rootListHtml}
          </div>

          <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap">
            <button type="button" class="btn-ac" id="btnFinishAnkiSession" style="padding:9px 24px;font-size:13px;font-weight:600">${backBtnLbl}</button>
            <button type="button" class="btn-o" id="btnSummaryAnalytics" data-act="open-analytics" style="padding:9px 18px;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:5px"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>${analyticsBtnLbl}</button>
          </div>
        </div>
      `;
      $('btnFinishAnkiSession')?.addEventListener?.('click', () => exitAnki(ctx));
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
        // [NEW-P2-3 修正] オフライン復習キューからもUndo対象カードの最新レコードを取り消す
        const rawOffQ = localStorage.getItem('vv_offline_review_queue');
        if (rawOffQ) {
          const offQ = JSON.parse(rawOffQ);
          if (Array.isArray(offQ) && offQ.length > 0) {
            for (let qi = offQ.length - 1; qi >= 0; qi--) {
              if (offQ[qi] && (offQ[qi].id === last.id || (offQ[qi].word === e.word && offQ[qi].lang === (e.lang || 'en')))) {
                offQ.splice(qi, 1);
                localStorage.setItem('vv_offline_review_queue', JSON.stringify(offQ));
                break;
              }
            }
          }
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
  let _workloadForecastDays = 14;
  let _workloadTargetCap = 25;

  function buildAnalyticsDashboardHtml(options = {}) {
    const list = options.list || (global.VocabCore?.App?.entries || []);
    const retrievability = getOverallRetrievabilityStats(list);
    const heatmap = getCommitHeatmapData(63, options);
    const forecastDays = options.days || _workloadForecastDays || 14;
    _workloadForecastDays = forecastDays;
    const workload = getFutureWorkloadData(forecastDays, list);
    const fsrsWeights = global.VocabSRS?.getUserFSRSWeights ? global.VocabSRS.getUserFSRSWeights() : null;
    const reviewLogs = global.VocabSRS?.getReviewHistoryLog ? global.VocabSRS.getReviewHistoryLog() : [];

    const curLoc = options.locale || global.VocabI18n?.getLocale?.() || 'ja';
    const isEn = curLoc !== 'ja';
    const t = (k, p, def) => (global.VocabI18n?.t ? global.VocabI18n.t(k, p, def) : def);

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
      <div class="heatmap-cell l-${c.level}" title="${c.date}: ${c.count}${isEn ? ' words reviewed' : '語復習'}"></div>
    `).join('');

    const chartBarsHtml = workload.workload.map(w => {
      const pct = Math.max(4, Math.round((w.count / workload.maxCount) * 100));
      const isToday = w.dayOffset === 0;
      const isHeavy = w.count >= 30;
      return `
        <div class="workload-bar-col" title="${w.date} (${w.label}): ${w.count}${isEn ? ' words' : '語'}">
          <span class="workload-val">${w.count > 0 ? w.count : ''}</span>
          <div class="workload-bar ${isToday ? 'today' : ''} ${isHeavy ? 'heavy' : ''}" style="height:${pct}%;"></div>
          <span class="workload-label">${w.shortDate}</span>
        </div>
      `;
    }).join('');

    const calendarCellsHtml = workload.workload.map(w => {
      let level = 0;
      if (w.count > 0 && w.count <= 10) level = 1;
      else if (w.count <= 20) level = 2;
      else if (w.count <= 30) level = 3;
      else if (w.count > 30) level = 4;

      const isToday = w.dayOffset === 0;
      const levelLabels = isEn ? ['0 words', 'Calm', 'Normal', 'Heavy', 'Peak Overload'] : ['0語', '快適', '適正', '注意', '過密'];
      const levelText = levelLabels[level] || '適正';
      const badgeTitle = `${w.date} (${w.label}): ${w.count}${isEn ? ' words scheduled' : '語の復習予定'}`;
      return `
        <div class="workload-day-cell l-${level} ${isToday ? 'today' : ''}" title="${badgeTitle}" data-act="show-day-workload" data-date="${esc(w.date)}" data-count="${w.count}" onclick="VocabAnkiView.showDayWorkloadDetails('${esc(w.date)}', ${w.count})">
          <div class="day-header">${w.shortDate}${isToday ? (isEn ? ' (Today)' : ' (本日)') : ''}</div>
          <div class="day-count">${w.count}</div>
          <span class="day-pill">${levelText}</span>
        </div>
      `;
    }).join('');

    const peakDay = workload.workload.reduce((max, w) => (w.count > max.count ? w : max), { count: 0, date: '-', label: '-' });
    const isPeakHeavy = peakDay.count > _workloadTargetCap;

    const optStatusHtml = fsrsWeights
      ? `<span class="badge ok">${t('analytics.badge_optimized', { count: fsrsWeights.logCount || reviewLogs.length, imp: fsrsWeights.improvement || '0' }, isEn ? `Optimized (${fsrsWeights.logCount || reviewLogs.length} reviews / +${fsrsWeights.improvement || '0'}% precision)` : `最適化中 (${fsrsWeights.logCount || reviewLogs.length}件 / 精度+${fsrsWeights.improvement || '0'}%)`)}</span>`
      : reviewLogs.length >= 20
        ? `<span class="badge ok">${t('analytics.badge_ready', { count: reviewLogs.length }, isEn ? `Ready to Optimize (${reviewLogs.length} reviews logged)` : `最適化可能 (${reviewLogs.length}件蓄積)`)}</span>`
        : `<span class="badge" style="background:var(--b);color:var(--s)">${t('analytics.badge_init', { count: reviewLogs.length }, isEn ? `Standard Weights (${reviewLogs.length}/20 reviews)` : `初期係数 (${reviewLogs.length}/20件蓄積)`)}</span>`;

    const curPair = global.VocabCore?.getActivePairConfig ? global.VocabCore.getActivePairConfig() : null;
    const pairLabel = curPair ? (curPair.name || curPair.label || '') : '';

    return `
      <div class="analytics-grid">
        <div class="analytics-card">
          <div class="analytics-card-hd">
            <span data-i18n="analytics.retrievability_title">全体平均想起率 (Retrievability)${pairLabel ? ` <small style="color:var(--s);font-size:11px">(${esc(pairLabel)})</small>` : ''}</span>
            <span class="badge ok" data-i18n="analytics.memory_health">記憶健康度</span>
          </div>
          <div class="analytics-retrievability-wrap">
            ${gaugeHtml}
            <div style="flex:1;font-size:12px;line-height:1.6">
              <div style="font-weight:700;color:var(--t)"><span data-i18n="analytics.retrievability">現在の記憶維持率:</span> <strong style="color:${gradeColor}">${retrievability.avgPct}</strong></div>
              <div style="color:var(--s)">• <span data-i18n="analytics.stable">安定定着 (R≥90%):</span> <strong>${retrievability.stable} <span data-i18n="common.unit_words">語</span></strong></div>
              <div style="color:var(--s)">• <span data-i18n="analytics.borderline">境界領域 (70%≤R&lt;90%):</span> <strong>${retrievability.borderline} <span data-i18n="common.unit_words">語</span></strong></div>
              <div style="color:var(--s)">• <span data-i18n="analytics.critical">忘却危機 (R&lt;70%):</span> <strong style="color:#ef4444">${retrievability.critical} <span data-i18n="common.unit_words">語</span></strong></div>
            </div>
          </div>
        </div>

        <div class="analytics-card">
          <div class="analytics-card-hd">
            <span data-i18n="analytics.fsrs_weights">個人適応型 FSRS 重み</span>
            ${optStatusHtml}
          </div>
          <div style="font-size:12px;color:var(--s);line-height:1.6">
            <p style="margin:0 0 8px 0">${t('analytics.fsrs_weights_desc', { count: reviewLogs.length })}</p>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
              <span class="badge" style="background:var(--b);font-family:monospace;font-size:11px" title="${isEn ? 'Stability Scaling Factor' : '安定度スケーリング係数'}">S-Scale: ${Number(fsrsWeights?.sScale || 1.0).toFixed(2)}x</span>
              <span class="badge" style="background:var(--b);font-family:monospace;font-size:11px" title="${isEn ? 'Forgetting Curve Decay Rate (Negative Exponent)' : '忘却曲線の減衰率（負の指数）'}">Decay: ${Number(fsrsWeights?.decayFactor || -0.5).toFixed(2)}</span>
              <span class="badge" style="background:var(--b);font-family:monospace;font-size:11px" title="${isEn ? 'Next Interval Multiplier on Hard' : 'Hard評価時の次回係数'}">Hard: ${Number(fsrsWeights?.wHard || 0.8).toFixed(2)}x</span>
              <span class="badge" style="background:var(--b);font-family:monospace;font-size:11px" title="${isEn ? 'Next Interval Multiplier on Good' : 'Good評価時の次回係数'}">Good: ${Number(fsrsWeights?.wGood || 1.2).toFixed(2)}x</span>
              <span class="badge" style="background:var(--b);font-family:monospace;font-size:11px" title="${isEn ? 'Next Interval Multiplier on Easy' : 'Easy評価時の次回係数'}">Easy: ${Number(fsrsWeights?.wEasy || 1.6).toFixed(2)}x</span>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button type="button" class="btn-ac-o btn-xs" data-act="manual-optimize" data-i18n="analytics.btn_optimize">${t('analytics.btn_optimize', '今すぐFSRS最適化を実行')}</button>
              <button type="button" class="btn-o btn-xs" data-act="reset-weights" data-i18n="analytics.btn_reset_weights">${t('analytics.btn_reset_weights', '標準重みにリセット')}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="analytics-card" style="margin-top:14px">
        <div class="analytics-card-hd">
          <span data-i18n="analytics.heatmap_title">学習コミットヒートマップ (過去9週間)</span>
          <span style="font-size:12px;color:var(--s)">${t('analytics.heatmap_stats', { total: heatmap.totalReviews, streak: heatmap.streak }, isEn ? `Total: <strong>${heatmap.totalReviews} words</strong> | Streak: <strong>${heatmap.streak} days</strong>` : `累計: <strong>${heatmap.totalReviews}語</strong> | 連続: <strong>${heatmap.streak}日</strong>`)}</span>
        </div>
        <div class="heatmap-wrap">
          <div class="heatmap-grid">
            ${heatmapCellsHtml}
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;align-items:center;gap:4px;font-size:10px;color:var(--m)">
          <span data-i18n="analytics.less">少</span>
          <div class="heatmap-cell l-0" style="display:inline-block"></div>
          <div class="heatmap-cell l-1" style="display:inline-block"></div>
          <div class="heatmap-cell l-2" style="display:inline-block"></div>
          <div class="heatmap-cell l-3" style="display:inline-block"></div>
          <div class="heatmap-cell l-4" style="display:inline-block"></div>
          <span data-i18n="analytics.more">多</span>
        </div>
      </div>

      <div class="analytics-card" style="margin-top:14px">
        <div class="analytics-card-hd">
          <div style="display:flex;align-items:center;gap:8px">
            <span data-i18n="analytics.workload_title">向こうの日別予測復習負荷 (Workload Forecast)</span>
            <div class="workload-range-btns" style="display:flex;gap:4px">
              <button type="button" class="btn-o btn-xs ${forecastDays === 7 ? 'active' : ''}" data-act="set-workload-days" data-days="7">7日</button>
              <button type="button" class="btn-o btn-xs ${forecastDays === 14 ? 'active' : ''}" data-act="set-workload-days" data-days="14">14日</button>
              <button type="button" class="btn-o btn-xs ${forecastDays === 30 ? 'active' : ''}" data-act="set-workload-days" data-days="30">30日</button>
            </div>
          </div>
          <span style="font-size:12px;color:var(--s)">${t('analytics.workload_total', { total: workload.totalUpcoming, days: forecastDays }, isEn ? `${forecastDays}-Day Total: <strong>${workload.totalUpcoming} words</strong>` : `${forecastDays}日合計: <strong>${workload.totalUpcoming}語</strong>`)}</span>
        </div>
        <div class="workload-chart">
          ${chartBarsHtml}
        </div>
        <p style="margin:6px 0 10px 0;font-size:11px;color:var(--m)" data-i18n="analytics.workload_note">※各バーは各日に復習満期を迎える予定単語数です。緑は本日分、赤は30語以上の過密日を示します。</p>

        <div style="margin-top:10px;padding-top:10px;border-top:1px dashed var(--b)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-size:11px;font-weight:700;color:var(--t)" data-i18n="analytics.calendar_heatmap_title">日別復習予測カレンダー (クリックで該当日詳細プレビュー)</span>
            <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--m)">
              <span class="day-pill" style="background:rgba(16,185,129,0.15);color:#10b981">快適 (1-10)</span>
              <span class="day-pill" style="background:rgba(59,130,246,0.15);color:#3b82f6">適正 (11-20)</span>
              <span class="day-pill" style="background:rgba(245,158,11,0.18);color:#f59e0b">注意 (21-30)</span>
              <span class="day-pill" style="background:rgba(239,68,68,0.2);color:#ef4444">過密 (31+)</span>
            </div>
          </div>
          <div class="workload-calendar-grid">
            ${calendarCellsHtml}
          </div>
        </div>
      </div>

      <div class="analytics-card" style="margin-top:14px">
        <div class="analytics-card-hd">
          <span data-i18n="analytics.smoothing_title">復習負荷のスマート平滑化 &amp; バッファ調整 (Workload Smoothing)</span>
          <span class="badge ${isPeakHeavy ? 'warn' : 'ok'}">
            ${isPeakHeavy ? (isEn ? 'Peak Overload Detected' : '特定日過密あり') : (isEn ? 'Load Balanced' : '負荷バランス良好')}
          </span>
        </div>
        <div style="font-size:12px;color:var(--s);line-height:1.6">
          <p style="margin:0 0 10px 0" data-i18n="analytics.smoothing_desc">
            連休や多忙期の復習スパイクによる挫折を防ぐため、記憶定着度が高い安全な単語（R≥85%）を前後の空き日へなだらかに再配分（ファジング）します。
          </p>
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:10px 12px;background:var(--bg-card);border:1px solid var(--b);border-radius:6px">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-weight:700;color:var(--t)" data-i18n="analytics.target_cap_lbl">1日の目標復習上限:</span>
              <select id="workloadCapSelect" class="input-sm" style="padding:4px 8px;border-radius:4px;border:1px solid var(--b);background:var(--bg);color:var(--t)">
                <option value="15" ${_workloadTargetCap === 15 ? 'selected' : ''}>15語 / 日 (ゆったり)</option>
                <option value="20" ${_workloadTargetCap === 20 ? 'selected' : ''}>20語 / 日 (標準)</option>
                <option value="25" ${_workloadTargetCap === 25 ? 'selected' : ''}>25語 / 日 (推奨)</option>
                <option value="30" ${_workloadTargetCap === 30 ? 'selected' : ''}>30語 / 日 (集中)</option>
                <option value="40" ${_workloadTargetCap === 40 ? 'selected' : ''}>40語 / 日 (高負荷)</option>
              </select>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <span style="font-size:11px;color:var(--m)">最大集中日: <strong style="color:${isPeakHeavy ? '#ef4444' : 'var(--t)'}">${peakDay.date} (${peakDay.count}語)</strong></span>
              <button type="button" class="btn-ac btn-sm" data-act="smooth-workload" style="font-weight:700;padding:5px 14px" data-i18n="analytics.btn_smooth">
                過密日を平滑化 (Fuzz &amp; Smooth)
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  let _isRenderingAnalytics = false;
  function renderAnalyticsDashboard(containerId = 'analyticsDashboardBody') {
    if (_isRenderingAnalytics) return;
    const el = document.getElementById(containerId);
    if (!el) return;
    _isRenderingAnalytics = true;
    try {
      el.innerHTML = buildAnalyticsDashboardHtml();
      if (global.VocabI18n?.applyI18nToDOM) {
        global.VocabI18n.applyI18nToDOM(el);
      }
    } catch (err) {
      console.warn('[Analytics Render Error]', err);
      const errTxt = global.VocabI18n?.t ? global.VocabI18n.t('analytics.load_error', 'データの集計中にエラーが発生しました。単語一覧を更新してください。') : 'データの集計中にエラーが発生しました。単語一覧を更新してください。';
      el.innerHTML = `<div style="padding:24px 16px;text-align:center;color:var(--s)">${errTxt}</div>`;
    } finally {
      _isRenderingAnalytics = false;
    }
  }

  function openAnalyticsModal() {
    renderAnalyticsDashboard('analyticsDashboardBody');
    const toggleFn = (typeof global.toggleModal === 'function')
      ? global.toggleModal
      : (typeof global.VocabModal?.toggleModal === 'function')
        ? global.VocabModal.toggleModal
        : null;

    if (toggleFn) {
      toggleFn('analyticsModal', true);
    } else {
      const modal = document.getElementById('analyticsModal');
      if (modal) {
        modal.classList.add('open');
        modal.classList.add('active');
      }
    }
  }

  function closeAnalyticsModal() {
    const toggleFn = (typeof global.toggleModal === 'function')
      ? global.toggleModal
      : (typeof global.VocabModal?.toggleModal === 'function')
        ? global.VocabModal.toggleModal
        : null;

    if (toggleFn) {
      toggleFn('analyticsModal', false);
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
      const msg = global.VocabI18n?.t ? global.VocabI18n.t('analytics.optimize_ok', { count: res.count, imp: res.improvement }) : `FSRS重みを最適化しました（学習ログ ${res.count}件、予測精度向上: ${res.improvement}）。`;
      showToast(msg, 'ok', 4000);
      renderAnalyticsDashboard();
    } else {
      const msg = global.VocabI18n?.t ? global.VocabI18n.t('analytics.optimize_need_more') : (res.message || '学習ログが20件以上蓄積されると最適化可能です。');
      showToast(msg, 'info', 3500);
    }
  }

  function triggerResetWeights() {
    const confirmMsg = global.VocabI18n?.t ? global.VocabI18n.t('analytics.reset_confirm') : 'FSRS重み係数をデフォルトの初期値にリセットしますか？';
    if (typeof confirm === 'function' && !confirm(confirmMsg)) return;
    if (global.VocabSRS?.resetUserFSRSWeights) {
      global.VocabSRS.resetUserFSRSWeights();
      const showToast = global.VocabModal?.showToast || alert;
      const okMsg = global.VocabI18n?.t ? global.VocabI18n.t('analytics.reset_ok') : 'FSRS重みを初期値にリセットしました。';
      showToast(okMsg, 'ok');
      renderAnalyticsDashboard();
    }
  }

  function showDayWorkloadDetails(dateStr, count) {
    if (!dateStr) return;
    const list = global.VocabCore?.App?.entries || [];
    const todayYmd = (d) => {
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      return `${yr}-${mo}-${da}`;
    };

    const matching = list.filter(item => {
      if (!item || !item.nextReview || item.isDeleted) return false;
      return todayYmd(new Date(item.nextReview)) === dateStr;
    });

    const showToast = global.VocabModal?.showToast || alert;
    const wordsPreview = matching.map(x => x.word || x.foreign || '').filter(Boolean).slice(0, 6).join(', ');
    const moreText = matching.length > 6 ? ` ほか${matching.length - 6}語` : '';

    const isEn = (global.VocabI18n?.getLocale?.() || 'ja') !== 'ja';
    const detailMsg = isEn
      ? `${dateStr}: ${matching.length || count} words scheduled${wordsPreview ? ` (${wordsPreview}${moreText})` : ''}`
      : `${dateStr}: ${matching.length || count}語予定${wordsPreview ? ` (${wordsPreview}${moreText})` : ''}`;

    showToast(detailMsg, 'info', 4500);
  }

  function triggerWorkloadSmoothing() {
    const sel = document.getElementById('workloadCapSelect');
    const cap = sel ? Number(sel.value) : _workloadTargetCap;
    _workloadTargetCap = cap;

    const list = global.VocabCore?.App?.entries || [];
    if (!list.length) {
      const showToast = global.VocabModal?.showToast || alert;
      const emptyMsg = global.VocabI18n?.t ? global.VocabI18n.t('analytics.empty_entries', '平滑化対象の単語が登録されていません。') : '平滑化対象の単語が登録されていません。';
      showToast(emptyMsg, 'info');
      return;
    }

    if (!global.VocabSRS?.smoothReviewWorkload) return;
    const res = global.VocabSRS.smoothReviewWorkload(list, cap, _workloadForecastDays);
    const showToast = global.VocabModal?.showToast || alert;

    if (res.success && res.shiftedCount > 0) {
      const activeCfg = global.VocabCore?.getActivePairConfig ? global.VocabCore.getActivePairConfig() : null;
      const pairKey = activeCfg ? activeCfg.key : 'distinction_entries';
      if (typeof global.VocabCore?.setJson === 'function') {
        global.VocabCore.setJson(pairKey, list, true);
      } else if (typeof global.VocabStorage?.setJson === 'function') {
        global.VocabStorage.setJson(pairKey, list, true);
      } else if (typeof global.VocabStorage?.idbCommitLangData === 'function') {
        global.VocabStorage.idbCommitLangData(pairKey, list);
      }

      const okMsg = global.VocabI18n?.t
        ? global.VocabI18n.t('analytics.smooth_workload_ok', { count: res.shiftedCount, days: res.affectedDays })
        : `${res.shiftedCount}語の復習期日を平滑化・分散しました（影響日数: ${res.affectedDays}日）。`;
      showToast(okMsg, 'ok', 4000);
      renderAnalyticsDashboard();
    } else {
      const noneMsg = global.VocabI18n?.t
        ? global.VocabI18n.t('analytics.smooth_workload_none')
        : (res.message || '平滑化が必要な過密日はありません。目標上限はすでに満たされています。');
      showToast(noneMsg, 'info', 3500);
    }
  }

  // --- グローバルエクスポート ---
  global.VocabAnkiView = {
    getAnkiMode,
    setAnkiMode,
    toggleAnkiMode,
    buildClozeSentenceHtml,
    buildClozeHintsHtml,
    checkClozeTyping,
    calcLevenshtein,
    getStemVariants,
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
    showSessionSummary,
    getCommitHeatmapData,
    getFutureWorkloadData,
    getOverallRetrievabilityStats,
    buildAnalyticsDashboardHtml,
    renderAnalyticsDashboard,
    openAnalyticsModal,
    closeAnalyticsModal,
    triggerManualOptimize,
    triggerResetWeights,
    showDayWorkloadDetails,
    triggerWorkloadSmoothing,
    smoothReviewWorkload: (...args) => global.VocabSRS?.smoothReviewWorkload?.(...args)
  };

  global.openAnalyticsModal = global.openAnalyticsModal || openAnalyticsModal;
  global.closeAnalyticsModal = global.closeAnalyticsModal || closeAnalyticsModal;

  // [P2-1 解決] CSP準拠のイベント委譲リスナー（インライン onclick / onkeydown の完全排除）
  if (typeof document !== 'undefined') {
    document.addEventListener('click', (event) => {
      const btn = event.target && typeof event.target.closest === 'function' ? event.target.closest('[data-act]') : null;
      if (!btn || typeof btn.getAttribute !== 'function') return;
      const act = btn.getAttribute('data-act');
      if (act === 'cloze-check') {
        window.VocabAnkiView?.checkClozeTyping?.();
      } else if (act === 'open-analytics') {
        openAnalyticsModal();
      } else if (act === 'close-analytics') {
        closeAnalyticsModal();
      } else if (act === 'manual-optimize') {
        triggerManualOptimize();
      } else if (act === 'reset-weights') {
        triggerResetWeights();
      } else if (act === 'smooth-workload') {
        triggerWorkloadSmoothing();
      } else if (act === 'set-workload-days') {
        const days = Number(btn.getAttribute('data-days')) || 14;
        _workloadForecastDays = days;
        renderAnalyticsDashboard();
      } else if (act === 'show-day-workload') {
        const dStr = btn.getAttribute('data-date');
        const cVal = Number(btn.getAttribute('data-count')) || 0;
        showDayWorkloadDetails(dStr, cVal);
      }
    });

    document.addEventListener('change', (event) => {
      if (event.target && event.target.id === 'workloadCapSelect') {
        _workloadTargetCap = Number(event.target.value) || 25;
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.target && typeof event.target.matches === 'function' && event.target.matches('[data-act="cloze-input"]')) {
        if (event.key === 'Enter' && !event.isComposing && event.keyCode !== 229) {
          event.preventDefault();
          window.VocabAnkiView?.checkClozeTyping?.();
        }
      }
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
