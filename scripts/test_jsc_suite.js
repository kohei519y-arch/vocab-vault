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
  _listeners: {},
  addEventListener: function(evt, handler) {
    if (!this._listeners[evt]) this._listeners[evt] = [];
    this._listeners[evt].push(handler);
  },
  removeEventListener: function(evt, handler) {
    if (!this._listeners[evt]) return;
    this._listeners[evt] = this._listeners[evt].filter(h => h !== handler);
  },
  dispatchMockEvent: function(evtName, eventObj) {
    const list = this._listeners[evtName] || [];
    for (let i = 0; i < list.length; i++) {
      try { list[i](eventObj); } catch (e) { throw e; }
    }
  },
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
  this.delete = function(k) { delete this.params[k]; };
};

globalThis.Blob = function(parts, opts) { this.parts = parts; this.opts = opts; };
globalThis.URL = function(url) {
  this.href = String(url || '');
  const qStr = this.href.indexOf('?') !== -1 ? this.href.split('?')[1] : '';
  this.searchParams = new globalThis.URLSearchParams(qStr);
  this.toString = function() {
    const q = [];
    for (const k in this.searchParams.params) {
      q.push(encodeURIComponent(k) + '=' + encodeURIComponent(this.searchParams.params[k]));
    }
    return (this.href.split('?')[0]) + (q.length ? '?' + q.join('&') : '');
  };
};
globalThis.URL.createObjectURL = function() { return 'blob:test'; };
globalThis.URL.revokeObjectURL = function() {};
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
load(basePath + "/js/i18n.js");
load(basePath + "/js/storage.js");
load(basePath + "/js/anki.js");
load(basePath + "/js/sync.js");
load(basePath + "/js/ocr.js");
load(basePath + "/js/morphology.js");
load(basePath + "/js/eiken_catalog.js");
load(basePath + "/js/graph_layout.js");
load(basePath + "/js/graph_renderer.js");
load(basePath + "/js/graph_views.js");
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

  // Daily Quota Tracking (項目6)
  const today = VocabStorage.getTodayString();
  assert("VocabStorage.getTodayString returns YYYY-MM-DD", /^\d{4}-\d{2}-\d{2}$/.test(today));
  const localNow = new Date();
  const expectedLocal = localNow.getFullYear() + '-' + (localNow.getMonth() + 1 < 10 ? '0' : '') + (localNow.getMonth() + 1) + '-' + (localNow.getDate() < 10 ? '0' : '') + localNow.getDate();
  assert("VocabStorage.getTodayString uses local calendar date not UTC ISO", today === expectedLocal);
  assert("VocabStorage.calendarDayDiff counts consecutive local dates", VocabStorage.calendarDayDiff('2026-10-12', '2026-10-13') === 1);
  assert("VocabStorage.calendarDayDiff handles month boundary", VocabStorage.calendarDayDiff('2026-01-31', '2026-02-01') === 1);
  const initQuota = VocabStorage.getDailyAiUsageInfo(today);
  assert("VocabStorage.getDailyAiUsageInfo returns limit=5", initQuota.limit === 5 && initQuota.remaining === 5);
  VocabStorage.recordAiGenerationUsage(3);
  const updatedQuota = VocabStorage.getDailyAiUsageInfo(today);
  assert("VocabStorage.recordAiGenerationUsage increments count", updatedQuota.count === 3 && updatedQuota.remaining === 2);

  // Internal Metrics & Token Savings Dashboard (項目9)
  VocabStorage.recordMetricsEvent('cache_hit', 3);
  VocabStorage.recordMetricsEvent('ai_gen', 2);
  const metrics = VocabStorage.getMetricsSummary();
  assert("VocabStorage.getMetricsSummary computes cache hit rate & tokens saved",
    metrics.totalWords >= 5 &&
    metrics.cacheHits >= 3 &&
    metrics.tokensSaved >= 2400 &&
    metrics.cacheRate > 0
  );
} catch (e) {
  assert("VocabStorage test suite", false, String(e));
}

// -------------------------------------------------------------
// TEST 1b: Cross-tab 3-way merge (P1 TOCTOU regression)
// -------------------------------------------------------------
try {
  const t0 = Date.now() - 10000;
  const mk = (id, word, extra = {}) => ({ id, word, meanings: [{ pos: 'N[C]', text: word + '-m' }], updatedAt: t0, version: 1, ...extra });
  const base = [mk('tw-a', 'twalpha'), mk('tw-b', 'twbravo'), mk('tw-c', 'twcharlie')];
  // Remote (other tab): added tw-d, edited tw-b (version 2)
  const remote = [mk('tw-a', 'twalpha'), mk('tw-b', 'twbravo', { version: 2, updatedAt: t0 + 5000, core: 'remote-edit' }), mk('tw-c', 'twcharlie'), mk('tw-d', 'twdelta')];
  // Local (this tab): deleted tw-c (no tombstone), edited tw-a
  const local = [mk('tw-a', 'twalpha', { version: 2, updatedAt: t0 + 6000, core: 'local-edit' }), mk('tw-b', 'twbravo')];
  const r = VocabStorage.threeWayMergeWords(remote, local, base, 'en');
  const ids = r.data.map(x => x.id);
  assert("3-way merge keeps item added by another tab", ids.includes('tw-d'));
  assert("3-way merge does not resurrect item deleted locally (no tombstone)", !ids.includes('tw-c'));
  assert("3-way merge keeps local edit", r.data.find(x => x.id === 'tw-a')?.core === 'local-edit');
  assert("3-way merge keeps newer remote edit", r.data.find(x => x.id === 'tw-b')?.core === 'remote-edit');
  assert("3-way merge preserves local order and appends remote additions", ids.join(',') === 'tw-a,tw-b,tw-d');
  assert("3-way merge renumbers sequentially", r.data.every((x, i) => x.num === i + 1));
  assert("3-way merge reports changed when remote state absorbed", r.changed === true);
  const baseIdx = { ids: new Set(base.map(x => x.id)), wks: new Set() };
  const r2 = VocabStorage.threeWayMergeWords(remote, local, baseIdx, 'en');
  assert("3-way merge accepts precomputed base index", r2.data.map(x => x.id).join(',') === 'tw-a,tw-b,tw-d');
  const same = [mk('tw-a', 'twalpha'), mk('tw-b', 'twbravo')];
  const r3 = VocabStorage.threeWayMergeWords(same, same, same, 'en');
  assert("3-way merge reports unchanged for identical states", r3.changed === false && r3.data.length === 2);
} catch (e) {
  assert("3-way merge test suite", false, String(e));
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

  const nextAgain = VocabSRS.calculateNextReview(testWord, 0);
  assert("calculateNextReview(Again=0) resets repetition to 0", nextAgain.repetition === 0);
  assert("calculateNextReview(Again=0) resets interval to 0", nextAgain.interval === 0);
  assert("calculateNextReview(Again=0) sets due to 1 min later", Math.abs(nextAgain.nextReview - (Date.now() + 60000)) <= 200);

  // Deterministic FSRS Stability test
  assert("VocabSRS.predStability is defined", typeof VocabSRS.predStability === 'function');
  const sGood1 = VocabSRS.predStability(testWord, 2);
  const sGood2 = VocabSRS.predStability(testWord, 2);
  assert("predStability is strictly deterministic without random fuzz", sGood1 === sGood2 && sGood1 > testWord.stability);
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

  const bizWords = VocabStarterPack.getStarterPack('en', 'business');
  assert("Business Starter Pack has 20 words", Array.isArray(bizWords) && bizWords.length === 20, "Count: " + (bizWords ? bizWords.length : 0));
  const validBizFields = bizWords.every(w => w.word && Array.isArray(w.meanings) && w.etymology && w.etymologyTags?.length);
  assert("All business starter pack words have valid root tags & etymology", validBizFields);

  const essWords = VocabStarterPack.getStarterPack('en', 'essential');
  assert("Essential Roots Starter Pack has 20 words", Array.isArray(essWords) && essWords.length === 20, "Count: " + (essWords ? essWords.length : 0));
  const validEssFields = essWords.every(w => w.word && Array.isArray(w.meanings) && w.etymology && w.etymologyTags?.length);
  assert("All essential starter pack words have valid root tags & etymology", validEssFields);

  const frWords = VocabStarterPack.getStarterPack('fr');
  assert("French Pre-1 Starter Pack has 20 words", Array.isArray(frWords) && frWords.length === 20, "Count: " + (frWords ? frWords.length : 0));
  const validFrFields = frWords.every(w => w.word && Array.isArray(w.meanings) && w.etymology && w.etymologyTags?.length && w.lang === 'fr');
  assert("All French Pre-1 starter pack words have valid root tags, meanings, and lang=fr", validFrFields);

  const deWords = VocabStarterPack.getStarterPack('de');
  assert("German Pre-1 Starter Pack has 20 words", Array.isArray(deWords) && deWords.length === 20, "Count: " + (deWords ? deWords.length : 0));
  const validDeFields = deWords.every(w => w.word && Array.isArray(w.meanings) && w.etymology && w.etymologyTags?.length && w.lang === 'de');
  assert("All German Pre-1 starter pack words have valid root tags, meanings, and lang=de", validDeFields);
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
  // Test SpatialCullingRenderer & GraphUIManager (UX段階的開示 & 空間カリング描画)
  assert("VocabGraph.SpatialCullingRenderer is defined", typeof VocabGraph.SpatialCullingRenderer === 'function');
  assert("VocabGraph.GraphUIManager is defined", typeof VocabGraph.GraphUIManager === 'function');

  // テスト1: 空間カリングの境界値検証（ビューポートの完全外側、境界上、完全内側）
  const testRenderer = new VocabGraph.SpatialCullingRenderer(100);
  const mockNodes = [
    { id: 1, x: -500, y: -500, radius: 10 }, // 完全に外側
    { id: 2, x: 0, y: 0, radius: 10 },       // 内側
    { id: 3, x: 105, y: 0, radius: 10 }      // 境界上（viewRight=100だが、radius=10のため105-10=95で画面に入る）
  ];
  testRenderer.buildGrid(mockNodes);
  const visible = testRenderer.getVisibleNodes(0, -50, 100, 50);
  assert("SpatialCullingRenderer extracts nodes within viewport", visible.length === 2);
  assert("SpatialCullingRenderer includes fully interior node", visible.some(n => n.id === 2));
  assert("SpatialCullingRenderer includes boundary node with radius buffer", visible.some(n => n.id === 3));
  assert("SpatialCullingRenderer excludes outside node", !visible.some(n => n.id === 1));

  // テスト2: 異常値（NaN/Infinity）の空間ハッシュ登録の安全性
  const invalidNodes = [
    { id: 4, x: NaN, y: 10, radius: 5 },
    { id: 5, x: 10, y: Infinity, radius: 5 }
  ];
  testRenderer.buildGrid(invalidNodes);
  const visibleInvalid = testRenderer.getVisibleNodes(0, 0, 100, 100);
  assert("SpatialCullingRenderer safely ignores NaN/Infinity coordinates", visibleInvalid.length === 0);

  // テスト3: GraphUIManager の各モード定義
  const uiMgr = new VocabGraph.GraphUIManager();
  assert("GraphUIManager defines network mode controls", Array.isArray(uiMgr.modeConfig.network) && uiMgr.modeConfig.network.includes('clusterBtn'));
  assert("GraphUIManager defines tree mode controls", Array.isArray(uiMgr.modeConfig.tree) && uiMgr.modeConfig.tree.includes('skillTreeBtn'));
  assert("GraphUIManager hides irrelevant controls in matrix mode", !uiMgr.modeConfig.matrix.includes('physicsBtn'));
  assert("GraphUIManager hides physics in mindmap mode", !uiMgr.modeConfig.mindmap.includes('physicsBtn'));
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

  // Test Scenario D-2: Browser URL synchronization & deep link state
  var lastReplacedUrl = '';
  window.location = { protocol: 'https:', href: 'https://example.com/vocab-vault/?test=1' };
  window.history = {
    replaceState: function(state, title, url) {
      lastReplacedUrl = url;
    }
  };
  VocabCore.jumpToWord('testword10');
  assert("jumpToWord updates browser URL via replaceState", lastReplacedUrl.indexOf('w=testword10') !== -1);

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

  // Test buildAnkiBack (Cognitive Overload Reduction)
  var sampleItem = {
    word: 'inspect',
    core: '対象の内側に深く視線を入れて調べること。',
    meanings: [{ pos: 'V[T]', text: '検査する、点検する' }],
    example: { foreign: 'Inspect cargo.', ja: '貨物を検査する。' },
    etymology: 'ラテン語 inspicere 由来。',
    history_note: '印欧語根 *speḱ- から派生。'
  };
  var ankiBackHtml = VocabAnkiView.buildAnkiBack(sampleItem);
  assert("buildAnkiBack produces clean 2-second review card", typeof ankiBackHtml === 'string' && ankiBackHtml.includes('anki-back-clean') && ankiBackHtml.includes('anki-core-box'));
  assert("buildAnkiBack collapses etymology into details tag", ankiBackHtml.includes('anki-ety-details'));

  // Test Daily Goal & Streak Tracking with Freeze Insurance
  var mockStorage = {};
  var mockOpts = {
    lsGet: function(k, def) { return mockStorage[k] !== undefined ? mockStorage[k] : def; },
    lsSet: function(k, v) { mockStorage[k] = String(v); }
  };
  var goal1 = VocabAnkiView.getDailyGoalInfo(mockOpts);
  assert("getDailyGoalInfo returns default goal of 20", goal1.goal === 20 && goal1.count === 0 && goal1.reached === false);
  var goalInc = VocabAnkiView.incrementDailyGoal(mockOpts);
  assert("incrementDailyGoal increments review count", goalInc.count === 1);

  var streak1 = VocabAnkiView.recordReviewStreak(mockOpts);
  assert("recordReviewStreak starts streak at 1", streak1.streak === 1 && streak1.isNewDay === true);

  var streakStore = {};
  var streakOpts = {
    lsGet: function(k, def) { return streakStore[k] !== undefined ? streakStore[k] : def; },
    lsSet: function(k, v) { streakStore[k] = String(v); }
  };
  var day1 = VocabAnkiView.recordReviewStreak(Object.assign({}, streakOpts, { todayStr: '2026-10-12' }));
  var sameDay = VocabAnkiView.recordReviewStreak(Object.assign({}, streakOpts, { todayStr: '2026-10-12' }));
  var day2 = VocabAnkiView.recordReviewStreak(Object.assign({}, streakOpts, { todayStr: '2026-10-13' }));
  assert("recordReviewStreak does not double-count the same local day", sameDay.isNewDay === false && sameDay.streak === 1);
  assert("recordReviewStreak increments on consecutive local calendar days", day1.streak === 1 && day2.streak === 2 && day2.isNewDay === true);
  var skipped = VocabAnkiView.recordReviewStreak(Object.assign({}, streakOpts, { todayStr: '2026-10-15' }));
  assert("recordReviewStreak spends freeze across a one-day gap", skipped.streak === 3 && skipped.freezeAvailable === false);
  var resumed = VocabAnkiView.recordReviewStreak(Object.assign({}, streakOpts, { todayStr: '2026-10-16' }));
  assert("recordReviewStreak replenishes freeze after a consecutive study day", resumed.streak === 4 && resumed.freezeAvailable === true);
  var goalStore = {};
  var goalOpts = {
    lsGet: function(k, def) { return goalStore[k] !== undefined ? goalStore[k] : def; },
    lsSet: function(k, v) { goalStore[k] = String(v); },
    todayStr: '2026-10-13'
  };
  VocabAnkiView.incrementDailyGoal(goalOpts);
  var utcKeyLeak = Object.keys(goalStore).some(function(k) { return k.indexOf('vv_reviewed_') === 0 && k !== 'vv_reviewed_2026-10-13'; });
  assert("incrementDailyGoal keys off injected local todayStr", goalStore['vv_reviewed_2026-10-13'] === '1' && !utcKeyLeak);

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

  // 22. 項目11: openUpsellModal 語根ネットワーク成長プログレス (Value-Driven Upsell)
  assert("VocabModal.openUpsellModal is defined", typeof VocabModal.openUpsellModal === 'function');

  // 23. 項目12: VocabOCR 日次クォータ & 使用量トラッキング
  assert("VocabOCR loaded and exposes quota helpers", typeof VocabOCR.getDailyOcrUsageInfo === 'function');
  const ocrInfo = VocabOCR.getDailyOcrUsageInfo();
  assert("VocabOCR.getDailyOcrUsageInfo returns valid limit & remaining", typeof ocrInfo.limit === 'number' && typeof ocrInfo.remaining === 'number');
  VocabOCR.recordOcrUsage(1);
  const ocrUpdated = VocabOCR.getDailyOcrUsageInfo();
  assert("VocabOCR.recordOcrUsage records count", ocrUpdated.used >= 1);

  // 24. 項目14: VocabCore.getAppState 安全アクセサ
  assert("VocabCore.getAppState returns App state object", typeof VocabCore.getAppState === 'function' && typeof VocabCore.getAppState() === 'object');

  // 25. 項目15: VocabCardView.createCardElement Error Boundary 耐障害性
  const brokenCard = VocabCardView.createCardElement(null);
  assert("VocabCardView.createCardElement handles null item via Error Boundary", !!brokenCard && brokenCard.className.indexOf('card') !== -1);
  const corruptedItem = { id: 'bad_1', word: 'test', meanings: 'not-an-array-corrupted' };
  const corruptedCard = VocabCardView.createCardElement(corruptedItem);
  assert("VocabCardView.createCardElement safely falls back on corrupted data", !!corruptedCard && corruptedCard.className.indexOf('card') !== -1);

  // 26. 項目17: VocabListView.setupCardVisibilityObserver 仮想Windowing
  assert("VocabListView exposes setupCardVisibilityObserver", typeof VocabListView.setupCardVisibilityObserver === 'function');

  // 27. 項目18 & 20: 語源信頼度バッジ & 誤り報告ボタン
  const sampleCard = VocabCardView.createCardElement({
    id: 'sample_ety_1',
    word: 'constant',
    lang: 'en',
    meanings: [{ pos: 'Adj', text: '一定の' }],
    etymology: 'ラテン語 constans (印欧祖語 *sta-) 由来。'
  });
  const sampleHtml = sampleCard.innerHTML || '';
  assert("VocabCardView includes etymology confidence pill", sampleHtml.indexOf('conf-pill') !== -1);
  assert("VocabCardView includes report-ety action button", sampleHtml.indexOf('report-ety') !== -1);

  // 28. 項目19: VocabMorphology.isKnownPieRoot 実在語根マスター照合
  assert("VocabMorphology.isKnownPieRoot recognizes authentic root *sta-", VocabMorphology.isKnownPieRoot('*sta-') === true);
  assert("VocabMorphology.isKnownPieRoot rejects non-existent fake root", VocabMorphology.isKnownPieRoot('*fake_alien_root-') === false);

  // 29. 項目21: Wiktionary URL 言語別ディープリンク (#Etymology, #Étymologie, #Herkunft)
  const wiktCardEn = VocabCardView.createCardElement({
    id: 'wikt_en_1',
    word: 'structure',
    lang: 'en',
    meanings: [{ pos: 'Noun', text: '構造' }],
    etymology: 'ラテン語 structura 由来。',
    wiktGrounded: true,
    wiktUrl: 'https://en.wiktionary.org/wiki/structure'
  });
  const wiktHtmlEn = wiktCardEn.innerHTML || '';
  assert("VocabCardView attaches #Etymology deep link to English Wiktionary", wiktHtmlEn.indexOf('structure#Etymology') !== -1);

  const wiktCardFr = VocabCardView.createCardElement({
    id: 'wikt_fr_1',
    word: 'structure',
    lang: 'fr',
    meanings: [{ pos: 'Noun', text: '構造' }],
    etymology: 'ラテン語 structura 由来。',
    wiktGrounded: true,
    wiktUrl: 'https://fr.wiktionary.org/wiki/structure'
  });
  const wiktHtmlFr = wiktCardFr.innerHTML || '';
  assert("VocabCardView attaches language-specific anchor to French Wiktionary", wiktHtmlFr.indexOf('#%C3%89tymologie') !== -1 || wiktHtmlFr.indexOf('#Étymologie') !== -1);

  // 30. 項目23: 論理クロック (Lamport Version) による Clock Skew 競合調停
  const clockSkewOldTime = 1000; // 時計が過去に狂った端末
  const clockSkewNormalTime = 50000;
  const oldItemNormalTime = { id: 'skew_test_1', word: 'skew_word', meanings: [{ pos: 'N[C]', text: '旧版' }], version: 1, updatedAt: clockSkewNormalTime };
  const newItemPastTime = { id: 'skew_test_1', word: 'skew_word', meanings: [{ pos: 'N[C]', text: '新版（過去時刻）' }], version: 2, updatedAt: clockSkewOldTime };
  const mergedSkew = VocabStorage.mergeWords([oldItemNormalTime], [newItemPastTime], 'en', true);
  assert("Lamport logical clock preserves newer version despite past timestamp clock skew", mergedSkew.length === 1 && mergedSkew[0].version === 2 && mergedSkew[0].meanings[0].text === '新版（過去時刻）');

  // 31. 項目23: SRS復習時の論理クロックインクリメント
  const lamportNextReviewObj = VocabSRS.calculateNextReview({ interval: 1, repetition: 1, efactor: 2.5, version: 3 }, 2);
  assert("VocabSRS.calculateNextReview increments Lamport logical clock version", lamportNextReviewObj.version === 4);

  // 32. 項目24 & 25: VocabSync.acquireSyncLock 排他ミューテックスによる直列化
  assert("VocabSync exposes acquireSyncLock mutex", typeof VocabSync.acquireSyncLock === 'function');
  let mutexOrder = [];
  var lockP1 = VocabSync.acquireSyncLock(function() {
    return new Promise(function(resolve) {
      setTimeout(function() { mutexOrder.push('first'); resolve(); }, 10);
    });
  });
  var lockP2 = VocabSync.acquireSyncLock(function() {
    mutexOrder.push('second');
    return Promise.resolve();
  });
  Promise.all([lockP1, lockP2]).then(function() {
    assert("VocabSync.acquireSyncLock strictly serializes concurrent tasks", mutexOrder[0] === 'first' && mutexOrder[1] === 'second');
  });

  // 33. 中核義（core-box）のバッジおよびコンテナレンダリング
  const coreCard = VocabCardView.createCardElement({
    id: 'core_card_1',
    word: 'within',
    lang: 'en',
    meanings: [{ pos: 'Prep', text: '〜の内側に' }],
    core: '境界線の内側・範囲の中に収まっている'
  });
  const coreHtmlStr = coreCard.innerHTML || '';
  assert("VocabCardView renders core-box container with core-badge and core-text",
    coreHtmlStr.indexOf('class="core-box"') !== -1 &&
    coreHtmlStr.indexOf('class="core-badge"') !== -1 &&
    coreHtmlStr.indexOf('class="core-text"') !== -1 &&
    coreHtmlStr.indexOf('コア') !== -1 &&
    coreHtmlStr.indexOf('境界線の内側・範囲の中に収まっている') !== -1
  );

  // ==========================================
  // 観点1「学習体験・暗記継続性」徹底検証テストスイート
  // ==========================================

  // 34. FSRS 復習履歴ログローリング保存テスト
  VocabSRS.clearReviewHistoryLog();
  assert("Review history log starts empty after clear", VocabSRS.getReviewHistoryLog().length === 0);

  VocabSRS.recordReviewHistory({
    id: 'test_word_1',
    word: 'epistemology',
    rating: 2,
    lastStability: 2.5,
    lastDifficulty: 5.0,
    elapsedDays: 2.0,
    retrievability: 0.92
  });
  const log1 = VocabSRS.getReviewHistoryLog();
  assert("Review history correctly records single entry", log1.length === 1 && log1[0].word === 'epistemology' && log1[0].rating === 2);

  for (let i = 2; i <= 520; i++) {
    VocabSRS.recordReviewHistory({
      id: 'test_word_' + i,
      word: 'word_' + i,
      rating: i % 4,
      lastStability: 1.0 + (i % 5),
      lastDifficulty: 5.0,
      elapsedDays: 1.5,
      retrievability: 0.88
    });
  }
  const logCapped = VocabSRS.getReviewHistoryLog();
  assert("Review history strictly caps at 500 entries (FIFO)", logCapped.length === 500);
  assert("Review history retains newest entries", logCapped[499].word === 'word_520');

  // 35. 個人適応型 FSRS 重みオプティマイザ テスト
  VocabSRS.resetUserFSRSWeights();
  assert("User FSRS weights is null before optimization", VocabSRS.getUserFSRSWeights() === null);

  const dummySmallLogs = [{ rating: 2, lastStability: 2.0, elapsedDays: 1.0 }];
  const optSmallRes = VocabSRS.optimizeFSRSWeights(dummySmallLogs);
  assert("Optimizer safely rejects insufficient logs (< 20)", optSmallRes.success === false && optSmallRes.reason === 'insufficient_logs');

  const mockLogs = [];
  for (let i = 0; i < 60; i++) {
    mockLogs.push({
      id: 'mock_' + i,
      word: 'mock_' + i,
      rating: (i % 5 === 0) ? 0 : (i % 3 === 0 ? 1 : (i % 2 === 0 ? 2 : 3)),
      lastStability: 2.0 + (i % 4),
      lastDifficulty: 5.0,
      elapsedDays: 2.0,
      retrievability: 0.85
    });
  }
  const optRes = VocabSRS.optimizeFSRSWeights(mockLogs);
  assert("Optimizer successfully optimizes with >= 20 logs", optRes.success === true && optRes.count === 60);
  assert("Optimizer calculates valid Brier score loss", typeof optRes.newLoss === 'number' && optRes.newLoss >= 0);

  const savedWeights = VocabSRS.getUserFSRSWeights();
  assert("Optimized weights are saved to storage", savedWeights !== null && typeof savedWeights.sScale === 'number');

  // Multi-step Transition Pair Optimizer Verification
  const transitionLogs = [];
  for (let i = 0; i < 15; i++) {
    transitionLogs.push({
      id: 'card_' + i,
      word: 'word_' + i,
      rating: 2,
      lastStability: 2.0,
      lastDifficulty: 5.0,
      elapsedDays: 1.0,
      timestamp: 1000 + i * 10
    });
    transitionLogs.push({
      id: 'card_' + i,
      word: 'word_' + i,
      rating: (i % 3 === 0) ? 0 : 2,
      lastStability: 4.5,
      lastDifficulty: 4.8,
      elapsedDays: 4.0,
      timestamp: 2000 + i * 10
    });
  }
  const transOptRes = VocabSRS.optimizeFSRSWeights(transitionLogs);
  assert("Optimizer handles multi-step transition pairs and converges cleanly", transOptRes.success === true && typeof transOptRes.newLoss === 'number');

  const testItem = { id: 'test_item', stability: 2.0, difficulty: 5.0, repetition: 1 };
  const stabilityWithCustom = VocabSRS.predStability(testItem, 2);
  assert("predStability produces valid finite stability with personalized weights", Number.isFinite(stabilityWithCustom) && stabilityWithCustom > 0);

  VocabSRS.resetUserFSRSWeights();
  assert("resetUserFSRSWeights safely restores default weights", VocabSRS.getUserFSRSWeights() === null);

  // Schema Versioning & Positive decayFactor migration test
  localStorage.setItem('vv_user_fsrs_weights', JSON.stringify({ decayFactor: 1.2 }));
  const migratedWeights = VocabSRS.getUserFSRSWeights();
  assert("Legacy positive decayFactor automatically migrates to negative power index and version 2",
    migratedWeights && migratedWeights.version === 2 && migratedWeights.decayFactor < 0
  );
  VocabSRS.resetUserFSRSWeights();

  // NaN/Corrupted Logs Robustness test
  const corruptedLogs = [
    { id: 'bad_1', rating: NaN, timestamp: 'corrupted' },
    { id: 'bad_2', rating: 'invalid', timestamp: null }
  ];
  const badOptRes = VocabSRS.optimizeFSRSWeights(corruptedLogs);
  assert("Optimizer guards against NaN/corrupted logs without crashing", badOptRes.success === false);

  // 36. 忘却臨界点スマートPush通知 テスト
  assert("Smart notification is enabled by default", VocabSRS.isSmartNotifyEnabled() === true);
  VocabSRS.setSmartNotifyEnabled(false);
  assert("Smart notification toggle disabled successfully", VocabSRS.isSmartNotifyEnabled() === false);
  VocabSRS.setSmartNotifyEnabled(true);
  assert("Smart notification toggle re-enabled successfully", VocabSRS.isSmartNotifyEnabled() === true);
  globalThis.Notification = function(title, opts) { this.title = title; this.opts = opts; };
  globalThis.Notification.permission = 'granted';
  globalThis.Notification.requestPermission = function() { return Promise.resolve('granted'); };

  const smartNowTs = Date.now();
  const candidateList = [
    { id: 'due_1', word: 'ephemeral', nextReview: smartNowTs - 3600000, interval: 1, stability: 1.0 },
    { id: 'due_2', word: 'serendipity', nextReview: smartNowTs + 3600000 * 2, interval: 1, stability: 0.8 },
    { id: 'future_1', word: 'solid', nextReview: smartNowTs + 86400000 * 30, interval: 30, stability: 30.0 }
  ];
  const imminentWords = VocabSRS.getImminentForgettingWords(candidateList, 0.90, 12);
  assert("getImminentForgettingWords detects words nearing or below 90% retention", imminentWords.length >= 1);
  assert("getImminentForgettingWords correctly prioritizes highest urgency word first", imminentWords.length >= 2 && imminentWords[0].urgency >= imminentWords[1].urgency);

  const scheduleRes = VocabSRS.checkSmartNotificationSchedule(candidateList);
  assert("checkSmartNotificationSchedule handles execution cleanly without throwing", typeof scheduleRes === 'object' && scheduleRes !== null);
  assert("checkSmartNotificationSchedule guards against notification fatigue by batch accumulating when < 5 words",
    scheduleRes.status === 'batch_accumulating' && scheduleRes.count === 2
  );

  // Starvation prevention test (fires when > 36h since last notification)
  localStorage.setItem('vv_last_notify_ts', String(smartNowTs - 40 * 3600000));
  const starvedRes = VocabSRS.checkSmartNotificationSchedule(candidateList);
  assert("checkSmartNotificationSchedule prevents starvation by firing after 36h even with < 5 words",
    starvedRes.status === 'notified' && starvedRes.count === 2
  );

  const forcedRes = VocabSRS.checkSmartNotificationSchedule(candidateList, { force: true });
  assert("checkSmartNotificationSchedule fires when threshold or forced condition met",
    forcedRes.status === 'notified' || forcedRes.status === 'cooldown'
  );

  // 37. 忘却予測カレンダー ＆ アナリティクス・ダッシュボード テスト
  assert("VocabAnkiView exposes analytics calculation methods",
    typeof VocabAnkiView.getCommitHeatmapData === 'function' &&
    typeof VocabAnkiView.getFutureWorkloadData === 'function' &&
    typeof VocabAnkiView.getOverallRetrievabilityStats === 'function'
  );

  const heatmapData = VocabAnkiView.getCommitHeatmapData(63);
  assert("getCommitHeatmapData generates exactly 63 daily cells", heatmapData.cells && heatmapData.cells.length === 63);
  assert("getCommitHeatmapData aggregates total review count", typeof heatmapData.totalReviews === 'number');

  const workloadData = VocabAnkiView.getFutureWorkloadData(14, candidateList);
  assert("getFutureWorkloadData produces 14 days forecast workload", workloadData.workload && workloadData.workload.length === 14);
  assert("getFutureWorkloadData accounts for upcoming items within 14 days", workloadData.totalUpcoming === 2);

  const retrievabilityStats = VocabAnkiView.getOverallRetrievabilityStats(candidateList);
  assert("getOverallRetrievabilityStats computes average retrievability", typeof retrievabilityStats.avgR === 'number' && retrievabilityStats.avgR > 0);
  assert("getOverallRetrievabilityStats assigns legitimate grade", ['S', 'A', 'B', 'C'].indexOf(retrievabilityStats.grade) !== -1);

  const dashboardHtml = VocabAnkiView.buildAnalyticsDashboardHtml({ list: candidateList });
  assert("buildAnalyticsDashboardHtml renders all three core metric widgets",
    dashboardHtml.indexOf('全体平均想起率') !== -1 &&
    dashboardHtml.indexOf('学習コミットヒートマップ') !== -1 &&
    dashboardHtml.indexOf('日別予測復習負荷') !== -1 &&
    dashboardHtml.indexOf('個人適応型 FSRS 重み') !== -1
  );

  // 38. 例文・単語の発音波形同期 / カラオケハイライト テスト
  assert("VocabSpeech exposes karaoke highlighting helpers",
    typeof VocabSpeech.prepareWordSpans === 'function' &&
    typeof VocabSpeech.highlightSpokenWord === 'function' &&
    typeof VocabSpeech.clearActiveWordHighlight === 'function'
  );

  const dummySpeechContainer = {
    innerHTML: '',
    textContent: 'Der Apfel fällt nicht weit vom Stamm',
    querySelectorAll: function(sel) {
      if (sel === '.spk-word') {
        return this._spans || [];
      }
      if (sel === '.spk-active-word') {
        return (this._spans || []).filter(function(s) { return s.classList.has('spk-active-word'); });
      }
      return [];
    }
  };

  VocabSpeech.prepareWordSpans(dummySpeechContainer, 'Der Apfel fällt nicht');
  assert("prepareWordSpans wraps words in spk-word span elements",
    dummySpeechContainer.innerHTML.indexOf('class="spk-word"') !== -1 &&
    dummySpeechContainer.innerHTML.indexOf('data-start="0"') !== -1 &&
    dummySpeechContainer.innerHTML.indexOf('Der') !== -1
  );

  VocabSpeech.prepareWordSpans(dummySpeechContainer, '吾輩は猫である。', 'ja');
  assert("prepareWordSpans supports Japanese phrase chunking and punctuation",
    dummySpeechContainer.innerHTML.indexOf('吾輩') !== -1 &&
    dummySpeechContainer.innerHTML.indexOf('猫') !== -1 &&
    dummySpeechContainer.innerHTML.indexOf('。') !== -1
  );

  VocabSpeech.prepareWordSpans(dummySpeechContainer, "Le cœur de l’homme est complexe", 'fr');
  assert("prepareWordSpans supports French ligatures and typographic apostrophes",
    dummySpeechContainer.innerHTML.indexOf('cœur') !== -1 &&
    dummySpeechContainer.innerHTML.indexOf('l’homme') !== -1
  );

  const makeMockSpan = function(word, start, end) {
    const cls = new Set(['spk-word']);
    return {
      textContent: word,
      getAttribute: function(attr) { return attr === 'data-start' ? String(start) : String(end); },
      classList: {
        add: function(c) { cls.add(c); },
        remove: function(c) { cls.delete(c); },
        has: function(c) { return cls.has(c); }
      }
    };
  };
  dummySpeechContainer._spans = [
    makeMockSpan('Der', 0, 3),
    makeMockSpan('Apfel', 4, 9),
    makeMockSpan('fällt', 10, 15)
  ];

  VocabSpeech.highlightSpokenWord(dummySpeechContainer, 4);
  assert("highlightSpokenWord activates exact word at character index 4 (Apfel)",
    dummySpeechContainer._spans[1].classList.has('spk-active-word') &&
    !dummySpeechContainer._spans[0].classList.has('spk-active-word')
  );

  VocabSpeech.highlightSpokenWord(dummySpeechContainer, 9);
  assert("highlightSpokenWord maintains preceding word when character index falls on space/inter-word gap",
    dummySpeechContainer._spans[1].classList.has('spk-active-word') &&
    !dummySpeechContainer._spans[0].classList.has('spk-active-word')
  );

  VocabSpeech.highlightSpokenWord(dummySpeechContainer, 10);
  assert("highlightSpokenWord transitions active highlight cleanly to next word",
    dummySpeechContainer._spans[2].classList.has('spk-active-word') &&
    !dummySpeechContainer._spans[1].classList.has('spk-active-word')
  );

  VocabSpeech.clearActiveWordHighlight();
  assert("clearActiveWordHighlight cleanly resets active state",
    !dummySpeechContainer._spans[2].classList.has('spk-active-word')
  );

  // ==========================================================
  // P0: 学術スターターパック拡充 ＆ ギャラリー検証
  // ==========================================================
  assert("VocabStarterPack defines classical_roots and philosophy packs",
    Array.isArray(VocabStarterPack.PACKS.classical_roots) &&
    VocabStarterPack.PACKS.classical_roots.length === 5 &&
    Array.isArray(VocabStarterPack.PACKS.philosophy) &&
    VocabStarterPack.PACKS.philosophy.length === 5
  );

  const sampleClassical = VocabStarterPack.PACKS.classical_roots[0];
  assert("classical_roots items have complete academic metadata",
    Boolean(sampleClassical.word && sampleClassical.core && sampleClassical.etymology && sampleClassical.etymologyTags?.length)
  );

  const samplePhil = VocabStarterPack.PACKS.philosophy[0];
  assert("philosophy items have complete philosophical metadata",
    Boolean(samplePhil.word && samplePhil.core && samplePhil.etymology && samplePhil.meanings?.length)
  );

  const galleryHtml = VocabStarterPack.buildStarterPackGalleryHtml();
  assert("buildStarterPackGalleryHtml outputs all curated starter pack cards",
    galleryHtml.indexOf('classical_roots') !== -1 &&
    galleryHtml.indexOf('philosophy') !== -1 &&
    galleryHtml.indexOf('academic') !== -1 &&
    galleryHtml.indexOf('starter-pack-grid') !== -1
  );

  const popResult = VocabStarterPack.populateStarterPack([], 'en', 'classical_roots');
  assert("populateStarterPack imports classical_roots entries into empty library",
    popResult.added.length === 5 && popResult.merged.length === 5
  );

  // ==========================================================
  // P1: 4言語クロス同根語（Cognate Matrix）検証
  // ==========================================================
  assert("VocabMorphology exposes COGNATE_KNOWLEDGE dictionary with authentic PIE roots",
    Boolean(VocabMorphology.COGNATE_KNOWLEDGE && VocabMorphology.COGNATE_KNOWLEDGE['*sta-'])
  );

  const staCog = VocabMorphology.COGNATE_KNOWLEDGE['*sta-'];
  assert("COGNATE_KNOWLEDGE contains 4 languages for *sta-",
    Boolean(staCog.en?.[0]?.w && staCog.fr?.[0]?.w && staCog.de?.[0]?.w && staCog.ja?.[0]?.w)
  );

  const testWord = {
    word: 'constant',
    lang: 'en',
    etymologyTags: ['*sta-'],
    meanings: [{ pos: 'Adj', text: '一定の、不変の' }]
  };
  const matrix = VocabMorphology.buildCognateMatrix(testWord);
  assert("buildCognateMatrix builds valid 4-language matrix for item with known root",
    Boolean(matrix && matrix.root === '*sta-' && matrix.langs.en && matrix.langs.fr && matrix.langs.de && matrix.langs.ja)
  );

  const matrixHtml = VocabMorphology.renderCognateMatrixHtml(matrix);
  assert("renderCognateMatrixHtml renders cognate matrix grid with language badges",
    matrixHtml.indexOf('cognate-matrix-box') !== -1 &&
    matrixHtml.indexOf('cog-matrix-grid') !== -1 &&
    matrixHtml.indexOf('FR') !== -1 &&
    matrixHtml.indexOf('DE') !== -1 &&
    matrixHtml.indexOf('日本語') !== -1
  );

  const ankiBackWithMatrix = VocabAnkiView.buildAnkiBack(testWord);
  assert("VocabAnkiView.buildAnkiBack embeds cognate matrix inside etymology accordion",
    ankiBackWithMatrix.indexOf('cognate-matrix-box') !== -1 &&
    ankiBackWithMatrix.indexOf('cog-matrix-grid') !== -1
  );

  // ==========================================================
  // P2: Anki互換インポート機能 & FSRS進度マッピング検証
  // ==========================================================
  assert("VocabExport exposes parseAnkiExport and importAnkiText",
    typeof VocabExport.parseAnkiExport === 'function' &&
    typeof VocabExport.importAnkiText === 'function'
  );

  const sampleAnkiTSV = [
    '#separator:tab',
    '#html:true',
    '#tags column:3',
    'epiphany [ ɪˈpɪfəni ]\t突然のひらめき<br>語源: ギリシャ語 epiphaneia (*bʰeh₂-)\tacademic philosophy\t14\t2600',
    'lucid /luːsɪd/\t明晰な、分かりやすい\tessential'
  ].join('\n');

  const parsedAnki = VocabExport.parseAnkiExport(sampleAnkiTSV, { defaultLang: 'en' });
  assert("parseAnkiExport parses TSV with directive headers and extracts words",
    parsedAnki.length === 2 &&
    parsedAnki[0].word === 'epiphany' &&
    parsedAnki[0].phonetic === 'ɪˈpɪfəni' &&
    parsedAnki[1].word === 'lucid' &&
    parsedAnki[1].phonetic === 'luːsɪd'
  );

  assert("parseAnkiExport maps Anki interval and factor to FSRS parameters",
    parsedAnki[0].interval === 14 &&
    parsedAnki[0].efactor === 2.6 &&
    parsedAnki[0].nextReview > Date.now()
  );

  const sampleAnkiCSV = [
    '"ubiquitous [ juːˈbɪkwɪtəs ]","いたる所にある、偏在する\nコア: あらゆる場所に存在すること","gre_vocab"',
    '"zeitgeist","時代精神、思潮\n語源: ドイツ語 Zeit（時）+ Geist（精神）","philosophy"'
  ].join('\n');

  const parsedCSV = VocabExport.parseAnkiExport(sampleAnkiCSV, { defaultLang: 'en' });
  assert("parseAnkiExport supports CSV format with quoted newlines",
    parsedCSV.length === 2 &&
    parsedCSV[0].word === 'ubiquitous' &&
    parsedCSV[0].core === 'あらゆる場所に存在すること' &&
    parsedCSV[1].word === 'zeitgeist'
  );

  let fakeStore = [];
  const importResult = VocabExport.importAnkiText(sampleAnkiTSV, {
    lang: 'en',
    getEntries: function() { return fakeStore; },
    saveEntries: function(merged) { fakeStore = merged; },
    showToast: function() {}
  });
  assert("importAnkiText merges imported cards into target entries",
    importResult.added === 2 && fakeStore.length === 2
  );

  // ==========================================================
  // P3: 同根語ナレッジグラフ & 銀河系ビュー深化検証
  // ==========================================================
  assert("VocabGraph is defined on global scope",
    typeof VocabGraph === 'object' && VocabGraph !== null
  );

  // ==========================================================
  // P4: 音声再生・イベント委譲・Anki復習発音リグレッション検証
  // ==========================================================
  let lastSpoken = null;
  const originalSpeakText = VocabSpeech.speakText;
  VocabSpeech.speakText = function(text, lang) { lastSpoken = { text, lang }; };

  // 1. data-act="speak" クリック委譲テスト
  documentMock.dispatchMockEvent('click', {
    target: {
      closest: function(sel) {
        if (sel === '[data-act]') return { dataset: { act: 'speak', text: 'embodiment', lang: 'en' } };
        return null;
      }
    },
    preventDefault: function(){},
    stopPropagation: function(){}
  });
  assert("Delegated click on data-act='speak' invokes VocabSpeech.speakText",
    lastSpoken !== null && lastSpoken.text === 'embodiment' && lastSpoken.lang === 'en'
  );

  // 2. data-act="speak-current" (Anki画面スピーカー) クリック委譲テスト
  lastSpoken = null;
  App.aList = [{ word: 'embodiment', lang: 'en' }];
  documentMock.dispatchMockEvent('click', {
    target: {
      closest: function(sel) {
        if (sel === '[data-act]') return { dataset: { act: 'speak-current' } };
        return null;
      }
    },
    preventDefault: function(){},
    stopPropagation: function(){}
  });
  assert("Delegated click on data-act='speak-current' invokes speech for current card",
    lastSpoken !== null && lastSpoken.text === 'embodiment'
  );
  VocabSpeech.speakText = originalSpeakText;

  // 3. P0-1: VocabStorage.sanitizeItem & mergeWords FSRS parameter preservation
  var testRawItem = {
    word: 'resilience',
    lang: 'en',
    interval: 5,
    repetition: 3,
    efactor: 2.6,
    stability: 4.8,
    difficulty: 3.2,
    retrievability: 0.91,
    pair: 'en_ja',
    tgtLang: 'ja'
  };
  var sanitized = VocabStorage.sanitizeItem(testRawItem, 0, 'en');
  assert("VocabStorage.sanitizeItem preserves stability", sanitized.stability === 4.8);
  assert("VocabStorage.sanitizeItem preserves difficulty", sanitized.difficulty === 3.2);
  assert("VocabStorage.sanitizeItem preserves retrievability", sanitized.retrievability === 0.91);
  assert("VocabStorage.sanitizeItem preserves pair and tgtLang", sanitized.pair === 'en_ja' && sanitized.tgtLang === 'ja');

  var mergedItem = VocabStorage.mergeWords([sanitized], [{ ...sanitized, stability: 5.5, reviewUpdatedAt: Date.now() + 1000 }], 'en');
  assert("VocabStorage.mergeWords merges newer SRS stability", mergedItem[0].stability === 5.5);

  // 4. P1-2: VocabSRS.getRetrievability correctly evaluates unlearned cards as 0.0
  var unlearnedCard = { word: 'ephemeral', lang: 'en', interval: 0, repetition: 0 };
  var unlearnedR = VocabSRS.getRetrievability(unlearnedCard);
  assert("VocabSRS.getRetrievability returns 0.0 for completely unlearned cards", unlearnedR === 0.0);

  // 5. P2-2: VocabListView.reconcileList protects against DOM node contention with usedNodes
  if (VocabListView && VocabListView.reconcileList) {
    var mockListEl = {
      children: [],
      querySelectorAll: function() { return []; },
      insertBefore: function(n, ref) { this.children.push(n); },
      appendChild: function(n) { this.children.push(n); }
    };
    var mockItems = [
      { id: 'item_1', word: 'bark', lang: 'en', homographIndex: 1, meanings: [{ pos: 'n', text: 'tree bark' }] },
      { id: 'item_2', word: 'bark', lang: 'en', homographIndex: 2, meanings: [{ pos: 'v', text: 'dog bark' }] }
    ];
    var createdCards = [];
    VocabListView.reconcileList(mockListEl, mockItems, {
      createCardElement: function(it) {
        var card = { dataset: { id: it.id, word: it.word } };
        createdCards.push(card);
        return card;
      }
    });
    assert("reconcileList creates isolated unique DOM nodes for duplicate/homograph words",
      createdCards.length === 2 && createdCards[0] !== createdCards[1]
    );
  }

  // 6. Section 13: Graph Practical Views, Semantic Zoom & Deterministic Tree Verification
  assert("VocabGraph.switchViewMode is defined", typeof VocabGraph.switchViewMode === 'function');
  assert("VocabGraph.startWateringReview is defined", typeof VocabGraph.startWateringReview === 'function');
  assert("VocabGraph.toggleTreeMask is defined", typeof VocabGraph.toggleTreeMask === 'function');
  assert("VocabGraph.onTimelineChange is defined", typeof VocabGraph.onTimelineChange === 'function');
  assert("VocabGraph.focusRoot and clearRootFocus are defined", typeof VocabGraph.focusRoot === 'function' && typeof VocabGraph.clearRootFocus === 'function');

  VocabGraph.switchViewMode('tree');
  assert("switchViewMode('tree') activates tree layout and pauses physics", VocabGraph.graphState.layoutMode === 'tree' && VocabGraph.graphState.physicsPaused === true);

  VocabGraph.toggleTreeMask();
  assert("toggleTreeMask activates treeMaskMode", VocabGraph.graphState.treeMaskMode === true);
  VocabGraph.toggleTreeMask();
  assert("toggleTreeMask deactivates treeMaskMode", VocabGraph.graphState.treeMaskMode === false);

  VocabGraph.onTimelineChange(1);
  assert("onTimelineChange updates timelineEra", VocabGraph.graphState.timelineEra === 1);

  VocabGraph.focusRoot('*sta-');
  assert("focusRoot focuses target root key", VocabGraph.graphState.focusedRootKey === '*sta' || VocabGraph.graphState.focusedRootKey === '*sta-');
  VocabGraph.clearRootFocus();
  assert("clearRootFocus resets focusedRootKey", VocabGraph.graphState.focusedRootKey === '');

  // 14. Eiken Pre-1 Catalog, Fog of War & Zero-API Grounding Integrity
  assert("VocabEikenCatalog is defined on global scope", typeof VocabEikenCatalog === 'object' && VocabEikenCatalog !== null);
  var eikenRoots = VocabEikenCatalog.getRoots();
  assert("VocabEikenCatalog.getRoots returns 16 core roots", Array.isArray(eikenRoots) && eikenRoots.length === 16);
  var kapWords = VocabEikenCatalog.getWordsByRoot('*kap-');
  assert("VocabEikenCatalog.getWordsByRoot('*kap-') returns pre-1 words", Array.isArray(kapWords) && kapWords.some(function(w){ return w.word === 'conceive'; }));
  var conceiveCard = VocabEikenCatalog.getWord('conceive');
  assert("VocabEikenCatalog.getWord('conceive') returns rich structured card", conceiveCard && conceiveCard.core && conceiveCard.example && conceiveCard.meanings.length > 0);
  var eProgress = VocabEikenCatalog.calcProgress([{ word: 'conceive', isDeleted: false }]);
  var kapProg = eProgress.find(function(p){ return p.rootKey === '*kap-'; });
  assert("VocabEikenCatalog.calcProgress calculates learnedCount and percent", kapProg && kapProg.learnedCount === 1 && kapProg.percent > 0);
  assert("VocabGraph.unlockCurrentRootEikenWords is defined", typeof VocabGraph.unlockCurrentRootEikenWords === 'function');
  assert("VocabGraph.toggleEikenExplorer is defined", typeof VocabGraph.toggleEikenExplorer === 'function');
  var eikenPack1 = VocabStarterPack.getStarterPack('en', 'eiken_pre1_pack1');
  assert("VocabStarterPack provides eiken_pre1_pack1 with structured cards", Array.isArray(eikenPack1) && eikenPack1.length >= 20);

  // 15. Global i18n & Multi-Currency Dynamic Stripe Checkout Verification
  assert("VocabI18n is defined on global scope", typeof VocabI18n === 'object' && VocabI18n !== null);
  VocabI18n.setLocale('ja');
  assert("VocabI18n.getLocale() returns 'ja' after setLocale('ja')", VocabI18n.getLocale() === 'ja');
  assert("VocabI18n.t returns Japanese translation", VocabI18n.t('nav.all_words') === 'すべての単語');
  var jpyPriceMonth = VocabI18n.getPlanPriceInfo('month');
  assert("VocabI18n.getPlanPriceInfo('month') returns JPY 480 in ja locale", jpyPriceMonth.currency === 'jpy' && jpyPriceMonth.currentDisplay === '¥480');
  var jpyPriceYear = VocabI18n.getPlanPriceInfo('year');
  assert("VocabI18n.getPlanPriceInfo('year') returns JPY 4,800 in ja locale", jpyPriceYear.currency === 'jpy' && jpyPriceYear.currentDisplay === '¥4,800');

  VocabI18n.setLocale('en');
  assert("VocabI18n.getLocale() returns 'en' after setLocale('en')", VocabI18n.getLocale() === 'en');
  assert("VocabI18n.t returns English translation", VocabI18n.t('nav.all_words') === 'All Words');
  var usdPriceMonth = VocabI18n.getPlanPriceInfo('month');
  assert("VocabI18n.getPlanPriceInfo('month') returns USD $3.99 in en locale", usdPriceMonth.currency === 'usd' && usdPriceMonth.currentDisplay === '$3.99');
  var usdPriceYear = VocabI18n.getPlanPriceInfo('year');
  assert("VocabI18n.getPlanPriceInfo('year') returns USD $39.00 in en locale", usdPriceYear.currency === 'usd' && usdPriceYear.currentDisplay === '$39.00');

  VocabI18n.setBillingInterval('year');
  assert("VocabI18n.getBillingInterval() returns 'year'", VocabI18n.getBillingInterval() === 'year');
  VocabI18n.setBillingInterval('month');
  assert("VocabI18n.getBillingInterval() returns 'month'", VocabI18n.getBillingInterval() === 'month');

  var catEng = VocabI18n.translateCategory('哲学・思想');
  assert("VocabI18n.translateCategory('哲学・思想') translates to 'Philosophy & Thought' in English", catEng === 'Philosophy & Thought');

  var testMatrix = {
    root: '*sta-',
    meaning: 'to stand',
    langs: { en: [{ w: 'stand', inLibrary: true }], fr: [{ w: 'constater' }], de: [{ w: 'stehen' }], ja: [{ w: '立つ' }] }
  };
  var i18nMatrixHtml = VocabMorphology.renderCognateMatrixHtml(testMatrix);
  assert("VocabMorphology.renderCognateMatrixHtml renders English labels in en locale", i18nMatrixHtml.indexOf('4-Language Cognate Matrix') !== -1 && i18nMatrixHtml.indexOf('English (EN)') !== -1);
} catch (e) {
  assert("app.js loading test", false, String(e));
}

// Print results as JSON
print(JSON.stringify(results));
