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
    const starMatch = raw.match(/\*([a-zA-Z0-9_äöüßÄÖÜāēīōūăĕĭŏŭáéíóúàèìòùâêîôûəǭḗ₁₂₃₄ḱǵʷʰ-]+)/);
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

  /**
   * LIV / Pokorny 準拠の実在語根マスター照合ヘルパー
   */
  function isKnownPieRoot(rootKey) {
    if (!rootKey) return false;
    const clean = normRootKey(rootKey);
    if (!clean) return false;
    const rootsObj = global.VocabDictionary?.BUILTIN_ETYMOLOGY_KNOWLEDGE?.roots || {};
    if (rootsObj[clean] || rootsObj[clean + '-']) return true;
    const raw = clean.replace(/^\*/, '').replace(/-$/, '');
    return Object.keys(rootsObj).some(k => {
      const nk = normRootKey(k).replace(/^\*/, '').replace(/-$/, '');
      return nk === raw || k.replace(/^\*/, '').replace(/-$/, '') === raw;
    });
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

  const POS_BY_LANG = {
    en: /^(N\[(?:C|U|C\/U|pl)\]|N(?:oun)?|V\[(?:T|I|T\/I)\]|V(?:erb)?|Adj|Adv|Prep|Conj|Pron|Idiom|Phrasal V|All)$/i,
    fr: /^(N\[(?:m|f|pl)\]|n\.\s*[mf]|V\[(?:T|I|T\/I|refl)\]|v\.\s*(?:tr\.|intr\.|pr\.)(?:\s*\/\s*v\.\s*(?:tr\.|intr\.|pr\.))?|Adj\.?|Adv\.?|Prep|Conj|Pron|Idiom|All)$/i,
    de: /^(N\[(?:m|f|n|pl)\]|Subst\.\s*[mfn]\.|V\[(?:T|I|T\/I|refl)\]|V(?:t|i|pr)(?:\s*\/\s*V(?:t|i|pr))*|Adj\.?|Adv\.?|Prep|Conj|Pron|Idiom|All)$/i,
    ja: /^(N\[(?:C|U|C\/U|pl)\]|V\[(?:T|I|T\/I)\]|名詞|動詞|形容詞|副詞|熟語|Adj|Adv|Prep|Conj|Pron|Idiom|All)$/i
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

  /**
   * 比較言語学・印欧祖語 4言語クロス同根語（Cognate Knowledge）ナレッジベース
   */
  const COGNATE_KNOWLEDGE = {
    '*sta-': {
      meaning: '立つ、静止する、堅固である',
      en: [{ w: 'constant', m: '一定の、定数' }, { w: 'substance', m: '物質、実体' }, { w: 'stand', m: '立つ' }],
      fr: [{ w: 'constater', m: '確認する' }, { w: 'établir', m: '設立する' }, { w: 'état', m: '国家、状態' }],
      de: [{ w: 'stehen', m: '立つ' }, { w: 'Staat', m: '国家' }, { w: 'Bestand', m: '存続、在庫' }],
      ja: [{ w: '立つ', m: '基本語源義' }, { w: 'ステーション', m: '外来語（駅）' }, { w: '実体', m: '哲学訳語' }]
    },
    '*bher-': {
      meaning: '運ぶ、耐える、生む',
      en: [{ w: 'transfer', m: '移転する' }, { w: 'bear', m: '耐える、産む' }, { w: 'differ', m: '異なる' }],
      fr: [{ w: 'conférer', m: '授与する' }, { w: 'préférer', m: '好む' }, { w: 'souffrir', m: '苦しむ' }],
      de: [{ w: 'gebären', m: '産む' }, { w: 'Bürde', m: '重荷' }, { w: 'führen', m: '導く' }],
      ja: [{ w: '運ぶ/産む', m: '基本語源義' }, { w: 'トランスファー', m: '外来語（移籍・乗換）' }]
    },
    '*weid-': {
      meaning: '見る、知る',
      en: [{ w: 'evidence', m: '証拠' }, { w: 'vision', m: '視覚、展望' }, { w: 'wise', m: '賢い' }],
      fr: [{ w: 'voir', m: '見る' }, { w: 'évident', m: '明白な' }, { w: 'visiter', m: '訪れる' }],
      de: [{ w: 'wissen', m: '知っている' }, { w: 'Weisheit', m: '知恵' }, { w: 'beweisen', m: '証明する' }],
      ja: [{ w: '見る/知る', m: '基本語源義' }, { w: 'ビジョン', m: '外来語（構想・視界）' }]
    },
    '*gno-': {
      meaning: '知る、認識する',
      en: [{ w: 'gnosis', m: '霊知' }, { w: 'know', m: '知る' }, { w: 'recognize', m: '認識する' }],
      fr: [{ w: 'connaître', m: '知る' }, { w: 'notion', m: '概念' }, { w: 'ignorer', m: '知らない' }],
      de: [{ w: 'kennen', m: '知っている' }, { w: 'Kunde', m: '知識、顧客' }, { w: 'erkennen', m: '識別する' }],
      ja: [{ w: '知る/認識', m: '基本語源義' }, { w: 'ノーシス', m: '学術語（グノーシス）' }]
    },
    '*spec-': {
      meaning: '見る、観察する',
      en: [{ w: 'circumspect', m: '慎重な' }, { w: 'inspect', m: '検査する' }, { w: 'aspect', m: '側面' }],
      fr: [{ w: 'aspect', m: '外観、側面' }, { w: 'spectacle', m: '光景' }, { w: 'soupçon', m: '疑い' }],
      de: [{ w: 'Spekulation', m: '思索、投機' }, { w: 'Späher', m: '偵察者' }, { w: 'Respekt', m: '敬意' }],
      ja: [{ w: '見る/注視', m: '基本語源義' }, { w: 'スペクタクル', m: '外来語（壮観）' }]
    },
    '*genh1-': {
      meaning: '生む、生じる、種族',
      en: [{ w: 'generate', m: '生み出す' }, { w: 'genius', m: '天才' }, { w: 'nation', m: '国民、国家' }],
      fr: [{ w: 'genre', m: 'ジャンル、類' }, { w: 'naître', m: '生まれる' }, { w: 'généreux', m: '寛大な' }],
      de: [{ w: 'Kind', m: '子ども' }, { w: 'Kinn', m: '血族' }, { w: 'Gattung', m: '属、種類' }],
      ja: [{ w: '生じる/血統', m: '基本語源義' }, { w: 'ジェネレーター', m: '外来語（発生器）' }]
    },
    '*gen-': {
      meaning: '生む、生じる、種族',
      en: [{ w: 'generate', m: '生み出す' }, { w: 'genius', m: '天才' }, { w: 'nation', m: '国民、国家' }],
      fr: [{ w: 'genre', m: 'ジャンル、類' }, { w: 'naître', m: '生まれる' }, { w: 'généreux', m: '寛大な' }],
      de: [{ w: 'Kind', m: '子ども' }, { w: 'Kinn', m: '血族' }, { w: 'Gattung', m: '属、種類' }],
      ja: [{ w: '生じる/血統', m: '基本語源義' }, { w: 'ジェネレーター', m: '外来語（発生器）' }]
    },
    '*deik-': {
      meaning: '指し示す、告げる、宣言する',
      en: [{ w: 'dictum', m: '格言' }, { w: 'indicate', m: '指し示す' }, { w: 'predict', m: '予測する' }],
      fr: [{ w: 'dire', m: '言う' }, { w: 'dicton', m: 'ことわざ' }, { w: 'indiquer', m: '示す' }],
      de: [{ w: 'zeigen', m: '示す' }, { w: 'Diktat', m: '口述、命令' }, { w: 'Zeichen', m: 'しるし' }],
      ja: [{ w: '言う/指す', m: '基本語源義' }, { w: 'インデックス', m: '外来語（索引・指標）' }]
    }
  };

  /**
   * 単語から4言語クロス同根語マトリクス（Cognate Matrix）データを構築
   */
  function buildCognateMatrix(item, rootIndexMap = null) {
    if (!item) return null;
    const tags = Array.isArray(item.etymologyTags) && item.etymologyTags.length
      ? item.etymologyTags
      : (typeof item.etymologyTags === 'string' ? item.etymologyTags.split(',').map(s => s.trim()).filter(Boolean) : []);

    let targetRoot = '';
    let matchedKnowledge = null;

    for (let i = 0; i < tags.length; i++) {
      const clean = normRootKey(tags[i]);
      const matched = COGNATE_KNOWLEDGE[clean] || COGNATE_KNOWLEDGE[clean + '-'] || COGNATE_KNOWLEDGE[clean.replace(/-$/, '')];
      if (matched) {
        targetRoot = clean.endsWith('-') ? clean : `${clean}-`;
        matchedKnowledge = matched;
        break;
      }
    }

    if (!targetRoot && tags.length) {
      const c = normRootKey(tags[0]);
      targetRoot = c ? (c.endsWith('-') ? c : `${c}-`) : '';
    }

    if (!targetRoot) return null;

    // 辞書データとライブラリ内エントリの統合
    const langs = {
      en: [],
      fr: [],
      de: [],
      ja: []
    };

    if (matchedKnowledge) {
      ['en', 'fr', 'de', 'ja'].forEach(l => {
        if (matchedKnowledge[l]) {
          langs[l].push(...matchedKnowledge[l]);
        }
      });
    }

    // ライブラリ内の同語根エントリをマージ (rootIndexMapのキーは normRootKey による末尾ハイフン除去済みの形式)
    if (rootIndexMap && typeof rootIndexMap.get === 'function') {
      const normKey = normRootKey(targetRoot);
      const peers = rootIndexMap.get(normKey) || rootIndexMap.get(targetRoot) || [];
      peers.forEach(p => {
        const l = p.lang || 'en';
        if (langs[l] && !langs[l].some(x => x.w === p.word)) {
          langs[l].push({
            w: p.word,
            m: p.meanings?.[0]?.text || '',
            inLibrary: true,
            id: p.id,
            homographIndex: p.homographIndex
          });
        }
      });
    }

    // 見出し語自身がリストになければ先頭に挿入
    const iL = item.lang || 'en';
    if (langs[iL] && !langs[iL].some(x => x.w === item.word)) {
      langs[iL].unshift({
        w: item.word,
        m: item.meanings?.[0]?.text || item.core || '',
        inLibrary: true,
        isCurrent: true
      });
    }

    // 自分自身以外の同根語が存在し、かつ少なくとも他言語（fr, de, ja）に1つ以上同根語が存在する場合のみ表示
    let totalOtherCognates = 0;
    ['en', 'fr', 'de', 'ja'].forEach(l => {
      (langs[l] || []).forEach(c => {
        if (!c.isCurrent) totalOtherCognates++;
      });
    });
    const hasCrossLingual = (langs.fr && langs.fr.length > 0) || (langs.de && langs.de.length > 0) || (langs.ja && langs.ja.length > 0);
    if (totalOtherCognates === 0 || !hasCrossLingual) return null;

    return {
      root: targetRoot,
      meaning: matchedKnowledge?.meaning || '語源的根幹概念',
      langs
    };
  }

  /**
   * 4言語クロス同根語マトリクスのHTMLをレンダリング
   */
  function renderCognateMatrixHtml(matrix) {
    if (!matrix || !matrix.root) return '';
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
    const isEn = (global.VocabI18n?.getLocale?.() || 'ja') !== 'ja';

    const renderLangCol = (code, label, items) => {
      const list = (items || []).slice(0, 3);
      if (!list.length) return `<div class="cog-matrix-col"><div class="cog-col-hdr">${label}</div><div class="cog-col-empty">-</div></div>`;

      const itemsHtml = list.map(it => `
        <div class="cog-item ${it.isCurrent ? 'is-current' : ''}">
          <span class="cog-w" ${it.inLibrary ? `data-act="jump" data-word="${esc(it.w)}" data-lang="${code}"` : ''}>${esc(it.w)}</span>
          ${it.m ? `<span class="cog-m">${esc(it.m.slice(0, 20))}</span>` : ''}
        </div>
      `).join('');

      return `<div class="cog-matrix-col"><div class="cog-col-hdr ${code}">${label}</div>${itemsHtml}</div>`;
    };

    const badgeLabel = isEn ? '4-Language Cognate Matrix' : '4言語同根語マトリクス';
    const rootPrefix = isEn ? 'Root: ' : '語根: ';
    const colEn = isEn ? 'English (EN)' : '英語 (EN)';
    const colFr = isEn ? 'French (FR)' : 'フランス語 (FR)';
    const colDe = isEn ? 'German (DE)' : 'ドイツ語 (DE)';
    const colJa = isEn ? 'Classical / 日本語 (JA)' : '日本語 / 訳語';

    return `
      <div class="cognate-matrix-box">
        <div class="cog-matrix-header">
          <span class="cog-matrix-badge">${badgeLabel}</span>
          <span class="cog-matrix-root">${rootPrefix}<strong>${esc(matrix.root)}</strong>（${esc(matrix.meaning)}）</span>
        </div>
        <div class="cog-matrix-grid">
          ${renderLangCol('en', colEn, matrix.langs.en)}
          ${renderLangCol('fr', colFr, matrix.langs.fr)}
          ${renderLangCol('de', colDe, matrix.langs.de)}
          ${renderLangCol('ja', colJa, matrix.langs.ja)}
        </div>
      </div>
    `;
  }

  /**
   * 印欧祖語(PIE) 大概念領域オントロジー (Level 0: Semantic Realm)
   * 数万語規模の語根ネットワークを最上位マクロ領域に構造化
   */
  const SEMANTIC_REALMS = {
    motion: { id: 'motion', label: '運動・身体動作 (Motion & Action)', color: '#38bdf8' },
    cognition: { id: 'cognition', label: '思考・知覚・認識 (Mind & Perception)', color: '#818cf8' },
    life: { id: 'life', label: '生成・生命・自然 (Life & Nature)', color: '#34d399' },
    communication: { id: 'communication', label: '言語・伝達・宣言 (Voice & Discourse)', color: '#fbbf24' },
    structure: { id: 'structure', label: '構造・物質・保持 (Structure & Force)', color: '#f472b6' },
    society: { id: 'society', label: '社会・秩序・価値 (Order & Exchange)', color: '#fb923c' }
  };

  const ROOT_REALM_MAP = {
    '*sta-': 'motion', '*ped-': 'motion', '*sed-': 'motion', '*ag-': 'motion',
    '*gwem-': 'motion', '*ked-': 'motion', '*tragh-': 'motion', '*vert-': 'motion',
    '*mey-': 'motion', '*sekw-': 'motion',
    '*weid-': 'cognition', '*men-': 'cognition', '*spec-': 'cognition', '*gno-': 'cognition',
    '*sent-': 'cognition', '*sked-': 'cognition', '*med-': 'cognition', '*kred-': 'cognition',
    '*genh₁-': 'life', '*gen-': 'life', '*bhew-': 'life', '*wed-': 'life',
    '*ters-': 'life', '*blew-': 'life', '*mer-': 'life',
    '*leg-': 'communication', '*wer-': 'communication', '*deik-': 'communication',
    '*wek-': 'communication', '*skreybh-': 'communication', '*prek-': 'communication',
    '*kap-': 'structure', '*ten-': 'structure', '*bher-': 'structure', '*dhe-': 'structure',
    '*tag-': 'structure', '*per-': 'structure', '*port-': 'structure', '*sek-': 'structure',
    '*ster-': 'structure', '*tekw-': 'structure', '*pel-': 'structure', '*clud-': 'structure', '*mit-': 'structure',
    '*reg-': 'society', '*nem-': 'society', '*lau-': 'society', '*kwel-': 'society'
  };

  function getSemanticRealmForRoot(rootKey) {
    if (!rootKey) return SEMANTIC_REALMS.structure;
    const clean = normRootKey(rootKey);
    const key = ROOT_REALM_MAP[clean] || ROOT_REALM_MAP[clean + '-'] || ROOT_REALM_MAP[clean.replace(/-$/, '')];
    if (key && SEMANTIC_REALMS[key]) return SEMANTIC_REALMS[key];
    return SEMANTIC_REALMS.structure;
  }

  /**
   * 単語から形態素語幹（Level 4: Morphological Stem）を高精度に抽出
   * 接頭辞と接尾辞に挟まれた核となる基底語幹を同定
   */
  function extractMorphologicalStem(word, rootKey = '', item = null) {
    const rawW = String(word || '').toLowerCase().trim();
    if (!rawW) return { stem: '', label: '一般語幹', core: '' };
    const cleanR = normRootKey(rootKey);

    // 代表的PIE語根ごとの古典語幹マッピング
    if (cleanR.includes('sta')) {
      if (/stitut/.test(rawW)) return { stem: '-stitut-', label: '-stitut- (据える・制定)', core: '制度・設置' };
      if (/sist/.test(rawW)) return { stem: '-sist-', label: '-sist- (留まる・維持)', core: '静止・持続' };
      if (/stant|stanc/.test(rawW)) return { stem: '-stant-', label: '-stant- (存続・持続)', core: '実体・継続' };
      if (/stand|stund|steh/.test(rawW)) return { stem: 'stand-', label: 'stand- (立つ)', core: '直立・支持' };
      if (/stat|status|state/.test(rawW)) return { stem: 'stat-', label: 'stat- (状態・確立)', core: '地位・状態' };
      if (/stab|stabl/.test(rawW)) return { stem: 'stabl-', label: 'stabl- (安定・基礎)', core: '強固・定着' };
    } else if (cleanR.includes('gen')) {
      if (/gener|gene/.test(rawW)) return { stem: 'gene-', label: 'gene- (生成・種類)', core: '発生・血統' };
      if (/nat|gna|nature/.test(rawW)) return { stem: 'nat-', label: 'nat- (生まれ・本性)', core: '自然・出生' };
      if (/kin|kind/.test(rawW)) return { stem: 'kin-', label: 'kin- (親族・同種)', core: '親族・親切' };
    } else if (cleanR.includes('bher')) {
      if (/fer/.test(rawW)) return { stem: '-fer-', label: '-fer- (運ぶ・差し出す)', core: '運搬・提示' };
      if (/bear|birth|burden/.test(rawW)) return { stem: 'bear-', label: 'bear- (耐える・生む)', core: '担う・出産' };
    } else if (cleanR.includes('kap')) {
      if (/ceiv|cept/.test(rawW)) return { stem: '-cept-', label: '-cept- (受容・把握)', core: '認識・捕捉' };
      if (/cap|capt/.test(rawW)) return { stem: 'cap-', label: 'cap- (能力・捕獲)', core: '器量・把持' };
    } else if (cleanR.includes('ten')) {
      if (/tain/.test(rawW)) return { stem: '-tain-', label: '-tain- (維持・保持)', core: '保全・所有' };
      if (/tend|tens|tent/.test(rawW)) return { stem: '-tens-', label: '-tens- (伸長・緊張)', core: '拡張・意図' };
    } else if (cleanR.includes('dhe')) {
      if (/pos|posit/.test(rawW)) return { stem: '-pose-', label: '-pose- (配置・提示)', core: '設置・構え' };
      if (/fect|fic|fact/.test(rawW)) return { stem: '-fic-', label: '-fic- (形成・効果)', core: '成果・作用' };
    } else if (cleanR.includes('leg')) {
      if (/lect/.test(rawW)) return { stem: '-lect-', label: '-lect- (収集・選抜)', core: '選択・読み' };
      if (/log/.test(rawW)) return { stem: '-log-', label: '-log- (論理・対話)', core: '言論・学問' };
    } else if (cleanR.includes('spec')) {
      if (/spect|spic/.test(rawW)) return { stem: '-spect-', label: '-spect- (注視・展望)', core: '観察・見渡す' };
    } else if (cleanR.includes('port')) {
      if (/port/.test(rawW)) return { stem: '-port-', label: '-port- (運搬・出入口)', core: '港・輸送' };
    } else if (cleanR.includes('tragh')) {
      if (/tract/.test(rawW)) return { stem: '-tract-', label: '-tract- (牽引・抽出)', core: '引く・契約' };
    } else if (cleanR.includes('vert')) {
      if (/vert|vers/.test(rawW)) return { stem: '-vert-', label: '-vert- (転換・方向)', core: '回転・向ける' };
    }

    // 一般的な形態素語幹抽出（主要接頭辞の除去）
    const prefixRegex = /^(?:con|com|col|cor|sub|suc|suf|sug|sup|sur|sus|in|im|il|ir|ex|ef|per|trans|tra|re|pro|pre|de|ad|ac|af|ag|al|an|ap|ar|as|at|ob|oc|of|op|dis|dif|di|inter|intra|mis|un|non|en|em)-?/;
    const withoutPrefix = rawW.replace(prefixRegex, '');
    const cleanStem = withoutPrefix.length >= 3 ? withoutPrefix.slice(0, Math.min(6, withoutPrefix.length)) : rawW;
    return {
      stem: `-${cleanStem}-`,
      label: `-${cleanStem}- (基本語幹)`,
      core: '基底形態素'
    };
  }

  /**
   * レーベンシュタイン距離の計算 (O(min(N, M)) メモリ最適化)
   */
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

  const COMMON_TRICKY_WORDS = [
    'accommodate', 'definitely', 'occurrence', 'embarrass', 'millennium', 'privilege',
    'separate', 'necessary', 'maintenance', 'recommend', 'rhythm', 'conscience',
    'discipline', 'gauge', 'hierarchy', 'liaison', 'maneuver', 'perseverance',
    'supersede', 'surveillance', 'threshold', 'vacuum', 'withhold', 'independent',
    'experience', 'government', 'environment', 'calendar', 'cemetery', 'pronunciation'
  ];

  /**
   * スペルミス・タイポのサジェスト判定 (もしかして判定)
   */
  function findTypoSuggestion(rawWord, lang = 'en', entries = []) {
    if (!rawWord || typeof rawWord !== 'string') return null;
    const clean = rawWord.trim().toLowerCase();
    if (clean.length < 4 || clean.includes(' ')) return null;

    // 候補セットの収集（英検カタログ語彙、現在の単語帳、頻出難関語）
    const candidates = new Set(COMMON_TRICKY_WORDS);
    if (global.VocabEikenCatalog?.getAllWords) {
      global.VocabEikenCatalog.getAllWords().forEach(w => candidates.add(w.toLowerCase()));
    }
    if (Array.isArray(entries)) {
      entries.forEach(e => {
        if (e && e.word && !e.isDeleted) candidates.add(e.word.toLowerCase());
      });
    }

    if (candidates.has(clean)) return null;

    let bestMatch = null;
    let minDistance = 3;

    for (const cand of candidates) {
      if (Math.abs(cand.length - clean.length) > 2) continue;
      if (cand[0] !== clean[0] && Math.abs(cand.length - clean.length) > 1) continue;

      const dist = calcLevenshtein(clean, cand);
      if (dist < minDistance) {
        minDistance = dist;
        bestMatch = cand;
        if (dist === 1) break;
      }
    }

    if (bestMatch && minDistance <= 2) {
      return {
        original: rawWord,
        suggestion: bestMatch,
        distance: minDistance
      };
    }
    return null;
  }

  // --- グローバルエクスポート ---
  global.VocabMorphology = {
    foldAscii,
    calcLevenshtein,
    findTypoSuggestion,
    ROOT_PREFIXES,
    normRootKey,
    matchRootInText,
    isValidRootForEntry,
    isKnownPieRoot,
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
    makeLookupKey,
    COGNATE_KNOWLEDGE,
    buildCognateMatrix,
    renderCognateMatrixHtml,
    // 多層階層オントロジー & 形態素語幹エンジン
    SEMANTIC_REALMS,
    ROOT_REALM_MAP,
    getSemanticRealmForRoot,
    extractMorphologicalStem
  };

  // 即時参照互換性
  global.normRootKey = normRootKey;
  global.isValidRootForEntry = isValidRootForEntry;
})(typeof window !== 'undefined' ? window : globalThis);
