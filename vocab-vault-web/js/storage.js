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
      for (const l of LANG_KEYS) {
        const k = LANGS[l].key;
        const idbData = await idbGet(k);
        const rawLs = lsGet(k, '');
        let lsWords = [];
        try { if (rawLs && rawLs !== '[]') lsWords = JSON.parse(rawLs); } catch {}
        
        let idbWords = [];
        if (Array.isArray(idbData)) idbWords = idbData;
        else if (typeof idbData === 'string') {
          try { idbWords = JSON.parse(idbData); } catch {}
        }

        const tMap = getTombstones(l);
        const cAt = getClearedAt(l);
        const filterLive = arr => arr.filter(it => !isTombstoned(it, tMap, l, cAt));
        lsWords = filterLive(lsWords);
        idbWords = filterLive(idbWords);

        // どちらかにある有効な単語を合算・保護
        let merged = [];
        if (lsWords.length && idbWords.length) {
          merged = global.VocabCore?.mergeWords ? global.VocabCore.mergeWords(idbWords, lsWords, l, false, tMap, cAt) : (idbWords.length >= lsWords.length ? idbWords : lsWords);
        } else if (idbWords.length) {
          merged = idbWords;
        } else if (lsWords.length) {
          merged = lsWords;
        }

        if (merged.length > 0) {
          _log(`[Storage Recovery] Restored ${merged.length} ${l} words`);
          Storage.mem[k] = merged;
          Storage.mem[l] = merged;
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

  function getTombstones(l = 'en') {
    const cfg = resolveConfig(l), id = cfg.pairId || cfg.key;
    if (Storage.tombstones[id]) return Storage.tombstones[id];
    const map = new Map();
    try { absorbTombArray(map, JSON.parse(lsGet(cfg.tomb, '[]'))); } catch {}
    return (Storage.tombstones[id] = map);
  }

  function saveTombstones(l = 'en', map = getTombstones(l)) {
    const cfg = resolveConfig(l), id = cfg.pairId || cfg.key;
    const cutoff = Date.now() - 180 * 86400000;
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
    const normW = String(item.word || '').trim().toLowerCase();
    if (normW) map.set(`word:${normW}`, deletedAt);
    saveTombstones(l, map);
  }

  function isTombstoned(item, tombMap, l = 'en', clearedAt = getClearedAt(l)) {
    // updatedAt が未設定または無効な場合は過去のデータ(0)とし、現在時刻(Date.now())にフォールバックして削除マーカーを突破させない
    const upd = (Number.isFinite(item.updatedAt) && item.updatedAt > 1) ? item.updatedAt : 0;
    if (clearedAt > 0 && (upd <= clearedAt || upd === 0)) return true;
    const delById = item.id ? (tombMap.get(`id:${item.id}`) || 0) : 0;
    const sLang = (typeof l === 'string' && l.length === 2) ? l : (resolveConfig(l).srcLang || 'en');
    const wk = item.wordKey || (global.VocabCore?.makeWordKey ? global.VocabCore.makeWordKey(item.word, sLang, item.meanings?.[0]?.pos, item.homographIndex) : '');
    const delByWk = wk ? (tombMap.get(`wk:${wk}`) || 0) : 0;
    const normW = String(item.word || '').trim().toLowerCase();
    const delByWord = normW ? (tombMap.get(`word:${normW}`) || 0) : 0;
    const maxDel = Math.max(delById, delByWk, delByWord);
    return maxDel > 0 && (upd === 0 || maxDel >= upd);
  }

  function parseIdbResult(raw, l) {
    const sLang = typeof l === 'string' && l.length === 2 ? l : (resolveConfig(l).srcLang || 'en');
    if (global.safeParseWords) return global.safeParseWords(raw, sLang)[sLang] || [];
    if (global.VocabCore?.safeParseWords) return global.VocabCore.safeParseWords(raw, sLang)[sLang] || [];
    try {
      const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(p)) return p;
      if (p && typeof p === 'object') {
        if (Array.isArray(p[sLang])) return p[sLang];
        if (p.data && Array.isArray(p.data[sLang])) return p.data[sLang];
      }
    } catch {}
    return [];
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
            finalData = idbWords.length && global.VocabCore?.mergeWords ? global.VocabCore.mergeWords(idbWords, next, cfg.srcLang || l, false) : next;
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

  global.VocabStorage = {
    LANGS,
    LANG_KEYS,
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
    recordTombstone,
    isTombstoned,
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
})(typeof window !== 'undefined' ? window : globalThis);
