/**
 * Vocab Vault — Storage & Tombstone Module (js/storage.js)
 * 本番仕様: IndexedDB を SSOT（単一の信頼できる情報源）とする堅牢アーキテクチャ
 * LocalStorage 5MB上限 & iOS Safari 7日間パージ耐性、アトミックマイグレーション
 */
(function (global) {
  'use strict';

  const LANGS = {
    en: { key: 'distinction_entries', snap: 'vocab_snapshot_en', tomb: 'vv_tombstones_en', clearKey: 'vv_cleared_at_en', srcLang: 'en', tgtLang: 'ja', pairId: 'en_ja' },
    fr: { key: 'distinction_entries_fr', snap: 'vocab_snapshot_fr', tomb: 'vv_tombstones_fr', clearKey: 'vv_cleared_at_fr', srcLang: 'fr', tgtLang: 'ja', pairId: 'fr_ja' },
    de: { key: 'distinction_entries_de', snap: 'vocab_snapshot_de', tomb: 'vv_tombstones_de', clearKey: 'vv_cleared_at_de', srcLang: 'de', tgtLang: 'ja', pairId: 'de_ja' },
    es: { key: 'distinction_entries_es', snap: 'vocab_snapshot_es', tomb: 'vv_tombstones_es', clearKey: 'vv_cleared_at_es', srcLang: 'es', tgtLang: 'ja', pairId: 'es_ja' },
    it: { key: 'distinction_entries_it', snap: 'vocab_snapshot_it', tomb: 'vv_tombstones_it', clearKey: 'vv_cleared_at_it', srcLang: 'it', tgtLang: 'ja', pairId: 'it_ja' },
    pt: { key: 'distinction_entries_pt', snap: 'vocab_snapshot_pt', tomb: 'vv_tombstones_pt', clearKey: 'vv_cleared_at_pt', srcLang: 'pt', tgtLang: 'ja', pairId: 'pt_ja' },
    nl: { key: 'distinction_entries_nl', snap: 'vocab_snapshot_nl', tomb: 'vv_tombstones_nl', clearKey: 'vv_cleared_at_nl', srcLang: 'nl', tgtLang: 'ja', pairId: 'nl_ja' },
    zh: { key: 'distinction_entries_zh', snap: 'vocab_snapshot_zh', tomb: 'vv_tombstones_zh', clearKey: 'vv_cleared_at_zh', srcLang: 'zh', tgtLang: 'ja', pairId: 'zh_ja' },
    ko: { key: 'distinction_entries_ko', snap: 'vocab_snapshot_ko', tomb: 'vv_tombstones_ko', clearKey: 'vv_cleared_at_ko', srcLang: 'ko', tgtLang: 'ja', pairId: 'ko_ja' },
    ja: { key: 'distinction_entries_ja', snap: 'vocab_snapshot_ja', tomb: 'vv_tombstones_ja', clearKey: 'vv_cleared_at_ja', srcLang: 'ja', tgtLang: 'ja', pairId: 'ja_ja' }
  };
  const LANG_KEYS = Object.keys(LANGS);

  const CATS = ["政治・国際関係","歴史・考古学","言語・コミュニケーション","経済・金融","社会・移民","数学・統計","科学・テクノロジー","医療・健康","環境・自然・生物","芸術・文学・文化","法律・司法","教育・学校","心理学・精神","哲学・宗教","ビジネス・経営","IT・コンピューター","メディア・報道","スポーツ・エンタメ","交通・インフラ","地理・地学・宇宙","建築・都市計画","農業・食料・料理","日常生活・服飾","感情・性格","人間関係・家族","動作・行為","状態・性質","時間・空間・頻度","抽象概念・論理","その他"];
  const ETY_CONF_ENUM = ["certain", "probable", "disputed", "unknown"];
  const WIKT_URL_RE = /^https:\/\/[a-z0-9-]+\.wiktionary\.org\/wiki\/[^\s"<>`\\]+$/i;
  const sanitizeWiktUrl = url => (typeof url === 'string' && WIKT_URL_RE.test(url.trim())) ? url.trim() : undefined;
  const cleanPho = p => String(p ?? '').replace(/^[\[/\s]+/, '').replace(/[\]/\s]+$/, '').trim();
  const fmtPho = p => { const c = cleanPho(p); return c ? `[ ${c} ]` : ''; };
  const genId = () => 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);

  function sanitizeItem(raw, idx, defLang = 'en') {
    if (!raw || typeof raw !== 'object') return null;
    const w = String(raw.word || raw.w || '').trim().normalize('NFC');
    if (!w) return null;
    const l = LANGS[raw.lang] ? raw.lang : defLang;
    const rawMeanings = raw.meanings || raw.m;
    const normW = w.toLowerCase();
    const meanings = (Array.isArray(rawMeanings) ? rawMeanings : []).filter(Boolean).map((m, mIdx) => {
      let pos = String(m.pos || m.p || '');
      let text = String(m.text || m.t || '');
      // 壊れたカード（意味テキストが === Etymology === 等のWiktionary生見出しやダミープレースホルダー）の自己修復
      if (text.includes('===') || text.includes('主要な意味・文脈的語義')) {
        if (mIdx === 0 && normW === 'implement') {
          pos = 'V[T]';
          text = '（計画・政策・方針を）実行する、実施する、導入する';
        } else if (mIdx === 0 && (normW === 'objective' || normW === 'objectives')) {
          pos = 'N[C]';
          text = '目標、目的、方針';
        } else {
          text = text.replace(/===+[^=]+===+/g, '').trim() || '学術・文脈上の重要語義';
        }
      }
      return { pos, text };
    });
    const homoIdx = Math.max(1, parseInt(raw.homographIndex, 10) || 1);
    const cRaw = raw.category ?? raw.c;
    const parsedNum = Number(raw.num), parsedUpd = Number(raw.updatedAt);
    const safeWiktUrl = sanitizeWiktUrl(raw.wiktUrl || raw.wu);
    const ex = raw.example || raw.ex;
    const etyConf = raw.etymologyConfidence || raw.ec;
    const rawTags = raw.etymologyTags || raw.et;
    const rawPhrases = raw.phrases || raw.ph;
    const rawDerivs = raw.derivatives || raw.d;

    const normRootKey = global.VocabMorphology?.normRootKey || (s => String(s ?? '').trim().toLowerCase());
    const isValidRoot = global.VocabMorphology?.isValidRootForEntry || (() => true);
    const makeWordKey = global.VocabMorphology?.makeWordKey || ((word, lang, pos, hIdx) => `${lang}:${word}`);

    return {
      id: typeof raw.id === 'string' && raw.id ? raw.id : genId(),
      homographIndex: homoIdx > 1 ? homoIdx : undefined,
      wordKey: typeof raw.wordKey === 'string' && raw.wordKey ? raw.wordKey : makeWordKey(w, l, meanings[0]?.pos || '', homoIdx),
      num: Number.isInteger(parsedNum) && parsedNum > 0 ? parsedNum : idx + 1,
      word: w,
      lang: l,
      category: CATS.includes(cRaw) ? cRaw : (CATS[parseInt(cRaw, 10)] || 'その他'),
      folder: raw.folder ? String(raw.folder).trim() : undefined,
      phonetic: cleanPho(raw.phonetic || raw.p),
      grammar_forms: (raw.grammar_forms || raw.gf) ? String(raw.grammar_forms || raw.gf).trim() : undefined,
      etymologyConfidence: ETY_CONF_ENUM.includes(etyConf) ? etyConf : undefined,
      wiktGrounded: Boolean((raw.wiktGrounded ?? raw.wg) && safeWiktUrl),
      wiktUrl: safeWiktUrl,
      etymology: String(raw.etymology || raw.e || ''),
      etymologyTags: (Array.isArray(rawTags) ? rawTags : [])
        .map(normRootKey)
        .filter(r => r && isValidRoot(r, { word: w, etymology: raw.etymology || raw.e, example: ex })),
      history_note: (raw.history_note || raw.hn) ? String(raw.history_note || raw.hn).trim() : undefined,
      core: String(raw.core || raw.co || ''),
      meanings,
      example: ex ? {
        foreign: String(ex.foreign || ex.en || ex.f || ''),
        ja: String(ex.ja || ex.j || ''),
        used_form: (ex.used_form || ex.uf) ? String(ex.used_form || ex.uf).trim() : undefined
      } : null,
      phrases: (Array.isArray(rawPhrases) ? rawPhrases : []).filter(Boolean).map(x => ({
        foreign: String(x.foreign || x.en || x.f || ''),
        ja: String(x.ja || x.j || '')
      })),
      derivatives: (Array.isArray(rawDerivs) ? rawDerivs : []).filter(Boolean).map(x => ({
        word: String(x.word || x.w || ''),
        phonetic: cleanPho(x.phonetic || x.p),
        pos: String(x.pos || x.ps || ''),
        meaning: String(x.meaning || x.m || ''),
        sub_phrase: String(x.sub_phrase || x.sp || ''),
        sub_trans: String(x.sub_trans || x.st || '')
      })),
      contextSentence: raw.contextSentence ? String(raw.contextSentence) : undefined,
      interval: Number.isFinite(Number(raw.interval)) ? Number(raw.interval) : 0,
      repetition: Number.isFinite(Number(raw.repetition)) ? Number(raw.repetition) : 0,
      efactor: Number.isFinite(Number(raw.efactor)) ? Number(raw.efactor) : 2.5,
      stability: (Number.isFinite(Number(raw.stability)) && Number(raw.stability) > 0) ? Number(raw.stability) : undefined,
      difficulty: (Number.isFinite(Number(raw.difficulty)) && Number(raw.difficulty) >= 1 && Number(raw.difficulty) <= 10) ? Number(raw.difficulty) : undefined,
      retrievability: (Number.isFinite(Number(raw.retrievability)) && Number(raw.retrievability) >= 0 && Number(raw.retrievability) <= 1) ? Number(raw.retrievability) : undefined,
      pair: typeof raw.pair === 'string' && raw.pair ? raw.pair : undefined,
      tgtLang: typeof raw.tgtLang === 'string' && raw.tgtLang ? raw.tgtLang : undefined,
      nextReview: Number.isFinite(Number(raw.nextReview)) ? Number(raw.nextReview) : Date.now(),
      reviewUpdatedAt: Number.isFinite(Number(raw.reviewUpdatedAt || raw.review_updated_at))
        ? Math.min(Number(raw.reviewUpdatedAt || raw.review_updated_at), Date.now() + 86400000)
        : 0,
      isDeleted: Boolean(raw.isDeleted || raw.is_deleted),
      flags: Array.isArray(raw.flags) ? raw.flags.map(String) : [],
      gen: raw.gen && typeof raw.gen === 'object' ? { model: String(raw.gen.model || ''), pv: String(raw.gen.pv || ''), at: Number(raw.gen.at) || 0 } : undefined,
      // 項目23: 端末時計ズレ（Clock Skew）防衛のための論理クロック（Lamport Version）
      version: (Number.isInteger(Number(raw.version)) && Number(raw.version) > 0) ? Number(raw.version) : 1,
      // 時計狂い（Clock Skew / Future Timestamp Poisoning）防衛: 未来24時間を超える不正タイムスタンプは現在時刻へクリップ
      updatedAt: Number.isFinite(parsedUpd) && parsedUpd > 0 ? Math.min(parsedUpd, Date.now() + 86400000) : 1
    };
  }

  function mergeWords(arrA, arrB, lOrKey = 'en', ignoreTombstones = false, customTombMap = null, customClearedAt = null) {
    const cfg = resolveConfig(lOrKey);
    const srcLang = cfg.srcLang || keyToLang(lOrKey) || 'en';
    const tombTarget = cfg.key || lOrKey;
    const tombMap = ignoreTombstones ? new Map() : (customTombMap || getTombstones(tombTarget));
    const clearedAt = ignoreTombstones ? 0 : (customClearedAt !== null ? customClearedAt : getClearedAt(tombTarget));
    const byId = new Map(), wkToId = new Map();
    const makeWordKey = global.VocabMorphology?.makeWordKey || ((word, lang, pos, hIdx) => `${lang}:${word}`);

    [arrA, arrB].forEach(list => (Array.isArray(list) ? list : []).forEach((raw, idx) => {
      const it = sanitizeItem(raw, idx, srcLang);
      if (!it || (!ignoreTombstones && isTombstoned(it, tombMap, tombTarget, clearedAt))) return;
      const wk = it.wordKey || makeWordKey(it.word, srcLang, it.meanings?.[0]?.pos, it.homographIndex);
      it.wordKey = wk;
      const existingId = byId.has(it.id) ? it.id : wkToId.get(wk);
      if (!existingId) {
        byId.set(it.id, it);
        wkToId.set(wk, it.id);
      } else {
        const ex = byId.get(existingId);
        // 項目23: 論理クロック（Lamport Version）優先、同値時は updatedAt によるハイブリッド調停 (HLC)
        const itVer = Number(it.version) || 1;
        const exVer = Number(ex.version) || 1;
        let itWins;
        if (itVer !== exVer) {
          itWins = itVer > exVer;
        } else {
          itWins = (it.updatedAt || 0) >= (ex.updatedAt || 0);
        }
        const win = itWins ? it : ex, lose = itWins ? ex : it;

        // SRS復習進捗（暗記データ）は reviewUpdatedAt が新しい方を独立して採用
        const itRevTime = Number(it.reviewUpdatedAt || it.updatedAt) || 0;
        const exRevTime = Number(ex.reviewUpdatedAt || ex.updatedAt) || 0;
        const revWins = itRevTime >= exRevTime;
        const revWin = revWins ? it : ex, revLose = revWins ? ex : it;

        // フィールド単位の無損失マージ (Field-level CRDT Lossless Merge)
        const mergedNotes = (win.notes && String(win.notes).trim())
          ? win.notes
          : (lose.notes || '');
        const mergedMnemonic = (win.mnemonic && String(win.mnemonic).trim())
          ? win.mnemonic
          : (lose.mnemonic || '');
        const mergedContextSentence = (win.contextSentence && String(win.contextSentence).trim())
          ? win.contextSentence
          : (lose.contextSentence || '');
        const mergedEtymologyDetails = (win.etymologyDetails && String(win.etymologyDetails).trim())
          ? win.etymologyDetails
          : (lose.etymologyDetails || '');

        // 語根タグ（Set によるユニオン統合）
        const mergedTagsSet = new Set();
        (Array.isArray(win.etymologyTags) ? win.etymologyTags : []).forEach(t => { if (t) mergedTagsSet.add(String(t).trim()); });
        (Array.isArray(lose.etymologyTags) ? lose.etymologyTags : []).forEach(t => { if (t) mergedTagsSet.add(String(t).trim()); });
        const mergedTags = mergedTagsSet.size ? Array.from(mergedTagsSet) : (win.etymologyTags || lose.etymologyTags || []);

        const merged = {
          ...lose, ...win,
          id: ex.id || it.id,
          version: Math.max(itVer, exVer),
          folder: (win.updatedAt || 0) > (lose.updatedAt || 0) || itVer > exVer
            ? (win.folder || undefined)
            : (win.folder || lose.folder || undefined),
          notes: mergedNotes,
          mnemonic: mergedMnemonic,
          contextSentence: mergedContextSentence,
          etymologyDetails: mergedEtymologyDetails,
          wiktGrounded: win.wiktGrounded || lose.wiktGrounded,
          wiktUrl: win.wiktUrl || lose.wiktUrl,
          etymologyTags: mergedTags,
          updatedAt: Math.max(win.updatedAt || 1, lose.updatedAt || 1),
          pair: win.pair || lose.pair,
          tgtLang: win.tgtLang || lose.tgtLang,
          // SRS フィールドの独立マージ (FSRS-4.5 パラメータ含む)
          interval: revWin.interval !== undefined ? revWin.interval : revLose.interval,
          repetition: revWin.repetition !== undefined ? revWin.repetition : revLose.repetition,
          efactor: revWin.efactor !== undefined ? revWin.efactor : revLose.efactor,
          stability: revWin.stability !== undefined ? revWin.stability : revLose.stability,
          difficulty: revWin.difficulty !== undefined ? revWin.difficulty : revLose.difficulty,
          retrievability: revWin.retrievability !== undefined ? revWin.retrievability : revLose.retrievability,
          nextReview: revWin.nextReview !== undefined ? revWin.nextReview : revLose.nextReview,
          reviewUpdatedAt: Math.max(itRevTime, exRevTime),
          isDeleted: Boolean(win.isDeleted !== undefined ? win.isDeleted : lose.isDeleted)
        };
        if (ex.wordKey && ex.wordKey !== merged.wordKey) wkToId.delete(ex.wordKey);
        byId.set(merged.id, merged);
        wkToId.set(merged.wordKey, merged.id);
      }
    }));
    return [...byId.values()].map((it, i) => ({ ...it, num: i + 1 }));
  }

  function parseAnyWords(raw, defL = 'en', strict = false) {
    const out = { en:[], fr:[], de:[], es:[], it:[], pt:[], nl:[], zh:[], ko:[], ja:[] };
    let p;
    try {
      p = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
      if (strict) throw new Error(`JSONの構文解析に失敗しました: ${e.message}`);
      return out;
    }
    if (!p || typeof p !== 'object') {
      if (strict) throw new Error('JSONオブジェクトまたは配列ではありません。');
      return out;
    }

    let recognizedStructure = false;
    if (Array.isArray(p)) {
      recognizedStructure = true;
      p.forEach((it, i) => {
        const w = it ? (it.word || it.w) : null;
        const hasData = it ? (it.meanings || it.m || it.etymology || it.e) : null;
        if (typeof w === 'string' && hasData) {
          const l = LANGS[it.lang] ? it.lang : defL, c = sanitizeItem(it, i, l);
          if (c) {
            if (!out[l]) out[l] = [];
            out[l].push(c);
          }
        }
      });
    } else {
      const src = (p.data && typeof p.data === 'object' && !Array.isArray(p.data)) ? p.data : p;
      Object.keys(src).forEach(k => {
        const rawList = Array.isArray(src[k])
          ? src[k]
          : (src[k] && Array.isArray(src[k].words) ? src[k].words : null);
        if (!rawList) return;
        recognizedStructure = true;
        const targetLang = (typeof k === 'string' && k.length === 2 && LANGS[k]) ? k : (keyToLang(k) || defL);
        const parsedItems = [];
        rawList.forEach((it, idx) => {
          const w = it ? (it.word || it.w) : null;
          const hasData = it ? (it.meanings || it.m || it.etymology || it.e) : null;
          if (typeof w === 'string' && hasData) {
            const itemLang = LANGS[it.lang] ? it.lang : targetLang;
            const c = sanitizeItem(it, idx, itemLang);
            if (c) parsedItems.push(c);
          }
        });
        out[k] = parsedItems;
        if (LANGS[targetLang] && (!out[targetLang] || out[targetLang].length === 0)) {
          out[targetLang] = parsedItems;
        }
      });
    }
    if (strict && !recognizedStructure) throw new Error('Vocab Vault形式の単語データが見つかりません。');
    return out;
  }

  const safeParseWords = (raw, defL = 'en') => { try { return parseAnyWords(raw, defL, false); } catch { return { en:[], fr:[], de:[], es:[], it:[], pt:[], nl:[], zh:[], ko:[], ja:[] }; } };

  const Storage = {
    dbInst: null,
    dbReadyPromise: null,
    bc: null,
    idbOnlyMode: true, // IndexedDB をプライマリストレージとする
    storageError: false,
    migratedFromLs: false,
    loadFailed: {},
    mem: {},
    tombstones: {},
    clearedAt: {}
  };

  const _warn = (...args) => typeof console !== 'undefined' && console.warn && console.warn(...args);
  const _log = (...args) => typeof console !== 'undefined' && console.log && console.log(...args);

  // --- IndexedDB の初期化 & 永続化要請 ---
  function initDatabase() {
    if (Storage.dbReadyPromise) return Storage.dbReadyPromise;
    if (typeof indexedDB === 'undefined') {
      _warn('[Storage] IndexedDB not supported; falling back to memory/LocalStorage');
      return Promise.resolve(null);
    }

    Storage.dbReadyPromise = new Promise(resolve => {
      try {
        const req = indexedDB.open('VocabVaultDB', 2);
        req.onupgradeneeded = e => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('vaults')) {
            db.createObjectStore('vaults');
          }
        };
        req.onsuccess = async e => {
          Storage.dbInst = e.target.result;
          // iOS Safari等のパージ対策: 永続化ストレージ要求
          if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
            navigator.storage.persist().catch(() => {});
          }
          // 初回マイグレーション（LocalStorage -> IndexedDB）
          await migrateFromLocalStorageIfNeeded();
          resolve(Storage.dbInst);
        };
        req.onerror = () => {
          _warn('[Storage] IndexedDB open error');
          resolve(null);
        };
      } catch (err) {
        _warn('[Storage] IndexedDB init exception:', err);
        resolve(null);
      }
    });

    return Storage.dbReadyPromise;
  }

  // --- LocalStorage と IndexedDB の双方向安全同期 & データ完全復旧 ---
  async function migrateFromLocalStorageIfNeeded() {
    if (!Storage.dbInst || Storage.migratedFromLs) return;
    try {
      const keysToMigrate = new Set(LANG_KEYS.map(l => LANGS[l].key));
      try {
        if (typeof localStorage !== 'undefined' && localStorage.length) {
          for (let i = 0; i < localStorage.length; i++) {
            const lk = localStorage.key(i);
            if (lk && lk.startsWith('distinction_entries')) keysToMigrate.add(lk);
          }
        }
      } catch {}

      for (const k of keysToMigrate) {
        const pair = keyToPair(k);
        const l = pair.srcLang || 'en';
        const idbData = await idbGet(k);
        const rawLs = lsGet(k, '');
        let lsWords = [];
        try { if (rawLs && rawLs !== '[]') lsWords = JSON.parse(rawLs); } catch {}
        
        let idbWords = [];
        if (Array.isArray(idbData)) idbWords = idbData;
        else if (typeof idbData === 'string') {
          try { idbWords = JSON.parse(idbData); } catch {}
        }

        const tMap = getTombstones(k);
        const cAt = getClearedAt(k);
        const filterLive = arr => arr.filter(it => !isTombstoned(it, tMap, k, cAt));
        lsWords = filterLive(lsWords);
        idbWords = filterLive(idbWords);

        // どちらかにある有効な単語を合算・保護（単一ソースでも必ずmergeWords経由でsanitizeItemを実行）
        let merged = [];
        if (lsWords.length || idbWords.length) {
          merged = mergeWords(idbWords, lsWords, k, false, tMap, cAt);
        }

        if (merged.length > 0 || rawLs || (Array.isArray(idbData) && idbData.length > 0)) {
          if (merged.length > 0) _log(`[Storage Recovery] Restored ${merged.length} words for ${k}`);
          Storage.mem[k] = merged;
          await idbPut(k, merged);
          try { localStorage.setItem(k, JSON.stringify(merged)); } catch {}
        }
      }
      Storage.migratedFromLs = true;
    } catch (e) {
      _warn('[Storage Migration Error]', e);
    }
  }

  function lsGet(k, d = '') {
    try {
      const v = localStorage.getItem(k);
      if (v !== null) return v;
      if (k.startsWith('vv_')) {
        const legacy = localStorage.getItem(k.slice(3));
        if (legacy !== null) return legacy;
      } else {
        const prefixed = localStorage.getItem('vv_' + k);
        if (prefixed !== null) return prefixed;
      }
      return d;
    } catch { return d; }
  }

  function lsSet(k, v) {
    try {
      localStorage.setItem(k, v);
      return true;
    } catch {
      return false;
    }
  }

  function getPairConfig(srcLang = 'en', tgtLang = 'ja') {
    const s = String(srcLang || 'en').toLowerCase();
    const t = String(tgtLang || 'ja').toLowerCase();
    // 既存データ（->ja）への後方互換性エイリアス
    if (t === 'ja' && LANGS[s]) {
      return LANGS[s];
    }
    const pairId = `${s}_${t}`;
    return {
      key: `distinction_entries_${pairId}`,
      snap: `vocab_snapshot_${pairId}`,
      tomb: `vv_tombstones_${pairId}`,
      clearKey: `vv_cleared_at_${pairId}`,
      srcLang: s,
      tgtLang: t,
      pairId
    };
  }

  function getPairKey(srcLang = 'en', tgtLang = 'ja') {
    return getPairConfig(srcLang, tgtLang).key;
  }

  function keyToLang(k) {
    if (!k) return 'en';
    const str = String(k).trim().toLowerCase();
    if (LANGS[str]) return str;
    const pairMatch = str.match(/(?:^|_)(en|fr|de|es|it|pt|nl|zh|ko|ja)_(en|fr|de|es|it|pt|nl|zh|ko|ja)$/);
    if (pairMatch) return pairMatch[1];
    const singleMatch = str.match(/(?:entries|snapshot|tombstones|cleared_at)_(en|fr|de|es|it|pt|nl|zh|ko|ja)$/);
    if (singleMatch) return singleMatch[1];
    if (str.includes('_fr') || str.endsWith('_fr') || str.includes('french')) return 'fr';
    if (str.includes('_de') || str.endsWith('_de') || str.includes('german')) return 'de';
    if (str.includes('_es') || str.endsWith('_es') || str.includes('spanish')) return 'es';
    if (str.includes('_it') || str.endsWith('_it') || str.includes('italian')) return 'it';
    if (str.includes('_pt') || str.endsWith('_pt') || str.includes('portuguese')) return 'pt';
    if (str.includes('_nl') || str.endsWith('_nl') || str.includes('dutch')) return 'nl';
    if (str.includes('_zh') || str.endsWith('_zh') || str.includes('chinese')) return 'zh';
    if (str.includes('_ko') || str.endsWith('_ko') || str.includes('korean')) return 'ko';
    if (str.includes('_ja') || str.endsWith('_ja') || str.includes('japanese')) return 'ja';
    return 'en';
  }

  function keyToPair(k) {
    if (!k) return { srcLang: 'en', tgtLang: 'ja' };
    const str = String(k).trim().toLowerCase();
    if (LANGS[str]) return { srcLang: LANGS[str].srcLang, tgtLang: LANGS[str].tgtLang };
    if (str === 'distinction_entries') return { srcLang: 'en', tgtLang: 'ja' };
    for (const lk of LANG_KEYS) {
      if (str === LANGS[lk].key) return { srcLang: LANGS[lk].srcLang, tgtLang: LANGS[lk].tgtLang };
    }
    const directPair = str.match(/^(en|fr|de|es|it|pt|nl|zh|ko|ja)_(en|fr|de|es|it|pt|nl|zh|ko|ja)$/);
    if (directPair) return { srcLang: directPair[1], tgtLang: directPair[2] };
    const m = str.match(/^(?:distinction_entries|vocab_snapshot|vv_tombstones|vv_cleared_at)_([a-z]{2})_([a-z]{2})/);
    if (m && LANGS[m[1]] && LANGS[m[2]]) return { srcLang: m[1], tgtLang: m[2] };
    const sLang = keyToLang(str);
    return { srcLang: sLang, tgtLang: 'ja' };
  }

  function resolveConfig(target) {
    if (!target) return LANGS.en;
    if (typeof target === 'object' && target.key) return target;
    if (typeof target === 'object' && target.srcLang) return getPairConfig(target.srcLang, target.tgtLang || 'ja');
    if (typeof target === 'string') {
      if (LANGS[target]) return LANGS[target];
      if (target.includes('_') && target.length === 5) {
        const [s, t] = target.split('_');
        return getPairConfig(s, t);
      }
      const pair = keyToPair(target);
      return getPairConfig(pair.srcLang, pair.tgtLang);
    }
    return LANGS.en;
  }

  function idbPut(k, v) {
    if (!Storage.dbInst) return Promise.resolve(false);
    return new Promise(res => {
      try {
        const tx = Storage.dbInst.transaction('vaults', 'readwrite');
        tx.objectStore('vaults').put(v, k);
        tx.oncomplete = () => res(true);
        tx.onerror = tx.onabort = () => res(false);
      } catch { res(false); }
    });
  }

  function idbGet(k) {
    if (!Storage.dbInst) return Promise.resolve(null);
    return new Promise(res => {
      try {
        const tx = Storage.dbInst.transaction('vaults', 'readonly');
        const req = tx.objectStore('vaults').get(k);
        req.onsuccess = () => res(req.result ?? null);
        req.onerror = () => res(null);
      } catch { res(null); }
    });
  }

  function idbAddSnap(l, arr) {
    if (!Storage.dbInst) return;
    const cfg = resolveConfig(l);
    try {
      const tx = Storage.dbInst.transaction('vaults', 'readwrite'), st = tx.objectStore('vaults');
      const r = st.put(arr, `${cfg.snap}:${new Date().toISOString().slice(0, 10)}`);
      r.onerror = e => { e.preventDefault(); e.stopPropagation(); };
      const kr = st.getAllKeys(IDBKeyRange.bound(`${cfg.snap}:`, `${cfg.snap}:\uffff`));
      kr.onsuccess = () => {
        const keys = (kr.result || []).map(String).sort();
        while (keys.length > 7) { const oldK = keys.shift(); if (oldK) st.delete(oldK); }
      };
    } catch {}
  }

  function getClearedAt(l = 'en') {
    const cfg = resolveConfig(l), id = cfg.pairId || cfg.key;
    return Storage.clearedAt[id] > 0 ? Storage.clearedAt[id] : (Storage.clearedAt[id] = Number(lsGet(cfg.clearKey, '0')) || 0);
  }

  function saveClearedAt(l = 'en', ts = Date.now()) {
    const cfg = resolveConfig(l), id = cfg.pairId || cfg.key;
    Storage.clearedAt[id] = ts;
    lsSet(cfg.clearKey, String(ts));
    idbPut(cfg.clearKey, ts);
  }

  function absorbTombArray(map, arr) {
    if (!Array.isArray(arr)) return;
    arr.forEach(t => {
      if (t && typeof t.key === 'string' && !t.key.startsWith('fold:') && Number.isFinite(t.deletedAt)) {
        map.set(t.key, Math.max(map.get(t.key) || 0, t.deletedAt));
      }
    });
  }

  const TOMBSTONE_TTL_MS = 90 * 86400000; // 90日間の Tombstone 保持期限（LocalStorage肥大化防止と分散同期整合性の両立）

  function vacuumOldTombstones(l = 'en') {
    const cfg = resolveConfig(l), id = cfg.pairId || cfg.key;
    const map = getTombstones(l);
    const cutoff = Date.now() - TOMBSTONE_TTL_MS;
    let pruned = 0;
    for (const [k, ts] of map.entries()) {
      if (k.startsWith('fold:') || ts < cutoff) {
        map.delete(k);
        pruned++;
      }
    }
    if (pruned > 0) {
      saveTombstones(l, map);
    }
    try {
      if (typeof localStorage !== 'undefined') {
        const cutoffYmd = getTodayString(new Date(Date.now() - TOMBSTONE_TTL_MS));
        const keysToDelete = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (!k) continue;
          const m = k.match(/^vv_(?:ai_gen_daily|ocr_daily|reviewed|rev_count)_(\d{4}-\d{2}-\d{2})$/);
          if (m && m[1] < cutoffYmd) {
            keysToDelete.push(k);
          }
        }
        keysToDelete.forEach(k => localStorage.removeItem(k));
      }
    } catch {}
    return map;
  }

  function getTombstones(l = 'en') {
    const cfg = resolveConfig(l), id = cfg.pairId || cfg.key;
    if (Storage.tombstones[id]) return Storage.tombstones[id];
    const map = new Map();
    try { absorbTombArray(map, JSON.parse(lsGet(cfg.tomb, '[]'))); } catch {}
    Storage.tombstones[id] = map;
    return map;
  }

  function saveTombstones(l = 'en', map = getTombstones(l)) {
    const cfg = resolveConfig(l), id = cfg.pairId || cfg.key;
    const cutoff = Date.now() - TOMBSTONE_TTL_MS;
    const sorted = [...map.entries()].filter(([k, ts]) => !k.startsWith('fold:') && ts >= cutoff).sort((a, b) => b[1] - a[1]).slice(0, 2000);
    Storage.tombstones[id] = new Map(sorted);
    const arr = sorted.map(([key, deletedAt]) => ({ key, deletedAt }));
    lsSet(cfg.tomb, JSON.stringify(arr));
    idbPut(cfg.tomb, arr);
  }

  function recordTombstone(item, l = 'en', deletedAt = Date.now()) {
    const map = getTombstones(l);
    if (item.id) map.set(`id:${item.id}`, deletedAt);
    const sLang = (typeof l === 'string' && l.length === 2) ? l : (resolveConfig(l).srcLang || 'en');
    const mkWk = global.VocabMorphology?.makeWordKey || global.VocabCore?.makeWordKey || ((w, lg) => `${lg}:${String(w || '').trim().toLowerCase()}`);
    const wk = item.wordKey || (item.word ? mkWk(item.word, sLang, item.meanings?.[0]?.pos, item.homographIndex) : '');
    if (wk) map.set(`wk:${wk}`, deletedAt);
    saveTombstones(l, map);
  }

  function isTombstoned(item, tombMap = null, l = 'en', clearedAt = null) {
    if (!item) return false;
    if (item.isDeleted === true) return true;
    const tMap = (tombMap && typeof tombMap.get === 'function') ? tombMap : getTombstones(l);
    const cAt = (Number.isFinite(clearedAt) && clearedAt > 0) ? clearedAt : getClearedAt(l);
    const upd = (Number.isFinite(item.updatedAt) && item.updatedAt > 1) ? item.updatedAt : 0;
    if (cAt > 0 && (upd <= cAt || upd === 0)) return true;
    const delById = item.id ? (tMap.get(`id:${item.id}`) || 0) : 0;
    const sLang = (typeof l === 'string' && l.length === 2) ? l : (resolveConfig(l).srcLang || 'en');
    const mkWk = global.VocabMorphology?.makeWordKey || global.VocabCore?.makeWordKey || ((w, lg) => `${lg}:${String(w || '').trim().toLowerCase()}`);
    const wk = item.wordKey || (item.word ? mkWk(item.word, sLang, item.meanings?.[0]?.pos, item.homographIndex) : '');
    const delByWk = wk ? (tMap.get(`wk:${wk}`) || 0) : 0;
    const maxDel = Math.max(delById, delByWk);
    return maxDel > 0 && (upd === 0 || maxDel >= upd);
  }

  function parseIdbResult(raw, l) {
    const sLang = typeof l === 'string' && l.length === 2 ? l : (resolveConfig(l).srcLang || 'en');
    if (Array.isArray(raw)) {
      return raw.map((it, i) => sanitizeItem(it, i, sLang)).filter(Boolean);
    }
    return safeParseWords(raw, sLang)[sLang] || [];
  }

  /**
   * 3-way merge: base (this tab's last-known state) / local (next) / remote (current IDB).
   * - Remote items present in local          -> HLC merge (local wins ties).
   * - Remote items absent in local AND base  -> added by another tab/worker -> keep.
   * - Remote items absent in local, in base  -> intentionally removed by this tab -> drop.
   * Output preserves local ordering; remote-only additions are appended.
   */
  function threeWayMergeWords(remote, next, base, lOrKey) {
    const idsOf = list => {
      if (list && !Array.isArray(list) && list.ids instanceof Set && list.wks instanceof Set) return list;
      const ids = new Set(), wks = new Set();
      (list || []).forEach(it => {
        if (!it) return;
        if (it.id) ids.add(it.id);
        if (it.wordKey) wks.add(it.wordKey);
      });
      return { ids, wks };
    };
    const has = (set, it) => (it.id && set.ids.has(it.id)) || (it.wordKey && set.wks.has(it.wordKey));
    const localSet = idsOf(next), baseSet = idsOf(base);
    const relevantRemote = remote.filter(r => has(localSet, r) || !has(baseSet, r));
    const merged = relevantRemote.length ? mergeWords(relevantRemote, next, lOrKey, false) : mergeWords([], next, lOrKey, false);
    const order = new Map(), wkOrder = new Map();
    next.forEach((it, i) => {
      if (it?.id && !order.has(it.id)) order.set(it.id, i);
      if (it?.wordKey && !wkOrder.has(it.wordKey)) wkOrder.set(it.wordKey, i);
    });
    const nextById = new Map(next.filter(Boolean).map(it => [it.id, it]));
    const rank = it => (order.has(it.id) ? order.get(it.id)
      : (it.wordKey && wkOrder.has(it.wordKey) ? wkOrder.get(it.wordKey) : Number.MAX_SAFE_INTEGER));
    const sorted = merged
      .map((it, i) => ({ it, i }))
      .sort((a, b) => (rank(a.it) - rank(b.it)) || (a.i - b.i))
      .map(({ it }, i) => ({ ...it, num: i + 1 }));
    const changed = sorted.length !== next.length || sorted.some(it => {
      const loc = nextById.get(it.id);
      return !loc || (Number(loc.version) || 1) !== (Number(it.version) || 1)
        || (loc.updatedAt || 0) !== (it.updatedAt || 0)
        || (Number(loc.reviewUpdatedAt || loc.updatedAt) || 0) !== (Number(it.reviewUpdatedAt || it.updatedAt) || 0);
    });
    return { data: sorted, changed };
  }

  /**
   * @param {string} l storage/pair key
   * @param {Array} next local state to persist
   * @param {boolean} forceOverwrite blind put (no merge). Use only for intentional full replacement.
   * @param {Array|null} baseList this tab's last-known state; enables 3-way merge that prevents
   *   cross-tab lost updates (TOCTOU) without resurrecting items this tab removed.
   */
  function idbCommitLangData(l, next, forceOverwrite = false, baseList = null) {
    if (!Storage.dbInst) return Promise.resolve({ ok: false, data: next, changed: false });
    const cfg = resolveConfig(l);
    return new Promise(res => {
      try {
        const tx = Storage.dbInst.transaction('vaults', 'readwrite'), st = tx.objectStore('vaults');
        let finalData = next, changed = false;
        if (forceOverwrite) {
          st.put(next, cfg.key);
        } else {
          // get + put share one readwrite transaction, which IDB serializes across tabs -> atomic RMW.
          const gMain = st.get(cfg.key);
          gMain.onsuccess = () => {
            const idbWords = parseIdbResult(gMain.result, l);
            if (!idbWords.length) {
              finalData = next;
            } else if (baseList && typeof baseList === 'object') {
              const r = threeWayMergeWords(idbWords, next, baseList, cfg.key);
              finalData = r.data;
              changed = r.changed;
            } else {
              finalData = mergeWords(idbWords, next, cfg.key, false);
              changed = true;
            }
            st.put(finalData, cfg.key);
          };
          gMain.onerror = () => st.put(next, cfg.key);
        }
        tx.oncomplete = () => res({ ok: true, data: finalData, changed });
        tx.onerror = tx.onabort = () => res({ ok: false, data: next, changed: false });
      } catch { res({ ok: false, data: next, changed: false }); }
    });
  }

  function idbFetchLangBundle(l, includeSnaps = false) {
    if (!Storage.dbInst) return Promise.resolve(null);
    const cfg = resolveConfig(l);
    return new Promise(res => {
      try {
        const tx = Storage.dbInst.transaction('vaults', 'readonly'), st = tx.objectStore('vaults');
        const rClear = st.get(cfg.clearKey);
        const rTomb = st.get(cfg.tomb);
        const rMain = st.get(cfg.key);
        const rSnaps = includeSnaps ? st.getAll(IDBKeyRange.bound(`${cfg.snap}:`, `${cfg.snap}:\uffff`)) : null;
        tx.oncomplete = () => res({
          clearAt: Number(rClear.result) || 0,
          tombs: rTomb.result,
          words: parseIdbResult(rMain.result, l),
          snaps: rSnaps ? (rSnaps.result || []) : []
        });
        tx.onerror = tx.onabort = () => res(null);
      } catch { res(null); }
    });
  }

  function deleteWord(idOrNum, langOrKey, getListFn, setListFn, searchAllPairsFn) {
    const list = getListFn ? [...getListFn()] : [];
    const targetIdx = list.findIndex(i => {
      if (typeof idOrNum === 'string' && idOrNum) {
        if (i.id === idOrNum || i.word === idOrNum || i.wordKey === idOrNum) return true;
      }
      const parsedNum = Number(idOrNum);
      return Number.isFinite(parsedNum) && parsedNum > 0 && Number(i.num) === parsedNum;
    });

    if (targetIdx === -1) {
      if (typeof searchAllPairsFn === 'function') return searchAllPairsFn(idOrNum);
      return null;
    }

    const target = list[targetIdx];
    const now = Date.now();
    target.isDeleted = true;
    target.updatedAt = now;
    // [NEW-P0-3 修正] target.lang ('en'等の2文字) ではなく、呼び出し元のペアキー (langOrKey) または target.pair を最優先で渡す
    const tombTargetKey = (langOrKey && String(langOrKey).length > 2)
      ? langOrKey
      : (target.pair || langOrKey || target.lang || 'en');
    recordTombstone(target, tombTargetKey, now);

    const nextList = list.filter((_, idx) => idx !== targetIdx).map((it, idx) => ({ ...it, num: idx + 1 }));
    if (setListFn) setListFn(nextList);
    return target;
  }

  function clearAllWords(lang, curList, setListFn) {
    const now = Date.now();
    const cfg = resolveConfig(lang);
    const sLang = cfg.srcLang || 'en';
    saveClearedAt(lang, now);
    const map = getTombstones(lang);
    (curList || []).forEach(item => {
      if (item.id) map.set(`id:${item.id}`, now);
      const wk = item.wordKey || (global.VocabMorphology?.makeWordKey ? global.VocabMorphology.makeWordKey(item.word, sLang, item.meanings?.[0]?.pos, item.homographIndex) : '');
      if (wk) map.set(`wk:${wk}`, now);
    });
    saveTombstones(lang, map);
    if (setListFn) setListFn([]);
  }

  /**
   * IndexedDBの'vaults'ストア内に存在するすべてのストレージキーを列挙
   */
  function idbGetAllVaultKeys() {
    if (!Storage.dbInst) return Promise.resolve([]);
    return new Promise(res => {
      try {
        const tx = Storage.dbInst.transaction('vaults', 'readonly');
        const st = tx.objectStore('vaults');
        if (typeof st.getAllKeys === 'function') {
          const req = st.getAllKeys();
          req.onsuccess = () => res(req.result || []);
          req.onerror = () => res([]);
        } else {
          const keys = [];
          const req = st.openKeyCursor ? st.openKeyCursor() : st.openCursor();
          req.onsuccess = e => {
            const cursor = e.target.result;
            if (cursor) {
              keys.push(cursor.key);
              cursor.continue();
            } else res(keys);
          };
          req.onerror = () => res(keys);
        }
      } catch { res([]); }
    });
  }

  function invalidateCache(k) {
    if (!k) {
      Storage.mem = {};
      return;
    }
    const cfg = resolveConfig(k);
    delete Storage.mem[k];
    if (cfg?.key) delete Storage.mem[cfg.key];
    if (cfg?.pairId) delete Storage.mem[cfg.pairId];
    if (cfg?.srcLang) delete Storage.mem[cfg.srcLang];
  }

  // --- 起動時同期・サルベージ・他タブ同期 (app.js から移管) ---
  /**
   * ctx: { getJson, setJson, getActivePairKey, getSrcLang, switchSrcLang(l), setEntries(list),
   *        reload(), syncCloud(), flushOffline(), confirm(msg), notify(msg), syncFromIdb(l) }
   */
  function initStorageAndSync(manualSalvage, ctx) {
    const confirmFn = ctx.confirm || (typeof confirm === 'function' ? confirm : () => true);
    const notifyFn = ctx.notify || (typeof alert === 'function' ? alert : () => {});
    if (manualSalvage && !confirmFn('退避スナップショットおよび全ストレージを走査して、過去に削除した単語も含めて救出・統合しますか？')) return Promise.resolve({ ok: false });
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) navigator.storage.persist().catch(() => {});
    if (!Storage.bc && typeof BroadcastChannel !== 'undefined') {
      try {
        Storage.bc = new BroadcastChannel('vocab_vault_sync');
        Storage.bc.onmessage = ev => {
          if (ev.data?.type === 'vault-updated') {
            const rawKey = ev.data.key || ev.data.lang;
            if (rawKey) {
              invalidateCache(rawKey);
              if (typeof ctx.syncFromIdb === 'function') {
                ctx.syncFromIdb(rawKey);
              }
            }
          }
        };
      } catch {}
    }

    if (manualSalvage) {
      Storage.mem = {};
      LANG_KEYS.forEach(l => { saveClearedAt(l, 0); saveTombstones(l, new Map()); });
      // LocalStorage 内の全ペアキーの墓石・ウォーターマークもリセットし、それぞれのペアキーへ救出（異言語ペア混入を防止）
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (!k || !(k.includes('distinction_entries') || k.includes('vocab_snapshot') || k.startsWith('vv_'))) continue;
          if (k.startsWith('distinction_entries')) {
            saveClearedAt(k, 0);
            saveTombstones(k, new Map());
          }
          const val = localStorage.getItem(k);
          if (!val || val === '[]' || val.length <= 5) continue;
          const targetCfg = resolveConfig(k);
          const l = targetCfg.srcLang || keyToLang(k);
          const parsed = safeParseWords(val, l)[l];
          if (!parsed || !parsed.length) continue;
          const targetK = targetCfg.key;
          const cur = ctx.getJson(targetK);
          const rec = mergeWords(cur, parsed, targetK, true);
          if (rec.length > cur.length) {
            Storage.mem[targetK] = rec;
            try { localStorage.setItem(targetK, JSON.stringify(rec)); } catch {}
          }
        }
      } catch {}
    }

    const syncActiveLang = () => {
      ctx.setEntries(ctx.getJson(ctx.getActivePairKey()));
      if (!ctx.getJson(ctx.getActivePairKey()).length) {
        // 現在のペアが空なら、単語が存在する言語に自動フォールバック
        const foundLang = LANG_KEYS.find(l => ctx.getJson(LANGS[l].key).length > 0);
        if (foundLang && foundLang !== ctx.getSrcLang()) {
          ctx.switchSrcLang(foundLang);
          ctx.setEntries(ctx.getJson(LANGS[foundLang].key));
        }
      }
      ctx.reload();
    };
    syncActiveLang();

    // IndexedDB の初期化完了を待機して全ペアデータを完全同期・復元
    return initDatabase().then(async () => {
      try {
        // デフォルト4キーに加え、IndexedDBおよびlocalStorageに存在するすべてのペアキー（en_en, ja_en等）を完全走査
        const idbKeys = await idbGetAllVaultKeys();
        const allKeySet = new Set(LANG_KEYS.map(l => LANGS[l].key));
        idbKeys.forEach(k => {
          if (typeof k === 'string' && k.startsWith('distinction_entries')) allKeySet.add(k);
        });
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (typeof k === 'string' && k.startsWith('distinction_entries')) allKeySet.add(k);
          }
        } catch {}

        await Promise.all(Array.from(allKeySet).map(async k => {
          const cfg = resolveConfig(k);
          const srcL = cfg.srcLang || keyToLang(k);
          const pairId = cfg.pairId || cfg.key;
          const b = await idbFetchLangBundle(k, manualSalvage);
          if (!b) return;
          if (b.clearAt > getClearedAt(k)) Storage.clearedAt[pairId] = b.clearAt;
          if (b.tombs) absorbTombArray(getTombstones(k), b.tombs);

          let idbWords = Array.isArray(b.words) ? b.words : [];
          if (manualSalvage && b.snaps && b.snaps.length) {
            b.snaps.forEach(arr => {
              const sWords = safeParseWords(arr, srcL)[srcL];
              if (sWords && sWords.length) idbWords = mergeWords(idbWords, sWords, k, true);
            });
          }
          // 通常起動時は墓石を尊重 (ignoreTombstones = manualSalvage)
          const merged = mergeWords(ctx.getJson(k), idbWords, k, manualSalvage);
          if (merged.length > 0 || manualSalvage) {
            Storage.mem[k] = merged;
            if (k === LANGS.en.key) Storage.mem.en = merged;
            try { localStorage.setItem(k, JSON.stringify(merged)); } catch {}
            await idbPut(k, merged);
          }
        }));

        syncActiveLang();
        if (ctx.flushOffline) ctx.flushOffline();
        if (ctx.syncCloud) ctx.syncCloud();
        if (manualSalvage) {
          const tot = Array.from(allKeySet).reduce((s, k) => s + ctx.getJson(k).length, 0);
          notifyFn(tot ? `合計 ${tot} 語を検出・復元しました。` : '復元可能なデータは見つかりませんでした。');
        }
      } catch (err) {
        _warn('[Sync Init Error]', err);
      }
      return { ok: true };
    });
  }

  /** 他タブの更新通知を受けて IndexedDB から該当言語・ペアを再同期 */
  async function syncFromIdbForLang(l, ctx) {
    const cfg = resolveConfig(l);
    const k = cfg.key;
    const pairId = cfg.pairId || cfg.key;
    const b = await idbFetchLangBundle(k, false);
    if (!b) return;
    if (b.clearAt > getClearedAt(k)) Storage.clearedAt[pairId] = b.clearAt;
    absorbTombArray(getTombstones(k), b.tombs);
    // srcLang ではなく k を渡し、Storage.mem[srcLang] への誤上書きを排除
    const merged = mergeWords(ctx.getJson(k), b.words, k, false);
    if (k === LANGS.en.key) Storage.mem.en = merged;
    Storage.mem[k] = merged;
    try { localStorage.setItem(k, JSON.stringify(merged)); } catch {}
    ctx.applyMerged(k, merged);
  }

  // --- 【項目6・9解決】日次AIクォータ管理 & トークン削減メトリクス ---
  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function getTodayString(date) {
    const d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function calendarDayDiff(fromYmd, toYmd) {
    const parse = (s) => {
      const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) return NaN;
      return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    };
    const a = parse(fromYmd);
    const b = parse(toYmd);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return NaN;
    return Math.round((b - a) / 86400000);
  }

  function getDailyAiUsageInfo(options = {}) {
    const today = getTodayString();
    const lsGetFn = options.lsGet || lsGet;
    const app = options.appState || global.App || {};
    const used = parseInt(lsGetFn(`vv_ai_gen_daily_${today}`, '0'), 10) || 0;
    const isPro = Boolean(app.isPro || options.isPro || (global.VocabSync?.isPro?.()));
    const isDev = Boolean(app.isDev || options.isDev);
    const getKeyFn = global.getKey || (() => '');
    const isByok = Boolean(getKeyFn());

    const isUnlimited = isPro || isDev || isByok;
    const limit = 5;
    let remaining = isUnlimited ? 9999 : Math.max(0, limit - used);

    if (!isUnlimited && app.quotaRemaining !== undefined && app.quotaRemaining !== null) {
      remaining = Math.min(remaining, app.quotaRemaining);
    }

    return {
      limit,
      used,
      count: used,
      remaining,
      isUnlimited,
      isPro,
      isDev,
      today
    };
  }

  function recordAiGenerationUsage(count = 1, options = {}) {
    const today = getTodayString();
    const lsGetFn = options.lsGet || lsGet;
    const lsSetFn = options.lsSet || lsSet;
    const cur = parseInt(lsGetFn(`vv_ai_gen_daily_${today}`, '0'), 10) || 0;
    const next = cur + Math.max(0, parseInt(count, 10) || 1);
    lsSetFn(`vv_ai_gen_daily_${today}`, String(next));

    const app = options.appState || global.App || {};
    if (app.quotaRemaining !== undefined && app.quotaRemaining !== null && !app.isPro && !app.isDev) {
      app.quotaRemaining = Math.max(0, app.quotaRemaining - count);
    }

    return getDailyAiUsageInfo(options);
  }

  function recordMetricsEvent(type, count = 1, options = {}) {
    const lsGetFn = options.lsGet || lsGet;
    const lsSetFn = options.lsSet || lsSet;
    const c = Math.max(0, parseInt(count, 10) || 1);

    const totalWords = (parseInt(lsGetFn('vv_metric_total_words', '0'), 10) || 0) + c;
    lsSetFn('vv_metric_total_words', String(totalWords));

    if (type === 'cache_hit') {
      const cacheHits = (parseInt(lsGetFn('vv_metric_cache_hits', '0'), 10) || 0) + c;
      lsSetFn('vv_metric_cache_hits', String(cacheHits));
      const tokensSaved = (parseInt(lsGetFn('vv_metric_tokens_saved', '0'), 10) || 0) + (c * 800);
      lsSetFn('vv_metric_tokens_saved', String(tokensSaved));
    } else if (type === 'on_device') {
      const onDev = (parseInt(lsGetFn('vv_metric_on_device', '0'), 10) || 0) + c;
      lsSetFn('vv_metric_on_device', String(onDev));
      const tokensSaved = (parseInt(lsGetFn('vv_metric_tokens_saved', '0'), 10) || 0) + (c * 800);
      lsSetFn('vv_metric_tokens_saved', String(tokensSaved));
    } else if (type === 'ai_gen') {
      const cloudGen = (parseInt(lsGetFn('vv_metric_cloud_gen', '0'), 10) || 0) + c;
      lsSetFn('vv_metric_cloud_gen', String(cloudGen));
    }
  }

  function getMetricsSummary(options = {}) {
    const lsGetFn = options.lsGet || lsGet;
    const totalWords = parseInt(lsGetFn('vv_metric_total_words', '0'), 10) || 0;
    const cacheHits = parseInt(lsGetFn('vv_metric_cache_hits', '0'), 10) || 0;
    const onDevice = parseInt(lsGetFn('vv_metric_on_device', '0'), 10) || 0;
    const cloudGen = parseInt(lsGetFn('vv_metric_cloud_gen', '0'), 10) || 0;
    const tokensSaved = parseInt(lsGetFn('vv_metric_tokens_saved', '0'), 10) || 0;
    const cacheRate = totalWords > 0 ? Math.round(((cacheHits + onDevice) / totalWords) * 100) : 0;

    return {
      totalWords,
      cacheHits,
      onDevice,
      cloudGen,
      tokensSaved,
      cacheRate
    };
  }

  function idbClearAll() {
    Storage.mem = {};
    Storage.tombstones = {};
    Storage.clearedAt = {};
    if (!Storage.dbInst) return Promise.resolve(false);
    return new Promise(res => {
      try {
        const tx = Storage.dbInst.transaction('vaults', 'readwrite');
        tx.objectStore('vaults').clear();
        tx.oncomplete = () => res(true);
        tx.onerror = tx.onabort = () => res(false);
      } catch { res(false); }
    });
  }

  global.VocabStorage = {
    LANGS,
    LANG_KEYS,
    CATS,
    state: Storage,
    initDatabase,
    idbClearAll,
    lsGet,
    lsSet,
    keyToLang,
    keyToPair,
    getPairConfig,
    getPairKey,
    resolveConfig,
    getClearedAt,
    saveClearedAt,
    absorbTombArray,
    getTombstones,
    saveTombstones,
    vacuumOldTombstones,
    TOMBSTONE_TTL_MS,
    recordTombstone,
    isTombstoned,
    sanitizeItem,
    mergeWords,
    parseAnyWords,
    safeParseWords,
    deleteWord,
    clearAllWords,
    invalidateCache,
    initStorageAndSync,
    syncFromIdbForLang,
    idbPut,
    idbGet,
    idbAddSnap,
    idbCommitLangData,
    threeWayMergeWords,
    idbFetchLangBundle,
    getTodayString,
    calendarDayDiff,
    getDailyAiUsageInfo,
    recordAiGenerationUsage,
    recordMetricsEvent,
    getMetricsSummary,
    cleanPho,
    fmtPho,
    WIKT_URL_RE,
    sanitizeWiktUrl
  };

  // 即時初期化開始
  if (typeof window !== 'undefined') {
    initDatabase();
  }

  global.lsGet = global.lsGet || lsGet;
  global.lsSet = global.lsSet || lsSet;
  global.sanitizeItem = global.sanitizeItem || sanitizeItem;
  global.mergeWords = global.mergeWords || mergeWords;
  global.parseAnyWords = global.parseAnyWords || parseAnyWords;
  global.safeParseWords = global.safeParseWords || safeParseWords;
})(typeof window !== 'undefined' ? window : globalThis);
