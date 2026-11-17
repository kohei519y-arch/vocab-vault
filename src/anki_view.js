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

  const esc = s => global.VocabStorage?.esc
    ? global.VocabStorage.esc(s)
    : (global.VocabCore?.esc ? global.VocabCore.esc(s) : String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])));

  const fmtPho = p => global.VocabStorage?.fmtPho
    ? global.VocabStorage.fmtPho(p)
    : (global.VocabCore?.fmtPho ? global.VocabCore.fmtPho(p) : (p ? `[ ${p} ]` : ''));

  const lsGet = (k, d = null) => global.VocabStorage?.lsGet
    ? global.VocabStorage.lsGet(k, d)
    : (global.VocabCore?.lsGet ? global.VocabCore.lsGet(k, d) : ((typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null) ?? d));

  const lsSet = (k, v) => global.VocabStorage?.lsSet
    ? global.VocabStorage.lsSet(k, v)
    : (global.VocabCore?.lsSet ? global.VocabCore.lsSet(k, v) : (typeof localStorage !== 'undefined' ? (localStorage.setItem(k, v), true) : false));

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
    const coreBadgeLabel = (tL === 'en' ? 'Core Concept' : (tL === 'de' ? 'Kernkonzept' : (tL === 'fr' ? 'Concept Clé' : (tL === 'es' ? 'Concepto Clave' : (tL === 'it' ? 'Concetto Chiave' : (tL === 'pt' ? 'Conceito Central' : (tL === 'nl' ? 'Kernconcept' : (tL === 'ko' ? '코아이미지' : (tL === 'zh' ? '核心概念' : 'コアイメージ')))))))));

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
    const nuanceComp = global.VocabMorphology?.buildNuanceComparison ? global.VocabMorphology.buildNuanceComparison(item.word) : null;
    const nuanceHtml = nuanceComp ? (global.VocabMorphology?.renderNuanceComparisonHtml ? global.VocabMorphology.renderNuanceComparisonHtml(nuanceComp) : '') : '';
    const timeline = global.VocabMorphology?.buildSemanticTimeline ? global.VocabMorphology.buildSemanticTimeline(item, tL) : null;
    const timelineHtml = timeline ? (global.VocabMorphology?.renderSemanticTimelineHtml ? global.VocabMorphology.renderSemanticTimelineHtml(timeline) : '') : '';
    const hasEty = Boolean(item.etymology || item.history_note || (item.derivatives && item.derivatives.length) || matrixHtml || nuanceHtml || timelineHtml);

    const etyLbl = (tL === 'en' ? 'Etymology' : (tL === 'de' ? 'Etymologie' : (tL === 'fr' ? 'Étymologie' : (tL === 'es' ? 'Etimología' : (tL === 'it' ? 'Etimologia' : (tL === 'pt' ? 'Etimologia' : (tL === 'nl' ? 'Etymologie' : (tL === 'ko' ? '어원' : (tL === 'zh' ? '词源' : '語源')))))))));
    const histLbl = (tL === 'en' ? 'History & Context' : (tL === 'de' ? 'Geschichte & Kontext' : (tL === 'fr' ? 'Histoire & Contexte' : (tL === 'es' ? 'Historia y Contexto' : (tL === 'it' ? 'Storia e Contesto' : (tL === 'pt' ? 'História e Contexto' : (tL === 'nl' ? 'Geschiedenis & Context' : (tL === 'ko' ? '개념사·배경' : (tL === 'zh' ? '概念史·背景' : '概念史・背景')))))))));
    const drvLbl = (tL === 'en' ? 'Derivatives' : (tL === 'de' ? 'Ableitungen' : (tL === 'fr' ? 'Dérivés' : (tL === 'es' ? 'Derivados' : (tL === 'it' ? 'Derivati' : (tL === 'pt' ? 'Derivados' : (tL === 'nl' ? 'Afleidingen' : (tL === 'ko' ? '파생어' : (tL === 'zh' ? '衍生词' : '派生語')))))))));
    const summaryLbl = (tL === 'en' ? 'Expand Deep Etymology & Cognates' : (tL === 'de' ? 'Tiefenetymologie & Kognaten anzeigen' : (tL === 'fr' ? 'Développer étymologie & mots apparentés' : (tL === 'es' ? 'Desplegar etimología profunda y cognados' : (tL === 'it' ? 'Mostra etimologia profonda e parole affini' : (tL === 'pt' ? 'Expandir etimologia profunda e cognatos' : (tL === 'nl' ? 'Diepe etymologie & verwante woorden weergeven' : (tL === 'ko' ? '심층 어원·개념사·동근어 펼치기' : (tL === 'zh' ? '展开深层词源·概念史·同源词' : '深層語源・概念史・4言語同根語を展開')))))))));

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
            ${timelineHtml}
            ${matrixHtml}
            ${nuanceHtml}
            ${histText}
            ${derivsText}
          </div>
        </details>
      `;
    }

    // 5. 実践アウトプット: AI短文ライティング添削（Contextual Output Arena）
    const writeArenaLbl = (tL === 'en' ? 'Contextual Writing Arena (Instant AI Coach)' : (tL === 'de' ? 'Satzbau & Schreibwerkstatt' : (tL === 'fr' ? 'Atelier de rédaction contextuelle' : (tL === 'es' ? 'Taller de redacción contextual' : (tL === 'it' ? 'Laboratorio di scrittura contestuale' : (tL === 'pt' ? 'Oficina de redação contextual' : (tL === 'nl' ? 'Contextuele schrijfarena' : (tL === 'ko' ? '단문 작문 실전 코칭 (Output Arena)' : (tL === 'zh' ? '语境造句自测与批改' : '短文ライティング添削（実戦産出）')))))))));
    const writePlaceholder = (tL === 'en' ? `Write a sentence using "${item.word}"...` : (tL === 'de' ? `Schreiben Sie einen Satz mit "${item.word}"...` : (tL === 'fr' ? `Écrivez une phrase avec "${item.word}"...` : (tL === 'es' ? `Escribe una frase con "${item.word}"...` : (tL === 'it' ? `Scrivi una frase con "${item.word}"...` : (tL === 'pt' ? `Escreva uma frase com "${item.word}"...` : (tL === 'nl' ? `Schrijf een zin met "${item.word}"...` : (tL === 'ko' ? `"${item.word}"를 사용한 문장을 입력하세요...` : (tL === 'zh' ? `使用 "${item.word}" 造一个句子...` : `「${item.word}」を使った短文を入力...`)))))))));
    const writeBtnLbl = (tL === 'en' ? 'Analyze & Score' : (tL === 'de' ? 'Analysieren & Bewerten' : (tL === 'fr' ? 'Analyser & Évaluer' : (tL === 'es' ? 'Analizar y Evaluar' : (tL === 'it' ? 'Analizza e Valuta' : (tL === 'pt' ? 'Analisar e Avaliar' : (tL === 'nl' ? 'Analyseren & Scoren' : (tL === 'ko' ? '문장 분석 및 채점' : (tL === 'zh' ? '分析并评分' : '文脈分析・採点')))))))));
    const writeAiBtnLbl = (tL === 'en' ? 'AI Deep Review' : (tL === 'de' ? 'KI-Feinkorrektur' : (tL === 'fr' ? 'Correction IA' : (tL === 'es' ? 'Revisión IA' : (tL === 'it' ? 'Revisione IA' : (tL === 'pt' ? 'Revisão IA' : (tL === 'nl' ? 'AI-nakijken' : (tL === 'ko' ? 'AI 정밀 첨삭' : (tL === 'zh' ? 'AI精细批改' : 'AI詳細添削')))))))));
    const hasByokKey = Boolean(typeof global.getKey === 'function' && global.getKey());

    const writingHtml = `
      <details class="anki-writing-details" style="margin-top:10px;border:1px dashed var(--ac);border-radius:6px;padding:8px 10px;background:var(--bg-hov);">
        <summary style="cursor:pointer;font-weight:600;font-size:12px;color:var(--ac);user-select:none;">${writeArenaLbl}</summary>
        <div style="margin-top:8px;">
          <textarea class="anki-writing-input" id="ankiWritingInput" rows="2" style="width:100%;box-sizing:border-box;border:1px solid var(--b);border-radius:4px;padding:6px 8px;font-size:13px;background:var(--bg-card);color:var(--t);resize:vertical;" placeholder="${esc(writePlaceholder)}"></textarea>
          <div style="margin-top:6px;display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;">
            <div style="display:flex;gap:6px;align-items:center;">
              <button type="button" class="btn-xs btn-p" data-act="analyze-writing" data-word="${esc(item.word)}">${writeBtnLbl}</button>
              <button type="button" class="btn-xs" data-act="analyze-writing-ai" data-word="${esc(item.word)}" style="display:${hasByokKey ? 'inline-flex' : 'none'};border:1px solid var(--ac);color:var(--ac);background:transparent;">${writeAiBtnLbl}</button>
            </div>
            <span class="anki-writing-feedback" id="ankiWritingFeedback" style="font-size:12px;color:var(--s);margin-left:4px;flex:1;line-height:1.45;"></span>
          </div>
        </div>
      </details>
    `;

    return `
      <div class="anki-back-clean">
        ${coreHtml}
        ${meaningsHtml}
        ${exampleHtml}
        ${etyHtml}
        ${writingHtml}
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

  const WRITING_FEEDBACK_I18N = {
    empty: {
      ja: '短文を入力してください。',
      en: 'Please enter a short sentence.',
      fr: 'Veuillez saisir une phrase courte.',
      de: 'Bitte geben Sie einen kurzen Satz ein.',
      es: 'Por favor, introduzca una frase corta.',
      it: 'Si prega di inserire una frase breve.',
      pt: 'Por favor, insira uma frase curta.',
      nl: 'Voer een korte zin in.',
      zh: '请输入一个短句。',
      ko: '단문을 입력해 주세요.'
    },
    missing: {
      ja: '文中に目標単語「{w}」またはその活用形が見つかりません。',
      en: 'Target word "{w}" or its inflections not found in your sentence.',
      fr: 'Le mot cible « {w} » ou ses formes fléchies sont introuvables.',
      de: 'Das Zielwort „{w}“ oder seine Beugungsformen wurden nicht gefunden.',
      es: 'No se encontró la palabra objetivo «{w}» ni sus formas derivadas.',
      it: 'La parola di destinazione "{w}" o le sue forme flesse non sono state trovate.',
      pt: 'A palavra-alvo "{w}" ou suas formas flexionadas não foram encontradas.',
      nl: 'Doelwoord "{w}" of verbuigingen niet gevonden in uw zin.',
      zh: '句子中未检测到目标单词 "{w}" 或其形态变化。',
      ko: '문장 내에 목표 단어 "{w}" 또는 활용형이 포함되어 있지 않습니다.'
    },
    tooShort: {
      ja: '文が短すぎます。より具体的な文脈を含めると表現力が向上します。',
      en: 'Sentence is too short. Adding richer context will improve expressive power.',
      fr: 'La phrase est trop courte. Développez le contexte pour enrichir l\'expression.',
      de: 'Der Satz ist zu kurz. Mehr Kontext fördert die Ausdruckskraft.',
      es: 'La frase es demasiado corta. Añadir más contexto enriquecerá su expresión.',
      it: 'La frase è troppo breve. Aggiungere più contesto migliorerà l\'espressione.',
      pt: 'A frase é muito curta. Adicione mais contexto para enriquecer a expressão.',
      nl: 'De zin is te kort. Voeg meer context toe om de uitdrukkingskracht te verbeteren.',
      zh: '句子过短。增加具体语境能更有效巩固核心概念。',
      ko: '문장이 너무 짧습니다. 구체적인 문맥을 추가하면 표현력이 향상됩니다.'
    },
    excellent: {
      ja: '自然で豊かな文脈が形成されています。語根コアイメージに合致した優秀な産出です。',
      en: 'Rich and natural context established. Excellent output aligned with root core meaning.',
      fr: 'Contexte riche et naturel. Excellente production fidèle au noyau sémantique.',
      de: 'Ausgezeichneter Kontext im Einklang mit dem Wurzelkernbild gebildet.',
      es: 'Contexto rico y natural. Excelente producción acorde con la raíz nuclear.',
      it: 'Contesto ricco e naturale. Ottima produzione allineata con l\'immagine nucleare.',
      pt: 'Contexto rico e natural. Excelente produção alinhada com o significado raiz.',
      nl: 'Rijke en natuurlijke context gevormd. Uitstekende uiting volgens de wortelkern.',
      zh: '语境丰富自然，准确契合词根核心意象的高质量输出。',
      ko: '자연스럽고 풍부한 문맥입니다. 어근 코아이미지에 부합하는 우수한 산출입니다.'
    },
    good: {
      ja: '目標単語が適切に文脈へ組み込まれています。',
      en: 'Target word is appropriately contextualized.',
      fr: 'Le mot cible est correctement intégré dans le contexte.',
      de: 'Das Zielwort wurde passend in den Kontext eingebunden.',
      es: 'La palabra objetivo está bien integrada en el contexto.',
      it: 'La parola è integrata appropriatamente nel contesto.',
      pt: 'A palavra-alvo foi inserida adequadamente no contexto.',
      nl: 'Het doelwoord is naar behoren ingebed in de context.',
      zh: '目标单词已恰当融入句子语境中。',
      ko: '목표 단어가 문맥에 적절히 반영되었습니다.'
    },
    cjkGood: {
      ja: '文脈に即した自然な用例が作成できています。',
      en: 'Natural contextual usage established.',
      fr: 'Usage contextuel naturel établi.',
      de: 'Natürliche kontextuelle Verwendung etabliert.',
      es: 'Uso contextual natural establecido.',
      it: 'Uso contestuale naturale stabilito.',
      pt: 'Uso contextual natural estabelecido.',
      nl: 'Natuurlijk contextueel gebruik vastgesteld.',
      zh: '用例自然且符合语境表达。',
      ko: '문맥에 부합하는 자연스러운 예문입니다.'
    },
    scorePrefix: {
      ja: '【評価: {s}点】',
      en: '[Score: {s}/100] ',
      fr: '[Note: {s}/100] ',
      de: '[Bewertung: {s}/100] ',
      es: '[Puntuación: {s}/100] ',
      it: '[Valutazione: {s}/100] ',
      pt: '[Pontuação: {s}/100] ',
      nl: '[Score: {s}/100] ',
      zh: '【评分: {s}分】',
      ko: '【평가: {s}점】'
    },
    corePrefix: {
      ja: ' コアイメージ: 「{c}」',
      en: ' Core Concept: "{c}"',
      fr: ' Cœur sémantique: «{c}»',
      de: ' Kernkonzept: „{c}“',
      es: ' Núcleo conceptual: «{c}»',
      it: ' Concetto nucleare: "{c}"',
      pt: ' Conceito nuclear: "{c}"',
      nl: ' Kernbegrip: "{c}"',
      zh: ' 核心概念: 「{c}」',
      ko: ' 코아 이미지: 「{c}」'
    },
    grammarHeader: {
      ja: '文法・表現の改善点: ',
      en: 'Grammar & usage notes: ',
      fr: 'Points à corriger : ',
      de: 'Grammatik- & Ausdruckshinweise: ',
      es: 'Notas de gramática y uso: ',
      it: 'Note grammaticali e d\'uso: ',
      pt: 'Notas de gramática e uso: ',
      nl: 'Grammatica- & stijltips: ',
      zh: '语法与表达建议: ',
      ko: '문법 및 표현 개선점: '
    },
    issueArticleMismatch: {
      ja: '「{bad}」→「{fix}」（後続語の発音に合わせた冠詞 a/an）',
      en: '"{bad}" -> "{fix}" (a/an sound agreement)',
      fr: '« {bad} » -> « {fix} » (accord de l\'article a/an)',
      de: '„{bad}“ -> „{fix}“ (Artikelwahl a/an)',
      es: '«{bad}» -> «{fix}» (concordancia del artículo a/an)',
      it: '"{bad}" -> "{fix}" (scelta dell\'articolo a/an)',
      pt: '"{bad}" -> "{fix}" (concordância do artigo a/an)',
      nl: '"{bad}" -> "{fix}" (lidwoord a/an)',
      zh: '「{bad}」->「{fix}」（冠词 a/an 需与后续发音匹配）',
      ko: '「{bad}」->「{fix}」（뒤따르는 발음에 맞는 관사 a/an 사용）'
    },
    issueMissingArticle: {
      ja: '「{bad}」→「{fix}」等（単数可算名詞には冠詞や限定詞が必要）',
      en: '"{bad}" -> "{fix}" (singular countable noun requires a determiner)',
      fr: '« {bad} » -> « {fix} » (nom dénombrable singulier sans déterminant)',
      de: '„{bad}“ -> „{fix}“ (zählbares Nomen im Singular benötigt Artikel)',
      es: '«{bad}» -> «{fix}» (sustantivo contable singular sin determinante)',
      it: '"{bad}" -> "{fix}" (nome numerabile singolare senza determinante)',
      pt: '"{bad}" -> "{fix}" (substantivo contável singular requer determinante)',
      nl: '"{bad}" -> "{fix}" (enkelvoudig telbaar zelfstandig naamwoord mist lidwoord)',
      zh: '「{bad}」->「{fix}」（单数可数名词前需加冠词或限定词）',
      ko: '「{bad}」->「{fix}」（단수 가산명사 앞에는 관사나 한정사가 필요합니다）'
    },
    issueSva: {
      ja: '「{bad}」→「{fix}」（主語と動詞の数・人称の一致）',
      en: '"{bad}" -> "{fix}" (subject-verb agreement)',
      fr: '« {bad} » -> « {fix} » (accord sujet-verbe)',
      de: '„{bad}“ -> „{fix}“ (Subjekt-Verb-Kongruenz)',
      es: '«{bad}» -> «{fix}» (concordancia sujeto-verbo)',
      it: '"{bad}" -> "{fix}" (accordo soggetto-verbo)',
      pt: '"{bad}" -> "{fix}" (concordância sujeito-verbo)',
      nl: '"{bad}" -> "{fix}" (onderwerp-persoonsvorm congruentie)',
      zh: '「{bad}」->「{fix}」（主谓一致）',
      ko: '「{bad}」->「{fix}」（주어와 동사의 수 일치）'
    },
    issueVerbForm: {
      ja: '「{bad}」（助動詞・to不定詞の直後は動詞の原形を使用）',
      en: '"{bad}" (use base verb form after modal/auxiliary/to)',
      fr: '« {bad} » (utilisez la base verbale après l\'auxiliaire/modal)',
      de: '„{bad}“ (Grundform des Verbs nach Hilfsverb/to verwenden)',
      es: '«{bad}» (use el verbo en forma base tras auxiliar/modal/to)',
      it: '"{bad}" (usare la forma base del verbo dopo modale/ausiliare/to)',
      pt: '"{bad}" (use o verbo na forma base após modal/auxiliar/to)',
      nl: '"{bad}" (gebruik het hele werkwoord na hulpwerkwoord/to)',
      zh: '「{bad}」（情态动词/助动词/to 后应使用动词原形）',
      ko: '「{bad}」（조동사·to 부정사 뒤에는 동사 원형을 사용하세요）'
    },
    issueDuplicate: {
      ja: '「{bad}」の重複',
      en: 'repeated word "{bad}"',
      fr: 'mot répété « {bad} »',
      de: 'Wortwiederholung „{bad}“',
      es: 'palabra repetida «{bad}»',
      it: 'parola ripetuta "{bad}"',
      pt: 'palavra repetida "{bad}"',
      nl: 'herhaald woord "{bad}"',
      zh: '单词重复「{bad}」',
      ko: '단어 중복 「{bad}」'
    },
    issueDoubleComp: {
      ja: '「{bad}」（二重比較級・最上級）',
      en: '"{bad}" (double comparative/superlative)',
      fr: '« {bad} » (double comparatif/superlatif)',
      de: '„{bad}“ (doppelter Komparativ/Superlativ)',
      es: '«{bad}» (doble comparativo/superlativo)',
      it: '"{bad}" (doppio comparativo/superlativo)',
      pt: '"{bad}" (duplo comparativo/superlativo)',
      nl: '"{bad}" (dubbele vergrotende/overtreffende trap)',
      zh: '「{bad}」（避免双重比较级/最高级）',
      ko: '「{bad}」（이중 비교급·최상급 오류）'
    },
    issueCapital: {
      ja: '文頭（および英語の一人称 I）は大文字で始めましょう',
      en: 'capitalize the first letter (and pronoun "I")',
      fr: 'commencez la phrase par une majuscule',
      de: 'Satzanfang großschreiben',
      es: 'comience la oración con mayúscula',
      it: 'inizia la frase con la lettera maiuscola',
      pt: 'inicie a frase com letra maiúscula',
      nl: 'begin de zin met een hoofdletter',
      zh: '句首字母（及英文第一人称 I）应大写',
      ko: '문장 첫 글자(및 영어 대명사 I)는 대문자로 쓰세요'
    },
    issuePunctuation: {
      ja: '文末に句読点（. ! ?）を補いましょう',
      en: 'add ending punctuation (. ! ?)',
      fr: 'ajoutez une ponctuation finale (. ! ?)',
      de: 'Satzzeichen am Ende ergänzen (. ! ?)',
      es: 'añada puntuación final (. ! ?)',
      it: 'aggiungi la punteggiatura finale (. ! ?)',
      pt: 'adicione pontuação final (. ! ?)',
      nl: 'voeg eindpunctuatie toe (. ! ?)',
      zh: '请在句末加上标点符号',
      ko: '문장 끝에 마침표(. ! ?)를 추가하세요'
    },
    issueNoVerb: {
      ja: '述語動詞が不足している可能性があります（完全な文にしましょう）',
      en: 'sentence may lack a main verb/predicate',
      fr: 'la phrase semble manquer de verbe principal',
      de: 'dem Satz fehlt möglicherweise ein finites Verb',
      es: 'la oración puede carecer de verbo principal',
      it: 'la frase potrebbe essere priva di un verbo principale',
      pt: 'a frase pode estar sem verbo principal',
      nl: 'de zin mist mogelijk een hoofdwerkwoord',
      zh: '句子可能缺少谓语动词，建议补全完整句式',
      ko: '문장에 서술어(동사)가 부족할 수 있습니다'
    },
    issueRepetition: {
      ja: '同じ語の反復が多いため、より多様な語彙で文脈を広げましょう',
      en: 'excessive word repetition; vary vocabulary for richer context',
      fr: 'trop de répétitions ; variez le vocabulaire',
      de: 'zu viele Wortwiederholungen; nutzen Sie vielfältigeren Wortschatz',
      es: 'demasiada repetición; varíe su vocabulario',
      it: 'troppe ripetizioni; varia il lessico',
      pt: 'muita repetição; varie o vocabulário',
      nl: 'te veel herhaling; varieer uw woordenschat',
      zh: '词汇重复过多，建议丰富上下文表达',
      ko: '같은 단어 반복이 많습니다. 다양한 어휘로 문맥을 넓혀 보세요'
    },
    issueCopiedExample: {
      ja: 'カードの例文と同一です。自分の言葉でオリジナル短文を作ってみましょう',
      en: 'identical to the card example; write your own original sentence',
      fr: 'identique à l\'exemple de la carte ; rédigez votre propre phrase',
      de: 'identisch mit dem Kartenbeispiel; formulieren Sie einen eigenen Satz',
      es: 'idéntico al ejemplo de la tarjeta; escriba su propia oración',
      it: 'identico all\'esempio della scheda; scrivi una frase originale',
      pt: 'idêntico ao exemplo do cartão; escreva sua própria frase',
      nl: 'identiek aan het kaartvoorbeeld; schrijf uw eigen zin',
      zh: '与词卡例句完全相同，请尝试用自己的话造句',
      ko: '카드 예문과 동일합니다. 자신만의 문장으로 새로 작성해 보세요'
    },
    collocationBonus: {
      ja: '自然なコロケーション表現も活用できています。',
      en: 'Natural collocation applied effectively.',
      fr: 'Collocation naturelle utilisée efficacement.',
      de: 'Natürliche Kollokation wirkungsvoll eingesetzt.',
      es: 'Colocación natural aplicada eficazmente.',
      it: 'Collocazione naturale applicata efficacemente.',
      pt: 'Colocação natural aplicada com eficácia.',
      nl: 'Natuurlijke collocatie effectief toegepast.',
      zh: '很好地运用了自然搭配。',
      ko: '자연스러운 연어 표현도 잘 활용했습니다.'
    },
    aiReviewLoading: {
      ja: 'AI精密添削を実行中...',
      en: 'Running AI deep review...',
      fr: 'Analyse IA approfondie en cours...',
      de: 'KI-Feinkorrektur läuft...',
      es: 'Ejecutando revisión profunda con IA...',
      it: 'Revisione IA approfondita in corso...',
      pt: 'Executando revisão profunda por IA...',
      nl: 'Uitgebreide AI-analyse uitvoeren...',
      zh: '正在执行 AI 精细批改...',
      ko: 'AI 정밀 첨삭을 진행하는 중...'
    },
    aiRewriteLabel: {
      ja: '自然な修正例',
      en: 'Natural suggestion',
      fr: 'Proposition naturelle',
      de: 'Natürlicher Vorschlag',
      es: 'Sugerencia natural',
      it: 'Suggerimento naturale',
      pt: 'Sugestão natural',
      nl: 'Natuurlijke suggestie',
      zh: '自然润色建议',
      ko: '자연스러운 수정 예시'
    }
  };

  const EN_SINGULAR_COUNTABLE_NOUNS = new Set([
    'apple', 'book', 'car', 'dog', 'cat', 'house', 'pen', 'pencil', 'table', 'chair', 'desk', 'bed', 'sofa', 'lamp',
    'computer', 'laptop', 'phone', 'keyboard', 'screen', 'camera', 'watch', 'clock', 'idea', 'problem', 'question',
    'answer', 'plan', 'story', 'movie', 'film', 'song', 'friend', 'teacher', 'student', 'doctor', 'physician',
    'patient', 'nurse', 'lawyer', 'judge', 'witness', 'victim', 'suspect', 'city', 'town', 'village', 'country',
    'nation', 'island', 'job', 'project', 'report', 'essay', 'article', 'paper', 'novel', 'poem', 'speech',
    'meeting', 'conference', 'event', 'party', 'trip', 'journey', 'flight', 'train', 'bus', 'bicycle', 'boat',
    'ship', 'plane', 'mistake', 'error', 'reason', 'result', 'solution', 'opportunity', 'challenge', 'decision',
    'effort', 'effect', 'impact', 'rule', 'law', 'policy', 'contract', 'system', 'method', 'tool', 'device',
    'machine', 'engine', 'building', 'room', 'door', 'window', 'wall', 'roof', 'floor', 'garden', 'kitchen',
    'bedroom', 'bathroom', 'tree', 'flower', 'bird', 'animal', 'child', 'kid', 'person', 'man', 'woman', 'boy',
    'girl', 'baby', 'day', 'week', 'month', 'year', 'hour', 'minute', 'second', 'word', 'sentence', 'example',
    'letter', 'message', 'email', 'ticket', 'key', 'bag', 'box', 'cup', 'glass', 'bottle', 'plate', 'bowl',
    'knife', 'fork', 'spoon', 'egg', 'banana', 'orange', 'cake', 'sandwich', 'burger', 'pizza', 'meal', 'snack',
    'gift', 'present', 'prize', 'game', 'test', 'exam', 'quiz', 'class', 'lesson', 'course', 'team', 'group',
    'company', 'firm', 'market', 'store', 'shop', 'school', 'hospital', 'clinic', 'bank', 'station', 'airport',
    'hotel', 'restaurant', 'office', 'park', 'street', 'road', 'bridge', 'river', 'mountain', 'lake', 'ocean',
    'sea', 'star', 'planet', 'moon', 'sun', 'cloud', 'storm', 'earthquake', 'accident', 'injury', 'disease',
    'symptom', 'treatment', 'diagnosis', 'theory', 'concept', 'principle', 'argument', 'hypothesis', 'experiment',
    'study', 'survey', 'picture', 'photo', 'painting', 'video', 'website', 'app', 'account', 'password', 'file',
    'document', 'tax', 'fee', 'price', 'cost', 'budget', 'profit', 'loss', 'salary', 'loan', 'goal', 'target',
    'step', 'stage', 'phase', 'level', 'standard', 'trend', 'pattern', 'style', 'type', 'kind', 'sort', 'shape',
    'size', 'voice', 'smile', 'dream', 'memory', 'thought', 'feeling', 'emotion', 'habit', 'skill', 'talent',
    'weakness', 'risk', 'threat', 'crisis', 'conflict', 'battle', 'victory', 'defeat', 'weapon', 'shirt', 'jacket',
    'coat', 'hat', 'shoe', 'sock', 'dress', 'suit', 'ring', 'mirror', 'towel', 'umbrella', 'wallet', 'purse',
    'coin', 'dollar', 'euro', 'bill', 'receipt', 'map', 'guide', 'menu', 'list', 'note', 'diary', 'calendar',
    'package', 'suitcase', 'backpack', 'algorithm', 'fossil', 'elephant', 'mountain', 'castle', 'palace', 'tower'
  ]);

  const EN_DETERMINERS = new Set([
    'a', 'an', 'the', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
    'some', 'any', 'no', 'every', 'each', 'either', 'neither', 'one', 'two', 'three', 'four', 'five', 'six',
    'seven', 'eight', 'nine', 'ten', 'many', 'several', 'few', 'much', 'little', 'more', 'most', 'another',
    'such', 'what', 'whose', 'which', 'per', 'half'
  ]);

  const EN_PRE_NP_TRIGGERS = new Set([
    'have', 'has', 'had', 'having', 'need', 'needs', 'needed', 'want', 'wants', 'wanted', 'buy', 'buys', 'bought',
    'see', 'sees', 'saw', 'seen', 'make', 'makes', 'made', 'find', 'finds', 'found', 'hold', 'holds', 'held',
    'take', 'takes', 'took', 'taken', 'bring', 'brings', 'brought', 'give', 'gives', 'gave', 'given',
    'eat', 'eats', 'ate', 'eaten', 'read', 'reads', 'write', 'writes', 'wrote', 'written', 'get', 'gets', 'got',
    'gotten', 'own', 'owns', 'owned', 'carry', 'carries', 'carried', 'wear', 'wears', 'wore', 'worn',
    'use', 'uses', 'used', 'create', 'creates', 'created', 'build', 'builds', 'built', 'break', 'breaks', 'broke',
    'broken', 'keep', 'keeps', 'kept', 'discover', 'discovers', 'discovered', 'face', 'faces', 'faced',
    'is', 'was', 'became', 'become', 'becomes', 'with', 'without', 'in', 'on', 'at', 'into', 'onto', 'from',
    'for', 'as', 'like', 'about', 'near', 'under', 'over', 'behind', 'beside', 'between', 'against', 'toward', 'towards'
  ]);

  const EN_BARE_NOUN_IDIOMS = new Set([
    'in hospital', 'at school', 'at work', 'at home', 'in bed', 'in prison', 'on foot', 'by car', 'by train',
    'by bus', 'by plane', 'by boat', 'by ship', 'on time', 'in case', 'for example', 'in fact', 'in part',
    'in person', 'on stage', 'on screen', 'in theory', 'in practice', 'at risk', 'in danger', 'on purpose',
    'by accident', 'in return', 'in order', 'in general', 'in particular', 'as part', 'in school', 'in class',
    'at university', 'at college', 'in town', 'at sea', 'on land', 'in court', 'on trial', 'at war', 'at peace',
    'in trouble', 'in debt', 'on sale', 'for sale', 'in stock', 'on fire', 'on air', 'by hand', 'by heart',
    'in mind', 'on paper', 'per day', 'per week', 'per month', 'per year', 'per hour', 'per person'
  ]);

  const EN_CLAUSE_VERBS = new Set([
    'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might', 'must',
    'go', 'goes', 'went', 'gone', 'come', 'comes', 'came', 'make', 'makes', 'made', 'take', 'takes', 'took',
    'give', 'gives', 'gave', 'get', 'gets', 'got', 'know', 'knows', 'knew', 'think', 'thinks', 'thought',
    'feel', 'feels', 'felt', 'find', 'finds', 'found', 'tell', 'tells', 'told', 'ask', 'asks', 'asked',
    'work', 'works', 'worked', 'seem', 'seems', 'seemed', 'try', 'tries', 'tried', 'leave', 'leaves', 'left',
    'call', 'calls', 'called', 'keep', 'keeps', 'kept', 'let', 'lets', 'begin', 'begins', 'began',
    'show', 'shows', 'showed', 'hear', 'hears', 'heard', 'play', 'plays', 'played', 'run', 'runs', 'ran',
    'move', 'moves', 'moved', 'live', 'lives', 'lived', 'believe', 'believes', 'hold', 'holds', 'held',
    'bring', 'brings', 'brought', 'happen', 'happens', 'write', 'writes', 'wrote', 'sit', 'sits', 'sat',
    'stand', 'stands', 'stood', 'lose', 'loses', 'lost', 'pay', 'pays', 'paid', 'meet', 'meets', 'met',
    'include', 'includes', 'continue', 'continues', 'set', 'sets', 'learn', 'learns', 'change', 'changes',
    'lead', 'leads', 'led', 'understand', 'understands', 'understood', 'watch', 'watches', 'follow', 'follows',
    'stop', 'stops', 'create', 'creates', 'speak', 'speaks', 'spoke', 'read', 'reads', 'allow', 'allows',
    'add', 'adds', 'spend', 'spends', 'spent', 'grow', 'grows', 'grew', 'open', 'opens', 'walk', 'walks',
    'win', 'wins', 'won', 'offer', 'offers', 'remember', 'remembers', 'love', 'loves', 'consider', 'considers',
    'appear', 'appears', 'buy', 'buys', 'bought', 'wait', 'waits', 'serve', 'serves', 'die', 'dies', 'died',
    'send', 'sends', 'sent', 'expect', 'expects', 'build', 'builds', 'built', 'stay', 'stays', 'fall', 'falls',
    'fell', 'cut', 'cuts', 'reach', 'reaches', 'kill', 'kills', 'remain', 'remains', 'suggest', 'suggests',
    'raise', 'raises', 'pass', 'passes', 'sell', 'sells', 'sold', 'require', 'requires', 'report', 'reports',
    'decide', 'decides', 'pull', 'pulls', 'break', 'breaks', 'broke', 'carry', 'carries', 'drive', 'drives',
    'drove', 'wear', 'wears', 'wore', 'choose', 'chooses', 'chose', 'draw', 'draws', 'drew', 'fly', 'flies',
    'flew', 'throw', 'throws', 'threw', 'sleep', 'sleeps', 'slept', 'wake', 'wakes', 'woke', 'study', 'studies',
    'teach', 'teaches', 'taught', 'help', 'helps', 'need', 'needs', 'want', 'wants', 'use', 'uses', 'like',
    'likes', 'hate', 'hates', 'hope', 'hopes', 'plan', 'plans', 'start', 'starts', 'finish', 'finishes',
    'enjoy', 'enjoys', 'prefer', 'prefers', 'wish', 'wishes', 'promise', 'promises', 'agree', 'agrees',
    'refuse', 'refuses', 'manage', 'manages', 'fail', 'fails', 'tend', 'tends', 'eat', 'eats', 'ate',
    'see', 'sees', 'saw', 'say', 'says', 'said', 'become', 'becomes', 'became', 'relate', 'relates',
    'confirm', 'confirms', 'deploy', 'deploys', 'prescribe', 'prescribes', 'sustain', 'sustains', 'own', 'owns'
  ]);

  const EN_STOPWORDS = new Set([
    'a', 'an', 'the', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'i', 'you', 'he', 'she', 'it',
    'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'this', 'that',
    'these', 'those', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'and', 'or', 'but',
    'if', 'so', 'not', 'no', 'very', 'really', 'just', 'too', 'also', 'do', 'does', 'did', 'have', 'has', 'had'
  ]);

  const EN_IRREGULAR_FORMS = {
    be: ['am', 'is', 'are', 'was', 'were', 'been', 'being'],
    have: ['has', 'had', 'having'],
    do: ['does', 'did', 'done', 'doing'],
    go: ['goes', 'went', 'gone', 'going'],
    take: ['takes', 'took', 'taken', 'taking'],
    make: ['makes', 'made', 'making'],
    see: ['sees', 'saw', 'seen', 'seeing'],
    come: ['comes', 'came', 'coming'],
    become: ['becomes', 'became', 'becoming'],
    give: ['gives', 'gave', 'given', 'giving'],
    know: ['knows', 'knew', 'known', 'knowing'],
    think: ['thinks', 'thought', 'thinking'],
    find: ['finds', 'found', 'finding'],
    buy: ['buys', 'bought', 'buying'],
    bring: ['brings', 'brought', 'bringing'],
    teach: ['teaches', 'taught', 'teaching'],
    catch: ['catches', 'caught', 'catching'],
    seek: ['seeks', 'sought', 'seeking'],
    fight: ['fights', 'fought', 'fighting'],
    write: ['writes', 'wrote', 'written', 'writing'],
    speak: ['speaks', 'spoke', 'spoken', 'speaking'],
    break: ['breaks', 'broke', 'broken', 'breaking'],
    choose: ['chooses', 'chose', 'chosen', 'choosing'],
    grow: ['grows', 'grew', 'grown', 'growing'],
    throw: ['throws', 'threw', 'thrown', 'throwing'],
    draw: ['draws', 'drew', 'drawn', 'drawing'],
    drive: ['drives', 'drove', 'driven', 'driving'],
    eat: ['eats', 'ate', 'eaten', 'eating'],
    fall: ['falls', 'fell', 'fallen', 'falling'],
    feel: ['feels', 'felt', 'feeling'],
    keep: ['keeps', 'kept', 'keeping'],
    leave: ['leaves', 'left', 'leaving'],
    meet: ['meets', 'met', 'meeting'],
    begin: ['begins', 'began', 'begun', 'beginning'],
    run: ['runs', 'ran', 'running'],
    say: ['says', 'said', 'saying'],
    tell: ['tells', 'told', 'telling'],
    sell: ['sells', 'sold', 'selling'],
    send: ['sends', 'sent', 'sending'],
    spend: ['spends', 'spent', 'spending'],
    build: ['builds', 'built', 'building'],
    lose: ['loses', 'lost', 'losing'],
    pay: ['pays', 'paid', 'paying'],
    hear: ['hears', 'heard', 'hearing'],
    hold: ['holds', 'held', 'holding'],
    stand: ['stands', 'stood', 'standing'],
    understand: ['understands', 'understood', 'understanding'],
    wear: ['wears', 'wore', 'worn', 'wearing'],
    win: ['wins', 'won', 'winning'],
    get: ['gets', 'got', 'gotten', 'getting'],
    forget: ['forgets', 'forgot', 'forgotten', 'forgetting'],
    rise: ['rises', 'rose', 'risen', 'rising'],
    lead: ['leads', 'led', 'leading'],
    freeze: ['freezes', 'froze', 'frozen', 'freezing'],
    steal: ['steals', 'stole', 'stolen', 'stealing'],
    fly: ['flies', 'flew', 'flown', 'flying'],
    apply: ['applies', 'applied', 'applying'],
    study: ['studies', 'studied', 'studying'],
    identify: ['identifies', 'identified', 'identifying']
  };

  function chooseEnglishArticle(nextWord) {
    const w = String(nextWord || '').trim().toLowerCase();
    if (!w) return 'a';
    if (/^(hour|honest|honor|honour|heir|herb)/.test(w)) return 'an';
    if (/^(uni[a-z]*|use[a-z]*|user|usual|eu[a-z]*|uk[a-z]*|one|once|utensil|uranium|ulterior|ubiquitous|unanim|unilateral|uniform|union|unique|unit|united|universal|universe|university)/.test(w)) return 'a';
    if (/^[aeiou]/.test(w)) return 'an';
    return 'a';
  }

  function looksLikeEnglishSentence(cleanSentence, item) {
    if (item && item.lang) return item.lang === 'en';
    if (/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\u00C0-\u024F]/u.test(cleanSentence)) return false;
    if (/\b(est|sont|une|des|les|dans|avec|pour|sur|qui|der|die|das|ein|eine|ist|sind|und|mit|los|las|una|unos|unas|son|con|por|para|gli|uno|sono|nel|della|het|een|zijn|van|met|voor)\b/i.test(cleanSentence)) {
      return false;
    }
    return /[a-zA-Z]/.test(cleanSentence);
  }

  function analyzeEnglishGrammar(cleanSentence, cleanWord, item = {}) {
    const issues = [];
    const seenKeys = new Set();
    const pushIssue = (type, penalty, params = {}) => {
      const key = `${type}:${params.bad || ''}:${params.fix || ''}`;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);
      issues.push({ type, penalty, params });
    };

    // 1. Article sound mismatch (a vs an)
    const artRegex = /\b(a|an)\s+([a-zA-Z][a-zA-Z'-]*)\b/gi;
    let artMatch;
    while ((artMatch = artRegex.exec(cleanSentence)) !== null) {
      const art = artMatch[1];
      const artLow = art.toLowerCase();
      const nextW = artMatch[2];
      const prefixCtx = cleanSentence.slice(Math.max(0, artMatch.index - 15), artMatch.index);
      if (art === 'A' && /\b(?:Plan|Grade|Vitamin|Type|Part|Option|Section|Appendix)\s+$/i.test(prefixCtx)) continue;
      if (artLow === 'an' && (/^[A-Z]{2,}/.test(nextW) || /^[fhilmnorsx]-/i.test(nextW))) continue;
      const expected = chooseEnglishArticle(nextW);
      if (artLow !== expected) {
        const fixedArt = art[0] === art[0].toUpperCase() ? (expected === 'an' ? 'An' : 'A') : expected;
        pushIssue('issueArticleMismatch', 12, { bad: `${art} ${nextW}`, fix: `${fixedArt} ${nextW}` });
      }
    }

    // 2. Missing determiner before singular countable noun
    const countableSet = new Set(EN_SINGULAR_COUNTABLE_NOUNS);
    if (Array.isArray(item.meanings) && item.meanings.length) {
      const nounMeanings = item.meanings.filter(m => m && /^N/i.test(String(m.pos || '')));
      if (nounMeanings.length && nounMeanings.every(m => /^N\[C\]/i.test(String(m.pos || '').trim()))) {
        if (cleanWord && /^[a-z]+$/i.test(cleanWord) && !cleanWord.endsWith('s')) {
          countableSet.add(cleanWord);
        }
      }
    }

    const clauses = cleanSentence.split(/[.!?;,]+/).map(s => s.trim()).filter(Boolean);
    for (const clause of clauses) {
      const rawTokens = clause.match(/[a-zA-Z0-9'-]+/g) || [];
      for (let i = 0; i < rawTokens.length; i++) {
        const tok = rawTokens[i];
        const low = tok.toLowerCase();
        if (!countableSet.has(low)) continue;
        // Skip capitalized mid-clause proper nouns / acronyms
        if (i > 0 && /^[A-Z]/.test(tok)) continue;
        // Skip if followed by another noun (compound noun modifier, e.g. "apple pie", "book club")
        const nextTok = (rawTokens[i + 1] || '').toLowerCase();
        if (nextTok && (countableSet.has(nextTok) || /(?:tion|ment|ness|ity|club|tree|pie|shop|store|room|hall|park|line|card|list|game|rate|plan|team|work|time)$/.test(nextTok))) {
          continue;
        }
        // Look back up to 3 tokens for determiner or trigger
        let hasDet = false;
        let triggerIdx = -1;
        for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
          const prevRaw = rawTokens[j];
          const prev = prevRaw.toLowerCase();
          if (EN_DETERMINERS.has(prev) || /^\d+$/.test(prev) || /(?:'s|s')$/i.test(prevRaw)) {
            hasDet = true;
            break;
          }
          if (EN_PRE_NP_TRIGGERS.has(prev)) {
            triggerIdx = j;
            break;
          }
          if (countableSet.has(prev) || /^(i|you|he|she|we|they|it|me|him|us|them)$/i.test(prev)) {
            hasDet = true; // another noun/pronoun blocks direct NP trigger
            break;
          }
        }
        if (hasDet) continue;

        let npStart = -1;
        if (triggerIdx !== -1) {
          if (EN_BARE_NOUN_IDIOMS.has(`${rawTokens[triggerIdx].toLowerCase()} ${low}`)) continue;
          npStart = triggerIdx + 1;
        } else if (i <= 2 && /^(is|was|has|had|can|could|will|would|seems|looks|feels|becomes|became|stands|sits|lies|grows|makes|takes)$/i.test(nextTok)) {
          npStart = 0;
        }
        if (npStart !== -1 && npStart <= i) {
          const npSlice = rawTokens.slice(npStart, i + 1);
          const npBad = npSlice.join(' ');
          const art = chooseEnglishArticle(npSlice[0]);
          const npFix = `${art} ${npSlice[0].toLowerCase() === npSlice[0] ? npBad : (npSlice[0][0].toLowerCase() + npSlice[0].slice(1) + (npSlice.length > 1 ? ' ' + npSlice.slice(1).join(' ') : ''))}`;
          pushIssue('issueMissingArticle', 18, { bad: npBad, fix: npFix });
        }
      }
    }

    // 3. Subject-Verb Agreement (SVA)
    const svaPatterns = [
      { re: /\b(I)\s+(is|has|does)\b/g, fixFn: (_, s, v) => `${s} ${v === 'is' ? 'am' : (v === 'has' ? 'have' : 'do')}` },
      { re: /\b(You|We|They)\s+(is|was|has|does)\b/gi, fixFn: (_, s, v) => `${s} ${v.toLowerCase() === 'is' ? 'are' : (v.toLowerCase() === 'was' ? 'were' : (v.toLowerCase() === 'has' ? 'have' : 'do'))}` },
      { re: /(?:^|[.!?]\s+|,\s*|\b(?:and|but|that|because|when|if|although)\s+)(He|She|It)\s+(are|were|have|do)\b/gi, fixFn: (_, s, v) => `${s} ${v.toLowerCase() === 'are' ? 'is' : (v.toLowerCase() === 'were' ? 'was' : (v.toLowerCase() === 'have' ? 'has' : 'does'))}` },
      { re: /\bThere\s+is\s+(many|several|two|three|four|five|ten|numerous)\b/gi, fixFn: (_, q) => `There are ${q}` },
      { re: /\bThere\s+are\s+(a|an|one)\b/gi, fixFn: (_, q) => `There is ${q}` }
    ];
    for (const pat of svaPatterns) {
      let m;
      while ((m = pat.re.exec(cleanSentence)) !== null) {
        const badText = `${m[1]} ${m[2]}`;
        const fixText = pat.fixFn(m[0], m[1], m[2]);
        pushIssue('issueSva', 15, { bad: badText, fix: fixText });
      }
    }

    // 4. Modal / Auxiliary / Infinitive verb form errors
    const verbFormPatterns = [
      /\b(?:can|could|will|would|shall|should|may|might|must)\s+(?:to\s+[a-z]+|goes|went|does|did|has|had|is|are|was|were|makes|made|takes|took|comes|came|sees|saw|knows|knew|gives|gave)\b/gi,
      /\b(?:do|does|did)\s+(?:not\s+|n't\s+)?(?:went|saw|ate|wrote|spoke|took|gave|came|became|ran|began|knew|grew|threw|flew|drew|drove|rode|rose|chose|broke|woke|forgot|forgave|had|has|did|does|is|was|were|are)\b/gi,
      /\bto\s+(?:went|saw|ate|wrote|spoke|took|gave|came|became|ran|began|knew|grew|threw|flew|drew|drove|rode|rose|chose|broke|woke|forgot|has|had|did|does|is|was|were|are)\b/gi
    ];
    for (const re of verbFormPatterns) {
      let m;
      while ((m = re.exec(cleanSentence)) !== null) {
        pushIssue('issueVerbForm', 15, { bad: m[0] });
      }
    }

    // 5. Duplicate consecutive words & double comparatives
    const dupRe = /\b([a-z]{2,})\s+\1\b/gi;
    let dupM;
    while ((dupM = dupRe.exec(cleanSentence)) !== null) {
      if (/^(had|that)$/i.test(dupM[1])) continue;
      pushIssue('issueDuplicate', 10, { bad: dupM[0] });
    }
    const dblCompRe = /\b(?:more|most)\s+(?:better|worse|bigger|smaller|faster|slower|easier|harder|higher|lower|best|worst|biggest|smallest|fastest|slowest|easiest|hardest)\b/gi;
    let dcM;
    while ((dcM = dblCompRe.exec(cleanSentence)) !== null) {
      pushIssue('issueDoubleComp', 12, { bad: dcM[0] });
    }

    // 6. Capitalization & standalone 'i' & terminal punctuation
    if (!/^["'“‘(\[]*[\p{Lu}]/u.test(cleanSentence) || /(?:^|\s)i(?:\s|'m|'ve|'ll|'d)/u.test(cleanSentence)) {
      pushIssue('issueCapital', 6, {});
    }
    if (!/[.!?]["'”’)\]]*$/u.test(cleanSentence)) {
      pushIssue('issuePunctuation', 8, {});
    }

    // 7. Missing main verb / clause predicate check (for >= 3 words)
    const tokensLow = (cleanSentence.toLowerCase().match(/[a-z'-]+/g) || []);
    if (tokensLow.length >= 3) {
      const targetLow = String(item?.word || '').toLowerCase();
      const targetIsVerb = Array.isArray(item.meanings) && item.meanings.some(m => /^V/i.test(String(m?.pos || '')));
      const detRe = /^(?:a|an|the|my|your|his|her|its|our|their|this|that|these|those|some|any|no|every|each)$/;
      const targetUsedAsNoun = targetLow && tokensLow.some((t, idx) => idx > 0 && t === targetLow && (detRe.test(tokensLow[idx - 1]) || (idx > 1 && detRe.test(tokensLow[idx - 2]) && !EN_CLAUSE_VERBS.has(tokensLow[idx - 1]))));
      const hasOtherVerb = tokensLow.some(t =>
        (t !== targetLow || !targetUsedAsNoun) && (
          EN_CLAUSE_VERBS.has(t) ||
          /(?:ed|ing|izes?|ises?|ates?|ifies?|ens?)$/.test(t) ||
          (t.length >= 4 && /s$/.test(t) && !countableSet.has(t) && !EN_STOPWORDS.has(t))
        )
      );
      const hasVerb = (targetIsVerb && !targetUsedAsNoun) || hasOtherVerb;
      if (!hasVerb) {
        pushIssue('issueNoVerb', 12, {});
      }
    }

    return issues;
  }

  /**
   * 実践アウトプット: ユーザー短文ライティング添削エンジン
   */
  function evaluateUserWriting(word, sentence, item = {}) {
    const curLocale = (global.VocabI18n?.getLocale ? global.VocabI18n.getLocale() : null) || 'ja';
    const tL = item.tgtLang || (curLocale !== 'ja' ? curLocale : (global.App?.tgtLang || 'ja'));
    const msg = k => (WRITING_FEEDBACK_I18N[k]?.[tL] || WRITING_FEEDBACK_I18N[k]?.en || WRITING_FEEDBACK_I18N[k]?.ja || '');
    const fmt = (k, params = {}) => {
      let s = msg(k);
      Object.keys(params).forEach(pk => { s = s.replace(`{${pk}}`, params[pk]); });
      return s;
    };

    if (!word || !sentence || !String(sentence).trim()) {
      return { score: 0, valid: false, feedback: msg('empty'), issues: [] };
    }
    const cleanWord = String(word).trim().toLowerCase();
    const cleanSentence = String(sentence).trim();
    const stems = getStemVariants(cleanWord);
    if (!stems.includes(cleanWord)) stems.push(cleanWord);
    if (EN_IRREGULAR_FORMS[cleanWord]) {
      EN_IRREGULAR_FORMS[cleanWord].forEach(f => { if (!stems.includes(f)) stems.push(f); });
    }
    if (item?.example?.used_form) {
      const uf = String(item.example.used_form).trim().toLowerCase();
      if (uf && !stems.includes(uf)) stems.push(uf);
    }

    const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const isCjk = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u.test(cleanWord);

    const hasWord = stems.some(st => {
      if (!st) return false;
      if (isCjk) {
        return cleanSentence.toLowerCase().includes(st);
      }
      const escSt = escapeRegExp(st);
      const reg = new RegExp(`(^|[^\\p{L}\\p{M}\\p{N}_])${escSt}(?=[^\\p{L}\\p{M}\\p{N}_]|$)`, 'iu');
      return reg.test(cleanSentence);
    });

    if (!hasWord) {
      const missMsg = msg('missing').replace('{w}', word);
      return {
        score: 40,
        valid: false,
        feedback: missMsg,
        issues: [{ type: 'missing', penalty: 60 }]
      };
    }

    const words = cleanSentence.split(/\s+/).filter(Boolean);
    const isEng = !(/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u.test(cleanSentence));
    const isEnglishGrammarTarget = isEng && looksLikeEnglishSentence(cleanSentence, item);
    let score = 75;
    let feedback = '';
    const issues = [];

    if (isEng) {
      // Unique content word diversity check to prevent word-stuffing inflation
      const normWords = words.map(w => w.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).filter(Boolean);
      const uniqueWords = new Set(normWords);
      const uniqueContentWords = Array.from(uniqueWords).filter(w => !EN_STOPWORDS.has(w) && w.length >= 2);
      const diversityRatio = normWords.length > 0 ? (uniqueWords.size / normWords.length) : 1;

      if (words.length < 4) {
        score = 65;
        feedback = msg('tooShort');
      } else if (normWords.length >= 4 && (diversityRatio < 0.6 || uniqueContentWords.length < 2)) {
        score = 62;
        issues.push({ type: 'issueRepetition', penalty: 15, params: {} });
        feedback = msg('tooShort');
      } else if (words.length >= 7 && uniqueContentWords.length >= 4) {
        score = 92;
        feedback = msg('excellent');
      } else {
        score = 82;
        feedback = msg('good');
      }

      if (isEnglishGrammarTarget) {
        const grammarIssues = analyzeEnglishGrammar(cleanSentence, cleanWord, item);
        grammarIssues.forEach(gi => issues.push(gi));
        // Apply grammar & mechanics penalties
        const totalPenalty = grammarIssues.reduce((sum, gi) => sum + gi.penalty, 0);
        score = Math.max(25, score - totalPenalty);
        if (grammarIssues.length === 0 && /^["'“‘(\[]*[\p{Lu}]/u.test(cleanSentence) && /[.!?]["'”’)\]]*$/u.test(cleanSentence)) {
          score = Math.min(100, score + 5);
        }
      } else {
        // Non-English Latin script (fr, de, es, it, pt, nl): check capitalization & terminal punctuation
        if (!/^["'“‘(\[]*[\p{Lu}]/u.test(cleanSentence)) {
          issues.push({ type: 'issueCapital', penalty: 6, params: {} });
          score = Math.max(30, score - 6);
        }
        if (!/[.!?。！？]["'”’)\]]*$/u.test(cleanSentence)) {
          issues.push({ type: 'issuePunctuation', penalty: 8, params: {} });
          score = Math.max(30, score - 8);
        }
        if (issues.length === 0 && /(?:^|\s)[\p{Lu}]/u.test(cleanSentence) && /[.!?。！？]$/u.test(cleanSentence)) {
          score = Math.min(100, score + 5);
        }
      }
    } else {
      score = cleanSentence.length >= 10 ? 90 : 80;
      feedback = msg('cjkGood');
    }

    // Detect verbatim copy of card's own example sentence
    const cardEx = String(item?.example?.foreign || item?.example?.en || '').replace(/<[^>]+>/g, '').trim();
    if (cardEx && cleanSentence.toLowerCase() === cardEx.toLowerCase()) {
      issues.push({ type: 'issueCopiedExample', penalty: 15, params: {} });
      score = Math.min(score, 70);
    }

    // Collocation bonus if sentence reuses one of the item's phrases
    let usedCollocation = false;
    if (Array.isArray(item?.phrases) && item.phrases.length && issues.length === 0) {
      const lowSent = cleanSentence.toLowerCase();
      usedCollocation = item.phrases.some(p => {
        const pf = String(p?.foreign || '').trim().toLowerCase();
        return pf.length >= 4 && lowSent.includes(pf);
      });
      if (usedCollocation) {
        score = Math.min(100, score + 4);
      }
    }

    const majorIssues = issues.filter(it => it.type !== 'issueCapital' && it.type !== 'issuePunctuation');
    const isValid = majorIssues.length === 0 && score >= 70;

    const scorePfx = (WRITING_FEEDBACK_I18N.scorePrefix[tL] || WRITING_FEEDBACK_I18N.scorePrefix.ja).replace('{s}', score);
    let outFeedback = `${scorePfx}`;
    if (issues.length > 0) {
      const issueDescriptions = issues.map(it => fmt(it.type, it.params)).filter(Boolean);
      outFeedback += `${msg('grammarHeader')}${issueDescriptions.join(' / ')}`;
    } else {
      outFeedback += feedback;
      if (usedCollocation) {
        outFeedback += ` ${msg('collocationBonus')}`;
      }
    }

    let coreText = (tL !== 'ja' ? (item[`core_${tL}`] || item.core_en) : null) || item.core || '';
    const hasUnexpectedCjkOrJp = (txt) => {
      if (!txt || tL === 'ja') return false;
      if (/[\u3040-\u30ff]/u.test(txt)) return true; // Japanese hiragana/katakana
      if (tL !== 'zh' && tL !== 'ko' && /[\u3400-\u9fff\uac00-\ud7af]/u.test(txt)) return true;
      return false;
    };
    if (hasUnexpectedCjkOrJp(coreText)) {
      coreText = item[`core_${tL}`] || item.core_en || '';
      if (hasUnexpectedCjkOrJp(coreText)) coreText = '';
    }
    if (coreText) {
      const corePfx = (WRITING_FEEDBACK_I18N.corePrefix[tL] || WRITING_FEEDBACK_I18N.corePrefix.ja).replace('{c}', coreText);
      outFeedback += corePfx;
    }

    return {
      score,
      valid: isValid,
      feedback: outFeedback,
      issues
    };
  }

  /**
   * BYOK Gemini API による AI詳細添削（任意トリガー）
   */
  async function evaluateWritingWithAI(word, sentence, item = {}) {
    const localRes = evaluateUserWriting(word, sentence, item);
    const curLocale = (global.VocabI18n?.getLocale ? global.VocabI18n.getLocale() : null) || 'ja';
    const tL = item.tgtLang || (curLocale !== 'ja' ? curLocale : (global.App?.tgtLang || 'ja'));
    const msg = k => (WRITING_FEEDBACK_I18N[k]?.[tL] || WRITING_FEEDBACK_I18N[k]?.en || WRITING_FEEDBACK_I18N[k]?.ja || '');
    const key = typeof global.getKey === 'function' ? global.getKey() : '';
    const callGeminiFn = global.VocabDictionary?.callGemini || global.callGemini;
    if (!key || typeof callGeminiFn !== 'function' || !sentence || !String(sentence).trim() || localRes.issues.some(i => i.type === 'missing')) {
      return localRes;
    }
    const langNames = { ja: '日本語', en: 'English', fr: 'français', de: 'Deutsch', es: 'español', it: 'italiano', pt: 'português', nl: 'Nederlands', zh: '中文', ko: '한국어' };
    const fbLang = langNames[tL] || '日本語';
    const tgtLangCode = item.lang || 'en';
    const schema = {
      type: 'OBJECT',
      properties: {
        score: { type: 'INTEGER' },
        valid: { type: 'BOOLEAN' },
        feedback: { type: 'STRING' },
        natural_rewrite: { type: 'STRING' }
      },
      required: ['score', 'valid', 'feedback', 'natural_rewrite']
    };
    const sys = `You are a strict, precise language writing coach. Evaluate the learner's short sentence written in language "${tgtLangCode}" using the target word "${word}". Write "feedback" in ${fbLang} (max 140 chars), clearly pointing out any grammar errors (articles, agreement, tense, prepositions), collocation awkwardness, or register issues. Provide a natural corrected/improved sentence in "natural_rewrite". Score strictly 0-100.`;
    const meaningsTxt = Array.isArray(item.meanings) ? item.meanings.slice(0, 2).map(m => `${m.pos || ''}:${m.text || ''}`).join(', ') : '';
    const usr = `Target word: ${word}\nMeanings: ${meaningsTxt}\nCore concept: ${item.core || ''}\nLearner sentence: ${String(sentence).trim()}`;
    try {
      const r = await callGeminiFn(sys, usr, key, null, schema, false);
      const parseFn = global.VocabDictionary?.parseApiJson || global.parseApiJson;
      const parsed = typeof parseFn === 'function' ? await parseFn(r) : null;
      if (parsed && typeof parsed.score === 'number' && parsed.feedback) {
        const clampedScore = Math.max(0, Math.min(100, Math.round(parsed.score)));
        const scorePfx = (WRITING_FEEDBACK_I18N.scorePrefix[tL] || WRITING_FEEDBACK_I18N.scorePrefix.ja).replace('{s}', clampedScore);
        const rewrite = parsed.natural_rewrite ? ` / ${msg('aiRewriteLabel')}: ${parsed.natural_rewrite}` : '';
        return {
          score: clampedScore,
          valid: Boolean(parsed.valid) && clampedScore >= 70,
          feedback: `${scorePfx}${parsed.feedback}${rewrite}`,
          issues: localRes.issues,
          aiPowered: true
        };
      }
    } catch (e) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[evaluateWritingWithAI fallback]', e?.message || e);
      }
    }
    return localRes;
  }

  /**
   * Anki復習セッションを開始
   */
  function startAnki(customCandidates = null, ctx = {}) {
    const st = ctx.appState || (global.VocabCore?.App);
    if (st?._blitzTimerId) {
      clearInterval(st._blitzTimerId);
      st._blitzTimerId = null;
      st._isFlashBlitz = false;
    }
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
        if (!ctx?.allowAllFallback) {
          const confirmMsg = global.VocabI18n?.t ? global.VocabI18n.t('anki.advance_review_confirm') : '現在、復習期日を迎えた単語はありません（すべて定着中）。\n登録済みの単語で事前復習・総復習セッションを開始しますか？';
          if (global.VocabModal?.uiConfirm && typeof document !== 'undefined' && document.body?.appendChild) {
            global.VocabModal.uiConfirm(confirmMsg).then(ok => {
              if (ok) startAnki(null, { ...ctx, allowAllFallback: true });
            });
          }
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

  // ==========================================================
  // 1分間マイクロ復習: 忘却危機3語 (Flash Blitz Micro-Session)
  // ==========================================================
  function startFlashBlitz(ctx = {}) {
    const appState = ctx.appState || (global.VocabCore?.App);
    const now = Date.now();
    const allFiltered = typeof ctx.getFiltered === 'function' ? ctx.getFiltered() : (appState?.entries || []);
    if (!allFiltered || !allFiltered.length) {
      const msg = global.VocabI18n?.t ? global.VocabI18n.t('anki.no_cards_to_review') : '復習対象の単語が登録されていません。';
      if (typeof ctx.showToast === 'function') ctx.showToast(msg, 'info', 3000);
      return;
    }

    // 忘却危機度（Overdue Ratio）上位3語、または未復習優先の3語を厳選
    const candidates = [...allFiltered].sort((a, b) => {
      const ratioA = getOverdueRatio(a, now);
      const ratioB = getOverdueRatio(b, now);
      if (Math.abs(ratioB - ratioA) > 0.01) return ratioB - ratioA;
      return (a.nextReview || 0) - (b.nextReview || 0);
    }).slice(0, 3);

    if (appState) {
      if (appState._blitzTimerId) {
        clearInterval(appState._blitzTimerId);
        appState._blitzTimerId = null;
      }
      appState._isFlashBlitz = true;
      appState._blitzSecondsLeft = 60;
      appState._blitzInitialCount = candidates.length;
    }

    startAnki(candidates, ctx);

    const updateBlitzUI = () => {
      const pill = $('blitzTimerPill');
      if (!pill) return;
      if (!appState || !appState._isFlashBlitz) {
        pill.style.display = 'none';
        return;
      }
      const remWords = appState.aList ? appState.aList.length : 0;
      pill.style.display = 'inline-flex';
      const sec = appState._blitzSecondsLeft ?? 60;
      const t = global.VocabI18n?.t || ((k, p, d) => d || k);
      global.VocabDOM?.setSafeHtml(pill, `<span class="blitz-dot"></span><span>${t('anki.blitz_badge', { sec, rem: remWords }, `Blitz 60s: ${sec}秒 (残${remWords}語)`)}</span>`);
    };

    updateBlitzUI();

    if (appState) {
      appState._blitzTimerId = setInterval(() => {
        if (!appState._isFlashBlitz) {
          clearInterval(appState._blitzTimerId);
          appState._blitzTimerId = null;
          return;
        }
        appState._blitzSecondsLeft = Math.max(0, (typeof appState._blitzSecondsLeft === 'number' ? appState._blitzSecondsLeft : 60) - 1);
        updateBlitzUI();
        if (appState._blitzSecondsLeft <= 0) {
          clearInterval(appState._blitzTimerId);
          appState._blitzTimerId = null;
          appState._isFlashBlitz = false;
          const t = global.VocabI18n?.t || ((k, p, d) => d || k);
          const toastFn = ctx.showToast || (global.VocabModal ? global.VocabModal.showToast : null);
          if (toastFn) toastFn(t('anki.blitz_timeout', null, '1分間Flash Blitz集中タイム終了！お疲れ様でした。'), 'info', 4000);
          exitAnki(ctx);
        }
      }, 1000);
    }
  }

  // ==========================================================
  // 完全ハンズフリー音声対話Ankiモード (Hands-Free Voice SRS)
  // ==========================================================
  let _voiceAdvanceTimer = null;

  function toggleVoiceAnkiMode(ctx = {}) {
    const appState = ctx.appState || (global.VocabCore?.App);
    if (!appState) return false;
    const isSupported = global.VocabSpeech?.isSpeechRecognitionSupported ? global.VocabSpeech.isSpeechRecognitionSupported() : false;
    if (!isSupported) {
      const msg = global.VocabI18n?.t ? global.VocabI18n.t('anki.voice_not_supported') : 'このブラウザは音声認識APIに対応していません（ChromeまたはSafari推奨）。';
      const toastFn = ctx.showToast || (global.VocabModal ? global.VocabModal.showToast : null);
      if (toastFn) toastFn(msg, 'warn', 4000);
      return false;
    }

    appState._voiceAnkiActive = !appState._voiceAnkiActive;
    const btn = $('btnVoiceAnki');
    if (btn) btn.classList.toggle('active', !!appState._voiceAnkiActive);

    const banner = $('voiceAnkiBanner');
    if (!appState._voiceAnkiActive) {
      if (global.VocabSpeech?.stopVoiceAnkiListening) global.VocabSpeech.stopVoiceAnkiListening();
      if (banner) banner.style.display = 'none';
      if (_voiceAdvanceTimer) {
        clearTimeout(_voiceAdvanceTimer);
        _voiceAdvanceTimer = null;
      }
    } else {
      if (banner) banner.style.display = 'flex';
      setupVoiceForCurrentCard(ctx);
    }
    return appState._voiceAnkiActive;
  }

  function setupVoiceForCurrentCard(ctx = {}) {
    const appState = ctx.appState || (global.VocabCore?.App);
    if (!appState || !appState._voiceAnkiActive) return;
    const cur = appState.aList?.[0];
    if (!cur) return;

    if (_voiceAdvanceTimer) {
      clearTimeout(_voiceAdvanceTimer);
      _voiceAdvanceTimer = null;
    }

    const banner = $('voiceAnkiBanner');
    const statusTxt = $('voiceAnkiStatusText');
    const appLang = global.VocabI18n?.getLocale ? global.VocabI18n.getLocale() : 'ja';
    const t = global.VocabI18n?.t || ((k, p, d) => d || k);

    if (banner) banner.style.display = 'flex';
    if (statusTxt) statusTxt.textContent = t('anki.voice_prompt', null, '音声認識待機中: 単語の発音、または「正解 / 難しい / 簡単 / もう一度」');

    const spkFn = global.VocabSpeech?.speakTextAsync || global.VocabSpeech?.speakText;
    const onTtsComplete = () => {
      if (!appState._voiceAnkiActive || appState.aList?.[0] !== cur) return;

      const meanings = (cur.meanings || []).map(m => m.text || m.meaning).filter(Boolean);
      global.VocabSpeech?.startVoiceAnkiListening?.({
        lang: cur.lang || appState.lang || 'en',
        appLang,
        targetWord: cur.word,
        targetMeanings: meanings,
        onStatusChange: (status) => {
          if (statusTxt) {
            statusTxt.textContent = status === 'listening'
              ? t('anki.voice_listening', null, '音声を認識中...（話しかけてください）')
              : t('anki.voice_idle', null, '音声待機中...');
          }
        },
        onResult: (res) => {
          if (!appState._voiceAnkiActive || appState.aList?.[0] !== cur) return;
          if ($('anki')?.style.display === 'none' || Boolean(document.querySelector('.modal-ov.open')) || _voiceAdvanceTimer) return;
          if (!res) return;

          if (res.type === 'action' && res.action === 'flip') {
            showAns(ctx);
            if (statusTxt) statusTxt.textContent = `認識: 解答表示 (${res.match || 'flip'})`;
            return;
          }

          if (res.type === 'rating' || res.type === 'word_match' || res.type === 'meaning_match') {
            const rating = (res.rating !== undefined && res.rating !== null) ? res.rating : 2;
            const rLabel = res.label || (rating === 0 ? 'Again' : rating === 1 ? 'Hard' : rating === 2 ? 'Good' : 'Easy');
            if (statusTxt) {
              global.VocabDOM?.setSafeHtml(statusTxt, `<strong>認識: ${esc(rLabel)} (${esc(res.transcript || '')})</strong> -> 次のカードへ進みます`);
            }
            showAns(ctx);
            global.VocabSpeech?.stopVoiceAnkiListening?.();

            if (_voiceAdvanceTimer) clearTimeout(_voiceAdvanceTimer);
            _voiceAdvanceTimer = setTimeout(() => {
              if (appState._voiceAnkiActive) {
                procRev(rating, ctx);
              }
            }, 1200);
          }
        },
        onError: (err) => {
          console.warn('Voice Anki listening error:', err);
        }
      });
    };

    if (global.VocabSpeech?.speakTextAsync) {
      global.VocabSpeech.speakTextAsync(cur.word, cur.lang || appState.lang)
        .then(onTtsComplete)
        .catch(onTtsComplete);
    } else if (global.VocabSpeech?.speakText) {
      global.VocabSpeech.speakText(cur.word, cur.lang || appState.lang, 1.0, null, onTtsComplete);
    } else {
      onTtsComplete();
    }
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
    const coreBadgePrefix = (tL === 'en' ? 'Core: ' : (tL === 'de' ? 'Kern: ' : (tL === 'fr' ? 'Cœur: ' : (tL === 'es' ? 'Núcleo: ' : (tL === 'it' ? 'Nucleo: ' : (tL === 'pt' ? 'Núcleo: ' : (tL === 'nl' ? 'Kern: ' : (tL === 'ko' ? '코아이미지: ' : (tL === 'zh' ? '核心概念: ' : 'コアイメージ: ')))))))));
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

    const blitzPill = $('blitzTimerPill');
    if (blitzPill) {
      if (appState?._isFlashBlitz) {
        const sec = appState._blitzSecondsLeft ?? 60;
        const remWords = aList.length;
        const t = global.VocabI18n?.t || ((k, p, d) => d || k);
        blitzPill.style.display = 'inline-flex';
        global.VocabDOM?.setSafeHtml(blitzPill, `<span class="blitz-dot"></span><span>${t('anki.blitz_badge', { sec, rem: remWords }, `Blitz 60s: ${sec}秒 (残${remWords}語)`)}</span>`);
      } else {
        blitzPill.style.display = 'none';
      }
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
    if (aWord) {
      aWord.textContent = i.word + (i.homographIndex > 1 ? ` #${i.homographIndex}` : '');
      aWord.setAttribute('lang', i.lang || appState?.lang || 'en');
    }

    const spkCurrentBtn = /** @type {HTMLElement | null} */ (document.querySelector?.('.a-front .spk-btn[data-act="speak-current"]'));
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
        if (aClozeSentence) global.VocabDOM?.setSafeHtml(aClozeSentence, buildClozeSentenceHtml(i));
        if (aClozeHintBox) global.VocabDOM?.setSafeHtml(aClozeHintBox, buildClozeHintsHtml(i));
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
          const rawWord = String(i.word).trim();
          const escW = rawWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const NOT_WORD_CHAR = '[^\\p{L}\\p{M}\\p{N}_]';
          const isCjkOrPhrase = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\s]/u.test(rawWord);
          const regCtx = isCjkOrPhrase
            ? new RegExp(escW, 'giu')
            : new RegExp(`(^|${NOT_WORD_CHAR})(${escW}(?:s|es|d|ed|ing|er|est|ly|n)?)(?=${NOT_WORD_CHAR}|$)`, 'giu');
          const maskedCtx = isCjkOrPhrase
            ? String(i.contextSentence).replace(regCtx, '[ ????? ]')
            : String(i.contextSentence).replace(regCtx, '$1[ ????? ]');
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
        global.VocabDOM?.setSafeHtml(aBack, cleanHtml);
      } else if (global.VocabCardView?.buildRight) {
        global.VocabDOM?.setSafeHtml(aBack, global.VocabCardView.buildRight(i, {
          rootIndexMap: appState?.rootIndexMap,
          queryReg: appState?.qReg,
          viewMode: appState?.viewMode,
          lang: i.lang || appState?.lang
        }));
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
    if (appState?._voiceAnkiActive) {
      setupVoiceForCurrentCard(ctx);
    } else if (mode === 'recog' && lsGet && lsGet('vv_tts_auto_anki', '1') !== '0') {
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
      blanks?.forEach(el => {
        const b = /** @type {HTMLElement} */ (el);
        b.classList.add('revealed');
        if (b.dataset.ans) b.textContent = b.dataset.ans;
      });
      const contextText = $('aContextText');
      if (contextText && e.contextSentence) {
        contextText.textContent = `“${e.contextSentence}”`;
      }

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

    global.VocabDOM?.setSafeHtml(aRat, [['#ef4444', ratingLabels[0]], ['#f97316', ratingLabels[1]], ['#10b981', ratingLabels[2]], ['#3b82f6', ratingLabels[3]]].map((c, idx) => {
      const defaultPred = global.VocabSRS?.predDays ? (global.VocabSRS.predDays(e, idx) === 0 ? (isJa ? '1分後' : '1m') : Math.round(global.VocabSRS.predDays(e, idx)) + (isJa ? '日後' : 'd')) : (isJa ? '1日後' : '1d');
      const label = predictions ? predictions[idx] : defaultPred;
      return `<button type="button" class="b-rat" style="background:${c[0]}" data-act="rate" data-rate="${idx}"><span>${c[1]}</span><small>${label}</small></button>`;
    }).join(''));
  }

  /**
   * レーティング判定を実行し次カードへ進む
   */
  function procRev(r, ctx = {}) {
    if (_voiceAdvanceTimer) {
      clearTimeout(_voiceAdvanceTimer);
      _voiceAdvanceTimer = null;
    }
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

    const prevStability = Number(e.stability) || Number(cur.stability) || 1;
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
          lapses: e.lapses,
          nextReview: e.nextReview,
          flags: Array.isArray(e.flags) ? [...e.flags] : [],
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
      id: e.id,
      word: e.word || cur.word,
      lang: tL,
      rating: r,
      roots: Array.isArray(e.etymologyTags) ? e.etymologyTags : (Array.isArray(cur.etymologyTags) ? cur.etymologyTags : []),
      stabilityBefore: prevStability,
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
      if (appState._isFlashBlitz) {
        if (appState._blitzTimerId) {
          clearInterval(appState._blitzTimerId);
          appState._blitzTimerId = null;
        }
        appState._isFlashBlitz = false;
        const blitzPill = $('blitzTimerPill');
        if (blitzPill) blitzPill.style.display = 'none';
        const t = global.VocabI18n?.t || ((k, p, d) => d || k);
        const toastFn = ctx.showToast || (global.VocabModal ? global.VocabModal.showToast : null);
        if (toastFn) toastFn(t('anki.blitz_completed', null, 'Flash Blitz 完了！3語の忘却危機を撃退し、本日のストリークを維持しました。'), 'ok', 4000);
      }
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
    const appState = ctx.appState || (global.VocabCore?.App);
    if (appState) {
      if (appState._blitzTimerId) {
        clearInterval(appState._blitzTimerId);
        appState._blitzTimerId = null;
      }
      if (appState._isFlashBlitz) {
        appState._isFlashBlitz = false;
        const t = global.VocabI18n?.t || ((k, p, d) => d || k);
        const toastFn = ctx.showToast || (global.VocabModal ? global.VocabModal.showToast : null);
        if (toastFn) toastFn(t('anki.blitz_completed', null, 'Flash Blitz 完了！3語の忘却危機を撃退し、本日のストリークを維持しました。'), 'ok', 3500);
      }
    }
    const blitzPill = $('blitzTimerPill');
    if (blitzPill) blitzPill.style.display = 'none';

    if (global.VocabSpeech?.stopVoiceAnkiListening) {
      global.VocabSpeech.stopVoiceAnkiListening();
    }
    const voiceBanner = $('voiceAnkiBanner');
    if (voiceBanner) voiceBanner.style.display = 'none';

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

      global.VocabDOM?.setSafeHtml(targetEl, `
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
      `);
      $('btnFinishAnkiSession')?.addEventListener?.('click', () => exitAnki(ctx));
    }
  }

  /**
   * 直前のレーティングを取り消し (Undo)
   */
  function undoAnkiRev(ctx = {}) {
    if (_voiceAdvanceTimer) {
      clearTimeout(_voiceAdvanceTimer);
      _voiceAdvanceTimer = null;
    }
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
      updatedAt: now
    });
    if (last.prevProps?.reviewUpdatedAt === undefined) {
      delete e.reviewUpdatedAt;
    }
    if (last.requeued && appState.aList) {
      const pIdx = appState.aList.findIndex(x => x.id === e.id);
      if (pIdx !== -1) appState.aList.splice(pIdx, 1);
    }
    if (appState.aList) appState.aList.unshift(e);
    if (Array.isArray(appState._sessionReviewedItems) && appState._sessionReviewedItems.length > 0) {
      for (let si = appState._sessionReviewedItems.length - 1; si >= 0; si--) {
        const sItem = appState._sessionReviewedItems[si];
        if (sItem && (sItem.id === last.id || (sItem.word === e.word && sItem.lang === (last.lang || e.lang || 'en')))) {
          appState._sessionReviewedItems.splice(si, 1);
          break;
        }
      }
    }

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
        const totalRevCount = parseInt(localStorage.getItem('vv_total_reviews_count') || '0', 10);
        if (totalRevCount > 0) {
          localStorage.setItem('vv_total_reviews_count', String(totalRevCount - 1));
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
                if (global.VocabStorage?.idbPut) global.VocabStorage.idbPut('vv_offline_review_queue', offQ).catch(() => {});
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
    if (_voiceAdvanceTimer) {
      clearTimeout(_voiceAdvanceTimer);
      _voiceAdvanceTimer = null;
    }
    if (global.VocabSpeech?.stopSpeech) {
      global.VocabSpeech.stopSpeech();
    }
    if (global.VocabSpeech?.stopVoiceAnkiListening) {
      global.VocabSpeech.stopVoiceAnkiListening();
    }
    const appState = ctx.appState || (global.VocabCore?.App);
    if (appState) {
      if (appState._blitzTimerId) {
        clearInterval(appState._blitzTimerId);
        appState._blitzTimerId = null;
      }
      appState._isFlashBlitz = false;
    }
    const voiceBanner = $('voiceAnkiBanner');
    if (voiceBanner) voiceBanner.style.display = 'none';
    const blitzPill = $('blitzTimerPill');
    if (blitzPill) blitzPill.style.display = 'none';

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
    const showAdmin = options.isAdmin !== undefined
      ? Boolean(options.isAdmin)
      : Boolean(global.VocabCore?.isAdmin?.() || global.App?.isAdmin || global.App?.isDev);

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
        <div class="workload-day-cell l-${level} ${isToday ? 'today' : ''}" title="${badgeTitle}" data-act="show-day-workload" data-date="${esc(w.date)}" data-count="${w.count}">
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

        ${showAdmin ? `<div class="analytics-card">
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
        </div>` : ''}
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
      global.VocabDOM?.setSafeHtml(el, buildAnalyticsDashboardHtml());
      if (global.VocabI18n?.applyI18nToDOM) {
        global.VocabI18n.applyI18nToDOM(el);
      }
    } catch (err) {
      console.warn('[Analytics Render Error]', err);
      const errTxt = global.VocabI18n?.t ? global.VocabI18n.t('analytics.load_error', 'データの集計中にエラーが発生しました。単語一覧を更新してください。') : 'データの集計中にエラーが発生しました。単語一覧を更新してください。';
      global.VocabDOM?.setSafeHtml(el, `<div style="padding:24px 16px;text-align:center;color:var(--s)">${errTxt}</div>`);
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
    const showToast = global.VocabModal?.showToast || (() => {});
    if (res.success) {
      const msg = global.VocabI18n?.t ? global.VocabI18n.t('analytics.optimize_ok', { count: res.count, imp: res.improvement }) : `FSRS重みを最適化しました（学習ログ ${res.count}件、予測精度向上: ${res.improvement}）。`;
      showToast(msg, 'ok', 4000);
      renderAnalyticsDashboard();
    } else {
      const msg = global.VocabI18n?.t ? global.VocabI18n.t('analytics.optimize_need_more') : (res.message || '学習ログが20件以上蓄積されると最適化可能です。');
      showToast(msg, 'info', 3500);
    }
  }

  function triggerResetWeights(skipConfirm = false) {
    const confirmMsg = global.VocabI18n?.t ? global.VocabI18n.t('analytics.reset_confirm') : 'FSRS重み係数をデフォルトの初期値にリセットしますか？';
    if (!skipConfirm && global.VocabModal?.uiConfirm && typeof document !== 'undefined' && document.body?.appendChild) {
      global.VocabModal.uiConfirm(confirmMsg, { danger: true }).then(ok => {
        if (ok) triggerResetWeights(true);
      });
      return;
    }
    if (global.VocabSRS?.resetUserFSRSWeights) {
      global.VocabSRS.resetUserFSRSWeights();
      const showToast = global.VocabModal?.showToast || (() => {});
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
    const sel = /** @type {HTMLSelectElement | null} */ (document.getElementById('workloadCapSelect'));
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
    startFlashBlitz,
    toggleVoiceAnkiMode,
    setupVoiceForCurrentCard,
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
    smoothReviewWorkload: (...args) => global.VocabSRS?.smoothReviewWorkload?.(...args),
    evaluateUserWriting,
    evaluateWritingWithAI
  };

  global.openAnalyticsModal = global.openAnalyticsModal || openAnalyticsModal;
  global.closeAnalyticsModal = global.closeAnalyticsModal || closeAnalyticsModal;
  global.startFlashBlitz = global.startFlashBlitz || startFlashBlitz;
  global.toggleVoiceAnkiMode = global.toggleVoiceAnkiMode || toggleVoiceAnkiMode;

  // [P2-1 解決] CSP準拠のイベント委譲リスナー（インライン onclick / onkeydown の完全排除）
  if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
    document.addEventListener('click', (event) => {
      const target = /** @type {any} */ (event.target);
      const btn = target && typeof target.closest === 'function' ? target.closest('[data-act]') : null;
      if (!btn || typeof btn.getAttribute !== 'function') return;
      const act = btn.getAttribute('data-act');
      if (act === 'flash-blitz') {
        startFlashBlitz();
      } else if (act === 'voice-anki') {
        toggleVoiceAnkiMode();
      } else if (act === 'cloze-check') {
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
      } else if (act === 'analyze-writing' || act === 'analyze-writing-ai') {
        const word = btn.getAttribute('data-word');
        const container = btn.closest('.anki-writing-details') || document;
        const inp = container.querySelector('.anki-writing-input') || document.getElementById('ankiWritingInput');
        const fbEl = container.querySelector('.anki-writing-feedback') || document.getElementById('ankiWritingFeedback');
        if (inp && fbEl) {
          const appState = global.VocabCore?.App || global.App;
          const normW = String(word || '').trim().toLowerCase();
          const currentItem = (appState?.aList?.find(it => it && String(it.word || '').trim().toLowerCase() === normW))
            || (appState?.entries?.find(it => it && String(it.word || '').trim().toLowerCase() === normW))
            || appState?.aList?.[0]
            || {};
          const result = evaluateUserWriting(word, inp.value, currentItem);
          fbEl.textContent = result.feedback;
          fbEl.style.color = result.valid ? 'var(--ok)' : 'var(--warn)';
          if (act === 'analyze-writing-ai' && !result.issues?.some(i => i.type === 'missing') && inp.value.trim()) {
            const curLocale = (global.VocabI18n?.getLocale ? global.VocabI18n.getLocale() : null) || 'ja';
            const tL = currentItem.tgtLang || (curLocale !== 'ja' ? curLocale : (global.App?.tgtLang || 'ja'));
            const loadingMsg = WRITING_FEEDBACK_I18N.aiReviewLoading?.[tL] || WRITING_FEEDBACK_I18N.aiReviewLoading.en;
            fbEl.textContent = loadingMsg;
            fbEl.style.color = 'var(--s)';
            btn.disabled = true;
            const reqWord = normW;
            evaluateWritingWithAI(word, inp.value, currentItem).then((aiRes) => {
              const activeWord = String(appState?.aList?.[0]?.word || '').trim().toLowerCase();
              if (fbEl.isConnected === false || (activeWord && activeWord !== reqWord)) return;
              fbEl.textContent = aiRes.feedback;
              fbEl.style.color = aiRes.valid ? 'var(--ok)' : 'var(--warn)';
            }).catch(() => {
              const activeWord = String(appState?.aList?.[0]?.word || '').trim().toLowerCase();
              if (fbEl.isConnected === false || (activeWord && activeWord !== reqWord)) return;
              fbEl.textContent = result.feedback;
              fbEl.style.color = result.valid ? 'var(--ok)' : 'var(--warn)';
            }).finally(() => {
              if (btn.isConnected !== false) btn.disabled = false;
            });
          }
        }
      }
    });

    document.addEventListener('change', (event) => {
      const target = /** @type {any} */ (event.target);
      if (target && target.id === 'workloadCapSelect') {
        _workloadTargetCap = Number(target.value) || 25;
      }
    });

    document.addEventListener('keydown', (event) => {
      const target = /** @type {any} */ (event.target);
      if (target && typeof target.matches === 'function') {
        if (target.matches('[data-act="cloze-input"]')) {
          if (event.key === 'Enter' && !event.isComposing && event.keyCode !== 229) {
            event.preventDefault();
            window.VocabAnkiView?.checkClozeTyping?.();
          }
        } else if (target.matches('.anki-writing-input')) {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            event.preventDefault();
            const container = target.closest('.anki-writing-details') || document;
            const btn = container.querySelector('[data-act="analyze-writing"]');
            if (btn) btn.click();
          }
        }
      }
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);

export {};
