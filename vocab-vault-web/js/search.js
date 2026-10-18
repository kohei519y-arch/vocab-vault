/**
 * Vocab Vault — Etymological Index, Hybrid Search & Sidebar Tree Engine (js/search.js)
 * Multi-token ASCII folding, PIE root indexing, multi-language pair filtering & dynamic sort
 */
(function (global) {
  'use strict';

  const $ = id => typeof document !== 'undefined' ? document.getElementById(id) : null;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
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
    const tokens = raw.split(/[\s,、，|｜/／;；]+/)
      .map(s => s.trim().slice(0, 40))
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
   * 高速ハイライト用フォールディング正規表現生成
   */
  function buildFoldRegex(q) {
    const tokens = extractQueryTokens(q);
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
      const rawBlob = [
        it.word,
        it.homographIndex > 1 ? `${it.word}#${it.homographIndex}` : '',
        `#${it.num}`,
        it.phonetic,
        it.grammar_forms,
        it.category,
        it.folder,
        it.etymology,
        it.history_note,
        it.core,
        it.contextSentence,
        ...(it.meanings || []).flatMap(m => [m.pos, m.text]),
        ...tags,
        ...(it.phrases || []).flatMap(p => [p.foreign, p.ja]),
        ...(it.derivatives || []).flatMap(d => [d.word, d.meaning, d.sub_phrase, d.sub_trans]),
        it.example?.foreign,
        it.example?.ja
      ].filter(Boolean).join('\n');
      meta = {
        tags,
        roots,
        wordFold: foldAscii(it.word),
        blob: rawBlob.toLowerCase(),
        foldedBlob: foldAscii(rawBlob)
      };
      App.indexCache.set(it, meta);
    }
    return meta;
  }

  /**
   * 転置インデックス（Inverted Index）エンジン
   * 5,000〜50,000語規模でもサブミリ秒（O(1)〜O(K)）でマルチキーワード検索を実現
   */
  const VocabInvertedIndex = {
    postings: new Map(), // token -> Set<string(id|num)>
    itemsMap: new Map(), // string(id|num) -> item
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

      const cjk = s.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || [];
      for (let i = 0; i < cjk.length; i++) {
        tokens.add(cjk[i]);
        if (i + 1 < cjk.length) tokens.add(cjk[i] + cjk[i + 1]);
      }

      return [...tokens];
    },

    build(items) {
      this.postings.clear();
      this.itemsMap.clear();
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
          if (!post) this.postings.set(tok, post = new Set());
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
        if (!tokKeys) {
          tokKeys = new Set();
          for (const [key, set] of this.postings) {
            if (key.startsWith(tok) || key.includes(tok)) {
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

  /**
   * 全言語横断で語根インデックスマップを構築
   */
  function buildEtyIndex(appInstance = global.App) {
    const App = appInstance || global.App || {};
    if (!App.rootIndexMap) App.rootIndexMap = new Map();
    App.rootIndexMap.clear();

    const rootBuckets = new Map();
    const getJsonFn = global.getJson || (global.VocabStorage ? global.VocabStorage.getJson : (() => []));
    const activePairKey = global.getActivePairConfig ? global.getActivePairConfig().key : '';

    // 基本10言語キー + 保存されている全言語ペアキーを統合走査
    const allPairs = getAllKnownPairConfigs(App);
    const keysToScan = new Map();
    const langs = global.LANGS || {};
    ['en', 'fr', 'de', 'es', 'it', 'pt', 'nl', 'zh', 'ko', 'ja'].forEach(l => {
      const k = langs[l]?.key || (l === 'en' ? 'distinction_entries' : `distinction_entries_${l}`);
      keysToScan.set(k, l);
    });
    allPairs.forEach(p => {
      if (p.key) keysToScan.set(p.key, p.src || 'en');
    });

    keysToScan.forEach((srcLang, storageKey) => {
      const list = (storageKey === activePairKey && Array.isArray(App.entries) && App.entries.length)
        ? App.entries
        : (getJsonFn(storageKey) || []);
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
  }

  /**
   * 品詞一致判定
   */
  function matchPos(it, targetGroup) {
    if (!targetGroup || targetGroup === 'all') return true;
    return (it.meanings || []).some(m => {
      const p = String(m.pos || '').trim();
      const low = p.toLowerCase();
      const isN = p.startsWith('N') || low.startsWith('n.') || low.startsWith('subst') || p.includes('名詞');
      const isV = p.startsWith('V') || low.startsWith('v.') || p.includes('動詞');
      const isAdj = p.startsWith('Adj') || low.startsWith('adj') || p.includes('形容詞');
      const isAdv = p.startsWith('Adv') || low.startsWith('adv') || p.includes('副詞');
      if (targetGroup === 'N') return isN;
      if (targetGroup === 'V') return isV;
      if (targetGroup === 'Adj') return isAdj;
      if (targetGroup === 'Adv') return isAdv;
      if (targetGroup === 'Other') return !(isN || isV || isAdj || isAdv);
      return p.startsWith(targetGroup);
    });
  }

  /**
   * 学習ステータス判定
   */
  function matchStat(it, targetStat, now = Date.now()) {
    if (!targetStat || targetStat === 'all') return true;
    if (targetStat === 'due') return (it.nextReview || 0) <= now;
    if (targetStat === 'flag') return Array.isArray(it.flags) && it.flags.length > 0;
    if (targetStat === 'wikt') return Boolean(it.wiktGrounded);
    return true;
  }

  /**
   * 単一トークン照合
   */
  function matchSingleQueryToken(meta, tokObj) {
    return meta.blob.includes(tokObj.low)
      || (tokObj.fold && meta.foldedBlob.includes(tokObj.fold))
      || (tokObj.root && meta.roots.has(tokObj.root))
      || meta.roots.has(tokObj.low);
  }

  /**
   * 言語ペア短縮表示ラベル
   */
  function getPairShortLabel(src, tgt) {
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

  /**
   * 言語ペア詳細表示ラベル
   */
  function getPairFullLabel(src, tgt) {
    const langs = global.LANGS || {};
    const sName = langs[src]?.ja || langs[src]?.label || String(src || '').toUpperCase();
    const tName = langs[tgt]?.ja || langs[tgt]?.label || String(tgt || '').toUpperCase();
    const short = getPairShortLabel(src, tgt);
    if (src === tgt) {
      return `${sName} (${short}辞典)`;
    }
    return `${sName} → ${tName} (${short})`;
  }

  /**
   * 保存されている全言語ペアファイル一覧取得
   */
  function getActivePairFiles(appInstance = global.App) {
    const App = appInstance || global.App || {};
    const pairMap = new Map();
    const getJsonFn = global.getJson || (global.VocabStorage ? global.VocabStorage.getJson : (() => []));

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
      const words = getJsonFn(k);
      if (Array.isArray(words) && words.length > 0) {
        const p = global.VocabStorage ? global.VocabStorage.keyToPair(k) : { srcLang: 'en', tgtLang: 'ja' };
        const id = `${p.srcLang}_${p.tgtLang}`;
        pairMap.set(id, {
          src: p.srcLang,
          tgt: p.tgtLang,
          key: k,
          count: words.length
        });
      }
    });

    if (!pairMap.size) {
      pairMap.set('en_ja', { src: 'en', tgt: 'ja', key: global.LANGS?.en?.key || 'distinction_entries_en', count: 0 });
    }

    const curSrc = App.srcLang || 'en';
    const curTgt = App.tgtLang || 'ja';
    const curId = `${curSrc}_${curTgt}`;
    if (!pairMap.has(curId)) {
      const cfg = global.getActivePairConfig ? global.getActivePairConfig() : { key: 'distinction_entries' };
      pairMap.set(curId, {
        src: curSrc,
        tgt: curTgt,
        key: cfg.key,
        count: getJsonFn(cfg.key).length
      });
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
    container.innerHTML = files.map(p => {
      const countLabel = p.count > 0 ? p.count : '新規';
      const countClass = p.count > 0 ? 'tab-count' : 'tab-count empty';
      return `<button type="button" class="file-tab ${p.isCur ? 'active' : ''}" onclick="setLanguagePair('${p.src}','${p.tgt}')" title="${esc(p.label)}"><span class="tab-label">${esc(p.short)}</span><span class="${countClass}">${countLabel}</span></button>`;
    }).join('');
  }

  /**
   * フィルター・クエリ・ソート条件に基づく高速単語フィルタリング
   */
  function getFiltered(appInstance = global.App) {
    const App = appInstance || global.App || {};
    const rawQ = (App.qStr || '').trim(), now = Date.now();
    const getActivePairConfigFn = global.getActivePairConfig || (() => ({ key: 'distinction_entries' }));
    const curPairKey = getActivePairConfigFn().key;
    const getJsonFn = global.getJson || (global.VocabStorage ? global.VocabStorage.getJson : (() => []));

    const pool = App.crossLang ? getAllKnownPairConfigs(App).flatMap(p => {
      const cfg = global.VocabStorage ? global.VocabStorage.getPairConfig(p.src, p.tgt) : (global.LANGS?.[p.src] || global.LANGS?.en);
      return (cfg?.key === curPairKey) ? (App.entries || []) : getJsonFn(cfg?.key);
    }) : (App.entries || []);

    const baseFiltered = pool.filter(i => {
      if (!i?.word || !matchStat(i, App.statF || 'all', now)) return false;
      if (App.cat && App.cat !== 'all' && i.category !== App.cat) return false;
      if (App.fol && App.fol !== 'all' && i.folder !== App.fol) return false;
      if (!matchPos(i, App.posF || 'all')) return false;
      return true;
    });

    let matched = baseFiltered;
    if (rawQ) {
      const hasExplicitOr = /[,、，|｜/／;；]/.test(rawQ);
      const rawTokens = extractQueryTokens(rawQ);
      const normRootKeyFn = global.VocabMorphology?.normRootKey || (r => r);
      const tokObjs = rawTokens.map(t => ({
        low: t.toLowerCase(),
        fold: foldAscii(t),
        root: normRootKeyFn(t)
      }));

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
    if (App.sortBy === 'old') sorted.sort((a, b) => (a.num || 0) - (b.num || 0));
    else if (App.sortBy === 'due') sorted.sort((a, b) => (a.nextReview || 0) - (b.nextReview || 0));
    else if (App.sortBy === 'alpha') sorted.sort((a, b) => foldAscii(a.word).localeCompare(foldAscii(b.word)));
    else sorted.reverse();
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
      $('treeLang').innerHTML = pairs.map(p => {
        const isCur = (p.src === curSrc && p.tgt === curTgt);
        return `<div class="tree-item ${isCur ? 'active' : ''}" data-act="set-pair" data-src="${esc(p.src)}" data-tgt="${esc(p.tgt)}"><span>${esc(p.label)}</span><span class="tree-cnt">${p.count}</span></div>`;
      }).join('');
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

    entries.forEach(e => {
      if ((e.nextReview || 0) <= now) sC.due++;
      if (e.flags?.length) sC.flag++;
      if (e.wiktGrounded) sC.wikt++;
      if (e.folder) fM.set(e.folder, (fM.get(e.folder) ?? 0) + 1);
      if (e.category) cM.set(e.category, (cM.get(e.category) ?? 0) + 1);
      posGroups.slice(1).forEach(g => { if (matchPos(e, g.id)) pC[g.id]++; });
    });

    if ($('treeStat')) $('treeStat').innerHTML = statGroups.map(g => mkTreeItem('stat', g.id, g.label, sC[g.id], App.statF)).join('');
    if ($('treeFol')) $('treeFol').innerHTML = mkTreeItem('fol', 'all', 'すべてのタイトル', entries.length, App.fol) + [...fM.entries()].map(([f, c]) => mkTreeItem('fol', f, f, c, App.fol)).join('');
    if ($('treePos')) $('treePos').innerHTML = posGroups.map(g => mkTreeItem('pos', g.id, g.label, pC[g.id], App.posF)).join('');
    if ($('treeCat')) $('treeCat').innerHTML = mkTreeItem('cat', 'all', 'すべてのカテゴリ', entries.length, App.cat)
      + [...cats].sort((a, b) => (cM.get(b) ?? 0) - (cM.get(a) ?? 0)).filter(c => (cM.get(c) ?? 0) > 0 || App.cat === c).map(c => mkTreeItem('cat', c, c, cM.get(c) ?? 0, App.cat)).join('');
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
