/**
 * Vocab Vault — Modal Dialog & UI Workflow Engine (js/modal.js)
 * High-performance Modal Lifecycle Management, Card Editor, Passage Extractor, Legal & Toast System
 */
(function (global) {
  'use strict';

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const cleanPho = global.VocabStorage?.cleanPho || (p => String(p ?? '').replace(/^[\[/\s]+/, '').replace(/[\]/\s]+$/, '').trim());
  const $ = id => typeof document !== 'undefined' ? document.getElementById(id) : null;

  let lastFocus = null;

  /**
   * モーダル開閉ライフサイクル制御
   */
  function toggleModal(id, open) {
    if (typeof document === 'undefined') return;
    if (open) lastFocus = document.activeElement;
    const el = $(id);
    if (el) {
      if (typeof open === 'boolean') {
        el.classList.toggle('open', open);
      } else {
        el.classList.toggle('open');
      }
    }
    if (id === 'graphModal' && el && !el.classList.contains('open')) {
      try {
        if (global.graphState?.animId) { cancelAnimationFrame(global.graphState.animId); global.graphState.animId = null; }
        const vs = global.VocabGraph?.state;
        if (vs?.animId) { cancelAnimationFrame(vs.animId); vs.animId = null; }
        if (vs?.treeEasingTimer) { cancelAnimationFrame(vs.treeEasingTimer); vs.treeEasingTimer = null; }
      } catch {}
    }
    if (id === 'cameraOcrModal' && el && !el.classList.contains('open')) {
      try { global.VocabOCR?.stopCameraOcr?.(); } catch {}
    }
    const any = Boolean(document.querySelector?.('.modal-ov.open'));
    const ws = document.querySelector?.('.workspace');
    if (ws) ws.inert = any;
    if (!any && lastFocus?.focus) {
      try { lastFocus.focus(); } catch {}
    }
  }

  /**
   * 全モーダル一括クローズ
   */
  function closeAllModals() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll?.('.modal-ov.open').forEach(el => {
      el.classList.remove('open');
    });
    try {
      if (typeof global.graphState !== 'undefined' && global.graphState?.animId) {
        cancelAnimationFrame(global.graphState.animId);
        global.graphState.animId = null;
      }
      const vs = global.VocabGraph?.state;
      if (vs?.animId) { cancelAnimationFrame(vs.animId); vs.animId = null; }
      if (vs?.treeEasingTimer) { cancelAnimationFrame(vs.treeEasingTimer); vs.treeEasingTimer = null; }
      global.VocabOCR?.stopCameraOcr?.();
    } catch {}
    const ws = document.querySelector?.('.workspace');
    if (ws) ws.inert = false;
    try {
      if (typeof lastFocus !== 'undefined' && lastFocus?.focus) {
        lastFocus.focus();
      }
    } catch {}
  }

  /**
   * スクリーンリーダー向け動的ライブリージョン通知 (WCAG 2.1 AA 準拠)
   */
  function announceA11y(msg) {
    if (typeof document === 'undefined' || !msg) return;
    const el = document.getElementById('a11yAnnouncer');
    if (el) {
      el.textContent = '';
      setTimeout(() => {
        if (el) el.textContent = String(msg);
      }, 50);
    }
  }

  /**
   * フローティングトースト通知
   */
  function showToast(msg, type = 'info', duration = 4500) {
    if (typeof document === 'undefined') return;
    announceA11y(msg);
    let container = document.getElementById('vvToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'vvToastContainer';
      container.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none;max-width:92vw;width:440px;';
      document.body.appendChild(container);
    }
    const t = document.createElement('div');
    const bg = type === 'ok' ? '#107c41' : type === 'warn' ? '#d97706' : type === 'error' || type === 'err' ? '#d13438' : '#7c3aed';
    t.style.cssText = `background:${bg};color:#fff;padding:12px 18px;border-radius:8px;font-size:13px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,0.28);pointer-events:auto;transition:all .3s ease;opacity:0;transform:translateY(-10px);line-height:1.45;`;
    t.textContent = msg;
    container.appendChild(t);
    requestAnimationFrame(() => {
      t.style.opacity = '1';
      t.style.transform = 'translateY(0)';
    });
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateY(-10px)';
      setTimeout(() => t.remove(), 350);
    }, duration);
  }

  /**
   * ダークモード切り替え
   */
  function toggleDarkMode(d) {
    const isDark = (typeof d === 'boolean') ? d : (typeof document !== 'undefined' && (document.body ? !document.body.classList.contains('dark') : !document.documentElement.classList.contains('dark')));
    if (typeof document !== 'undefined') {
      if (document.body) document.body.classList.toggle('dark', isDark);
      if (document.documentElement) document.documentElement.classList.toggle('dark', isDark);
    }
    if (global.lsSet) global.lsSet('vv_theme_dark', isDark ? '1' : '0');
    else if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem('vv_theme_dark', isDark ? '1' : '0'); } catch {}
    }
    const themeBtn = $('btnTheme');
    if (themeBtn) themeBtn.textContent = isDark ? 'ライト' : 'ダーク';
    if ($('chkDark')) $('chkDark').checked = isDark;
  }

  // --- 法務・規約モーダル ---
  const LEGAL_TEXTS = {
    terms: `
      <h4 style="margin:0 0 8px;color:var(--t)">Vocab Vault 利用規約</h4>
      <p>本規約は、Vocab Vault（以下「本サービス」）のご利用条件を定めるものです。</p>
      <h5 style="color:var(--t);margin:12px 0 4px">第1条（適用および登録）</h5>
      <p>本規約は、本サービスを利用する全てのユーザーに適用されます。登録ユーザーは真実かつ正確な情報を登録するものとします。</p>
      <h5 style="color:var(--t);margin:12px 0 4px">第2条（サービス内容とプラン）</h5>
      <p>本サービスは語源・概念史学習および暗記単語帳の管理機能を提供します。無料（Free）プランおよび有料（Pro）サブスクリプションが存在します。</p>
      <h5 style="color:var(--t);margin:12px 0 4px">第3条（AI生成コンテンツに関する免責・責任制限）</h5>
      <p>生成AI（Gemini API）により出力される語源、用例、概念史解説は学術的知見および辞書データに基づき自動生成されますが、その完全性・正確性・最新性を保証するものではありません。AIによる誤認（ハルシネーション）や学説の諸説が存在する可能性があるため、学習参考情報としてご利用ください。本サービスの利用により生じた損害について、当方の故意または重過失を除き、過去1ヶ月間にユーザーから受領した利用料金を上限とします。</p>
      <h5 style="color:var(--t);margin:12px 0 4px">第4条（有料プランおよび決済・解約・返金）</h5>
      <p>Proプランは月額480円（税込）で自動継続されます。決済処理はStripe, Inc.を通じて安全に行われます。特定商取引法上の政令指定通信販売におけるデジタルコンテンツおよびオンライン役務の性質上、決済完了後の日割り返金・キャンセルは致しかねます。解約手続きは設定画面（Stripe顧客ポータル）よりいつでも可能であり、次回更新日の前日までに解約された場合、次回以降の請求は発生せず、現在の請求期間満了まで引き続き有料機能をご利用いただけます。</p>
      <h5 style="color:var(--t);margin:12px 0 4px">第5条（公正利用方針 / Fair Use Policy）</h5>
      <p>ProプランにおけるAI語彙生成機能は無制限の個人学習を支援するものですが、サーバーインフラの健全性維持および自動スクレイピング防止のため、1アカウントあたり標準的な学習量（1日最大150語、月間最大3,000語）を目安とする公正利用方針（Fair Use Policy）を適用します。通常の人間による学習利用でこの目安に達することは実質的にありませんが、自動化プログラム等による異常な過剰リクエストが検知された場合は一時的な生成制限を行うことがあります。</p>
      <h5 style="color:var(--t);margin:12px 0 4px">第6条（禁止事項）</h5>
      <p>法令違反、システムの不正リバースエンジニアリング、APIクォータの不正迂回、スクレイピング、他者の権利侵害を禁止します。</p>
      <h5 style="color:var(--t);margin:12px 0 4px">第7条（退会および全データ抹消）</h5>
      <p>ユーザーは設定画面の『アカウント完全削除』より、いつでも自身の意思により即時退会を行えます。退会時、クラウド上の全単語データ、学習履歴、API利用ログ、認証情報はサーバーから完全に抹消され、復元することはできません。</p>
    `,
    privacy: `
      <h4 style="margin:0 0 8px;color:var(--t)">プライバシーポリシー（個人情報保護方針）</h4>
      <p>当サービスにおける利用者情報の適切な取扱い方針です。</p>
      <h5 style="color:var(--t);margin:12px 0 4px">1. 取得する情報</h5>
      <p>メールアドレス、登録単語・暗記復習履歴、アクセスログを取得します。クレジットカード情報は国際基準準拠のStripe社が処理し、当サービスサーバーには一切保存されません。</p>
      <h5 style="color:var(--t);margin:12px 0 4px">2. 利用目的</h5>
      <p>クラウド同期、Proプラン課金管理、AI解説生成、不具合調査およびサービス改善に限定して利用します。</p>
      <h5 style="color:var(--t);margin:12px 0 4px">3. 外部AI連携時のプライバシー配慮</h5>
      <p>AI解説生成リクエスト時、登録された英単語やクエリのみを送信し、メールアドレスや氏名等の個人識別情報は一切送信されません。</p>
      <h5 style="color:var(--t);margin:12px 0 4px">4. 安全管理措置</h5>
      <p>全通信の常時SSL/TLS暗号化、Supabase Row Level Security (RLS) によるデータ完全分離を実施しています。</p>
      <h5 style="color:var(--t);margin:12px 0 4px">5. データの消去（忘れられる権利）</h5>
      <p>ユーザーが退会を希望する場合、設定画面より自己の操作で即時にすべての保存データを完全消去できます。</p>
    `,
    tokusho: `
      <h4 style="margin:0 0 8px;color:var(--t)">特定商取引法に基づく表記</h4>
      <table style="width:100%;border-collapse:collapse;margin-top:8px">
        <tr style="border-bottom:1px solid var(--b)"><td style="padding:6px;font-weight:700;width:120px">販売事業者</td><td style="padding:6px">Vocab Vault 運営事務局</td></tr>
        <tr style="border-bottom:1px solid var(--b)"><td style="padding:6px;font-weight:700">運営統括責任者</td><td style="padding:6px">請求があったら遅滞なく開示いたします</td></tr>
        <tr style="border-bottom:1px solid var(--b)"><td style="padding:6px;font-weight:700">所在地・電話番号</td><td style="padding:6px">請求があったら遅滞なく開示いたします（サポート窓口をご利用ください）</td></tr>
        <tr style="border-bottom:1px solid var(--b)"><td style="padding:6px;font-weight:700">メールアドレス</td><td style="padding:6px">support@vocabvault.example.com</td></tr>
        <tr style="border-bottom:1px solid var(--b)"><td style="padding:6px;font-weight:700">販売価格</td><td style="padding:6px">Proプラン: 月額 480円（税込） / 年額 4,800円（税込）</td></tr>
        <tr style="border-bottom:1px solid var(--b)"><td style="padding:6px;font-weight:700">支払方法・時期</td><td style="padding:6px">クレジットカード決済（Stripe）。初回登録時に即時決済、以後毎月（または毎年）同日に自動更新。</td></tr>
        <tr style="border-bottom:1px solid var(--b)"><td style="padding:6px;font-weight:700">役務の提供時期</td><td style="padding:6px">決済完了後、直ちにご利用いただけます。</td></tr>
        <tr style="border-bottom:1px solid var(--b)"><td style="padding:6px;font-weight:700">解約・返金について</td><td style="padding:6px">デジタルコンテンツおよびオンライン役務の性質上、決済完了後の返金・キャンセルには応じられません。解約は設定画面の「契約管理（Stripe）」よりいつでも可能です。次回更新日の前日までに解約された場合、次回以降の請求は発生せず、現在の有効期間満了まで引き続きご利用いただけます。</td></tr>
      </table>
    `
  };

  function switchLegalTab(tab = 'terms') {
    const content = $('legalModalContent');
    if (content) content.innerHTML = LEGAL_TEXTS[tab] || LEGAL_TEXTS.terms;
    ['tabLegalTerms', 'tabLegalPrivacy', 'tabLegalTokusho'].forEach(id => {
      const el = $(id);
      if (el) {
        const isCur = (id === `tabLegal${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
        el.className = `btn-xs ${isCur ? '' : 'btn-o'}`;
      }
    });
  }

  function openLegalModal(tab = 'terms') {
    switchLegalTab(tab);
    toggleModal('legalModal', true);
  }

  // --- Proアップセル & 設定モーダル ---
  function getRootTreeProgress() {
    const App = global.App || {};
    const entries = App.entries || [];
    const rootCountMap = new Map();
    let validCount = 0;
    for (const e of entries) {
      if (!e || e.isDeleted) continue;
      validCount++;
      const tags = Array.isArray(e.etymologyTags) ? e.etymologyTags : [];
      for (const t of tags) {
        if (t && typeof t === 'string' && t.startsWith('*')) {
          rootCountMap.set(t, (rootCountMap.get(t) || 0) + 1);
        }
      }
    }
    let bestRoot = '*sta-';
    let bestCount = 0;
    for (const [r, c] of rootCountMap.entries()) {
      if (c > bestCount) {
        bestCount = c;
        bestRoot = r;
      }
    }
    const targetCluster = 5;
    const remToCluster = Math.max(1, targetCluster - (bestCount % targetCluster || targetCluster));
    return {
      totalWords: validCount,
      totalRoots: rootCountMap.size,
      leadingRoot: bestRoot,
      leadingCount: bestCount,
      remToCluster
    };
  }

  function openUpsellModal(reason = '') {
    const App = global.App || {};
    if (App.isDev) {
      if (showToast) showToast('開発者マスターモード: Pro機能を制限なく実行しました', 'ok', 3000);
      return;
    }
    const rEl = $('upsellModalReason') || $('upsellReason');
    const defaultReason = '本日のAI新規生成無料枠（5語/日）に達しました';
    if (rEl) {
      rEl.textContent = reason || defaultReason;
      rEl.style.display = 'block';
    }

    // 項目11: 語根ネットワーク成長プログレス (Value-Driven Upsell)
    const progEl = $('upsellRootProgress');
    if (progEl) {
      const p = getRootTreeProgress();
      progEl.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <div style="font-size:11.5px;font-weight:700;color:var(--t)">
            <span>あなたの語根ネットワーク成長度</span>
          </div>
          <span style="font-size:11px;font-weight:700;color:var(--ac);background:rgba(99,102,241,0.1);padding:2px 6px;border-radius:4px">
            発掘済: ${p.totalRoots} 語根
          </span>
        </div>
        <p style="font-size:11.5px;color:var(--s);margin:0 0 8px;line-height:1.5">
          現在 <strong>${p.totalWords}語</strong> の知識が蓄積されています。主要語根 <code>${p.leadingRoot}</code> ファミリーは<strong>あと ${p.remToCluster} 語</strong>で次のクラスタが完成します！
        </p>
        <div style="background:var(--bg);height:6px;border-radius:3px;overflow:hidden;border:1px solid var(--b)">
          <div style="background:var(--ac);height:100%;width:${Math.min(100, Math.max(15, (p.leadingCount % 5 || 5) * 20))}%;transition:width 0.3s ease"></div>
        </div>
      `;
      progEl.style.display = 'block';
    }

    toggleModal('upsellModal', true);
  }

  function openSettings() {
    const App = global.App || {};
    const getKeyFn = global.getKey || (() => String(global.EMBEDDED_KEY || (global.lsGet ? global.lsGet('vv_gemini_api_key') : '')).trim());
    if ($('apiKeyInput')) $('apiKeyInput').value = getKeyFn();
    const curLang = App.lang || 'en';
    const langCfg = global.LANGS?.[curLang] || { label: 'English' };
    if ($('curLangLabel')) $('curLangLabel').textContent = langCfg.label;
    if ($('chkDark') && typeof document !== 'undefined') $('chkDark').checked = document.body ? document.body.classList.contains('dark') : document.documentElement.classList.contains('dark');
    if ($('chkAutoSpeak') && global.lsGet) $('chkAutoSpeak').checked = global.lsGet('vv_tts_auto_anki', '1') !== '0';
    if ($('ttsRateSel') && global.lsGet) $('ttsRateSel').value = global.lsGet('vv_tts_rate', '0.95');
    if ($('selDailyCap')) $('selDailyCap').value = String(App.dailyReviewCap || 30);
    if (global.VocabSync) {
      const cfg = global.VocabSync.getConfig();
      if ($('sbUrlInput')) $('sbUrlInput').value = cfg.url;
      if ($('sbAnonInput')) $('sbAnonInput').value = cfg.anonKey;
    }
    const isStandalone = (typeof window !== 'undefined') && (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator?.standalone === true
    );
    if ($('pwaStatusBadge')) {
      $('pwaStatusBadge').textContent = isStandalone ? '単体アプリ起動中' : '単体起動対応 (PWA)';
      $('pwaStatusBadge').className = 'badge ok';
    }
    if ($('btnPwaInstall')) {
      if (isStandalone) {
        $('btnPwaInstall').textContent = '単体アプリとして実行中';
        $('btnPwaInstall').disabled = true;
      } else {
        $('btnPwaInstall').innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>アプリをインストール（単独起動）';
        $('btnPwaInstall').disabled = false;
      }
    }
    if (global.updStats) global.updStats();
    if (global.updKeyUI) global.updKeyUI();
    if (global.updCloudUI) global.updCloudUI();

    // 観点1: FSRSオプティマイザおよびスマートPush通知のステータス同期
    updateFSRSOptimizerUI();
    updateSmartNotifyUI();

    const curQuota = global.App?.quotaRemaining ?? 30;
    if ($('quotaNum')) $('quotaNum').textContent = curQuota;
    toggleModal('settingsModal', true);
  }

  function updateFSRSOptimizerUI() {
    const fsrsWeights = global.VocabSRS?.getUserFSRSWeights ? global.VocabSRS.getUserFSRSWeights() : null;
    const historyLogs = global.VocabSRS?.getReviewHistoryLog ? global.VocabSRS.getReviewHistoryLog() : [];
    const count = historyLogs.length;

    const badge = $('fsrsOptBadge');
    const desc = $('fsrsOptDesc');
    if (badge) {
      if (fsrsWeights) {
        badge.textContent = `最適化稼働中 (+${fsrsWeights.improvement || '0'}%)`;
        badge.className = 'badge ok';
      } else if (count >= 20) {
        badge.textContent = `最適化可能 (${count}件ログ)`;
        badge.className = 'badge ok';
      } else {
        badge.textContent = `初期係数 (${count}/20件)`;
        badge.className = 'badge';
        badge.style.background = 'var(--b)';
        badge.style.color = 'var(--s)';
      }
    }
    if (desc) {
      if (fsrsWeights) {
        desc.textContent = `FSRSパーソナライズ学習: 有効（学習ログ ${fsrsWeights.logCount || count}件に基づき最適化中・精度改善 +${fsrsWeights.improvement || '0'}%）`;
      } else {
        desc.textContent = `FSRSパーソナライズ学習: 初期係数稼働中（学習ログ ${count}/20件。20件蓄積で自動最適化されます）`;
      }
    }
  }

  function updateSmartNotifyUI() {
    const isEnabled = global.VocabSRS?.isSmartNotifyEnabled ? global.VocabSRS.isSmartNotifyEnabled() : true;
    if ($('chkSmartNotify')) $('chkSmartNotify').checked = isEnabled;

    const badge = $('smartNotifyBadge');
    const desc = $('smartNotifyPermDesc');
    const btn = $('btnReqNotify');

    const perm = (typeof window !== 'undefined' && 'Notification' in window) ? Notification.permission : 'unsupported';
    if (badge) {
      if (!isEnabled) {
        badge.textContent = '通知無効';
        badge.className = 'badge';
        badge.style.background = 'var(--b)';
        badge.style.color = 'var(--s)';
      } else if (perm === 'granted') {
        badge.textContent = '通知稼働中';
        badge.className = 'badge ok';
      } else if (perm === 'denied') {
        badge.textContent = '通知ブロック中';
        badge.className = 'badge ng';
      } else {
        badge.textContent = '通知未許可';
        badge.className = 'badge';
        badge.style.background = 'var(--b)';
        badge.style.color = 'var(--s)';
      }
    }
    if (desc) {
      if (perm === 'granted') desc.textContent = 'ブラウザ通知許可済み（記憶定着率90%直前で自動アラート）';
      else if (perm === 'denied') desc.textContent = 'ブラウザ設定で通知がブロックされています。設定から許可してください。';
      else desc.textContent = '通知ボタンを押してブラウザ通知を許可してください。';
    }
    if (btn) {
      btn.style.display = perm === 'granted' ? 'none' : 'inline-block';
    }
  }

  async function requestSmartNotifyPermission() {
    if (global.VocabSRS?.requestNotificationPermission) {
      const res = await global.VocabSRS.requestNotificationPermission();
      updateSmartNotifyUI();
      if (global.VocabModal?.showToast) {
        if (res === 'granted') {
          global.VocabModal.showToast('忘却臨界点スマートPush通知を許可しました。', 'ok');
        } else {
          global.VocabModal.showToast('通知は許可されませんでした。', 'info');
        }
      }
    }
  }

  async function saveKeyFromModal() {
    const k = $('apiKeyInput')?.value?.trim() || $('customApiKey')?.value?.trim() || '';
    if (global.setKey) global.setKey(k);
    else if (global.lsSet) global.lsSet('vv_gemini_api_key', k);
    else if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem('vv_gemini_api_key', k); } catch {}
    }
    if (global.App) global.App.cachedModels = null;
    if (global.updKeyUI) global.updKeyUI();
    if (global.updCloudUI) global.updCloudUI();
    if (!k) {
      if (global.showToast) global.showToast('ローカルAPIキーを消去しました。', 'info');
      else alert('ローカルAPIキーを消去しました。');
      return;
    }
    if (global.fetchModels) {
      try {
        const m = await global.fetchModels(k, true);
        if (global.updKeyUI) global.updKeyUI(true);
        if (global.showToast) global.showToast(`接続確認完了 (${m.length}モデル)`, 'ok');
        else alert(`接続確認完了 (${m.length}モデル)`);
      } catch (e) {
        if (global.updKeyUI) global.updKeyUI(false);
        if (global.showToast) global.showToast(`接続エラー: ${e.message}`, 'error');
        else alert(e.message);
      }
    }
    toggleModal('settingsModal', false);
  }

  // --- 単語カード編集モーダル ---
  function parsePipeLines(text, mapFn) {
    return String(text ?? '').split('\n').map(l => l.trim()).filter(Boolean).map(l => mapFn(l.split('|').map(s => s.trim()))).filter(Boolean);
  }

  function openEditModal(idOrNum, tL = null) {
    const App = global.App || {};
    const targetLang = tL || App.lang || 'en';
    const activeCfg = global.getActivePairConfig ? global.getActivePairConfig() : { key: 'distinction_entries' };
    const curPairKey = activeCfg.key;
    const preferKey = (!App.crossLang || !tL || targetLang === App.srcLang) ? curPairKey : (global.LANGS?.[targetLang]?.key || curPairKey);

    let targetKey = preferKey;
    let list = [...(global.getJson ? global.getJson(preferKey) : [])];
    if (!list.length && App.entries?.length) list = [...App.entries];

    let it = list.find(x => x.id === idOrNum) || list.find(x => x.word === idOrNum || (typeof idOrNum === 'number' && x.num === idOrNum));

    if (!it && global.getAllKnownPairConfigs) {
      const allPairs = global.getAllKnownPairConfigs();
      for (const p of allPairs) {
        const otherList = [...(global.getJson ? global.getJson(p.key) : [])];
        const found = otherList.find(x => x.id === idOrNum) || otherList.find(x => x.word === idOrNum || (typeof idOrNum === 'number' && x.num === idOrNum));
        if (found) {
          it = found;
          targetKey = p.key;
          break;
        }
      }
    }

    if (!it) return;

    if ($('editId')) $('editId').value = it.id || '';
    if ($('editLang')) $('editLang').value = it.lang || targetLang;
    if ($('editTargetKey')) $('editTargetKey').value = targetKey;
    if ($('editWord')) $('editWord').value = it.word || '';
    if ($('editHomo')) $('editHomo').value = it.homographIndex || 1;
    if ($('editPho')) $('editPho').value = it.phonetic || '';
    if ($('editGram')) $('editGram').value = it.grammar_forms || '';
    if ($('editCat')) $('editCat').innerHTML = (global.CATS || []).map(c => `<option value="${esc(c)}" ${c === it.category ? 'selected' : ''}>${esc(c)}</option>`).join('');
    if ($('editFol')) $('editFol').value = it.folder || '';
    if ($('editMeanings')) $('editMeanings').value = (it.meanings || []).map(m => `${m.pos} | ${m.text}`).join('\n');
    if ($('editHistNote')) $('editHistNote').value = it.history_note || '';
    if ($('editCore')) $('editCore').value = it.core || '';
    if ($('editConf')) $('editConf').value = it.etymologyConfidence || '';
    if ($('editEty')) $('editEty').value = it.etymology || '';
    if ($('editEtyTags')) $('editEtyTags').value = (it.etymologyTags || []).join(', ');
    if ($('editExForeign')) $('editExForeign').value = it.example?.foreign || '';
    if ($('editExUsed')) $('editExUsed').value = it.example?.used_form || '';
    if ($('editExJa')) $('editExJa').value = it.example?.ja || '';
    if ($('editPhrases')) $('editPhrases').value = (it.phrases || []).map(p => `${p.foreign} | ${p.ja}`).join('\n');
    if ($('editDerivatives')) $('editDerivatives').value = (it.derivatives || []).map(d => [d.word, d.phonetic || '', d.pos || 'N[C]', d.meaning || '', d.sub_phrase || '', d.sub_trans || ''].join(' | ')).join('\n');
    if ($('editGenMeta')) $('editGenMeta').textContent = it.gen?.model ? `Generated by ${it.gen.model} (pv: ${it.gen.pv})` : '手動または旧版データ';

    toggleModal('editModal', true);
    requestAnimationFrame(() => $('editWord')?.focus());
  }

  function saveEditCard() {
    const App = global.App || {};
    const id = $('editId')?.value;
    let tL = $('editLang')?.value || App.lang || 'en';
    let targetKey = $('editTargetKey')?.value || (global.getActivePairConfig ? global.getActivePairConfig().key : 'distinction_entries');
    let list = [...(global.getJson ? global.getJson(targetKey) : [])];
    let idx = list.findIndex(x => x.id === id);

    if (idx === -1 && global.getAllKnownPairConfigs) {
      const allPairs = global.getAllKnownPairConfigs();
      for (const p of allPairs) {
        const otherList = [...(global.getJson ? global.getJson(p.key) : [])];
        const foundIdx = otherList.findIndex(x => x.id === id);
        if (foundIdx !== -1) {
          list = otherList;
          idx = foundIdx;
          targetKey = p.key;
          tL = p.srcLang || p.lang || tL;
          break;
        }
      }
    }
    if (idx === -1) return;

    const w = $('editWord')?.value?.trim().normalize('NFC') || '';
    if (!w) return alert('見出し語を入力してください。');
    const homoIdx = Math.max(1, parseInt($('editHomo')?.value, 10) || 1);

    const meanings = parsePipeLines($('editMeanings')?.value, p => p.length === 1 ? { pos:'N[C]', text:p[0] } : { pos:p[0] || 'N[C]', text:p.slice(1).join(' | ') });
    const prev = list[idx], finalMeanings = meanings.length ? meanings : prev.meanings;
    const makeWordKeyFn = global.VocabMorphology?.makeWordKey || global.makeWordKey || ((word, lang, pos, homo) => `${lang}:${word}#${homo || 1}`);
    const newWk = makeWordKeyFn(w, tL, finalMeanings[0]?.pos, homoIdx);

    const conflictIdx = list.findIndex((x, i) => i !== idx && (x.wordKey || makeWordKeyFn(x.word, tL, x.meanings?.[0]?.pos, x.homographIndex)) === newWk);
    if (conflictIdx !== -1 && !confirm(`既に同じ見出し語・同形番号のカード「${w} (#${homoIdx})」が存在します。\n別カードとして残す場合は「キャンセル」を押して「同形#」を 2 などに変更してください。\n既存カードを上書き統合してもよろしいですか？`)) return;

    const phrases = parsePipeLines($('editPhrases')?.value, p => p[0] ? { foreign:p[0], ja:p[1] || '' } : null);
    const derivatives = parsePipeLines($('editDerivatives')?.value, p => p[0] ? { word:p[0], phonetic:cleanPho(p[1] || ''), pos:p[2] || 'N[C]', meaning:p[3] || '', sub_phrase:p[4] || '', sub_trans:p[5] || '' } : null);

    const confVal = $('editConf')?.value, rawTags = ($('editEtyTags')?.value || '').split(/[,、]+/).map(s => s.trim()).filter(Boolean);
    const exF = $('editExForeign')?.value?.trim() || '', exJ = $('editExJa')?.value?.trim() || '', exU = $('editExUsed')?.value?.trim() || '', now = Date.now();

    const oldWk = prev.wordKey || makeWordKeyFn(prev.word, tL, prev.meanings?.[0]?.pos, prev.homographIndex);
    const tombMap = global.VocabStorage ? global.VocabStorage.getTombstones(targetKey) : new Map();
    if (oldWk && oldWk !== newWk) tombMap.set(`wk:${oldWk}`, now);
    tombMap.delete(`wk:${newWk}`);
    tombMap.delete(`id:${prev.id}`);

    const sanitizeItemFn = global.sanitizeItem || (x => x);
    const validateEntryFn = global.validateEntry || (() => []);
    const etyConfEnum = global.ETY_CONF_ENUM || ['certain', 'probable', 'disputed', 'unknown'];

    const updated = sanitizeItemFn({
      ...prev, word: w, homographIndex: homoIdx, wordKey: newWk,
      version: (Number(prev.version) || 1) + 1,
      phonetic: cleanPho($('editPho')?.value), grammar_forms: $('editGram')?.value?.trim() || undefined,
      category: $('editCat')?.value, folder: $('editFol')?.value?.trim() || undefined,
      meanings: finalMeanings, history_note: $('editHistNote')?.value?.trim() || undefined, core: $('editCore')?.value?.trim(),
      etymologyConfidence: etyConfEnum.includes(confVal) ? confVal : undefined,
      etymology: $('editEty')?.value?.trim(), etymologyTags: confVal === 'unknown' ? [] : rawTags,
      example: (exF || exJ) ? { foreign: exF, ja: exJ, used_form: exU || undefined } : null,
      phrases, derivatives, updatedAt: now
    }, idx, tL);

    updated.flags = validateEntryFn(updated);
    list[idx] = updated;
    if (conflictIdx !== -1) {
      const [removed] = list.splice(conflictIdx, 1);
      if (removed?.id) tombMap.set(`id:${removed.id}`, now);
      if (removed?.wordKey && removed.wordKey !== newWk && removed.wordKey !== updated.wordKey) {
        tombMap.set(`wk:${removed.wordKey}`, now);
      }
    }
    if (global.VocabStorage) global.VocabStorage.saveTombstones(targetKey, tombMap);

    const nextList = list.map((it, i) => ({ ...it, num: i + 1 }));
    if (global.setJson) {
      global.setJson(targetKey, nextList, true, true);
    } else if (global.VocabStorage) {
      global.VocabStorage.state.mem[targetKey] = nextList;
    }
    if (targetKey === (global.getActivePairConfig ? global.getActivePairConfig().key : '')) {
      App.entries = global.VocabStorage?.state?.mem?.[targetKey] || nextList;
    }
    toggleModal('editModal', false);
    if (global.load) global.load(App.page);
    showToast(`「${w}」を更新しました`, 'ok');
  }

  // --- パッセージ抽出モーダル ---
  function openExtractModal() {
    const App = global.App || {};
    const cfg = global.LANGS?.[App.lang] || global.LANGS?.en || { badge: 'EN', levels: [] };
    const sel = $('extLevelSel');
    const saved = global.lsGet ? global.lsGet('vv_ext_level', 'b2') : 'b2';
    if ($('extLangBadge')) $('extLangBadge').textContent = cfg.badge;
    if (sel) {
      sel.innerHTML = '';
      (cfg.levels || []).forEach(o => { const el = new Option(o.label, o.id); if (o.id === saved) el.selected = true; sel.add(el); });
    }
    if ($('inFol')?.value?.trim() && !$('extFolInput')?.value?.trim() && $('extFolInput')) {
      $('extFolInput').value = $('inFol').value.trim();
    }
    const getKeyFn = global.getKey || (() => '');
    if ($('ocrInlineApiKey') && getKeyFn()) $('ocrInlineApiKey').value = getKeyFn();
    toggleModal('extractModal', true);
    requestAnimationFrame(() => $('extTextarea')?.focus());
  }

  function updateExtCounts() {
    const App = global.App || {};
    const n = (App.extCandidates || []).filter(c => c.checked).length;
    if ($('extResCount')) $('extResCount').textContent = `抽出候補: ${(App.extCandidates || []).length} 語 （選択: ${n} 語）`;
    if ($('btnCommitExt')) {
      $('btnCommitExt').disabled = !n;
      $('btnCommitExt').textContent = `選択した ${n} 語を一括登録`;
    }
  }

  function renderExtCandidates() {
    const App = global.App || {};
    updateExtCounts();
    const spkFn = (txt, l) => global.VocabSpeech ? global.VocabSpeech.mkSpkBtn(txt, l, true) : (global.mkSpkBtn ? global.mkSpkBtn(txt, l, true) : '');
    if ($('extCandidateGrid')) {
      $('extCandidateGrid').innerHTML = (App.extCandidates || []).map((c, i) => `<label class="ext-item ${c.checked ? 'checked' : ''} ${c.already ? 'already' : ''}"><input type="checkbox" data-ext-idx="${i}" ${c.checked ? 'checked' : ''}><div class="ext-info"><div class="ext-w"><span>${esc(c.word)}</span>${c.pos ? `<span class="ext-p">${esc(c.pos)}</span>` : ''}${c.already ? `<span class="ext-alr-badge">登録済</span>` : ''}${spkFn(c.word, App.lang)}</div><div class="ext-m" title="${esc(c.sentence || c.meaning)}">${esc(c.meaning)}</div></div></label>`).join('');
    }
  }

  function toggleAllExtChecks(f) {
    const App = global.App || {};
    (App.extCandidates || []).forEach(c => { c.checked = f ? !c.already : false; });
    renderExtCandidates();
  }

  let _isCommittingExt = false;

  function commitExtractedWords() {
    if (_isCommittingExt) return;
    const App = global.App || {};
    const sel = (App.extCandidates || []).filter(c => c.checked).map(({ word, pos, meaning, sentence }) => ({ word, pos, meaning, sentence }));
    if (!sel.length) return;

    _isCommittingExt = true;
    try {
      const getKeyFn = global.getKey || (() => '');
      const usageInfo = global.VocabStorage?.getDailyAiUsageInfo ? global.VocabStorage.getDailyAiUsageInfo({ appState: App }) : null;
      if (usageInfo && !usageInfo.isUnlimited && usageInfo.remaining <= 0 && !getKeyFn()) {
        toggleModal('extractModal', false);
        openUpsellModal('本日のAI新規生成無料枠（5語/日）をすべて消費しました。抽出した単語を一括登録するにはProプランをご利用いただくか、明日以降に再度お試しください。');
        return;
      }
      const f = $('extFolInput')?.value?.trim() || $('inFol')?.value?.trim() || '';
      if (f && $('inFol')) $('inFol').value = f;
      toggleModal('extractModal', false);
      const regFn = global.VocabQueue?.registerWordsList || global.registerWordsList;
      if (regFn) {
        regFn(sel, f, $('chkHist')?.checked, $('chkWikt')?.checked);
      }
    } finally {
      setTimeout(() => { _isCommittingExt = false; }, 600);
    }
  }

  // --- スターターパック ギャラリーモーダル ---
  function openStarterPackModal() {
    const modal = $('starterPackModal');
    if (!modal) return;
    const body = $('starterPackModalBody');
    const currentLang = global.App?.srcLang || global.App?.lang || 'en';
    if (body && global.VocabStarterPack?.buildStarterPackGalleryHtml) {
      body.innerHTML = global.VocabStarterPack.buildStarterPackGalleryHtml(currentLang);
    }
    toggleModal('starterPackModal', true);
  }

  function installStarterPackFromModal(packId) {
    if (!packId || !global.VocabStarterPack?.populateStarterPack) return;
    const App = global.App || {};
    const meta = global.VocabStarterPack.PACK_METADATA?.[packId];
    const packLang = meta?.lang || 'en';

    // パックの対象言語と現在の選択言語が異なる場合は自動同期切り替え
    if (meta?.lang && App.srcLang && meta.lang !== App.srcLang) {
      if (typeof global.VocabCore?.setLanguagePair === 'function') {
        global.VocabCore.setLanguagePair(meta.lang, 'ja');
      } else if (typeof global.setLanguagePair === 'function') {
        global.setLanguagePair(meta.lang, 'ja');
      }
    }

    const curPairKey = global.VocabCore?.getActivePairConfig?.()?.key || (meta?.lang ? (meta.lang === 'en' ? 'distinction_entries' : `distinction_entries_${meta.lang}`) : 'distinction_entries');
    const curEntries = (typeof global.VocabCore?.getJson === 'function' ? global.VocabCore.getJson(curPairKey) : (global.VocabStorage?.state?.mem?.[curPairKey] || []));
    const lang = App.srcLang || App.lang || packLang;
    const { added, merged } = global.VocabStarterPack.populateStarterPack(curEntries, lang, packId, curPairKey);

    if (added.length === 0) {
      showToast('このスターターパックの単語はすべて既にライブラリに存在します。', 'info');
      return;
    }

    if (global.setJson) {
      global.setJson(curPairKey, merged, true, true);
    } else if (global.VocabStorage) {
      global.VocabStorage.state.mem[curPairKey] = merged;
    }
    App.entries = global.VocabStorage?.state?.mem?.[curPairKey] || merged;
    const activePairId = global.VocabCore?.getActivePairConfig?.()?.pairId || `${lang}_ja`;
    try { localStorage.setItem(`vv_starter_loaded_${activePairId}`, '1'); } catch {}

    toggleModal('starterPackModal', false);
    if (global.load) global.load(1);

    const packName = global.VocabStarterPack.PACK_METADATA?.[packId]?.name || packId;
    showToast(`「${packName}」（${added.length}語）をライブラリに取り込みました。`, 'ok', 4000);
  }

  // --- Anki インポートモーダル ---
  function openAnkiImportModal() {
    const modal = $('ankiImportModal');
    if (!modal) return;
    const textEl = $('ankiImportText');
    if (textEl) textEl.value = '';
    const fileEl = $('ankiFileInput');
    if (fileEl) fileEl.value = '';
    const previewEl = $('ankiImportPreview');
    if (previewEl) previewEl.innerHTML = '<span style="color:var(--m)">TSV/CSVテキストを貼り付けるか、ファイルを選択してください</span>';
    toggleModal('ankiImportModal', true);
  }

  function handleAnkiFileSelect(ev) {
    const f = ev.target?.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = e => {
      const text = e.target.result;
      const textEl = $('ankiImportText');
      if (textEl) textEl.value = text;
      previewAnkiImport(text);
    };
    r.readAsText(f);
  }

  function previewAnkiImport(text = null) {
    const raw = text !== null ? text : ($('ankiImportText')?.value || '');
    const previewEl = $('ankiImportPreview');
    if (!previewEl) return;

    if (!raw.trim()) {
      previewEl.innerHTML = '<span style="color:var(--m)">テキストを入力するか、ファイルを選択してください</span>';
      return;
    }

    const items = global.VocabExport?.parseAnkiExport ? global.VocabExport.parseAnkiExport(raw) : [];
    if (!items.length) {
      previewEl.innerHTML = '<span style="color:var(--err)">有効な単語が検出されませんでした。フォーマットをご確認ください。</span>';
      return;
    }

    const sample = items.slice(0, 3).map(i => `
      <div style="padding:4px 8px;background:var(--bg-card);border:1px solid var(--b);border-radius:4px;margin-top:4px;font-size:11.5px">
        <strong>${esc(i.word)}</strong> ${i.phonetic ? `<em>[${esc(i.phonetic)}]</em>` : ''} - <span>${esc(i.meanings?.[0]?.text || '')}</span>
      </div>
    `).join('');

    previewEl.innerHTML = `
      <div style="font-size:12px;font-weight:700;color:var(--ok)">検出された単語: ${items.length} 語</div>
      <div style="margin-top:4px">${sample}</div>
      ${items.length > 3 ? `<div style="font-size:11px;color:var(--m);margin-top:4px">他 ${items.length - 3} 語...</div>` : ''}
    `;
  }

  function executeAnkiImport() {
    const raw = $('ankiImportText')?.value || '';
    if (!raw.trim()) {
      showToast('インポートするAnkiデータがありません。', 'warn');
      return;
    }

    try {
      if (global.VocabExport?.importAnkiText) {
        global.VocabExport.importAnkiText(raw);
        toggleModal('ankiImportModal', false);
      }
    } catch (err) {
      showToast(`インポートに失敗しました: ${err.message}`, 'err');
    }
  }

  // グローバルクリックハンドラ（starter pack install 等のデリゲーション）
  if (typeof document !== 'undefined') {
    document.addEventListener('click', e => {
      const btn = e.target?.closest?.('[data-act="install-starter-pack"]');
      if (btn) {
        const packId = btn.getAttribute('data-pack');
        if (packId) installStarterPackFromModal(packId);
      }
      const starterBtn = e.target?.closest?.('[data-act="open-starter-modal"]');
      if (starterBtn) {
        openStarterPackModal();
      }
    });
  }

  // --- グローバルエクスポート ---
  global.VocabModal = {
    toggleModal,
    closeAllModals,
    showToast,
    announceA11y,
    toggleDarkMode,
    LEGAL_TEXTS,
    switchLegalTab,
    openLegalModal,
    openUpsellModal,
    openSettings,
    saveKeyFromModal,
    parsePipeLines,
    openEditModal,
    saveEditCard,
    openExtractModal,
    updateExtCounts,
    renderExtCandidates,
    toggleAllExtChecks,
    commitExtractedWords,
    updateFSRSOptimizerUI,
    updateSmartNotifyUI,
    requestSmartNotifyPermission,
    openStarterPackModal,
    installStarterPackFromModal,
    openAnkiImportModal,
    handleAnkiFileSelect,
    previewAnkiImport,
    executeAnkiImport
  };
})(typeof window !== 'undefined' ? window : globalThis);
