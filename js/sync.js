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
    (Array.isArray(remoteEntries) ? remoteEntries : []).forEach(r => {
      if (!r) return;
      const wk = r.wordKey || makeWordKeyFn(r.word, lang, r.meanings?.[0]?.pos, r.homographIndex);
      if (r.id) remoteUpdById.set(r.id, r.updatedAt || 0);
      if (wk) remoteUpdByWk.set(wk, r.updatedAt || 0);
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
      const upd = it.updatedAt || 1;
      if (upd <= lastSyncAt) return false;
      const rUpd = Math.max(remoteUpdById.get(it.id) || 0, remoteUpdByWk.get(it.wordKey) || 0);
      return upd > rUpd && !isTombstonedFn(it, mergedTombMap, lang, mergedClearedAt);
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

  async function ensureValidToken() {
    const cfg = getConfig();
    let sess = getSession();
    if (!cfg.configured || !sess) return null;
    const nowSec = Math.floor(Date.now() / 1000);
    if (sess.expires_at && sess.expires_at - nowSec > 60) {
      return sess.access_token;
    }
    if (!sess.refresh_token) return sess.access_token;
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
    }
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

  async function syncLangWithSupabase(lang, appHooks) {
    const cfg = getConfig();
    const token = await ensureValidToken();
    const sess = getSession();
    if (!cfg.configured || !token || !sess?.user?.id) {
      throw new Error('クラウド未ログインです。');
    }
    const uid = sess.user.id;
    const lastSyncKey = `${LAST_SYNC_PREFIX}${uid}_${lang}`;
    const lastSyncAt = Number(safeLsGet(lastSyncKey, '0')) || 0;
    const headers = {
      apikey: cfg.anonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    const [entRes, tombRes, wmRes] = await Promise.all([
      fetch(`${cfg.url}/rest/v1/user_vocab_entries?user_id=eq.${encodeURIComponent(uid)}&lang=eq.${encodeURIComponent(lang)}&updated_at=gt.${lastSyncAt}&select=card_data,updated_at`, { headers }),
      fetch(`${cfg.url}/rest/v1/user_tombstones?user_id=eq.${encodeURIComponent(uid)}&lang=eq.${encodeURIComponent(lang)}&deleted_at=gt.${lastSyncAt}&select=tomb_key,deleted_at`, { headers }),
      fetch(`${cfg.url}/rest/v1/user_lang_watermarks?user_id=eq.${encodeURIComponent(uid)}&lang=eq.${encodeURIComponent(lang)}&select=cleared_at`, { headers })
    ]);

    if (!entRes.ok || !tombRes.ok || !wmRes.ok) {
      throw new Error(`同期Pull失敗 (HTTP ${entRes.status}/${tombRes.status}/${wmRes.status})`);
    }

    const remoteEntryRows = await entRes.json();
    const remoteTombRows = await tombRes.json();
    const remoteWmRows = await wmRes.json();

    const remoteEntries = (Array.isArray(remoteEntryRows) ? remoteEntryRows : []).map(r => ({
      ...(r.card_data || {}),
      updatedAt: Number(r.updated_at) || 1
    }));
    const remoteTombstones = (Array.isArray(remoteTombRows) ? remoteTombRows : []).map(r => ({
      key: String(r.tomb_key),
      deletedAt: Number(r.deleted_at) || 0
    }));
    const remoteClearedAt = (Array.isArray(remoteWmRows) && remoteWmRows[0]) ? Number(remoteWmRows[0].cleared_at) || 0 : 0;

    const syncStartTs = Date.now();
    const delta = computeDeltaSyncState({
      lang,
      localEntries: appHooks.getLocalEntries(lang),
      localTombMap: appHooks.getLocalTombMap(lang),
      localClearedAt: appHooks.getLocalClearedAt(lang),
      remoteEntries,
      remoteTombstones,
      remoteClearedAt,
      lastSyncAt,
      mergeWordsFn: appHooks.mergeWords,
      isTombstonedFn: appHooks.isTombstoned,
      makeWordKeyFn: appHooks.makeWordKey
    });

    appHooks.applyMergedLangState(lang, delta.mergedEntries, delta.mergedTombMap, delta.mergedClearedAt);

    const pushHeaders = { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' };

    if (delta.watermarkNeedsPush) {
      await fetch(`${cfg.url}/rest/v1/user_lang_watermarks?on_conflict=user_id,lang`, {
        method: 'POST',
        headers: pushHeaders,
        body: JSON.stringify([{ user_id: uid, lang, cleared_at: delta.mergedClearedAt }])
      });
    }

    if (delta.tombstonesToPush.length > 0) {
      const tombPayload = delta.tombstonesToPush.map(t => ({
        user_id: uid,
        lang,
        tomb_key: t.key,
        deleted_at: t.deletedAt
      }));
      await fetch(`${cfg.url}/rest/v1/user_tombstones?on_conflict=user_id,lang,tomb_key`, {
        method: 'POST',
        headers: pushHeaders,
        body: JSON.stringify(tombPayload)
      });
    }

    if (delta.entriesToPush.length > 0) {
      // [P1-1 解決] HTTP 413防止: 50件ごとのバッチに分割して同期
      const CHUNK_SIZE = 50;
      for (let i = 0; i < delta.entriesToPush.length; i += CHUNK_SIZE) {
        const chunk = delta.entriesToPush.slice(i, i + CHUNK_SIZE);
        const entryPayload = chunk.map(it => ({
          user_id: uid,
          id: it.id,
          lang,
          word_key: it.wordKey || appHooks.makeWordKey(it.word, lang, it.meanings?.[0]?.pos, it.homographIndex),
          num: it.num || 1,
          word: it.word,
          homograph_index: it.homographIndex || 1,
          folder: it.folder || null,
          category: it.category || 'その他',
          interval: Number(it.interval) || 0,
          repetition: Number(it.repetition) || 0,
          efactor: Number(it.efactor) || 2.5,
          next_review: Number(it.nextReview) || syncStartTs,
          card_data: it,
          updated_at: Number(it.updatedAt) || syncStartTs,
          review_updated_at: Number(it.reviewUpdatedAt || it.updatedAt) || syncStartTs,
          is_deleted: Boolean(it.isDeleted)
        }));

        try {
          const rpcRes = await fetch(`${cfg.url}/rest/v1/rpc/sync_vocab_entries_batch`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ p_entries: entryPayload })
          });
          if (!rpcRes.ok) {
            await fetch(`${cfg.url}/rest/v1/user_vocab_entries?on_conflict=user_id,id`, {
              method: 'POST',
              headers: pushHeaders,
              body: JSON.stringify(entryPayload)
            });
          }
        } catch {
          await fetch(`${cfg.url}/rest/v1/user_vocab_entries?on_conflict=user_id,id`, {
            method: 'POST',
            headers: pushHeaders,
            body: JSON.stringify(entryPayload)
          });
        }
      }
    }

    safeLsSet(lastSyncKey, String(syncStartTs));
    return {
      pulled: remoteEntries.length,
      pushed: delta.entriesToPush.length,
      tombPushed: delta.tombstonesToPush.length
    };
  }

  async function callVocabGenerateProxy({ lang, srcLang, tgtLang, useHist, fName, items }) {
    const cfg = getConfig();
    if (!cfg.configured) throw new Error('Supabase設定が未構成です。');
    const token = await ensureValidToken().catch(() => null);

    const sLang = srcLang || lang || 'en';
    const tLang = tgtLang || 'ja';

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
        useHist,
        fName,
        items
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

  async function startStripeCheckout(priceId = 'price_pro_monthly') {
    // [P0-5 解決] Google Play アプリ内直接課金規約の遵守 (リーダーアプリ要件)
    if (isAndroidPlayStoreApp()) {
      alert('【Google Play アプリをご利用のお客様へ】\nGoogle Playの決済規約に基づき、アプリ内からの直接Web決済は制限されています。\nProプランのご契約・管理は、SafariやChrome等のWebブラウザで公式サイト（Vocab Vault Web版）にアクセスし、本アカウントでログインの上お手続きください。\n（WebでPro化すると、本アプリでも即座にPro機能が自動反映されます）');
      return;
    }

    const cfg = getConfig();
    const token = await ensureValidToken();
    if (!cfg.configured || !token) {
      alert('Stripe決済をご利用いただくには、まずアカウントでログイン（または新規登録）してください。');
      return;
    }
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
        body: JSON.stringify({ priceId, returnUrl: window.location.href.split('?')[0] })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Checkoutの作成に失敗しました。');
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      alert(`決済エラー: ${e.message}`);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Proにアップグレード (¥480/月)'; }
      if (upsellBtn) { upsellBtn.disabled = false; upsellBtn.textContent = '今すぐProにアップグレード'; }
    }
  }

  async function openStripePortal() {
    const cfg = getConfig();
    const token = await ensureValidToken();
    if (!cfg.configured || !token) return;
    try {
      const r = await fetch(`${cfg.url}/functions/v1/stripe-portal`, {
        method: 'POST',
        headers: {
          apikey: cfg.anonKey,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ returnUrl: window.location.href.split('?')[0] })
      });
      const data = await r.json();
      if (data.url) window.location.href = data.url;
    } catch (e) {
      alert(`ポータル遷移エラー: ${e.message}`);
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
      // Edge Function が未デプロイ時のフェイルセーフ: RPCフォールバック
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
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || err.message || `アカウント削除に失敗しました (HTTP ${r.status})`);
      }
    }

    setSession(null);
    return true;
  }

  // [GDPR対応] ユーザーの全登録単語・学習進捗の完全JSONエクスポート
  async function exportAllUserDataJson() {
    const bundle = {};
    for (const l of ['en', 'fr', 'de']) {
      const b = await global.VocabStorage?.idbFetchLangBundle?.(l, true);
      bundle[l] = b || { words: [] };
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
    callVocabGenerateProxy,
    startStripeCheckout,
    openStripePortal,
    fetchUserProfile
  };

  global.startStripeCheckout = startStripeCheckout;
  global.openStripePortal = openStripePortal;
  global.exportAllUserDataJson = exportAllUserDataJson;
})(typeof window !== 'undefined' ? window : globalThis);

