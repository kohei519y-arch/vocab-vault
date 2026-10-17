/**
 * Vocab Vault — Supabase Sync & Proxy Module (js/sync.js)
 */
(function (global) {
  'use strict';

  const SUPABASE_URL_KEY = 'vv_sb_url';
  const SUPABASE_ANON_KEY = 'vv_sb_anon_key';
  const SUPABASE_SESSION_KEY = 'vv_sb_session';
  const LAST_SYNC_PREFIX = 'vv_last_sync_';

  function safeLsGet(k, d = '') {
    try { return localStorage.getItem(k) ?? d; } catch { return d; }
  }
  function safeLsSet(k, v) {
    try { localStorage.setItem(k, v); return true; } catch { return false; }
  }
  function safeLsRemove(k) {
    try { localStorage.removeItem(k); } catch {}
  }

  function computeDeltaSyncState({
    lang,
    localEntries,
    localTombMap,
    localClearedAt,
    remoteEntries,
    remoteTombstones,
    remoteClearedAt,
    lastSyncAt,
    mergeWordsFn,
    isTombstonedFn,
    makeWordKeyFn
  }) {
    const mergedClearedAt = Math.max(Number(localClearedAt) || 0, Number(remoteClearedAt) || 0);

    const mergedTombMap = new Map(localTombMap);
    (Array.isArray(remoteTombstones) ? remoteTombstones : []).forEach(t => {
      if (t && typeof t.key === 'string' && Number.isFinite(t.deletedAt)) {
        const prev = mergedTombMap.get(t.key) || 0;
        if (t.deletedAt > prev) mergedTombMap.set(t.key, t.deletedAt);
      }
    });

    const remoteUpdById = new Map();
    const remoteUpdByWk = new Map();
    const remoteRevUpdById = new Map();
    const remoteRevUpdByWk = new Map();
    const remoteVerById = new Map();
    const remoteVerByWk = new Map();
    (Array.isArray(remoteEntries) ? remoteEntries : []).forEach(r => {
      if (!r) return;
      const wk = r.wordKey || makeWordKeyFn(r.word, lang, r.meanings?.[0]?.pos, r.homographIndex);
      const rUpd = Number(r.updatedAt) || 1;
      const rRevUpd = Number(r.reviewUpdatedAt) || 0;
      const rVer = Number(r.version) || 1;
      if (r.id) {
        remoteUpdById.set(r.id, rUpd);
        remoteRevUpdById.set(r.id, rRevUpd);
        remoteVerById.set(r.id, rVer);
      }
      if (wk) {
        remoteUpdByWk.set(wk, rUpd);
        remoteRevUpdByWk.set(wk, rRevUpd);
        remoteVerByWk.set(wk, rVer);
      }
    });

    const mergedEntries = mergeWordsFn(
      localEntries,
      remoteEntries,
      lang,
      false,
      mergedTombMap,
      mergedClearedAt
    );

    const entriesToPush = mergedEntries.filter(it => {
      const localUpd = Number(it.updatedAt) || 1;
      const localRevUpd = Number(it.reviewUpdatedAt) || 0;
      const localMaxTs = Math.max(localUpd, localRevUpd);
      const localVer = Number(it.version) || 1;

      const rUpd = Math.max(remoteUpdById.get(it.id) || 0, remoteUpdByWk.get(it.wordKey) || 0);
      const rRevUpd = Math.max(remoteRevUpdById.get(it.id) || 0, remoteRevUpdByWk.get(it.wordKey) || 0);
      const rVer = Math.max(remoteVerById.get(it.id) || 1, remoteVerByWk.get(it.wordKey) || 1);

      // 項目23: 論理クロック (Lamport Version) がリモートより進んでいる場合も確実にPush
      const hasVersionUpdate = localVer > rVer;
      const hasContentUpdate = localUpd > rUpd || hasVersionUpdate;
      const hasReviewUpdate = localRevUpd > rRevUpd;

      if (localMaxTs <= lastSyncAt && !hasVersionUpdate) return false;

      return (hasContentUpdate || hasReviewUpdate) && !isTombstonedFn(it, mergedTombMap, lang, mergedClearedAt);
    });

    const remoteTombLookup = new Map(
      (Array.isArray(remoteTombstones) ? remoteTombstones : []).map(t => [t.key, t.deletedAt])
    );
    const tombstonesToPush = [];
    mergedTombMap.forEach((deletedAt, key) => {
      if (deletedAt > lastSyncAt && deletedAt > (remoteTombLookup.get(key) || 0)) {
        tombstonesToPush.push({ key, deletedAt });
      }
    });

    return {
      mergedEntries,
      mergedTombMap,
      mergedClearedAt,
      entriesToPush,
      tombstonesToPush,
      watermarkNeedsPush: mergedClearedAt > (Number(remoteClearedAt) || 0)
    };
  }

  const DEFAULT_SUPABASE_URL = 'https://adeujoftwnoognfnyfuw.supabase.co';
  const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_PrZyawrfpRMWWl03AeHsDg_zi04RgG2';

  // 項目25: オフライン復習キューと定期同期の衝突を防ぐアトミックトランザクションロック
  let _syncMutex = Promise.resolve();

  async function acquireSyncLock(taskFn) {
    let release;
    const nextLock = new Promise(resolve => { release = resolve; });
    const currentLock = _syncMutex;
    _syncMutex = _syncMutex.then(() => nextLock);

    await currentLock;
    try {
      return await taskFn();
    } finally {
      release();
    }
  }

  function getConfig() {
    const url = (safeLsGet(SUPABASE_URL_KEY, '') || DEFAULT_SUPABASE_URL).trim().replace(/\/+$/, '');
    const anonKey = (safeLsGet(SUPABASE_ANON_KEY, '') || DEFAULT_SUPABASE_ANON_KEY).trim();
    return { url, anonKey, configured: Boolean(url && anonKey && /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) };
  }

  function saveConfig(url, anonKey) {
    safeLsSet(SUPABASE_URL_KEY, String(url || '').trim().replace(/\/+$/, ''));
    safeLsSet(SUPABASE_ANON_KEY, String(anonKey || '').trim());
  }

  function getSession() {
    try {
      const raw = safeLsGet(SUPABASE_SESSION_KEY, '');
      if (!raw) return null;
      const s = JSON.parse(raw);
      return (s && s.access_token && s.user?.id) ? s : null;
    } catch { return null; }
  }

  function setSession(session) {
    if (!session) safeLsRemove(SUPABASE_SESSION_KEY);
    else safeLsSet(SUPABASE_SESSION_KEY, JSON.stringify(session));
  }

  function isCloudReady() {
    return getConfig().configured && Boolean(getSession());
  }

  function isProxyReady() {
    return getConfig().configured;
  }

  let _refreshPromise = null;

  async function ensureValidToken() {
    const cfg = getConfig();
    let sess = getSession();
    if (!cfg.configured || !sess) return null;
    const nowSec = Math.floor(Date.now() / 1000);
    if (sess.expires_at && sess.expires_at - nowSec > 60) {
      return sess.access_token;
    }
    if (!sess.refresh_token) return sess.access_token;

    if (_refreshPromise) {
      return _refreshPromise;
    }

    _refreshPromise = (async () => {
      try {
        const r = await fetch(`${cfg.url}/auth/v1/token?grant_type=refresh_token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: cfg.anonKey },
          body: JSON.stringify({ refresh_token: sess.refresh_token })
        });
        if (!r.ok) {
          if (r.status === 400 || r.status === 401) setSession(null);
          return null;
        }
        const next = await r.json();
        setSession(next);
        return next.access_token;
      } catch {
        return sess.access_token;
      } finally {
        _refreshPromise = null;
      }
    })();

    return _refreshPromise;
  }

  async function signInOrSignUp(email, password, isSignUp = false) {
    const cfg = getConfig();
    if (!cfg.configured) throw new Error('Supabase URL (https://xxx.supabase.co) と Anon Key を正しく入力してください。');
    const endpoint = isSignUp ? `${cfg.url}/auth/v1/signup` : `${cfg.url}/auth/v1/token?grant_type=password`;
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: cfg.anonKey },
      body: JSON.stringify({ email, password })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error_description || data.msg || data.message || `認証エラー (${r.status})`);
    if (data.access_token) setSession(data);
    return data;
  }

  async function signOut() {
    const cfg = getConfig();
    const token = await ensureValidToken();
    if (cfg.configured && token) {
      fetch(`${cfg.url}/auth/v1/logout`, {
        method: 'POST',
        headers: { apikey: cfg.anonKey, Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }
    setSession(null);
  }

  async function syncLangWithSupabase(targetKeyOrLang, appHooks) {
    const cfg = getConfig();
    const token = await ensureValidToken();
    const sess = getSession();
    if (!cfg.configured || !token || !sess?.user?.id) {
      throw new Error('クラウド未ログインです。');
    }
    const uid = sess.user.id;
    const rawTarget = String(targetKeyOrLang || 'en_ja').trim();
    // [P0-2 解決] PostgreSQL CHECK (lang IN ('en','ja','fr','de')) 制約遵守と異言語ペア (en_en, fr_de 等) の完全分離
    let dbLang = 'en', dbPair = 'en_ja';
    if (rawTarget.startsWith('distinction_entries') && global.VocabStorage?.keyToPair) {
      const p = global.VocabStorage.keyToPair(rawTarget);
      dbLang = p.srcLang || 'en';
      dbPair = `${dbLang}_${p.tgtLang || 'ja'}`;
    } else if (/^[a-z]{2}_[a-z]{2}$/i.test(rawTarget)) {
      const parts = rawTarget.toLowerCase().split('_');
      dbLang = (['en', 'ja', 'fr', 'de'].includes(parts[0])) ? parts[0] : 'en';
      const tgt = (['en', 'ja', 'fr', 'de'].includes(parts[1])) ? parts[1] : 'ja';
      dbPair = `${dbLang}_${tgt}`;
    } else {
      dbLang = (['en', 'ja', 'fr', 'de'].includes(rawTarget)) ? rawTarget : 'en';
      dbPair = `${dbLang}_ja`;
    }
    const targetKey = dbPair;

    const lastSyncKey = `${LAST_SYNC_PREFIX}${uid}_${targetKey}`;
    const lastSyncAt = Number(safeLsGet(lastSyncKey, '0')) || 0;
    const headers = {
      apikey: cfg.anonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // [P0-3 解決] クライアント時計依存を完全排除: pull 前にサーバー現在時刻を取得
    let serverNow = Date.now();
    try {
      const snRes = await fetch(`${cfg.url}/rest/v1/rpc/server_now_ms`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: '{}'
      });
      if (snRes.ok) {
        const snData = await snRes.json();
        if (Number.isFinite(Number(snData)) && Number(snData) > 0) {
          serverNow = Number(snData);
        }
      }
    } catch (e) {
      console.warn('[Sync] Failed to fetch server_now_ms, falling back to local time:', e);
    }

    // [P0-3 解決] 90日以上オフラインだった端末は墓石パージ済みリスクがあるため全件再同期
    const TOMBSTONE_TTL_MS = 90 * 86400 * 1000;
    let effectiveLastSyncAt = lastSyncAt;
    if (lastSyncAt > 0 && (serverNow - lastSyncAt) > TOMBSTONE_TTL_MS) {
      console.warn(`[Sync] Last sync was > 90 days ago (${new Date(lastSyncAt).toISOString()}). Falling back to full sync.`);
      effectiveLastSyncAt = 0;
    }

    // [P0-5 & 項目24] PostgREST チャンク分割 Pull & 進捗通知
    async function fetchAllPaginated(baseUrl, idField = 'id', onPageProgress = null) {
      const PAGE_SIZE = 100;
      let allRows = [];
      let offset = 0;
      const seenKeys = new Set();
      while (true) {
        const sep = baseUrl.includes('?') ? '&' : '?';
        const sortParam = baseUrl.includes('order=') ? '' : `&order=${encodeURIComponent(idField)}.asc`;
        const pageUrl = `${baseUrl}${sep}limit=${PAGE_SIZE}&offset=${offset}${sortParam}`;
        const r = await fetch(pageUrl, { headers });
        if (!r.ok) throw new Error(`同期Pull失敗 (HTTP ${r.status})`);
        const rows = await r.json();
        if (!Array.isArray(rows) || rows.length === 0) break;
        for (const row of rows) {
          const key = (idField && row[idField] !== undefined) ? String(row[idField]) : JSON.stringify(row);
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            allRows.push(row);
          }
        }
        if (typeof onPageProgress === 'function') {
          onPageProgress(allRows.length);
        }
        if (rows.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
        // UIスレッドを解放してプログレス表示を確実に再描画
        await new Promise(res => setTimeout(res, 0));
      }
      return allRows;
    }

    const reportProgress = (msg) => {
      if (typeof appHooks?.onSyncProgress === 'function') {
        appHooks.onSyncProgress(targetKey, msg);
      } else if (typeof document !== 'undefined') {
        const badge = document.getElementById('cloudSyncBadge');
        if (badge) badge.textContent = `同期中 (${targetKey.toUpperCase()}: ${msg})...`;
      }
    };

    // [P0-3 解決] 取得条件は server_updated_at.gt のみに統一（updated_at 系の不整合ORを排除）
    const uveCols = 'id,lang,pair,word_key,num,word,homograph_index,folder,category,interval,repetition,efactor,next_review,updated_at,review_updated_at,is_deleted,card_data,server_updated_at';
    const entryFilter = effectiveLastSyncAt > 0 ? `&server_updated_at=gt.${effectiveLastSyncAt}` : '';
    const tombFilter = effectiveLastSyncAt > 0 ? `&deleted_at=gt.${effectiveLastSyncAt}` : '';

    const [remoteEntryRows, remoteTombRows, wmRes] = await Promise.all([
      fetchAllPaginated(`${cfg.url}/rest/v1/user_vocab_entries?user_id=eq.${encodeURIComponent(uid)}&lang=eq.${encodeURIComponent(dbLang)}&pair=eq.${encodeURIComponent(dbPair)}${entryFilter}&select=${uveCols}&order=server_updated_at.asc,id.asc`, 'id', count => reportProgress(`受信中 ${count}件`)),
      fetchAllPaginated(`${cfg.url}/rest/v1/user_tombstones?user_id=eq.${encodeURIComponent(uid)}&lang=eq.${encodeURIComponent(dbLang)}&pair=eq.${encodeURIComponent(dbPair)}${tombFilter}&select=tomb_key,deleted_at&order=deleted_at.asc,tomb_key.asc`, 'tomb_key'),
      fetch(`${cfg.url}/rest/v1/user_lang_watermarks?user_id=eq.${encodeURIComponent(uid)}&lang=eq.${encodeURIComponent(dbLang)}&pair=eq.${encodeURIComponent(dbPair)}&select=cleared_at`, { headers })
    ]);

    if (!wmRes.ok) {
      throw new Error(`ウォーターマークPull失敗 (HTTP ${wmRes.status})`);
    }

    const remoteWmRows = await wmRes.json();

    const remoteEntries = (Array.isArray(remoteEntryRows) ? remoteEntryRows : []).map(r => {
      const base = (r.card_data && typeof r.card_data === 'object') ? r.card_data : {};
      return {
        ...base,
        id: r.id || base.id,
        word: r.word || base.word,
        wordKey: r.word_key || base.wordKey,
        pair: r.pair || base.pair || dbPair,
        folder: r.folder ? r.folder : undefined,
        category: r.category !== undefined && r.category !== null ? r.category : (base.category || 'その他'),
        interval: Number(r.interval) || base.interval || 0,
        repetition: Number(r.repetition) || base.repetition || 0,
        efactor: Number(r.efactor) || base.efactor || 2.5,
        nextReview: Number(r.next_review) || base.nextReview || 0,
        stability: Number(r.card_data?.stability !== undefined ? r.card_data.stability : base.stability) || 0,
        difficulty: Number(r.card_data?.difficulty !== undefined ? r.card_data.difficulty : base.difficulty) || 0,
        retrievability: Number(r.card_data?.retrievability !== undefined ? r.card_data.retrievability : base.retrievability) || 0,
        // 項目23: リモートの論理クロック (Lamport Version) を復元
        version: Number(r.card_data?.version || r.version) || 1,
        updatedAt: Number(r.updated_at) || base.updatedAt || 1,
        reviewUpdatedAt: Number(r.review_updated_at) || base.reviewUpdatedAt || 0,
        isDeleted: Boolean(r.is_deleted !== undefined ? r.is_deleted : base.isDeleted)
      };
    });
    const remoteTombstones = (Array.isArray(remoteTombRows) ? remoteTombRows : []).map(r => ({
      key: String(r.tomb_key),
      deletedAt: Number(r.deleted_at) || 0
    }));
    const remoteClearedAt = (Array.isArray(remoteWmRows) && remoteWmRows[0]) ? Number(remoteWmRows[0].cleared_at) || 0 : 0;

    const syncStartTs = serverNow;
    const delta = computeDeltaSyncState({
      lang: targetKey,
      localEntries: appHooks.getLocalEntries(targetKey),
      localTombMap: appHooks.getLocalTombMap(targetKey),
      localClearedAt: appHooks.getLocalClearedAt(targetKey),
      remoteEntries,
      remoteTombstones,
      remoteClearedAt,
      lastSyncAt: effectiveLastSyncAt,
      mergeWordsFn: appHooks.mergeWords,
      isTombstonedFn: appHooks.isTombstoned,
      makeWordKeyFn: appHooks.makeWordKey
    });

    appHooks.applyMergedLangState(targetKey, delta.mergedEntries, delta.mergedTombMap, delta.mergedClearedAt);

    const pushHeaders = { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' };

    // [P0-6 解決] Push処理の厳格検証（失敗時はlastSyncAtを進めず例外スロー）
    if (delta.watermarkNeedsPush) {
      const wmPushRes = await fetch(`${cfg.url}/rest/v1/user_lang_watermarks?on_conflict=user_id,pair`, {
        method: 'POST',
        headers: pushHeaders,
        body: JSON.stringify([{ user_id: uid, lang: dbLang, pair: dbPair, cleared_at: delta.mergedClearedAt }])
      });
      if (!wmPushRes.ok) throw new Error(`ウォーターマークPush失敗 (HTTP ${wmPushRes.status})`);
    }

    if (delta.tombstonesToPush.length > 0) {
      const tombPayload = delta.tombstonesToPush.map(t => ({
        user_id: uid,
        lang: dbLang,
        pair: dbPair,
        tomb_key: t.key,
        deleted_at: t.deletedAt
      }));
      const tombPushRes = await fetch(`${cfg.url}/rest/v1/user_tombstones?on_conflict=user_id,pair,tomb_key`, {
        method: 'POST',
        headers: pushHeaders,
        body: JSON.stringify(tombPayload)
      });
      if (!tombPushRes.ok) throw new Error(`削除ログPush失敗 (HTTP ${tombPushRes.status})`);
    }

    if (delta.entriesToPush.length > 0) {
      // HTTP 413防止: 50件ごとのバッチに分割して同期
      const CHUNK_SIZE = 50;
      for (let i = 0; i < delta.entriesToPush.length; i += CHUNK_SIZE) {
        const chunk = delta.entriesToPush.slice(i, i + CHUNK_SIZE);
        const pct = Math.min(100, Math.round(((i + chunk.length) / delta.entriesToPush.length) * 100));
        reportProgress(`送信中 ${pct}%`);
        const entryPayload = chunk.map(it => {
          const cleanCard = {
            ...it,
            folder: it.folder || null,
            grammar_forms: it.grammar_forms || null,
            history_note: it.history_note || null,
            contextSentence: it.contextSentence || null,
            homographIndex: (it.homographIndex && it.homographIndex > 1) ? it.homographIndex : null
          };
          delete cleanCard.card_data; // 自己参照ネストによる肥大化を防止
          return {
            user_id: uid,
            id: it.id,
            lang: dbLang,
            pair: it.pair || dbPair,
            word_key: it.wordKey || appHooks.makeWordKey(it.word, dbLang, it.meanings?.[0]?.pos, it.homographIndex),
            num: it.num || 1,
            word: it.word,
            homograph_index: it.homographIndex || 1,
            folder: it.folder || null,
            category: it.category || 'その他',
            interval: Number(it.interval) || 0,
            repetition: Number(it.repetition) || 0,
            efactor: Number(it.efactor) || 2.5,
            next_review: Number(it.nextReview) || syncStartTs,
            card_data: cleanCard,
            updated_at: Number(it.updatedAt) || syncStartTs,
            review_updated_at: Number(it.reviewUpdatedAt || it.updatedAt) || syncStartTs,
            is_deleted: Boolean(it.isDeleted)
          };
        });

        // [P0-2 解決] RPC失敗時は生upsertにフォールバックせず明確に例外スロー（直書き禁止・LWW保護）
        const rpcRes = await fetch(`${cfg.url}/rest/v1/rpc/sync_vocab_entries_batch`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_entries: entryPayload })
        });
        if (!rpcRes.ok) {
          const errText = await rpcRes.text().catch(() => '');
          throw new Error(`同期RPC失敗 (HTTP ${rpcRes.status}): ${errText.slice(0, 200)}`);
        }
      }
    }

    // [P0-3 解決] トランザクションコミット順のズレやPull中並行更新の欠落を防ぐ安全オーバーラップ（2分）
    const SYNC_OVERLAP_MS = 120000;
    const nextSyncCursor = Math.max(0, serverNow - SYNC_OVERLAP_MS);
    safeLsSet(lastSyncKey, String(nextSyncCursor));
    return {
      pulled: remoteEntries.length,
      pushed: delta.entriesToPush.length,
      tombPushed: delta.tombstonesToPush.length
    };
  }

  async function callVocabGenerateProxy({ lang, srcLang, tgtLang, useHist, fName, folder, items, words }) {
    const cfg = getConfig();
    if (!cfg.configured) throw new Error('Supabase設定が未構成です。');
    const token = await ensureValidToken().catch(() => null);

    const sLang = srcLang || lang || 'en';
    const tLang = tgtLang || 'ja';
    const finalItems = Array.isArray(items) ? items : (Array.isArray(words) ? words : []);
    const safeFName = fName || folder || '';

    const headers = {
      apikey: cfg.anonKey,
      'Content-Type': 'application/json'
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    // セキュリティ強化: systemPrompt と responseSchema は Edge Function 側で固定化されているため送信しない
    const r = await fetch(`${cfg.url}/functions/v1/vocab-generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        lang: sLang,
        srcLang: sLang,
        tgtLang: tLang,
        useHist: Boolean(useHist),
        fName: safeFName,
        items: finalItems
      })
    });

    const data = await r.json();
    if (!r.ok) {
      const err = new Error(data.error || `プロキシ生成エラー (HTTP ${r.status})`);
      err.status = r.status;
      if (r.status === 429 || (data.error && (data.error.includes('クォータ') || data.error.includes('上限') || data.error.includes('Pro')))) {
        err.isQuotaExceeded = true;
      }
      throw err;
    }
    return data;
  }

  function isAndroidPlayStoreApp() {
    if (typeof document === 'undefined') return false;
    if (document.referrer && document.referrer.startsWith('android-app://')) return true;
    const ua = navigator?.userAgent || '';
    if (/Android/i.test(ua) && (/wv/i.test(ua) || /Version\/[\d.]+/i.test(ua))) return true;
    return false;
  }

  async function startStripeCheckout(priceId = null, options = {}) {
    // [P0-5 解決] Google Play アプリ内直接課金規約の遵守 (リーダーアプリ要件)
    if (isAndroidPlayStoreApp()) {
      alert('【Google Play アプリをご利用のお客様へ】\nGoogle Playの決済規約に基づき、アプリ内からの直接Web決済は制限されています。\nProプランのご契約・管理は、SafariやChrome等のWebブラウザで公式サイト（Vocab Vault Web版）にアクセスし、本アカウントでログインの上お手続きください。\n（WebでPro化すると、本アプリでも即座にPro機能が自動反映されます）');
      return;
    }

    const cfg = getConfig();
    const token = await ensureValidToken();
    if (!cfg.configured || !token) {
      alert('Stripe決済をご利用いただくには、まずアカウントでログイン（または新規登録）してください。設定画面を開きます。');
      if (typeof global.openSettings === 'function') global.openSettings();
      else if (typeof openSettings === 'function') openSettings();
      return;
    }

    const interval = options.interval || (global.VocabI18n?.getBillingInterval?.() || 'month');
    const currency = options.currency || ((global.VocabI18n?.getLocale?.() || 'ja') === 'ja' ? 'jpy' : 'usd');
    const targetPriceId = priceId || (interval === 'year' ? 'price_pro_yearly' : 'price_pro_monthly');

    const btn = document.getElementById('btnUpgradePro');
    const upsellBtn = document.getElementById('btnUpsellUpgrade');
    if (btn) { btn.disabled = true; btn.textContent = '決済ページへ移動中...'; }
    if (upsellBtn) { upsellBtn.disabled = true; upsellBtn.textContent = '決済ページへ移動中...'; }
    try {
      const r = await fetch(`${cfg.url}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          apikey: cfg.anonKey,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          priceId: targetPriceId,
          currency,
          interval,
          returnUrl: window.location.href.split('?')[0]
        })
      });
      if (r.status === 404) {
        throw new Error('決済サーバーが現在メンテナンス中または未接続です。開発者のStripe開通完了まで今しばらくお待ちください。');
      }
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Checkoutの作成に失敗しました。');
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      alert(`決済のご案内: ${e.message}`);
    } finally {
      if (btn) btn.disabled = false;
      if (upsellBtn) upsellBtn.disabled = false;
      if (global.VocabI18n?.updatePricingUI) {
        global.VocabI18n.updatePricingUI();
      } else {
        if (btn) btn.textContent = 'Proにアップグレード (¥480/月)';
        if (upsellBtn) upsellBtn.textContent = '今すぐProにアップグレード';
      }
    }
  }

  async function openStripePortal() {
    const cfg = getConfig();
    const showToast = global.VocabModal?.showToast || global.showToast;
    const btn = typeof document !== 'undefined' ? document.getElementById('btnManageSub') : null;
    const origTxt = btn ? btn.textContent : '';

    if (!isCloudReady()) {
      showToast?.('Stripeポータルを開くにはログインが必要です。', 'warn');
      return;
    }
    const token = await ensureValidToken();
    if (!cfg.configured || !token) {
      showToast?.('クラウド同期が設定されていません。', 'warn');
      return;
    }
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'ポータルへ接続中...';
    }
    try {
      const r = await fetch(`${cfg.url}/functions/v1/stripe-portal`, {
        method: 'POST',
        headers: {
          apikey: cfg.anonKey,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ returnUrl: typeof window !== 'undefined' ? window.location.href.split('?')[0] : '' })
      });
      const data = await r.json();
      if (data.url) {
        if (typeof window !== 'undefined') window.location.href = data.url;
      } else {
        throw new Error(data.error || 'ポータルURLの取得に失敗しました');
      }
    } catch (e) {
      showToast?.(`ポータル遷移エラー: ${e.message}`, 'err');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = origTxt;
      }
    }
  }

  async function fetchUserProfile() {
    const cfg = getConfig();
    const token = await ensureValidToken();
    const sess = getSession();
    if (!cfg.configured || !token || !sess?.user?.id) return null;
    try {
      const r = await fetch(`${cfg.url}/rest/v1/profiles?id=eq.${sess.user.id}&select=*`, {
        headers: { apikey: cfg.anonKey, Authorization: `Bearer ${token}` }
      });
      if (r.ok) {
        const rows = await r.json();
        return rows[0] || null;
      }
    } catch {}
    return null;
  }

  async function deleteUserAccount() {
    const cfg = getConfig();
    const token = await ensureValidToken();
    const sess = getSession();
    if (!cfg.configured || !token || !sess?.user?.id) {
      throw new Error('未ログイン状態です。');
    }

    // [P0-4 解決] Stripe サブスクリプション解約 ＆ Supabase データ完全抹消 Edge Function
    const r = await fetch(`${cfg.url}/functions/v1/delete-account`, {
      method: 'POST',
      headers: {
        apikey: cfg.anonKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!r.ok) {
      const errData = await r.json().catch(() => ({}));
      // 404 (Edge Function未デプロイ時) の場合のみDB直接RPCを試行（DB側でもアクティブ課金をブロック）
      if (r.status === 404) {
        const rRpc = await fetch(`${cfg.url}/rest/v1/rpc/delete_user_account`, {
          method: 'POST',
          headers: {
            apikey: cfg.anonKey,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        });
        if (!rRpc.ok) {
          const rpcErr = await rRpc.json().catch(() => ({}));
          throw new Error(rpcErr.message || rpcErr.error || `アカウント削除エラー (HTTP ${rRpc.status})`);
        }
      } else {
        throw new Error(errData.error || errData.message || `アカウント削除・課金解約に失敗しました (HTTP ${r.status})。Stripeポータルより定期課金を解約の上、再度お試しください。`);
      }
    }

    setSession(null);
    return true;
  }

  // [GDPR対応] ユーザーの全登録単語・学習進捗の完全JSONエクスポート
  async function exportAllUserDataJson() {
    const bundle = {};
    const allPairs = (global.VocabCore?.getAllKnownPairConfigs || global.getAllKnownPairConfigs)?.() || [];
    const keysToExport = new Set(['en', 'ja', 'fr', 'de']);
    allPairs.forEach(p => {
      const id = p.pairId || p.key;
      if (id) keysToExport.add(id);
    });
    for (const l of keysToExport) {
      const b = await global.VocabStorage?.idbFetchLangBundle?.(l, true);
      if (b && (b.words?.length || b.clearAt || (b.tombs && b.tombs.length) || (b.snaps && b.snaps.length))) {
        bundle[l] = b;
      }
    }
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocab-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  global.VocabSync = {
    computeDeltaSyncState,
    getConfig,
    saveConfig,
    getSession,
    setSession,
    isCloudReady,
    isProxyReady,
    signInOrSignUp,
    signOut,
    deleteUserAccount,
    exportAllUserDataJson,
    syncLangWithSupabase,
    acquireSyncLock,
    callVocabGenerateProxy,
    startStripeCheckout,
    openStripePortal,
    fetchUserProfile
  };

  global.startStripeCheckout = startStripeCheckout;
  global.openStripePortal = openStripePortal;
  global.exportAllUserDataJson = exportAllUserDataJson;
})(typeof window !== 'undefined' ? window : globalThis);

