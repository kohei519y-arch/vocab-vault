/**
 * Vocab Vault — Main Application Module (js/app.js)
 */
(function (global) {
  'use strict';

  // --- 0. グローバル・エラー防壁 (Global Error Boundary & Crash Barrier) ---
  if (typeof window !== 'undefined' && window.addEventListener) {
    const isHarmlessError = msg => {
      const s = String(msg || '');
      return s.includes('ResizeObserver') ||
             s.includes('Script error') ||
             s.includes('chrome-extension://') ||
             s.includes('moz-extension://') ||
             s.includes('safari-extension://');
    };

    window.addEventListener('error', function(event) {
      const msg = event?.error?.message || event?.message || '';
      console.warn('[Global Error Boundary]', event.error || event.message);
      if (isHarmlessError(msg)) return;
    });
    window.addEventListener('unhandledrejection', function(event) {
      const msg = event?.reason?.message || String(event?.reason || '');
      console.warn('[Global Unhandled Rejection]', event.reason);
      if (isHarmlessError(msg)) return;
    });
  }

  const EMBEDDED_KEY = "";
  const PROMPT_VERSION = '2026-10-f';
  const WIKT_URL_RE = global.VocabStorage?.WIKT_URL_RE || /^https:\/\/[a-z0-9-]+\.wiktionary\.org\/wiki\/[^\s"<>`\\]+$/i;
  const $ = id => document.getElementById(id);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const cleanPho = global.VocabStorage?.cleanPho || (p => String(p ?? '').replace(/^[\[/\s]+/, '').replace(/[\]/\s]+$/, '').trim());
  const fmtPho = global.VocabStorage?.fmtPho || (p => { const c = cleanPho(p); return c ? `[ ${c} ]` : ''; });
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
    if (typeof window === 'undefined') return false;
    if (window.__VV_DEV_MASTER === true) return true;
    const path = String(window.location?.pathname || '');
    const proto = String(window.location?.protocol || '');
    const host = String(window.location?.hostname || '');
    if (path.endsWith('/dev.html') || path.endsWith('dev.html')) return true;
    const isProdHost = host.endsWith('github.io') || host.endsWith('vocab-vault.app') || host.endsWith('vercel.app');
    if (!isProdHost && (proto === 'file:' || host === 'localhost' || host === '127.0.0.1')) {
      try {
        return localStorage.getItem('vv_dev_unlocked') === '1';
      } catch {
        return false;
      }
    }
    try { localStorage.removeItem('vv_dev_unlocked'); } catch {}
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
    viewMode: 'academic',
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
    es: { label:'Español', wiktName:'Spanish', ja:'スペイン語', short:'西語', badge:'Español (西語)', key:'distinction_entries_es', snap:'vocab_snapshot_es', tomb:'vv_tombstones_es', clearKey:'vv_cleared_at_es', posHint:'（西語名詞は N[m], N[f], N[pl]、再帰動詞は V[refl] を使用）', gramHint:'名詞は冠詞・複数形(例: "el estado, pl. -s")、不規則動詞は主要活用', levels:mkLevels('DELE A2-B1 / 西検4〜3級','DELE B2 / 西検2級','DELE C1-C2 / 西検1級','西語の学術論文・思想・歴史・法政分野') },
    it: { label:'Italiano', wiktName:'Italian', ja:'イタリア語', short:'伊語', badge:'Italiano (伊語)', key:'distinction_entries_it', snap:'vocab_snapshot_it', tomb:'vv_tombstones_it', clearKey:'vv_cleared_at_it', posHint:'（伊語名詞は N[m], N[f], N[pl]、再帰動詞は V[refl] を使用）', gramHint:'名詞は冠詞・複数形(例: "lo stato, pl. gli stati")、不規則動詞は主要活用', levels:mkLevels('CILS A2-B1 / 伊検3〜2級','CILS B2 / 伊検準1級','CILS C1-C2 / 伊検1級','伊語の学術論文・人文・芸術・法政分野') },
    pt: { label:'Português', wiktName:'Portuguese', ja:'ポルトガル語', short:'葡語', badge:'Português (葡語)', key:'distinction_entries_pt', snap:'vocab_snapshot_pt', tomb:'vv_tombstones_pt', clearKey:'vv_cleared_at_pt', posHint:'（葡語名詞は N[m], N[f], N[pl]、再帰動詞は V[refl] を使用）', gramHint:'名詞は冠詞・複数形(例: "o estado, pl. -s")、不規則動詞は主要活用', levels:mkLevels('CELPE-Bras 中級 / B1','CELPE-Bras 中上級 / B2','CELPE-Bras 上級 / C1-C2','葡語の学術論文・国際関係・経済・法政分野') },
    nl: { label:'Nederlands', wiktName:'Dutch', ja:'オランダ語', short:'蘭語', badge:'Nederlands (蘭語)', key:'distinction_entries_nl', snap:'vocab_snapshot_nl', tomb:'vv_tombstones_nl', clearKey:'vv_cleared_at_nl', posHint:'（蘭語名詞は de-語 N[m]/N[f]、het-語 N[n] を使用）', gramHint:'名詞は定冠詞(de/het)・複数形(例: "de staat, pl. staten")、動詞は過去・完了形', levels:mkLevels('NT2 A2-B1 / CNaVT','NT2 B2 / Staatsexamen I','NT2 C1-C2 / Staatsexamen II','蘭語の学術論文・法学・歴史・経済分野') },
    zh: { label:'中文', wiktName:'Chinese', ja:'中国語', short:'中語', badge:'中文 (中国語)', key:'distinction_entries_zh', snap:'vocab_snapshot_zh', tomb:'vv_tombstones_zh', clearKey:'vv_cleared_at_zh', posHint:'（中国語名詞 N[C]/N[U]、動詞 V[T]/V[I]、形容詞 Adj、成語 Idiom）', gramHint:'ピンイン声調、繁体字・異体字、離合詞や量詞の搭配があれば記載', levels:mkLevels('HSK 3-4級 / 中検3級','HSK 5級 / 中検2級','HSK 6級-7〜9級 / 中検準1〜1級','中国語の学術論文・古典・政治経済・思想分野') },
    ko: { label:'한국어', wiktName:'Korean', ja:'韓国語', short:'韓語', badge:'한국어 (韓国語)', key:'distinction_entries_ko', snap:'vocab_snapshot_ko', tomb:'vv_tombstones_ko', clearKey:'vv_cleared_at_ko', posHint:'（韓国語名詞、他動詞 V[T]、自動詞 V[I]、形容詞 Adj）', gramHint:'漢字語の場合は対応する漢字表記(例: "政治")、不規則活用(ㅂ/ㄷ/르変則等)を記載', levels:mkLevels('TOPIK I-II (3級) / ハングル検定3級','TOPIK II (4〜5級) / ハングル検定準2〜2級','TOPIK II (6級) / ハングル検定1級','韓国語の学術論文・言論・法政・歴史分野') },
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
    es: mkPosReg('m|f|pl', 'T|I|T\\/I|refl'),
    it: mkPosReg('m|f|pl', 'T|I|T\\/I|refl'),
    pt: mkPosReg('m|f|pl', 'T|I|T\\/I|refl'),
    nl: mkPosReg('m|f|n|pl|C|U', 'T|I|T\\/I|refl'),
    zh: mkPosReg('C|U|C\\/U|pl', 'T|I|T\\/I', ''),
    ko: mkPosReg('C|U|C\\/U|pl', 'T|I|T\\/I', ''),
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

  function lsGet(k, d = '') { return global.VocabStorage ? global.VocabStorage.lsGet(k, d) : ((typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null) ?? d); }
  function lsSet(k, v) { return global.VocabStorage ? global.VocabStorage.lsSet(k, v) : (typeof localStorage !== 'undefined' ? (localStorage.setItem(k, v), true) : false); }

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

  // --- データモデル・サニタイズ・マージ（js/storage.js へ委譲） ---
  const sanitizeItem = (raw, idx, defLang = 'en') => global.VocabStorage ? global.VocabStorage.sanitizeItem(raw, idx, defLang) : raw;
  const mergeWords = (arrA, arrB, l = 'en', ignoreTombstones = false, customTombMap = null, customClearedAt = null) => global.VocabStorage ? global.VocabStorage.mergeWords(arrA, arrB, l, ignoreTombstones, customTombMap, customClearedAt) : (Array.isArray(arrA) ? arrA : []);
  const parseAnyWords = (raw, defL = 'en', strict = false) => global.VocabStorage ? global.VocabStorage.parseAnyWords(raw, defL, strict) : { en:[], fr:[], de:[], es:[], it:[], pt:[], nl:[], zh:[], ko:[], ja:[] };
  const safeParseWords = (raw, defL = 'en') => global.VocabStorage ? global.VocabStorage.safeParseWords(raw, defL) : { en:[], fr:[], de:[], es:[], it:[], pt:[], nl:[], zh:[], ko:[], ja:[] };

  function notifyOtherTabs(keyOrLang) {
    if (global.VocabStorage?.state?.bc) {
      try {
        global.VocabStorage.state.bc.postMessage({
          type: 'vault-updated',
          key: keyOrLang,
          lang: keyOrLang,
          ts: Date.now()
        });
      } catch {}
    }
  }

  function getJson(k) {
    const pair = global.VocabStorage?.keyToPair ? global.VocabStorage.keyToPair(k) : { srcLang: keyToLang(k), tgtLang: 'ja' };
    const l = pair.srcLang;
    const storageKey = k;
    if (global.VocabStorage && Array.isArray(global.VocabStorage.state.mem[storageKey])) {
      const memArr = global.VocabStorage.state.mem[storageKey];
      noteBase(storageKey, memArr);
      return memArr;
    }
    const rawStr = lsGet(storageKey, '');
    const parsed = rawStr ? (safeParseWords(rawStr, l)[l] || []) : [];
    if (!parsed.length && rawStr.trim().length > 2) {
      if (global.VocabStorage) global.VocabStorage.state.loadFailed[storageKey] = true;
      updateStorageStatusUI('error', `${storageKey}のLSデータが破損しています。IDBからの自動復旧を待機中です`);
    }
    const merged = mergeWords(parsed, [], storageKey, false);
    if (global.VocabStorage) global.VocabStorage.state.mem[storageKey] = merged;
    noteBase(storageKey, merged);
    return merged;
  }

  function syncAnkiReferences(l, latestList) {
    if (!App.aList.length) return;
    const byId = new Map(latestList.map(x => [x.id, x]));
    App.aList = App.aList.map(item => ((item.lang || App.lang) === l && byId.has(item.id)) ? byId.get(item.id) : item);
  }

  // 書き込み競合防止のための世代管理マップ
  const _storageWriteSeq = new Map();
  // 3-way マージ用 base インデックス (key -> { ref, ids, wks })。
  // 配列参照が変わった時点 (= 初見時) の id/wordKey を記録するため、呼び出し側が mem 配列を
  // in-place で splice してから setJson しても「自タブで削除した項目」を正しく識別できる。
  const _baseIdx = new Map();
  function noteBase(key, arr, reset = false) {
    const cur = _baseIdx.get(key);
    if (!reset && cur && cur.ref === arr) return cur;
    const ids = new Set(), wks = new Set();
    (Array.isArray(arr) ? arr : []).forEach(it => {
      if (!it) return;
      if (it.id) ids.add(it.id);
      if (it.wordKey) wks.add(it.wordKey);
    });
    const idx = { ref: arr, ids, wks };
    _baseIdx.set(key, idx);
    return idx;
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

    // base = 記録済みインデックス ∪ 現在の prev (in-place 変更前の項目も保持)
    const baseRec = noteBase(storageKey, prev);
    const base = { ids: new Set(baseRec.ids), wks: new Set(baseRec.wks) };
    prev.forEach(it => {
      if (!it) return;
      if (it.id) base.ids.add(it.id);
      if (it.wordKey) base.wks.add(it.wordKey);
    });

    // 書き込み世代番号をインクリメント
    const seq = (_storageWriteSeq.get(storageKey) || 0) + 1;
    _storageWriteSeq.set(storageKey, seq);

    if (global.VocabStorage) global.VocabStorage.state.mem[storageKey] = next;
    noteBase(storageKey, next, true);
    const curPairKey = getActivePairConfig().key;
    if (storageKey === curPairKey) App.entries = next;
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
      // [P1 TOCTOU 修正] 強制上書きを廃止。このタブの書込前メモリ(prev)を base とした 3-way マージを
      // 単一 readwrite トランザクション内で実行し、他タブの更新を消さず、かつ自タブの削除も復活させない。
      global.VocabStorage.idbCommitLangData(storageKey, next, false, base).then(({ ok: idbOk, data: mergedData, changed }) => {
        // この非同期処理の待機中に別の新しい setJson が走っていた場合は、古いデータでの上書きをスキップ
        if (_storageWriteSeq.get(storageKey) !== seq) return;

        if (idbOk) {
          global.VocabStorage.state.mem[storageKey] = mergedData;
          if (storageKey === getActivePairConfig().key) App.entries = mergedData;
          syncAnkiReferences(l, mergedData);
          noteBase(storageKey, mergedData, true);
          if (changed && lsOk) {
            try { localStorage.setItem(storageKey, JSON.stringify(mergedData)); } catch {}
          }
          if (changed && storageKey === getActivePairConfig().key && $('anki')?.style.display !== 'block') {
            try { load(App.page || 1); } catch {}
          }
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

  if (global.VocabStorage) {
    global.VocabStorage.getJson = getJson;
    global.VocabStorage.setJson = setJson;
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
    if (global.VocabSpeech?.stopAudioPlaylist) {
      global.VocabSpeech.stopAudioPlaylist();
    }
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

    const curPairCfg = getActivePairConfig();
    const curItems = getJson(curPairCfg.key);
    const pairId = curPairCfg.pairId || `${s}_${t}`;
    const cleared = global.VocabStorage ? global.VocabStorage.getClearedAt(curPairCfg.key) : 0;
    const starterLoaded = lsGet(`vv_starter_loaded_${pairId}`) === '1';

    if ((!curItems || curItems.length === 0) && !cleared && !starterLoaded) {
      lsSet(`vv_starter_loaded_${pairId}`, '1');
      loadStarterPack();
    } else {
      load(1);
    }
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
  const highlightPlain = (raw, reg) => global.VocabCardView ? global.VocabCardView.highlightPlain(raw, reg) : esc(String(raw ?? ''));
  const hlText = (str, allowBold = false) => global.VocabCardView ? global.VocabCardView.hlText(str, allowBold, App.qReg) : esc(String(str ?? ''));
  const formatMeaningAndEty = d => global.VocabCardView ? global.VocabCardView.formatMeaningAndEty(d) : { meanings: d.meanings || [], histDigest: '', compactEty: '', isLongEty: false };
  const collectEtyPeers = d => global.VocabCardView ? global.VocabCardView.collectEtyPeers(d, App.rootIndexMap) : { chipItems: [], sameList: [], crossList: [] };
  const buildRight = d => global.VocabCardView ? global.VocabCardView.buildRight(d, { rootIndexMap: App.rootIndexMap, queryReg: App.qReg, viewMode: App.viewMode, lang: App.lang }) : '';

  function createCardElement(i, opts = {}) {
    return global.VocabCardView?.createCardElement
      ? global.VocabCardView.createCardElement(i, {
          queryReg: App.qReg,
          lang: App.lang,
          crossLang: App.crossLang,
          rootIndexMap: App.rootIndexMap,
          viewMode: App.viewMode,
          ...opts
        })
      : document.createElement('div');
  }

  function setViewMode(mode) {
    App.viewMode = (mode === 'simple') ? 'simple' : 'academic';
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 760;
    lsSet(isMobile ? 'vv_view_mode_mobile' : 'vv_view_mode', App.viewMode);
    $('btnModeAcademic')?.classList.toggle('active', App.viewMode === 'academic');
    $('btnModeSimple')?.classList.toggle('active', App.viewMode === 'simple');
    render();
  }

  function setPage(p) {
    const val = parseInt(p, 10);
    if (!Number.isFinite(val) || val < 1) return;
    App.page = val;
    render();
    $('mainScroll')?.scrollTo?.(0, 0);
  }

  // --- 初回オンボーディング（ウェルカムガイドツアー）制御 ---
  let currentTourStep = 1;
  let selectedTourMode = 'simple';

  function getTourStep() {
    return currentTourStep;
  }

  function setTourStep(step) {
    if (step < 1) step = 1;
    if (step > 3) step = 3;
    currentTourStep = step;
    updateTourUi();
  }

  function selectTourMode(mode) {
    selectedTourMode = mode === 'academic' ? 'academic' : 'simple';
    const cardSimple = $('tourModeSimpleCard');
    const cardAcademic = $('tourModeAcademicCard');
    if (cardSimple) cardSimple.classList.toggle('selected', selectedTourMode === 'simple');
    if (cardAcademic) cardAcademic.classList.toggle('selected', selectedTourMode === 'academic');
  }

  function updateTourUi() {
    for (let s = 1; s <= 3; s++) {
      const stepEl = $(`tourStep${s}`);
      const dotEl = $(`tourDot${s}`);
      if (stepEl) stepEl.classList.toggle('active', s === currentTourStep);
      if (dotEl) dotEl.classList.toggle('active', s === currentTourStep);
    }
    const btnPrev = $('btnTourPrev');
    const btnNext = $('btnTourNext');
    const btnFinish = $('btnTourFinish');
    if (btnPrev) btnPrev.style.display = currentTourStep === 1 ? 'none' : 'inline-flex';
    if (btnNext) btnNext.style.display = currentTourStep === 3 ? 'none' : 'inline-flex';
    if (btnFinish) btnFinish.style.display = currentTourStep === 3 ? 'inline-flex' : 'none';

    if (currentTourStep === 3) {
      selectTourMode(selectedTourMode);
    }
  }

  function openWelcomeTour(step = 1) {
    currentTourStep = step;
    selectedTourMode = App.viewMode || 'simple';
    updateTourUi();
    toggleModal('welcomeTourModal', true);
  }

  function closeWelcomeTour() {
    toggleModal('welcomeTourModal', false);
    lsSet('vv_welcome_tour_done', '1');
  }

  function finishWelcomeTour() {
    setViewMode(selectedTourMode);
    closeWelcomeTour();
    showToast(`表示モードを「${selectedTourMode === 'simple' ? 'シンプル' : '学術・詳細'}」に設定しました。`, 'ok', 3000);
  }

  function checkWelcomeTour() {
    if (lsGet('vv_welcome_tour_done') === '1') return;
    openWelcomeTour(1);
  }

  function loadStarterPack(packType = 'academic') {
    if (!global.VocabStarterPack?.populateStarterPack) return;
    let actualPackType = packType;
    if (packType === 'academic') {
      if (App.lang === 'fr') actualPackType = 'fr_pre1';
      else if (App.lang === 'de') actualPackType = 'de_pre1';
    }
    const pairCfg = getActivePairConfig();
    const cur = getJson(pairCfg.key);
    const { added, merged } = global.VocabStarterPack.populateStarterPack(cur, App.lang, actualPackType, pairCfg.key);
    if (!added.length) {
      showToast('選択したパックの単語はすべて登録済みです。', 'info', 3000);
      return;
    }
    setJson(pairCfg.key, merged);
    const pairId = pairCfg.pairId || `${App.srcLang}_${App.tgtLang}`;
    lsSet(`vv_starter_loaded_${pairId}`, '1');
    load(1);
    const meta = global.VocabStarterPack?.PACK_METADATA?.[actualPackType];
    const pName = meta ? meta.name : (actualPackType === 'classical_roots' ? 'ラテン・ギリシャ古典語根マスター' : (actualPackType === 'philosophy' ? '西洋哲学・人文学キーコンセプト' : '厳選スターターパック'));
    showToast(`「${pName}」（${added.length}語）を読み込みました！`, 'ok', 3500);

    // オンボーディングツアー判定をトリガー
    setTimeout(() => {
      checkOnboardingReviewTrigger();
    }, 800);
  }

  // --- 【項目3解決】新規登録 → 初回復習 オンボーディング自動誘導 ---
  function checkOnboardingReviewTrigger() {
    if (lsGet('vv_onboarding_anki_done') === '1') return;
    const entries = App.entries || [];
    if (entries.length < 3) return;
    const hasReviewedAny = entries.some(e => (Number(e.repetition) || 0) > 0);
    if (hasReviewedAny) {
      lsSet('vv_onboarding_anki_done', '1');
      return;
    }
    showOnboardingReviewTour();
  }

  function showOnboardingReviewTour() {
    const existing = $('onboardingTourModal');
    if (existing) {
      existing.classList.add('open');
      return;
    }
    if (typeof document === 'undefined') return;
    const modalEl = document.createElement('div');
    modalEl.id = 'onboardingTourModal';
    modalEl.className = 'modal-ov open';
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.setAttribute('aria-labelledby', 'onboardingTourTitle');
    modalEl.innerHTML = `
      <div class="modal-box" style="max-width:440px;text-align:center;padding:26px 22px;">
        <div style="margin-bottom:14px;display:flex;justify-content:center">
          <div style="width:48px;height:48px;border-radius:12px;background:rgba(99,102,241,0.12);color:var(--ac);display:flex;align-items:center;justify-content:center">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
        </div>
        <h3 id="onboardingTourTitle" style="margin:0 0 10px 0;font-size:18px;font-weight:700;">30秒クイック復習ツアーへようこそ</h3>
        <p style="font-size:13px;color:var(--s);line-height:1.6;margin-bottom:22px;">
          単語が登録されました！<br>
          エビングハウス忘却曲線によると、学習直後〜数分以内の<strong>「ファースト・リコール（30秒復習）」</strong>で定着率は劇的に跳ね上がります。<br>
          新しくなった高速復習モードを体験してみませんか？
        </p>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button type="button" class="btn-ac" id="btnStartTourReview" style="padding:10px 20px;font-weight:600;font-size:13px;">今すぐ30秒復習を体験</button>
          <button type="button" class="btn-o" id="btnSkipTourReview" style="padding:10px 16px;font-size:13px;">あとで行う</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalEl);

    const dismissTour = (startReview) => {
      modalEl.classList.remove('open');
      lsSet('vv_onboarding_anki_done', '1');
      document.removeEventListener('keydown', onTourKeydown);
      if (startReview) startAnki();
    };
    function onTourKeydown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        dismissTour(false);
      }
    }
    $('btnStartTourReview')?.addEventListener('click', () => dismissTour(true));
    $('btnSkipTourReview')?.addEventListener('click', () => dismissTour(false));
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) dismissTour(false);
    });
    document.addEventListener('keydown', onTourKeydown);
    $('btnStartTourReview')?.focus();
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
  function findCardElement(cards, targetWord, targetLk, baseTargetLk, targetId = null) {
    return global.VocabCardView ? global.VocabCardView.findCardElement(cards, targetWord, targetLk, baseTargetLk, targetId) : null;
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
  const getKey = () => {
    let sessKey = '';
    try { sessKey = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('vv_gemini_api_key') : '') || ''; } catch {}
    return String(sessKey || EMBEDDED_KEY || lsGet('vv_gemini_api_key')).trim();
  };

  const setKey = (k, isSessionOnly = false) => {
    const cleanK = String(k || '').trim();
    if (isSessionOnly) {
      try { sessionStorage.setItem('vv_gemini_api_key', cleanK); } catch {}
      try { localStorage.removeItem('vv_gemini_api_key'); } catch {}
      lsSet('vv_key_session_only', '1');
    } else {
      lsSet('vv_gemini_api_key', cleanK);
      try { sessionStorage.removeItem('vv_gemini_api_key'); } catch {}
      lsSet('vv_key_session_only', '0');
    }
  };
  global.setKey = setKey;
  global.getKey = getKey;
  const extractCleanIpa = section => global.VocabDictionary ? global.VocabDictionary.extractCleanIpa(section) : '';
  const extractWiktLangSection = (fullText, targetLang, host) => global.VocabDictionary ? global.VocabDictionary.extractWiktLangSection(fullText, targetLang, host) : null;
  const fetchWiktOne = (word, targetLang) => global.VocabDictionary ? global.VocabDictionary.fetchWiktOne(word, targetLang) : null;
  const verifyWiktGrounding = (item, wRef) => global.VocabDictionary ? global.VocabDictionary.verifyWiktGrounding(item, wRef) : false;
  const parseApiJson = r => global.VocabDictionary ? global.VocabDictionary.parseApiJson(r) : r.json();

  const toggleDarkMode = d => global.VocabModal ? global.VocabModal.toggleDarkMode(d) : undefined;

  async function promptAppInstall() {
    const isNativeApp = (typeof window !== 'undefined') && (
      window.location.protocol === 'file:' ||
      Boolean(window.webkit?.messageHandlers?.nativeSave) ||
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator?.standalone === true
    );
    if (isNativeApp) {
      showToast('既に専用アプリ（Vocab Vault）としてインストール・起動されています。', 'ok', 3500);
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

  function printVocabList() {
    if (typeof window !== 'undefined' && window.webkit?.messageHandlers?.nativePrint) {
      try {
        window.webkit.messageHandlers.nativePrint.postMessage({});
        return;
      } catch {}
    }
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
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
    getAllKnownPairConfigs,
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
    const host = String(window.location?.hostname || '');
    const isProdHost = host.endsWith('github.io') || host.endsWith('vocab-vault.app') || host.endsWith('vercel.app');
    if (isProdHost && !String(window.location?.pathname || '').endsWith('dev.html')) {
      showToast('本番環境では開発者マスターモードは無効化されています。', 'warn', 3000);
      return;
    }
    App.isDev = !App.isDev;
    App.isPro = App.isDev || Boolean(global.VocabSync?.getSession?.()?.user?.isPro);
    try {
      if (App.isDev) localStorage.setItem('vv_dev_unlocked', '1');
      else localStorage.removeItem('vv_dev_unlocked');
    } catch {}
    updCloudUI();
    showToast(App.isDev ? '開発者マスターモードを有効化しました（Pro機能全開放）' : '開発者マスターモードを解除しました', 'ok', 3000);
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
      getLocalEntries: l => {
        const cfg = global.VocabStorage?.resolveConfig ? global.VocabStorage.resolveConfig(l) : (LANGS[l] || LANGS.en);
        return getJson(cfg.key);
      },
      getLocalTombMap: l => {
        const cfg = global.VocabStorage?.resolveConfig ? global.VocabStorage.resolveConfig(l) : (LANGS[l] || LANGS.en);
        return global.VocabStorage ? global.VocabStorage.getTombstones(cfg.key) : new Map();
      },
      getLocalClearedAt: l => {
        const cfg = global.VocabStorage?.resolveConfig ? global.VocabStorage.resolveConfig(l) : (LANGS[l] || LANGS.en);
        return global.VocabStorage ? global.VocabStorage.getClearedAt(cfg.key) : 0;
      },
      mergeWords,
      isTombstoned: (it, m, l, c) => {
        const cfg = global.VocabStorage?.resolveConfig ? global.VocabStorage.resolveConfig(l) : (LANGS[l] || LANGS.en);
        return global.VocabStorage ? global.VocabStorage.isTombstoned(it, m, cfg.key, c) : false;
      },
      makeWordKey,
      applyMergedLangState: (l, mergedEntries, mergedTombMap, mergedClearedAt) => {
        const cfg = global.VocabStorage?.resolveConfig ? global.VocabStorage.resolveConfig(l) : (LANGS[l] || LANGS.en);
        if (global.VocabStorage) {
          if (mergedClearedAt > global.VocabStorage.getClearedAt(cfg.key)) global.VocabStorage.saveClearedAt(cfg.key, mergedClearedAt);
          global.VocabStorage.saveTombstones(cfg.key, mergedTombMap);
        }
        setJson(cfg.key, mergedEntries, true, true, true);
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
    if ($('dataStatText')) {
      const allPairs = typeof getAllKnownPairConfigs === 'function' ? getAllKnownPairConfigs() : [];
      const stats = allPairs
        .map(cfg => {
          const count = getJson(cfg.key).length;
          return count > 0 ? `${cfg.short || cfg.label || cfg.key}:${count}語` : null;
        })
        .filter(Boolean);
      const totalCount = allPairs.reduce((acc, cfg) => acc + (getJson(cfg.key)?.length || 0), 0);
      $('dataStatText').textContent = stats.length > 0
        ? `総登録数: ${totalCount}語 (${stats.join(' / ')})`
        : `登録数: ${LANG_KEYS.map(l => `${LANGS[l].short}${getJson(LANGS[l].key).length}語`).join(' / ')}`;
    }
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
    return global.VocabExport ? global.VocabExport.exportFullJSON(data) : undefined;
  }

  function importJSON(ev) {
    if (global.VocabExport?.importJSON) {
      return global.VocabExport.importJSON(ev, {
        defaultLang: App.lang,
        getJson,
        setJson,
        activePairKey: getActivePairConfig().key,
        setActiveEntries: m => { App.entries = m; },
        onComplete: () => load(1)
      });
    }
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
      setJson(key, list, true, false);
    },
    findAcrossAllPairs: cur => {
      if (!cur) return null;
      const matchEntry = (x, pairSrc) => {
        if (!x) return false;
        if (cur.id && x.id) return x.id === cur.id;
        if (cur.wordKey && x.wordKey) return x.wordKey === cur.wordKey;
        const xLang = x.lang || pairSrc;
        if (cur.word && x.word) {
          const sameLang = !cur.lang || !xLang || xLang === cur.lang;
          const sameHomo = (Number(x.homographIndex) || 1) === (Number(cur.homographIndex) || 1);
          return x.word === cur.word && sameLang && sameHomo;
        }
        return (!cur.id && !cur.word && x.num === cur.num && (!cur.lang || !xLang || xLang === cur.lang));
      };
      const allPairs = getAllKnownPairConfigs();
      const ordered = cur.lang
        ? [...allPairs.filter(p => p.src === cur.lang), ...allPairs.filter(p => p.src !== cur.lang)]
        : allPairs;
      for (const p of ordered) {
        const otherList = [...getJson(p.key)];
        const found = otherList.find(x => matchEntry(x, p.src));
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
    if (global.VocabNavigation?.clampAndFocusCard) {
      const cards = $$('#list .card');
      if (cards.length) App.focusedCardIndex = global.VocabNavigation.clampAndFocusCard(newIdx, cards);
    }
  }

  function getFocusedCardItem() {
    if (global.VocabNavigation?.getFocusedCardItem) {
      const cards = $$('#list .card');
      const activePairKey = getActivePairConfig().key;
      return global.VocabNavigation.getFocusedCardItem(
        App.focusedCardIndex,
        cards,
        tL => (!App.crossLang || !tL || tL === App.srcLang)
          ? getJson(activePairKey)
          : getJson(LANGS[tL]?.key || activePairKey),
        App.lang,
        makeLookupKey
      );
    }
    return null;
  }

  function delW(idOrNum, tL = App.lang, skipConfirm = false) {
    if (!skipConfirm && !confirm('この単語を削除しますか？')) return;

    const activePairCfg = getActivePairConfig();
    // [NEW-P0-3 修正] 横断検索中でない限り、常に現在開いている言語ペアのストレージキー (activePairCfg.key) を対象とする
    const targetKey = (!App.crossLang || !tL || tL === App.srcLang)
      ? activePairCfg.key
      : (LANGS[tL]?.key || activePairCfg.key);

    const getList = () => {
      const l = getJson(targetKey);
      return (!l.length && App.entries.length && targetKey === activePairCfg.key) ? App.entries : l;
    };
    const rescueOtherPairs = id => {
      for (const p of getAllKnownPairConfigs()) {
        if (p.key === targetKey) continue;
        const other = getJson(p.key);
        const n = Number(id);
        const allowNumMatch = (!tL || p.src === tL);
        const idx = other.findIndex(i => (typeof id === 'string' && id && (i.id === id || i.word === id)) || (allowNumMatch && Number.isFinite(n) && n > 0 && Number(i.num) === n));
        if (idx !== -1) {
          const tgt = { ...other[idx], isDeleted: true, updatedAt: Date.now() };
          // [NEW-P0-3 修正] p.src ではなく p.key (ペア専用ストレージキー) に墓石を記録
          global.VocabStorage?.recordTombstone(tgt, p.key, tgt.updatedAt);
          setJson(p.key, other.filter((_, i) => i !== idx).map((it, i) => ({ ...it, num: i + 1 })), true, true);
          return tgt;
        }
      }
      load(App.page);
      return null;
    };
    // [NEW-P0-3 修正] 第2引数に tL ではなく targetKey を渡す
    const target = global.VocabStorage?.deleteWord(idOrNum, targetKey, getList, nextList => {
      setJson(targetKey, nextList, true, true);
      if (targetKey === activePairCfg.key) App.entries = global.VocabStorage?.state?.mem?.[targetKey] || nextList;
    }, rescueOtherPairs);
    if (!target) return;
    if (App.aList.length) App.aList = App.aList.filter(item => item.id !== target.id && item.word !== target.word);
    load(App.page);
    showToast(`「${target.word}」を削除しました`, 'ok');
  }

  function clearCurrentLang() {
    const pairCfg = getActivePairConfig();
    const l = App.srcLang;
    const label = pairCfg.label || LANGS[l]?.label || '現在の単語帳';
    if (!confirm(`選択中の単語帳（${label}）の全単語を削除しますか？`)) return;
    global.VocabStorage?.clearAllWords(pairCfg.key, getJson(pairCfg.key), () => {
      setJson(pairCfg.key, [], true, true);
      App.entries = [];
      global.VocabStorage.state.mem[pairCfg.key] = [];
    });
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

  const syncCtx = () => ({
    getJson,
    setJson,
    getActivePairKey: () => getActivePairConfig().key,
    getSrcLang: () => App.srcLang,
    setEntries: list => { App.entries = list; },
    switchSrcLang: l => {
      App.srcLang = l;
      App.lang = l;
      App.tgtLang = 'ja';
      lsSet('vv_src_lang', l);
      lsSet('vv_active_lang', l);
      lsSet('vv_tgt_lang', 'ja');
      if ($('srcLangSel')) $('srcLangSel').value = l;
      if ($('tgtLangSel')) $('tgtLangSel').value = 'ja';
      renderPairFileTabs();
    },
    reload: () => load(App.page || 1),
    flushOffline: () => global.VocabSRS?.flushOfflineReviews?.(),
    syncCloud: () => { if (global.VocabSync?.isCloudReady?.()) syncCloudNow(false); },
    syncFromIdb: l => syncFromIdbForLang(l),
    applyMerged: (keyOrLang, merged) => {
      const activePair = getActivePairConfig();
      const cfg = global.VocabStorage ? global.VocabStorage.resolveConfig(keyOrLang) : { key: keyOrLang, srcLang: keyOrLang };
      const isCurrentActive = (cfg.key === activePair.key) || (cfg.srcLang === App.lang && cfg.key === (LANGS[App.lang]?.key || 'distinction_entries'));
      if (isCurrentActive) App.entries = merged;
      syncAnkiReferences(cfg.srcLang, merged);
      if (isCurrentActive && $('anki')?.style.display !== 'block') load(App.page || 1);
      else renderSidebarTree();
    }
  });

  function initStorageAndSync(manualSalvage = false) {
    return global.VocabStorage?.initStorageAndSync(manualSalvage, syncCtx());
  }

  async function syncFromIdbForLang(l) {
    return global.VocabStorage?.syncFromIdbForLang(l, syncCtx());
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

  async function initApp() {
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
    if ($('chkHist')) $('chkHist').checked = true;
    if ($('chkWikt')) $('chkWikt').checked = true;
    toggleDarkMode(lsGet('vv_theme_dark', '1') === '1');
    if ($('userFeedbackBanner')) $('userFeedbackBanner').style.display = 'none';
    initWordSuggest();
    bindDelegatedEvents();
    bindWindowEvents();
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('vocab-locale-changed', () => {
        renderPairFileTabs();
        renderSidebarTree();
        updCloudUI();
        if ($('anki')?.style.display !== 'block') load(App.page || 1);
      });
    }
    await initStorageAndSync(false);
    if (!App.entries || !App.entries.length) {
      const curPairCfg = getActivePairConfig();
      const pairId = curPairCfg.pairId || `${App.srcLang}_${App.tgtLang}`;
      const cleared = global.VocabStorage ? global.VocabStorage.getClearedAt(curPairCfg.key) : 0;
      const starterLoaded = lsGet(`vv_starter_loaded_${pairId}`) === '1';
      if (!cleared && !starterLoaded) {
        lsSet(`vv_starter_loaded_${pairId}`, '1');
        loadStarterPack();
      }
    }
    updKeyUI();
    updCloudUI();
    restorePersistedQueue();
    if (getKey()) fetchModels(getKey()).then(() => processQueue()).catch(() => {});
    else if (global.VocabSync?.isProxyReady?.()) processQueue();

    // PWA起動モードおよびURLディープリンク (?w=単語, ?word=単語, ?q=検索クエリ, #単語) の確認
    const urlParams = (typeof URLSearchParams !== 'undefined' && window.location?.search)
      ? new URLSearchParams(window.location.search)
      : { get: () => null };
    if (urlParams.get('mode') === 'anki') {
      setTimeout(() => startAnki(), 250);
    } else if (urlParams.get('mode') === 'extract') {
      setTimeout(() => openExtractModal(), 250);
    }

    const initialJumpWord = urlParams.get('w') || urlParams.get('word') || (typeof window !== 'undefined' && window.location?.hash ? decodeURIComponent(window.location.hash.replace(/^#/, '')).trim() : null);
    const initialJumpLang = urlParams.get('lang') || App.lang;
    const initialSearchQ = urlParams.get('q');
    if (initialJumpWord) {
      setTimeout(() => {
        jumpToWord(initialJumpWord, initialJumpLang);
      }, 300);
    } else if (initialSearchQ) {
      setTimeout(() => {
        setSearch(initialSearchQ);
      }, 300);
    }

    const shareParam = urlParams.get('share') || (typeof window !== 'undefined' && window.location?.hash?.includes('share=') ? window.location.hash.split('share=')[1] : null);
    if (shareParam && global.VocabExport?.parseShareDeckUrl) {
      setTimeout(() => {
        const deckData = global.VocabExport.parseShareDeckUrl(shareParam);
        if (deckData && global.VocabModal?.openShareDeckModal) {
          global.VocabModal.openShareDeckModal(deckData);
        }
      }, 400);
    }

    if (global.VocabOCR?.initOcrEvents) {
      global.VocabOCR.initOcrEvents();
    }

    setTimeout(() => {
      checkWelcomeTour();
    }, 600);

    setTimeout(() => {
      checkOnboardingReviewTrigger();
    }, 1200);

    // 観点1: 忘却臨界点スマートPush通知スケジューラの起動（全言語ペア対象・起動3秒後および定期1時間）
    if (global.VocabSRS?.checkSmartNotificationSchedule) {
      const collectAllPairsEntries = () => {
        const all = [];
        try {
          const pairs = getAllKnownPairConfigs();
          pairs.forEach(cfg => {
            const arr = getJson(cfg.key);
            if (Array.isArray(arr) && arr.length) all.push(...arr);
          });
        } catch {}
        return all.length ? all : (App.entries || []);
      };

      setTimeout(() => {
        try { global.VocabSRS.checkSmartNotificationSchedule(collectAllPairsEntries()); } catch {}
      }, 3000);
      setInterval(() => {
        try { global.VocabSRS.checkSmartNotificationSchedule(collectAllPairsEntries()); } catch {}
      }, 3600000);
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
    getAppState: () => App,
    getEntries: () => App.entries || [],
    setEntries: (e) => { App.entries = Array.isArray(e) ? e : []; },
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
    getAppSyncHooks,
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
    promptAppInstall,
    printVocabList,
    showToast,
    deleteAccountPermanently,
    canGenerateWords,
    getActiveEngineMode,
    generateWithInternalAI,
    BUILTIN_ETYMOLOGY_KNOWLEDGE,
    startStripeCheckout: p => global.VocabSync?.startStripeCheckout?.(p),
    openStripePortal: () => global.VocabSync?.openStripePortal?.(),
    setViewMode,
    setPage,
    getTourStep,
    setTourStep,
    selectTourMode,
    openWelcomeTour,
    closeWelcomeTour,
    finishWelcomeTour,
    checkWelcomeTour,
    loadStarterPack,
    checkOnboardingReviewTrigger,
    showOnboardingReviewTour,
    toggleDevMasterMode,
    checkDevMasterMode,
    clearOcrPreview,
    runOcrCurrentFile,
    saveOcrKeyAndExecute,
    getFiltered,
    openAnalyticsModal: () => global.VocabAnkiView?.openAnalyticsModal?.(),
    closeAnalyticsModal: () => global.VocabAnkiView?.closeAnalyticsModal?.(),
    requestSmartNotifyPermission: () => global.VocabModal?.requestSmartNotifyPermission?.(),
    updateSmartNotifyUI: () => global.VocabModal?.updateSmartNotifyUI?.(),
    initApp
  };

  // 既存のHTMLイベントハンドラから直接参照できるように安全にwindowへ展開（readonlyプロパティ衝突を安全にバイパス）
  if (global.VocabCore) {
    for (const k of Object.keys(global.VocabCore)) {
      try {
        global[k] = global.VocabCore[k];
      } catch (_) {}
    }
    global.VocabCore.setPage = setPage;
    global.setPage = setPage;
    global.promptAppInstall = promptAppInstall;
    global.printVocabList = printVocabList;
    global.openAnalyticsModal = () => global.VocabAnkiView?.openAnalyticsModal?.();
    global.closeAnalyticsModal = () => global.VocabAnkiView?.closeAnalyticsModal?.();
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', initApp);
    } else if (document.body) {
      initApp(); // すでにDOM読み込み完了済みの場合は即時起動
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);

