/**
 * Vocab Vault — Graph Views & Inspector Module (js/graph_views.js)
 * Mindmap, Cognate Matrix, Detail Drawer Inspector & Eiken Pre-1 Explorer
 */
(function (global) {
  'use strict';

  const getGraphState = () => global.VocabGraph?.graphState || global._sharedGraphState || {};
  const graphState = new Proxy({}, {
    get: (_, prop) => getGraphState()[prop],
    set: (_, prop, val) => {
      const st = getGraphState();
      st[prop] = val;
      return true;
    }
  });

  const buildGraphData = (...args) => (global.VocabGraphLayout?.buildGraphData || global.VocabGraph?.buildGraphData)?.(...args);
  const cleanRootKey = k => (global.VocabGraphLayout?.cleanRootKey || global.VocabGraph?.cleanRootKey ? (global.VocabGraphLayout?.cleanRootKey || global.VocabGraph?.cleanRootKey)(k) : String(k || '').replace(/^\*/, '').replace(/-$/, ''));
  const drawGraph = () => (global.VocabGraph?.drawGraph || global.VocabGraphRenderer?.drawGraph)?.();
  const selectNodeById = id => global.VocabGraph?.selectNodeById?.(id);
  const deselectNode = () => global.VocabGraph?.deselectNode?.();
  const focusRoot = k => global.VocabGraph?.focusRoot?.(k);
  const clearRootFocus = () => global.VocabGraph?.clearRootFocus?.();
  const updateGraphDataAndFit = () => global.VocabGraph?.updateGraphDataAndFit?.();
  const playSkillUnlockSound = () => global.VocabGraph?.playSkillUnlockSound?.();
  const getEnglishPairKeyAndEntries = () => global.VocabGraph?.getEnglishPairKeyAndEntries?.() || { pairKey: 'distinction_entries', entries: [] };
  const switchViewMode = m => global.VocabGraph?.switchViewMode?.(m);
  const zoomToCluster = n => global.VocabGraph?.zoomToCluster?.(n);
  const speakNodeWord = (w, l) => global.VocabGraph?.speakNodeWord?.(w, l);
  const jumpToNodeWord = (w, l) => global.VocabGraph?.jumpToNodeWord?.(w, l);
  const filterMainListByRoot = r => global.VocabGraph?.filterMainListByRoot?.(r);
  const startRootAnkiReview = () => global.VocabGraph?.startRootAnkiReview?.();
  const startBranchAnkiReview = () => global.VocabGraph?.startBranchAnkiReview?.();
  const getRootMeaning = (rk, cw) => (global.VocabGraphLayout?.getRootMeaning || global.VocabGraph?.getRootMeaning)?.(rk, cw) || '';

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

  /**
   * HTML属性内のインラインJavaScript引数コンテキスト用エスケープ
   * バックスラッシュ、シングルクォート、ダブルクォート、改行、HTML特殊文字を完全無害化しDOM XSSを根絶
   */
  const escJsAttr = s => String(s ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');

  const escFn = esc;
  /**
   * 主要語根へ直接飛べるドロップダウンを生成（概念領域オントロジーごとにグループ化）
   */
  function populateRootJumpSelect(roots) {
    if (typeof document === 'undefined') return;
    const sel = document.getElementById('graphRootJumpSel');
    if (!sel) return;
    const curVal = sel.value;

    const realms = global.VocabMorphology?.SEMANTIC_REALMS || {};
    const realmGroups = {};
    Object.keys(realms).forEach(k => { realmGroups[k] = []; });

    roots.forEach(r => {
      const realmKey = (r.realm && r.realm.id) || (global.VocabMorphology?.ROOT_REALM_MAP?.[r.label] || 'structure');
      if (!realmGroups[realmKey]) realmGroups[realmKey] = [];
      realmGroups[realmKey].push(r);
    });

    let html = '<option value="">全言語族・全概念領域: 世界大語源体系 (Global Phyla)</option>';
    Object.entries(realms).forEach(([rk, rObj]) => {
      const rList = realmGroups[rk] || [];
      if (!rList.length) return;
      rList.sort((a, b) => b.childCount - a.childCount);
      html += `<optgroup label="[領域] ${escFn(rObj.label)}">`;
      rList.forEach(r => {
        const m = r.rootMeaning || getRootMeaning(r.label, r.connectedWords);
        const mStr = m ? ` - ${m}` : '';
        html += `<option value="${escFn(r.label)}">${escFn(r.label)}${escFn(mStr)} (${Number(r.childCount) || 0}語)</option>`;
      });
      html += '</optgroup>';
    });

    sel.innerHTML = html;
    if (curVal && roots.some(r => r.label === curVal)) {
      sel.value = curVal;
    }
  }

  /**
   * パンくずリスト & クイックピルバーの動的更新
   */
  function updateBreadcrumbUI(roots) {
    if (typeof document === 'undefined') return;
    const bar = document.getElementById('graphTreeBreadcrumbBar');
    const bcCurrent = document.getElementById('graphBcCurrentRoot');
    const quickPills = document.getElementById('graphQuickPills');
    if (!bar) return;

    const isTreeOrMindmap = (graphState.activeViewTab === 'tree' || graphState.activeViewTab === 'mindmap');
    bar.style.display = (isTreeOrMindmap && graphState.focusedRootKey) ? 'flex' : 'none';

    if (bcCurrent) {
      if (graphState.focusedRootKey) {
        const rInfo = (roots || []).find(r => r.label === graphState.focusedRootKey);
        const realmLabel = rInfo?.realm?.label?.split(' ')[0] || '';
        bcCurrent.textContent = realmLabel ? `[領域: ${realmLabel}] > ${graphState.focusedRootKey}` : graphState.focusedRootKey;
        bcCurrent.style.display = 'inline';
      } else {
        bcCurrent.textContent = '全語根';
      }
    }

    if (quickPills) {
      quickPills.innerHTML = '';
      quickPills.style.display = 'none';
    }
  }

  /**
   * 1語根フォーカスを解除し、全語根一覧へ戻る
   */
  /**
   * アイデア②: DOM インタラクティブ・マインドマップ（アウトライナー）表示
   */
  function renderMindmap() {
    const wrap = document.getElementById('graphMindmapWrap');
    if (!wrap) return;

    const escFn = global.esc || global.VocabCore?.esc || (s => String(s ?? ''));
    const isMask = graphState.treeMaskMode;

    const { nodes } = buildGraphData(graphState.filterQuery, graphState.clusterOnly, graphState.langFilter);
    const roots = nodes.filter(n => n.type === 'root');
    const branches = nodes.filter(n => n.type === 'branch');
    const words = nodes.filter(n => n.type === 'word');

    // フォーカス語根がある場合は絞り込み
    const displayRoots = graphState.focusedRootKey
      ? roots.filter(r => r.label === graphState.focusedRootKey)
      : roots;

    if (!displayRoots.length) {
      wrap.innerHTML = '<div style="padding:40px;text-align:center;color:var(--m)">該当する語根・単語がありません。</div>';
      return;
    }

    const cardsHtml = displayRoots.map(r => {
      const relBranches = branches.filter(b => b.rootLabel === r.label);
      const relWords = (r.connectedWords || []);

      const renderWordRow = (w) => {
        const item = w.item || {};
        const meaningText = isMask ? '[ 想起テスト: タップで表示 ]' : escFn(w.meaning);
        const maskStyle = isMask ? 'color:var(--m);font-style:italic;background:var(--bg-hov);padding:1px 6px;border-radius:3px;cursor:pointer' : '';
        const phonetic = item.phonetic ? `<span style="font-size:10.5px;color:var(--s);font-family:var(--mono);margin-left:4px">${escFn(item.phonetic)}</span>` : '';
        const core = item.core ? `<span style="font-size:10.5px;color:var(--m);margin-left:8px">コア: ${escFn(item.core)}</span>` : '';
        const srsIv = (global.VocabSRS?.predictIntervals && item.id)
          ? global.VocabSRS.predictIntervals(item)
          : ['1分後', '1日後', '3日後', '7日後'];

        return `
          <div class="mindmap-word-row">
            <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1">
              <span class="pos-lbl">${escFn((w.lang || 'en').toUpperCase())}</span>
              <strong style="font-size:13.5px;color:var(--t)">${escFn(w.label)}</strong>
              ${phonetic}
              <span style="font-size:12px;color:var(--t);${maskStyle}" ${isMask ? `onclick="this.textContent='${escJsAttr(w.meaning)}';this.style.color='var(--t)';this.style.fontStyle='normal';this.style.background='transparent'"` : ''}>${meaningText}</span>
              ${core}
            </div>
            <div style="display:flex;align-items:center;gap:4px">
              ${isMask ? `
                <button type="button" class="btn-o btn-xs" onclick="VocabGraph.rateSpecificWord('${escJsAttr(w.label)}', 0)" style="color:#ef4444;border-color:rgba(239,68,68,0.3);padding:1px 5px;font-size:10px" title="忘却 (${escFn(srsIv[0])})">1:忘<span style="font-size:8.5px;opacity:0.8;margin-left:2px">(${escFn(srsIv[0].replace('後',''))})</span></button>
                <button type="button" class="btn-o btn-xs" onclick="VocabGraph.rateSpecificWord('${escJsAttr(w.label)}', 1)" style="color:#f59e0b;border-color:rgba(245,158,11,0.3);padding:1px 5px;font-size:10px" title="困難 (${escFn(srsIv[1])})">2:難<span style="font-size:8.5px;opacity:0.8;margin-left:2px">(${escFn(srsIv[1].replace('後',''))})</span></button>
                <button type="button" class="btn-o btn-xs" onclick="VocabGraph.rateSpecificWord('${escJsAttr(w.label)}', 2)" style="color:#10b981;border-color:rgba(16,185,129,0.3);padding:1px 5px;font-size:10px" title="良好 (${escFn(srsIv[2])})">3:良<span style="font-size:8.5px;opacity:0.8;margin-left:2px">(${escFn(srsIv[2].replace('後',''))})</span></button>
                <button type="button" class="btn-o btn-xs" onclick="VocabGraph.rateSpecificWord('${escJsAttr(w.label)}', 3)" style="color:#38bdf8;border-color:rgba(56,189,248,0.3);padding:1px 5px;font-size:10px" title="簡単 (${escFn(srsIv[3])})">4:易<span style="font-size:8.5px;opacity:0.8;margin-left:2px">(${escFn(srsIv[3].replace('後',''))})</span></button>
              ` : ''}
              <button type="button" class="spk-btn" onclick="VocabGraph.speakNodeWord('${escJsAttr(w.label)}','${escJsAttr(w.lang || 'en')}')" title="発音を聞く" aria-label="発音">
                <svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
              </button>
              <button type="button" class="btn-o btn-xs" onclick="VocabGraph.openWordEdit('${escJsAttr(item.id || item.num || w.label)}','${escJsAttr(w.lang || 'en')}')" title="メモ・意味を直接編集">編集</button>
              <button type="button" class="btn-o btn-xs" onclick="VocabGraph.selectNodeById('${escJsAttr(w.id)}')">詳細</button>
            </div>
          </div>
        `;
      };

      let branchHtml = '';
      if (relBranches.length > 0) {
        branchHtml = relBranches.map(b => {
          const bWords = (b.connectedWords || []);
          const wordsRows = bWords.map(w => renderWordRow(w)).join('');

          return `
            <div class="mindmap-branch-wrap">
              <div class="mindmap-branch-hd">
                <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#fbbf24"></span>
                <span>${escFn(b.label)} (${bWords.length}語)</span>
              </div>
              <div>${wordsRows || '<div style="color:var(--m);font-size:11px">単語なし</div>'}</div>
            </div>
          `;
        }).join('');
      } else {
        const branchGroups = {};
        relWords.forEach(w => {
          const bKey = w.branchLabel || w.item?.branch || (w.item?.etymologyDetails?.prefix ? `${w.item.etymologyDetails.prefix}-` : '') || '基本派生語';
          if (!branchGroups[bKey]) branchGroups[bKey] = [];
          branchGroups[bKey].push(w);
        });
        const groupKeys = Object.keys(branchGroups);
        if (groupKeys.length > 1) {
          branchHtml = groupKeys.map(bk => {
            const bWords = branchGroups[bk];
            const wordsRows = bWords.map(w => renderWordRow(w)).join('');
            return `
              <div class="mindmap-branch-wrap">
                <div class="mindmap-branch-hd">
                  <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#fbbf24"></span>
                  <span>${escFn(bk)} (${bWords.length}語)</span>
                </div>
                <div>${wordsRows}</div>
              </div>
            `;
          }).join('');
        } else {
          const wordsRows = relWords.map(w => renderWordRow(w)).join('');
          branchHtml = `
            <div class="mindmap-branch-wrap">
              <div class="mindmap-branch-hd">
                <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#38bdf8"></span>
                <span>派生語一覧 (${relWords.length}語)</span>
              </div>
              <div>${wordsRows || '<div style="color:var(--m);font-size:11px">単語なし</div>'}</div>
            </div>
          `;
        }
      }

      const isGlobalRoot = r.id === 'root:global:phyla' || r.id === 'root:east_asian:unified';
      const isCjkRoot = /^\*[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/.test(String(r.label || '')) || Boolean(r.id && r.id.includes('sinospheric'));
      const isJpRoot = /[\u3040-\u309F]/.test(String(r.label || '')) || Boolean(r.id && r.id.includes('japonic'));
      const isKoRoot = /[\uAC00-\uD7AF]/.test(String(r.label || '')) || Boolean(r.id && r.id.includes('koreanic'));
      const rootBadge = isGlobalRoot ? 'GLOBAL PHYLA' : (isCjkRoot ? 'SINO-TIBETAN' : isJpRoot ? 'JAPONIC' : isKoRoot ? 'KOREANIC' : 'PIE ROOT');
      return `
        <div class="mindmap-root-card">
          <div class="mindmap-root-hd">
            <div class="mindmap-root-title">
              <span class="mindmap-badge">${rootBadge}</span>
              <strong style="font-size:15px;color:var(--ac);font-family:var(--mono)">${escFn(r.label)}</strong>
              ${r.meaning ? `<span style="font-size:13px;color:var(--t);font-weight:600">(${escFn(r.meaning)})</span>` : ''}
              <span style="font-size:12px;color:var(--s)">— 全${relWords.length}語</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <button type="button" class="btn-ac btn-xs" onclick="VocabGraph.focusRoot('${escJsAttr(r.label)}'); VocabGraph.startWateringReview()" style="font-weight:700;color:#ffffff !important">この語根を水やり復習</button>
            </div>
          </div>
          <div style="padding:6px 0">${branchHtml}</div>
        </div>
      `;
    }).join('');

    wrap.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--b)">
        <div style="font-size:13px;font-weight:700;color:var(--t)">インタラクティブ・語源マインドマップ (アウトライナー)</div>
        <div style="display:flex;gap:6px">
          <button type="button" class="btn-o btn-xs" onclick="window.print()" title="A4語源チートシートとして印刷">A4印刷 (チートシート)</button>
          <button type="button" class="btn-o btn-xs" onclick="VocabGraph.clearRootFocus()">全語根を展開</button>
        </div>
      </div>
      <div>${cardsHtml}</div>
    `;
  }

  /**
   * アイデア③: 「接頭辞 × 語根」パズル・マトリクス表示 (Morphology Grid)
   */
  function renderMorphologyMatrix() {
    const wrap = document.getElementById('graphMatrixWrap');
    if (!wrap) return;

    const escFn = global.esc || global.VocabCore?.esc || (s => String(s ?? ''));
    const isMask = graphState.treeMaskMode;
    const curLang = (global.VocabCore?.getActivePairConfig || global.getActivePairConfig)?.()?.srcLang || global.App?.srcLang || global.App?.lang || 'en';
    const activeLang = graphState.langFilter && graphState.langFilter !== 'all' ? graphState.langFilter : curLang;

    const isCjk = ['zh', 'ko', 'ja'].includes(activeLang);
    const prefixes = isCjk ? [
      { key: '不', label: '不- (否定・反対)' },
      { key: '無', label: '無- (欠如・無し)' },
      { key: '非', label: '非- (相違・非ず)' },
      { key: '超', label: '超- (超越・過度)' },
      { key: '再', label: '再- (反復・再び)' },
      { key: '総', label: '総- (全体・統括)' },
      { key: '多', label: '多- (多数・複数)' },
      { key: '自', label: '自- (自己・自然)' },
      { key: '相', label: '相- (相互・相手)' },
      { key: '反', label: '反- (対立・反抗)' },
      { key: '国', label: '国際- (国家・国際)' }
    ] : [
      { key: 'con', label: 'con- (共に)' },
      { key: 'sub', label: 'sub- (下に)' },
      { key: 'in', label: 'in- (中に/否定)' },
      { key: 'ex', label: 'ex- (外に)' },
      { key: 'per', label: 'per- (完全に)' },
      { key: 'trans', label: 'trans- (越えて)' },
      { key: 're', label: 're- (再び/後ろに)' },
      { key: 'pro', label: 'pro- (前に)' },
      { key: 'de', label: 'de- (離れて)' },
      { key: 'ad', label: 'ad- (向かって)' },
      { key: 'dis', label: 'dis- (分離)' }
    ];

    const { nodes } = buildGraphData(graphState.filterQuery, false, activeLang);
    let roots = nodes.filter(n => n.type === 'root').sort((a, b) => b.childCount - a.childCount);
    if (graphState.focusedRootKey) {
      const focused = roots.filter(r => r.label === graphState.focusedRootKey);
      if (focused.length) roots = focused;
    } else {
      roots = roots.slice(0, 16);
    }
    const words = nodes.filter(n => n.type === 'word');

    const headerThs = prefixes.map(p => `<th class="matrix-th">${escFn(p.label)}</th>`).join('');

    const rowsHtml = roots.map(r => {
      const rootWords = (r.connectedWords || []);

      const cellsHtml = prefixes.map(p => {
        // 接頭辞に合致する単語を検索
        const matched = rootWords.find(w => {
          const lWord = w.label.toLowerCase();
          const ety = String(w.item?.etymology || '').toLowerCase();
          if (isCjk) {
            return lWord.startsWith(p.key) || ety.includes(p.key) || lWord.includes(p.key);
          }
          return lWord.startsWith(p.key) || ety.includes(`${p.key}-`);
        });

        if (matched) {
          const now = Date.now();
          const rVal = global.VocabSRS?.getRetrievability ? global.VocabSRS.getRetrievability(matched.item, now) : 0.9;
          const bgPill = rVal >= 0.88 ? 'rgba(16, 185, 129, 0.15)' : (rVal >= 0.70 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(251, 113, 133, 0.15)');
          const borderPill = rVal >= 0.88 ? '#10b981' : (rVal >= 0.70 ? '#f59e0b' : '#fb7185');
          const meaningText = isMask ? '???' : escFn(matched.meaning);

          return `
            <td class="matrix-td">
              <div class="matrix-cell-pill" style="background:${bgPill};border:1px solid ${borderPill}" onclick="VocabGraph.jumpToNodeWord('${escJsAttr(matched.label)}','${escJsAttr(matched.lang || activeLang)}')">
                <strong style="font-size:12px;color:var(--t)">${escFn(matched.label)}</strong>
                <span style="font-size:10px;color:var(--s);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:90px" ${isMask ? `onclick="event.stopPropagation();this.textContent='${escJsAttr(matched.meaning)}'"` : ''}>${meaningText}</span>
              </div>
            </td>
          `;
        } else {
          return `
            <td class="matrix-td empty-slot" onclick="VocabGraph.promptMatrixGen('${escJsAttr(p.key)}','${escJsAttr(r.label)}')" title="${escFn(p.label)} + ${escFn(r.label)} をAIで発掘">
              <span style="font-size:10px;color:var(--m);font-family:var(--mono)">[+ 発掘]</span>
            </td>
          `;
        }
      }).join('');

      return `
        <tr>
          <th class="matrix-th sticky-col" style="white-space:nowrap">
            <span style="font-family:var(--mono);color:var(--ac);font-weight:700">${escFn(r.label)}</span>
            <div style="font-size:10px;color:var(--m)">${r.childCount}語</div>
          </th>
          ${cellsHtml}
        </tr>
      `;
    }).join('');

    wrap.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--b)">
        <div>
          <span style="font-size:13px;font-weight:700;color:var(--t)">接頭辞 × 語根 パズルマトリクス (Morphology Grid)</span>
          <span style="font-size:11px;color:var(--s);margin-left:8px">元素周期表のように未登録の派生語を発見・発掘できます</span>
        </div>
      </div>
      <table class="matrix-table">
        <thead>
          <tr>
            <th class="matrix-th sticky-col" style="min-width:110px">語根 ＼ 接頭辞</th>
            ${headerThs}
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    `;
  }

  /**
   * マトリクスの空きマスからAI生成キューへ追加
   */
  function promptMatrixGen(prefix, rootKey) {
    const toastFn = global.showToast || global.VocabCore?.showToast;
    const regFn = global.VocabQueue?.registerWordsList || global.VocabCore?.registerWordsList || global.registerWordsList;

    const prefixCandidateMap = {
      'con:*sta-': 'constant',
      'sub:*sta-': 'substance',
      'in:*sta-': 'instant',
      'ex:*sta-': 'extant',
      'dis:*sta-': 'distant',
      'con:*bher-': 'confer',
      'trans:*bher-': 'transfer',
      'de:*bher-': 'defer',
      'pro:*bher-': 'proffer',
      'con:*kap-': 'conceive',
      'per:*kap-': 'perceive',
      'de:*kap-': 'deceive',
      're:*kap-': 'receive',
      '不:*安': '不安',
      '不:*正': '不正',
      '不:*信': '不信',
      '無:*期': '無期',
      '無:*力': '無力',
      '非:*常': '非常',
      '超:*音': '超音',
      '再:*考': '再考',
      '再:*生': '再生',
      '総:*力': '総力',
      '自:*由': '自由',
      '相:*対': '相対',
      '反:*対': '反対'
    };

    let targetWord = prefixCandidateMap[`${prefix}:${rootKey}`];
    if (!targetWord && /^[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]$/.test(prefix)) {
      const cjkRoot = rootKey.replace(/^\*/, '').replace(/-$/, '').trim();
      if (/^[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]$/.test(cjkRoot)) {
        targetWord = `${prefix}${cjkRoot}`;
      }
    }
    if (targetWord && typeof regFn === 'function') {
      regFn([{ word: targetWord }], '', true, true);
      if (typeof toastFn === 'function') toastFn(`接頭辞パズルから単語「${targetWord}」をAI生成キューに追加しました！`, 'ok', 4000);
    } else {
      const toggleModalFn = global.toggleModal || global.VocabCore?.toggleModal;
      if (typeof toggleModalFn === 'function') toggleModalFn('graphModal', false);
      const inWord = typeof document !== 'undefined' ? document.getElementById('inWord') : null;
      if (inWord) {
        inWord.value = prefix;
        inWord.focus();
      }
      if (typeof toastFn === 'function') toastFn(`入力欄に接頭辞「${prefix}」をセットしました（語根: ${rootKey}）。`, 'info', 3000);
    }
  }


  function exportGraphImage() {
    const canvasWrap = document.getElementById('graphCanvasWrap');
    if (canvasWrap && canvasWrap.style.display === 'none') {
      const toastFn = global.showToast || global.VocabCore?.showToast;
      if (typeof toastFn === 'function') {
        toastFn('マインドマップ・表形式の出力には「A4印刷」機能をご利用いただけます。印刷ダイアログを開きます。', 'info', 3000);
      }
      window.print();
      return;
    }
    const canvas = graphState.canvas;
    if (!canvas) return;
    try {
      // 1200x630 (X/Twitter OGP最適サイズ) のオフスクリーンキャンバスを生成
      const offCanvas = document.createElement('canvas');
      offCanvas.width = 1200;
      offCanvas.height = 630;
      const octx = offCanvas.getContext('2d');

      // 1. 高級ダークコズミックグラデーション背景
      const grad = octx.createLinearGradient(0, 0, 1200, 630);
      grad.addColorStop(0, '#090a0f');
      grad.addColorStop(0.5, '#111425');
      grad.addColorStop(1, '#1b1236');
      octx.fillStyle = grad;
      octx.fillRect(0, 0, 1200, 630);

      // 2. メインCanvasのグラフネットワークを描画（中央に配置）
      const graphAspect = canvas.width / canvas.height;
      const targetH = 430;
      const targetW = targetH * graphAspect;
      const offsetX = (1200 - targetW) / 2;
      const offsetY = 75;
      octx.save();
      octx.strokeStyle = 'rgba(124, 58, 237, 0.25)';
      octx.lineWidth = 1;
      octx.strokeRect(offsetX - 2, offsetY - 2, targetW + 4, targetH + 4);
      octx.drawImage(canvas, offsetX, offsetY, targetW, targetH);
      octx.restore();

      // 3. 上部ブランドヘッダー
      octx.fillStyle = '#ffffff';
      octx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      octx.fillText('VOCAB VAULT — ETYMOLOGY LINEAGE TREE', 48, 48);

      octx.fillStyle = '#a78bfa';
      octx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      octx.fillText('MY INDO-EUROPEAN KNOWLEDGE CONSTELLATION (4-TIER GENEALOGY)', 48, 68);

      // 4. 下部スタッツプレート（総語彙数・語根数・定着度・主要語根）
      const statsY = 535;
      const allRoots = graphState.nodes.filter(n => n.type === 'root');
      const allWords = graphState.nodes.filter(n => n.type === 'word');
      const topRoots = [...allRoots].sort((a, b) => b.childCount - a.childCount).slice(0, 3).map(r => r.label).join(', ');

      // スタッツ背景ボックス
      octx.fillStyle = 'rgba(15, 23, 42, 0.78)';
      octx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      octx.lineWidth = 1;
      octx.beginPath();
      if (typeof octx.roundRect === 'function') {
        octx.roundRect(40, statsY - 20, 1120, 85, 10);
      } else {
        octx.rect(40, statsY - 20, 1120, 85);
      }
      octx.fill();
      octx.stroke();

      const isEn = (global.VocabI18n?.getLocale?.() || 'ja') !== 'ja';

      // スタッツ項目1: 登録語彙数
      octx.fillStyle = '#94a3b8';
      octx.font = '11.5px sans-serif';
      octx.fillText(isEn ? 'Total Words' : '総登録語彙数', 65, statsY + 6);
      octx.fillStyle = '#f8fafc';
      octx.font = 'bold 22px monospace';
      octx.fillText(`${allWords.length} ${isEn ? 'words' : '語'}`, 65, statsY + 36);

      // スタッツ項目2: 発掘した語根数
      octx.fillStyle = '#94a3b8';
      octx.font = '11.5px sans-serif';
      octx.fillText(isEn ? 'Discovered PIE Roots' : '発掘したPIE語根', 240, statsY + 6);
      octx.fillStyle = '#c084fc';
      octx.font = 'bold 22px monospace';
      octx.fillText(`${allRoots.length} ${isEn ? 'roots' : '語根'}`, 240, statsY + 36);

      // スタッツ項目3: 記憶健康度（実データ反映）
      const retStats = global.VocabAnkiView?.getOverallRetrievabilityStats
        ? global.VocabAnkiView.getOverallRetrievabilityStats(allWords.map(w => w.item).filter(Boolean))
        : { grade: 'A', avgPct: '90.0%' };
      octx.fillStyle = '#94a3b8';
      octx.font = '11.5px sans-serif';
      octx.fillText(isEn ? 'Memory Retention' : '記憶定着健康度', 440, statsY + 6);
      octx.fillStyle = '#10b981';
      octx.font = 'bold 22px sans-serif';
      octx.fillText(
        isEn ? `GRADE ${retStats.grade || 'A'} (${retStats.avgPct || '90%'} Retention)` : `GRADE ${retStats.grade || 'A'} (定着率 ${retStats.avgPct || '90%'})`,
        440,
        statsY + 36
      );

      // スタッツ項目4: 主要語根トップ3
      octx.fillStyle = '#94a3b8';
      octx.font = '11.5px sans-serif';
      octx.fillText(isEn ? 'Top Root Families' : '最強の語根クラスタ', 710, statsY + 6);
      octx.fillStyle = '#38bdf8';
      octx.font = 'bold 16px monospace';
      octx.fillText(topRoots || '*sta-, *bher-, *genh₁-', 710, statsY + 34);

      // 右下ブランドクレジット
      octx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      octx.font = '11px sans-serif';
      octx.textAlign = 'right';
      octx.fillText(isEn ? 'Vocab Vault | PIE Etymology & Adaptive FSRS Memory Engine' : 'Vocab Vault | 印欧祖語・概念史・FSRS忘却曲線単語帳', 1140, 615);
      octx.textAlign = 'left';

      const dataUrl = offCanvas.toDataURL('image/png');
      const fileName = `vocab-vault-lineage-tree-${new Date().toISOString().slice(0, 10)}.png`;
      if (global.webkit?.messageHandlers?.nativeSave) {
        const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
        global.webkit.messageHandlers.nativeSave.postMessage({ filename: fileName, base64, mime: 'image/png' });
      } else {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = fileName;
        a.click();
      }
      const toastFn = global.showToast || global.VocabCore?.showToast;
      if (typeof toastFn === 'function') {
        toastFn(isEn ? 'Constellation & Lineage Tree Share Card exported (1200x630px)!' : '語源星座・系統樹シェアカード（1200×630px）を出力しました！', 'ok', 4000);
      }
    } catch (e) {
      console.warn('[Graph Export Error]', e);
      try {
        const dataUrl = canvas.toDataURL('image/png');
        const fileName = `vocab-vault-graph-${new Date().toISOString().slice(0, 10)}.png`;
        if (global.webkit?.messageHandlers?.nativeSave) {
          const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
          global.webkit.messageHandlers.nativeSave.postMessage({ filename: fileName, base64, mime: 'image/png' });
        } else {
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = fileName;
          a.click();
        }
      } catch {}
    }
  }

  /**
   * 接頭辞・派生語の弁別対照マトリクス (干渉抑制・認知過負荷防止)
   */
  function renderPrefixContrastHtml(primaryRoot, currentWord) {
    if (!primaryRoot || !graphState.nodes) return '';
    const cleanK = cleanRootKey(primaryRoot);
    const rootNode = graphState.nodes.find(n => n.type === 'root' && (n.label === primaryRoot || cleanRootKey(n.label) === cleanK));
    if (!rootNode || !rootNode.connectedWords || rootNode.connectedWords.length < 2) return '';

    const escFn = global.esc || global.VocabCore?.esc || (s => String(s ?? ''));
    const words = rootNode.connectedWords.slice(0, 10);
    const rows = words.map(w => {
      const isCur = w.label.toLowerCase() === currentWord.label.toLowerCase();
      const bInfo = w.branchLabel || Layout().extractBranchInfo?.(w.item, primaryRoot, w.lang) || '';
      const cleanB = bInfo.replace(/^(Latin|Romance|Germanic|Greek|Borrowed|Italic|Sinospheric|Koreanic|Japonic):\s*/i, '');
      const m = w.meaning || w.item?.meanings?.[0]?.text || '';
      const core = w.item?.core || '';

      return `
        <div style="display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:4px;background:${isCur ? 'var(--ac-bg)' : 'transparent'};border:${isCur ? '1px solid var(--ac)' : '1px solid transparent'};margin-bottom:2px">
          <span style="font-size:10px;font-family:var(--mono);color:var(--ac);padding:1px 5px;background:var(--bg-hov);border-radius:3px;min-width:65px;text-align:center">${escFn(cleanB.slice(0, 15))}</span>
          <button type="button" class="btn-link" onclick="VocabGraph.jumpToNode('${escJsAttr(w.label)}')" style="font-size:11.5px;font-weight:${isCur ? '800' : '600'};color:${isCur ? 'var(--ac)' : 'var(--t)'};min-width:65px;background:none;border:none;padding:0;cursor:pointer;text-align:left">${escFn(w.label)}</button>
          <span style="font-size:11px;color:var(--s);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escFn(m)}</span>
          ${core ? `<span style="font-size:9.5px;color:var(--m);padding:1px 4px;border-radius:2px;background:var(--bg-card)">${escFn(core)}</span>` : ''}
        </div>
      `;
    }).join('');

    return `
      <div style="margin-top:10px;padding:8px 10px;background:var(--bg-card);border-radius:6px;border:1px solid var(--b)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <span style="font-size:10px;font-weight:700;color:var(--m)">接頭辞・派生語の弁別対照 (干渉抑制マトリクス):</span>
          <span style="font-size:9.5px;color:var(--ac);font-family:var(--mono)">${escFn(primaryRoot)}</span>
        </div>
        <div style="display:flex;flex-direction:column">${rows}</div>
      </div>
    `;
  }

  /**
   * 語根・古典分岐・つぼみ・単語詳細インスペクター (Drawer) の描画
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
      const isGlobalRoot = node.id === 'root:global:phyla' || node.id === 'root:east_asian:unified';
      const isCjkRoot = /^\*[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/.test(String(node.label || '')) || Boolean(node.id && node.id.includes('sinospheric'));
      const isJpRoot = /[\u3040-\u309F]/.test(String(node.label || '')) || Boolean(node.id && node.id.includes('japonic'));
      const isKoRoot = /[\uAC00-\uD7AF]/.test(String(node.label || '')) || Boolean(node.id && node.id.includes('koreanic'));

      let badgeText = '印欧祖語 (PIE Root)';
      let badgeBg = 'rgba(124, 58, 237, 0.15)';
      let badgeCol = '#a78bfa';

      if (isGlobalRoot) {
        badgeText = '世界諸語・大語族体系 (Global Phyla)';
        badgeBg = 'rgba(56, 189, 248, 0.15)';
        badgeCol = '#38bdf8';
      } else if (isCjkRoot) {
        badgeText = 'シノ・チベット語族 (Sino-Tibetan / 漢語字源)';
        badgeBg = 'rgba(244, 63, 94, 0.15)';
        badgeCol = '#fb7185';
      } else if (isJpRoot) {
        badgeText = '日本語族 (Japonic / 和語・和製漢語)';
        badgeBg = 'rgba(234, 179, 8, 0.15)';
        badgeCol = '#facc15';
      } else if (isKoRoot) {
        badgeText = '朝鮮語族 (Koreanic / 固有語・漢字音)';
        badgeBg = 'rgba(251, 146, 60, 0.15)';
        badgeCol = '#fb923c';
      } else if (node.isEikenRoot) {
        badgeText = '印欧祖語 (PIE Root) ・ 重要語根';
        badgeBg = 'rgba(234, 88, 12, 0.15)';
        badgeCol = '#ea580c';
      }

      badge.textContent = badgeText;
      badge.style.background = badgeBg;
      badge.style.color = badgeCol;
      title.textContent = node.label;

      const eStat = node.eikenStats || (global.VocabEikenCatalog ? global.VocabEikenCatalog.calcProgress(getEnglishPairKeyAndEntries().entries).find(s => cleanRootKey(s.rootKey) === cleanRootKey(node.label)) : null);
      const eikenProgHtml = eStat ? `
        <div style="margin-bottom:10px;padding:8px 10px;background:var(--bg-card);border-radius:6px;border:1px solid var(--b)">
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;margin-bottom:4px">
            <span style="font-weight:700;color:var(--t)">語彙スキルツリー進捗:</span>
            <span style="font-weight:750;color:#ea580c;font-family:var(--mono)">${eStat.learnedCount}/${eStat.total}語 (${eStat.percent}%)</span>
          </div>
          <div style="width:100%;height:6px;background:var(--b);border-radius:3px;overflow:hidden">
            <div style="width:${eStat.percent}%;height:100%;background:linear-gradient(90deg,#ea580c,#f59e0b);border-radius:3px;transition:width 0.3s ease"></div>
          </div>
          ${eStat.desc ? `<div style="font-size:11px;color:var(--s);margin-top:6px;line-height:1.35">${escFn(eStat.desc)}</div>` : ''}
        </div>
      ` : '';

      const cores = [...new Set((node.connectedWords || []).map(w => w.item?.core).filter(Boolean))].slice(0, 2);
      const coreHtml = cores.length ? `
        <div style="margin-bottom:10px;padding:8px 10px;background:var(--bg-card);border-radius:6px;border:1px solid var(--b)">
          <span style="font-size:10px;color:var(--m);font-weight:700">コア:</span>
          <div style="font-size:12.5px;font-weight:600;color:var(--t);margin-top:2px">${escFn(cores.join(' ／ '))}</div>
        </div>
      ` : (node.eikenMeaning ? `
        <div style="margin-bottom:10px;padding:8px 10px;background:var(--bg-card);border-radius:6px;border:1px solid var(--b)">
          <span style="font-size:10px;color:var(--m);font-weight:700">コア:</span>
          <div style="font-size:12.5px;font-weight:600;color:var(--t);margin-top:2px">${escFn(node.eikenMeaning)}</div>
        </div>
      ` : '');

      const langCountMap = {};
      (node.connectedWords || []).forEach(w => {
        const l = w.lang || 'en';
        langCountMap[l] = (langCountMap[l] || 0) + 1;
      });
      const langPills = Object.entries(langCountMap).map(([l, cnt]) => `
        <span style="font-size:10.5px;padding:2px 7px;border-radius:4px;background:var(--bg-hov);border:1px solid var(--b)">${(l || 'en').toUpperCase()}: ${cnt}語</span>
      `).join('');

      const wordsListHtml = (node.connectedWords || []).map(w => {
        const next = w.item?.nextReview || 0;
        const interval = Number(w.item?.interval) || 0;
        const isDue = next <= Date.now();
        const isMastered = interval >= 7;
        const statusCls = isDue ? 'due' : isMastered ? 'mastered' : 'learning';
        const statusTxt = isDue ? '復習期日' : isMastered ? '定着済' : '学習中';

        return `
          <div class="graph-peer-item" onclick="VocabGraph.selectNodeById('${escJsAttr(w.id)}')">
            <div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1">
              <span style="font-size:9.5px;padding:1px 4px;border-radius:3px;background:var(--bg-hov);font-family:var(--mono);font-weight:700">${escFn((w.lang || 'en').toUpperCase())}</span>
              <strong style="color:var(--t)">${escFn(w.label)}</strong>
              <span style="font-size:11px;color:var(--s);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escFn(w.meaning)}</span>
            </div>
            <div style="display:flex;align-items:center;gap:4px">
              <span class="graph-status-pill ${statusCls}">${statusTxt}</span>
            </div>
          </div>
        `;
      }).join('');

      const dummyItem = { word: node.label, lang: 'en', etymologyTags: [node.label] };
      const rMatrix = global.VocabMorphology?.buildCognateMatrix ? global.VocabMorphology.buildCognateMatrix(dummyItem, global.App?.rootIndexMap) : null;
      const rMatrixHtml = rMatrix ? (global.VocabMorphology?.renderCognateMatrixHtml ? global.VocabMorphology.renderCognateMatrixHtml(rMatrix) : '') : '';

      body.innerHTML = `
        ${eikenProgHtml}
        ${coreHtml}
        ${rMatrixHtml}
        <div style="display:flex;align-items:center;gap:6px;margin:10px 0 6px;flex-wrap:wrap">
          <span style="font-size:11px;color:var(--m)">派生語彙 (登録済 ${node.childCount}語):</span>
          ${langPills}
        </div>
        <div style="display:flex;flex-direction:column;gap:1px">
          ${wordsListHtml || '<div style="color:var(--m);padding:6px 0;font-size:12px">まだ登録された単語はありません。下のスキルノードをタップして解放しましょう！</div>'}
        </div>
      `;

      const unlockBranchBtn = (eStat && eStat.unlearnedCount > 0) ? `
        <button type="button" class="btn-ac btn-sm" onclick="VocabGraph.unlockCurrentRootEikenWords()" style="font-weight:700;display:flex;align-items:center;justify-content:center;gap:5px;background:linear-gradient(135deg,#ea580c,#f59e0b);border:none;color:#fff;margin-bottom:6px">
          <span>この系統樹を一括習得 (残り ${eStat.unlearnedCount}語)</span>
        </button>
      ` : '';

        const isRootCollapsed = graphState.collapsedRoots && graphState.collapsedRoots.has(cleanRootKey(node.label));
        const collapseBtnText = isRootCollapsed ? '子単語を展開' : '子単語を折りたたむ';
        footer.innerHTML = `
        ${unlockBranchBtn}
        ${node.childCount > 0 ? `
          <button type="button" class="btn-ac btn-sm" onclick="VocabGraph.startRootAnkiReview()" style="font-weight:700;display:flex;align-items:center;justify-content:center;gap:5px">
            <span>この語根をAnkiで集中特訓 (${node.childCount}語)</span>
          </button>
        ` : ''}
        <div style="display:flex;gap:6px">
          <button type="button" class="btn-o btn-xs" onclick="VocabGraph.toggleRootCollapse('${escJsAttr(node.label)}')" style="flex:1">${collapseBtnText}</button>
          <button type="button" class="btn-o btn-xs" onclick="VocabGraph.filterMainListByRoot('${escJsAttr(node.label)}')" style="flex:1">リストで絞り込み</button>
          <button type="button" class="btn-o btn-xs" onclick="VocabGraph.zoomToCluster(VocabGraph.graphState.selectedNode)" style="flex:1">クラスタにズーム</button>
        </div>
      `;
    } else if (node.type === 'branch') {
      // 第2階層: 古典分岐 (Branch)
      badge.textContent = '古典分岐 (Branch)';
      badge.style.background = 'rgba(217, 119, 6, 0.15)';
      badge.style.color = '#fbbf24';
      title.textContent = node.label;

      const leafWords = (node.connectedWords || []);
      const wordsListHtml = leafWords.map(w => `
        <div class="graph-peer-item" onclick="VocabGraph.selectNodeById('${escJsAttr(w.id)}')">
          <div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1">
            <span style="font-size:9.5px;padding:1px 4px;border-radius:3px;background:var(--bg-hov);font-family:var(--mono);font-weight:700">${escFn((w.lang || 'en').toUpperCase())}</span>
            <strong style="color:var(--t)">${escFn(w.label)}</strong>
            <span style="font-size:11px;color:var(--s);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escFn(w.meaning)}</span>
          </div>
        </div>
      `).join('');

      body.innerHTML = `
        <div style="margin-bottom:8px;padding:8px 10px;background:var(--bg-card);border-radius:6px;border:1px solid var(--b)">
          <span style="font-size:10px;color:var(--m);font-weight:700">源流印欧祖語:</span>
          <div style="font-size:13px;font-weight:700;color:var(--ac);margin-top:2px">${escFn(node.rootLabel)}</div>
        </div>
        <div style="font-size:11.5px;color:var(--m);margin-bottom:6px">この古典枝に属する単語 (全${leafWords.length}語):</div>
        <div style="display:flex;flex-direction:column;gap:1px">${wordsListHtml || '<div style="color:var(--m)">単語がありません</div>'}</div>
      `;

      footer.innerHTML = `
        <button type="button" class="btn-ac btn-sm" onclick="VocabGraph.startBranchAnkiReview()" style="font-weight:700">
          この古典枝の単語 (${leafWords.length}語) で集中特訓
        </button>
      `;
    } else if (node.type === 'ghost_bud') {
      // 第3階層: 未開拓のつぼみ (Ghost Bud / 英検準1級 スキルノード)
      const eData = node.eikenData || (global.VocabEikenCatalog ? global.VocabEikenCatalog.getWord(node.label) : null);
      if (eData) {
        badge.textContent = '語彙スキルロック (Locked Skill)';
        badge.style.background = 'rgba(234, 88, 12, 0.18)';
        badge.style.color = '#ea580c';
        title.innerHTML = `${escFn(node.label)} <span style="font-size:12px;color:var(--m);font-family:var(--mono);font-weight:400">${escFn(eData.phonetic || '')}</span>`;

        const meaningsHtml = (eData.meanings || []).map(m => `
          <div style="font-size:12.5px;color:var(--t);margin-bottom:2px">
            <span style="font-size:10px;padding:1px 4px;border-radius:3px;background:var(--bg-hov);font-weight:700;margin-right:4px">${escFn(m.pos)}</span>
            <strong>${escFn(m.text)}</strong>
          </div>
        `).join('');

        body.innerHTML = `
          <div style="margin-bottom:8px;padding:8px 10px;background:var(--bg-card);border-radius:6px;border:1px solid var(--b);display:flex;align-items:center;justify-content:space-between">
            <div>
              <span style="font-size:10px;color:var(--m);font-weight:700">源流印欧祖語:</span>
              <div style="font-size:13px;font-weight:700;color:var(--ac);margin-top:2px">${escFn(node.rootLabel)}</div>
            </div>
            <div style="font-size:10px;padding:2px 7px;border-radius:4px;background:rgba(234,88,12,0.12);color:#ea580c;font-weight:700">
              未習得スキル
            </div>
          </div>
          ${eData.core ? `
            <div style="margin-bottom:8px;padding:8px 10px;background:var(--bg-card);border-radius:6px;border:1px solid var(--b)">
              <span style="font-size:10px;color:var(--m);font-weight:700">コア:</span>
              <div style="font-size:12.5px;font-weight:600;color:var(--t);margin-top:2px">${escFn(eData.core)}</div>
            </div>
          ` : ''}
          <div style="margin-bottom:8px;padding:8px 10px;background:var(--bg-card);border-radius:6px;border:1px solid var(--b)">
            <span style="font-size:10px;color:var(--m);font-weight:700">語根からの進化・語源:</span>
            <div style="font-size:11.5px;color:var(--s);line-height:1.45;margin-top:2px">${escFn(eData.etymology)}</div>
          </div>
          <div style="margin-bottom:8px">
            <span style="font-size:10px;color:var(--m);font-weight:700">日本語訳:</span>
            ${meaningsHtml}
          </div>
          ${eData.example?.foreign ? `
            <div style="padding:8px 10px;background:var(--bg-card);border-radius:6px;border:1px solid var(--b)">
              <span style="font-size:10px;color:var(--m);font-weight:700">例文:</span>
              <div style="font-size:12px;color:var(--t);margin-top:2px;line-height:1.4">${escFn(eData.example.foreign)}</div>
              <div style="font-size:11px;color:var(--s);margin-top:2px">${escFn(eData.example.trans || eData.example.ja || '')}</div>
            </div>
          ` : ''}
        `;

        footer.innerHTML = `
          <button type="button" class="btn-ac btn-sm" onclick="VocabGraph.adoptGhostBud('${escJsAttr(node.label)}','${escJsAttr(node.rootLabel)}')" style="font-weight:700;width:100%;padding:10px;font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;background:linear-gradient(135deg,#ea580c,#f59e0b);border:none;box-shadow:0 4px 14px rgba(234,88,12,0.35);color:#fff;border-radius:6px;cursor:pointer">
            <span>スキルを習得する (+1語・単語帳に追加)</span>
          </button>
        `;
      } else {
        badge.textContent = '未開拓の派生語 (つぼみ)';
        badge.style.background = 'rgba(167, 139, 250, 0.15)';
        badge.style.color = '#c084fc';
        title.textContent = node.label;

        body.innerHTML = `
          <div style="padding:12px;background:var(--bg-card);border-radius:8px;border:1px solid var(--b);line-height:1.6">
            <div style="font-weight:700;color:var(--t);margin-bottom:4px">印欧祖語「${escFn(node.rootLabel)}」の重要語彙</div>
            <div style="font-size:12px;color:var(--s)">この単語はあなたの単語帳にまだ登録されていません。AI生成して系統樹の枝を大きく成長させましょう！</div>
          </div>
        `;

        footer.innerHTML = `
          <button type="button" class="btn-ac btn-sm" onclick="VocabGraph.adoptGhostBud('${escJsAttr(node.label)}','${escJsAttr(node.rootLabel)}')" style="font-weight:700;width:100%;padding:10px;font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;background:linear-gradient(135deg,#7c3aed,#2563eb);border:none;color:#fff;border-radius:6px;cursor:pointer">
            <span>この単語をAI生成して系統樹を育てる</span>
          </button>
        `;
      }
    } else if (node.type === 'twig') {
      // 第4階層: 派生小枝 (Twig)
      badge.textContent = '派生小枝 (Twig)';
      badge.style.background = 'rgba(148, 163, 184, 0.15)';
      badge.style.color = '#94a3b8';
      title.textContent = node.label;

      body.innerHTML = `
        <div style="padding:10px 12px;background:var(--bg-card);border-radius:8px;border:1px solid var(--b)">
          <div style="font-size:11px;color:var(--m)">親見出し語:</div>
          <strong style="font-size:14px;color:var(--t)">${escFn(node.parentWord)}</strong>
        </div>
      `;

      footer.innerHTML = `
        <button type="button" class="btn-ac btn-sm" onclick="VocabGraph.jumpToNodeWord('${escJsAttr(node.parentWord)}','en')">
          親単語カードを表示
        </button>
      `;
    } else {
      // 単語ノード (Leaf)
      const item = node.item || {};
      const nodeLang = (node.lang || item.lang || 'en').toLowerCase();
      const wordFamily = Layout().detectWordFamily ? Layout().detectWordFamily(item, nodeLang) : 'germanic';
      const famMeta = (Layout().ETYMOLOGY_FAMILIES && Layout().ETYMOLOGY_FAMILIES[wordFamily]) || { label: '印欧語族', shortLabel: '印欧', color: '#38bdf8' };

      badge.textContent = `${nodeLang.toUpperCase()} 単語 • ${famMeta.shortLabel || famMeta.label}`;
      badge.style.background = `${famMeta.color || '#38bdf8'}22`;
      badge.style.color = famMeta.color || '#38bdf8';
      title.textContent = node.label;

      const core = item.core ? `
        <div style="margin-bottom:8px;padding:8px 10px;background:var(--bg-card);border-radius:6px;border:1px solid var(--b)">
          <span style="font-size:10px;color:var(--m);font-weight:700">コア:</span>
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
        <button type="button" class="btn-o btn-xs" onclick="VocabGraph.selectNodeById('${escJsAttr(r.id)}')" style="font-family:var(--mono);border-color:var(--ac);color:var(--ac)">${escFn(r.label)}</button>
      `).join('');

      const wMatrix = global.VocabMorphology?.buildCognateMatrix ? global.VocabMorphology.buildCognateMatrix(item, global.App?.rootIndexMap) : null;
      const wMatrixHtml = wMatrix ? (global.VocabMorphology?.renderCognateMatrixHtml ? global.VocabMorphology.renderCognateMatrixHtml(wMatrix) : '') : '';

      // 語源の連鎖 (Lineage Chain Flow)
      const primaryRoot = (node.connectedRoots?.[0]?.label) || node.rootLabel || '';
      const primaryBranch = node.branchLabel || '';
      const lineageFlowHtml = primaryRoot ? `
        <div style="margin-bottom:10px;padding:8px 10px;background:var(--bg-card);border-radius:6px;border:1px solid var(--b)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:10px;color:var(--m);font-weight:700">語源の系統進化 (Lineage Flow):</span>
            <span style="font-size:9.5px;padding:1px 5px;border-radius:3px;background:${famMeta.color}18;color:${famMeta.color};font-weight:700">${escFn(famMeta.shortLabel || famMeta.label)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;font-size:11.5px;flex-wrap:wrap">
            <span style="padding:2px 7px;border-radius:4px;background:rgba(124,58,237,0.15);color:var(--ac);font-weight:700;font-family:var(--mono)">${escFn(primaryRoot)}</span>
            <span style="color:var(--m)">&rarr;</span>
            ${primaryBranch ? `<span style="padding:2px 7px;border-radius:4px;background:rgba(245,158,11,0.15);color:#fbbf24;font-weight:600">${escFn(primaryBranch)}</span><span style="color:var(--m)">&rarr;</span>` : ''}
            <span style="padding:2px 7px;border-radius:4px;background:rgba(56,189,248,0.15);color:#38bdf8;font-weight:700">${escFn(node.label)}</span>
          </div>
        </div>
      ` : '';

      // 同根語リスト (Cognates List)
      const rootNode = (node.connectedRoots?.[0]) || (primaryRoot ? graphState.nodes?.find(nd => nd.type === 'root' && (nd.label === primaryRoot || cleanRootKey(nd.label) === cleanRootKey(primaryRoot))) : null);
      const cognates = (rootNode?.connectedWords || []).filter(w => w.label !== node.label);
      const cognatesHtml = cognates.length ? `
        <div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--b)">
          <span style="font-size:10px;color:var(--m);font-weight:700;display:block;margin-bottom:5px">同根語 (${cognates.length}語・タップでジャンプ):</span>
          <div style="display:flex;flex-wrap:wrap;gap:4px">
            ${cognates.slice(0, 15).map(c => `
              <button type="button" class="btn-o btn-xs" onclick="VocabGraph.jumpToNode('${escJsAttr(c.label)}')" style="font-size:10.5px;padding:2px 6px" title="${escFn(c.meaning || '')}">
                <strong>${escFn(c.label)}</strong>
                <span style="color:var(--m);font-size:9.5px;margin-left:2px">${escFn(c.meaning ? c.meaning.slice(0, 6) : '')}</span>
              </button>
            `).join('')}
          </div>
        </div>
      ` : '';

      const isRegisteredInVocab = Boolean(
        global.App?.vocab?.[node.label] ||
        (Array.isArray(global.App?.entries) && global.App.entries.some(e => !e?.isDeleted && e.word === node.label))
      );

      // 10言語同根語対照マトリクス (Cross-Language Philological Alignment Matrix)
      const cognatesByLang = new Map();
      const allFamilyWords = [node, ...cognates];
      allFamilyWords.forEach(w => {
        const l = (w.lang || 'en').toLowerCase();
        if (!cognatesByLang.has(l)) cognatesByLang.set(l, []);
        cognatesByLang.get(l).push(w);
      });

      let multiLangMatrixHtml = '';
      if (cognatesByLang.size >= 2) {
        const langOrder = ['en', 'de', 'nl', 'fr', 'es', 'it', 'pt', 'zh', 'ko', 'ja'];
        const matrixRows = langOrder
          .filter(l => cognatesByLang.has(l))
          .map(l => {
            const wList = cognatesByLang.get(l) || [];
            const lCol = global.VocabGraphRenderer?.LANG_GRAPH_COLORS?.[l] || '#38bdf8';
            return `
              <div style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid var(--b);font-size:11px">
                <span style="width:24px;font-weight:700;font-size:10px;color:${lCol};text-transform:uppercase">${l}</span>
                <div style="display:flex;flex-wrap:wrap;gap:4px;flex:1">
                  ${wList.slice(0, 3).map(cw => `
                    <button type="button" class="btn-link" onclick="VocabGraph.jumpToNode('${escJsAttr(cw.label)}')" style="font-weight:600;color:var(--t);background:none;border:none;padding:0;cursor:pointer;text-decoration:underline">
                      ${escFn(cw.label)}
                    </button>
                    ${cw.meaning ? `<span style="color:var(--m);font-size:10px">(${escFn(cw.meaning.slice(0, 8))})</span>` : ''}
                  `).join(' ')}
                </div>
              </div>
            `;
          }).join('');

        multiLangMatrixHtml = `
          <div style="margin-top:10px;padding:8px 10px;background:var(--bg-card);border-radius:6px;border:1px solid var(--b)">
            <span style="font-size:10px;color:var(--m);font-weight:700;display:block;margin-bottom:4px">10言語同根語対照 (Cross-Language Cognates):</span>
            ${matrixRows}
          </div>
        `;
      }

      const isMaskMode = Boolean(graphState.treeMaskMode);
      const recallPromptHtml = isMaskMode ? `
        <div id="graphRecallMaskContainer" style="margin:8px 0;padding:12px;background:var(--bg-card);border:1.5px dashed var(--ac);border-radius:8px;text-align:center">
          <div style="font-size:10.5px;font-weight:700;color:var(--m);margin-bottom:4px">能動的想起テスト (Active Recall Mode)</div>
          <div style="font-size:12px;color:var(--s);margin-bottom:8px">この単語の原義コアイメージと現代語義を脳内で想起してください</div>
          <button type="button" class="btn-ac btn-sm" onclick="VocabGraph.revealRecallAnswer()" style="font-weight:700;width:100%;padding:6px 12px;font-size:12px">
            意味・語源を表示 (Spaceキー)
          </button>
        </div>
      ` : '';

      const contrastHtml = renderPrefixContrastHtml(primaryRoot, node);

      const srsPredict = (global.VocabSRS?.predictIntervals && item.id)
        ? global.VocabSRS.predictIntervals(item)
        : ['1分後', '1日後', '3日後', '7日後'];
      const lbl0 = escFn(srsPredict[0].replace('後', ''));
      const lbl1 = escFn(srsPredict[1].replace('後', ''));
      const lbl2 = escFn(srsPredict[2].replace('後', ''));
      const lbl3 = escFn(srsPredict[3].replace('後', ''));

      const srsRatingBarHtml = `
        <div id="graphRecallRatingBar" style="display:${isMaskMode ? 'none' : 'flex'};flex-direction:column;gap:5px;margin-top:10px;padding:8px 10px;background:var(--bg-card);border-radius:6px;border:1px solid var(--b)">
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;font-weight:700;color:var(--m)">
            <span>想起度評価 (FSRS忘却曲線を更新):</span>
            <span style="color:var(--ac);font-family:var(--mono)">[キー: 1, 2, 3, 4]</span>
          </div>
          <div style="display:flex;gap:4px;width:100%">
            <button type="button" class="btn-o btn-xs" onclick="VocabGraph.rateNodeWord(0)" style="flex:1;background:rgba(239,68,68,0.12);color:#ef4444;border-color:rgba(239,68,68,0.4);font-weight:700;padding:4px 0;text-align:center" title="忘却 (${escFn(srsPredict[0])})">1:忘却<br><span style="font-size:9px">${lbl0}</span></button>
            <button type="button" class="btn-o btn-xs" onclick="VocabGraph.rateNodeWord(1)" style="flex:1;background:rgba(245,158,11,0.12);color:#f59e0b;border-color:rgba(245,158,11,0.4);font-weight:700;padding:4px 0;text-align:center" title="困難 (${escFn(srsPredict[1])})">2:困難<br><span style="font-size:9px">${lbl1}</span></button>
            <button type="button" class="btn-o btn-xs" onclick="VocabGraph.rateNodeWord(2)" style="flex:1;background:rgba(16,185,129,0.12);color:#10b981;border-color:rgba(16,185,129,0.4);font-weight:700;padding:4px 0;text-align:center" title="良好 (${escFn(srsPredict[2])})">3:良好<br><span style="font-size:9px">${lbl2}</span></button>
            <button type="button" class="btn-o btn-xs" onclick="VocabGraph.rateNodeWord(3)" style="flex:1;background:rgba(56,189,248,0.12);color:#38bdf8;border-color:rgba(56,189,248,0.4);font-weight:700;padding:4px 0;text-align:center" title="簡単 (${escFn(srsPredict[3])})">4:簡単<br><span style="font-size:9px">${lbl3}</span></button>
          </div>
        </div>
      `;

      body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div>
            <span style="font-size:16px;font-weight:700;color:var(--t)">${escFn(node.label)}</span>
            <span style="font-size:12px;color:var(--s);font-family:var(--mono);margin-left:6px">${escFn(item.phonetic || '')}</span>
          </div>
          <button type="button" class="spk-btn" onclick="VocabGraph.speakNodeWord('${escJsAttr(node.label)}','${escJsAttr(node.lang)}')" title="発音を聞く" aria-label="発音"><svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg></button>
        </div>
        ${recallPromptHtml}
        <div id="graphRecallContent" style="display:${isMaskMode ? 'none' : 'block'}">
          ${lineageFlowHtml}
          ${core}
          <div style="margin-bottom:8px">${meanings}</div>
          ${contrastHtml}
          ${wMatrixHtml}
          ${multiLangMatrixHtml}
          ${ety}
          ${cognatesHtml}
        </div>
        ${srsRatingBarHtml}
      `;

      footer.innerHTML = `
        <div style="display:flex;gap:6px;width:100%;flex-wrap:wrap">
          <button type="button" class="btn-ac btn-sm" onclick="VocabGraph.jumpToNodeWord('${escJsAttr(node.label)}','${escJsAttr(node.lang)}')" style="flex:1">
            単語カードを表示
          </button>
          ${!isRegisteredInVocab ? `
            <button type="button" class="btn-ac-o btn-sm" onclick="VocabGraph.adoptGhostBud('${escJsAttr(node.label)}','${escJsAttr(primaryRoot)}')" style="flex:1;font-weight:700">
              単語帳に追加
            </button>
          ` : `
            <button type="button" class="btn-o btn-sm" onclick="VocabGraph.startRootAnkiReview()" style="flex:1">
              この同根語群を復習
            </button>
          `}
        </div>
      `;
    }
  }


  /**
   * 現在フォーカス中の語根の全未登録英検準1級単語を一括習得
   */
  function unlockCurrentRootEikenWords() {
    const rootKey = graphState.focusedRootKey;
    if (!rootKey || !global.VocabEikenCatalog) return;
    const words = global.VocabEikenCatalog.getWordsByRoot(rootKey);
    const { saveKey, entries: cur } = getEnglishPairKeyAndEntries();
    const registered = new Set(cur.filter(e => !e?.isDeleted).map(e => e.word.toLowerCase()));
    const unlearned = words.filter(w => !registered.has(w.word.toLowerCase()));
    const toastFn = global.showToast || global.VocabCore?.showToast;
    const makeWordKeyFn = global.VocabMorphology?.makeWordKey || ((w, l) => `${l}:${w.toLowerCase()}`);

    if (!unlearned.length) {
      if (typeof toastFn === 'function') toastFn('この語根のスキルはすべて習得済みです', 'ok', 3000);
      return;
    }

    const clearedAt = global.VocabStorage?.getClearedAt ? global.VocabStorage.getClearedAt(saveKey) : 0;
    const tombMap = global.VocabStorage?.getTombstones ? global.VocabStorage.getTombstones(saveKey) : null;
    let maxNum = cur.reduce((m, x) => Math.max(m, Number(x.num) || 0), 0);
    const now = Math.max(Date.now(), (Number(clearedAt) || 0) + 1);
    const toAdd = unlearned.map(item => {
      maxNum++;
      const cardId = `eiken_${now}_${Math.random().toString(36).slice(2, 7)}_${maxNum}`;
      const cardWk = makeWordKeyFn(item.word, 'en', item.meanings?.[0]?.pos, 1);
      if (tombMap) {
        tombMap.delete(`id:${cardId}`);
        tombMap.delete(`wk:${cardWk}`);
        tombMap.delete(`word:${String(item.word || '').trim().toLowerCase()}`);
      }
      return {
        ...item,
        id: cardId,
        wordKey: cardWk,
        homographIndex: 1,
        version: 1,
        num: maxNum,
        lang: 'en',
        category: '英検準1級',
        folder: `英検準1級 (${rootKey})`,
        interval: 0,
        repetition: 0,
        efactor: 2.5,
        nextReview: now,
        updatedAt: now,
        reviewUpdatedAt: now,
        isDeleted: false
      };
    });

    if (tombMap && global.VocabStorage?.saveTombstones) {
      global.VocabStorage.saveTombstones(saveKey, tombMap);
    }

    const rNode = graphState.nodes.find(n => n.type === 'root' && (n.label === rootKey || n.id === `root:${rootKey}`));
    if (rNode) {
      graphState.unlockParticles.push({
        x: rNode.x,
        y: rNode.y,
        radius: 12,
        maxRadius: 68,
        alpha: 1.0,
        color: '#fbbf24'
      });
    }
    graphState.nodes.filter(n => n.type === 'ghost_bud').forEach(b => {
      graphState.unlockParticles.push({
        x: b.x,
        y: b.y,
        radius: 6,
        maxRadius: 44,
        alpha: 0.9,
        color: '#38bdf8'
      });
    });

    playSkillUnlockSound();
    persistUnlockedEntries([...toAdd, ...cur], saveKey);
    if (typeof toastFn === 'function') {
      toastFn(`語根「${rootKey}」の語彙スキル（${toAdd.length}語）を一括習得しました！`, 'ok', 4000);
    }
    updateGraphDataAndFit();
    drawGraph();
    if (typeof renderMindmap === 'function') renderMindmap();
    if (typeof renderMorphologyMatrix === 'function') renderMorphologyMatrix();
  }

  /**
   * 英検準1級 スキルツリーの展開 / 語根ランキング目次ドロワーの開閉
   */
  function toggleEikenExplorer(forceState) {
    if (typeof document === 'undefined') return;
    const drawer = document.getElementById('graphEikenDrawer');
    const backdrop = document.getElementById('graphEikenBackdrop');
    const btn = document.getElementById('graphEikenExplorerBtn');

    // 閉じる指示（forceState === false）の場合は、ドロワーを閉じる
    if (forceState === false) {
      if (drawer) drawer.style.display = 'none';
      if (backdrop) backdrop.style.display = 'none';
      if (btn) btn.classList.remove('active');
      return;
    }

    if (!drawer) return;
    const isOpen = drawer.style.display !== 'none';
    const next = typeof forceState === 'boolean' ? forceState : !isOpen;
    drawer.style.display = next ? 'flex' : 'none';
    if (backdrop) backdrop.style.display = next ? 'block' : 'none';
    if (btn) btn.classList.toggle('active', next);
    if (next) {
      deselectNode();
      renderEikenExplorer();
    }
  }

  /**
   * 英検準1級 語根ランキング目次の描画
   */
  function renderEikenExplorer() {
    if (typeof document === 'undefined' || !global.VocabEikenCatalog) return;
    const listEl = document.getElementById('graphEikenList');
    if (!listEl) return;
    const stats = global.VocabEikenCatalog.calcProgress(getEnglishPairKeyAndEntries().entries);
    listEl.innerHTML = stats.map(s => `
      <div class="eiken-root-card ${graphState.focusedRootKey === s.rootKey ? 'active' : ''}" onclick="VocabGraph.focusRoot('${escJsAttr(s.rootKey)}');VocabGraph.toggleEikenExplorer(false)">
        <div class="eiken-root-hd">
          <div style="display:flex;align-items:center;gap:6px">
            <span class="eiken-root-rank">${Number(s.rank) || 0}位</span>
            <span class="eiken-root-key">${escFn(s.label)}</span>
            <span style="font-size:11px;color:var(--s)">（${escFn(s.meaning)}）</span>
          </div>
          <span class="eiken-root-prog-text">${Number(s.learnedCount) || 0}/${Number(s.total) || 0}語 (${Number(s.percent) || 0}%)</span>
        </div>
        <div class="eiken-prog-bar">
          <div class="eiken-prog-fill" style="width:${Number(s.percent) || 0}%"></div>
        </div>
        <div class="eiken-root-desc">${escFn(s.desc)}</div>
        <div class="eiken-word-preview">収録: ${(global.VocabEikenCatalog.getWordsByRoot(s.rootKey) || []).map(w => escFn(w.word)).join(', ')}</div>
      </div>
    `).join('');
  }


  global.VocabGraphViews = {
    populateRootJumpSelect,
    updateBreadcrumbUI,
    renderMindmap,
    renderMorphologyMatrix,
    promptMatrixGen,
    exportGraphImage,
    renderDetailDrawer,
    unlockCurrentRootEikenWords,
    toggleEikenExplorer,
    renderEikenExplorer
  };
})(typeof window !== 'undefined' ? window : globalThis);
