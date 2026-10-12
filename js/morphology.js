/**
 * Vocab Vault — Morphology & Etymology Validation Engine (js/morphology.js)
 * High-precision Root Normalization, PIE Alignment, Suppletion & Lexical Integrity
 */
(function (global) {
  'use strict';

  /**
   * Unicode NFKD + ダイアクリティカルマーク除去・リガチャー展開 (ASCIIフォールディング)
   */
  const foldAscii = s => String(s ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/ß/g, 'ss');

  const ROOT_PREFIXES = [
    '語根', '語幹', '印欧祖語', 'pie', 'ゲルマン祖語', '古高ドイツ語', '中高ドイツ語',
    '古フランス語', '接頭辞', '前綴り', '接尾辞', 'ラテン語', 'ギリシャ語', '古英語',
    '同族語', '由来', '借用', '語源'
  ];

  /**
   * 印欧祖語(PIE)等の語根キーを正規化 (*sta-, *genh₁-)
   */
  function normRootKey(s) {
    const raw = String(s ?? '').trim();
    if (!raw) return '';

    // 1. 文字列内にアスタリスク (*) が存在する場合、その *語根 トークンを最優先抽出
    const starMatch = raw.match(/\*([a-zA-Z0-9_äöüßÄÖÜ₁₂₃₄ḱǵʷʰ-]+)/);
    if (starMatch) {
      let root = '*' + starMatch[1].toLowerCase().replace(/h[1-3₁-₃]/g, '').replace(/-$/, '');
      if (root.length >= 6 && /en$/.test(root)) root = root.slice(0, -2);
      return foldAscii(root);
    }

    // 2. コロン以降の抽出 (例: "印欧祖語: sta-")
    let k = raw;
    const ci = k.search(/[:：]/);
    if (ci !== -1 && ROOT_PREFIXES.includes(k.slice(0, ci).trim().toLowerCase())) {
      k = k.slice(ci + 1).trim();
    }

    // 括弧内の日本語解説を除去
    k = (k.replace(/\s*[\(（].*?[\)）]\s*/g, ' ').trim().toLowerCase().split(/[\s\/,、]+/)[0]) || '';
    k = foldAscii(k);

    // 単なる言語名や空文字のガード
    if (!k || ROOT_PREFIXES.includes(k) || k.length < 2) return '';

    if (k.startsWith('*')) return k.replace(/h[1-3₁-₃]/g, '').replace(/-$/, '');
    if (k.length >= 6 && /(?:are|ere|ire|ari|eri|iri)$/.test(k)) return k.slice(0, -3);
    if (k.length >= 6 && /en$/.test(k)) return k.slice(0, -2);
    return '*' + k.replace(/-$/, '');
  }

  /**
   * 語源テキスト内に語根タグが存在するか照合
   */
  function matchRootInText(tag, textFold) {
    const k = normRootKey(tag).replace(/^\*/, '');
    if (k.length < 2 || !textFold) return false;
    const probe = k.length >= 4 ? k.slice(0, 4) : k;
    return textFold.includes(probe);
  }

  /**
   * 見出し語自身と語根の真正性バリデーション（例文由来の誤混入を完全遮断）
   */
  function isValidRootForEntry(rootKey, item) {
    if (!rootKey || !item || !item.word) return false;
    const cleanKey = normRootKey(rootKey);
    if (!cleanKey) return false;
    const rawRoot = cleanKey.replace(/^\*/, '');
    if (rawRoot.length < 2) return false;

    // 1. 語根が見出し語そのものと完全一致する場合は語根ではない
    const wordFold = foldAscii(item.word);
    if (rawRoot === wordFold) return false;

    // 2. 語源解説文 (etymology) を照合
    const etyFold = foldAscii(item.etymology || '');
    if (etyFold) {
      const inEty = etyFold.includes('*' + rawRoot) || matchRootInText(cleanKey, etyFold);
      if (inEty) return true;
    }

    // 3. 例文 (example.foreign) の誤混入チェック:
    // もし語源文に一切言及がなく、例文の中に出現する単語から勝手に作られたタグなら拒否
    const exFold = foldAscii(item.example?.foreign || '');
    if (exFold && !etyFold.includes(rawRoot)) {
      const wordsInEx = exFold.split(/[^a-zA-Z0-9_äöüßÄÖÜ]+/);
      if (wordsInEx.some(w => w.startsWith(rawRoot) && w !== wordFold)) {
        return false;
      }
    }

    // 語源文に言及があればOK、語源文自体が未記入ならタグを信用
    return Boolean(etyFold ? matchRootInText(cleanKey, etyFold) : true);
  }

  // 補充法（不規則動詞・名詞）マッピング
  const SUPPLETIVE_MAP = {
    be: ['am', 'is', 'are', 'was', 'were', 'been', 'being'],
    go: ['went', 'gone', 'goes', 'going'],
    good: ['better', 'best'],
    bad: ['worse', 'worst'],
    person: ['people', 'persons'],
    etre: ['suis', 'es', 'est', 'sommes', 'etes', 'sont', 'etais', 'etait', 'ete', 'fus', 'fut', 'soit', 'serai', 'serait'],
    avoir: ['ai', 'as', 'avons', 'avez', 'ont', 'avais', 'avait', 'eu', 'eut', 'ait', 'aurai', 'aurait'],
    aller: ['vais', 'vas', 'va', 'allons', 'allez', 'vont', 'allait', 'ira', 'irai', 'aille', 'alle'],
    faire: ['fais', 'fait', 'faisons', 'faites', 'font', 'faisait', 'fera', 'fasse', 'fit'],
    pouvoir: ['peux', 'peut', 'pouvons', 'pouvez', 'peuvent', 'pu', 'pourrai', 'puisse'],
    savoir: ['sais', 'sait', 'savons', 'savez', 'savent', 'su', 'saurai', 'sache'],
    venir: ['viens', 'vient', 'venons', 'venez', 'viennent', 'venu', 'viendrai', 'vins'],
    voir: ['vois', 'voit', 'voyons', 'voyez', 'voient', 'vu', 'verrai', 'vis'],
    prendre: ['prends', 'prend', 'prenons', 'prenez', 'prennent', 'pris', 'prendrai'],
    sein: ['bin', 'bist', 'ist', 'sind', 'seid', 'war', 'waren', 'gewesen', 'sei', 'waere'],
    haben: ['habe', 'hast', 'hat', 'hatte', 'hatten', 'gehabt', 'haette'],
    werden: ['werde', 'wirst', 'wird', 'wurde', 'wurden', 'geworden', 'wuerde'],
    wissen: ['weiss', 'weisst', 'wusste', 'gewusst']
  };

  const DE_SEP_PREFIXES = [
    'ab', 'an', 'auf', 'aus', 'bei', 'ein', 'fest', 'her', 'hin', 'los', 'mit',
    'nach', 'statt', 'teil', 'um', 'vor', 'weg', 'weiter', 'zu', 'zurück', 'zusammen'
  ];

  const mkPosReg = (n, v, ex = '') => new RegExp(`^(N\\[(${n})\\]|V\\[(${v})\\]|Adj|Adv|Prep|Conj|Pron|Idiom${ex})$`);
  const POS_BY_LANG = {
    en: mkPosReg('C|U|C\\/U|pl', 'T|I|T\\/I', '|Phrasal V'),
    fr: mkPosReg('m|f|pl', 'T|I|T\\/I|refl'),
    de: mkPosReg('m|f|n|pl', 'T|I|T\\/I|refl'),
    ja: mkPosReg('C|U|C\\/U|pl', 'T|I|T\\/I', '')
  };

  const IPA_OK = /^[\p{L}\p{M}ˈˌːˑ.\-‿ ()/]+$/u;
  const WIKT_BAD_BRACKET = /^(?:transitive|intransitive|reflexive|countable|uncountable|obsolete|archaic|dated|rare|slang|figurative|literally|by extension|chiefly|uk|us|rp|general american|received pronunciation|\d+.*)$/i;
  const IPA_SPEC_CHAR = /[ˈˌːˑəɛɪʊɔæɑɒʌɜɝɐɨʉɯɤɵɶœçʝʃʒθðŋɲɳɴʎɾɽʁχħʕʔβɸɣxɥwɧʦʣʧʤ]/;

  /**
   * 最長共通部分列 (LCS) の長さを動的計画法で計算
   */
  function lcsLen(a, b) {
    const m = a.length, n = b.length;
    if (!m || !n) return 0;
    const dp = new Uint8Array(n + 1);
    for (let i = 0; i < m; i++) {
      let prev = 0;
      for (let j = 0; j < n; j++) {
        const tmp = dp[j + 1];
        dp[j + 1] = a[i] === b[j] ? prev + 1 : Math.max(dp[j + 1], dp[j]);
        prev = tmp;
      }
    }
    return dp[n];
  }

  /**
   * 活用形・派生形の形態論的一致判定
   */
  function isRelatedWordForm(wordFold, usedFold, gramFold, lang) {
    if (!usedFold || !wordFold) return false;
    if (usedFold === wordFold) return true;
    const minStem = Math.max(3, wordFold.length - 3);
    if (wordFold.length >= 4 && usedFold.includes(wordFold.slice(0, minStem))) return true;

    const supp = SUPPLETIVE_MAP[wordFold];
    if (supp?.some(s => usedFold === s || usedFold.split(/\s+/).includes(s))) return true;

    if (gramFold) {
      const gTokens = gramFold.split(/[,;/\s()]+/).filter(t => t.length >= 3 && !['der','die','das','hat','ist','les','des','pl'].includes(t));
      if (gTokens.some(t => usedFold.includes(t) || t.includes(usedFold))) return true;
    }

    if (lang === 'de') {
      const pref = DE_SEP_PREFIXES.find(p => wordFold.startsWith(p) && wordFold.length - p.length >= 3);
      if (pref) {
        const base = wordFold.slice(pref.length);
        const baseCons = base.replace(/[aeiouy]/g, '');
        if (usedFold.includes(pref) && (usedFold.includes(base.slice(0, 3)) || (baseCons.length >= 2 && lcsLen(baseCons, usedFold.replace(/[aeiouy]/g, '')) >= 2))) {
          return true;
        }
      }
    }

    if (wordFold[0] === usedFold[0]) {
      const consW = wordFold.replace(/[aeiouy]/g, ''), consU = usedFold.replace(/[aeiouy]/g, '');
      const cLcs = lcsLen(consW, consU);
      const fullLcs = lcsLen(wordFold, usedFold);
      const minLen = Math.min(wordFold.length, usedFold.length);
      if (cLcs >= Math.min(2, consW.length) && fullLcs >= Math.ceil(minLen * 0.55)) return true;
    }
    return false;
  }

  /**
   * 例文中に単語が含まれているか形態素解析照合
   */
  function checkWordInSentence(it) {
    const sen = foldAscii(it.example?.foreign || '');
    if (!sen) return true;
    const w = foldAscii(it.word), gramFold = foldAscii(it.grammar_forms || '');
    const senWords = sen.split(/[^\p{L}0-9]+/u).filter(Boolean);

    if (w.includes(' ')) {
      const wParts = w.split(/\s+/).filter(p => p.length >= 2);
      if (wParts.length && wParts.every(p => sen.includes(p.slice(0, Math.max(2, p.length - 2))))) return true;
    }

    const stemLen = w.length <= 4 ? w.length : Math.max(4, w.length - 3);
    const stem = w.slice(0, stemLen);
    if (senWords.some(sw => sw === w || (sw.startsWith(stem) && Math.abs(sw.length - w.length) <= 4))) return true;

    const gramTokens = gramFold.split(/[,;/\s()]+/).filter(t => t.length >= 3 && !['der','die','das','hat','ist','les','des'].includes(t));
    if (gramTokens.some(t => senWords.includes(t))) return true;

    const supp = SUPPLETIVE_MAP[w];
    if (supp?.some(s => senWords.includes(s))) return true;

    if (it.lang === 'de') {
      const pref = DE_SEP_PREFIXES.find(p => w.startsWith(p) && w.length - p.length >= 3);
      if (pref) {
        const base = w.slice(pref.length), baseStem = base.slice(0, Math.max(3, base.length - 2));
        const baseCons = base.replace(/[aeiouy]/g, '').slice(0, 2);
        const hasPref = senWords.includes(pref);
        const hasBase = senWords.some(sw => sw.startsWith(baseStem) || sw.includes(baseStem) || (baseCons.length >= 2 && sw.replace(/[aeiouy]/g, '').startsWith(baseCons)));
        if (hasPref && hasBase) return true;
      }
    }

    const used = foldAscii(it.example?.used_form || '');
    if (used.length >= 2) {
      const usedParts = used.split(/[^\p{L}0-9]+/u).filter(p => p.length >= 2);
      if (usedParts.length && usedParts.every(p => senWords.includes(p) || sen.includes(p)) && isRelatedWordForm(w, used, gramFold, it.lang)) {
        return true;
      }
    }
    return false;
  }

  /**
   * エントリの学術的整合性バリデーション
   */
  function validateEntry(it) {
    const f = [], w = foldAscii(it.word), posReg = POS_BY_LANG[it.lang] || POS_BY_LANG.en;
    if (it.meanings && it.meanings.some(m => !posReg.test(m.pos))) f.push('品詞が言語と不整合');
    if (it.example?.foreign) {
      if (!checkWordInSentence(it)) f.push('例文に見出し語なし');
      if (!/<b>.+?<\/b>/i.test(it.example.ja)) f.push('和訳に<b>なし');
    }
    if (it.phonetic && (!IPA_OK.test(it.phonetic) || WIKT_BAD_BRACKET.test(it.phonetic))) f.push('IPA異常');
    if (it.derivatives && it.derivatives.some(d => foldAscii(d.word) === w)) f.push('派生語が見出し語と同一');
    if (it.etymologyTags && it.etymologyTags.length && it.etymology) {
      const ety = foldAscii(it.etymology);
      if (!it.etymologyTags.some(t => matchRootInText(t, ety))) f.push('語根タグが語源文に無い');
    }
    return f;
  }

  /**
   * 単語入力文字列の解釈 (同形異義語 #2, 意味ヒントの抽出)
   */
  function parseInputWordSpec(rawStr) {
    let s = String(rawStr ?? '').trim().normalize('NFC'), homoIdx = 1, senseHint = '';
    const hashM = s.match(/^(.*?)#(\d+)\s*$/);
    if (hashM) { s = hashM[1].trim(); homoIdx = Math.max(1, parseInt(hashM[2], 10) || 1); }
    const parenM = s.match(/^(.*?)[\s]*[\(（]([^\)）]+)[\)）]\s*$/);
    if (parenM && parenM[1].trim()) { s = parenM[1].trim(); senseHint = parenM[2].trim(); }
    return { cleanWord: s, homographIndex: homoIdx, senseHint };
  }

  /**
   * 一意な単語キーの生成 (en:bank#1, de:Bank:Noun#2)
   */
  function makeWordKey(word, lang = 'en', pos = '', homographIndex = 1) {
    const w = String(word ?? '').trim().normalize('NFC');
    if (!w) return '';
    const normW = lang === 'de' ? w : w.toLowerCase();
    const posPrefix = lang === 'de' && pos ? `:${String(pos).split('[')[0]}` : '';
    const hSuffix = Number(homographIndex) > 1 ? `#${Number(homographIndex)}` : '';
    return `${lang}:${normW}${posPrefix}${hSuffix}`;
  }

  /**
   * 検索用キーの生成 (bank#2, bank)
   */
  function makeLookupKey(word, lang = 'en', homographIndex = 1) {
    const w = String(word ?? '').trim().normalize('NFC');
    const base = lang === 'de' ? w : w.toLowerCase();
    return Number(homographIndex) > 1 ? `${base}#${Number(homographIndex)}` : base;
  }

  // --- グローバルエクスポート ---
  global.VocabMorphology = {
    foldAscii,
    ROOT_PREFIXES,
    normRootKey,
    matchRootInText,
    isValidRootForEntry,
    SUPPLETIVE_MAP,
    DE_SEP_PREFIXES,
    POS_BY_LANG,
    IPA_OK,
    WIKT_BAD_BRACKET,
    IPA_SPEC_CHAR,
    lcsLen,
    isRelatedWordForm,
    checkWordInSentence,
    validateEntry,
    parseInputWordSpec,
    makeWordKey,
    makeLookupKey
  };

  // 即時参照互換性
  global.normRootKey = normRootKey;
  global.isValidRootForEntry = isValidRootForEntry;
})(typeof window !== 'undefined' ? window : globalThis);
