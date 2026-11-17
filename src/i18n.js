/**
 * Vocab Vault — Modular Internationalization & Lazy Locale Engine (src/i18n.js)
 * Core bundle ships ja + en; additional 8 locales load lazily from dist/chunks/i18n-<lang>.js.
 */
import jaDict from './data/i18n/ja.js';
import enDict from './data/i18n/en.js';
import { loadChunkScript, loadChunkSyncIfJsc } from './chunk_loader.js';

const global = typeof window !== 'undefined' ? window : globalThis;
/** @param {string} id @returns {any} */
const $id = id => (typeof document !== 'undefined' ? document.getElementById(id) : null);
const STORAGE_KEY = 'vv_ui_locale';
const SUPPORTED_LOCALES = ['en', 'ja', 'fr', 'de', 'es', 'it', 'pt', 'nl', 'zh', 'ko'];
const TRANSLATIONS = {
  ja: jaDict,
  en: enDict
};

global.__VV_REG_LOCALE__ = function registerLocaleChunk(loc, dict) {
  if (loc && dict && typeof dict === 'object') {
    TRANSLATIONS[loc] = dict;
  }
};

function ensureLocaleSyncIfJsc(loc) {
  if (!loc || TRANSLATIONS[loc] || !SUPPORTED_LOCALES.includes(loc)) return false;
  return loadChunkSyncIfJsc('dist/chunks/i18n-' + loc + '.js');
}

async function ensureLocale(loc) {
  if (!loc || !SUPPORTED_LOCALES.includes(loc)) return false;
  if (TRANSLATIONS[loc]) return true;
  if (ensureLocaleSyncIfJsc(loc) && TRANSLATIONS[loc]) return true;
  await loadChunkScript('dist/chunks/i18n-' + loc + '.js');
  return Boolean(TRANSLATIONS[loc]);
}

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
    '論理・討論': 'cat.logic',
    '論理・政策': 'cat.logic',
    '論理・環境': 'cat.logic',
    '論理・科学': 'cat.logic',
    'その他': 'cat.general',
    '英検準1級': 'cat.exam'
  };

  const CATEGORY_PART_MAP = {
    '哲学': 'Philosophy',
    '思想': 'Thought',
    '宗教': 'Religion',
    '心理': 'Psychology',
    '精神': 'Psychiatry',
    '科学': 'Science',
    '技術': 'Technology',
    '政治': 'Politics',
    '法学': 'Law',
    '法律': 'Law',
    '司法': 'Judiciary',
    '実務': 'Practice',
    '経済': 'Economy',
    'ビジネス': 'Business',
    '文学': 'Literature',
    '芸術': 'Arts',
    '日常': 'Daily',
    '一般': 'General',
    'その他': 'General',
    '論理': 'Logic',
    '討論': 'Debate',
    '政策': 'Policy',
    '環境': 'Environment',
    '歴史': 'History',
    '文化': 'Culture',
    '社会': 'Society',
    '医療': 'Medicine',
    '健康': 'Health',
    '教育': 'Education',
    '言語': 'Language',
    '認知': 'Cognition',
    '認識': 'Epistemology',
    '制度': 'Institutions',
    '財務': 'Finance',
    '会計': 'Accounting',
    '監査': 'Audit',
    '契約': 'Contract',
    '人権': 'Human Rights',
    '批評': 'Criticism'
  };

  const CATEGORY_PART_LOC = {
    ko: {
      '哲学': '철학', '思想': '사상', '宗教': '종교', '心理': '심리', '精神': '정신',
      '科学': '과학', '技術': '기술', '政治': '정치', '法学': '법학', '法律': '법률',
      '司法': '사법', '実務': '실무', '経済': '경제', 'ビジネス': '비즈니스', '文学': '문학',
      '芸術': '예술', '日常': '일상', '一般': '일반', 'その他': '기타', '論理': '논리',
      '討論': '토론', '政策': '정책', '環境': '환경', '歴史': '역사', '文化': '문화',
      '社会': '사회', '医療': '의료', '健康': '건강', '教育': '교육', '言語': '언어',
      '認知': '인지', '認識': '인식', '制度': '제도', '財務': '재무', '会計': '회계',
      '監査': '감사', '契約': '계약', '人権': '인권', '批評': '비평'
    },
    zh: {
      '哲学': '哲学', '思想': '思想', '宗教': '宗教', '心理': '心理', '精神': '精神',
      '科学': '科学', '技術': '技术', '政治': '政治', '法学': '法学', '法律': '法律',
      '司法': '司法', '実務': '实务', '経済': '经济', 'ビジネス': '商务', '文学': '文学',
      '芸術': '艺术', '日常': '日常', '一般': '一般', 'その他': '其他', '論理': '逻辑',
      '討論': '讨论', '政策': '政策', '環境': '环境', '歴史': '历史', '文化': '文化',
      '社会': '社会', '医療': '医疗', '健康': '健康', '教育': '教育', '言語': '语言',
      '認知': '认知', '認識': '认识', '制度': '制度', '財務': '财务', '会計': '会计',
      '監査': '审计', '契約': '契约', '人権': '人权', '批評': '批评'
    }
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
      if (navLang.startsWith('fr')) return 'fr';
      if (navLang.startsWith('de')) return 'de';
      if (navLang.startsWith('es')) return 'es';
      if (navLang.startsWith('it')) return 'it';
      if (navLang.startsWith('pt')) return 'pt';
      if (navLang.startsWith('nl')) return 'nl';
      if (navLang.startsWith('zh')) return 'zh';
      if (navLang.startsWith('ko')) return 'ko';
    }
    return 'en'; // デフォルトは世界展開を見据えて英語
  }

  let currentLocale = detectInitialLocale();

  /**
   * 翻訳文字列の取得（パラメータ展開 {key} およびフォールバック対応）
   * @param {string} key
   * @param {string | Record<string, any>} [paramsOrFallback]
   * @param {string | null} [targetLocale]
   * @param {string} [explicitFallback]
   * @returns {string}
   */
  function t(key, paramsOrFallback = '', targetLocale = null, explicitFallback = '') {
    let fallback = typeof explicitFallback === 'string' ? explicitFallback : '';
    let params = null;
    if (typeof paramsOrFallback === 'object' && paramsOrFallback !== null) {
      params = paramsOrFallback;
    } else if (typeof paramsOrFallback === 'string') {
      fallback = paramsOrFallback;
    }
    let resolvedLocale = null;
    if (typeof targetLocale === 'string') {
      if (SUPPORTED_LOCALES.includes(targetLocale)) {
        resolvedLocale = targetLocale;
      } else if (!fallback) {
        fallback = targetLocale;
      }
    }
    const loc = resolvedLocale || currentLocale;
    ensureLocaleSyncIfJsc(loc);
    const dict = TRANSLATIONS[loc] || TRANSLATIONS.en;
    const hasOwn = (obj, k) => Boolean(obj && Object.prototype.hasOwnProperty.call(obj, k) && typeof obj[k] === 'string');
    let str = hasOwn(dict, key) ? dict[key] : (hasOwn(TRANSLATIONS.en, key) ? TRANSLATIONS.en[key] : (fallback || key));
    if (params && typeof str === 'string') {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      }
    }
    return str;
  }

  /**
   * ロケール切り替え
   */
  function setLocale(newLocale) {
    if (!SUPPORTED_LOCALES.includes(newLocale)) return Promise.resolve(false);
    currentLocale = newLocale;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newLocale);
    }
    ensureLocaleSyncIfJsc(newLocale);
    applyI18nToDOM();
    const emit = () => {
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('vocab-locale-changed', { detail: { locale: newLocale } }));
        } catch (e) {}
      }
    };
    emit();
    if (!TRANSLATIONS[newLocale]) {
      return ensureLocale(newLocale).then(loaded => {
        if (loaded && currentLocale === newLocale) {
          applyI18nToDOM();
          emit();
        }
        return loaded;
      }).catch(() => false);
    }
    return Promise.resolve(true);
  }

  /**
   * 現在のロケール取得
   */
  function getLocale() {
    return currentLocale;
  }

  /**
   * カテゴリ文字列の多言語翻訳（複合カテゴリの自動分解・他言語フォールバック対応）
   */
  function translateCategory(rawCat, targetLocale = null) {
    if (!rawCat) return t('cat.general', 'General', targetLocale);
    const loc = (targetLocale && SUPPORTED_LOCALES.includes(targetLocale)) ? targetLocale : currentLocale;
    if (loc === 'ja') return rawCat;

    const key = CATEGORY_MAP[rawCat];
    if (key) {
      const translated = t(key, '', loc);
      if (translated && translated !== key) return translated;
    }

    // 複合カテゴリの分解翻訳 (例: '論理・討論' -> 'Logic & Debate' / '논리·토론')
    const partDict = CATEGORY_PART_LOC[loc] || CATEGORY_PART_MAP;
    const partSep = (loc === 'ko' || loc === 'zh') ? '·' : ' & ';
    if (rawCat.includes('・')) {
      const parts = rawCat.split('・').map(p => partDict[p.trim()] || CATEGORY_PART_MAP[p.trim()] || p.trim());
      if (parts.length > 0 && !/[\u3040-\u30ff]/.test(parts.join(''))) {
        return parts.join(partSep);
      }
    } else if (partDict[rawCat] || CATEGORY_PART_MAP[rawCat]) {
      return partDict[rawCat] || CATEGORY_PART_MAP[rawCat];
    }

    // 目標言語が非日本語の場合、未翻訳の日本語文字列の露出を防止
    if (/[\u3040-\u30ff]/.test(rawCat)) {
      return t('cat.general', 'General', loc);
    }
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
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('vocab-billing-interval-changed', {
          detail: { interval: currentBillingInterval }
        }));
      } catch (e) {}
    }
  }

  /**
   * 通貨表示フォーマッタ
   */
  function getPlanPriceInfo(interval = currentBillingInterval) {
    ensureLocaleSyncIfJsc(currentLocale);
    if (!TRANSLATIONS[currentLocale] && typeof document !== 'undefined' && document.head?.appendChild) {
      ensureLocale(currentLocale).then(ok => { if (ok) applyI18nToDOM(); }).catch(() => {});
    }
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
    ensureLocaleSyncIfJsc(currentLocale);
    if (!TRANSLATIONS[currentLocale] && typeof document !== 'undefined' && document.head?.appendChild) {
      ensureLocale(currentLocale).then(ok => { if (ok) applyI18nToDOM(); }).catch(() => {});
    }
    const isEn = currentLocale !== 'ja';
    const p = getPlanPriceInfo(currentBillingInterval);

    // 1. Settings モーダルのタブ切り替え
    const setMonthBtn = $id('settingsBillingMonthlyBtn');
    const setYearBtn = $id('settingsBillingAnnualBtn');
    if (setMonthBtn && setYearBtn) {
      setMonthBtn.className = isYear ? 'btn-xs btn-o' : 'btn-xs active';
      setYearBtn.className = isYear ? 'btn-xs active' : 'btn-xs btn-o';
    }

    // 2. Upsell モーダルのタブ切り替え
    const upMonthBtn = $id('upsellBillingMonthlyBtn');
    const upYearBtn = $id('upsellBillingAnnualBtn');
    if (upMonthBtn && upYearBtn) {
      upMonthBtn.className = isYear ? 'btn-xs btn-o' : 'btn-xs active';
      upYearBtn.className = isYear ? 'btn-xs active' : 'btn-xs btn-o';
    }

    // 3. Settings Pro価格テキスト
    const setProPrice = $id('settingsProPriceText');
    if (setProPrice) {
      if (isEn) {
        global.VocabDOM?.setSafeHtml(setProPrice, isYear
          ? '$39.00 <small>/ yr ($3.25/mo, 2 months free)</small>'
          : '$3.99 <small>/ mo ($39.00/yr)</small>');
      } else {
        global.VocabDOM?.setSafeHtml(setProPrice, isYear
          ? '¥4,800 <small>/ 年 (月換算 ¥400・2ヶ月無料)</small>'
          : '¥480 <small>/ 月 (年額 ¥4,800)</small>');
      }
    }

    // 4. Settings Proアップグレードボタン
    const btnUpgradePro = $id('btnUpgradePro');
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
    const upsellPriceText = $id('upsellPriceText');
    if (upsellPriceText) {
      if (isEn) {
        global.VocabDOM?.setSafeHtml(upsellPriceText, isYear
          ? '$39.00 <span style="font-size:13px;font-weight:normal;color:var(--s)">/ yr ($3.25/mo)</span>'
          : '$3.99 <span style="font-size:13px;font-weight:normal;color:var(--s)">/ mo</span>');
      } else {
        global.VocabDOM?.setSafeHtml(upsellPriceText, isYear
          ? '¥4,800 <span style="font-size:13px;font-weight:normal;color:var(--s)">/ 年 (税込・月換算¥400)</span>'
          : '¥480 <span style="font-size:13px;font-weight:normal;color:var(--s)">/ 月 (税込)</span>');
      }
    }

    // 6. Upsell モーダルボタン
    const btnUpsellUpgrade = $id('btnUpsellUpgrade');
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
   * 設定モーダルの網羅的翻訳パス（動的ノード・フォールバック対応）
   */
  function translateSettingsModal(isEn) {
    if (typeof document === 'undefined') return;

    // 1. モーダルタイトル
    const titleEl = $id('cfgModalTitle');
    if (titleEl) titleEl.textContent = t('settings.modal_title');

    // 2. 言語セレクタ & バッジ同期
    const uiLanguageSel = $id('uiLanguageSel');
    if (uiLanguageSel && uiLanguageSel.value !== currentLocale) {
      uiLanguageSel.value = currentLocale;
    }
    const uiLangBadge = $id('uiLangBadge');
    if (uiLangBadge) {
      const badgeNames = {
        en: 'Global (EN)',
        ja: '日本語 (JA)',
        fr: 'Français (FR)',
        de: 'Deutsch (DE)',
        es: 'Español (ES)',
        it: 'Italiano (IT)',
        pt: 'Português (PT)',
        nl: 'Nederlands (NL)',
        zh: '中文 (ZH)',
        ko: '한국어 (KO)'
      };
      uiLangBadge.textContent = badgeNames[currentLocale] || 'Global';
    }

    // 3. 音声設定チェックボックス
    const chkAutoSpeak = $id('chkAutoSpeak');
    if (chkAutoSpeak && chkAutoSpeak.parentElement && chkAutoSpeak.parentElement.childNodes) {
      try {
        const parent = chkAutoSpeak.parentElement;
        const nodes = Array.from(parent.childNodes || []);
        const textNode = nodes.find(n => n && (n.nodeType === 3 || (typeof Node !== 'undefined' && n.nodeType === Node.TEXT_NODE)));
        if (textNode) {
          textNode.nodeValue = t('settings.auto_speak');
        }
      } catch (e) {}
    }

    // 4. 音声速度セレクタ
    const ttsRateSel = $id('ttsRateSel');
    if (ttsRateSel && ttsRateSel.options) {
      try {
        Array.from(ttsRateSel.options).forEach(opt => {
          if (!opt) return;
          if (opt.value === '0.85') opt.textContent = t('settings.tts_rate_slow');
          else if (opt.value === '0.95') opt.textContent = t('settings.tts_rate_natural');
          else if (opt.value === '1.05') opt.textContent = t('settings.tts_rate_fast');
        });
      } catch (e) {}
    }

    // 5. アカウント認証フォームプレースホルダー & ボタン
    const sbEmailInput = $id('sbEmailInput');
    if (sbEmailInput) sbEmailInput.placeholder = t('settings.email_ph');
    const sbPassInput = $id('sbPassInput');
    if (sbPassInput) sbPassInput.placeholder = t('settings.pass_ph');
    const sbUrlInput = $id('sbUrlInput');
    if (sbUrlInput) sbUrlInput.placeholder = t('settings.supabase_url_ph');
    const sbAnonInput = $id('sbAnonInput');
    if (sbAnonInput) sbAnonInput.placeholder = t('settings.supabase_anon_ph');

    const sbAuthFormRow = $id('sbAuthFormRow');
    if (sbAuthFormRow && sbAuthFormRow.querySelectorAll) {
      try {
        const btns = sbAuthFormRow.querySelectorAll('button');
        if (btns && btns.length >= 2) {
          if (btns[0]) btns[0].textContent = t('settings.login_btn');
          if (btns[1]) btns[1].textContent = t('settings.signup_btn');
        }
      } catch (e) {}
    }

    // 6. バッジ類
    const sbStatusBadge = $id('sbStatusBadge');
    if (sbStatusBadge) {
      const ready = Boolean(global.VocabSync?.isCloudReady?.());
      if (ready) {
        sbStatusBadge.textContent = global.VocabCore?.App?.isPro
          ? t('settings.logged_in_pro')
          : t('settings.logged_in_free');
      } else {
        sbStatusBadge.textContent = t('settings.not_logged_in');
      }
    }
    const curPlanBadge = $id('curPlanBadge');
    if (curPlanBadge) {
      const cur = curPlanBadge.textContent || '';
      if (cur.includes('Developer') || cur.includes('開発者') || cur.includes('Développeur') || cur.includes('Entwickler') || cur.includes('Desarrollador') || cur.includes('Sviluppatore') || cur.includes('Desenvolvedor') || cur.includes('Ontwikkelaar')) {
        curPlanBadge.textContent = t('settings.dev_badge');
      } else if (cur.includes('Free') || cur.includes('フリー') || cur.includes('Gratuit') || cur.includes('Kostenlos') || cur.includes('Gratuito') || cur.includes('Gratis') || cur.includes('免费') || cur.includes('무료')) {
        curPlanBadge.textContent = t('settings.free_plan');
      } else if (cur.includes('Pro') || cur.includes('专业版')) {
        curPlanBadge.textContent = t('settings.pro_plan');
      }
    }
    const devEditionNotice = $id('devEditionNotice');
    if (devEditionNotice) {
      devEditionNotice.textContent = t('settings.dev_notice');
    }
    const isStandalone = (typeof window !== 'undefined') && (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator?.standalone === true
    );
    const pwaStatusBadge = $id('pwaStatusBadge');
    if (pwaStatusBadge) {
      pwaStatusBadge.textContent = isStandalone ? t('settings.pwa_running') : t('settings.pwa_badge');
    }
    const btnPwaInstall = $id('btnPwaInstall');
    if (btnPwaInstall) {
      if (isStandalone) {
        btnPwaInstall.textContent = t('settings.pwa_installed_btn');
        btnPwaInstall.disabled = true;
      } else {
        global.VocabDOM?.setSafeHtml(btnPwaInstall, `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg><span data-i18n="settings.pwa_install_btn">${t('settings.pwa_install_btn')}</span>`);
        btnPwaInstall.disabled = false;
      }
    }
    const metricsEfficiencyBadge = $id('metricsEfficiencyBadge');
    if (metricsEfficiencyBadge) metricsEfficiencyBadge.textContent = t('settings.metrics_badge_cache');
    const apiBadge = $id('apiBadge');
    if (apiBadge) {
      if (global.updKeyUI) {
        try { global.updKeyUI(); } catch (e) { apiBadge.textContent = t('settings.ai_engine_badge'); }
      } else {
        apiBadge.textContent = t('settings.ai_engine_badge');
      }
    }
    const storageBadge = $id('storageBadge');
    if (storageBadge) {
      if (global.updateStorageStatusUI) {
        try { global.updateStorageStatusUI(); } catch (e) { storageBadge.textContent = t('settings.storage_badge'); }
      } else {
        storageBadge.textContent = t('settings.storage_badge');
      }
    }
    const fsrsOptBadge = $id('fsrsOptBadge');
    if (fsrsOptBadge) {
      if (global.VocabModal?.updateFSRSOptimizerUI) {
        try { global.VocabModal.updateFSRSOptimizerUI(); } catch (e) { fsrsOptBadge.textContent = t('settings.fsrs_badge'); }
      } else {
        fsrsOptBadge.textContent = t('settings.fsrs_badge');
      }
    }
    const smartNotifyBadge = $id('smartNotifyBadge');
    if (smartNotifyBadge) {
      if (global.VocabModal?.updateSmartNotifyUI) {
        try { global.VocabModal.updateSmartNotifyUI(); } catch (e) { smartNotifyBadge.textContent = t('settings.notify_badge'); }
      } else {
        smartNotifyBadge.textContent = t('settings.notify_badge');
      }
    }
    if (global.updCloudUI) {
      try { global.updCloudUI(); } catch (e) {}
    }

    // 7. 復習上限セレクタ
    const selDailyCap = $id('selDailyCap');
    if (selDailyCap && selDailyCap.options) {
      try {
        Array.from(selDailyCap.options).forEach(opt => {
          if (!opt) return;
          if (opt.value === '20') opt.textContent = t('settings.cap_opt_20');
          else if (opt.value === '30') opt.textContent = t('settings.cap_opt_30');
          else if (opt.value === '50') opt.textContent = t('settings.cap_opt_50');
          else if (opt.value === '99999') opt.textContent = t('settings.cap_opt_unlimited');
        });
      } catch (e) {}
    }

    // 8. クォータ説明文
    const sbQuotaText = $id('sbQuotaText');
    if (sbQuotaText) {
      sbQuotaText.textContent = t('settings.quota_desc');
    }

    // 9. 課金切り替えタブの年払い無料バッジ
    const settingsBillingAnnualBtn = $id('settingsBillingAnnualBtn');
    if (settingsBillingAnnualBtn) {
      const annualLabels = {
        ja: '年払い <span style="color:var(--ok);font-size:10px">(2ヶ月無料)</span>',
        fr: 'Annuel <span style="color:var(--ok);font-size:10px">(-17%)</span>',
        de: 'Jährlich <span style="color:var(--ok);font-size:10px">(17% sparen)</span>',
        es: 'Anual <span style="color:var(--ok);font-size:10px">(Ahorre 17%)</span>',
        it: 'Annuale <span style="color:var(--ok);font-size:10px">(Risparmia 17%)</span>',
        pt: 'Anual <span style="color:var(--ok);font-size:10px">(Economize 17%)</span>',
        nl: 'Jaarlijks <span style="color:var(--ok);font-size:10px">(17% korting)</span>',
        zh: '年付 <span style="color:var(--ok);font-size:10px">(立省17%)</span>',
        ko: '연간 결제 <span style="color:var(--ok);font-size:10px">(17% 할인)</span>'
      };
      global.VocabDOM?.setSafeHtml(settingsBillingAnnualBtn, annualLabels[currentLocale] || 'Annual <span style="color:var(--ok);font-size:10px">(Save 17%)</span>');
    }
  }

  /**
   * メインUI・ツールバーの網羅的翻訳パス
   */
  function translateMainUI(isEn) {
    if (typeof document === 'undefined') return;

    const langLabelsEn = {
      en: 'English (EN)',
      fr: 'French (FR)',
      de: 'German (DE)',
      es: 'Spanish (ES)',
      it: 'Italian (IT)',
      pt: 'Portuguese (PT)',
      nl: 'Dutch (NL)',
      zh: 'Chinese (ZH)',
      ko: 'Korean (KO)',
      ja: 'Japanese (JA)'
    };
    const langLabelsJa = {
      en: '英語 (EN)',
      fr: '仏語 (FR)',
      de: '独語 (DE)',
      es: '西語 (ES)',
      it: '伊語 (IT)',
      pt: '葡語 (PT)',
      nl: '蘭語 (NL)',
      zh: '中国語 (ZH)',
      ko: '韓国語 (KO)',
      ja: '日本語 (JA)'
    };

    const langLabelsKo = {
      en: '영어 (EN)',
      fr: '프랑스어 (FR)',
      de: '독일어 (DE)',
      es: '스페인어 (ES)',
      it: '이탈리아어 (IT)',
      pt: '포르투갈어 (PT)',
      nl: '네덜란드어 (NL)',
      zh: '중국어 (ZH)',
      ko: '한국어 (KO)',
      ja: '일본어 (JA)'
    };
    const langLabelsZh = {
      en: '英语 (EN)',
      fr: '法语 (FR)',
      de: '德语 (DE)',
      es: '西班牙语 (ES)',
      it: '意大利语 (IT)',
      pt: '葡萄牙语 (PT)',
      nl: '荷兰语 (NL)',
      zh: '中文 (ZH)',
      ko: '韩语 (KO)',
      ja: '日语 (JA)'
    };
    const activeLangLabels = currentLocale === 'ja' ? langLabelsJa : (currentLocale === 'ko' ? langLabelsKo : (currentLocale === 'zh' ? langLabelsZh : langLabelsEn));

    // 1. 言語ペアセレクタの表示ラベル
    const srcLangSel = $id('srcLangSel');
    if (srcLangSel && srcLangSel.options) {
      try {
        Array.from(srcLangSel.options).forEach(opt => {
          if (!opt) return;
          const lbl = activeLangLabels[opt.value];
          if (lbl) opt.textContent = lbl;
        });
      } catch (e) {}
    }
    const tgtLangSel = $id('tgtLangSel');
    if (tgtLangSel && tgtLangSel.options) {
      try {
        Array.from(tgtLangSel.options).forEach(opt => {
          if (!opt) return;
          const lbl = activeLangLabels[opt.value];
          if (lbl) opt.textContent = lbl;
        });
      } catch (e) {}
    }

    // 2. ソート順セレクタ
    const sortSel = $id('sortSel');
    if (sortSel && sortSel.options) {
      try {
        Array.from(sortSel.options).forEach(opt => {
          if (!opt) return;
          if (opt.value === 'new') opt.textContent = t('nav.sort_new', 'Sort: Newest');
          else if (opt.value === 'old') opt.textContent = t('nav.sort_old', 'Sort: Oldest (#1~)');
          else if (opt.value === 'due') opt.textContent = t('nav.sort_due', 'Sort: Due for Review');
          else if (opt.value === 'alpha') opt.textContent = t('nav.sort_alpha', 'Sort: Alphabetical');
        });
      } catch (e) {}
    }

    // 3. グラフ内言語フィルタセレクタ
    const graphFilterEn = {
      all: 'All Languages',
      en: 'English Only',
      fr: 'French Only',
      de: 'German Only',
      es: 'Spanish Only',
      it: 'Italian Only',
      pt: 'Portuguese Only',
      nl: 'Dutch Only',
      zh: 'Chinese Only',
      ko: 'Korean Only',
      ja: 'Japanese Only'
    };
    const graphFilterJa = {
      all: '全言語',
      en: '英語のみ',
      fr: '仏語のみ',
      de: '独語のみ',
      es: '西語のみ',
      it: '伊語のみ',
      pt: '葡語のみ',
      nl: '蘭語のみ',
      zh: '中国語のみ',
      ko: '韓国語のみ',
      ja: '日本語のみ'
    };
    const graphFilterKo = {
      all: '전체 언어',
      en: '영어만',
      fr: '프랑스어만',
      de: '독일어만',
      es: '스페인어만',
      it: '이탈리아어만',
      pt: '포르투갈어만',
      nl: '네덜란드어만',
      zh: '중국어만',
      ko: '한국어만',
      ja: '일본어만'
    };
    const activeGraphFilter = currentLocale === 'ja' ? graphFilterJa : (currentLocale === 'ko' ? graphFilterKo : graphFilterEn);
    const graphLangFilterSel = $id('graphLangFilterSel');
    if (graphLangFilterSel && graphLangFilterSel.options) {
      try {
        Array.from(graphLangFilterSel.options).forEach(opt => {
          if (!opt) return;
          const lbl = activeGraphFilter[opt.value];
          if (lbl) opt.textContent = lbl;
        });
      } catch (e) {}
    }

    // 4. 単語編集モーダルの語源確実性セレクタ
    const editConf = $id('editConf');
    if (editConf && editConf.options) {
      try {
        Array.from(editConf.options).forEach(opt => {
          if (!opt) return;
          const k = 'edit.conf_' + (opt.value || 'none');
          const trans = t(k);
          if (trans) opt.textContent = trans;
        });
      } catch (e) {}
    }

    // 5. フィードバックモーダルのセレクタ
    const fbCategory = $id('fbCategory');
    if (fbCategory && fbCategory.options) {
      try {
        Array.from(fbCategory.options).forEach(opt => {
          if (!opt) return;
          const k = 'fb.opt_' + opt.value;
          const trans = t(k);
          if (trans) opt.textContent = trans;
        });
      } catch (e) {}
    }
    const fbWtp = $id('fbWtp');
    if (fbWtp && fbWtp.options) {
      try {
        Array.from(fbWtp.options).forEach(opt => {
          if (!opt) return;
          const k = 'fb.wtp_' + (opt.value ? opt.value.replace('sub_', '') : 'none');
          const trans = t(k);
          if (trans) opt.textContent = trans;
        });
      } catch (e) {}
    }

    // 6. 長文抽出モーダルの最大抽出数セレクタ & 対象レベルセレクタ
    const extMaxCnt = $id('extMaxCnt');
    if (extMaxCnt && extMaxCnt.options) {
      try {
        Array.from(extMaxCnt.options).forEach(opt => {
          if (!opt) return;
          opt.textContent = t('ext.max_option', { n: opt.value }) || (isEn ? `Max ${opt.value} words` : `最大 ${opt.value} 語`);
        });
      } catch (e) {}
    }
    if (global.VocabModal?.refreshExtractLevelOptions) {
      try { global.VocabModal.refreshExtractLevelOptions(); } catch (e) {}
    } else if (global.refreshExtractLevelOptions) {
      try { global.refreshExtractLevelOptions(); } catch (e) {}
    }

    // 7. 言語ペアタブおよびサイドバーの再描画
    if (global.VocabSearch?.renderPairFileTabs) {
      try { global.VocabSearch.renderPairFileTabs(); } catch (e) {}
    }
    if (global.VocabSearch?.renderSidebarTree) {
      try { global.VocabSearch.renderSidebarTree(); } catch (e) {}
    }

    // 8. クラウドUI・キーUI・統計情報の再描画
    if (global.VocabEvents?.updCloudUI) {
      try { global.VocabEvents.updCloudUI(); } catch (e) {}
    } else if (global.updCloudUI) {
      try { global.updCloudUI(); } catch (e) {}
    }
    if (global.updKeyUI) {
      try { global.updKeyUI(); } catch (e) {}
    }
    if (global.updStats) {
      try { global.updStats(); } catch (e) {}
    }
    if (global.VocabModal?.updateFSRSOptimizerUI) {
      try { global.VocabModal.updateFSRSOptimizerUI(); } catch (e) {}
    }
    if (global.VocabModal?.updateSmartNotifyUI) {
      try { global.VocabModal.updateSmartNotifyUI(); } catch (e) {}
    }

    // 9. アナリティクス・ダッシュボードの動的再描画（モーダルが開いている時のみ実行）
    const analyticsModal = $id('analyticsModal');
    const analyticsBody = $id('analyticsDashboardBody');
    const isModalOpen = analyticsModal && (
      (typeof analyticsModal.classList?.contains === 'function' && analyticsModal.classList.contains('active')) ||
      analyticsModal.style?.display === 'flex' ||
      analyticsModal.style?.display === 'block'
    );
    if (analyticsBody && isModalOpen && global.VocabAnkiView?.renderAnalyticsDashboard) {
      try { global.VocabAnkiView.renderAnalyticsDashboard('analyticsDashboardBody'); } catch (e) {}
    }
  }

  /**
   * DOM 一括翻訳バインディング
   */
  function applyI18nToDOM(root) {
    if (typeof document === 'undefined') return;

    ensureLocaleSyncIfJsc(currentLocale);
    if (!TRANSLATIONS[currentLocale] && typeof document !== 'undefined' && document.head?.appendChild) {
      ensureLocale(currentLocale).then(ok => { if (ok) applyI18nToDOM(); }).catch(() => {});
    }
    const isEn = currentLocale !== 'ja';
    if (document.documentElement) {
      document.documentElement.lang = currentLocale;
    }

    const scope = (root && typeof root.querySelectorAll === 'function') ? root : document;
    if (!scope || typeof scope.querySelectorAll !== 'function') return;

    // テキスト置換 [data-i18n]
    scope.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        const trans = t(key);
        if (typeof trans === 'string' && trans !== key) el.textContent = trans;
      }
    });

    // ツールチップ置換 [data-i18n-title]
    scope.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key) {
        const trans = t(key);
        if (trans) el.setAttribute('title', trans);
      }
    });

    // プレースホルダー置換 [data-i18n-ph]
    scope.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const key = el.getAttribute('data-i18n-ph');
      if (key) {
        const trans = t(key);
        if (trans) el.setAttribute('placeholder', trans);
      }
    });

    // 画像 alt 置換 [data-i18n-alt]
    scope.querySelectorAll('[data-i18n-alt]').forEach(el => {
      const key = el.getAttribute('data-i18n-alt');
      if (key) {
        const trans = t(key);
        if (trans) el.setAttribute('alt', trans);
      }
    });

    // HTML置換 [data-i18n-html]
    scope.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      if (key) {
        const trans = t(key);
        if (trans) global.VocabDOM?.setSafeHtml(el, trans);
      }
    });

    // root が明示的に指定されている場合はサブツリーの部分翻訳なので、グローバルUI全件の再帰的再翻訳はスキップ
    if (root && root !== document && root !== document.body) {
      return;
    }

    // 言語セレクタがある場合の同期
    const langSel = $id('uiLanguageSel');
    if (langSel) langSel.value = currentLocale;

    // 設定モーダル & メインUIの詳細翻訳パス
    translateSettingsModal(isEn);
    translateMainUI(isEn);

    // 価格表示の同期
    updatePricingUI();
  }

  // 初期化時に DOM 読み込み完了後に適用
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading' && typeof document.addEventListener === 'function') {
      document.addEventListener('DOMContentLoaded', applyI18nToDOM);
    } else if (typeof setTimeout === 'function') {
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
    SUPPORTED_LOCALES,
    TRANSLATIONS
  };

  // 互換短縮エイリアス
  global.t = t;

global.VocabI18n.ensureLocale = ensureLocale;
export const VocabI18n = global.VocabI18n;
export default VocabI18n;
