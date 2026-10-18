/**
 * Vocab Vault — WebGL Hybrid Hardware-Accelerated Graph Engine (js/graph_webgl.js)
 * High-performance GPU pipeline for massive lineage trees (3,000+ nodes & 5,000+ edges)
 * Seamlessly pairs with Canvas 2D overlay for text labels and interactive hit testing.
 */
(function (global) {
  'use strict';

  let glCanvas = null;
  let gl = null;
  let pointProgram = null;
  let lineProgram = null;
  let pointBuffer = null;
  let lineBuffer = null;
  let isInitialized = false;
  let lastNodeVersion = -1;
  let cachedNodeCount = 0;
  let cachedEdgeCount = 0;

  // Vertex Shader for Node Point Sprites
  const POINT_VS = `
    attribute vec2 a_position;
    attribute vec4 a_color;
    attribute float a_size;
    uniform vec2 u_resolution;
    uniform vec2 u_pan;
    uniform float u_zoom;
    varying vec4 v_color;

    void main() {
      vec2 worldPos = a_position * u_zoom + u_pan;
      vec2 clipSpace = (worldPos / u_resolution) * 2.0 - 1.0;
      gl_Position = vec4(clipSpace.x, -clipSpace.y, 0.0, 1.0);
      gl_PointSize = max(1.0, a_size * u_zoom);
      v_color = a_color;
    }
  `;

  // Fragment Shader for Node Point Sprites (Smooth antialiased circles with halo glow)
  const POINT_FS = `
    precision mediump float;
    varying vec4 v_color;

    void main() {
      vec2 coord = gl_PointCoord - vec2(0.5);
      float dist = length(coord);
      if (dist > 0.5) {
        discard;
      }
      float alpha = smoothstep(0.5, 0.38, dist);
      gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
    }
  `;

  // Vertex Shader for Link Lines
  const LINE_VS = `
    attribute vec2 a_position;
    attribute vec4 a_color;
    uniform vec2 u_resolution;
    uniform vec2 u_pan;
    uniform float u_zoom;
    varying vec4 v_color;

    void main() {
      vec2 worldPos = a_position * u_zoom + u_pan;
      vec2 clipSpace = (worldPos / u_resolution) * 2.0 - 1.0;
      gl_Position = vec4(clipSpace.x, -clipSpace.y, 0.0, 1.0);
      v_color = a_color;
    }
  `;

  // Fragment Shader for Link Lines
  const LINE_FS = `
    precision mediump float;
    varying vec4 v_color;

    void main() {
      gl_FragColor = v_color;
    }
  `;

  function createShader(glCtx, type, source) {
    const shader = glCtx.createShader(type);
    glCtx.shaderSource(shader, source);
    glCtx.compileShader(shader);
    if (!glCtx.getShaderParameter(shader, glCtx.COMPILE_STATUS)) {
      console.warn('[WebGL Graph] Shader compile error:', glCtx.getShaderInfoLog(shader));
      glCtx.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function createProgram(glCtx, vsSource, fsSource) {
    const vs = createShader(glCtx, glCtx.VERTEX_SHADER, vsSource);
    const fs = createShader(glCtx, glCtx.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return null;

    const program = glCtx.createProgram();
    glCtx.attachShader(program, vs);
    glCtx.attachShader(program, fs);
    glCtx.linkProgram(program);
    if (!glCtx.getProgramParameter(program, glCtx.LINK_STATUS)) {
      console.warn('[WebGL Graph] Program link error:', glCtx.getProgramInfoLog(program));
      glCtx.deleteProgram(program);
      return null;
    }
    return program;
  }

  function parseColor(c, defaultAlpha = 1.0) {
    if (!c) return [1.0, 1.0, 1.0, defaultAlpha];
    if (c.startsWith('#')) {
      let hex = c.slice(1);
      if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
      const num = parseInt(hex, 16);
      if (!Number.isNaN(num)) {
        return [
          ((num >> 16) & 255) / 255,
          ((num >> 8) & 255) / 255,
          (num & 255) / 255,
          defaultAlpha
        ];
      }
    } else if (c.startsWith('rgba')) {
      const parts = c.replace(/rgba?\((.*)\)/, '$1').split(',').map(s => parseFloat(s.trim()));
      if (parts.length >= 3) {
        return [
          (parts[0] || 0) / 255,
          (parts[1] || 0) / 255,
          (parts[2] || 0) / 255,
          Number.isNaN(parts[3]) ? defaultAlpha : parts[3]
        ];
      }
    }
    return [0.8, 0.8, 0.8, defaultAlpha];
  }

  function isSupported() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return false;
    try {
      const testCanvas = document.createElement('canvas');
      return Boolean(testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  }

  function initGL(canvas) {
    if (!canvas) return false;
    glCanvas = canvas;
    try {
      gl = glCanvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false }) ||
           glCanvas.getContext('experimental-webgl', { alpha: true, antialias: true });
    } catch (e) {
      console.warn('[WebGL Graph] Context init failed:', e);
      return false;
    }
    if (!gl) return false;

    pointProgram = createProgram(gl, POINT_VS, POINT_FS);
    lineProgram = createProgram(gl, LINE_VS, LINE_FS);
    if (!pointProgram || !lineProgram) return false;

    pointBuffer = gl.createBuffer();
    lineBuffer = gl.createBuffer();

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    isInitialized = true;
    return true;
  }

  function updateBuffers(nodes, edges, isDark) {
    if (!gl || !isInitialized) return;

    // 1. Line Segments (Edges) Buffer
    // Each vertex: [x, y, r, g, b, a] = 6 floats per vertex, 2 vertices per edge
    const lineData = new Float32Array(edges.length * 2 * 6);
    let lIdx = 0;
    const defaultEdgeAlpha = isDark ? 0.22 : 0.16;

    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      const s = e.source;
      const t = e.target;
      const col = parseColor(e.color, defaultEdgeAlpha);

      // Vertex 1: source
      lineData[lIdx++] = s.x || 0;
      lineData[lIdx++] = s.y || 0;
      lineData[lIdx++] = col[0];
      lineData[lIdx++] = col[1];
      lineData[lIdx++] = col[2];
      lineData[lIdx++] = col[3];

      // Vertex 2: target
      lineData[lIdx++] = t.x || 0;
      lineData[lIdx++] = t.y || 0;
      lineData[lIdx++] = col[0];
      lineData[lIdx++] = col[1];
      lineData[lIdx++] = col[2];
      lineData[lIdx++] = col[3];
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, lineData, gl.DYNAMIC_DRAW);
    cachedEdgeCount = edges.length;

    // 2. Point Sprites (Nodes) Buffer
    // Each vertex: [x, y, r, g, b, a, size] = 7 floats per node
    const pointData = new Float32Array(nodes.length * 7);
    let pIdx = 0;

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const col = parseColor(n.color || (n.type === 'root' ? '#7c3aed' : '#38bdf8'), 0.95);
      const radius = (n.r || (n.type === 'root' ? 14 : 7)) * 2.2;

      pointData[pIdx++] = n.x || 0;
      pointData[pIdx++] = n.y || 0;
      pointData[pIdx++] = col[0];
      pointData[pIdx++] = col[1];
      pointData[pIdx++] = col[2];
      pointData[pIdx++] = col[3];
      pointData[pIdx++] = radius;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, pointData, gl.DYNAMIC_DRAW);
    cachedNodeCount = nodes.length;
  }

  function render(graphState) {
    if (!graphState || !graphState.canvas) return;

    if (!isInitialized) {
      let webglCanvas = document.getElementById('graphWebGLCanvas');
      if (!webglCanvas) {
        const wrap = document.getElementById('graphCanvasWrap');
        if (!wrap) return;
        webglCanvas = document.createElement('canvas');
        webglCanvas.id = 'graphWebGLCanvas';
        webglCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;';
        wrap.insertBefore(webglCanvas, wrap.firstChild);
      }
      if (!initGL(webglCanvas)) return;
    }

    if (!gl || !glCanvas) return;

    glCanvas.style.display = 'block';

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = graphState.width || 800;
    const h = graphState.height || 600;
    if (glCanvas.width !== w * dpr || glCanvas.height !== h * dpr) {
      glCanvas.width = w * dpr;
      glCanvas.height = h * dpr;
    }
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);

    const isDark = document.body ? document.body.classList.contains('dark') : true;

    // Buffer update if topology changed or nodes moved significantly
    const curNodes = graphState.nodes || [];
    const curEdges = graphState.edges || [];
    if (curNodes.length !== cachedNodeCount || curEdges.length !== cachedEdgeCount || graphState.needsBufferUpdate) {
      updateBuffers(curNodes, curEdges, isDark);
      graphState.needsBufferUpdate = false;
    }

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const panX = graphState.panX || 0;
    const panY = graphState.panY || 0;
    const zoom = graphState.zoom || 1.0;

    // --- Draw Edges (Lines) ---
    if (cachedEdgeCount > 0 && lineProgram) {
      gl.useProgram(lineProgram);
      const uRes = gl.getUniformLocation(lineProgram, 'u_resolution');
      const uPan = gl.getUniformLocation(lineProgram, 'u_pan');
      const uZoom = gl.getUniformLocation(lineProgram, 'u_zoom');

      gl.uniform2f(uRes, w, h);
      gl.uniform2f(uPan, panX, panY);
      gl.uniform1f(uZoom, zoom);

      gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
      const aPos = gl.getAttribLocation(lineProgram, 'a_position');
      const aCol = gl.getAttribLocation(lineProgram, 'a_color');

      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 6 * 4, 0);

      gl.enableVertexAttribArray(aCol);
      gl.vertexAttribPointer(aCol, 4, gl.FLOAT, false, 6 * 4, 2 * 4);

      gl.drawArrays(gl.LINES, 0, cachedEdgeCount * 2);
    }

    // --- Draw Nodes (Point Sprites) ---
    if (cachedNodeCount > 0 && pointProgram) {
      gl.useProgram(pointProgram);
      const uRes = gl.getUniformLocation(pointProgram, 'u_resolution');
      const uPan = gl.getUniformLocation(pointProgram, 'u_pan');
      const uZoom = gl.getUniformLocation(pointProgram, 'u_zoom');

      gl.uniform2f(uRes, w, h);
      gl.uniform2f(uPan, panX, panY);
      gl.uniform1f(uZoom, zoom);

      gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
      const aPos = gl.getAttribLocation(pointProgram, 'a_position');
      const aCol = gl.getAttribLocation(pointProgram, 'a_color');
      const aSize = gl.getAttribLocation(pointProgram, 'a_size');

      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 7 * 4, 0);

      gl.enableVertexAttribArray(aCol);
      gl.vertexAttribPointer(aCol, 4, gl.FLOAT, false, 7 * 4, 2 * 4);

      gl.enableVertexAttribArray(aSize);
      gl.vertexAttribPointer(aSize, 1, gl.FLOAT, false, 7 * 4, 6 * 4);

      gl.drawArrays(gl.POINTS, 0, cachedNodeCount);
    }
  }

  function hide() {
    if (glCanvas) {
      glCanvas.style.display = 'none';
    }
  }

  function invalidate() {
    cachedNodeCount = 0;
    cachedEdgeCount = 0;
  }

  global.VocabWebGLGraph = {
    isSupported,
    initGL,
    render,
    hide,
    invalidate,
    updateBuffers
  };

})(typeof window !== 'undefined' ? window : globalThis);
