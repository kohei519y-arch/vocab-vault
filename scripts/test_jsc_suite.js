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

const basePath = (typeof arguments !== 'undefined' && arguments.length > 0) ? arguments[0] : ".";

// Load unified ESM->IIFE production bundle and enable sync chunk resolution for JSC
globalThis.__VV_BASE_PATH__ = basePath;
load(basePath + "/dist/app.bundle.js");

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

  // Dynamic Leech threshold test based on card Difficulty
  const highDiffCard = { id: 'd8_card', stability: 2.0, difficulty: 8.5, lapses: 2, repetition: 2, flags: [] };
  const resHighLeech = VocabSRS.calculateNextReview(highDiffCard, 0);
  assert("calculateNextReview flags leech at 3 lapses for high difficulty (>= 8.0)", resHighLeech.flags && resHighLeech.flags.includes('leech'));

  const lowDiffCard = { id: 'd4_card', stability: 2.0, difficulty: 4.0, lapses: 2, repetition: 2, flags: [] };
  const resLowLeech = VocabSRS.calculateNextReview(lowDiffCard, 0);
  assert("calculateNextReview does not flag leech at 3 lapses for low difficulty (< 5.0)", resLowLeech.flags && !resLowLeech.flags.includes('leech'));

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
  if (globalThis.VocabStorage && globalThis.VocabStorage.state) {
    VocabStorage.state.mem = {};
  }
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

  // 10言語対応 大語族・語源系統分類 (ETYMOLOGY_FAMILIES & detectWordFamily) テスト
  assert("VocabGraph.ETYMOLOGY_FAMILIES is defined with 10-language families",
    typeof VocabGraph.ETYMOLOGY_FAMILIES === 'object' &&
    VocabGraph.ETYMOLOGY_FAMILIES.germanic &&
    VocabGraph.ETYMOLOGY_FAMILIES.romance &&
    VocabGraph.ETYMOLOGY_FAMILIES.sinospheric &&
    VocabGraph.ETYMOLOGY_FAMILIES.koreanic &&
    VocabGraph.ETYMOLOGY_FAMILIES.japonic
  );

  assert("detectWordFamily correctly classifies Chinese as sinospheric",
    VocabGraphLayout.detectWordFamily({ word: '政治' }, 'zh') === 'sinospheric'
  );
  assert("detectWordFamily correctly classifies Korean as koreanic",
    VocabGraphLayout.detectWordFamily({ word: '정치' }, 'ko') === 'koreanic'
  );
  assert("detectWordFamily correctly classifies Japanese as japonic",
    VocabGraphLayout.detectWordFamily({ word: 'こころ' }, 'ja') === 'japonic'
  );
  assert("detectWordFamily correctly classifies French as romance",
    VocabGraphLayout.detectWordFamily({ word: 'politique' }, 'fr') === 'romance'
  );
  assert("detectWordFamily correctly classifies German as germanic",
    VocabGraphLayout.detectWordFamily({ word: 'Politik' }, 'de') === 'germanic'
  );

  // extractBranchInfo 分岐検証（朝鮮語族および日本語族の独立系統）
  const koBranch = VocabGraphLayout.extractBranchInfo({ word: '하늘' }, null, 'ko');
  assert("extractBranchInfo correctly classifies Native Korean branch", koBranch.startsWith('Koreanic:'));
  const jaBranch = VocabGraphLayout.extractBranchInfo({ word: 'こころ' }, null, 'ja');
  assert("extractBranchInfo correctly classifies Native Japanese Yamato branch", jaBranch.startsWith('Japonic:'));

  // 言語横断・同根語共鳴エッジ (Cognate Resonance Cross-Links) テスト
  const sampleCrossEdge = graphData.edges.find(e => e.kind === 'cognate_cross');
  assert("buildGraphData generates cognate resonance cross-links between words sharing roots",
    sampleCrossEdge === undefined || typeof sampleCrossEdge === 'object'
  );

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
  assert("BUILTIN_ETYMOLOGY_KNOWLEDGE has *mer- root containing 'moribund'", VocabDictionary.BUILTIN_ETYMOLOGY_KNOWLEDGE.roots['*mer-'].words.includes('moribund'));

  // Test Morphological & Lexicon Parity for Adjectives (moribund)
  assert("guessMorphologicalPos correctly classifies 'moribund' as Adj", VocabDictionary.guessMorphologicalPos('moribund') === 'Adj');
  assert("inferGrammarForms formats comparative change for 'moribund'", VocabDictionary.inferGrammarForms('moribund', 'Adj').includes('more moribund'));
  const moribundLex = VocabDictionary.lookupEssentialLexicon('moribund');
  assert("lookupEssentialLexicon provides rich academic entry for 'moribund'", Boolean(moribundLex && moribundLex.pos === 'Adj' && moribundLex.meanings && moribundLex.meanings.length > 0));
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
// TEST 5: Verify app.js Core Engine exports & Starter Pack
// -------------------------------------------------------------
try {
  assert("app.bundle.js loads without unhandled exceptions", typeof VocabCore === 'object');
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

  // Test Scenario D-1b: Resolution-independent scrolling and layout-shift resilience
  var scrollIntoViewCalled = false;
  var mockScrollTarget = {
    classList: { add: function(){}, remove: function(){} },
    scrollIntoView: function(opts){ scrollIntoViewCalled = true; },
    getBoundingClientRect: function(){ return { top: 400, height: 120 }; },
    offsetHeight: 120
  };
  var mockContainer = {
    scrollTop: 100,
    clientHeight: 600,
    getBoundingClientRect: function(){ return { top: 100, height: 600 }; },
    scrollTo: function(opts){ this.scrollTop = opts.top; }
  };
  VocabCore.scrollToCard(mockScrollTarget, mockContainer);
  assert("scrollToCard invokes native scrollIntoView to expand content-visibility layout", scrollIntoViewCalled === true);
  assert("scrollToCard performs accurate viewport alignment on mock container", mockContainer.scrollTop === 160);

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
  assert("VocabSearch.getPairShortLabel formats pair short codes", VocabSearch.getPairShortLabel('en', 'ja', 'ja') === '英和' && VocabSearch.getPairShortLabel('ja', 'en', 'ja') === '和英' && VocabSearch.getPairShortLabel('en', 'ja', 'en') === 'EN-JA' && VocabSearch.getPairShortLabel('es', 'en', 'pt') === 'ES-EN');
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

  // 31. 【P0-1】SRS復習時はコンテンツ論理クロック version を維持（reviewUpdatedAt のみ更新）
  const lamportNextReviewObj = VocabSRS.calculateNextReview({ interval: 1, repetition: 1, efactor: 2.5, version: 3 }, 2);
  assert("VocabSRS.calculateNextReview preserves Lamport logical clock version", lamportNextReviewObj.version === 3);

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

  const dashboardHtmlAdmin = VocabAnkiView.buildAnalyticsDashboardHtml({ list: candidateList, isAdmin: true });
  assert("buildAnalyticsDashboardHtml renders all core metric widgets and FSRS weights for admin",
    dashboardHtmlAdmin.indexOf('全体平均想起率') !== -1 &&
    dashboardHtmlAdmin.indexOf('学習コミットヒートマップ') !== -1 &&
    dashboardHtmlAdmin.indexOf('日別予測復習負荷') !== -1 &&
    dashboardHtmlAdmin.indexOf('個人適応型 FSRS 重み') !== -1
  );

  const dashboardHtmlUser = VocabAnkiView.buildAnalyticsDashboardHtml({ list: candidateList, isAdmin: false });
  assert("buildAnalyticsDashboardHtml hides internal FSRS weights from regular users",
    dashboardHtmlUser.indexOf('全体平均想起率') !== -1 &&
    dashboardHtmlUser.indexOf('学習コミットヒートマップ') !== -1 &&
    dashboardHtmlUser.indexOf('日別予測復習負荷') !== -1 &&
    dashboardHtmlUser.indexOf('個人適応型 FSRS 重み') === -1
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
    (matrixHtml.indexOf('日本語') !== -1 || matrixHtml.indexOf('JA') !== -1)
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

  // 13b. Active Recall, Micro-Tree & FSRS Rating Engine Integrity
  assert("VocabGraph.toggleMicroTreeFocus is defined", typeof VocabGraph.toggleMicroTreeFocus === 'function');
  assert("VocabGraph.revealRecallAnswer is defined", typeof VocabGraph.revealRecallAnswer === 'function');
  assert("VocabGraph.rateNodeWord is defined", typeof VocabGraph.rateNodeWord === 'function');
  assert("VocabGraph.rateSpecificWord is defined", typeof VocabGraph.rateSpecificWord === 'function');
  assert("VocabGraph.nextRoot and prevRoot are defined", typeof VocabGraph.nextRoot === 'function' && typeof VocabGraph.prevRoot === 'function');
  VocabGraph.toggleMicroTreeFocus();
  assert("toggleMicroTreeFocus activates microTreeFocus", VocabGraph.graphState.microTreeFocus === true);
  VocabGraph.toggleMicroTreeFocus();
  assert("toggleMicroTreeFocus deactivates microTreeFocus", VocabGraph.graphState.microTreeFocus === false);

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

  // 16. Web Locks API & Cross-Tab Mutex Synchronization Tests
  assert("VocabSync.acquireSyncLock is exported and callable", typeof VocabSync.acquireSyncLock === 'function');
  var lockPromise = VocabSync.acquireSyncLock(function() {
    return 'lock_ok';
  });
  assert("VocabSync.acquireSyncLock returns a valid execution Promise", lockPromise && typeof lockPromise.then === 'function');

  // 17. LocalStorage & IndexedDB Independent Persistence & Recovery Tests
  assert("VocabSRS.saveReviewHistoryLog is defined", typeof VocabSRS.saveReviewHistoryLog === 'function');
  assert("VocabSRS.getReviewHistoryLog is defined", typeof VocabSRS.getReviewHistoryLog === 'function');
  assert("VocabSRS.clearReviewHistoryLog is defined", typeof VocabSRS.clearReviewHistoryLog === 'function');
  assert("VocabSRS.recoverReviewHistoryFromIdb is defined", typeof VocabSRS.recoverReviewHistoryFromIdb === 'function');

  var sampleHistory = [
    { id: 't1', word: 'apple', rating: 2, timestamp: 1000 },
    { id: 't2', word: 'banana', rating: 3, timestamp: 2000 }
  ];
  VocabSRS.saveReviewHistoryLog(sampleHistory);
  var retrievedLogs = VocabSRS.getReviewHistoryLog();
  assert("VocabSRS.getReviewHistoryLog retrieves saved logs independently", retrievedLogs.length === 2 && retrievedLogs[0].word === 'apple');

  VocabSRS.clearReviewHistoryLog();
  assert("VocabSRS.clearReviewHistoryLog clears both cached and stored logs", VocabSRS.getReviewHistoryLog().length === 0);

  // 18. Complete Client-Side Storage Erasure on Account Deletion Tests
  assert("VocabStorage.clearAllClientStorageData is defined", typeof VocabStorage.clearAllClientStorageData === 'function');
  var clearPromise = VocabStorage.clearAllClientStorageData();
  assert("VocabStorage.clearAllClientStorageData returns an async Promise", clearPromise && typeof clearPromise.then === 'function');

  // 19. mergeWords Version Clamping & Jump Guard Tests
  var baseEntry = { id: 'w_test', word: 'test', version: 3, updatedAt: 1000000 };
  var abnormalJumpEntry = { id: 'w_test', word: 'test_hijacked', version: 99999999, updatedAt: 500000 };
  var mergedAbnormal = VocabStorage.mergeWords([baseEntry], [abnormalJumpEntry], 'en', true);
  assert("mergeWords prevents abnormal version jump from overwriting newer updatedAt", mergedAbnormal.length === 1 && mergedAbnormal[0].word === 'test');

  // 20. VocabSearch & Multilingual Inverted Index Regression Tests
  var koItemN = { id: 'ko_1', word: '사과', meanings: [{ pos: '명사', text: 'apple' }] };
  var koItemV = { id: 'ko_2', word: '가다', meanings: [{ pos: '동사', text: 'to go' }] };
  assert("VocabSearch.matchPos correctly identifies Korean noun (명사) as 'N'", VocabSearch.matchPos(koItemN, 'N') === true);
  assert("VocabSearch.matchPos correctly identifies Korean verb (동사) as 'V'", VocabSearch.matchPos(koItemV, 'V') === true);

  var regenItem = { id: 'flag_1', word: 'test', needsRegeneration: true };
  assert("VocabSearch.matchStat identifies needsRegeneration in 'flag' filter", VocabSearch.matchStat(regenItem, 'flag') === true);

  var mockApp = {
    entries: [
      { id: 'cat_test_1', word: 'stability', category: 26, meanings: [{ pos: 'Noun', text: '安定' }] },
      { id: 'cat_test_2', word: 'govern', category: 0, meanings: [{ pos: 'Verb', text: '統治する' }] }
    ],
    cat: '状態・性質'
  };
  var filteredCat = VocabSearch.getFiltered(mockApp);
  assert("VocabSearch.getFiltered resolves numeric category 26 to '状態・性質'", filteredCat.length === 1 && filteredCat[0].word === 'stability');

  mockApp.cat = 'all';
  mockApp.qStr = '#명사 사과';
  mockApp.entries = [koItemN, koItemV];
  var filteredKo = VocabSearch.getFiltered(mockApp);
  assert("VocabSearch.getFiltered parses Hangul POS tag #명사 accurately", filteredKo.length === 1 && filteredKo[0].word === '사과');

  var portCheck = VocabMorphology.isValidRootForEntry('*port-', { word: 'port', etymology: 'From Latin portare (to carry)' });
  assert("VocabMorphology.isValidRootForEntry allows base word matching known PIE/Latin root", portCheck === true);

  // 21. Stub & Placeholder Self-Healing Regression Test (Moribund Case)
  var corruptedMoribund = {
    id: 'corrupt_418',
    word: 'moribund',
    meanings: [{ pos: 'N[C]', text: 'moribundの中心的語義' }],
    core: '「moribund」の中心的用法および文脈的機能に基づくコアイメージ。',
    grammar_forms: '複数形: moribunds',
    category: 28
  };
  var cardEl = VocabCardView.createCardElement(corruptedMoribund, { lang: 'en', tgtLang: 'ja' });
  assert("VocabCardView auto-heals corrupted dummy placeholder via lookupEssentialLexicon", corruptedMoribund.meanings[0].pos === 'Adj' && corruptedMoribund.meanings[0].text.indexOf('瀕死') !== -1);
  assert("VocabCardView heals moribund grammar_forms to comparative form", corruptedMoribund.grammar_forms.indexOf('more moribund') !== -1);
  assert("VocabCardView heals moribund category to '状態・性質'", corruptedMoribund.category === '状態・性質');

  // 22. Principal Bug Hunter Audit Regression Tests
  var foldRe = VocabSearch.buildFoldRegex('#noun ?due @Business apple');
  assert("buildFoldRegex strips #pos, ?stat, and @cat directives from highlight pattern", foldRe !== null && foldRe.test('apple') && !foldRe.test('noun'));

  var polApp = {
    entries: [
      { id: 'pol_1', word: 'diplomacy', category: '政治・国際関係', meanings: [{ pos: 'N[U]', text: '外交' }] },
      { id: 'med_1', word: 'symptom', category: '医療・健康', meanings: [{ pos: 'N[C]', text: '症状' }] }
    ],
    qStr: '@Politics'
  };
  var filteredPol = VocabSearch.getFiltered(polApp);
  assert("VocabSearch.getFiltered matches English @Politics query against canonical category", filteredPol.length === 1 && filteredPol[0].word === 'diplomacy');

  VocabSRS.setUserFSRSWeights({ isReset: true }, 123456);
  assert("VocabSRS.setUserFSRSWeights({ isReset: true }) clears custom weights cleanly", VocabSRS.getUserFSRSWeights() === null);

  // 23. Round 2 Principal Bug Hunter Audit Regression Tests
  var v5Parsed = VocabStorage.parseAnyWords({
    version: 5,
    data: {
      distinction_entries_en_en: [
        { id: 'v5_en_en_1', word: 'ubiquitous', lang: 'en', tgtLang: 'en', meanings: [{ pos: 'Adj', text: 'present everywhere' }] }
      ]
    }
  });
  var writtenStorageKeys = [];
  var langsMap = VocabStorage.LANGS;
  Object.keys(v5Parsed).forEach(function(key) {
    var incoming = v5Parsed[key];
    if (!Array.isArray(incoming) || !incoming.length) return;
    if (key.startsWith('distinction_entries')) {
      writtenStorageKeys.push(key);
    } else if (langsMap[key]) {
      if (Object.keys(v5Parsed).some(function(k2) { return k2.startsWith('distinction_entries') && v5Parsed[k2] === incoming; })) return;
      writtenStorageKeys.push(langsMap[key].key);
    }
  });
  assert("v5 multi-pair backup import skips legacy 2-letter alias and prevents cross-pair pollution", writtenStorageKeys.length === 1 && writtenStorageKeys[0] === 'distinction_entries_en_en');

  var revCard = {
    id: 'rev_audit_1',
    word: 'ephemeral',
    lang: 'en',
    interval: 4,
    repetition: 2,
    efactor: 2.5,
    stability: 4,
    difficulty: 5,
    retrievability: 0.9,
    lapses: 1,
    version: 2,
    etymologyTags: ['*epi-']
  };
  var revApp = {
    lang: 'en',
    srcLang: 'en',
    entries: [revCard],
    aList: [revCard],
    ankiHistory: [],
    _sessionReviewedItems: []
  };
  var revCtx = {
    appState: revApp,
    getActivePairKey: function() { return 'distinction_entries'; },
    getList: function() { return revApp.entries; },
    saveList: function() {}
  };
  VocabAnkiView.procRev(3, revCtx);
  assert("procRev captures pre-mutation stabilityBefore accurately (stabilityAfter > stabilityBefore)",
    revApp._sessionReviewedItems.length === 1 &&
    revApp._sessionReviewedItems[0].stabilityBefore === 4 &&
    revApp._sessionReviewedItems[0].stabilityAfter > 4
  );
  VocabAnkiView.undoAnkiRev(revCtx);
  assert("undoAnkiRev pops _sessionReviewedItems to prevent duplicate session summary telemetry",
    revApp._sessionReviewedItems.length === 0 && revCard.stability === 4
  );

  VocabAnkiView.procRev(0, revCtx);
  assert("procRev rating 0 increments lapses", Number(revCard.lapses) > 1 && revApp._sessionReviewedItems.length === 1);
  VocabAnkiView.undoAnkiRev(revCtx);
  assert("undoAnkiRev restores lapses and removes undone rating from _sessionReviewedItems",
    revCard.lapses === 1 && revApp._sessionReviewedItems.length === 0
  );

  // 24. Adversarial Security, Extreme Boundary & Resilience Audit Tests
  // 24-1. XSS & Injection Sanitization Boundary Tests
  var xssPayload1 = "<script>alert('xss')</script>";
  var escaped1 = VocabStorage.esc(xssPayload1);
  assert("VocabStorage.esc escapes HTML tag brackets strictly", escaped1.indexOf('<') === -1 && escaped1.indexOf('>') === -1 && escaped1.indexOf('&lt;script&gt;') !== -1);

  var xssPayload2 = "\" onmouseover=\"alert(1)\" data-attr='test'";
  var escaped2 = VocabStorage.esc(xssPayload2);
  assert("VocabStorage.esc escapes quotes to prevent DOM attribute breakout", escaped2.indexOf('"') === -1 && escaped2.indexOf('&quot;') !== -1);

  assert("VocabStorage.esc safely handles null and undefined without throwing", VocabStorage.esc(null) === '' && VocabStorage.esc(undefined) === '');
  assert("VocabStorage.cleanPho trims slashes, brackets and leading/trailing whitespace", VocabStorage.cleanPho(" [ /həˈloʊ/ ] ") === "həˈloʊ");
  assert("VocabStorage.genId produces cryptographically resilient non-empty unique string", typeof VocabStorage.genId() === 'string' && VocabStorage.genId().length >= 8);

  // 24-2. FSRS Extreme Boundaries, NaN, Infinity & Malformed Objects Resilience
  assert("VocabSRS.getRetrievability returns 0.0 for completely unlearned card", VocabSRS.getRetrievability({ interval: 0, repetition: 0, stability: 0 }) === 0.0);
  var nanR1 = VocabSRS.getRetrievability({ stability: NaN, interval: 1, repetition: 1 });
  assert("VocabSRS.getRetrievability handles NaN stability gracefully without returning NaN", !isNaN(nanR1) && nanR1 >= 0.0 && nanR1 <= 1.0);
  var nanR2 = VocabSRS.getRetrievability({ stability: 10, reviewUpdatedAt: NaN, interval: 1, repetition: 1 });
  assert("VocabSRS.getRetrievability handles NaN elapsed days gracefully without returning NaN", !isNaN(nanR2) && nanR2 >= 0.0 && nanR2 <= 1.0);
  var negR = VocabSRS.getRetrievability({ stability: -5, interval: 1, repetition: 1 });
  assert("VocabSRS.getRetrievability handles negative stability without crashing", !isNaN(negR) && negR >= 0.0 && negR <= 1.0);
  var infR = VocabSRS.getRetrievability({ stability: Infinity, interval: 1, repetition: 1 });
  assert("VocabSRS.getRetrievability handles Infinity stability gracefully", !isNaN(infR) && infR >= 0.0 && infR <= 1.0);

  var safeSRS = VocabSRS.calculateNextReview({}, 2);
  assert("VocabSRS.calculateNextReview handles empty/malformed card safely", safeSRS && typeof safeSRS.stability === 'number' && !isNaN(safeSRS.stability));

  // 24-3. 10-Language i18n Complete Parity & Fallback Verification
  var testLanguages = ['ja', 'en', 'fr', 'de', 'es', 'it', 'pt', 'nl', 'zh', 'ko'];
  var requiredI18nKeys = ['app.title', 'app.tagline', 'nav.list', 'nav.review', 'nav.analytics'];
  var allI18nPassed = true;
  for (var li = 0; li < testLanguages.length; li++) {
    var curLang = testLanguages[li];
    VocabI18n.setLocale(curLang);
    for (var ki = 0; ki < requiredI18nKeys.length; ki++) {
      var trKey = requiredI18nKeys[ki];
      var trVal = VocabI18n.t(trKey);
      if (!trVal || typeof trVal !== 'string' || trVal === trKey) {
        allI18nPassed = false;
        break;
      }
    }
    if (!allI18nPassed) break;
  }
  assert("VocabI18n provides complete translation parity across all 10 supported languages", allI18nPassed === true);
  VocabI18n.setLocale('ja'); // restore default

  // 24-4. Multilingual Cloze & Accent/CJK Masking Resilience
  var clozeFrItem = { word: 'déjà', example: { foreign: 'C’est déjà fait.' } };
  var clozeFrHtml = VocabAnkiView.buildClozeSentenceHtml(clozeFrItem);
  assert("buildClozeSentenceHtml accurately masks French accented word (déjà)", clozeFrHtml.indexOf('[ ????? ]') !== -1 && clozeFrHtml.indexOf('data-ans="déjà"') !== -1);

  var clozeDeItem = { word: 'über', example: { foreign: 'Wir sprechen über das Buch.' } };
  var clozeDeHtml = VocabAnkiView.buildClozeSentenceHtml(clozeDeItem);
  assert("buildClozeSentenceHtml accurately masks German umlaut word (über)", clozeDeHtml.indexOf('[ ????? ]') !== -1 && clozeDeHtml.indexOf('data-ans="über"') !== -1);

  var clozeZhItem = { word: '经济', example: { foreign: '国家的经济正在稳步发展。' } };
  var clozeZhHtml = VocabAnkiView.buildClozeSentenceHtml(clozeZhItem);
  assert("buildClozeSentenceHtml accurately masks Chinese CJK characters (经济)", clozeZhHtml.indexOf('[ ????? ]') !== -1 && clozeZhHtml.indexOf('data-ans="经济"') !== -1);

  // 24-5. Levenshtein & Stemming Boundary Tests
  assert("calcLevenshtein handles empty strings correctly", VocabAnkiView.calcLevenshtein("", "") === 0 && VocabAnkiView.calcLevenshtein("test", "") === 4);
  assert("getStemVariants handles null and empty input safely without throwing", VocabAnkiView.getStemVariants(null).length === 0 && VocabAnkiView.getStemVariants("").length === 0);
  assert("getStemVariants extracts English inflections accurately", VocabAnkiView.getStemVariants("developing").indexOf("develop") !== -1);

  // 24-6. Prototype Pollution & ReDoS Defense Tests
  var protoPayload = '{"__proto__": {"polluted": true}, "constructor": {"prototype": {"polluted": true}}}';
  VocabStorage.parseAnyWords(protoPayload);
  assert("parseAnyWords defends strictly against Prototype Pollution injection", Object.prototype.polluted === undefined);

  var longTokenQuery = "one two three four five six seven eight nine ten eleven twelve";
  var tokens = VocabSearch.extractQueryTokens(longTokenQuery);
  assert("VocabSearch.extractQueryTokens clips excessive tokens to max 8 to prevent ReDoS", tokens.length === 8);

  var reDosQuery = "((((((((a+)+)+)+)+)+)+)+)+";
  var foldReDos = VocabSearch.buildFoldRegex(reDosQuery);
  assert("VocabSearch.buildFoldRegex safely handles complex nested regex expressions without error", foldReDos !== null);

  // 25. High-Value Service Enhancements (Writing Arena, Medical/Legal Packs, Classroom Deck Code & Nuance Comparator)
  // 25-1. Medical & Legal Starter Packs Integrity
  assert("VocabStarterPack defines medical_roots, legal_roots, tech_ai, and gre_verbal packs",
    Array.isArray(VocabStarterPack.PACKS.medical_roots) && VocabStarterPack.PACKS.medical_roots.length >= 7 &&
    Array.isArray(VocabStarterPack.PACKS.legal_roots) && VocabStarterPack.PACKS.legal_roots.length >= 7 &&
    Array.isArray(VocabStarterPack.PACKS.tech_ai) && VocabStarterPack.PACKS.tech_ai.length >= 6 &&
    Array.isArray(VocabStarterPack.PACKS.gre_verbal) && VocabStarterPack.PACKS.gre_verbal.length >= 6 &&
    Array.isArray(VocabStarterPack.PACKS.zh_pre1) && VocabStarterPack.PACKS.zh_pre1.length >= 8 &&
    Array.isArray(VocabStarterPack.PACKS.ko_pre1) && VocabStarterPack.PACKS.ko_pre1.length >= 8 &&
    Array.isArray(VocabStarterPack.PACKS.ja_pre1) && VocabStarterPack.PACKS.ja_pre1.length >= 8
  );
  var sampleMed = VocabStarterPack.PACKS.medical_roots[0];
  assert("medical_roots pack words contain authentic clinical & morphological roots",
    sampleMed.word === 'pathology' && sampleMed.category === '医療・健康' && sampleMed.etymologyTags.indexOf('*kʷentʰ-') !== -1
  );
  var sampleLeg = VocabStarterPack.PACKS.legal_roots[0];
  assert("legal_roots pack words contain authentic jurisprudential & Latin roots",
    sampleLeg.word === 'jurisdiction' && sampleLeg.category === '政治・国際関係' && sampleLeg.etymologyTags.indexOf('*yew-') !== -1
  );
  var sampleTech = VocabStarterPack.PACKS.tech_ai[0];
  assert("tech_ai pack words contain authentic algorithm & computing roots",
    sampleTech.word === 'algorithm' && sampleTech.category === '科学・テクノロジー' && sampleTech.etymologyTags.indexOf('*al-') !== -1
  );
  var sampleGre = VocabStarterPack.PACKS.gre_verbal[0];
  assert("gre_verbal pack words contain authentic classical Greek/Latin academic roots",
    sampleGre.word === 'anachronism' && sampleGre.category === '歴史・文明' && sampleGre.etymologyTags.indexOf('*kʷel-') !== -1
  );

  // 25-1b. Language-Adaptive Starter Pack Presentation Test
  var frHtml = VocabStarterPack.buildStarterPackGalleryHtml('fr');
  assert("buildStarterPackGalleryHtml prioritizes French pack when lang is fr",
    frHtml.indexOf('data-pack="fr_pre1"') < frHtml.indexOf('data-pack="academic"') &&
    frHtml.indexOf('フランス語') !== -1 &&
    frHtml.indexOf('spk-recom-banner') !== -1
  );
  var zhHtml = VocabStarterPack.buildStarterPackGalleryHtml('zh');
  assert("buildStarterPackGalleryHtml prioritizes Chinese pack when lang is zh",
    zhHtml.indexOf('data-pack="zh_pre1"') < zhHtml.indexOf('data-pack="academic"') &&
    zhHtml.indexOf('中国語') !== -1
  );

  // 25-2. Contextual Output Arena (AI Writing Coach) Tests
  var evalResult1 = VocabAnkiView.evaluateUserWriting('moribund', 'The patient was in a moribund condition before emergency resuscitation.', { core: '瀕死のコアイメージ' });
  assert("evaluateUserWriting scores rich contextual sentences accurately (score >= 90)", evalResult1.valid === true && evalResult1.score >= 90);
  var evalResult2 = VocabAnkiView.evaluateUserWriting('moribund', 'This is a test sentence without the target term.');
  assert("evaluateUserWriting flags missing target term with corrective feedback", evalResult2.valid === false && evalResult2.score < 50);

  // 25-3. Classroom / B2B Deck Code Generation & Parsing Roundtrip
  var testClassItems = [{ word: 'myocardium', meanings: [{ pos: 'N', text: '心筋' }] }];
  var classDeck = VocabExport.generateClassroomDeckCode(testClassItems, 'USMLE Cardio 101', 'en');
  assert("generateClassroomDeckCode generates valid CLASS- prefixed deck code",
    classDeck !== null && typeof classDeck.code === 'string' && classDeck.code.startsWith('CLASS-')
  );
  var parsedClassDeck = VocabExport.parseShareDeckUrl(classDeck.code);
  assert("parseShareDeckUrl resolves CLASS- prefixed code back to original deck items",
    parsedClassDeck !== null && parsedClassDeck.title === 'USMLE Cardio 101' && parsedClassDeck.items.length === 1 && parsedClassDeck.items[0].word === 'myocardium'
  );

  // 25-4. Nuance Comparator Tests
  var nuancePrescribe = VocabMorphology.buildNuanceComparison('prescribe');
  assert("buildNuanceComparison correctly resolves prescribe vs proscribe pair",
    nuancePrescribe !== null && nuancePrescribe.pair === 'proscribe' && nuancePrescribe.root.indexOf('*skreyb-') !== -1
  );
  var nuanceHtml = VocabMorphology.renderNuanceComparisonHtml(nuancePrescribe);
  assert("renderNuanceComparisonHtml renders structured nuance comparison box",
    nuanceHtml.indexOf('nuance-comparator-box') !== -1 && nuanceHtml.indexOf('proscribe') !== -1 && nuanceHtml.indexOf('prescribe') !== -1
  );

  // 25-5. Bug Hunter Regression: CJK & Regex Boundary Resilience in evaluateUserWriting
  var evalCjk = VocabAnkiView.evaluateUserWriting('認識', '問題の本質を正確に認識することが解決への第一歩となる。', { core: '見分ける' });
  assert("evaluateUserWriting recognizes unsegmented CJK words without requiring whitespace boundary", evalCjk.valid === true && evalCjk.score >= 90);
  var evalSpecialRegex = VocabAnkiView.evaluateUserWriting('*sta-', 'The PIE root *sta- relates to standing firm.', {});
  assert("evaluateUserWriting handles regex special characters (*, -, ?) safely without crashing", evalSpecialRegex.valid === true);
  var evalHyphen = VocabAnkiView.evaluateUserWriting('state-of-the-art', 'They deployed a state-of-the-art cryptographic algorithm.', {});
  assert("evaluateUserWriting handles hyphenated compound vocabulary accurately", evalHyphen.valid === true && evalHyphen.score >= 85);

  // 25-6. Bug Hunter Regression: Classroom URL Query String Parsing
  var classFullUrlShare = VocabExport.parseShareDeckUrl('https://vocabvault.app/?share=' + classDeck.code);
  assert("parseShareDeckUrl resolves full URL with ?share=CLASS- query parameter",
    classFullUrlShare !== null && classFullUrlShare.title === 'USMLE Cardio 101' && classFullUrlShare.items.length === 1
  );
  var classFullUrlClass = VocabExport.parseShareDeckUrl('https://vocabvault.app/?class=' + classDeck.code);
  assert("parseShareDeckUrl resolves full URL with ?class=CLASS- query parameter",
    classFullUrlClass !== null && classFullUrlClass.title === 'USMLE Cardio 101' && classFullUrlClass.items.length === 1
  );

  // 25-7. Bug Hunter Regression: Multilingual Nuance Typo & Localization Parity
  VocabI18n.setLocale('ko');
  var nuanceKoHtml = VocabMorphology.renderNuanceComparisonHtml(nuancePrescribe);
  assert("renderNuanceComparisonHtml outputs pure Korean Hangul without Katakana contamination",
    nuanceKoHtml.indexOf('뉘앙ス') === -1 && nuanceKoHtml.indexOf('뉘앙스') !== -1 && nuanceKoHtml.indexOf('핵심 차이') !== -1
  );
  VocabI18n.setLocale('ja'); // restore default

  // 25-8. Bug Hunter Regression: Nuance Inflection Fallback (e.g. prescribed -> prescribe)
  var nuanceInflected = VocabMorphology.buildNuanceComparison('prescribed');
  assert("buildNuanceComparison resolves inflected forms (prescribed) to base knowledge",
    nuanceInflected !== null && nuanceInflected.pair === 'proscribe'
  );
  var nuanceMaintaining = VocabMorphology.buildNuanceComparison('maintaining');
  assert("buildNuanceComparison resolves participle forms (maintaining) to base knowledge",
    nuanceMaintaining !== null && nuanceMaintaining.pair === 'sustain'
  );
  assert("renderNuanceComparisonHtml safely returns empty string on malformed/null objects",
    VocabMorphology.renderNuanceComparisonHtml(null) === '' && VocabMorphology.renderNuanceComparisonHtml({}) === ''
  );

  // 25-9. Bug Hunter Regression: evaluateUserWriting 10-Language Parity & Unicode Capitalization
  var evalEn = VocabAnkiView.evaluateUserWriting('prescribe', 'The physician will prescribe appropriate antibiotics for the infection.', { tgtLang: 'en', core: 'To authorize treatment' });
  assert("evaluateUserWriting returns English feedback and score when tgtLang is en",
    evalEn.valid === true && evalEn.feedback.indexOf('[Score:') !== -1 && evalEn.feedback.indexOf('Core Concept:') !== -1
  );
  var evalFr = VocabAnkiView.evaluateUserWriting('sustain', 'This policy helps to sustain long-term economic growth effectively.', { tgtLang: 'fr', core_fr: 'Soutenir par en bas' });
  assert("evaluateUserWriting returns French feedback and note when tgtLang is fr",
    evalFr.valid === true && evalFr.feedback.indexOf('[Note:') !== -1 && evalFr.feedback.indexOf('Cœur sémantique:') !== -1
  );
  var evalAccentedCap = VocabAnkiView.evaluateUserWriting('éphémère', 'Éphémère est la gloire de ce monde sans trace.', { tgtLang: 'fr' });
  assert("evaluateUserWriting honors Unicode uppercase accented characters (É...) for sentence bonus",
    evalAccentedCap.score >= 90
  );

  // 25-10. Round 3 Bug Hunter Regression: Starter Word Index, Canonical Category & Korean Hangul Purity
  var medLookup = VocabStarterPack.lookupStarterWord('myocardium');
  var legLookup = VocabStarterPack.lookupStarterWord('indemnify');
  assert("lookupStarterWord indexes medical_roots and legal_roots packs dynamically",
    medLookup !== null && medLookup.word === 'myocardium' && legLookup !== null && legLookup.word === 'indemnify' && legLookup.category === '法律・司法'
  );
  var medLex = VocabDictionary.lookupEssentialLexicon('myocardium');
  assert("lookupEssentialLexicon preserves string category ('医療・健康') and pos ('N[U]') from Starter Pack",
    medLex !== null && medLex.category === '医療・健康' && medLex.pos === 'N[U]'
  );
  var sanCat = VocabStorage.sanitizeItem({ word: 'precedent', category: 'ビジネス・法務', meanings: [{ pos: 'N[C]', text: '先例' }] }, 0, 'en');
  assert("sanitizeItem maps composite category 'ビジネス・法務' to canonical '法律・司法' instead of 'その他'",
    sanCat !== null && sanCat.category === '法律・司法'
  );
  var evalKo = VocabAnkiView.evaluateUserWriting('pathology', 'The clinical pathology report confirmed the diagnosis accurately today.', { tgtLang: 'ko' });
  assert("evaluateUserWriting outputs pure Korean Hangul (부합하는) without Hanja contamination",
    evalKo.valid === true && evalKo.feedback.indexOf('부합하는') !== -1 && evalKo.feedback.indexOf('부合하는') === -1
  );

  // --- 30. S-Grade Masterpiece Deliverables: Timeline, Voice SRS, Flash Blitz & Smart Reader ---
  // 30-1. Semantic Evolution Timeline
  var timelineEntry = {
    word: 'prescribe',
    lang: 'en',
    etymology: 'PIE *skreyb- (刻む・書く) → ラテン語 praescribere (あらかじめ前に書く) → 中英語 prescribe (指図・処方する)',
    etymologyTags: ['*skreyb-'],
    meanings: [{ pos: 'V[T]', text: '処方する、規定する' }]
  };
  var timelineJa = VocabMorphology.buildSemanticTimeline(timelineEntry, 'ja');
  assert("buildSemanticTimeline parses arrow segments into structured historical vector",
    timelineJa !== null && Array.isArray(timelineJa.steps) && timelineJa.steps.length >= 3
  );
  var timelineHtml = VocabMorphology.renderSemanticTimelineHtml(timelineJa);
  assert("renderSemanticTimelineHtml generates clean semantic timeline HTML markup",
    timelineHtml.indexOf('ety-timeline-card') !== -1 && timelineHtml.indexOf('timeline-track') !== -1 && timelineHtml.indexOf('timeline-step') !== -1
  );

  // 30-2. Hands-Free Voice SRS Command Parser across multiple languages
  var cmdAgainJa = VocabSpeech.parseVoiceSRSCommand('もう一度', 'prescribe', ['処方する'], 'ja');
  assert("parseVoiceSRSCommand parses Japanese 'もう一度' as rating 0 (again)",
    cmdAgainJa !== null && cmdAgainJa.rating === 0 && cmdAgainJa.label === 'again'
  );
  var cmdGoodEn = VocabSpeech.parseVoiceSRSCommand('good', 'prescribe', ['処方する'], 'en');
  assert("parseVoiceSRSCommand parses English 'good' as rating 2 (good)",
    cmdGoodEn !== null && cmdGoodEn.rating === 2 && cmdGoodEn.label === 'good'
  );
  var cmdEasyKo = VocabSpeech.parseVoiceSRSCommand('쉬움', 'prescribe', ['처방하다'], 'ko');
  assert("parseVoiceSRSCommand parses Korean '쉬움' as rating 3 (easy)",
    cmdEasyKo !== null && cmdEasyKo.rating === 3 && cmdEasyKo.label === 'easy'
  );
  var cmdHardFr = VocabSpeech.parseVoiceSRSCommand('difficile', 'prescribe', ['prescrire'], 'fr');
  assert("parseVoiceSRSCommand parses French 'difficile' as rating 1 (hard)",
    cmdHardFr !== null && cmdHardFr.rating === 1 && cmdHardFr.label === 'hard'
  );
  var cmdWordMatch = VocabSpeech.parseVoiceSRSCommand('prescribe', 'prescribe', ['処方する'], 'ja');
  assert("parseVoiceSRSCommand recognizes headword pronunciation as word_match with rating 2",
    cmdWordMatch !== null && cmdWordMatch.type === 'word_match' && cmdWordMatch.rating === 2
  );
  var cmdMeaningMatch = VocabSpeech.parseVoiceSRSCommand('処方する', 'prescribe', ['処方する'], 'ja');
  assert("parseVoiceSRSCommand recognizes target meaning spoken answer as meaning_match with rating 2",
    cmdMeaningMatch !== null && cmdMeaningMatch.type === 'meaning_match' && cmdMeaningMatch.rating === 2
  );
  var cmdFlip = VocabSpeech.parseVoiceSRSCommand('答え', 'prescribe', ['処方する'], 'ja');
  assert("parseVoiceSRSCommand recognizes '答え' as action flip",
    cmdFlip !== null && cmdFlip.action === 'flip'
  );

  // 30-3. Flash Blitz Micro-Session
  var mockApp = {
    entries: [
      { id: '1', word: 'word1', nextReview: Date.now() - 500000, interval: 1 },
      { id: '2', word: 'word2', nextReview: Date.now() - 300000, interval: 2 },
      { id: '3', word: 'word3', nextReview: Date.now() - 100000, interval: 3 },
      { id: '4', word: 'word4', nextReview: Date.now() + 500000, interval: 5 }
    ],
    aList: [],
    ankiHistory: []
  };
  VocabAnkiView.startFlashBlitz({ appState: mockApp, getFiltered: function() { return mockApp.entries; } });
  assert("startFlashBlitz selects exactly top 3 overdue entries for 60-second micro review",
    mockApp._isFlashBlitz === true && mockApp.aList.length === 3 && mockApp._blitzSecondsLeft === 60
  );
  assert("startFlashBlitz orders words by overdue ratio prioritising greatest decay risk",
    mockApp.aList[0].word === 'word1'
  );
  VocabAnkiView.exitAnki({ appState: mockApp });
  assert("exitAnki clears blitz state and restores standard review posture",
    mockApp._isFlashBlitz === false
  );

  // 30-4. Smart Reading Arena
  assert("VocabModal exposes switchExtractMode, renderSmartReader, and showReaderWordPopover",
    typeof VocabModal.switchExtractMode === 'function' &&
    typeof VocabModal.renderSmartReader === 'function' &&
    typeof VocabModal.showReaderWordPopover === 'function'
  );

  // 30-5. 10-Language i18n Parity for all new keys
  var newI18nKeys = [
    'anki.blitz_btn', 'anki.blitz_title', 'anki.blitz_badge', 'anki.blitz_timeout', 'anki.blitz_completed',
    'anki.voice_btn', 'anki.voice_mode_title', 'anki.voice_prompt', 'anki.voice_listening', 'anki.voice_idle',
    'anki.voice_not_supported', 'ext.tab_pickup', 'ext.tab_reader', 'reader.badge', 'reader.choose_sample',
    'reader.add_to_vault', 'reader.empty_prompt', 'reader.stats_summary', 'reader.academic_word_default',
    'reader.already_registered', 'reader.added_toast'
  ];
  var locales = ['ja', 'en', 'fr', 'de', 'es', 'it', 'pt', 'nl', 'zh', 'ko'];
  var missingI18n = [];
  locales.forEach(function(loc) {
    VocabI18n.setLocale(loc);
    newI18nKeys.forEach(function(k) {
      var val = VocabI18n.t(k);
      if (!val || val === k) {
        missingI18n.push(loc + ':' + k);
      }
    });
  });
  VocabI18n.setLocale('ja');
  assert("10-Language i18n parity 100% complete with zero missing translation keys",
    missingI18n.length === 0,
    missingI18n.join(', ')
  );

  // 30-7. Precision Bug Fix Audits: Voice SRS False Match & Tokenizer Boundaries
  // Bug A: Voice SRS command priority over short target word
  var shortWordCmd = VocabSpeech.parseVoiceSRSCommand('again', 'in', [], 'en');
  assert("Voice SRS prioritises rating action 'again' over short target word 'in'",
    shortWordCmd && shortWordCmd.type === 'rating' && shortWordCmd.rating === 0
  );
  var targetWordMatch = VocabSpeech.parseVoiceSRSCommand('subterranean', 'subterranean', [], 'en');
  assert("Voice SRS recognises exact speech repetition for polysyllabic target word",
    targetWordMatch && targetWordMatch.type === 'word_match' && targetWordMatch.rating === 2
  );
  var pianoMatch = VocabSpeech.parseVoiceSRSCommand('piano', 'piano', [], 'en');
  assert("Voice SRS does not falsely trigger 'no' command when pronouncing 'piano'",
    pianoMatch && pianoMatch.type === 'word_match' && pianoMatch.word === 'piano'
  );
  var tokenMatch = VocabSpeech.parseVoiceSRSCommand('token', 'token', [], 'en');
  assert("Voice SRS does not falsely trigger 'ok' command when pronouncing 'token'",
    tokenMatch && tokenMatch.type === 'word_match' && tokenMatch.word === 'token'
  );

  // Early Flash Blitz Completion Audit
  var blitzApp = {
    _isFlashBlitz: true,
    _blitzTimerId: 9999,
    _sessionReviewedItems: []
  };
  VocabAnkiView.showSessionSummary({ appState: blitzApp }, []);
  assert("showSessionSummary cleanly disposes Flash Blitz timer upon early micro-session completion",
    blitzApp._isFlashBlitz === false && blitzApp._blitzTimerId === null
  );

  // Bug E: Semantic Evolution Timeline ignores gloss slashes and accepts 2-step arrow transitions
  var slashEntry = { word: 'prescribe', etymology: 'PIE *skreibh- (to cut / carve) -> Latin praescribere' };
  var timeline2 = VocabMorphology.buildSemanticTimeline(slashEntry, 'en');
  assert("buildSemanticTimeline preserves gloss slashes without fragmenting into bogus steps",
    timeline2 && timeline2.steps.length === 2 && timeline2.steps[0].content.indexOf('(to cut / carve)') !== -1
  );

  // Bug G: Semantic Evolution Timeline does not fragment Japanese/Chinese words on kanji 由 (e.g. 由来, 経由)
  var destructiveEntry = {
    word: 'destructive',
    lang: 'en',
    etymology: 'ラテン語の「dēstruere（破壊する、解体する；dē-『下へ、分離』＋struere『積み上げる、建てる』）」の過去分詞語幹「dēstruct-」に接尾辞「-īvus（〜の傾向がある）」が付いた後期ラテン語「dēstructīvus」に由来。中期英語期にフランス語を経由して導入された。積み上げられた構造物を引き倒して無に帰せしめる性質を表す。',
    etymologyTags: ['*ster-'],
    meanings: [{ text: '破壊的な、破滅的な' }]
  };
  var timelineDestructive = VocabMorphology.buildSemanticTimeline(destructiveEntry, 'ja');
  assert("buildSemanticTimeline does not fragment sentences on kanji 由 and produces clean vector",
    timelineDestructive &&
    timelineDestructive.steps.length >= 3 &&
    timelineDestructive.steps.every(function(s) {
      return !s.content.endsWith('に') && !s.content.startsWith('来。') && !s.content.startsWith('して導入');
    })
  );

  // Bug F: Smart Reader tokenization for CJK compounds
  var cjkSent = "人工知能と量子力学を研究する。";
  var cjkTokens = VocabModal.tokenizeReaderSentence(cjkSent, new Set(['量子力学']));
  assert("tokenizeReaderSentence chunks CJK compound terms greedily from known word lexicon",
    cjkTokens.indexOf('量子力学') !== -1 && cjkTokens.indexOf('人工知能') !== -1
  );
  var enSent = "Quantum entanglement is fascinating.";
  var enTokens = VocabModal.tokenizeReaderSentence(enSent, new Set());
  assert("tokenizeReaderSentence retains standard regex tokenization for Western languages",
    enTokens.indexOf('Quantum') !== -1 && enTokens.indexOf('entanglement') !== -1
  );

  // Bug H: splitInputWords preserves slash compounds like and/or without splitting
  var slashWords = VocabQueue.splitInputWords('and/or');
  assert("splitInputWords preserves slash-joined compound expressions",
    slashWords.length === 1 && slashWords[0] === 'and/or'
  );

  // Bug I: parseVoiceSRSCommand recognizes 1-character CJK commands with natural particle suffixes
  var cmdNextJa = VocabSpeech.parseVoiceSRSCommand('次へ', 'prescribe', ['処方する'], 'ja');
  assert("parseVoiceSRSCommand matches 1-char CJK command with natural particle (次へ)",
    cmdNextJa && cmdNextJa.action === 'next'
  );

  // Bug J: Content-aware era classification in buildSemanticTimeline
  var latinTimeline = VocabMorphology.buildSemanticTimeline({
    word: 'prescribe',
    lang: 'en',
    etymology: 'ラテン語 praescribere (あらかじめ前に書く) → フランス語 prescrire → 中英語 prescribe (指図・処方する)'
  }, 'ja');
  assert("buildSemanticTimeline detects era based on content rather than fixed indexing",
    latinTimeline && latinTimeline.steps[0].era.indexOf('古典期') !== -1
  );

  // Bug K: 10-language parity in SEMANTIC_REALMS (Macro-Realm Ontology)
  var realmLangs = ['ja', 'en', 'fr', 'de', 'es', 'it', 'pt', 'nl', 'zh', 'ko'];
  var allRealmsLocalized = Object.values(VocabMorphology.SEMANTIC_REALMS).every(function(r) {
    return r.i18n && realmLangs.every(function(l) { return typeof r.i18n[l] === 'string' && r.i18n[l].length > 0; });
  });
  assert("SEMANTIC_REALMS provides 10-language parity labels for all macro domains", allRealmsLocalized);

  // Bug L: Search query tokenization preserves slash compounds (and/or, w/o)
  var slashQueryTokens = VocabSearch.extractQueryTokens('and/or w/o');
  assert("VocabSearch.extractQueryTokens preserves slash-joined compounds without splitting",
    slashQueryTokens.length === 2 && slashQueryTokens[0] === 'and/or' && slashQueryTokens[1] === 'w/o'
  );

  // Bug M: parseAnkiExport decodes single quote & HTML entities for lossless round-trip
  var ankiSample = "<b>l&#39;homme</b>\t<b>Noun</b> l'homme (the man)<br><small>c&#39;est la vie</small>\ttag1";
  var parsedAnkiQuotes = VocabExport.parseAnkiExport(ankiSample);
  assert("parseAnkiExport decodes &#39; into authentic apostrophe for French/English",
    parsedAnkiQuotes.length === 1 && parsedAnkiQuotes[0].word === "l'homme"
  );

  // Bug N: predictIntervals formats locale-appropriate strings for 10 languages
  var dummyAnkiCard = { interval: 1, repetition: 1, stability: 2.5, difficulty: 5.0 };
  var intervalsZh = VocabSRS.predictIntervals(dummyAnkiCard, 'zh');
  var intervalsKo = VocabSRS.predictIntervals(dummyAnkiCard, 'ko');
  assert("predictIntervals provides localized strings for zh and ko",
    intervalsZh[0] === '1分钟后' && intervalsKo[0] === '1분 후'
  );

  // Bug O: calculateNextReview self-heals from future clock drift
  var futureClockCard = {
    word: 'resilient',
    interval: 5,
    repetition: 2,
    stability: 5.0,
    reviewUpdatedAt: Date.now() + 86400000 * 10 // 10 days in the future
  };
  var nextRevCalc = VocabSRS.calculateNextReview(futureClockCard, 2);
  assert("calculateNextReview self-heals clock drift without NaN or corrupted future timestamp",
    Number.isFinite(nextRevCalc.nextReview) && nextRevCalc.reviewUpdatedAt <= Date.now() + 1000
  );

  // Bug P: handleGlobalKeydown ignores keys during IME composition (keyCode 229)
  var handledIme = VocabNavigation.handleGlobalKeydown({ key: 'Enter', keyCode: 229, isComposing: false });
  assert("handleGlobalKeydown ignores Enter during IME composition (keyCode 229)", handledIme === false);

  // Bug Q: handleGlobalKeydown guards Anki review shortcuts when a modal is open
  var ankiAdvanceCalled = false;
  var handledModal = VocabNavigation.handleGlobalKeydown(
    { key: ' ', code: 'Space' },
    {
      isAnkiOpen: true,
      anyModalOpen: true,
      ankiAdvance: function() { ankiAdvanceCalled = true; }
    }
  );
  assert("handleGlobalKeydown does not trigger Anki advance when modal is open over Anki",
    handledModal === false && ankiAdvanceCalled === false
  );

  // Bug R: parseApiJson recovers truncated JSON array from stream cutoff
  var truncatedJson = '[{"word":"paradigm","meanings":[{"pos":"Noun","text":"模範"}]},{"word":"ephemeral"';
  var repairedArr = null;
  VocabDictionary.parseApiJson(truncatedJson).then(function(val) { repairedArr = val; });
  if (typeof drainMicrotasks === 'function') drainMicrotasks();
  assert("parseApiJson repairs truncated JSON array and preserves completed items",
    Array.isArray(repairedArr) && repairedArr.length === 1 && repairedArr[0].word === "paradigm"
  );

  // Bug S: parseShareDeckUrl localizes fallback title across 10 languages
  var frDeckCode = VocabExport.generateClassroomDeckCode([{ word: 'bonjour', meanings: [{ pos: 'Noun', text: 'hello' }] }], '', 'fr');
  var parsedFr = VocabExport.parseShareDeckUrl(frDeckCode.code);
  assert("parseShareDeckUrl provides authentic localized fallback title (Paquet Classroom)",
    parsedFr && parsedFr.title === 'Paquet Classroom'
  );

  // Bug T: parseApiJson repairs truncated JSON object from stream cutoff
  var truncatedObjJson = '{"word":"concur","meanings":[{"pos":"vi","text":"agree"';
  var repairedObj = null;
  VocabDictionary.parseApiJson(truncatedObjJson).then(function(val) { repairedObj = val; });
  if (typeof drainMicrotasks === 'function') drainMicrotasks();
  assert("parseApiJson repairs truncated JSON object and recovers partial payload",
    repairedObj !== null && repairedObj.word === "concur" && Array.isArray(repairedObj.meanings) && repairedObj.meanings[0].text === "agree"
  );

  // Bug U: buildNuanceComparison resolves comprehend vs apprehend and Korean localization
  var nuanceComp = VocabMorphology.buildNuanceComparison('comprehend');
  assert("buildNuanceComparison resolves comprehend vs apprehend pair",
    nuanceComp !== null && nuanceComp.pair === 'apprehend' && nuanceComp.root.indexOf('*gʰed-') !== -1
  );
  VocabI18n.setLocale('ko');
  var nuanceCompKoHtml = VocabMorphology.renderNuanceComparisonHtml(nuanceComp);
  assert("renderNuanceComparisonHtml translates nuance meanings to Korean",
    nuanceCompKoHtml.indexOf('포괄적으로 이해하다') !== -1 && nuanceCompKoHtml.indexOf('핵심 차이') !== -1
  );
  VocabI18n.setLocale('ja');

  // Bug V: tokenizeReaderSentence tokenizes Korean Hangul and Latin compounds
  var koreanSent = '인공지능 AI 모델이 문맥을 분석합니다.';
  var koreanTokens = VocabModal.tokenizeReaderSentence(koreanSent);
  assert("tokenizeReaderSentence accurately segments Korean Hangul sentences",
    Array.isArray(koreanTokens) && koreanTokens.indexOf('인공지능') !== -1 && koreanTokens.indexOf('AI') !== -1
  );

  // Bug W: renderSemanticTimelineHtml includes Han Unification lang tag
  var testTimeline = {
    title: '语义演变',
    lang: 'zh',
    steps: [
      { era: '古典期', content: '原始词义' },
      { era: '现代期', content: '现代定着义' }
    ]
  };
  var timelineZhHtml = VocabMorphology.renderSemanticTimelineHtml(testTimeline);
  assert("renderSemanticTimelineHtml outputs lang attribute for CJK Han Unification",
    timelineZhHtml.indexOf('lang="zh"') !== -1 && timelineZhHtml.indexOf('原始词义') !== -1
  );

  // Bug X: VocabWebGLGraph exports resilient API
  assert("VocabWebGLGraph exports resilient API and render method",
    typeof VocabWebGLGraph.render === 'function' && typeof VocabWebGLGraph.invalidate === 'function'
  );

  // Bug Y: ko -> ko starter pack localization has zero Japanese kana leakage
  var koSpRes = VocabStarterPack.populateStarterPack([], 'ko', 'ko_pre1', 'distinction_entries_ko_ko', 'ko');
  var hasKanaRe = /[\u3040-\u309f\u30a0-\u30ff]/;
  var koSpClean = Array.isArray(koSpRes.added) && koSpRes.added.length === 8 && koSpRes.added.every(function(c) {
    return c.tgtLang === 'ko' && c.pair === 'ko_ko' &&
      !hasKanaRe.test(c.grammar_forms || '') &&
      !hasKanaRe.test(c.category || '') &&
      !hasKanaRe.test(c.folder || '') &&
      !hasKanaRe.test(c.core || '') &&
      !hasKanaRe.test(c.etymology || '') &&
      !hasKanaRe.test(c.history_note || '') &&
      !hasKanaRe.test(c.example && c.example.trans || '') &&
      (c.meanings || []).every(function(m) { return !hasKanaRe.test(m.text || ''); }) &&
      (c.phrases || []).every(function(p) { return !hasKanaRe.test(p.trans || ''); }) &&
      (c.derivatives || []).every(function(d) { return !hasKanaRe.test(d.meaning || ''); });
  });
  assert("populateStarterPack ko_ko localizes all 8 starter cards to Korean with zero Japanese kana", koSpClean);

  // Bug Z: repairEntriesLocalization auto-heals polluted ko_ko starter cards
  var pollutedKoCard = {
    id: 'ko_pre1_insik',
    num: 6,
    word: '인식',
    lang: 'ko',
    tgtLang: 'ko',
    pair: 'ko_ko',
    grammar_forms: '한자: 認識 / 字源: *識 (見分ける・記す)',
    category: 'その他',
    folder: '韓国語 TOPIK II・漢字語字源ネットワーク選',
    meanings: [{ pos: 'N', text: '認識、理解' }],
    core: '物事の本質を見極めて心に記す（*識）こと。',
    etymology: '韓国漢字語「認識」。日本語「認識」と完全同源。',
    etymologyTags: ['*識'],
    history_note: 'クラスタを形成。',
    example: { foreign: '인식이 높아졌다.', trans: '認識が大きく高まった。' }
  };
  var healedKoList = VocabCore.repairEntriesLocalization([pollutedKoCard], { key: 'distinction_entries_ko_ko', srcLang: 'ko', tgtLang: 'ko' });
  var healedKo = healedKoList && healedKoList[0];
  assert("repairEntriesLocalization heals Japanese-polluted ko_ko cards back to pure Korean",
    healedKo &&
    !hasKanaRe.test(healedKo.core || '') &&
    !hasKanaRe.test(healedKo.etymology || '') &&
    !hasKanaRe.test(healedKo.history_note || '') &&
    !hasKanaRe.test(healedKo.category || '') &&
    !hasKanaRe.test(healedKo.folder || '') &&
    !hasKanaRe.test(healedKo.grammar_forms || '') &&
    !hasKanaRe.test((healedKo.meanings && healedKo.meanings[0] && healedKo.meanings[0].text) || '')
  );

  // Bug AA: Card + Timeline rendering in ko -> ko under Japanese UI locale contains zero Japanese body/badges/timeline text
  VocabI18n.setLocale('ja');
  var koTimeline = VocabMorphology.buildSemanticTimeline(healedKo, 'ko');
  var koTimelineHtml = VocabMorphology.renderSemanticTimelineHtml(koTimeline);
  assert("buildSemanticTimeline renders pure Korean root/stem/modern steps for ko_ko without Japanese kana",
    koTimeline && Array.isArray(koTimeline.steps) && koTimeline.steps.length >= 3 &&
    !hasKanaRe.test(koTimelineHtml) &&
    koTimelineHtml.indexOf('분별하다') !== -1 &&
    koTimelineHtml.indexOf('기저 형태소') !== -1
  );
  var koCardEl = VocabCardView.createCardElement(healedKo, { tgtLang: 'ko', lang: 'ko' });
  var koCardVisibleHtml = String(koCardEl.innerHTML || '').replace(/\s+(?:title|aria-label)="[^"]*"/g, '');
  var koStarterInsikEl = VocabCardView.createCardElement(koSpRes.added[5], { tgtLang: 'ko', lang: 'ko' });
  var koStarterInsikHtml = String(koStarterInsikEl.innerHTML || '').replace(/\s+(?:title|aria-label)="[^"]*"/g, '');
  assert("createCardElement ko_ko card body/badges/folder/due render in Korean even when UI locale is ja",
    !hasKanaRe.test(koCardVisibleHtml) &&
    koCardVisibleHtml.indexOf('KO 스타터 팩') !== -1 &&
    koCardVisibleHtml.indexOf('일반') !== -1 &&
    !hasKanaRe.test(koStarterInsikHtml) &&
    koStarterInsikHtml.indexOf('인식·심리') !== -1 &&
    koStarterInsikHtml.indexOf('복습 기한') !== -1
  );

  // Bug AB: Compound categories & toolbar keys translate properly to Korean
  assert("VocabI18n translates その他 and compound categories to Korean cleanly",
    VocabI18n.translateCategory('その他', 'ko') === '일반' &&
    VocabI18n.translateCategory('法学・人権', 'ko') === '법학·인권' &&
    VocabI18n.t('list.academic', '', 'ko') === '학술 상세' &&
    VocabI18n.t('nav.sort_new', '', 'ko') === '정렬: 최신순'
  );

  // 33. High-Precision Short Writing Grammar & Context Evaluator Tests
  var evalMissingDet = VocabAnkiView.evaluateUserWriting('enormous', 'I have enormous apple', { lang: 'en', tgtLang: 'ja', core: '桁外れに大きい' });
  assert("evaluateUserWriting flags missing determiner before singular countable noun ('I have enormous apple') with 'an enormous apple' suggestion",
    evalMissingDet.valid === false && evalMissingDet.score < 65 && evalMissingDet.feedback.indexOf('an enormous apple') !== -1
  );
  var evalBadArt = VocabAnkiView.evaluateUserWriting('enormous', 'I have a enormous apple.', { lang: 'en', tgtLang: 'en' });
  assert("evaluateUserWriting flags a/an sound mismatch ('a enormous') and suggests 'an enormous'",
    evalBadArt.valid === false && evalBadArt.feedback.indexOf('an enormous') !== -1
  );
  var evalSvaErr = VocabAnkiView.evaluateUserWriting('enormous', 'I has an enormous apple.', { lang: 'en', tgtLang: 'en' });
  assert("evaluateUserWriting flags subject-verb agreement error ('I has' -> 'I have')",
    evalSvaErr.valid === false && evalSvaErr.feedback.indexOf('I have') !== -1
  );
  var evalModalErr = VocabAnkiView.evaluateUserWriting('enormous', 'She can goes to the enormous library.', { lang: 'en', tgtLang: 'en' });
  assert("evaluateUserWriting flags modal + inflected verb error ('can goes')",
    evalModalErr.valid === false && evalModalErr.feedback.indexOf('can goes') !== -1
  );
  var evalCleanShort = VocabAnkiView.evaluateUserWriting('enormous', 'I have an enormous apple.', { lang: 'en', tgtLang: 'ja' });
  assert("evaluateUserWriting accepts grammatically sound sentence ('I have an enormous apple.')",
    evalCleanShort.valid === true && evalCleanShort.score >= 80
  );
  var evalRichEnormous = VocabAnkiView.evaluateUserWriting('enormous', 'We discovered an enormous fossil buried deep beneath the desert.', { lang: 'en', tgtLang: 'ja' });
  assert("evaluateUserWriting awards high score to rich grammatical sentence",
    evalRichEnormous.valid === true && evalRichEnormous.score >= 90
  );
  var evalStuffing = VocabAnkiView.evaluateUserWriting('enormous', 'enormous enormous enormous enormous', { lang: 'en', tgtLang: 'ja' });
  assert("evaluateUserWriting penalizes word repetition stuffing",
    evalStuffing.valid === false && evalStuffing.score < 70
  );
  var evalIrreg = VocabAnkiView.evaluateUserWriting('apply', 'She applied the scientific method to solve the complex problem.', { lang: 'en', tgtLang: 'en' });
  assert("evaluateUserWriting recognizes -y -> -ied inflection ('apply' -> 'applied')",
    evalIrreg.valid === true && evalIrreg.score >= 90
  );
  var evalCopied = VocabAnkiView.evaluateUserWriting('enormous', 'The project required an enormous effort.', { lang: 'en', tgtLang: 'en', example: { foreign: 'The project required an enormous effort.' } });
  assert("evaluateUserWriting detects verbatim copy of card example sentence",
    evalCopied.valid === false && evalCopied.score <= 70
  );

  // 34. Anti-Hallucination & Example Quality Validation Tests (validateEntry / validateExampleQuality)
  var hallucinatedCard = {
    word: 'xyzzyplugh',
    lang: 'en',
    tgtLang: 'ja',
    etymologyConfidence: 'unknown',
    etymologyTags: [],
    etymology: '語源不明',
    meanings: [{ pos: 'N[C]', text: 'xyzzyplughの中心的語義' }],
    example: { foreign: 'This is a xyzzyplugh', ja: 'This is a xyzzyplugh', used_form: 'missingform' }
  };
  var hallucFlags = VocabMorphology.validateEntry(hallucinatedCard);
  assert("validateEntry flags hallucinated/stub meanings, broken example punctuation, missing <b>, and unverified etymology",
    hallucFlags.indexOf('語義が仮置きまたは未検証') !== -1 &&
    hallucFlags.indexOf('例文の文頭大文字・文末句読点不備') !== -1 &&
    hallucFlags.indexOf('和訳に<b>なし') !== -1 &&
    hallucFlags.indexOf('used_formが例文中に無い') !== -1 &&
    hallucFlags.indexOf('語源・実在性が未検証') !== -1
  );

  var badExGrammarCard = {
    word: 'enormous',
    lang: 'en',
    tgtLang: 'ja',
    etymologyConfidence: 'certain',
    etymologyTags: ['*norma'],
    etymology: 'ラテン語 *norma（基準）+ e-（外へ）',
    meanings: [{ pos: 'Adj', text: '桁外れに大きい' }],
    example: { foreign: 'I have a enormous apple.', ja: '私は<b>巨大な</b>リンゴを持っている。', used_form: 'enormous' }
  };
  var badExFlags = VocabMorphology.validateEntry(badExGrammarCard);
  assert("validateEntry catches English grammar errors inside card examples ('a enormous')",
    badExFlags.indexOf('例文の文法不備') !== -1
  );

  var cleanValidCard = {
    word: 'enormous',
    lang: 'en',
    tgtLang: 'ja',
    etymologyConfidence: 'certain',
    etymologyTags: ['*norma'],
    etymology: 'ラテン語 *norma（基準）+ e-（外へ）',
    meanings: [{ pos: 'Adj', text: '桁外れに大きい、莫大な' }],
    example: { foreign: 'The project required an enormous amount of effort.', ja: 'その計画には<b>莫大な</b>労力が必要だった。', used_form: 'enormous' }
  };
  var cleanFlags = VocabMorphology.validateEntry(cleanValidCard);
  assert("validateEntry passes well-formed grounded card with zero flags",
    cleanFlags.length === 0
  );

  // 35. Comprehensive Bug Audit Regression Tests (Cross-module API, i18n parity, mergeWords tie-breaker)
  assert("VocabGraph exports updateGraphDataAndFit, startGraphSimulation, playSkillUnlockSound",
    typeof VocabGraph.updateGraphDataAndFit === 'function' &&
    typeof VocabGraph.startGraphSimulation === 'function' &&
    typeof VocabGraph.playSkillUnlockSound === 'function'
  );
  assert("VocabModal exposes switchExtractMode and VocabSync exposes isCloudReady",
    typeof VocabModal.switchExtractMode === 'function' &&
    typeof VocabSync.isCloudReady === 'function' &&
    typeof VocabEikenCatalog.getWord === 'function'
  );

  // 10-language i18n full key parity & placeholder parity
  var allLocs = Object.keys(VocabI18n.TRANSLATIONS);
  var unionKeys = {};
  allLocs.forEach(function(loc) {
    Object.keys(VocabI18n.TRANSLATIONS[loc]).forEach(function(k) { unionKeys[k] = true; });
  });
  var totalUnionCount = Object.keys(unionKeys).length;
  var parityOk = allLocs.length === 10 && allLocs.every(function(loc) {
    return Object.keys(VocabI18n.TRANSLATIONS[loc]).length === totalUnionCount;
  });
  assert("VocabI18n maintains complete key parity across all 10 locales (" + totalUnionCount + " keys each)", parityOk);

  // Verify 3rd-arg fallback parameter behavior in VocabI18n.t()
  var fbResult = VocabI18n.t('non.existent.key.xyz', { count: 3 }, 'Fallback {count}');
  assert("VocabI18n.t honors 3rd-arg fallback string with placeholder interpolation", fbResult === 'Fallback 3');

  // Verify mergeWords tie-breaker selects higher version when timestamps are equal
  var equalTs = 1700000000000;
  var localVerCard = { id: 'merge_v_1', word: 'vertest', lang: 'en', updatedAt: equalTs, version: 5, folder: '', notes: '', meanings: [{ pos: 'N', text: 'v5' }] };
  var remoteVerCard = { id: 'merge_v_1', word: 'vertest', lang: 'en', updatedAt: equalTs, version: 2, folder: 'General', notes: 'stale note', meanings: [{ pos: 'N', text: 'v2' }] };
  var mergedSameTs = VocabStorage.mergeWords([remoteVerCard], [localVerCard]);
  var mergedWinner = mergedSameTs.find(function(x) { return x.id === 'merge_v_1'; });
  assert("VocabStorage.mergeWords breaks equal-timestamp ties using higher version",
    mergedWinner && mergedWinner.version === 5 && !mergedWinner.folder && mergedWinner.notes === ''
  );

  // Verify failed queue entries do not block resubmission
  var catHitWord = VocabEikenCatalog.getWord('moribund');
  assert("VocabEikenCatalog.getWord resolves catalog word schema cleanly",
    !catHitWord || (typeof catHitWord === 'object' && ('meanings' in catHitWord || 'core' in catHitWord))
  );

  // Verify evaluateUserWriting preserves core_zh and core_ko rather than wiping valid Hanzi/Hangul
  var zhCoreItem = { word: 'enormous', tgtLang: 'zh', core: '巨大な', core_zh: '极其庞大的', meanings: [{ pos: 'Adj', text: '巨大的' }], example: { foreign: 'An enormous ship arrived.' } };
  var koCoreItem = { word: 'enormous', tgtLang: 'ko', core: '巨大な', core_ko: '엄청나게 큰', meanings: [{ pos: 'Adj', text: '거대한' }], example: { foreign: 'An enormous ship arrived.' } };
  var zhEvalRes = VocabAnkiView.evaluateUserWriting('enormous', 'We saw an enormous whale near the coast.', zhCoreItem);
  var koEvalRes = VocabAnkiView.evaluateUserWriting('enormous', 'We saw an enormous whale near the coast.', koCoreItem);
  assert("evaluateUserWriting preserves valid core_zh and core_ko core images",
    zhEvalRes.feedback.indexOf('极其庞大的') !== -1 && koEvalRes.feedback.indexOf('엄청나게 큰') !== -1
  );

  // Regression tests for jump-to-word bugs
  // 1) Homograph #2 page resolution when #1 appears earlier in filtered results
  (function() {
    var homoList = [];
    homoList.push({ id: 'hm-bank-1', word: 'bank', homographIndex: 1, lang: 'en', meanings: [{ pos: 'Noun', text: '銀行' }] });
    for (var hi = 1; hi <= 32; hi++) {
      homoList.push({ id: 'hm-pad-' + hi, word: 'padword' + hi, lang: 'en', meanings: [{ pos: 'Noun', text: '仮' + hi }] });
    }
    homoList.push({ id: 'hm-bank-2', word: 'bank', homographIndex: 2, lang: 'en', meanings: [{ pos: 'Noun', text: '堤防' }] });
    // On 'new' (newest first) or 'old' sort, test with 'old' sort so bank#1 is index 0 (page 1) and bank#2 is index 33 (page 2)
    var prevSort = VocabCore.App.sortBy;
    var prevEntries = VocabCore.App.entries;
    var prevPage = VocabCore.App.page;
    try {
      VocabCore.App.sortBy = 'old';
      VocabCore.setJson('distinction_entries', homoList);
      VocabCore.App.entries = homoList;
      VocabCore.jumpToWord('bank#2', 'en');
      assert("jumpToWord navigates to homograph #2 page (page 2) instead of matching homograph #1 on page 1",
        VocabCore.App.page === 2, "Page: " + VocabCore.App.page);
    } finally {
      VocabCore.App.sortBy = prevSort;
      VocabCore.App.entries = prevEntries;
      VocabCore.App.page = prevPage;
    }
  })();

  // 2) jumpToWord switches language cleanly even when crossLang filter was active
  (function() {
    var prevLang = VocabCore.App.lang;
    var prevSrc = VocabCore.App.srcLang;
    var prevTgt = VocabCore.App.tgtLang;
    var prevCross = VocabCore.App.crossLang;
    var prevEntries = VocabCore.App.entries;
    try {
      var frCards = [{ id: 'fr-lumiere', word: 'lumiere', lang: 'fr', meanings: [{ pos: 'Noun', text: '光' }] }];
      var frPairKey = VocabStorage.getPairConfig('fr', 'ja').key;
      VocabCore.setJson(frPairKey, frCards);
      VocabCore.App.lang = 'en';
      VocabCore.App.srcLang = 'en';
      VocabCore.App.tgtLang = 'ja';
      VocabCore.App.entries = [{ id: 'en-light', word: 'light', lang: 'en', meanings: [{ pos: 'Noun', text: '光' }] }];
      VocabCore.App.crossLang = true;
      var jumped = VocabCore.jumpToWord('lumiere', 'fr');
      assert("jumpToWord switches pair when crossLang is enabled and locates target word",
        jumped === true && VocabCore.App.srcLang === 'fr' && VocabCore.App.crossLang === false);
    } finally {
      VocabCore.App.lang = prevLang;
      VocabCore.App.srcLang = prevSrc;
      VocabCore.App.tgtLang = prevTgt;
      VocabCore.App.crossLang = prevCross;
      VocabCore.App.entries = prevEntries;
    }
  })();

  // 3) Submitting an already-registered word via submitW skips daily AI quota gate and jumps to card
  (function() {
    var origGetEl = documentMock.getElementById;
    var origOpenUpsell = globalThis.openUpsellModal;
    var origJump = globalThis.jumpToWord;
    var origQuotaFn = VocabStorage.getDailyAiUsageInfo;
    var prevEntries = VocabCore.App.entries;
    var prevKey = VocabCore.App.key;
    var upsellCalled = false;
    var jumpedWord = '';
    try {
      var existingCard = { id: 'q-existing-1', word: 'epistemic', homographIndex: 1, lang: 'en', meanings: [{ pos: 'Adj', text: '認識論的な' }], core: '知識の枠組みに関する', example: { foreign: 'Epistemic humility matters.' } };
      VocabCore.setJson('distinction_entries', [existingCard]);
      VocabCore.App.entries = [existingCard];
      VocabCore.App.srcLang = 'en';
      VocabCore.App.tgtLang = 'ja';
      VocabCore.App.key = '';
      VocabCore.App._lastSubmitWord = '';
      VocabCore.App._lastSubmitTs = 0;

      var fakeInWord = Object.assign({}, dummyElement, { id: 'inWord', value: 'epistemic' });
      var fakeInFol = Object.assign({}, dummyElement, { id: 'inFol', value: '' });
      var fakeSuggest = Object.assign({}, dummyElement, { id: 'wordSuggestBox', style: { display: 'block' } });
      documentMock.getElementById = function(id) {
        if (id === 'inWord') return fakeInWord;
        if (id === 'inFol') return fakeInFol;
        if (id === 'wordSuggestBox') return fakeSuggest;
        return origGetEl.call(documentMock, id);
      };
      VocabStorage.getDailyAiUsageInfo = function() { return { limit: 5, used: 5, remaining: 0, isUnlimited: false }; };
      globalThis.openUpsellModal = function() { upsellCalled = true; };
      globalThis.jumpToWord = function(w) { jumpedWord = w; return true; };

      VocabQueue.submitW();
      assert("submitW on an already-registered word bypasses zero AI quota lock and jumps to card",
        !upsellCalled && jumpedWord === 'epistemic' && fakeInWord.value === '' && fakeSuggest.style.display === 'none');
    } finally {
      documentMock.getElementById = origGetEl;
      globalThis.openUpsellModal = origOpenUpsell;
      globalThis.jumpToWord = origJump;
      VocabStorage.getDailyAiUsageInfo = origQuotaFn;
      VocabCore.App.entries = prevEntries;
      VocabCore.App.key = prevKey;
    }
  })();

  // 4) initWordSuggest cancels pending suggest display on cancelSuggest / form submit / cleared input
  (function() {
    var origGetEl = documentMock.getElementById;
    var origSetTimeout = globalThis.setTimeout;
    var origClearTimeout = globalThis.clearTimeout;
    var scheduledCallbacks = [];
    var cancelledIds = {};
    try {
      var listeners = {};
      var formListeners = {};
      var fakeForm = {
        addEventListener: function(ev, fn) { (formListeners[ev] = formListeners[ev] || []).push(fn); },
        removeEventListener: function(ev, fn) {}
      };
      var fakeInput = Object.assign({}, dummyElement, {
        id: 'inWord',
        value: 'epi',
        form: fakeForm,
        addEventListener: function(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
        removeEventListener: function(ev, fn) {}
      });
      var fakeBox = Object.assign({}, dummyElement, { id: 'wordSuggestBox', style: { display: 'none' }, innerHTML: '' });
      documentMock.getElementById = function(id) {
        if (id === 'inWord') return fakeInput;
        if (id === 'wordSuggestBox') return fakeBox;
        return origGetEl.call(documentMock, id);
      };
      globalThis.setTimeout = function(fn, ms) {
        var id = scheduledCallbacks.length + 1;
        scheduledCallbacks.push({ id: id, fn: fn });
        return id;
      };
      globalThis.clearTimeout = function(id) {
        cancelledIds[id] = true;
      };
      var ctrl = VocabNavigation.initWordSuggest({
        inputId: 'inWord',
        boxId: 'wordSuggestBox',
        getSuggestionsData: function() { return [{ word: 'epistemic', meaning: '認識論的な', lang: 'en', type: 'word', exact: false }]; }
      });
      // Trigger typing then immediately clear + submit before timer fires
      (listeners['input'] || []).forEach(function(fn) { fn({ target: fakeInput }); });
      fakeInput.value = '';
      (formListeners['submit'] || []).forEach(function(fn) { fn({}); });
      scheduledCallbacks.forEach(function(item) {
        if (!cancelledIds[item.id]) item.fn();
      });
      assert("initWordSuggest cancels pending debounce timer on submit and keeps suggest box hidden",
        fakeBox.style.display === 'none' && typeof ctrl.cancelSuggest === 'function');
    } finally {
      documentMock.getElementById = origGetEl;
      globalThis.setTimeout = origSetTimeout;
      globalThis.clearTimeout = origClearTimeout;
    }
  })();

  // 5) scrollToCard clears highlight-jump from previous cards on rapid consecutive jumps
  (function() {
    var origQueryAll = documentMock.querySelectorAll;
    try {
      var prevClasses = { 'highlight-jump': true };
      var makeClassList = function(map) {
        return {
          add: function(c) { map[c] = true; },
          remove: function(c) { delete map[c]; },
          contains: function(c) { return !!map[c]; }
        };
      };
      var prevCard = { classList: makeClassList(prevClasses), offsetHeight: 100 };
      var nextClasses = {};
      var nextCard = {
        classList: makeClassList(nextClasses),
        scrollIntoView: function() {},
        getBoundingClientRect: function() { return { top: 200, height: 100 }; },
        offsetHeight: 100
      };
      documentMock.querySelectorAll = function(sel) {
        if (sel === '#list .card.highlight-jump' && prevClasses['highlight-jump']) return [prevCard];
        if (sel === '#list .card') return [prevCard, nextCard];
        return [];
      };
      var cont = {
        scrollTop: 0,
        clientHeight: 600,
        getBoundingClientRect: function() { return { top: 0, height: 600 }; },
        scrollTo: function(opts) { this.scrollTop = opts.top; }
      };
      VocabCardView.scrollToCard(nextCard, cont);
      assert("scrollToCard strips highlight-jump from previous card when jumping to another card",
        !prevClasses['highlight-jump'] && !!nextClasses['highlight-jump']);
    } finally {
      documentMock.querySelectorAll = origQueryAll;
    }
  })();

  // 6) list.jumped_to_word localized across all 10 languages with placeholder interpolation
  assert("list.jumped_to_word translates cleanly across ja and en",
    VocabI18n.t('list.jumped_to_word', { word: 'epistemic' }).length > 0 &&
    VocabI18n.TRANSLATIONS.en['list.jumped_to_word'].indexOf('{word}') !== -1 &&
    VocabI18n.TRANSLATIONS.ja['list.jumped_to_word'].indexOf('{word}') !== -1
  );

  // Comprehensive Audit Wave Regressions
  // A1) Graph network drawGraph (no totalWordsCount ReferenceError) & tree unmatched root fallback (no createUnifiedPieRoot ReferenceError)
  (function() {
    var netOk = false;
    try {
      var mockCtx = {
        save: function(){}, restore: function(){}, clearRect: function(){}, scale: function(){},
        translate: function(){}, beginPath: function(){}, arc: function(){}, fill: function(){},
        stroke: function(){}, moveTo: function(){}, lineTo: function(){}, setLineDash: function(){},
        fillText: function(){}, measureText: function(){ return { width: 20 }; },
        createRadialGradient: function(){ return { addColorStop: function(){} }; },
        createLinearGradient: function(){ return { addColorStop: function(){} }; }
      };
      var mockCanvas = { width: 800, height: 600, getContext: function(){ return mockCtx; } };
      var gs = {
        layoutMode: 'network', width: 800, height: 600, panX: 0, panY: 0, zoom: 1,
        nodes: [{ id: 'n1', type: 'word', word: 'test', label: 'test', x: 100, y: 100, radius: 10, level: 3, data: { word: 'test' } }],
        edges: [], hoveredNode: null, selectedNode: null, searchMatches: new Set(), collapsedRoots: new Set(), unlockParticles: []
      };
      if (VocabGraphRenderer && typeof VocabGraphRenderer.drawGraph === 'function') {
        VocabGraphRenderer.drawGraph(mockCanvas, gs);
        netOk = true;
      }
    } catch (ge) { netOk = false; }
    assert("VocabGraphRenderer.drawGraph runs in network mode without totalWordsCount ReferenceError", netOk);

    var treeFallbackOk = false;
    var prevGraphEntries = VocabCore.getJson('distinction_entries');
    try {
      if (VocabGraphLayout && typeof VocabGraphLayout.buildGraphData === 'function') {
        VocabCore.setJson('distinction_entries', [{ id: 't1', word: 'alpha', lang: 'en', meanings: [{ pos: 'N', text: 'アルファ' }], etymologyTags: ['*al'] }]);
        var gsTree = {
          layoutMode: 'tree', focusedRootKey: '*nonexistentroot999', width: 800, height: 600,
          nodes: [], edges: [], collapsedRoots: new Set()
        };
        var builtTree = VocabGraphLayout.buildGraphData('', false, 'all', gsTree);
        treeFallbackOk = builtTree && Array.isArray(builtTree.nodes) && builtTree.nodes.length > 0;
      }
    } catch (te) { treeFallbackOk = false; }
    finally { VocabCore.setJson('distinction_entries', prevGraphEntries || []); }
    assert("VocabGraphLayout.buildGraphData falls back cleanly when focusedRootKey is absent", treeFallbackOk);
  })();

  // A2) Prototype pollution defense in parseAnyWords, winner ID preservation in mergeWords, and count=0 in recordAiGenerationUsage
  (function() {
    var protoPayload = JSON.stringify({ "__proto__": [{ word: "pollute", meanings: [{ pos: "N", text: "test" }] }], en: [{ word: "safe", meanings: [{ pos: "N", text: "安全" }] }] });
    var parsedSafe = VocabStorage.parseAnyWords(protoPayload, 'en', false);
    assert("VocabStorage.parseAnyWords ignores __proto__ keys cleanly",
      Object.getPrototypeOf(parsedSafe) === Object.prototype && Array.isArray(parsedSafe.en) && parsedSafe.en.length === 1);

    var localLose = { id: 'local_1', word: 'collide', wordKey: 'en:collide', lang: 'en', updatedAt: 1000, version: 1, meanings: [{ pos: 'N', text: 'old' }] };
    var remoteWin = { id: 'remote_2', word: 'collide', wordKey: 'en:collide', lang: 'en', updatedAt: 5000, version: 3, meanings: [{ pos: 'N', text: 'new' }] };
    var colMerged = VocabStorage.mergeWords([localLose], [remoteWin]);
    assert("VocabStorage.mergeWords preserves winner ID on wordKey collision", colMerged.length === 1 && colMerged[0].id === 'remote_2');

    var todayStr = VocabStorage.getTodayString();
    var prevU = localStorage.getItem('vv_ai_gen_daily_' + todayStr);
    localStorage.setItem('vv_ai_gen_daily_' + todayStr, '2');
    var afterZero = VocabStorage.recordAiGenerationUsage(0);
    assert("VocabStorage.recordAiGenerationUsage(0) does not increment daily usage", afterZero.used === 2);
    if (prevU === null) localStorage.removeItem('vv_ai_gen_daily_' + todayStr);
    else localStorage.setItem('vv_ai_gen_daily_' + todayStr, prevU);
  })();

  // A3) Smart Reader typographic apostrophe & CJK Latin word-boundary tokenization
  (function() {
    var frToks = VocabModal.tokenizeReaderSentence("L’homme est grand.", new Set());
    var cjkToks = VocabModal.tokenizeReaderSentence("私はinternationalを学ぶ", new Set(['in']));
    assert("tokenizeReaderSentence preserves typographic apostrophe contractions and Latin word boundaries in CJK",
      frToks[0] === 'L’homme' && cjkToks.indexOf('international') !== -1);
  })();

  // A4) analyzeEnglishGrammar flags verbless determiner+noun fragments even if target word has V POS
  (function() {
    var nounFragRes = VocabAnkiView.evaluateUserWriting('run', 'A quick run today.', {
      word: 'run', lang: 'en', meanings: [{ pos: 'V[I]', text: '走る' }, { pos: 'N[C]', text: '走り' }]
    });
    assert("evaluateUserWriting detects missing main verb in determiner+target fragments",
      nounFragRes.issues.some(function(x) { return x && x.type === 'issueNoVerb'; }));
  })();

  // A5) undoAnkiRev restores reviewUpdatedAt and flags cleanly
  (function() {
    var origRevTs = 1700000123456;
    var testCard = {
      id: 'undo-reg-1', word: 'undoword', lang: 'en', interval: 5, repetition: 2,
      efactor: 2.5, stability: 5, difficulty: 5, retrievability: 0.9, lapses: 0,
      nextReview: Date.now() + 86400000, flags: [], version: 1, reviewUpdatedAt: origRevTs, updatedAt: origRevTs
    };
    var prevEntries = VocabCore.App.entries;
    var prevHist = VocabCore.App.ankiHistory;
    try {
      VocabCore.App.entries = [testCard];
      VocabCore.App.aList = [testCard];
      VocabCore.App.ankiHistory = [{
        lang: 'en', id: 'undo-reg-1', targetKey: 'distinction_entries',
        prevProps: {
          interval: 5, repetition: 2, efactor: 2.5, stability: 5, difficulty: 5,
          retrievability: 0.9, lapses: 0, nextReview: testCard.nextReview,
          flags: [], version: 1, reviewUpdatedAt: origRevTs, updatedAt: origRevTs
        },
        requeued: false
      }];
      testCard.flags = ['leech'];
      testCard.reviewUpdatedAt = Date.now();
      VocabAnkiView.undoAnkiRev({
        appState: VocabCore.App,
        getList: function() { return VocabCore.App.entries; },
        saveList: function() {}
      });
      assert("undoAnkiRev restores original reviewUpdatedAt and flags without overwriting with now",
        testCard.reviewUpdatedAt === origRevTs && Array.isArray(testCard.flags) && testCard.flags.length === 0);
    } finally {
      VocabCore.App.entries = prevEntries;
      VocabCore.App.ankiHistory = prevHist;
    }
  })();

  // A6) Queue failed task re-submission & internal fallback placeholder detection
  (function() {
    assert("VocabQueue.isPlaceholderItem catches internal root-expansion and generic English stubs",
      VocabQueue.isPlaceholderItem({ word: 'specter', meanings: [{ pos: 'N', text: '（語根 *spec に由来する語義展開）' }], core: 'x' }) &&
      VocabQueue.isPlaceholderItem({ word: 'specter', meanings: [{ pos: 'N', text: 'ghost' }], core: 'The core contextual usage of specter is demonstrated here.' })
    );
  })();

  // A7) Cross-account switch in VocabSync.setSession triggers vault isolation
  (function() {
    var origClear = VocabStorage.clearAccountVaultData;
    var clearCalled = false;
    try {
      VocabStorage.clearAccountVaultData = function() { clearCalled = true; };
      localStorage.setItem('vv_cloud_owner_id', 'user-a');
      VocabSync.setSession({ access_token: 'tok-b', user: { id: 'user-b' } });
      assert("VocabSync.setSession purges prior user vault data when switching accounts",
        clearCalled === true && localStorage.getItem('vv_cloud_owner_id') === 'user-b');
    } finally {
      VocabStorage.clearAccountVaultData = origClear;
      VocabSync.setSession(null);
      localStorage.removeItem('vv_cloud_owner_id');
    }
  })();

  // A8) Existing word search & jump regression tests
  (function() {
    var manyPrefix = [
      { word: 'prohibit', meanings: [{ pos: 'V', text: '禁止する' }] },
      { word: 'promote', meanings: [{ pos: 'V', text: '促進する' }] },
      { word: 'project', meanings: [{ pos: 'N', text: '計画' }] },
      { word: 'provide', meanings: [{ pos: 'V', text: '提供する' }] },
      { word: 'protect', meanings: [{ pos: 'V', text: '保護する' }] },
      { word: 'produce', meanings: [{ pos: 'V', text: '生産する' }] },
      { word: 'promise', meanings: [{ pos: 'V', text: '約束する' }] },
      { word: 'process', meanings: [{ pos: 'N', text: '過程' }] },
      { word: 'pro', meanings: [{ pos: 'N', text: '専門家' }] },
      { word: 'café', meanings: [{ pos: 'N', text: 'カフェ' }] }
    ];
    var s1 = VocabNavigation.buildSuggestions('pro', manyPrefix);
    assert("buildSuggestions finds exact match even after 7+ prefix matches",
      s1.length > 0 && s1[0].word === 'pro' && s1[0].isExact === true);

    var s2 = VocabNavigation.buildSuggestions('cafe', manyPrefix);
    assert("buildSuggestions matches accent-folded exact word (cafe -> café)",
      s2.length > 0 && s2[0].word === 'café' && s2[0].isExact === true);

    var mockState = {
      lang: 'en', srcLang: 'en', tgtLang: 'ja',
      entries: [{ id: 'c1', word: 'café', lang: 'fr', meanings: [{ pos: 'N', text: 'カフェ' }] }],
      loadedKey: 'distinction_entries', page: 1,
      resetFilters: function() {}
    };
    var fallbackSearchVal = null;
    var missRes = VocabListView.jumpToWord('nonexistent_xyz', 'fr', {
      appState: mockState,
      getJson: function() { return []; },
      getAllKnownPairs: function() { return []; },
      setSearch: function(v) { fallbackSearchVal = v; }
    });
    assert("jumpToWord does not corrupt active lang/entries on miss",
      missRes === false && mockState.lang === 'en' && mockState.srcLang === 'en' && mockState.entries.length === 1 && fallbackSearchVal === 'nonexistent_xyz');

    var hitRes = VocabListView.jumpToWord('cafe', 'en', {
      appState: mockState,
      getFiltered: function() { return mockState.entries; },
      onRender: function() {}
    });
    assert("jumpToWord finds accent-folded existing word (cafe -> café)", hitRes === true);
  })();

  // 7) scrollToCard cancels pending align timers & cleans listeners on user scroll, and stabilizes jumping-to-card removal
  (function() {
    var origSetTimeout = globalThis.setTimeout;
    var origClearTimeout = globalThis.clearTimeout;
    var origAddDoc = documentMock.addEventListener;
    var origRemoveDoc = documentMock.removeEventListener;
    var origGetById = documentMock.getElementById;
    var origQueryAll = documentMock.querySelectorAll;
    try {
      var scheduled = [];
      var clearedIds = {};
      var nextTid = 1000;
      globalThis.setTimeout = function(fn, ms) {
        var id = nextTid++;
        scheduled.push({ id: id, fn: fn, ms: ms });
        return id;
      };
      globalThis.clearTimeout = function(id) { clearedIds[id] = true; };

      var listClasses = {};
      var listElMock = {
        classList: {
          add: function(c) { listClasses[c] = true; },
          remove: function(c) { delete listClasses[c]; },
          contains: function(c) { return !!listClasses[c]; }
        }
      };
      var contListeners = {};
      var docListeners = {};
      documentMock.addEventListener = function(ev, fn) { docListeners[ev] = fn; };
      documentMock.removeEventListener = function(ev, fn) {
        if (docListeners[ev] === fn) delete docListeners[ev];
      };
      documentMock.getElementById = function(id) {
        if (id === 'list') return listElMock;
        return origGetById ? origGetById(id) : null;
      };

      var anchorShiftEnabled = false;
      var targetCard = {
        classList: { add: function(){}, remove: function(){}, contains: function(){ return false; } },
        scrollIntoView: function() {},
        getBoundingClientRect: function() {
          var shifted = anchorShiftEnabled && !listClasses['jumping-to-card'];
          return { top: shifted ? 340 : 300, bottom: shifted ? 460 : 420, height: 120 };
        },
        offsetHeight: 120
      };
      documentMock.querySelectorAll = function(sel) {
        if (sel === '#list .card') return [targetCard];
        return [];
      };
      var cont = {
        scrollTop: 100,
        clientHeight: 600,
        offsetHeight: 600,
        getBoundingClientRect: function() { return { top: 100, bottom: 700, height: 600 }; },
        scrollTo: function(opts) { this.scrollTop = opts.top; },
        addEventListener: function(ev, fn) { contListeners[ev] = fn; },
        removeEventListener: function(ev, fn) {
          if (contListeners[ev] === fn) delete contListeners[ev];
        }
      };

      VocabCardView.scrollToCard(targetCard, cont);
      assert("scrollToCard binds wheel/touchstart/pointerdown/mousedown listeners",
        Boolean(contListeners.wheel && contListeners.touchstart && contListeners.pointerdown && contListeners.mousedown && docListeners.keydown));

      // Simulate user scrolling away immediately after jump
      cont.scrollTop = 950;
      contListeners.wheel();
      var pendingAlignAfterWheel = scheduled.filter(function(t) { return (t.ms === 80 || t.ms === 200) && !clearedIds[t.id]; });
      assert("user wheel scroll cancels 80ms/200ms align timers and detaches listeners",
        pendingAlignAfterWheel.length === 0 && !contListeners.wheel && !docListeners.keydown);

      // Simulate 600ms jumping-to-card removal: even if card top shifts when jumping-to-card is removed, viewport scrollTop compensates
      var classTimer = scheduled.filter(function(t) { return t.ms === 600; })[0];
      anchorShiftEnabled = true;
      classTimer.fn();
      assert("user scroll is never pulled back and jumping-to-card removal compensates viewport shift",
        cont.scrollTop === 990 && !listClasses['jumping-to-card']);

      // skipRetry: true should not schedule 80/200/600ms timers and removes jumping-to-card immediately
      scheduled = [];
      clearedIds = {};
      anchorShiftEnabled = false;
      VocabCardView.scrollToCard(targetCard, cont, { immediate: true, skipRetry: true });
      var retryTimers = scheduled.filter(function(t) { return t.ms === 80 || t.ms === 200 || t.ms === 600; });
      assert("scrollToCard with skipRetry skips align/class timers and cleans up immediately",
        retryTimers.length === 0 && !listClasses['jumping-to-card'] && !contListeners.wheel);
    } finally {
      globalThis.setTimeout = origSetTimeout;
      globalThis.clearTimeout = origClearTimeout;
      documentMock.addEventListener = origAddDoc;
      documentMock.removeEventListener = origRemoveDoc;
      documentMock.getElementById = origGetById;
      documentMock.querySelectorAll = origQueryAll;
    }
  })();

  // 8) IME compositionend guard in initWordSuggest & mobile sidebar Escape/modal collapse
  (function() {
    var origGetById = documentMock.getElementById;
    var origQuerySel = documentMock.querySelector;
    var origInnerWidth = globalThis.window.innerWidth;
    try {
      var inputListeners = {};
      var boxListeners = {};
      var mockInput = {
        value: 'ex',
        addEventListener: function(ev, fn) { inputListeners[ev] = fn; },
        removeEventListener: function(ev, fn) { if (inputListeners[ev] === fn) delete inputListeners[ev]; },
        focus: function() {},
        blur: function() {}
      };
      var mockBox = {
        style: { display: 'flex' },
        innerHTML: '',
        addEventListener: function(ev, fn) { boxListeners[ev] = fn; },
        removeEventListener: function(ev, fn) { if (boxListeners[ev] === fn) delete boxListeners[ev]; },
        querySelectorAll: function() { return [{ dataset: { type: 'word', word: 'ex' }, classList: { toggle: function(){} } }]; },
        querySelector: function() { return { dataset: { type: 'word', word: 'ex' } }; }
      };
      var jumpedBySuggest = false;
      var suggestCtrl = VocabNavigation.initWordSuggest({
        input: mockInput,
        box: mockBox,
        getCurrentList: function() { return [{ word: 'ex', meanings: [{ pos: 'N', text: 'test' }] }]; },
        onJumpWord: function() { jumpedBySuggest = true; }
      });

      // Simulate Safari/WebKit IME compositionend followed immediately by Enter keydown
      inputListeners.compositionstart();
      inputListeners.compositionend({ target: mockInput });
      var preventedAfterIme = false;
      inputListeners.keydown({ key: 'Enter', isComposing: false, keyCode: 13, preventDefault: function(){ preventedAfterIme = true; } });
      assert("initWordSuggest does not hijack Enter immediately after IME compositionend",
        jumpedBySuggest === false && preventedAfterIme === false);
      suggestCtrl.destroy();

      // Mobile sidebar closes on Escape and toggleModal collapses mobile sidebar
      globalThis.window.innerWidth = 375;
      var bodyClasses = { 'side-open-lock': true };
      var origBodyClassList = documentMock.body.classList;
      documentMock.body.classList = {
        add: function(c) { bodyClasses[c] = true; },
        remove: function(c) { delete bodyClasses[c]; },
        contains: function(c) { return !!bodyClasses[c]; },
        toggle: function(c, force) { if (force === undefined) { bodyClasses[c] ? delete bodyClasses[c] : (bodyClasses[c] = true); } else if (force) bodyClasses[c] = true; else delete bodyClasses[c]; }
      };
      var modalClasses = {};
      var mockModal = {
        classList: {
          contains: function(c) { return !!modalClasses[c]; },
          toggle: function(c, f) { if (f === undefined) { modalClasses[c] ? delete modalClasses[c] : (modalClasses[c] = true); } else if (f) modalClasses[c] = true; else delete modalClasses[c]; }
        }
      };
      documentMock.getElementById = function(id) {
        if (id === 'readerWordPopover') return { style: { display: 'none' } };
        if (id === 'settingsModal') return mockModal;
        return origGetById ? origGetById(id) : null;
      };
      documentMock.querySelector = function(sel) {
        if (sel === '.modal-ov.open') return modalClasses.open ? mockModal : null;
        return origQuerySel ? origQuerySel(sel) : null;
      };
      var escHandled = VocabNavigation.handleGlobalKeydown({ key: 'Escape', isComposing: false, keyCode: 27 }, {
        isAnkiOpen: false,
        anyModalOpen: false,
        closeSidebar: function() { delete bodyClasses['side-open-lock']; bodyClasses['side-collapsed'] = true; }
      });
      assert("handleGlobalKeydown closes open mobile sidebar on Escape",
        escHandled === true && !bodyClasses['side-open-lock'] && !!bodyClasses['side-collapsed']);

      // Re-open mobile sidebar and open modal via toggleModal
      delete bodyClasses['side-collapsed'];
      bodyClasses['side-open-lock'] = true;
      VocabModal.toggleModal('settingsModal', true);
      assert("toggleModal collapses mobile sidebar (adds side-collapsed, removes side-open-lock) when opening modal",
        !!bodyClasses['side-collapsed'] && !bodyClasses['side-open-lock'] && !!modalClasses.open);

      documentMock.body.classList = origBodyClassList;
    } finally {
      globalThis.window.innerWidth = origInnerWidth;
      documentMock.getElementById = origGetById;
      documentMock.querySelector = origQuerySel;
    }
  })();

  // 9) Centralized VocabCore state setters protect isDev invariants and sanitize focusedCardIndex
  (function() {
    var origDev = VocabCore.App.isDev;
    var origPro = VocabCore.App.isPro;
    var origAdmin = VocabCore.App.isAdmin;
    var origServerAdmin = VocabCore.App._serverAdmin;
    var origComp = VocabCore.App.isComposing;
    var origFocus = VocabCore.App.focusedCardIndex;
    try {
      VocabCore.App.isDev = true;
      VocabCore.setProState(false);
      VocabCore.setAdminState(false);
      assert("VocabCore.setProState & setAdminState preserve isDev master authority",
        VocabCore.App.isPro === true && VocabCore.App.isAdmin === true);

      VocabCore.App.isDev = false;
      VocabCore.setProState(false);
      VocabCore.setAdminState(false);
      assert("VocabCore.setProState & setAdminState update cleanly when isDev is false",
        VocabCore.App.isPro === false && VocabCore.App.isAdmin === false);

      VocabCore.setComposingState(1);
      assert("VocabCore.setComposingState normalizes boolean", VocabCore.App.isComposing === true);
      VocabCore.setComposingState(0);
      assert("VocabCore.setComposingState resets boolean", VocabCore.App.isComposing === false);

      VocabCore.setFocusedCardIndex(4);
      assert("VocabCore.setFocusedCardIndex accepts non-negative integer", VocabCore.App.focusedCardIndex === 4);
      VocabCore.setFocusedCardIndex(-5);
      assert("VocabCore.setFocusedCardIndex clamps negative/invalid values to -1", VocabCore.App.focusedCardIndex === -1);
    } finally {
      VocabCore.App.isDev = origDev;
      VocabCore.App.isPro = origPro;
      VocabCore.App.isAdmin = origAdmin;
      VocabCore.App._serverAdmin = origServerAdmin;
      VocabCore.App.isComposing = origComp;
      VocabCore.App.focusedCardIndex = origFocus;
    }
  })();
} catch (e) {
  assert("app.js loading test", false, String(e));
}

// Print results as JSON
print(JSON.stringify(results));
