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
    '古フランス語', '古オランダ語', '中世オランダ語', '古スペイン語', 'イタリア語', 'ポルトガル語',
    '接頭辞', '前綴り', '接尾辞', 'ラテン語', 'ギリシャ語', '古英語',
    '同族語', '由来', '借用', '語源', '字源', '部首', '音符', '語素', '漢字', '漢字語', '한자', '字',
    'root', 'etymology', 'wurzel', 'racine', 'raíz', 'radice', 'raiz', 'wortel', 'hanja', 'trad', '자원'
  ];

  // 東アジア漢字圏（中・韓・日）の異体字・簡体字・繁体字を共通の字源ルートへ統合する正規化マップ
  const CJK_CANONICAL_ROOT_MAP = {
    '经':'経', '經':'経', '济':'済', '濟':'済',
    '权':'権', '權':'権', '观':'観', '觀':'観',
    '动':'動', '動':'動', '学':'学', '學':'学',
    '发':'発', '發':'発', '义':'義', '義':'義',
    '识':'識', '識':'識', '论':'論', '論':'論',
    '变':'変', '變':'変', '实':'実', '實':'実',
    '体':'体', '體':'体', '国':'国', '國':'国',
    '会':'会', '會':'会', '政':'政', '治':'治',
    '信':'信', '理':'理', '法':'法', '生':'生',
    '心':'心', '言':'言', '水':'水', '手':'手',
    '行':'行', '定':'定', '相':'相', '交':'交',
    '主':'主', '道':'道', '気':'気', '氣':'気', '气':'気',
    '制':'制', '製':'制', '立':'立', '明':'明',
    '正':'正', '通':'通', '成':'成', '力':'力',
    '合':'合', '文':'文', '化':'化', '社':'社',
    '公':'公', '共':'共', '自':'自', '由':'由',
    '平':'平', '等':'等', '認':'認', '认':'認',
    '証':'証', '证':'証', '證':'証', '構':'構', '构':'構',
    '造':'造', '規':'規', '规':'規', '則':'則', '则':'則',
    '責':'責', '责':'責', '任':'任', '価':'価', '价':'価', '價':'価',
    '値':'値', '值':'値', '質':'質', '质':'質', '量':'量'
  };

  function canonicalizeCjkChar(ch) {
    return CJK_CANONICAL_ROOT_MAP[ch] || ch;
  }

  /**
   * 印欧祖語(PIE)および漢字圏(CJK字源・部首・音符)の語根キーを正規化 (*sta-, *genh₁-, *政, *信)
   */
  function normRootKey(s) {
    const raw = String(s ?? '').trim();
    if (!raw) return '';

    // 1. アスタリスク直後の漢字字源トークン（例: "*政", "字源: *経 (治める)"）を最優先抽出
    const starCjkMatch = raw.match(/\*([\u4E00-\u9FFF\u3400-\u4DBF\u2E80-\u2EFF\uF900-\uFAFF])/);
    if (starCjkMatch) {
      return '*' + canonicalizeCjkChar(starCjkMatch[1]);
    }

    // 2. アスタリスク直後の印欧祖語(PIE)・欧文語根トークン（例: "*sta- (立つ)", "印欧祖語: *genh₁-"）を最優先抽出
    const starMatch = raw.match(/\*([a-zA-Z0-9_äöüßÄÖÜāēīōūăĕĭŏŭáéíóúàèìòùâêîôûəǭḗ₁₂₃₄ḱǵʷʰ-]+)/);
    if (starMatch) {
      let root = '*' + starMatch[1].toLowerCase().replace(/h[1-3₁-₃]/g, '').replace(/-$/, '');
      if (root.length >= 6 && /en$/.test(root)) root = root.slice(0, -2);
      return foldAscii(root);
    }

    // 3. コロン以降の抽出 (例: "印欧祖語: sta-", "字源: 政")
    let k = raw;
    const ci = k.search(/[:：]/);
    if (ci !== -1 && ROOT_PREFIXES.includes(k.slice(0, ci).trim().toLowerCase())) {
      k = k.slice(ci + 1).trim();
    }

    // 括弧内の日本語解説を除去
    const kNoParen = k.replace(/\s*[\(（].*?[\)）]\s*/g, ' ').trim();

    // 4. 欧文を含まない単一漢字・字源指定（例: "政", "字源:政"）の場合のみ漢字ルートとして採用
    if (!/[a-zA-Z]/.test(kNoParen)) {
      const cjkMatch = kNoParen.match(/[\u4E00-\u9FFF\u3400-\u4DBF\u2E80-\u2EFF\uF900-\uFAFF]/);
      if (cjkMatch) {
        return '*' + canonicalizeCjkChar(cjkMatch[0]);
      }
    }

    k = (kNoParen.toLowerCase().split(/[\s\/,、]+/)[0]) || '';
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
    if (!k || !textFold) return false;
    if (/[\u4E00-\u9FFF\u3400-\u4DBF\u2E80-\u2EFF]/.test(k)) {
      const canon = canonicalizeCjkChar(k[0]);
      for (let i = 0; i < textFold.length; i++) {
        if (canonicalizeCjkChar(textFold[i]) === canon) return true;
      }
      return textFold.includes(k);
    }
    if (k.length < 2) return false;
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
    const isCjk = /[\u4E00-\u9FFF\u3400-\u4DBF\u2E80-\u2EFF]/.test(rawRoot);
    if (isCjk) {
      // CJK字源ルートは見出し語・文法欄（漢字表記）・語源解説のいずれかに含まれれば有効
      const blob = `${item.word || ''} ${item.grammar_forms || ''} ${item.etymology || ''} ${item.core || ''}`;
      return matchRootInText(cleanKey, blob);
    }
    if (rawRoot.length < 2) return false;

    // 1. 語根が見出し語そのものと完全一致する場合は実在PIE語根マスター登録がない限り語根ではない
    const wordFold = foldAscii(item.word);
    if (rawRoot === wordFold && !isKnownPieRoot(cleanKey)) return false;

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

  // 補充法（不規則動詞・名詞）マッピング (10言語対応)
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
    wissen: ['weiss', 'weisst', 'wusste', 'gewusst'],
    ser: ['soy', 'eres', 'es', 'somos', 'sois', 'son', 'era', 'fui', 'fue', 'fueron', 'sea', 'sido', 'sou', 'sao', 'foi', 'fomos', 'foram', 'seja'],
    estar: ['estoy', 'estas', 'esta', 'estamos', 'estan', 'estuve', 'estuvo', 'estado', 'estou', 'estao', 'estive', 'esteve'],
    ir: ['voy', 'vas', 'va', 'vamos', 'van', 'iba', 'ido', 'vaya', 'vou', 'vai', 'vao'],
    tener: ['tengo', 'tienes', 'tiene', 'tenemos', 'tienen', 'tuve', 'tuvo', 'tenido', 'tendre'],
    hacer: ['hago', 'haces', 'hace', 'hacemos', 'hacen', 'hice', 'hizo', 'hecho', 'hare'],
    essere: ['sono', 'sei', 'siamo', 'siete', 'ero', 'era', 'erano', 'fui', 'fu', 'furono', 'stato', 'stata', 'stati', 'sia'],
    avere: ['ho', 'hai', 'ha', 'abbiamo', 'hanno', 'avevo', 'aveva', 'ebbi', 'ebbe', 'avuto', 'abbi'],
    andare: ['vado', 'vai', 'va', 'andiamo', 'vanno', 'andato', 'andro', 'vada'],
    zijn: ['ben', 'bent', 'is', 'waren', 'was', 'geweest', 'zij'],
    hebben: ['heb', 'hebt', 'heeft', 'hadden', 'had', 'gehad'],
    gaan: ['ga', 'gaat', 'ging', 'gingen', 'gegaan'],
    staan: ['sta', 'staat', 'stond', 'stonden', 'gestaan']
  };

  const DE_SEP_PREFIXES = [
    'ab', 'an', 'auf', 'aus', 'bei', 'ein', 'fest', 'her', 'hin', 'los', 'mit',
    'nach', 'statt', 'teil', 'um', 'vor', 'weg', 'weiter', 'zu', 'zurück', 'zusammen',
    'aan', 'uit', 'voor', 'over', 'onder', 'mee', 'tegen', 'terug', 'samen'
  ];

  const POS_BY_LANG = {
    en: /^(N\[(?:C|U|C\/U|pl)\]|N(?:oun)?|V\[(?:T|I|T\/I)\]|V(?:erb)?|Adj|Adv|Prep|Conj|Pron|Idiom|Phrasal V|All)$/i,
    fr: /^(N\[(?:m|f|pl)\]|n\.\s*[mf]|V\[(?:T|I|T\/I|refl)\]|v\.\s*(?:tr\.|intr\.|pr\.)(?:\s*\/\s*v\.\s*(?:tr\.|intr\.|pr\.))?|Adj\.?|Adv\.?|Prep|Conj|Pron|Idiom|All)$/i,
    de: /^(N\[(?:m|f|n|pl)\]|Subst\.\s*[mfn]\.|V\[(?:T|I|T\/I|refl)\]|V(?:t|i|pr)(?:\s*\/\s*V(?:t|i|pr))*|Adj\.?|Adv\.?|Prep|Conj|Pron|Idiom|All)$/i,
    es: /^(N\[(?:m|f|pl)\]|n\.\s*[mf]|V\[(?:T|I|T\/I|refl)\]|Adj\.?|Adv\.?|Prep|Conj|Pron|Idiom|All)$/i,
    it: /^(N\[(?:m|f|pl)\]|n\.\s*[mf]|V\[(?:T|I|T\/I|refl)\]|Adj\.?|Adv\.?|Prep|Conj|Pron|Idiom|All)$/i,
    pt: /^(N\[(?:m|f|pl)\]|n\.\s*[mf]|V\[(?:T|I|T\/I|refl)\]|Adj\.?|Adv\.?|Prep|Conj|Pron|Idiom|All)$/i,
    nl: /^(N\[(?:m|f|n|pl|C|U)\]|Subst\.\s*[mfn]\.|V\[(?:T|I|T\/I|refl)\]|Adj\.?|Adv\.?|Prep|Conj|Pron|Idiom|All)$/i,
    zh: /^(N\[(?:C|U|C\/U|pl)\]|V\[(?:T|I|T\/I)\]|名詞|動詞|形容詞|副詞|成語|熟語|Adj|Adv|Prep|Conj|Pron|Idiom|All)$/i,
    ko: /^(N\[(?:C|U|C\/U|pl)\]|V\[(?:T|I|T\/I)\]|名詞|動詞|形容詞|副詞|熟語|Adj|Adv|Prep|Conj|Pron|Idiom|All)$/i,
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

    // 厳格な接尾辞・語幹変化チェック（誤一致を防ぐため最小語幹一致率を高めに維持）
    if (wordFold.endsWith('y') && wordFold.length >= 4) {
      const yStem = wordFold.slice(0, -1);
      if (usedFold === `${yStem}ies` || usedFold === `${yStem}ied` || usedFold === `${yStem}ier` || usedFold === `${yStem}iest`) return true;
    }
    if (wordFold[0] === usedFold[0]) {
      const consW = wordFold.replace(/[aeiouy]/g, ''), consU = usedFold.replace(/[aeiouy]/g, '');
      const cLcs = lcsLen(consW, consU);
      const fullLcs = lcsLen(wordFold, usedFold);
      const minLen = Math.min(wordFold.length, usedFold.length);
      if (minLen >= 4 && cLcs >= Math.min(3, consW.length) && fullLcs >= Math.ceil(minLen * 0.72)) return true;
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

    if (w.endsWith('y') && w.length >= 4) {
      const yStem = w.slice(0, -1);
      if (senWords.some(sw => sw === `${yStem}ies` || sw === `${yStem}ied` || sw === `${yStem}ier` || sw === `${yStem}iest`)) return true;
    }

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
   * 例文の文法・形式・対訳整合性チェック
   */
  function validateExampleQuality(it) {
    const flags = [];
    const ex = it?.example;
    if (!ex || !ex.foreign) return flags;

    const rawFor = String(ex.foreign).trim();
    const rawJa = String(ex.ja || ex.trans || '').trim();
    const lang = it.lang || 'en';
    const tgtLang = it.tgtLang || 'ja';

    if (/<[a-z][\s\S]*>/i.test(rawFor)) {
      flags.push('例文にHTMLタグ混入');
    }

    const isCjkSen = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u.test(rawFor);
    if (!isCjkSen) {
      const tokens = rawFor.split(/\s+/).filter(Boolean);
      if (tokens.length < 3) {
        flags.push('例文が短すぎる');
      }
      if (!/^["'“‘(\[]*[\p{Lu}0-9]/u.test(rawFor) || !/[.!?]["'”’)\]]*$/u.test(rawFor)) {
        flags.push('例文の文頭大文字・文末句読点不備');
      }
      if (lang === 'en') {
        // 英語例文の明白な文法エラー（冠詞 a/an 不一致、SVA、助動詞後活用、重複語）を検査
        const cleanedArtFor = rawFor
          .replace(/\b(?:Plan|Grade|Vitamin|Type|Part|Option)\s+A\b/g, '')
          .replace(/\ba\s+(?:one|once|eu[a-z]*|uni[a-z]*|use[a-z]*|user|usual|uk[a-z]*|u[bcdfghjklmnpqrstvwxyz][a-z]*)/gi, '');
        const hasArtErr = /\b(a)\s+(?:hour|honest|honor|honour|heir|[aeio][a-z]*|umb[a-z]*|unc[a-z]*|und[a-z]*|unh[a-z]*|unk[a-z]*|unl[a-z]*|unm[a-z]*|unn[a-z]*|unp[a-z]*|unr[a-z]*|uns[a-z]*|unt[a-z]*|unw[a-z]*|up[a-z]*|urg[a-z]*|ush[a-z]*|utt[a-z]*)\b/i.test(cleanedArtFor);
        const hasAnErr = /\b(an)\s+(?:[bcdfgjklmnpqrstvwxyz][a-z]+|uni[a-z]*|use[a-z]*|user|usual|eu[a-z]*|one|once)\b/i.test(rawFor.replace(/\b(an)\s+(?:hour|honest|honor|honour|heir|herb|[A-Z]{2,})/gi, ''));
        const hasSvaErr = /\bI\s+(?:is|has|does)\b|\b(?:You|We|They)\s+(?:is|was|has|does)\b/i.test(rawFor);
        const hasVerbErr = /\b(?:can|could|will|would|shall|should|may|might|must)\s+(?:to\s+[a-z]+|goes|went|does|did|has|had)\b|\b(?:do|does|did)\s+(?:not\s+|n't\s+)?(?:went|saw|ate|wrote|spoke|took|gave|came|had|has)\b/i.test(rawFor);
        const hasDupErr = /\b([a-z]{2,})\s+\1\b/i.test(rawFor.replace(/\b(had|that)\s+\1\b/gi, ''));
        if (hasArtErr || hasAnErr || hasSvaErr || hasVerbErr || hasDupErr) {
          flags.push('例文の文法不備');
        }
      }
    } else if (!/[.!?。！？]["'”’」』）\]]*$/u.test(rawFor)) {
      flags.push('例文の文末句読点不備');
    }

    if (ex.used_form) {
      const uf = foldAscii(ex.used_form).trim();
      const senFold = foldAscii(rawFor);
      if (uf && !senFold.includes(uf)) {
        flags.push('used_formが例文中に無い');
      }
    }

    if (!rawJa) {
      flags.push('例文の対訳欠落');
    } else if (lang !== tgtLang && foldAscii(rawJa.replace(/<[^>]+>/g, '')) === foldAscii(rawFor)) {
      flags.push('例文が未翻訳');
    }

    return flags;
  }

  /**
   * エントリの学術的整合性バリデーション
   */
  function validateEntry(it) {
    const f = [], w = foldAscii(it.word), posReg = POS_BY_LANG[it.lang] || POS_BY_LANG.en;
    if (!Array.isArray(it.meanings) || it.meanings.length === 0) {
      f.push('語義欠落');
    } else {
      if (it.meanings.some(m => !posReg.test(m.pos))) f.push('品詞が言語と不整合');
      const m0 = String(it.meanings[0]?.text || '').trim();
      if (!m0 || foldAscii(m0) === w || /(?:の中心的語義|の主要な意味|意味不明|架空|存在しない|該当なし|not a real word|does not exist|no such word|placeholder)/i.test(m0)) {
        f.push('語義が仮置きまたは未検証');
      }
    }
    if (it.example?.foreign) {
      if (!checkWordInSentence(it)) f.push('例文に見出し語なし');
      if ((it.tgtLang || 'ja') === 'ja' && it.lang !== 'ja' && !/<b>.+?<\/b>/i.test(it.example.ja || '')) {
        f.push('和訳に<b>なし');
      }
      validateExampleQuality(it).forEach(ef => { if (!f.includes(ef)) f.push(ef); });
    } else {
      f.push('例文欠落');
    }
    if (it.phonetic && (!IPA_OK.test(it.phonetic) || WIKT_BAD_BRACKET.test(it.phonetic))) f.push('IPA異常');
    if (it.derivatives && it.derivatives.some(d => foldAscii(d.word) === w || String(d.word || '').trim().split(/\s+/).length > 3)) f.push('派生語異常');
    if (it.etymologyTags && it.etymologyTags.length && it.etymology) {
      const ety = foldAscii(it.etymology);
      if (!it.etymologyTags.some(t => matchRootInText(t, ety))) f.push('語根タグが語源文に無い');
    }
    if (it.etymologyConfidence === 'unknown' && !it.wiktGrounded && (!it.etymologyTags || it.etymologyTags.length === 0)) {
      f.push('語源・実在性が未検証');
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
    const normItemWord = String(item.word || '').trim().toLowerCase();

    // 既にリスト内に見出し語自身が含まれている場合は isCurrent を確実にマーク
    let foundCurrent = false;
    ['en', 'fr', 'de', 'ja'].forEach(l => {
      (langs[l] || []).forEach(c => {
        if (l === iL && String(c.w || '').trim().toLowerCase() === normItemWord) {
          c.isCurrent = true;
          foundCurrent = true;
        }
      });
    });

    const effectiveLang = (iL === 'ja' && /^[a-zA-Z\s-]+$/.test(normItemWord)) ? 'en' : iL;
    if (!foundCurrent && langs[effectiveLang]) {
      langs[effectiveLang].unshift({
        w: item.word,
        m: item.meanings?.[0]?.text || item.core || '',
        inLibrary: true,
        isCurrent: true
      });
    }

    // 自分自身以外の他言語同根語（見出し語言語 iL 以外の言語）が少なくとも1語以上存在する場合のみ表示
    let otherLangCognatesCount = 0;
    ['en', 'fr', 'de', 'ja'].forEach(l => {
      if (l !== effectiveLang) {
        (langs[l] || []).forEach(c => {
          if (!c.isCurrent) otherLangCognatesCount++;
        });
      }
    });
    if (otherLangCognatesCount === 0) return null;

    return {
      root: targetRoot,
      meaning: matchedKnowledge?.meaning || '',
      langs
    };
  }

  // --- 語根・接頭辞ベースの類義語・ニュアンス対比マトリクス (Nuance Comparator) ---
  const NUANCE_KNOWLEDGE = {
    prescribe: {
      pair: 'proscribe',
      root: '*skreyb- (書く)',
      w1: { w: 'prescribe', prefix: 'pre- (あらかじめ前に)', meaning: 'あらかじめルールとして書く → 処方する、規定・指示する' },
      w2: { w: 'proscribe', prefix: 'pro- (公の場・前に)', meaning: '公の掲示板に名前を書き出して晒す → 禁止する、追放する' },
      keyDifference: 'pre- は事前の指示・処方、pro- は公の告発・禁止。',
      i18n: {
        en: {
          w1Meaning: 'To write rules in advance -> prescribe, order, authorize',
          w2Meaning: 'To post a name publicly on a placard -> outlaw, banish, condemn',
          keyDifference: 'pre- signifies prior direction/prescription, while pro- signifies public banishment/prohibition.'
        },
        ko: {
          w1Meaning: '미리 규칙으로 적어두다 -> 처방하다, 규정하다',
          w2Meaning: '공개 게시판에 이름을 적어 공표하다 -> 금지하다, 배척하다',
          keyDifference: 'pre-는 사전 지시 및 처방, pro-는 공식적인 금지 및 배척.'
        },
        zh: {
          w1Meaning: '预先写下规程 -> 开处方、规定、指示',
          w2Meaning: '公开发布姓名示众 -> 剥夺权利、正式废除、严厉禁止',
          keyDifference: 'pre- 为事先指导规程，pro- 为公开宣告排斥禁止。'
        },
        de: {
          w1Meaning: 'Im Voraus als Regel festschreiben -> vorschreiben, verordnen',
          w2Meaning: 'Öffentlich anprangern und verbannen -> ächten, verbieten',
          keyDifference: 'pre- bedeutet vorherige Anweisung, pro- öffentliche Ächtung.'
        },
        fr: {
          w1Meaning: 'Écrire des règles à l\'avance -> prescrire, ordonner',
          w2Meaning: 'Afficher publiquement pour bannir -> proscrire, interdire',
          keyDifference: 'pre- indique une prescription préalable, pro- une interdiction publique.'
        },
        es: {
          w1Meaning: 'Escribir previamente como regla -> prescribir, recetar',
          w2Meaning: 'Publicar en edicto para condenar -> proscribir, prohibir',
          keyDifference: 'pre- indica instrucción previa, pro- proscripción pública.'
        },
        it: {
          w1Meaning: 'Scrivere in anticipo come regola -> prescrivere, ordinare',
          w2Meaning: 'Affiggere pubblicamente per bandire -> proscrivere, vietare',
          keyDifference: 'pre- denota indicazione preventiva, pro- bando pubblico.'
        },
        pt: {
          w1Meaning: 'Escrever previamente como norma -> prescrever, receitar',
          w2Meaning: 'Afixar em edital para banir -> proscrever, proibir',
          keyDifference: 'pre- denota orientação prévia, pro- proscrição pública.'
        },
        nl: {
          w1Meaning: 'Vooraf als regel vastleggen -> voorschrijven, bevelen',
          w2Meaning: 'Openbaar aanplakken om te verbannen -> vogelvrij verklaren, verbieden',
          keyDifference: 'pre- duidt op voorafgaande instructie, pro- op openbare verbanning.'
        }
      }
    },
    proscribe: {
      pair: 'prescribe',
      root: '*skreyb- (書く)',
      w1: { w: 'proscribe', prefix: 'pro- (公の場・前に)', meaning: '公の掲示板に名前を書き出して晒す → 禁止する、追放する' },
      w2: { w: 'prescribe', prefix: 'pre- (あらかじめ前に)', meaning: 'あらかじめルールとして書く → 処方する、規定・指示する' },
      keyDifference: 'pro- は公の告発・禁止、pre- は事前の指示・処方。',
      i18n: {
        en: {
          w1Meaning: 'To post a name publicly on a placard -> outlaw, banish, condemn',
          w2Meaning: 'To write rules in advance -> prescribe, order, authorize',
          keyDifference: 'pro- signifies public banishment/prohibition, while pre- signifies prior direction/prescription.'
        },
        ko: {
          w1Meaning: '공개 게시판에 이름을 적어 공표하다 -> 금지하다, 배척하다',
          w2Meaning: '미리 규칙으로 적어두다 -> 처방하다, 규정하다',
          keyDifference: 'pro-는 공식적인 금지 및 배척, pre-는 사전 지시 및 처방.'
        },
        zh: {
          w1Meaning: '公开发布姓名示众 -> 剥夺权利、正式废除、严厉禁止',
          w2Meaning: '预先写下规程 -> 开处方、规定、指示',
          keyDifference: 'pro- 为公开宣告排斥禁止，pre- 为事先指导规程。'
        },
        de: {
          w1Meaning: 'Öffentlich anprangern und verbannen -> ächten, verbieten',
          w2Meaning: 'Im Voraus als Regel festschreiben -> vorschreiben, verordnen',
          keyDifference: 'pro- bedeutet öffentliche Ächtung, pre- vorherige Anweisung.'
        },
        fr: {
          w1Meaning: 'Afficher publiquement pour bannir -> proscrire, interdire',
          w2Meaning: 'Écrire des règles à l\'avance -> prescrire, ordonner',
          keyDifference: 'pro- indique une interdiction publique, pre- une prescription préalable.'
        },
        es: {
          w1Meaning: 'Publicar en edicto para condenar -> proscribir, prohibir',
          w2Meaning: 'Escribir previamente como regla -> prescribir, recetar',
          keyDifference: 'pro- indica proscripción pública, pre- instrucción previa.'
        },
        it: {
          w1Meaning: 'Affiggere pubblicamente per bandire -> proscrivere, vietare',
          w2Meaning: 'Scrivere in anticipo come regola -> prescrivere, ordinare',
          keyDifference: 'pro- denota bando pubblico, pre- indicazione preventiva.'
        },
        pt: {
          w1Meaning: 'Afixar em edital para banir -> proscrever, proibir',
          w2Meaning: 'Escrever previamente como norma -> prescrever, receitar',
          keyDifference: 'pro- denota proscrição pública, pre- orientação prévia.'
        },
        nl: {
          w1Meaning: 'Openbaar aanplakken om te verbannen -> vogelvrij verklaren, verbieden',
          w2Meaning: 'Vooraf als regel vastleggen -> voorschrijven, bevelen',
          keyDifference: 'pro- duidt op openbare verbanning, pre- op voorafgaande instructie.'
        }
      }
    },
    sustain: {
      pair: 'maintain',
      root: '*ten- (保つ・引っ張る)',
      w1: { w: 'sustain', prefix: 'sub- (下から)', meaning: '重荷や苦難を下から支え続けて持ちこたえる' },
      w2: { w: 'maintain', prefix: 'manu- (手で)', meaning: '手を使って良好な状態を維持・整備・主張する' },
      keyDifference: 'sustain は下支え・生命維持、maintain は手入れ・現状維持。',
      i18n: {
        en: {
          w1Meaning: 'To hold up from underneath -> bear weight, endure, keep alive',
          w2Meaning: 'To hold by the hand -> preserve in working order, assert or keep up',
          keyDifference: 'sustain emphasizes enduring pressure or supporting life, while maintain focuses on active upkeep or preservation.'
        },
        ko: {
          w1Meaning: '아래에서 무게를 지탱하며 견디다 -> 지탱하다, 생명을 유지하다',
          w2Meaning: '손으로 만져 양호한 상태를 가꾸다 -> 보존하다, 정비하다, 유지하다',
          keyDifference: 'sustain은 하중 지탱 및 생명 유지, maintain은 상태 보존 및 손질 유지.'
        },
        zh: {
          w1Meaning: '从下方托起承受重负 -> 支撑、维持生命、经受住',
          w2Meaning: '亲自动手使之保持良好状态 -> 保持、检修、坚称',
          keyDifference: 'sustain 强调由下承受重压以维生，maintain 侧重日常维护以保有现状。'
        }
      }
    },
    maintain: {
      pair: 'sustain',
      root: '*ten- (保つ・引っ張る)',
      w1: { w: 'maintain', prefix: 'manu- (手で)', meaning: '手を使って良好な状態を維持・整備・主張する' },
      w2: { w: 'sustain', prefix: 'sub- (下から)', meaning: '重荷や苦難を下から支え続けて持ちこたえる' },
      keyDifference: 'maintain は手入れ・現状維持、sustain は下支え・生命維持。',
      i18n: {
        en: {
          w1Meaning: 'To hold by the hand -> preserve in working order, assert or keep up',
          w2Meaning: 'To hold up from underneath -> bear weight, endure, keep alive',
          keyDifference: 'maintain focuses on active upkeep or preservation, while sustain emphasizes enduring pressure or supporting life.'
        },
        ko: {
          w1Meaning: '손으로 만져 양호한 상태를 가꾸다 -> 보존하다, 정비하다, 유지하다',
          w2Meaning: '아래에서 무게를 지탱하며 견디다 -> 지탱하다, 생명을 유지하다',
          keyDifference: 'maintain은 상태 보존 및 손질 유지, sustain은 하중 지탱 및 생명 유지.'
        },
        zh: {
          w1Meaning: '亲自动手使之保持良好状态 -> 保持、检修、坚称',
          w2Meaning: '从下方托起承受重负 -> 支撑、维持生命、经受住',
          keyDifference: 'maintain 侧重日常维护以保有现状，sustain 强调由下承受重压以维生。'
        }
      }
    },
    ephemeral: {
      pair: 'transitory',
      root: '*h₂er- / *ey-',
      w1: { w: 'ephemeral', prefix: 'epi- (〜の上に) + hemera (1日)', meaning: 'わずか1日で消え去るような儚さ・短命さ' },
      w2: { w: 'transitory', prefix: 'trans- (越えて) + ire (行く)', meaning: '留まることなく通り過ぎていく一時的な性質' },
      keyDifference: 'ephemeral は一日限りの儚さ、transitory は推移・過渡期の一時性。',
      i18n: {
        en: {
          w1Meaning: 'Living for only a single day -> fleeting, fragile, short-lived',
          w2Meaning: 'Passing across without lingering -> temporary, transitional, passing',
          keyDifference: 'ephemeral conveys fragile short-lived beauty, while transitory denotes a passing intermediate stage.'
        },
        ko: {
          w1Meaning: '단 하루 만에 사라질 듯한 덧없음 -> 덧없는, 단명하는',
          w2Meaning: '머무르지 않고 지나쳐 가는 성질 -> 일시적인, 과도기적인',
          keyDifference: 'ephemeral은 하루살이 같은 덧없음, transitory는 과도기적 추이의 일시성.'
        },
        zh: {
          w1Meaning: '仅存一日即逝的朝生暮死 -> 短暂脆弱、昙花一现',
          w2Meaning: '穿行而过不停留的过渡性质 -> 暂时的、过度的、无常的',
          keyDifference: 'ephemeral 强调昙花一现的脆弱短命，transitory 强调路过不居的阶段过客。'
        }
      }
    },
    transitory: {
      pair: 'ephemeral',
      root: '*ey- / *h₂er-',
      w1: { w: 'transitory', prefix: 'trans- (越えて) + ire (行く)', meaning: '留まることなく通り過ぎていく一時的な性質' },
      w2: { w: 'ephemeral', prefix: 'epi- (〜の上に) + hemera (1日)', meaning: 'わずか1日で消え去るような儚さ・短命さ' },
      keyDifference: 'transitory は推移・過渡期の一時性、ephemeral は一日限りの儚さ。',
      i18n: {
        en: {
          w1Meaning: 'Passing across without lingering -> temporary, transitional, passing',
          w2Meaning: 'Living for only a single day -> fleeting, fragile, short-lived',
          keyDifference: 'transitory denotes a passing intermediate stage, while ephemeral conveys fragile short-lived beauty.'
        },
        ko: {
          w1Meaning: '머무르지 않고 지나쳐 가는 성질 -> 일시적인, 과도기적인',
          w2Meaning: '단 하루 만에 사라질 듯한 덧없음 -> 덧없는, 단명하는',
          keyDifference: 'transitory는 과도기적 추이의 일시성, ephemeral은 하루살이 같은 덧없음.'
        },
        zh: {
          w1Meaning: '穿行而过不停留的过渡性质 -> 暂时的、过度的、无常的',
          w2Meaning: '仅存一日即逝的朝生暮死 -> 短暂脆弱、昙花一现',
          keyDifference: 'transitory 强调路过不居的阶段过客，ephemeral 强调昙花一现的脆弱短命。'
        }
      }
    },
    comprehend: {
      pair: 'apprehend',
      root: '*gʰed- (掴む)',
      w1: { w: 'comprehend', prefix: 'com- (完全に) + prehendere', meaning: '頭の中で全体を完全に掴み取る → 包括的に理解・把握する' },
      w2: { w: 'apprehend', prefix: 'ad- (〜に向けて) + prehendere', meaning: '身柄を掴み取る、または不吉な事態を予感する → 逮捕する、懸念する' },
      keyDifference: 'comprehend は知的な完全把握・理解、apprehend は物理的な身柄拘束や不安の予知。',
      i18n: {
        en: {
          w1Meaning: 'To grasp mentally from all sides -> fully understand, encompass',
          w2Meaning: 'To seize physically or perceive with anxiety -> arrest, anticipate with fear',
          keyDifference: 'comprehend relates to thorough intellectual mastery, while apprehend denotes physical custody or anxious premonition.'
        },
        ko: {
          w1Meaning: '머릿속으로 온전히 붙잡다 -> 포괄적으로 이해하다, 파악하다',
          w2Meaning: '신병을 붙잡거나 불안을 예감하다 -> 체포하다, 염려하다',
          keyDifference: 'comprehend는 지적 완전 이해, apprehend는 물리적 구금 및 불안한 예감.'
        },
        zh: {
          w1Meaning: '在头脑中全面掌握抓取 -> 彻底理解、领会',
          w2Meaning: '抓捕归案或心存顾虑地察觉 -> 逮捕、忧虑预感',
          keyDifference: 'comprehend 侧重智力上的彻底通晓，apprehend 侧重人身抓捕或隐忧预感。'
        }
      }
    },
    apprehend: {
      pair: 'comprehend',
      root: '*gʰed- (掴む)',
      w1: { w: 'apprehend', prefix: 'ad- (〜に向けて) + prehendere', meaning: '身柄を掴み取る、または不吉な事態を予感する → 逮捕する、懸念する' },
      w2: { w: 'comprehend', prefix: 'com- (完全に) + prehendere', meaning: '頭の中で全体を完全に掴み取る → 包括的に理解・把握する' },
      keyDifference: 'apprehend は物理的な身柄拘束や不安の予知、comprehend は知的な完全把握・理解。',
      i18n: {
        en: {
          w1Meaning: 'To seize physically or perceive with anxiety -> arrest, anticipate with fear',
          w2Meaning: 'To grasp mentally from all sides -> fully understand, encompass',
          keyDifference: 'apprehend denotes physical custody or anxious premonition, while comprehend relates to thorough intellectual mastery.'
        },
        ko: {
          w1Meaning: '신병을 붙잡거나 불안을 예감하다 -> 체포하다, 염려하다',
          w2Meaning: '머릿속으로 온전히 붙잡다 -> 포괄적으로 이해하다, 파악하다',
          keyDifference: 'apprehend는 물리적 구금 및 불안한 예감, comprehend는 지적 완전 이해.'
        },
        zh: {
          w1Meaning: '抓捕归案或心存顾虑地察觉 -> 逮捕、忧虑预感',
          w2Meaning: '在头脑中全面掌握抓取 -> 彻底理解、领会',
          keyDifference: 'apprehend 侧重人身抓捕或隐忧预感，comprehend 侧重智力上的彻底通晓。'
        }
      }
    }
  };

  function buildNuanceComparison(word) {
    if (!word) return null;
    const clean = String(word).trim().toLowerCase();
    if (NUANCE_KNOWLEDGE[clean]) return NUANCE_KNOWLEDGE[clean];
    // 語幹・活用形の正規化照合 (例: prescribed -> prescribe, maintaining -> maintain)
    const base = clean.replace(/(?:ing|ed|es|s|d)$/, '');
    if (NUANCE_KNOWLEDGE[base]) return NUANCE_KNOWLEDGE[base];
    if (NUANCE_KNOWLEDGE[base + 'e']) return NUANCE_KNOWLEDGE[base + 'e'];
    return null;
  }

  function renderNuanceComparisonHtml(comp) {
    if (!comp || !comp.w1 || !comp.w2) return '';
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
    const curLocale = global.VocabI18n?.getLocale?.() || 'ja';
    const loc = comp.i18n?.[curLocale] || (curLocale !== 'ja' ? comp.i18n?.en : null);
    const w1Meaning = loc?.w1Meaning || comp.w1.meaning;
    const w2Meaning = loc?.w2Meaning || comp.w2.meaning;
    const keyDiff = loc?.keyDifference || comp.keyDifference;

    const title = (curLocale === 'en' ? 'Root-Based Nuance Comparison' : (curLocale === 'de' ? 'Wurzelbasierter Nuancenvergleich' : (curLocale === 'fr' ? 'Comparaison des nuances étymologiques' : (curLocale === 'es' ? 'Comparación de matices etimológicos' : (curLocale === 'it' ? 'Confronto delle sfumature etimologiche' : (curLocale === 'pt' ? 'Comparação de nuances etimológicas' : (curLocale === 'nl' ? 'Etymologische nuancevergelijking' : (curLocale === 'ko' ? '어근 기반 뉘앙스 비교' : (curLocale === 'zh' ? '基于词根的近义辨析' : '語根・接頭辞 ニュアンス対比')))))))));
    const keyDiffLbl = (curLocale === 'en' ? 'Key Distinction' : (curLocale === 'de' ? 'Hauptunterschied' : (curLocale === 'fr' ? 'Distinction clé' : (curLocale === 'es' ? 'Distinción clave' : (curLocale === 'it' ? 'Distinzione chiave' : (curLocale === 'pt' ? 'Distinção chave' : (curLocale === 'nl' ? 'Belangrijkste verschil' : (curLocale === 'ko' ? '핵심 차이' : (curLocale === 'zh' ? '要点' : '要点')))))))));

    return `
      <div class="nuance-comparator-box" style="margin-top:10px;padding:8px 12px;background:var(--bg-hov);border:1px solid var(--b);border-radius:6px;font-size:12px;">
        <div style="font-weight:700;color:var(--ac);margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;">
          <span>${title}</span>
          <span style="font-size:11px;color:var(--w-root);background:rgba(217,119,6,0.12);padding:1px 6px;border-radius:3px;">${esc(comp.root)}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:6px;">
          <div style="padding:6px;background:var(--bg-card);border-radius:4px;border:1px solid var(--b);">
            <strong>${esc(comp.w1.w)}</strong> <small style="color:var(--s);">(${esc(comp.w1.prefix)})</small>
            <div style="margin-top:2px;color:var(--t-m);font-size:11.5px;">${esc(w1Meaning)}</div>
          </div>
          <div style="padding:6px;background:var(--bg-card);border-radius:4px;border:1px solid var(--b);">
            <strong>${esc(comp.w2.w)}</strong> <small style="color:var(--s);">(${esc(comp.w2.prefix)})</small>
            <div style="margin-top:2px;color:var(--t-m);font-size:11.5px;">${esc(w2Meaning)}</div>
          </div>
        </div>
        <div style="color:var(--ok);font-size:11px;font-weight:600;">${keyDiffLbl}: ${esc(keyDiff)}</div>
      </div>
    `;
  }

  /**
   * 4言語クロス同根語マトリクスのHTMLをレンダリング
   */
  function renderCognateMatrixHtml(matrix) {
    if (!matrix || !matrix.root) return '';
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
    const curLocale = global.VocabI18n?.getLocale?.() || 'ja';
    const isJa = curLocale === 'ja';

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

    const ROOT_CONCEPT_LABELS = {
      ja: '語源的根幹概念',
      en: 'Core Etymological Concept',
      fr: 'Concept étymologique fondamental',
      de: 'Etymologischer Grundbegriff',
      es: 'Concepto etimológico fundamental',
      it: 'Concetto etimologico fondamentale',
      pt: 'Conceito etimológico fundamental',
      nl: 'Etymologisch basisconcept',
      ko: '어원적 근간 개념',
      zh: '词源根本概念'
    };
    const defaultRootMeaning = ROOT_CONCEPT_LABELS[curLocale] || ROOT_CONCEPT_LABELS.en;
    const rootMeaningDisplay = matrix.meaning && matrix.meaning !== '語源的根幹概念' ? matrix.meaning : defaultRootMeaning;

    const BADGE_LABELS = {
      ja: '4言語同根語マトリクス',
      en: '4-Language Cognate Matrix',
      fr: 'Matrice de cognats en 4 langues',
      de: '4-Sprachen-Kognatenmatrix',
      es: 'Matriz de cognados en 4 idiomas',
      it: 'Matrice di cognati in 4 lingue',
      pt: 'Matriz de cognatos em 4 idiomas',
      nl: '4-Talen Kognatenmatrix',
      zh: '4语言同源词矩阵',
      ko: '4개 언어 동원어 매트릭스'
    };
    const ROOT_PREFIXES_MAP = {
      ja: '語根: ',
      en: 'Root: ',
      fr: 'Racine : ',
      de: 'Wurzel: ',
      es: 'Raíz: ',
      it: 'Radice: ',
      pt: 'Raiz: ',
      nl: 'Wortel: ',
      zh: '词根: ',
      ko: '어근: '
    };
    const COL_EN_MAP = { ja: '英語 (EN)', ko: '영어 (EN)', zh: '英语 (EN)', fr: 'Anglais (EN)', de: 'Englisch (EN)', es: 'Inglés (EN)', it: 'Inglese (EN)', pt: 'Inglês (EN)', nl: 'Engels (EN)', en: 'English (EN)' };
    const COL_FR_MAP = { ja: 'フランス語 (FR)', ko: '프랑스어 (FR)', zh: '法语 (FR)', fr: 'Français (FR)', de: 'Französisch (FR)', es: 'Francés (FR)', it: 'Francese (FR)', pt: 'Francês (FR)', nl: 'Frans (FR)', en: 'French (FR)' };
    const COL_DE_MAP = { ja: 'ドイツ語 (DE)', ko: '독일어 (DE)', zh: '德语 (DE)', fr: 'Allemand (DE)', de: 'Deutsch (DE)', es: 'Alemán (DE)', it: 'Tedesco (DE)', pt: 'Alemão (DE)', nl: 'Duits (DE)', en: 'German (DE)' };
    const COL_JA_MAP = { ja: '日本語 / 訳語', ko: '일본어 (JA)', zh: '日语 (JA)', fr: 'Japonais (日本語 / JA)', de: 'Japanisch (日本語 / JA)', es: 'Japonés (日本語 / JA)', it: 'Giapponese (日本語 / JA)', pt: 'Japonês (日本語 / JA)', nl: 'Japans (日本語 / JA)', en: 'Japanese (日本語 / JA)' };

    const badgeLabel = BADGE_LABELS[curLocale] || BADGE_LABELS.en;
    const rootPrefix = ROOT_PREFIXES_MAP[curLocale] || ROOT_PREFIXES_MAP.en;
    const colEn = COL_EN_MAP[curLocale] || COL_EN_MAP.en;
    const colFr = COL_FR_MAP[curLocale] || COL_FR_MAP.en;
    const colDe = COL_DE_MAP[curLocale] || COL_DE_MAP.en;
    const colJa = COL_JA_MAP[curLocale] || COL_JA_MAP.en;

    return `
      <div class="cognate-matrix-box">
        <div class="cog-matrix-header">
          <span class="cog-matrix-badge">${badgeLabel}</span>
          <span class="cog-matrix-root">${rootPrefix}<strong>${esc(matrix.root)}</strong>（${esc(rootMeaningDisplay)}）</span>
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
    motion: {
      id: 'motion', label: '運動・身体動作 (Motion & Action)', color: '#38bdf8',
      i18n: { ja: '運動・身体動作', en: 'Motion & Action', fr: 'Mouvement et Action', de: 'Bewegung & Handlung', es: 'Movimiento y Acción', it: 'Moto e Azione', pt: 'Movimento e Ação', nl: 'Beweging & Actie', zh: '运动与身体动作', ko: '운동·신체 동작' }
    },
    cognition: {
      id: 'cognition', label: '思考・知覚・認識 (Mind & Perception)', color: '#818cf8',
      i18n: { ja: '思考・知覚・認識', en: 'Mind & Perception', fr: 'Esprit et Perception', de: 'Geist & Wahrnehmung', es: 'Mente y Percepción', it: 'Mente e Percezione', pt: 'Mente e Percepção', nl: 'Geest & Waarneming', zh: '思考与感知认识', ko: '사고·지각·인식' }
    },
    life: {
      id: 'life', label: '生成・生命・自然 (Life & Nature)', color: '#34d399',
      i18n: { ja: '生成・生命・自然', en: 'Life & Nature', fr: 'Vie et Nature', de: 'Leben & Natur', es: 'Vida y Naturaleza', it: 'Vita e Natura', pt: 'Vida e Natureza', nl: 'Leven & Natuur', zh: '生成与生命自然', ko: '생성·생명·자연' }
    },
    communication: {
      id: 'communication', label: '言語・伝達・宣言 (Voice & Discourse)', color: '#fbbf24',
      i18n: { ja: '言語・伝達・宣言', en: 'Voice & Discourse', fr: 'Voix et Discours', de: 'Sprache & Diskurs', es: 'Voz y Discurso', it: 'Voce e Discorso', pt: 'Voz e Discurso', nl: 'Stem & Vertoog', zh: '语言与传达宣言', ko: '언어·전달·선언' }
    },
    structure: {
      id: 'structure', label: '構造・物質・保持 (Structure & Force)', color: '#f472b6',
      i18n: { ja: '構造・物質・保持', en: 'Structure & Force', fr: 'Structure et Force', de: 'Struktur & Kraft', es: 'Estructura y Fuerza', it: 'Struttura e Forza', pt: 'Estrutura e Força', nl: 'Structuur & Kracht', zh: '结构与物质保持', ko: '구조·물질·유지' }
    },
    society: {
      id: 'society', label: '社会・秩序・価値 (Order & Exchange)', color: '#fb923c',
      i18n: { ja: '社会・秩序・価値', en: 'Order & Exchange', fr: 'Ordre et Échange', de: 'Ordnung & Austausch', es: 'Orden e Intercambio', it: 'Ordine e Scambio', pt: 'Ordem e Troca', nl: 'Orde & Uitwisseling', zh: '社会与秩序价值', ko: '사회·질서·가치' }
    }
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

  const STEM_CORE_LOC = {
    '一般語幹': { ko: '일반 어간', zh: '一般词干', en: 'general stem' },
    '基底形態素': { ko: '기저 형태소', zh: '基底语素', en: 'base morpheme' },
    '制度・設置': { ko: '제도·설치', zh: '制度·设立', en: 'institution / set' },
    '静止・持続': { ko: '정지·지속', zh: '静止·持续', en: 'stand / persist' },
    '実体・継続': { ko: '실체·지속', zh: '实体·持续', en: 'substance / persist' },
    '直立・支持': { ko: '직립·지지', zh: '直立·支持', en: 'stand / support' },
    '地位・状態': { ko: '지위·상태', zh: '地位·状态', en: 'status / state' },
    '強固・定着': { ko: '견고·정착', zh: '稳固·定型', en: 'firm / stable' },
    '発生・血統': { ko: '발생·혈통', zh: '发生·血统', en: 'origin / birth' },
    '自然・出生': { ko: '자연·출생', zh: '自然·出生', en: 'nature / birth' },
    '親族・親切': { ko: '친족·친절', zh: '亲族·亲切', en: 'kin / kind' },
    '運搬・提示': { ko: '운반·제시', zh: '运送·呈现', en: 'carry / offer' },
    '担う・出産': { ko: '부담·출산', zh: '承担·产生', en: 'bear / produce' },
    '認識・捕捉': { ko: '인식·포착', zh: '认识·捕捉', en: 'grasp / conceive' },
    '器量・把持': { ko: '역량·파지', zh: '容量·掌握', en: 'hold / seize' },
    '保全・所有': { ko: '보전·소유', zh: '保持·拥有', en: 'hold / retain' },
    '拡張・意図': { ko: '확장·의도', zh: '延展·意图', en: 'stretch / intend' },
    '設置・構え': { ko: '설치·배치', zh: '设置·配置', en: 'place / pose' },
    '成果・作用': { ko: '성과·작용', zh: '成果·作用', en: 'make / effect' },
    '選択・読み': { ko: '선택·읽기', zh: '选择·阅读', en: 'choose / read' },
    '言論・学問': { ko: '언론·학문', zh: '言论·学问', en: 'word / study' },
    '観察・見渡す': { ko: '관찰·조망', zh: '观察·展望', en: 'look / observe' },
    '港・輸送': { ko: '항구·수송', zh: '港口·运输', en: 'port / carry' },
    '引く・契約': { ko: '끌다·계약', zh: '牵引·契约', en: 'draw / contract' },
    '回転・向ける': { ko: '회전·전환', zh: '旋转·转向', en: 'turn / direct' },
    '構築・構造化': { ko: '구축·구조화', zh: '建构·结构化', en: 'build / structure' },
    '階層・拡散': { ko: '계층·확산', zh: '阶层·扩散', en: 'layer / spread' }
  };

  /**
   * 単語から形態素語幹（Level 4: Morphological Stem）を高精度に抽出
   * 接頭辞と接尾辞に挟まれた核となる基底語幹を同定
   */
  function extractMorphologicalStem(word, rootKey = '', item = null, targetLocale = 'ja') {
    const tL = targetLocale || 'ja';
    const makeRes = (stem, jaLabel, jaCore) => {
      if (tL === 'ja') return { stem, label: jaLabel, core: jaCore };
      const locCore = STEM_CORE_LOC[jaCore]?.[tL] || STEM_CORE_LOC[jaCore]?.en || jaCore;
      return { stem, label: locCore ? `${stem} (${locCore})` : stem, core: locCore };
    };
    const rawW = String(word || '').toLowerCase().trim();
    if (!rawW) return makeRes('', '一般語幹', '');
    const cleanR = normRootKey(rootKey);

    // 代表的PIE語根ごとの古典語幹マッピング
    if (cleanR.includes('sta')) {
      if (/stitut/.test(rawW)) return makeRes('-stitut-', '-stitut- (据える・制定)', '制度・設置');
      if (/sist/.test(rawW)) return makeRes('-sist-', '-sist- (留まる・維持)', '静止・持続');
      if (/stant|stanc/.test(rawW)) return makeRes('-stant-', '-stant- (存続・持続)', '実体・継続');
      if (/stand|stund|steh/.test(rawW)) return makeRes('stand-', 'stand- (立つ)', '直立・支持');
      if (/stat|status|state/.test(rawW)) return makeRes('stat-', 'stat- (状態・確立)', '地位・状態');
      if (/stab|stabl/.test(rawW)) return makeRes('stabl-', 'stabl- (安定・基礎)', '強固・定着');
    } else if (cleanR.includes('gen')) {
      if (/gener|gene/.test(rawW)) return makeRes('gene-', 'gene- (生成・種類)', '発生・血統');
      if (/nat|gna|nature/.test(rawW)) return makeRes('nat-', 'nat- (生まれ・本性)', '自然・出生');
      if (/kin|kind/.test(rawW)) return makeRes('kin-', 'kin- (親族・同種)', '親族・親切');
    } else if (cleanR.includes('bher')) {
      if (/fer/.test(rawW)) return makeRes('-fer-', '-fer- (運ぶ・差し出す)', '運搬・提示');
      if (/bear|birth|burden/.test(rawW)) return makeRes('bear-', 'bear- (耐える・生む)', '担う・出産');
    } else if (cleanR.includes('kap')) {
      if (/ceiv|cept/.test(rawW)) return makeRes('-cept-', '-cept- (受容・把握)', '認識・捕捉');
      if (/cap|capt/.test(rawW)) return makeRes('cap-', 'cap- (能力・捕獲)', '器量・把持');
    } else if (cleanR.includes('ten')) {
      if (/tain/.test(rawW)) return makeRes('-tain-', '-tain- (維持・保持)', '保全・所有');
      if (/tend|tens|tent/.test(rawW)) return makeRes('-tens-', '-tens- (伸長・緊張)', '拡張・意図');
    } else if (cleanR.includes('dhe')) {
      if (/pos|posit/.test(rawW)) return makeRes('-pose-', '-pose- (配置・提示)', '設置・構え');
      if (/fect|fic|fact/.test(rawW)) return makeRes('-fic-', '-fic- (形成・効果)', '成果・作用');
    } else if (cleanR.includes('leg')) {
      if (/lect/.test(rawW)) return makeRes('-lect-', '-lect- (収集・選抜)', '選択・読み');
      if (/log/.test(rawW)) return makeRes('-log-', '-log- (論理・対話)', '言論・学問');
    } else if (cleanR.includes('spec')) {
      if (/spect|spic/.test(rawW)) return makeRes('-spect-', '-spect- (注視・展望)', '観察・見渡す');
    } else if (cleanR.includes('port')) {
      if (/port/.test(rawW)) return makeRes('-port-', '-port- (運搬・出入口)', '港・輸送');
    } else if (cleanR.includes('tragh')) {
      if (/tract/.test(rawW)) return makeRes('-tract-', '-tract- (牽引・抽出)', '引く・契約');
    } else if (cleanR.includes('vert')) {
      if (/vert|vers/.test(rawW)) return makeRes('-vert-', '-vert- (転換・方向)', '回転・向ける');
    } else if (cleanR.includes('ster')) {
      if (/struct|stroy|stur/.test(rawW)) return makeRes('-struct-', '-struct- (構築・配置)', '構築・構造化');
      if (/street|spread|strat/.test(rawW)) return makeRes('strat-', 'strat- (層・拡張)', '階層・拡散');
    }

    // 一般的な形態素語幹抽出（主要接頭辞の除去）
    const prefixRegex = /^(?:con|com|col|cor|sub|suc|suf|sug|sup|sur|sus|in|im|il|ir|ex|ef|per|trans|tra|re|pro|pre|de|ad|ac|af|ag|al|an|ap|ar|as|at|ob|oc|of|op|dis|dif|di|inter|intra|mis|un|non|en|em)-?/;
    const withoutPrefix = rawW.replace(prefixRegex, '');
    const cleanStem = withoutPrefix.length >= 3 ? withoutPrefix.slice(0, Math.min(6, withoutPrefix.length)) : rawW;
    if (tL === 'ja') {
      return {
        stem: `-${cleanStem}-`,
        label: `-${cleanStem}- (基本語幹)`,
        core: '基底形態素'
      };
    }
    const stemTag = tL === 'ko' ? '기본 어간' : (tL === 'zh' ? '基础词干' : 'base stem');
    const coreLabel = STEM_CORE_LOC['基底形態素'][tL] || STEM_CORE_LOC['基底形態素'].en;
    return {
      stem: `-${cleanStem}-`,
      label: `-${cleanStem}- (${stemTag})`,
      core: coreLabel
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

  let _cachedEnStaticCandidates = null;
  function getEnStaticCandidates() {
    if (_cachedEnStaticCandidates) return _cachedEnStaticCandidates;
    const set = new Set(COMMON_TRICKY_WORDS);
    if (global.VocabEikenCatalog?.getAllWords) {
      global.VocabEikenCatalog.getAllWords().forEach(w => set.add(w.toLowerCase()));
    }
    _cachedEnStaticCandidates = set;
    return set;
  }

  /**
   * スペルミス・タイポのサジェスト判定 (もしかして判定)
   */
  function findTypoSuggestion(rawWord, lang = 'en', entries = []) {
    if (!rawWord || typeof rawWord !== 'string') return null;
    const clean = rawWord.trim().toLowerCase();
    if (clean.length < 4 || clean.includes(' ')) return null;

    // 候補セットの収集（英検カタログ語彙、現在の単語帳、頻出難関語）
    const isEn = !lang || lang === 'en';
    const staticCands = isEn ? getEnStaticCandidates() : null;
    if (staticCands && staticCands.has(clean)) return null;

    let bestMatch = null;
    let minDistance = 3;

    // 1. 静的語彙セットの走査（Setの展開・再生成をゼロ化）
    if (staticCands) {
      for (const cand of staticCands) {
        if (Math.abs(cand.length - clean.length) > 2) continue;
        if (cand[0] !== clean[0] && Math.abs(cand.length - clean.length) > 1) continue;

        const dist = calcLevenshtein(clean, cand);
        if (dist < minDistance) {
          minDistance = dist;
          bestMatch = cand;
          if (dist === 1) break;
        }
      }
    }

    // 2. 現在の単語帳エントリの走査
    if (Array.isArray(entries) && entries.length) {
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        if (!e || !e.word || e.isDeleted) continue;
        const cand = String(e.word).toLowerCase();
        if (cand === clean) return null;
        if (Math.abs(cand.length - clean.length) > 2) continue;
        if (cand[0] !== clean[0] && Math.abs(cand.length - clean.length) > 1) continue;

        const dist = calcLevenshtein(clean, cand);
        if (dist < minDistance) {
          minDistance = dist;
          bestMatch = cand;
          if (dist === 1) break;
        }
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

  const TIMELINE_ERA_I18N = {
    pie: {
      ja: '印欧祖語 (PIE)', en: 'Proto-Indo-European (PIE)', fr: 'Proto-indo-européen (PIE)',
      de: 'Urindogermanisch (PIE)', es: 'Protoindoeuropeo (PIE)', it: 'Proto-indoeuropeo (PIE)',
      pt: 'Proto-indo-europeu (PIE)', nl: 'Proto-Indo-Europees (PIE)', zh: '原始印欧语 (PIE)', ko: '원시 인도유럽어 (PIE)'
    },
    cjk_ancient: {
      ja: '古代字源 (甲骨・金文)', en: 'Ancient CJK (Oracle/Bronze)', fr: 'Caractère archaïque',
      de: 'Antike Schriftzeichen', es: 'Carácter arcaico', it: 'Carattere arcaico',
      pt: 'Caractere arcaico', nl: 'Archaïsch schrift', zh: '古代字源 (甲骨/金文)', ko: '고대 자원 (갑골/금문)'
    },
    classical: {
      ja: '古典期 (ラテン/ギリシャ/秦漢)', en: 'Classical (Latin/Greek/Han)', fr: 'Classique (Latin/Grec)',
      de: 'Klassik (Latein/Griechisch)', es: 'Clásico (Latín/Griego)', it: 'Classico (Latino/Greco)',
      pt: 'Clássico (Latim/Grego)', nl: 'Klassiek (Latijn/Grieks)', zh: '古典期 (拉丁/希腊/秦汉)', ko: '고전기 (라틴/그리스/진한)'
    },
    medieval: {
      ja: '中世期 (古仏/中英語/漢唐)', en: 'Medieval (Old French/Mid-Eng)', fr: 'Médiéval (Ancien français)',
      de: 'Mittelalter (Altfranzösisch)', es: 'Medieval (Francés antiguo)', it: 'Medievale (Antico francese)',
      pt: 'Medieval (Francês antigo)', nl: 'Middeleeuwen (Oudfrans)', zh: '中古期 (古法语/汉唐文言)', ko: '중세기 (고대프랑스어/한문)'
    },
    modern: {
      ja: '現代語 (本義・定着義)', en: 'Modern Term (Current Sense)', fr: 'Terme moderne (Sens actuel)',
      de: 'Modernes Wort (Heutiger Sinn)', es: 'Término moderno (Sentido actual)', it: 'Termine moderno (Senso attuale)',
      pt: 'Termo moderno (Sentido actual)', nl: 'Modern woord (Huidige betekenis)', zh: '现代词汇 (现行定着义)', ko: '현대 어휘 (현재 정착의미)'
    }
  };

  const TIMELINE_TITLE_I18N = {
    ja: '意味変遷タイムライン (Semantic Evolution Vector)',
    en: 'Semantic Evolution Timeline',
    fr: 'Vecteur d’évolution sémantique',
    de: 'Semantische Evolutions-Zeitleiste',
    es: 'Línea de tiempo de evolución semántica',
    it: 'Linea temporale dell’evoluzione semantica',
    pt: 'Linha do tempo da evolução semântica',
    nl: 'Semantische evolutie tijdlijn',
    zh: '词义演变轨迹 (Semantic Evolution)',
    ko: '의미 변천 타임라인 (Semantic Evolution)'
  };

  /**
   * 単語エントリから歴史的意味変遷タイムライン（Semantic Evolution Vector）を抽出・構造化
   */
  function buildSemanticTimeline(entry, targetLocale = 'ja') {
    if (!entry || !entry.word) return null;
    const tL = targetLocale || 'ja';
    const etyText = String(entry.etymology || '').trim();
    const rawWord = String(entry.word).trim();
    const tags = Array.isArray(entry.etymologyTags) ? entry.etymologyTags : [];
    let rootTag = tags.find(t => t && (t.startsWith('*') || t.includes('*') || /[\u4E00-\u9FFF]/.test(t))) || '';
    if (!rootTag && etyText) {
      const starCjk = etyText.match(/\*([\u4E00-\u9FFF\u3400-\u4DBF\u2E80-\u2EFF\uF900-\uFAFF])/);
      if (starCjk) {
        rootTag = '*' + starCjk[1];
      } else {
        const starPie = etyText.match(/\*([a-zA-Z0-9_äöüßÄÖÜāēīōūăĕĭŏŭáéíóúàèìòùâêîôûəǭḗ₁₂₃₄ḱǵʷʰ-]+)/);
        if (starPie) rootTag = '*' + starPie[1];
      }
    }
    const cleanRoot = normRootKey(rootTag);
    const isCjk = /[\u4E00-\u9FFF]/.test(cleanRoot) || ['zh', 'ko', 'ja'].includes(entry.lang);

    const steps = [];

    const safeTruncate = (s, max = 55) => {
      const chars = Array.from(String(s || ''));
      return chars.length > max ? chars.slice(0, max - 3).join('') + '...' : String(s || '');
    };

    // パターンA: 矢印（→ / -> / => 等）で連結された明示的変遷テキストのパース
    const arrowSegments = etyText
      ? etyText.split(/\s*(?:→|->|=>|⇒|-->|==>)\s*/).map(s => s.trim().replace(/(?:に?由来[。.]?|借用[。.]?|に遡る[。.]?)$/, '')).map(s => s.trim()).filter(Boolean)
      : [];
    if (arrowSegments.length >= 2) {
      const segs = arrowSegments.slice(0, 4);
      const detectEra = (txt, fallback) => {
        if (/(?:印欧祖語|PIE|\*)/i.test(txt)) return 'pie';
        if (/(?:甲骨|金文|古代字源)/.test(txt)) return 'cjk_ancient';
        if (/(?:ラテン|Latin|ギリシャ|Greek|古典|秦漢)/i.test(txt)) return 'classical';
        if (/(?:古フランス|フランス語|中英語|古英語|中世|漢唐|Old French|Middle English)/i.test(txt)) return 'medieval';
        if (/(?:現代|近代|英語|Modern)/i.test(txt)) return 'modern';
        return fallback;
      };

      segs.forEach((seg, idx) => {
        let fallbackEra;
        if (idx === 0) {
          fallbackEra = isCjk ? 'cjk_ancient' : 'pie';
        } else if (idx === segs.length - 1) {
          fallbackEra = 'modern';
        } else if (idx === 1) {
          fallbackEra = 'classical';
        } else {
          fallbackEra = 'medieval';
        }
        const era = detectEra(seg, fallbackEra);
        steps.push({
          era: (TIMELINE_ERA_I18N[era] && TIMELINE_ERA_I18N[era][tL]) ? TIMELINE_ERA_I18N[era][tL] : TIMELINE_ERA_I18N[era].en,
          content: safeTruncate(seg, 65)
        });
      });
    }

    // パターンB: 組み込み語根ナレッジベースからの構造化タイムライン自動生成
    const hasKana = str => typeof str === 'string' && /[\u3040-\u309f\u30a0-\u30ff]/.test(str);

    if (steps.length < 2 && cleanRoot) {
      const rootDb = global.VocabDictionary?.BUILTIN_ETYMOLOGY_KNOWLEDGE?.roots || {};
      const rObj = rootDb[cleanRoot] || rootDb[cleanRoot + '-'] || rootDb[cleanRoot.replace(/-$/, '')];
      const rLabel = rObj?.label || cleanRoot;
      const defRootMeaning = (tL === 'en' ? 'Core etymological concept' : (tL === 'de' ? 'Zentrales etymologisches Konzept' : (tL === 'fr' ? 'Concept étymologique fondamental' : (tL === 'es' ? 'Concepto etimológico fundamental' : (tL === 'it' ? 'Concetto etimologico fondamentale' : (tL === 'pt' ? 'Conceito etimológico central' : (tL === 'nl' ? 'Fundamenteel etymologisch concept' : (tL === 'ko' ? '핵심 어원 개념' : (tL === 'zh' ? '核心词源概念' : '核となる語源概念')))))))));
      const rMeaning = (tL === 'ja')
        ? (rObj?.meaning || defRootMeaning)
        : (rObj?.[`meaning_${tL}`] || rObj?.meaning_en || (!hasKana(rObj?.meaning) ? rObj?.meaning : '') || defRootMeaning);

      // 1. 祖語・原初段階
      steps.push({
        era: isCjk ? (TIMELINE_ERA_I18N.cjk_ancient[tL] || TIMELINE_ERA_I18N.cjk_ancient.en) : (TIMELINE_ERA_I18N.pie[tL] || TIMELINE_ERA_I18N.pie.en),
        content: `${rLabel} (${rMeaning})`
      });

      // 2. 古典期段階
      const classicalStem = extractMorphologicalStem(rawWord, cleanRoot, entry, tL);
      const defStemDesc = (tL === 'en' ? 'Classical stem formation' : (tL === 'de' ? 'Klassische Stammbildung' : (tL === 'fr' ? 'Formation du radical classique' : (tL === 'es' ? 'Formación de la raíz clásica' : (tL === 'it' ? 'Formazione del tema classico' : (tL === 'pt' ? 'Formação do tema clássico' : (tL === 'nl' ? 'Klassieke stamvorming' : (tL === 'ko' ? '고전 어간 형성' : (tL === 'zh' ? '古典语干形成' : '古典語幹の形成')))))))));
      const safeCore = (tL === 'ja') ? entry.core : (entry[`core_${tL}`] || (!hasKana(entry.core) ? entry.core : ''));
      const classicalDesc = classicalStem.core ? `${classicalStem.stem || rawWord} (${classicalStem.core})` : (safeCore || defStemDesc);
      steps.push({
        era: TIMELINE_ERA_I18N.classical[tL] || TIMELINE_ERA_I18N.classical.en,
        content: classicalDesc
      });

      // 3. 中世・転移段階（歴史的背景ノートまたは派生展開）
      let histNote = (tL === 'ja')
        ? (entry.history_note || '')
        : (entry[`history_note_${tL}`] || entry.history_note_trans || (!hasKana(entry.history_note) ? entry.history_note : '') || (!hasKana(entry.history_note_en) ? entry.history_note_en : '') || '');
      if (!histNote && etyText && (tL === 'ja' || !hasKana(etyText))) {
        const rawSentences = etyText.split(/[。\n]+/).map(s => s.trim()).filter(Boolean);
        const transSent = rawSentences.find(s => /(?:中世|中英語|古フランス|フランス語|借入|借用|経由)/.test(s));
        if (transSent) {
          histNote = transSent.replace(/^[、,。\s]+|[、,。\s]+$/g, '');
        }
      }
      if (histNote) {
        steps.push({
          era: TIMELINE_ERA_I18N.medieval[tL] || TIMELINE_ERA_I18N.medieval.en,
          content: safeTruncate(histNote, 55)
        });
      }

      // 4. 現代定着段階
      const m0 = entry.meanings?.[0];
      const modernMeaning = (tL === 'ja')
        ? (m0?.text || m0?.[`text_${tL}`] || '')
        : (m0?.[`text_${tL}`] || (!hasKana(m0?.text) ? m0?.text : '') || m0?.text_en || '');
      const defModernSense = (tL === 'en' ? 'Current sense' : (tL === 'de' ? 'Aktuelle Bedeutung' : (tL === 'fr' ? 'Sens actuel' : (tL === 'es' ? 'Significado actual' : (tL === 'it' ? 'Significato attuale' : (tL === 'pt' ? 'Significado atual' : (tL === 'nl' ? 'Huidige betekenis' : (tL === 'ko' ? '정착 의미' : (tL === 'zh' ? '定着义' : '定着義')))))))));
      steps.push({
        era: TIMELINE_ERA_I18N.modern[tL] || TIMELINE_ERA_I18N.modern.en,
        content: `${rawWord}: ${modernMeaning || defModernSense}`
      });
    }

    // パターンC: 明示的矢印はないが、文章内に古典期・中世期・現代期の変遷文が含まれる場合
    if (steps.length < 2 && etyText && (tL === 'ja' || !hasKana(etyText))) {
      const rawSentences = etyText.split(/[。\n]+/).map(s => s.trim().replace(/[。\s]+$/, '')).filter(Boolean);
      if (rawSentences.length >= 2) {
        const classicalSent = rawSentences.find(s => /(?:ラテン|ギリシャ|古典|秦漢|Latin|Greek)/i.test(s));
        const medievalSent = rawSentences.find(s => s !== classicalSent && /(?:中世|中英語|古フランス|フランス語|借入|借用|経由|Middle English|Old French)/i.test(s));
        const modernSent = rawSentences.find(s => s !== classicalSent && s !== medievalSent && /(?:現代|表す|意味|定着|現在|本義)/.test(s));

        if (classicalSent && (medievalSent || modernSent)) {
          steps.push({
            era: TIMELINE_ERA_I18N.classical[tL] || TIMELINE_ERA_I18N.classical.en,
            content: safeTruncate(classicalSent, 55)
          });
          if (medievalSent) {
            steps.push({
              era: TIMELINE_ERA_I18N.medieval[tL] || TIMELINE_ERA_I18N.medieval.en,
              content: safeTruncate(medievalSent, 55)
            });
          }
          const modernMeaning = entry.meanings?.[0]?.text || entry.meanings?.[0]?.[`text_${tL}`] || modernSent || '';
          if (modernMeaning) {
            const defModernSense = (tL === 'en' ? 'Current sense' : (tL === 'de' ? 'Aktuelle Bedeutung' : (tL === 'fr' ? 'Sens actuel' : (tL === 'es' ? 'Significado actual' : (tL === 'it' ? 'Significato actual' : (tL === 'pt' ? 'Significado actual' : (tL === 'nl' ? 'Huidige betekenis' : (tL === 'ko' ? '정착 의미' : (tL === 'zh' ? '定着义' : '定着義')))))))));
            const mText = (modernSent && !entry.meanings?.[0]?.text) ? modernSent : `${rawWord}: ${modernMeaning || defModernSense}`;
            steps.push({
              era: TIMELINE_ERA_I18N.modern[tL] || TIMELINE_ERA_I18N.modern.en,
              content: safeTruncate(mText, 55)
            });
          }
        }
      }
    }

    if (steps.length < 2) return null;
    return {
      title: TIMELINE_TITLE_I18N[tL] || TIMELINE_TITLE_I18N.en,
      lang: tL,
      steps
    };
  }

  /**
   * 意味変遷タイムラインのHTMLを生成
   */
  function renderSemanticTimelineHtml(timeline) {
    if (!timeline || !Array.isArray(timeline.steps) || timeline.steps.length < 2) return '';
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
    const langAttr = timeline.lang ? ` lang="${esc(timeline.lang)}"` : '';

    const stepsHtml = timeline.steps.map((st, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === timeline.steps.length - 1;
      const cls = isFirst ? 'is-root' : (isLast ? 'is-modern' : 'is-mid');
      const arrowHtml = !isLast ? `<div class="timeline-sep"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>` : '';
      return `
        <div class="timeline-step ${cls}">
          <span class="timeline-era">${esc(st.era)}</span>
          <span class="timeline-content"${langAttr}>${esc(st.content)}</span>
        </div>
        ${arrowHtml}
      `;
    }).join('');

    return `
      <div class="ety-timeline-card">
        <div class="timeline-hdr">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
          <span>${esc(timeline.title)}</span>
        </div>
        <div class="timeline-track">
          ${stepsHtml}
        </div>
      </div>
    `;
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
    validateExampleQuality,
    validateEntry,
    parseInputWordSpec,
    makeWordKey,
    makeLookupKey,
    COGNATE_KNOWLEDGE,
    buildCognateMatrix,
    renderCognateMatrixHtml,
    NUANCE_KNOWLEDGE,
    buildNuanceComparison,
    renderNuanceComparisonHtml,
    // 意味変遷タイムライン (Semantic Evolution Vector)
    buildSemanticTimeline,
    renderSemanticTimelineHtml,
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

export {};
