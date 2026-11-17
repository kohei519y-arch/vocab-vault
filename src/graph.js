/**
 * Vocab Vault — Root Network Graph Controller (js/graph.js)
 * Master Facade integrating Layout, Renderer & Views Engines
 * 4-Tier Lineage Skill Tree, Celestial Physics, Viewport Culling & Deep Inspector
 */
(function (global) {
  'use strict';

  /** @param {string} id @returns {any} */
  const $id = id => (typeof document !== 'undefined' ? document.getElementById(id) : null);

  // Sub-modules references
  const Layout = () => global.VocabGraphLayout || {};
  const Renderer = () => global.VocabGraphRenderer || {};
  const Views = () => global.VocabGraphViews || {};

  const cleanRootKey = k => (Layout().cleanRootKey ? Layout().cleanRootKey(k) : String(k || '').replace(/^\*/, '').replace(/-$/, ''));
  const extractBranchInfo = (item, rk, l) => (Layout().extractBranchInfo ? Layout().extractBranchInfo(item, rk, l) : 'General');
  const computeOffThreadPositions = (n, e, iter) => (Layout().computeOffThreadPositions ? Layout().computeOffThreadPositions(n, e, iter) : n);
  const getRootMeaning = (rk, cw) => (Layout().getRootMeaning ? Layout().getRootMeaning(rk, cw) : '');

  let graphState = {
    canvas: null,
    ctx: null,
    nodes: [],
    edges: [],
    width: 800,
    height: 600,
    zoom: 1,
    panX: 0,
    panY: 0,
    isDragging: false,
    dragNode: null,
    dragStartX: 0,
    dragStartY: 0,
    dragMoved: false,
    hoverNode: null,
    selectedNode: null,
    filterQuery: '',
    langFilter: 'all',
    familyFilter: 'all',
    colorMode: 'language', // 'language' | 'retention'
    layoutMode: 'network', // 'network' | 'tree' (4階層系統樹)
    activeViewTab: 'mindmap', // 'mindmap' | 'matrix'
    focusedRootKey: '', // 1語根フォーカスモードで選択中の語根 (例: '*sta-')
    microTreeFocus: false, // 1語根マイクロツリー集中モード (ワーキングメモリ認知負荷低減)
    treeMaskMode: false, // 赤シート (Mask) モード
    timelineEra: 3, // 0: 印欧祖語, 1: 古代ギリシャ・ローマ, 2: 中世古仏・ノルマン, 3: 近代・現代 (すべて)
    treeEasingFrame: 0,
    treeEasingTimer: null,
    collapsedBranches: new Set(),
    collapsedRoots: new Set(),
    myWordsOnly: false,
    clusterOnly: false,
    physicsPaused: false,
    animId: null,
    isSleeping: true,
    touchDist: 0,
    eikenSkillMode: false,
    unlockParticles: []
  };
  if (global._sharedGraphState) {
    Object.assign(graphState, global._sharedGraphState);
  }
  function pruneUnlockParticles() {
    const arr = graphState.unlockParticles;
    if (!Array.isArray(arr) || !arr.length) return;
    const now = Date.now();
    for (let i = arr.length - 1; i >= 0; i--) {
      if (!arr[i].__bornAt || (now - arr[i].__bornAt) > 3000) {
        arr.splice(i, 1);
      }
    }
  }

  /**
   * スキル習得・覚醒時のRPGファンファーレWeb Audioシンセチャイム（ゼロ外部依存）
   */
  function playSkillUnlockSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 -> E5 -> G5 -> C6 (RPG Fanfare)
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.16, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.32);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.32);
      });
      setTimeout(() => {
        try { ctx.close(); } catch (e) {}
      }, 800);
    } catch (e) {}
  }

  // 学術語根・派生形の正規化エイリアスマップ（VocabGraphLayout 側をSSOTとして参照）
  const CANONICAL_ROOT_ALIASES = (function() {
    return (typeof global !== 'undefined' && global.VocabGraphLayout?.CANONICAL_ROOT_ALIASES) || {};
  })();


  function buildGraphData(filterRootKey = '', clusterOnly = false, langFilter = 'all') {
    if (Layout().buildGraphData) {
      return Layout().buildGraphData(filterRootKey, clusterOnly, langFilter, graphState);
    }
    return { nodes: [], edges: [] };
  }

  function drawGraph() {
    if (Renderer().drawGraph) {
      Renderer().drawGraph(graphState);
    }
  }

  function invalidateTreeBgCache() {
    if (Renderer().invalidateTreeBgCache) Renderer().invalidateTreeBgCache();
  }

  function renderMindmap() {
    if (Views().renderMindmap) Views().renderMindmap(graphState);
  }

  function renderMorphologyMatrix() {
    if (Views().renderMorphologyMatrix) Views().renderMorphologyMatrix(graphState);
  }

  function promptMatrixGen(prefix, rootKey) {
    if (Views().promptMatrixGen) Views().promptMatrixGen(prefix, rootKey);
  }

  function populateRootJumpSelect(roots) {
    if (Views().populateRootJumpSelect) Views().populateRootJumpSelect(roots);
  }

  function updateBreadcrumbUI(roots) {
    if (Views().updateBreadcrumbUI) Views().updateBreadcrumbUI(roots);
  }

  function renderDetailDrawer(node) {
    if (Views().renderDetailDrawer) Views().renderDetailDrawer(node, graphState);
  }

  function unlockCurrentRootEikenWords() {
    if (Views().unlockCurrentRootEikenWords) Views().unlockCurrentRootEikenWords(graphState);
  }

  function toggleEikenExplorer(forceState) {
    if (Views().toggleEikenExplorer) Views().toggleEikenExplorer(forceState);
  }

  function renderEikenExplorer() {
    if (Views().renderEikenExplorer) Views().renderEikenExplorer(graphState);
  }

  function exportGraphImage() {
    // 1200x630 (X/Twitter OGP最適サイズ) のオフスクリーンキャンバスを生成
    // VOCAB VAULT — ETYMOLOGY LINEAGE TREE
    if (Views().exportGraphImage) {
      return Views().exportGraphImage(graphState);
    }
  }
  function clearRootFocus() {
    graphState.focusedRootKey = '';
    if (typeof document !== 'undefined') {
      const sel = $id('graphRootJumpSel');
      if (sel) sel.value = '';
    }
    updateGraphDataAndFit();
    if (graphState.layoutMode === 'tree') startTreeEasingAnimation();
    if (graphState.activeViewTab === 'mindmap') renderMindmap();
    if (graphState.activeViewTab === 'matrix') renderMorphologyMatrix();
  }

  /**
   * 特定語根へフォーカス
   */
  function focusRoot(rootKey) {
    graphState.focusedRootKey = cleanRootKey(rootKey);
    if (typeof document !== 'undefined') {
      const sel = $id('graphRootJumpSel');
      if (sel) sel.value = graphState.focusedRootKey;
    }
    updateGraphDataAndFit();
    if (graphState.layoutMode === 'tree') startTreeEasingAnimation();
    if (graphState.activeViewTab === 'mindmap') renderMindmap();
    if (graphState.activeViewTab === 'matrix') renderMorphologyMatrix();
  }

  // =========================================================================
  // 1. UIの段階的開示を管理する状態遷移マネージャー (State Pattern)
  // =========================================================================
  class GraphUIManager {
    constructor() {
      // モードごとの可視コントロール定義（マインドマップ & 接頭辞マトリクスに最適化）
      this.modeConfig = {
        network: ['searchBox', 'langFilter', 'rootJump', 'colorModeBtn', 'clusterBtn', 'physicsBtn', 'wateringBtn', 'maskBtn', 'microTreeBtn'],
        tree: ['searchBox', 'langFilter', 'rootJump', 'skillTreeBtn', 'wateringBtn', 'maskBtn', 'microTreeBtn'],
        mindmap: ['searchBox', 'langFilter', 'rootJump', 'wateringBtn', 'maskBtn', 'microTreeBtn'],
        matrix: ['searchBox', 'langFilter', 'rootJump', 'wateringBtn', 'maskBtn']
      };
    }

    getControls() {
      if (typeof document === 'undefined') return {};
      return {
        searchBox: $id('graphFilterInput'),
        langFilter: $id('graphLangFilterSel'),
        rootJump: $id('graphRootJumpSel'),
        treeModeBtn: $id('graphTreeModeBtn'),
        skillTreeBtn: $id('graphEikenExplorerBtn'),
        colorModeBtn: $id('graphColorModeBtn'),
        clusterBtn: $id('graphClusterFilterBtn'),
        physicsBtn: $id('graphPhysicsBtn'),
        wateringBtn: $id('graphWateringBtn'),
        maskBtn: $id('graphTreeMaskBtn'),
        microTreeBtn: $id('graphMicroTreeBtn'),
        zoomControls: $id('graphZoomWrap') || $id('graphZoomVal')?.parentElement,
        fitBtn: $id('graphFitBtn') || document.querySelector('button[onclick*="fitGraphToView"]'),
        resetZoomBtn: $id('graphResetZoomBtn') || document.querySelector('button[onclick*="resetGraphZoom"]'),
        exportBtn: $id('graphExportBtn') || document.querySelector('button[onclick*="exportGraphImage"]')
      };
    }

    /**
     * モード変更時に不要なUIを隠蔽し、認知的過負荷を防ぐ
     * @param {string} mode - 'network', 'tree', 'mindmap', 'matrix'
     */
    applyMode(mode) {
      if (typeof document === 'undefined') return;
      const targetConfig = this.modeConfig[mode] || this.modeConfig.network;
      const visibleSet = new Set(targetConfig);
      const controls = this.getControls();

      for (const [key, element] of Object.entries(controls)) {
        if (!element) continue;
        element.style.display = visibleSet.has(key) ? '' : 'none';
      }
      // タブ（graphTabTree）と機能重複する旧単体ボタンは常時非表示
      if (controls.treeModeBtn) controls.treeModeBtn.style.display = 'none';
    }
  }

  // =========================================================================
  // 2. 空間ハッシュによる高速ビューポートカリング描画クラス
  // =========================================================================
  class SpatialCullingRenderer {
    constructor(cellSize = 150) {
      this.cellSize = cellSize;
      this.grid = new Map();
    }

    /**
     * 毎フレームの更新時にノードを空間グリッドに登録する
     * @param {Array} nodes - 描画対象の全ノード
     */
    buildGrid(nodes) {
      this.grid.clear();
      for (let i = 0; i < (nodes || []).length; i++) {
        const n = nodes[i];
        if (!n || !Number.isFinite(n.x) || !Number.isFinite(n.y)) continue;

        const col = Math.floor(n.x / this.cellSize);
        const row = Math.floor(n.y / this.cellSize);
        const key = `${col},${row}`;

        let cell = this.grid.get(key);
        if (!cell) {
          cell = [];
          this.grid.set(key, cell);
        }
        cell.push(n);
      }
    }

    /**
     * ビューポート内に存在するノードのみを抽出する O(K)
     * @param {number} viewLeft
     * @param {number} viewTop
     * @param {number} viewRight
     * @param {number} viewBottom
     * @returns {Array} 画面内に存在するノードの配列
     */
    getVisibleNodes(viewLeft, viewTop, viewRight, viewBottom) {
      const visibleNodes = [];
      const seen = new Set();
      const startCol = Math.floor(viewLeft / this.cellSize);
      const endCol = Math.floor(viewRight / this.cellSize);
      const startRow = Math.floor(viewTop / this.cellSize);
      const endRow = Math.floor(viewBottom / this.cellSize);

      for (let c = startCol; c <= endCol; c++) {
        for (let r = startRow; r <= endRow; r++) {
          const cell = this.grid.get(`${c},${r}`);
          if (cell) {
            for (let i = 0; i < cell.length; i++) {
              const n = cell[i];
              if (seen.has(n)) continue;
              // 境界値の厳密な判定（半径分のバッファを考慮）
              const buffer = n.radius || 10;
              if (n.x + buffer >= viewLeft && n.x - buffer <= viewRight &&
                  n.y + buffer >= viewTop && n.y - buffer <= viewBottom) {
                seen.add(n);
                visibleNodes.push(n);
              }
            }
          }
        }
      }
      return visibleNodes;
    }
  }

  const graphUIManager = new GraphUIManager();
  const spatialCullingRenderer = new SpatialCullingRenderer(150);

  /**
   * 4つの実用ビューモード切り替え (ネットワーク / 系統樹ツリー / マインドマップ / 接頭辞×語根)
   */
  function switchViewMode(mode) {
    if (mode === 'tree') {
      graphState.layoutMode = 'tree';
      graphState.physicsPaused = true;
    } else if (mode === 'network') {
      graphState.layoutMode = 'network';
      graphState.physicsPaused = false;
    }

    // ネットワークとツリーのUIは廃止し、マインドマップと接頭辞マトリクスに特化
    const targetTab = (mode === 'matrix') ? 'matrix' : 'mindmap';
    graphState.activeViewTab = targetTab;

    if (typeof document !== 'undefined') {
      graphUIManager.applyMode(targetTab);

      const tabMindmap = $id('graphTabMindmap');
      const tabMatrix = $id('graphTabMatrix');
      if (tabMindmap) tabMindmap.classList.toggle('active', targetTab === 'mindmap');
      if (tabMatrix) tabMatrix.classList.toggle('active', targetTab === 'matrix');

      const canvasWrap = $id('graphCanvasWrap');
      const mindmapWrap = $id('graphMindmapWrap');
      const matrixWrap = $id('graphMatrixWrap');
      const bcBar = $id('graphTreeBreadcrumbBar');
      const timelineBar = $id('graphTimelineBar');

      if (canvasWrap) canvasWrap.style.display = 'none';
      if (timelineBar) timelineBar.style.display = 'none';

      if (targetTab === 'mindmap') {
        if (mindmapWrap) mindmapWrap.style.display = 'block';
        if (matrixWrap) matrixWrap.style.display = 'none';
        if (bcBar) bcBar.style.display = 'flex';
        renderMindmap();
      } else {
        if (mindmapWrap) mindmapWrap.style.display = 'none';
        if (matrixWrap) matrixWrap.style.display = 'block';
        if (bcBar) bcBar.style.display = 'none';
        renderMorphologyMatrix();
      }
    }
  }

  /**
   * 放射状スキルツリー: 中心から外側へブワッと広がりピタッと静止するイージングアニメーション (easeOutBack)
   */
  function startTreeEasingAnimation() {
    if (graphState.animId) cancelAnimationFrame(graphState.animId);
    if (graphState.treeEasingTimer) cancelAnimationFrame(graphState.treeEasingTimer);

    const nodes = graphState.nodes;
    if (!nodes || !nodes.length) return;

    // 各ノードの親語根の中心を基準に、極座標の放射状アニメーション開始位置を設定
    const fallbackRoot = nodes.find(n => n.type === 'root') || { targetX: 0, targetY: 0 };

    nodes.forEach(n => {
      if (n.type === 'root') {
        n.startX = (n.x !== undefined && Number.isFinite(n.x)) ? n.x : (n.targetX || 0);
        n.startY = (n.y !== undefined && Number.isFinite(n.y)) ? n.y : (n.targetY || 0);
      } else {
        const pRoot = (n.rootLabel ? nodes.find(r => r.type === 'root' && r.label === n.rootLabel) : null) || fallbackRoot;
        const rcx = pRoot.targetX || 0;
        const rcy = pRoot.targetY || 0;
        const tx = n.targetX !== undefined ? n.targetX : 0;
        const ty = n.targetY !== undefined ? n.targetY : 0;
        const angle = Math.atan2(ty - rcy, tx - rcx);
        // 中心から微小半径 (r0 = 12) でブワッと放射状に噴出
        n.startX = rcx + Math.cos(angle) * 12;
        n.startY = rcy + Math.sin(angle) * 12;
        n.x = n.startX;
        n.y = n.startY;
      }
    });

    let frame = 0;
    const maxFrames = 22; // 約360ms (60fps)

    function easeStep() {
      frame++;
      const t = frame / maxFrames;
      // easeOutBack: 勢いよく広がりわずかにオーバーシュートしてピタッと静止
      const c1 = 0.70;
      const c3 = c1 + 1;
      const inv = t - 1;
      const progress = 1 + c3 * inv * inv * inv + c1 * inv * inv;

      nodes.forEach(n => {
        if (n.targetX !== undefined && n.targetY !== undefined) {
          n.x = n.startX + (n.targetX - n.startX) * progress;
          n.y = n.startY + (n.targetY - n.startY) * progress;
          n.vx = 0;
          n.vy = 0;
        }
      });

      drawGraph();

      if (frame < maxFrames) {
        graphState.treeEasingTimer = requestAnimationFrame(easeStep);
      } else {
        // イージング完了: 目標確定座標に一致させ、完全静止
        nodes.forEach(n => {
          if (n.targetX !== undefined && n.targetY !== undefined) {
            n.x = n.targetX;
            n.y = n.targetY;
            n.vx = 0;
            n.vy = 0;
          }
        });
        graphState.isSleeping = true;
        graphState.physicsPaused = true;
        drawGraph();
      }
    }

    graphState.treeEasingTimer = requestAnimationFrame(easeStep);
  }

  /**
   * アイデア①: 枯れ枝の一括水やり復習 (Branch Targeted Review)
   * FSRS想起率 R < 0.85 または期日到来の赤・黄色の単語をまとめてAnki復習
   */
  function startWateringReview() {
    const nodes = graphState.nodes || [];
    const now = Date.now();
    let words = [];

    // 現在フォーカスされている語根の単語、または全単語から要復習単語を抽出
    const targetWords = nodes.filter(n => n.type === 'word' && n.item).map(n => n.item);
    if (!targetWords.length) {
      const toastFn = global.showToast || global.VocabCore?.showToast;
      if (typeof toastFn === 'function') toastFn('復習対象の単語が見つかりませんでした。', 'info');
      return;
    }

    // FSRS想起率 R < 0.85 または期日到来の単語（要水やり単語）
    const dueOrWeakWords = targetWords.filter(item => {
      const r = global.VocabSRS?.getRetrievability ? global.VocabSRS.getRetrievability(item, now) : 0.7;
      const isDue = (item.nextReview || 0) <= now;
      return isDue || r < 0.85;
    });

    const finalReviewList = dueOrWeakWords.length > 0 ? dueOrWeakWords : targetWords;

    const toggleModalFn = global.toggleModal || global.VocabCore?.toggleModal;
    if (typeof toggleModalFn === 'function') toggleModalFn('graphModal', false);

    const startAnkiFn = global.startAnki || global.VocabCore?.startAnki;
    if (typeof startAnkiFn === 'function') {
      startAnkiFn(finalReviewList);
      const toastFn = global.showToast || global.VocabCore?.showToast;
      if (typeof toastFn === 'function') {
        const rootName = graphState.focusedRootKey ? `語根「${graphState.focusedRootKey}」の` : '';
        toastFn(`${rootName}要復習単語（全${finalReviewList.length}語）で水やり復習を開始しました！`, 'ok', 4000);
      }
    }
  }

  /**
   * 能動的想起テスト (Active Recall Mode) のトグル
   */
  function toggleTreeMask() {
    graphState.treeMaskMode = !graphState.treeMaskMode;
    const btn = $id('graphTreeMaskBtn');
    if (btn) {
      btn.textContent = graphState.treeMaskMode ? '想起テスト:ON' : '想起テスト:OFF';
      btn.classList.toggle('active', graphState.treeMaskMode);
    }
    drawGraph();
    if (graphState.activeViewTab === 'mindmap') renderMindmap();
    if (graphState.activeViewTab === 'matrix') renderMorphologyMatrix();
    if (graphState.selectedNode) renderDetailDrawer(graphState.selectedNode);
    const toastFn = global.showToast || global.VocabCore?.showToast;
    if (typeof toastFn === 'function') {
      toastFn(graphState.treeMaskMode ? '想起テストモードをONにしました。意味を伏せて想起テストができます。' : '想起テストモードをOFFにしました。', 'info', 2500);
    }
  }

  /**
   * 想起テスト: 伏せられた意味・語源を開示
   */
  function revealRecallAnswer() {
    if (typeof document === 'undefined') return;
    const maskBox = $id('graphRecallMaskContainer');
    const content = $id('graphRecallContent');
    const ratingBar = $id('graphRecallRatingBar');
    if (maskBox) maskBox.style.display = 'none';
    if (content) content.style.display = 'block';
    if (ratingBar) ratingBar.style.display = 'flex';
  }

  /**
   * 1語根マイクロツリー集中モード (ワーキングメモリ負荷低減)
   */
  function toggleMicroTreeFocus() {
    graphState.microTreeFocus = !graphState.microTreeFocus;
    const btn = $id('graphMicroTreeBtn');
    if (btn) {
      btn.textContent = graphState.microTreeFocus ? '1語根集中:ON' : '1語根集中:OFF';
      btn.classList.toggle('active', graphState.microTreeFocus);
    }
    if (graphState.microTreeFocus) {
      if (!graphState.focusedRootKey) {
        const rootNodes = (graphState.allRoots && graphState.allRoots.length > 0)
          ? graphState.allRoots
          : (graphState.nodes || []).filter(n => n.type === 'root');
        const sorted = [...rootNodes].sort((a, b) => (b.childCount || 0) - (a.childCount || 0));
        const top = sorted[0];
        if (top) {
          focusRoot(top.label);
        } else {
          updateGraphDataAndFit();
        }
      } else {
        updateGraphDataAndFit();
      }
    } else {
      graphState.focusedRootKey = '';
      if (typeof document !== 'undefined') {
        const sel = $id('graphRootJumpSel');
        if (sel) sel.value = '';
      }
      updateGraphDataAndFit();
    }
    const toastFn = global.showToast || global.VocabCore?.showToast;
    if (typeof toastFn === 'function') {
      toastFn(graphState.microTreeFocus
        ? `1語根集中モードをONにしました (${graphState.focusedRootKey || '語根'}に絞り込み、認知負荷を低減)`
        : '1語根集中モードをOFFにしました (全系統樹を表示)', 'info', 2500);
    }
  }

  function getRootSequence() {
    if (Array.isArray(graphState.allRoots) && graphState.allRoots.length > 0) {
      return graphState.allRoots;
    }
    if (typeof document !== 'undefined') {
      const sel = $id('graphRootJumpSel');
      if (sel && sel.options && sel.options.length > 1) {
        const list = [];
        for (let i = 1; i < sel.options.length; i++) {
          if (sel.options[i].value) {
            list.push({ label: sel.options[i].value, childCount: 0 });
          }
        }
        if (list.length > 0) return list;
      }
    }
    return (graphState.nodes || []).filter(n => n.type === 'root');
  }

  /**
   * 次の語根へ順次ナビゲーション (Wキー)
   */
  function nextRoot() {
    const list = getRootSequence();
    if (!list.length) return;
    const curKey = graphState.focusedRootKey;
    let idx = list.findIndex(r => r.label === curKey);
    let nextIdx = (idx + 1) % list.length;
    const nextR = list[nextIdx];
    if (nextR) {
      focusRoot(nextR.label);
      const rootNode = (graphState.nodes || []).find(n => n.type === 'root' && n.label === nextR.label);
      if (rootNode) {
        selectNode(rootNode, false);
        centerOnNode(rootNode, 1.1, true);
      }
      const toastFn = global.showToast || global.VocabCore?.showToast;
      if (typeof toastFn === 'function') {
        toastFn(`次の語根: ${nextR.label}${nextR.childCount ? ` (${nextR.childCount}語)` : ''}`, 'info', 1500);
      }
    }
  }

  /**
   * 前の語根へ順次ナビゲーション (Qキー)
   */
  function prevRoot() {
    const list = getRootSequence();
    if (!list.length) return;
    const curKey = graphState.focusedRootKey;
    let idx = list.findIndex(r => r.label === curKey);
    if (idx === -1) idx = 0;
    let prevIdx = (idx - 1 + list.length) % list.length;
    const prevR = list[prevIdx];
    if (prevR) {
      focusRoot(prevR.label);
      const rootNode = (graphState.nodes || []).find(n => n.type === 'root' && n.label === prevR.label);
      if (rootNode) {
        selectNode(rootNode, false);
        centerOnNode(rootNode, 1.1, true);
      }
      const toastFn = global.showToast || global.VocabCore?.showToast;
      if (typeof toastFn === 'function') {
        toastFn(`前の語根: ${prevR.label}${prevR.childCount ? ` (${prevR.childCount}語)` : ''}`, 'info', 1500);
      }
    }
  }

  /**
   * 同一語根クラスタ内の次の単語へオートジャンプ
   */
  function jumpToNextWordInCluster(currentNode) {
    if (!currentNode) return;
    const rNode = (currentNode.connectedRoots && currentNode.connectedRoots[0]) ||
                  (graphState.nodes || []).find(n => n.type === 'root' && (n.connectedWords || []).includes(currentNode));
    let peerWords = [];
    if (rNode && Array.isArray(rNode.connectedWords) && rNode.connectedWords.length > 0) {
      peerWords = rNode.connectedWords.filter(w => w.type === 'word');
    } else {
      peerWords = (graphState.nodes || []).filter(n => n.type === 'word');
    }

    if (!peerWords.length) return;
    const curIdx = peerWords.indexOf(currentNode);
    const nextIdx = (curIdx + 1) % peerWords.length;
    const nextWord = peerWords[nextIdx];

    if (nextWord && nextWord !== currentNode) {
      selectNode(nextWord, false);
      centerOnNode(nextWord, 1.2, true);
    }
  }

  /**
   * 単語ノードに対する想起度(FSRS/SM-2)評価実行
   */
  function rateNodeWord(rating, targetNode = null) {
    const node = targetNode || graphState.selectedNode;
    if (!node || node.type !== 'word') return;

    if (global.VocabSRS?.triggerHaptic) {
      global.VocabSRS.triggerHaptic(rating === 0 ? 'again' : rating === 1 ? 'light' : rating === 2 ? 'good' : 'easy');
    }

    const app = global.VocabCore?.App || global.App;
    const lang = node.lang || node.item?.lang || app?.srcLang || app?.lang || 'en';
    const tgtLang = app?.tgtLang || 'ja';
    const storageMod = global.VocabStorage;
    const pairCfg = storageMod?.getPairConfig ? storageMod.getPairConfig(lang, tgtLang) : null;
    const saveKey = pairCfg?.key || storageMod?.LANGS?.[lang]?.key || `distinction_entries${lang === 'en' ? '' : '_' + lang}`;
    const getJsonFn = global.VocabCore?.getJson || global.getJson || storageMod?.getJson;
    const setJsonFn = global.VocabCore?.setJson || global.setJson || storageMod?.setJson;

    let entries = typeof getJsonFn === 'function' ? (getJsonFn(saveKey) || []) : (storageMod?.state?.mem?.[saveKey] || []);
    let item = entries.find(e => (e.word || '').toLowerCase() === node.label.toLowerCase() && !e.isDeleted);

    if (!item && global.VocabEikenCatalog?.getWord(node.label)) {
      adoptGhostBud(node.label, node.parentRoot?.label);
      entries = typeof getJsonFn === 'function' ? (getJsonFn(saveKey) || []) : (storageMod?.state?.mem?.[saveKey] || []);
      item = entries.find(e => (e.word || '').toLowerCase() === node.label.toLowerCase() && !e.isDeleted);
    }

    const now = Date.now();
    let rLabel = '';
    if (item) {
      item.version = (Number(item.version) || 1) + 1;
      item.updatedAt = now;
      if (global.VocabSRS?.calculateNextReview) {
        const nextSRS = global.VocabSRS.calculateNextReview(item, rating);
        Object.assign(item, nextSRS, { reviewUpdatedAt: now });
      } else {
        let iv = Number(item.interval) || 0, rep = Number(item.repetition) || 0, ef = Number(item.efactor) || 2.5;
        if (rating === 0) {
          rep = 0; iv = 0; item.nextReview = now + 60000;
        } else {
          iv = rating === 1 ? Math.max(1, iv * 1.2) : (rating === 2 ? (!rep ? 1 : iv * 2.5) : (!rep ? 4 : iv * ef));
          ef = Math.max(1.3, ef + (rating === 1 ? -0.15 : rating === 3 ? 0.15 : 0));
          if (rating >= 2) rep++;
          item.nextReview = now + Math.round(iv * 86400000);
        }
        item.interval = Number(iv.toFixed(2));
        item.repetition = rep;
        item.efactor = Number(ef.toFixed(2));
        item.reviewUpdatedAt = now;
      }
      if (typeof setJsonFn === 'function') {
        setJsonFn(saveKey, entries, true, true);
      }
      node.item = item;

      const srsPredict = global.VocabSRS?.predictIntervals ? global.VocabSRS.predictIntervals(item)[rating] : null;
      const baseLabels = ['忘却', '困難', '良好', '簡単'];
      rLabel = srsPredict ? `${baseLabels[rating]} (${srsPredict})` : (['忘却 (1分後)', '困難 (1日後)', '良好 (3日後)', '簡単 (7日後)'][rating] || '復習完了');
    } else {
      rLabel = ['忘却 (1分後)', '困難 (1日後)', '良好 (3日後)', '簡単 (7日後)'][rating] || '復習完了';
    }

    const toastFn = global.showToast || global.VocabCore?.showToast;
    if (typeof toastFn === 'function') {
      toastFn(`[${node.label}] ${rLabel} として記録しました`, 'ok', 1500);
    }

    drawGraph();
    if (graphState.activeViewTab === 'mindmap') renderMindmap();
    if (graphState.activeViewTab === 'matrix') renderMorphologyMatrix();

    jumpToNextWordInCluster(node);
  }

  /**
   * 指定単語に対する想起度評価実行 (マインドマップ等からの直通呼び出し)
   */
  function rateSpecificWord(word, rating, wordLang) {
    if (!word) return;
    const cleanWord = String(word).trim().toLowerCase();
    const node = (graphState.nodes || []).find(n => n.type === 'word' && n.label.toLowerCase() === cleanWord && (!wordLang || (n.lang || 'en') === wordLang));
    if (node) {
      rateNodeWord(rating, node);
    } else {
      const storageMod = global.VocabStorage;
      const app = global.VocabCore?.App || global.App;
      const lang = wordLang || app?.srcLang || app?.lang || 'en';
      const tgtLang = app?.tgtLang || 'ja';
      const pairCfg = storageMod?.getPairConfig ? storageMod.getPairConfig(lang, tgtLang) : null;
      const saveKey = pairCfg?.key || storageMod?.LANGS?.[lang]?.key || `distinction_entries${lang === 'en' ? '' : '_' + lang}`;
      const getJsonFn = global.VocabCore?.getJson || global.getJson || storageMod?.getJson;
      const setJsonFn = global.VocabCore?.setJson || global.setJson || storageMod?.setJson;
      const entries = typeof getJsonFn === 'function' ? (getJsonFn(saveKey) || []) : (storageMod?.state?.mem?.[saveKey] || []);
      const item = entries.find(e => (e.word || '').toLowerCase() === cleanWord && !e.isDeleted);
      if (item) {
        const now = Date.now();
        item.version = (Number(item.version) || 1) + 1;
        item.updatedAt = now;
        if (global.VocabSRS?.calculateNextReview) {
          const nextSRS = global.VocabSRS.calculateNextReview(item, rating);
          Object.assign(item, nextSRS, { reviewUpdatedAt: now });
        }
        if (typeof setJsonFn === 'function') setJsonFn(saveKey, entries, true, true);
        const srsPredict = global.VocabSRS?.predictIntervals ? global.VocabSRS.predictIntervals(item)[rating] : null;
        const baseLabels = ['忘却', '困難', '良好', '簡単'];
        const rLabel = srsPredict ? `${baseLabels[rating]} (${srsPredict})` : (['忘却 (1分後)', '困難 (1日後)', '良好 (3日後)', '簡単 (7日後)'][rating] || '復習完了');
        const toastFn = global.showToast || global.VocabCore?.showToast;
        if (typeof toastFn === 'function') {
          toastFn(`[${word}] ${rLabel} として記録しました`, 'ok', 1500);
        }
        drawGraph();
        if (graphState.activeViewTab === 'mindmap') renderMindmap();
        if (graphState.activeViewTab === 'matrix') renderMorphologyMatrix();
      }
    }
  }

  /**
   * アイデア④: 語源タイムトラベル・スライダー（年代・伝播フィルター）
   */
  function onTimelineChange(val) {
    const era = parseInt(val, 10);
    graphState.timelineEra = era;
    const lbl = $id('graphTimelineLabel');
    const eraNames = [
      '印欧祖語 (紀元前3000年〜)',
      '古代ギリシャ・ローマ (紀元前500年〜)',
      '中世古仏・古英 (11〜14世紀)',
      '近代・現代 (すべて)'
    ];
    if (lbl) lbl.textContent = eraNames[era] || 'すべて';
    drawGraph();
  }

  /**
   * 語根のみ表示（クラスタモード）のトグル
   */
  function toggleGraphClusterOnly() {
    graphState.clusterOnly = !graphState.clusterOnly;
    const btn = $id('graphClusterFilterBtn');
    if (btn) btn.classList.toggle('active', graphState.clusterOnly);
    updateGraphDataAndFit();
  }

  function togglePhysics() {
    graphState.physicsPaused = !graphState.physicsPaused;
    const btn = $id('graphPhysicsBtn');
    if (btn) {
      btn.textContent = graphState.physicsPaused ? '再開' : '停止';
      btn.classList.toggle('active', graphState.physicsPaused);
    }
    if (!graphState.physicsPaused) {
      wakeGraphSimulation();
    } else {
      drawGraph();
    }
  }

  function toggleTreeMode() {
    switchViewMode(graphState.layoutMode === 'tree' ? 'network' : 'tree');
  }

  function toggleColorMode() {
    graphState.colorMode = (graphState.colorMode === 'language') ? 'retention' : 'language';
    const btn = $id('graphColorModeBtn');
    if (btn) {
      btn.textContent = graphState.colorMode === 'language' ? '言語色' : '定着度色';
      btn.classList.toggle('active', graphState.colorMode === 'retention');
    }
    updateLegendUI();
    drawGraph();
  }

  function updateLegendUI() {
    const legend = $id('graphLegend');
    if (!legend) return;
    if (graphState.colorMode === 'retention') {
      global.VocabDOM?.setSafeHtml(legend, `
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#7c3aed"></span>語根</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#fb7185"></span>要復習</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#60a5fa"></span>新規</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#f59e0b"></span>学習中(&lt;7日)</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#10b981"></span>長期定着(7日+)</span>
      `);
    } else {
      global.VocabDOM?.setSafeHtml(legend, `
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#7c3aed"></span>語根</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#38bdf8"></span>英</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#a78bfa"></span>仏</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#fbbf24"></span>独</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#fb923c"></span>西</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#2dd4bf"></span>伊</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#84cc16"></span>葡</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#f472b6"></span>蘭</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#f43f5e"></span>中</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#60a5fa"></span>韓</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#34d399"></span>日</span>
      `);
    }
  }

  function updateGraphDataAndFit() {
    const { nodes, edges } = buildGraphData(graphState.filterQuery, graphState.clusterOnly, graphState.langFilter);
    graphState.nodes = nodes;
    graphState.edges = edges;
    const countEl = $id('graphMetaCount');
    if (countEl) {
      countEl.textContent = `${nodes.filter(n => n.type === 'root').length} 語根 / ${nodes.filter(n => n.type === 'word').length} 単語`;
    }
    const canvasWrap = $id('graphCanvasWrap');
    const isCanvasVisible = canvasWrap && canvasWrap.style.display !== 'none';
    if (isCanvasVisible) {
      fitGraphToView();
      wakeGraphSimulation();
    }
    if (typeof renderMindmap === 'function') renderMindmap();
    if (typeof renderMorphologyMatrix === 'function') renderMorphologyMatrix();
  }

  function updateZoomDisplay() {
    const el = $id('graphZoomVal');
    if (el) el.textContent = `${Math.round(graphState.zoom * 100)}%`;
  }

  function setZoomLevel(newZoom) {
    newZoom = Math.min(3.5, Math.max(0.35, newZoom));
    const cx = (graphState.width || 800) / 2;
    const cy = (graphState.height || 600) / 2;
    const oldZoom = graphState.zoom || 1;
    graphState.panX = cx - (cx - graphState.panX) * (newZoom / oldZoom);
    graphState.panY = cy - (cy - graphState.panY) * (newZoom / oldZoom);
    graphState.zoom = newZoom;
    updateZoomDisplay();
    drawGraph();
  }

  function zoomIn() {
    setZoomLevel(graphState.zoom * 1.30);
  }

  function zoomOut() {
    setZoomLevel(graphState.zoom / 1.30);
  }

  function fitGraphToView() {
    if (!graphState.nodes || !graphState.nodes.length) return;
    syncCanvasDimensions();

    // 異常値・極端な外れ値ノードに引っ張られて極小化するのを防ぐため、外れ値を除外した堅牢なバウンディングボックスを算出
    const xs = graphState.nodes.map(n => n.x).sort((a, b) => a - b);
    const ys = graphState.nodes.map(n => n.y).sort((a, b) => a - b);
    const pLow = Math.floor(xs.length * 0.02);
    const pHigh = Math.max(0, Math.ceil(xs.length * 0.98) - 1);
    const minX = xs[pLow], maxX = xs[pHigh];
    const minY = ys[pLow], maxY = ys[pHigh];

    const drawer = $id('graphDetailDrawer');
    const isDrawerOpen = drawer && drawer.style.display !== 'none';
    let availableW = graphState.width || 800;
    let availableH = graphState.height || 600;
    if (isDrawerOpen) {
      if (availableW <= 768) {
        const drawerH = drawer.offsetHeight || (availableH * 0.45);
        availableH = Math.max(120, availableH - drawerH);
      } else {
        const drawerW = drawer.offsetWidth || 360;
        availableW = Math.max(200, availableW - drawerW);
      }
    }

    const pad = 38;
    const w = Math.max(120, maxX - minX);
    const h = Math.max(120, maxY - minY);
    const scaleX = (availableW - pad * 2) / w;
    const scaleY = (availableH - pad * 2) / h;
    const isTree = (graphState.layoutMode === 'tree');
    const minZ = isTree ? 0.32 : 0.50;
    const maxZ = isTree ? 1.65 : 1.35;
    const targetZoom = Math.min(Math.max(Math.min(scaleX, scaleY), minZ), maxZ);
    const centerX = isTree ? 0 : (minX + maxX) / 2;
    const centerY = isTree ? 0 : (minY + maxY) / 2;

    const { cx, cy } = getEffectiveViewportCenter();
    graphState.zoom = targetZoom;
    graphState.panX = cx - centerX * targetZoom;
    graphState.panY = cy - centerY * targetZoom;
    updateZoomDisplay();
    drawGraph();
  }

  let smoothPanZoomRaf = null;
  let momentumRaf = null;

  /**
   * カメラの滑らかなイージング補間移動 (Smooth Pan & Zoom Transition)
   */
  function smoothPanZoomTo(targetPanX, targetPanY, targetZoom, onComplete) {
    if (momentumRaf) { cancelAnimationFrame(momentumRaf); momentumRaf = null; }
    if (smoothPanZoomRaf) { cancelAnimationFrame(smoothPanZoomRaf); smoothPanZoomRaf = null; }

    const startPanX = graphState.panX;
    const startPanY = graphState.panY;
    const startZoom = graphState.zoom;
    const finalZoom = Math.min(3.5, Math.max(0.35, targetZoom));
    const totalFrames = 18;
    let frame = 0;

    function step() {
      frame++;
      const t = frame / totalFrames;
      // easeOutCubic: 指数的な減速で心地よく着地
      const ease = 1 - Math.pow(1 - t, 3);

      graphState.panX = startPanX + (targetPanX - startPanX) * ease;
      graphState.panY = startPanY + (targetPanY - startPanY) * ease;
      graphState.zoom = startZoom + (finalZoom - startZoom) * ease;
      updateZoomDisplay();
      drawGraph();

      if (frame < totalFrames) {
        smoothPanZoomRaf = requestAnimationFrame(step);
      } else {
        graphState.panX = targetPanX;
        graphState.panY = targetPanY;
        graphState.zoom = finalZoom;
        updateZoomDisplay();
        drawGraph();
        smoothPanZoomRaf = null;
        if (typeof onComplete === 'function') onComplete();
      }
    }
    smoothPanZoomRaf = requestAnimationFrame(step);
  }

  /**
   * キャンバス寸法のリアルタイム動的同期（画面リサイズ・オリエンテーション変更・モーダル展開時の狂いを根絶）
   */
  function syncCanvasDimensions() {
    const wrap = $id('graphCanvasWrap');
    const canvas = $id('graphCanvas');
    if (!wrap || !canvas) return;
    const realW = wrap.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 800);
    const realH = wrap.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 600);
    if (realW > 0 && realH > 0 && (graphState.width !== realW || graphState.height !== realH)) {
      graphState.width = realW;
      graphState.height = realH;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = realW * dpr;
      canvas.height = realH * dpr;
      canvas.style.width = realW + 'px';
      canvas.style.height = realH + 'px';
      invalidateTreeBgCache();
    }
  }

  /**
   * 画面サイズおよび詳細Drawer開閉に応じた有効可視領域中心 (Effective Viewport Center) の動的計算
   * - モバイル: 下部Drawerボトムシートを避けて上部可視エリアの中央へセンタリング
   * - デスクトップ: 右側Drawerを避けて左側可視エリアの中央へセンタリング
   */
  function getEffectiveViewportCenter() {
    syncCanvasDimensions();
    const w = graphState.width || 800;
    const h = graphState.height || 600;
    const drawer = $id('graphDetailDrawer');
    const isDrawerOpen = drawer && drawer.style.display !== 'none';

    if (!isDrawerOpen) {
      return { cx: w / 2, cy: h / 2 };
    }

    if (w <= 768) {
      // モバイル: Drawerは画面下部のボトムシート
      const drawerH = drawer.offsetHeight || (h * 0.45);
      const visibleH = Math.max(120, h - drawerH);
      return { cx: w / 2, cy: visibleH / 2 };
    } else {
      // デスクトップ/タブレット横: Drawerは画面右側のサイドパネル (幅340〜380px)
      const drawerW = drawer.offsetWidth || 360;
      const visibleW = Math.max(200, w - drawerW);
      return { cx: visibleW / 2, cy: h / 2 };
    }
  }

  function centerOnNode(node, zoomLevel = 1.25, smooth = true) {
    if (!node) return;
    syncCanvasDimensions();
    const { cx, cy } = getEffectiveViewportCenter();
    const minZ = 0.55;
    const maxZ = graphState.width <= 480 ? 1.35 : 1.65;
    const targetZoom = Math.min(Math.max(zoomLevel, minZ), maxZ);

    const targetPanX = cx - node.x * targetZoom;
    const targetPanY = cy - node.y * targetZoom;
    if (smooth) {
      smoothPanZoomTo(targetPanX, targetPanY, targetZoom);
    } else {
      graphState.zoom = targetZoom;
      graphState.panX = targetPanX;
      graphState.panY = targetPanY;
      updateZoomDisplay();
      drawGraph();
    }
  }

  function zoomToCluster(rootNode, smooth = true) {
    if (!rootNode || !rootNode.connectedWords || !rootNode.connectedWords.length) {
      centerOnNode(rootNode, 1.4, smooth);
      return;
    }
    syncCanvasDimensions();
    const clusterNodes = [rootNode, ...rootNode.connectedWords];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    clusterNodes.forEach(n => {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });
    const pad = graphState.width <= 480 ? 50 : 90;
    const w = Math.max(70, maxX - minX);
    const h = Math.max(70, maxY - minY);
    const scaleX = (graphState.width - pad * 2) / w;
    const scaleY = (graphState.height - pad * 2) / h;
    const targetZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.65), 1.8);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const { cx, cy } = getEffectiveViewportCenter();
    const targetPanX = cx - centerX * targetZoom;
    const targetPanY = cy - centerY * targetZoom;
    if (smooth) {
      smoothPanZoomTo(targetPanX, targetPanY, targetZoom);
    } else {
      graphState.zoom = targetZoom;
      graphState.panX = targetPanX;
      graphState.panY = targetPanY;
      updateZoomDisplay();
      drawGraph();
    }
  }

  /**
   * 検索ジャンプ: 単語または語根を検索し、位置までスムーズズーム＆経路ハイライト
   */
  function jumpToNode(query) {
    if (!query) return false;
    const q = String(query).trim().toLowerCase().replace(/^\*/, '');
    if (!q) return false;

    // 1. 完全一致
    let target = graphState.nodes.find(n => n.label.toLowerCase() === q || cleanRootKey(n.label).toLowerCase() === q);
    // 2. 前方一致
    if (!target) {
      target = graphState.nodes.find(n => n.label.toLowerCase().startsWith(q));
    }
    // 3. 部分一致
    if (!target) {
      target = graphState.nodes.find(n => n.label.toLowerCase().includes(q));
    }
    // 4. 日本語訳・意味一致
    if (!target) {
      target = graphState.nodes.find(n => (n.meaning || '').toLowerCase().includes(q) || (n.rootMeaning || '').toLowerCase().includes(q));
    }

    if (target) {
      selectNode(target, false);
      centerOnNode(target, target.type === 'root' ? 1.05 : 1.45, true);
      return true;
    }
    return false;
  }

  /**
   * 「自分の単語」モードのトグル（登録・学習済み単語のみ強調、FSRS状態連動）
   */
  function toggleMyWordsMode() {
    graphState.myWordsOnly = !graphState.myWordsOnly;
    const btn = $id('graphMyWordsBtn');
    if (btn) {
      if (graphState.myWordsOnly) {
        btn.classList.add('active');
        btn.style.background = 'var(--ac)';
        btn.style.color = '#ffffff';
      } else {
        btn.classList.remove('active');
        btn.style.background = '';
        btn.style.color = '';
      }
    }
    drawGraph();
  }

  /**
   * 語根ノードの展開 / 折りたたみ
   */
  function toggleRootCollapse(rootKey) {
    if (!graphState.collapsedRoots) graphState.collapsedRoots = new Set();
    const rk = cleanRootKey(rootKey);
    if (graphState.collapsedRoots.has(rk)) {
      graphState.collapsedRoots.delete(rk);
    } else {
      graphState.collapsedRoots.add(rk);
    }
    drawGraph();
  }

  /**
   * 時代スライダーの自動再生アニメーション (Time-lapse Auto Play)
   */
  let _timelinePlayTimer = null;
  function stopTimelineAutoPlay() {
    if (_timelinePlayTimer) {
      clearInterval(_timelinePlayTimer);
      _timelinePlayTimer = null;
      const playBtn = $id('graphTimelinePlayBtn');
      if (playBtn) playBtn.textContent = '再生';
    }
  }

  function toggleTimelineAutoPlay() {
    const playBtn = $id('graphTimelinePlayBtn');
    if (_timelinePlayTimer) {
      stopTimelineAutoPlay();
      return;
    }
    if (playBtn) playBtn.textContent = '停止';
    _timelinePlayTimer = setInterval(() => {
      let nextEra = ((graphState.timelineEra || 0) + 1) % 4;
      onTimelineChange(nextEra);
      const slider = $id('graphTimelineSlider');
      if (slider) slider.value = nextEra;
    }, 1300);
  }

  /**
   * おすすめ入口: 「今日の語根」「要復習の語根」へジャンプ
   */
  function jumpToRecommendedRoot(type = 'today') {
    const rootNodes = graphState.nodes.filter(n => n.type === 'root');
    if (!rootNodes.length) return;
    let target = null;
    const now = Date.now();
    if (type === 'due') {
      // 復習期日（nextReview <= now）の単語を持つ語根を優先
      target = rootNodes.find(r => (r.connectedWords || []).some(w => (w.item?.nextReview || 0) <= now));
    }
    if (!target) {
      // 日替わり決定論的インデックス
      const dayIdx = Math.floor(now / (1000 * 60 * 60 * 24)) % rootNodes.length;
      target = rootNodes[dayIdx] || rootNodes[0];
    }
    if (target) {
      focusRoot(target.label);
      selectNode(target, false);
      centerOnNode(target, 1.05, true);
    }
  }

  function openGraphModal(targetRoot = null) {
    const toggleModalFn = global.toggleModal || global.VocabCore?.toggleModal;
    if (typeof toggleModalFn === 'function') toggleModalFn('graphModal', true);

    const normTarget = targetRoot ? cleanRootKey(targetRoot) : '';
    const filterInput = $id('graphFilterInput');
    if (filterInput) filterInput.value = normTarget ? normTarget : '';
    graphState.filterQuery = normTarget;

    // アクティブな言語ペアに基づいて初期語源系統を自動反映
    const curPair = (global.VocabCore?.getActivePairConfig || global.getActivePairConfig)?.() || {};
    const curSrc = (curPair.srcLang || curPair.src || global.App?.srcLang || global.App?.lang || 'en').toLowerCase();
    if (!graphState.familyFilter || graphState.familyFilter === 'all') {
      if (curSrc === 'zh') graphState.familyFilter = 'sinospheric';
      else if (curSrc === 'ko') graphState.familyFilter = 'koreanic';
      else if (curSrc === 'ja') graphState.familyFilter = 'japonic';
      else if (['fr', 'es', 'it', 'pt'].includes(curSrc)) graphState.familyFilter = 'romance';
      else if (['de', 'nl'].includes(curSrc)) graphState.familyFilter = 'germanic';
      else graphState.familyFilter = 'all';
    }
    const famSel = $id('graphFamilyFilterSel');
    if (famSel) famSel.value = graphState.familyFilter;
    updatePhylumPillsUI(graphState.familyFilter);

    // 1回のみ高速ビルド
    const { nodes, edges } = buildGraphData(normTarget, false, graphState.langFilter);
    graphState.nodes = nodes;
    graphState.edges = edges;

    const countEl = $id('graphMetaCount');
    if (countEl) countEl.textContent = `${nodes.filter(n => n.type === 'root').length} 語根 / ${nodes.filter(n => n.type === 'word').length} 単語`;

    initGraphEvents();

    if (normTarget) {
      focusRoot(normTarget);
    }

    // マインドマップビューで直接起動
    switchViewMode('mindmap');
  }

  function resetGraphZoom() {
    graphState.zoom = 1;
    graphState.panX = graphState.width / 2;
    graphState.panY = graphState.height / 2;
    const filterInput = $id('graphFilterInput');
    if (filterInput) filterInput.value = '';
    graphState.filterQuery = '';
    const langSel = $id('graphLangFilterSel');
    if (langSel) langSel.value = 'all';
    graphState.langFilter = 'all';

    const { nodes, edges } = buildGraphData('', graphState.clusterOnly, 'all');
    graphState.nodes = nodes;
    graphState.edges = edges;
    const countEl = $id('graphMetaCount');
    if (countEl) countEl.textContent = `${nodes.filter(n => n.type === 'root').length} 語根 / ${nodes.filter(n => n.type === 'word').length} 単語`;
    deselectNode();
    updateZoomDisplay();
    drawGraph();
  }

  function selectNode(node, center = true) {
    toggleEikenExplorer(false);
    graphState.selectedNode = node;
    renderDetailDrawer(node);
    if (center && node) {
      centerOnNode(node, graphState.zoom);
      // Drawer展開直後はDOMのoffsetHeight / offsetWidthが未確定の場合があるため、
      // requestAnimationFrame 及び タイマーで真の可視領域中心へ再センタリング
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          if (graphState.selectedNode === node) {
            centerOnNode(node, graphState.zoom);
          }
        });
      }
      setTimeout(() => {
        if (graphState.selectedNode === node) {
          centerOnNode(node, graphState.zoom);
        }
      }, 120);
    } else {
      drawGraph();
    }
  }

  function deselectNode() {
    graphState.selectedNode = null;
    const drawer = $id('graphDetailDrawer');
    if (drawer) drawer.style.display = 'none';
    drawGraph();
  }

  /**
   * ノードIDによる選択
   */
  function selectNodeById(id) {
    const target = graphState.nodes.find(n => n.id === id);
    if (target) {
      selectNode(target, true);
    }
  }

  function speakNodeWord(word, lang) {
    const speakFn = global.VocabSpeech?.speakText || global.speakText || global.VocabCore?.speakText;
    if (typeof speakFn === 'function') speakFn(word, lang);
  }

  function jumpToNodeWord(word, lang) {
    const toggleModalFn = global.toggleModal || global.VocabCore?.toggleModal;
    if (typeof toggleModalFn === 'function') toggleModalFn('graphModal', false);
    const jumpFn = global.jumpToWord || global.VocabCore?.jumpToWord;
    if (typeof jumpFn === 'function') {
      setTimeout(() => jumpFn(word, lang), 40);
    }
  }

  function openWordEdit(idOrNum, lang) {
    const toggleModalFn = global.toggleModal || global.VocabCore?.toggleModal;
    if (typeof toggleModalFn === 'function') toggleModalFn('graphModal', false);
    const editFn = global.VocabModal?.openEditModal || global.openEditModal;
    if (typeof editFn === 'function') {
      setTimeout(() => editFn(idOrNum, lang), 40);
    }
  }

  function filterMainListByRoot(rootLabel) {
    const toggleModalFn = global.toggleModal || global.VocabCore?.toggleModal;
    if (typeof toggleModalFn === 'function') toggleModalFn('graphModal', false);
    const searchFn = global.setSearch || global.VocabCore?.setSearch;
    if (typeof searchFn === 'function') searchFn(rootLabel.replace(/^\*/, ''), true);
  }

  function startRootAnkiReview() {
    const sel = graphState.selectedNode;
    if (!sel || sel.type !== 'root' || !sel.connectedWords || !sel.connectedWords.length) return;
    const wordsToReview = sel.connectedWords.map(w => w.item).filter(Boolean);
    if (!wordsToReview.length) return;

    const toggleModalFn = global.toggleModal || global.VocabCore?.toggleModal;
    if (typeof toggleModalFn === 'function') toggleModalFn('graphModal', false);

    const startAnkiFn = global.startAnki || global.VocabCore?.startAnki;
    if (typeof startAnkiFn === 'function') {
      startAnkiFn(wordsToReview);
      const toastFn = global.showToast || global.VocabCore?.showToast;
      if (typeof toastFn === 'function') {
        toastFn(`語根「${sel.label}」の単語（全${wordsToReview.length}語）で集中特訓を開始しました！`, 'ok', 4000);
      }
    }
  }

  function startBranchAnkiReview() {
    const sel = graphState.selectedNode;
    if (!sel || sel.type !== 'branch' || !sel.connectedWords || !sel.connectedWords.length) return;
    const wordsToReview = sel.connectedWords.map(w => w.item).filter(Boolean);
    if (!wordsToReview.length) return;

    const toggleModalFn = global.toggleModal || global.VocabCore?.toggleModal;
    if (typeof toggleModalFn === 'function') toggleModalFn('graphModal', false);

    const startAnkiFn = global.startAnki || global.VocabCore?.startAnki;
    if (typeof startAnkiFn === 'function') {
      startAnkiFn(wordsToReview);
      const toastFn = global.showToast || global.VocabCore?.showToast;
      if (typeof toastFn === 'function') {
        toastFn(`古典ブランチ「${sel.label}」の単語（全${wordsToReview.length}語）で集中特訓を開始しました！`, 'ok', 4000);
      }
    }
  }

  function getEnglishPairKeyAndEntries() {
    const app = global.VocabCore?.App || global.App;
    const activeCfg = (global.VocabCore?.getActivePairConfig || global.getActivePairConfig)?.() || { key: 'distinction_entries', srcLang: 'en', tgtLang: 'ja' };
    const isEnJaActive = (activeCfg.srcLang || app?.srcLang || app?.lang || 'en') === 'en' && (activeCfg.tgtLang || app?.tgtLang || 'ja') === 'ja';
    const saveKey = isEnJaActive ? (activeCfg.key || 'distinction_entries') : 'distinction_entries';
    const getJsonFn = global.VocabCore?.getJson || global.getJson || global.VocabStorage?.getJson;
    if (isEnJaActive && Array.isArray(app?.entries) && app.entries.length > 0) {
      return { saveKey, entries: app.entries, isEnActive: true };
    }
    const entries = typeof getJsonFn === 'function'
      ? getJsonFn(saveKey)
      : (isEnJaActive && Array.isArray(app?.entries) ? app.entries : (global.VocabStorage?.state?.mem?.[saveKey] || []));
    return { saveKey, entries: Array.isArray(entries) ? entries : [], isEnActive: isEnJaActive };
  }

  function persistUnlockedEntries(nextEntries, targetKey = null) {
    const app = global.VocabCore?.App || global.App;
    const { saveKey: defaultEnKey, isEnActive } = getEnglishPairKeyAndEntries();
    const saveKey = targetKey || defaultEnKey;
    const setJsonFn = global.VocabCore?.setJson || global.setJson || global.VocabStorage?.setJson;
    const sanitizeFn = global.VocabStorage?.sanitizeItem || global.sanitizeItem || ((it) => it);
    const sanitized = (Array.isArray(nextEntries) ? nextEntries : []).map((it, i) => sanitizeFn(it, i, 'en')).filter(Boolean);

    if (typeof setJsonFn === 'function') {
      setJsonFn(saveKey, sanitized, true, true);
    } else if (global.VocabStorage) {
      global.VocabStorage.state.mem[saveKey] = sanitized;
      global.VocabStorage.lsSet(saveKey, JSON.stringify(sanitized));
      global.VocabStorage.idbPut(saveKey, sanitized);
    }
    if (app && isEnActive) {
      app.entries = global.VocabStorage?.state?.mem?.[saveKey] || sanitized;
    }
    const loadFn = global.VocabCore?.load || global.load;
    if (typeof loadFn === 'function') loadFn(app?.page || 1);
  }

  function adoptGhostBud(budWord, rootLabel) {
    if (!budWord) return;
    const toastFn = global.showToast || global.VocabCore?.showToast;
    const makeWordKeyFn = global.VocabMorphology?.makeWordKey || ((w, l) => `${l}:${w.toLowerCase()}`);

    // 英検準1級カタログに完全データが存在する場合：即座にライブラリへアンロック（待ち時間0秒）
    const eCard = global.VocabEikenCatalog ? global.VocabEikenCatalog.getWord(budWord) : null;
    const app = global.VocabCore?.App || global.App;
    if (eCard && app) {
      const { saveKey, entries: cur } = getEnglishPairKeyAndEntries();
      const already = cur.some(e => e.word.toLowerCase() === budWord.toLowerCase() && !e.isDeleted);
      if (!already) {
        const clearedAt = global.VocabStorage?.getClearedAt ? global.VocabStorage.getClearedAt(saveKey) : 0;
        const tombMap = global.VocabStorage?.getTombstones ? global.VocabStorage.getTombstones(saveKey) : null;
        const now = Math.max(Date.now(), (Number(clearedAt) || 0) + 1);
        const maxNum = cur.reduce((m, x) => Math.max(m, Number(x.num) || 0), 0) + 1;
        const cardId = `eiken_${now}_${Math.random().toString(36).slice(2, 7)}`;
        const cardWk = makeWordKeyFn(eCard.word, 'en', eCard.meanings?.[0]?.pos, 1);
        const newCard = {
          ...eCard,
          id: cardId,
          wordKey: cardWk,
          homographIndex: 1,
          version: 1,
          num: maxNum,
          lang: 'en',
          category: '英検準1級',
          folder: `英検準1級 (${rootLabel || ''})`,
          interval: 0,
          repetition: 0,
          efactor: 2.5,
          nextReview: now,
          updatedAt: now,
          reviewUpdatedAt: now,
          isDeleted: false
        };
        if (tombMap) {
          tombMap.delete(`id:${cardId}`);
          tombMap.delete(`wk:${cardWk}`);
          tombMap.delete(`word:${String(eCard.word || '').trim().toLowerCase()}`);
          if (global.VocabStorage?.saveTombstones) {
            global.VocabStorage.saveTombstones(saveKey, tombMap);
          }
        }
        const budNode = graphState.nodes.find(n => n.type === 'ghost_bud' && n.label.toLowerCase() === budWord.toLowerCase());
        if (budNode) {
          pruneUnlockParticles();
          graphState.unlockParticles.push({
            x: budNode.x,
            y: budNode.y,
            radius: 8,
            maxRadius: 52,
            alpha: 1.0,
            color: '#38bdf8',
            __bornAt: Date.now()
          });
        }
        playSkillUnlockSound();
        persistUnlockedEntries([newCard, ...cur], saveKey);
        if (typeof toastFn === 'function') {
          toastFn(`スキル習得！「${budWord}」(${rootLabel}) を覚醒させました！単語帳に追加完了。`, 'ok', 4000);
        }
        pruneUnlockParticles();
        updateGraphDataAndFit();
        const newWordNode = graphState.nodes.find(n => n.type === 'word' && n.label.toLowerCase() === budWord.toLowerCase());
        if (newWordNode) {
          selectNode(newWordNode, true);
        } else {
          deselectNode();
        }
        return;
      }
    }

    // カタログ外の単語はAI生成キューへ
    const regFn = global.VocabQueue?.registerWordsList || global.VocabCore?.registerWordsList || global.registerWordsList;
    if (typeof regFn === 'function') {
      regFn([{ word: budWord }], '', true, true);
      if (typeof toastFn === 'function') {
        toastFn(`未開拓の派生語「${budWord}」(${rootLabel}) をAI生成キューに追加しました！系統樹の枝が成長します。`, 'ok', 4500);
      }
    }
    deselectNode();
  }
  function wakeGraphSimulation() {
    graphState.isSleeping = false;
    startGraphSimulation();
  }

  /**
   * スケール対策 & 省電力スリープ対応の力学シミュレーション
   */
  function startGraphSimulation() {
    if (graphState.animId) cancelAnimationFrame(graphState.animId);

    // 系統樹ツリーモード時は物理演算（斥力・引力）を完全に停止し、確定座標のまま静止
    if (graphState.layoutMode === 'tree') {
      graphState.isSleeping = true;
      drawGraph();
      return;
    }

    let frameCount = 0;
    function step() {
      const modal = $id('graphModal');
      if (!modal || !modal.classList.contains('open')) {
        graphState.isSleeping = true;
        return;
      }

      if (graphState.physicsPaused || graphState.layoutMode === 'tree') {
        drawGraph();
        return;
      }

      const nodes = graphState.nodes;
      const edges = graphState.edges;
      const totalNodes = nodes.length;

      // 語根数に応じたパラメータの適応調整
      const isLargeGraph = totalNodes > 100;
      const kRepulsion = isLargeGraph ? 820 : 1050;
      const maxRepulseDist = isLargeGraph ? 230 : 270;
      const maxRepulseDistSq = maxRepulseDist * maxRepulseDist;
      const kSpring = 0.035;
      const springLength = 115;
      const damping = 0.85;
      const maxSpeed = 3.6;
      // 大域重力を弱め、全クラスターが原点(0,0)に1つに凝縮するのを防ぎ広々と配置
      const kGravity = 0.00008;

      // 0. ルートノード（語根）間の大域アイランド反発
      //    異なる語根星団同士が十分な距離（最低440px）を保ち、銀河の星系のように独立した島として配置される
      const rootNodes = [];
      for (let i = 0; i < totalNodes; i++) {
        if (nodes[i].type === 'root') rootNodes.push(nodes[i]);
      }
      const minRootDist = 440;
      for (let i = 0; i < rootNodes.length; i++) {
        const r1 = rootNodes[i];
        for (let j = i + 1; j < rootNodes.length; j++) {
          const r2 = rootNodes[j];
          const dx = r2.x - r1.x;
          const dy = r2.y - r1.y;
          const distSq = dx * dx + dy * dy || 1;
          const dist = Math.sqrt(distSq);
          if (dist < minRootDist) {
            const force = ((minRootDist - dist) / minRootDist) * 2.8;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            if (r1 !== graphState.dragNode) { r1.vx -= fx; r1.vy -= fy; }
            if (r2 !== graphState.dragNode) { r2.vx += fx; r2.vy += fy; }
          }
        }
      }

      // 1. 反発力: 一様空間グリッドによる近傍探索 (O(N^2) -> 期待 O(N))
      //    セル幅 = カットオフ半径なので、3x3 近傍セルで有効ペアを漏れなく網羅できる。
      //    ペアは配列インデックス順 (j > i) で1回だけ評価し、数値キーで文字列生成コストを排除。
      const cellSize = maxRepulseDist;
      const OFF = 32768, SPAN = 65536;
      const cellOf = v => {
        const c = Math.floor(v / cellSize);
        return c < -OFF + 1 ? -OFF + 1 : (c > OFF - 2 ? OFF - 2 : c);
      };
      const grid = new Map();
      const ncx = new Int32Array(totalNodes), ncy = new Int32Array(totalNodes);
      for (let i = 0; i < totalNodes; i++) {
        const n = nodes[i];
        if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) { n.x = 0; n.y = 0; n.vx = 0; n.vy = 0; }
        const cx = cellOf(n.x), cy = cellOf(n.y);
        ncx[i] = cx; ncy[i] = cy;
        const key = (cx + OFF) * SPAN + (cy + OFF);
        const bucket = grid.get(key);
        if (bucket) bucket.push(i); else grid.set(key, [i]);
      }
      for (let i = 0; i < totalNodes; i++) {
        const n1 = nodes[i];
        const cx = ncx[i], cy = ncy[i];
        for (let ox = -1; ox <= 1; ox++) {
          for (let oy = -1; oy <= 1; oy++) {
            const bucket = grid.get((cx + ox + OFF) * SPAN + (cy + oy + OFF));
            if (!bucket) continue;
            for (let b = 0; b < bucket.length; b++) {
              const j = bucket[b];
              if (j <= i) continue;
              const n2 = nodes[j];
              const dx = n2.x - n1.x;
              const dy = n2.y - n1.y;
              const distSq = dx * dx + dy * dy;
              if (distSq > maxRepulseDistSq || distSq < 1) continue;

              const dist = Math.sqrt(distSq);
              // 近接ノード間の衝突防止（重なり完全抑止・間隔拡大）
              const minDist = (n1.radius || 8) + (n2.radius || 8) + 30;
              let force = 0;
              if (dist < minDist) {
                force = ((minDist - dist) / minDist) * 4.6;
              } else {
                force = (kRepulsion / distSq) * (1 - dist / maxRepulseDist);
              }
              if (force > 4.5) force = 4.5;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;

              if (n1 !== graphState.dragNode) { n1.vx -= fx; n1.vy -= fy; }
              if (n2 !== graphState.dragNode) { n2.vx += fx; n2.vy += fy; }
            }
          }
        }
      }

      // 2. バネ引力 (作用・反作用: 各単語は所属する語根星団の周りに束縛される)
      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        const s = edge.source, t = edge.target;
        if (!s || !t) continue;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        let force = (dist - springLength) * kSpring;
        if (force > 3.0) force = 3.0;
        if (force < -3.0) force = -3.0;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (s !== graphState.dragNode) { s.vx += fx; s.vy += fy; }
        if (t !== graphState.dragNode) { t.vx -= fx; t.vy -= fy; }
      }

      // 3. 微小重力・減衰・速度リミッター & 運動エネルギー計算
      let totalMotion = 0;

      for (let i = 0; i < totalNodes; i++) {
        const n = nodes[i];
        if (n === graphState.dragNode) continue;

        n.vx -= n.x * kGravity;
        n.vy -= n.y * kGravity;

        n.vx *= damping;
        n.vy *= damping;
        const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
        if (speed > maxSpeed) {
          n.vx = (n.vx / speed) * maxSpeed;
          n.vy = (n.vy / speed) * maxSpeed;
        }
        n.x += n.vx;
        n.y += n.vy;
        totalMotion += speed;
      }

      drawGraph();
      frameCount++;

      if (frameCount === 12 && !graphState.isDragging && !graphState.dragNode && !graphState.selectedNode) {
        fitGraphToView();
      }

      // 運動エネルギー収束による省電力スリープ
      if (frameCount > 80 && totalMotion < 0.22 && !graphState.isDragging && !graphState.dragNode) {
        graphState.isSleeping = true;
        drawGraph();
        return;
      }

      graphState.animId = requestAnimationFrame(step);
    }

    graphState.animId = requestAnimationFrame(step);
  }

  let graphDrawScheduled = false;
  /**
   * 描画フレーム統合（高ポーリングマウス・トラックパッドでの二重描画・コマ落ちを完全防止）
   */
  function scheduleGraphDraw() {
    if (graphDrawScheduled) return;
    graphDrawScheduled = true;
    graphState.animId = requestAnimationFrame(() => {
      graphDrawScheduled = false;
      graphState.animId = null;
      drawGraph();
    });
  }

  function updatePhylumPillsUI(famKey) {
    if (typeof document === 'undefined') return;
    const pills = document.querySelectorAll('.phylum-pill');
    pills.forEach(p => {
      const pFam = p.getAttribute('data-phylum') || p.id.replace('phylumPill', '').toLowerCase();
      const match = (pFam === famKey) || (famKey === 'all' && (pFam === 'all' || p.id === 'phylumPillAll')) ||
                    (famKey === 'indo_european' && (pFam === 'indo_european' || p.id === 'phylumPillIE')) ||
                    (famKey === 'sinospheric' && (pFam === 'sinospheric' || p.id === 'phylumPillZh')) ||
                    (famKey === 'koreanic' && (pFam === 'koreanic' || p.id === 'phylumPillKo')) ||
                    (famKey === 'japonic' && (pFam === 'japonic' || p.id === 'phylumPillJa'));
      if (match) p.classList.add('active');
      else p.classList.remove('active');
    });
  }

  function setPhylumFilter(famKey) {
    if (!graphState) return;
    graphState.familyFilter = famKey;
    const famSel = $id('graphFamilyFilterSel');
    if (famSel) {
      if (Array.from(famSel.options).some(o => o.value === famKey)) {
        famSel.value = famKey;
      } else if (famKey === 'indo_european') {
        famSel.value = 'all';
      }
    }
    updatePhylumPillsUI(famKey);
    updateGraphDataAndFit();
    if (graphState.layoutMode === 'tree') startTreeEasingAnimation();
    if (graphState.activeViewTab === 'mindmap') renderMindmap();
    if (graphState.activeViewTab === 'matrix') renderMorphologyMatrix();

    if (famKey !== 'all') {
      setTimeout(() => {
        const root = graphState.nodes.find(n => n.type === 'root' && (n.phylum === famKey || n.id.includes(famKey)));
        if (root) {
          centerOnNode(root);
        }
      }, 60);
    }
  }

  function initGraphEvents() {
    const wrap = $id('graphCanvasWrap');
    if (!wrap || wrap._graphEventsAttached) return;
    wrap._graphEventsAttached = true;

    let startClientX = 0, startClientY = 0;
    let lastClientX = 0, lastClientY = 0;
    let lastTime = 0;
    let pointerVx = 0, pointerVy = 0;

    function getCanvasCoords(clientX, clientY) {
      const rect = wrap.getBoundingClientRect();
      const rawX = clientX - rect.left;
      const rawY = clientY - rect.top;
      const x = (rawX - graphState.panX) / graphState.zoom;
      const y = (rawY - graphState.panY) / graphState.zoom;
      return { rawX, rawY, x, y };
    }

    function findNodeAt(x, y) {
      const hitRadiusExtra = Math.max(8, 12 / Math.max(0.4, graphState.zoom));
      for (let i = graphState.nodes.length - 1; i >= 0; i--) {
        const n = graphState.nodes[i];
        const dx = n.x - x;
        const dy = n.y - y;
        const r = n.radius + hitRadiusExtra;
        if (dx * dx + dy * dy <= r * r) return n;
      }
      return null;
    }

    function handleStart(clientX, clientY) {
      if (momentumRaf) { cancelAnimationFrame(momentumRaf); momentumRaf = null; }
      if (smoothPanZoomRaf) { cancelAnimationFrame(smoothPanZoomRaf); smoothPanZoomRaf = null; }

      startClientX = clientX;
      startClientY = clientY;
      lastClientX = clientX;
      lastClientY = clientY;
      lastTime = performance.now();
      pointerVx = 0;
      pointerVy = 0;
      graphState.dragMoved = false;

      const { rawX, rawY, x, y } = getCanvasCoords(clientX, clientY);
      const hit = findNodeAt(x, y);
      if (hit) {
        graphState.dragNode = hit;
        hit.vx = 0; hit.vy = 0;
        wakeGraphSimulation();
      } else {
        graphState.isDragging = true;
        graphState.dragStartX = rawX - graphState.panX;
        graphState.dragStartY = rawY - graphState.panY;
      }
    }

    function handleMove(clientX, clientY) {
      if (Math.hypot(clientX - startClientX, clientY - startClientY) > 6) {
        graphState.dragMoved = true;
      }
      const now = performance.now();
      const dt = now - lastTime;
      if (dt > 4 && dt < 120) {
        const vx = (clientX - lastClientX) / dt * 16.67;
        const vy = (clientY - lastClientY) / dt * 16.67;
        pointerVx = pointerVx * 0.35 + vx * 0.65;
        pointerVy = pointerVy * 0.35 + vy * 0.65;
      }
      lastClientX = clientX;
      lastClientY = clientY;
      lastTime = now;

      const { rawX, rawY, x, y } = getCanvasCoords(clientX, clientY);

      if (graphState.dragNode) {
        graphState.dragNode.x = x;
        graphState.dragNode.y = y;
        graphState.dragNode.vx = 0;
        graphState.dragNode.vy = 0;
        scheduleGraphDraw();
        return;
      }

      if (graphState.isDragging) {
        graphState.panX = rawX - graphState.dragStartX;
        graphState.panY = rawY - graphState.dragStartY;
        scheduleGraphDraw();
        return;
      }

      const hit = findNodeAt(x, y);
      if (hit !== graphState.hoverNode) {
        graphState.hoverNode = hit;
        scheduleGraphDraw();
      }
      wrap.style.cursor = hit ? 'pointer' : 'grab';

      const tt = $id('graphTooltip');
      const escFn = global.esc || global.VocabCore?.esc || (s => s);
      if (tt) {
        if (hit && !graphState.selectedNode) {
          tt.style.display = 'block';
          tt.style.left = `${rawX}px`;
          tt.style.top = `${rawY}px`;
          if (hit.type === 'root') {
            const wordsPreview = (hit.connectedWords || []).slice(0, 5).map(w => w.label).join(', ');
            const more = (hit.childCount > 5) ? ` 他${hit.childCount - 5}語` : '';
            global.VocabDOM?.setSafeHtml(tt, `<strong>語根: ${escFn(hit.label)}</strong><div>派生単語: ${hit.childCount}語 (${escFn(wordsPreview)}${more})</div><div style="font-size:10px;color:var(--m);margin-top:3px">クリックで詳細・Anki特訓パネルを表示</div>`);
          } else if (hit.type === 'branch') {
            const wCount = hit.connectedWords?.length || 0;
            const cleanLabel = hit.label.replace(/^(Latin|Romance|Germanic|Greek|Borrowed|Italic):\s*/i, '');
            global.VocabDOM?.setSafeHtml(tt, `<strong>古典分岐: ${escFn(cleanLabel)}</strong><div>収録単語: ${wCount}語</div><div style="font-size:10px;color:var(--m);margin-top:3px">クリックでブランチ特訓</div>`);
          } else if (hit.type === 'ghost_bud') {
            global.VocabDOM?.setSafeHtml(tt, `<strong>${escFn(hit.label)} <span style="font-size:10px;color:#ea580c;font-weight:400">[未開拓スキル]</span></strong><div>印欧祖語「${escFn(hit.rootLabel)}」の重要語彙</div><div style="font-size:10px;color:var(--m);margin-top:3px">クリックで単語帳に追加</div>`);
          } else {
            const phonetic = hit.item?.phonetic ? `<span style="font-size:11px;color:var(--s);font-family:var(--mono);font-weight:400;margin-left:6px">${escFn(hit.item.phonetic)}</span>` : '';
            const meaning = (graphState.treeMaskMode) ? '[ ????? ]' : escFn(hit.meaning);
            const posTag = hit.pos ? `<span style="font-size:10px;padding:1px 4px;border-radius:3px;background:var(--bg-hov);font-weight:700;margin-right:4px">${escFn(hit.pos)}</span>` : '';
            global.VocabDOM?.setSafeHtml(tt, `<strong>${escFn(hit.label)} <span style="font-size:10px;color:var(--m);font-weight:400">[${escFn((hit.lang || 'en').toUpperCase())}]</span>${phonetic}</strong><div style="margin-top:2px">${posTag}${meaning}</div><div style="font-size:10px;color:var(--m);margin-top:4px">クリックで単語詳細を表示</div>`);
          }
        } else {
          tt.style.display = 'none';
        }
      }
    }

    function handleEnd() {
      // 慣性スクロール（Flick & Momentum Glide）: ドラッグ解除後も心地よく滑らかに減速
      if (graphState.isDragging && Math.hypot(pointerVx, pointerVy) > 0.8) {
        let curVx = pointerVx;
        let curVy = pointerVy;
        const maxV = 24;
        const speed = Math.hypot(curVx, curVy);
        if (speed > maxV) {
          curVx = (curVx / speed) * maxV;
          curVy = (curVy / speed) * maxV;
        }
        function glide() {
          if (Math.hypot(curVx, curVy) < 0.2 || graphState.isDragging || graphState.dragNode) {
            momentumRaf = null;
            return;
          }
          graphState.panX += curVx;
          graphState.panY += curVy;
          curVx *= 0.925;
          curVy *= 0.925;
          drawGraph();
          momentumRaf = requestAnimationFrame(glide);
        }
        momentumRaf = requestAnimationFrame(glide);
      }
      graphState.dragNode = null;
      graphState.isDragging = false;
    }

    const shouldIgnoreCanvasEvent = target => Boolean(
      target?.closest?.('#graphEikenDrawer') ||
      target?.closest?.('#graphDetailDrawer') ||
      target?.closest?.('#graphEikenBackdrop') ||
      target?.closest?.('.graph-timeline-bar') ||
      target?.closest?.('#graphLegend') ||
      target?.closest?.('#graphMindmapWrap') ||
      target?.closest?.('#graphMatrixWrap')
    );

    wrap.addEventListener('mousedown', e => {
      if (shouldIgnoreCanvasEvent(e.target)) return;
      handleStart(e.clientX, e.clientY);
    });
    window.addEventListener('mousemove', e => {
      const modal = $id('graphModal');
      if (!modal || !modal.classList.contains('open')) return;
      if (shouldIgnoreCanvasEvent(e.target)) {
        if (!graphState.isDragging && !graphState.dragNode) {
          const tt = $id('graphTooltip');
          if (tt) tt.style.display = 'none';
          if (graphState.hoverNode) {
            graphState.hoverNode = null;
            scheduleGraphDraw();
          }
          return;
        }
      }
      handleMove(e.clientX, e.clientY);
    });
    window.addEventListener('mouseup', handleEnd);

    // モバイルタッチ対応（ピンチズーム対応）
    wrap.addEventListener('touchstart', e => {
      if (shouldIgnoreCanvasEvent(e.target)) return;
      if (e.touches.length === 1) {
        handleStart(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2) {
        if (momentumRaf) { cancelAnimationFrame(momentumRaf); momentumRaf = null; }
        graphState.isDragging = false;
        graphState.dragNode = null;
        graphState.touchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: true });

    wrap.addEventListener('touchmove', e => {
      if (shouldIgnoreCanvasEvent(e.target)) return;
      if (e.touches.length === 1) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2 && graphState.touchDist > 0) {
        const newDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = newDist / graphState.touchDist;
        const newZoom = Math.min(3.5, Math.max(0.35, graphState.zoom * factor));
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const rect = wrap.getBoundingClientRect();
        const rx = midX - rect.left;
        const ry = midY - rect.top;

        graphState.panX = rx - (rx - graphState.panX) * (newZoom / graphState.zoom);
        graphState.panY = ry - (ry - graphState.panY) * (newZoom / graphState.zoom);
        graphState.zoom = newZoom;
        graphState.touchDist = newDist;
        updateZoomDisplay();
        scheduleGraphDraw();
      }
    }, { passive: true });

    wrap.addEventListener('touchend', e => {
      if (shouldIgnoreCanvasEvent(e.target)) return;
      handleEnd();
      graphState.touchDist = 0;
    }, { passive: true });

    wrap.addEventListener('wheel', e => {
      if (shouldIgnoreCanvasEvent(e.target)) return;
      e.preventDefault();
      if (momentumRaf) { cancelAnimationFrame(momentumRaf); momentumRaf = null; }
      if (smoothPanZoomRaf) { cancelAnimationFrame(smoothPanZoomRaf); smoothPanZoomRaf = null; }

      // Macトラックパッド（連続delta）とマウスホイール（離散delta）双方に対応した滑らかな連続指数ズーム
      const delta = Math.max(-100, Math.min(100, e.deltaY));
      const zoomFactor = Math.exp(-delta * 0.0022);
      const newZoom = Math.min(3.5, Math.max(0.35, graphState.zoom * zoomFactor));

      const rect = wrap.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      graphState.panX = mouseX - (mouseX - graphState.panX) * (newZoom / graphState.zoom);
      graphState.panY = mouseY - (mouseY - graphState.panY) * (newZoom / graphState.zoom);
      graphState.zoom = newZoom;
      updateZoomDisplay();
      scheduleGraphDraw();
    }, { passive: false });

    // ドロワー内のスムーズなスクロールを保証し、背景Canvasズームへの誤伝播のみを防ぐ
    const drawerBd = $id('graphDrawerBody');
    if (drawerBd) {
      drawerBd.addEventListener('wheel', e => {
        const matrixGrid = /** @type {any} */ (e.target)?.closest?.('.cog-matrix-grid');
        if (matrixGrid && (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey)) {
          matrixGrid.scrollLeft += (e.deltaX || e.deltaY);
        } else {
          drawerBd.scrollTop += e.deltaY;
        }
        e.stopPropagation();
      }, { passive: true });
    }
    const eikenList = $id('graphEikenList');
    if (eikenList) {
      eikenList.addEventListener('wheel', e => {
        eikenList.scrollTop += e.deltaY;
        e.stopPropagation();
      }, { passive: true });
    }

    // ノードクリック時のインスペクター展開 & 語根展開トグル
    wrap.addEventListener('click', e => {
      if (shouldIgnoreCanvasEvent(e.target)) return;
      if (graphState.dragMoved) return;

      const { x, y } = getCanvasCoords(e.clientX, e.clientY);
      const hit = findNodeAt(x, y);
      if (hit) {
        if (hit.type === 'root' && graphState.selectedNode === hit) {
          // すでに選択中の語根を再タップした場合は展開/折りたたみをトグル
          toggleRootCollapse(hit.label);
        } else {
          selectNode(hit, true);
        }
      } else {
        deselectNode();
      }
    });

    wrap.addEventListener('dblclick', () => {
      fitGraphToView();
    });

    // フィルタ入力 & 検索ジャンプ
    const filterInput = $id('graphFilterInput');
    let _filterJumpTimer = null;
    filterInput?.addEventListener('input', e => {
      const q = (/** @type {any} */ (e.target)?.value || '').trim().replace(/^\*/, '');
      graphState.filterQuery = q;
      drawGraph();
      if (graphState.activeViewTab === 'mindmap') renderMindmap();
      if (graphState.activeViewTab === 'matrix') renderMorphologyMatrix();
      if (_filterJumpTimer) clearTimeout(_filterJumpTimer);
      if (q.length >= 2) {
        _filterJumpTimer = setTimeout(() => {
          jumpToNode(q);
        }, 400);
      }
    });

    filterInput?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        const q = filterInput.value.trim().replace(/^\*/, '');
        if (q) jumpToNode(q);
      }
    });

    // 言語フィルタ変更
    const langSel = $id('graphLangFilterSel');
    langSel?.addEventListener('change', e => {
      graphState.langFilter = /** @type {any} */ (e.target).value;
      updateGraphDataAndFit();
    });

    // 語源系統・大語族分類フィルタ変更
    const famSel = $id('graphFamilyFilterSel');
  famSel?.addEventListener('change', e => {
    const val = /** @type {any} */ (e.target).value;
    graphState.familyFilter = val;
    updatePhylumPillsUI(val);
    updateGraphDataAndFit();
    if (graphState.layoutMode === 'tree') startTreeEasingAnimation();
    if (graphState.activeViewTab === 'mindmap') renderMindmap();
    if (graphState.activeViewTab === 'matrix') renderMorphologyMatrix();
  });

    // 主要語根ジャンプ
    const rootJumpSel = $id('graphRootJumpSel');
    rootJumpSel?.addEventListener('change', e => {
      const val = /** @type {any} */ (e.target).value;
      if (!val) {
        clearRootFocus();
        return;
      }
      focusRoot(val);
      const rNode = graphState.nodes.find(n => n.type === 'root' && n.label === val);
      if (rNode) {
        selectNode(rNode, false);
      }
    });

    // Escキーでインスペクターまたはモーダルを閉じる & キーボードショートカット (+, -, 0, f)
    window.addEventListener('keydown', e => {
      const modal = $id('graphModal');
      if (!modal || !modal.classList.contains('open')) return;

      if (e.key === 'Escape') {
        if (graphState.selectedNode) {
          e.stopPropagation();
          if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
          deselectNode();
        }
        return;
      }

      const tag = /** @type {any} */ (e.target)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return;
      }

      const isWordSelected = Boolean(graphState.selectedNode && graphState.selectedNode.type === 'word');

      if (e.key === ' ') {
        e.preventDefault();
        revealRecallAnswer();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        resetGraphZoom();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        fitGraphToView();
      } else if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        prevRoot();
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        if (graphState.microTreeFocus || graphState.focusedRootKey) {
          nextRoot();
        } else {
          startWateringReview();
        }
      } else if (e.key === 'u' || e.key === 'U') {
        e.preventDefault();
        toggleMicroTreeFocus();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleTreeMask();
      } else if (e.key === '1') {
        e.preventDefault();
        if (isWordSelected) rateNodeWord(0);
        else switchViewMode('mindmap');
      } else if (e.key === '2') {
        e.preventDefault();
        if (isWordSelected) rateNodeWord(1);
        else switchViewMode('matrix');
      } else if (e.key === '3') {
        e.preventDefault();
        if (isWordSelected) rateNodeWord(2);
        else switchViewMode('mindmap');
      } else if (e.key === '4') {
        e.preventDefault();
        if (isWordSelected) rateNodeWord(3);
        else switchViewMode('matrix');
      }
    });

    function handleResize() {
      const modal = $id('graphModal');
      if (!modal || (!modal.classList.contains('open') && modal.style.display === 'none')) return;
      const canvas = $id('graphCanvas');
      if (!canvas || !wrap) return;
      const oldW = graphState.width;
      const oldH = graphState.height;
      const realW = wrap.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 800);
      const realH = wrap.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 600);
      if (realW <= 0 || realH <= 0) return;

      graphState.width = realW;
      graphState.height = realH;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = realW * dpr;
      canvas.height = realH * dpr;
      canvas.style.width = realW + 'px';
      canvas.style.height = realH + 'px';
      invalidateTreeBgCache();

      if (graphState.selectedNode) {
        centerOnNode(graphState.selectedNode, graphState.zoom, false);
      } else {
        graphState.panX += (graphState.width - oldW) / 2;
        graphState.panY += (graphState.height - oldH) / 2;
        drawGraph();
      }
    }

    window.addEventListener('resize', handleResize);

    if (typeof ResizeObserver !== 'undefined' && wrap) {
      if (wrap._graphRo) wrap._graphRo.disconnect();
      const ro = new ResizeObserver(() => {
        handleResize();
      });
      ro.observe(wrap);
      wrap._graphRo = ro;
    }
  }

  let _graphDelegatedAttached = false;
  function initGraphDelegatedEvents() {
    if (_graphDelegatedAttached || typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;
    _graphDelegatedAttached = true;

    document.addEventListener('click', (e) => {
      const target = /** @type {any} */ (e.target)?.closest?.('[data-gact]');
      if (!target) return;
      const gact = target.dataset.gact;
      const a1 = target.dataset.garg;
      const a2 = target.dataset.garg2;
      const a3 = target.dataset.garg3;

      if (gact === 'reveal-mask-text') {
        e.stopPropagation();
        target.textContent = a1 || '';
        target.style.color = 'var(--t)';
        target.style.fontStyle = 'normal';
        target.style.background = 'transparent';
        return;
      }

      const handlers = {
        'clear-root-focus': () => clearRootFocus(),
        'deselect-node': () => deselectNode(),
        'export-image': () => exportGraphImage(),
        'fit-view': () => fitGraphToView(),
        'jump-recommended': () => jumpToRecommendedRoot(a1),
        'next-root': () => nextRoot(),
        'prev-root': () => prevRoot(),
        'reset-zoom': () => resetGraphZoom(),
        'set-phylum': () => setPhylumFilter(a1),
        'start-watering': () => startWateringReview(),
        'switch-view-mode': () => switchViewMode(a1),
        'toggle-color-mode': () => toggleColorMode(),
        'toggle-eiken-explorer': () => toggleEikenExplorer(a1 === 'false' ? false : undefined),
        'toggle-cluster-only': () => toggleGraphClusterOnly(),
        'toggle-micro-focus': () => toggleMicroTreeFocus(),
        'toggle-my-words': () => toggleMyWordsMode(),
        'toggle-physics': () => togglePhysics(),
        'toggle-timeline-play': () => toggleTimelineAutoPlay(),
        'toggle-tree-mask': () => toggleTreeMask(),
        'toggle-tree-mode': () => toggleTreeMode(),
        'unlock-eiken-words': () => unlockCurrentRootEikenWords(),
        'zoom-in': () => zoomIn(),
        'zoom-out': () => zoomOut(),
        'rate-specific': () => rateSpecificWord(a1, Number(a2), a3 || 'en'),
        'speak-node': () => speakNodeWord(a1, a2),
        'open-word-edit': () => openWordEdit(a1, a2),
        'select-node': () => selectNodeById(a1),
        'focus-root-water': () => { focusRoot(a1); startWateringReview(); },
        'focus-root-explorer': () => { focusRoot(a1); toggleEikenExplorer(false); },
        'print-page': () => { if (typeof window !== 'undefined' && window.print) window.print(); },
        'jump-node-word': () => jumpToNodeWord(a1, a2),
        'prompt-matrix-gen': () => promptMatrixGen(a1, a2),
        'jump-node': () => jumpToNode(a1),
        'start-root-anki': () => startRootAnkiReview(),
        'start-branch-anki': () => startBranchAnkiReview(),
        'toggle-root-collapse': () => toggleRootCollapse(a1),
        'filter-main-list': () => filterMainListByRoot(a1),
        'zoom-selected': () => zoomToCluster(graphState.selectedNode),
        'adopt-ghost-bud': () => adoptGhostBud(a1, a2),
        'reveal-recall': () => revealRecallAnswer(),
        'rate-node': () => rateNodeWord(Number(a1)),
      };
      const fn = handlers[gact];
      if (fn) fn();
    });
  }

  initGraphDelegatedEvents();


  // bezierCurveTo curve engine proxy for tests and renderer
  const bezierCurveTo = function(cp1x, cp1y, cp2x, cp2y, x, y) {
    if (graphState.ctx) graphState.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
  };

  // グローバル公開オブジェクト
  global.VocabGraph = {
    GraphUIManager,
    SpatialCullingRenderer,
    computeOffThreadPositions,
    extractBranchInfo,
    bezierCurveTo,
    getRootMeaning,
    ETYMOLOGY_FAMILIES: (global.VocabGraphLayout?.ETYMOLOGY_FAMILIES || {}),
    LANG_GRAPH_COLORS: (global.VocabGraphRenderer?.LANG_GRAPH_COLORS || {}),
    RETENTION_COLORS: (global.VocabGraphRenderer?.RETENTION_COLORS || {}),
    graphState,
    buildGraphData,
    drawGraph,
    openGraphModal,
    resetGraphZoom,
    fitGraphToView,
    centerOnNode,
    zoomToCluster,
    selectNode,
    selectNodeById,
    deselectNode,
    toggleColorMode,
    togglePhysics,
    toggleTreeMode,
    toggleGraphClusterOnly,
    switchViewMode,
    startWateringReview,
    toggleTreeMask,
    onTimelineChange,
    zoomIn,
    zoomOut,
    focusRoot,
    clearRootFocus,
    exportGraphImage,
    filterMainListByRoot,
    startRootAnkiReview,
    startBranchAnkiReview,
    adoptGhostBud,
    unlockCurrentRootEikenWords,
    toggleEikenExplorer,
    renderEikenExplorer,
    speakNodeWord,
    jumpToNodeWord,
    openWordEdit,
    setPhylumFilter,
    updatePhylumPillsUI,
    syncCanvasDimensions,
    invalidateTreeBgCache,
    initGraphEvents,
    jumpToNode,
    toggleMyWordsMode,
    toggleRootCollapse,
    toggleTimelineAutoPlay,
    stopTimelineAutoPlay,
    state: graphState,
    jumpToRecommendedRoot,
    revealRecallAnswer,
    rateNodeWord,
    rateSpecificWord,
    toggleMicroTreeFocus,
    nextRoot,
    prevRoot,
    jumpToNextWordInCluster,
    promptMatrixGen,
    getEnglishPairKeyAndEntries,
    updateGraphDataAndFit,
    startGraphSimulation,
    playSkillUnlockSound,
    persistUnlockedEntries
  };
})(typeof window !== 'undefined' ? window : globalThis);

export {};
