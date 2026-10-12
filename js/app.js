/**
 * Vocab Vault — Main Application Module (js/app.js)
 */
(function (global) {
  'use strict';

  // --- 0. グローバル・エラー防壁 (Global Error Boundary & Crash Barrier) ---
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('error', function(event) {
      console.warn('[Global Error Boundary]', event.error || event.message);
      if (typeof showToast === 'function' && event.error?.message) {
        showToast(`軽微な例外を安全に処理しました: ${event.error.message.slice(0, 45)}`, 'info', 3000);
      }
    });
    window.addEventListener('unhandledrejection', function(event) {
      console.warn('[Global Unhandled Rejection]', event.reason);
      if (typeof showToast === 'function' && event.reason?.message) {
        showToast(`通信状態の警告: ${event.reason.message.slice(0, 45)}`, 'info', 3000);
      }
    });
  }

  const EMBEDDED_KEY = "";
  const PROMPT_VERSION = '2026-10-f';
  const WIKT_URL_RE = /^https:\/\/[a-z0-9-]+\.wiktionary\.org\/wiki\/[^\s"<>`'\\]+$/i;
  const $ = id => document.getElementById(id);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const cleanPho = p => String(p ?? '').replace(/^[\[/\s]+/, '').replace(/[\]/\s]+$/, '').trim();
  const fmtPho = p => { const c = cleanPho(p); return c ? `[ ${c} ]` : ''; };
  const foldAscii = s => String(s ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ß/g, 'ss');

  const FOLD_CHAR_MAP = global.VocabSearch?.FOLD_CHAR_MAP || {};
  const FOLD_DIGRAPH_MAP = global.VocabSearch?.FOLD_DIGRAPH_MAP || {};
  const tokenToFoldPattern = token => global.VocabSearch ? global.VocabSearch.tokenToFoldPattern(token) : token;
  const extractQueryTokens = q => global.VocabSearch ? global.VocabSearch.extractQueryTokens(q) : [];
  const buildFoldRegex = q => global.VocabSearch ? global.VocabSearch.buildFoldRegex(q) : null;

  // --- モーダル・トースト・法務ダイアログ制御（js/modal.js へ委譲） ---
  const toggleModal = (id, open) => global.VocabModal ? global.VocabModal.toggleModal(id, open) : undefined;
  const closeAllModals = () => global.VocabModal ? global.VocabModal.closeAllModals() : undefined;
  const showToast = (msg, type = 'info', duration = 4500) => global.VocabModal ? global.VocabModal.showToast(msg, type, duration) : undefined;
  const LEGAL_TEXTS = global.VocabModal?.LEGAL_TEXTS || {};
  const switchLegalTab = tab => global.VocabModal ? global.VocabModal.switchLegalTab(tab) : undefined;
  const openLegalModal = tab => global.VocabModal ? global.VocabModal.openLegalModal(tab) : undefined;

  function enhanceA11y(root = document) {
    if (!root?.querySelectorAll) return;
    root.querySelectorAll('[data-act]').forEach(el => {
      if (!el) return;
      const hasTab = typeof el.hasAttribute === 'function' ? el.hasAttribute('tabindex') : false;
      if (!['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(el.tagName) && !hasTab) {
        el.tabIndex = 0;
        if (typeof el.setAttribute === 'function') el.setAttribute('role', 'button');
      }
    });
  }

  function checkDevMasterMode() {
    // [セキュリティ強化] 本番環境でのURLパラメータやLocalStorageによる課金・クォータバイパスを完全根絶
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem('vv_dev_unlocked'); } catch {}
    }
    return false;
  }

  // --- 1. アプリケーション状態の一元管理 ---
  const App = {
    lang: 'en', srcLang: 'en', tgtLang: 'ja',
    statF: 'all', cat: 'all', posF: 'all', fol: 'all', sortBy: 'new',
    qStr: '', qReg: null, crossLang: false, entries: [], page: 1, per: 30, printAllMode: false,
    aList: [], ankiHistory: [], pendingJump: null, reqQueue: [], isProcessing: false,
    cachedModels: null, extCandidates: [],
    storageError: false, isComposing: false, searchDebounceTimer: null,
    syncTimer: null, isSyncing: false, quotaRemaining: null, deferredInstallPrompt: null,
    indexCache: new WeakMap(),
    rootIndexMap: new Map(),
    focusedCardIndex: -1,
    viewMode: (function() {
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 760;
      const saved = lsGet(isMobile ? 'vv_view_mode_mobile' : 'vv_view_mode', null);
      if (saved) return saved;
      return isMobile ? 'simple' : 'academic';
    })(),
    dailyReviewCap: parseInt(lsGet('vv_daily_review_cap', '30'), 10) || 30,
    isDev: checkDevMasterMode(),

    /** すべての絞り込みフィルタ・検索条件・言語横断フラグを一括リセットし、UIを完全同期 */
    resetFilters: function() {
      App.statF = App.cat = App.posF = App.fol = 'all';
      App.qStr = '';
      App.qReg = null;
      App.crossLang = false;
      $('xLangBtn')?.classList.remove('on');
      if ($('qSearch')) $('qSearch').value = '';
      if ($('qClear')) $('qClear').style.display = 'none';
      if ($('resetFiltBtn')) $('resetFiltBtn').style.display = 'none';
    },

    /** 現在有効なフィルタが存在するかどうかを判定 */
    hasActiveFilters: function() {
      return App.crossLang || App.statF !== 'all' || App.fol !== 'all' || App.cat !== 'all' || App.posF !== 'all' || Boolean(App.qStr);
    }
  };

  const PER_PAGE = 30;
  const mkLevels = (b1, b2, c1, acad) => [
    { id:'b1', label:`初中級 (${b1})`, prompt:`${b1}レベルの重要単語・熟語（基礎語は除外）` },
    { id:'b2', label:`中級 (${b2})`, prompt:`${b2}レベルの中上級単語・成句（平易な語は除外）` },
    { id:'c1', label:`上級 (${c1})`, prompt:`${c1}レベルの高度な語彙・文語表現` },
    { id:'acad', label:'学術・専門 (論文 / 概念史・法政・科学)', prompt:`${acad}で重要な学術語彙・専門用語・抽象概念語彙` },
    { id:'all_key', label:'重要語すべて (キーワード・多義語・熟語)', prompt:'文章の核となるキーワード、歴史・専門的ニュアンスを持つ多義語、重要熟語' }
  ];

  const LANGS = {
    en: { label:'English', wiktName:'English', ja:'英語', short:'英語', badge:'English (英語)', key:'distinction_entries', snap:'vocab_snapshot_en', tomb:'vv_tombstones_en', clearKey:'vv_cleared_at_en', posHint:'', gramHint:'不規則複数形や不規則動詞活用がある場合のみ記載(例: "went, gone" / 無ければ空文字"")', levels:mkLevels('CEFR B1 / 英検2級 / TOEIC 500-650','CEFR B2 / 英検準1級 / TOEIC 700-850','CEFR C1 / 英検1級 / TOEFL 100+','英語の学術論文・GRE・専門書（法政・哲学・歴史・科学等）') },
    fr: { label:'Français', wiktName:'French', ja:'フランス語', short:'仏語', badge:'Français (仏語)', key:'distinction_entries_fr', snap:'vocab_snapshot_fr', tomb:'vv_tombstones_fr', clearKey:'vv_cleared_at_fr', posHint:'（仏語名詞は N[m], N[f], N[pl] を使用）', gramHint:'名詞は冠詞(エリジオン含む)・複数形(例: "l\'arbre, pl. -s")、有音のhは"*h aspiré"、不規則動詞は主要活用', levels:mkLevels('DELF A2-B1 / 仏検3〜2級','DELF B2 / 仏検準1級','DALF C1-C2 / 仏検1級','仏語の学術論文・思想・歴史・法政分野') },
    de: { label:'Deutsch', wiktName:'German', ja:'ドイツ語', short:'独語', badge:'Deutsch (独語)', key:'distinction_entries_de', snap:'vocab_snapshot_de', tomb:'vv_tombstones_de', clearKey:'vv_cleared_at_de', posHint:'（独語名詞は N[m], N[f], N[n], N[pl]、再帰動詞は V[refl] を使用）', gramHint:'名詞は「定冠詞 語, 複数形」(例: "der Staat, -en")、動詞は三基本形(例: "spricht, sprach, hat gesprochen")', levels:mkLevels('Goethe A2-B1 / 独検3〜2級','Goethe B2 / 独検準1級','Goethe C1-C2 / 独検1級','独語の学術論文・哲学・概念史・法学・科学分野') },
    ja: { label:'日本語', wiktName:'Japanese', ja:'日本語', short:'日語', badge:'日本語 (Japanese)', key:'distinction_entries_ja', snap:'vocab_snapshot_ja', tomb:'vv_tombstones_ja', clearKey:'vv_cleared_at_ja', posHint:'（日本語名詞、動詞五段・一段・サ変等）', gramHint:'活用形、敬語、文語表現等があれば記載', levels:mkLevels('JLPT N3-N2 / 基礎・日常語','JLPT N2-N1 / 常用語・慣用句','JLPT N1超過 / 高度語彙・四字熟語','日本語の学術論文・近現代文学・法政・哲学・論説文') }
  };
  const LANG_KEYS = Object.keys(LANGS);
  const keyToLang = k => global.VocabStorage ? global.VocabStorage.keyToLang(k) : (LANG_KEYS.find(l => LANGS[l].key === k) || 'en');

  function getActivePairConfig() {
    return global.VocabStorage ? global.VocabStorage.getPairConfig(App.srcLang, App.tgtLang) : (LANGS[App.srcLang] || LANGS.en);
  }

  const CATS = ["政治・国際関係","歴史・考古学","言語・コミュニケーション","経済・金融","社会・移民","数学・統計","科学・テクノロジー","医療・健康","環境・自然・生物","芸術・文学・文化","法律・司法","教育・学校","心理学・精神","哲学・宗教","ビジネス・経営","IT・コンピューター","メディア・報道","スポーツ・エンタメ","交通・インフラ","地理・地学・宇宙","建築・都市計画","農業・食料・料理","日常生活・服飾","感情・性格","人間関係・家族","動作・行為","状態・性質","時間・空間・頻度","抽象概念・論理","その他"];
  const CAT_PROMPT_MAP = CATS.map((c, i) => `${i}:${c.split('・')[0]}`).join(',');
  const POS_ENUM = ["N[C]","N[U]","N[C/U]","N[pl]","N[m]","N[f]","N[n]","V[T]","V[I]","V[T/I]","V[refl]","Adj","Adv","Prep","Conj","Pron","Idiom","Phrasal V"];
  const POS_GROUPS = [{ id:'all', label:'すべての品詞' }, { id:'N', label:'名詞 (N)' }, { id:'V', label:'動詞 (V)' }, { id:'Adj', label:'形容詞 (Adj)' }, { id:'Adv', label:'副詞 (Adv)' }, { id:'Other', label:'熟語・その他' }];
  const STAT_GROUPS = [{ id:'all', label:'すべての単語' }, { id:'due', label:'復習期日のみ' }, { id:'flag', label:'要確認のみ' }, { id:'wikt', label:'Wiktionary裏付済' }];
  const ETY_CONF_ENUM = ["certain", "probable", "disputed", "unknown"];
  const ETY_CONF_LABELS = { certain:'確実', probable:'有力', disputed:'諸説', unknown:'語源不明' };

  const mkPosReg = (n, v, ex = '') => new RegExp(`^(N\\[(${n})\\]|V\\[(${v})\\]|Adj|Adv|Prep|Conj|Pron|Idiom${ex})$`);
  const POS_BY_LANG = {
    en: mkPosReg('C|U|C\\/U|pl', 'T|I|T\\/I', '|Phrasal V'),
    fr: mkPosReg('m|f|pl', 'T|I|T\\/I|refl'),
    de: mkPosReg('m|f|n|pl', 'T|I|T\\/I|refl'),
    ja: mkPosReg('C|U|C\\/U|pl', 'T|I|T\\/I', '')
  };
  const IPA_OK = /^[\p{L}\p{M}ˈˌːˑ.\-‿ ()/]+$/u;
  const WIKT_BAD_BRACKET = /^(?:transitive|intransitive|reflexive|countable|uncountable|obsolete|archaic|dated|rare|slang|figurative|literally|by extension|chiefly|uk|us|rp|general american|received pronunciation|\d+.*)$/i;
  const IPA_SPEC_CHAR = /[ˈˌːˑəɛɪʊɔæɑɒʌɜɝɐɨʉɯɤɵɶœçʝʃʒθðŋɲɳɴʎɾɽʁχħʕʔβɸɣxɥwɧʦʣʧʤ]/;
  const DE_SEP_PREFIXES = ['ab', 'an', 'auf', 'aus', 'bei', 'ein', 'fest', 'her', 'hin', 'los', 'mit', 'nach', 'statt', 'teil', 'um', 'vor', 'weg', 'weiter', 'zu', 'zurück', 'zusammen'];

  const S_STR = { type:"STRING" }, S_INT = { type:"INTEGER" }, S_POS = { type:"STRING", enum:POS_ENUM };
  const S_OBJ = (p, req = Object.keys(p)) => ({ type:"OBJECT", properties:p, required:req });
  const S_ARR = items => ({ type:"ARRAY", items });

  const RESPONSE_SCHEMA = S_ARR(S_OBJ({
    reqIndex: S_INT, reqWord: S_STR, word: S_STR, category: S_INT, phonetic: S_STR, grammar_forms: S_STR,
    etymologyConfidence: { type:"STRING", enum:ETY_CONF_ENUM }, etymology: S_STR, etymologyTags: S_ARR(S_STR),
    history_note: S_STR, core: S_STR, meanings: S_ARR(S_OBJ({ pos: S_POS, text: S_STR })),
    example: S_OBJ({ foreign: S_STR, ja: S_STR, used_form: S_STR }),
    phrases: S_ARR(S_OBJ({ foreign: S_STR, ja: S_STR })),
    derivatives: S_ARR(S_OBJ({ word: S_STR, phonetic: S_STR, pos: S_POS, meaning: S_STR, sub_phrase: S_STR, sub_trans: S_STR }))
  }));
  const EXTRACT_SCHEMA = S_ARR(S_OBJ({ word: S_STR, pos: S_STR, meaning: S_STR, sentence: S_STR }));

  function canGenerateWords() {
    return true; // 内部組み込みAIエンジン (オンデバイスAI / クラウド秘匿プロキシ / ビルトイン知識ベース) が常時有効
  }

  function getActiveEngineMode() {
    if (getKey()) return 'custom_byok';
    if (global.VocabSync?.isCloudReady?.()) return 'cloud_proxy';
    if (typeof window !== 'undefined' && (window.ai?.languageModel || window.model?.languageModel)) return 'on_device';
    return 'builtin_internal';
  }

  function lsGet(k, d = '') { return global.VocabStorage ? global.VocabStorage.lsGet(k, d) : (localStorage.getItem(k) ?? d); }
  function lsSet(k, v) { return global.VocabStorage ? global.VocabStorage.lsSet(k, v) : (localStorage.setItem(k, v), true); }

  function dlBlob(parts, type, name) {
    if (global.VocabExport && typeof global.VocabExport.dlBlob === 'function') {
      return global.VocabExport.dlBlob(parts, type, name);
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(parts, { type }));
    a.download = name;
    a.click();
    setTimeout(() => {
      try { URL.revokeObjectURL(a.href); } catch {}
    }, 1000);
  }

  // --- 2. ネイティブ音声合成 (js/speech.js へ分離・委譲) ---
  const SPK_SVG = global.VocabSpeech?.SPK_SVG || `<svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>`;
  const mkSpkBtn = (txt, l, sm = false) => global.VocabSpeech ? global.VocabSpeech.mkSpkBtn(txt, l, sm) : (txt ? `<button type="button" class="spk-btn ${sm ? 'sm' : ''}" data-act="speak" data-text="${esc(txt)}" data-lang="${esc(l)}" title="ネイティブ発音" aria-label="発音">${SPK_SVG}</button>` : '');

  function pickBestVoice(tLang) {
    if (global.VocabSpeech && typeof global.VocabSpeech.pickBestVoice === 'function') {
      return global.VocabSpeech.pickBestVoice(tLang);
    }
    return null;
  }

  function speakText(text, tLang = App.lang) {
    if (global.VocabSpeech && typeof global.VocabSpeech.speakText === 'function') {
      const rate = parseFloat(lsGet('vv_tts_rate', '0.95')) || 0.95;
      return global.VocabSpeech.speakText(text, tLang, rate);
    }
  }

  // --- 3. 語根正規化・形態素検証 (js/morphology.js へ分離・委譲) ---
  const ROOT_PREFIXES = global.VocabMorphology?.ROOT_PREFIXES || ['語根', '語幹', '印欧祖語', 'pie', 'ゲルマン祖語', '古高ドイツ語', '中高ドイツ語', '古フランス語', '接頭辞', '前綴り', '接尾辞', 'ラテン語', 'ギリシャ語', '古英語', '同族語', '由来', '借用', '語源'];
  const normRootKey = s => global.VocabMorphology ? global.VocabMorphology.normRootKey(s) : String(s ?? '').trim().toLowerCase();
  const matchRootInText = (tag, textFold) => global.VocabMorphology ? global.VocabMorphology.matchRootInText(tag, textFold) : false;
  const isValidRootForEntry = (rootKey, item) => global.VocabMorphology ? global.VocabMorphology.isValidRootForEntry(rootKey, item) : true;
  const checkWordInSentence = it => global.VocabMorphology ? global.VocabMorphology.checkWordInSentence(it) : true;
  const validateEntry = it => global.VocabMorphology ? global.VocabMorphology.validateEntry(it) : [];
  const parseInputWordSpec = rawStr => global.VocabMorphology ? global.VocabMorphology.parseInputWordSpec(rawStr) : { cleanWord: String(rawStr ?? '').trim(), homographIndex: 1, senseHint: '' };
  const makeWordKey = (word, lang = 'en', pos = '', homographIndex = 1) => global.VocabMorphology ? global.VocabMorphology.makeWordKey(word, lang, pos, homographIndex) : `${lang}:${word}`;
  const makeLookupKey = (word, lang = 'en', homographIndex = 1) => global.VocabMorphology ? global.VocabMorphology.makeLookupKey(word, lang, homographIndex) : word;

  const sanitizeWiktUrl = url => (typeof url === 'string' && WIKT_URL_RE.test(url.trim())) ? url.trim() : undefined;

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
        .filter(r => r && isValidRootForEntry(r, { word: w, etymology: raw.etymology || raw.e, example: ex })),
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
    const tombMap = ignoreTombstones ? new Map() : (customTombMap || (global.VocabStorage ? global.VocabStorage.getTombstones(l) : new Map()));
    const clearedAt = ignoreTombstones ? 0 : (customClearedAt !== null ? customClearedAt : (global.VocabStorage ? global.VocabStorage.getClearedAt(l) : 0));
    const byId = new Map(), wkToId = new Map();

    [arrA, arrB].forEach(list => (Array.isArray(list) ? list : []).forEach((raw, idx) => {
      const it = sanitizeItem(raw, idx, l);
      if (!it || (!ignoreTombstones && global.VocabStorage?.isTombstoned(it, tombMap, l, clearedAt))) return;
      const wk = it.wordKey || makeWordKey(it.word, l, it.meanings?.[0]?.pos, it.homographIndex);
      it.wordKey = wk;
      const existingId = byId.has(it.id) ? it.id : wkToId.get(wk);
      if (!existingId) {
        byId.set(it.id, it);
        wkToId.set(wk, it.id);
      } else {
        const ex = byId.get(existingId);
        // [P0-3 解決] カード情報・メタデータは updatedAt が新しい方を採用
        const itWins = (it.updatedAt || 0) >= (ex.updatedAt || 0);
        const win = itWins ? it : ex, lose = itWins ? ex : it;

        // [P0-3 解決] SM-2復習進捗（暗記データ）は reviewUpdatedAt が新しい方を独立して採用（Macでのフォルダ整理でスマホの復習が消えるのを防止）
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
        const targetLang = (typeof k === 'string' && k.length === 2 && LANGS[k]) ? k : (global.VocabStorage?.keyToLang ? global.VocabStorage.keyToLang(k) : defL);
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

  function notifyOtherTabs(keyOrLang) {
    if (global.VocabStorage?.state?.bc) {
      try { global.VocabStorage.state.bc.postMessage({ type: 'vault-updated', lang: keyOrLang, ts: Date.now() }); } catch {}
    }
  }

  function getJson(k) {
    const pair = global.VocabStorage?.keyToPair ? global.VocabStorage.keyToPair(k) : { srcLang: keyToLang(k), tgtLang: 'ja' };
    const l = pair.srcLang;
    const storageKey = k;
    if (global.VocabStorage && Array.isArray(global.VocabStorage.state.mem[storageKey])) return global.VocabStorage.state.mem[storageKey];
    const rawStr = lsGet(storageKey, '');
    const parsed = rawStr ? (safeParseWords(rawStr, l)[l] || []) : [];
    if (!parsed.length && rawStr.trim().length > 2) {
      if (global.VocabStorage) global.VocabStorage.state.loadFailed[storageKey] = true;
      updateStorageStatusUI('error', `${storageKey}のLSデータが破損しています。IDBからの自動復旧を待機中です`);
    }
    const merged = mergeWords(parsed, [], l, false);
    if (global.VocabStorage) global.VocabStorage.state.mem[storageKey] = merged;
    return merged;
  }

  function syncAnkiReferences(l, latestList) {
    if (!App.aList.length) return;
    const byId = new Map(latestList.map(x => [x.id, x]));
    App.aList = App.aList.map(item => ((item.lang || App.lang) === l && byId.has(item.id)) ? byId.get(item.id) : item);
  }

  function setJson(k, v, allowEmpty = false, force = false, skipCloudTrigger = false) {
    const storageKey = k;
    const pair = global.VocabStorage?.keyToPair ? global.VocabStorage.keyToPair(k) : { srcLang: keyToLang(k), tgtLang: 'ja' };
    const l = pair.srcLang;
    const prev = getJson(storageKey);
    if (global.VocabStorage?.state?.loadFailed[storageKey] && !force) {
      updateStorageStatusUI('error', '読込失敗中のため保存を停止しています');
      return;
    }
    const next = (Array.isArray(v) ? v : []).map((it, i) => sanitizeItem(it, i, l)).filter(Boolean);
    if (!allowEmpty && !next.length && prev.length) return;
    if (prev.length && prev.length > next.length && global.VocabStorage) global.VocabStorage.idbAddSnap(storageKey, prev);
    if (global.VocabStorage) global.VocabStorage.state.mem[storageKey] = next;
    const curPairKey = getActivePairConfig().key;
    if (storageKey === curPairKey || l === App.lang) App.entries = next;
    syncAnkiReferences(l, next);
    if (global.VocabStorage) global.VocabStorage.state.loadFailed[storageKey] = false;

    let lsOk = false;
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      lsOk = true;
      updateStorageStatusUI('ok');
    } catch {
      lsOk = false;
      if (global.VocabStorage) global.VocabStorage.state.idbOnlyMode = true;
    }

    if (global.VocabStorage) {
      global.VocabStorage.idbCommitLangData(storageKey, next, force).then(({ ok: idbOk, data: mergedData }) => {
        if (idbOk) {
          global.VocabStorage.state.mem[storageKey] = mergedData;
          if (storageKey === curPairKey || l === App.lang) App.entries = mergedData;
          syncAnkiReferences(l, mergedData);
          if (!lsOk) {
            global.VocabStorage.state.idbOnlyMode = true;
            try { localStorage.removeItem(storageKey); } catch {}
            updateStorageStatusUI('idb-only');
          }
          notifyOtherTabs(storageKey);
        } else if (!lsOk) {
          updateStorageStatusUI('error', 'ストレージへの書き込みに失敗しました。直ちにJSON保存を実行してください');
        } else {
          notifyOtherTabs(storageKey);
        }
        if (!skipCloudTrigger && global.VocabSync?.isCloudReady?.()) {
          scheduleBackgroundCloudSync();
        }
      });
    }
  }

  function updateStorageStatusUI(state = 'ok', msg = '') {
    const banner = $('storageWarnBanner'), badge = $('storageBadge'), dot = $('cfgDot');
    App.storageError = (state === 'error');
    if (banner) {
      if (state === 'error') {
        banner.className = 'storage-warn-banner show';
        banner.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:3px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>${esc(msg.slice(0, 32))}`;
        banner.title = msg;
      } else if (state === 'idb-only') {
        banner.className = 'storage-warn-banner info show';
        banner.textContent = 'IndexedDB大容量モード (5MB超)';
        banner.title = 'localStorageの5MB上限に達したため、IndexedDB主ストア専有モードで安全に保存されています。';
      } else {
        banner.className = 'storage-warn-banner';
      }
    }
    if (badge) {
      badge.textContent = state === 'error' ? '保存エラー(要確認)' : state === 'idb-only' ? 'IDB大容量モード(正常)' : '保存正常 (IDB+LS)';
      badge.className = `badge ${state === 'error' ? 'ng' : 'ok'}`;
    }
    if (dot) dot.classList.toggle('warn', App.storageError || !canGenerateWords());
  }

  // --- 4. 語源インデックス・ハイブリッド検索・ソート (js/search.js へ委譲) ---
  const extractEtyTags = it => global.VocabSearch ? global.VocabSearch.extractEtyTags(it) : [];
  const getMeta = it => global.VocabSearch ? global.VocabSearch.getMeta(it, App) : { tags: [], roots: new Set(), wordFold: '', blob: '', foldedBlob: '' };
  const buildEtyIndex = () => global.VocabSearch ? global.VocabSearch.buildEtyIndex(App) : undefined;
  const closeSidebar = () => global.VocabSearch ? global.VocabSearch.closeSidebar() : undefined;
  const toggleSidebar = force => global.VocabSearch ? global.VocabSearch.toggleSidebar(force) : undefined;
  const toggleSec = id => global.VocabSearch ? global.VocabSearch.toggleSec(id) : undefined;
  const toggleMask = () => global.VocabSearch ? global.VocabSearch.toggleMask() : undefined;

  function toggleCrossLang(v = null) {
    App.crossLang = typeof v === 'boolean' ? v : !App.crossLang;
    $('xLangBtn')?.classList.toggle('on', App.crossLang);
    App.page = 1;
    render();
  }

  function setSortOrder(val) {
    App.sortBy = val || 'new';
    lsSet('vv_sort_by', App.sortBy);
    App.page = 1;
    render();
  }

  const matchPos = (it, targetGroup) => global.VocabSearch ? global.VocabSearch.matchPos(it, targetGroup) : true;
  const matchStat = (it, targetStat, now = Date.now()) => global.VocabSearch ? global.VocabSearch.matchStat(it, targetStat, now) : true;
  const getPairShortLabel = (src, tgt) => global.VocabSearch ? global.VocabSearch.getPairShortLabel(src, tgt) : `${src}${tgt}`;
  const getPairFullLabel = (src, tgt) => global.VocabSearch ? global.VocabSearch.getPairFullLabel(src, tgt) : `${src} → ${tgt}`;
  const getActivePairFiles = () => global.VocabSearch ? global.VocabSearch.getActivePairFiles(App) : [];
  const renderPairFileTabs = () => global.VocabSearch ? global.VocabSearch.renderPairFileTabs(App) : undefined;
  const getAllKnownPairConfigs = () => global.VocabSearch ? global.VocabSearch.getAllKnownPairConfigs(App) : [];

  function setLanguagePair(src, tgt) {
    const s = String(src || 'en').toLowerCase();
    const t = String(tgt || 'ja').toLowerCase();
    const isLangChanged = (s !== App.srcLang || t !== App.tgtLang);

    App.srcLang = s;
    App.tgtLang = t;
    App.lang = s;

    lsSet('vv_src_lang', s);
    lsSet('vv_tgt_lang', t);
    lsSet('vv_active_lang', s);

    if (isLangChanged) {
      App.resetFilters();
    }

    if ($('srcLangSel') && $('srcLangSel').value !== s) $('srcLangSel').value = s;
    if ($('tgtLangSel') && $('tgtLangSel').value !== t) $('tgtLangSel').value = t;

    renderPairFileTabs();

    if ($('anki')?.style.display === 'block') exitAnki();
    if (window.innerWidth <= 768) closeSidebar();
    load(1);
  }

  function swapLanguagePair() {
    setLanguagePair(App.tgtLang, App.srcLang);
  }

  function onLanguagePairChange() {
    const s = $('srcLangSel')?.value || 'en';
    const t = $('tgtLangSel')?.value || 'ja';
    setLanguagePair(s, t);
  }

  function setFilter(type, val) {
    const cleanVal = String(val || 'all');
    if (type === 'lang') {
      setLanguagePair(cleanVal, App.tgtLang);
      App.crossLang = false;
      $('xLangBtn')?.classList.remove('on');
    } else if (type === 'stat') App.statF = cleanVal;
    else if (type === 'fol') App.fol = cleanVal;
    else if (type === 'pos') App.posF = cleanVal;
    else if (type === 'cat') App.cat = cleanVal;

    if ($('anki')?.style.display === 'block') exitAnki();
    if (window.innerWidth <= 768) closeSidebar();
    load(1);
  }

  function setSearch(val, scroll = false, xLang = null) {
    App.qStr = String(val || '').trim();
    if ($('qSearch') && $('qSearch').value !== App.qStr) $('qSearch').value = App.qStr;
    if ($('qClear')) $('qClear').style.display = App.qStr ? 'block' : 'none';
    if (typeof xLang === 'boolean') {
      App.crossLang = xLang;
      $('xLangBtn')?.classList.toggle('on', App.crossLang);
    }
    App.qReg = buildFoldRegex(App.qStr);
    App.page = 1;
    render();
    if (scroll) $('mainScroll')?.scrollTo?.({ top:0, behavior:'smooth' });
  }

  function resetAllFilters() {
    App.resetFilters();
    load(1);
  }

  const mkTreeItem = (t, id, l, c, cur) => global.VocabSearch ? global.VocabSearch.mkTreeItem(t, id, l, c, cur) : '';
  const renderSidebarTree = () => global.VocabSearch ? global.VocabSearch.renderSidebarTree(App) : undefined;
  const matchSingleQueryToken = (meta, tokObj) => global.VocabSearch ? global.VocabSearch.matchSingleQueryToken(meta, tokObj) : false;
  const getFiltered = () => global.VocabSearch ? global.VocabSearch.getFiltered(App) : (App.entries || []);

  // --- カード表示・DOM生成 (js/card_view.js へ委譲) ---
  function highlightPlain(raw, reg) {
    return global.VocabCardView ? global.VocabCardView.highlightPlain(raw, reg) : esc(String(raw ?? ''));
  }

  function hlText(str, allowBold = false) {
    return global.VocabCardView ? global.VocabCardView.hlText(str, allowBold, App.qReg) : esc(String(str ?? ''));
  }

  function formatMeaningAndEty(d) {
    return global.VocabCardView ? global.VocabCardView.formatMeaningAndEty(d) : { meanings: d.meanings || [], histDigest: '', compactEty: '', isLongEty: false };
  }

  function collectEtyPeers(d) {
    return global.VocabCardView ? global.VocabCardView.collectEtyPeers(d, App.rootIndexMap) : { chipItems: [], sameList: [], crossList: [] };
  }

  function buildRight(d) {
    return global.VocabCardView
      ? global.VocabCardView.buildRight(d, {
          rootIndexMap: App.rootIndexMap,
          queryReg: App.qReg,
          viewMode: App.viewMode,
          lang: App.lang
        })
      : '';
  }

  function createCardElement(i, opts = {}) {
    if (global.VocabCardView?.createCardElement) {
      return global.VocabCardView.createCardElement(i, {
        queryReg: App.qReg,
        lang: App.lang,
        crossLang: App.crossLang,
        rootIndexMap: App.rootIndexMap,
        viewMode: App.viewMode,
        ...opts
      });
    }
    // フェイルセーフ・フォールバック (モジュール未ロード時や環境エラー時にも単語を絶対表示)
    const iL = i.lang || opts.lang || App.lang || 'en';
    const c = document.createElement('div'), due = (i.nextReview || 0) <= Date.now();
    const lk = makeLookupKey(i.word, iL, i.homographIndex);
    c.className = 'card';
    c.dataset.word = lk;
    c.dataset.rawWord = i.word;
    c.dataset.lang = iL;
    const homoHtml = i.homographIndex > 1 ? `<span class="homo-badge">#${i.homographIndex}</span>` : '';
    const mText = (i.meanings || []).map(m => `<div class="pos-block"><span class="pos">${esc(m.pos)}</span><span>${esc(m.text)}</span></div>`).join('');
    c.innerHTML = `<div class="col-left"><div class="hw-wrap"><span class="id">#${i.num}</span>${homoHtml}<span class="hw">${esc(i.word)}</span></div></div><div class="right"><div class="m-line">${mText}</div></div>`;
    return c;
  }

  function setViewMode(mode) {
    App.viewMode = (mode === 'simple') ? 'simple' : 'academic';
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 760;
    lsSet(isMobile ? 'vv_view_mode_mobile' : 'vv_view_mode', App.viewMode);
    $('btnModeAcademic')?.classList.toggle('active', App.viewMode === 'academic');
    $('btnModeSimple')?.classList.toggle('active', App.viewMode === 'simple');
    render();
  }

  function loadStarterPack() {
    const starterItems = global.VocabStarterPack?.getStarterPack ? global.VocabStarterPack.getStarterPack(App.lang) : [];
    if (!starterItems.length) return;
    const pairCfg = getActivePairConfig();
    const cur = getJson(pairCfg.key);
    const existingWords = new Set(cur.map(x => makeLookupKey(x.word, x.lang || App.lang, x.homographIndex)));
    const toAdd = [];
    const now = Date.now();
    let maxNum = cur.reduce((m, x) => Math.max(m, Number(x.num) || 0), 0);

    starterItems.forEach(item => {
      const k = makeLookupKey(item.word, item.lang || App.lang, item.homographIndex || 1);
      if (!existingWords.has(k)) {
        maxNum++;
        const card = {
          ...item,
          num: maxNum,
          lang: item.lang || App.lang,
          folder: item.folder || 'スターターパック',
          interval: 0,
          repetition: 0,
          efactor: 2.5,
          nextReview: now,
          updatedAt: now,
          reviewUpdatedAt: now,
          isDeleted: false
        };
        toAdd.push(card);
        existingWords.add(k);
      }
    });

    if (!toAdd.length) {
      showToast('スターターパックの単語はすべて登録済みです。', 'info', 3000);
      return;
    }

    const merged = [...cur, ...toAdd];
    setJson(pairCfg.key, merged);
    load(1);
    showToast(`厳選スターターパック（${toAdd.length}語）を読み込みました！`, 'ok', 3500);
  }

  /**
   * 対象カード要素を画面中央にスムーズスクロールし、発光ハイライトを付与
   */
  function scrollToCard(el) {
    if (global.VocabCardView) return global.VocabCardView.scrollToCard(el, $('mainScroll'));
    el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }

  /**
   * DOM上のカード一覧から指定単語の要素を特定（キー・生単語・見出し語の多重照合）
   */
  function findCardElement(cards, targetWord, targetLk, baseTargetLk) {
    return global.VocabCardView ? global.VocabCardView.findCardElement(cards, targetWord, targetLk, baseTargetLk) : null;
  }

  function jumpToWord(w, tLang = App.lang) {
    if (global.VocabListView && typeof global.VocabListView.jumpToWord === 'function') {
      return global.VocabListView.jumpToWord(w, tLang, {
        appState: App,
        perPage: PER_PAGE,
        exitAnki,
        closeSidebar,
        parseInputWordSpec,
        lsSet,
        getActivePairKey: () => getActivePairConfig().key,
        getJson,
        getAllKnownPairs: getAllKnownPairConfigs,
        setSearch,
        getFiltered,
        onRender: () => {
          render();
          renderSidebarTree();
          renderPairFileTabs();
          updStats();
        }
      });
    }
  }

  function relTime(ts) {
    return global.VocabCardView ? global.VocabCardView.relTime(ts) : '';
  }

  // --- カード一覧描画・Keyed DOM Reconciliation (js/list_view.js へ分離・委譲) ---
  const listCtx = () => ({
    appState: App,
    perPage: PER_PAGE,
    getFiltered,
    posGroups: POS_GROUPS,
    statGroups: STAT_GROUPS,
    getActivePairKey: () => getActivePairConfig().key,
    getJson,
    buildEtyIndex,
    renderSidebarTree,
    updStats,
    createCardElement: (i, opts) => createCardElement(i, opts),
    enhanceA11y
  });

  function render() {
    if (global.VocabListView) return global.VocabListView.render(listCtx());
  }

  function load(p = 1) {
    if (global.VocabListView) return global.VocabListView.load(p, listCtx());
    App.page = p;
    render();
  }

  function hasActiveFilters() {
    return global.VocabListView ? global.VocabListView.hasActiveFilters(App) : false;
  }

  function resetFilters() {
    if (global.VocabListView) return global.VocabListView.resetFilters(App, () => render());
  }

  // --- 4.5. 内部組み込みAIエンジン (js/dictionary.js へ分離・委譲) ---
  const BUILTIN_ETYMOLOGY_KNOWLEDGE = global.VocabDictionary?.BUILTIN_ETYMOLOGY_KNOWLEDGE || { roots: {}, historical: {} };
  const callOnDeviceGeminiNano = (sys, promptText) => global.VocabDictionary ? global.VocabDictionary.callOnDeviceGeminiNano(sys, promptText) : null;
  const generateWithInternalAI = (payloadItems, sLang, tLang, fName, useHist, wiktMap) => global.VocabDictionary ? global.VocabDictionary.generateWithInternalAI(payloadItems, sLang, tLang, fName, useHist, wiktMap) : { items: [], usedModel: 'fallback' };

  // --- 5. Wiktionary API & Gemini API (js/dictionary.js へ分離・委譲) ---
  const getKey = () => String(EMBEDDED_KEY || lsGet('vv_gemini_api_key')).trim();
  const extractCleanIpa = section => global.VocabDictionary ? global.VocabDictionary.extractCleanIpa(section) : '';
  const extractWiktLangSection = (fullText, targetLang, host) => global.VocabDictionary ? global.VocabDictionary.extractWiktLangSection(fullText, targetLang, host) : null;
  const fetchWiktOne = (word, targetLang) => global.VocabDictionary ? global.VocabDictionary.fetchWiktOne(word, targetLang) : null;
  const verifyWiktGrounding = (item, wRef) => global.VocabDictionary ? global.VocabDictionary.verifyWiktGrounding(item, wRef) : false;
  const parseApiJson = r => global.VocabDictionary ? global.VocabDictionary.parseApiJson(r) : r.json();

  const toggleDarkMode = d => global.VocabModal ? global.VocabModal.toggleDarkMode(d) : undefined;

  async function promptAppInstall() {
    const isStandalone = (typeof window !== 'undefined') && (
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator?.standalone === true
    );
    if (isStandalone) {
      showToast('既に単体アプリウィンドウとして起動しています。', 'ok', 3500);
      return;
    }

    // 1. file:// プロトコルで開かれている場合の親切なハンドリング
    if (window.location.protocol === 'file:') {
      showToast('【Mac単体アプリ】Finderでフォルダ内の「Vocab Vault.app」または「Vocab Vault.command」をダブルクリックすると単体アプリとして起動できます！', 'ok', 6500);
      toggleModal('installGuideModal', true);
      return;
    }

    // 2. ブラウザのPWAインストールプロンプトが利用可能な場合
    if (App.deferredInstallPrompt) {
      try {
        App.deferredInstallPrompt.prompt();
        const { outcome } = await App.deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast('アプリをインストールしました。Dockやホーム画面から直接開けます。', 'ok', 4500);
          App.deferredInstallPrompt = null;
          if ($('ribInstallBtn')) $('ribInstallBtn').style.display = 'none';
        }
      } catch {
        toggleModal('installGuideModal', true);
      }
      return;
    }

    // 3. プロンプトがない環境（Mac Safari、iOS Safariなど）
    const isMac = navigator.platform?.toUpperCase().indexOf('MAC') >= 0 || navigator.userAgent?.includes('Mac');
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isMac && isSafari) {
      showToast('Mac Safari: 画面上のメニュー「ファイル」→「Dockに追加」を選ぶと単体Macアプリとして登録されます。', 'ok', 5500);
    } else {
      showToast('ブラウザのメニューまたはアドレスバー右端のインストールアイコンから単体アプリ化できます。', 'info', 4500);
    }
    toggleModal('installGuideModal', true);
  }

  const openUpsellModal = reason => global.VocabModal ? global.VocabModal.openUpsellModal(reason) : undefined;
  const openSettings = () => global.VocabModal ? global.VocabModal.openSettings() : undefined;

  function updKeyUI(ok = null) {
    const h = Boolean(getKey()), b = $('apiBadge');
    if ($('cfgDot')) $('cfgDot').classList.toggle('warn', App.storageError);
    if (b) {
      if (ok === false) {
        b.textContent = 'エラー';
        b.className = 'badge ng';
      } else if (h) {
        b.textContent = 'カスタムBYOK設定済';
        b.className = 'badge ok';
      } else {
        b.textContent = '内蔵AI稼働中 (完全機密保護)';
        b.className = 'badge ok';
      }
    }
  }

  // --- クラウドUI連携・アカウント制御 (js/events.js へ分離・委譲) ---
  const eventsCtx = () => ({
    appState: App,
    load,
    render,
    ankiCtx,
    delW,
    updateCardFocus,
    getFocusedCardItem,
    jumpToWord,
    setFilter,
    setLanguagePair,
    setSearch,
    openEditModal,
    openGraphModal,
    openSettings,
    openUpsellModal,
    canGenerateWords,
    getKey,
    getJson,
    setJson,
    getActivePairConfig,
    enqueueTask,
    getAppSyncHooks,
    syncFromIdbForLang,
    toggleMask,
    renderSidebarTree,
    showAns,
    procRev,
    undoAnkiRev,
    startAnki,
    exitAnki
  });

  function updCloudUI() {
    if (global.VocabEvents) return global.VocabEvents.updCloudUI(eventsCtx());
  }

  function toggleDevMasterMode() {
    showToast('本番環境では開発者マスターモードは無効化されています。', 'warn', 3000);
  }

  async function cloudLogin(isSignUp = false) {
    if (global.VocabEvents) return global.VocabEvents.cloudLogin(isSignUp, eventsCtx());
  }

  async function cloudLogout() {
    if (global.VocabEvents) return global.VocabEvents.cloudLogout(eventsCtx());
  }

  async function deleteAccountPermanently() {
    if (global.VocabEvents) return global.VocabEvents.deleteAccountPermanently(eventsCtx());
  }

  function getAppSyncHooks() {
    return {
      getLocalEntries: l => getJson(LANGS[l].key),
      getLocalTombMap: l => global.VocabStorage ? global.VocabStorage.getTombstones(l) : new Map(),
      getLocalClearedAt: l => global.VocabStorage ? global.VocabStorage.getClearedAt(l) : 0,
      mergeWords,
      isTombstoned: (it, m, l, c) => global.VocabStorage ? global.VocabStorage.isTombstoned(it, m, l, c) : false,
      makeWordKey,
      applyMergedLangState: (l, mergedEntries, mergedTombMap, mergedClearedAt) => {
        if (global.VocabStorage) {
          if (mergedClearedAt > global.VocabStorage.getClearedAt(l)) global.VocabStorage.saveClearedAt(l, mergedClearedAt);
          global.VocabStorage.saveTombstones(l, mergedTombMap);
        }
        setJson(LANGS[l].key, mergedEntries, true, true, true);
      }
    };
  }

  function scheduleBackgroundCloudSync() {
    if (!global.VocabSync?.isCloudReady?.()) return;
    clearTimeout(App.syncTimer);
    App.syncTimer = setTimeout(() => { syncCloudNow(false); }, 2500);
  }

  async function syncCloudNow(manual = false) {
    if (global.VocabEvents) return global.VocabEvents.syncCloudNow(manual, eventsCtx());
  }

  function updStats() {
    if ($('dataStatText')) $('dataStatText').textContent = `登録数: ${LANG_KEYS.map(l => `${LANGS[l].short}${getJson(LANGS[l].key).length}語`).join(' / ')}`;
    const lastBk = lsGet('vv_last_backup_at', '');
    if ($('lastBackupText')) $('lastBackupText').textContent = lastBk ? `最終JSONバックアップ: ${lastBk}` : '最終JSONバックアップ: 未実行（定期的なJSON保存を推奨）';
  }

  const saveKeyFromModal = () => global.VocabModal ? global.VocabModal.saveKeyFromModal() : undefined;

  const fetchModels = async key => {
    if (App.cachedModels?.length) return App.cachedModels;
    if (global.VocabDictionary && typeof global.VocabDictionary.fetchModels === 'function') {
      const valid = await global.VocabDictionary.fetchModels(key);
      App.cachedModels = valid;
      const sel = $('modelSel'), saved = lsGet('vv_gemini_model', 'auto');
      if (sel) {
        sel.innerHTML = '';
        sel.add(new Option(`自動（標準:${valid[0] || 'Flash'}）`, 'auto'));
        valid.forEach(m => { const o = new Option(m, m); if (m === saved) o.selected = true; sel.add(o); });
      }
      return valid;
    }
    return [];
  };

  const fetchWithTimeout = (url, options, timeoutMs = 45000) => global.VocabDictionary ? global.VocabDictionary.fetchWithTimeout(url, options, timeoutMs) : fetch(url, options);

  const callGemini = async (sys, parts, key, st, schema = RESPONSE_SCHEMA, deep = false) => {
    const sel = $('modelSel')?.value || 'auto';
    if (global.VocabDictionary && typeof global.VocabDictionary.callGemini === 'function') {
      return global.VocabDictionary.callGemini(sys, parts, key, st, schema, deep, sel);
    }
    throw new Error('VocabDictionary モジュールがロードされていません');
  };

  // --- OCR & 画像圧縮モジュール (js/ocr.js へ分離・委譲) ---
  const compressImage = (file, max) => global.VocabOCR ? global.VocabOCR.compressImage(file, max) : Promise.reject(new Error('OCRモジュール未ロード'));
  const clearOcrPreview = () => global.VocabOCR?.clearOcrPreview();
  const handleOcrImageFile = (file, label) => global.VocabOCR?.handleOcrImageFile(file, label);
  const saveOcrKeyAndExecute = () => global.VocabOCR?.saveOcrKeyAndExecute();
  const runOcrCurrentFile = () => global.VocabOCR?.runOcrCurrentFile();

  const openExtractModal = () => global.VocabModal ? global.VocabModal.openExtractModal() : undefined;

  async function runPassageExtract() {
    if (global.VocabOCR?.runPassageExtract) {
      return global.VocabOCR.runPassageExtract({
        appState: App,
        showToast,
        getKey,
        callGemini,
        getActivePairConfig,
        getJson,
        makeLookupKey
      });
    }
  }

  const updateExtCounts = () => global.VocabModal ? global.VocabModal.updateExtCounts() : undefined;
  const renderExtCandidates = () => global.VocabModal ? global.VocabModal.renderExtCandidates() : undefined;
  const toggleAllExtChecks = f => global.VocabModal ? global.VocabModal.toggleAllExtChecks(f) : undefined;
  const commitExtractedWords = () => global.VocabModal ? global.VocabModal.commitExtractedWords() : undefined;
  const parsePipeLines = (text, mapFn) => global.VocabModal ? global.VocabModal.parsePipeLines(text, mapFn) : [];
  const openEditModal = (idOrNum, tL = App.lang) => global.VocabModal ? global.VocabModal.openEditModal(idOrNum, tL) : undefined;
  const saveEditCard = () => global.VocabModal ? global.VocabModal.saveEditCard() : undefined;

  function exportJSON() {
    const allPairs = getAllKnownPairConfigs();
    const data = {};
    allPairs.forEach(p => {
      const items = getJson(p.key);
      if (items.length > 0 || LANGS[p.src]?.key === p.key) {
        data[p.key] = items;
      }
    });
    // 互換性のため言語キー(en, fr, de, ja)もミラー確保
    LANG_KEYS.forEach(l => {
      const legacyKey = LANGS[l].key;
      if (!data[legacyKey]) data[legacyKey] = getJson(legacyKey);
      data[l] = data[legacyKey];
    });
    const nowIso = new Date().toISOString();
    lsSet('vv_last_backup_at', nowIso.slice(0, 19).replace('T', ' '));
    updStats();
    if (global.VocabExport && typeof global.VocabExport.exportFullJSON === 'function') {
      return global.VocabExport.exportFullJSON(data);
    }
    dlBlob([JSON.stringify({ version: 5, exportedAt: nowIso, data }, null, 2)], 'application/json', `vocab_backup_${nowIso.slice(0, 10)}.json`);
  }

  function importJSON(ev) {
    const f = ev.target?.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = e => {
      try {
        const ext = parseAnyWords(e.target.result, App.lang, true);
        let added = 0, updated = 0, skipped = 0;
        const now = Date.now();
        const handledStorageKeys = new Set();

        Object.keys(ext).forEach(key => {
          const incoming = ext[key];
          if (!Array.isArray(incoming) || !incoming.length) return;

          let storageKey = '';
          let l = 'en';

          if (key.startsWith('distinction_entries')) {
            storageKey = key;
            l = global.VocabStorage ? global.VocabStorage.keyToLang(key) : 'en';
          } else if (LANGS[key]) {
            storageKey = LANGS[key].key;
            l = key;
          } else {
            return;
          }

          if (handledStorageKeys.has(storageKey)) return;
          handledStorageKeys.add(storageKey);

          const cur = getJson(storageKey);
          const curMap = new Map(cur.map(it => [it.wordKey || makeWordKey(it.word, l, it.meanings?.[0]?.pos, it.homographIndex), it]));
          const tombMap = global.VocabStorage ? global.VocabStorage.getTombstones(l) : new Map();
          const clearedAt = global.VocabStorage ? global.VocabStorage.getClearedAt(l) : 0;

          incoming.forEach(it => {
            if (clearedAt > 0 && (it.updatedAt || 0) <= clearedAt) it.updatedAt = now;
            const k = it.wordKey || makeWordKey(it.word, l, it.meanings?.[0]?.pos, it.homographIndex);
            tombMap.delete(`id:${it.id}`);
            tombMap.delete(`wk:${k}`);
            const normW = String(it.word || '').trim().toLowerCase();
            if (normW) tombMap.delete(`word:${normW}`);
            const ex = curMap.get(k);
            if (!ex) added++;
            else if ((it.updatedAt || 0) > (ex.updatedAt || 0)) updated++;
            else skipped++;
          });

          if (global.VocabStorage) global.VocabStorage.saveTombstones(l, tombMap);
          const merged = mergeWords(cur, incoming, l, true);
          setJson(storageKey, merged, true, true);
          if (global.VocabStorage) global.VocabStorage.state.mem[storageKey] = merged;
          if (storageKey === getActivePairConfig().key) {
            App.entries = merged;
          }
        });

        if (!added && !updated && !skipped) throw new Error('有効な単語エントリが1件も含まれていません。');
        load(1);
        alert(`JSONインポート完了\n・新規追加: ${added} 語\n・更新: ${updated} 語\n・既存維持(スキップ): ${skipped} 語`);
      } catch (err) { alert(`JSON読込失敗: ${err.message}`); }
      finally { ev.target.value = ''; }
    };
    r.readAsText(f);
  }

  function exportAnkiTSV() {
    const list = getFiltered();
    if (!list.length) return alert('単語がありません。');
    if (global.VocabExport && typeof global.VocabExport.exportAnkiTSV === 'function') {
      return global.VocabExport.exportAnkiTSV(list, App.lang);
    }
  }

  function exportObsidianMarkdown() {
    const list = getFiltered();
    if (!list.length) return alert('エクスポートする単語がありません。');
    if (global.VocabExport && typeof global.VocabExport.exportObsidianMarkdown === 'function') {
      const res = global.VocabExport.exportObsidianMarkdown(list, App.lang);
      if (res) showToast(`Obsidian用 Markdown (${list.length}語・Wikiリンク対応) を出力しました`, 'ok');
      return res;
    }
  }

  function setDailyReviewCap(val) {
    if (global.VocabEvents) return global.VocabEvents.setDailyReviewCap(val, eventsCtx());
  }

  function rescheduleOverdueReviews() {
    if (global.VocabEvents) return global.VocabEvents.rescheduleOverdueReviews(eventsCtx());
  }

  // [自己修復エンジン] データベース整合性診断 & 自動修復 (js/events.js へ分離・委譲)
  async function runDatabaseDiagnosticsAndRepair() {
    if (global.VocabEvents) return global.VocabEvents.runDatabaseDiagnosticsAndRepair(eventsCtx());
  }

  // --- Anki復習セッション & SRS進行ステートマシン (js/anki_view.js へ分離・委譲) ---
  const getOverdueRatio = (item, now) => global.VocabAnkiView ? global.VocabAnkiView.getOverdueRatio(item, now) : 0;

  const ankiCtx = () => ({
    appState: App,
    getFiltered,
    getActivePairKey: () => getActivePairConfig().key,
    getList: key => (key === getActivePairConfig().key ? App.entries : getJson(key)),
    saveList: (key, list) => {
      setJson(key, list, true, true);
      if (global.VocabStorage) global.VocabStorage.state.mem[key] = list;
    },
    findAcrossAllPairs: cur => {
      for (const p of getAllKnownPairConfigs()) {
        const otherList = [...getJson(p.key)];
        const found = otherList.find(x => (cur.id && x.id === cur.id) || (cur.word && x.word === cur.word) || x.num === cur.num);
        if (found) return { entry: found, pairKey: p.key, list: otherList };
      }
      return null;
    },
    enhanceA11y,
    speakText,
    showToast,
    onReload: () => load(App.page),
    lsGet
  });

  const startAnki = customCandidates => global.VocabAnkiView ? global.VocabAnkiView.startAnki(customCandidates, ankiCtx()) : undefined;
  const renderAnki = () => global.VocabAnkiView ? global.VocabAnkiView.renderAnki(ankiCtx()) : undefined;
  const showAns = () => global.VocabAnkiView ? global.VocabAnkiView.showAns(ankiCtx()) : undefined;
  const procRev = r => global.VocabAnkiView ? global.VocabAnkiView.procRev(r, ankiCtx()) : undefined;
  const undoAnkiRev = () => global.VocabAnkiView ? global.VocabAnkiView.undoAnkiRev(ankiCtx()) : undefined;
  const exitAnki = () => global.VocabAnkiView ? global.VocabAnkiView.exitAnki(ankiCtx()) : undefined;

  // --- 語根ネットワーク・グラフビュー (js/graph.js へ分離・委譲) ---
  const buildGraphData = (q, c) => global.VocabGraph ? global.VocabGraph.buildGraphData(q, c) : { nodes:[], edges:[] };
  const toggleGraphClusterOnly = () => global.VocabGraph?.toggleGraphClusterOnly();
  const updateGraphDataAndFit = () => global.VocabGraph?.updateGraphDataAndFit();
  const fitGraphToView = () => global.VocabGraph?.fitGraphToView();
  const openGraphModal = root => global.VocabGraph?.openGraphModal(root);
  const resetGraphZoom = () => global.VocabGraph?.resetGraphZoom();
  const startGraphSimulation = () => global.VocabGraph?.startGraphSimulation();
  const drawGraph = () => global.VocabGraph?.drawGraph();

  // --- 単語入力サジェスト (js/navigation.js へ分離・委譲) ---
  function initWordSuggest() {
    if (global.VocabNavigation && typeof global.VocabNavigation.initWordSuggest === 'function') {
      return global.VocabNavigation.initWordSuggest({
        input: $('inWord'),
        box: $('wordSuggestBox'),
        getCurrentList: () => getJson(getActivePairConfig().key),
        esc,
        onJumpWord: w => jumpToWord(w, App.lang),
        onOpenRootGraph: r => openGraphModal(r)
      });
    }
  }

  // --- キーボードファースト: カード選択・ナビゲーション (js/navigation.js へ分離・委譲) ---
  function updateCardFocus(newIdx) {
    if (global.VocabNavigation && typeof global.VocabNavigation.clampAndFocusCard === 'function') {
      const cards = $$('#list .card');
      if (!cards.length) return;
      App.focusedCardIndex = global.VocabNavigation.clampAndFocusCard(newIdx, cards);
      return;
    }
    const cards = $$('#list .card');
    if (!cards.length) return;
    newIdx = Math.max(0, Math.min(newIdx, cards.length - 1));
    App.focusedCardIndex = newIdx;
    cards.forEach((c, i) => c.classList.toggle('card-focused', i === newIdx));
    cards[newIdx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function getFocusedCardItem() {
    if (global.VocabNavigation && typeof global.VocabNavigation.getFocusedCardItem === 'function') {
      const cards = $$('#list .card');
      return global.VocabNavigation.getFocusedCardItem(
        App.focusedCardIndex,
        cards,
        tL => getJson(LANGS[tL]?.key || LANGS.en.key),
        App.lang,
        makeLookupKey
      );
    }
    const cards = $$('#list .card');
    const targetCard = cards[App.focusedCardIndex];
    if (!targetCard) return null;
    const lk = targetCard.dataset.word;
    const tL = targetCard.dataset.lang || App.lang;
    const list = getJson(LANGS[tL].key);
    return list.find(i => makeLookupKey(i.word, tL, i.homographIndex) === lk);
  }

  function delW(idOrNum, tL = App.lang, skipConfirm = false) {
    if (!skipConfirm && !confirm('この単語を削除しますか？')) return;

    // 1. 対象の言語ペアとストレージキーを特定
    const activeCfg = getActivePairConfig();
    const curPairKey = activeCfg.key;
    const targetKey = (tL && LANGS[tL]?.key && !App.crossLang) ? LANGS[tL].key : curPairKey;

    // 2. 現在の配列を取得（メモリおよび最新ストレージから）
    let list = [...getJson(targetKey)];
    if (!list.length && App.entries.length) list = [...App.entries];

    // 3. 対象単語を柔軟かつ確実にマッチング (id, num, word, wordKey)
    const targetIdx = list.findIndex(i => {
      if (typeof idOrNum === 'string' && idOrNum) {
        if (i.id === idOrNum) return true;
        if (i.word === idOrNum) return true;
        if (i.wordKey === idOrNum) return true;
      }
      const parsedNum = Number(idOrNum);
      if (Number.isFinite(parsedNum) && parsedNum > 0 && Number(i.num) === parsedNum) return true;
      return false;
    });

    if (targetIdx === -1) {
      // 現在のリストで見つからない場合、全言語ペアから検索・救済削除
      let foundInOther = false;
      getAllKnownPairConfigs().forEach(p => {
        if (foundInOther) return;
        const otherList = [...getJson(p.key)];
        const idx = otherList.findIndex(i => {
          if (typeof idOrNum === 'string' && idOrNum && (i.id === idOrNum || i.word === idOrNum)) return true;
          const n = Number(idOrNum);
          return Number.isFinite(n) && n > 0 && Number(i.num) === n;
        });
        if (idx !== -1) {
          const tgt = otherList[idx];
          tgt.isDeleted = true;
          tgt.updatedAt = Date.now();
          if (global.VocabStorage) global.VocabStorage.recordTombstone(tgt, p.src, tgt.updatedAt);
          const nextOther = otherList.filter((_, i) => i !== idx).map((it, i) => ({ ...it, num: i + 1 }));
          setJson(p.key, nextOther, true, true);
          foundInOther = true;
        }
      });
      load(App.page);
      return;
    }

    const target = list[targetIdx];
    const now = Date.now();
    target.isDeleted = true;
    target.updatedAt = now;

    // 4. 墓石 (Tombstone) を記録
    if (global.VocabStorage) {
      global.VocabStorage.recordTombstone(target, target.lang || tL, now);
    }

    // 5. リストから除外して番号を再付与
    const nextList = list.filter((_, idx) => idx !== targetIdx).map((it, idx) => ({ ...it, num: idx + 1 }));

    // 6. ストレージとメモリを一元更新
    setJson(targetKey, nextList, true, true);
    App.entries = nextList;
    if (global.VocabStorage) {
      global.VocabStorage.state.mem[targetKey] = nextList;
    }

    // 7. Anki 復習キュー (App.aList) からも即座に抹消
    if (App.aList.length) {
      App.aList = App.aList.filter(item => item.id !== target.id && item.word !== target.word);
    }

    // 8. 画面再描画とトースト通知
    load(App.page);
    showToast(`「${target.word}」を削除しました`, 'ok');
  }

  function clearCurrentLang() {
    const pairCfg = getActivePairConfig();
    const l = App.srcLang;
    const label = pairCfg.label || LANGS[l]?.label || '現在の単語帳';
    if (!confirm(`選択中の単語帳（${label}）の全単語を削除しますか？`)) return;
    const cur = getJson(pairCfg.key), now = Date.now();
    if (global.VocabStorage) {
      global.VocabStorage.saveClearedAt(l, now);
      const map = global.VocabStorage.getTombstones(l);
      cur.forEach(item => {
        if (item.id) map.set(`id:${item.id}`, now);
        const wk = item.wordKey || makeWordKey(item.word, l, item.meanings?.[0]?.pos, item.homographIndex);
        if (wk) map.set(`wk:${wk}`, now);
      });
      global.VocabStorage.saveTombstones(l, map);
    }
    setJson(pairCfg.key, [], true, true);
    App.entries = [];
    if (global.VocabStorage) global.VocabStorage.state.mem[pairCfg.key] = [];
    load(1);
    toggleModal('settingsModal', false);
    showToast('すべての単語を削除しました', 'ok');
  }

  // --- 6. 単語登録・キュー管理 (js/queue.js へ委譲) ---
  const PHRASE_PARTICLES = global.VocabQueue?.PHRASE_PARTICLES || new Set();

  function splitInputWords(raw, lang = 'en') {
    return global.VocabQueue ? global.VocabQueue.splitInputWords(raw, lang) : [String(raw ?? '').trim()].filter(Boolean);
  }

  function syncPersistedQueue() {
    if (global.VocabQueue) global.VocabQueue.syncPersistedQueue();
  }

  function restorePersistedQueue() {
    if (global.VocabQueue) global.VocabQueue.restorePersistedQueue();
  }

  function registerWordsList(rawItems, fName, useHist, useWikt = $('chkWikt')?.checked ?? true) {
    if (global.VocabQueue) return global.VocabQueue.registerWordsList(rawItems, fName, useHist, useWikt);
  }

  function submitW() {
    if (global.VocabQueue) return global.VocabQueue.submitW();
  }

  function enqueueTask(task) {
    if (global.VocabQueue) return global.VocabQueue.enqueueTask(task);
  }

  async function processQueue() {
    if (global.VocabQueue) return global.VocabQueue.processQueue();
  }

  async function executeBatch(task) {
    if (global.VocabQueue) return global.VocabQueue.executeBatch(task);
  }

  function initStorageAndSync(manualSalvage = false) {
    if (manualSalvage && !confirm('退避スナップショットおよび全ストレージを走査して、過去に削除した単語も含めて救出・統合しますか？')) return;
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) navigator.storage.persist().catch(() => {});
    if (global.VocabStorage && !global.VocabStorage.state.bc && typeof BroadcastChannel !== 'undefined') {
      try {
        global.VocabStorage.state.bc = new BroadcastChannel('vocab_vault_sync');
        global.VocabStorage.state.bc.onmessage = ev => {
          if (ev.data?.type === 'vault-updated' && LANGS[ev.data.lang]) {
            syncFromIdbForLang(ev.data.lang);
          }
        };
      } catch {}
    }

    if (manualSalvage && global.VocabStorage) {
      global.VocabStorage.state.mem.en = global.VocabStorage.state.mem.fr = global.VocabStorage.state.mem.de = null;
      LANG_KEYS.forEach(l => { global.VocabStorage.saveClearedAt(l, 0); global.VocabStorage.saveTombstones(l, new Map()); });
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) {
            const ext = safeParseWords(lsGet(k), keyToLang(k));
            LANG_KEYS.forEach(l => { if (ext[l].length) setJson(LANGS[l].key, mergeWords(getJson(LANGS[l].key), ext[l], l, true), true, true); });
          }
        }
      } catch {}
    }

    // 手動サルベージ時のみ: LocalStorage の全キーから過去の単語（スナップショットや旧キー含む）を事前救出
    if (manualSalvage) {
      try {
        if (typeof localStorage !== 'undefined') {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.includes('distinction_entries') || k.includes('vocab_snapshot') || k.startsWith('vv_'))) {
              const val = localStorage.getItem(k);
              if (val && val !== '[]' && val.length > 5) {
                const l = keyToLang(k);
                const parsed = safeParseWords(val, l)[l];
                if (parsed && parsed.length > 0) {
                  const targetK = LANGS[l].key;
                  const cur = getJson(targetK);
                  const rec = mergeWords(cur, parsed, l, true);
                  if (rec.length > cur.length) {
                    console.log(`[Manual Salvage] Rescued ${rec.length - cur.length} words for ${l} from key "${k}"`);
                    if (global.VocabStorage) {
                      global.VocabStorage.state.mem[targetK] = rec;
                      global.VocabStorage.state.mem[l] = rec;
                    }
                    try { localStorage.setItem(targetK, JSON.stringify(rec)); } catch {}
                  }
                }
              }
            }
          }
        }
      } catch {}
    }

    const syncActiveLang = () => {
      const curPairKey = getActivePairConfig().key;
      App.entries = getJson(curPairKey);
      if (!App.entries.length) {
        // もし現在のペアが空なら、単語が存在する言語に自動フォールバック
        const foundLang = LANG_KEYS.find(l => getJson(LANGS[l].key).length > 0);
        if (foundLang && foundLang !== App.srcLang) {
          App.srcLang = foundLang;
          App.lang = foundLang;
          App.entries = getJson(LANGS[foundLang].key);
          lsSet('vv_src_lang', foundLang);
          lsSet('vv_active_lang', foundLang);
          if ($('srcLangSel')) $('srcLangSel').value = foundLang;
          renderPairFileTabs();
        }
      }
      load(App.page || 1);
    };
    syncActiveLang();

    // IndexedDB の初期化完了を待機して全データを完全同期・復元
    if (global.VocabStorage?.initDatabase) {
      global.VocabStorage.initDatabase().then(async () => {
        try {
          let totalRestored = 0;
          await Promise.all(LANG_KEYS.map(async l => {
            const k = LANGS[l].key;
            // 通常起動時は過去スナップショットを読まない (includeSnaps = manualSalvage)
            const b = await global.VocabStorage.idbFetchLangBundle(l, manualSalvage);
            if (!b) return;

            if (b.clearAt > global.VocabStorage.getClearedAt(l)) {
              global.VocabStorage.state.clearedAt[l] = b.clearAt;
            }
            if (b.tombs) {
              global.VocabStorage.absorbTombArray(global.VocabStorage.getTombstones(l), b.tombs);
            }

            let idbWords = Array.isArray(b.words) ? b.words : [];
            // 手動サルベージ時のみ過去スナップショットからも救出
            if (manualSalvage && b.snaps && b.snaps.length) {
              b.snaps.forEach(arr => {
                const sWords = safeParseWords(arr, l)[l];
                if (sWords && sWords.length) {
                  idbWords = mergeWords(idbWords, sWords, l, true);
                }
              });
            }

            // LocalStorage 内のデータともマージ (通常起動時は絶対に墓石を尊重し ignoreTombstones = false)
            const curWords = getJson(k);
            const merged = mergeWords(curWords, idbWords, l, manualSalvage);

            if (merged.length > 0 || manualSalvage) {
              totalRestored += merged.length;
              global.VocabStorage.state.mem[k] = merged;
              global.VocabStorage.state.mem[l] = merged;
              try { localStorage.setItem(k, JSON.stringify(merged)); } catch {}
              await global.VocabStorage.idbPut(k, merged);
            }
          }));

          syncActiveLang();
          if (global.VocabSRS?.flushOfflineReviews) global.VocabSRS.flushOfflineReviews();
          if (global.VocabSync?.isCloudReady?.()) syncCloudNow(false);
          if (manualSalvage) {
            const tot = LANG_KEYS.reduce((s, l) => s + getJson(LANGS[l].key).length, 0);
            alert(tot ? `合計 ${tot} 語を検出・復元しました。` : '復元可能なデータは見つかりませんでした。');
          }
        } catch (err) {
          console.warn('[Sync Init Error]', err);
        }
      });
    }
  }

  async function syncFromIdbForLang(l) {
    if (!global.VocabStorage) return;
    const b = await global.VocabStorage.idbFetchLangBundle(l, false);
    if (!b) return;
    if (b.clearAt > global.VocabStorage.getClearedAt(l)) global.VocabStorage.state.clearedAt[l] = b.clearAt;
    global.VocabStorage.absorbTombArray(global.VocabStorage.getTombstones(l), b.tombs);
    const k = LANGS[l].key;
    const merged = mergeWords(getJson(k), b.words, l, false);
    global.VocabStorage.state.mem[l] = merged;
    global.VocabStorage.state.mem[k] = merged;
    try { localStorage.setItem(k, JSON.stringify(merged)); } catch {}
    if (l === App.lang) App.entries = merged;
    syncAnkiReferences(l, merged);
    if (l === App.lang && $('anki')?.style.display !== 'block') load(App.page);
    else renderSidebarTree();
  }

  const salvageAll = (manual = false) => initStorageAndSync(manual);

  // --- 7. イベント委譲・初期化 ---
  // --- 7. イベント委譲・ライフサイクル (js/events.js へ分離・委譲) ---
  function bindDelegatedEvents() {
    if (global.VocabEvents) return global.VocabEvents.bindDelegatedEvents(eventsCtx());
  }

  function bindWindowEvents() {
    if (global.VocabEvents) return global.VocabEvents.bindWindowEvents(eventsCtx());
  }

  function initApp() {
    if (App._initialized) return;
    App._initialized = true;

    const savedSrc = lsGet('vv_src_lang', lsGet('vv_active_lang', 'en'));
    const savedTgt = lsGet('vv_tgt_lang', 'ja');
    if (LANGS[savedSrc]) { App.srcLang = savedSrc; App.lang = savedSrc; }
    if (LANGS[savedTgt]) App.tgtLang = savedTgt;

    if ($('srcLangSel')) $('srcLangSel').value = App.srcLang;
    if ($('tgtLangSel')) $('tgtLangSel').value = App.tgtLang;
    renderPairFileTabs();

    const savedSort = lsGet('vv_sort_by', 'new');
    if (['new', 'old', 'due', 'alpha'].includes(savedSort)) { App.sortBy = savedSort; if ($('sortSel')) $('sortSel').value = savedSort; }
    $('btnModeAcademic')?.classList.toggle('active', App.viewMode === 'academic');
    $('btnModeSimple')?.classList.toggle('active', App.viewMode === 'simple');

    if (window.innerWidth <= 768) closeSidebar();
    if (lsGet('vv_use_hist_mode', '1') === '0' && $('chkHist')) $('chkHist').checked = false;
    if (lsGet('vv_use_wikt', '1') === '0' && $('chkWikt')) $('chkWikt').checked = false;
    toggleDarkMode(lsGet('vv_theme_dark', '1') === '1');
    if (lsGet('vv_banner_closed', '0') === '0' && $('userFeedbackBanner')) $('userFeedbackBanner').style.display = 'flex';
    initWordSuggest();
    bindDelegatedEvents();
    bindWindowEvents();
    initStorageAndSync(false);
    updKeyUI();
    updCloudUI();
    restorePersistedQueue();
    if (getKey()) fetchModels(getKey()).then(() => processQueue()).catch(() => {});
    else if (global.VocabSync?.isCloudReady?.()) processQueue();

    // PWA起動モードの確認
    const urlParams = (typeof URLSearchParams !== 'undefined' && window.location?.search)
      ? new URLSearchParams(window.location.search)
      : { get: () => null };
    if (urlParams.get('mode') === 'anki') {
      setTimeout(() => startAnki(), 250);
    } else if (urlParams.get('mode') === 'extract') {
      setTimeout(() => openExtractModal(), 250);
    }

    if (global.VocabOCR?.initOcrEvents) {
      global.VocabOCR.initOcrEvents();
    }
  }

  // グローバル公開オブジェクト
  global.VocabCore = {
    $,
    $$,
    esc,
    cleanPho,
    fmtPho,
    foldAscii,
    lsGet,
    lsSet,
    getKey,
    toggleModal,
    closeAllModals,
    App,
    LANGS,
    LANG_KEYS,
    CATS,
    makeWordKey,
    makeLookupKey,
    sanitizeItem,
    mergeWords,
    parseAnyWords,
    safeParseWords,
    validateEntry,
    buildRight,
    createCardElement,
    scrollToCard,
    findCardElement,
    toggleSidebar,
    closeSidebar,
    toggleSec,
    toggleMask,
    toggleCrossLang,
    setSortOrder,
    setFilter,
    setSearch,
    resetAllFilters,
    jumpToWord,
    openEditModal,
    saveEditCard,
    exportJSON,
    importJSON,
    getJson,
    setJson,
    exportAnkiTSV,
    exportObsidianMarkdown,
    startAnki,
    renderAnki,
    showAns,
    procRev,
    undoAnkiRev,
    exitAnki,
    setDailyReviewCap,
    rescheduleOverdueReviews,
    runDatabaseDiagnosticsAndRepair,
    getOverdueRatio,
    delW,
    clearCurrentLang,
    submitW,
    load,
    render,
    splitInputWords,
    openExtractModal,
    runPassageExtract,
    commitExtractedWords,
    toggleAllExtChecks,
    handleOcrImageFile,
    setLanguagePair,
    swapLanguagePair,
    onLanguagePairChange,
    getActivePairConfig,
    getActivePairFiles,
    getAllKnownPairConfigs,
    getPairShortLabel,
    renderPairFileTabs,
    openGraphModal,
    resetGraphZoom,
    fitGraphToView,
    toggleGraphClusterOnly,
    buildGraphData,
    normRootKey,
    isValidRootForEntry,
    updateCardFocus,
    openLegalModal,
    switchLegalTab,
    openSettings,
    openUpsellModal,
    saveKeyFromModal,
    fetchModels,
    callGemini,
    cloudLogin,
    cloudLogout,
    syncCloudNow,
    salvageAll,
    toggleDarkMode,
    showToast,
    deleteAccountPermanently,
    canGenerateWords,
    getActiveEngineMode,
    generateWithInternalAI,
    BUILTIN_ETYMOLOGY_KNOWLEDGE,
    startStripeCheckout: p => global.VocabSync?.startStripeCheckout?.(p),
    openStripePortal: () => global.VocabSync?.openStripePortal?.(),
    setViewMode,
    loadStarterPack,
    toggleDevMasterMode,
    checkDevMasterMode,
    handleOcrImageFile,
    clearOcrPreview,
    runOcrCurrentFile,
    saveOcrKeyAndExecute,
    getFiltered,
    scrollToCard,
    findCardElement,
    initApp
  };

  // 既存のHTMLイベントハンドラから直接参照できるように安全にwindowへ展開（readonlyプロパティ衝突を安全にバイパス）
  if (global.VocabCore) {
    for (const k of Object.keys(global.VocabCore)) {
      try {
        global[k] = global.VocabCore[k];
      } catch (_) {}
    }
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', initApp);
    } else if (document.body) {
      initApp(); // すでにDOM読み込み完了済みの場合は即時起動
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);

