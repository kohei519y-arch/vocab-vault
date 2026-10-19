/**
 * Vocab Vault — Card Rendering & Visual Presentation Engine (js/card_view.js)
 * High-performance Card DOM Construction, Root Chips, Accordion Tabs & Precision Scroll
 */
(function (global) {
  'use strict';

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const cleanPho = global.VocabStorage?.cleanPho || (p => String(p ?? '').replace(/^[\[/\s]+/, '').replace(/[\]/\s]+$/, '').trim());
  const fmtPho = global.VocabStorage?.fmtPho || (p => { const c = cleanPho(p); return c ? `[ ${c} ]` : ''; });
  const WIKT_ANCHORS = {
    en: '#Etymology',
    fr: '#%C3%89tymologie',
    de: '#Herkunft',
    ja: '#%E8%AA%9E%E6%BA%90'
  };

  const sanitizeWiktUrl = (url, lang = 'en') => {
    if (typeof url !== 'string' || !/^https?:\/\/[a-z0-9\-.]*wiktionary\.org\//i.test(url.trim())) return undefined;
    const clean = url.trim();
    if (clean.includes('#')) return clean;
    const anchor = WIKT_ANCHORS[lang] || WIKT_ANCHORS.en;
    return `${clean}${anchor}`;
  };

  const ETY_CONF_LABELS = { certain: '確実', probable: '有力', disputed: '諸説', unknown: '語源不明' };

  /**
   * 文法上の性別判定 (フランス語・ドイツ語の名詞)
   */
  function detectGrammaticalGender(item, lang = 'en') {
    if (!item || !['fr', 'de'].includes(lang)) return null;
    const gField = String(item.gender || '').trim().toLowerCase();
    const gForm = String(item.grammar_forms || '').trim();
    const w = String(item.word || '').trim();
    const pos = (item.meanings?.[0]?.pos || '').trim();

    // 1. 直接指定フィールド
    if (['m', 'masc', 'masculin', 'masculine'].includes(gField)) {
      return { cls: 'masc', label: lang === 'de' ? 'der (m)' : 'le (m)', full: '男性名詞' };
    }
    if (['f', 'fem', 'feminin', 'feminine'].includes(gField)) {
      return { cls: 'fem', label: lang === 'de' ? 'die (f)' : 'la (f)', full: '女性名詞' };
    }
    if (lang === 'de' && ['n', 'neut', 'neutral', 'neuter'].includes(gField)) {
      return { cls: 'neut', label: 'das (n)', full: '中性名詞' };
    }

    // 2. 品詞タグからの判定 (N[m], N[f], N[n])
    if (/N\[m\]/i.test(pos)) return { cls: 'masc', label: lang === 'de' ? 'der (m)' : 'le (m)', full: '男性名詞' };
    if (/N\[f\]/i.test(pos)) return { cls: 'fem', label: lang === 'de' ? 'die (f)' : 'la (f)', full: '女性名詞' };
    if (lang === 'de' && /N\[n\]/i.test(pos)) return { cls: 'neut', label: 'das (n)', full: '中性名詞' };

    // 3. grammar_forms からの定冠詞・性別記号判定
    if (lang === 'fr') {
      if (/\b(?:le|un|l')\b/i.test(gForm) || /\[m\]|\bm\./i.test(gForm)) return { cls: 'masc', label: 'le (m)', full: '男性名詞' };
      if (/\b(?:la|une)\b/i.test(gForm) || /\[f\]|\bf\./i.test(gForm)) return { cls: 'fem', label: 'la (f)', full: '女性名詞' };
      if (/^le\s+/i.test(w)) return { cls: 'masc', label: 'le (m)', full: '男性名詞' };
      if (/^la\s+/i.test(w)) return { cls: 'fem', label: 'la (f)', full: '女性名詞' };
    } else if (lang === 'de') {
      if (/\bder\b/i.test(gForm) || /\[m\]|\bm\./i.test(gForm)) return { cls: 'masc', label: 'der (m)', full: '男性名詞' };
      if (/\bdie\b/i.test(gForm) || /\[f\]|\bf\./i.test(gForm)) return { cls: 'fem', label: 'die (f)', full: '女性名詞' };
      if (/\bdas\b/i.test(gForm) || /\[n\]|\bn\./i.test(gForm)) return { cls: 'neut', label: 'das (n)', full: '中性名詞' };
      if (/^der\s+/i.test(w)) return { cls: 'masc', label: 'der (m)', full: '男性名詞' };
      if (/^die\s+/i.test(w)) return { cls: 'fem', label: 'die (f)', full: '女性名詞' };
      if (/^das\s+/i.test(w)) return { cls: 'neut', label: 'das (n)', full: '中性名詞' };
    }
    return null;
  }

  const editSvg = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
  const delSvg = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  const graphSvg = '<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';

  /**
   * 検索クエリに応じたテキストハイライト (<mark class="hl">)
   */
  function highlightPlain(raw, reg) {
    const str = String(raw ?? '');
    if (!str || !reg) return esc(str);
    const re = new RegExp(reg.source, reg.flags || 'giu');
    let out = '', last = 0, m;
    while ((m = re.exec(str)) !== null) {
      if (!m[0].length) { re.lastIndex++; continue; }
      out += esc(str.slice(last, m.index)) + `<mark class="hl">${esc(m[0])}</mark>`;
      last = m.index + m[0].length;
    }
    return out + esc(str.slice(last));
  }

  function hlText(str, allowBold = false, qReg = null) {
    const raw = String(str ?? '');
    if (!raw) return '';
    const reg = qReg || global.App?.qReg;
    if (!allowBold) return highlightPlain(raw, reg);
    return raw.split(/(<b>[\s\S]*?<\/b>)/gi).map(p => /^<b>[\s\S]*<\/b>$/i.test(p) ? `<b>${highlightPlain(p.slice(3, -4), reg)}</b>` : highlightPlain(p, reg)).join('');
  }

  /**
   * 相対時間の整形 (1分後, 2日後, 復習期日)
   */
  function relTime(ts) {
    const m = Math.floor(((Number(ts) || Date.now()) - Date.now()) / 60000);
    return m <= 0 ? '復習期日' : m < 60 ? `${m}分後` : m < 1440 ? `${Math.floor(m / 60)}時間後` : `${Math.floor(m / 1440)}日後`;
  }

  /**
   * 意味・語源・歴史文脈のコンパクト整形
   */
  function formatMeaningAndEty(d) {
    const raw = String(d.etymology || '').trim(), meanings = d.meanings || [];
    const hn = String(d.history_note || '').trim();
    const histDigest = hn ? (hn.startsWith('（') ? hn : `（${hn}）`) : '';
    const compactEty = raw.replace(/[①②③④]?\s*【[^】]+】\s*/g, '').replace(/\s+/g, ' ').trim();
    return { meanings, histDigest, compactEty, isLongEty: compactEty.length > 115 };
  }

  /**
   * 同語根・他言語同族語の収集
   */
  function collectEtyPeers(d, rootIndexMap = null) {
    const iL = d.lang || global.App?.lang || 'en', samePeers = new Map(), crossPeers = new Map();
    const gate = !['unknown', 'disputed'].includes(d.etymologyConfidence);
    const rMap = rootIndexMap || global.App?.rootIndexMap;
    const metaTags = (d.etymologyTags && d.etymologyTags.length) ? d.etymologyTags : (global.extractEtyTags ? global.extractEtyTags(d) : []);
    const normRootFn = global.VocabMorphology?.normRootKey || global.normRootKey || (k => k);
    const makeLkFn = global.VocabMorphology?.makeLookupKey || global.makeLookupKey || ((w, l, h) => h > 1 ? `${w}#${h}` : w);

    const chipItems = metaTags.map(t => {
      const k = normRootFn(t);
      const all = (gate && rMap) ? (rMap.get(k) || []).filter(e => !(e.lang === iL && (e.id ? e.id === d.id : e.num === d.num))) : [];
      let hasCog = false;
      all.forEach(p => {
        (p.lang === iL ? samePeers : crossPeers).set(`${p.lang}:${makeLkFn(p.word, p.lang, p.homographIndex)}`, p);
        if (p.lang !== iL) hasCog = true;
      });
      return { tag: t, key: k, count: all.length, hasCog };
    });
    return { chipItems, sameList: [...samePeers.values()], crossList: [...crossPeers.values()] };
  }

  /**
   * カード右カラム (意味、例文、歴史文脈、語根ネットワーク、タブ) のHTML構築
   */
  function buildRight(d, options = {}) {
    const rootIndexMap = options.rootIndexMap || global.App?.rootIndexMap;
    const qReg = options.queryReg || global.App?.qReg;
    const viewMode = options.viewMode || global.App?.viewMode || 'academic';

    const iL = d.lang || options.lang || global.App?.lang || 'en';
    const tL = d.tgtLang || options.tgtLang || global.App?.tgtLang || 'ja';
    const { meanings, histDigest, compactEty, isLongEty } = formatMeaningAndEty(d);
    const mHtml = meanings.map((x, idx) => `<div class="pos-block"><span class="pos">${esc(x.pos)}</span><span class="m-red" data-act="reveal-mask">${hlText(x.text, false, qReg)}${idx === meanings.length - 1 && histDigest ? `<span class="m-hist-note">${hlText(histDigest, false, qReg)}</span>` : ''}</span></div>`).join('');

    const coreBadgeLabel = (tL === 'en' ? 'CORE' : (tL === 'de' ? 'KERN' : (tL === 'fr' ? 'CŒUR' : (tL === 'es' ? 'NÚCLEO' : (tL === 'ko' ? '핵심' : (tL === 'zh' ? '核心' : 'コア'))))));
    const histBadgeLabel = (tL === 'en' ? 'History' : (tL === 'de' ? 'Kontext' : (tL === 'fr' ? 'Histoire' : (tL === 'es' ? 'Historia' : (tL === 'ko' ? '역사·맥락' : (tL === 'zh' ? '历史·背景' : '歴史・文脈'))))));

    const coreHtml = d.core ? `<div class="core-box" data-act="reveal-mask"><span class="core-badge">${coreBadgeLabel}</span><span class="core-text">${hlText(d.core, false, qReg)}</span></div>` : '';

    const hn = String(d.history_note || '').trim();
    const histHtml = hn ? `<div class="hist-box" data-act="reveal-mask"><span class="hist-badge">${histBadgeLabel}</span><span>${hlText(hn, false, qReg)}</span></div>` : '';

    const spkFn = (txt, l, sm) => global.VocabSpeech ? global.VocabSpeech.mkSpkBtn(txt, l, sm) : '';

    const exTrans = d.example ? (d.example.trans || (tL && d.example[tL]) || d.example.ja || '') : '';
    const hasEx = d.example && (d.example.foreign || exTrans);
    const ctxTagLabel = (tL === 'en' ? 'Context' : (tL === 'ko' ? '맥락' : (tL === 'zh' ? '语境' : (tL === 'de' ? 'Kontext' : (tL === 'fr' ? 'Contexte' : '文脈')))));
    const ctxHtml = d.contextSentence ? `<div class="ctx-src"><span class="ctx-tag">${ctxTagLabel}</span>${hlText(d.contextSentence, false, qReg)}</div>` : '';
    const exHtml = (hasEx || ctxHtml) ? `<div class="ex-block">${hasEx ? `<div class="ex-en">${spkFn(d.example.foreign, iL, true)}<span>${hlText(d.example.foreign, false, qReg)}</span></div><div class="ex-ja" data-act="reveal-mask">${hlText(exTrans, true, qReg)}</div>` : ''}${ctxHtml}</div>` : '';

    const phHtml = (d.phrases || []).map(x => {
      const trans = x.trans || (tL && x[tL]) || x.ja || '';
      return `<div class="ph-line">${spkFn(x.foreign, iL, true)}<strong>${hlText(x.foreign, false, qReg)}</strong> <span>${hlText(trans, false, qReg)}</span></div>`;
    }).join('');
    const drvHtml = (d.derivatives || []).map(x => {
      const trans = x.sub_trans || (tL && x[`sub_trans_${tL}`]) || '';
      const sub = x.sub_phrase ? `<div class="sub-p">${spkFn(x.sub_phrase, iL, true)}<span>${hlText(x.sub_phrase, false, qReg)}</span> <span>${hlText(trans, false, qReg)}</span></div>` : '';
      return `<div><div class="sub-h">${spkFn(x.word, iL, true)}<strong>${hlText(x.word, false, qReg)}</strong> <span style="font-family:var(--mono);font-size:11px;color:var(--s)">${esc(fmtPho(x.phonetic))}</span><span class="pos-lbl">${esc(x.pos)}</span><span class="sub-m">${hlText(x.meaning, false, qReg)}</span></div>${sub}</div>`;
    }).join('');

    const safeUrl = sanitizeWiktUrl(d.wiktUrl, iL);
    const wiktPill = (d.wiktGrounded && safeUrl) ? `<a class="wikt-pill" href="${esc(safeUrl)}" target="_blank" rel="noopener noreferrer" title="Wiktionaryの言語セクションおよび語源・発音資料と照合済み (CC BY-SA)">Wiktionary裏付</a>` : '';
    const confKey = (d.etymologyConfidence && ETY_CONF_LABELS[d.etymologyConfidence]) ? d.etymologyConfidence : (compactEty ? 'probable' : 'unknown');
    const confPill = `<span class="conf-pill ${esc(confKey)}" title="語源の学術的確度: ${esc(ETY_CONF_LABELS[confKey])}">${esc(ETY_CONF_LABELS[confKey])}</span>`;
    const reportBtn = compactEty ? `<button type="button" class="report-ety-btn" data-act="report-ety" data-word="${esc(d.word)}" data-lang="${esc(iL)}" data-ety="${esc(compactEty)}" title="語源の誤り・修正を報告" aria-label="語源報告"><svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg><span>誤り報告</span></button>` : '';
    const etyHtml = (compactEty || wiktPill) ? `<div class="ety ${isLongEty ? 'clamp' : ''}" ${isLongEty ? 'data-act="toggle-clamp"' : ''}>${wiktPill}${confPill}${hlText(compactEty, false, qReg)}${reportBtn}</div>` : '';

    const { chipItems, sameList, crossList } = collectEtyPeers(d, rootIndexMap);
    const chipsHtml = chipItems.map(c => `<span class="root-chip-wrap"><span class="root-chip ${c.count ? 'has-rel' : ''} ${c.hasCog ? 'has-cog' : ''}" data-act="search-root" data-query="${esc(c.key)}" data-xlang="${c.hasCog ? '1' : '0'}" title="リストで絞り込み">${hlText(c.tag, false, qReg)}${c.count ? `<span class="cnt ${c.hasCog ? 'cog-cnt' : ''}">${c.hasCog ? '3言語:' : ''}${c.count + 1}</span>` : ''}</span><button type="button" class="root-graph-btn" data-act="open-graph" data-root="${esc(c.key)}" title="「${esc(c.tag)}」の語根ネットワークを開く" aria-label="語根グラフ表示">${graphSvg}</button></span>`).join('');
    const fmtPeerLabel = p => p.homographIndex > 1 ? `${p.word}#${p.homographIndex}` : p.word;
    const sLnk = sameList.length ? `<span class="ety-lbl">同語根:</span>` + sameList.map(p => `<a class="rel-link" data-act="jump" data-word="${esc(fmtPeerLabel(p))}" data-lang="${esc(p.lang)}">${esc(fmtPeerLabel(p))}</a>`).join('') : '';
    const cLnk = crossList.length ? `<span class="ety-lbl">同族候補:</span>` + crossList.map(p => `<a class="cog-link" data-act="jump" data-word="${esc(fmtPeerLabel(p))}" data-lang="${esc(p.lang)}"><span class="cog-l">${esc(p.lang.toUpperCase())}</span><span>${esc(fmtPeerLabel(p))}</span></a>`).join('') : '';
    const netHtml = (chipsHtml || sLnk || cLnk) ? `<div class="ety-net">${chipsHtml}${sLnk}${cLnk}</div>` : '';
    const flagHtml = d.flags?.length ? `<div class="ety-net"><span class="conf-pill unknown" title="${esc(d.flags.join(' / '))}">要確認 ${d.flags.length}</span><span class="ety-lbl">${esc(d.flags.join(' / '))}</span></div>` : '';

    const matrix = global.VocabMorphology?.buildCognateMatrix ? global.VocabMorphology.buildCognateMatrix(d, rootIndexMap) : null;
    const matrixHtml = matrix ? (global.VocabMorphology?.renderCognateMatrixHtml ? global.VocabMorphology.renderCognateMatrixHtml(matrix) : '') : '';

    const panelHist = histHtml;
    const panelEx = `${exHtml}${phHtml ? `<div class="ph-wrap">${phHtml}</div>` : ''}`;
    const panelDrv = drvHtml ? `<div class="d-wrap">${drvHtml}</div>` : '';
    const panelEty = `${coreHtml}${etyHtml}${matrixHtml}${netHtml}${flagHtml}`;

    const fullDetailsContent = `${histHtml}${exHtml}${phHtml ? `<div class="ph-wrap">${phHtml}</div>` : ''}${drvHtml ? `<div class="d-wrap">${drvHtml}</div>` : ''}${coreHtml}${etyHtml}${matrixHtml}${netHtml}${flagHtml}`;

    const etyTabLbl = (tL === 'en' ? 'Etymology' : (tL === 'ko' ? '어원·어근' : (tL === 'zh' ? '词源·词根' : (tL === 'de' ? 'Etymologie' : (tL === 'fr' ? 'Étymologie' : (tL === 'es' ? 'Etimología' : (tL === 'it' ? 'Etimologia' : '語源・語根')))))));
    const exTabLbl = (tL === 'en' ? 'Examples' : (tL === 'ko' ? '예문·구문' : (tL === 'zh' ? '例句·成语' : (tL === 'de' ? 'Beispiele' : (tL === 'fr' ? 'Exemples' : (tL === 'es' ? 'Ejemplos' : (tL === 'it' ? 'Esempi' : '例文・成句')))))));
    const histTabLbl = (tL === 'en' ? 'History' : (tL === 'ko' ? '역사·배경' : (tL === 'zh' ? '历史·背景' : (tL === 'de' ? 'Geschichte' : (tL === 'fr' ? 'Histoire' : (tL === 'es' ? 'Historia' : (tL === 'it' ? 'Storia' : '歴史・背景')))))));
    const drvTabLbl = (tL === 'en' ? 'Derivatives' : (tL === 'ko' ? '파생어' : (tL === 'zh' ? '衍生词' : (tL === 'de' ? 'Ableitungen' : (tL === 'fr' ? 'Dérivés' : (tL === 'es' ? 'Derivados' : (tL === 'it' ? 'Derivati' : '派生語')))))));
    const allTabLbl = (tL === 'en' ? 'All' : (tL === 'ko' ? '전체' : (tL === 'zh' ? '全部' : (tL === 'de' ? 'Alle' : (tL === 'fr' ? 'Tout' : (tL === 'es' ? 'Todo' : (tL === 'it' ? 'Tutto' : 'すべて')))))));

    const panels = [];
    if (panelEty) panels.push({ id: 'ety', label: etyTabLbl, html: panelEty });
    if (panelEx) panels.push({ id: 'ex', label: exTabLbl, html: panelEx });
    if (panelHist) panels.push({ id: 'hist', label: histTabLbl, html: panelHist });
    if (panelDrv) panels.push({ id: 'drv', label: drvTabLbl, html: panelDrv });

    const hasMultiPanels = panels.length > 1;
    const defaultTab = panels[0]?.id || 'all';

    let accordionBodyContent = '';
    if (hasMultiPanels) {
      const tabBtns = panels.map(p => `<button type="button" class="detail-tab-btn ${p.id === defaultTab ? 'active' : ''}" role="tab" aria-selected="${p.id === defaultTab ? 'true' : 'false'}" data-act="switch-detail-tab" data-tab="${p.id}">${p.label}</button>`).join('') +
        `<button type="button" class="detail-tab-btn ${defaultTab === 'all' ? 'active' : ''}" role="tab" aria-selected="${defaultTab === 'all' ? 'true' : 'false'}" data-act="switch-detail-tab" data-tab="all">${allTabLbl}</button>`;
      const tabsBar = `<div class="detail-tabs-bar" role="tablist">${tabBtns}</div>`;
      const panelDivs = panels.map(p => `<div class="detail-panel" role="tabpanel" data-panel="${p.id}" style="display:${p.id === defaultTab ? 'block' : 'none'}">${p.html}</div>`).join('');
      accordionBodyContent = `${tabsBar}${panelDivs}`;
    } else {
      accordionBodyContent = fullDetailsContent;
    }

    const isSimple = viewMode === 'simple';
    const openAttr = isSimple ? '' : ' open';
    const initialLabel = hasMultiPanels ? `${panels.find(p => p.id === defaultTab)?.label || '詳細'} を表示中` : '詳細（語源・例文・歴史）を見る';
    const accordion = fullDetailsContent ? `<details class="card-details-accordion ${isSimple ? 'is-simple-mode' : ''}"${openAttr}><summary class="card-details-sum"><span class="sum-lbl">${initialLabel}</span><span class="sum-arrow">▾</span></summary><div class="card-details-body">${accordionBodyContent}</div></details>` : '';

    const quickChips = chipsHtml ? `<div class="card-quick-chips">${chipsHtml}</div>` : '';
    return `<div class="right"><div class="m-line">${mHtml}</div>${quickChips}${accordion}</div>`;
  }

  /**
   * DOMカード要素の完全生成 (Error Boundary 保護付き)
   */
  function createCardElement(i, options = {}) {
    try {
      if (!i || typeof i !== 'object') throw new Error('無効な単語データオブジェクトです。');
      const iL = i.lang || options.lang || global.App?.lang || 'en';
      const c = document.createElement('div');
      const due = Number(i.nextReview || 0) <= Date.now();
      const makeLkFn = global.VocabMorphology?.makeLookupKey || global.makeLookupKey || ((w, l, h) => h > 1 ? `${w}#${h}` : w);

      c.className = 'card';
      if (typeof c.setAttribute === 'function') {
        c.setAttribute('role', 'article');
        c.setAttribute('aria-label', `${i.word || '単語'} の単語カード`);
      }
      c.dataset.word = makeLkFn(i.word || '', iL, i.homographIndex);
      c.dataset.rawWord = i.word || '';
      c.dataset.lang = iL;
      if (i.id) c.dataset.id = i.id;

      const homoHtml = i.homographIndex > 1 ? `<span class="homo-badge" title="同形異義語 #${i.homographIndex}">#${i.homographIndex}</span>` : '';
      const gender = detectGrammaticalGender(i, iL);
      const genderHtml = gender ? `<span class="gender-badge ${gender.cls}" title="${esc(gender.full)}">${esc(gender.label)}</span>` : '';
      const gramHtml = i.grammar_forms ? `<div class="gram-line">${hlText(i.grammar_forms, false, options.queryReg)}</div>` : '';
      const spkFn = (txt, l) => global.VocabSpeech ? global.VocabSpeech.mkSpkBtn(txt, l) : '';
      const crossPill = options.crossLang ? `<span class="lang-pill">${esc(iL.toUpperCase())}</span>` : '';

      const catHtml = i.category ? `<span class="tag" data-act="filter" data-type="cat" data-val="${esc(i.category)}">${esc(i.category)}</span>` : '';
      const folHtml = i.folder ? `<span class="tag" style="border-style:dashed" data-act="filter" data-type="fol" data-val="${esc(i.folder)}">${esc(i.folder)}</span>` : '';

      c.innerHTML = `<div class="card-acts"><button type="button" class="act-icon-btn" data-act="edit" data-id="${esc(i.id)}" data-num="${i.num || 0}" data-lang="${esc(iL)}" title="カードを編集" aria-label="編集">${editSvg}</button><button type="button" class="act-icon-btn del-btn" data-act="del" data-id="${esc(i.id)}" data-num="${i.num || 0}" data-lang="${esc(iL)}" title="削除" aria-label="削除">${delSvg}</button></div><div class="col-left"><div class="hw-wrap"><span class="id">#${i.num || 0}</span>${crossPill}${homoHtml}${genderHtml}<span class="hw" data-act="speak" data-text="${esc(i.word || '')}" data-lang="${esc(iL)}" title="クリックでネイティブ発音">${hlText(i.word || '', false, options.queryReg)}</span>${spkFn(i.word || '', iL)}</div>${gramHtml}<div class="tag-wrap">${catHtml}${folHtml}</div><div class="pho">${esc(fmtPho(i.phonetic))}<span class="due ${due ? 'is-due' : 'is-fut'}">${relTime(i.nextReview)}</span></div></div>${buildRight(i, options)}`;
      return c;
    } catch (err) {
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn('[CardView Error Boundary] Failed to render card element:', err, i);
      }
      const errCard = document.createElement('div');
      errCard.className = 'card card-error-fallback';
      const safeId = esc(i?.id || '');
      const safeWord = esc(i?.word || '名称不明');
      const safeNum = i?.num || '?';
      const safeLang = esc(i?.lang || options.lang || 'en');
      errCard.dataset.word = safeWord;
      if (safeId) errCard.dataset.id = safeId;
      errCard.innerHTML = `
        <div class="card-acts">
          <button type="button" class="act-icon-btn del-btn" data-act="del" data-id="${safeId}" data-num="${safeNum}" data-lang="${safeLang}" title="破損カードを削除" aria-label="削除">${delSvg}</button>
        </div>
        <div style="grid-column:1/-1;padding:12px 14px;background:rgba(239,68,68,0.08);border:1px dashed var(--r);border-radius:6px;display:flex;align-items:center;justify-content:space-between;gap:10px">
          <div>
            <div style="font-weight:700;color:var(--r);font-size:12.5px;display:flex;align-items:center;gap:6px">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span>カード表示エラー (#${safeNum}: ${safeWord})</span>
            </div>
            <div style="font-size:11px;color:var(--s);margin-top:2px">データの構文解釈中にエラーが発生しました（${esc(err.message)}）。他のカードは安全に保持されています。</div>
          </div>
          <button type="button" class="btn-xs btn-o" data-act="edit" data-id="${safeId}" data-num="${safeNum}" data-lang="${safeLang}" style="white-space:nowrap">編集・修復</button>
        </div>
      `;
      return errCard;
    }
  }

  /**
   * スクロールコンテナ内における要素の累積Y絶対座標（scrollTop非依存）を算出
   */
  function getElementTopInContainer(el, container) {
    if (!el || !container) return 0;
    let offset = 0;
    let curr = el;
    let found = false;
    while (curr && curr !== container) {
      offset += (curr.offsetTop || 0);
      curr = curr.offsetParent;
      if (curr === container) {
        found = true;
        break;
      }
    }
    if (found) {
      return offset;
    }
    // offsetParentチェーンに container が含まれなかった場合（position設定差等）の安全フォールバック
    if (typeof el.getBoundingClientRect === 'function' && typeof container.getBoundingClientRect === 'function') {
      const eRect = el.getBoundingClientRect();
      const cRect = container.getBoundingClientRect();
      return (eRect.top - cRect.top) + (container.scrollTop || 0);
    }
    return el.offsetTop || 0;
  }

  /**
   * 対象カード要素を画面サイズ・レスポンシブ配置に応じて適切にスクロールし、発光ハイライトを付与
   * 画面サイズが異なる場合（モバイル、タブレット、小型/大型PC）や、仮想キーボード・サイドバー開閉等の
   * 動的レイアウト変化後でも確実にターゲット単語を可視領域内に収める堅牢設計
   */
  function scrollToCard(el, container = null, options = {}) {
    if (!el) return;
    const scrollContainer = container || (typeof document !== 'undefined' ? document.getElementById('mainScroll') : null);
    const behavior = options.immediate ? 'auto' : 'smooth';

    function performScroll(smooth = true) {
      if (!el) return;
      if (scrollContainer) {
        const cHeight = scrollContainer.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 600);
        const eHeight = el.offsetHeight || el.clientHeight || 100;
        const elementTop = getElementTopInContainer(el, scrollContainer);

        const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
        const topSafeOffset = isMobile ? 24 : 16;

        let targetScrollTop;
        // カードの高さが表示領域の60%を超える場合、またはモバイル画面の場合は、
        // 中央揃えだと見出し語が上部に隠れたり切れたりするため、上部安全余白を空けて上揃え配置
        if (eHeight >= cHeight * 0.6 || isMobile) {
          targetScrollTop = elementTop - topSafeOffset;
        } else {
          // デスクトップで通常カードの場合は視認性の高い中央揃え
          targetScrollTop = elementTop - (cHeight / 2) + (eHeight / 2);
        }

        const safeTop = Math.max(0, targetScrollTop);
        try {
          scrollContainer.scrollTo?.({ top: safeTop, behavior: smooth ? 'smooth' : 'auto' });
        } catch {
          scrollContainer.scrollTop = safeTop;
        }
      } else if (typeof el.scrollIntoView === 'function') {
        try {
          el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' });
        } catch {
          el.scrollIntoView();
        }
      }
    }

    // 第1フェーズ: 即時/指定アニメーション実行
    performScroll(behavior === 'smooth');

    // 第2フェーズ: DOM reflow および サイドバー開閉(280ms)・仮想キーボード(300ms)後の位置ずれを自動補正
    if (!options.skipRetry) {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => performScroll(behavior === 'smooth'));
      }
      setTimeout(() => performScroll(true), 80);
      setTimeout(() => performScroll(false), 320);
    }

    el.classList?.add?.('highlight-jump');
    if (typeof document !== 'undefined') {
      const cards = [...document.querySelectorAll('#list .card')];
      const cIdx = cards.indexOf(el);
      if (cIdx >= 0 && global.App) global.App.focusedCardIndex = cIdx;
    }
    setTimeout(() => el.classList?.remove?.('highlight-jump'), 2000);
  }

  /**
   * DOM上のカード一覧から指定単語の要素を特定（キー・生単語・見出し語・IDの多重照合）
   */
  function findCardElement(cards, targetWord, targetLk, baseTargetLk, targetId = null) {
    if (!Array.isArray(cards) || !cards.length) return null;
    if (targetId) {
      const byId = cards.find(c => c && c.dataset && c.dataset.id === targetId);
      if (byId) return byId;
    }
    const cleanW = (targetWord || '').toLowerCase().trim();
    return cards.find(c => c.dataset.word === targetLk)
      || cards.find(c => c.dataset.word === baseTargetLk)
      || cards.find(c => c.dataset.rawWord?.trim()?.toLowerCase() === cleanW)
      || cards.find(c => c.querySelector('.hw')?.textContent?.trim()?.toLowerCase() === cleanW)
      || null;
  }

  // --- グローバルエクスポート ---
  global.VocabCardView = {
    detectGrammaticalGender,
    highlightPlain,
    hlText,
    relTime,
    formatMeaningAndEty,
    collectEtyPeers,
    buildRight,
    createCardElement,
    scrollToCard,
    findCardElement
  };
})(typeof window !== 'undefined' ? window : globalThis);
