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
    const appState = ctx.appState || global.VocabCore?.App;
    if (!global.VocabSync?.isCloudReady?.()) {
      if (manual && typeof ctx.openSettings === 'function') ctx.openSettings();
      return;
    }
    const now = Date.now();
    if (manual && now - lastManualSyncTime < 4000) {
      showToast('同期が完了したばかりです。数秒後に再度お試しください。', 'info', 2500);
      return;
    }
    if (appState && appState.isSyncing) return;
    if (appState) appState.isSyncing = true;
    if (manual) lastManualSyncTime = now;

    const topBadge = $('cloudSyncBadge');
    if (topBadge) topBadge.textContent = '同期中...';

    try {
      const hooks = typeof ctx.getAppSyncHooks === 'function' ? ctx.getAppSyncHooks() : (global.VocabCore?.getAppSyncHooks?.());
      let totalPulled = 0, totalPushed = 0;
      const getPairsFn = ctx.getAllKnownPairConfigs || global.VocabCore?.getAllKnownPairConfigs || (() => []);
      const allKnown = getPairsFn();
      const syncTargets = new Set(global.VocabStorage?.LANG_KEYS || ['en', 'fr', 'de', 'ja']);
      allKnown.forEach(p => {
        const id = p.pairId || p.key;
        if (id) syncTargets.add(id);
      });
      for (const l of syncTargets) {
        const res = await global.VocabSync.syncLangWithSupabase(l, hooks);
        totalPulled += res.pulled;
        totalPushed += res.pushed;
      }
      if ($('anki')?.style.display !== 'block' && typeof ctx.load === 'function' && appState) {
        ctx.load(appState.page);
      } else if (typeof ctx.renderSidebarTree === 'function') {
        ctx.renderSidebarTree();
      }
      updCloudUI(ctx);
      if (manual) alert(`クラウド差分同期完了\n・受信(Pull): ${totalPulled} 件\n・送信(Push): ${totalPushed} 件`);
    } catch (e) {
      if (manual) alert(`同期エラー: ${e.message}`);
      updCloudUI(ctx);
    } finally {
      if (appState) appState.isSyncing = false;
    }
  }

  /**
   * クラウドUIバッジ・アカウント状態を更新
   */
  function updCloudUI(ctx = {}) {
    const appState = ctx.appState || global.VocabCore?.App;
    const syncMod = global.VocabSync;
    const ready = Boolean(syncMod?.isCloudReady?.());
    const sess = syncMod?.getSession?.();
    const topBadge = $('cloudSyncBadge');
    const sbBadge = $('sbCloudStatusBadge');
    const authRow = $('sbCloudAuthRow');
    const loggedRow = $('sbCloudLoggedRow');
    const userTxt = $('sbCloudUserText');
    const quotaTxt = $('sbCloudQuotaText');

    if (topBadge) {
      if (ready) {
        const email = sess?.user?.email || '';
        const shortMail = email ? email.split('@')[0] : '';
        topBadge.className = 'badge ok';
        topBadge.textContent = shortMail ? `クラウド: ${shortMail}` : 'クラウド同期: 有効';
        topBadge.style.cursor = 'pointer';
        topBadge.onclick = () => {
          if (appState && appState.quotaRemaining === 0 && typeof ctx.openUpsellModal === 'function') {
            ctx.openUpsellModal('今月の無料枠（30語）をすべて消費しました。');
          } else if (typeof ctx.openSettings === 'function') {
            ctx.openSettings();
          }
        };
      } else if (ctx.getKey && ctx.getKey()) {
        topBadge.className = 'badge ok';
        topBadge.textContent = 'カスタムAPI(BYOK)';
        topBadge.style.cursor = 'pointer';
        topBadge.onclick = ctx.openSettings || global.VocabCore?.openSettings;
      } else {
        topBadge.className = 'badge ok';
        topBadge.textContent = '内蔵AI: 稼働中 (完全機密保護)';
        topBadge.style.cursor = 'pointer';
        topBadge.onclick = ctx.openSettings || global.VocabCore?.openSettings;
      }
    }
    if (sbBadge) {
      sbBadge.className = `badge ${ready ? 'ok' : 'ng'}`;
      sbBadge.textContent = ready ? 'ログイン済・同期有効' : '未ログイン';
    }
    if (authRow && loggedRow) {
      authRow.style.display = ready ? 'none' : 'flex';
      loggedRow.style.display = ready ? 'flex' : 'none';
    }
    if (userTxt && sess?.user?.email) {
      userTxt.textContent = `ログイン中: ${sess.user.email}`;
    }
    if (quotaTxt && appState && appState.quotaRemaining !== null) {
      quotaTxt.textContent = `本日のAI新規生成クォータ残り: ${appState.quotaRemaining} 語（共有キャッシュヒット時は消費されません）`;
    }
    if ($('cfgDot')) {
      const canGen = typeof ctx.canGenerateWords === 'function' ? ctx.canGenerateWords() : true;
      $('cfgDot').classList.toggle('warn', !canGen || Boolean(appState?.storageError));
    }

    const delSec = $('sbDeleteAccountSec');
    if (delSec) delSec.style.display = ready ? 'block' : 'none';

    if (ready && syncMod?.fetchUserProfile) {
      syncMod.fetchUserProfile().then(p => {
        if (!p) return;
        const isPro = (p.plan === 'pro' || p.plan === 'academic');
        const planBadge = $('curPlanBadge');
        if (planBadge) {
          if (p.grace_period_until && new Date(p.grace_period_until) > new Date()) {
            const graceStr = new Date(p.grace_period_until).toLocaleDateString();
            planBadge.textContent = `決済更新待ち (猶予: ${graceStr}まで)`;
            planBadge.className = 'badge warn';
          } else if (isPro && p.cancel_at_period_end) {
            const expStr = p.current_period_end ? ` (${new Date(p.current_period_end).toLocaleDateString()}まで有効)` : '';
            planBadge.textContent = `Pro プラン (期間満了で終了予定${expStr})`;
            planBadge.className = 'badge warn';
          } else {
            planBadge.textContent = isPro ? 'Pro プラン' : 'Free プラン';
            planBadge.className = `badge ${isPro ? 'ok' : 'ng'}`;
          }
        }
        $('planCardFree')?.classList.toggle('current', !isPro);
        $('planCardPro')?.classList.toggle('current', isPro);
        if ($('btnUpgradePro')) $('btnUpgradePro').style.display = isPro ? 'none' : 'block';
        if ($('btnManageSub')) $('btnManageSub').style.display = isPro ? 'block' : 'none';
      });
    }

    if (appState && appState.isDev) {
      const planBadge = $('curPlanBadge');
      if (planBadge) {
        planBadge.textContent = 'Developer Edition (全機能永久無制限)';
        planBadge.className = 'badge ok';
      }
      $('planCardFree')?.classList.remove('current');
      $('planCardPro')?.classList.add('current');
      if ($('btnUpgradePro')) $('btnUpgradePro').style.display = 'none';
      if ($('btnManageSub')) $('btnManageSub').style.display = 'none';
      let devNotice = $('devEditionNotice');
      if (!devNotice && $('planCardPro')) {
        devNotice = document.createElement('div');
        devNotice.id = 'devEditionNotice';
        devNotice.style.cssText = 'margin-top:8px;padding:8px 10px;background:var(--bg-hov);border-radius:6px;font-size:11.5px;color:var(--ac);font-weight:600;text-align:center';
        devNotice.innerHTML = '★ 開発者マスター権限により全機能が無制限解放されています（課金不要）';
        $('planCardPro').appendChild(devNotice);
      }
    }
  }

  /**
   * クラウドログイン / 新規登録
   */
  async function cloudLogin(isSignUp = false, ctx = {}) {
    if (!global.VocabSync) return alert('VocabSyncモジュールが読み込まれていません。');
    const url = $('sbUrlInput')?.value.trim() || '';
    const anon = $('sbAnonInput')?.value.trim() || '';
    const email = $('sbEmailInput')?.value.trim() || '';
    const pass = $('sbPassInput')?.value || '';
    if (!url || !anon) return alert('Supabase URL と Anon Key を入力してください。');
    if (!email || pass.length < 6) return alert('メールアドレスと6文字以上のパスワードを入力してください。');

    if (isSignUp) {
      const agreed = $('chkTermsAgree')?.checked;
      if (!agreed) {
        return alert('新規登録を行うには、利用規約およびプライバシーポリシーへの同意が必要です。チェックボックスをオンにしてください。');
      }
    }

    global.VocabSync.saveConfig(url, anon);
    try {
      const res = await global.VocabSync.signInOrSignUp(email, pass, isSignUp);
      if (isSignUp && !res.access_token) {
        alert('確認メールを送信しました。メール内のリンクを確認後にログインしてください。');
        return;
      }
      updCloudUI(ctx);
      await syncCloudNow(true, ctx);
    } catch (e) {
      alert(`クラウド認証エラー: ${e.message}`);
    }
  }

  /**
   * クラウドログアウト
   */
  async function cloudLogout(ctx = {}) {
    const appState = ctx.appState || global.VocabCore?.App;
    if (!global.VocabSync) return;
    await global.VocabSync.signOut();
    if (appState) appState.quotaRemaining = null;
    updCloudUI(ctx);
  }

  /**
   * アカウント完全抹消（GDPR対応）
   */
  async function deleteAccountPermanently(ctx = {}) {
    const appState = ctx.appState || global.VocabCore?.App;
    if (!global.VocabSync?.isCloudReady?.()) {
      alert('クラウドにログインしていません。');
      return;
    }
    const sess = global.VocabSync.getSession();
    const email = sess?.user?.email || 'あなたのアカウント';
    const firstConfirm = confirm(`【重要・警告】\n${email} の全データ（クラウド単語帳、学習履歴、アカウント情報）を完全に抹消します。\n※Proプラン契約中の方はStripeサブスクリプションも即時自動解約されます。\nこの操作は取り消せません。本当に退会しますか？`);
    if (!firstConfirm) return;

    if (confirm('退会する前に、登録した単語帳データをJSONファイルとしてダウンロード（保存）しますか？')) {
      await global.VocabSync?.exportAllUserDataJson?.();
    }

    const userInput = prompt('最終確認です。退会してデータを完全に消去する場合は「退会」と入力してください。');
    if (userInput !== '退会') {
      alert('入力内容が一致しなかったため、退会処理を中止しました。');
      return;
    }

    try {
      await global.VocabSync.deleteUserAccount();
      const langKeys = global.VocabStorage?.LANG_KEYS || ['en', 'fr', 'de', 'ja'];
      langKeys.forEach(l => {
        if (global.VocabStorage) {
          global.VocabStorage.state.mem[l] = [];
          global.VocabStorage.saveClearedAt(l, Date.now());
          global.VocabStorage.saveTombstones(l, new Map());
        }
        const storageKey = global.VocabStorage?.resolveConfig?.(l)?.key;
        if (storageKey) {
          try { localStorage.removeItem(storageKey); } catch {}
        }
      });
      if (appState) {
        appState.entries = [];
        appState.aList = [];
        appState.quotaRemaining = null;
      }
      updCloudUI(ctx);
      if (typeof ctx.load === 'function') ctx.load(1);
      if (global.VocabModal && typeof global.VocabModal.toggleModal === 'function') {
        global.VocabModal.toggleModal('settingsModal', false);
      }
      showToast('アカウントおよび全てのクラウドデータが完全に抹消されました。ご利用ありがとうございました。', 'ok', 6000);
    } catch (e) {
      alert(`退会処理エラー: ${e.message}`);
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

    const langKeys = global.VocabStorage?.LANG_KEYS || ['en', 'fr', 'de', 'ja'];

    for (const l of langKeys) {
      const cfg = global.VocabStorage?.resolveConfig ? global.VocabStorage.resolveConfig(l) : null;
      const key = cfg ? cfg.key : `distinction_entries_${l}`;
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

        // 2. タイムスタンプの正規化
        if (!Number.isFinite(item.updatedAt) || item.updatedAt <= 0 || item.updatedAt > now + 86400000 * 365) {
          item.updatedAt = now;
          itemModified = true;
        }
        if (!Number.isFinite(item.nextReview) || item.nextReview < 0) {
          item.nextReview = now + 86400000;
          itemModified = true;
        }
        if (!Number.isFinite(item.interval) || item.interval < 0) {
          item.interval = 1;
          itemModified = true;
        }
        if (!Number.isFinite(item.efactor) || item.efactor < 1.3 || item.efactor > 4.0) {
          item.efactor = 2.5;
          itemModified = true;
        }

        // 3. wordKey の補完
        if (!item.wordKey && global.VocabCore?.makeWordKey) {
          item.wordKey = global.VocabCore.makeWordKey(item.word, cfg?.srcLang || l, item.meanings?.[0]?.pos, item.homographIndex);
          itemModified = true;
        }

        if (itemModified) {
          langFixed++;
          issuesFixed++;
        }
        validEntries.push(item);
      }

      if (langFixed > 0 && typeof setJsonFn === 'function') {
        setJsonFn(key, validEntries, true);
        reportDetails.push(`${l.toUpperCase()}: ${langFixed}件の不整合を修復`);
      }

      // 4. Tombstone バキューム
      if (global.VocabStorage?.vacuumOldTombstones) {
        const preTombCount = global.VocabStorage.getTombstones(l).size;
        const cleaned = global.VocabStorage.vacuumOldTombstones(l);
        const pruned = preTombCount - cleaned.size;
        if (pruned > 0) {
          tombstonesPruned += pruned;
          reportDetails.push(`${l.toUpperCase()}: ${pruned}件の期限切れTombstoneをパージ`);
        }
      }
    }

    if (typeof ctx.load === 'function' && ctx.appState) ctx.load(ctx.appState.page);

    const summaryMsg = issuesFixed > 0 || tombstonesPruned > 0
      ? `診断・修復完了: ${totalScanned}語を検証、${issuesFixed}件の不整合を自動修復、${tombstonesPruned}件の不要Tombstoneを削除しました。`
      : `診断完了: 全${totalScanned}語の整合性は100%正常です（エラーなし・データ完全性維持）。`;

    showToast(summaryMsg, 'ok', 5000);
    alert(`【データベース健全性診断レポート】\n\n・検証対象単語: ${totalScanned} 語\n・修復した不整合: ${issuesFixed} 箇所\n・パージした古い削除マーカー: ${tombstonesPruned} 件\n・データベース状態: 最適化済み（Healthy: 100%）\n\n${reportDetails.join('\n') || 'すべてのデータが完全整合しています。'}`);
  }

  /**
   * 期日超過カードを今後7日間に均等スヌーズ再分散
   */
  function rescheduleOverdueReviews(ctx = {}) {
    const now = Date.now();
    const activeCfg = typeof ctx.getActivePairConfig === 'function' ? ctx.getActivePairConfig() : (global.VocabCore?.getActivePairConfig?.());
    if (!activeCfg) return;
    const getJsonFn = ctx.getJson || global.VocabCore?.getJson;
    const setJsonFn = ctx.setJson || global.VocabCore?.setJson;
    const list = typeof getJsonFn === 'function' ? getJsonFn(activeCfg.key) : [];
    const overdue = list.filter(i => (i.nextReview || 0) <= now);
    if (!overdue.length) return alert('期日超過の復習単語はありません。');

    if (!confirm(`期日超過の ${overdue.length} 語を、今後7日間に均等になだらかに再分散（スヌーズ）しますか？\n（毎日の復習負担が分散され、無理なく再開できます）`)) return;

    overdue.forEach((item, idx) => {
      const dayOffset = (idx % 7) + 1;
      const jitterMs = Math.floor(Math.random() * 3600000 * 3);
      item.nextReview = now + dayOffset * 86400000 + jitterMs;
      item.updatedAt = now;
      item.reviewUpdatedAt = now;
    });

    if (typeof setJsonFn === 'function') setJsonFn(activeCfg.key, list, true);
    if (typeof ctx.load === 'function' && ctx.appState) ctx.load(ctx.appState.page);
    showToast(`${overdue.length} 語の復習スケジュールを今後7日間に均等再配分しました。`, 'ok');
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

  /**
   * DOMイベント委譲の一括バインド
   */
  function bindDelegatedEvents(ctx = {}) {
    const appState = ctx.appState || global.VocabCore?.App;
    if (typeof document === 'undefined') return;

    document.addEventListener('click', e => {
      const el = e.target.closest?.('[data-act]');
      if (!el) return;
      const act = el.dataset.act;

      if (act === 'speak') {
        e.preventDefault(); e.stopPropagation();
        if (global.VocabSpeech) global.VocabSpeech.speakText(el.dataset.text, el.dataset.lang || appState?.lang);
      } else if (act === 'speak-current') {
        const c = appState?.aList?.[0];
        if (c && global.VocabSpeech) global.VocabSpeech.speakText(c.word, c.lang || appState?.lang);
      } else if (act === 'undo-anki') {
        if (global.VocabAnkiView) global.VocabAnkiView.undoAnkiRev(ctx.ankiCtx?.() || {});
        else if (typeof ctx.undoAnkiRev === 'function') ctx.undoAnkiRev();
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
      } else if (act === 'jump') {
        const jw = el.dataset.word;
        const jl = el.dataset.lang || appState?.lang;
        if (typeof ctx.jumpToWord === 'function') ctx.jumpToWord(jw, jl);
        showToast(`「${jw}」のカードへ移動しました`, 'ok', 2000);
      } else if (act === 'edit') {
        if (global.VocabModal && typeof global.VocabModal.openEditModal === 'function') global.VocabModal.openEditModal(el.dataset.id || parseInt(el.dataset.num, 10), el.dataset.lang || appState?.lang);
        else if (typeof ctx.openEditModal === 'function') ctx.openEditModal(el.dataset.id || parseInt(el.dataset.num, 10), el.dataset.lang || appState?.lang);
      } else if (act === 'del') {
        e.preventDefault(); e.stopPropagation();
        const num = parseInt(el.dataset.num, 10);
        const cardWord = el.closest('.card')?.dataset?.word;
        if (typeof ctx.delW === 'function') ctx.delW(el.dataset.id || (Number.isInteger(num) ? num : cardWord), el.dataset.lang || appState?.lang);
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
            const labelText = tabName === 'all' ? '詳細（語源・例文・歴史）' : (el.textContent?.trim() || '詳細');
            sumLbl.textContent = `${labelText} を表示中`;
          }
        }
      } else if (act === 'page') {
        if (appState) {
          appState.page += Number(el.dataset.dir);
          if (typeof ctx.render === 'function') ctx.render();
          $('mainScroll')?.scrollTo?.(0, 0);
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
          const { fName = '', useHist, useWikt, srcLang, tgtLang, pairKey } = card.dataset;
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
              pairKey: pairKey || (ctx.getActivePairConfig ? ctx.getActivePairConfig().key : '')
            });
          }
        } catch {}
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
      const card = e.target.closest('.card');
      if (card && !e.target.closest('button, a, input, select, textarea, [data-act]')) {
        const cards = $$('#list .card');
        const idx = cards.indexOf(card);
        if (idx !== -1 && typeof ctx.updateCardFocus === 'function') ctx.updateCardFocus(idx);
      }
    });

    document.addEventListener('keydown', e => {
      if ((e.key !== 'Enter' && e.key !== ' ') || e.isComposing) return;
      const el = e.target.closest?.('[data-act]');
      if (el && !['BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'A'].includes(el.tagName)) {
        e.preventDefault();
        el.click();
      }
    });

    $('extCandidateGrid')?.addEventListener('change', e => {
      const i = e.target.dataset?.extIdx;
      if (i === undefined || !appState?.extCandidates?.[i]) return;
      appState.extCandidates[i].checked = e.target.checked;
      e.target.closest('.ext-item')?.classList.toggle('checked', e.target.checked);
      if (global.VocabModal && typeof global.VocabModal.updateExtCounts === 'function') {
        global.VocabModal.updateExtCounts();
      }
    });

    const qIn = $('qSearch');
    if (qIn) {
      qIn.addEventListener('compositionstart', () => { if (appState) appState.isComposing = true; });
      qIn.addEventListener('compositionend', e => {
        if (appState) appState.isComposing = false;
        clearTimeout(appState?.searchDebounceTimer);
        if (typeof ctx.setSearch === 'function') ctx.setSearch(e.target.value);
      });
      qIn.addEventListener('input', e => {
        if (!appState?.isComposing) {
          clearTimeout(appState?.searchDebounceTimer);
          if (appState) {
            appState.searchDebounceTimer = setTimeout(() => {
              if (typeof ctx.setSearch === 'function') ctx.setSearch(e.target.value);
            }, 160);
          }
        }
      });
      qIn.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = e.target.value.trim();
          if (val && typeof ctx.jumpToWord === 'function') ctx.jumpToWord(val);
        }
      });
    }

    const inWordEl = $('inWord');
    if (inWordEl) {
      inWordEl.addEventListener('compositionstart', () => { if (appState) appState.isComposing = true; });
      inWordEl.addEventListener('compositionend', () => {
        setTimeout(() => { if (appState) appState.isComposing = false; }, 50);
      });
      inWordEl.addEventListener('keydown', e => {
        if (e.key === 'Enter' && (appState?.isComposing || e.isComposing || e.keyCode === 229)) {
          e.preventDefault();
        }
      });
    }

    const inFolEl = $('inFol');
    if (inFolEl) {
      inFolEl.addEventListener('compositionstart', () => { if (appState) appState.isComposing = true; });
      inFolEl.addEventListener('compositionend', () => {
        setTimeout(() => { if (appState) appState.isComposing = false; }, 50);
      });
      inFolEl.addEventListener('keydown', e => {
        if (e.key === 'Enter' && (appState?.isComposing || e.isComposing || e.keyCode === 229)) {
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
        if (window.speechSynthesis) {
          const u = new SpeechSynthesisUtterance('');
          u.volume = 0;
          speechSynthesis.speak(u);
        }
      } catch {}
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('click', unlockAudio);
    };
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('click', unlockAudio, { passive: true });

    // リサイズハンドラ
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && document.body?.classList.contains('side-open-lock')) {
        document.body.classList.remove('side-open-lock');
      }
    }, { passive: true });

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
        const l = global.VocabStorage.keyToLang(e.key);
        ctx.syncFromIdbForLang(l);
      }
    });

    // オンライン / オフライン自動復帰
    window.addEventListener('online', () => {
      if (global.VocabSRS?.flushOfflineReviews) global.VocabSRS.flushOfflineReviews();
      if (global.VocabSync?.isCloudReady?.()) syncCloudNow(false, ctx);
      showToast('オンラインに復帰しました。クラウド同期を再開します。', 'info', 2500);
    });
    window.addEventListener('offline', () => {
      showToast('オフラインモードです。復習や編集は端末内に安全に保持されます。', 'info', 3000);
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
      showToast('Vocab Vault をインストールしました。Dockやホーム画面から独立起動できます。', 'ok', 6000);
    });

    // グローバルキーボードショートカット委譲
    window.addEventListener('keydown', e => {
      if (global.VocabNavigation && typeof global.VocabNavigation.handleGlobalKeydown === 'function') {
        const handled = global.VocabNavigation.handleGlobalKeydown(e, {
          isAnkiOpen: () => $('anki')?.style.display === 'block',
          anyModalOpen: () => Boolean(document.querySelector('.modal-ov.open')),
          closeAllModals: () => global.VocabModal?.closeAllModals?.(),
          exitAnki: () => ctx.exitAnki?.(),
          getFocusedCardIndex: () => appState?.focusedCardIndex ?? -1,
          clearCardFocus: () => {
            if (appState) appState.focusedCardIndex = -1;
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
            if (appState?.aList?.[0] && global.VocabSpeech) {
              global.VocabSpeech.speakText(appState.aList[0].word, appState.aList[0].lang || appState?.lang);
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
              if (global.VocabAnkiView) global.VocabAnkiView.showAns();
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
            if (global.VocabAnkiView) global.VocabAnkiView.startAnki(ctx.ankiCtx?.() || {});
            else ctx.startAnki?.();
          },
          openGraph: () => {
            if (global.VocabGraph) global.VocabGraph.openGraphModal();
            else ctx.openGraphModal?.();
          },
          openShortcutsModal: () => {
            if (global.VocabModal) global.VocabModal.toggleModal('shortcutsModal', true);
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
