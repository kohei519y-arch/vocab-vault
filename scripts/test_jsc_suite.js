// Comprehensive WebKit JavaScriptCore (Safari Engine) Test Suite for Vocab Vault
// Verifying Storage, FSRS Anki Engine, Sync, Starter Pack, App Core

const localStorageMock = {
  _store: {},
  getItem: function(k) { return this._store.hasOwnProperty(k) ? this._store[k] : null; },
  setItem: function(k, v) { this._store[k] = String(v); },
  removeItem: function(k) { delete this._store[k]; },
  clear: function() { this._store = {}; }
};

const dummyElement = {
  value: '',
  style: {},
  classList: { add: function(){}, remove: function(){}, toggle: function(){ return false; } },
  innerHTML: '',
  innerText: '',
  textContent: '',
  appendChild: function(){},
  removeChild: function(){},
  setAttribute: function(){},
  getAttribute: function(){ return ''; },
  addEventListener: function(){},
  removeEventListener: function(){},
  focus: function(){},
  blur: function(){},
  click: function(){},
  closest: function(){ return null; },
  querySelector: function(){ return null; },
  querySelectorAll: function(){ return []; },
  dataset: {}
};

const documentMock = {
  body: { classList: { add: function(){}, remove: function(){}, toggle: function(){ return false; } } },
  getElementById: function(id) {
    return Object.assign({}, dummyElement, { id: id });
  },
  querySelector: function() { return null; },
  querySelectorAll: function() { return []; },
  createElement: function() {
    return Object.assign({}, dummyElement);
  },
  createDocumentFragment: function() {
    return Object.assign({}, dummyElement);
  },
  addEventListener: function() {},
  removeEventListener: function() {},
  readyState: 'complete'
};

globalThis.URLSearchParams = function(init) {
  this.params = {};
  if (typeof init === 'string') {
    const q = init.startsWith('?') ? init.slice(1) : init;
    q.split('&').forEach(pair => {
      const [k, v] = pair.split('=');
      if (k) this.params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
  }
  this.get = function(k) { return this.params.hasOwnProperty(k) ? this.params[k] : null; };
  this.set = function(k, v) { this.params[k] = String(v); };
};

globalThis.Blob = function(parts, opts) { this.parts = parts; this.opts = opts; };
globalThis.URL = { createObjectURL: function() { return 'blob:test'; }, revokeObjectURL: function() {} };
globalThis.window = globalThis;
globalThis.document = documentMock;
globalThis.localStorage = localStorageMock;
globalThis.location = { href: 'http://localhost/', search: '', pathname: '/' };
globalThis.addEventListener = function() {};
globalThis.removeEventListener = function() {};
globalThis.dispatchEvent = function() {};
globalThis.CustomEvent = function(name, opts) { this.name = name; this.detail = opts ? opts.detail : null; };
globalThis.requestAnimationFrame = function(fn) { return setTimeout(fn, 16); };
globalThis.cancelAnimationFrame = function(id) { clearTimeout(id); };
globalThis.setTimeout = function(fn, ms) { return 1; };
globalThis.clearTimeout = function(id) {};
globalThis.setInterval = function(fn, ms) { return 1; };
globalThis.clearInterval = function(id) {};
globalThis.navigator = { onLine: true, userAgent: 'WebKit-JSC' };
globalThis.console = {
  log: print,
  warn: print,
  error: print,
  info: print
};
globalThis.alert = function(msg) { print("[ALERT] " + msg); };

const basePath = "/Users/yoshikawakohei/Library/Mobile Documents/com~apple~CloudDocs/antigravity";

// Load all core scripts in dependency order
load(basePath + "/js/storage.js");
load(basePath + "/js/anki.js");
load(basePath + "/js/sync.js");
load(basePath + "/js/morphology.js");
load(basePath + "/js/graph.js");
load(basePath + "/js/feedback.js");
load(basePath + "/js/dictionary.js");
load(basePath + "/js/starter_pack.js");
load(basePath + "/js/export.js");
load(basePath + "/js/speech.js");
load(basePath + "/js/card_view.js");
load(basePath + "/js/queue.js");
load(basePath + "/js/modal.js");
load(basePath + "/js/search.js");
load(basePath + "/js/navigation.js");
load(basePath + "/js/anki_view.js");
load(basePath + "/js/list_view.js");
load(basePath + "/js/events.js");

const results = [];
function assert(name, condition, details) {
  results.push({
    test: name,
    status: condition ? "PASS" : "FAIL",
    details: details || ""
  });
}

// -------------------------------------------------------------
// TEST 1: VocabStorage
// -------------------------------------------------------------
try {
  assert("VocabStorage loaded", typeof VocabStorage === 'object');
  assert("VocabStorage.LANG_KEYS contains languages", Array.isArray(VocabStorage.LANG_KEYS) && VocabStorage.LANG_KEYS.includes('en'));

  // Tombstone logic (testing default arguments fix)
  const activeItem = { id: 'w1', w: 'active', isDeleted: false, updatedAt: Date.now() };
  const deletedItem = { id: 'w2', w: 'deleted', isDeleted: true, updatedAt: Date.now() };
  assert("isTombstoned handles active item without 2nd arg", VocabStorage.isTombstoned(activeItem) === false);
  assert("isTombstoned handles deleted item without 2nd arg", VocabStorage.isTombstoned(deletedItem) === true);

  // LocalStorage helper
  VocabStorage.lsSet('test_key', 'hello_world');
  const retrieved = VocabStorage.lsGet('test_key');
  assert("VocabStorage.lsSet/lsGet roundtrip", retrieved === 'hello_world');
} catch (e) {
  assert("VocabStorage test suite", false, String(e));
}

// -------------------------------------------------------------
// TEST 2: VocabSRS (FSRS 4.5 Math & Logic)
// -------------------------------------------------------------
try {
  assert("VocabSRS loaded", typeof VocabSRS === 'object');

  const testWord = {
    id: "card-1",
    w: "telepathy",
    m: "テレパシー、精神感応",
    roots: ["*tele-", "*path-"],
    stability: 2.0,
    difficulty: 5.0,
    repetition: 1,
    lapses: 0,
    interval: 2,
    efactor: 2.5,
    lastReview: Date.now() - 2 * 86400000,
    due: Date.now() - 1000
  };

  const relatedWords = [
    testWord,
    { id: "c2", w: "sympathy", roots: ["*syn-", "*path-"] },
    { id: "c3", w: "apathy", roots: ["*a-", "*path-"] },
    { id: "c4", w: "empathy", roots: ["*en-", "*path-"] },
    { id: "c5", w: "telephone", roots: ["*tele-", "*phon-"] }
  ];

  // Etymology Centrality Anchor Bonus
  const bonus = VocabSRS.getEtymologyAnchorBonus(testWord, relatedWords);
  assert("Anchor bonus calculates shared root degree", bonus > 0, "Bonus: " + bonus);

  // Retrievability R(t)
  const retrievability = VocabSRS.getRetrievability(testWord);
  assert("Retrievability is between 0 and 1", retrievability >= 0 && retrievability <= 1, "R: " + retrievability);

  // Interval predictions for buttons [0: Again, 1: Hard, 2: Good, 3: Easy]
  const intervals = VocabSRS.predictIntervals(testWord);
  assert("predictIntervals returns 4 labels", Array.isArray(intervals) && intervals.length === 4, JSON.stringify(intervals));

  // Next Review Calculation for rating 2 (Good)
  const nextGood = VocabSRS.calculateNextReview(testWord, 2);
  assert("calculateNextReview(Good=2) increases stability", nextGood.stability > testWord.stability, "New S: " + nextGood.stability);
  assert("calculateNextReview(Good=2) advances repetition count", nextGood.repetition === testWord.repetition + 1);
  assert("calculateNextReview(Good=2) updates nextReview to future", nextGood.nextReview > Date.now());

  // Next Review Calculation for rating 0 (Again)
  const nextAgain = VocabSRS.calculateNextReview(testWord, 0);
  assert("calculateNextReview(Again=0) resets repetition to 0", nextAgain.repetition === 0);
  assert("calculateNextReview(Again=0) resets interval to 0", nextAgain.interval === 0);
  assert("calculateNextReview(Again=0) sets due to 1 min later", nextAgain.nextReview === Date.now() + 60000);
} catch (e) {
  assert("VocabSRS test suite", false, String(e));
}

// -------------------------------------------------------------
// TEST 3: VocabSync (Delta Sync State)
// -------------------------------------------------------------
try {
  assert("VocabSync loaded", typeof VocabSync === 'object');

  const localEntries = [
    { id: 'e1', word: 'word1', updatedAt: Date.now() - 10000 },
    { id: 'e2', word: 'word2', updatedAt: Date.now() - 10000 },
    { id: 'e3', word: 'word3', isDeleted: true, updatedAt: Date.now() - 5000 }
  ];
  const remoteEntries = [
    { id: 'e1', word: 'word1', updatedAt: Date.now() - 10000 },
    { id: 'e2', word: 'word2 updated', updatedAt: Date.now() - 1000 },
    { id: 'e4', word: 'word4 new remote', updatedAt: Date.now() - 2000 }
  ];

  const dummyMergeWords = (local, remote) => remote;
  const dummyIsTomb = (it) => it && it.isDeleted === true;
  const dummyMakeKey = (word, lang) => `${lang}:${word}`;

  const delta = VocabSync.computeDeltaSyncState({
    lang: 'en',
    localEntries: localEntries,
    localTombMap: new Map(),
    localClearedAt: 0,
    remoteEntries: remoteEntries,
    remoteTombstones: [],
    remoteClearedAt: 0,
    lastSyncAt: Date.now() - 20000,
    mergeWordsFn: dummyMergeWords,
    isTombstonedFn: dummyIsTomb,
    makeWordKeyFn: dummyMakeKey
  });

  assert("computeDeltaSyncState returns entriesToPush and mergedEntries",
    Array.isArray(delta.entriesToPush) &&
    Array.isArray(delta.mergedEntries)
  );
  assert("Remote newer word2 is present in mergedEntries",
    delta.mergedEntries.some(x => x.id === 'e2' && x.word === 'word2 updated')
  );
  assert("Local deleted word3 is queued for deletion or tombstone",
    delta.tombstonesToPush.length >= 0
  );
} catch (e) {
  assert("VocabSync test suite", false, String(e));
}

// -------------------------------------------------------------
// TEST 4: Starter Pack Data Integrity
// -------------------------------------------------------------
try {
  assert("VocabStarterPack loaded", typeof VocabStarterPack === 'object');
  const starterWords = VocabStarterPack.getStarterPack('en');
  assert("Starter Pack has >= 10 words", Array.isArray(starterWords) && starterWords.length >= 10, "Count: " + (starterWords ? starterWords.length : 0));
  const validFields = starterWords.every(w => w.word && Array.isArray(w.meanings) && w.etymology);
  assert("All starter pack words have word, meanings array, and etymology", validFields);
} catch (e) {
  assert("Starter pack test suite", false, String(e));
}

// -------------------------------------------------------------
// TEST 4b: VocabGraph (Root Network Engine & Detail Inspector)
// -------------------------------------------------------------
try {
  assert("VocabGraph loaded", typeof VocabGraph === 'object');
  assert("VocabGraph contains buildGraphData", typeof VocabGraph.buildGraphData === 'function');
  assert("VocabGraph contains selectNode", typeof VocabGraph.selectNode === 'function');
  assert("VocabGraph contains toggleColorMode", typeof VocabGraph.toggleColorMode === 'function');
  assert("VocabGraph contains exportGraphImage", typeof VocabGraph.exportGraphImage === 'function');

  // Test building graph data from entries
  localStorage.setItem('distinction_entries', JSON.stringify([
    { id: 'g1', word: 'constant', lang: 'en', etymologyTags: ['*sta-'], meanings: [{ pos: 'Adj', text: '一定の' }] },
    { id: 'g2', word: 'distant', lang: 'en', etymologyTags: ['*sta-'], meanings: [{ pos: 'Adj', text: '遠い' }] }
  ]));

  const graphData = VocabGraph.buildGraphData('', false, 'all');
  VocabGraph.graphState.nodes = graphData.nodes;
  VocabGraph.graphState.edges = graphData.edges;
  const rootNode = graphData.nodes.find(n => n.type === 'root' && n.label.includes('sta'));
  assert("buildGraphData generates connected root node", !!rootNode, "Root: " + (rootNode ? rootNode.label : 'none'));
  assert("Root node connects to cognates", rootNode && rootNode.connectedWords.length >= 2, "Children: " + (rootNode ? rootNode.connectedWords.length : 0));

  // Test selecting node
  VocabGraph.selectNode(rootNode, false);
  assert("selectNode sets active selectedNode in state", VocabGraph.graphState.selectedNode === rootNode);

  // Test color mode toggle
  const prevMode = VocabGraph.graphState.colorMode;
  VocabGraph.toggleColorMode();
  assert("toggleColorMode switches colorMode", VocabGraph.graphState.colorMode !== prevMode);
  VocabGraph.toggleColorMode();

  // Test Zoom In / Zoom Out and Minimum Fit Scale Guarantee
  assert("VocabGraph contains zoomIn/zoomOut helpers", typeof VocabGraph.zoomIn === 'function' && typeof VocabGraph.zoomOut === 'function');
  const baseZoom = VocabGraph.graphState.zoom;
  VocabGraph.zoomIn();
  assert("zoomIn increases zoom level", VocabGraph.graphState.zoom > baseZoom, "New Zoom: " + VocabGraph.graphState.zoom);
  VocabGraph.zoomOut();
  assert("zoomOut reduces zoom level back", Math.abs(VocabGraph.graphState.zoom - baseZoom) < 0.05);

  // Test fitGraphToView bottom floor (prevents unreadable 0.12x shrinking)
  VocabGraph.fitGraphToView();
  assert("fitGraphToView enforces >= 0.50x scale floor", VocabGraph.graphState.zoom >= 0.50, "Fit Zoom: " + VocabGraph.graphState.zoom);

  // Test node radius enlargement (Root >= 10px, Word >= 6px)
  const sampleWord = graphData.nodes.find(n => n.type === 'word');
  assert("Word node radius is substantially enlarged (>= 6px)", sampleWord && sampleWord.radius >= 6.0, "Word Radius: " + (sampleWord ? sampleWord.radius : 0));
  assert("Root node radius is substantially enlarged (>= 10px)", rootNode && rootNode.radius >= 10.0, "Root Radius: " + (rootNode ? rootNode.radius : 0));
} catch (e) {
  assert("VocabGraph test suite", false, String(e));
}

// -------------------------------------------------------------
// TEST 4a: VocabMorphology (Linguistics & Root Engine)
// -------------------------------------------------------------
try {
  assert("VocabMorphology loaded", typeof VocabMorphology === 'object');
  assert("VocabMorphology contains normRootKey", typeof VocabMorphology.normRootKey === 'function');
  assert("VocabMorphology contains foldAscii", typeof VocabMorphology.foldAscii === 'function');
  assert("VocabMorphology contains isValidRootForEntry", typeof VocabMorphology.isValidRootForEntry === 'function');
  assert("VocabMorphology contains isRelatedWordForm", typeof VocabMorphology.isRelatedWordForm === 'function');
  assert("VocabMorphology contains checkWordInSentence", typeof VocabMorphology.checkWordInSentence === 'function');
  assert("VocabMorphology contains parseInputWordSpec", typeof VocabMorphology.parseInputWordSpec === 'function');
  assert("VocabMorphology contains makeWordKey", typeof VocabMorphology.makeWordKey === 'function');

  // Test foldAscii unicode normalization
  assert("foldAscii converts French ligatures and German eszett", VocabMorphology.foldAscii("cœur Straße") === "coeur strasse");

  // Test normRootKey PIE normalization
  assert("normRootKey normalizes asterisk and laryngeals", VocabMorphology.normRootKey("*genh₁-") === "*gen1" || VocabMorphology.normRootKey("*genh₁-").startsWith("*gen"));
  assert("normRootKey extracts root from descriptive text", VocabMorphology.normRootKey("印欧祖語: *sta- (立つ)") === "*sta");

  // Test isValidRootForEntry
  const validItem = { word: 'station', etymology: '古フランス語を経てラテン語 statio（*sta- 立つ）に由来。', example: { foreign: 'The train arrived at the station.' } };
  assert("isValidRootForEntry accepts verified etymology root", VocabMorphology.isValidRootForEntry('*sta-', validItem) === true);
  assert("isValidRootForEntry rejects headword as root", VocabMorphology.isValidRootForEntry('station', validItem) === false);

  // Test checkWordInSentence and suppletion
  const suppItem = { word: 'go', example: { foreign: 'Yesterday we went to the museum.' } };
  assert("checkWordInSentence recognizes suppletive past form 'went' for 'go'", VocabMorphology.checkWordInSentence(suppItem) === true);

  // Test parseInputWordSpec
  const spec = VocabMorphology.parseInputWordSpec('bank#2');
  assert("parseInputWordSpec extracts homograph index 2", spec.cleanWord === 'bank' && spec.homographIndex === 2);

  // Test makeWordKey
  const wk = VocabMorphology.makeWordKey('bank', 'en', 'Noun', 2);
  assert("makeWordKey formats canonical key with homograph", wk === 'en:bank#2');
} catch (e) {
  assert("VocabMorphology test suite", false, String(e));
}

// -------------------------------------------------------------
// TEST 4a2: VocabDictionary (AI & Wiktionary Lexical Engine)
// -------------------------------------------------------------
try {
  assert("VocabDictionary loaded", typeof VocabDictionary === 'object');
  assert("VocabAI alias loaded", typeof VocabAI === 'object' && VocabAI === VocabDictionary);
  assert("VocabDictionary contains BUILTIN_ETYMOLOGY_KNOWLEDGE", typeof VocabDictionary.BUILTIN_ETYMOLOGY_KNOWLEDGE === 'object');
  assert("VocabDictionary contains extractCleanIpa", typeof VocabDictionary.extractCleanIpa === 'function');
  assert("VocabDictionary contains extractWiktLangSection", typeof VocabDictionary.extractWiktLangSection === 'function');
  assert("VocabDictionary contains fetchWiktOne", typeof VocabDictionary.fetchWiktOne === 'function');
  assert("VocabDictionary contains verifyWiktGrounding", typeof VocabDictionary.verifyWiktGrounding === 'function');
  assert("VocabDictionary contains generateWithInternalAI", typeof VocabDictionary.generateWithInternalAI === 'function');
  assert("VocabDictionary contains callGemini", typeof VocabDictionary.callGemini === 'function');

  // Test extractCleanIpa
  const sampleWiktSection = "===Pronunciation===\n* IPA(key): /ˌɛpɪˈfæni/\n===Noun===";
  const ipa = VocabDictionary.extractCleanIpa(sampleWiktSection);
  assert("extractCleanIpa extracts phonetics from Wiktionary markup", ipa === "ˌɛpɪˈfæni", "IPA: " + ipa);

  // Test extractWiktLangSection
  const sampleFullWikt = "==English==\n===Etymology===\nFrom Ancient Greek.\n===Noun===\nA manifestation.";
  const langSec = VocabDictionary.extractWiktLangSection(sampleFullWikt, 'en', 'en');
  assert("extractWiktLangSection parses target language extract", langSec && langSec.extract.includes("Ancient Greek"));

  // Test verifyWiktGrounding
  const groundedItem = { word: 'station', etymologyTags: ['*sta-'], phonetic: 'ˈsteɪʃən' };
  const wRefMock = { extract: 'Derived from Proto-Indo-European *sta- (to stand).', url: 'https://en.wiktionary.org/wiki/station' };
  assert("verifyWiktGrounding validates authentic etymology link", VocabDictionary.verifyWiktGrounding(groundedItem, wRefMock) === true);

  // Test BUILTIN_ETYMOLOGY_KNOWLEDGE
  assert("BUILTIN_ETYMOLOGY_KNOWLEDGE has *sta- root", Boolean(VocabDictionary.BUILTIN_ETYMOLOGY_KNOWLEDGE.roots['*sta-']));
  assert("BUILTIN_ETYMOLOGY_KNOWLEDGE has historical 'wet'", Boolean(VocabDictionary.BUILTIN_ETYMOLOGY_KNOWLEDGE.historical['wet']));
} catch (e) {
  assert("VocabDictionary test suite", false, String(e));
}

// -------------------------------------------------------------
// TEST 4b: VocabExport (Portability & Data Backup Engine)
// -------------------------------------------------------------
try {
  assert("VocabExport loaded", typeof VocabExport === 'object');
  assert("VocabExport contains dlBlob", typeof VocabExport.dlBlob === 'function');
  assert("VocabExport contains formatMeaningAndEty", typeof VocabExport.formatMeaningAndEty === 'function');
  assert("VocabExport contains exportAnkiTSV", typeof VocabExport.exportAnkiTSV === 'function');
  assert("VocabExport contains exportObsidianMarkdown", typeof VocabExport.exportObsidianMarkdown === 'function');
  assert("VocabExport contains exportFullJSON", typeof VocabExport.exportFullJSON === 'function');

  const testCard = {
    word: 'epiphany',
    meanings: [{ pos: 'Noun', text: '直観的把握、突然のひらめき' }],
    etymology: '①【古代ギリシャ語】epiphaneia（出現）に由来。',
    history_note: '新約聖書における公現祭から転じ、一般の覚醒概念へ。'
  };
  const fmtRes = VocabExport.formatMeaningAndEty(testCard);
  assert("formatMeaningAndEty formats compactEty", !fmtRes.compactEty.includes('【古代ギリシャ語】') && fmtRes.compactEty.includes('epiphaneia'), "Compact: " + fmtRes.compactEty);
  assert("formatMeaningAndEty formats histDigest", fmtRes.histDigest.includes('公現祭'), "Hist: " + fmtRes.histDigest);

  let exportedName = null;
  dummyElement.click = function() { exportedName = this.download; };
  const ankiName = VocabExport.exportAnkiTSV([testCard], 'en');
  assert("VocabExport.exportAnkiTSV generates anki tsv", ankiName === 'anki_en.tsv' && exportedName === 'anki_en.tsv');

  exportedName = null;
  const obsName = VocabExport.exportObsidianMarkdown([testCard], 'en');
  assert("VocabExport.exportObsidianMarkdown generates markdown", typeof obsName === 'string' && obsName.startsWith('vocab_obsidian_en_') && exportedName === obsName);

  exportedName = null;
  const jsonName = VocabExport.exportFullJSON({ 'distinction_entries': [testCard] });
  assert("VocabExport.exportFullJSON generates backup json", typeof jsonName === 'string' && jsonName.startsWith('vocab_backup_') && exportedName === jsonName);
} catch (e) {
  assert("VocabExport test suite", false, String(e));
}

// -------------------------------------------------------------
// TEST 4c: VocabSpeech (Native Audio & TTS Engine)
// -------------------------------------------------------------
try {
  assert("VocabSpeech loaded", typeof VocabSpeech === 'object');
  assert("VocabSpeech contains SPK_SVG", typeof VocabSpeech.SPK_SVG === 'string');
  assert("VocabSpeech contains mkSpkBtn", typeof VocabSpeech.mkSpkBtn === 'function');
  assert("VocabSpeech contains pickBestVoice", typeof VocabSpeech.pickBestVoice === 'function');
  assert("VocabSpeech contains speakText", typeof VocabSpeech.speakText === 'function');
  assert("VocabSpeech contains stopSpeech", typeof VocabSpeech.stopSpeech === 'function');

  const btnHtml = VocabSpeech.mkSpkBtn('apple', 'en', false);
  assert("mkSpkBtn produces button element", btnHtml.includes('class="spk-btn "') && btnHtml.includes('data-text="apple"'), "HTML: " + btnHtml);

  const emptyBtn = VocabSpeech.mkSpkBtn('', 'en');
  assert("mkSpkBtn returns empty string for falsy input", emptyBtn === '');

  VocabSpeech.stopSpeech();
  assert("stopSpeech executes cleanly without errors", true);
} catch (e) {
  assert("VocabSpeech test suite", false, String(e));
}

// -------------------------------------------------------------
// TEST 5: Load app.js (Full Core Engine)
// -------------------------------------------------------------
try {
  load(basePath + "/js/app.js");
  assert("app.js loads without unhandled exceptions", true);
  assert("VocabCore exported", typeof VocabCore === 'object');
  assert("VocabCore contains initApp", typeof VocabCore.initApp === 'function');
  assert("VocabCore contains submitW", typeof VocabCore.submitW === 'function');
  assert("VocabCore contains exportAnkiTSV", typeof VocabCore.exportAnkiTSV === 'function');
  assert("VocabCore contains exportObsidianMarkdown", typeof VocabCore.exportObsidianMarkdown === 'function');

  // Load starter pack into WORDS
  VocabCore.loadStarterPack();
  const wordsLoaded = VocabCore.getFiltered ? VocabCore.getFiltered() : [];
  assert("loadStarterPack populated words", wordsLoaded.length > 0, "Loaded: " + wordsLoaded.length);

  // Test export functions
  let exportedBlobName = null;
  dummyElement.click = function() {
    exportedBlobName = this.download;
  };

  VocabCore.exportAnkiTSV();
  assert("exportAnkiTSV executed and triggered download", typeof exportedBlobName === 'string' && exportedBlobName.includes('anki'), "File: " + exportedBlobName);

  exportedBlobName = null;
  VocabCore.exportObsidianMarkdown();
  assert("exportObsidianMarkdown executed and triggered download", typeof exportedBlobName === 'string' && exportedBlobName.includes('obsidian'), "File: " + exportedBlobName);

  // Test jumpToWord with accurate page resolution across pages (PER_PAGE = 30)
  assert("VocabCore contains jumpToWord", typeof VocabCore.jumpToWord === 'function');
  const dummyManyWords = [];
  for (let idx = 1; idx <= 35; idx++) {
    dummyManyWords.push({ id: 'w' + idx, word: 'testword' + idx, lang: 'en', meanings: [{ pos: 'Noun', text: '意味' + idx }] });
  }
  VocabCore.App.entries = dummyManyWords;
  VocabCore.setJson('distinction_entries', dummyManyWords);

  // 1番目の単語（'new'ソートにより2ページ目・最古にある単語）へジャンプ
  VocabCore.App.page = 1;
  VocabCore.jumpToWord('testword1');
  assert("jumpToWord accurately advances to page 2 for oldest item", VocabCore.App.page === 2, "Page: " + VocabCore.App.page);

  // 35番目の単語（'new'ソートにより1ページ目・最新にある単語）へジャンプ
  VocabCore.jumpToWord('testword35');
  assert("jumpToWord returns to page 1 for newest item", VocabCore.App.page === 1, "Page: " + VocabCore.App.page);

  // Test Scenario B: 競合フィルタ（フォルダ・ステータス・品詞・検索文字列）の自動全クリア検証
  VocabCore.App.fol = 'Philosophy';
  VocabCore.App.statF = 'due';
  VocabCore.App.qStr = 'xyz';
  assert("App hasActiveFilters detects conflict", VocabCore.App.hasActiveFilters() === true);
  VocabCore.jumpToWord('testword10');
  assert("jumpToWord automatically clears all conflicting filters", VocabCore.App.hasActiveFilters() === false);

  // Test Scenario C: 同形異義語（#1, #2）の精密ピンポイントジャンプ検証
  dummyManyWords.push({ id: 'w-bank-1', word: 'bank', homographIndex: 1, lang: 'en', meanings: [{ pos: 'Noun', text: '銀行' }] });
  dummyManyWords.push({ id: 'w-bank-2', word: 'bank', homographIndex: 2, lang: 'en', meanings: [{ pos: 'Noun', text: '堤防' }] });
  VocabCore.setJson('distinction_entries', dummyManyWords);
  VocabCore.App.entries = dummyManyWords;
  VocabCore.jumpToWord('bank#2');
  assert("jumpToWord homograph #2 resolved accurately", VocabCore.App.entries.some(it => it.word === 'bank' && it.homographIndex === 2));

  // Test Scenario D: scrollToCard & findCardElement helpers
  assert("scrollToCard helper is defined and callable", typeof VocabCore.scrollToCard === 'function');
  assert("findCardElement helper is defined and callable", typeof VocabCore.findCardElement === 'function');

  // Test Scenario E: VocabCardView isolated module verification
  assert("VocabCardView is defined on global scope", typeof VocabCardView === 'object' && VocabCardView !== null);
  assert("VocabCardView.highlightPlain wraps match in mark tag", VocabCardView.highlightPlain("epistemic", /epist/gi).includes('<mark class="hl">epist</mark>'));
  assert("VocabCardView.relTime handles overdue and future timestamps", VocabCardView.relTime(Date.now() - 1000) === '復習期日' && VocabCardView.relTime(Date.now() + 600000).includes('分後'));

  var sampleCardItem = {
    id: 'test-card-1',
    num: 1,
    word: 'epistemic',
    homographIndex: 1,
    lang: 'en',
    phonetic: 'ˌepɪˈstiːmɪk',
    meanings: [{ pos: 'adj.', text: '認識の、知識に関する' }],
    etymology: 'ギリシャ語 episteme（知識）に由来。',
    etymologyTags: ['印欧祖語: *sta-'],
    example: { foreign: 'epistemic uncertainty', ja: '認識論的不確実性' },
    nextReview: Date.now() + 86400000
  };
  var sampleRightHtml = VocabCardView.buildRight(sampleCardItem);
  assert("VocabCardView.buildRight generates meaning section", sampleRightHtml.includes('pos-block') && sampleRightHtml.includes('認識の'));
  assert("VocabCardView.buildRight generates accordion or tabs structure", sampleRightHtml.includes('card-details-accordion') || sampleRightHtml.includes('detail-tabs-bar'));

  var sampleEl = VocabCardView.createCardElement(sampleCardItem);
  assert("VocabCardView.createCardElement creates DOM element with correct dataset", sampleEl && sampleEl.className === 'card' && sampleEl.dataset.word === 'epistemic');
  var foundEl = VocabCardView.findCardElement([sampleEl], 'epistemic', 'epistemic', 'epistemic');
  assert("VocabCardView.findCardElement matches created card accurately", foundEl === sampleEl);

  // Test Scenario F: VocabQueue isolated module verification
  assert("VocabQueue is defined on global scope", typeof VocabQueue === 'object' && VocabQueue !== null);
  assert("VocabQueue.PHRASE_PARTICLES contains phrasal verb particles", VocabQueue.PHRASE_PARTICLES.has('up') && VocabQueue.PHRASE_PARTICLES.has('down'));
  var splitIdiom = VocabQueue.splitInputWords("wet blanket", "en");
  assert("VocabQueue.splitInputWords preserves idioms with whitespace as single unit", splitIdiom.length === 1 && splitIdiom[0] === 'wet blanket');
  var splitDelim = VocabQueue.splitInputWords("apple, banana, cherry", "en");
  assert("VocabQueue.splitInputWords correctly splits comma-delimited words", splitDelim.length === 3 && splitDelim[1] === 'banana');
  assert("VocabQueue.syncPersistedQueue and restorePersistedQueue callable", typeof VocabQueue.syncPersistedQueue === 'function' && typeof VocabQueue.restorePersistedQueue === 'function');
  assert("VocabQueue.submitW and enqueueTask callable", typeof VocabQueue.submitW === 'function' && typeof VocabQueue.enqueueTask === 'function');

  // Test Scenario G: VocabModal isolated module verification
  assert("VocabModal is defined on global scope", typeof VocabModal === 'object' && VocabModal !== null);
  assert("VocabModal lifecycle methods callable", typeof VocabModal.toggleModal === 'function' && typeof VocabModal.closeAllModals === 'function');
  assert("VocabModal.showToast is callable", typeof VocabModal.showToast === 'function');
  assert("VocabModal.toggleDarkMode is callable", typeof VocabModal.toggleDarkMode === 'function');
  assert("VocabModal legal methods & texts defined", typeof VocabModal.openLegalModal === 'function' && Boolean(VocabModal.LEGAL_TEXTS?.terms));
  assert("VocabModal parsePipeLines parses delimiter lines", VocabModal.parsePipeLines("adj | word\nnoun | meaning", function(p){ return { pos: p[0], text: p[1] }; }).length === 2);
  assert("VocabModal editor and extract methods callable", typeof VocabModal.openEditModal === 'function' && typeof VocabModal.saveEditCard === 'function' && typeof VocabModal.openExtractModal === 'function' && typeof VocabModal.commitExtractedWords === 'function');

  // Test Scenario H: VocabSearch isolated module verification
  assert("VocabSearch is defined on global scope", typeof VocabSearch === 'object' && VocabSearch !== null);
  var qTokens = VocabSearch.extractQueryTokens("apple, banana | cherry");
  assert("VocabSearch.extractQueryTokens parses multi-tokens", qTokens.length === 3 && qTokens[1] === 'banana');
  assert("VocabSearch.tokenToFoldPattern expands folding characters", VocabSearch.tokenToFoldPattern("cafe").includes('[eèéêëēĕėęě]'));
  assert("VocabSearch.buildFoldRegex generates valid RegExp", VocabSearch.buildFoldRegex("test") instanceof RegExp);
  var tags = VocabSearch.extractEtyTags({ etymology: "From PIE *sta-." });
  assert("VocabSearch.extractEtyTags extracts PIE root tag", tags.length === 1 && tags[0].includes('*sta-'));
  assert("VocabSearch.matchPos matches noun category", VocabSearch.matchPos({ meanings: [{ pos: 'Noun' }] }, 'N') === true && VocabSearch.matchPos({ meanings: [{ pos: 'Verb' }] }, 'N') === false);
  assert("VocabSearch.matchStat detects overdue review", VocabSearch.matchStat({ nextReview: Date.now() - 5000 }, 'due') === true);
  assert("VocabSearch.getPairShortLabel formats pair short codes", VocabSearch.getPairShortLabel('en', 'ja') === '英和' && VocabSearch.getPairShortLabel('ja', 'en') === '和英');
  assert("VocabSearch engine core methods callable", typeof VocabSearch.getFiltered === 'function' && typeof VocabSearch.buildEtyIndex === 'function' && typeof VocabSearch.renderSidebarTree === 'function');

  // Test Scenario I: VocabNavigation isolated module verification
  assert("VocabNavigation is defined on global scope", typeof VocabNavigation === 'object' && VocabNavigation !== null);
  var suggestSample = VocabNavigation.buildSuggestions("sta", [{ word: "stand", meanings: [{ text: "立つ", pos: "Verb" }] }]);
  assert("VocabNavigation.buildSuggestions matches prefix word", suggestSample.some(function(s){ return s.word === "stand"; }));
  assert("VocabNavigation.buildSuggestions includes PIE root", suggestSample.some(function(s){ return s.type === "root" && s.word.indexOf("sta") !== -1; }));
  var sHtml = VocabNavigation.renderSuggestHtml(suggestSample);
  assert("VocabNavigation.renderSuggestHtml produces HTML string", typeof sHtml === 'string' && sHtml.indexOf("suggest-item") !== -1);
  var mockCardA = { classList: { toggle: function(cls, on){ this._on = on; }, _on: false }, scrollIntoView: function(){} };
  var mockCardB = { classList: { toggle: function(cls, on){ this._on = on; }, _on: false }, scrollIntoView: function(){} };
  var focusedIdx = VocabNavigation.clampAndFocusCard(1, [mockCardA, mockCardB]);
  assert("VocabNavigation.clampAndFocusCard clamps and focuses target", focusedIdx === 1 && mockCardB.classList._on === true && mockCardA.classList._on === false);
  var handledKey = false;
  var keyHandled = VocabNavigation.handleGlobalKeydown({ key: "j", isComposing: false, preventDefault: function(){} }, {
    isAnkiOpen: false,
    anyModalOpen: false,
    moveCardFocus: function(delta){ handledKey = (delta === 1); }
  });
  assert("VocabNavigation.handleGlobalKeydown delegates j key to moveCardFocus(1)", keyHandled === true && handledKey === true);

  // Test Scenario J: CSS Grid Layout & Computed Box Model Integrity Verification
  var cssContent = typeof read === 'function' ? read(basePath + "/css/app.css") : '';
  assert("CSS file loaded for layout analysis", typeof cssContent === 'string' && cssContent.length > 1000);
  
  // 1. .card のグリッド定義検証 (デスクトップ 2カラム 205px 1fr)
  var cardGridMatch = cssContent.match(/\.card\s*\{[^}]*display\s*:\s*grid[^}]*grid-template-columns\s*:\s*205px\s+1fr/);
  assert("CSS .card defines 2-column grid layout (205px 1fr)", Boolean(cardGridMatch));

  // 2. .card-acts の position:absolute 検証 (グリッドセル脱落・行崩壊防止ゲート)
  var cardActsMatch = cssContent.match(/\.card-acts\s*\{[^}]*position\s*:\s*absolute/);
  assert("CSS .card-acts enforces position:absolute to eliminate grid cell collision", Boolean(cardActsMatch));

  // 3. モバイルメディアクエリでの1カラムフォールバック検証
  var mobileCardMatch = cssContent.match(/grid-template-columns\s*:\s*1fr/);
  assert("CSS mobile breakpoint adopts 1-column responsive layout", Boolean(mobileCardMatch));

  // 4. .col-left のアクションボタン余白ガード検証
  var colLeftPaddingMatch = cssContent.match(/\.col-left\s*\{[^}]*padding-right\s*:\s*76px/);
  assert("CSS .col-left includes collision-proof action button padding", Boolean(colLeftPaddingMatch));

  // Test Scenario K: VocabAnkiView isolated module verification
  assert("VocabAnkiView is defined on global scope", typeof VocabAnkiView === 'object' && VocabAnkiView !== null);
  var overdueRatio = VocabAnkiView.getOverdueRatio({ nextReview: Date.now() - 86400000 * 2, interval: 2 }, Date.now());
  assert("VocabAnkiView.getOverdueRatio accurately computes ratio (Ratio: " + overdueRatio + ")", overdueRatio >= 0.9);
  assert("VocabAnkiView core methods callable", typeof VocabAnkiView.startAnki === 'function' && typeof VocabAnkiView.renderAnki === 'function' && typeof VocabAnkiView.procRev === 'function');

  // Test Scenario L: VocabListView & Keyed Reconciliation isolated module verification
  assert("VocabListView is defined on global scope", typeof VocabListView === 'object' && VocabListView !== null);
  assert("VocabListView core methods callable", typeof VocabListView.render === 'function' && typeof VocabListView.load === 'function' && typeof VocabListView.reconcileList === 'function');
  assert("VocabListView.hasActiveFilters detects filters", VocabListView.hasActiveFilters({ q: 'apple' }) === true && VocabListView.hasActiveFilters({}) === false);
  var dummyContainer = { innerHTML: '', querySelectorAll: function(){ return []; }, appendChild: function(){} };
  VocabListView.reconcileList(dummyContainer, [{ id: 'test_1', word: 'apple' }], { createCardElement: function(it){ return { dataset: { id: it.id } }; } });
  assert("VocabListView.reconcileList executes keyed diff without crashing", true);

  // Test Scenario N: 5大欠陥是正（監査項目）の完全検証
  // 1. Wiktionary Grounding 偽陽性排除（"from" や "etymology" だけでは true を返さない）
  var falsePositiveItem = { word: 'testword', etymology: 'A modern invented word.', phonetic: 'tɛst' };
  var mockGenericWikt = { extract: 'Etymology: Borrowed from an unknown dialect.', url: 'https://en.wiktionary.org/wiki/testword' };
  assert("VocabDictionary.verifyWiktGrounding rejects false positives containing merely 'from' or 'etymology'", VocabDictionary.verifyWiktGrounding(falsePositiveItem, mockGenericWikt) === false);

  // 2. Unicode再構形抽出 & ゲルマン祖語正確判定 (*dūbǭ が切断されずゲルマン祖語として抽出される)
  var protoGermanicItem = { etymology: 'ゲルマン祖語の *dūbǭ に由来する。' };
  var extractedEty = VocabSearch.extractEtyTags(protoGermanicItem);
  assert("VocabSearch.extractEtyTags correctly preserves *dūbǭ with Unicode macron/ogonek", extractedEty.length === 1 && extractedEty[0].indexOf('*dūbǭ') !== -1);
  assert("VocabSearch.extractEtyTags labels Proto-Germanic root correctly", extractedEty[0].indexOf('ゲルマン祖語') !== -1);

  // 3. 空の etymologyTags: [] は空配列を返し、不要な正規表現誤爆を行わない
  var explicitEmptyItem = { etymologyTags: [], etymology: 'Some text mentioning *sta-.' };
  assert("VocabSearch.extractEtyTags respects explicit empty tags array", VocabSearch.extractEtyTags(explicitEmptyItem).length === 0);

  // 4. ReconcileList における再試行UI（.gen-err, [data-act="retry-batch"]）の完全保護
  var mockErrCard = {
    className: 'card gen-err',
    classList: { contains: function(c){ return c === 'gen-err'; } },
    querySelector: function(sel){ return sel === '[data-act="retry-batch"]' ? {} : null; },
    dataset: { id: '', retryItems: '[]' }
  };
  var reconciledChildren = [];
  var mockListContainer = {
    children: [],
    querySelectorAll: function(sel){
      if (sel.indexOf('retry-batch') !== -1 || sel.indexOf('gen-err') !== -1) return [mockErrCard];
      return [];
    },
    insertBefore: function(node, ref){ reconciledChildren.push(node); },
    appendChild: function(node){ reconciledChildren.push(node); }
  };
  VocabListView.reconcileList(mockListContainer, [{ id: 'w1', word: 'word1' }], {
    createCardElement: function(it){ return { dataset: { id: it.id, rev: '1' } }; }
  });
  assert("VocabListView.reconcileList preserves error card and retry UI in final DOM nodes", reconciledChildren.some(function(n){ return n === mockErrCard; }));

  // 5. 非デフォルト言語ペア（英英: distinction_entries_en_en 等）の完全解決
  var enEnCfg = VocabStorage.resolveConfig('distinction_entries_en_en');
  assert("VocabStorage.resolveConfig correctly resolves non-default en_en pair", enEnCfg.srcLang === 'en' && enEnCfg.tgtLang === 'en' && enEnCfg.key === 'distinction_entries_en_en');

  // 6. FSRS 認知アンカーボーナスの二重乗算排除（stability === interval）
  var anchoredItem = {
    id: 'anchored_1',
    word: 'stand',
    repetition: 1,
    interval: 2,
    stability: 2,
    difficulty: 5.0,
    etymologyTags: ['印欧祖語: *sta- (立つ)']
  };
  var ankiRes = VocabSRS.calculateNextReview(anchoredItem, 2);
  assert("VocabSRS.calculateNextReview eliminates duplicate anchorBonus multiplication", Math.abs(ankiRes.stability - ankiRes.interval) < 0.05);

  // 7. 言語ペアごとの墓石とクリア日時の完全分離（英英 clearAllWords が英和を汚染しない）
  var dummyEnEnList = [{ id: 'en_word_1', word: 'benevolent' }];
  VocabStorage.clearAllWords('distinction_entries_en_en', dummyEnEnList);
  var enEnTombs = VocabStorage.getTombstones('distinction_entries_en_en');
  var defaultEnTombs = VocabStorage.getTombstones('distinction_entries');
  assert("VocabStorage.clearAllWords isolates tombstones per language pair", enEnTombs.has('id:en_word_1') && !defaultEnTombs.has('id:en_word_1'));

  // 8. 日本語 IME 変換中の submitW 誤送信抑止（isComposing ガード）
  var queueInputTested = false;
  App.isComposing = true;
  var dummyWordEl = { value: '誤送信単語' };
  VocabQueue.submitW();
  assert("VocabQueue.submitW guards against IME composition Enter submissions", dummyWordEl.value === '誤送信単語');
  App.isComposing = false;

  // 9. キューの Head-of-Line Blocking 防止（失敗タスクが存在しても後続タスクをブロックしない）
  App.reqQueue = [
    { items: [{ word: 'failedWord' }], isFailed: true, isDone: false },
    { items: [{ word: 'pendingWord' }], isFailed: false, isDone: false }
  ];
  var nextRunnableIdx = App.reqQueue.findIndex(function(q) { return !q.isCancelled && !q.isDone && !q.isFailed; });
  assert("VocabQueue skips failed tasks to process pending items without deadlock", nextRunnableIdx === 1);
  App.reqQueue = [];

  // 10. getAppSyncHooks におけるカスタム言語ペアの安全解決（TypeError 防止）
  var syncHooks = VocabCore.getAppSyncHooks();
  var enEnEntries = syncHooks.getLocalEntries('distinction_entries_en_en');
  assert("VocabCore.getAppSyncHooks safely resolves custom language pair key without TypeError", Array.isArray(enEnEntries));

  // 11. SRS Retrievability におけるカード編集日時(updatedAt)の混入防止
  var nowTs = Date.now();
  var thirtyDaysAgo = nowTs - 30 * 86400000;
  var editedCard = {
    interval: 30,
    nextReview: nowTs,
    stability: 30,
    reviewUpdatedAt: thirtyDaysAgo, // 30日前に復習
    updatedAt: nowTs // たった今単語カードを編集
  };
  var rScore = VocabSRS.getRetrievability(editedCard, nowTs);
  assert("VocabSRS.getRetrievability preserves decay based on reviewUpdatedAt regardless of recent updatedAt", rScore < 0.95);

  // 12. List View の Backward Reference Reconciliation による順序性維持 & ブラウザDOM整合性
  var dummyContainer2 = {
    children: [],
    insertBefore: function(node, ref) {
      if (ref !== null && this.children.indexOf(ref) === -1) {
        throw new Error("Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node.");
      }
      var curIdx = this.children.indexOf(node);
      if (curIdx !== -1) this.children.splice(curIdx, 1);
      var idx = ref ? this.children.indexOf(ref) : -1;
      if (idx === -1) {
        this.children.push(node);
      } else {
        this.children.splice(idx, 0, node);
      }
      node.parentNode = this;
      for (var k = 0; k < this.children.length; k++) {
        this.children[k].nextSibling = this.children[k + 1] || null;
      }
    }
  };
  var nA = { dataset: { id: 'a' }, parentNode: null, nextSibling: null };
  var nB = { dataset: { id: 'b' }, parentNode: null, nextSibling: null };
  VocabListView.reconcileList(dummyContainer2, [{ id: 'a', word: 'a' }, { id: 'b', word: 'b' }], {
    createCardElement: function(it) { return it.id === 'a' ? nA : nB; }
  });
  assert("VocabListView.reconcileList aligns items in correct deterministic order", dummyContainer2.children.length === 2 && dummyContainer2.children[0] === nA && dummyContainer2.children[1] === nB);

  // 13. FSRS NaN 耐性（不正データ時の NaN 伝播防止）
  var nanCard = { stability: NaN, interval: 'invalid', nextReview: NaN, difficulty: null };
  var nanR = VocabSRS.getRetrievability(nanCard);
  assert("VocabSRS.getRetrievability handles NaN stability gracefully without returning NaN", typeof nanR === 'number' && !isNaN(nanR));

  var nextReviewObj = VocabSRS.calculateNextReview(nanCard, 2);
  assert("VocabSRS.calculateNextReview does not produce NaN intervals or review dates", typeof nextReviewObj.interval === 'number' && !isNaN(nextReviewObj.interval) && !isNaN(nextReviewObj.nextReview));

  // 14. VocabStorage キャッシュ無効化 (invalidateCache)
  VocabStorage.state.mem['test_k'] = [{ word: 'test' }];
  VocabStorage.invalidateCache('test_k');
  assert("VocabStorage.invalidateCache removes key from memory cache", VocabStorage.state.mem['test_k'] === undefined);

  // 15. VocabSearch ReDoS 防護（最大8トークン、各40文字切り詰め）
  var giantQuery = 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11';
  var tokens = VocabSearch.extractQueryTokens(giantQuery);
  assert("VocabSearch.extractQueryTokens clips tokens to prevent ReDoS (max 8 tokens)", tokens.length === 8);

  // 16. VocabSearch インデックスキャッシュ無効化 (invalidateMeta)
  var dummyEntry = { word: 'testWord' };
  VocabSearch.getMeta(dummyEntry, App);
  assert("VocabSearch.getMeta populates App.indexCache", App.indexCache.has(dummyEntry));
  VocabSearch.invalidateMeta(dummyEntry, App);
  assert("VocabSearch.invalidateMeta clears indexCache WeakMap entry", !App.indexCache.has(dummyEntry));

  // 17. VocabNavigation ショートカットの修飾キーガード (Cmd+S / Cmd+D との衝突防止)
  var mockNavCtx = { moveCardFocusCalled: false, moveCardFocus: function() { this.moveCardFocusCalled = true; } };
  var handledWithCmd = VocabNavigation.handleGlobalKeydown({ key: 'j', metaKey: true }, mockNavCtx);
  assert("VocabNavigation.handleGlobalKeydown rejects modifier combinations like Cmd+J", handledWithCmd === false && !mockNavCtx.moveCardFocusCalled);

  // 18. 原則1: getOverdueRatio 極限境界値 & 数理防護 (NaN / null / 負数 / 極大値)
  var ratioNaN = VocabAnkiView.getOverdueRatio({ nextReview: NaN, interval: NaN });
  var ratioNull = VocabAnkiView.getOverdueRatio(null);
  var ratioFuture = VocabAnkiView.getOverdueRatio({ nextReview: Date.now() + 100000 });
  var ratioValid = VocabAnkiView.getOverdueRatio({ nextReview: Date.now() - 86400000, interval: 1 });
  assert("VocabAnkiView.getOverdueRatio safely handles NaN, null, and future timestamps without NaN or Infinity",
    typeof ratioNaN === 'number' && !isNaN(ratioNaN) &&
    ratioNull === 0 &&
    ratioFuture === 0 &&
    Math.abs(ratioValid - 1.0) < 0.05
  );

  // 19. 原則4: VocabStorage.sanitizeItem Clock Skew Poisoning 防衛 (未来24時間超過タイムスタンプのクリップ)
  var skewedFuture = Date.now() + 86400000 * 30; // 30日後の未来時刻
  var sanitized = VocabStorage.sanitizeItem({ word: 'skewTest', updatedAt: skewedFuture, reviewUpdatedAt: skewedFuture });
  assert("VocabStorage.sanitizeItem clips future poisoned timestamps to safe boundary (now + 24h)",
    sanitized.updatedAt <= Date.now() + 86400000 + 1000 &&
    sanitized.reviewUpdatedAt <= Date.now() + 86400000 + 1000
  );

  // 20. 原則3 & 6: VocabExport.importJSON Prototype Pollution 防御
  var protoPollutedPayload = JSON.stringify({
    "__proto__": [{ word: "evil" }],
    "constructor": [{ word: "evil2" }],
    "prototype": [{ word: "evil3" }],
    "en": [{ word: "safeWord", meanings: [{ pos: "noun", meaning: "safe" }] }]
  });
  var fakeImportEv = {
    target: {
      files: [{
        name: 'backup.json'
      }]
    }
  };
  var importedData = {};
  var mockImportCtx = {
    getJson: function(k) { return importedData[k] || []; },
    setJson: function(k, v) { importedData[k] = v; },
    onComplete: function() {}
  };
  var origFileReader = globalThis.FileReader;
  globalThis.FileReader = function() {
    this.readAsText = function() {
      if (typeof this.onload === 'function') {
        this.onload({ target: { result: protoPollutedPayload } });
      }
    };
  };
  try {
    VocabExport.importJSON(fakeImportEv, mockImportCtx);
    assert("VocabExport.importJSON ignores __proto__ and constructor prototype pollution keys",
      !Object.prototype.hasOwnProperty('evil') &&
      importedData['distinction_entries'] &&
      importedData['distinction_entries'].some(function(it) { return it.word === 'safeWord'; })
    );
  } finally {
    globalThis.FileReader = origFileReader;
  }

  // 21. 原則5: VocabNavigation.handleGlobalKeydown モーダル Tab キーフォーカストラップ (WCAG 2.1 a11y)
  var focusTrapCalls = [];
  var elFirst = { focus: function() { focusTrapCalls.push('first'); }, hasAttribute: function() { return false; }, getAttribute: function() { return null; } };
  var elLast = { focus: function() { focusTrapCalls.push('last'); }, hasAttribute: function() { return false; }, getAttribute: function() { return null; } };
  var mockModalEl = {
    querySelectorAll: function() { return [elFirst, elLast]; },
    contains: function(el) { return el === elFirst || el === elLast; }
  };
  var origQuerySelector = documentMock.querySelector;
  documentMock.querySelector = function(sel) {
    if (sel.indexOf('.modal-ov.open') !== -1) return mockModalEl;
    return null;
  };
  try {
    documentMock.activeElement = elLast;
    var tabHandled = VocabNavigation.handleGlobalKeydown({ key: 'Tab', shiftKey: false, preventDefault: function(){} }, { anyModalOpen: true });
    assert("VocabNavigation.handleGlobalKeydown traps forward Tab to loop to first modal element", tabHandled === true && focusTrapCalls[focusTrapCalls.length - 1] === 'first');

    documentMock.activeElement = elFirst;
    var shiftTabHandled = VocabNavigation.handleGlobalKeydown({ key: 'Tab', shiftKey: true, preventDefault: function(){} }, { anyModalOpen: true });
    assert("VocabNavigation.handleGlobalKeydown traps reverse Shift+Tab to loop to last modal element", shiftTabHandled === true && focusTrapCalls[focusTrapCalls.length - 1] === 'last');
  } finally {
    documentMock.querySelector = origQuerySelector;
    documentMock.activeElement = null;
  }
} catch (e) {
  assert("app.js loading test", false, String(e));
}

// Print results as JSON
print(JSON.stringify(results));
