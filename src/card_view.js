/**
 * Vocab Vault — Card Rendering & Visual Presentation Engine (js/card_view.js)
 * High-performance Card DOM Construction, Root Chips, Accordion Tabs & Precision Scroll
 */
(function (global) {
  'use strict';

  const esc = global.VocabStorage?.esc || (s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])));
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
    let re = reg;
    if (!reg.global) {
      const flags = reg.flags ? (reg.flags.includes('g') ? reg.flags : reg.flags + 'g') : 'giu';
      re = new RegExp(reg.source, flags);
    } else {
      re.lastIndex = 0;
    }
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
   * 文法・字源行 (grammar_forms) の多言語ローカライズ整形
   */
  function formatGrammarForms(raw, targetLocale = 'ja', itemLang = '') {
    if (!raw || typeof raw !== 'string') return '';
    const currentLocale = global.VocabI18n?.getLocale?.() || 'ja';
    const tL = targetLocale || (currentLocale !== 'ja' ? currentLocale : (global.App?.tgtLang || 'ja'));
    if (tL === 'ja') return raw;

    let res = raw;

    // 1. ラベル部分のローカライズ
    const rootLabels = {
      de: 'Wurzel:',
      en: 'Root:',
      fr: 'Racine :',
      es: 'Raíz:',
      it: 'Radice:',
      pt: 'Raiz:',
      nl: 'Wortel:',
      zh: '字源:',
      ko: '자원:'
    };
    const rootLbl = rootLabels[tL] || 'Root:';
    res = res.replace(/(?:^|\s|\/)字源\s*[:：]/g, match => match.replace(/字源[:：]/, rootLbl));

    const tradLabels = {
      de: 'Trad.:',
      en: 'Trad.:',
      fr: 'Trad. :',
      es: 'Trad.:',
      it: 'Trad.:',
      pt: 'Trad.:',
      nl: 'Trad.:',
      zh: '繁体:',
      ko: '번체:'
    };
    const tradLbl = tradLabels[tL] || 'Trad.:';
    res = res.replace(/(?:^|\s|\/)繁体\s*[:：]/g, match => match.replace(/繁体[:：]/, tradLbl));

    const hanjaLabels = {
      zh: '汉字:',
      ko: '한자:'
    };
    const hanjaLbl = hanjaLabels[tL] || 'Hanja:';
    res = res.replace(/(?:^|\s|\/)한자\s*[:：]/g, match => match.replace(/한자[:：]/, hanjaLbl));

    // 2. 漢字直後の日本語新字体併記の除去 (例: "經濟 (経済)" -> "經濟", "觀點 (観点)" -> "觀點", "權利 (権利)" -> "權利")
    res = res.replace(/([\u4E00-\u9FFF])\s*[\(（][\u4E00-\u9FFF]+[\)）]/g, '$1');

    // 3. 語根・字源解説の多言語辞書
    const GLOSS_MAP = {
      '見分ける・記す': {
        de: 'unterscheiden / erfassen',
        en: 'discern / record',
        fr: 'discerner / noter',
        es: 'discernir / registrar',
        it: 'distinguere / registrare',
        pt: 'discernir / registrar',
        nl: 'onderscheiden / vastleggen',
        zh: '辨识·记述',
        ko: '분별하다·기록하다'
      },
      '見分ける・心に記す': {
        de: 'unterscheiden / erfassen',
        en: 'discern / record',
        fr: 'discerner / noter',
        es: 'discernir / registrar',
        it: 'distinguere / registrare',
        pt: 'discernir / registrar',
        nl: 'onderscheiden / vastleggen',
        zh: '辨识·心记',
        ko: '분별하다·마음에 새기다'
      },
      'はかりの分銅': {
        de: 'Waagegewicht / Macht',
        en: 'scale weight / authority',
        fr: 'poids de balance / autorité',
        es: 'pesa de balanza / autoridad',
        it: 'peso della bilancia / autorità',
        pt: 'peso da balança / autoridade',
        nl: 'weegschaalgewicht / gezag',
        zh: '秤砣·权柄',
        ko: '저울추·권세'
      },
      'はかりの分銅・力': {
        de: 'Waagegewicht / Befugnis',
        en: 'scale weight / power',
        fr: 'poids de balance / pouvoir',
        es: 'pesa de balanza / poder',
        it: 'peso della bilancia / potere',
        pt: 'peso da balança / poder',
        nl: 'weegschaalgewicht / gezag',
        zh: '秤砣·权力',
        ko: '저울추·힘'
      },
      '正しく治める': {
        de: 'recht regieren / leiten',
        en: 'govern justly / rule',
        fr: 'gouverner droitement',
        es: 'gobernar con justicia',
        it: 'governare rettamente',
        pt: 'governar com justiça',
        nl: 'rechtvaardig besturen',
        zh: '正道治理',
        ko: '바르게 다스리다'
      },
      '縦糸・治める': {
        de: 'Kettfaden / ordnen',
        en: 'warp thread / manage',
        fr: 'fil de chaîne / gérer',
        es: 'hilo de urdimbre / administrar',
        it: 'ordito / amministrare',
        pt: 'fio de urdidura / administrar',
        nl: 'schering / ordenen',
        zh: '经线·治理',
        ko: '날실·다스리다'
      },
      '縦糸を通す・治める': {
        de: 'Kettfaden / ordnen',
        en: 'warp thread / manage',
        fr: 'fil de chaîne / gérer',
        es: 'hilo de urdimbre / administrar',
        it: 'ordito / amministrare',
        pt: 'fio de urdidura / administrar',
        nl: 'schering / ordenen',
        zh: '穿经线·治理',
        ko: '날실을 꿰다·다스리다'
      },
      '玉の筋目・法則': {
        de: 'Maserung des Jade / Gesetz',
        en: 'veins in jade / reason',
        fr: 'veines du jade / principe',
        es: 'vetas del jade / razón',
        it: 'venature della giada / principio',
        pt: 'veios do jade / razão',
        nl: 'aderen in jade / rede',
        zh: '玉石纹理·法则',
        ko: '옥의 결·이치'
      },
      '見渡す': {
        de: 'überblicken / betrachten',
        en: 'look broadly / observe',
        fr: 'regarder au large / observer',
        es: 'contemplar / observar',
        it: 'guardare ampiamente / osservare',
        pt: 'contemplar amplamente / observar',
        nl: 'overzien / observeren',
        zh: '广泛观察',
        ko: '넓게 보다'
      },
      '広く見極める': {
        de: 'überblicken / betrachten',
        en: 'look broadly / observe',
        fr: 'regarder au large / observer',
        es: 'contemplar / observar',
        it: 'guardare ampiamente / osservare',
        pt: 'contemplar amplamente / observar',
        nl: 'overzien / observeren',
        zh: '广泛审视',
        ko: '널리 살피다'
      },
      '立つ': {
        de: 'stehen',
        en: 'stand',
        fr: 'se tenir debout',
        es: 'estar de pie',
        it: 'stare',
        pt: 'ficar de pé',
        nl: 'staan',
        zh: '立·站立',
        ko: '서다'
      },
      'つかむ': {
        de: 'greifen / fassen',
        en: 'grasp / seize',
        fr: 'saisir',
        es: 'agarrar / captar',
        it: 'afferrare',
        pt: 'agarrar / captar',
        nl: 'grijpen',
        zh: '抓取·把握',
        ko: '잡다·파악하다'
      },
      '保つ': {
        de: 'halten / bewahren',
        en: 'hold / maintain',
        fr: 'tenir / maintenir',
        es: 'mantener / sostener',
        it: 'mantenere / sostenere',
        pt: 'manter / sustentar',
        nl: 'houden / handhaven',
        zh: '保持·维持',
        ko: '유지하다'
      },
      '運ぶ': {
        de: 'tragen / befördern',
        en: 'carry / transport',
        fr: 'porter / transporter',
        es: 'llevar / transportar',
        it: 'portare / trasportare',
        pt: 'levar / transportar',
        nl: 'dragen / vervoeren',
        zh: '运送·承担',
        ko: '나르다·운반하다'
      },
      '見る': {
        de: 'sehen / schauen',
        en: 'look / see',
        fr: 'regarder / voir',
        es: 'mirar / ver',
        it: 'guardare / vedere',
        pt: 'olhar / ver',
        nl: 'kijken / zien',
        zh: '注视·观察',
        ko: '보다'
      },
      '言う': {
        de: 'sagen / sprechen',
        en: 'say / speak',
        fr: 'dire / parler',
        es: 'decir / hablar',
        it: 'dire / parlare',
        pt: 'dizer / falar',
        nl: 'zeggen / spreken',
        zh: '诉说·言语',
        ko: '말하다'
      },
      '座る': {
        de: 'sitzen',
        en: 'sit',
        fr: 's\'asseoir',
        es: 'sentarse',
        it: 'sedere',
        pt: 'sentar-se',
        nl: 'zitten',
        zh: '就坐·居留',
        ko: '앉다'
      },
      '木材を組む・枠組み': {
        de: 'Holz verbinden / Rahmenwerk',
        en: 'join timber / framework',
        fr: 'assembler le bois / charpente',
        es: 'ensamblar madera / armazón',
        it: 'assemblare legno / struttura',
        pt: 'unir madeira / estrutura',
        nl: 'hout verbinden / raamwerk',
        zh: '构木成架·框架',
        ko: '목재를 얽어 짜다·뼈대'
      },
      '枡の米を均す棒・大枠をくくる': {
        de: 'Streichholz für Maß / Gesamtbegriff',
        en: 'leveling rod / encompass general notion',
        fr: 'racloir de mesure / englober l\'idée générale',
        es: 'rasero de medida / abarcar lo general',
        it: 'rasiera di misura / abbracciare il concetto',
        pt: 'rasoura de medida / abranger o conceito',
        nl: 'strijkstok / hoofdlijnen omvatten',
        zh: '平斗之木·概括大纲',
        ko: '말의 쌀을 고르게 깎는 막대·큰 틀을 잡다'
      }
    };

    for (const [jaGloss, transObj] of Object.entries(GLOSS_MAP)) {
      if (res.includes(jaGloss)) {
        const trans = transObj[tL] || transObj.en || jaGloss;
        res = res.replace(jaGloss, trans);
      }
    }

    return res;
  }

  /**
   * 意味・語源・歴史文脈のコンパクト整形
   */
  function formatMeaningAndEty(d, targetLocale = null) {
    const raw = String(d.etymology || '').trim(), meanings = d.meanings || [];
    const tL = targetLocale || d.tgtLang || global.App?.tgtLang || 'ja';
    let hn = String(d.history_note || '').trim();
    if (tL !== 'ja') {
      const transHn = d[`history_note_${tL}`] || d.history_note_trans || (tL !== 'en' ? d.history_note_en : '');
      if (transHn) hn = transHn;
    }
    const histDigest = hn ? (hn.startsWith('（') || hn.startsWith('(') ? hn : `（${hn}）`) : '';
    let compactEty = raw.replace(/[①②③④]?\s*【[^】]+】\s*/g, '').replace(/\s+/g, ' ').trim();
    if (tL !== 'ja') {
      const transEty = d[`etymology_${tL}`] || (tL !== 'en' ? (d.etymology_en || d.etymology_trans) : d.etymology_trans) || '';
      if (transEty) compactEty = transEty;
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
    const isCorruptedDummy = Boolean(
      d.needsRegeneration ||
      d.isDummyPlaceholder ||
      meanings.some(x => String(x.text || '').includes('中心的語義') || (String(x.text || '').includes('の語義') && String(x.text || '').startsWith(String(d.word || '')))) ||
      String(d.core || '').includes('中心的用法および文脈的機能に基づくコアイメージ')
    );
    const dummyText = tL === 'ja' ? '通信障害等による未完了データです' : (tL === 'ko' ? '통신 장애 등으로 생성이 완료되지 않은 데이터입니다' : (tL === 'zh' ? '由于网络异常等原因，该词条数据尚未生成完整' : 'Incomplete entry due to network interruption'));
    const dummyRegenLbl = tL === 'ja' ? '完全再生成' : (tL === 'ko' ? '전체 재생성' : (tL === 'zh' ? '完全重新生成' : 'Regenerate'));
    const dummyBannerHtml = isCorruptedDummy ? `<div class="dummy-warning-banner" style="display:flex;align-items:center;justify-content:space-between;background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);border-radius:6px;padding:6px 10px;margin-bottom:8px;font-size:12px;color:var(--e)"><span>${dummyText}</span><button type="button" class="btn-ac btn-xs" data-act="regen-single-word" data-word="${esc(d.word)}" data-id="${esc(d.id)}">${dummyRegenLbl}</button></div>` : '';
    const mHtml = meanings.map((x, idx) => {
      let mText = String(x.text || '').trim();
      if (tL !== 'ja') {
        const transM = x[`text_${tL}`] || x[`meaning_${tL}`] || (tL !== 'en' ? (x.en || x.text_en) : '') || x.trans || '';
        if (transM) mText = transM;
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
    if (tL !== 'ja') {
      const transCore = d[`core_${tL}`] || (tL !== 'en' ? (d.core_en || d.core_trans) : d.core_trans) || '';
      if (transCore) coreText = transCore;
    }
    const coreHtml = coreText ? `<div class="core-box" data-act="reveal-mask"><span class="core-badge">${coreBadgeLabel}</span><span class="core-text">${hlText(coreText, false, qReg)}</span></div>` : '';

    let hn = String(d.history_note || '').trim();
    if (tL !== 'ja') {
      const transHn = d[`history_note_${tL}`] || d.history_note_trans || (tL !== 'en' ? d.history_note_en : '') || '';
      if (transHn) hn = transHn;
    }
    const histHtml = hn ? `<div class="hist-box" data-act="reveal-mask"><span class="hist-badge">${histBadgeLabel}</span><span>${hlText(hn, false, qReg)}</span></div>` : '';

    const spkFn = (txt, l, sm) => global.VocabSpeech ? global.VocabSpeech.mkSpkBtn(txt, l, sm) : '';

    let exTrans = d.example ? (d.example[`trans_${tL}`] || d.example[tL] || (tL !== 'en' ? d.example.trans_en : '') || (d.example.en && iL !== 'en' ? d.example.en : '') || d.example.trans || d.example.ja || '') : '';
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
      let trans = x[`trans_${tL}`] || (tL && x[tL]) || (tL !== 'en' ? x.trans_en : '') || x.trans || x.ja || '';
      return `<div class="ph-line">${spkFn(x.foreign, iL, true)}<strong>${hlText(x.foreign, false, qReg)}</strong> <span>${hlText(trans, false, qReg)}</span></div>`;
    }).join('');
    const drvHtml = (d.derivatives || []).map(x => {
      let meaning = x[`meaning_${tL}`] || (tL && x[tL]) || (tL !== 'en' ? x.meaning_en : '') || x.meaning || '';
      const trans = x[`sub_trans_${tL}`] || x.sub_trans || (tL && x[tL]) || '';
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

    const timeline = global.VocabMorphology?.buildSemanticTimeline ? global.VocabMorphology.buildSemanticTimeline(d, tL) : null;
    const timelineHtml = timeline ? (global.VocabMorphology?.renderSemanticTimelineHtml ? global.VocabMorphology.renderSemanticTimelineHtml(timeline) : '') : '';

    const panelHist = histHtml;
    const panelEx = `${exHtml}${phHtml ? `<div class="ph-wrap">${phHtml}</div>` : ''}`;
    const panelDrv = drvHtml ? `<div class="d-wrap">${drvHtml}</div>` : '';
    const panelEty = `${coreHtml}${etyHtml}${timelineHtml}${matrixHtml}${netHtml}${flagHtml}`;

    const fullDetailsContent = `${histHtml}${exHtml}${phHtml ? `<div class="ph-wrap">${phHtml}</div>` : ''}${drvHtml ? `<div class="d-wrap">${drvHtml}</div>` : ''}${coreHtml}${etyHtml}${timelineHtml}${matrixHtml}${netHtml}${flagHtml}`;

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
    const DETAILS_LABEL_MAP = { ja: '詳細', en: 'Details', fr: 'Détails', de: 'Details', es: 'Detalles', it: 'Dettagli', pt: 'Detalhes', nl: 'Details', zh: '详情', ko: '상세' };
    const activeTabLabel = activeTabObj ? activeTabObj.label : (DETAILS_LABEL_MAP[tL] || DETAILS_LABEL_MAP.en);
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
    return `<div class="right">${dummyBannerHtml}<div class="m-line">${mHtml}</div>${quickChips}${accordion}</div>`;
  }

  let _healSaveTimer = null;
  const _pendingHealPairs = new Map();
  function scheduleHealPersist(explicitPairKey = null) {
    const pairKey = explicitPairKey || (global.getActivePairConfig ? global.getActivePairConfig().key : 'distinction_entries');
    const entries = global.App?.entries;
    if (pairKey && Array.isArray(entries)) {
      _pendingHealPairs.set(pairKey, entries);
      if (global.VocabStorage?.state?.mem) {
        global.VocabStorage.state.mem[pairKey] = entries;
      }
    }
    if (_healSaveTimer) return;
    _healSaveTimer = setTimeout(() => {
      _healSaveTimer = null;
      if (global.setJson && _pendingHealPairs.size > 0) {
        const snapshot = [..._pendingHealPairs.entries()];
        _pendingHealPairs.clear();
        snapshot.forEach(([pk, list]) => {
          if (Array.isArray(list)) {
            global.setJson(pk, list, true, false, true);
          }
        });
      }
    }, 200);
  }

  /**
   * DOMカード要素の完全生成 (Error Boundary 保護付き)
   */
  function createCardElement(i, options = {}) {
    try {
      if (!i || typeof i !== 'object') throw new Error('無効な単語データオブジェクトです。');
      const iL = i.lang || options.lang || global.App?.lang || 'en';
      const stubTgtLang = options.tgtLang || i.targetLang || global.App?.tgtLang || 'ja';
      const stubSrcLang = options.srcLang || i.srcLang || iL;
      const isEnJa = (stubSrcLang === 'en' && stubTgtLang === 'ja');

      // [自己修復] スタブカード（(学術・文脈語彙) や汎用コア文）が描画対象となった場合、組み込みマスターから即座にインプレース修復
      const m0 = String(i.meanings?.[0]?.text || '');
      const wLow = String(i.word || '').trim().toLowerCase();
      const isStub = isEnJa && (!m0 || m0.includes('の語義') || m0.includes('中心的語義') || m0.includes('(Offline') || m0 === i.word ||
        /(?:他動詞|自動詞)（(?:動作・作用|状態変化)）|形容詞（状態・性質）|[（\(]英義[:：]|の主要な意味・文脈的語義|学術・文脈語彙/.test(m0) ||
        String(i.core || '').includes('語根・派生関係から構成される学術的概念イメージ。') ||
        String(i.core || '').includes('中心的用法および文脈的機能に基づくコアイメージ') ||
        /^「.+」の中核概念。?$/.test(String(i.core || '').trim()) ||
        String(i.etymology || '').includes('語源資料（Wiktionary等）の記録に基づく学術語彙。') ||
        String(i.etymology || '').includes('語源資料（Wiktionary等）の記録に基づく語彙。') ||
        Boolean(i.needsRegeneration) ||
        Boolean(i.isDummyPlaceholder) ||
        (/^[A-Za-z0-9\s\[\],;.:\-_()'"/]+$/.test(m0.trim()) && !/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/.test(m0)));
      if (isStub && typeof global.lookupEssentialLexicon === 'function') {
        const rich = global.lookupEssentialLexicon(i.word);
        if (rich && Array.isArray(rich.meanings) && rich.meanings.length > 0) {
          const catStr = (typeof rich.category === 'number' && (global.CATS?.[rich.category] || global.VocabStorage?.CATS?.[rich.category])) ? (global.CATS?.[rich.category] || global.VocabStorage?.CATS?.[rich.category]) : (typeof rich.category === 'string' ? rich.category : (i.category && i.category !== 'その他' && i.category !== '抽象概念・論理' ? i.category : 'ビジネス・経営'));
          const exJa = rich.example?.ja || rich.example?.trans || i.example?.ja || '';
          Object.assign(i, {
            phonetic: rich.phonetic || i.phonetic || '',
            grammar_forms: rich.grammar_forms || i.grammar_forms || '',
            category: catStr,
            etymology: rich.etymology || i.etymology || '',
            etymologyTags: (Array.isArray(rich.etymologyTags) && rich.etymologyTags.length) ? rich.etymologyTags : (i.etymologyTags || []),
            etymologyConfidence: rich.etymologyConfidence || 'certain',
            wiktGrounded: true,
            core: rich.core || i.core || '',
            history_note: rich.history_note || i.history_note || '',
            meanings: rich.meanings,
            example: rich.example ? { ...rich.example, ja: exJa, trans: exJa } : i.example,
            phrases: (Array.isArray(rich.phrases) && rich.phrases.length) ? rich.phrases : (i.phrases || []),
            derivatives: (Array.isArray(rich.derivatives) && rich.derivatives.length) ? rich.derivatives : (i.derivatives || []),
            flags: []
          });
          delete i.needsRegeneration;
          delete i.isDummyPlaceholder;
          if (global.VocabSearch?.invalidateMeta) global.VocabSearch.invalidateMeta(i);
          scheduleHealPersist();
        } else {
          // [恒久修復] 辞書マスター未登録語でもスタブ表示を完全排除し、実態に即した品詞・形態変化・カテゴリへ補正（差分発生時のみ永続化）
          let mutated = false;
          const firstPos = (typeof global.guessMorphologicalPos === 'function' ? global.guessMorphologicalPos(i.word) : (i.meanings?.[0]?.pos || 'N[C]'));
          const inferredForms = (typeof global.inferGrammarForms === 'function') ? global.inferGrammarForms(i.word, firstPos) : '';
          const inferredCatId = (typeof global.inferCategoryByPos === 'function') ? global.inferCategoryByPos(firstPos) : 28;
          const catStr = (global.CATS?.[inferredCatId] || global.VocabStorage?.CATS?.[inferredCatId]) || (i.category && i.category !== 'その他' && i.category !== '抽象概念・論理' ? i.category : '状態・性質');

          if (Array.isArray(i.meanings) && i.meanings.length > 0) {
            i.meanings = i.meanings.map(m => {
              const cleanText = String(m.text || '').replace(/（学術・文脈語彙）|\(学術・文脈語彙\)|の中心的語義/g, '').trim();
              const nextText = cleanText || `${i.word}の語義`;
              if (m.pos !== firstPos || m.text !== nextText) mutated = true;
              return { pos: firstPos, text: nextText };
            });
          } else {
            i.meanings = [{ pos: firstPos, text: `${i.word}の語義` }];
            mutated = true;
          }
          if (!i.core || i.core.includes('語根・派生関係から構成される学術的概念イメージ。') || i.core.includes('中心的用法および文脈的機能に基づくコアイメージ。')) {
            const nextCore = `「${i.word}」の中核概念。`;
            if (i.core !== nextCore) { i.core = nextCore; mutated = true; }
          }
          if (i.etymology && (i.etymology.includes('語源資料（Wiktionary等）の記録に基づく学術語彙。') || i.etymology.includes('個別語源（借用語・新造語等）。確固たるPIE語根は未確定。'))) {
            const nextEty = `語源資料（Wiktionary等）の記録に基づく語彙。歴史的変遷を経て定着。`;
            if (i.etymology !== nextEty) { i.etymology = nextEty; mutated = true; }
          }
          const nextForms = inferredForms || i.grammar_forms;
          if (i.grammar_forms !== nextForms) { i.grammar_forms = nextForms; mutated = true; }
          if (i.category !== catStr) { i.category = catStr; mutated = true; }
          if (!i.needsRegeneration) { i.needsRegeneration = true; mutated = true; }
          if (i.example?.foreign && i.example.foreign.startsWith('This context illustrates the academic usage of ')) {
            i.example.foreign = `The contextual usage of ${i.word} is clearly observed in practice.`;
            i.example.ja = `<b>${i.word}</b>の基本的・文脈的用例。`;
            i.example.trans = i.example.ja;
            mutated = true;
          }
          if (mutated) {
            if (global.VocabSearch?.invalidateMeta) global.VocabSearch.invalidateMeta(i);
            scheduleHealPersist();
          }
        }
      }

      const c = document.createElement('div');
      const due = Number(i.nextReview || 0) <= Date.now();
      const makeLkFn = global.VocabMorphology?.makeLookupKey || global.makeLookupKey || ((w, l, h) => h > 1 ? `${w}#${h}` : w);

      const currentLocale = global.VocabI18n?.getLocale?.() || 'ja';
      const tL = (options.tgtLang && options.tgtLang !== 'ja')
        ? options.tgtLang
        : (currentLocale !== 'ja' ? currentLocale : (i.tgtLang || global.App?.tgtLang || 'ja'));
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
      const dispGram = formatGrammarForms(i.grammar_forms, tL, iL);
      const gramHtml = dispGram ? `<div class="gram-line">${hlText(dispGram, false, options.queryReg)}</div>` : '';
      const spkFn = (txt, l) => global.VocabSpeech ? global.VocabSpeech.mkSpkBtn(txt, l) : '';
      const crossPill = options.crossLang ? `<span class="lang-pill">${esc(iL.toUpperCase())}</span>` : '';

      const catVal = i.category || '';
      const displayCat = (global.VocabI18n?.translateCategory && catVal) ? global.VocabI18n.translateCategory(catVal, tL) : catVal;
      const catHtml = catVal ? `<span class="tag" data-act="filter" data-type="cat" data-val="${esc(catVal)}">${esc(displayCat)}</span>` : '';

      let displayFol = i.folder || '';
      if (tL !== 'ja' && (hasJapaneseKana(displayFol) || displayFol.includes('Starter Pack') || displayFol.includes('スターターパック'))) {
        const spLabel = (global.VocabI18n?.t) ? global.VocabI18n.t('folder.starter_pack', 'Starter Pack', tL) : 'Starter Pack';
        displayFol = `${iL.toUpperCase()} ${spLabel}`;
      }
      const folHtml = i.folder ? `<span class="tag" style="border-style:dashed" data-act="filter" data-type="fol" data-val="${esc(i.folder)}">${esc(displayFol)}</span>` : '';

      const EDIT_TITLE_MAP = { ja: 'カードを編集', en: 'Edit card', fr: 'Modifier la carte', de: 'Karte bearbeiten', es: 'Editar tarjeta', it: 'Modifica scheda', pt: 'Editar cartão', nl: 'Kaart bewerken', zh: '编辑卡片', ko: '카드 편집' };
      const EDIT_ARIA_MAP = { ja: '編集', en: 'Edit', fr: 'Modifier', de: 'Bearbeiten', es: 'Editar', it: 'Modifica', pt: 'Editar', nl: 'Bewerken', zh: '编辑', ko: '편집' };
      const DEL_TITLE_MAP = { ja: '削除', en: 'Delete', fr: 'Supprimer', de: 'Löschen', es: 'Eliminar', it: 'Elimina', pt: 'Excluir', nl: 'Verwijderen', zh: '删除', ko: '삭제' };
      const DEL_ARIA_MAP = { ja: '削除', en: 'Delete', fr: 'Supprimer', de: 'Löschen', es: 'Eliminar', it: 'Elimina', pt: 'Excluir', nl: 'Verwijderen', zh: '删除', ko: '삭제' };
      const SPK_TITLE_MAP = { ja: 'クリックでネイティブ発音', en: 'Click to hear native pronunciation', fr: 'Cliquer pour écouter la prononciation', de: 'Klicken für muttersprachliche Aussprache', es: 'Haga clic para escuchar la pronunciación nativa', it: 'Clicca per ascoltare la pronuncia nativa', pt: 'Clique para ouvir a pronúncia nativa', nl: 'Klik om moedertaaluitspraak te horen', zh: '点击收听母语发音', ko: '클릭하여 원어민 발음 듣기' };

      const editTitle = EDIT_TITLE_MAP[currentLocale] || EDIT_TITLE_MAP.en;
      const editAria = EDIT_ARIA_MAP[currentLocale] || EDIT_ARIA_MAP.en;
      const delTitle = DEL_TITLE_MAP[currentLocale] || DEL_TITLE_MAP.en;
      const delAria = DEL_ARIA_MAP[currentLocale] || DEL_ARIA_MAP.en;
      const spkTitle = SPK_TITLE_MAP[currentLocale] || SPK_TITLE_MAP.en;

      global.VocabDOM?.setSafeHtml(c, `<div class="card-acts"><button type="button" class="act-icon-btn" data-act="edit" data-id="${esc(i.id)}" data-num="${i.num || 0}" data-lang="${esc(iL)}" title="${editTitle}" aria-label="${editAria}">${editSvg}</button><button type="button" class="act-icon-btn del-btn" data-act="del" data-id="${esc(i.id)}" data-num="${i.num || 0}" data-lang="${esc(iL)}" title="${delTitle}" aria-label="${delAria}">${delSvg}</button></div><div class="col-left"><div class="hw-wrap"><span class="id">#${i.num || 0}</span>${crossPill}${homoHtml}${genderHtml}<span class="hw" lang="${esc(iL)}" data-act="speak" data-text="${esc(i.word || '')}" data-lang="${esc(iL)}" title="${spkTitle}">${hlText(i.word || '', false, options.queryReg)}</span>${spkFn(i.word || '', iL)}</div>${gramHtml}<div class="tag-wrap">${catHtml}${folHtml}</div><div class="pho">${esc(fmtPho(i.phonetic))}<span class="due ${due ? 'is-due' : 'is-fut'}">${relTime(i.nextReview, tL)}</span></div></div>${buildRight(i, options)}`);
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
      global.VocabDOM?.setSafeHtml(errCard, `
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
      `);
      return errCard;
    }
  }

  /**
   * スクロールコンテナ内における要素の累積Y絶対座標（scrollTop非依存）を算出
   */
  function getElementTopInContainer(el, container) {
    if (!el || !container) return 0;
    if (typeof el.getBoundingClientRect === 'function' && typeof container.getBoundingClientRect === 'function') {
      const eRect = el.getBoundingClientRect();
      const cRect = container.getBoundingClientRect();
      return (eRect.top - cRect.top) + (container.scrollTop || 0);
    }
    let offset = 0;
    let curr = el;
    while (curr && curr !== container) {
      offset += (curr.offsetTop || 0);
      curr = curr.offsetParent;
      if (curr === container) return offset;
    }
    return el.offsetTop || 0;
  }

  /**
   * 対象カード要素を画面サイズ・解像度（PCワイド・小型PC・モバイル）に応じて確実に可視領域中央／適正余白にスクロールし、発光ハイライトを付与
   * W3C CSS Containment に準拠し、仮想レンダリング (content-visibility: auto) に伴うレイアウトシフトを解消
   */
  let _jumpAlignTimers = [];
  let _jumpHighlightTimer = null;
  let _jumpClassTimer = null;
  let _jumpAbortCleanup = null;

  function clearAlignTimersOnly() {
    while (_jumpAlignTimers.length) {
      clearTimeout(_jumpAlignTimers.pop());
    }
    if (typeof _jumpAbortCleanup === 'function') {
      try { _jumpAbortCleanup(); } catch {}
      _jumpAbortCleanup = null;
    }
  }

  function clearJumpTimers() {
    clearAlignTimersOnly();
    if (_jumpClassTimer !== null) {
      clearTimeout(_jumpClassTimer);
      _jumpClassTimer = null;
    }
    if (_jumpHighlightTimer !== null) {
      clearTimeout(_jumpHighlightTimer);
      _jumpHighlightTimer = null;
    }
  }

  function resetOuterScroll(scrollContainer) {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      if ((window.scrollX || 0) !== 0 || (window.scrollY || 0) !== 0) {
        try { window.scrollTo(0, 0); } catch {}
      }
    }
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (root && root !== scrollContainer) {
        if (root.scrollTop) root.scrollTop = 0;
        if (root.scrollLeft) root.scrollLeft = 0;
      }
      const docBody = document.body;
      if (docBody && docBody !== scrollContainer) {
        if (docBody.scrollTop) docBody.scrollTop = 0;
        if (docBody.scrollLeft) docBody.scrollLeft = 0;
      }
      const ws = typeof document.querySelector === 'function' ? document.querySelector('.workspace') : null;
      if (ws && ws !== scrollContainer) {
        if (ws.scrollTop) ws.scrollTop = 0;
        if (ws.scrollLeft) ws.scrollLeft = 0;
      }
      const mp = typeof document.querySelector === 'function' ? document.querySelector('.main-pane') : null;
      if (mp && mp !== scrollContainer) {
        if (mp.scrollTop) mp.scrollTop = 0;
        if (mp.scrollLeft) mp.scrollLeft = 0;
      }
    }
  }

  function scrollToCard(el, container = null, options = {}) {
    if (!el) return;
    clearJumpTimers();
    const scrollContainer = container || (typeof document !== 'undefined' ? document.getElementById('mainScroll') : null);

    if (typeof document !== 'undefined') {
      if (typeof document.querySelectorAll === 'function') {
        document.querySelectorAll('#list .card.highlight-jump').forEach(prev => {
          if (prev !== el) prev.classList?.remove?.('highlight-jump');
        });
      }
      const listViewEl = document.getElementById('listView');
      if (listViewEl && listViewEl.style?.display === 'none') {
        listViewEl.style.display = 'block';
      }
    }

    const listEl = typeof document !== 'undefined' ? document.getElementById('list') : null;
    if (listEl) listEl.classList.add('jumping-to-card');

    el.classList?.add?.('highlight-jump');
    try { void el.offsetHeight; } catch {}

    if (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function') {
      const cards = [...document.querySelectorAll('#list .card')];
      const cIdx = cards.indexOf(el);
      if (cIdx >= 0 && global.VocabCore?.setFocusedCardIndex) {
        global.VocabCore.setFocusedCardIndex(cIdx);
      }
    }

    if (!scrollContainer) {
      if (typeof el.scrollIntoView === 'function') {
        try { el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' }); } catch {}
      }
      _jumpHighlightTimer = setTimeout(() => {
        el.classList?.remove?.('highlight-jump');
        if (listEl) listEl.classList.remove('jumping-to-card');
        _jumpHighlightTimer = null;
      }, 2000);
      return;
    }

    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const topSafeOffset = isMobile ? 24 : 16;

    // 1. ブラウザネイティブの scrollIntoView を先行実行
    // W3C CSS Containment 仕様に基づき、ネイティブエンジンが途中の content-visibility:auto を
    // すべてレイアウト計算・実寸展開し、対象要素を確実に可視領域内へ配置
    if (typeof el.scrollIntoView === 'function') {
      try {
        el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
      } catch {
        try { el.scrollIntoView(); } catch {}
      }
    }
    resetOuterScroll(scrollContainer);

    // 2. 実寸展開後の確定座標に基づく絶対精密アライメント調整
    // PC画面の大きさ（4K・フルHD・ノートPC・分割画面）を問わず、
    // 表示領域の高さと実測カード高さの比率に応じて最適な視認位置に補正
    function alignCardPosition(smooth = false) {
      if (!el || !scrollContainer) return;
      if (typeof el.getBoundingClientRect !== 'function' || typeof scrollContainer.getBoundingClientRect !== 'function') return;
      resetOuterScroll(scrollContainer);

      const cRect = scrollContainer.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      const cHeight = scrollContainer.clientHeight || cRect.height || 600;
      const eHeight = el.offsetHeight || eRect.height || 100;

      let desiredOffsetFromTop;
      if (eHeight >= cHeight * 0.6 || isMobile) {
        desiredOffsetFromTop = topSafeOffset;
      } else {
        desiredOffsetFromTop = Math.max(topSafeOffset, (cHeight - eHeight) / 2);
      }

      const currentOffsetFromTop = eRect.top - cRect.top;
      const diff = currentOffsetFromTop - desiredOffsetFromTop;

      if (Math.abs(diff) > 2) {
        const targetScrollTop = Math.max(0, (scrollContainer.scrollTop || 0) + diff);
        if (smooth) {
          try {
            scrollContainer.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
          } catch {
            scrollContainer.scrollTop = targetScrollTop;
          }
        } else {
          scrollContainer.scrollTop = targetScrollTop;
        }
      }
    }

    function removeJumpingClassSafely() {
      if (!listEl || !listEl.classList?.contains?.('jumping-to-card')) {
        if (listEl) listEl.classList?.remove?.('jumping-to-card');
        return;
      }
      let anchor = null;
      let beforeTop = null;
      if (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function' && typeof scrollContainer.getBoundingClientRect === 'function') {
        try {
          const cRect = scrollContainer.getBoundingClientRect();
          const cards = document.querySelectorAll('#list .card');
          for (let i = 0; i < cards.length; i++) {
            const c = cards[i];
            if (typeof c.getBoundingClientRect !== 'function') continue;
            const r = c.getBoundingClientRect();
            if (r.bottom > cRect.top && r.top < cRect.bottom) {
              anchor = c;
              beforeTop = r.top;
              break;
            }
          }
        } catch {}
      }
      listEl.classList.remove('jumping-to-card');
      if (anchor && beforeTop !== null && typeof anchor.getBoundingClientRect === 'function') {
        try {
          void scrollContainer.offsetHeight;
          const afterTop = anchor.getBoundingClientRect().top;
          const shift = afterTop - beforeTop;
          if (Math.abs(shift) >= 1) {
            scrollContainer.scrollTop = Math.max(0, (scrollContainer.scrollTop || 0) + shift);
          }
        } catch {}
      }
    }

    let userInteracted = false;
    const cancelAlignOnUserScroll = () => {
      userInteracted = true;
      clearAlignTimersOnly();
    };
    const onScrollKeydown = e => {
      const k = e && e.key;
      if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'PageDown' || k === 'PageUp' || k === 'Home' || k === 'End' || k === ' ') {
        cancelAlignOnUserScroll();
      }
    };
    const hasContainerEvents = typeof scrollContainer.addEventListener === 'function';
    const hasDocEvents = typeof document !== 'undefined' && typeof document.addEventListener === 'function';
    if (hasContainerEvents) {
      const opts = { passive: true, once: true };
      scrollContainer.addEventListener('wheel', cancelAlignOnUserScroll, opts);
      scrollContainer.addEventListener('touchstart', cancelAlignOnUserScroll, opts);
      scrollContainer.addEventListener('pointerdown', cancelAlignOnUserScroll, opts);
      scrollContainer.addEventListener('mousedown', cancelAlignOnUserScroll, opts);
    }
    if (hasDocEvents) {
      document.addEventListener('keydown', onScrollKeydown, { passive: true });
    }
    if (hasContainerEvents || hasDocEvents) {
      _jumpAbortCleanup = () => {
        if (hasContainerEvents && typeof scrollContainer.removeEventListener === 'function') {
          scrollContainer.removeEventListener('wheel', cancelAlignOnUserScroll);
          scrollContainer.removeEventListener('touchstart', cancelAlignOnUserScroll);
          scrollContainer.removeEventListener('pointerdown', cancelAlignOnUserScroll);
          scrollContainer.removeEventListener('mousedown', cancelAlignOnUserScroll);
        }
        if (hasDocEvents && typeof document.removeEventListener === 'function') {
          document.removeEventListener('keydown', onScrollKeydown);
        }
      };
    }

    alignCardPosition(false);

    if (options.skipRetry) {
      clearAlignTimersOnly();
      removeJumpingClassSafely();
    } else {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          if (userInteracted) return;
          alignCardPosition(false);
          requestAnimationFrame(() => {
            if (!userInteracted) alignCardPosition(false);
          });
        });
      }

      _jumpAlignTimers.push(setTimeout(() => {
        if (!userInteracted) alignCardPosition(false);
      }, 80));
      _jumpAlignTimers.push(setTimeout(() => {
        if (!userInteracted) alignCardPosition(false);
      }, 200));
      _jumpClassTimer = setTimeout(() => {
        if (!userInteracted) alignCardPosition(false);
        clearAlignTimersOnly();
        removeJumpingClassSafely();
        _jumpClassTimer = null;
      }, 600);
    }

    _jumpHighlightTimer = setTimeout(() => {
      el.classList?.remove?.('highlight-jump');
      _jumpHighlightTimer = null;
    }, 2000);
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
    formatGrammarForms,
    collectEtyPeers,
    buildRight,
    createCardElement,
    scrollToCard,
    clearJumpTimers,
    findCardElement
  };
})(typeof window !== 'undefined' ? window : globalThis);

export {};
