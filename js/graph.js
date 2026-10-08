/**
 * Vocab Vault — Root Network Graph Module (js/graph.js)
 * 印欧祖語(PIE)語根ネットワーク、星系レイアウト、力学シミュレーション、ビューポートカリング
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
    filterQuery: '',
    clusterOnly: false,
    animId: null,
    isSleeping: true // [改善2] アニメーション省電力スリープ状態
  };

  /**
   * 単語帳データから語根グラフネットワークデータを構築
   */
  function buildGraphData(filterRootKey = '', clusterOnly = false) {
    const nodes = [];
    const rootMap = new Map();
    const nodeMap = new Map();

    const langKeys = global.LANG_KEYS || global.VocabCore?.LANG_KEYS || ['en', 'ja', 'fr', 'de'];
    const langsConfig = global.LANGS || global.VocabCore?.LANGS || {};
    const getJsonFn = global.getJson || global.VocabCore?.getJson;
    const normRootKeyFn = global.normRootKey || global.VocabCore?.normRootKey || (k => String(k || '').trim());
    const isValidRootFn = global.isValidRootForEntry || global.VocabCore?.isValidRootForEntry || (() => true);

    if (typeof getJsonFn !== 'function') return { nodes: [], edges: [] };

    langKeys.forEach(l => {
      const cfg = langsConfig[l];
      if (!cfg) return;
      const list = getJsonFn(cfg.key);
      (Array.isArray(list) ? list : []).forEach(item => {
        if (!item) return;
        const itemRoots = (item.etymologyTags || [])
          .map(normRootKeyFn)
          .filter(r => r && isValidRootFn(r, item));
        if (!itemRoots.length) return;

        const wId = `word:${l}:${item.word}#${item.homographIndex || 1}`;
        let wNode = nodeMap.get(wId);
        if (!wNode) {
          wNode = {
            id: wId,
            label: item.word,
            type: 'word',
            lang: l,
            meaning: item.meanings?.[0]?.text || '',
            pos: item.meanings?.[0]?.pos || '',
            color: LANG_GRAPH_COLORS[l] || '#38bdf8',
            radius: 3.2,
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
          if (filterRootKey && !rKey.includes(filterRootKey)) return;

          let rNode = rootMap.get(rKey);
          if (!rNode) {
            rNode = {
              id: `root:${rKey}`,
              label: rKey.startsWith('*') ? rKey : `*${rKey}`,
              type: 'root',
              color: '#a78bfa',
              radius: 4.5,
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
          rNode.childCount++;
          rNode.connectedWords.push(wNode);
          wNode.connectedRoots.push(rNode);
        });
      });
    });

    let finalRoots = Array.from(rootMap.values());

    // [改善2: スケール対策] 語根ノード数が50件以上の大規模環境ではクラスタリング（派生2語以上）を適用
    if (clusterOnly) {
      finalRoots = finalRoots.filter(r => r.childCount >= 2);
    }

    const validWordIds = new Set();
    const finalEdges = [];
    finalRoots.forEach(rNode => {
      rNode.radius = rNode.childCount >= 4 ? 6.8 : (rNode.childCount >= 2 ? 5.2 : 3.8);
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
    const spacing = 84;

    finalRoots.forEach((rNode, idx) => {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      const jitterX = (Math.random() - 0.5) * 36;
      const jitterY = (Math.random() - 0.5) * 36;
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
          const dist = 22 + (cIdx % 3) * 6;
          wNode.x = rNode.x + Math.cos(angle) * dist;
          wNode.y = rNode.y + Math.sin(angle) * dist;
          wNode.vx = 0;
          wNode.vy = 0;
        }
      });
    });

    return { nodes, edges: finalEdges };
  }

  function toggleGraphClusterOnly() {
    graphState.clusterOnly = !graphState.clusterOnly;
    const btn = document.getElementById('graphClusterFilterBtn');
    if (btn) btn.classList.toggle('active', graphState.clusterOnly);
    updateGraphDataAndFit();
  }

  function updateGraphDataAndFit() {
    const { nodes, edges } = buildGraphData(graphState.filterQuery, graphState.clusterOnly);
    graphState.nodes = nodes;
    graphState.edges = edges;
    const countEl = document.getElementById('graphMetaCount');
    if (countEl) {
      countEl.textContent = `${nodes.filter(n => n.type === 'root').length} 語根 / ${nodes.filter(n => n.type === 'word').length} 単語`;
    }
    fitGraphToView();
    wakeGraphSimulation();
  }

  function fitGraphToView() {
    if (!graphState.nodes || !graphState.nodes.length) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < graphState.nodes.length; i++) {
      const n = graphState.nodes[i];
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    }
    const pad = 65;
    const w = Math.max(80, maxX - minX);
    const h = Math.max(80, maxY - minY);
    const scaleX = (graphState.width - pad * 2) / w;
    const scaleY = (graphState.height - pad * 2) / h;
    const targetZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.12), 1.35);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    graphState.zoom = targetZoom;
    graphState.panX = graphState.width / 2 - centerX * targetZoom;
    graphState.panY = graphState.height / 2 - centerY * targetZoom;
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
    canvas.width = graphState.width * (window.devicePixelRatio || 1);
    canvas.height = graphState.height * (window.devicePixelRatio || 1);

    const normRootKeyFn = global.normRootKey || global.VocabCore?.normRootKey || (k => String(k || '').trim());
    const normTarget = targetRoot ? normRootKeyFn(targetRoot) : '';
    const filterInput = document.getElementById('graphFilterInput');
    if (filterInput) filterInput.value = normTarget ? `*${normTarget.replace(/^\*/, '')}` : '';
    graphState.filterQuery = normTarget;

    // [改善2: スケール対策] 登録総数が多い場合はクラスタリングを初期有効化
    const allRootsData = buildGraphData('', false);
    if (allRootsData.nodes.length > 120 && !targetRoot) {
      graphState.clusterOnly = true;
    }

    const btn = document.getElementById('graphClusterFilterBtn');
    if (btn) btn.classList.toggle('active', graphState.clusterOnly);

    const { nodes, edges } = buildGraphData(normTarget, graphState.clusterOnly);
    graphState.nodes = nodes;
    graphState.edges = edges;

    const countEl = document.getElementById('graphMetaCount');
    if (countEl) countEl.textContent = `${nodes.filter(n => n.type === 'root').length} 語根 / ${nodes.filter(n => n.type === 'word').length} 単語`;

    fitGraphToView();
    initGraphEvents();
    wakeGraphSimulation();
  }

  function resetGraphZoom() {
    graphState.zoom = 1;
    graphState.panX = graphState.width / 2;
    graphState.panY = graphState.height / 2;
    const filterInput = document.getElementById('graphFilterInput');
    if (filterInput) filterInput.value = '';
    graphState.filterQuery = '';
    const { nodes, edges } = buildGraphData('', graphState.clusterOnly);
    graphState.nodes = nodes;
    graphState.edges = edges;
    const countEl = document.getElementById('graphMetaCount');
    if (countEl) countEl.textContent = `${nodes.filter(n => n.type === 'root').length} 語根 / ${nodes.filter(n => n.type === 'word').length} 単語`;
    drawGraph();
  }

  function wakeGraphSimulation() {
    graphState.isSleeping = false;
    startGraphSimulation();
  }

  /**
   * [改善2: スケール対策] 高速化・早期収束・スリープ対応の力学シミュレーション
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

      const nodes = graphState.nodes;
      const edges = graphState.edges;
      const totalNodes = nodes.length;

      // ノード数に応じてパラメータを動的調整（大規模時は反発距離を絞る）
      const kRepulsion = totalNodes > 200 ? 110 : 150;
      const maxRepulseDist = totalNodes > 200 ? 60 : 80;
      const maxRepulseDistSq = maxRepulseDist * maxRepulseDist;
      const kSpring = 0.08;
      const springLength = 24;
      const damping = 0.80;
      const maxSpeed = 3.5;
      const kGravity = 0.00035;

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
          if (force > 2.2) force = 2.2;
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
        if (force > 2.5) force = 2.5;
        if (force < -2.5) force = -2.5;
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

      if (frameCount === 12 && !graphState.isDragging && !graphState.dragNode) {
        fitGraphToView();
      }

      // [改善2: スケール対策] 運動エネルギー収束による省電力スリープ (Idle Sleep)
      if (frameCount > 80 && totalMotion < 0.20 && !graphState.isDragging && !graphState.dragNode) {
        graphState.isSleeping = true;
        drawGraph();
        return; // アニメーションループ完全停止
      }

      graphState.animId = requestAnimationFrame(step);
    }

    graphState.animId = requestAnimationFrame(step);
  }

  /**
   * [改善2: スケール対策] ビューポート・カリング（Viewport Culling）対応のCanvas描画
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

    // [改善2] 現在の表示範囲（ワールド座標）を計算し、画面外の描画をスキップ (Viewport Culling)
    const viewLeft = -graphState.panX / graphState.zoom - 50;
    const viewTop = -graphState.panY / graphState.zoom - 50;
    const viewRight = (graphState.width - graphState.panX) / graphState.zoom + 50;
    const viewBottom = (graphState.height - graphState.panY) / graphState.zoom + 50;

    const isDark = document.body.classList.contains('dark');
    const baseEdgeColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const highlightEdgeColor = isDark ? 'rgba(196,181,253,0.75)' : 'rgba(124,58,237,0.7)';
    const textColor = isDark ? '#e2e8f0' : '#1e293b';

    const hNode = graphState.hoverNode;
    const isFiltered = !!graphState.filterQuery;
    const filterQ = graphState.filterQuery.toLowerCase();

    // 1. エッジ描画 (カリング適用)
    for (let i = 0; i < graphState.edges.length; i++) {
      const e = graphState.edges[i];
      // 両端が画面外ならスキップ
      if (
        (e.source.x < viewLeft && e.target.x < viewLeft) ||
        (e.source.x > viewRight && e.target.x > viewRight) ||
        (e.source.y < viewTop && e.target.y < viewTop) ||
        (e.source.y > viewBottom && e.target.y > viewBottom)
      ) {
        continue;
      }

      const isConnectedToHover = hNode && (e.source === hNode || e.target === hNode);

      ctx.save();
      if (hNode) {
        ctx.strokeStyle = isConnectedToHover ? highlightEdgeColor : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)');
        ctx.lineWidth = isConnectedToHover ? 1.6 : 0.6;
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

    // 2. ノード描画 (カリング適用)
    for (let i = 0; i < graphState.nodes.length; i++) {
      const n = graphState.nodes[i];
      // 画面外ノードの描画スキップ
      if (n.x < viewLeft || n.x > viewRight || n.y < viewTop || n.y > viewBottom) {
        continue;
      }

      const isHover = n === hNode;
      const isConnectedToHover = hNode && (
        (hNode.type === 'root' && hNode.connectedWords?.includes(n)) ||
        (hNode.type === 'word' && hNode.connectedRoots?.includes(n))
      );
      const isMatch = isFiltered && n.label.toLowerCase().includes(filterQ);

      ctx.save();
      if (hNode && !isHover && !isConnectedToHover) {
        ctx.globalAlpha = 0.15;
      } else if (isFiltered && !isMatch) {
        ctx.globalAlpha = 0.15;
      }

      if (n.type === 'root') {
        const glowRadius = n.radius * (isHover ? 2.8 : 2.2);
        ctx.beginPath();
        ctx.arc(n.x, n.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? 'rgba(167,139,250,0.18)' : 'rgba(124,58,237,0.12)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius * (isHover ? 1.25 : 1), 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();

        if (isHover || isConnectedToHover) {
          ctx.strokeStyle = isDark ? '#ffffff' : '#0f172a';
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius * (isHover ? 1.4 : 1), 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();

        if (isHover || isConnectedToHover) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)';
          ctx.fill();
        }
      }

      // ラベル描画
      const showLabel = isHover || isConnectedToHover || isMatch ||
        (n.type === 'root' && n.childCount >= 3 && graphState.zoom >= 0.45) ||
        (n.type === 'root' && graphState.zoom >= 0.75) ||
        (n.type === 'word' && graphState.zoom >= 0.9);

      if (showLabel) {
        ctx.font = `${n.type === 'root' ? '600 10.5px' : '9.5px'} -apple-system, sans-serif`;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.fillText(n.label, n.x, n.y + n.radius + 10);
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
      for (let i = graphState.nodes.length - 1; i >= 0; i--) {
        const n = graphState.nodes[i];
        const dx = n.x - x;
        const dy = n.y - y;
        if (dx * dx + dy * dy <= (n.radius + 7) * (n.radius + 7)) return n;
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
        wakeGraphSimulation(); // ドラッグ時はシミュレーション再開
      } else {
        graphState.isDragging = true;
        graphState.dragStartX = rawX - graphState.panX;
        graphState.dragStartY = rawY - graphState.panY;
      }
    }

    function handleMove(clientX, clientY) {
      if (Math.hypot(clientX - startClientX, clientY - startClientY) > 5) {
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
        if (hit) {
          tt.style.display = 'block';
          tt.style.left = `${rawX}px`;
          tt.style.top = `${rawY}px`;
          if (hit.type === 'root') {
            const wordsPreview = (hit.connectedWords || []).slice(0, 5).map(w => w.label).join(', ');
            const more = (hit.childCount > 5) ? ` 他${hit.childCount - 5}語` : '';
            tt.innerHTML = `<strong>語根: ${escFn(hit.label)}</strong><div>派生単語: ${hit.childCount}語 (${escFn(wordsPreview)}${more})</div><div style="font-size:10px;color:var(--m);margin-top:3px">クリックでこの語根を検索</div>`;
          } else {
            tt.innerHTML = `<strong>${escFn(hit.label)} <span style="font-size:10px;color:var(--m)">[${escFn(hit.lang.toUpperCase())}]</span></strong><div>[${escFn(hit.pos)}] ${escFn(hit.meaning)}</div><div style="font-size:10px;color:var(--m);margin-top:3px">クリックで単語カードへジャンプ</div>`;
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

    wrap.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        handleStart(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    wrap.addEventListener('touchmove', e => {
      if (e.touches.length === 1) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    wrap.addEventListener('touchend', handleEnd, { passive: true });

    wrap.addEventListener('wheel', e => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      const newZoom = Math.min(3.5, Math.max(0.12, graphState.zoom * zoomFactor));

      const rect = wrap.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      graphState.panX = mouseX - (mouseX - graphState.panX) * (newZoom / graphState.zoom);
      graphState.panY = mouseY - (mouseY - graphState.panY) * (newZoom / graphState.zoom);
      graphState.zoom = newZoom;
      drawGraph();
    }, { passive: false });

    wrap.addEventListener('click', e => {
      if (graphState.dragMoved) return;

      const { x, y } = getCanvasCoords(e.clientX, e.clientY);
      const hit = findNodeAt(x, y);
      if (hit) {
        const toggleModalFn = global.toggleModal || global.VocabCore?.toggleModal;
        if (hit.type === 'word') {
          if (typeof toggleModalFn === 'function') toggleModalFn('graphModal', false);
          const jumpFn = global.jumpToWord || global.VocabCore?.jumpToWord;
          if (typeof jumpFn === 'function') jumpFn(hit.label, hit.lang);
        } else if (hit.type === 'root') {
          if (typeof toggleModalFn === 'function') toggleModalFn('graphModal', false);
          const searchFn = global.setSearch || global.VocabCore?.setSearch;
          if (typeof searchFn === 'function') searchFn(hit.label.replace(/^\*/, ''), true);
        }
      }
    });

    wrap.addEventListener('dblclick', () => {
      fitGraphToView();
    });

    const filterInput = document.getElementById('graphFilterInput');
    filterInput?.addEventListener('input', e => {
      const q = e.target.value.trim().replace(/^\*/, '');
      graphState.filterQuery = q;
      drawGraph();
    });

    window.addEventListener('resize', () => {
      const modal = document.getElementById('graphModal');
      if (!modal || !modal.classList.contains('open')) return;
      const canvas = document.getElementById('graphCanvas');
      if (!canvas || !wrap) return;
      graphState.width = wrap.clientWidth || 800;
      graphState.height = wrap.clientHeight || 600;
      canvas.width = graphState.width * (window.devicePixelRatio || 1);
      canvas.height = graphState.height * (window.devicePixelRatio || 1);
      drawGraph();
    });
  }

  // グローバル公開オブジェクト
  global.VocabGraph = {
    LANG_GRAPH_COLORS,
    graphState,
    buildGraphData,
    openGraphModal,
    resetGraphZoom,
    fitGraphToView,
    toggleGraphClusterOnly,
    updateGraphDataAndFit,
    drawGraph,
    startGraphSimulation,
    wakeGraphSimulation,
    initGraphEvents
  };

  // 既存ハンドラ互換のためにグローバルへ展開
  Object.assign(global, global.VocabGraph);
})(typeof window !== 'undefined' ? window : globalThis);
