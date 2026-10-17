/**
 * Vocab Vault — Lightweight Internationalization & Localization Engine (js/i18n.js)
 * Zero-dependency, instantaneous locale switching for global SaaS expansion.
 * Auto-detects browser locale (default English for global, Japanese for ja-*)
 */
(function(global) {
  'use strict';

  const STORAGE_KEY = 'vv_ui_locale';
  const SUPPORTED_LOCALES = ['en', 'ja'];

  // 多言語対照辞書 (Translation Lexicon)
  const TRANSLATIONS = {
    ja: {
      // 共通・ナビゲーション
      'app.title': 'Vocab Vault',
      'app.tagline': '語源と概念史で深く刻む、知的探求者のためのボキャブラリー・ヴォールト',
      'nav.explore': '探す',
      'nav.list': '一覧',
      'nav.extract': '抽出',
      'nav.review': '復習',
      'nav.analytics': '分析',
      'nav.mask': '赤シート',
      'side.explorer': 'エクスプローラ・検索',
      'nav.all_words': 'すべての単語',
      'nav.anki': 'Anki 復習',
      'nav.graph': '語根ネットワーク',
      'nav.settings': '設定',
      'nav.add_word': '単語を追加',
      'nav.search_ph': '検索: 単語, 意味, *語根, #品詞, @カテゴリ, ?条件...',
      'nav.sync_cloud': 'クラウド同期',
      'nav.syncing': '同期中...',
      'nav.synced': '同期完了',
      'nav.offline': 'オフライン',
      'nav.ear_learning': '耳学',
      'nav.ear_learning_title': '表示中の単語を音声で自動連続再生 (L)',
      'nav.mode_academic': '学術・詳細',
      'nav.mode_simple': 'シンプル',
      'nav.sort_new': '並び順: 新しい順',
      'nav.sort_old': '並び順: 古い順 (#1〜)',
      'nav.sort_due': '並び順: 復習期日が近い順',
      'nav.sort_alpha': '並び順: アルファベット順',

      // Anki 復習
      'anki.recog': '認識',
      'anki.cloze': '産出 (Cloze)',
      'anki.recog_title': '単語から意味を想起 (M)',
      'anki.cloze_title': '例文穴埋めから単語を想起 (M)',
      'anki.undo': '元に戻す (Z)',
      'anki.show_ans': '解答を表示 (Space)',
      'anki.again': 'もう一度 (1)',
      'anki.hard': '難しい (2)',
      'anki.good': '覚えた (3)',
      'anki.easy': '簡単 (4)',
      'anki.offline_badge': '未同期の復習',
      'anki.context_title': '出会った文脈 (Episode Context)',
      'anki.swipe_left': '← 左スワイプ: もう一度',
      'anki.swipe_right': '右スワイプ: 覚えた →',
      'anki.empty_title': '本日の復習はすべて完了しました！',
      'anki.empty_desc': '新しい単語を登録するか、スターターパックを取り込んで語彙ネットワークを広げましょう。',

      // グラフビュー
      'graph.title': '語根・語源ネットワーク',
      'graph.tab_network': 'ネットワーク',
      'graph.tab_tree': '系統樹ツリー',
      'graph.tab_mindmap': 'マインドマップ',
      'graph.tab_matrix': '接頭辞×語根',
      'graph.eiken_btn': 'スキルツリー',
      'graph.watering_btn': '水やり復習',
      'graph.mask_btn_off': '赤シート:OFF',
      'graph.mask_btn_on': '赤シート:ON',
      'graph.cluster_btn': '星団のみ',
      'graph.color_btn': '言語色',
      'graph.physics_stop': '停止',
      'graph.physics_run': '稼働',
      'graph.fit_btn': '全体表示',
      'graph.save_img': '画像保存',
      'graph.filter_ph': '語根・単語で検索...',
      'graph.all_lang': '全言語',
      'graph.en_only': '英語のみ',
      'graph.fr_only': '仏語のみ',
      'graph.de_only': '独語のみ',
      'graph.ja_only': '日本語のみ',
      'graph.root_jump_default': '主要語根へ飛ぶ...',
      'graph.all_roots': '全語根一覧',
      'graph.unlock_eiken': 'この系統樹を一括習得',

      // 設定・プラン
      'settings.title': '設定 & アカウント',
      'settings.lang_heading': '表示言語 (Language)',
      'settings.lang_desc': 'UIおよびメニューの表示言語を選択します。',
      'settings.theme_heading': '外観 (Appearance)',
      'settings.theme_dark': 'ダークモード',
      'settings.theme_light': 'ライトモード',
      'settings.plan_heading': 'プラン & サブスクリプション (Stripe決済)',
      'settings.free_plan': 'Free プラン',
      'settings.pro_plan': 'Pro プラン',
      'settings.current_plan': '現在のプラン',
      'settings.recommended': 'おすすめ',
      'settings.plan_monthly': '月払い',
      'settings.plan_annual': '年払い (2ヶ月分無料)',
      'settings.price_free': '¥0 / 月',
      'settings.price_pro_monthly': '¥480 / 月',
      'settings.price_pro_annual': '¥4,800 / 年 (月換算 ¥400)',
      'settings.upgrade_btn': 'Pro プランにアップグレード',
      'settings.portal_btn': '契約・請求管理 (Stripeポータル)',
      'settings.login_google': 'Google でログイン / アカウント作成',
      'settings.login_email': 'メールアドレスでログイン',
      'settings.logout': 'ログアウト',
      'settings.adv_title': '上級者向け: 独自のSupabaseサーバー（セルフホスト）を使用する場合',

      // カテゴリ
      'cat.philosophy': '哲学・思想',
      'cat.psychology': '心理・精神',
      'cat.science': '科学・技術',
      'cat.politics': '政治・法学',
      'cat.business': '実務・経済',
      'cat.arts': '文学・芸術',
      'cat.daily': '日常・一般',
      'cat.general': '一般・その他',

      // アップセルモーダル
      'upsell.title': '語彙の限界を突破する — Vocab Vault Pro',
      'upsell.subtitle': '単なる暗記帳を卒業し、学術論文読解・英語での発信を自在にする深層学習環境へ。',
      'upsell.feat_ai': 'AI新規生成・概念史深掘り（無制限）',
      'upsell.feat_cache': '共有辞書キャッシュ・2,000語カタログ（無制限）',
      'upsell.feat_sync': '複数端末クラウド自動差分同期（リアルタイム）',
      'upsell.feat_ocr': '長文・画像OCR抽出（無制限）',
      'upsell.feat_analytics': 'FSRS-4.5 パーソナライズ忘却曲線オプティマイザ',
      'upsell.save_badge': '年払いで2ヶ月分無料！',
      'upsell.upgrade_now': '今すぐProプランで始める',
      'upsell.skip': '今は見送る',

      // トースト・通知
      'toast.saved': '保存しました',
      'toast.sync_success': 'クラウドとの差分同期が完了しました',
      'toast.unlocked': 'スキルを習得して単語帳に追加しました',
      'toast.eiken_all_unlocked': '語根の語彙スキルを一括習得しました'
    },

    en: {
      // Common & Navigation
      'app.title': 'Vocab Vault',
      'app.tagline': 'Deep PIE Etymology & Conceptual History for Intellectual Learners',
      'nav.explore': 'Explore',
      'nav.list': 'List',
      'nav.extract': 'Extract',
      'nav.review': 'Review',
      'nav.analytics': 'Analytics',
      'nav.mask': 'Mask',
      'side.explorer': 'Explorer & Search',
      'nav.all_words': 'All Words',
      'nav.anki': 'Anki Review',
      'nav.graph': 'Root Network',
      'nav.settings': 'Settings',
      'nav.add_word': 'Add Word',
      'nav.search_ph': 'Search: word, meaning, *root, #pos, @category, ?filter...',
      'nav.sync_cloud': 'Cloud Sync',
      'nav.syncing': 'Syncing...',
      'nav.synced': 'Synced',
      'nav.offline': 'Offline',
      'nav.ear_learning': 'Audio Loop',
      'nav.ear_learning_title': 'Play words & examples automatically in background loop (L)',
      'nav.mode_academic': 'Academic',
      'nav.mode_simple': 'Simple',
      'nav.sort_new': 'Sort: Newest',
      'nav.sort_old': 'Sort: Oldest (#1~)',
      'nav.sort_due': 'Sort: Due for Review',
      'nav.sort_alpha': 'Sort: Alphabetical',

      // Anki Review
      'anki.recog': 'Recognition',
      'anki.cloze': 'Production (Cloze)',
      'anki.recog_title': 'Recall meaning from word (M)',
      'anki.cloze_title': 'Fill in the blank from context (M)',
      'anki.undo': 'Undo (Z)',
      'anki.show_ans': 'Show Answer (Space)',
      'anki.again': 'Again (1)',
      'anki.hard': 'Hard (2)',
      'anki.good': 'Good (3)',
      'anki.easy': 'Easy (4)',
      'anki.offline_badge': 'Unsynced reviews',
      'anki.context_title': 'Encountered Context (Episode Memory)',
      'anki.swipe_left': '← Swipe Left: Again',
      'anki.swipe_right': 'Swipe Right: Good →',
      'anki.empty_title': 'All reviews completed for today!',
      'anki.empty_desc': 'Add new words or install a starter pack to expand your root network.',

      // Graph View
      'graph.title': 'Root & Etymology Network',
      'graph.tab_network': 'Network',
      'graph.tab_tree': 'Lineage Tree',
      'graph.tab_mindmap': 'Mindmap',
      'graph.tab_matrix': 'Prefix x Root',
      'graph.eiken_btn': 'Top Roots Catalog',
      'graph.watering_btn': 'Targeted Review',
      'graph.mask_btn_off': 'Mask: OFF',
      'graph.mask_btn_on': 'Mask: ON',
      'graph.cluster_btn': 'Clusters Only',
      'graph.color_btn': 'Lang Color',
      'graph.physics_stop': 'Pause',
      'graph.physics_run': 'Run',
      'graph.fit_btn': 'Fit View',
      'graph.save_img': 'Export PNG',
      'graph.filter_ph': 'Filter roots or words...',
      'graph.all_lang': 'All Languages',
      'graph.en_only': 'English Only',
      'graph.fr_only': 'French Only',
      'graph.de_only': 'German Only',
      'graph.ja_only': 'Japanese Only',
      'graph.root_jump_default': 'Jump to Root...',
      'graph.all_roots': 'All Roots Directory',
      'graph.unlock_eiken': 'Learn All Branch Skills',

      // Settings & Plans
      'settings.title': 'Settings & Account',
      'settings.lang_heading': 'Interface Language',
      'settings.lang_desc': 'Choose the display language for UI controls and menus.',
      'settings.theme_heading': 'Appearance',
      'settings.theme_dark': 'Dark Mode',
      'settings.theme_light': 'Light Mode',
      'settings.plan_heading': 'Subscription & Plans (Stripe)',
      'settings.free_plan': 'Free Tier',
      'settings.pro_plan': 'Pro Plan',
      'settings.current_plan': 'Current Plan',
      'settings.recommended': 'Recommended',
      'settings.plan_monthly': 'Monthly',
      'settings.plan_annual': 'Annual (Save 17% / 2 Months Free)',
      'settings.price_free': '$0 / mo',
      'settings.price_pro_monthly': '$3.99 / mo',
      'settings.price_pro_annual': '$39.00 / yr ($3.25 / mo)',
      'settings.upgrade_btn': 'Upgrade to Pro Plan',
      'settings.portal_btn': 'Billing & Invoices (Stripe Portal)',
      'settings.login_google': 'Continue with Google',
      'settings.login_email': 'Sign in with Email',
      'settings.logout': 'Sign Out',
      'settings.adv_title': 'Advanced: Custom Self-Hosted Supabase Endpoint',

      // Categories
      'cat.philosophy': 'Philosophy & Thought',
      'cat.psychology': 'Psychology & Mind',
      'cat.science': 'Science & Tech',
      'cat.politics': 'Politics & Law',
      'cat.business': 'Business & Economics',
      'cat.arts': 'Literature & Arts',
      'cat.daily': 'Daily & General',
      'cat.general': 'General',

      // Upsell Modal
      'upsell.title': 'Transcend Rote Memorization with Vocab Vault Pro',
      'upsell.subtitle': 'Unlock infinite generative PIE root grounding, real-time cross-device sync, and adaptive FSRS retention.',
      'upsell.feat_ai': 'Unlimited AI Deep Conceptual History & Etymology',
      'upsell.feat_cache': 'Unlimited Shared Cache & 2,000 Academic Words Catalog',
      'upsell.feat_sync': 'Real-time Cross-device Cloud Diff Sync',
      'upsell.feat_ocr': 'Unlimited Article & Camera OCR Extraction',
      'upsell.feat_analytics': 'Personalized FSRS-4.5 Retention Optimizer',
      'upsell.save_badge': 'Save 17% with Annual Billing!',
      'upsell.upgrade_now': 'Start Pro Plan Now',
      'upsell.skip': 'Maybe Later',

      // Toasts
      'toast.saved': 'Saved successfully',
      'toast.sync_success': 'Cloud differential sync completed',
      'toast.unlocked': 'Skill learned and added to vocabulary',
      'toast.eiken_all_unlocked': 'All branch skills for this root learned'
    }
  };

  /**
   * カテゴリ多言語マッピング辞書
   */
  const CATEGORY_MAP = {
    '哲学・思想': 'cat.philosophy',
    '哲学・宗教': 'cat.philosophy',
    '心理・精神': 'cat.psychology',
    '心理学・精神': 'cat.psychology',
    '科学・技術': 'cat.science',
    '科学・テクノロジー': 'cat.science',
    '政治・法学': 'cat.politics',
    '政治・国際関係': 'cat.politics',
    '実務・経済': 'cat.business',
    '経済・ビジネス': 'cat.business',
    '文学・芸術': 'cat.arts',
    '日常・一般': 'cat.daily',
    '一般・その他': 'cat.general',
    '英検準1級': '英検準1級'
  };

  /**
   * 初期ロケールの決定
   */
  function detectInitialLocale() {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED_LOCALES.includes(saved)) return saved;
    }
    if (typeof navigator !== 'undefined') {
      const navLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
      if (navLang.startsWith('ja')) return 'ja';
    }
    return 'en'; // デフォルトは世界展開を見据えて英語
  }

  let currentLocale = detectInitialLocale();

  /**
   * 翻訳文字列の取得
   */
  function t(key, fallback = '') {
    const dict = TRANSLATIONS[currentLocale] || TRANSLATIONS.en;
    if (dict && dict[key]) return dict[key];
    const fallbackDict = TRANSLATIONS.en;
    if (fallbackDict && fallbackDict[key]) return fallbackDict[key];
    return fallback || key;
  }

  /**
   * ロケール切り替え
   */
  function setLocale(newLocale) {
    if (!SUPPORTED_LOCALES.includes(newLocale)) return;
    currentLocale = newLocale;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newLocale);
    }
    applyI18nToDOM();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vocab-locale-changed', { detail: { locale: newLocale } }));
    }
  }

  /**
   * 現在のロケール取得
   */
  function getLocale() {
    return currentLocale;
  }

  /**
   * カテゴリ文字列の多言語翻訳
   */
  function translateCategory(rawCat) {
    if (!rawCat) return t('cat.general');
    const key = CATEGORY_MAP[rawCat];
    if (key) return t(key);
    return rawCat;
  }

  let currentBillingInterval = 'month';

  /**
   * 課金サイクルの取得
   */
  function getBillingInterval() {
    return currentBillingInterval;
  }

  /**
   * 課金サイクルの設定とUI連動
   */
  function setBillingInterval(interval) {
    currentBillingInterval = interval === 'year' ? 'year' : 'month';
    updatePricingUI();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vocab-billing-interval-changed', {
        detail: { interval: currentBillingInterval }
      }));
    }
  }

  /**
   * 通貨表示フォーマッタ
   */
  function getPlanPriceInfo(interval = currentBillingInterval) {
    const isEn = currentLocale !== 'ja';
    const isYear = interval === 'year';
    if (isEn) {
      return {
        currency: 'usd',
        symbol: '$',
        priceMonthly: '$3.99',
        priceAnnual: '$39.00',
        priceAnnualPerMonth: '$3.25',
        intervalText: isYear ? '/ yr' : '/ mo',
        currentDisplay: isYear ? '$39.00' : '$3.99',
        perMonthDisplay: isYear ? '$3.25/mo' : '$3.99/mo',
        saveText: 'Save 17% (2 Months Free)'
      };
    } else {
      return {
        currency: 'jpy',
        symbol: '¥',
        priceMonthly: '¥480',
        priceAnnual: '¥4,800',
        priceAnnualPerMonth: '¥400',
        intervalText: isYear ? '/ 年' : '/ 月',
        currentDisplay: isYear ? '¥4,800' : '¥480',
        perMonthDisplay: isYear ? '月換算 ¥400' : '¥480/月',
        saveText: '年払いで2ヶ月分無料'
      };
    }
  }

  /**
   * 価格表示UIの同期
   */
  function updatePricingUI() {
    if (typeof document === 'undefined') return;

    const isYear = currentBillingInterval === 'year';
    const isEn = currentLocale !== 'ja';
    const p = getPlanPriceInfo(currentBillingInterval);

    // 1. Settings モーダルのタブ切り替え
    const setMonthBtn = document.getElementById('settingsBillingMonthlyBtn');
    const setYearBtn = document.getElementById('settingsBillingAnnualBtn');
    if (setMonthBtn && setYearBtn) {
      setMonthBtn.className = isYear ? 'btn-xs btn-o' : 'btn-xs active';
      setYearBtn.className = isYear ? 'btn-xs active' : 'btn-xs btn-o';
    }

    // 2. Upsell モーダルのタブ切り替え
    const upMonthBtn = document.getElementById('upsellBillingMonthlyBtn');
    const upYearBtn = document.getElementById('upsellBillingAnnualBtn');
    if (upMonthBtn && upYearBtn) {
      upMonthBtn.className = isYear ? 'btn-xs btn-o' : 'btn-xs active';
      upYearBtn.className = isYear ? 'btn-xs active' : 'btn-xs btn-o';
    }

    // 3. Settings Pro価格テキスト
    const setProPrice = document.getElementById('settingsProPriceText');
    if (setProPrice) {
      if (isEn) {
        setProPrice.innerHTML = isYear
          ? '$39.00 <small>/ yr ($3.25/mo, 2 months free)</small>'
          : '$3.99 <small>/ mo ($39.00/yr)</small>';
      } else {
        setProPrice.innerHTML = isYear
          ? '¥4,800 <small>/ 年 (月換算 ¥400・2ヶ月無料)</small>'
          : '¥480 <small>/ 月 (年額 ¥4,800)</small>';
      }
    }

    // 4. Settings Proアップグレードボタン
    const btnUpgradePro = document.getElementById('btnUpgradePro');
    if (btnUpgradePro && !btnUpgradePro.disabled) {
      if (isEn) {
        btnUpgradePro.textContent = isYear
          ? 'Upgrade to Pro ($39.00 / yr)'
          : 'Upgrade to Pro ($3.99 / mo)';
      } else {
        btnUpgradePro.textContent = isYear
          ? 'Proにアップグレード (¥4,800/年)'
          : 'Proにアップグレード (¥480/月)';
      }
    }

    // 5. Upsell モーダル価格表示
    const upsellPriceText = document.getElementById('upsellPriceText');
    if (upsellPriceText) {
      if (isEn) {
        upsellPriceText.innerHTML = isYear
          ? '$39.00 <span style="font-size:13px;font-weight:normal;color:var(--s)">/ yr ($3.25/mo)</span>'
          : '$3.99 <span style="font-size:13px;font-weight:normal;color:var(--s)">/ mo</span>';
      } else {
        upsellPriceText.innerHTML = isYear
          ? '¥4,800 <span style="font-size:13px;font-weight:normal;color:var(--s)">/ 年 (税込・月換算¥400)</span>'
          : '¥480 <span style="font-size:13px;font-weight:normal;color:var(--s)">/ 月 (税込)</span>';
      }
    }

    // 6. Upsell モーダルボタン
    const btnUpsellUpgrade = document.getElementById('btnUpsellUpgrade');
    if (btnUpsellUpgrade && !btnUpsellUpgrade.disabled) {
      if (isEn) {
        btnUpsellUpgrade.textContent = isYear
          ? 'Start Vocab Vault Pro ($39.00 / yr)'
          : 'Start Vocab Vault Pro ($3.99 / mo)';
      } else {
        btnUpsellUpgrade.textContent = isYear
          ? '今すぐProプランで始める (¥4,800/年)'
          : '今すぐProプランで始める (¥480/月)';
      }
    }
  }

  /**
   * DOM 一括翻訳バインディング
   */
  function applyI18nToDOM() {
    if (typeof document === 'undefined') return;

    // テキスト置換 [data-i18n]
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        const trans = t(key);
        if (trans) el.textContent = trans;
      }
    });

    // ツールチップ置換 [data-i18n-title]
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key) {
        const trans = t(key);
        if (trans) el.setAttribute('title', trans);
      }
    });

    // プレースホルダー置換 [data-i18n-ph]
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const key = el.getAttribute('data-i18n-ph');
      if (key) {
        const trans = t(key);
        if (trans) el.setAttribute('placeholder', trans);
      }
    });

    // 言語セレクタがある場合の同期
    const langSel = document.getElementById('uiLanguageSel');
    if (langSel) langSel.value = currentLocale;

    // 価格表示の同期
    updatePricingUI();
  }

  // 初期化時に DOM 読み込み完了後に適用
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyI18nToDOM);
    } else {
      setTimeout(applyI18nToDOM, 0);
    }
  }

  global.VocabI18n = {
    t,
    setLocale,
    getLocale,
    translateCategory,
    getBillingInterval,
    setBillingInterval,
    getPlanPriceInfo,
    updatePricingUI,
    applyI18nToDOM,
    TRANSLATIONS
  };

  // 互換短縮エイリアス
  global.t = t;

})(typeof window !== 'undefined' ? window : globalThis);
