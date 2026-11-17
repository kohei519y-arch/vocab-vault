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

  /**
   * 指数バックオフ＆ジッター付き耐障害 fetch (HTTP 429 レート制限 & 5xx 一時障害自己回復)
   */
  async function fetchWithRetry(url, options = {}, maxRetries = 3) {
    let attempt = 0;
    while (true) {
      try {
        const res = await fetch(url, options);
        if (res.status === 429 || (res.status >= 502 && res.status <= 504)) {
          if (attempt < maxRetries) {
            attempt++;
            const retryAfterHeader = res.headers ? res.headers.get('Retry-After') : null;
            let delayMs = 1000 * Math.pow(2, attempt) + Math.random() * 400;
            if (retryAfterHeader) {
              const sec = parseInt(retryAfterHeader, 10);
              if (Number.isFinite(sec) && sec > 0) delayMs = Math.min(sec * 1000, 10000);
            }
            await new Promise(r => setTimeout(r, delayMs));
            continue;
          }
        }
        return res;
      } catch (err) {
        if (attempt < maxRetries) {
          attempt++;
          const delayMs = 1000 * Math.pow(2, attempt) + Math.random() * 400;
          await new Promise(r => setTimeout(r, delayMs));
          continue;
        }
        throw err;
      }
    }
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
    isFullResyncAfterExpiry = false,
    originalLastSyncAt = 0,
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
    const sLang = String(lang || 'en').split('_')[0] || 'en';
    (Array.isArray(remoteEntries) ? remoteEntries : []).forEach(r => {
      if (!r) return;
      const wk = r.wordKey || makeWordKeyFn(r.word, sLang, r.meanings?.[0]?.pos, r.homographIndex);
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

    // [P0-5 解決 & ゾンビ復活防止] 90日超オフライン復帰時（墓石TTL経過によるパージ後）のゾンビ復活防止
    // リモート全件に存在せず、かつ前回同期以前に更新されたきりのローカル単語は他端末で削除されたと判定して除外
    // ※オフライン復習(reviewUpdatedAt)の更新によってサーバー側でパージ済みの削除単語が復活するのを防ぐため、
    // 単語本体の更新日時 (localUpd) を基準に判定する。
    let effectiveLocalEntries = Array.isArray(localEntries) ? localEntries : [];
    if (isFullResyncAfterExpiry && originalLastSyncAt > 0) {
      effectiveLocalEntries = effectiveLocalEntries.filter(it => {
        if (!it) return false;
        const wk = it.wordKey || makeWordKeyFn(it.word, sLang, it.meanings?.[0]?.pos, it.homographIndex);
        const inRemote = (it.id && remoteUpdById.has(it.id)) || (wk && remoteUpdByWk.has(wk));
        if (inRemote) return true;
        const localUpd = Number(it.updatedAt) || 1;
        if (localUpd <= originalLastSyncAt) {
          return false;
        }
        return true;
      });
    }

    const mergedEntries = mergeWordsFn(
      effectiveLocalEntries,
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

  // 項目25: オフライン復習キューと定期同期の衝突を防ぐアトミックトランザクションロック（Web Locks API によるタブ間排他対応）
  let _syncMutex = Promise.resolve();

  async function _acquireLocalMutex(taskFn, timeoutMs = 45000) {
    let release;
    let released = false;
    const safeRelease = () => {
      if (!released) {
        released = true;
        if (release) release();
      }
    };
    const nextLock = new Promise(resolve => { release = resolve; });
    const currentLock = _syncMutex;
    // 前タスクのrejectでchainが汚染されないよう、catchで握りつぶしてnextLockへ繋ぐ
    _syncMutex = currentLock.then(() => nextLock, () => nextLock);

    // currentLockのrejectは待機側で握りつぶす（キュー進行を保証）
    // [デッドロック防止] 前タスク待機にも上限を設け、異常クラッシュ時の永久停止を排除
    let waitTimer = null;
    const waitPromise = new Promise((_, reject) => {
      waitTimer = setTimeout(() => reject(new Error('Sync mutex wait timeout')), timeoutMs);
    });

    try {
      await Promise.race([currentLock.catch(() => {}), waitPromise]);
    } catch {
      console.warn('[Sync] Lock wait timed out, resetting mutex chain');
      _syncMutex = Promise.resolve();
    } finally {
      if (waitTimer) clearTimeout(waitTimer);
    }

    let taskTimer = null;
    try {
      const taskPromise = taskFn();
      const taskTimeoutPromise = new Promise((_, reject) => {
        taskTimer = setTimeout(() => reject(new Error('Sync operation timed out')), timeoutMs);
      });
      return await Promise.race([taskPromise, taskTimeoutPromise]);
    } finally {
      if (taskTimer) clearTimeout(taskTimer);
      safeRelease();
    }
  }

  async function acquireSyncLock(taskFn, lockName = 'vocab_vault_sync_lock') {
    // 1. ブラウザ複数タブ間の排他ロック (Web Locks API)
    if (typeof navigator !== 'undefined' && navigator.locks && typeof navigator.locks.request === 'function') {
      try {
        return await navigator.locks.request(lockName, { mode: 'exclusive' }, async () => {
          return await _acquireLocalMutex(taskFn);
        });
      } catch (e) {
        console.warn('Web Locks API failed, falling back to local mutex:', e);
      }
    }
    // 2. フォールバック: 同一タブ内 Mutex
    return await _acquireLocalMutex(taskFn);
  }

  function getConfig() {
    const override = (typeof window !== 'undefined' && window.SUPABASE_CONFIG_OVERRIDE) ? window.SUPABASE_CONFIG_OVERRIDE : {};
    const url = (override.url || safeLsGet(SUPABASE_URL_KEY, '') || DEFAULT_SUPABASE_URL).trim().replace(/\/+$/, '');
    const anonKey = (override.anonKey || safeLsGet(SUPABASE_ANON_KEY, '') || DEFAULT_SUPABASE_ANON_KEY).trim();
    // 許可ホスト: 公式 *.supabase.co またはユーザーが明示的に指定した任意の https/localhost URL (セルフホスト対応)
    const isOfficial = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url);
    const isHttps = /^https:\/\/[a-z0-9.-]+(:[0-9]+)?(\/.*)?$/i.test(url);
    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?(\/.*)?$/i.test(url);
    return {
      url,
      anonKey,
      configured: Boolean(url && anonKey && (isOfficial || isHttps || isLocalhost)),
      isOfficial
    };
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
    if (!session) {
      safeLsRemove(SUPABASE_SESSION_KEY);
      return;
    }
    if (session.expires_at === undefined && Number.isFinite(Number(session.expires_in))) {
      session = { ...session, expires_at: Math.floor(Date.now() / 1000) + Number(session.expires_in) };
    }
    const nextOwner = session?.user?.id ? String(session.user.id) : '';
    const prevOwner = safeLsGet('vv_cloud_owner_id', '');
    if (prevOwner && nextOwner && prevOwner !== nextOwner) {
      // 別アカウントへの切り替え時は前ユーザーのローカルデータ・同期カーソルを隔離消去
      try { global.VocabStorage?.clearAccountVaultData?.(); } catch {}
    }
    if (nextOwner) safeLsSet('vv_cloud_owner_id', nextOwner);
    safeLsSet(SUPABASE_SESSION_KEY, JSON.stringify(session));
  }

  function isCloudReady() {
    return getConfig().configured && Boolean(getSession());
  }

  function isProxyReady() {
    return getConfig().configured;
  }

  const SUPPORTED_LANGS = ['en', 'ja', 'fr', 'de', 'es', 'it', 'pt', 'nl', 'zh', 'ko'];

  function getUser() {
    try {
      const s = getSession();
      return s?.user || null;
    } catch { return null; }
  }

  let _refreshPromise = null;
  let _signOutInProgress = false;
  let _adminCache = { userId: null, token: null, isAdmin: false, checkedAt: 0 };
  let _adminVerifyPromise = null;

  function clearAdminCache() {
    _adminCache = { userId: null, token: null, isAdmin: false, checkedAt: 0 };
    _adminVerifyPromise = null;
  }

  async function ensureValidToken() {
    if (_signOutInProgress) return null;
    const cfg = getConfig();
    let sess = getSession();
    if (!cfg.configured || !sess) return null;
    const nowSec = Math.floor(Date.now() / 1000);
    if (sess.expires_at && sess.expires_at - nowSec > 60) {
      return sess.access_token;
    }
    if (!sess.refresh_token) {
      return (sess.expires_at && nowSec >= sess.expires_at) ? null : sess.access_token;
    }

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
        if (_signOutInProgress) return null;
        setSession(next);
        return next.access_token;
      } catch {
        // [P1-10 解決] オフライン等でリフレッシュ失敗時に期限切れトークンを返却せず、後続の401クラッシュを回避
        return (sess.expires_at && nowSec >= sess.expires_at) ? null : sess.access_token;
      } finally {
        _refreshPromise = null;
      }
    })();

    return _refreshPromise;
  }

  async function signInOrSignUp(email, password, isSignUp = false) {
    const cfg = getConfig();
    if (!cfg.configured) throw new Error('Supabase URL (https://xxx.supabase.co または 自社HTTPS) と Anon Key を正しく入力してください。');
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
    _signOutInProgress = true;
    try {
      const token = await ensureValidToken().catch(() => null);
      if (cfg.configured && token) {
        try {
          await fetch(`${cfg.url}/auth/v1/logout`, {
            method: 'POST',
            headers: { apikey: cfg.anonKey, Authorization: `Bearer ${token}` }
          });
        } catch { /* ネットワーク切断時は無視してローカルセッションを破棄 */ }
      }
    } finally {
      setSession(null);
      clearAdminCache();
      try { await global.VocabStorage?.clearAccountVaultData?.(); } catch {}
      _signOutInProgress = false;
      _refreshPromise = null;
    }
  }

  async function syncLangWithSupabase(targetKeyOrLang, appHooks, skipLock = false) {
    const doSync = async () => {
      const cfg = getConfig();
      const token = await ensureValidToken();
      const sess = getSession();
      if (!cfg.configured || !token || !sess?.user?.id) {
        throw new Error('クラウド未ログインです。');
      }
      const uid = sess.user.id;
      const rawTarget = String(targetKeyOrLang || 'en_ja').trim();
      // [P0-1 解決] 10言語完全サポート (en, ja, fr, de, es, it, pt, nl, zh, ko)
      let dbLang = 'en', dbPair = 'en_ja';
      if (rawTarget.startsWith('distinction_entries') && global.VocabStorage?.keyToPair) {
        const p = global.VocabStorage.keyToPair(rawTarget);
        dbLang = (SUPPORTED_LANGS.includes(p.srcLang)) ? p.srcLang : 'en';
        const tgt = (SUPPORTED_LANGS.includes(p.tgtLang)) ? p.tgtLang : 'ja';
        dbPair = `${dbLang}_${tgt}`;
      } else if (/^[a-z]{2}_[a-z]{2}$/i.test(rawTarget)) {
        const parts = rawTarget.toLowerCase().split('_');
        dbLang = (SUPPORTED_LANGS.includes(parts[0])) ? parts[0] : 'en';
        const tgt = (SUPPORTED_LANGS.includes(parts[1])) ? parts[1] : 'ja';
        dbPair = `${dbLang}_${tgt}`;
      } else {
        dbLang = (SUPPORTED_LANGS.includes(rawTarget)) ? rawTarget : 'en';
        dbPair = `${dbLang}_ja`;
      }
      const targetKey = dbPair;

      const lastSyncKey = `${LAST_SYNC_PREFIX}${uid}_${targetKey}`;
      let lastSyncAt = Number(safeLsGet(lastSyncKey, '0')) || 0;
      if (lastSyncAt === 0 && global.VocabStorage?.idbGet) {
        try {
          const idbCursor = await global.VocabStorage.idbGet(lastSyncKey);
          if (idbCursor && Number(idbCursor) > 0) lastSyncAt = Number(idbCursor);
        } catch {}
      }
      const headers = {
        apikey: cfg.anonKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // [P0-3 解決] クライアント時計依存を完全排除: pull 前にサーバー現在時刻を取得
      let serverNow = 0;
      try {
        const snRes = await fetchWithRetry(`${cfg.url}/rest/v1/rpc/server_now_ms`, {
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
        console.warn('[Sync] Failed to fetch server_now_ms:', e);
      }
      if (!serverNow) {
        // [P1-⑩ 解決] サーバ時刻が取得できない限り同期カーソルを前進させない（差分抜けを防止）
        throw new Error('サーバ基準時刻の取得に失敗しました。ネットワーク接続を確認して再試行してください。');
      }

      // [P0-3 & P0-5 解決] 90日以上オフラインだった端末は墓石パージ済みリスクがあるため全件再同期
      const TOMBSTONE_TTL_MS = 90 * 86400 * 1000;
      let effectiveLastSyncAt = lastSyncAt;
      const isFullResyncAfterExpiry = lastSyncAt > 0 && (serverNow - lastSyncAt) > TOMBSTONE_TTL_MS;
      if (isFullResyncAfterExpiry) {
        console.warn(`[Sync] Last sync was > 90 days ago (${new Date(lastSyncAt).toISOString()}). Falling back to full sync.`);
        effectiveLastSyncAt = 0;
      }

      // [P0-1 解決] PostgREST カーソル方式（server_updated_at, idField）Pull & 上限時刻固定
      async function fetchAllPaginated(baseUrl, idField = 'id', onPageProgress = null) {
        const PAGE_SIZE = 500;
        let allRows = [];
        let cursorTs = effectiveLastSyncAt;
        let cursorId = '';
        const seenKeys = new Set();
        while (true) {
          const sep = baseUrl.includes('?') ? '&' : '?';
          let cursorFilter = '';
          if (cursorId) {
            cursorFilter = `&or=(server_updated_at.gt.${cursorTs},and(server_updated_at.eq.${cursorTs},${encodeURIComponent(idField)}.gt.${encodeURIComponent(cursorId)}))`;
          } else if (cursorTs > 0) {
            cursorFilter = `&server_updated_at=gt.${cursorTs}`;
          }
          // 同期開始時のサーバー時刻 (serverNow) を上限に固定し、同期中の追加更新による重複や抜け漏れを防止
          const timeBound = `&server_updated_at=lte.${serverNow}`;
          const sortParam = `&order=server_updated_at.asc,${encodeURIComponent(idField)}.asc&limit=${PAGE_SIZE}`;
          const pageUrl = `${baseUrl}${sep}${timeBound}${cursorFilter}${sortParam}`;

          const r = await fetchWithRetry(pageUrl, { headers });
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
          const lastItem = rows[rows.length - 1];
          cursorTs = Number(lastItem.server_updated_at) || cursorTs;
          cursorId = String(lastItem[idField] || '');

          if (rows.length < PAGE_SIZE) break;
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

    const [remoteEntryRows, remoteTombRows, wmRes] = await Promise.all([
      fetchAllPaginated(`${cfg.url}/rest/v1/user_vocab_entries?user_id=eq.${encodeURIComponent(uid)}&lang=eq.${encodeURIComponent(dbLang)}&pair=eq.${encodeURIComponent(dbPair)}&select=${uveCols}`, 'id', count => reportProgress(`受信中 ${count}件`)),
      fetchAllPaginated(`${cfg.url}/rest/v1/user_tombstones?user_id=eq.${encodeURIComponent(uid)}&lang=eq.${encodeURIComponent(dbLang)}&pair=eq.${encodeURIComponent(dbPair)}&select=tomb_key,deleted_at,server_updated_at`, 'tomb_key'),
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
        lang: r.lang || base.lang || dbLang,
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
      isFullResyncAfterExpiry,
      originalLastSyncAt: lastSyncAt,
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
      const tombPushRes = await fetchWithRetry(`${cfg.url}/rest/v1/user_tombstones?on_conflict=user_id,pair,tomb_key`, {
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
        const clipCardData = (card) => {
          let str = JSON.stringify(card);
          if (str.length <= 45000) return card;
          const c = { ...card };
          if (c.notes && c.notes.length > 500) c.notes = c.notes.slice(0, 500);
          if (c.history_note && c.history_note.length > 500) c.history_note = c.history_note.slice(0, 500);
          if (Array.isArray(c.derivatives) && c.derivatives.length > 5) c.derivatives = c.derivatives.slice(0, 5);
          if (Array.isArray(c.phrases) && c.phrases.length > 5) c.phrases = c.phrases.slice(0, 5);
          if (c.etymology && c.etymology.length > 2000) c.etymology = c.etymology.slice(0, 2000);
          return c;
        };

        const entryPayload = chunk.map(it => {
          const cleanCard = clipCardData({
            ...it,
            folder: it.folder || null,
            grammar_forms: it.grammar_forms || null,
            history_note: it.history_note || null,
            contextSentence: it.contextSentence || null,
            homographIndex: (it.homographIndex && it.homographIndex > 1) ? it.homographIndex : null
          });
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
        const rpcRes = await fetchWithRetry(`${cfg.url}/rest/v1/rpc/sync_vocab_entries_batch`, {
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
    // [P2-⑲ 解決] localStorage容量超過時でも同期カーソルを維持するためIndexedDBへミラー保存
    if (global.VocabStorage?.idbPut) {
      await global.VocabStorage.idbPut(lastSyncKey, nextSyncCursor).catch(() => {});
    }

      return {
        pulled: remoteEntries.length,
        pushed: delta.entriesToPush.length,
        tombPushed: delta.tombstonesToPush.length
      };
    };
    if (skipLock) return await doSync();
    return await acquireSyncLock(doSync);
  }

  async function syncAppSettingsWithSupabase() {
    const cfg = getConfig();
    if (!cfg.configured) return null;
    const token = await ensureValidToken().catch(() => null);
    if (!token) return null;
    const user = getUser();
    if (!user || !user.id) return null;

    try {
      const res = await fetch(`${cfg.url}/rest/v1/user_app_settings?user_id=eq.${user.id}`, {
        headers: {
          apikey: cfg.anonKey,
          Authorization: `Bearer ${token}`
        }
      });
      if (res.ok) {
        const rows = await res.json();
        const cloudMap = {};
        if (Array.isArray(rows)) {
          rows.forEach(r => { cloudMap[r.setting_key] = r; });
        }

        // 1. FSRS重みの同期（リセットTombstone `{ isReset: true }` の双方向伝播対応）
        const localWeights = global.VocabSRS?.getUserFSRSWeights?.();
        const cloudWeightsRow = cloudMap['vv_user_fsrs_weights'];
        if (cloudWeightsRow && cloudWeightsRow.setting_val) {
          const cloudVal = cloudWeightsRow.setting_val;
          const cloudTs = cloudWeightsRow.updated_at || 0;
          const localTs = Number(localStorage?.getItem('vv_user_fsrs_weights_ts') || 0);
          if (cloudTs > localTs) {
            global.VocabSRS?.setUserFSRSWeights?.(cloudVal?.isReset ? null : cloudVal, cloudTs);
            safeLsSet('vv_user_fsrs_weights_ts', String(cloudTs));
          } else if (localTs > cloudTs) {
            await pushSettingRow(cfg, token, user.id, 'vv_user_fsrs_weights', localWeights || { isReset: true }, localTs);
          }
        } else if (localWeights) {
          const nowTs = Date.now();
          safeLsSet('vv_user_fsrs_weights_ts', String(nowTs));
          await pushSettingRow(cfg, token, user.id, 'vv_user_fsrs_weights', localWeights, nowTs);
        }

        // 2. [P0-2 解決] FSRS復習履歴ログの同期（500件到達後も最新ログを確実に同期）
        const localLogs = global.VocabSRS?.getReviewHistoryLog?.() || [];
        const cloudLogsRow = cloudMap['vv_review_history_log'];
        if (cloudLogsRow && Array.isArray(cloudLogsRow.setting_val)) {
          const mergedLogs = mergeHistoryLogs(localLogs, cloudLogsRow.setting_val);
          global.VocabSRS?.saveReviewHistoryLog?.(mergedLogs);
          const cloudArr = cloudLogsRow.setting_val;
          const cloudMaxTs = cloudArr.length ? Number(cloudArr[cloudArr.length - 1]?.timestamp || 0) : 0;
          const mergedMaxTs = mergedLogs.length ? Number(mergedLogs[mergedLogs.length - 1]?.timestamp || 0) : 0;
          const cloudTail = cloudArr.length ? `${cloudArr[cloudArr.length - 1]?.word}_${cloudArr[cloudArr.length - 1]?.timestamp}` : '';
          const mergedTail = mergedLogs.length ? `${mergedLogs[mergedLogs.length - 1]?.word}_${mergedLogs[mergedLogs.length - 1]?.timestamp}` : '';

          const hasNewerLogs = mergedLogs.length > cloudArr.length || mergedMaxTs > cloudMaxTs || cloudTail !== mergedTail;
          if (hasNewerLogs) {
            const safeTs = Math.max(Date.now(), mergedMaxTs, (Number(cloudLogsRow.updated_at) || 0) + 1);
            await pushSettingRow(cfg, token, user.id, 'vv_review_history_log', mergedLogs, safeTs);
          }
        } else if (localLogs.length > 0) {
          const localMaxTs = Number(localLogs[localLogs.length - 1]?.timestamp || 0);
          const safeTs = Math.max(Date.now(), localMaxTs);
          await pushSettingRow(cfg, token, user.id, 'vv_review_history_log', localLogs, safeTs);
        }
      }
    } catch (e) {
      console.warn('[Sync] App settings sync error (non-fatal):', e);
    }
  }

  async function pushSettingRow(cfg, token, userId, key, val, ts) {
    const res = await fetch(`${cfg.url}/rest/v1/user_app_settings`, {
      method: 'POST',
      headers: {
        apikey: cfg.anonKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        user_id: userId,
        setting_key: key,
        setting_val: val,
        updated_at: ts
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`設定同期Push失敗 [${key}] (HTTP ${res.status}): ${err.message || err.error || ''}`);
    }
  }

  function mergeHistoryLogs(a, b) {
    const seen = new Set();
    const res = [];
    [...a, ...b].sort((x, y) => (x.timestamp || 0) - (y.timestamp || 0)).forEach(item => {
      const k = `${item.word}_${item.timestamp}_${item.rating}`;
      if (!seen.has(k)) {
        seen.add(k);
        res.push(item);
      }
    });
    return res.slice(-500);
  }

  /** @param {any} [opts] */
  async function callVocabGenerateProxy(opts = {}) {
    const { lang, srcLang, tgtLang, useHist, fName, folder, items, words, requestId } = opts;
    const cfg = getConfig();
    if (!cfg.configured) throw new Error('Supabase設定が未構成です。');
    const token = await ensureValidToken().catch(() => null);

    const sLang = srcLang || lang || 'en';
    const tLang = tgtLang || 'ja';
    const finalItems = Array.isArray(items) ? items : (Array.isArray(words) ? words : []);
    const safeFName = fName || folder || '';
    const reqId = requestId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('req_' + Date.now() + '_' + Math.random().toString(36).slice(2)));

    // 未ログインゲスト時はサーバー側の1リクエスト3語制限に適合するよう自動分割して順次統合
    if (!token && finalItems.length > 3) {
      const mergedItems = [];
      let lastModel = '';
      let lastQuota = undefined;
      for (let i = 0; i < finalItems.length; i += 3) {
        const subItems = finalItems.slice(i, i + 3);
        const subRes = await callVocabGenerateProxy({
          lang: sLang,
          srcLang: sLang,
          tgtLang: tLang,
          useHist,
          fName: safeFName,
          items: subItems,
          requestId: `${reqId}_part${Math.floor(i / 3)}`
        });
        if (Array.isArray(subRes?.items)) {
          subRes.items.forEach((c, cIdx) => {
            const origIdx = Number.isInteger(c?.reqIndex) && c.reqIndex >= 0 && c.reqIndex < subItems.length
              ? (subItems[c.reqIndex]?.reqIndex ?? (i + c.reqIndex))
              : (subItems[cIdx]?.reqIndex ?? (i + cIdx));
            mergedItems.push({ ...c, reqIndex: origIdx });
          });
        }
        if (subRes?.usedModel) lastModel = subRes.usedModel;
        if (subRes?.quotaRemaining !== undefined) lastQuota = subRes.quotaRemaining;
      }
      return { items: mergedItems, usedModel: lastModel || 'gemini-2.0-flash-proxy', quotaRemaining: lastQuota };
    }

    const headers = {
      apikey: cfg.anonKey,
      Authorization: `Bearer ${token || cfg.anonKey}`,
      'Content-Type': 'application/json',
      'x-request-id': reqId
    };

    const sendReq = () => fetch(`${cfg.url}/functions/v1/vocab-generate`, {
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

    // セキュリティ強化: systemPrompt と responseSchema は Edge Function 側で固定化されているため送信しない
    let r = await sendReq();
    let data = await r.json().catch(() => ({}));
    const isQuotaCode = data?.code === 'QUOTA_EXCEEDED' || /無料枠|お試し枠|quota/i.test(String(data?.error || ''));
    if (!r.ok && !isQuotaCode && (r.status === 429 || r.status === 502 || r.status === 503)) {
      const waitMs = typeof process !== 'undefined' ? 100 : 1800;
      await new Promise(res => setTimeout(res, waitMs));
      r = await sendReq();
      data = await r.json().catch(() => ({}));
    }

    if (!r.ok) {
      const err = new Error(data.error || `プロキシ生成エラー (HTTP ${r.status})`);
      err.status = r.status;
      if (data.code === 'QUOTA_EXCEEDED' || /無料枠|お試し枠|quota/i.test(String(data.error || ''))) {
        err.isQuotaExceeded = true;
      }
      throw err;
    }
    return data;
  }

  /** @param {any} [opts] */
  async function callOcrProxy(opts = {}) {
    const { imageBase64, mimeType = 'image/jpeg', lang = 'en', requestId } = opts;
    const cfg = getConfig();
    if (!cfg.configured) throw new Error('Supabase設定が未構成です。');
    const token = await ensureValidToken().catch(() => null);
    const reqId = requestId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('ocr_' + Date.now() + '_' + Math.random().toString(36).slice(2)));

    const headers = {
      apikey: cfg.anonKey,
      Authorization: `Bearer ${token || cfg.anonKey}`,
      'Content-Type': 'application/json',
      'x-request-id': reqId
    };

    const r = await fetch(`${cfg.url}/functions/v1/vocab-generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'ocr',
        imageBase64,
        mimeType,
        lang
      })
    });

    const data = await r.json();
    if (!r.ok) {
      const err = new Error(data.error || `OCR解析エラー (HTTP ${r.status})`);
      err.status = r.status;
      if (r.status === 429 || data.code === 'QUOTA_EXCEEDED') {
        err.isQuotaExceeded = true;
      }
      throw err;
    }
    return data;
  }

  /** @param {any} [opts] */
  async function callPassageExtractProxy(opts = {}) {
    const { passage, lang = 'en', tgtLang = 'ja', maxCnt = 12, levelPrompt = '', requestId } = opts;
    const cfg = getConfig();
    if (!cfg.configured) throw new Error('Supabase設定が未構成です。');
    const token = await ensureValidToken().catch(() => null);
    const reqId = requestId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('ext_' + Date.now() + '_' + Math.random().toString(36).slice(2)));

    const headers = {
      apikey: cfg.anonKey,
      Authorization: `Bearer ${token || cfg.anonKey}`,
      'Content-Type': 'application/json',
      'x-request-id': reqId
    };

    const r = await fetch(`${cfg.url}/functions/v1/vocab-generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'extract_passage',
        passage,
        lang,
        tgtLang,
        maxCnt,
        levelPrompt
      })
    });

    const data = await r.json();
    if (!r.ok) {
      const err = new Error(data.error || `長文抽出エラー (HTTP ${r.status})`);
      err.status = r.status;
      if (r.status === 429 || data.code === 'QUOTA_EXCEEDED') {
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
    const showNotice = async (msg, type = 'info') => {
      if (global.VocabModal?.uiAlert && type === 'dialog') {
        await global.VocabModal.uiAlert(msg);
      } else if (global.VocabModal?.showToast) {
        global.VocabModal.showToast(msg, type === 'dialog' ? 'warn' : type, 5500);
      } else if (typeof global.showToast === 'function') {
        global.showToast(msg, type === 'dialog' ? 'warn' : type, 5500);
      }
    };

    if (isAndroidPlayStoreApp()) {
      const notice = global.VocabI18n?.t ? global.VocabI18n.t('sync.play_store_notice') : '【Google Play アプリをご利用のお客様へ】\nGoogle Playの決済規約に基づき、アプリ内からの直接Web決済は制限されています。\nProプランのご契約・管理は、SafariやChrome等のWebブラウザで公式サイト（Vocab Vault Web版）にアクセスし、本アカウントでログインの上お手続きください。\n（WebでPro化すると、本アプリでも即座にPro機能が自動反映されます）';
      await showNotice(notice, 'dialog');
      return;
    }

    const cfg = getConfig();
    const token = await ensureValidToken();
    if (!cfg.configured || !token) {
      const loginMsg = global.VocabI18n?.t ? global.VocabI18n.t('sync.login_required_stripe') : 'Stripe決済をご利用いただくには、まずアカウントでログイン（または新規登録）してください。設定画面を開きます。';
      await showNotice(loginMsg, 'info');
      if (typeof global.VocabModal?.openSettings === 'function') global.VocabModal.openSettings();
      else if (typeof global.openSettings === 'function') global.openSettings();
      return;
    }

    const interval = options.interval || (global.VocabI18n?.getBillingInterval?.() || 'month');
    const currency = options.currency || ((global.VocabI18n?.getLocale?.() || 'ja') === 'ja' ? 'jpy' : 'usd');
    const targetPriceId = priceId || (interval === 'year' ? 'price_pro_yearly' : 'price_pro_monthly');

    const btn = /** @type {HTMLButtonElement | null} */ (document.getElementById('btnUpgradePro'));
    const upsellBtn = /** @type {HTMLButtonElement | null} */ (document.getElementById('btnUpsellUpgrade'));
    const movingMsg = global.VocabI18n?.t ? global.VocabI18n.t('sync.moving_to_checkout', '決済ページへ移動中...') : '決済ページへ移動中...';
    if (btn) { btn.disabled = true; btn.textContent = movingMsg; }
    if (upsellBtn) { upsellBtn.disabled = true; upsellBtn.textContent = movingMsg; }
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
      const errMsg = global.VocabI18n?.t ? global.VocabI18n.t('sync.checkout_error', { err: e.message }) : `決済のご案内: ${e.message}`;
      await showNotice(errMsg, 'dialog');
    } finally {
      if (btn) btn.disabled = false;
      if (upsellBtn) upsellBtn.disabled = false;
      if (global.VocabI18n?.updatePricingUI) {
        global.VocabI18n.updatePricingUI();
      } else {
        if (btn) btn.textContent = global.VocabI18n?.t ? global.VocabI18n.t('sync.btn_upgrade_price') : 'Proにアップグレード (¥480/月)';
        if (upsellBtn) upsellBtn.textContent = global.VocabI18n?.t ? global.VocabI18n.t('sync.btn_upgrade_now') : '今すぐProにアップグレード';
      }
    }
  }

  async function openStripePortal() {
    const cfg = getConfig();
    const showToast = global.VocabModal?.showToast || global.showToast;
    const btn = /** @type {HTMLButtonElement | null} */ (typeof document !== 'undefined' ? document.getElementById('btnManageSub') : null);
    const origTxt = btn ? btn.textContent : '';

    if (!isCloudReady()) {
      showToast?.(global.VocabI18n?.t ? global.VocabI18n.t('sync.portal_login_required') : 'Stripeポータルを開くにはログインが必要です。', 'warn');
      return;
    }
    const token = await ensureValidToken();
    if (!cfg.configured || !token) {
      showToast?.(global.VocabI18n?.t ? global.VocabI18n.t('sync.not_configured') : 'クラウド同期が設定されていません。', 'warn');
      return;
    }
    if (btn) {
      btn.disabled = true;
      btn.textContent = global.VocabI18n?.t ? global.VocabI18n.t('sync.connecting_portal', 'ポータルへ接続中...') : 'ポータルへ接続中...';
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

  async function fetchAuthUser() {
    const cfg = getConfig();
    const token = await ensureValidToken();
    if (!cfg.configured || !token) return null;
    try {
      const r = await fetch(`${cfg.url}/auth/v1/user`, {
        headers: { apikey: cfg.anonKey, Authorization: `Bearer ${token}` }
      });
      if (r.ok) return await r.json();
    } catch {}
    return null;
  }

  async function verifyAdminStatus(options = {}) {
    const cfg = getConfig();
    const token = await ensureValidToken();
    const sess = getSession();
    const userId = sess?.user?.id || null;
    if (!cfg.configured || !token || !userId) {
      clearAdminCache();
      return false;
    }

    const now = Date.now();
    if (
      !options.forceRefresh &&
      _adminCache.userId === userId &&
      _adminCache.token === token &&
      now - _adminCache.checkedAt < 60000
    ) {
      return _adminCache.isAdmin;
    }

    if (_adminVerifyPromise && !options.forceRefresh) {
      return _adminVerifyPromise;
    }

    _adminVerifyPromise = (async () => {
      try {
        let isAdmin = false;
        const profile = options.profile !== undefined ? options.profile : await fetchUserProfile();
        if (profile && (profile.is_admin === true || profile.role === 'admin')) {
          isAdmin = true;
        }
        if (!isAdmin) {
          const authUser = await fetchAuthUser();
          const appMeta = authUser?.app_metadata || {};
          if (appMeta.role === 'admin' || appMeta.is_admin === true) {
            isAdmin = true;
          }
        }
        _adminCache = { userId, token, isAdmin, checkedAt: Date.now() };
        return isAdmin;
      } catch {
        return false;
      } finally {
        _adminVerifyPromise = null;
      }
    })();

    return _adminVerifyPromise;
  }

  async function fetchAdminDashboardMetrics() {
    const cfg = getConfig();
    const token = await ensureValidToken();
    if (!cfg.configured || !token) return null;
    try {
      const fnRes = await fetch(`${cfg.url}/functions/v1/admin-metrics`, {
        method: 'POST',
        headers: {
          apikey: cfg.anonKey,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: '{}'
      });
      if (fnRes.ok) {
        return await fnRes.json();
      }
      if (fnRes.status === 404) {
        const rpcRes = await fetch(`${cfg.url}/rest/v1/rpc/get_admin_dashboard_metrics`, {
          method: 'POST',
          headers: {
            apikey: cfg.anonKey,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: '{}'
        });
        if (rpcRes.ok) {
          return await rpcRes.json();
        }
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
      throw new Error(errData.error || errData.message || `アカウント削除・課金解約に失敗しました (HTTP ${r.status})。Stripeカスタマーポータルより定期課金を解約の上、サポートへお問い合わせください。`);
    }

    // 退会成功時：端末内の全データ（IndexedDB / LocalStorage / オフラインキュー / 復習履歴）を完全消去
    try {
      if (global.VocabStorage?.clearAllClientStorageData) {
        await global.VocabStorage.clearAllClientStorageData();
      }
      if (global.VocabSRS?.clearReviewHistoryLog) {
        global.VocabSRS.clearReviewHistoryLog();
      }
    } catch (e) {
      console.warn('[Sync] Failed to clear client storage on account deletion:', e);
    }

    setSession(null);
    clearAdminCache();
    return true;
  }

  // [GDPR対応] ユーザーの全登録単語・学習進捗の完全JSONエクスポート
  async function exportAllUserDataJson() {
    const bundle = {};
    const allPairs = (global.VocabCore?.getAllKnownPairConfigs || global.getAllKnownPairConfigs)?.() || [];
    const keysToExport = new Set(SUPPORTED_LANGS);
    allPairs.forEach(p => {
      const id = p.pairId || p.key;
      if (id) keysToExport.add(id);
    });
    for (const l of keysToExport) {
      let b = await global.VocabStorage?.idbFetchLangBundle?.(l, true);
      if (!b?.words?.length) {
        const pairParts = String(l).split('_');
        const cfg = global.VocabStorage?.getPairConfig?.(pairParts[0], pairParts[1] || 'ja');
        const storageKey = cfg?.key || global.VocabStorage?.LANGS?.[l]?.key || l;
        const memWords = global.VocabStorage?.state?.mem?.[storageKey] || global.VocabStorage?.state?.mem?.[l];
        let lsWords = null;
        if (!memWords && typeof localStorage !== 'undefined') {
          try {
            const raw = localStorage.getItem(storageKey) || localStorage.getItem(l);
            if (raw) lsWords = JSON.parse(raw);
          } catch (_) {}
        }
        const fallbackWords = Array.isArray(memWords) ? memWords : (Array.isArray(lsWords) ? lsWords : null);
        if (fallbackWords && fallbackWords.length) {
          b = Object.assign({}, b, { words: fallbackWords });
        }
      }
      if (b && (b.words?.length || b.clearAt || (b.tombs && b.tombs.length) || (b.snaps && b.snaps.length))) {
        bundle[l] = b;
      }
    }
    const jsonStr = JSON.stringify(bundle, null, 2);
    const fileName = `vocab-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
    if (global.VocabExport && typeof global.VocabExport.dlBlob === 'function') {
      global.VocabExport.dlBlob([jsonStr], 'application/json', fileName);
      return;
    }
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  global.VocabSync = {
    computeDeltaSyncState,
    getConfig,
    saveConfig,
    getSession,
    setSession,
    getUser,
    isCloudReady,
    isProxyReady,
    signInOrSignUp,
    signOut,
    deleteUserAccount,
    exportAllUserDataJson,
    syncLangWithSupabase,
    syncAppSettingsWithSupabase,
    acquireSyncLock,
    callVocabGenerateProxy,
    callOcrProxy,
    callPassageExtractProxy,
    startStripeCheckout,
    openStripePortal,
    fetchUserProfile,
    fetchAuthUser,
    verifyAdminStatus,
    fetchAdminDashboardMetrics,
    clearAdminCache
  };

  global.startStripeCheckout = startStripeCheckout;
  global.openStripePortal = openStripePortal;
  global.exportAllUserDataJson = exportAllUserDataJson;
})(typeof window !== 'undefined' ? window : globalThis);

export {};
