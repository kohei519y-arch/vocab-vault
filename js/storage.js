/**
 * Vocab Vault — Storage & Tombstone Module (js/storage.js)
 * 本番仕様: IndexedDB を SSOT（単一の信頼できる情報源）とする堅牢アーキテクチャ
 * LocalStorage 5MB上限 & iOS Safari 7日間パージ耐性、アトミックマイグレーション
 */
(function (global) {
  'use strict';

  const LANGS = {
    en: { key: 'distinction_entries', snap: 'vocab_snapshot_en', tomb: 'vv_tombstones_en', clearKey: 'vv_cleared_at_en' },
    fr: { key: 'distinction_entries_fr', snap: 'vocab_snapshot_fr', tomb: 'vv_tombstones_fr', clearKey: 'vv_cleared_at_fr' },
    de: { key: 'distinction_entries_de', snap: 'vocab_snapshot_de', tomb: 'vv_tombstones_de', clearKey: 'vv_cleared_at_de' },
    ja: { key: 'distinction_entries_ja', snap: 'vocab_snapshot_ja', tomb: 'vv_tombstones_ja', clearKey: 'vv_cleared_at_ja' }
  };
  const LANG_KEYS = Object.keys(LANGS);

  const CATS = ["政治・国際関係","歴史・考古学","言語・コミュニケーション","経済・金融","社会・移民","数学・統計","科学・テクノロジー","医療・健康","環境・自然・生物","芸術・文学・文化","法律・司法","教育・学校","心理学・精神","哲学・宗教","ビジネス・経営","IT・コンピューター","メディア・報道","スポーツ・エンタメ","交通・インフラ","地理・地学・宇宙","建築・都市計画","農業・食料・料理","日常生活・服飾","感情・性格","人間関係・家族","動作・行為","状態・性質","時間・空間・頻度","抽象概念・論理","その他"];
  const ETY_CONF_ENUM = ["certain", "probable", "disputed", "unknown"];
  const WIKT_URL_RE = /^https:\/\/[a-z0-9-]+\.wiktionary\.org\/wiki\/[^\s"<>`'\\]+$/i;
  const sanitizeWiktUrl = url => (typeof url === 'string' && WIKT_URL_RE.test(url.trim())) ? url.trim() : undefined;
  const cleanPho = p => String(p ?? '').replace(/^[\[/\s]+/, '').replace(/[\]/\s]+$/, '').trim();
  const genId = () => 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);

  function sanitizeItem(raw, idx, defLang = 'en') {
    if (!raw || typeof raw !== 'object') return null;
    const w = String(raw.word || raw.w || '').trim().normalize('NFC');
    if (!w) return null;
    const l = LANGS[raw.lang] ? raw.lang : defLang;
    const rawMeanings = raw.meanings || raw.m;
    const meanings = (Array.isArray(rawMeanings) ? rawMeanings : []).filter(Boolean).map(m => ({
      pos: String(m.pos || m.p || ''),
      text: String(m.text || m.t || '')
    }));
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
      interval: Number(raw.interval) || 0,
      repetition: Number(raw.repetition) || 0,
      efactor: Number(raw.efactor) || 2.5,
      nextReview: Number(raw.nextReview) || Date.now(),
      reviewUpdatedAt: Number(raw.reviewUpdatedAt) || Number(raw.review_updated_at) || 0,
      isDeleted: Boolean(raw.isDeleted || raw.is_deleted),
      flags: Array.isArray(raw.flags) ? raw.flags.map(String) : [],
      gen: raw.gen && typeof raw.gen === 'object' ? { model: String(raw.gen.model || ''), pv: String(raw.gen.pv || ''), at: Number(raw.gen.at) || 0 } : undefined,
      updatedAt: Number.isFinite(parsedUpd) && parsedUpd > 0 ? parsedUpd : 1
    };
  }

  function mergeWords(arrA, arrB, l = 'en', ignoreTombstones = false, customTombMap = null, customClearedAt = null) {
    const tombMap = ignoreTombstones ? new Map() : (customTombMap || getTombstones(l));
    const clearedAt = ignoreTombstones ? 0 : (customClearedAt !== null ? customClearedAt : getClearedAt(l));
    const byId = new Map(), wkToId = new Map();
    const makeWordKey = global.VocabMorphology?.makeWordKey || ((word, lang, pos, hIdx) => `${lang}:${word}`);

    [arrA, arrB].forEach(list => (Array.isArray(list) ? list : []).forEach((raw, idx) => {
      const it = sanitizeItem(raw, idx, l);
      if (!it || (!ignoreTombstones && isTombstoned(it, tombMap, l, clearedAt))) return;
      const wk = it.wordKey || makeWordKey(it.word, l, it.meanings?.[0]?.pos, it.homographIndex);
      it.wordKey = wk;
      const existingId = byId.has(it.id) ? it.id : wkToId.get(wk);
      if (!existingId) {
        byId.set(it.id, it);
        wkToId.set(wk, it.id);
      } else {
        const ex = byId.get(existingId);
        // カード情報・メタデータは updatedAt が新しい方を採用
        const itWins = (it.updatedAt || 0) >= (ex.updatedAt || 0);
        const win = itWins ? it : ex, lose = itWins ? ex : it;

        // SRS復習進捗（暗記データ）は reviewUpdatedAt が新しい方を独立して採用
        const itRevTime = Number(it.reviewUpdatedAt || it.updatedAt) || 0;
        const exRevTime = Number(ex.reviewUpdatedAt || ex.updatedAt) || 0;
        const revWins = itRevTime >= exRevTime;
        const revWin = revWins ? it : ex, revLose = revWins ? ex : it;

        const merged = {
          ...lose, ...win,
          id: ex.id || it.id,
          folder: win.folder || lose.folder,
          wiktGrounded: win.wiktGrounded || lose.wiktGrounded,
          wiktUrl: win.wiktUrl || lose.wiktUrl,
          etymologyTags: win.etymologyTags?.length ? win.etymologyTags : lose.etymologyTags,
          updatedAt: Math.max(win.updatedAt || 1, lose.updatedAt || 1),
          // SRS フィールドの独立マージ
          interval: revWin.interval !== undefined ? revWin.interval : revLose.interval,
          repetition: revWin.repetition !== undefined ? revWin.repetition : revLose.repetition,
          efactor: revWin.efactor !== undefined ? revWin.efactor : revLose.efactor,
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
    const out = { en:[], fr:[], de:[], ja:[] };
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
        if (!Array.isArray(src[k])) return;
        recognizedStructure = true;
        const targetLang = (typeof k === 'string' && k.length === 2 && LANGS[k]) ? k : (keyToLang(k) || defL);
        const parsedItems = [];
        src[k].forEach((it, idx) => {
          const w = it ? (it.word || it.w) : null;
          const hasData = it ? (it.meanings || it.m || it.etymology || it.e) : null;
          if (typeof w === 'string' && hasData) {
            const itemLang = LANGS[it.lang] ? it.lang : targetLang;
            const c = sanitizeItem(it, idx, itemLang);
            if (c) parsedItems.push(c);
          }
        });
        out[k] = parsedItems;
        if (LANGS[targetLang] && !out[targetLang]) out[targetLang] = parsedItems;
      });
    }
    if (strict && !recognizedStructure) throw new Error('Vocab Vault形式の単語データが見つかりません。');
    return out;
  }

  const safeParseWords = (raw, defL = 'en') => { try { return parseAnyWords(raw, defL, false); } catch { return { en:[], fr:[], de:[], ja:[] }; } };

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

        // どちらかにある有効な単語を合算・保護
        let merged = [];
        if (lsWords.length && idbWords.length) {
          merged = mergeWords(idbWords, lsWords, l, false, tMap, cAt);
        } else if (idbWords.length) {
          merged = idbWords;
        } else if (lsWords.length) {
          merged = lsWords;
        }

        if (merged.length > 0) {
          _log(`[Storage Recovery] Restored ${merged.length} words for ${k}`);
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
    // 既存データ（en->ja, fr->ja, de->ja）への後方互換性エイリアス
    if (t === 'ja' && (s === 'en' || s === 'fr' || s === 'de')) {
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
    const str = String(k);
    if (str.includes('_fr') || str.endsWith('_fr') || str.includes('french')) return 'fr';
    if (str.includes('_de') || str.endsWith('_de') || str.includes('german')) return 'de';
    if (str.includes('_ja') || str.endsWith('_ja') || str.includes('japanese')) return 'ja';
    const m = str.match(/(?:entries|snapshot|tombstones|cleared_at)_([a-z]{2})/);
    if (m && LANGS[m[1]]) return m[1];
    return 'en';
  }

  function keyToPair(k) {
    if (!k) return { srcLang: 'en', tgtLang: 'ja' };
    const str = String(k);
    if (str === 'distinction_entries') return { srcLang: 'en', tgtLang: 'ja' };
    if (str === 'distinction_entries_fr') return { srcLang: 'fr', tgtLang: 'ja' };
    if (str === 'distinction_entries_de') return { srcLang: 'de', tgtLang: 'ja' };
    if (str === 'distinction_entries_ja') return { srcLang: 'ja', tgtLang: 'ja' };
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
      const r = st.add(arr, `${cfg.snap}:${new Date().toISOString().slice(0, 10)}`);
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
    const wk = item.wordKey || (global.VocabCore?.makeWordKey ? global.VocabCore.makeWordKey(item.word, sLang, item.meanings?.[0]?.pos, item.homographIndex) : '');
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
    const wk = item.wordKey || (global.VocabCore?.makeWordKey ? global.VocabCore.makeWordKey(item.word, sLang, item.meanings?.[0]?.pos, item.homographIndex) : '');
    const delByWk = wk ? (tMap.get(`wk:${wk}`) || 0) : 0;
    const maxDel = Math.max(delById, delByWk);
    return maxDel > 0 && (upd === 0 || maxDel >= upd);
  }

  function parseIdbResult(raw, l) {
    const sLang = typeof l === 'string' && l.length === 2 ? l : (resolveConfig(l).srcLang || 'en');
    return safeParseWords(raw, sLang)[sLang] || [];
  }

  function idbCommitLangData(l, next, forceOverwrite = false) {
    if (!Storage.dbInst) return Promise.resolve({ ok: false, data: next });
    const cfg = resolveConfig(l);
    return new Promise(res => {
      try {
        const tx = Storage.dbInst.transaction('vaults', 'readwrite'), st = tx.objectStore('vaults');
        let finalData = next;
        if (forceOverwrite) {
          st.put(next, cfg.key);
        } else {
          const gMain = st.get(cfg.key);
          gMain.onsuccess = () => {
            const idbWords = parseIdbResult(gMain.result, l);
            finalData = idbWords.length ? mergeWords(idbWords, next, cfg.srcLang || l, false) : next;
            st.put(finalData, cfg.key);
          };
          gMain.onerror = () => st.put(next, cfg.key);
        }
        tx.oncomplete = () => res({ ok: true, data: finalData });
        tx.onerror = tx.onabort = () => res({ ok: false, data: next });
      } catch { res({ ok: false, data: next }); }
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

  function deleteWord(idOrNum, lang, getListFn, setListFn, searchAllPairsFn) {
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
    recordTombstone(target, target.lang || lang, now);

    const nextList = list.filter((_, idx) => idx !== targetIdx).map((it, idx) => ({ ...it, num: idx + 1 }));
    if (setListFn) setListFn(nextList);
    return target;
  }

  function clearAllWords(lang, curList, setListFn) {
    const now = Date.now();
    saveClearedAt(lang, now);
    const map = getTombstones(lang);
    (curList || []).forEach(item => {
      if (item.id) map.set(`id:${item.id}`, now);
      const wk = item.wordKey || (global.VocabMorphology?.makeWordKey ? global.VocabMorphology.makeWordKey(item.word, lang, item.meanings?.[0]?.pos, item.homographIndex) : '');
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
            if (rawKey && typeof ctx.syncFromIdb === 'function') {
              ctx.syncFromIdb(rawKey);
            }
          }
        };
      } catch {}
    }

    if (manualSalvage) {
      Storage.mem.en = Storage.mem.fr = Storage.mem.de = null;
      LANG_KEYS.forEach(l => { saveClearedAt(l, 0); saveTombstones(l, new Map()); });
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) {
            const ext = safeParseWords(lsGet(k), keyToLang(k));
            LANG_KEYS.forEach(l => { if (ext[l].length) ctx.setJson(LANGS[l].key, mergeWords(ctx.getJson(LANGS[l].key), ext[l], l, true), true, true); });
          }
        }
      } catch {}
      // LocalStorage 全キーから過去の単語（スナップショットや旧キー含む）を事前救出
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (!k || !(k.includes('distinction_entries') || k.includes('vocab_snapshot') || k.startsWith('vv_'))) continue;
          const val = localStorage.getItem(k);
          if (!val || val === '[]' || val.length <= 5) continue;
          const l = keyToLang(k);
          const parsed = safeParseWords(val, l)[l];
          if (!parsed || !parsed.length) continue;
          const targetK = resolveConfig(k).key;
          const cur = ctx.getJson(targetK);
          const rec = mergeWords(cur, parsed, l, true);
          if (rec.length > cur.length) {
            _log(`[Manual Salvage] Rescued ${rec.length - cur.length} words for ${l} from key "${k}"`);
            Storage.mem[targetK] = rec;
            Storage.mem[l] = rec;
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
          const b = await idbFetchLangBundle(srcL, manualSalvage);
          if (!b) return;
          if (b.clearAt > getClearedAt(srcL)) Storage.clearedAt[srcL] = b.clearAt;
          if (b.tombs) absorbTombArray(getTombstones(srcL), b.tombs);

          let idbWords = Array.isArray(b.words) ? b.words : [];
          if (manualSalvage && b.snaps && b.snaps.length) {
            b.snaps.forEach(arr => {
              const sWords = safeParseWords(arr, srcL)[srcL];
              if (sWords && sWords.length) idbWords = mergeWords(idbWords, sWords, srcL, true);
            });
          }
          // 通常起動時は墓石を尊重 (ignoreTombstones = manualSalvage)
          const merged = mergeWords(ctx.getJson(k), idbWords, srcL, manualSalvage);
          if (merged.length > 0 || manualSalvage) {
            Storage.mem[k] = merged;
            if (srcL === 'en' && k === LANGS.en.key) Storage.mem.en = merged;
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
    const srcLang = cfg.srcLang || keyToLang(k);
    const b = await idbFetchLangBundle(srcLang, false);
    if (!b) return;
    if (b.clearAt > getClearedAt(srcLang)) Storage.clearedAt[srcLang] = b.clearAt;
    absorbTombArray(getTombstones(srcLang), b.tombs);
    const merged = mergeWords(ctx.getJson(k), b.words, srcLang, false);
    Storage.mem[srcLang] = merged;
    Storage.mem[k] = merged;
    try { localStorage.setItem(k, JSON.stringify(merged)); } catch {}
    ctx.applyMerged(k, merged);
  }

  global.VocabStorage = {
    LANGS,
    LANG_KEYS,
    CATS,
    state: Storage,
    initDatabase,
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
    initStorageAndSync,
    syncFromIdbForLang,
    idbPut,
    idbGet,
    idbAddSnap,
    idbCommitLangData,
    idbFetchLangBundle
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
