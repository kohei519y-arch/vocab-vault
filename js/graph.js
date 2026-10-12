/**
 * Vocab Vault — Root Network Graph Module (js/graph.js)
 * 印欧祖語(PIE)語根ネットワーク、星系レイアウト、力学シミュレーション、ビューポートカリング、詳細インスペクター
 */
(function (global) {
  'use strict';

  const LANG_GRAPH_COLORS = {
    root: '#7c3aed',
    en: '#2563eb',
    fr: '#06b6d4',
    de: '#f59e0b',
    ja: '#10b981'
  };

  const RETENTION_COLORS = {
    root: '#7c3aed',
    due: '#ef4444',
    learning: '#f59e0b',
    mastered: '#10b981'
  };

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
    colorMode: 'language', // 'language' | 'retention'
    clusterOnly: false,
    physicsPaused: false,
    animId: null,
    isSleeping: true,
    touchDist: 0
  };

  /**
   * 語根キーの安全な正規化 (*sta- -> *sta-)
   */
  function cleanRootKey(k) {
    if (!k) return '';
    const normFn = global.VocabMorphology?.normRootKey || global.normRootKey || global.VocabCore?.normRootKey;
    if (typeof normFn === 'function') return normFn(k);
    const s = String(k).trim().toLowerCase();
    return s.startsWith('*') ? s : `*${s}`;
  }

  /**
   * 単語帳データから語根グラフネットワークデータを構築
   */
  function buildGraphData(filterRootKey = '', clusterOnly = false, langFilter = 'all') {
    const nodes = [];
    const rootMap = new Map();
    const nodeMap = new Map();

    const getJsonFn = global.getJson || global.VocabCore?.getJson || (k => {
      try {
        const raw = (global.VocabStorage ? global.VocabStorage.lsGet(k, '[]') : (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : '[]'));
        return JSON.parse(raw || '[]');
      } catch { return []; }
    });
    const isValidRootFn = global.VocabMorphology?.isValidRootForEntry || global.isValidRootForEntry || global.VocabCore?.isValidRootForEntry || (() => true);

    // 全登録言語ペア辞書、または標準言語キーから単語を収集
    const allPairs = (global.VocabCore?.getAllKnownPairConfigs || global.getAllKnownPairConfigs)?.() || [];
    const defaultLangs = (global.LANG_KEYS || global.VocabStorage?.LANG_KEYS || global.VocabCore?.LANG_KEYS || ['en', 'fr', 'de', 'ja']);
    const langMap = global.LANGS || global.VocabStorage?.LANGS || global.VocabCore?.LANGS || {
      en: { key: 'distinction_entries' },
      fr: { key: 'distinction_entries_fr' },
      de: { key: 'distinction_entries_de' },
      ja: { key: 'distinction_entries_ja' }
    };
    const langKeys = (allPairs.length > 0)
      ? allPairs.map(p => ({ key: p.key, lang: p.src || 'en' }))
      : defaultLangs.map(l => ({ key: langMap[l]?.key || (l === 'en' ? 'distinction_entries' : `distinction_entries_${l}`), lang: l }));

    const targetLang = (langFilter && langFilter !== 'all') ? langFilter.toLowerCase() : '';
    const targetRoot = filterRootKey ? cleanRootKey(filterRootKey) : '';

    langKeys.forEach(({ key, lang }) => {
      const srcL = lang || 'en';
      if (targetLang && srcL !== targetLang) return;

      const list = getJsonFn(key);
      (Array.isArray(list) ? list : []).forEach(item => {
        if (!item || !item.word) return;

        // 1. 語根タグの取得（未設定の場合は解説文から正規表現フォールバック抽出）
        let itemRoots = (Array.isArray(item.etymologyTags) ? item.etymologyTags : [])
          .map(cleanRootKey)
          .filter(r => r && isValidRootFn(r, item));

        if (!itemRoots.length && item.etymology) {
          const matches = String(item.etymology).match(/\*([a-zāēīōūáéíóúh₁₂₃₂₃h]+(?:-[a-zāēīōūáéíóúh₁₂₃]*)?)/gi);
          if (matches) {
            itemRoots = matches.map(cleanRootKey).filter(r => r && isValidRootFn(r, item));
          }
        }

        if (!itemRoots.length) return;

        const wId = `word:${srcL}:${item.word}#${item.homographIndex || 1}`;
        let wNode = nodeMap.get(wId);
        if (!wNode) {
          wNode = {
            id: wId,
            label: item.word,
            type: 'word',
            lang: srcL,
            meaning: item.meanings?.[0]?.text || '',
            pos: item.meanings?.[0]?.pos || '',
            radius: 6.5,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            item,
            connectedRoots: [],
            connectedWords: []
          };
          nodeMap.set(wId, wNode);
        }

        itemRoots.forEach(rKey => {
          if (targetRoot && !rKey.includes(targetRoot.replace(/^\*/, ''))) return;

          let rNode = rootMap.get(rKey);
          if (!rNode) {
            rNode = {
              id: `root:${rKey}`,
              label: rKey,
              type: 'root',
              radius: 12.0,
              x: 0,
              y: 0,
              vx: 0,
              vy: 0,
              childCount: 0,
              connectedRoots: [],
              connectedWords: []
            };
            rootMap.set(rKey, rNode);
          }
          if (!rNode.connectedWords.includes(wNode)) {
            rNode.childCount++;
            rNode.connectedWords.push(wNode);
          }
          if (!wNode.connectedRoots.includes(rNode)) {
            wNode.connectedRoots.push(rNode);
          }
        });
      });
    });

    let finalRoots = Array.from(rootMap.values());

    // 2語以上接続する重要語根クラスタのみに絞り込み
    if (clusterOnly) {
      finalRoots = finalRoots.filter(r => r.childCount >= 2);
    }

    const validWordIds = new Set();
    const finalEdges = [];
    finalRoots.forEach(rNode => {
      rNode.radius = rNode.childCount >= 5 ? 18.0 : (rNode.childCount >= 3 ? 15.0 : (rNode.childCount >= 2 ? 12.5 : 10.0));
      nodes.push(rNode);
      rNode.connectedWords.forEach(wNode => {
        validWordIds.add(wNode.id);
        finalEdges.push({ source: rNode, target: wNode });
      });
    });

    nodeMap.forEach(wNode => {
      if (validWordIds.has(wNode.id)) {
        nodes.push(wNode);
      }
    });

    // 星系（Star Systems）アイランド初期配置
    const totalRoots = finalRoots.length;
    const cols = Math.max(1, Math.ceil(Math.sqrt(totalRoots * 1.55)));
    const spacing = 180;

    finalRoots.forEach((rNode, idx) => {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      const jitterX = (Math.random() - 0.5) * 40;
      const jitterY = (Math.random() - 0.5) * 40;
      rNode.x = (col - cols / 2) * spacing + jitterX;
      rNode.y = (row - Math.ceil(totalRoots / cols) / 2) * spacing + jitterY;
      rNode.vx = 0;
      rNode.vy = 0;
    });

    const placedWords = new Set();
    finalRoots.forEach(rNode => {
      const cCount = rNode.connectedWords.length;
      rNode.connectedWords.forEach((wNode, cIdx) => {
        if (!placedWords.has(wNode.id)) {
          placedWords.add(wNode.id);
          const angle = (cIdx / Math.max(1, cCount)) * Math.PI * 2;
          const dist = 52 + (cIdx % 4) * 14;
          wNode.x = rNode.x + Math.cos(angle) * dist;
          wNode.y = rNode.y + Math.sin(angle) * dist;
          wNode.vx = 0;
          wNode.vy = 0;
        }
      });
    });

    // クイックジャンプ用セレクター (#graphRootJumpSel) の動的更新
    populateRootJumpSelect(finalRoots);

    return { nodes, edges: finalEdges };
  }

  /**
   * 主要語根へ直接飛べるドロップダウンを生成
   */
  function populateRootJumpSelect(roots) {
    const sel = document.getElementById('graphRootJumpSel');
    if (!sel) return;
    const curVal = sel.value;
    const sorted = [...roots].sort((a, b) => b.childCount - a.childCount).slice(0, 35);
    sel.innerHTML = '<option value="">主要語根へ飛ぶ...</option>' +
      sorted.map(r => `<option value="${r.label}">${r.label} (${r.childCount}語)</option>`).join('');
    if (curVal && sorted.some(r => r.label === curVal)) {
      sel.value = curVal;
    }
  }

  function toggleGraphClusterOnly() {
    graphState.clusterOnly = !graphState.clusterOnly;
    const btn = document.getElementById('graphClusterFilterBtn');
    if (btn) btn.classList.toggle('active', graphState.clusterOnly);
    updateGraphDataAndFit();
  }

  function togglePhysics() {
    graphState.physicsPaused = !graphState.physicsPaused;
    const btn = document.getElementById('graphPhysicsBtn');
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

  function toggleColorMode() {
    graphState.colorMode = (graphState.colorMode === 'language') ? 'retention' : 'language';
    const btn = document.getElementById('graphColorModeBtn');
    if (btn) {
      btn.textContent = graphState.colorMode === 'language' ? '言語色' : '定着度色';
      btn.classList.toggle('active', graphState.colorMode === 'retention');
    }
    updateLegendUI();
    drawGraph();
  }

  function updateLegendUI() {
    const legend = document.getElementById('graphLegend');
    if (!legend) return;
    if (graphState.colorMode === 'retention') {
      legend.innerHTML = `
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#7c3aed"></span>語根</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#ef4444"></span>復習期日</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#f59e0b"></span>学習中(&lt;7日)</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#10b981"></span>長期定着(7日+)</span>
      `;
    } else {
      legend.innerHTML = `
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#7c3aed"></span>語根(Root)</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#2563eb"></span>英語</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#06b6d4"></span>仏語</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#f59e0b"></span>独語</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#10b981"></span>日本語</span>
      `;
    }
  }

  function updateGraphDataAndFit() {
    const { nodes, edges } = buildGraphData(graphState.filterQuery, graphState.clusterOnly, graphState.langFilter);
    graphState.nodes = nodes;
    graphState.edges = edges;
    const countEl = document.getElementById('graphMetaCount');
    if (countEl) {
      countEl.textContent = `${nodes.filter(n => n.type === 'root').length} 語根 / ${nodes.filter(n => n.type === 'word').length} 単語`;
    }
    fitGraphToView();
    wakeGraphSimulation();
  }

  function updateZoomDisplay() {
    const el = document.getElementById('graphZoomVal');
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

    // 異常値・極端な外れ値ノードに引っ張られて極小化するのを防ぐため、外れ値を除外した堅牢なバウンディングボックスを算出
    const xs = graphState.nodes.map(n => n.x).sort((a, b) => a - b);
    const ys = graphState.nodes.map(n => n.y).sort((a, b) => a - b);
    const pLow = Math.floor(xs.length * 0.03);
    const pHigh = Math.max(0, Math.ceil(xs.length * 0.97) - 1);
    const minX = xs[pLow], maxX = xs[pHigh];
    const minY = ys[pLow], maxY = ys[pHigh];

    const pad = 55;
    const w = Math.max(120, maxX - minX);
    const h = Math.max(120, maxY - minY);
    const scaleX = (graphState.width - pad * 2) / w;
    const scaleY = (graphState.height - pad * 2) / h;
    // 最小ズーム下限を0.50に底上げ（0.12などの極小縮小を完全に防止）
    const targetZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.50), 1.35);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    graphState.zoom = targetZoom;
    graphState.panX = graphState.width / 2 - centerX * targetZoom;
    graphState.panY = graphState.height / 2 - centerY * targetZoom;
    updateZoomDisplay();
    drawGraph();
  }

  function centerOnNode(node, zoomLevel = 1.25) {
    if (!node) return;
    graphState.zoom = zoomLevel;
    graphState.panX = graphState.width / 2 - node.x * zoomLevel;
    graphState.panY = graphState.height / 2 - node.y * zoomLevel;
    updateZoomDisplay();
    drawGraph();
  }

  function zoomToCluster(rootNode) {
    if (!rootNode || !rootNode.connectedWords || !rootNode.connectedWords.length) {
      centerOnNode(rootNode, 1.4);
      return;
    }
    const clusterNodes = [rootNode, ...rootNode.connectedWords];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    clusterNodes.forEach(n => {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });
    const pad = 90;
    const w = Math.max(70, maxX - minX);
    const h = Math.max(70, maxY - minY);
    const scaleX = (graphState.width - pad * 2) / w;
    const scaleY = (graphState.height - pad * 2) / h;
    const targetZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.65), 1.8);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    graphState.zoom = targetZoom;
    graphState.panX = graphState.width / 2 - centerX * targetZoom;
    graphState.panY = graphState.height / 2 - centerY * targetZoom;
    updateZoomDisplay();
    drawGraph();
  }

  function openGraphModal(targetRoot = null) {
    const toggleModalFn = global.toggleModal || global.VocabCore?.toggleModal;
    if (typeof toggleModalFn === 'function') toggleModalFn('graphModal', true);

    const canvas = document.getElementById('graphCanvas');
    const wrap = document.getElementById('graphCanvasWrap');
    if (!canvas || !wrap) return;

    graphState.canvas = canvas;
    graphState.ctx = canvas.getContext('2d');
    graphState.width = wrap.clientWidth || 800;
    graphState.height = wrap.clientHeight || 600;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = graphState.width * dpr;
    canvas.height = graphState.height * dpr;
    canvas.style.width = graphState.width + 'px';
    canvas.style.height = graphState.height + 'px';

    const normTarget = targetRoot ? cleanRootKey(targetRoot) : '';
    const filterInput = document.getElementById('graphFilterInput');
    if (filterInput) filterInput.value = normTarget ? normTarget : '';
    graphState.filterQuery = normTarget;

    const allRootsData = buildGraphData('', false, graphState.langFilter);
    if (allRootsData.nodes.length > 120 && !targetRoot) {
      graphState.clusterOnly = true;
    } else {
      graphState.clusterOnly = false;
    }

    const clusterBtn = document.getElementById('graphClusterFilterBtn');
    if (clusterBtn) clusterBtn.classList.toggle('active', graphState.clusterOnly);

    const { nodes, edges } = buildGraphData(normTarget, graphState.clusterOnly, graphState.langFilter);
    graphState.nodes = nodes;
    graphState.edges = edges;

    const countEl = document.getElementById('graphMetaCount');
    if (countEl) countEl.textContent = `${nodes.filter(n => n.type === 'root').length} 語根 / ${nodes.filter(n => n.type === 'word').length} 単語`;

    updateLegendUI();
    initGraphEvents();

    if (normTarget) {
      const rNode = nodes.find(n => n.type === 'root' && (n.label === normTarget || n.id === `root:${normTarget}`));
      if (rNode) {
        zoomToCluster(rNode);
        selectNode(rNode, false);
      } else {
        fitGraphToView();
      }
    } else {
      deselectNode();
      fitGraphToView();
    }

    wakeGraphSimulation();
  }

  function resetGraphZoom() {
    graphState.zoom = 1;
    graphState.panX = graphState.width / 2;
    graphState.panY = graphState.height / 2;
    const filterInput = document.getElementById('graphFilterInput');
    if (filterInput) filterInput.value = '';
    graphState.filterQuery = '';
    const langSel = document.getElementById('graphLangFilterSel');
    if (langSel) langSel.value = 'all';
    graphState.langFilter = 'all';

    const { nodes, edges } = buildGraphData('', graphState.clusterOnly, 'all');
    graphState.nodes = nodes;
    graphState.edges = edges;
    const countEl = document.getElementById('graphMetaCount');
    if (countEl) countEl.textContent = `${nodes.filter(n => n.type === 'root').length} 語根 / ${nodes.filter(n => n.type === 'word').length} 単語`;
    deselectNode();
    updateZoomDisplay();
    drawGraph();
  }

  function exportGraphImage() {
    const canvas = graphState.canvas;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `vocab-vault-root-network-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
      const toastFn = global.showToast || global.VocabCore?.showToast;
      if (typeof toastFn === 'function') toastFn('語根ネットワークの画像を出力しました。', 'ok', 3000);
    } catch (e) {
      console.warn('[Graph Export Error]', e);
    }
  }

  function selectNode(node, center = true) {
    graphState.selectedNode = node;
    renderDetailDrawer(node);
    if (center && node) {
      centerOnNode(node, Math.max(graphState.zoom, 1.15));
    } else {
      drawGraph();
    }
  }

  function deselectNode() {
    graphState.selectedNode = null;
    const drawer = document.getElementById('graphDetailDrawer');
    if (drawer) drawer.style.display = 'none';
    drawGraph();
  }

  /**
   * 語根・単語詳細インスペクター (Drawer) の描画
   */
  function renderDetailDrawer(node) {
    const drawer = document.getElementById('graphDetailDrawer');
    const badge = document.getElementById('graphDrawerTypeBadge');
    const title = document.getElementById('graphDrawerTitle');
    const body = document.getElementById('graphDrawerBody');
    const footer = document.getElementById('graphDrawerFooter');
    if (!drawer || !badge || !title || !body || !footer) return;

    if (!node) {
      drawer.style.display = 'none';
      return;
    }

    const escFn = global.esc || global.VocabCore?.esc || (s => String(s ?? ''));
    drawer.style.display = 'flex';

    if (node.type === 'root') {
      badge.textContent = '印欧祖語 (PIE Root)';
      badge.style.background = 'rgba(124, 58, 237, 0.15)';
      badge.style.color = '#a78bfa';
      title.textContent = node.label;

      // コアイメージ・原義の抽出
      const cores = [...new Set((node.connectedWords || []).map(w => w.item?.core).filter(Boolean))].slice(0, 2);
      const coreHtml = cores.length ? `
        <div style="margin-bottom:10px;padding:8px 10px;background:var(--bg-card);border-radius:6px;border:1px solid var(--b)">
          <span style="font-size:10px;color:var(--m);font-weight:700">コアイメージ / 原義:</span>
          <div style="font-size:12.5px;font-weight:600;color:var(--t);margin-top:2px">${escFn(cores.join(' ／ '))}</div>
        </div>
      ` : '';

      // 言語別内訳
      const langCountMap = {};
      (node.connectedWords || []).forEach(w => {
        langCountMap[w.lang] = (langCountMap[w.lang] || 0) + 1;
      });
      const langPills = Object.entries(langCountMap).map(([l, cnt]) => `
        <span style="font-size:10.5px;padding:2px 7px;border-radius:4px;background:var(--bg-hov);border:1px solid var(--b)">${l.toUpperCase()}: ${cnt}語</span>
      `).join('');

      // 同根単語リスト
      const wordsListHtml = (node.connectedWords || []).map(w => {
        const next = w.item?.nextReview || 0;
        const interval = Number(w.item?.interval) || 0;
        const isDue = next <= Date.now();
        const isMastered = interval >= 7;
        const statusCls = isDue ? 'due' : isMastered ? 'mastered' : 'learning';
        const statusTxt = isDue ? '復習期日' : isMastered ? '定着済' : '学習中';

        return `
          <div class="graph-peer-item" onclick="VocabGraph.selectNodeById('${escFn(w.id)}')">
            <div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1">
              <span style="font-size:9.5px;padding:1px 4px;border-radius:3px;background:var(--bg-hov);font-family:var(--mono);font-weight:700">${escFn(w.lang.toUpperCase())}</span>
              <strong style="color:var(--t)">${escFn(w.label)}</strong>
              <span style="font-size:11px;color:var(--s);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escFn(w.meaning)}</span>
            </div>
            <div style="display:flex;align-items:center;gap:4px">
              <span class="graph-status-pill ${statusCls}">${statusTxt}</span>
            </div>
          </div>
        `;
      }).join('');

      body.innerHTML = `
        ${coreHtml}
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;flex-wrap:wrap">
          <span style="font-size:11px;color:var(--m)">派生語彙 (全${node.childCount}語):</span>
          ${langPills}
        </div>
        <div style="display:flex;flex-direction:column;gap:1px">
          ${wordsListHtml || '<div style="color:var(--m)">関連単語がありません</div>'}
        </div>
      `;

      footer.innerHTML = `
        <button type="button" class="btn-ac btn-sm" onclick="VocabGraph.startRootAnkiReview()" style="font-weight:700;display:flex;align-items:center;justify-content:center;gap:5px">
          <span>🎯 この語根をAnkiで集中特訓 (${node.childCount}語)</span>
        </button>
        <div style="display:flex;gap:6px">
          <button type="button" class="btn-o btn-xs" onclick="VocabGraph.filterMainListByRoot('${escFn(node.label)}')" style="flex:1">📋 リストで絞り込み</button>
          <button type="button" class="btn-o btn-xs" onclick="VocabGraph.zoomToCluster(VocabGraph.graphState.selectedNode)" style="flex:1">🔍 クラスタにズーム</button>
        </div>
      `;
    } else {
      // 単語ノード
      badge.textContent = `${node.lang.toUpperCase()} 単語`;
      badge.style.background = 'rgba(37, 99, 235, 0.15)';
      badge.style.color = '#38bdf8';
      title.textContent = node.label;

      const item = node.item || {};
      const core = item.core ? `
        <div style="margin-bottom:8px;padding:8px 10px;background:var(--bg-card);border-radius:6px;border:1px solid var(--b)">
          <span style="font-size:10px;color:var(--m);font-weight:700">コアイメージ:</span>
          <div style="font-size:12.5px;font-weight:600;color:var(--t);margin-top:2px">${escFn(item.core)}</div>
        </div>
      ` : '';

      const meanings = (item.meanings || []).map(m => `
        <div style="font-size:12px;margin-bottom:4px"><span class="pos-lbl">${escFn(m.pos)}</span> ${escFn(m.text)}</div>
      `).join('') || `<div>[${escFn(node.pos)}] ${escFn(node.meaning)}</div>`;

      const ety = item.etymology ? `
        <div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--b);font-size:11.5px;color:var(--s);line-height:1.45">
          <span style="font-size:10px;color:var(--m);font-weight:700;display:block;margin-bottom:2px">語源解説:</span>
          ${escFn(item.etymology)}
        </div>
      ` : '';

      const rootsPills = (node.connectedRoots || []).map(r => `
        <button type="button" class="btn-o btn-xs" onclick="VocabGraph.selectNodeById('${escFn(r.id)}')" style="font-family:var(--mono);border-color:var(--ac);color:var(--ac)">${escFn(r.label)}</button>
      `).join('');

      body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div>
            <span style="font-size:16px;font-weight:700;color:var(--t)">${escFn(node.label)}</span>
            <span style="font-size:12px;color:var(--s);font-family:var(--mono);margin-left:6px">${escFn(item.phonetic || '')}</span>
          </div>
          <button type="button" class="spk-btn" onclick="VocabGraph.speakNodeWord('${escFn(node.label)}','${escFn(node.lang)}')" title="発音を聞く" aria-label="発音">🔊</button>
        </div>
        ${core}
        <div style="margin-bottom:8px">${meanings}</div>
        ${ety}
        <div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--b)">
          <span style="font-size:10px;color:var(--m);font-weight:700;display:block;margin-bottom:4px">接続語根:</span>
          <div style="display:flex;gap:4px;flex-wrap:wrap">${rootsPills || '<span style="color:var(--m)">なし</span>'}</div>
        </div>
      `;

      footer.innerHTML = `
        <button type="button" class="btn-ac btn-sm" onclick="VocabGraph.jumpToNodeWord('${escFn(node.label)}','${escFn(node.lang)}')">
          📖 単語カードを表示
        </button>
      `;
    }
  }

  function selectNodeById(id) {
    const target = graphState.nodes.find(n => n.id === id);
    if (target) {
      selectNode(target, true);
    }
  }

  function speakNodeWord(word, lang) {
    const speakFn = global.speakText || global.VocabCore?.speakText;
    if (typeof speakFn === 'function') speakFn(word, lang);
  }

  function jumpToNodeWord(word, lang) {
    const toggleModalFn = global.toggleModal || global.VocabCore?.toggleModal;
    if (typeof toggleModalFn === 'function') toggleModalFn('graphModal', false);
    const jumpFn = global.jumpToWord || global.VocabCore?.jumpToWord;
    if (typeof jumpFn === 'function') jumpFn(word, lang);
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

  function wakeGraphSimulation() {
    graphState.isSleeping = false;
    startGraphSimulation();
  }

  /**
   * スケール対策 & 省電力スリープ対応の力学シミュレーション
   */
  function startGraphSimulation() {
    if (graphState.animId) cancelAnimationFrame(graphState.animId);

    let frameCount = 0;
    function step() {
      const modal = document.getElementById('graphModal');
      if (!modal || !modal.classList.contains('open')) {
        graphState.isSleeping = true;
        return;
      }

      if (graphState.physicsPaused) {
        drawGraph();
        return;
      }

      const nodes = graphState.nodes;
      const edges = graphState.edges;
      const totalNodes = nodes.length;

      const kRepulsion = totalNodes > 200 ? 220 : 300;
      const maxRepulseDist = totalNodes > 200 ? 95 : 125;
      const maxRepulseDistSq = maxRepulseDist * maxRepulseDist;
      const kSpring = 0.07;
      const springLength = 52;
      const damping = 0.82;
      const maxSpeed = 3.5;
      const kGravity = 0.0022;

      // 1. 反発力 (O(N^2)の距離カットオフ早期スキップ)
      for (let i = 0; i < totalNodes; i++) {
        const n1 = nodes[i];
        for (let j = i + 1; j < totalNodes; j++) {
          const n2 = nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy;
          if (distSq > maxRepulseDistSq || distSq < 1) continue;

          const dist = Math.sqrt(distSq);
          let force = (kRepulsion / distSq) * (1 - dist / maxRepulseDist);
          if (force > 3.2) force = 3.2;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (n1 !== graphState.dragNode) { n1.vx -= fx; n1.vy -= fy; }
          if (n2 !== graphState.dragNode) { n2.vx += fx; n2.vy += fy; }
        }
      }

      // 2. バネ引力
      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        const s = edge.source, t = edge.target;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        let force = (dist - springLength) * kSpring;
        if (force > 3.0) force = 3.0;
        if (force < -3.0) force = -3.0;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (s !== graphState.dragNode) { s.vx += fx; s.vy += fy; }
        if (t !== graphState.dragNode) { t.vx += fx; t.vy += fy; }
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
      if (frameCount > 80 && totalMotion < 0.20 && !graphState.isDragging && !graphState.dragNode) {
        graphState.isSleeping = true;
        drawGraph();
        return;
      }

      graphState.animId = requestAnimationFrame(step);
    }

    graphState.animId = requestAnimationFrame(step);
  }

  /**
   * ビューポート・カリング対応のCanvas描画
   */
  function drawGraph() {
    const ctx = graphState.ctx;
    const canvas = graphState.canvas;
    if (!ctx || !canvas) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    ctx.translate(graphState.panX, graphState.panY);
    ctx.scale(graphState.zoom, graphState.zoom);

    const viewLeft = -graphState.panX / graphState.zoom - 50;
    const viewTop = -graphState.panY / graphState.zoom - 50;
    const viewRight = (graphState.width - graphState.panX) / graphState.zoom + 50;
    const viewBottom = (graphState.height - graphState.panY) / graphState.zoom + 50;

    const isDark = document.body.classList.contains('dark');
    const baseEdgeColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const highlightEdgeColor = isDark ? 'rgba(196,181,253,0.85)' : 'rgba(124,58,237,0.75)';
    const textColor = isDark ? '#e2e8f0' : '#1e293b';

    const hNode = graphState.hoverNode;
    const sNode = graphState.selectedNode;
    const focusNode = sNode || hNode;
    const isFiltered = !!graphState.filterQuery;
    const filterQ = graphState.filterQuery.toLowerCase();
    const isRetention = graphState.colorMode === 'retention';
    const now = Date.now();

    // 1. エッジ描画
    for (let i = 0; i < graphState.edges.length; i++) {
      const e = graphState.edges[i];
      if (
        (e.source.x < viewLeft && e.target.x < viewLeft) ||
        (e.source.x > viewRight && e.target.x > viewRight) ||
        (e.source.y < viewTop && e.target.y < viewTop) ||
        (e.source.y > viewBottom && e.target.y > viewBottom)
      ) {
        continue;
      }

      const isConnectedToFocus = focusNode && (e.source === focusNode || e.target === focusNode);

      ctx.save();
      if (focusNode) {
        ctx.strokeStyle = isConnectedToFocus ? highlightEdgeColor : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)');
        ctx.lineWidth = isConnectedToFocus ? 1.8 : 0.5;
      } else {
        ctx.strokeStyle = baseEdgeColor;
        ctx.lineWidth = 0.7;
      }
      ctx.beginPath();
      ctx.moveTo(e.source.x, e.source.y);
      ctx.lineTo(e.target.x, e.target.y);
      ctx.stroke();
      ctx.restore();
    }

    // 2. ノード描画
    for (let i = 0; i < graphState.nodes.length; i++) {
      const n = graphState.nodes[i];
      if (n.x < viewLeft || n.x > viewRight || n.y < viewTop || n.y > viewBottom) {
        continue;
      }

      const isSelected = n === sNode;
      const isHover = n === hNode;
      const isConnectedToFocus = focusNode && (
        (focusNode.type === 'root' && focusNode.connectedWords?.includes(n)) ||
        (focusNode.type === 'word' && focusNode.connectedRoots?.includes(n))
      );
      const isMatch = isFiltered && n.label.toLowerCase().includes(filterQ);

      ctx.save();
      if (focusNode && !isSelected && !isHover && !isConnectedToFocus) {
        ctx.globalAlpha = 0.12;
      } else if (isFiltered && !isMatch) {
        ctx.globalAlpha = 0.15;
      }

      // カラー算出
      let nodeColor = LANG_GRAPH_COLORS.root;
      if (n.type === 'word') {
        if (isRetention) {
          const next = n.item?.nextReview || 0;
          const interval = Number(n.item?.interval) || 0;
          if (next <= now) nodeColor = RETENTION_COLORS.due;
          else if (interval < 7) nodeColor = RETENTION_COLORS.learning;
          else nodeColor = RETENTION_COLORS.mastered;
        } else {
          nodeColor = LANG_GRAPH_COLORS[n.lang] || '#38bdf8';
        }
      }

      // 画面上で点にならないよう最小スクリーン半径を保証
      const minScreenR = n.type === 'root' ? 8.5 : 4.5;
      const baseR = Math.max(n.radius, minScreenR / Math.max(0.35, graphState.zoom));
      const drawRadius = n.type === 'root'
        ? baseR * (isSelected ? 1.35 : (isHover ? 1.25 : 1))
        : baseR * (isSelected ? 1.5 : (isHover ? 1.4 : 1));

      if (n.type === 'root') {
        const glowRadius = drawRadius * (isSelected ? 2.6 : (isHover ? 2.3 : 1.9));
        ctx.beginPath();
        ctx.arc(n.x, n.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? 'rgba(167,139,250,0.22)' : 'rgba(124,58,237,0.14)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, drawRadius, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.fill();

        if (isSelected) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, drawRadius * 1.55, 0, Math.PI * 2);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.4;
          ctx.stroke();
        } else if (isHover || isConnectedToFocus) {
          ctx.strokeStyle = isDark ? '#ffffff' : '#0f172a';
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        ctx.arc(n.x, n.y, drawRadius, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.fill();

        if (isSelected) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, drawRadius * 1.6, 0, Math.PI * 2);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.0;
          ctx.stroke();
        } else if (isHover || isConnectedToFocus) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, drawRadius * 1.5, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.10)';
          ctx.fill();
        }
      }

      // ラベル描画: 語根ラベルは常時表示！単語ラベルも選択・フォーカス・検索マッチまたは zoom >= 0.38 で明瞭表示
      const showLabel = (n.type === 'root') ||
        isSelected || isHover || isConnectedToFocus || isMatch ||
        (n.type === 'word' && graphState.zoom >= 0.38);

      if (showLabel) {
        // ズームに応じたフォントスケール補正（縮小時でも文字が極小化せずクッキリ読める）
        const fontScale = Math.max(0.85, Math.min(1.5, 1 / Math.sqrt(graphState.zoom)));
        const baseFontSize = n.type === 'root' ? 12 : 9.5;
        const fontSize = Math.round(baseFontSize * fontScale);
        ctx.font = `${n.type === 'root' ? '700 ' : '600 '}${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

        const labelY = n.y + drawRadius + fontSize + 2;

        // 背景アウトラインで視認性を飛躍的に高める（エッジや暗背景・明背景を問わず読みやすい）
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeStyle = isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)';
        ctx.lineWidth = Math.max(2.5, 3.5 * fontScale);
        ctx.textAlign = 'center';
        ctx.strokeText(n.label, n.x, labelY);

        ctx.fillStyle = textColor;
        ctx.fillText(n.label, n.x, labelY);
      }
      ctx.restore();
    }

    ctx.restore();
  }

  function initGraphEvents() {
    const wrap = document.getElementById('graphCanvasWrap');
    if (!wrap || wrap._graphEventsAttached) return;
    wrap._graphEventsAttached = true;

    let startClientX = 0, startClientY = 0;

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
      startClientX = clientX;
      startClientY = clientY;
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
      const { rawX, rawY, x, y } = getCanvasCoords(clientX, clientY);

      if (graphState.dragNode) {
        graphState.dragNode.x = x;
        graphState.dragNode.y = y;
        graphState.dragNode.vx = 0;
        graphState.dragNode.vy = 0;
        drawGraph();
        return;
      }

      if (graphState.isDragging) {
        graphState.panX = rawX - graphState.dragStartX;
        graphState.panY = rawY - graphState.dragStartY;
        drawGraph();
        return;
      }

      const hit = findNodeAt(x, y);
      if (hit !== graphState.hoverNode) {
        graphState.hoverNode = hit;
        drawGraph();
      }
      wrap.style.cursor = hit ? 'pointer' : 'grab';

      const tt = document.getElementById('graphTooltip');
      const escFn = global.esc || global.VocabCore?.esc || (s => s);
      if (tt) {
        if (hit && !graphState.selectedNode) {
          tt.style.display = 'block';
          tt.style.left = `${rawX}px`;
          tt.style.top = `${rawY}px`;
          if (hit.type === 'root') {
            const wordsPreview = (hit.connectedWords || []).slice(0, 5).map(w => w.label).join(', ');
            const more = (hit.childCount > 5) ? ` 他${hit.childCount - 5}語` : '';
            tt.innerHTML = `<strong>語根: ${escFn(hit.label)}</strong><div>派生単語: ${hit.childCount}語 (${escFn(wordsPreview)}${more})</div><div style="font-size:10px;color:var(--m);margin-top:3px">クリックで詳細・Anki特訓パネルを表示</div>`;
          } else {
            tt.innerHTML = `<strong>${escFn(hit.label)} <span style="font-size:10px;color:var(--m)">[${escFn(hit.lang.toUpperCase())}]</span></strong><div>[${escFn(hit.pos)}] ${escFn(hit.meaning)}</div><div style="font-size:10px;color:var(--m);margin-top:3px">クリックで単語詳細を表示</div>`;
          }
        } else {
          tt.style.display = 'none';
        }
      }
    }

    function handleEnd() {
      graphState.dragNode = null;
      graphState.isDragging = false;
    }

    wrap.addEventListener('mousedown', e => handleStart(e.clientX, e.clientY));
    window.addEventListener('mousemove', e => {
      const modal = document.getElementById('graphModal');
      if (!modal || !modal.classList.contains('open')) return;
      handleMove(e.clientX, e.clientY);
    });
    window.addEventListener('mouseup', handleEnd);

    // モバイルタッチ対応（ピンチズーム対応）
    wrap.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        handleStart(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 2) {
        graphState.isDragging = false;
        graphState.dragNode = null;
        graphState.touchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: true });

    wrap.addEventListener('touchmove', e => {
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
        drawGraph();
      }
    }, { passive: true });

    wrap.addEventListener('touchend', () => {
      handleEnd();
      graphState.touchDist = 0;
    }, { passive: true });

    wrap.addEventListener('wheel', e => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      const newZoom = Math.min(3.5, Math.max(0.35, graphState.zoom * zoomFactor));

      const rect = wrap.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      graphState.panX = mouseX - (mouseX - graphState.panX) * (newZoom / graphState.zoom);
      graphState.panY = mouseY - (mouseY - graphState.panY) * (newZoom / graphState.zoom);
      graphState.zoom = newZoom;
      updateZoomDisplay();
      drawGraph();
    }, { passive: false });

    // ノードクリック時のインスペクター展開
    wrap.addEventListener('click', e => {
      if (graphState.dragMoved) return;

      const { x, y } = getCanvasCoords(e.clientX, e.clientY);
      const hit = findNodeAt(x, y);
      if (hit) {
        selectNode(hit, true);
      } else {
        deselectNode();
      }
    });

    wrap.addEventListener('dblclick', () => {
      fitGraphToView();
    });

    // フィルタ入力
    const filterInput = document.getElementById('graphFilterInput');
    filterInput?.addEventListener('input', e => {
      const q = e.target.value.trim().replace(/^\*/, '');
      graphState.filterQuery = q;
      drawGraph();
    });

    // 言語フィルタ変更
    const langSel = document.getElementById('graphLangFilterSel');
    langSel?.addEventListener('change', e => {
      graphState.langFilter = e.target.value;
      updateGraphDataAndFit();
    });

    // 主要語根ジャンプ
    const rootJumpSel = document.getElementById('graphRootJumpSel');
    rootJumpSel?.addEventListener('change', e => {
      const val = e.target.value;
      if (!val) return;
      const rNode = graphState.nodes.find(n => n.type === 'root' && n.label === val);
      if (rNode) {
        zoomToCluster(rNode);
        selectNode(rNode, false);
      }
    });

    // Escキーでインスペクターまたはモーダルを閉じる & キーボードショートカット (+, -, 0, f)
    window.addEventListener('keydown', e => {
      const modal = document.getElementById('graphModal');
      if (!modal || !modal.classList.contains('open')) return;

      if (e.key === 'Escape') {
        if (graphState.selectedNode) {
          e.stopPropagation();
          deselectNode();
        }
        return;
      }

      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) {
        return;
      }

      if (e.key === '+' || e.key === '=') {
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
      }
    });

    window.addEventListener('resize', () => {
      const modal = document.getElementById('graphModal');
      if (!modal || !modal.classList.contains('open')) return;
      const canvas = document.getElementById('graphCanvas');
      if (!canvas || !wrap) return;
      graphState.width = wrap.clientWidth || 800;
      graphState.height = wrap.clientHeight || 600;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = graphState.width * dpr;
      canvas.height = graphState.height * dpr;
      canvas.style.width = graphState.width + 'px';
      canvas.style.height = graphState.height + 'px';
      drawGraph();
    });
  }

  // グローバル公開オブジェクト
  global.VocabGraph = {
    LANG_GRAPH_COLORS,
    RETENTION_COLORS,
    graphState,
    buildGraphData,
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
    exportGraphImage,
    speakNodeWord,
    jumpToNodeWord,
    filterMainListByRoot,
    startRootAnkiReview,
    toggleGraphClusterOnly,
    updateGraphDataAndFit,
    drawGraph,
    startGraphSimulation,
    wakeGraphSimulation,
    initGraphEvents,
    zoomIn,
    zoomOut,
    setZoomLevel,
    updateZoomDisplay
  };

  // 既存ハンドラ互換のためにグローバルへ展開
  Object.assign(global, global.VocabGraph);
})(typeof window !== 'undefined' ? window : globalThis);
