/**
 * Vocab Vault — Etymological Index, Hybrid Search & Sidebar Tree Engine (js/search.js)
 * Multi-token ASCII folding, PIE root indexing, multi-language pair filtering & dynamic sort
 */
(function (global) {
  'use strict';

  /** @param {string} id @returns {any} */
  const $ = id => typeof document !== 'undefined' ? document.getElementById(id) : null;
  const esc = global.VocabStorage?.esc || (s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])));
  const toHiragana = s => String(s ?? '').replace(/[\u30a1-\u30f6]/g, m => String.fromCharCode(m.charCodeAt(0) - 0x60));
  const normNfkc = s => toHiragana(String(s ?? '').normalize('NFKC').toLowerCase());
  const foldAscii = s => global.VocabMorphology?.foldAscii
    ? global.VocabMorphology.foldAscii(s)
    : String(s ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ß/g, 'ss');

  const FOLD_CHAR_MAP = {
    a: '[aàáâãäåāăąǎ]', c: '[cçćĉċč]', d: '[dďđ]', e: '[eèéêëēĕėęě]',
    g: '[gĝğġģ]', h: '[hĥħ]', i: '[iìíîïĩīĭįı]', j: '[jĵ]', k: '[kķ]',
    l: '[lĺļľŀł]', n: '[nñńņňŉŋ]', o: '[oòóôõöøōŏőǒ]', r: '[rŕŗř]',
    s: '[sśŝşš]', t: '[tţťŧ]', u: '[uùúûüũūŭůűųǔ]', w: '[wŵ]', y: '[yýÿŷ]', z: '[zźżž]'
  };
  const FOLD_DIGRAPH_MAP = {
    oe: '(?:[oòóôõöøōŏőǒ]\\p{M}*[eèéêëēĕėęě]\\p{M}*|œ\\p{M}*)',
    ae: '(?:[aàáâãäåāăąǎ]\\p{M}*[eèéêëēĕėęě]\\p{M}*|æ\\p{M}*)',
    ss: '(?:[sśŝşš]\\p{M}*[sśŝşš]\\p{M}*|ß\\p{M}*)'
  };

  /**
   * 検索トークンをダイアクリティカル・フォールディング対応の正規表現パターンへ変換
   */
  function tokenToFoldPattern(token) {
    const chars = [...String(token ?? '').trim()];
    let out = '';
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const low = foldAscii(ch);
      if (low.length === 2 && FOLD_DIGRAPH_MAP[low]) {
        out += FOLD_DIGRAPH_MAP[low];
        continue;
      }
      if (i + 1 < chars.length) {
        const pair = low + foldAscii(chars[i + 1]);
        if (FOLD_DIGRAPH_MAP[pair]) {
          out += FOLD_DIGRAPH_MAP[pair];
          i++;
          continue;
        }
      }
      if (FOLD_CHAR_MAP[low]) out += `${FOLD_CHAR_MAP[low]}\\p{M}*`;
      else out += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\p{M}*';
    }
    return out;
  }

  /**
   * クエリ文字列から複合トークンを抽出（ReDoS 防護: 最大8トークン、各トークン最大40文字）
   */
  function extractQueryTokens(q) {
    const raw = String(q ?? '').trim();
    if (!raw) return [];
    const SLASH_SENTINEL = '\uE000';
    const protectedRaw = raw.replace(/\b(and\/or|either\/or|w\/o|c\/o|input\/output|i\/o|client\/server|read\/write|r\/w|on\/off|true\/false|yes\/no|he\/she|his\/her|s\/he)\b/gi, m => m.replace(/\//g, SLASH_SENTINEL));
    const tokens = protectedRaw.split(/[\s,、，|｜/／;；]+/)
      .map(s => s.replace(/\uE000/g, '/').trim().slice(0, 40))
      .filter(Boolean);
    const unique = [...new Set(tokens.length ? tokens : [raw.slice(0, 40)])];
    return unique.slice(0, 8);
  }

  /**
   * 単語エントリのインデックスキャッシュ無効化
   */
  function invalidateMeta(it, appInstance = global.App) {
    const App = appInstance || global.App;
    if (App?.indexCache && it && typeof it === 'object') {
      try { App.indexCache.delete(it); } catch {}
    }
  }

  /**
   * 高速ハイライト用フォールディング正規表現生成（フィルタ構文 #pos / @cat / ?stat は除外）
   */
  function buildFoldRegex(q) {
    const cleaned = String(q ?? '')
      .replace(/(?:^|\s)#([a-zA-Z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uAC00-\uD7AF\u1100-\u11FF]+)/g, ' ')
      .replace(/(?:^|\s)@([^\s]+)/g, ' ')
      .replace(/(?:^|\s)\?([a-zA-Z]+)/g, ' ')
      .trim();
    const tokens = extractQueryTokens(cleaned);
    if (!tokens.length) return null;
    const sorted = [...tokens].sort((a, b) => b.length - a.length);
    const pat = sorted.map(tokenToFoldPattern).filter(Boolean).join('|');
    if (!pat) return null;
    try { return new RegExp(pat, 'giu'); } catch { return null; }
  }

  /**
   * 単語エントリから語根・祖語再構形タグを抽出
   */
  function extractEtyTags(it) {
    if (Array.isArray(it?.etymologyTags)) {
      return it.etymologyTags.map(String).filter(Boolean);
    }
    const ety = String(it?.etymology || '');
    // Unicode letters (\p{L}) and marks (\p{M}) support for reconstructed languages (e.g. *dūbǭ, *h₂nḗr)
    const matches = ety.match(/\*[\p{L}\p{M}0-9₁₂₃₄ḱǵʷʰ-]+-?/gu);
    if (!matches) return [];

    const unique = [...new Set(matches)].slice(0, 4);
    const etyFold = ety.toLowerCase();
    return unique.map(m => {
      // 祖言語の文脈判定（ゲルマン祖語、印欧祖語など）
      if (etyFold.includes('ゲルマン祖語') || etyFold.includes('proto-germanic')) {
        return `ゲルマン祖語: ${m}`;
      }
      if (etyFold.includes('印欧祖語') || etyFold.includes('pie') || etyFold.includes('proto-indo-european')) {
        return `印欧祖語: ${m}`;
      }
      if (etyFold.includes('イタリック祖語') || etyFold.includes('proto-italic')) {
        return `イタリック祖語: ${m}`;
      }
      return `再構語: ${m}`;
    });
  }

  /**
   * 単語エントリのインデックス用メタデータを取得・キャッシュ
   */
  function getMeta(it, appInstance = global.App) {
    const App = appInstance || global.App || {};
    if (!App.indexCache) App.indexCache = new WeakMap();

    let meta = App.indexCache.get(it);
    if (!meta) {
      const tags = extractEtyTags(it), roots = new Set();
      const normRootKeyFn = global.VocabMorphology?.normRootKey || (r => r);
      const isValidRootForEntryFn = global.VocabMorphology?.isValidRootForEntry || (() => true);

      if (!['unknown', 'disputed'].includes(it.etymologyConfidence)) {
        tags.forEach(t => {
          const k = normRootKeyFn(t);
          if (k && isValidRootForEntryFn(k, it)) roots.add(k);
        });
      }
      const catsList = global.CATS || global.VocabStorage?.CATS || [];
      const catName = typeof it.category === 'number' ? (catsList[it.category] || String(it.category)) : String(it.category || '');
      const transCat = global.VocabI18n?.translateCategory ? global.VocabI18n.translateCategory(catName) : '';
      const rawBlob = [
        it.word,
        it.homographIndex > 1 ? `${it.word}#${it.homographIndex}` : '',
        `#${it.num}`,
        it.phonetic,
        it.grammar_forms,
        it.category,
        catName,
        transCat,
        it.folder,
        it.etymology,
        it.history_note,
        it.core,
        it.core_trans,
        it.contextSentence,
        ...(it.meanings || []).flatMap(m => [m.pos, m.text, m.trans, m.text_en]),
        ...tags,
        ...(it.phrases || []).flatMap(p => [p.foreign, p.ja, p.trans]),
        ...(it.derivatives || []).flatMap(d => [d.word, d.meaning, d.sub_phrase, d.sub_trans]),
        it.example?.foreign,
        it.example?.used_form,
        it.example?.ja,
        it.example?.trans
      ].filter(Boolean).join('\n');
      const tagsFold = tags.map(t => foldAscii(String(t)).toLowerCase().replace(/^\*|^-+|-+$/g, ''));
      const meaningsFold = (it.meanings || []).map(m => foldAscii(m?.text || '').toLowerCase());
      const meaningsNfkc = (it.meanings || []).map(m => normNfkc(m?.text || ''));
      meta = {
        tags,
        tagsFold,
        meaningsFold,
        meaningsNfkc,
        roots,
        wordFold: foldAscii(it.word),
        blob: rawBlob.toLowerCase(),
        nfkcBlob: normNfkc(rawBlob),
        foldedBlob: foldAscii(rawBlob)
      };
      App.indexCache.set(it, meta);
    }
    return meta;
  }

  /**
   * Trie（接頭辞木）ノードおよびプレフィックスツリー実装
   * プレフィックス検索を O(N) から O(K + M) へ高速化し、メインスレッドの凍結を防止
   */
  class PrefixTrieNode {
    constructor() {
      this.children = new Map();
      this.isWord = false;
      this.token = null;
    }
  }

  class PrefixTrie {
    constructor() {
      this.root = new PrefixTrieNode();
    }
    clear() {
      this.root = new PrefixTrieNode();
    }
    insert(tok) {
      if (!tok) return;
      let curr = this.root;
      for (let i = 0; i < tok.length; i++) {
        const ch = tok[i];
        let next = curr.children.get(ch);
        if (!next) {
          next = new PrefixTrieNode();
          curr.children.set(ch, next);
        }
        curr = next;
      }
      curr.isWord = true;
      curr.token = tok;
    }
    collectTokens(prefix, max = 250) {
      if (!prefix) return [];
      let curr = this.root;
      for (let i = 0; i < prefix.length; i++) {
        const ch = prefix[i];
        curr = curr.children.get(ch);
        if (!curr) return [];
      }
      const res = [];
      const stack = [curr];
      while (stack.length > 0 && res.length < max) {
        const node = stack.pop();
        if (node.isWord && node.token) {
          res.push(node.token);
        }
        for (const child of node.children.values()) {
          stack.push(child);
        }
      }
      return res;
    }
  }

  /**
   * 転置インデックス（Inverted Index）エンジン
   * 5,000〜50,000語規模でもサブミリ秒（O(1)〜O(K)）でマルチキーワード検索を実現
   */
  const VocabInvertedIndex = {
    postings: new Map(), // token -> Set<string(id|num)>
    itemsMap: new Map(), // string(id|num) -> item
    trie: new PrefixTrie(),
    indexedCount: 0,
    lastBuiltTs: 0,

    tokenize(text) {
      if (!text) return [];
      const s = String(text).toLowerCase();
      const folded = foldAscii(s);
      const tokens = new Set();

      const words = folded.match(/[a-z0-9\u00C0-\u024F]+/g) || [];
      words.forEach(w => {
        if (w.length >= 2) {
          tokens.add(w);
          for (let len = 2; len <= Math.min(4, w.length); len++) {
            tokens.add(w.slice(0, len));
          }
        }
      });

      // 日・中・韓（CJK + Hangul）の文字種を完全に網羅（1文字および隣接2文字バイグラムを転置インデックス化）
      const cjk = s.match(/[\u3040-\u309F\u30A0-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g) || [];
      for (let i = 0; i < cjk.length; i++) {
        tokens.add(cjk[i]);
        if (i + 1 < cjk.length) tokens.add(cjk[i] + cjk[i + 1]);
      }
      const nfkc = normNfkc(s);
      const cjkNorm = nfkc.match(/[\u3040-\u309F\u30A0-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g) || [];
      for (let i = 0; i < cjkNorm.length; i++) {
        tokens.add(cjkNorm[i]);
        if (i + 1 < cjkNorm.length) tokens.add(cjkNorm[i] + cjkNorm[i + 1]);
      }

      return [...tokens];
    },

    build(items) {
      this.postings.clear();
      this.itemsMap.clear();
      this.trie.clear();
      const list = Array.isArray(items) ? items : [];

      list.forEach(it => {
        if (!it || !it.word) return;
        const key = String(it.id || it.num || Math.random());
        this.itemsMap.set(key, it);

        const meta = getMeta(it);
        const directRoots = (it.etymologyTags || it.tags || []).map(r => foldAscii(String(r).toLowerCase()).replace(/^\*|^-+|-+$/g, ''));
        const metaRoots = [...meta.roots].map(r => foldAscii(String(r).toLowerCase()).replace(/^\*|^-+|-+$/g, ''));
        const tokens = new Set([
          ...this.tokenize(it.word),
          ...this.tokenize(meta.blob),
          ...directRoots,
          ...metaRoots
        ]);

        tokens.forEach(tok => {
          if (!tok) return;
          let post = this.postings.get(tok);
          if (!post) {
            this.postings.set(tok, post = new Set());
            this.trie.insert(tok);
          }
          post.add(key);
        });
      });

      this.indexedCount = list.length;
      this.lastBuiltTs = Date.now();
      return this.indexedCount;
    },

    search(query, pool) {
      if (!query || !query.trim()) return pool || [];
      const tokens = extractQueryTokens(query).map(t => foldAscii(t.toLowerCase()).replace(/^\*|^-+|-+$/g, '')).filter(Boolean);
      if (!tokens.length) return pool || [];

      let candidateKeys = null;
      for (const tok of tokens) {
        let tokKeys = this.postings.get(tok);
        const nfkcTok = normNfkc(tok);
        if (!tokKeys && nfkcTok && nfkcTok !== tok) {
          tokKeys = this.postings.get(nfkcTok);
        }
        if (!tokKeys) {
          tokKeys = new Set();
          // [O(K) Trie プレフィックス検索] 全件線形走査を完全撤廃し、Trie木によるプレフィックス走査を実行
          const matchedToks = this.trie.collectTokens(tok, 250);
          for (let i = 0; i < matchedToks.length; i++) {
            const set = this.postings.get(matchedToks[i]);
            if (set) {
              set.forEach(id => tokKeys.add(id));
              if (tokKeys.size >= 1500) break;
            }
          }
        }

        if (!candidateKeys) {
          candidateKeys = new Set(tokKeys);
        } else {
          const next = new Set();
          candidateKeys.forEach(id => {
            if (tokKeys.has(id)) next.add(id);
          });
          candidateKeys = next;
        }

        if (candidateKeys.size === 0) break;
      }

      if (!candidateKeys || candidateKeys.size === 0) return [];

      const poolKeys = pool ? new Set(pool.map(i => String(i.id || i.num))) : null;
      const res = [];
      candidateKeys.forEach(key => {
        const item = this.itemsMap.get(key);
        if (item && (!poolKeys || poolKeys.has(key))) {
          res.push(item);
        }
      });
      return res;
    }
  };

  let _lastEtyIndexedRef = null;
  let _lastEtyIndexedLen = -1;

  /**
   * 全言語横断で語根インデックスマップを構築（アクティブペア即時 + 他ペア遅延インデックス化）
   */
  function buildEtyIndex(appInstance = global.App, force = false) {
    const App = appInstance || global.App || {};
    if (!App.rootIndexMap) App.rootIndexMap = new Map();

    const activeList = Array.isArray(App.entries) ? App.entries : [];
    // 変更がない場合は同期パース・再構築をスキップしてUI凍結を完全回避
    if (!force && App.rootIndexMap.size > 0 && _lastEtyIndexedRef === App.entries && _lastEtyIndexedLen === activeList.length) {
      return;
    }

    _lastEtyIndexedRef = App.entries;
    _lastEtyIndexedLen = activeList.length;
    App.rootIndexMap.clear();

    const rootBuckets = new Map();
    const getJsonFn = global.getJson || (global.VocabStorage ? global.VocabStorage.getJson : (() => []));
    const activePairKey = global.getActivePairConfig ? global.getActivePairConfig().key : '';
    const curSrc = App.srcLang || 'en';

    // 1. アクティブ言語ペアを即時同期インデックス化（メインスレッドを最優先で開放）
    activeList.forEach(it => {
      if (!it?.word) return;
      const l = it.lang || curSrc || 'en';
      it.lang = l;
      const uKey = `${activePairKey}:${it.id || it.num}`;
      const ref = { word: it.word, lang: l, num: it.num, id: it.id, homographIndex: it.homographIndex };
      getMeta(it, App).roots.forEach(k => {
        let rm = rootBuckets.get(k);
        if (!rm) rootBuckets.set(k, rm = new Map());
        rm.set(uKey, ref);
      });
    });
    rootBuckets.forEach((m, k) => App.rootIndexMap.set(k, [...m.values()]));

    // 2. 非アクティブな他言語ペアの走査
    // crossLang が不要な場合やメモリ外の巨大データはアイドル時または必要時に遅延インデックス化
    const allPairs = getAllKnownPairConfigs(App);
    const keysToScan = new Map();
    const langs = global.LANGS || {};
    ['en', 'fr', 'de', 'es', 'it', 'pt', 'nl', 'zh', 'ko', 'ja'].forEach(l => {
      const k = langs[l]?.key || (l === 'en' ? 'distinction_entries' : `distinction_entries_${l}`);
      if (k !== activePairKey) keysToScan.set(k, l);
    });
    allPairs.forEach(p => {
      if (p.key && p.key !== activePairKey) keysToScan.set(p.key, p.src || 'en');
    });

    const indexRemainingKeys = () => {
      keysToScan.forEach((srcLang, storageKey) => {
        const list = global.VocabStorage?.state?.mem?.[storageKey] || getJsonFn(storageKey) || [];
        list.forEach(it => {
          if (!it?.word) return;
          const l = it.lang || srcLang || 'en';
          it.lang = l;
          const uKey = `${storageKey}:${it.id || it.num}`;
          const ref = { word: it.word, lang: l, num: it.num, id: it.id, homographIndex: it.homographIndex };
          getMeta(it, App).roots.forEach(k => {
            let rm = rootBuckets.get(k);
            if (!rm) rootBuckets.set(k, rm = new Map());
            rm.set(uKey, ref);
          });
        });
      });
      rootBuckets.forEach((m, k) => App.rootIndexMap.set(k, [...m.values()]));
    };

    if (App.crossLang) {
      indexRemainingKeys();
    } else if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => indexRemainingKeys(), { timeout: 2000 });
    } else if (typeof setTimeout === 'function') {
      setTimeout(indexRemainingKeys, 100);
    }
  }

  /**
   * 品詞一致判定
   */
  function matchPos(it, targetGroup) {
    if (!targetGroup || targetGroup === 'all') return true;
    const tgLow = String(targetGroup).trim().toLowerCase();
    return (it.meanings || []).some(m => {
      const p = String(m.pos || '').trim();
      const low = p.toLowerCase();
      const isN = p.startsWith('N') || low.startsWith('n.') || low.startsWith('subst') || p.includes('名詞') || p.includes('명사') || low.startsWith('nom') || low.startsWith('sust') || low.startsWith('sost');
      const isV = p.startsWith('V') || low.startsWith('v.') || p.includes('動詞') || p.includes('동사') || low.startsWith('verb');
      const isAdj = p.startsWith('Adj') || low.startsWith('adj') || p.includes('形容詞') || p.includes('형용사');
      const isAdv = p.startsWith('Adv') || low.startsWith('adv') || p.includes('副詞') || p.includes('부사') || low.startsWith('avv');
      if (targetGroup === 'N' || tgLow === 'n' || tgLow === 'noun' || targetGroup === '名詞' || targetGroup === '명사' || tgLow === 'nom' || tgLow === 'nomen' || tgLow === 'sustantivo' || tgLow === 'sostantivo') return isN;
      if (targetGroup === 'V' || tgLow === 'v' || tgLow === 'verb' || targetGroup === '動詞' || targetGroup === '동사' || tgLow === 'verbe' || tgLow === 'verbo') return isV;
      if (targetGroup === 'Adj' || tgLow === 'adj' || tgLow === 'a' || targetGroup === '形容詞' || targetGroup === '형용사' || tgLow === 'adjectif' || tgLow === 'adjektiv' || tgLow === 'adjetivo' || tgLow === 'aggettivo') return isAdj;
      if (targetGroup === 'Adv' || tgLow === 'adv' || targetGroup === '副詞' || targetGroup === '부사' || tgLow === 'adverbe' || tgLow === 'adverb' || tgLow === 'adverbio' || tgLow === 'avverbio') return isAdv;
      if (targetGroup === 'Other' || tgLow === 'other' || targetGroup === '기타' || targetGroup === 'その他' || tgLow === 'autre' || tgLow === 'andere') return !(isN || isV || isAdj || isAdv);
      return low.startsWith(tgLow);
    });
  }

  /**
   * 学習ステータス判定
   */
  function matchStat(it, targetStat, now = Date.now()) {
    if (!targetStat || targetStat === 'all') return true;
    if (targetStat === 'due') return (it.nextReview || 0) <= now;
    if (targetStat === 'flag') return (Array.isArray(it.flags) && it.flags.length > 0) || Boolean(it.needsRegeneration);
    if (targetStat === 'wikt') return Boolean(it.wiktGrounded);
    return true;
  }

  /**
   * 単一トークン照合
   */
  function matchSingleQueryToken(meta, tokObj) {
    return meta.blob.includes(tokObj.low)
      || (tokObj.nfkc && meta.nfkcBlob && meta.nfkcBlob.includes(tokObj.nfkc))
      || (tokObj.fold && meta.foldedBlob.includes(tokObj.fold))
      || (tokObj.root && meta.roots.has(tokObj.root))
      || meta.roots.has(tokObj.low);
  }

  /**
   * 言語ペア短縮表示ラベル
   */
  function getPairShortLabel(src, tgt, locale = null) {
    const loc = (locale && global.VocabI18n?.SUPPORTED_LOCALES?.includes(locale))
      ? locale
      : (global.VocabI18n ? global.VocabI18n.getLocale() : 'ja');

    if (loc === 'ja') {
      const sMap = { en: '英', ja: '日', fr: '仏', de: '独', es: '西', it: '伊', pt: '葡', nl: '蘭', zh: '中', ko: '韓' };
      const s = sMap[src] || String(src || '').toUpperCase();
      const t = sMap[tgt] || String(tgt || '').toUpperCase();
      if (src === 'en' && tgt === 'ja') return '英和';
      if (src === 'ja' && tgt === 'en') return '和英';
      if (src === tgt) {
        return `${s}${s}`;
      }
      return `${s}${t}`;
    }

    if (loc === 'zh') {
      const sMap = { en: '英', ja: '日', fr: '法', de: '德', es: '西', it: '意', pt: '葡', nl: '荷', zh: '中', ko: '韩' };
      const s = sMap[src] || String(src || '').toUpperCase();
      const t = sMap[tgt] || String(tgt || '').toUpperCase();
      return `${s}${t}`;
    }

    if (loc === 'ko') {
      const sMap = { en: '영', ja: '일', fr: '불', de: '독', es: '서', it: '이', pt: '포', nl: '화', zh: '중', ko: '한' };
      const s = sMap[src] || String(src || '').toUpperCase();
      const t = sMap[tgt] || String(tgt || '').toUpperCase();
      return `${s}${t}`;
    }

    // 全ての欧米言語 (en, fr, de, es, it, pt, nl 等): 国際標準の2文字大文字コード (ES-EN, KO-ZH, EN-JA 等)
    const s = String(src || '').toUpperCase();
    const t = String(tgt || '').toUpperCase();
    return `${s}-${t}`;
  }

  /**
   * 言語ペア詳細表示ラベル
   */
  function getPairFullLabel(src, tgt, locale = null) {
    const loc = (locale && global.VocabI18n?.SUPPORTED_LOCALES?.includes(locale))
      ? locale
      : (global.VocabI18n ? global.VocabI18n.getLocale() : 'ja');
    const isJa = loc === 'ja';
    const langs = global.LANGS || {};
    const sName = isJa
      ? (langs[src]?.ja || langs[src]?.label || String(src || '').toUpperCase())
      : (langs[src]?.label || String(src || '').toUpperCase());
    const tName = isJa
      ? (langs[tgt]?.ja || langs[tgt]?.label || String(tgt || '').toUpperCase())
      : (langs[tgt]?.label || String(tgt || '').toUpperCase());
    const short = getPairShortLabel(src, tgt, loc);
    if (src === tgt) {
      return isJa ? `${sName} (${short}辞典)` : `${sName} (${short} Dict)`;
    }
    return `${sName} → ${tName} (${short})`;
  }

  const _pairCountCache = new Map(); // storageKey -> { rawLen: number, count: number }

  /**
   * 保存されている全言語ペアファイル一覧取得（パースキャッシュ適用で起動時のLong Taskを防止）
   */
  function getActivePairFiles(appInstance = global.App) {
    const App = appInstance || global.App || {};
    const pairMap = new Map();
    const getJsonFn = global.getJson || (global.VocabStorage ? global.VocabStorage.getJson : (() => []));
    const activePairKey = global.getActivePairConfig ? global.getActivePairConfig().key : '';

    const scanKeys = new Set();
    if (typeof localStorage !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('distinction_entries')) scanKeys.add(k);
        }
      } catch {}
    }
    if (global.VocabStorage?.state?.mem) {
      Object.keys(global.VocabStorage.state.mem).forEach(k => {
        if (k && k.startsWith('distinction_entries')) scanKeys.add(k);
      });
    }

    scanKeys.forEach(k => {
      let count = 0;
      if (k === activePairKey && App.loadedKey === activePairKey && Array.isArray(App.entries)) {
        count = App.entries.length;
      } else if (global.VocabStorage?.state?.mem?.[k] && Array.isArray(global.VocabStorage.state.mem[k])) {
        count = global.VocabStorage.state.mem[k].length;
      } else if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(k);
        if (!raw || raw.trim() === '[]') {
          count = 0;
        } else {
          const cached = _pairCountCache.get(k);
          if (cached && cached.rawLen === raw.length) {
            count = cached.count;
          } else {
            const words = getJsonFn(k);
            count = Array.isArray(words) ? words.length : 0;
            _pairCountCache.set(k, { rawLen: raw.length, count });
          }
        }
      } else {
        const words = getJsonFn(k);
        count = Array.isArray(words) ? words.length : 0;
      }

      if (count > 0) {
        const p = global.VocabStorage ? global.VocabStorage.keyToPair(k) : { srcLang: 'en', tgtLang: 'ja' };
        const id = `${p.srcLang}_${p.tgtLang}`;
        pairMap.set(id, {
          src: p.srcLang,
          tgt: p.tgtLang,
          key: k,
          count
        });
      }
    });

    if (!pairMap.size) {
      pairMap.set('en_ja', { src: 'en', tgt: 'ja', key: global.LANGS?.en?.key || 'distinction_entries', count: 0 });
    }

    const curSrc = App.srcLang || 'en';
    const curTgt = App.tgtLang || 'ja';
    const curId = `${curSrc}_${curTgt}`;
    const cfg = global.getActivePairConfig ? global.getActivePairConfig() : { key: 'distinction_entries' };
    const curCount = (App.loadedKey === cfg.key && Array.isArray(App.entries))
      ? App.entries.length
      : (getJsonFn(cfg.key)?.length || 0);

    if (!pairMap.has(curId)) {
      pairMap.set(curId, {
        src: curSrc,
        tgt: curTgt,
        key: cfg.key,
        count: curCount
      });
    } else {
      const curObj = pairMap.get(curId);
      if (curObj) {
        curObj.count = curCount;
      }
    }

    return Array.from(pairMap.values()).map(p => ({
      ...p,
      short: getPairShortLabel(p.src, p.tgt),
      label: getPairFullLabel(p.src, p.tgt),
      isCur: (p.src === curSrc && p.tgt === curTgt)
    }));
  }

  function getAllKnownPairConfigs(appInstance = global.App) {
    return getActivePairFiles(appInstance);
  }

  /**
   * 言語ペアタブ一覧を描画
   */
  function renderPairFileTabs(appInstance = global.App) {
    const container = $('pairFileTabs');
    if (!container) return;
    const files = getActivePairFiles(appInstance);
    const isJa = global.VocabI18n ? global.VocabI18n.getLocale() === 'ja' : true;
    global.VocabDOM?.setSafeHtml(container, files.map(p => {
      const countLabel = p.count > 0 ? p.count : (isJa ? '新規' : 'New');
      const countClass = p.count > 0 ? 'tab-count' : 'tab-count empty';
      return `<button type="button" class="file-tab ${p.isCur ? 'active' : ''}" data-act="set-pair" data-src="${esc(p.src)}" data-tgt="${esc(p.tgt)}" title="${esc(p.label)}"><span class="tab-label">${esc(p.short)}</span><span class="${countClass}">${countLabel}</span></button>`;
    }).join(''));
  }

  /**
   * フィルター・クエリ・ソート条件に基づく高速単語フィルタリング
   */
  function getFiltered(appInstance = global.App) {
    const App = appInstance || global.App || {};
    let rawQ = (App.qStr || '').trim(), now = Date.now();
    let queryPos = null, queryCat = null, queryStat = null;

    if (rawQ) {
      rawQ = rawQ.replace(/#([a-zA-Z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\uAC00-\uD7AF\u1100-\u11FF]+)/g, (_, val) => {
        const vLow = val.toLowerCase();
        if (vLow === 'noun' || vLow === 'n' || val === '名詞' || val === '명사') queryPos = 'N';
        else if (vLow === 'verb' || vLow === 'v' || val === '動詞' || val === '동사') queryPos = 'V';
        else if (vLow === 'adj' || vLow === 'a' || val === '形容詞' || val === '형용사') queryPos = 'Adj';
        else if (vLow === 'adv' || val === '副詞' || val === '부사') queryPos = 'Adv';
        else if (val === '기타' || val === 'その他' || vLow === 'other') queryPos = 'Other';
        else queryPos = val;
        return '';
      });
      rawQ = rawQ.replace(/@([^\s]+)/g, (_, val) => {
        queryCat = val;
        return '';
      });
      rawQ = rawQ.replace(/\?([a-zA-Z]+)/g, (_, val) => {
        queryStat = val.toLowerCase();
        return '';
      });
      rawQ = rawQ.trim();
    }

    const effectiveStat = queryStat || App.statF || 'all';
    const effectivePos = queryPos || App.posF || 'all';
    const effectiveCat = queryCat || App.cat || 'all';

    const getActivePairConfigFn = global.getActivePairConfig || (() => ({ key: 'distinction_entries' }));
    const curPairKey = getActivePairConfigFn().key;
    const getJsonFn = global.getJson || (global.VocabStorage ? global.VocabStorage.getJson : (() => []));

    const pool = App.crossLang ? getAllKnownPairConfigs(App).flatMap(p => {
      const cfg = global.VocabStorage ? global.VocabStorage.getPairConfig(p.src, p.tgt) : (global.LANGS?.[p.src] || global.LANGS?.en);
      const res = (cfg?.key === curPairKey) ? (App.entries || []) : getJsonFn(cfg?.key);
      return Array.isArray(res) ? res : [];
    }) : (App.entries || []);

    const catsList = global.CATS || global.VocabStorage?.CATS || [];
    const baseFiltered = pool.filter(i => {
      if (!i?.word || !matchStat(i, effectiveStat, now)) return false;
      const itemCat = typeof i.category === 'number' ? (catsList[i.category] || String(i.category)) : String(i.category || '');
      if (effectiveCat !== 'all' && itemCat !== effectiveCat) {
        if (!queryCat) return false;
        const qCatLow = queryCat.toLowerCase();
        const transCat = global.VocabI18n?.translateCategory ? global.VocabI18n.translateCategory(itemCat) : '';
        const enCat = global.VocabI18n?.translateCategory ? global.VocabI18n.translateCategory(itemCat, 'en') : '';
        if (!itemCat.toLowerCase().includes(qCatLow) && !transCat.toLowerCase().includes(qCatLow) && !enCat.toLowerCase().includes(qCatLow)) {
          return false;
        }
      }
      if (App.fol && App.fol !== 'all' && i.folder !== App.fol) return false;
      if (!matchPos(i, effectivePos)) return false;
      return true;
    });

    let matched = baseFiltered;
    if (rawQ) {
      const hasExplicitOr = /[,、，|｜/／;；]/.test(rawQ);
      const rawTokens = extractQueryTokens(rawQ);
      const normRootKeyFn = global.VocabMorphology?.normRootKey || (r => r);
      const tokObjs = rawTokens.map(t => ({
        low: t.toLowerCase(),
        nfkc: normNfkc(t),
        fold: foldAscii(t),
        root: normRootKeyFn(t)
      })).filter(t => t.low);

      if (hasExplicitOr) {
        matched = baseFiltered.filter(i => {
          const meta = getMeta(i, App);
          return tokObjs.some(tok => matchSingleQueryToken(meta, tok));
        });
      } else if (tokObjs.length <= 1) {
        const tok = tokObjs[0];
        matched = baseFiltered.filter(i => matchSingleQueryToken(getMeta(i, App), tok));
      } else {
        const andMatches = baseFiltered.filter(i => {
          const meta = getMeta(i, App);
          return tokObjs.every(tok => matchSingleQueryToken(meta, tok));
        });
        if (andMatches.length > 0) {
          matched = andMatches;
        } else {
          matched = baseFiltered.filter(i => {
            const meta = getMeta(i, App);
            return tokObjs.some(tok => matchSingleQueryToken(meta, tok));
          });
        }
      }
    }

    const sorted = [...matched];
    if (rawQ && (!App.sortBy || App.sortBy === 'new')) {
      const qFold = foldAscii(rawQ).toLowerCase().replace(/^\*|^-+|-+$/g, '');
      const qNfkc = normNfkc(rawQ);
      const calcRelevance = item => {
        let score = 0;
        const meta = getMeta(item, App);
        const wFold = meta.wordFold || foldAscii(item.word || '').toLowerCase();
        if (wFold === qFold) score += 1000;
        else if (wFold.startsWith(qFold)) score += 500;
        else if (wFold.includes(qFold)) score += 200;

        const mFolds = meta.meaningsFold;
        const mNfkcs = meta.meaningsNfkc;
        if (mFolds) {
          for (let mIdx = 0; mIdx < mFolds.length; mIdx++) {
            const mText = mFolds[mIdx];
            const mN = mNfkcs[mIdx];
            if (mText === qFold || (qNfkc && mN === qNfkc)) { score += 120; break; }
            if (mText.startsWith(qFold) || (qNfkc && mN && mN.startsWith(qNfkc))) { score += 80; break; }
            if (mText.includes(qFold) || (qNfkc && mN && mN.includes(qNfkc))) { score += 40; break; }
          }
        }

        const tFolds = meta.tagsFold;
        if (tFolds) {
          for (let tIdx = 0; tIdx < tFolds.length; tIdx++) {
            const tFold = tFolds[tIdx];
            if (tFold === qFold) { score += 90; break; }
            if (tFold.includes(qFold)) { score += 50; break; }
          }
        }

        return score;
      };

      // [パフォーマンス最適化] Schwartzian Transform: O(N log N) 回の foldAscii 重複実行を O(N) の事前計算マップへ集約
      const scoreMap = new Map();
      for (let i = 0; i < sorted.length; i++) {
        scoreMap.set(sorted[i], calcRelevance(sorted[i]));
      }

      sorted.sort((a, b) => {
        const diff = (scoreMap.get(b) || 0) - (scoreMap.get(a) || 0);
        if (diff !== 0) return diff;
        return (b.num || 0) - (a.num || 0);
      });
    } else if (App.sortBy === 'old') {
      sorted.sort((a, b) => (a.num || 0) - (b.num || 0));
    } else if (App.sortBy === 'due') {
      sorted.sort((a, b) => (a.nextReview || 0) - (b.nextReview || 0));
    } else if (App.sortBy === 'alpha') {
      const alphaMap = new Map();
      for (let i = 0; i < sorted.length; i++) {
        const meta = getMeta(sorted[i], App);
        alphaMap.set(sorted[i], meta?.wordFold || foldAscii(sorted[i].word));
      }
      sorted.sort((a, b) => (alphaMap.get(a) || '').localeCompare(alphaMap.get(b) || ''));
    } else {
      sorted.reverse();
    }
    return sorted;
  }

  const mkTreeItem = (t, id, l, c, cur) =>
    `<div class="tree-item ${cur === id ? 'active' : ''}" data-act="filter" data-type="${esc(t)}" data-val="${esc(id)}"><span>${esc(l)}</span><span class="tree-cnt">${c}</span></div>`;

  /**
   * サイドバーツリー（言語・ステータス・タイトル・品詞・カテゴリ）の集計・描画
   */
  function renderSidebarTree(appInstance = global.App) {
    const App = appInstance || global.App || {};
    if (!$('vaultLabel')) return;
    const curSrc = App.srcLang || 'en';
    const curTgt = App.tgtLang || 'ja';
    const pairBadge = curSrc === curTgt
      ? `${curSrc.toUpperCase()} (${getPairShortLabel(curSrc, curTgt)})`
      : `${curSrc.toUpperCase()} → ${curTgt.toUpperCase()}`;
    $('vaultLabel').textContent = `Vocab Vault (${pairBadge})`;

    const pairs = getAllKnownPairConfigs(App);
    if ($('treeLang')) {
      global.VocabDOM?.setSafeHtml($('treeLang'), pairs.map(p => {
        const isCur = (p.src === curSrc && p.tgt === curTgt);
        return `<div class="tree-item ${isCur ? 'active' : ''}" data-act="set-pair" data-src="${esc(p.src)}" data-tgt="${esc(p.tgt)}"><span>${esc(p.label)}</span><span class="tree-cnt">${p.count}</span></div>`;
      }).join(''));
    }

    const entries = App.entries || [];
    const now = Date.now(), sC = { all: entries.length, due: 0, flag: 0, wikt: 0 };
    const fM = new Map(), cM = new Map(), pC = { all: entries.length, N: 0, V: 0, Adj: 0, Adv: 0, Other: 0 };
    const posGroups = global.POS_GROUPS || [
      { id: 'all', label: 'すべての品詞' },
      { id: 'N', label: '名詞 (Noun)' },
      { id: 'V', label: '動詞 (Verb)' },
      { id: 'Adj', label: '形容詞 (Adj)' },
      { id: 'Adv', label: '副詞 (Adv)' },
      { id: 'Other', label: 'その他 (Phr/Idiom)' }
    ];
    const statGroups = global.STAT_GROUPS || [
      { id: 'all', label: 'すべて' },
      { id: 'due', label: '復習期日' },
      { id: 'flag', label: '要確認フラグ' },
      { id: 'wikt', label: 'Wiktionary裏付' }
    ];
    const cats = global.CATS || [];

    const catsList = global.CATS || global.VocabStorage?.CATS || [];
    entries.forEach(e => {
      if ((e.nextReview || 0) <= now) sC.due++;
      if (e.flags?.length) sC.flag++;
      if (e.wiktGrounded) sC.wikt++;
      if (e.folder) fM.set(e.folder, (fM.get(e.folder) ?? 0) + 1);
      const catName = typeof e.category === 'number' ? (catsList[e.category] || String(e.category)) : String(e.category || '');
      if (catName) cM.set(catName, (cM.get(catName) ?? 0) + 1);

      let hasN = false, hasV = false, hasAdj = false, hasAdv = false, hasOther = false;
      const meanings = e.meanings || [];
      for (let mIdx = 0; mIdx < meanings.length; mIdx++) {
        const p = String(meanings[mIdx]?.pos || '').trim();
        const low = p.toLowerCase();
        const isN = p.startsWith('N') || low.startsWith('n.') || low.startsWith('subst') || p.includes('名詞') || p.includes('명사') || low.startsWith('nom') || low.startsWith('sust') || low.startsWith('sost');
        const isV = p.startsWith('V') || low.startsWith('v.') || p.includes('動詞') || p.includes('동사') || low.startsWith('verb');
        const isAdj = p.startsWith('Adj') || low.startsWith('adj') || p.includes('形容詞') || p.includes('형용사');
        const isAdv = p.startsWith('Adv') || low.startsWith('adv') || p.includes('副詞') || p.includes('부사') || low.startsWith('avv');
        if (isN) hasN = true;
        if (isV) hasV = true;
        if (isAdj) hasAdj = true;
        if (isAdv) hasAdv = true;
        if (!isN && !isV && !isAdj && !isAdv) hasOther = true;
      }
      if (hasN) pC.N++;
      if (hasV) pC.V++;
      if (hasAdj) pC.Adj++;
      if (hasAdv) pC.Adv++;
      if (hasOther) pC.Other++;
    });

    const allFieldsLbl = global.VocabI18n?.t ? global.VocabI18n.t('side.all_fields') : 'すべてのタイトル';
    const allCatsLbl = global.VocabI18n?.t ? global.VocabI18n.t('side.all_cats') : 'すべてのカテゴリ';
    const translateCat = global.VocabI18n?.translateCategory || (c => c);

    if ($('treeStat')) global.VocabDOM?.setSafeHtml($('treeStat'), statGroups.map(g => mkTreeItem('stat', g.id, g.label, sC[g.id], App.statF)).join(''));
    if ($('treeFol')) global.VocabDOM?.setSafeHtml($('treeFol'), mkTreeItem('fol', 'all', allFieldsLbl, entries.length, App.fol) + [...fM.entries()].map(([f, c]) => mkTreeItem('fol', f, f, c, App.fol)).join(''));
    if ($('treePos')) global.VocabDOM?.setSafeHtml($('treePos'), posGroups.map(g => mkTreeItem('pos', g.id, g.label, pC[g.id], App.posF)).join(''));
    if ($('treeCat')) global.VocabDOM?.setSafeHtml($('treeCat'), mkTreeItem('cat', 'all', allCatsLbl, entries.length, App.cat)
      + [...cats].sort((a, b) => (cM.get(b) ?? 0) - (cM.get(a) ?? 0)).filter(c => (cM.get(c) ?? 0) > 0 || App.cat === c).map(c => mkTreeItem('cat', c, translateCat(c), cM.get(c) ?? 0, App.cat)).join(''));
    if (global.enhanceA11y) global.enhanceA11y($('secLang')?.parentElement || document);
  }

  /**
   * サイドバー開閉およびマスク制御
   */
  const closeSidebar = () => {
    if (typeof document === 'undefined') return;
    document.body.classList.add('side-collapsed');
    document.body.classList.remove('side-open-lock');
  };

  const toggleSidebar = (force = null) => {
    if (typeof document === 'undefined') return;
    const shouldOpen = typeof force === 'boolean' ? force : document.body.classList.contains('side-collapsed');
    if (shouldOpen) {
      document.body.classList.remove('side-collapsed');
      if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        document.body.classList.add('side-open-lock');
        $('qSearch')?.focus?.();
      }
    } else {
      closeSidebar();
    }
  };

  const toggleSec = id => $(id)?.classList.toggle('closed');

  function toggleMask() {
    if (typeof document === 'undefined') return;
    const m = document.body.classList.toggle('mask');
    if (!m) document.querySelectorAll('.revealed').forEach(el => el.classList.remove('revealed'));
    $('ribMaskBtn')?.classList.toggle('active-mask', m);
    if ($('topMaskBtn')) $('topMaskBtn').style.borderColor = $('topMaskBtn').style.color = m ? 'var(--r)' : '';
  }

  // --- グローバルエクスポート ---
  global.VocabSearch = {
    VocabInvertedIndex,
    rebuildInvertedIndex: (items) => VocabInvertedIndex.build(items || global.App?.entries),
    searchInvertedIndex: (q, pool) => VocabInvertedIndex.search(q, pool || global.App?.entries),
    FOLD_CHAR_MAP,
    FOLD_DIGRAPH_MAP,
    tokenToFoldPattern,
    extractQueryTokens,
    buildFoldRegex,
    extractEtyTags,
    getMeta,
    invalidateMeta,
    buildEtyIndex,
    matchPos,
    matchStat,
    matchSingleQueryToken,
    getPairShortLabel,
    getPairFullLabel,
    getActivePairFiles,
    renderPairFileTabs,
    getAllKnownPairConfigs,
    getFiltered,
    mkTreeItem,
    renderSidebarTree,
    closeSidebar,
    toggleSidebar,
    toggleSec,
    toggleMask
  };
})(typeof window !== 'undefined' ? window : globalThis);

export {};
