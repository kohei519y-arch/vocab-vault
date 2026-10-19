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

  const ETY_CONF_LABELS = {
    ja: { certain: '確実', probable: '有力', disputed: '諸説', unknown: '語源不明' },
    en: { certain: 'Certain', probable: 'Probable', disputed: 'Disputed', unknown: 'Unknown' },
    de: { certain: 'Sicher', probable: 'Wahrscheinlich', disputed: 'Umstritten', unknown: 'Unbekannt' },
    fr: { certain: 'Certain', probable: 'Probable', disputed: 'Contesté', unknown: 'Inconnu' },
    es: { certain: 'Cierto', probable: 'Probable', disputed: 'Discutido', unknown: 'Desconocido' },
    it: { certain: 'Certo', probable: 'Probabile', disputed: 'Conteso', unknown: 'Sconosciuto' },
    pt: { certain: 'Certo', probable: 'Provável', disputed: 'Disputado', unknown: 'Desconhecido' },
    nl: { certain: 'Zeker', probable: 'Waarschijnlijk', disputed: 'Betwist', unknown: 'Onbekend' },
    zh: { certain: '确凿', probable: '有力', disputed: '存疑', unknown: '词源未详' },
    ko: { certain: '확실', probable: '유력', disputed: '이설', unknown: '어원 미상' }
  };

  /**
   * 文法上の性別判定 (フランス語・ドイツ語の名詞)
   */
  function detectGrammaticalGender(item, lang = 'en', targetLocale = 'ja') {
    if (!item || !['fr', 'de'].includes(lang)) return null;
    const gField = String(item.gender || '').trim().toLowerCase();
    const gForm = String(item.grammar_forms || '').trim();
    const w = String(item.word || '').trim();
    const pos = (item.meanings?.[0]?.pos || '').trim();
    const tL = targetLocale || 'ja';

    const getFullLabel = (gender) => {
      if (tL === 'ja') return gender === 'm' ? '男性名詞' : gender === 'f' ? '女性名詞' : '中性名詞';
      if (tL === 'de') return gender === 'm' ? 'Maskulinum' : gender === 'f' ? 'Femininum' : 'Neutrum';
      if (tL === 'fr') return gender === 'm' ? 'Masculin' : gender === 'f' ? 'Féminin' : 'Neutre';
      if (tL === 'es') return gender === 'm' ? 'Masculino' : gender === 'f' ? 'Femenino' : 'Neutro';
      if (tL === 'it') return gender === 'm' ? 'Maschile' : gender === 'f' ? 'Femminile' : 'Neutro';
      if (tL === 'pt') return gender === 'm' ? 'Masculino' : gender === 'f' ? 'Feminino' : 'Neutro';
      if (tL === 'nl') return gender === 'm' ? 'Mannelijk' : gender === 'f' ? 'Vrouwelijk' : 'Onzijdig';
      if (tL === 'zh') return gender === 'm' ? '阳性名词' : gender === 'f' ? '阴性名词' : '中性名词';
      if (tL === 'ko') return gender === 'm' ? '남성명사' : gender === 'f' ? '여성명사' : '중성명사';
      return gender === 'm' ? 'Masculine noun' : gender === 'f' ? 'Feminine noun' : 'Neuter noun';
    };

    // 1. 直接指定フィールド
    if (['m', 'masc', 'masculin', 'masculine'].includes(gField)) {
      return { cls: 'masc', label: lang === 'de' ? 'der (m)' : 'le (m)', full: getFullLabel('m') };
    }
    if (['f', 'fem', 'feminin', 'feminine'].includes(gField)) {
      return { cls: 'fem', label: lang === 'de' ? 'die (f)' : 'la (f)', full: getFullLabel('f') };
    }
    if (lang === 'de' && ['n', 'neut', 'neutral', 'neuter'].includes(gField)) {
      return { cls: 'neut', label: 'das (n)', full: getFullLabel('n') };
    }

    // 2. 品詞タグからの判定 (N[m], N[f], N[n])
    if (/N\[m\]/i.test(pos)) return { cls: 'masc', label: lang === 'de' ? 'der (m)' : 'le (m)', full: getFullLabel('m') };
    if (/N\[f\]/i.test(pos)) return { cls: 'fem', label: lang === 'de' ? 'die (f)' : 'la (f)', full: getFullLabel('f') };
    if (lang === 'de' && /N\[n\]/i.test(pos)) return { cls: 'neut', label: 'das (n)', full: getFullLabel('n') };

    // 3. grammar_forms からの定冠詞・性別記号判定
    if (lang === 'fr') {
      if (/\b(?:le|un|l')\b/i.test(gForm) || /\[m\]|\bm\./i.test(gForm)) return { cls: 'masc', label: 'le (m)', full: getFullLabel('m') };
      if (/\b(?:la|une)\b/i.test(gForm) || /\[f\]|\bf\./i.test(gForm)) return { cls: 'fem', label: 'la (f)', full: getFullLabel('f') };
      if (/^le\s+/i.test(w)) return { cls: 'masc', label: 'le (m)', full: getFullLabel('m') };
      if (/^la\s+/i.test(w)) return { cls: 'fem', label: 'la (f)', full: getFullLabel('f') };
    } else if (lang === 'de') {
      if (/\bder\b/i.test(gForm) || /\[m\]|\bm\./i.test(gForm)) return { cls: 'masc', label: 'der (m)', full: getFullLabel('m') };
      if (/\bdie\b/i.test(gForm) || /\[f\]|\bf\./i.test(gForm)) return { cls: 'fem', label: 'die (f)', full: getFullLabel('f') };
      if (/\bdas\b/i.test(gForm) || /\[n\]|\bn\./i.test(gForm)) return { cls: 'neut', label: 'das (n)', full: getFullLabel('n') };
      if (/^der\s+/i.test(w)) return { cls: 'masc', label: 'der (m)', full: getFullLabel('m') };
      if (/^die\s+/i.test(w)) return { cls: 'fem', label: 'die (f)', full: getFullLabel('f') };
      if (/^das\s+/i.test(w)) return { cls: 'neut', label: 'das (n)', full: getFullLabel('n') };
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
   * 相対時間の整形 (1分後, 2日後, 復習期日 / Due, in 5m, in 2h, in 3d)
   */
  function relTime(ts, targetLocale = null) {
    const tL = targetLocale || global.App?.tgtLang || global.VocabI18n?.getLocale?.() || 'ja';
    const m = Math.floor(((Number(ts) || Date.now()) - Date.now()) / 60000);
    if (tL === 'ja') {
      return m <= 0 ? '復習期日' : m < 60 ? `${m}分後` : m < 1440 ? `${Math.floor(m / 60)}時間後` : `${Math.floor(m / 1440)}日後`;
    }
    if (m <= 0) {
      if (tL === 'ko') return '복습 기한';
      if (tL === 'zh') return '到期复习';
      if (tL === 'de') return 'Fällig';
      if (tL === 'fr') return 'À réviser';
      if (tL === 'es') return 'Vencido';
      if (tL === 'it') return 'Scaduto';
      if (tL === 'pt') return 'Vencido';
      if (tL === 'nl') return 'Te herhalen';
      return 'Due';
    }
    if (m < 60) {
      if (tL === 'ko') return `${m}분 후`;
      if (tL === 'zh') return `${m}分钟后`;
      if (tL === 'de') return `in ${m}m`;
      if (tL === 'fr') return `dans ${m}m`;
      if (tL === 'es') return `en ${m}m`;
      if (tL === 'it') return `tra ${m}m`;
      if (tL === 'pt') return `em ${m}m`;
      if (tL === 'nl') return `over ${m}m`;
      return `in ${m}m`;
    }
    const h = Math.floor(m / 60);
    if (m < 1440) {
      if (tL === 'ko') return `${h}시간 후`;
      if (tL === 'zh') return `${h}小时后`;
      if (tL === 'de') return `in ${h}h`;
      if (tL === 'fr') return `dans ${h}h`;
      if (tL === 'es') return `en ${h}h`;
      if (tL === 'it') return `tra ${h}h`;
      if (tL === 'pt') return `em ${h}h`;
      if (tL === 'nl') return `over ${h}u`;
      return `in ${h}h`;
    }
    const d = Math.floor(m / 1440);
    if (tL === 'ko') return `${d}일 후`;
    if (tL === 'zh') return `${d}天后`;
    if (tL === 'de') return `in ${d}d`;
    if (tL === 'fr') return `dans ${d}j`;
    if (tL === 'es') return `en ${d}d`;
    if (tL === 'it') return `tra ${d}g`;
    if (tL === 'pt') return `em ${d}d`;
    if (tL === 'nl') return `over ${d}d`;
    return `in ${d}d`;
  }

  const hasJapaneseKana = str => typeof str === 'string' && /[\u3040-\u309f\u30a0-\u30ff]/.test(str);

  /**
   * 意味・語源・歴史文脈のコンパクト整形
   */
  function formatMeaningAndEty(d, targetLocale = null) {
    const raw = String(d.etymology || '').trim(), meanings = d.meanings || [];
    const tL = targetLocale || d.tgtLang || global.App?.tgtLang || 'ja';
    let hn = String(d.history_note || '').trim();
    if (tL !== 'ja' && hasJapaneseKana(hn)) {
      hn = d[`history_note_${tL}`] || d.history_note_trans || '';
    }
    const histDigest = hn ? (hn.startsWith('（') || hn.startsWith('(') ? hn : `（${hn}）`) : '';
    let compactEty = raw.replace(/[①②③④]?\s*【[^】]+】\s*/g, '').replace(/\s+/g, ' ').trim();
    if (tL !== 'ja' && hasJapaneseKana(compactEty)) {
      compactEty = d[`etymology_${tL}`] || d.etymology_en || '';
      if (hasJapaneseKana(compactEty)) compactEty = '';
    }
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
    const { meanings, histDigest, compactEty, isLongEty } = formatMeaningAndEty(d, tL);
    const mHtml = meanings.map((x, idx) => {
      let mText = String(x.text || '').trim();
      if (tL !== 'ja' && hasJapaneseKana(mText)) {
        mText = x[`text_${tL}`] || x.en || x.text_en || '';
        if (hasJapaneseKana(mText)) mText = '';
      }
      return `<div class="pos-block"><span class="pos">${esc(x.pos)}</span><span class="m-red" data-act="reveal-mask">${hlText(mText, false, qReg)}${idx === meanings.length - 1 && histDigest ? `<span class="m-hist-note">${hlText(histDigest, false, qReg)}</span>` : ''}</span></div>`;
    }).join('');

    const CORE_BADGE_LABELS = {
      ja: 'コア',
      ko: '핵심',
      zh: '核心',
      de: 'KERN',
      fr: 'CŒUR',
      es: 'NÚCLEO',
      it: 'NUCLEO',
      pt: 'NÚCLEO',
      nl: 'KERN',
      en: 'CORE'
    };
    const coreBadgeLabel = CORE_BADGE_LABELS[tL] || CORE_BADGE_LABELS.en;

    const HIST_BADGE_LABELS = {
      ja: '歴史・文脈',
      ko: '역사·맥락',
      zh: '历史·背景',
      de: 'Kontext',
      fr: 'Histoire',
      es: 'Historia',
      it: 'Storia',
      pt: 'História',
      nl: 'Geschiedenis',
      en: 'History'
    };
    const histBadgeLabel = HIST_BADGE_LABELS[tL] || HIST_BADGE_LABELS.en;

    let coreText = String(d.core || '').trim();
    if (tL !== 'ja' && hasJapaneseKana(coreText)) {
      coreText = d[`core_${tL}`] || d.core_en || '';
      if (hasJapaneseKana(coreText)) coreText = '';
    }
    const coreHtml = coreText ? `<div class="core-box" data-act="reveal-mask"><span class="core-badge">${coreBadgeLabel}</span><span class="core-text">${hlText(coreText, false, qReg)}</span></div>` : '';

    let hn = String(d.history_note || '').trim();
    if (tL !== 'ja' && hasJapaneseKana(hn)) {
      hn = d[`history_note_${tL}`] || d.history_note_trans || '';
      if (hasJapaneseKana(hn)) hn = '';
    }
    const histHtml = hn ? `<div class="hist-box" data-act="reveal-mask"><span class="hist-badge">${histBadgeLabel}</span><span>${hlText(hn, false, qReg)}</span></div>` : '';

    const spkFn = (txt, l, sm) => global.VocabSpeech ? global.VocabSpeech.mkSpkBtn(txt, l, sm) : '';

    let exTrans = d.example ? (d.example.trans || (tL && d.example[tL]) || d.example.ja || '') : '';
    if (tL !== 'ja' && hasJapaneseKana(exTrans)) {
      exTrans = d.example[`trans_${tL}`] || d.example.trans_en || (d.example.en && iL !== 'en' ? d.example.en : '');
      if (hasJapaneseKana(exTrans)) exTrans = '';
    }
    const hasEx = d.example && (d.example.foreign || exTrans);
    const CTX_TAG_LABELS = {
      ja: '文脈',
      ko: '맥락',
      zh: '语境',
      de: 'Kontext',
      fr: 'Contexte',
      es: 'Contexto',
      it: 'Contesto',
      pt: 'Contexto',
      nl: 'Context',
      en: 'Context'
    };
    const ctxTagLabel = CTX_TAG_LABELS[tL] || CTX_TAG_LABELS.en;
    const ctxHtml = d.contextSentence ? `<div class="ctx-src"><span class="ctx-tag">${ctxTagLabel}</span>${hlText(d.contextSentence, false, qReg)}</div>` : '';
    const exHtml = (hasEx || ctxHtml) ? `<div class="ex-block">${hasEx ? `<div class="ex-en">${spkFn(d.example.foreign, iL, true)}<span>${hlText(d.example.foreign, false, qReg)}</span></div><div class="ex-ja" data-act="reveal-mask">${hlText(exTrans, true, qReg)}</div>` : ''}${ctxHtml}</div>` : '';

    const phHtml = (d.phrases || []).map(x => {
      let trans = x.trans || (tL && x[tL]) || x.ja || '';
      if (tL !== 'ja' && hasJapaneseKana(trans)) {
        trans = x[`trans_${tL}`] || x.trans_en || '';
      }
      return `<div class="ph-line">${spkFn(x.foreign, iL, true)}<strong>${hlText(x.foreign, false, qReg)}</strong> <span>${hlText(trans, false, qReg)}</span></div>`;
    }).join('');
    const drvHtml = (d.derivatives || []).map(x => {
      let meaning = x.meaning || '';
      if (tL !== 'ja' && hasJapaneseKana(meaning)) {
        meaning = x[`meaning_${tL}`] || x.meaning_en || '';
      }
      const trans = x.sub_trans || (tL && x[`sub_trans_${tL}`]) || '';
      const sub = x.sub_phrase ? `<div class="sub-p">${spkFn(x.sub_phrase, iL, true)}<span>${hlText(x.sub_phrase, false, qReg)}</span> <span>${hlText(trans, false, qReg)}</span></div>` : '';
      return `<div><div class="sub-h">${spkFn(x.word, iL, true)}<strong>${hlText(x.word, false, qReg)}</strong> <span style="font-family:var(--mono);font-size:11px;color:var(--s)">${esc(fmtPho(x.phonetic))}</span><span class="pos-lbl">${esc(x.pos)}</span><span class="sub-m">${hlText(meaning, false, qReg)}</span></div>${sub}</div>`;
    }).join('');

    const safeUrl = sanitizeWiktUrl(d.wiktUrl, iL);
    const wiktLabel = tL === 'ja' ? 'Wiktionary裏付' : (tL === 'de' ? 'Wiktionary geprüft' : (tL === 'fr' ? 'Vérifié Wiktionnaire' : (tL === 'es' ? 'Verificado Wiktionary' : (tL === 'ko' ? '위키낱말사전 검증' : (tL === 'zh' ? '维基词典查证' : 'Wiktionary Verified')))));
    const wiktTitle = tL === 'ja' ? 'Wiktionaryの言語セクションおよび語源・発音資料と照合済み (CC BY-SA)' : 'Cross-referenced with Wiktionary language, etymology & pronunciation sections (CC BY-SA)';
    const wiktPill = (d.wiktGrounded && safeUrl) ? `<a class="wikt-pill" href="${esc(safeUrl)}" target="_blank" rel="noopener noreferrer" title="${esc(wiktTitle)}">${esc(wiktLabel)}</a>` : '';

    const confDict = ETY_CONF_LABELS[tL] || ETY_CONF_LABELS.en;
    const confKey = (d.etymologyConfidence && confDict[d.etymologyConfidence]) ? d.etymologyConfidence : (compactEty ? 'probable' : 'unknown');
    const confText = confDict[confKey] || confDict.probable || confKey;
    const confTitle = tL === 'ja' ? `語源の学術的確度: ${esc(confText)}` : `Etymological Confidence: ${esc(confText)}`;
    const confPill = `<span class="conf-pill ${esc(confKey)}" title="${esc(confTitle)}">${esc(confText)}</span>`;

    const reportLabel = tL === 'ja' ? '誤り報告' : (tL === 'de' ? 'Fehler melden' : (tL === 'fr' ? 'Signaler' : (tL === 'es' ? 'Reportar' : (tL === 'ko' ? '오류 신고' : (tL === 'zh' ? '纠错' : 'Report Error')))));
    const reportTitle = tL === 'ja' ? '語源の誤り・修正を報告' : 'Report etymology issue or edit';
    const reportAria = tL === 'ja' ? '語源報告' : 'Report etymology';
    const reportBtn = compactEty ? `<button type="button" class="report-ety-btn" data-act="report-ety" data-word="${esc(d.word)}" data-lang="${esc(iL)}" data-ety="${esc(compactEty)}" title="${esc(reportTitle)}" aria-label="${esc(reportAria)}"><svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg><span>${esc(reportLabel)}</span></button>` : '';
    const etyHtml = (compactEty || wiktPill) ? `<div class="ety ${isLongEty ? 'clamp' : ''}" ${isLongEty ? 'data-act="toggle-clamp"' : ''}>${wiktPill}${confPill}${hlText(compactEty, false, qReg)}${reportBtn}</div>` : '';

    const { chipItems, sameList, crossList } = collectEtyPeers(d, rootIndexMap);
    const filterChipTitle = tL === 'ja' ? 'リストで絞り込み' : 'Filter by this root';
    const cogPrefix = tL === 'ja' ? '3言語:' : (tL === 'ko' ? '3개 언어:' : (tL === 'zh' ? '3语种:' : (tL === 'de' ? '3 Sprachen:' : (tL === 'fr' ? '3 langues:' : '3 langs:'))));
    const chipsHtml = chipItems.map(c => {
      const graphBtnTitle = tL === 'ja' ? `「${esc(c.tag)}」の語根ネットワークを開く` : `Open root network for '${esc(c.tag)}'`;
      const graphBtnAria = tL === 'ja' ? '語根グラフ表示' : 'View root network';
      return `<span class="root-chip-wrap"><span class="root-chip ${c.count ? 'has-rel' : ''} ${c.hasCog ? 'has-cog' : ''}" data-act="search-root" data-query="${esc(c.key)}" data-xlang="${c.hasCog ? '1' : '0'}" title="${esc(filterChipTitle)}">${hlText(c.tag, false, qReg)}${c.count ? `<span class="cnt ${c.hasCog ? 'cog-cnt' : ''}">${c.hasCog ? cogPrefix : ''}${c.count + 1}</span>` : ''}</span><button type="button" class="root-graph-btn" data-act="open-graph" data-root="${esc(c.key)}" title="${esc(graphBtnTitle)}" aria-label="${esc(graphBtnAria)}">${graphSvg}</button></span>`;
    }).join('');
    const fmtPeerLabel = p => p.homographIndex > 1 ? `${p.word}#${p.homographIndex}` : p.word;
    const sameLbl = tL === 'ja' ? '同語根:' : (tL === 'de' ? 'Kognaten:' : (tL === 'fr' ? 'Cognats:' : (tL === 'es' ? 'Cognados:' : (tL === 'ko' ? '동근어:' : (tL === 'zh' ? '同源词:' : 'Cognates:')))));
    const crossLbl = tL === 'ja' ? '同族候補:' : (tL === 'de' ? 'Verwandte:' : (tL === 'fr' ? 'Apparentés:' : (tL === 'es' ? 'Afines:' : (tL === 'ko' ? '동족 후보:' : (tL === 'zh' ? '同族词:' : 'Cognate candidates:')))));
    const sLnk = sameList.length ? `<span class="ety-lbl">${sameLbl}</span>` + sameList.map(p => `<a class="rel-link" data-act="jump" data-word="${esc(fmtPeerLabel(p))}" data-lang="${esc(p.lang)}">${esc(fmtPeerLabel(p))}</a>`).join('') : '';
    const cLnk = crossList.length ? `<span class="ety-lbl">${crossLbl}</span>` + crossList.map(p => `<a class="cog-link" data-act="jump" data-word="${esc(fmtPeerLabel(p))}" data-lang="${esc(p.lang)}"><span class="cog-l">${esc(p.lang.toUpperCase())}</span><span>${esc(fmtPeerLabel(p))}</span></a>`).join('') : '';
    const netHtml = (chipsHtml || sLnk || cLnk) ? `<div class="ety-net">${chipsHtml}${sLnk}${cLnk}</div>` : '';
    const flagLbl = tL === 'ja' ? '要確認' : (tL === 'de' ? 'Zu prüfen' : (tL === 'fr' ? 'À vérifier' : (tL === 'es' ? 'Por revisar' : (tL === 'ko' ? '확인 필요' : (tL === 'zh' ? '待确认' : 'Needs review')))));
    const flagHtml = d.flags?.length ? `<div class="ety-net"><span class="conf-pill unknown" title="${esc(d.flags.join(' / '))}">${flagLbl} ${d.flags.length}</span><span class="ety-lbl">${esc(d.flags.join(' / '))}</span></div>` : '';

    const matrix = global.VocabMorphology?.buildCognateMatrix ? global.VocabMorphology.buildCognateMatrix(d, rootIndexMap) : null;
    const matrixHtml = matrix ? (global.VocabMorphology?.renderCognateMatrixHtml ? global.VocabMorphology.renderCognateMatrixHtml(matrix) : '') : '';

    const panelHist = histHtml;
    const panelEx = `${exHtml}${phHtml ? `<div class="ph-wrap">${phHtml}</div>` : ''}`;
    const panelDrv = drvHtml ? `<div class="d-wrap">${drvHtml}</div>` : '';
    const panelEty = `${coreHtml}${etyHtml}${matrixHtml}${netHtml}${flagHtml}`;

    const fullDetailsContent = `${histHtml}${exHtml}${phHtml ? `<div class="ph-wrap">${phHtml}</div>` : ''}${drvHtml ? `<div class="d-wrap">${drvHtml}</div>` : ''}${coreHtml}${etyHtml}${matrixHtml}${netHtml}${flagHtml}`;

    const etyTabLbl = (tL === 'en' ? 'Etymology' : (tL === 'ko' ? '어원·어근' : (tL === 'zh' ? '词源·词根' : (tL === 'de' ? 'Etymologie' : (tL === 'fr' ? 'Étymologie' : (tL === 'es' ? 'Etimología' : (tL === 'it' ? 'Etimologia' : (tL === 'pt' ? 'Etimologia' : (tL === 'nl' ? 'Etymologie' : '語源・語根')))))))));
    const exTabLbl = (tL === 'en' ? 'Examples' : (tL === 'ko' ? '예문·구문' : (tL === 'zh' ? '例句·成语' : (tL === 'de' ? 'Beispiele' : (tL === 'fr' ? 'Exemples' : (tL === 'es' ? 'Ejemplos' : (tL === 'it' ? 'Esempi' : (tL === 'pt' ? 'Exemplos' : (tL === 'nl' ? 'Voorbeelden' : '例文・成句')))))))));
    const histTabLbl = (tL === 'en' ? 'History' : (tL === 'ko' ? '역사·배경' : (tL === 'zh' ? '历史·背景' : (tL === 'de' ? 'Geschichte' : (tL === 'fr' ? 'Histoire' : (tL === 'es' ? 'Historia' : (tL === 'it' ? 'Storia' : (tL === 'pt' ? 'História' : (tL === 'nl' ? 'Geschiedenis' : '歴史・背景')))))))));
    const drvTabLbl = (tL === 'en' ? 'Derivatives' : (tL === 'ko' ? '파생어' : (tL === 'zh' ? '衍生词' : (tL === 'de' ? 'Ableitungen' : (tL === 'fr' ? 'Dérivés' : (tL === 'es' ? 'Derivados' : (tL === 'it' ? 'Derivati' : (tL === 'pt' ? 'Derivados' : (tL === 'nl' ? 'Afleidingen' : '派生語')))))))));
    const allTabLbl = (tL === 'en' ? 'All' : (tL === 'ko' ? '전체' : (tL === 'zh' ? '全部' : (tL === 'de' ? 'Alle' : (tL === 'fr' ? 'Tout' : (tL === 'es' ? 'Todo' : (tL === 'it' ? 'Tutto' : (tL === 'pt' ? 'Tudo' : (tL === 'nl' ? 'Alles' : 'すべて')))))))));

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
    const activeTabObj = panels.find(p => p.id === defaultTab);
    const activeTabLabel = activeTabObj ? activeTabObj.label : (tL === 'ja' ? '詳細' : 'Details');
    const VIEWING_LABELS = {
      ja: lbl => `${lbl} を表示中`,
      ko: lbl => `${lbl} 표시 중`,
      zh: lbl => `正在查看${lbl}`,
      de: lbl => `Zeige ${lbl}`,
      fr: lbl => `Affichage : ${lbl}`,
      es: lbl => `Viendo ${lbl}`,
      it: lbl => `Visualizzazione: ${lbl}`,
      pt: lbl => `Visualizando: ${lbl}`,
      nl: lbl => `Weergave: ${lbl}`,
      en: lbl => `Viewing ${lbl}`
    };
    const viewingFn = VIEWING_LABELS[tL] || VIEWING_LABELS.en;
    const viewingLabel = viewingFn(activeTabLabel);

    const FULL_DETAILS_LABELS = {
      ja: '詳細（語源・例文・歴史）を見る',
      ko: '상세 정보(어원·예문·배경) 보기',
      zh: '查看详情（词源·例句·背景）',
      de: 'Details anzeigen (Etymologie, Beispiele)',
      fr: 'Voir les détails (étymologie, exemples)',
      es: 'Ver detalles (etimología, ejemplos)',
      it: 'Visualizza dettagli (etimologia, esempi)',
      pt: 'Ver detalhes (etimologia, exemplos)',
      nl: 'Details bekijken (etymologie, voorbeelden)',
      en: 'View Details (Etymology, Examples, Context)'
    };
    const fullDetailsLabel = FULL_DETAILS_LABELS[tL] || FULL_DETAILS_LABELS.en;
    const initialLabel = hasMultiPanels ? viewingLabel : fullDetailsLabel;
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

      const tL = i.tgtLang || options.tgtLang || global.App?.tgtLang || 'ja';
      c.className = 'card';
      if (typeof c.setAttribute === 'function') {
        c.setAttribute('role', 'article');
        c.setAttribute('aria-label', tL === 'ja' ? `${i.word || '単語'} の単語カード` : `Flashcard for ${i.word || 'word'}`);
      }
      c.dataset.word = makeLkFn(i.word || '', iL, i.homographIndex);
      c.dataset.rawWord = i.word || '';
      c.dataset.lang = iL;
      if (i.id) c.dataset.id = i.id;

      const homoTitle = tL === 'ja' ? `同形異義語 #${i.homographIndex}` : `Homograph #${i.homographIndex}`;
      const homoHtml = i.homographIndex > 1 ? `<span class="homo-badge" title="${esc(homoTitle)}">#${i.homographIndex}</span>` : '';
      const gender = detectGrammaticalGender(i, iL, tL);
      const genderHtml = gender ? `<span class="gender-badge ${gender.cls}" title="${esc(gender.full)}">${esc(gender.label)}</span>` : '';
      const gramHtml = i.grammar_forms ? `<div class="gram-line">${hlText(i.grammar_forms, false, options.queryReg)}</div>` : '';
      const spkFn = (txt, l) => global.VocabSpeech ? global.VocabSpeech.mkSpkBtn(txt, l) : '';
      const crossPill = options.crossLang ? `<span class="lang-pill">${esc(iL.toUpperCase())}</span>` : '';

      const catVal = i.category || '';
      const displayCat = (global.VocabI18n?.translateCategory && catVal) ? global.VocabI18n.translateCategory(catVal, tL) : catVal;
      const catHtml = catVal ? `<span class="tag" data-act="filter" data-type="cat" data-val="${esc(catVal)}">${esc(displayCat)}</span>` : '';

      let displayFol = i.folder || '';
      if (tL !== 'ja' && hasJapaneseKana(displayFol)) {
        displayFol = `${iL.toUpperCase()} Starter Pack`;
      }
      const folHtml = i.folder ? `<span class="tag" style="border-style:dashed" data-act="filter" data-type="fol" data-val="${esc(i.folder)}">${esc(displayFol)}</span>` : '';

      const editTitle = tL === 'ja' ? 'カードを編集' : 'Edit card';
      const editAria = tL === 'ja' ? '編集' : 'Edit';
      const delTitle = tL === 'ja' ? '削除' : 'Delete';
      const delAria = tL === 'ja' ? '削除' : 'Delete';
      const spkTitle = tL === 'ja' ? 'クリックでネイティブ発音' : 'Click to hear native pronunciation';

      c.innerHTML = `<div class="card-acts"><button type="button" class="act-icon-btn" data-act="edit" data-id="${esc(i.id)}" data-num="${i.num || 0}" data-lang="${esc(iL)}" title="${editTitle}" aria-label="${editAria}">${editSvg}</button><button type="button" class="act-icon-btn del-btn" data-act="del" data-id="${esc(i.id)}" data-num="${i.num || 0}" data-lang="${esc(iL)}" title="${delTitle}" aria-label="${delAria}">${delSvg}</button></div><div class="col-left"><div class="hw-wrap"><span class="id">#${i.num || 0}</span>${crossPill}${homoHtml}${genderHtml}<span class="hw" data-act="speak" data-text="${esc(i.word || '')}" data-lang="${esc(iL)}" title="${spkTitle}">${hlText(i.word || '', false, options.queryReg)}</span>${spkFn(i.word || '', iL)}</div>${gramHtml}<div class="tag-wrap">${catHtml}${folHtml}</div><div class="pho">${esc(fmtPho(i.phonetic))}<span class="due ${due ? 'is-due' : 'is-fut'}">${relTime(i.nextReview, tL)}</span></div></div>${buildRight(i, options)}`;
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
