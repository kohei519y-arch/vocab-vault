/**
 * VocabVault - UI Event Orchestration & App Lifecycle Engine
 *
 * 【設計思想・単一責任】
 * DOMイベント委譲（クリック・キーボード・IME・ドラッグ＆ドロップ）、
 * ウィンドウライフサイクル（PWAインストール・印刷・オンライン/オフライン・リサイズ）、
 * クラウドアカウントUI連携、データベース自己修復診断の集中制御。
 */

(function (global) {
  'use strict';

  function $(id) {
    if (global.VocabCore && typeof global.VocabCore.$ === 'function') {
      return global.VocabCore.$(id);
    }
    return typeof document !== 'undefined' ? document.getElementById(id) : null;
  }

  function $$(sel) {
    if (global.VocabCore && typeof global.VocabCore.$$ === 'function') {
      return global.VocabCore.$$(sel);
    }
    return typeof document !== 'undefined' ? [...document.querySelectorAll(sel)] : [];
  }

  function showToast(msg, type = 'info', ms = 3000) {
    if (global.VocabModal && typeof global.VocabModal.showToast === 'function') {
      return global.VocabModal.showToast(msg, type, ms);
    }
  }

  let lastManualSyncTime = 0;

  /**
   * クラウド差分同期を手動または自動で即時実行
   */
  async function syncCloudNow(manual = false, ctx = {}) {
    const lockFn = global.VocabSync?.acquireSyncLock || (fn => fn());
    return lockFn(async () => {
      const appState = ctx.appState || global.VocabCore?.App;
      if (!global.VocabSync?.isCloudReady?.()) {
        if (manual && typeof ctx.openSettings === 'function') ctx.openSettings();
        return;
      }

      // [Pro限定 Paywall] 複数端末クラウド自動差分同期は Proプラン専用機能
      if (!appState?.isPro && global.VocabSync?.isCloudReady?.() && typeof global.VocabSync.fetchUserProfile === 'function') {
        try {
          const p = await global.VocabSync.fetchUserProfile();
          if (p && appState) {
            appState.userProfile = p;
            if (global.VocabCore?.setProState) {
              global.VocabCore.setProState(p.plan === 'pro' || p.plan === 'academic');
            } else {
              appState.isPro = Boolean(appState.isDev || p.plan === 'pro' || p.plan === 'academic');
            }
          }
        } catch {}
      }
      if (!appState?.isPro) {
        if (manual) {
          const upsellMsg = '複数端末間のクラウド自動差分同期は Proプラン（月480円）限定機能です。スマホ・PC・タブレット間で学習履歴や復習スケジュールを完全自動同期できます。\n（※Freeプランでは「JSON保存/復元」による手動バックアップを永久無料でご利用いただけます）';
          if (typeof ctx.openUpsellModal === 'function') {
            ctx.openUpsellModal(upsellMsg);
          } else if (global.VocabModal?.openUpsellModal) {
            global.VocabModal.openUpsellModal(upsellMsg);
          } else if (global.VocabModal?.uiAlert) {
            global.VocabModal.uiAlert(upsellMsg);
          } else {
            showToast(upsellMsg, 'info');
          }
        }
        return;
      }

      const isJa = (global.VocabI18n?.getLocale?.() || 'ja') === 'ja';
      const now = Date.now();
      if (manual && now - lastManualSyncTime < 4000) {
        showToast(isJa ? '同期が完了したばかりです。数秒後に再度お試しください。' : 'Sync just completed. Please try again in a few seconds.', 'info', 2500);
        return;
      }
      if (appState && appState.isSyncing) return;
      if (global.VocabCore?.setSyncingState) global.VocabCore.setSyncingState(true);
      else if (appState) appState.isSyncing = true;
      if (manual) lastManualSyncTime = now;

      const topBadge = $('cloudSyncBadge');
      if (topBadge) topBadge.textContent = isJa ? '同期中...' : 'Syncing...';

      try {
        const hooks = typeof ctx.getAppSyncHooks === 'function' ? ctx.getAppSyncHooks() : (global.VocabCore?.getAppSyncHooks?.());
        let totalPulled = 0, totalPushed = 0;
        const getPairsFn = ctx.getAllKnownPairConfigs || global.VocabCore?.getAllKnownPairConfigs || (() => []);
        const allKnown = getPairsFn();
        // デフォルト4ペアと既存ペアを正規のペアID（src_tgt）で一意に統合
        const syncTargets = new Set(['en_ja', 'fr_ja', 'de_ja', 'ja_ja']);
        allKnown.forEach(p => {
          const pairId = p.pairId || (p.src && p.tgt ? `${p.src}_${p.tgt}` : null);
          if (pairId) syncTargets.add(pairId);
        });
        for (const l of syncTargets) {
          const res = await global.VocabSync.syncLangWithSupabase(l, hooks, true);
          totalPulled += res.pulled;
          totalPushed += res.pushed;
        }
        if (typeof global.VocabSync?.syncAppSettingsWithSupabase === 'function') {
          await global.VocabSync.syncAppSettingsWithSupabase().catch(() => null);
        }
        if ($('anki')?.style.display !== 'block' && typeof ctx.load === 'function' && appState) {
          ctx.load(appState.page);
        } else if (typeof ctx.renderSidebarTree === 'function') {
          ctx.renderSidebarTree();
        }
        updCloudUI(ctx);
        if (manual) {
          const syncDoneMsg = isJa
            ? `クラウド差分同期完了\n・受信(Pull): ${totalPulled} 件\n・送信(Push): ${totalPushed} 件`
            : `Cloud Sync Complete\n- Pulled: ${totalPulled}\n- Pushed: ${totalPushed}`;
          if (global.VocabModal?.uiAlert) await global.VocabModal.uiAlert(syncDoneMsg);
          else showToast(syncDoneMsg, 'ok');
        }
        return true;
      } catch (e) {
        if (manual) {
          const errMsg = isJa ? `同期エラー: ${e.message}` : `Sync Error: ${e.message}`;
          if (global.VocabModal?.uiAlert) await global.VocabModal.uiAlert(errMsg);
          else showToast(errMsg, 'err');
        }
        updCloudUI(ctx);
        return false;
      } finally {
        if (global.VocabCore?.setSyncingState) global.VocabCore.setSyncingState(false);
        else if (appState) appState.isSyncing = false;
      }
    });
  }

  const _adminServerTelemetry = {
    data: null,
    fetchedAt: 0,
    promise: null
  };

  function _escHtml(val) {
    if (global.VocabStorage?.esc) return global.VocabStorage.esc(val);
    return String(val ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderAdminServerMetrics(data, isVisible) {
    const box = $('adminServerStatsBox');
    if (!box) return;
    if (!isVisible) {
      box.style.display = 'none';
      return;
    }
    box.style.display = 'block';
    if (!data) return;

    const metaEl = $('adminServerStatsMeta');
    const usersEl = $('srvTotalUsers');
    const cacheEl = $('srvCacheStats');
    const usageEl = $('srvUsageVocab');
    const fbWiktEl = $('srvFeedbackWikt');
    const fbListEl = $('adminRecentFeedbacks');

    if (metaEl) {
      const ts = data.fetched_at ? new Date(data.fetched_at).toLocaleTimeString() : '--';
      metaEl.textContent = `Admins: ${Number(data.admin_users || 0)} | Synced: ${ts}`;
    }
    if (usersEl) {
      usersEl.textContent = `${Number(data.total_users || 0)} (${Number(data.pro_users || 0)}/${Number(data.free_users || 0)})`;
    }
    if (cacheEl) {
      cacheEl.textContent = `${Number(data.cache_entries || 0)} (${Number(data.verified_cache_entries || 0)}v) / ${Number(data.total_cache_hits || 0)}`;
    }
    if (usageEl) {
      usageEl.textContent = `${Number(data.today_ai_usage || 0)} / ${Number(data.total_vocab_entries || 0)}`;
    }
    if (fbWiktEl) {
      fbWiktEl.textContent = `${Number(data.feedback_count || 0)} / ${Number(data.wiktionary_refs || 0)}`;
    }
    if (fbListEl) {
      const items = Array.isArray(data.recent_feedbacks) ? data.recent_feedbacks : [];
      if (items.length === 0) {
        global.VocabDOM?.setSafeHtml(fbListEl, '<div style="font-size:10px;color:var(--s)">Recent feedbacks: 0</div>');
      } else {
        global.VocabDOM?.setSafeHtml(fbListEl, items.slice(0, 5).map(item => {
          const cat = _escHtml(item.category || 'general');
          const msg = _escHtml(String(item.message || '').slice(0, 140));
          const dt = item.created_at ? _escHtml(new Date(item.created_at).toLocaleDateString()) : '';
          return `<div style="padding:4px 8px;border:1px solid var(--b);border-radius:5px;font-size:10px;line-height:1.4">`
            + `<span style="color:var(--ac);font-weight:700">[${cat}]</span> `
            + `<span style="color:var(--t)">${msg}</span>`
            + (dt ? ` <span style="color:var(--s)">(${dt})</span>` : '')
            + `</div>`;
        }).join(''));
      }
    }
  }

  function maybeLoadAdminServerMetrics(syncMod, appState) {
    const ready = Boolean(syncMod?.isCloudReady?.());
    const isAdmin = Boolean(
      appState?.isDev ||
      appState?._serverAdmin ||
      appState?.isAdmin ||
      global.VocabCore?.isAdmin?.()
    );
    if (!ready || !isAdmin) {
      if (!ready) {
        _adminServerTelemetry.data = null;
        _adminServerTelemetry.fetchedAt = 0;
      }
      renderAdminServerMetrics(null, false);
      return;
    }
    if (_adminServerTelemetry.data) {
      renderAdminServerMetrics(_adminServerTelemetry.data, true);
    }
    if (!syncMod?.fetchAdminDashboardMetrics) return;
    const now = Date.now();
    if (_adminServerTelemetry.promise || (now - _adminServerTelemetry.fetchedAt < 30000 && _adminServerTelemetry.data)) {
      return;
    }
    _adminServerTelemetry.promise = syncMod.fetchAdminDashboardMetrics()
      .then(data => {
        if (data) {
          _adminServerTelemetry.data = data;
          _adminServerTelemetry.fetchedAt = Date.now();
          const stillAdmin = Boolean(appState?.isDev || appState?._serverAdmin || appState?.isAdmin);
          renderAdminServerMetrics(data, Boolean(syncMod?.isCloudReady?.() && stillAdmin));
        }
        return data;
      })
      .catch(() => null)
      .finally(() => {
        _adminServerTelemetry.promise = null;
      });
  }

  /**
   * クラウドUIバッジ・アカウント状態を更新
   */
  let _profileReqSeq = 0;

  function updCloudUI(ctx = {}) {
    const reqSeq = ++_profileReqSeq;
    const appState = ctx.appState || global.VocabCore?.App;
    const syncMod = global.VocabSync;
    const ready = Boolean(syncMod?.isCloudReady?.());
    const sess = syncMod?.getSession?.();
    const topBadge = $('cloudSyncBadge');
    const sbBadge = $('sbStatusBadge') || $('sbCloudStatusBadge');
    const authRow = $('sbAuthFormRow') || $('sbCloudAuthRow');
    const loggedRow = $('sbLoggedInRow') || $('sbCloudLoggedRow');
    const userTxt = $('sbUserText') || $('sbCloudUserText');
    const quotaTxt = $('sbQuotaText') || $('sbCloudQuotaText');
    const aiQuotaBadge = $('aiQuotaBadge');

    const curLocale = global.VocabI18n?.getLocale?.() || 'ja';
    const isJa = curLocale === 'ja';
    const t = (k, fb) => (global.VocabI18n?.t ? global.VocabI18n.t(k, fb) : fb);
    const isAdmin = Boolean(
      appState?.isDev ||
      appState?._serverAdmin ||
      appState?.isAdmin ||
      global.VocabCore?.isAdmin?.()
    );

    if (!ready && appState) {
      if (global.VocabCore?.setAdminState) global.VocabCore.setAdminState(false);
      else {
        appState._serverAdmin = false;
        appState.isAdmin = Boolean(appState.isDev);
      }
    }
    if (global.VocabCore?.applyAdminVisibility) {
      global.VocabCore.applyAdminVisibility();
    }
    maybeLoadAdminServerMetrics(syncMod, appState);

    const usageInfo = global.VocabStorage?.getDailyAiUsageInfo ? global.VocabStorage.getDailyAiUsageInfo({ appState }) : null;
    if (aiQuotaBadge && usageInfo) {
      if (usageInfo.isUnlimited) {
        aiQuotaBadge.className = 'badge ok';
        aiQuotaBadge.textContent = isJa ? 'AI生成: 無制限' : (t('common.ai_unlimited') || 'AI Gen: Unlimited');
        aiQuotaBadge.title = isAdmin
          ? (isJa ? 'AI生成: 無制限 (Pro / 管理者 / 開発者 / BYOK)' : (t('common.ai_unlimited_title') || 'AI Gen: Unlimited (Pro / Admin / Dev / BYOK)'))
          : (isJa ? 'AI生成: 無制限 (Pro)' : (t('common.ai_unlimited_pro_title') || 'AI Gen: Unlimited (Pro)'));
      } else {
        const rem = usageInfo.remaining;
        aiQuotaBadge.textContent = isJa ? `AI残: ${rem}/${usageInfo.limit}語` : (t('common.ai_quota_left', { rem, limit: usageInfo.limit }) || `AI Left: ${rem}/${usageInfo.limit}`);
        if (rem === 0) {
          aiQuotaBadge.className = 'badge ng';
          aiQuotaBadge.title = isJa ? '本日の無料AI生成枠（5語/日）に達しました。Proで無制限' : (t('common.ai_quota_zero_title') || 'Daily free AI quota reached (5 words/day). Unlimited with Pro');
        } else if (rem <= 2) {
          aiQuotaBadge.className = 'badge warn';
          aiQuotaBadge.title = isJa ? `残り${rem}語。Proで無制限解放` : (t('common.ai_quota_warn_title', { rem }) || `${rem} remaining. Unlock unlimited with Pro`);
        } else {
          aiQuotaBadge.className = 'badge ok';
          aiQuotaBadge.title = isJa ? `本日のAI新規生成残り枠: ${rem}語 (キャッシュ時は消費なし)` : (t('common.ai_quota_rem_title', { rem }) || `Daily AI generation remaining: ${rem} (Zero cost when cached)`);
        }
      }
    }

    // 一般利用者向け AI残枠表示更新
    const userDailyQuotaVal = $('userDailyQuotaVal');
    const userQuotaPlanBadge = $('userQuotaPlanBadge');
    const wordsUnit = isJa ? '語' : (t('common.unit_words') || 'words');
    if (userDailyQuotaVal && usageInfo) {
      if (usageInfo.isUnlimited) {
        const unlimLabel = isJa ? '無制限' : (t('common.unlimited') || 'Unlimited');
        global.VocabDOM?.setSafeHtml(userDailyQuotaVal, `${unlimLabel} <small style="font-size:11px">(Pro)</small>`);
      } else {
        const unit = isJa ? `/${usageInfo.limit}語` : `/${usageInfo.limit} ${wordsUnit}`;
        global.VocabDOM?.setSafeHtml(userDailyQuotaVal, `${usageInfo.remaining} <small style="font-size:11px">${unit}</small>`);
      }
    }
    if (userQuotaPlanBadge && usageInfo) {
      userQuotaPlanBadge.textContent = usageInfo.isUnlimited
        ? (t('settings.pro_plan') || 'Pro プラン')
        : (t('settings.free_plan') || 'Free プラン');
      userQuotaPlanBadge.className = `badge ${usageInfo.isUnlimited ? 'ok' : ''}`;
    }

    // 管理者専用メトリクス表示更新
    if (global.VocabStorage?.getMetricsSummary) {
      const summary = global.VocabStorage.getMetricsSummary();
      const mTotal = $('metricTotalWords');
      const mCache = $('metricCacheRate');
      const mTokens = $('metricTokensSaved');
      const mQuota = $('metricDailyQuota');
      const mCloudGen = $('metricCloudGen');
      const mCacheHits = $('metricCacheHits');
      const mOnDevice = $('metricOnDeviceHits');
      const mReviewLogs = $('metricReviewLogCount');
      if (mTotal) global.VocabDOM?.setSafeHtml(mTotal, `${summary.totalWords} <small style="font-size:11px">${wordsUnit}</small>`);
      if (mCache) mCache.textContent = `${summary.cacheRate}%`;
      if (mTokens) global.VocabDOM?.setSafeHtml(mTokens, `${summary.tokensSaved.toLocaleString()} <small style="font-size:11px">tok</small>`);
      if (mCloudGen) mCloudGen.textContent = `${summary.cloudGen || 0}`;
      if (mCacheHits) mCacheHits.textContent = `${summary.cacheHits || 0}`;
      if (mOnDevice) mOnDevice.textContent = `${summary.onDevice || 0}`;
      if (mReviewLogs) {
        const logLen = global.VocabSRS?.getReviewHistoryLog ? global.VocabSRS.getReviewHistoryLog().length : 0;
        mReviewLogs.textContent = `${logLen}`;
      }
      if (mQuota && usageInfo) {
        if (usageInfo.isUnlimited) {
          const unlimLabel = isJa ? '無制限' : (t('common.unlimited') || 'Unlimited');
          global.VocabDOM?.setSafeHtml(mQuota, `${unlimLabel} <small style="font-size:11px">(Pro)</small>`);
        } else {
          const unit = isJa ? `/${usageInfo.limit}語` : `/${usageInfo.limit} ${wordsUnit}`;
          global.VocabDOM?.setSafeHtml(mQuota, `${usageInfo.remaining} <small style="font-size:11px">${unit}</small>`);
        }
      }
    }

    if (topBadge) {
      if (ready) {
        const email = sess?.user?.email || '';
        const shortMail = email ? email.split('@')[0] : '';
        topBadge.className = 'badge ok';
        const cloudLabel = isJa ? 'クラウド' : (t('common.cloud') || 'Cloud');
        topBadge.textContent = appState?.isPro ? `${cloudLabel}: Pro` : (shortMail ? `${cloudLabel}: Free (${shortMail})` : `${cloudLabel}: Free`);
        topBadge.style.cursor = 'pointer';
        topBadge.onclick = () => {
          if (appState && appState.quotaRemaining === 0 && typeof ctx.openUpsellModal === 'function') {
            ctx.openUpsellModal(isJa ? '本日のAI新規生成無料枠（5語/日）をすべて消費しました。Proプラン（月480円）で実質無制限（月3,000語）にアップグレードできます。' : (t('common.quota_exhausted_modal') || 'Daily free AI generation quota exhausted. Upgrade to Pro for unlimited generation.'));
          } else if (typeof ctx.openSettings === 'function') {
            ctx.openSettings();
          }
        };
      } else if (isAdmin && ctx.getKey && ctx.getKey()) {
        topBadge.className = 'badge ok';
        topBadge.textContent = isJa ? 'カスタムAPI(BYOK)' : (t('common.custom_byok') || 'Custom API (BYOK)');
        topBadge.style.cursor = 'pointer';
        topBadge.onclick = ctx.openSettings || global.VocabCore?.openSettings;
      } else if (isAdmin) {
        topBadge.className = 'badge ok';
        topBadge.textContent = isJa ? '内蔵AI: 稼働中 (完全機密保護)' : (t('settings.ai_engine_badge') || 'Embedded AI: Active (Full Privacy)');
        topBadge.style.cursor = 'pointer';
        topBadge.onclick = ctx.openSettings || global.VocabCore?.openSettings;
      } else {
        topBadge.className = 'badge';
        topBadge.textContent = t('toolbar.cloud_logged_out') || (isJa ? 'クラウド: 未ログイン' : 'Cloud: Logged Out');
        topBadge.style.cursor = 'pointer';
        topBadge.onclick = ctx.openSettings || global.VocabCore?.openSettings;
      }
    }
    if (sbBadge) {
      sbBadge.className = `badge ${ready ? 'ok' : 'ng'}`;
      if (ready) {
        sbBadge.textContent = appState?.isPro
          ? (isJa ? 'ログイン済・同期有効 (Pro)' : (t('settings.logged_in_pro') || 'Logged in & Syncing (Pro)'))
          : (isJa ? 'ログイン中 (Free: 1端末ローカル保持)' : (t('settings.logged_in_free') || 'Logged in (Free: 1 device)'));
      } else {
        sbBadge.textContent = isJa ? '未ログイン' : (t('settings.not_logged_in') || 'Not Logged In');
      }
    }
    if (authRow && loggedRow) {
      authRow.style.display = ready ? 'none' : 'flex';
      loggedRow.style.display = ready ? 'flex' : 'none';
    }
    if (userTxt && sess?.user?.email) {
      userTxt.textContent = isJa
        ? `ログイン中: ${sess.user.email} (${appState?.isPro ? 'Proプラン' : 'Freeプラン'})`
        : `${t('settings.logged_in_as') || 'Logged in:'} ${sess.user.email} (${appState?.isPro ? (t('settings.pro_plan') || 'Pro Plan') : (t('settings.free_plan') || 'Free Plan')})`;
    }
    if (quotaTxt && usageInfo) {
      if (usageInfo.isUnlimited) {
        quotaTxt.textContent = isAdmin
          ? (isJa ? 'AI新規生成クォータ: 無制限（Pro・BYOK・管理者/開発者）' : (t('settings.quota_unlimited_desc') || 'Daily AI Generation Quota: Unlimited (Pro / Admin / Dev)'))
          : (isJa ? 'AI新規生成クォータ: 無制限（Proプラン）' : (t('settings.quota_unlimited_pro_desc') || 'Daily AI Generation Quota: Unlimited (Pro Plan)'));
      } else {
        quotaTxt.textContent = isJa
          ? `本日のAI新規生成クォータ残り: ${usageInfo.remaining} / ${usageInfo.limit} 語（共有辞書キャッシュ・スターターパックは無制限。全自動クラウド同期はPro限定）`
          : (t('settings.quota_limited_desc', { remaining: usageInfo.remaining, limit: usageInfo.limit }) || `Daily AI Generation Quota remaining: ${usageInfo.remaining} / ${usageInfo.limit} words (Shared cache & starter packs are unlimited. Cloud Sync is Pro only)`);
      }
    }
    if ($('cfgDot')) {
      const canGen = typeof ctx.canGenerateWords === 'function' ? ctx.canGenerateWords() : true;
      $('cfgDot').classList.toggle('warn', !canGen || Boolean(appState?.storageError));
    }

    const delSec = $('sbDeleteAccountSec');
    if (delSec) delSec.style.display = ready ? 'block' : 'none';

    if (ready && syncMod?.fetchUserProfile) {
      syncMod.fetchUserProfile().then(async p => {
        if (!p || reqSeq !== _profileReqSeq || !syncMod?.isCloudReady?.()) return;
        const isPro = global.VocabCore?.setProState
          ? global.VocabCore.setProState(p.plan === 'pro' || p.plan === 'academic')
          : Boolean(appState?.isDev || p.plan === 'pro' || p.plan === 'academic');
        if (appState && !global.VocabCore?.setProState) appState.isPro = isPro;

        const verifiedAdmin = syncMod.verifyAdminStatus
          ? await syncMod.verifyAdminStatus({ profile: p })
          : Boolean(p.is_admin === true || p.role === 'admin');
        if (reqSeq !== _profileReqSeq || !syncMod?.isCloudReady?.()) return;
        if (appState) {
          const prevAdmin = Boolean(appState.isAdmin);
          if (global.VocabCore?.setAdminState) {
            global.VocabCore.setAdminState(verifiedAdmin);
          } else {
            appState._serverAdmin = verifiedAdmin;
            appState.isAdmin = Boolean(appState.isDev || verifiedAdmin);
            if (global.VocabCore?.applyAdminVisibility) {
              global.VocabCore.applyAdminVisibility();
            }
          }
          maybeLoadAdminServerMetrics(syncMod, appState);
          if (prevAdmin !== appState.isAdmin && quotaTxt && usageInfo?.isUnlimited) {
            quotaTxt.textContent = appState.isAdmin
              ? (isJa ? 'AI新規生成クォータ: 無制限（Pro・BYOK・管理者/開発者）' : (t('settings.quota_unlimited_desc') || 'Daily AI Generation Quota: Unlimited (Pro / Admin / Dev)'))
              : (isJa ? 'AI新規生成クォータ: 無制限（Proプラン）' : (t('settings.quota_unlimited_pro_desc') || 'Daily AI Generation Quota: Unlimited (Pro Plan)'));
          }
        }

        if (!appState?.isDev) {
          const curLocale = global.VocabI18n?.getLocale?.() || 'ja';
          const tFn = (k, fb) => (global.VocabI18n?.t ? global.VocabI18n.t(k, fb) : fb);
          const planBadge = $('curPlanBadge');
          if (planBadge) {
            if (p.grace_period_until && new Date(p.grace_period_until) > new Date()) {
              const graceStr = new Date(p.grace_period_until).toLocaleDateString(curLocale);
              planBadge.textContent = curLocale === 'ja'
                ? `決済更新待ち (猶予: ${graceStr}まで)`
                : `Pending Payment (Grace: until ${graceStr})`;
              planBadge.className = 'badge warn';
            } else if (isPro && p.cancel_at_period_end) {
              const expStr = p.current_period_end ? ` (${new Date(p.current_period_end).toLocaleDateString(curLocale)})` : '';
              planBadge.textContent = `${tFn('settings.pro_plan', 'Pro プラン')} ${tFn('settings.plan_canceling', '(期間満了で終了予定)')}${expStr}`;
              planBadge.className = 'badge warn';
            } else {
              planBadge.textContent = isPro ? tFn('settings.pro_plan', 'Pro プラン') : tFn('settings.free_plan', 'Free プラン');
              planBadge.className = `badge ${isPro ? 'ok' : 'ng'}`;
            }
          }
          $('planCardFree')?.classList.toggle('current', !isPro);
          $('planCardPro')?.classList.toggle('current', isPro);
          if ($('btnUpgradePro')) $('btnUpgradePro').style.display = isPro ? 'none' : 'block';
          if ($('btnManageSub')) $('btnManageSub').style.display = isPro ? 'block' : 'none';
        }
      });
    }

    if (appState && appState.isDev) {
      const tFn = (k, fb) => (global.VocabI18n?.t ? global.VocabI18n.t(k, fb) : fb);
      const planBadge = $('curPlanBadge');
      if (planBadge) {
        planBadge.textContent = tFn('settings.dev_badge', 'Developer Edition (全機能永久無制限)');
        planBadge.className = 'badge ok';
      }
      $('planCardFree')?.classList.remove('current');
      $('planCardPro')?.classList.add('current');
      if ($('btnUpgradePro')) $('btnUpgradePro').style.display = 'none';
      if ($('btnManageSub')) $('btnManageSub').style.display = 'none';
      let devNotice = $('devEditionNotice');
      if (!devNotice && $('planCardPro') && typeof document.createElement === 'function') {
        devNotice = document.createElement('div');
        devNotice.id = 'devEditionNotice';
        devNotice.style.cssText = 'margin-top:8px;padding:8px 10px;background:var(--bg-hov);border-radius:6px;font-size:11.5px;color:var(--ac);font-weight:600;text-align:center';
        devNotice.textContent = tFn('settings.dev_notice', '開発者マスター権限により全機能が無制限解放されています（課金不要）');
        if (typeof $('planCardPro').appendChild === 'function') $('planCardPro').appendChild(devNotice);
      } else if (devNotice) {
        devNotice.textContent = tFn('settings.dev_notice', '開発者マスター権限により全機能が無制限解放されています（課金不要）');
      }
    }
  }

  /**
   * クラウドログイン / 新規登録
   */
  let _isAuthSubmitting = false;

  async function cloudLogin(isSignUp = false, ctx = {}) {
    if (_isAuthSubmitting) return;
    const isJa = (global.VocabI18n?.getLocale?.() || 'ja') === 'ja';
    if (!global.VocabSync) {
      showToast(isJa ? 'VocabSyncモジュールが読み込まれていません。' : 'VocabSync module is not loaded.', 'err');
      return;
    }
    const defCfg = global.VocabSync.getConfig ? global.VocabSync.getConfig() : {};
    const url = $('sbUrlInput')?.value.trim() || defCfg.url || '';
    const anon = $('sbAnonInput')?.value.trim() || defCfg.anonKey || '';
    const email = $('sbEmailInput')?.value.trim() || '';
    const pass = $('sbPassInput')?.value || '';
    if (!url || !anon) {
      showToast(isJa ? 'Supabase URL と Anon Key を入力してください。' : 'Please enter Supabase URL and Anon Key.', 'warn');
      return;
    }
    if (!email || pass.length < 6) {
      showToast(isJa ? 'メールアドレスと6文字以上のパスワードを入力してください。' : 'Please enter an email and a password of at least 6 characters.', 'warn');
      return;
    }

    if (isSignUp) {
      const agreed = $('chkTermsAgree')?.checked;
      if (!agreed) {
        showToast(isJa ? '新規登録を行うには、利用規約およびプライバシーポリシーへの同意が必要です。チェックボックスをオンにしてください。' : 'Please agree to the Terms of Service and Privacy Policy before signing up.', 'warn');
        return;
      }
    }

    const authButtons = $('sbAuthFormRow')?.querySelectorAll?.('button') || [];
    _isAuthSubmitting = true;
    authButtons.forEach(b => { b.disabled = true; });
    global.VocabSync.saveConfig(url, anon);
    try {
      const res = await global.VocabSync.signInOrSignUp(email, pass, isSignUp);
      if (isSignUp && !res.access_token) {
        const verifyMsg = isJa ? '確認メールを送信しました。メール内のリンクを確認後にログインしてください。' : 'Confirmation email sent. Please verify your email link before signing in.';
        if (global.VocabModal?.uiAlert) await global.VocabModal.uiAlert(verifyMsg);
        else showToast(verifyMsg, 'ok', 6000);
        return;
      }
      updCloudUI(ctx);
      await syncCloudNow(false, ctx);
    } catch (e) {
      const authErrMsg = isJa ? `クラウド認証エラー: ${e.message}` : `Authentication Error: ${e.message}`;
      if (global.VocabModal?.uiAlert) await global.VocabModal.uiAlert(authErrMsg);
      else showToast(authErrMsg, 'err');
    } finally {
      _isAuthSubmitting = false;
      authButtons.forEach(b => { b.disabled = false; });
    }
  }

  /**
   * クラウドログアウト
   */
  async function cloudLogout(ctx = {}) {
    const appState = ctx.appState || global.VocabCore?.App;
    if (!global.VocabSync) return;
    _profileReqSeq++;
    if (appState) {
      if (global.VocabCore?.setAdminState) global.VocabCore.setAdminState(false);
      else {
        appState._serverAdmin = false;
        appState.isAdmin = Boolean(appState.isDev);
      }
      if (global.VocabCore?.setProState) global.VocabCore.setProState(false);
      else appState.isPro = Boolean(appState.isDev);
    }
    await global.VocabSync.signOut();
    _profileReqSeq++;
    if (appState) {
      appState.entries = [];
      appState.reqQueue = [];
      appState.aList = [];
      appState.quotaRemaining = null;
    }
    if (global.VocabCore?.applyAdminVisibility) global.VocabCore.applyAdminVisibility();
    if (typeof ctx.render === 'function') ctx.render();
    if (typeof ctx.renderSidebarTree === 'function') ctx.renderSidebarTree();
    if (typeof ctx.updStats === 'function') ctx.updStats();
    updCloudUI(ctx);
  }

  /**
   * アカウント完全抹消（GDPR対応）
   */
  async function deleteAccountPermanently(ctx = {}) {
    const appState = ctx.appState || global.VocabCore?.App;
    const isJa = (global.VocabI18n?.getLocale?.() || 'ja') === 'ja';
    if (!global.VocabSync?.isCloudReady?.()) {
      showToast(isJa ? 'クラウドにログインしていません。' : 'You are not signed in to cloud sync.', 'warn');
      return;
    }
    const sess = global.VocabSync.getSession();
    const email = sess?.user?.email || '';
    const curLocale = global.VocabI18n?.getLocale?.() || 'ja';
    const DELETE_KEYWORDS = {
      ja: '退会', en: 'DELETE', fr: 'SUPPRIMER', de: 'LÖSCHEN',
      es: 'ELIMINAR', it: 'ELIMINA', pt: 'EXCLUIR', nl: 'VERWIJDEREN',
      zh: '注销', ko: '탈퇴'
    };
    const keyword = DELETE_KEYWORDS[curLocale] || 'DELETE';
    const t = (k, params, fb) => (global.VocabI18n?.t ? global.VocabI18n.t(k, params, curLocale, fb) : fb);

    const firstMsg = t('settings.delete_first_confirm', { email }, `【重要・警告】\n${email} の全データ（クラウド単語帳、学習履歴、アカウント情報）を完全に抹消します。\n※Proプラン契約中の方はStripeサブスクリプションも即時自動解約されます。\nこの操作は取り消せません。本当に退会しますか？`);
    const okFirst = global.VocabModal?.uiConfirm ? await global.VocabModal.uiConfirm(firstMsg, { danger: true }) : false;
    if (!okFirst) return;

    const backupMsg = t('settings.delete_backup_confirm', {}, '退会する前に、登録した単語帳データをJSONファイルとしてダウンロード（保存）しますか？');
    const wantBackup = global.VocabModal?.uiConfirm ? await global.VocabModal.uiConfirm(backupMsg) : false;
    if (wantBackup) {
      await global.VocabSync?.exportAllUserDataJson?.();
    }

    const finalMsg = t('settings.delete_final_confirm', { keyword }, `最終確認: データを完全に消去する場合は「${keyword}」と入力してください。`);
    const userInput = global.VocabModal?.uiPrompt ? await global.VocabModal.uiPrompt(finalMsg, '', { danger: true }) : null;
    if (!userInput || userInput.trim() !== keyword) {
      showToast(t('settings.delete_cancelled', {}, '入力内容が一致しなかったため、退会処理を中止しました。'), 'info');
      return;
    }

    try {
      await global.VocabSync.deleteUserAccount();
      // IndexedDB の全ストアおよび LocalStorage の全関連データを完全物理消去
      if (global.VocabStorage?.idbClearAll) {
        await global.VocabStorage.idbClearAll();
      }
      try {
        if (typeof localStorage !== 'undefined') {
          const keysToWipe = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('distinction_entries') || k.startsWith('vocab_snapshot') || k.startsWith('vv_'))) {
              keysToWipe.push(k);
            }
          }
          keysToWipe.forEach(k => localStorage.removeItem(k));
        }
      } catch {}
      _profileReqSeq++;
      if (appState) {
        appState.entries = [];
        appState.aList = [];
        appState.quotaRemaining = null;
        if (global.VocabCore?.setAdminState) global.VocabCore.setAdminState(false);
        else {
          appState._serverAdmin = false;
          appState.isAdmin = Boolean(appState.isDev);
        }
        if (global.VocabCore?.setProState) global.VocabCore.setProState(false);
        else appState.isPro = Boolean(appState.isDev);
      }
      if (global.VocabCore?.applyAdminVisibility) global.VocabCore.applyAdminVisibility();
      updCloudUI(ctx);
      if (typeof ctx.load === 'function') ctx.load(1);
      if (global.VocabModal && typeof global.VocabModal.toggleModal === 'function') {
        global.VocabModal.toggleModal('settingsModal', false);
      }
      showToast(t('settings.delete_completed', {}, 'アカウントおよび全てのクラウドデータが完全に抹消されました。ご利用ありがとうございました。'), 'ok', 6000);
    } catch (e) {
      const delErrMsg = t('settings.delete_failed', { error: e.message }, `退会処理エラー: ${e.message}`);
      if (global.VocabModal?.uiAlert) await global.VocabModal.uiAlert(delErrMsg);
      else showToast(delErrMsg, 'err');
    }
  }

  /**
   * データベース整合性診断 & 自動修復（Self-Healing Diagnostics）
   */
  async function runDatabaseDiagnosticsAndRepair(ctx = {}) {
    showToast('データベース整合性診断を実行中...', 'info', 2000);
    const now = Date.now();
    let totalScanned = 0;
    let issuesFixed = 0;
    let tombstonesPruned = 0;
    const reportDetails = [];

    const allKnown = (ctx.getAllKnownPairConfigs || global.VocabCore?.getAllKnownPairConfigs || (() => []))();
    const targetPairs = new Map();
    (global.VocabStorage?.LANG_KEYS || ['en', 'fr', 'de', 'ja']).forEach(l => {
      const cfg = global.VocabStorage?.resolveConfig ? global.VocabStorage.resolveConfig(l) : null;
      const key = cfg ? cfg.key : `distinction_entries_${l}`;
      targetPairs.set(key, { key, srcLang: l });
    });
    allKnown.forEach(p => {
      const key = p.key || (p.pairId ? `distinction_entries_${p.pairId}` : null);
      if (key && !targetPairs.has(key)) {
        targetPairs.set(key, { key, srcLang: p.srcLang || p.lang || 'en' });
      }
    });

    for (const [key, pairMeta] of targetPairs.entries()) {
      const getJsonFn = ctx.getJson || global.VocabCore?.getJson;
      const setJsonFn = ctx.setJson || global.VocabCore?.setJson;
      const list = typeof getJsonFn === 'function' ? getJsonFn(key) : [];
      if (!Array.isArray(list) || !list.length) continue;

      totalScanned += list.length;
      let langFixed = 0;
      const seenIds = new Set();
      const validEntries = [];

      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        let itemModified = false;

        // 1. IDの補完・重複修復
        if (!item.id || typeof item.id !== 'string') {
          item.id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          itemModified = true;
        }
        if (seenIds.has(item.id)) {
          item.id = `${item.id}_${Math.random().toString(36).slice(2, 5)}`;
          itemModified = true;
        }
        seenIds.add(item.id);

        // 2. タイムスタンプ・SRS状態の正規化
        let srsModified = false;
        if (!Number.isFinite(item.updatedAt) || item.updatedAt <= 0 || item.updatedAt > now + 86400000 * 365) {
          item.updatedAt = now;
          itemModified = true;
        }
        if (!Number.isFinite(item.nextReview) || item.nextReview < 0) {
          item.nextReview = now + 86400000;
          itemModified = true;
          srsModified = true;
        }
        if (!Number.isFinite(item.interval) || item.interval < 0) {
          item.interval = 1;
          itemModified = true;
          srsModified = true;
        }
        if (!Number.isFinite(item.efactor) || item.efactor < 1.3 || item.efactor > 4.0) {
          item.efactor = 2.5;
          itemModified = true;
          srsModified = true;
        }
        if (item.stability !== undefined && (!Number.isFinite(item.stability) || item.stability <= 0)) {
          item.stability = Number.isFinite(item.interval) && item.interval > 0 ? item.interval : 1.0;
          itemModified = true;
          srsModified = true;
        }
        if (item.difficulty !== undefined && (!Number.isFinite(item.difficulty) || item.difficulty < 1.0 || item.difficulty > 10.0)) {
          item.difficulty = 5.0;
          itemModified = true;
          srsModified = true;
        }

        // 3. wordKey の補完
        if (!item.wordKey) {
          const mkWk = global.VocabMorphology?.makeWordKey || global.VocabCore?.makeWordKey;
          if (mkWk) {
            item.wordKey = mkWk(item.word, pairMeta.srcLang, item.meanings?.[0]?.pos, item.homographIndex);
            itemModified = true;
          }
        }

        // 4. ダミー・プレースホルダー語義（中心的語義）の自己修復
        const firstM = String(item.meanings?.[0]?.text || '');
        const isPlaceholder = firstM.includes('の中心的語義') || firstM === '成句・熟語表現' || (item.core && item.core.includes('の中心的用法および文脈的機能に基づくコアイメージ'));
        if (isPlaceholder) {
          let repaired = false;
          if (pairMeta.srcLang === 'en' && typeof global.lookupEssentialLexicon === 'function') {
            const rich = global.lookupEssentialLexicon(item.word);
            if (rich && Array.isArray(rich.meanings) && rich.meanings.length > 0) {
              item.meanings = rich.meanings;
              if (rich.core) item.core = rich.core;
              if (rich.etymology) item.etymology = rich.etymology;
              if (rich.etymologyTags) item.etymologyTags = rich.etymologyTags;
              if (rich.grammar_forms) item.grammar_forms = rich.grammar_forms;
              if (rich.category !== undefined) item.category = rich.category;
              if (rich.phonetic) item.phonetic = rich.phonetic;
              if (rich.example) item.example = rich.example;
              repaired = true;
            }
          }
          if (!repaired) {
            item.needsRegeneration = true;
          }
          itemModified = true;
        }

        if (itemModified) {
          item.version = (Number(item.version) || 1) + 1;
          item.updatedAt = now;
          if (srsModified) item.reviewUpdatedAt = now;
          langFixed++;
          issuesFixed++;
        }
        validEntries.push(item);
      }

      if (langFixed > 0 && typeof setJsonFn === 'function') {
        setJsonFn(key, validEntries, true);
        reportDetails.push(`${key}: ${langFixed}件の不整合を修復`);
      }

      // 4. Tombstone バキューム
      if (global.VocabStorage?.vacuumOldTombstones) {
        const preTombCount = global.VocabStorage.getTombstones(key).size;
        const cleaned = global.VocabStorage.vacuumOldTombstones(key);
        const pruned = preTombCount - cleaned.size;
        if (pruned > 0) {
          tombstonesPruned += pruned;
          reportDetails.push(`${key}: ${pruned}件の期限切れTombstoneをパージ`);
        }
      }
    }

    if (typeof ctx.load === 'function' && ctx.appState) ctx.load(ctx.appState.page);

    const summaryMsg = issuesFixed > 0 || tombstonesPruned > 0
      ? `診断・修復完了: ${totalScanned}語を検証、${issuesFixed}件の不整合を自動修復、${tombstonesPruned}件の不要Tombstoneを削除しました。`
      : `診断完了: 全${totalScanned}語の整合性は100%正常です（エラーなし・データ完全性維持）。`;

    showToast(summaryMsg, 'ok', 5000);
    const diagReport = `【データベース健全性診断レポート】\n\n・検証対象単語: ${totalScanned} 語\n・修復した不整合: ${issuesFixed} 箇所\n・パージした古い削除マーカー: ${tombstonesPruned} 件\n・データベース状態: 最適化済み（Healthy: 100%）\n\n${reportDetails.join('\n') || 'すべてのデータが完全整合しています。'}`;
    if (global.VocabModal?.uiAlert) global.VocabModal.uiAlert(diagReport);
  }

  /**
   * 期日超過カードを今後7日間に均等スヌーズ再分散（SSOT統一処理）
   */
  function rescheduleOverdueReviews(ctx = {}, skipConfirm = false) {
    const now = Date.now();
    const activeCfg = typeof ctx.getActivePairConfig === 'function' ? ctx.getActivePairConfig() : (global.VocabCore?.getActivePairConfig?.());
    const getJsonFn = ctx.getJson || global.VocabCore?.getJson;
    const setJsonFn = ctx.setJson || global.VocabCore?.setJson;
    const pairKey = activeCfg ? activeCfg.key : (ctx.pairKey || 'distinction_entries');
    const rawList = typeof ctx.getList === 'function' ? ctx.getList(pairKey) : (typeof getJsonFn === 'function' ? getJsonFn(pairKey) : []);
    const list = Array.isArray(rawList) ? rawList : [];
    const overdue = list.filter(i => i && !i.isDeleted && (i.nextReview || 0) <= now);
    const tFn = (k, pOrFb, fb) => (global.VocabI18n?.t ? global.VocabI18n.t(k, pOrFb, fb) : (fb || pOrFb || ''));
    if (!overdue.length) {
      showToast(tFn('anki.no_overdue_words', '期日超過の復習単語はありません。'), 'info');
      return;
    }

    if (!skipConfirm) {
      const confirmMsg = tFn('anki.reschedule_confirm', { count: overdue.length }, `期日超過の ${overdue.length} 語を、今後7日間に均等になだらかに再分散（スヌーズ）しますか？\n（毎日の復習負担が分散され、無理なく再開できます）`);
      if (global.VocabModal?.uiConfirm && typeof document !== 'undefined' && document.body?.appendChild) {
        global.VocabModal.uiConfirm(confirmMsg).then(ok => {
          if (ok) rescheduleOverdueReviews(ctx, true);
        });
      }
      return;
    }

    overdue.forEach((item, idx) => {
      const dayOffset = (idx % 7) + 1;
      const jitterMs = Math.floor(Math.random() * 3600000 * 3);
      item.nextReview = now + dayOffset * 86400000 + jitterMs;
      item.version = (Number(item.version) || 1) + 1;
      item.updatedAt = now;
      item.reviewUpdatedAt = now;
    });

    if (typeof ctx.saveList === 'function') {
      if (ctx.saveList.length >= 2) {
        ctx.saveList(pairKey, list);
      } else {
        ctx.saveList(list);
      }
    } else if (typeof setJsonFn === 'function') {
      setJsonFn(pairKey, list, true);
    }
    if (typeof ctx.onReload === 'function') {
      ctx.onReload();
    } else if (typeof ctx.load === 'function' && ctx.appState) {
      ctx.load(ctx.appState.page);
    }
    const toastFn = ctx.showToast || (global.VocabModal ? global.VocabModal.showToast : null);
    if (toastFn) {
      toastFn(`${overdue.length} 語の復習スケジュールを今後7日間に均等再配分しました。`, 'ok');
    }
  }

  /**
   * 1日の最大復習数を設定
   */
  function setDailyReviewCap(val, ctx = {}) {
    const appState = ctx.appState || global.VocabCore?.App;
    const cap = parseInt(val, 10) || 30;
    if (appState) appState.dailyReviewCap = cap;
    if (global.VocabCore?.lsSet) global.VocabCore.lsSet('vv_daily_review_cap', String(cap));
    else try { localStorage.setItem('vv_daily_review_cap', String(cap)); } catch {}
    showToast(`1日の最大復習数を ${cap >= 99999 ? '無制限' : cap + ' 語'} に設定しました`, 'ok');
  }

  let _delegatedEventsBound = false;

  /**
   * DOMイベント委譲の一括バインド (二重登録防止ガード付き)
   */
  function bindDelegatedEvents(ctx = {}) {
    if (_delegatedEventsBound || typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;
    _delegatedEventsBound = true;
    const appState = ctx.appState || global.VocabCore?.App || global.App;

    document.addEventListener('click', e => {
      const target = /** @type {any} */ (e.target);
      if (target?.classList?.contains?.('modal-ov')) {
        if (target.id === 'welcomeTourModal') global.VocabCore?.closeWelcomeTour?.();
        else if (target.id === 'feedbackModal') global.VocabFeedback?.closeFeedbackModal?.();
        else if (target.id && target.id !== 'vvDialogModal') global.toggleModal?.(target.id, false);
        return;
      }

      const openModalEl = target?.closest?.('[data-open-modal]');
      if (openModalEl) {
        global.toggleModal?.(openModalEl.dataset.openModal, true);
        return;
      }
      const closeModalEl = target?.closest?.('[data-close-modal]');
      if (closeModalEl) {
        global.toggleModal?.(closeModalEl.dataset.closeModal, false);
        return;
      }
      const toggleSecEl = target?.closest?.('[data-toggle-sec]');
      if (toggleSecEl) {
        global.toggleSec?.(toggleSecEl.dataset.toggleSec);
        return;
      }

      const el = target?.closest?.('[data-act]');
      if (!el) return;
      const act = el.dataset.act;
      const arg = el.dataset.arg;

      const uiClickActions = {
        'toggle-sidebar': () => global.toggleSidebar?.(),
        'exit-anki': () => global.exitAnki?.(),
        'open-extract': () => global.openExtractModal?.(),
        'start-anki': () => global.startAnki?.(),
        'open-analytics': () => global.VocabAnkiView?.openAnalyticsModal?.() || global.openAnalyticsModal?.(),
        'toggle-mask': () => global.toggleMask?.(),
        'print-list': () => global.printVocabList?.(),
        'open-feedback': () => global.VocabFeedback?.openFeedbackModal?.(arg || undefined),
        'close-feedback': () => global.VocabFeedback?.closeFeedbackModal?.(),
        'sync-cloud': () => syncCloudNow(true, ctx),
        'prompt-install': () => global.promptAppInstall?.(),
        'open-settings': () => global.openSettings?.(),
        'clear-search': () => global.setSearch?.(''),
        'toggle-cross-lang': () => global.toggleCrossLang?.(),
        'reset-filters': () => global.resetAllFilters?.(),
        'swap-pair': () => global.swapLanguagePair?.(),
        'toggle-add-opts': () => $('ctrlForm')?.classList?.toggle('expanded'),
        'salvage-all': () => global.salvageAll?.(true),
        'set-view-mode': () => global.setViewMode?.(arg || 'academic'),
        'close-fb-banner': () => {
          if ($('userFeedbackBanner')) $('userFeedbackBanner').style.display = 'none';
          global.lsSet?.('vv_banner_closed', '1');
        },
        'close-sw-banner': () => {
          if ($('swUpdateBanner')) $('swUpdateBanner').style.display = 'none';
        },
        'open-legal': () => global.openLegalModal?.(arg || 'terms'),
        'switch-legal-tab': () => global.switchLegalTab?.(arg || 'terms'),
        'switch-settings-tab': () => global.switchSettingsTab?.(arg || 'general'),
        'open-welcome-tour': () => global.VocabCore?.openWelcomeTour?.(),
        'close-welcome-tour': () => global.VocabCore?.closeWelcomeTour?.(),
        'finish-welcome-tour': () => global.VocabCore?.finishWelcomeTour?.(),
        'select-tour-mode': () => global.VocabCore?.selectTourMode?.(arg || 'simple'),
        'set-tour-step': () => global.VocabCore?.setTourStep?.(Number(arg)),
        'tour-step-delta': () => {
          const cur = global.VocabCore?.getTourStep?.() || 1;
          global.VocabCore?.setTourStep?.(cur + Number(arg || 0));
        },
        'close-shortcuts-and-tour': () => {
          global.toggleModal?.('shortcutsModal', false);
          global.VocabCore?.openWelcomeTour?.();
        },
        'close-settings-and-analytics': () => {
          global.toggleModal?.('settingsModal', false);
          global.VocabAnkiView?.openAnalyticsModal?.() || global.openAnalyticsModal?.();
        },
        'cloud-login': () => cloudLogin(arg === 'signup', ctx),
        'cloud-logout': () => cloudLogout(ctx),
        'delete-account': () => deleteAccountPermanently(ctx),
        'set-billing-interval': () => global.VocabI18n?.setBillingInterval?.(arg || 'month'),
        'stripe-checkout': () => global.VocabSync?.startStripeCheckout?.(),
        'stripe-portal': () => global.VocabSync?.openStripePortal?.(),
        'toggle-api-key-vis': () => {
          const inp = $('apiKeyInput');
          if (!inp) return;
          const isPwd = inp.type === 'password';
          inp.type = isPwd ? 'text' : 'password';
          const isEn = global.VocabI18n?.getLocale?.() === 'en';
          el.textContent = isPwd ? (isEn ? 'Hide' : '隠す') : (isEn ? 'Show' : '表示');
        },
        'save-byok-key': () => global.saveKeyFromModal?.(),
        'reload-ai-models': () => {
          const curApp = global.VocabCore?.App || global.App || appState;
          if (curApp) curApp.cachedModels = null;
          const key = global.VocabCore?.getKey?.() || '';
          global.VocabCore?.fetchModels?.(key)
            ?.then(m => showToast(`更新完了: ${Array.isArray(m) ? m.length : 0}件`, 'ok'))
            ?.catch(err => showToast(err?.message || 'Error', 'err'));
        },
        'fsrs-optimize': () => global.VocabAnkiView?.triggerManualOptimize?.(),
        'fsrs-reset': () => global.VocabAnkiView?.triggerResetWeights?.(),
        'req-notify-perm': () => global.VocabModal?.requestSmartNotifyPermission?.(),
        'reschedule-overdue': () => rescheduleOverdueReviews(ctx),
        'export-json': () => global.exportJSON?.(),
        'export-tsv': () => global.exportAnkiTSV?.(),
        'export-apkg': () => global.exportAnkiAPKG?.(),
        'export-obsidian-md': () => global.exportObsidianMarkdown?.(),
        'sync-obsidian-vault': () => global.syncObsidianVaultDirect?.(),
        'gen-share-deck': () => global.generateCurrentShareDeckUrl?.(),
        'clear-lang': () => global.clearCurrentLang?.(),
        'run-db-diag': () => runDatabaseDiagnosticsAndRepair(ctx),
        'toggle-dev-master': () => global.toggleDevMasterMode?.(),
        'save-edit-card': () => global.saveEditCard?.(),
        'trigger-click': () => { if (arg) $(arg)?.click?.(); },
        'clear-ext-text': () => {
          if ($('extTextarea')) $('extTextarea').value = '';
          if ($('extResSec')) $('extResSec').style.display = 'none';
          $('extTextarea')?.focus?.();
        },
        'clear-reader-text': () => {
          if ($('readerCustomTextarea')) $('readerCustomTextarea').value = '';
          $('readerCustomTextarea')?.focus?.();
        },
        'run-ocr-again': () => global.runOcrCurrentFile?.(),
        'clear-ocr-preview': () => global.clearOcrPreview?.(),
        'save-ocr-and-exec': () => global.saveOcrKeyAndExecute?.(),
        'run-extract': () => global.runPassageExtract?.(),
        'toggle-all-ext': () => {
          const modeVal = arg === 'all' ? 'all' : arg === 'true';
          global.toggleAllExtChecks?.(modeVal);
        },
        'commit-ext': () => global.commitExtractedWords?.(),
        'toggle-reader-input': () => global.toggleReaderInput?.(arg === 'false' ? false : undefined),
        'adjust-reader-font': () => global.adjustReaderFontSize?.(Number(arg || 0)),
        'apply-reader-text': () => global.applyReaderCustomText?.(),
        'close-reader-popover': () => global.closeReaderPopover?.(),
        'add-reader-word': () => global.addWordFromReaderPopover?.(),
        'exec-anki-import': () => global.VocabModal?.executeAnkiImport?.(),
        'exec-share-import': () => global.VocabModal?.executeShareDeckImport?.(),
        'show-ans': () => global.showAns?.(),
        'show-day-workload': () => global.VocabAnkiView?.showDayWorkloadDetails?.(el.dataset.date, Number(el.dataset.count)),
      };

      if (uiClickActions[act]) {
        uiClickActions[act]();
        return;
      }

      if (act === 'speak') {
        e.preventDefault(); e.stopPropagation();
        const curApp = ctx.appState || global.VocabCore?.App || global.App || appState;
        // ターゲット要素（発話対象の例文・成句・見出し語テキスト）をボタンのコンテキストから安全に特定
        let targetEl = null;
        const exParent = typeof el.closest === 'function' ? el.closest('.ex-en, .anki-ex-foreign, .ph-line, .sub-p, .sub-h') : null;
        if (exParent) {
          targetEl = (typeof exParent.querySelector === 'function' ? exParent.querySelector('span:not(.spk-btn), strong') : null) || exParent;
        } else {
          const cardEl = typeof el.closest === 'function' ? el.closest('.card') : null;
          if (cardEl && el.dataset?.text) {
            targetEl = (typeof cardEl.querySelector === 'function' ? cardEl.querySelector('.hw') : null) || cardEl;
          }
        }
        if (global.VocabSpeech) global.VocabSpeech.speakText(el.dataset.text, el.dataset.lang || curApp?.lang, null, targetEl);
      } else if (act === 'speak-current') {
        e.preventDefault(); e.stopPropagation();
        const curApp = ctx.appState || global.VocabCore?.App || global.App || appState;
        const c = curApp?.aList?.[0];
        const cardWord = c?.word || el.dataset.text || $('aWord')?.textContent?.replace(/\s*#\d+$/, '').trim();
        const cardLang = c?.lang || el.dataset.lang || curApp?.lang || 'en';
        if (cardWord && global.VocabSpeech) global.VocabSpeech.speakText(cardWord, cardLang);
      } else if (act === 'set-anki-mode') {
        const targetMode = el.dataset.mode;
        if (global.VocabAnkiView) global.VocabAnkiView.setAnkiMode(targetMode, ctx.ankiCtx?.() || {});
      } else if (act === 'reveal-cloze') {
        el.classList.add('revealed');
        if (el.dataset.ans) el.textContent = el.dataset.ans;
      } else if (act === 'toggle-playlist' || act === 'playlist-toggle') {
        if (global.VocabSpeech) global.VocabSpeech.toggleAudioPlaylist();
      } else if (act === 'playlist-next') {
        if (global.VocabSpeech) global.VocabSpeech.nextPlaylistItem();
      } else if (act === 'playlist-prev') {
        if (global.VocabSpeech) global.VocabSpeech.prevPlaylistItem();
      } else if (act === 'playlist-close') {
        if (global.VocabSpeech) global.VocabSpeech.stopAudioPlaylist();
      } else if (act === 'undo-anki') {
        if (global.VocabAnkiView) global.VocabAnkiView.undoAnkiRev(ctx.ankiCtx?.() || {});
        else if (typeof ctx.undoAnkiRev === 'function') ctx.undoAnkiRev();
      } else if (act === 'flash-blitz') {
        if (global.VocabAnkiView) global.VocabAnkiView.startFlashBlitz(ctx.ankiCtx?.() || {});
        else if (typeof global.startFlashBlitz === 'function') global.startFlashBlitz();
      } else if (act === 'voice-anki') {
        if (global.VocabAnkiView) global.VocabAnkiView.toggleVoiceAnkiMode(ctx.ankiCtx?.() || {});
        else if (typeof global.toggleVoiceAnkiMode === 'function') global.toggleVoiceAnkiMode();
      } else if (act === 'switch-ext-mode') {
        if (global.VocabModal && typeof global.VocabModal.switchExtractMode === 'function') global.VocabModal.switchExtractMode(el.dataset.mode);
        else if (typeof global.switchExtractMode === 'function') global.switchExtractMode(el.dataset.mode);
      } else if (act === 'reader-word') {
        e.preventDefault(); e.stopPropagation();
        if (global.VocabModal && typeof global.VocabModal.showReaderWordPopover === 'function') global.VocabModal.showReaderWordPopover(el.dataset.word, el.dataset.sentence, el);
      } else if (act === 'reveal-mask') {
        if (document.body.classList.contains('mask')) el.classList.toggle('revealed');
      } else if (act === 'filter') {
        if (typeof ctx.setFilter === 'function') ctx.setFilter(el.dataset.type, el.dataset.val);
      } else if (act === 'set-pair') {
        if (typeof ctx.setLanguagePair === 'function') ctx.setLanguagePair(el.dataset.src, el.dataset.tgt);
      } else if (act === 'search-root') {
        if (typeof ctx.setSearch === 'function') ctx.setSearch(el.dataset.query, true, el.dataset.xlang === '1' ? true : null);
      } else if (act === 'open-graph') {
        if (global.VocabGraph && typeof global.VocabGraph.openGraphModal === 'function') global.VocabGraph.openGraphModal(el.dataset.root);
        else if (typeof ctx.openGraphModal === 'function') ctx.openGraphModal(el.dataset.root);
      } else if (act === 'load-starter') {
        const packType = el.dataset.pack || 'academic';
        if (typeof global.VocabCore?.loadStarterPack === 'function') global.VocabCore.loadStarterPack(packType);
        else if (typeof global.loadStarterPack === 'function') global.loadStarterPack(packType);
      } else if (act === 'open-starter-modal') {
        if (global.VocabModal && typeof global.VocabModal.openStarterPackModal === 'function') global.VocabModal.openStarterPackModal();
      } else if (act === 'open-anki-import') {
        if (global.VocabModal && typeof global.VocabModal.openAnkiImportModal === 'function') global.VocabModal.openAnkiImportModal();
      } else if (act === 'jump') {
        const jw = el.dataset.word;
        const jl = el.dataset.lang || appState?.lang;
        const jumped = typeof ctx.jumpToWord === 'function' ? ctx.jumpToWord(jw, jl) : false;
        if (jumped !== false) {
          const msg = global.VocabI18n?.t ? global.VocabI18n.t('list.jumped_to_word', { word: jw }) : `「${jw}」のカードへ移動しました`;
          showToast(msg, 'ok', 2000);
        }
      } else if (act === 'edit') {
        if (global.VocabModal && typeof global.VocabModal.openEditModal === 'function') global.VocabModal.openEditModal(el.dataset.id || parseInt(el.dataset.num, 10), el.dataset.lang || appState?.lang);
        else if (typeof ctx.openEditModal === 'function') ctx.openEditModal(el.dataset.id || parseInt(el.dataset.num, 10), el.dataset.lang || appState?.lang);
      } else if (act === 'del') {
        e.preventDefault(); e.stopPropagation();
        const num = parseInt(el.dataset.num, 10);
        const cardWord = el.closest('.card')?.dataset?.word;
        if (typeof ctx.delW === 'function') ctx.delW(el.dataset.id || (Number.isInteger(num) ? num : cardWord), el.dataset.lang || appState?.lang);
      } else if (act === 'report-ety') {
        e.preventDefault(); e.stopPropagation();
        const cardWord = el.dataset.word || el.closest('.card')?.dataset?.rawWord || '';
        const cardEty = el.dataset.ety || '';
        const cardLang = el.dataset.lang || appState?.lang || 'en';
        if (global.VocabFeedback && typeof global.VocabFeedback.openFeedbackModal === 'function') {
          global.VocabFeedback.openFeedbackModal({
            category: 'bug',
            initialMessage: `単語「${cardWord}」(${cardLang.toUpperCase()}) の語源解説に関する報告:\n【現在の語源】\n${cardEty}\n\n【正しい情報・修正提案】\n`
          });
        } else if (global.VocabModal?.uiPrompt) {
          global.VocabModal.uiPrompt('語源の誤りや修正提案を入力してください:', `【${cardWord}】`).then(correction => {
            if (correction !== null && correction.trim()) {
              showToast('語源に関するフィードバックを受け付けました。ご協力ありがとうございます。', 'ok', 3500);
            }
          });
        }
      } else if (act === 'toggle-clamp') {
        el.classList.toggle('clamp');
      } else if (act === 'switch-detail-tab') {
        e.preventDefault(); e.stopPropagation();
        const tabName = el.dataset.tab;
        const body = el.closest('.card-details-body');
        if (body) {
          body.querySelectorAll('.detail-tab-btn').forEach(btn => {
            const isMatch = btn.dataset.tab === tabName;
            btn.classList.toggle('active', isMatch);
            btn.setAttribute('aria-selected', isMatch ? 'true' : 'false');
          });
          body.querySelectorAll('.detail-panel').forEach(panel => {
            panel.style.display = (tabName === 'all' || panel.dataset.panel === tabName) ? 'block' : 'none';
          });
          const accordion = el.closest('.card-details-accordion');
          const sumLbl = accordion?.querySelector('.sum-lbl');
          if (sumLbl) {
            const tFn = (k, pOrFb, fb) => (global.VocabI18n?.t ? global.VocabI18n.t(k, pOrFb, fb) : (fb || pOrFb || ''));
            const labelText = tabName === 'all' ? tFn('card.details_all', '詳細（すべて）') : (el.textContent?.trim() || tFn('card.details', '詳細'));
            sumLbl.textContent = tFn('card.showing_tab', { label: labelText }, `${labelText} を表示中`);
          }
        }
      } else if (act === 'page' || act === 'page-jump') {
        if (global.VocabCardView?.clearJumpTimers) global.VocabCardView.clearJumpTimers();
        if (appState) {
          if (el.dataset.page !== undefined) {
            const p = parseInt(el.dataset.page, 10);
            if (Number.isFinite(p) && p >= 1) appState.page = p;
          } else if (el.dataset.dir !== undefined) {
            appState.page += Number(el.dataset.dir);
          }
          if (typeof ctx.render === 'function') ctx.render();
          const ms = $('mainScroll');
          if (ms) {
            ms.scrollTop = 0;
            try { ms.scrollTo?.({ top: 0, left: 0, behavior: 'auto' }); } catch {}
          }
        }
      } else if (act === 'reset-filter') {
        e.preventDefault();
        if (typeof ctx.resetAllFilters === 'function') {
          ctx.resetAllFilters();
        } else if (typeof global.VocabCore?.resetAllFilters === 'function') {
          global.VocabCore.resetAllFilters();
        } else if (typeof global.VocabListView?.resetFilters === 'function') {
          global.VocabListView.resetFilters(appState, () => ctx.render?.());
        }
      } else if (act === 'open-upsell') {
        const reason = el.dataset.reason || '';
        if (global.VocabModal && typeof global.VocabModal.openUpsellModal === 'function') {
          global.VocabModal.openUpsellModal(reason);
        } else if (typeof ctx.openUpsellModal === 'function') {
          ctx.openUpsellModal(reason);
        }
      } else if (act === 'rate') {
        const rateVal = Number(el.dataset.rate);
        if (global.VocabAnkiView) global.VocabAnkiView.procRev(rateVal, ctx.ankiCtx?.() || {});
        else if (typeof ctx.procRev === 'function') ctx.procRev(rateVal);
      } else if (act === 'retry-batch') {
        const card = el.closest('.card');
        if (!card) return;
        try {
          const retryItems = JSON.parse(card.dataset.retryItems || '[]');
          const { fName = '', useHist, useWikt, srcLang, tgtLang, pairKey, requestId } = card.dataset;
          const reqQueue = appState?.reqQueue || [];
          const qIdx = reqQueue.findIndex(q => q.card === card);
          if (qIdx !== -1) reqQueue.splice(qIdx, 1);
          card.remove();
          if (retryItems.length && typeof ctx.enqueueTask === 'function') {
            ctx.enqueueTask({
              items: retryItems,
              fName,
              useHist: useHist === '1',
              useWikt: useWikt !== '0',
              targetLang: srcLang || appState?.srcLang,
              srcLang: srcLang || appState?.srcLang,
              tgtLang: tgtLang || appState?.tgtLang,
              pairKey: pairKey || (ctx.getActivePairConfig ? ctx.getActivePairConfig().key : ''),
              requestId: undefined
            });
          }
        } catch {}
      } else if (act === 'regen-single-word') {
        const word = el.dataset.word;
        const id = el.dataset.id;
        if (!word) return;
        const curApp = ctx.appState || global.VocabCore?.App || global.App || appState;
        const entries = Array.isArray(curApp?.entries) ? curApp.entries : [];
        const existing = entries.find(x => (id && x.id === id) || x.word === word);
        const targetSrc = existing?.lang || curApp?.srcLang || 'en';
        const targetTgt = existing?.tgtLang || curApp?.tgtLang || 'ja';
        const targetHomo = existing?.homographIndex || 1;
        const makeLkFn = global.VocabMorphology?.makeLookupKey || ((w, l, h) => `${String(w || '').toLowerCase()}_${l}#${h || 1}`);
        const targetLk = makeLkFn(word, targetSrc, targetHomo);
        const alreadyQueued = (curApp?.reqQueue || []).some(q =>
          !q.isDone && !q.isCancelled && !q.isFailed &&
          (q.srcLang || q.targetLang || curApp?.srcLang || 'en') === targetSrc &&
          (q.tgtLang || curApp?.tgtLang || 'ja') === targetTgt &&
          Array.isArray(q.items) && q.items.some(it => makeLkFn(it.word, targetSrc, it.homographIndex || 1) === targetLk)
        );
        if (alreadyQueued) {
          const procMsg = global.VocabI18n?.t ? global.VocabI18n.t('queue.already_processing', { word }) : `「${word}」は現在処理中です`;
          showToast(procMsg, 'info');
          return;
        }
        const enqueueFn = ctx.enqueueTask || global.VocabQueue?.enqueueTask || global.enqueueTask;
        if (typeof enqueueFn === 'function') {
          enqueueFn({
            items: [{
              word,
              homographIndex: targetHomo,
              sentence: existing?.contextSentence || ''
            }],
            fName: existing?.folder || curApp?.fName || '',
            useHist: curApp?.useHist !== false,
            useWikt: true,
            srcLang: targetSrc,
            tgtLang: targetTgt,
            pairKey: ctx.getActivePairConfig ? ctx.getActivePairConfig().key : (curApp?.pairKey || '')
          });
        }
      } else if (act === 'close-load') {
        const card = el.closest('.card');
        const reqQueue = appState?.reqQueue || [];
        const task = reqQueue.find(q => q.card === card);
        if (task) task.isCancelled = true;
        const qIdx = reqQueue.findIndex(q => q.card === card);
        if (qIdx !== -1) reqQueue.splice(qIdx, 1);
        card?.remove();
        if (global.VocabQueue && typeof global.VocabQueue.syncPersistedQueue === 'function') global.VocabQueue.syncPersistedQueue(appState);
        if (typeof ctx.render === 'function') ctx.render();
      }

      // カード本体クリック時のキーボードフォーカス連動
      const card = target?.closest?.('.card');
      if (card && !target?.closest?.('button, a, input, select, textarea, [data-act]')) {
        const cards = $$('#list .card');
        const idx = cards.indexOf(card);
        if (idx !== -1 && typeof ctx.updateCardFocus === 'function') ctx.updateCardFocus(idx);
      }
    });

    document.addEventListener('keydown', e => {
      const target = /** @type {any} */ (e.target);
      if ((e.key !== 'Enter' && e.key !== ' ') || e.isComposing || e.keyCode === 229 || appState?.isComposing) return;
      if (target?.isContentEditable || target?.closest?.('button, input, textarea, select, a, [contenteditable="true"]')) return;
      const el = target?.closest?.('[data-act]');
      if (el && !['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'A'].includes(el.tagName)) {
        e.preventDefault();
        el.click();
      }
    });

    $('extCandidateGrid')?.addEventListener('change', e => {
      const target = /** @type {any} */ (e.target);
      const i = target?.dataset?.extIdx;
      if (i === undefined || !appState?.extCandidates?.[i]) return;
      appState.extCandidates[i].checked = target.checked;
      target.closest?.('.ext-item')?.classList.toggle('checked', target.checked);
      if (global.VocabModal && typeof global.VocabModal.updateExtCounts === 'function') {
        global.VocabModal.updateExtCounts();
      }
    });

    document.addEventListener('change', e => {
      const target = /** @type {any} */ (e.target);
      const lsEl = target?.closest?.('[data-ls-key]');
      if (lsEl) {
        const key = lsEl.dataset.lsKey;
        if (key) {
          const val = lsEl.type === 'checkbox' ? (lsEl.checked ? '1' : '0') : lsEl.value;
          if (global.VocabCore?.lsSet) global.VocabCore.lsSet(key, val);
          else if (typeof global.lsSet === 'function') global.lsSet(key, val);
          else try { localStorage.setItem(key, String(val)); } catch {}
        }
      }

      const chEl = target?.closest?.('[data-change-act]');
      if (chEl) {
        const cAct = chEl.dataset.changeAct;
        if (cAct === 'set-locale') global.VocabI18n?.setLocale?.(chEl.value);
        else if (cAct === 'anki-file-select') global.VocabModal?.handleAnkiFileSelect?.(e);
        else if (cAct === 'smart-notify') {
          global.VocabSRS?.setSmartNotifyEnabled?.(chEl.checked);
          global.updateSmartNotifyUI?.();
        } else if (cAct === 'ocr-image-file') global.handleOcrImageFile?.(chEl.files?.[0]);
        else if (cAct === 'import-json') global.importJSON?.(e);
        else if (cAct === 'load-reader-sample') global.loadReaderSample?.(chEl.value);
        else if (cAct === 'lang-pair-change') global.onLanguagePairChange?.();
        else if (cAct === 'daily-review-cap') global.setDailyReviewCap?.(chEl.value);
        else if (cAct === 'sort-order') global.setSortOrder?.(chEl.value);
        else if (cAct === 'toggle-dark-mode') global.toggleDarkMode?.(chEl.checked);
      }

      const el = target?.closest?.('[data-act="page-select"]');
      if (el && appState) {
        const val = parseInt(el.value, 10);
        if (Number.isFinite(val) && val >= 1) {
          appState.page = val;
          if (typeof ctx.render === 'function') ctx.render();
          const ms = $('mainScroll');
          if (ms) {
            ms.scrollTop = 0;
            try { ms.scrollTo?.({ top: 0, left: 0, behavior: 'auto' }); } catch {}
          }
        }
      }
    });

    document.addEventListener('input', e => {
      const target = /** @type {any} */ (e.target);
      const inEl = target?.closest?.('[data-input-act]');
      if (!inEl) return;
      const iAct = inEl.dataset.inputAct;
      if (iAct === 'graph-timeline') global.VocabGraph?.onTimelineChange?.(inEl.value);
      else if (iAct === 'anki-preview') global.VocabModal?.previewAnkiImport?.(inEl.value);
    });

    document.addEventListener('submit', e => {
      const target = /** @type {any} */ (e.target);
      const subEl = target?.closest?.('[data-submit-act]');
      if (!subEl) return;
      e.preventDefault();
      const sAct = subEl.dataset.submitAct;
      if (sAct === 'submit-word') global.submitW?.();
      else if (sAct === 'submit-feedback') global.VocabFeedback?.submitFeedback?.();
    });

    const bindImeTracker = (el, onComposeEnd) => {
      if (!el) return { isImeActive: () => false };
      let localComposing = false;
      let endedAt = 0;
      const setComp = v => {
        if (global.VocabCore?.setComposingState) global.VocabCore.setComposingState(v);
        else if (appState) appState.isComposing = Boolean(v);
      };
      el.addEventListener('compositionstart', () => {
        localComposing = true;
        setComp(true);
      });
      el.addEventListener('compositionend', e => {
        localComposing = false;
        endedAt = Date.now();
        setTimeout(() => {
          if (!localComposing) setComp(false);
        }, 60);
        if (typeof onComposeEnd === 'function') onComposeEnd(e);
      });
      el.addEventListener('blur', () => {
        localComposing = false;
        setComp(false);
      });
      return {
        isImeActive: e => Boolean(localComposing || appState?.isComposing || e?.isComposing || e?.keyCode === 229 || (Date.now() - endedAt < 60))
      };
    };

    const qIn = $('qSearch');
    if (qIn) {
      const qIme = bindImeTracker(qIn, e => {
        clearTimeout(appState?.searchDebounceTimer);
        if (typeof ctx.setSearch === 'function') ctx.setSearch(e.target.value);
      });
      qIn.addEventListener('input', e => {
        if (!qIme.isImeActive(e)) {
          clearTimeout(appState?.searchDebounceTimer);
          if (appState) {
            const v = e.target.value || '';
            const delay = /^[a-zA-Z0-9\s*_-]*$/.test(v) ? 70 : 120;
            appState.searchDebounceTimer = setTimeout(() => {
              if (typeof ctx.setSearch === 'function') ctx.setSearch(e.target.value);
            }, delay);
          }
        }
      });
      qIn.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          if (qIme.isImeActive(e)) return;
          e.preventDefault();
          const val = e.target.value.trim();
          if (val && typeof ctx.jumpToWord === 'function') ctx.jumpToWord(val);
        }
      });
    }

    const inWordEl = $('inWord');
    if (inWordEl) {
      const wIme = bindImeTracker(inWordEl);
      inWordEl.addEventListener('keydown', e => {
        if (e.key === 'Enter' && wIme.isImeActive(e)) {
          e.preventDefault();
        }
      });
    }

    const inFolEl = $('inFol');
    if (inFolEl) {
      const fIme = bindImeTracker(inFolEl);
      inFolEl.addEventListener('keydown', e => {
        if (e.key === 'Enter' && fIme.isImeActive(e)) {
          e.preventDefault();
        }
      });
    }
  }

  /**
   * ウィンドウ・ライフサイクルイベントの一括バインド
   */
  function bindWindowEvents(ctx = {}) {
    const appState = ctx.appState || global.VocabCore?.App;
    if (typeof window === 'undefined') return;

    // 音声アンロック (iOS Safari / モバイルWebKit対応)
    const unlockAudio = () => {
      try {
        if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch {}
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('click', unlockAudio);
    };
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('click', unlockAudio, { passive: true });

    // リサイズハンドラ
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && document.body?.classList.contains('side-open-lock')) {
        document.body.classList.remove('side-open-lock');
      }
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const listViewEl = typeof document !== 'undefined' ? document.getElementById('listView') : null;
        const ankiEl = typeof document !== 'undefined' ? document.getElementById('anki') : null;
        const openModal = typeof document !== 'undefined' ? document.querySelector('.modal-ov.open') : null;
        if ((listViewEl && listViewEl.style?.display === 'none') || ankiEl?.style?.display === 'block' || openModal) {
          return;
        }
        const cIdx = appState?.focusedCardIndex;
        if (Number.isInteger(cIdx) && cIdx >= 0 && typeof document !== 'undefined') {
          const cards = [...document.querySelectorAll('#list .card')];
          const el = cards[cIdx];
          const ms = document.getElementById('mainScroll');
          const isStillActive = el && (el.classList?.contains('card-focused') || el.classList?.contains('highlight-jump'));
          if (el && ms && isStillActive && global.VocabCardView?.scrollToCard) {
            const cRect = ms.getBoundingClientRect();
            const eRect = el.getBoundingClientRect();
            const isInViewport = eRect.bottom > cRect.top && eRect.top < cRect.bottom;
            if (isInViewport) {
              global.VocabCardView.scrollToCard(el, ms, { immediate: true, skipRetry: true });
            }
          }
        }
      }, 150);
    }, { passive: true });

    // ブラウザ履歴ナビゲーション (戻る・進む) に伴うURL単語ジャンプ連動
    window.addEventListener('popstate', () => {
      if (typeof window !== 'undefined' && window.location?.search) {
        try {
          const p = new URLSearchParams(window.location.search);
          const w = p.get('w') || p.get('word');
          if (w && typeof ctx.jumpToWord === 'function') {
            ctx.jumpToWord(w, p.get('lang') || appState?.lang);
          }
        } catch {}
      }
    });

    // 印刷モード
    window.addEventListener('beforeprint', () => {
      if (appState) appState.printAllMode = true;
      if (typeof ctx.render === 'function') ctx.render();
    });
    window.addEventListener('afterprint', () => {
      if (appState) appState.printAllMode = false;
      if (typeof ctx.render === 'function') ctx.render();
    });

    // ストレージ間同期
    window.addEventListener('storage', e => {
      if (e.key && global.VocabStorage && typeof ctx.syncFromIdbForLang === 'function') {
        const isPairScopedKey = e.key.startsWith('distinction_entries') || e.key.startsWith('vv_tombstones_') || e.key.startsWith('vv_cleared_at_');
        if (!isPairScopedKey) return;
        const target = typeof global.VocabStorage.resolveConfig === 'function'
          ? (global.VocabStorage.resolveConfig(e.key)?.key || e.key)
          : (e.key.startsWith('distinction_entries') ? e.key : global.VocabStorage.keyToLang(e.key));
        ctx.syncFromIdbForLang(target);
      }
    });

    // オンライン / オフライン自動復帰 (項目25: 直列化パイプライン & 排他ミューテックス)
    window.addEventListener('online', async () => {
      try {
        if (global.VocabSRS?.flushOfflineReviews) {
          await global.VocabSRS.flushOfflineReviews();
        }
        if (global.VocabSync?.isCloudReady?.()) {
          const ok = await syncCloudNow(false, ctx);
          if (ok) {
            const isJa = (global.VocabI18n?.getLocale?.() || 'ja') === 'ja';
            showToast(isJa ? 'オンラインに復帰しました。クラウド同期を完了しました。' : 'Back online. Cloud sync completed.', 'info', 2500);
          }
        }
      } catch (err) {
        if (typeof console !== 'undefined' && typeof console.warn === 'function') {
          console.warn('[Sync] Online recovery error:', err);
        }
      }
    });
    window.addEventListener('offline', () => {
      const isJa = (global.VocabI18n?.getLocale?.() || 'ja') === 'ja';
      showToast(isJa ? 'オフラインモードです。復習や編集は端末内に安全に保持されます。' : 'Offline mode. Reviews and edits are safely stored on your device.', 'info', 3000);
    });

    // クリップボード画像ペーストによる自動OCR受付
    window.addEventListener('paste', e => {
      const modal = $('extractModal');
      if (modal?.classList.contains('open')) return;
      const imgItem = [...(e.clipboardData?.items || [])].find(it => it.type && it.type.startsWith('image/'));
      if (imgItem) {
        const file = imgItem.getAsFile();
        if (file) {
          e.preventDefault();
          if (global.VocabModal && typeof global.VocabModal.openExtractModal === 'function') global.VocabModal.openExtractModal();
          if (global.VocabOCR && typeof global.VocabOCR.handleOcrImageFile === 'function') {
            global.VocabOCR.handleOcrImageFile(file, 'スクリーンショット (貼り付け)');
          }
        }
      }
    });

    // PWA インストールプロンプト監視
    const isStandalone = (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator?.standalone === true
    );
    const ribInstallBtn = $('ribInstallBtn');
    if (isStandalone) {
      if (ribInstallBtn) ribInstallBtn.style.display = 'none';
    } else {
      if (ribInstallBtn) ribInstallBtn.style.display = 'flex';
    }

    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      if (appState) appState.deferredInstallPrompt = e;
      if (ribInstallBtn && !isStandalone) ribInstallBtn.style.display = 'flex';
    });

    window.addEventListener('appinstalled', () => {
      if (appState) appState.deferredInstallPrompt = null;
      if (ribInstallBtn) ribInstallBtn.style.display = 'none';
      const isJa = (global.VocabI18n?.getLocale?.() || 'ja') === 'ja';
      showToast(isJa ? 'Vocab Vault をインストールしました。Dockやホーム画面から独立起動できます。' : 'Vocab Vault installed. You can now launch it from your Dock or Home Screen.', 'ok', 6000);
    });

    // グローバルキーボードショートカット委譲
    window.addEventListener('keydown', e => {
      if (global.VocabNavigation && typeof global.VocabNavigation.handleGlobalKeydown === 'function') {
        const handled = global.VocabNavigation.handleGlobalKeydown(e, {
          isAnkiOpen: () => $('anki')?.style.display === 'block',
          anyModalOpen: () => Boolean(document.querySelector('.modal-ov.open')),
          closeAllModals: () => global.VocabModal?.closeAllModals?.(),
          closeSidebar: () => (ctx.closeSidebar ? ctx.closeSidebar() : global.VocabSearch?.closeSidebar?.()),
          exitAnki: () => ctx.exitAnki?.(),
          getFocusedCardIndex: () => appState?.focusedCardIndex ?? -1,
          clearCardFocus: () => {
            if (global.VocabCore?.setFocusedCardIndex) global.VocabCore.setFocusedCardIndex(-1);
            else if (appState) appState.focusedCardIndex = -1;
            $$('#list .card.card-focused').forEach(c => c.classList.remove('card-focused'));
          },
          focusSearch: () => {
            document.body?.classList.remove('side-collapsed');
            $('qSearch')?.focus();
          },
          focusInput: () => {
            global.VocabModal?.closeAllModals?.();
            if ($('anki')?.style.display === 'block') ctx.exitAnki?.();
            $('inWord')?.focus();
          },
          openExtractModal: () => global.VocabModal?.openExtractModal?.(),
          toggleMask: () => ctx.toggleMask?.(),
          ankiSpeak: () => {
            const curApp = ctx.appState || global.VocabCore?.App || global.App || appState;
            const curWord = curApp?.aList?.[0]?.word || $('aWord')?.textContent?.replace(/\s*#\d+$/, '').trim();
            const curLang = curApp?.aList?.[0]?.lang || curApp?.lang || 'en';
            if (curWord && global.VocabSpeech) {
              global.VocabSpeech.speakText(curWord, curLang);
            }
          },
          ankiUndo: () => {
            if (appState?.ankiHistory?.length) {
              if (global.VocabAnkiView) global.VocabAnkiView.undoAnkiRev(ctx.ankiCtx?.() || {});
              else ctx.undoAnkiRev?.();
            }
          },
          ankiAdvance: () => {
            if ($('btnAns')?.style.display !== 'none') {
              if (global.VocabAnkiView) global.VocabAnkiView.showAns(ctx.ankiCtx?.() || {});
              else ctx.showAns?.();
            } else if ($('aRat')?.style.display === 'flex') {
              if (global.VocabAnkiView) global.VocabAnkiView.procRev(2, ctx.ankiCtx?.() || {});
              else ctx.procRev?.(2);
            }
          },
          ankiRate: rating => {
            if ($('aRat')?.style.display === 'flex') {
              if (global.VocabAnkiView) global.VocabAnkiView.procRev(rating, ctx.ankiCtx?.() || {});
              else ctx.procRev?.(rating);
            }
          },
          moveCardFocus: delta => {
            if (typeof ctx.updateCardFocus === 'function' && appState) {
              ctx.updateCardFocus(appState.focusedCardIndex + delta);
            }
          },
          speakFocusedCard: () => {
            const item = typeof ctx.getFocusedCardItem === 'function' ? ctx.getFocusedCardItem() : null;
            if (item && global.VocabSpeech) global.VocabSpeech.speakText(item.word, item.lang || appState?.lang);
          },
          editFocusedCard: () => {
            const item = typeof ctx.getFocusedCardItem === 'function' ? ctx.getFocusedCardItem() : null;
            if (item && global.VocabModal) global.VocabModal.openEditModal(item.id || item.num, item.lang || appState?.lang);
          },
          deleteFocusedCard: () => {
            const item = typeof ctx.getFocusedCardItem === 'function' ? ctx.getFocusedCardItem() : null;
            if (item && typeof ctx.delW === 'function') ctx.delW(item.id || item.num, item.lang || appState?.lang);
          },
          startAnki: () => {
            if (global.VocabAnkiView) global.VocabAnkiView.startAnki(null, ctx.ankiCtx?.() || {});
            else ctx.startAnki?.();
          },
          openGraph: () => {
            if (global.VocabGraph) global.VocabGraph.openGraphModal();
            else ctx.openGraphModal?.();
          },
          openAnalyticsModal: () => {
            if (global.VocabAnkiView) global.VocabAnkiView.openAnalyticsModal();
            else if (typeof global.openAnalyticsModal === 'function') global.openAnalyticsModal();
          },
          openShortcutsModal: () => {
            if (global.VocabModal) global.VocabModal.toggleModal('shortcutsModal', true);
          },
          ankiToggleMode: () => {
            if (global.VocabAnkiView) global.VocabAnkiView.toggleAnkiMode(ctx.ankiCtx?.() || {});
          },
          togglePlaylist: () => {
            if (global.VocabSpeech) global.VocabSpeech.toggleAudioPlaylist();
          }
        });
        if (handled) return;
      }
    });
  }

  // グローバルエクスポート
  global.VocabEvents = {
    syncCloudNow,
    updCloudUI,
    cloudLogin,
    cloudLogout,
    deleteAccountPermanently,
    runDatabaseDiagnosticsAndRepair,
    rescheduleOverdueReviews,
    setDailyReviewCap,
    bindDelegatedEvents,
    bindWindowEvents
  };
})(typeof window !== 'undefined' ? window : globalThis);

export {};
