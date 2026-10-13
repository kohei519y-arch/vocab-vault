/**
 * Vocab Vault — Card Rendering & Visual Presentation Engine (js/card_view.js)
 * High-performance Card DOM Construction, Root Chips, Accordion Tabs & Precision Scroll
 */
(function (global) {
  'use strict';

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const cleanPho = p => String(p ?? '').replace(/^[\[/\s]+/, '').replace(/[\]/\s]+$/, '').trim();
  const fmtPho = p => { const c = cleanPho(p); return c ? `[ ${c} ]` : ''; };
  const sanitizeWiktUrl = url => (typeof url === 'string' && /^https?:\/\/[a-z0-9\-.]*wiktionary\.org\//i.test(url.trim())) ? url.trim() : undefined;

  const ETY_CONF_LABELS = { certain: '確実', probable: '有力', disputed: '諸説', unknown: '語源不明' };

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
    if (global.VocabExport && typeof global.VocabExport.formatMeaningAndEty === 'function') {
      return global.VocabExport.formatMeaningAndEty(d);
    }
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
    const { meanings, histDigest, compactEty, isLongEty } = formatMeaningAndEty(d);
    const mHtml = meanings.map((x, idx) => `<div class="pos-block"><span class="pos">${esc(x.pos)}</span><span class="m-red" data-act="reveal-mask">${hlText(x.text, false, qReg)}${idx === meanings.length - 1 && histDigest ? `<span class="m-hist-note">${hlText(histDigest, false, qReg)}</span>` : ''}</span></div>`).join('');

    const hn = String(d.history_note || '').trim();
    const histHtml = hn ? `<div class="hist-box" data-act="reveal-mask"><span class="hist-badge">歴史・文脈</span><span>${hlText(hn, false, qReg)}</span></div>` : '';

    const spkFn = (txt, l, sm) => global.VocabSpeech ? global.VocabSpeech.mkSpkBtn(txt, l, sm) : '';

    const hasEx = d.example && (d.example.foreign || d.example.ja);
    const ctxHtml = d.contextSentence ? `<div class="ctx-src"><span class="ctx-tag">文脈</span>${hlText(d.contextSentence, false, qReg)}</div>` : '';
    const exHtml = (hasEx || ctxHtml) ? `<div class="ex-block">${hasEx ? `<div class="ex-en">${spkFn(d.example.foreign, iL, true)}<span>${hlText(d.example.foreign, false, qReg)}</span></div><div class="ex-ja" data-act="reveal-mask">${hlText(d.example.ja, true, qReg)}</div>` : ''}${ctxHtml}</div>` : '';

    const phHtml = (d.phrases || []).map(x => `<div class="ph-line">${spkFn(x.foreign, iL, true)}<strong>${hlText(x.foreign, false, qReg)}</strong> <span>${hlText(x.ja, false, qReg)}</span></div>`).join('');
    const drvHtml = (d.derivatives || []).map(x => {
      const sub = x.sub_phrase ? `<div class="sub-p">${spkFn(x.sub_phrase, iL, true)}<span>${hlText(x.sub_phrase, false, qReg)}</span> <span>${hlText(x.sub_trans, false, qReg)}</span></div>` : '';
      return `<div><div class="sub-h">${spkFn(x.word, iL, true)}<strong>${hlText(x.word, false, qReg)}</strong> <span style="font-family:var(--mono);font-size:11px;color:var(--s)">${esc(fmtPho(x.phonetic))}</span><span class="pos-lbl">${esc(x.pos)}</span><span class="sub-m">${hlText(x.meaning, false, qReg)}</span></div>${sub}</div>`;
    }).join('');

    const coreHtml = d.core ? `<div class="core-box" data-act="reveal-mask">コア: ${hlText(d.core, false, qReg)}</div>` : '';
    const safeUrl = sanitizeWiktUrl(d.wiktUrl);
    const wiktPill = (d.wiktGrounded && safeUrl) ? `<a class="wikt-pill" href="${esc(safeUrl)}" target="_blank" rel="noopener noreferrer" title="Wiktionaryの言語セクションおよび語源・発音資料と照合済み (CC BY-SA)">Wiktionary裏付</a>` : '';
    const confPill = d.etymologyConfidence && ETY_CONF_LABELS[d.etymologyConfidence] ? `<span class="conf-pill ${esc(d.etymologyConfidence)}">${esc(ETY_CONF_LABELS[d.etymologyConfidence])}</span>` : '';
    const etyHtml = compactEty ? `<div class="ety ${isLongEty ? 'clamp' : ''}" ${isLongEty ? 'data-act="toggle-clamp"' : ''}>${wiktPill}${confPill}${hlText(compactEty, false, qReg)}</div>` : '';

    const { chipItems, sameList, crossList } = collectEtyPeers(d, rootIndexMap);
    const chipsHtml = chipItems.map(c => `<span class="root-chip-wrap"><span class="root-chip ${c.count ? 'has-rel' : ''} ${c.hasCog ? 'has-cog' : ''}" data-act="search-root" data-query="${esc(c.key)}" data-xlang="${c.hasCog ? '1' : '0'}" title="リストで絞り込み">${hlText(c.tag, false, qReg)}${c.count ? `<span class="cnt ${c.hasCog ? 'cog-cnt' : ''}">${c.hasCog ? '3言語:' : ''}${c.count + 1}</span>` : ''}</span><button type="button" class="root-graph-btn" data-act="open-graph" data-root="${esc(c.key)}" title="「${esc(c.tag)}」の語根ネットワークを開く" aria-label="語根グラフ表示">${graphSvg}</button></span>`).join('');
    const fmtPeerLabel = p => p.homographIndex > 1 ? `${p.word}#${p.homographIndex}` : p.word;
    const sLnk = sameList.length ? `<span class="ety-lbl">同語根:</span>` + sameList.map(p => `<a class="rel-link" data-act="jump" data-word="${esc(fmtPeerLabel(p))}" data-lang="${esc(p.lang)}">${esc(fmtPeerLabel(p))}</a>`).join('') : '';
    const cLnk = crossList.length ? `<span class="ety-lbl">同族候補:</span>` + crossList.map(p => `<a class="cog-link" data-act="jump" data-word="${esc(fmtPeerLabel(p))}" data-lang="${esc(p.lang)}"><span class="cog-l">${esc(p.lang.toUpperCase())}</span><span>${esc(fmtPeerLabel(p))}</span></a>`).join('') : '';
    const netHtml = (chipsHtml || sLnk || cLnk) ? `<div class="ety-net">${chipsHtml}${sLnk}${cLnk}</div>` : '';
    const flagHtml = d.flags?.length ? `<div class="ety-net"><span class="conf-pill unknown" title="${esc(d.flags.join(' / '))}">要確認 ${d.flags.length}</span><span class="ety-lbl">${esc(d.flags.join(' / '))}</span></div>` : '';

    const panelHist = histHtml;
    const panelEx = `${exHtml}${phHtml ? `<div class="ph-wrap">${phHtml}</div>` : ''}`;
    const panelDrv = drvHtml ? `<div class="d-wrap">${drvHtml}</div>` : '';
    const panelEty = `${coreHtml}${etyHtml}${netHtml}${flagHtml}`;

    const fullDetailsContent = `${histHtml}${exHtml}${phHtml ? `<div class="ph-wrap">${phHtml}</div>` : ''}${drvHtml ? `<div class="d-wrap">${drvHtml}</div>` : ''}${coreHtml}${etyHtml}${netHtml}${flagHtml}`;

    const panels = [];
    if (panelEty) panels.push({ id: 'ety', label: '語源・語根', html: panelEty });
    if (panelEx) panels.push({ id: 'ex', label: '例文・成句', html: panelEx });
    if (panelHist) panels.push({ id: 'hist', label: '歴史・背景', html: panelHist });
    if (panelDrv) panels.push({ id: 'drv', label: '派生語', html: panelDrv });

    const hasMultiPanels = panels.length > 1;
    const defaultTab = panels[0]?.id || 'all';

    let accordionBodyContent = '';
    if (hasMultiPanels) {
      const tabBtns = panels.map(p => `<button type="button" class="detail-tab-btn ${p.id === defaultTab ? 'active' : ''}" role="tab" aria-selected="${p.id === defaultTab ? 'true' : 'false'}" data-act="switch-detail-tab" data-tab="${p.id}">${p.label}</button>`).join('') +
        `<button type="button" class="detail-tab-btn ${defaultTab === 'all' ? 'active' : ''}" role="tab" aria-selected="${defaultTab === 'all' ? 'true' : 'false'}" data-act="switch-detail-tab" data-tab="all">すべて</button>`;
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

    if (isSimple) {
      return `<div class="right"><div class="m-line">${mHtml}</div>${quickChips}${accordion}</div>`;
    }

    return `<div class="right"><div class="m-line">${mHtml}</div>${quickChips}<div class="desktop-only-details">${fullDetailsContent}</div>${accordion}</div>`;
  }

  /**
   * DOMカード要素の完全生成
   */
  function createCardElement(i, options = {}) {
    const iL = i.lang || options.lang || global.App?.lang || 'en';
    const c = document.createElement('div');
    const due = i.nextReview <= Date.now();
    const makeLkFn = global.VocabMorphology?.makeLookupKey || global.makeLookupKey || ((w, l, h) => h > 1 ? `${w}#${h}` : w);

    c.className = 'card';
    if (typeof c.setAttribute === 'function') {
      c.setAttribute('role', 'article');
      c.setAttribute('aria-label', `${i.word} の単語カード`);
    }
    c.dataset.word = makeLkFn(i.word, iL, i.homographIndex);
    c.dataset.rawWord = i.word;
    c.dataset.lang = iL;
    if (i.id) c.dataset.id = i.id;

    const homoHtml = i.homographIndex > 1 ? `<span class="homo-badge" title="同形異義語 #${i.homographIndex}">#${i.homographIndex}</span>` : '';
    const gramHtml = i.grammar_forms ? `<div class="gram-line">${hlText(i.grammar_forms, false, options.queryReg)}</div>` : '';
    const spkFn = (txt, l) => global.VocabSpeech ? global.VocabSpeech.mkSpkBtn(txt, l) : '';
    const crossPill = options.crossLang ? `<span class="lang-pill">${esc(iL.toUpperCase())}</span>` : '';

    const catHtml = i.category ? `<span class="tag" data-act="filter" data-type="cat" data-val="${esc(i.category)}">${esc(i.category)}</span>` : '';
    const folHtml = i.folder ? `<span class="tag" style="border-style:dashed" data-act="filter" data-type="fol" data-val="${esc(i.folder)}">${esc(i.folder)}</span>` : '';

    c.innerHTML = `<div class="card-acts"><button type="button" class="act-icon-btn" data-act="edit" data-id="${esc(i.id)}" data-num="${i.num}" data-lang="${esc(iL)}" title="カードを編集" aria-label="編集">${editSvg}</button><button type="button" class="act-icon-btn del-btn" data-act="del" data-id="${esc(i.id)}" data-num="${i.num}" data-lang="${esc(iL)}" title="削除" aria-label="削除">${delSvg}</button></div><div class="col-left"><div class="hw-wrap"><span class="id">#${i.num}</span>${crossPill}${homoHtml}<span class="hw" data-act="speak" data-text="${esc(i.word)}" data-lang="${esc(iL)}" title="クリックでネイティブ発音">${hlText(i.word, false, options.queryReg)}</span>${spkFn(i.word, iL)}</div>${gramHtml}<div class="tag-wrap">${catHtml}${folHtml}</div><div class="pho">${esc(fmtPho(i.phonetic))}<span class="due ${due ? 'is-due' : 'is-fut'}">${relTime(i.nextReview)}</span></div></div>${buildRight(i, options)}`;
    return c;
  }

  /**
   * 対象カード要素を画面中央にスムーズスクロールし、発光ハイライトを付与
   */
  function scrollToCard(el, container = null) {
    if (!el) return;
    const scrollContainer = container || (typeof document !== 'undefined' ? document.getElementById('mainScroll') : null);
    if (scrollContainer && typeof scrollContainer.getBoundingClientRect === 'function') {
      const cRect = scrollContainer.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      const targetScrollTop = scrollContainer.scrollTop + (eRect.top - cRect.top) - (scrollContainer.clientHeight / 2) + (el.clientHeight / 2);
      scrollContainer.scrollTo?.({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
    } else {
      el.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
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
   * DOM上のカード一覧から指定単語の要素を特定（キー・生単語・見出し語の多重照合）
   */
  function findCardElement(cards, targetWord, targetLk, baseTargetLk) {
    const cleanW = (targetWord || '').toLowerCase().trim();
    return cards.find(c => c.dataset.word === targetLk)
      || cards.find(c => c.dataset.word === baseTargetLk)
      || cards.find(c => c.dataset.rawWord?.trim()?.toLowerCase() === cleanW)
      || cards.find(c => c.querySelector('.hw')?.textContent?.trim()?.toLowerCase() === cleanW)
      || null;
  }

  // --- グローバルエクスポート ---
  global.VocabCardView = {
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
