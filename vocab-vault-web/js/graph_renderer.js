/**
 * Vocab Vault — Graph Renderer Engine (js/graph_renderer.js)
 * High-performance Canvas 2D Celestial & 4-Tier Lineage Tree Visualization
 */
(function (global) {
  'use strict';
  const LANG_GRAPH_COLORS = {
    root: '#7c3aed',
    en: '#38bdf8',
    fr: '#a78bfa',
    de: '#fbbf24',
    es: '#fb923c',
    it: '#2dd4bf',
    pt: '#84cc16',
    nl: '#f472b6',
    zh: '#f43f5e',
    ko: '#60a5fa',
    ja: '#34d399'
  };

  const RETENTION_COLORS = {
    root: '#7c3aed',
    due: '#fb7185',
    new: '#60a5fa',
    learning: '#f59e0b',
    mastered: '#10b981'
  };

  const cleanRootKey = k => (global.VocabGraphLayout?.cleanRootKey || global.VocabGraph?.cleanRootKey ? (global.VocabGraphLayout?.cleanRootKey || global.VocabGraph?.cleanRootKey)(k) : String(k || '').replace(/^\*/, '').replace(/-$/, ''));
  const getRootMeaning = (rk, cw) => (global.VocabGraphLayout?.getRootMeaning || global.VocabGraph?.getRootMeaning)?.(rk, cw) || '';

  /**
   * 16進数またはRGBカラーを透過RGBA文字列へ安全に変換
   */
  function colorToRgba(c, alpha) {
    if (!c) return `rgba(255, 255, 255, ${alpha})`;
    if (c.startsWith('rgba')) {
      return c.replace(/[\d\.]+\)$/g, `${alpha})`);
    }
    if (c.startsWith('rgb(')) {
      const parts = c.replace(/rgb\((.*)\)/, '$1').split(',').map(s => s.trim());
      if (parts.length >= 3) {
        return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
      }
    }
    if (c.startsWith('#')) {
      let hex = c.slice(1);
      if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
      const num = parseInt(hex, 16);
      if (!Number.isNaN(num)) {
        const r = (num >> 16) & 255;
        const g = (num >> 8) & 255;
        const b = num & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    }
    return c;
  }
  // --- 系統樹背景およびノードラベルのオフスクリーンCanvas超高速キャッシュ (GPUテクスチャブリット) ---
  let treeBgCacheCanvas = null;
  let treeBgCacheDark = null;
  let treeBgCacheKey = '';
  const labelSpriteCache = new Map(); // key -> { canvas, width, height, dpr }
  let branchCacheCanvas = null;
  let branchCacheKey = '';

  function invalidateTreeBgCache() {
    treeBgCacheCanvas = null;
    treeBgCacheDark = null;
    treeBgCacheKey = '';
    labelSpriteCache.clear();
    branchCacheCanvas = null;
    branchCacheKey = '';
  }

  function getCachedLabelSprite(text, fontSize, color, strokeColor, isDark) {
    const key = `${text}_${fontSize}_${color}_${strokeColor || ''}_${isDark ? 1 : 0}`;
    let sprite = labelSpriteCache.get(key);
    if (!sprite) {
      if (labelSpriteCache.size > 800) labelSpriteCache.clear();
      const offCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
      if (!offCanvas) return null;
      const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
      const sCtx = offCanvas.getContext('2d');
      if (!sCtx) return null;

      const fontStr = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      sCtx.font = fontStr;
      const metrics = sCtx.measureText(text);
      const padX = 8, padY = 4;
      const w = Math.ceil(metrics.width + padX * 2);
      const h = Math.ceil(fontSize * 1.5 + padY * 2);
      offCanvas.width = Math.ceil(w * dpr);
      offCanvas.height = Math.ceil(h * dpr);

      sCtx.scale(dpr, dpr);
      sCtx.font = fontStr;
      sCtx.textBaseline = 'middle';
      sCtx.textAlign = 'center';

      if (strokeColor) {
        sCtx.strokeStyle = strokeColor;
        sCtx.lineWidth = 3.2;
        sCtx.strokeText(text, w / 2, h / 2);
      }
      sCtx.fillStyle = color;
      sCtx.fillText(text, w / 2, h / 2);

      sprite = { canvas: offCanvas, width: w, height: h, dpr };
      labelSpriteCache.set(key, sprite);
    }
    return sprite;
  }

  function getTreeBackgroundCache(isDark, sectorDefs = null, isCjk = false) {
    const sEntries = sectorDefs ? Object.values(sectorDefs) : [];
    const sSig = sEntries.map(s => `${s.key}:${Number(s.start || 0).toFixed(2)}_${Number(s.end || 0).toFixed(2)}`).join('|');
    const cacheKey = `${isDark ? 1 : 0}_${isCjk ? 'cjk' : 'pie'}_${sSig}`;
    if (treeBgCacheCanvas && treeBgCacheKey === cacheKey && treeBgCacheDark === isDark) {
      return treeBgCacheCanvas;
    }
    // 直径3100pxの扇形・同心円エリアを 1550x1550 (0.5倍スケール) のオフスクリーンCanvasに1回だけ事前ベイク
    const size = 1550;
    const scale = 0.5;
    const offCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    if (!offCanvas) return null;
    offCanvas.width = size;
    offCanvas.height = size;
    const bCtx = offCanvas.getContext('2d');
    if (!bCtx) return null;

    bCtx.save();
    bCtx.scale(scale, scale);
    const cx = 1550;
    const cy = 1550;

    // A. 語根コア後方の重厚で落ち着いたダークグラデーション
    const bgGrad = bCtx.createRadialGradient(cx, cy, 30, cx, cy, 1550);
    bgGrad.addColorStop(0, isDark ? 'rgba(15, 23, 42, 0.40)' : 'rgba(241, 245, 249, 0.40)');
    bgGrad.addColorStop(0.35, isDark ? 'rgba(11, 17, 32, 0.25)' : 'rgba(248, 250, 252, 0.25)');
    bgGrad.addColorStop(0.80, isDark ? 'rgba(3, 7, 18, 0.12)' : 'rgba(255, 255, 255, 0.12)');
    bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    bCtx.fillStyle = bgGrad;
    bCtx.beginPath();
    bCtx.arc(cx, cy, 1550, 0, Math.PI * 2);
    bCtx.fill();

    function drawSectorBand(innerR, outerR, startAngle, endAngle, fillColor, strokeColor) {
      bCtx.beginPath();
      bCtx.arc(cx, cy, outerR, startAngle, endAngle, false);
      bCtx.arc(cx, cy, innerR, endAngle, startAngle, true);
      bCtx.closePath();
      if (fillColor) {
        bCtx.fillStyle = fillColor;
        bCtx.fill();
      }
      if (strokeColor) {
        bCtx.strokeStyle = strokeColor;
        bCtx.lineWidth = 1.0;
        bCtx.stroke();
      }
    }

    if (sEntries.length > 0) {
      // 動的セクター扇状エリア・境界線・ラベルの描画
      sEntries.forEach(sDef => {
        const startA = Number(sDef.start || 0);
        const endA = Number(sDef.end || 0);
        const fillColor = isDark ? (sDef.colorDark || 'rgba(56, 189, 248, 0.05)') : (sDef.colorLight || 'rgba(2, 132, 199, 0.04)');
        const strokeColor = isDark ? (sDef.colorDarkBorder || 'rgba(56, 189, 248, 0.15)') : (sDef.colorLightBorder || 'rgba(2, 132, 199, 0.12)');

        // 第2階層 サンバースト扇状エリア
        drawSectorBand(100, 440, startA + 0.02, endA - 0.02, fillColor, strokeColor);

        // 第3階層 サンバースト扇状エリア
        drawSectorBand(455, 960, startA + 0.02, endA - 0.02, fillColor, strokeColor);

        // 放射状セクター境界線
        bCtx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
        bCtx.lineWidth = 1.0;
        bCtx.setLineDash([4, 4]);
        bCtx.beginPath();
        bCtx.moveTo(cx + 60 * Math.cos(startA), cy + 60 * Math.sin(startA));
        bCtx.lineTo(cx + 1450 * Math.cos(startA), cy + 1450 * Math.sin(startA));
        bCtx.stroke();
        bCtx.setLineDash([]);
      });
    } else {
      // フォールバック: 標準3セクター
      drawSectorBand(100, 440, -3 * Math.PI / 4, -Math.PI / 4,
        isDark ? 'rgba(132, 204, 22, 0.05)' : 'rgba(101, 163, 13, 0.04)',
        isDark ? 'rgba(163, 230, 53, 0.12)' : 'rgba(101, 163, 13, 0.10)'
      );
      drawSectorBand(100, 440, -Math.PI / 4, 3 * Math.PI / 5,
        isDark ? 'rgba(56, 189, 248, 0.05)' : 'rgba(2, 132, 199, 0.04)',
        isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(2, 132, 199, 0.10)'
      );
      drawSectorBand(100, 440, 3 * Math.PI / 5, 5 * Math.PI / 4,
        isDark ? 'rgba(192, 132, 252, 0.04)' : 'rgba(147, 51, 234, 0.03)',
        isDark ? 'rgba(192, 132, 252, 0.10)' : 'rgba(147, 51, 234, 0.08)'
      );

      drawSectorBand(455, 960, -3 * Math.PI / 4 + 0.03, -Math.PI / 4 - 0.03,
        isDark ? 'rgba(34, 197, 94, 0.05)' : 'rgba(22, 163, 74, 0.04)',
        isDark ? 'rgba(74, 222, 128, 0.14)' : 'rgba(22, 163, 74, 0.10)'
      );
      drawSectorBand(455, 960, -Math.PI / 4 + 0.03, 3 * Math.PI / 5 - 0.03,
        isDark ? 'rgba(99, 102, 241, 0.05)' : 'rgba(79, 70, 229, 0.04)',
        isDark ? 'rgba(129, 140, 248, 0.14)' : 'rgba(79, 70, 229, 0.10)'
      );
      drawSectorBand(455, 960, 3 * Math.PI / 5 + 0.03, 5 * Math.PI / 4 - 0.03,
        isDark ? 'rgba(168, 85, 247, 0.04)' : 'rgba(126, 34, 206, 0.03)',
        isDark ? 'rgba(192, 132, 252, 0.10)' : 'rgba(126, 34, 206, 0.08)'
      );

      const sectorDividers = [-3 * Math.PI / 4, -Math.PI / 4, 3 * Math.PI / 5];
      bCtx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';
      bCtx.lineWidth = 1.0;
      bCtx.setLineDash([4, 4]);
      bCtx.beginPath();
      sectorDividers.forEach(angle => {
        bCtx.moveTo(cx + 60 * Math.cos(angle), cy + 60 * Math.sin(angle));
        bCtx.lineTo(cx + 1450 * Math.cos(angle), cy + 1450 * Math.sin(angle));
      });
      bCtx.stroke();
      bCtx.setLineDash([]);
    }

    // D. 同心円ガイドライン
    const guideOrbits = [480, 560, 640, 720, 800, 880, 960, 1140, 1320];
    bCtx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)';
    bCtx.lineWidth = 1.0;
    bCtx.setLineDash([3, 5]);
    bCtx.beginPath();
    guideOrbits.forEach(r => {
      bCtx.moveTo(cx + r, cy);
      bCtx.arc(cx, cy, r, 0, Math.PI * 2);
    });
    bCtx.stroke();
    bCtx.setLineDash([]);

    bCtx.restore();

    treeBgCacheCanvas = offCanvas;
    treeBgCacheDark = isDark;
    treeBgCacheKey = cacheKey;
    return offCanvas;
  }

  /**
   * ビューポート・カリング & Semantic Zoom (LOD) 対応のCanvas描画
   */
  function drawGraph(state) {
    const graphState = state || global.VocabGraph?.graphState || {};
    const ctx = graphState.ctx;
    const canvas = graphState.canvas;
    if (!ctx || !canvas) return;

    // WebGL ハイブリッドレンダリング判定（800ノード以上または強制指定時にGPUハードウェア加速）
    const useWebGL = Boolean(
      global.VocabWebGLGraph &&
      global.VocabWebGLGraph.isSupported() &&
      (graphState.nodes.length >= 800 || graphState.forceWebGL)
    );

    if (useWebGL) {
      try {
        global.VocabWebGLGraph.render(graphState);
      } catch (e) {
        console.warn('[WebGL Fallback] Canvas 2D fallback engaged:', e);
      }
    } else if (global.VocabWebGLGraph) {
      global.VocabWebGLGraph.hide();
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
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
    const isMask = graphState.treeMaskMode;
    const era = graphState.timelineEra;
    const now = Date.now();
    const zoom = graphState.zoom;
    const isTree = (graphState.layoutMode === 'tree');

    // 0. SF/ダークファンタジー調 放射状スキルツリー ガイドライン & セクター（オフスクリーン超高速テクスチャ描画）
    if (isTree) {
      const treeRoots = graphState.nodes.filter(n => n.type === 'root');
      const rootCenters = treeRoots.length > 0
        ? treeRoots.map(r => ({ x: r.targetX !== undefined ? r.x : 0, y: r.targetY !== undefined ? r.y : 0 }))
        : [{ x: 0, y: 0 }];

      const sDefs = graphState.dynamicSectorDefs || treeRoots[0]?.dynamicSectorDefs;
      const isCjk = Boolean(graphState.isCjkTree || treeRoots[0]?.isCjkTree);
      const bgCache = getTreeBackgroundCache(isDark, sDefs, isCjk);
      if (bgCache) {
        rootCenters.forEach(center => {
          const cx = center.x;
          const cy = center.y;
          if (cx + 1600 < viewLeft || cx - 1600 > viewRight || cy + 1600 < viewTop || cy - 1600 > viewBottom) {
            return;
          }
          ctx.drawImage(bgCache, cx - 1550, cy - 1550, 3100, 3100);

          // セクター見出しバッジを100%ネイティブ解像度・ノード非干渉のオープンリング回廊 (r = 138) に鮮明描画
          const sectorList = sDefs ? Object.values(sDefs) : [];
          if (sectorList.length > 0 && zoom >= 0.20) {
            const secBadgeR = 138;
            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const secFontSize = Math.round(Math.max(10, 11.5 / Math.sqrt(Math.max(0.65, zoom))));
            ctx.font = `bold ${secFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

            sectorList.forEach(s => {
              const theta = Number(s.center || ((Number(s.start || 0) + Number(s.end || 0)) / 2));
              const badgeX = cx + secBadgeR * Math.cos(theta);
              const badgeY = cy + secBadgeR * Math.sin(theta);
              const label = s.label || '';
              if (!label) return;

              const metrics = ctx.measureText(label);
              const padX = 8, padY = 3.5;
              const bW = metrics.width + padX * 2;
              const bH = secFontSize + padY * 2;

              ctx.fillStyle = isDark ? 'rgba(11, 15, 25, 0.90)' : 'rgba(255, 255, 255, 0.94)';
              ctx.beginPath();
              if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(badgeX - bW / 2, badgeY - bH / 2, bW, bH, 5);
              } else {
                ctx.rect(badgeX - bW / 2, badgeY - bH / 2, bW, bH);
              }
              ctx.fill();

              ctx.strokeStyle = isDark ? (s.colorDarkBorder || 'rgba(56, 189, 248, 0.40)') : (s.colorLightBorder || 'rgba(2, 132, 199, 0.35)');
              ctx.lineWidth = 1.0;
              ctx.stroke();

              ctx.fillStyle = isDark ? (s.textColorDark || '#7dd3fc') : (s.textColorLight || '#0369a1');
              ctx.fillText(label, badgeX, badgeY);
            });
            ctx.restore();
          }
        });
      }
    }

    // 1. エッジ描画（発光エネルギー導管）
    // ルートノードの O(1) 高速引き当てマップ（毎フレームの O(E*N) 線形探索を解消）
    const rootMap = new Map();
    for (let i = 0; i < graphState.nodes.length; i++) {
      const nd = graphState.nodes[i];
      if (nd.type === 'root') rootMap.set(nd.label, nd);
    }

    ctx.setLineDash([]);
    let currentDashed = false;
    let currentShadow = false;

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

      // タイムライン時代フィルター判定
      let isDimmedByEra = false;
      if (era === 0 && e.kind !== 'root_to_branch') isDimmedByEra = true;
      if (era === 1 && (e.kind === 'leaf_to_twig' || e.target?.lang === 'ja')) isDimmedByEra = true;

      const isConnectedToFocus = focusNode && (e.source === focusNode || e.target === focusNode);
      const isTwigEdge = (e.kind === 'leaf_to_twig');

      // WebGL 稼働時: 背景エッジはGPUが一括描画するため、フォーカス中の強調エッジ以外はスキップしてCPU負荷をゼロ化
      if (useWebGL && !isConnectedToFocus) {
        continue;
      }

      // 系統樹モード時、派生小枝 (Twig) は親単語がホバー/選択されている時のみ表示して過密を根絶
      if (isTree && isTwigEdge) {
        const pWord = e.source?.label;
        const isParentFocused = focusNode && (focusNode.label === pWord || focusNode === e.source || focusNode === e.target);
        if (!isParentFocused) continue;
      }

      // 大規模語彙（3,000単語規模）最適化:
      // 超俯瞰時 (zoom < 0.22) のみ末端の小枝・つぼみエッジを省略
      if (isTree && zoom < 0.22 && !focusNode && !isFiltered && (e.kind === 'leaf_to_twig' || e.kind === 'bud_edge')) {
        continue;
      }

      ctx.globalAlpha = isDimmedByEra ? 0.10 : 1.0;

      const isBudEdge = (e.kind === 'bud_edge');
      const wordNode = (e.target?.type === 'word' ? e.target : (e.source?.type === 'word' ? e.source : null));
      const stability = wordNode ? (Number(wordNode.item?.stability) || Number(wordNode.item?.interval) || 1) : 1;

      if (isBudEdge) {
        if (!currentDashed) { ctx.setLineDash([4, 3]); currentDashed = true; }
        ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.40)' : 'rgba(100, 116, 139, 0.35)';
        ctx.lineWidth = 1.0;
        if (currentShadow) { ctx.shadowBlur = 0; currentShadow = false; }
      } else {
        if (currentDashed) { ctx.setLineDash([]); currentDashed = false; }
        if (focusNode) {
          ctx.strokeStyle = isConnectedToFocus ? highlightEdgeColor : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)');
          ctx.lineWidth = isConnectedToFocus ? 2.4 : 0.5;
          if (isConnectedToFocus && isTree) {
            ctx.shadowColor = highlightEdgeColor;
            ctx.shadowBlur = 6;
            currentShadow = true;
          } else if (currentShadow) {
            ctx.shadowBlur = 0;
            currentShadow = false;
          }
        } else if (isTwigEdge) {
          ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.25)' : 'rgba(100, 116, 139, 0.20)';
          ctx.lineWidth = 0.8;
          if (currentShadow) { ctx.shadowBlur = 0; currentShadow = false; }
        } else if (isTree && e.kind === 'root_to_branch') {
          // 語根から古典枝への主幹エネルギー導管
          ctx.strokeStyle = isDark ? 'rgba(192, 132, 252, 0.70)' : 'rgba(124, 58, 237, 0.60)';
          ctx.lineWidth = 2.0;
          if (currentShadow) { ctx.shadowBlur = 0; currentShadow = false; }
        } else if (isTree && e.kind === 'branch_to_leaf') {
          // 古典枝から現代見出し語への導管（常に明瞭に描画）
          ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.45)' : 'rgba(37, 99, 235, 0.40)';
          ctx.lineWidth = zoom < 0.45 ? 0.9 : 1.3;
          if (currentShadow) { ctx.shadowBlur = 0; currentShadow = false; }
        } else {
          // FSRS Stability S 連動の枝の太さと光彩
          const branchThickness = Math.min(3.5, Math.max(0.8, 0.8 + Math.log2(Math.max(1, stability)) * 0.55));
          if (stability >= 21 && wordNode) {
            ctx.strokeStyle = isDark ? 'rgba(245, 158, 11, 0.75)' : 'rgba(217, 119, 6, 0.70)';
            ctx.lineWidth = branchThickness;
          } else if (stability >= 7 && wordNode) {
            ctx.strokeStyle = isDark ? 'rgba(16, 185, 129, 0.65)' : 'rgba(5, 150, 105, 0.60)';
            ctx.lineWidth = branchThickness;
          } else {
            ctx.strokeStyle = baseEdgeColor;
            ctx.lineWidth = branchThickness;
          }
          if (currentShadow) { ctx.shadowBlur = 0; currentShadow = false; }
        }
      }

      ctx.beginPath();
      ctx.moveTo(e.source.x, e.source.y);
      if (isTree && !isTwigEdge) {
        // 放射状スキルツリー用 極座標ベジェ曲線（制御点キャッシングで三角関数計算を毎フレーム0回化）
        let cpX = e._cpX;
        let cpY = e._cpY;
        if (cpX === undefined ||
            e._lastSrcX !== e.source.x || e._lastSrcY !== e.source.y ||
            e._lastTgtX !== e.target.x || e._lastTgtY !== e.target.y) {
          let rNode = null;
          if (e.source.type === 'root') {
            rNode = e.source;
          } else if (e.source.rootLabel) {
            rNode = rootMap.get(e.source.rootLabel) || rootMap.get(cleanRootKey(e.source.rootLabel));
          }
          if (!rNode && rootMap.size === 1) {
            rNode = rootMap.values().next().value;
          }
          const rx = rNode ? (rNode.x !== undefined ? rNode.x : (rNode.targetX || 0)) : 0;
          const ry = rNode ? (rNode.y !== undefined ? rNode.y : (rNode.targetY || 0)) : 0;
          const r1 = Math.hypot(e.source.x - rx, e.source.y - ry);
          const r2 = Math.hypot(e.target.x - rx, e.target.y - ry);
          const midR = (r1 + r2) / 2;
          const angleS = Math.atan2(e.source.y - ry, e.source.x - rx);
          const angleT = Math.atan2(e.target.y - ry, e.target.x - rx);
          let dAngle = angleT - angleS;
          while (dAngle > Math.PI) dAngle -= Math.PI * 2;
          while (dAngle < -Math.PI) dAngle += Math.PI * 2;
          const cpAngle = angleS + dAngle * 0.5;
          cpX = rx + midR * Math.cos(cpAngle);
          cpY = ry + midR * Math.sin(cpAngle);
          e._cpX = cpX;
          e._cpY = cpY;
          e._lastSrcX = e.source.x;
          e._lastSrcY = e.source.y;
          e._lastTgtX = e.target.x;
          e._lastTgtY = e.target.y;
        }
        ctx.bezierCurveTo(
          (e.source.x * 2 + cpX) / 3, (e.source.y * 2 + cpY) / 3,
          (cpX + e.target.x * 2) / 3, (cpY + e.target.y * 2) / 3,
          e.target.x, e.target.y
        );
      } else {
        ctx.lineTo(e.target.x, e.target.y);
      }
      ctx.stroke();
    }
    if (currentDashed) ctx.setLineDash([]);
    if (currentShadow) ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;

    // 項目19: 複数語根複合語のクロスリンク破線アーク (選択中単語が持つ第2語根への美しい架け橋)
    if (sNode && sNode.type === 'word' && Array.isArray(sNode.item?.etymologyTags) && sNode.item.etymologyTags.length > 1) {
      const tags = sNode.item.etymologyTags.map(cleanRootKey);
      const otherRoots = graphState.nodes.filter(rn => rn.type === 'root' && tags.includes(cleanRootKey(rn.label)) && rn.label !== sNode.rootLabel);
      otherRoots.forEach(secRoot => {
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = isDark ? '#fbbf24' : '#d97706';
        ctx.lineWidth = 1.6;
        ctx.moveTo(sNode.x, sNode.y);
        const midX = (sNode.x + secRoot.x) / 2;
        const midY = Math.min(sNode.y, secRoot.y) - 40;
        ctx.quadraticCurveTo(midX, midY, secRoot.x, secRoot.y);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    }

    // 2. ノード描画 (Semantic Zoom LOD 対応 & 境界半径バッファ付きカリング)
    const totalWordsCount = graphState.nodes.filter(nd => nd.type === 'word').length;
    // 星団のみモード時や単語数が適度な場合はズーム38%から単語ラベルを美しく表示して実用性を最大化（系統樹モード時は22%から常時明瞭表示）
    const textThresholdZoom = isTree ? 0.22 : ((graphState.clusterOnly || totalWordsCount < 150) ? 0.38 : (totalWordsCount > 400 ? 0.72 : 0.52));
    const renderedLabelBoxes = [];

    for (let i = 0; i < graphState.nodes.length; i++) {
      const n = graphState.nodes[i];
      ctx.globalAlpha = 1.0;
      if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) continue;
      const rBuf = (n.radius || 10) + 20;
      if (n.x + rBuf < viewLeft || n.x - rBuf > viewRight || n.y + rBuf < viewTop || n.y - rBuf > viewBottom) {
        continue;
      }

      const isSelected = n === sNode;
      const isHover = n === hNode;
      const isConnectedToFocus = focusNode && (
        (focusNode.type === 'root' && focusNode.connectedWords?.includes(n)) ||
        (focusNode.type === 'branch' && focusNode.connectedWords?.includes(n)) ||
        (focusNode.type === 'word' && (focusNode.connectedRoots?.includes(n) || n.parentWord === focusNode.label))
      );
      // 単語名だけでなく、語根・日本語意味・コアイメージでのインクリメンタル検索に対応
      const isMatch = isFiltered && (
        n.label.toLowerCase().includes(filterQ) ||
        (n.type === 'root' && ((n.rootMeaning || '').toLowerCase().includes(filterQ) || (n.eikenMeaning || '').toLowerCase().includes(filterQ))) ||
        (n.type === 'word' && (
          (n.meaning || '').toLowerCase().includes(filterQ) ||
          (n.item?.core || '').toLowerCase().includes(filterQ) ||
          (n.connectedRoots || []).some(r => (r.label || '').toLowerCase().includes(filterQ) || (r.rootMeaning || '').toLowerCase().includes(filterQ))
        ))
      );

      // タイムライン時代フィルター
      let isDimmedByEra = false;
      if (era === 0 && n.type !== 'root') isDimmedByEra = true;
      if (era === 1 && (n.type === 'twig' || n.lang === 'ja')) isDimmedByEra = true;

      let nodeAlpha = 1.0;
      if (isDimmedByEra) {
        nodeAlpha = 0.28;
      } else if (focusNode && !isSelected && !isHover && !isConnectedToFocus) {
        nodeAlpha = 0.38;
      } else if (isFiltered && !isMatch) {
        nodeAlpha = 0.25;
      }
      ctx.globalAlpha = nodeAlpha;

      // カラー算出
      let nodeColor = LANG_GRAPH_COLORS.root;
      if (n.type === 'root') {
        nodeColor = isDark ? '#ea580c' : '#c2410c'; // ボス語根は赤熱するコア (Glowing Ember Core)
      } else if (n.type === 'word') {
        const rVal = global.VocabSRS?.getRetrievability ? global.VocabSRS.getRetrievability(n.item, now) : ((n.item?.nextReview || 0) <= now ? 0.65 : 0.95);
        if (isRetention) {
          // 定着度カラーモード時
          if (rVal >= 0.88) {
            nodeColor = '#10b981'; // 習得済・定着: 輝くエメラルド
          } else if (rVal >= 0.70) {
            nodeColor = '#f59e0b'; // 安定期: 黄金アンバー
          } else if (!n.item?.nextReview || (n.item?.reps || 0) === 0) {
            nodeColor = '#60a5fa'; // 新規・探索中: 澄んだスカイブルー
          } else {
            nodeColor = '#fb7185'; // 要復習: 上品なネオンローズコーラル（生々しい血赤を排除）
          }
        } else {
          // 通常表示: 10言語系統・ジュエルトーン
          nodeColor = LANG_GRAPH_COLORS[n.lang] || '#38bdf8';
        }
      } else if (n.type === 'branch') {
        nodeColor = isDark ? '#fbbf24' : '#d97706'; // 古典分岐: 真鍮・黄金
      } else if (n.type === 'ghost_bud') {
        nodeColor = isDark ? '#64748b' : '#94a3b8'; // 未解放: スレート
      } else if (n.type === 'twig') {
        nodeColor = isDark ? '#475569' : '#94a3b8'; // 派生小枝
      }

      const minScreenR = n.type === 'root' ? 11.0 : (n.type === 'branch' ? 8.0 : (n.type === 'word' ? 5.5 : 3.5));
      const baseR = Math.max(n.radius || 6, minScreenR / Math.max(0.35, zoom));
      const drawRadius = baseR * (isSelected ? 1.45 : (isHover ? 1.30 : 1.0));

      // --- Semantic Zoom (LOD): 3段階の表示表現 ---
      // Level of Detail:
      // Zoom < 0.70: 俯瞰モード (粗) — ノード円と語根のみ、枝の色で定着度を鳥瞰
      // 0.70 <= Zoom <= 1.30: 通常モード (中) — カプセルピル型で見出し語＋代表訳をくっきり表示
      // Zoom > 1.30: 顕微鏡モード (密) — ミニカード型で発音記号・コアイメージ・音声アイコンまで見える

      if (n.type === 'root') {
        // Level 1: 印欧祖語コア (Nexus Core / 赤熱するボス語根コア)
        const glowRadius = drawRadius * (isSelected ? 2.2 : (isHover ? 1.9 : 1.6));
        ctx.beginPath();
        ctx.arc(n.x, n.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = isTree
          ? (isDark ? 'rgba(234, 88, 12, 0.14)' : 'rgba(234, 88, 12, 0.08)')
          : (isDark ? 'rgba(167,139,250,0.20)' : 'rgba(124,58,237,0.12)');
        ctx.fill();

        // コア外周リング
        ctx.beginPath();
        ctx.arc(n.x, n.y, drawRadius + 3.0, 0, Math.PI * 2);
        ctx.strokeStyle = isTree
          ? (isDark ? '#fb923c' : '#ea580c')
          : (isDark ? '#a78bfa' : '#7c3aed');
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // コア本体
        ctx.beginPath();
        ctx.arc(n.x, n.y, drawRadius, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.fill();

        // 中心自己発光インナーコア
        ctx.beginPath();
        ctx.arc(n.x, n.y, drawRadius * 0.42, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fill();

        // 項目18: 語根習得プログレス円弧ゲージ（未登録・未定着・定着済みの可視化）
        if (n.connectedWords && n.connectedWords.length > 0) {
          const totalW = n.connectedWords.length;
          const masteredW = n.connectedWords.filter(w => (w.item?.stability || w.stability || 0) >= 21 || (w.item?.interval || w.interval || 0) >= 21).length;
          if (masteredW > 0) {
            const pct = Math.min(1.0, Math.max(0.08, masteredW / totalW));
            ctx.beginPath();
            ctx.arc(n.x, n.y, drawRadius + 4.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 2.0;
            ctx.stroke();
          }
        }

        if (isSelected) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, drawRadius * 1.55, 0, Math.PI * 2);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2.0;
          ctx.stroke();
        } else if (isHover || isConnectedToFocus) {
          ctx.strokeStyle = isDark ? '#ffffff' : '#0f172a';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // 大概念領域 (Level 0: Semantic Realm)
        if (n.realm && (zoom >= 0.55 || isSelected || isHover)) {
          const rFont = Math.round(Math.max(8.0, 9.5 / Math.sqrt(zoom)));
          const rY = n.y - drawRadius - 8;
          ctx.font = `700 ${rFont}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.textAlign = 'center';
          const rText = `[領域: ${n.realm.label.split(' ')[0]}]`;
          ctx.strokeStyle = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)';
          ctx.lineWidth = 2.5;
          ctx.strokeText(rText, n.x, rY);
          ctx.fillStyle = n.realm.color || '#38bdf8';
          ctx.fillText(rText, n.x, rY);
        }

        // 語根ラベル（印欧祖語 / PIE）
        const rootFontSize = Math.round(Math.max(11, 13 / Math.sqrt(zoom)));
        ctx.font = `700 ${rootFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)';
        ctx.lineWidth = 3.0;
        ctx.textAlign = 'center';
        const displayRootTitle = isTree ? (n.id === 'root:pie:unified' ? '印欧祖語 / PIE (Proto-Indo-European)' : `印欧祖語: ${n.label}`) : n.label;
        ctx.strokeText(displayRootTitle, n.x, n.y + drawRadius + rootFontSize + 2);
        ctx.fillStyle = isTree ? (isDark ? '#fb923c' : '#ea580c') : (isDark ? '#c084fc' : '#7c3aed');
        ctx.fillText(displayRootTitle, n.x, n.y + drawRadius + rootFontSize + 2);

        // 語根の簡潔な原義キーワード（天体図ネットワークでの意味把握を可能にする）
        let shortRootMeaning = n.rootMeaning;
        if (!shortRootMeaning) {
          shortRootMeaning = n.eikenMeaning || getRootMeaning(n.label, n.connectedWords);
          n.rootMeaning = shortRootMeaning;
        }
        if (shortRootMeaning && n.id !== 'root:pie:unified') {
          shortRootMeaning = shortRootMeaning.split(/[,、/／]/)[0].trim().slice(0, 10);
        }
        if (shortRootMeaning && (zoom >= 0.32 || isSelected || isHover)) {
          const mFontSize = Math.round(Math.max(8.5, 10.0 / Math.sqrt(Math.max(0.35, zoom))));
          const mY = n.y + drawRadius + rootFontSize + mFontSize + 3;
          const displayLabel = isTree ? `(PIE: ${shortRootMeaning})` : `(${shortRootMeaning})`;
          ctx.font = `600 ${mFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.strokeStyle = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)';
          ctx.lineWidth = 2.8;
          ctx.strokeText(displayLabel, n.x, mY);
          ctx.fillStyle = isDark ? '#93c5fd' : '#1d4ed8';
          ctx.fillText(displayLabel, n.x, mY);
        }

        // 語彙スキルツリー習得率リング & バッジ描画
        if (n.isEikenRoot && n.eikenStats) {
          const eStats = n.eikenStats;
          const pct = (eStats.learnedCount || 0) / Math.max(1, eStats.total || 1);

          ctx.save();
          ctx.beginPath();
          ctx.arc(n.x, n.y, drawRadius + 4.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
          ctx.strokeStyle = pct >= 1 ? '#10b981' : (pct > 0 ? '#38bdf8' : (isDark ? 'rgba(148, 163, 184, 0.35)' : 'rgba(100, 116, 139, 0.25)'));
          ctx.lineWidth = 3.2;
          ctx.stroke();

          // スキル進捗ピルバッジ (例: 語彙覚醒 4/15)
          if (zoom >= 0.85 || isSelected || isHover) {
            const progFontSize = Math.round(Math.max(8.5, 9.5 / Math.sqrt(zoom)));
            const progText = `語彙覚醒 ${eStats.learnedCount}/${eStats.total}`;
            ctx.font = `700 ${progFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            const textW = ctx.measureText(progText).width;
            const badgeY = n.y - drawRadius - progFontSize - 5;

            ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 247, 237, 0.94)';
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
              ctx.roundRect(n.x - textW / 2 - 6, badgeY - progFontSize + 1, textW + 12, progFontSize + 5, 4);
            } else {
              ctx.rect(n.x - textW / 2 - 6, badgeY - progFontSize + 1, textW + 12, progFontSize + 5);
            }
            ctx.fill();
            ctx.strokeStyle = pct >= 1 ? '#10b981' : (pct > 0 ? '#38bdf8' : (isDark ? '#475569' : '#cbd5e1'));
            ctx.lineWidth = 1.2;
            ctx.stroke();

            ctx.fillStyle = pct >= 1 ? '#10b981' : (pct > 0 ? '#38bdf8' : (isDark ? '#94a3b8' : '#64748b'));
            ctx.textAlign = 'center';
            ctx.fillText(progText, n.x, badgeY + 2);
          }
          ctx.restore();
        }

      } else if (n.type === 'branch') {
        // Level 2: 古典分岐 (Branch)
        // 1. 周囲のソフトアンバーオーラ
        const bAuraR = drawRadius * (isSelected ? 1.6 : (isHover ? 1.4 : 1.25));
        ctx.beginPath();
        ctx.arc(n.x, n.y, bAuraR, 0, Math.PI * 2);
        ctx.fillStyle = isSelected
          ? 'rgba(245, 158, 11, 0.32)'
          : (isHover ? 'rgba(251, 191, 36, 0.24)' : (isDark ? 'rgba(245, 158, 11, 0.14)' : 'rgba(217, 119, 6, 0.09)'));
        ctx.fill();

        // 2. コア本体
        ctx.beginPath();
        ctx.arc(n.x, n.y, drawRadius, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? '#fbbf24' : '#d97706';
        ctx.fill();

        // 3. 繊細な外周リムリング
        ctx.beginPath();
        ctx.arc(n.x, n.y, drawRadius, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected
          ? '#fef08a'
          : (isHover ? '#fbbf24' : (isDark ? 'rgba(254, 243, 199, 0.60)' : 'rgba(255, 255, 255, 0.85)'));
        ctx.lineWidth = isSelected ? 2.0 : (isHover ? 1.5 : 0.9);
        ctx.stroke();

        // 4. 中心自己発光コア
        ctx.beginPath();
        ctx.arc(n.x, n.y, drawRadius * 0.40, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
        ctx.fill();

        if (zoom >= (isTree ? 0.20 : 0.40) || isSelected || isHover) {
          const bFontSize = Math.round(Math.max(9.5, 11.0 / Math.sqrt(zoom)));
          ctx.font = `700 ${bFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const cleanBranchLabel = n.label.replace(/^(Latin|Romance|Germanic|Greek|Borrowed|Italic|Sinospheric):\s*/i, '');
          const wCount = n.connectedWords?.length || 0;
          const displayBranchText = wCount > 0 ? `${cleanBranchLabel} (${wCount})` : cleanBranchLabel;

          const bTextW = ctx.measureText(displayBranchText).width;
          const bPadX = 6, bPadY = 3.0;
          const bY = n.y + drawRadius + bFontSize * 0.7 + 3;

          ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.90)' : 'rgba(255, 255, 255, 0.94)';
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(n.x - bTextW / 2 - bPadX, bY - bFontSize / 2 - bPadY, bTextW + bPadX * 2, bFontSize + bPadY * 2, 4);
          } else {
            ctx.rect(n.x - bTextW / 2 - bPadX, bY - bFontSize / 2 - bPadY, bTextW + bPadX * 2, bFontSize + bPadY * 2);
          }
          ctx.fill();

          ctx.strokeStyle = isDark ? 'rgba(251, 191, 36, 0.45)' : 'rgba(217, 119, 6, 0.35)';
          ctx.lineWidth = 0.9;
          ctx.stroke();

          ctx.fillStyle = isDark ? '#fbbf24' : '#b45309';
          ctx.fillText(displayBranchText, n.x, bY);
        }

      } else if (n.type === 'ghost_bud') {
        // Level 3: 未開拓スキルノード (Ghost Bud / RPG Skill Node)
        ctx.save();

        // 控えめな鉄色・真鍮オーラ
        ctx.beginPath();
        ctx.arc(n.x, n.y, drawRadius * (isSelected ? 1.7 : (isHover ? 1.5 : 1.3)), 0, Math.PI * 2);
        ctx.fillStyle = isSelected
          ? 'rgba(56, 189, 248, 0.25)'
          : (isHover ? 'rgba(245, 158, 11, 0.22)' : (isDark ? 'rgba(100, 116, 139, 0.15)' : 'rgba(148, 163, 184, 0.12)'));
        ctx.fill();

        // ノード本体背景（くすんだ鉄色・スレート調）
        ctx.beginPath();
        ctx.arc(n.x, n.y, drawRadius, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? '#1e293b' : '#f8fafc';
        ctx.fill();

        // 破線スキルリング
        ctx.setLineDash([3, 2.5]);
        ctx.beginPath();
        ctx.arc(n.x, n.y, drawRadius, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected ? '#38bdf8' : (isHover ? '#f59e0b' : (isDark ? '#64748b' : '#94a3b8'));
        ctx.lineWidth = isSelected ? 2.4 : 1.5;
        ctx.stroke();
        ctx.setLineDash([]);

        // 中央の南京錠アイコン (Canvas 2D Path・完全絵文字ゼロ、ミニマルな幾何学シェイプ)
        const lockColor = isDark ? (isHover ? '#fbbf24' : '#94a3b8') : (isHover ? '#d97706' : '#64748b');
        ctx.strokeStyle = lockColor;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(n.x, n.y - 2.0, 2.4, Math.PI, 0, false);
        ctx.stroke();

        ctx.fillStyle = lockColor;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(n.x - 3.4, n.y - 1.2, 6.8, 5.0, 1.0);
        } else {
          ctx.rect(n.x - 3.4, n.y - 1.2, 6.8, 5.0);
        }
        ctx.fill();

        ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
        ctx.beginPath();
        ctx.arc(n.x, n.y + 0.6, 0.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        if (zoom >= 1.15 || isSelected || isHover) {
          const budFontSize = Math.round(Math.max(9.0, 10.0 / Math.sqrt(zoom)));
          ctx.font = `600 ${budFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.lineJoin = 'round';
          ctx.strokeStyle = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)';
          ctx.lineWidth = 3.0;
          ctx.textAlign = 'center';
          ctx.strokeText(n.label, n.x, n.y + drawRadius + budFontSize + 1);
          ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
          ctx.fillText(n.label, n.x, n.y + drawRadius + budFontSize + 1);

          if (zoom >= 1.45 || isSelected || isHover) {
            const tagFontSize = Math.round(Math.max(7.5, 8.5 / Math.sqrt(zoom)));
            const tagY = n.y + drawRadius + budFontSize + tagFontSize + 3;
            ctx.font = `700 ${tagFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
            ctx.fillText('[未開拓]', n.x, tagY);
          }
        }

      } else if (n.type === 'twig') {
        // Level 4: 派生小枝 (Twig) - 系統樹モードでは親単語がホバーまたは選択時のみ描画して過密を根絶
        if (isTree) {
          const isParentFocused = focusNode && (focusNode.label === n.parentWord || focusNode === n);
          if (!isParentFocused) {
            continue;
          }
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, drawRadius, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? 'rgba(148, 163, 184, 0.7)' : 'rgba(100, 116, 139, 0.7)';
        ctx.fill();

        const tFontSize = Math.round(Math.max(8.5, 9.5 / Math.sqrt(zoom)));
        ctx.font = `500 ${tFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = textColor;
        ctx.fillText(n.label, n.x, n.y + drawRadius + tFontSize + 2);

      } else {
        // Level 3: 現代見出し語 (Leaf)
        const rVal = global.VocabSRS?.getRetrievability ? global.VocabSRS.getRetrievability(n.item, now) : 0.85;
        const meaningText = (isMask && !isHover && !isSelected) ? '[ ????? ]' : (n.meaning || '');
        const isFocusHighlight = isSelected || isHover;

        // --- 美麗な天体球体ノード（Celestial Sphere Node）---
        // 1. 周囲のソフトグロー（Soft Ambient Glow / 微光ハロー）
        const auraRadius = drawRadius * (isSelected ? 1.6 : (isHover ? 1.4 : 1.25));
        ctx.beginPath();
        ctx.arc(n.x, n.y, auraRadius, 0, Math.PI * 2);
        ctx.fillStyle = isSelected
          ? 'rgba(56, 189, 248, 0.32)'
          : (isHover ? 'rgba(167, 139, 250, 0.28)' : colorToRgba(nodeColor, isDark ? 0.16 : 0.12));
        ctx.fill();

        // 2. コア本体
        ctx.beginPath();
        ctx.arc(n.x, n.y, drawRadius, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.fill();

        // 3. 繊細な外周リムリング
        ctx.beginPath();
        ctx.arc(n.x, n.y, drawRadius, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected
          ? '#bae6fd'
          : (isHover ? '#e9d5ff' : (isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.75)'));
        ctx.lineWidth = isFocusHighlight ? 2.0 : 0.8;
        ctx.stroke();

        // 4. 中心自己発光コア
        ctx.beginPath();
        ctx.arc(n.x, n.y, drawRadius * 0.36, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
        ctx.fill();
        if (isFocusHighlight) ctx.shadowBlur = 0;

        // 見出し語ラベル描画（ズームイン時、ホバー・選択時、または検索マッチ時）
        if (zoom >= textThresholdZoom || isFocusHighlight || isMatch) {
          const wFontSize = Math.round(Math.max(isTree ? 10.5 : 9.5, 10.5 / Math.sqrt(Math.max(0.7, zoom))));

          // 形態素語幹バッジ (Level 4: Morphological Stem)
          if (n.stem && (zoom >= 1.15 || isFocusHighlight)) {
            const sFontSize = Math.round(Math.max(8.0, 9.0 / Math.sqrt(Math.max(0.7, zoom))));
            const sText = n.stem;
            ctx.font = `600 ${sFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            const sWidth = ctx.measureText(sText).width;
            const sY = n.y - drawRadius - 4;

            ctx.fillStyle = isDark ? 'rgba(30, 41, 59, 0.88)' : 'rgba(241, 245, 249, 0.90)';
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
              ctx.roundRect(n.x - sWidth / 2 - 4, sY - sFontSize, sWidth + 8, sFontSize + 4, 3);
            } else {
              ctx.rect(n.x - sWidth / 2 - 4, sY - sFontSize, sWidth + 8, sFontSize + 4);
            }
            ctx.fill();
            ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.35)' : 'rgba(100, 116, 139, 0.25)';
            ctx.lineWidth = 0.8;
            ctx.stroke();

            ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
            ctx.fillText(sText, n.x, sY - 1);
          }

          // 項目16: ノード密集時のラベル衝突回避（Label Collision Avoidance）
          let shouldDrawWordLabel = true;
          if (!isFocusHighlight && !isMatch) {
            const approxW = Math.max(28, n.label.length * wFontSize * 0.62);
            const approxH = wFontSize + 4;
            const bX = n.x - approxW / 2;
            const bY = n.y + drawRadius + 2;
            for (let bIdx = 0; bIdx < renderedLabelBoxes.length; bIdx++) {
              const b = renderedLabelBoxes[bIdx];
              if (Math.abs(b.x - bX) < (b.w + approxW) * 0.48 && Math.abs(b.y - bY) < (b.h + approxH) * 0.48) {
                shouldDrawWordLabel = false;
                break;
              }
            }
            if (shouldDrawWordLabel) {
              renderedLabelBoxes.push({ x: bX, y: bY, w: approxW, h: approxH });
            }
          }

          if (shouldDrawWordLabel) {
            ctx.font = `bold ${wFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const wordText = n.label;
            const wWidth = ctx.measureText(wordText).width;
            const wPadX = 5, wPadY = 2.5;
            const wLabelY = n.y + drawRadius + wFontSize * 0.6 + 3;

            ctx.fillStyle = isDark ? 'rgba(11, 17, 32, 0.88)' : 'rgba(255, 255, 255, 0.92)';
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
              ctx.roundRect(n.x - wWidth / 2 - wPadX, wLabelY - wFontSize / 2 - wPadY, wWidth + wPadX * 2, wFontSize + wPadY * 2, 3);
            } else {
              ctx.rect(n.x - wWidth / 2 - wPadX, wLabelY - wFontSize / 2 - wPadY, wWidth + wPadX * 2, wFontSize + wPadY * 2);
            }
            ctx.fill();

            ctx.strokeStyle = isFocusHighlight
              ? (isDark ? '#38bdf8' : '#0284c7')
              : (isDark ? 'rgba(148, 163, 184, 0.32)' : 'rgba(100, 116, 139, 0.26)');
            ctx.lineWidth = isFocusHighlight ? 1.4 : 0.7;
            ctx.stroke();

            ctx.fillStyle = isFocusHighlight
              ? (isDark ? '#38bdf8' : '#0284c7')
              : (isDark ? '#f8fafc' : '#0f172a');
            ctx.fillText(wordText, n.x, wLabelY);
          }

          // ズームイン時 (zoom >= 1.30) は訳語も控えめに添える
          if (isTree && meaningText && (zoom >= 1.30 || isFocusHighlight)) {
            const mFontSize = Math.round(wFontSize * 0.82);
            const shortMeaning = meaningText.length > 9 ? meaningText.slice(0, 8) + '…' : meaningText;
            ctx.font = `500 ${mFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const mY = n.y + drawRadius + wFontSize + mFontSize * 0.7 + 6;

            const mW = ctx.measureText(shortMeaning).width;
            ctx.fillStyle = isDark ? 'rgba(11, 17, 32, 0.82)' : 'rgba(255, 255, 255, 0.88)';
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
              ctx.roundRect(n.x - mW / 2 - 4, mY - mFontSize / 2 - 2, mW + 8, mFontSize + 4, 3);
            } else {
              ctx.rect(n.x - mW / 2 - 4, mY - mFontSize / 2 - 2, mW + 8, mFontSize + 4);
            }
            ctx.fill();

            ctx.fillStyle = (isMask && !isHover && !isSelected) ? '#94a3b8' : (isDark ? '#94a3b8' : '#64748b');
            ctx.fillText(shortMeaning, n.x, mY);
          }
        } else {
          // --- 俯瞰・星辰モード: 軽快かつ美しい星屑レンダリング ---
          const dotR = Math.max(2.8, drawRadius * 0.82);

          // 1. 微光オーラ
          ctx.beginPath();
          ctx.arc(n.x, n.y, dotR * 1.35, 0, Math.PI * 2);
          ctx.fillStyle = colorToRgba(nodeColor, isDark ? 0.18 : 0.14);
          ctx.fill();

          // 2. コアセル
          ctx.beginPath();
          ctx.arc(n.x, n.y, dotR, 0, Math.PI * 2);
          ctx.fillStyle = nodeColor;
          ctx.fill();

          // 3. 中心微光
          ctx.beginPath();
          ctx.arc(n.x, n.y, dotR * 0.38, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.40)';
          ctx.fill();
        }
      }

      if (nodeAlpha !== 1.0) ctx.globalAlpha = 1.0;
    }

    // 3. スキル習得・覚醒時のパーティクル・光波エフェクト (RPG Particle Ripples)
    if (graphState.unlockParticles && graphState.unlockParticles.length) {
      let hasActiveParticles = false;
      ctx.save();
      for (let i = graphState.unlockParticles.length - 1; i >= 0; i--) {
        const p = graphState.unlockParticles[i];
        p.radius += 2.2;
        p.alpha -= 0.035;
        if (p.alpha > 0 && p.radius <= p.maxRadius) {
          hasActiveParticles = true;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.strokeStyle = p.color || '#38bdf8';
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.lineWidth = 3.0;
          ctx.stroke();

          // 内部光輪
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 0.65, 0, Math.PI * 2);
          ctx.strokeStyle = '#fbbf24';
          ctx.globalAlpha = Math.max(0, p.alpha * 0.7);
          ctx.lineWidth = 1.8;
          ctx.stroke();
        } else {
          graphState.unlockParticles.splice(i, 1);
        }
      }
      ctx.restore();
      if (hasActiveParticles) {
        requestAnimationFrame(drawGraph);
      }
    }

    ctx.restore();

    // 4. 画面左下サンバースト言語系統凡例 (Sunburst Legend HUD)
    if (isTree) {
      ctx.save();
      const legendW = 224;
      const legendH = 106;
      const legendX = 20;
      const legendY = Math.max(20, (graphState.height || 600) - legendH - 20);

      ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.94)';
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.10)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(legendX, legendY, legendW, legendH, 10);
      } else {
        ctx.rect(legendX, legendY, legendW, legendH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';

      // ■ 印欧祖語 / PIE
      ctx.fillStyle = isDark ? '#ea580c' : '#c2410c';
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(legendX + 14, legendY + 16, 13, 13, 3);
        ctx.fill();
      } else {
        ctx.fillRect(legendX + 14, legendY + 16, 13, 13);
      }
      ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
      ctx.fillText('印欧祖語 / PIE', legendX + 35, legendY + 27);

      // ■ ゲルマン系 / Germanic
      ctx.fillStyle = '#84cc16';
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(legendX + 14, legendY + 46, 13, 13, 3);
        ctx.fill();
      } else {
        ctx.fillRect(legendX + 14, legendY + 46, 13, 13);
      }
      ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
      ctx.fillText('ゲルマン系 / Germanic', legendX + 35, legendY + 57);

      // ■ ロマンス系 / Romance
      ctx.fillStyle = '#38bdf8';
      if (typeof ctx.roundRect === 'function') {
        ctx.beginPath();
        ctx.roundRect(legendX + 14, legendY + 76, 13, 13, 3);
        ctx.fill();
      } else {
        ctx.fillRect(legendX + 14, legendY + 76, 13, 13);
      }
      ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
      ctx.fillText('ロマンス系 / Romance', legendX + 35, legendY + 87);

      ctx.restore();
    }
  }


  global.VocabGraphRenderer = {
    LANG_GRAPH_COLORS,
    RETENTION_COLORS,
    colorToRgba,
    invalidateTreeBgCache,
    getTreeBackgroundCache,
    getCachedLabelSprite,
    drawGraph
  };
})(typeof window !== 'undefined' ? window : globalThis);
