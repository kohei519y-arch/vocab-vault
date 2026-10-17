/**
 * Vocab Vault — Root Network Graph Module (js/graph.js)
 * 印欧祖語(PIE)語根ネットワーク、星系レイアウト、力学シミュレーション、ビューポートカリング、詳細インスペクター
 */
(function (global) {
  'use strict';

  const LANG_GRAPH_COLORS = {
    root: '#7c3aed',
    en: '#38bdf8',
    fr: '#a78bfa',
    de: '#fbbf24',
    ja: '#34d399'
  };

  const RETENTION_COLORS = {
    root: '#7c3aed',
    due: '#fb7185',
    new: '#60a5fa',
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
    layoutMode: 'network', // 'network' | 'tree' (4階層系統樹)
    activeViewTab: 'network', // 'network' | 'tree' | 'mindmap' | 'matrix'
    focusedRootKey: '', // 1語根フォーカスモードで選択中の語根 (例: '*sta-')
    treeMaskMode: false, // 赤シート (Mask) モード
    timelineEra: 3, // 0: 印欧祖語, 1: 古代ギリシャ・ローマ, 2: 中世古仏・ノルマン, 3: 近代・現代 (すべて)
    treeEasingFrame: 0,
    treeEasingTimer: null,
    collapsedBranches: new Set(),
    clusterOnly: false,
    physicsPaused: false,
    animId: null,
    isSleeping: true,
    touchDist: 0,
    eikenSkillMode: false,
    unlockParticles: []
  };

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

  // 学術語根・派生形の正規化エイリアスマップ（同根・表記ゆれを100%単一語根へ統合）
  const CANONICAL_ROOT_ALIASES = {
    // *sta- (立つ)
    'sta': '*sta-', 'stā': '*sta-', 'steh': '*sta-', 'steh2': '*sta-', 'steh₂': '*sta-', 'stah': '*sta-', 'stare': '*sta-', 'stāre': '*sta-', 'stand': '*sta-',
    // *gen- (生む)
    'gen': '*gen-', 'genh': '*gen-', 'genh1': '*gen-', 'genh₁': '*gen-', 'genə': '*gen-', 'gna': '*gen-', 'gnā': '*gen-', 'gene': '*gen-',
    // *bhrāthēr (兄弟)
    'bhrather': '*bhrāthēr', 'bhrater': '*bhrāthēr', 'bhrāter': '*bhrāthēr', 'bhrātēr': '*bhrāthēr', 'bhrehter': '*bhrāthēr', 'bhrehtēr': '*bhrāthēr', 'brother': '*bhrāthēr', 'bruder': '*bhrāthēr',
    // *mātēr (母)
    'mater': '*mātēr', 'māter': '*mātēr', 'mehtēr': '*mātēr', 'mehter': '*mātēr',
    // *pətēr (父)
    'pater': '*pətēr', 'pātēr': '*pətēr', 'pehter': '*pətēr',
    // *spec- (見る)
    'spec': '*spec-', 'spek': '*spec-', 'speḱ': '*spec-', 'spic': '*spec-', 'spect': '*spec-',
    // *kap- (掴む・頭)
    'kap': '*kap-', 'cap': '*kap-', 'cept': '*kap-', 'cip': '*kap-', 'kaput': '*kap-', 'caput': '*kap-',
    // *ten- (伸ばす)
    'ten': '*ten-', 'tend': '*ten-', 'ton': '*ten-', 'tenh': '*ten-', 'tenh2': '*ten-', 'tenh₂': '*ten-',
    // *dic- (言う・示す)
    'dic': '*dic-', 'deik': '*dic-', 'deyk': '*dic-', 'dict': '*dic-',
    // *vid- (見る・知る)
    'vid': '*vid-', 'weid': '*vid-', 'woyd': '*vid-', 'vis': '*vid-', 'wit': '*vid-',
    // *sed- (座る)
    'sed': '*sed-', 'sēd': '*sed-', 'sedh': '*sed-', 'sess': '*sed-', 'sit': '*sed-',
    // *voc- (呼ぶ・声)
    'voc': '*voc-', 'wek': '*voc-', 'wekw': '*voc-', 'wekʷ': '*voc-', 'vox': '*voc-',
    // *bher- (運ぶ)
    'bher': '*bher-', 'fer': '*bher-', 'phor': '*bher-',
    // *ped- (足)
    'ped': '*ped-', 'pod': '*ped-', 'pēd': '*ped-', 'pes': '*ped-',
    // *dhe- (置く・作る)
    'dhe': '*dhe-', 'dhē': '*dhe-', 'fac': '*dhe-', 'fec': '*dhe-', 'fic': '*dhe-',
    // *ag- (動かす・導く)
    'ag': '*ag-', 'aǵ': '*ag-', 'act': '*ag-', 'ig': '*ag-',
    // *mit- (送る)
    'mit': '*mit-', 'miss': '*mit-',
    // *ven- (来る)
    'ven': '*ven-', 'vent': '*ven-', 'gwem': '*ven-', 'gʷem': '*ven-',
    // *trah- (引く)
    'trah': '*trah-', 'tract': '*trah-', 'tragh': '*trah-',
    // *vert- (回る)
    'vert': '*vert-', 'vers': '*vert-', 'wer': '*vert-', 'wert': '*vert-'
  };

  /**
   * 語根キーの安全な正規化 & 表記ゆれ・同根統合（日本語言語名コロン等のノイズを完全排除）
   */
  function cleanRootKey(k) {
    if (!k) return '';
    const s = String(k).trim().toLowerCase();
    // 日本語の言語名ラベル（フランス語:, 中世ラテン語:, etc.）やコロン付きテキストは語根ではないので完全に排除
    if (/[:：]/.test(s) || /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(s)) {
      return '';
    }
    const rawClean = s.replace(/^\*/, '').replace(/-$/, '').trim();
    if (rawClean.length < 2) return '';

    const flat = rawClean
      .replace(/[āáàâä]/g, 'a')
      .replace(/[ēéèêë]/g, 'e')
      .replace(/[īíìîï]/g, 'i')
      .replace(/[ōóòôö]/g, 'o')
      .replace(/[ūúùûü]/g, 'u')
      .replace(/[h₁₂₃₄]/g, '');

    if (CANONICAL_ROOT_ALIASES[rawClean]) return CANONICAL_ROOT_ALIASES[rawClean];
    if (CANONICAL_ROOT_ALIASES[flat]) return CANONICAL_ROOT_ALIASES[flat];

    const normFn = global.VocabMorphology?.normRootKey || global.normRootKey || global.VocabCore?.normRootKey;
    if (typeof normFn === 'function') {
      const res = normFn(k);
      if (!res || /[:：]/.test(res) || /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(res)) return '';
      const resFlat = res.replace(/^\*/, '').replace(/-$/, '');
      if (CANONICAL_ROOT_ALIASES[resFlat]) return CANONICAL_ROOT_ALIASES[resFlat];
      return res.startsWith('*') ? res : `*${res}`;
    }
    return s.startsWith('*') ? s : `*${s}`;
  }

  /**
   * 語根キーの代表原義（コアイメージ・日本語意味）を取得（天体図ネットワークでの視覚的実用化）
   */
  function getRootMeaning(rootKey, connectedWords = []) {
    if (!rootKey) return '';
    const cleanK = cleanRootKey(rootKey);
    if (!cleanK) return '';
    const rawK = cleanK.replace(/^\*/, '').replace(/-$/, '').toLowerCase();

    // 1. BUILTIN_ETYMOLOGY_KNOWLEDGE の照合
    const builtinRoots = (global.VocabDictionary?.BUILTIN_ETYMOLOGY_KNOWLEDGE || global.BUILTIN_ETYMOLOGY_KNOWLEDGE)?.roots || {};
    for (const [k, info] of Object.entries(builtinRoots)) {
      const bRaw = k.replace(/^\*/, '').replace(/-$/, '').toLowerCase();
      if (bRaw === rawK || bRaw.replace(/h[1-4]/g, '') === rawK.replace(/h[1-4]/g, '')) {
        if (info.meaning) {
          return info.meaning.split(/[,、/／]/).slice(0, 2).join('・').trim();
        }
      }
    }

    // 2. VocabEikenCatalog の照合
    if (global.VocabEikenCatalog) {
      const getRootFn = typeof global.VocabEikenCatalog.getRoot === 'function'
        ? global.VocabEikenCatalog.getRoot.bind(global.VocabEikenCatalog)
        : (rk => (global.VocabEikenCatalog.ROOTS || []).find(r => r && (r.rootKey === rk || (r.rootKey && r.rootKey.replace(/^\*/, '').replace(/-$/, '') === (rk || '').replace(/^\*/, '').replace(/-$/, '')))));
      const eikenRoot = getRootFn(cleanK) || getRootFn(`*${rawK}-`) || getRootFn(`*${rawK}`);
      if (eikenRoot?.meaning) {
        return eikenRoot.meaning.split(/[,、/／]/).slice(0, 2).join('・').trim();
      }
    }

    // 3. 接続単語の語源解説文 (etymology) 内の括弧から抽出
    if (Array.isArray(connectedWords) && connectedWords.length > 0) {
      for (const w of connectedWords) {
        const ety = String(w.item?.etymology || '');
        const escRaw = rawK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = ety.match(new RegExp(`\\*${escRaw}[^\\(（]*[\\(（]([^\\)）]{1,12})[\\)）]`, 'i'));
        if (match && match[1]) {
          const m = match[1].split(/[,、/／]/).slice(0, 2).join('・').trim();
          if (m && !m.includes('http') && m.length <= 10) return m;
        }
      }
      for (const w of connectedWords) {
        if (w.item?.core && typeof w.item.core === 'string' && w.item.core.length <= 10) {
          return w.item.core.split(/[,、/／]/)[0].trim();
        }
      }
    }

    return '';
  }

  /**
   * ノードオブジェクトまたはプロパティから語根キー（*sta- 等）を安全に抽出
   */
  function resolveRootKey(n) {
    if (!n) return '';
    if (typeof n.rootLabel === 'string' && n.rootLabel.trim().length > 0) return n.rootLabel.trim();
    if (Array.isArray(n.connectedRoots) && n.connectedRoots.length > 0) {
      const first = n.connectedRoots[0];
      if (typeof first === 'string' && first.trim().length > 0) return first.trim();
      if (first && typeof first.label === 'string' && first.label.trim().length > 0) return first.label.trim();
    }
    return '';
  }

  /**
   * 語源テキスト・接頭辞から古典分岐（第2階層: Branch）を抽出
   */
  function extractBranchInfo(item, rootKey) {
    const ety = String(item?.etymology || '').toLowerCase();
    const word = String(item?.word || '').toLowerCase();
    const lang = String(item?.lang || 'en').toLowerCase();

    // 1. ラテン語・ロマンス諸語の主要接頭辞
    const prefixes = [
      { p: 'con', label: 'con- (共に)' },
      { p: 'com', label: 'com- (共に)' },
      { p: 'sub', label: 'sub- (下に)' },
      { p: 'in', label: 'in- (中に/否定)' },
      { p: 'im', label: 'im- (中に/否定)' },
      { p: 'ex', label: 'ex- (外に)' },
      { p: 'per', label: 'per- (完全に)' },
      { p: 'trans', label: 'trans- (越えて)' },
      { p: 're', label: 're- (再び/後)' },
      { p: 'pro', label: 'pro- (前に)' },
      { p: 'pre', label: 'pre- (前に)' },
      { p: 'de', label: 'de- (離れて)' },
      { p: 'ad', label: 'ad- (向かって)' },
      { p: 'ob', label: 'ob- (対して)' },
      { p: 'dis', label: 'dis- (分離)' },
      { p: 'inter', label: 'inter- (相互)' }
    ];

    // フランス語 / ロマンス諸語
    if (lang === 'fr' || ety.includes('french') || ety.includes('français') || ety.includes('fr.')) {
      const matched = prefixes.find(pr => word.startsWith(pr.p) || ety.includes(`${pr.p}-`));
      if (matched) return `Romance: ${matched.label}`;
      return 'Romance: フランス・ロマンス語群';
    }

    // ドイツ語
    if (lang === 'de' || ety.includes('german') || ety.includes('deutsch')) {
      return 'Germanic: ドイツ語群幹';
    }

    // ゲルマン系語根・古英語（*sta- 含む）
    if (ety.includes('old english') || ety.includes('proto-germanic') || ety.includes('germanic') || ety.includes('anglo-saxon') || ety.includes('norse')) {
      if (rootKey === '*sta-' && (word.includes('stand') || word.includes('stund') || word.includes('steh'))) {
        return 'Germanic: *standaną (立つ)';
      }
      return 'Germanic: ゲルマン祖語幹';
    }

    // ギリシャ語系
    if (ety.includes('greek') || ety.includes('hellenic') || word.startsWith('tele') || word.startsWith('photo') || word.startsWith('dia') || word.startsWith('syn') || word.startsWith('sym') || word.startsWith('anti') || word.startsWith('auto') || word.startsWith('micro') || word.startsWith('macro')) {
      return 'Greek: ギリシャ古典語幹';
    }

    // ラテン系英語（接頭辞あり、またはetymologyにlatin記載）
    const matchedPrefix = prefixes.find(pr => word.startsWith(pr.p) || ety.includes(`${pr.p}-`));
    if (matchedPrefix) {
      return `Latin: ${matchedPrefix.label}`;
    }
    if (ety.includes('latin') || ety.includes('lat.')) {
      if (rootKey === '*sta-') return 'Latin: stāre (立つ)';
      return 'Latin: 古典ラテン語幹';
    }

    // 日本語借用語
    if (lang === 'ja') {
      return 'Borrowed: 外来・学術受容';
    }

    // 英語の標準語根派生（接頭辞なしの基本語は西ゲルマン語群へ自然に分類）
    return 'Germanic: 西ゲルマン語群 (Old English)';
  }

  /**
   * 単語帳データから語根グラフネットワークデータを構築（通常星系 / 4階層系統樹両対応）
   */
  function buildGraphData(filterRootKey = '', clusterOnly = false, langFilter = 'all') {
    const nodes = [];
    const rootMap = new Map();
    const nodeMap = new Map();
    const isTree = (graphState.layoutMode === 'tree');

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

        // 1. 語根タグの取得（未設定の場合は解説文から正規表現フォールバック抽出・結果をメモ化）
        let itemRoots = item._cachedRoots;
        if (!itemRoots) {
          itemRoots = (Array.isArray(item.etymologyTags) ? item.etymologyTags : [])
            .map(cleanRootKey)
            .filter(r => r && isValidRootFn(r, item));

          if (!itemRoots.length && item.etymology) {
            const matches = String(item.etymology).match(/\*([a-zāēīōūăĕĭŏŭáéíóúàèìòùâêîôûəǭḗh₁₂₃₄ḱǵʷʰ]+(?:-[a-zāēīōūăĕĭŏŭáéíóúàèìòùâêîôûəǭḗh₁₂₃₄ḱǵʷʰ]*)?)/gi);
            if (matches) {
              itemRoots = matches.map(cleanRootKey).filter(r => r && isValidRootFn(r, item));
            }
          }
          item._cachedRoots = itemRoots;
        }

        if (!itemRoots.length) return;

        const wId = `word:${srcL}:${item.word}#${item.homographIndex || 1}`;
        let wNode = nodeMap.get(wId);
        if (!wNode) {
          wNode = {
            id: wId,
            label: item.word,
            type: 'word',
            level: 3,
            lang: srcL,
            meaning: item.meanings?.[0]?.text || '',
            pos: item.meanings?.[0]?.pos || '',
            radius: 8.0,
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
              level: 1,
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

    // 英検準1級 頻出語根カタログのスキルツリー統合
    const eikenProgressMap = new Map();
    if (global.VocabEikenCatalog) {
      const eStats = global.VocabEikenCatalog.calcProgress(getEnglishPairKeyAndEntries().entries);
      eStats.forEach(s => {
        const cleanK = cleanRootKey(s.rootKey);
        eikenProgressMap.set(cleanK, s);
      });

      // 系統樹モード (isTree) またはスキルツリーモード時は、未開拓の準1級語根も全てツリーに包含
      if (isTree || graphState.eikenSkillMode) {
        global.VocabEikenCatalog.getRoots().forEach(r => {
          const rKey = cleanRootKey(r.rootKey);
          if (targetRoot && !rKey.includes(targetRoot.replace(/^\*/, ''))) return;

          let rNode = rootMap.get(rKey);
          if (!rNode) {
            rNode = {
              id: `root:${rKey}`,
              label: rKey,
              type: 'root',
              level: 1,
              radius: 14.0,
              x: 0,
              y: 0,
              vx: 0,
              vy: 0,
              childCount: 0,
              connectedRoots: [],
              connectedWords: [],
              isEikenRoot: true,
              eikenRank: r.rank,
              eikenMeaning: r.meaning,
              eikenDesc: r.desc,
              isLockedRoot: true
            };
            rootMap.set(rKey, rNode);
          } else {
            rNode.isEikenRoot = true;
            rNode.eikenRank = r.rank;
            rNode.eikenMeaning = r.meaning;
            rNode.eikenDesc = r.desc;
          }
          const pStat = eikenProgressMap.get(rKey);
          if (pStat) {
            rNode.eikenStats = pStat;
          }
        });
      }
    }

    let finalRoots = Array.from(rootMap.values());

    // 2語以上接続する重要語根クラスタのみに絞り込み（スキルツリーモード時は準1級語根を保持）
    if (clusterOnly && !graphState.eikenSkillMode) {
      finalRoots = finalRoots.filter(r => r.childCount >= 2 || r.isEikenRoot);
    }

    const validWordIds = new Set();
    const finalEdges = [];
    const registeredWordsLower = new Set(Array.from(nodeMap.values()).map(w => w.label.toLowerCase()));
    const builtinRoots = (global.VocabDictionary?.BUILTIN_ETYMOLOGY_KNOWLEDGE || global.BUILTIN_ETYMOLOGY_KNOWLEDGE)?.roots || {};

    if (!isTree) {
      // --- 通常の星系ネットワークモード ---
      let activeRoots = finalRoots;
      if (graphState.focusedRootKey) {
        const found = finalRoots.filter(r => r.label === graphState.focusedRootKey);
        if (found.length > 0) {
          activeRoots = found;
        }
      }

      activeRoots.forEach(rNode => {
        rNode.radius = rNode.childCount >= 5 ? 18.0 : (rNode.childCount >= 3 ? 15.0 : (rNode.childCount >= 2 ? 12.5 : 10.0));
        nodes.push(rNode);
        rNode.connectedWords.forEach(wNode => {
          validWordIds.add(wNode.id);
          finalEdges.push({ source: rNode, target: wNode, kind: 'direct' });
        });
      });

      nodeMap.forEach(wNode => {
        if (validWordIds.has(wNode.id)) {
          nodes.push(wNode);
        }
      });

      // 星系アイランド初期配置（適切な間隔で重なりを防止）
      const totalRoots = activeRoots.length;
      const cols = Math.max(1, Math.ceil(Math.sqrt(totalRoots * 1.55)));
      const spacing = 340;

      activeRoots.forEach((rNode, idx) => {
        const row = Math.floor(idx / cols);
        const col = idx % cols;
        const jitterX = (Math.random() - 0.5) * 30;
        const jitterY = (Math.random() - 0.5) * 30;
        rNode.x = (col - cols / 2) * spacing + jitterX;
        rNode.y = (row - Math.ceil(totalRoots / cols) / 2) * spacing + jitterY;
        rNode.vx = 0;
        rNode.vy = 0;
      });

      const placedWords = new Set();
      activeRoots.forEach(rNode => {
        const cCount = rNode.connectedWords.length;
        rNode.connectedWords.forEach((wNode, cIdx) => {
          if (!placedWords.has(wNode.id)) {
            placedWords.add(wNode.id);
            const angle = (cIdx / Math.max(1, cCount)) * Math.PI * 2;
            const dist = 75 + (cIdx % 4) * 18;
            wNode.x = rNode.x + Math.cos(angle) * dist;
            wNode.y = rNode.y + Math.sin(angle) * dist;
            wNode.vx = 0;
            wNode.vy = 0;
          }
        });
      });
    } else {
      // --- 4階層・言語進化系統樹 & スキルツリー (Lineage Skill Tree) モード ---
      const branchMap = new Map();
      const ghostBuds = [];
      const twigs = [];

      const isUnifiedPIE = !graphState.focusedRootKey;
      let activeRoots = finalRoots;

      if (isUnifiedPIE) {
        // 全語根を1つの「印欧祖語 / PIE」コアに大統合
        const unifiedPieRoot = {
          id: 'root:pie:unified',
          label: '印欧祖語 (PIE)',
          meaning: 'Proto-Indo-European',
          type: 'root',
          level: 1,
          radius: 26.0,
          childCount: 0,
          connectedWords: [],
          x: 0,
          y: 0,
          targetX: 0,
          targetY: 0,
          vx: 0,
          vy: 0
        };
        const allConnectedWordsSet = new Set();
        finalRoots.forEach(r => {
          (r.connectedWords || []).forEach(w => {
            if (!allConnectedWordsSet.has(w.id)) {
              allConnectedWordsSet.add(w.id);
              unifiedPieRoot.connectedWords.push(w);
            }
          });
        });
        unifiedPieRoot.childCount = unifiedPieRoot.connectedWords.length;
        activeRoots = [unifiedPieRoot];
      } else if (graphState.focusedRootKey) {
        const found = finalRoots.filter(r => r.label === graphState.focusedRootKey);
        if (found.length > 0) {
          activeRoots = found;
        }
      }

      activeRoots.forEach(rNode => {
        rNode.level = 1;
        rNode.radius = isUnifiedPIE ? 26.0 : 18.0;
        const realmInfo = global.VocabMorphology?.getSemanticRealmForRoot
          ? global.VocabMorphology.getSemanticRealmForRoot(rNode.label)
          : { id: 'structure', label: '構造・物質 (Structure)', color: '#f472b6' };
        rNode.realm = realmInfo;
        nodes.push(rNode);

        // 第2階層: ブランチ (Branch) の抽出と接続
        const branchGroups = new Map();
        rNode.connectedWords.forEach(wNode => {
          validWordIds.add(wNode.id);
          const primRoot = wNode.connectedRoots?.[0]?.label || rNode.label;
          const bLabel = extractBranchInfo(wNode.item, primRoot);

          // 形態素語幹 (Level 4: Morphological Stem) の付与
          const stemInfo = global.VocabMorphology?.extractMorphologicalStem
            ? global.VocabMorphology.extractMorphologicalStem(wNode.label, primRoot, wNode.item)
            : { stem: '', label: '', core: '' };
          wNode.stem = stemInfo.stem;
          wNode.stemLabel = stemInfo.label;
          wNode.stemCore = stemInfo.core;
          wNode.realm = realmInfo;

          if (!branchGroups.has(bLabel)) branchGroups.set(bLabel, []);
          branchGroups.get(bLabel).push(wNode);
        });

        branchGroups.forEach((wordsInBranch, bLabel) => {
          // 同一語幹の単語を連続配置するためにソート
          wordsInBranch.sort((a, b) => (a.stem || '').localeCompare(b.stem || '') || (a.label || '').localeCompare(b.label || ''));

          const bId = isUnifiedPIE ? `branch:pie:${bLabel}` : `branch:${rNode.label}:${bLabel}`;
          let bNode = branchMap.get(bId);
          if (!bNode) {
            bNode = {
              id: bId,
              label: bLabel,
              type: 'branch',
              level: 2,
              rootLabel: rNode.label,
              realm: realmInfo,
              radius: 11.0,
              x: 0,
              y: 0,
              vx: 0,
              vy: 0,
              connectedWords: [],
              connectedBuds: []
            };
            branchMap.set(bId, bNode);
            nodes.push(bNode);
            finalEdges.push({ source: rNode, target: bNode, kind: 'root_to_branch' });
          }
          if (!bNode.connectedBuds) bNode.connectedBuds = [];
          wordsInBranch.forEach(wNode => {
            if (!bNode.connectedWords.includes(wNode)) bNode.connectedWords.push(wNode);
            finalEdges.push({ source: bNode, target: wNode, kind: 'branch_to_leaf' });
          });
        });

        // 第3階層: 未開拓のつぼみ (Ghost Buds / 英検準1級 Fog of War スキルノード) の抽出
        let unlearnedEikenWords = [];
        if (global.VocabEikenCatalog) {
          if (isUnifiedPIE) {
            const allRoots = global.VocabEikenCatalog.getRoots();
            for (let i = 0; i < Math.min(12, allRoots.length); i++) {
              const eList = global.VocabEikenCatalog.getWordsByRoot(allRoots[i].rootKey);
              unlearnedEikenWords.push(...eList.filter(w => !registeredWordsLower.has(w.word.toLowerCase())));
              if (unlearnedEikenWords.length >= 25) break;
            }
          } else {
            const eikenList = global.VocabEikenCatalog.getWordsByRoot(rNode.label);
            unlearnedEikenWords = eikenList.filter(w => !registeredWordsLower.has(w.word.toLowerCase()));
          }
        }

        let fallbackWords = [];
        if (isUnifiedPIE) {
          const bKeys = Object.keys(builtinRoots);
          for (let i = 0; i < Math.min(8, bKeys.length); i++) {
            const rk = bKeys[i];
            const fList = (builtinRoots[rk]?.words || [])
              .filter(w => !registeredWordsLower.has(w.toLowerCase()) && !unlearnedEikenWords.some(ew => ew.word.toLowerCase() === w.toLowerCase()))
              .map(w => ({ word: w, rootLabel: rk }));
            fallbackWords.push(...fList);
            if (fallbackWords.length >= 15) break;
          }
        } else {
          fallbackWords = (builtinRoots[rNode.label]?.words || [])
            .filter(w => !registeredWordsLower.has(w.toLowerCase()) && !unlearnedEikenWords.some(ew => ew.word.toLowerCase() === w.toLowerCase()))
            .map(w => ({ word: w }));
        }

        const allUnlearned = [...unlearnedEikenWords, ...fallbackWords];
        const limitCount = isTree ? 30 : 4;
        const unlearnedToShow = allUnlearned.slice(0, limitCount);

        unlearnedToShow.forEach(budItem => {
          const budWord = budItem.word;
          const budWordData = budItem.meanings ? budItem : (global.VocabEikenCatalog ? global.VocabEikenCatalog.getWord(budWord) : null);
          const primRoot = budItem.rootLabel || rNode.label;
          const bLabel = extractBranchInfo(budWordData, primRoot);

          const bId = isUnifiedPIE ? `branch:pie:${bLabel}` : `branch:${rNode.label}:${bLabel}`;
          let bNode = branchMap.get(bId);
          if (!bNode) {
            bNode = {
              id: bId,
              label: bLabel,
              type: 'branch',
              level: 2,
              rootLabel: rNode.label,
              radius: 11.0,
              x: 0,
              y: 0,
              vx: 0,
              vy: 0,
              connectedWords: [],
              connectedBuds: []
            };
            branchMap.set(bId, bNode);
            nodes.push(bNode);
            finalEdges.push({ source: rNode, target: bNode, kind: 'root_to_branch' });
          }
          if (!bNode.connectedBuds) bNode.connectedBuds = [];

          const budStem = global.VocabMorphology?.extractMorphologicalStem
            ? global.VocabMorphology.extractMorphologicalStem(budWord, primRoot, budWordData)
            : { stem: '', label: '', core: '' };
          const budId = `bud:${primRoot}:${budWord}`;
          const budNode = {
            id: budId,
            label: budWord,
            type: 'ghost_bud',
            level: 3,
            rootLabel: primRoot,
            branchLabel: bLabel,
            stem: budStem.stem,
            stemLabel: budStem.label,
            realm: rNode.realm,
            radius: 8.5,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            isLocked: true,
            isSkillNode: true,
            eikenData: budWordData
          };
          bNode.connectedBuds.push(budNode);
          ghostBuds.push(budNode);
          nodes.push(budNode);
          finalEdges.push({ source: bNode, target: budNode, kind: 'bud_edge' });
        });

        if (typeof document !== 'undefined') {
          const unlockBtn = document.getElementById('graphUnlockEikenRootBtn');
          if (unlockBtn) {
            if (unlearnedEikenWords.length > 0 && !isUnifiedPIE) {
              unlockBtn.style.display = 'inline-flex';
              unlockBtn.textContent = `この系統樹を一括習得 (${unlearnedEikenWords.length}語)`;
              unlockBtn.dataset.root = rNode.label;
            } else {
              unlockBtn.style.display = 'none';
            }
          }
        }
      });

      // 単語ノード（Leaf）の追加と第4階層（Twigs）の抽出
      nodeMap.forEach(wNode => {
        if (validWordIds.has(wNode.id)) {
          wNode.level = 3;
          nodes.push(wNode);

          // 派生語・熟語 (Twigs) の生成
          const derivatives = (wNode.item?.derivatives || []).slice(0, 2);
          const phrases = (wNode.item?.phrases || []).slice(0, 1);
          [...derivatives.map(d => ({ text: d?.word, kind: 'der' })), ...phrases.map(p => ({ text: p?.foreign, kind: 'phr' }))].forEach((sub, tIdx) => {
            if (!sub.text || sub.text.toLowerCase() === wNode.label.toLowerCase()) return;
            const twigId = `twig:${wNode.id}:${tIdx}:${sub.text}`;
            const tNode = {
              id: twigId,
              label: sub.text,
              type: 'twig',
              level: 4,
              parentWord: wNode.label,
              radius: 4.0,
              x: 0,
              y: 0,
              vx: 0,
              vy: 0
            };
            twigs.push(tNode);
            nodes.push(tNode);
            finalEdges.push({ source: wNode, target: tNode, kind: 'leaf_to_twig' });
          });
        }
      });

      // --- 放射状スキルツリー（Radial Skill Tree / 極座標レイアウト）確定座標計算 ---
      // 同心円半径 (Radius / r):
      // r = 0   : 中心 印欧祖語ノード (Root: 印欧祖語 / PIE)
      // r = 120 : 第1軌道 古典分岐ノード (Branch: ゲルマン語派、イタリック語派など)
      // r = 250〜: 第2軌道〜 多重同心円スタガーによる現代語ノード (Multi-orbit Staggered Leaves: 250, 286, 322, 358px)
      // r = 380〜: 第3軌道〜 未開拓のつぼみ & 派生小枝 (Ghost Buds & Twigs)

      // セクター（Angle / θ）による言語系統の空間分類:
      // 1. ゲルマン語系 (Germanic / 古英語): 上部 (10時〜2時の方向: -3π/4 〜 -π/4)
      // セクター（Angle / θ）による言語系統の空間分類:
      function classifyBranchSector(bLabel) {
        const bl = String(bLabel || '').toLowerCase();
        if (bl.includes('germanic') || bl.includes('old english') || bl.includes('proto-germanic') || bl.includes('de')) {
          return 'germanic';
        }
        if (bl.includes('latin') || bl.includes('romance') || bl.includes('fr')) {
          return 'latin';
        }
        return 'greek_other';
      }

      const isSingleRoot = (activeRoots.length === 1);
      const cols = Math.max(1, Math.ceil(Math.sqrt(activeRoots.length * 1.4)));
      const rootSpacing = 1950;

      activeRoots.forEach((rNode, rIdx) => {
        if (isSingleRoot) {
          rNode.targetX = 0;
          rNode.targetY = 0;
        } else {
          const row = Math.floor(rIdx / cols);
          const col = rIdx % cols;
          rNode.targetX = (col - (cols - 1) / 2) * rootSpacing;
          rNode.targetY = (row - Math.ceil(activeRoots.length / cols) / 2) * rootSpacing;
        }

        const rBranches = Array.from(branchMap.values()).filter(b => b.rootLabel === rNode.label);
        const sectorBranches = {
          germanic: [],
          latin: [],
          greek_other: []
        };

        rBranches.forEach(bNode => {
          const sec = classifyBranchSector(bNode.label);
          sectorBranches[sec].push(bNode);
        });

        // 言語系統ごとの単語数に応じた動的セクター角度割り当て（ラテン系などの過密セクターに十分な角度領域を確保）
        const secWeights = {};
        let totalWeight = 0;
        ['germanic', 'latin', 'greek_other'].forEach(k => {
          const bList = sectorBranches[k];
          const wCount = bList.reduce((acc, b) => acc + Math.max(2, (b.connectedWords?.length || 0) + (b.connectedBuds?.length || 0) * 0.5), 0);
          const w = bList.length > 0 ? Math.max(4, wCount) : 0;
          secWeights[k] = w;
          totalWeight += w;
        });

        const fullCircle = Math.PI * 2;
        const activeSecKeys = ['germanic', 'latin', 'greek_other'].filter(k => sectorBranches[k].length > 0);
        const dynamicSectorDefs = {};

        if (activeSecKeys.length === 1) {
          const onlyKey = activeSecKeys[0];
          dynamicSectorDefs[onlyKey] = {
            start: -Math.PI,
            end: Math.PI,
            center: 0
          };
        } else {
          // 基準開始角度: ゲルマン系を上部（-3π/4）、ラテン系を右〜下部、ギリシャ系を左下へ自然に配分
          const minAnglePerActive = 0.70; // 最低40度保証
          const remainingAngle = Math.max(0.5, fullCircle - activeSecKeys.length * minAnglePerActive);
          let currentStart = -3 * Math.PI / 4;

          ['germanic', 'latin', 'greek_other'].forEach(secKey => {
            const bList = sectorBranches[secKey];
            if (bList.length === 0) return;
            const proportion = totalWeight > 0 ? (secWeights[secKey] / totalWeight) : (1 / activeSecKeys.length);
            const span = minAnglePerActive + remainingAngle * proportion;
            dynamicSectorDefs[secKey] = {
              start: currentStart,
              end: currentStart + span,
              center: currentStart + span / 2
            };
            currentStart += span;
          });
        }

        // 言語系統ごとにセクターを割り当て、重なりを防止して等間隔・重み付け配置
        ['germanic', 'latin', 'greek_other'].forEach(secKey => {
          const sDef = dynamicSectorDefs[secKey];
          const bList = sectorBranches[secKey];
          if (!sDef || !bList || bList.length === 0) return;
          const numB = bList.length;

          const pad = 0.05; // 境界線とのパディング
          const totalSpan = (sDef.end - sDef.start) - pad * 2;

          // セクター内の各ブランチの単語数（重み）を計算
          const totalWordsInSector = bList.reduce((sum, b) => sum + Math.max(2.5, (b.connectedWords?.length || 0) + (b.connectedBuds?.length || 0) * 0.5), 0);

          let currentTheta = sDef.start + pad;

          bList.forEach((bNode, bIdx) => {
            const bWords = (bNode.connectedWords?.length || 0) + (bNode.connectedBuds?.length || 0) * 0.5;
            const weight = (numB === 1) ? 1.0 : Math.max(2.5, bWords) / Math.max(1, totalWordsInSector);
            const branchSpan = (numB === 1) ? totalSpan : totalSpan * weight;
            const thetaB = (numB === 1) ? sDef.center : (currentTheta + branchSpan / 2);
            currentTheta += branchSpan;

            // 第1軌道: 古典分岐ノード (r = 190〜370 4段階スタガー配置でブランチ同士のラベル接触・重合を完全解消)
            const bRadius = (numB <= 2) ? 220 : (190 + (bIdx % 4) * 60);
            bNode.targetX = rNode.targetX + bRadius * Math.cos(thetaB);
            bNode.targetY = rNode.targetY + bRadius * Math.sin(thetaB);
            bNode.angle = thetaB;

            // 第2軌道〜外周軌道: 現代語の学習済ノード (Multi-Orbit Staggering: 440px〜)
            // 3,000単語の大規模データに対応する適応型オービット計算
            // 単語数に応じてオービット層数を動的に最大18層まで拡張し、各軌道にハニカム千鳥配置
            const leaves = bNode.connectedWords || [];
            const leafCount = leaves.length;
            const minSpanForLeaves = Math.min(Math.PI * 0.70, Math.max(0.20, leafCount * 0.075));
            const lSpan = Math.max(branchSpan * 0.95, minSpanForLeaves);
            const lStart = thetaB - lSpan / 2;

            const numLeafOrbits = Math.min(18, Math.max(2, Math.ceil(Math.sqrt(leafCount * 2.0))));
            const baseLeafR = 440;
            const leafOrbitGap = leafCount > 80 ? 66 : (leafCount > 30 ? 76 : 85);

            const orbitBuckets = Array.from({ length: numLeafOrbits }, () => []);
            leaves.forEach((lNode, lIdx) => {
              orbitBuckets[lIdx % numLeafOrbits].push(lNode);
            });

            orbitBuckets.forEach((bucket, oIdx) => {
              const leafR = baseLeafR + oIdx * leafOrbitGap;
              const countInBucket = bucket.length;
              if (countInBucket === 0) return;

              const step = (countInBucket > 1) ? (lSpan / (countInBucket - 1)) : 0;
              const staggerShift = (countInBucket > 1 && oIdx % 2 === 1) ? (step * 0.5) : 0;

              bucket.forEach((lNode, bIdxInOrbit) => {
                const thetaL = (countInBucket === 1)
                  ? thetaB
                  : (lStart + step * bIdxInOrbit) + staggerShift;

                lNode.targetX = rNode.targetX + leafR * Math.cos(thetaL);
                lNode.targetY = rNode.targetY + leafR * Math.sin(thetaL);
                lNode.angle = thetaL;

                // 派生語・成句 (Twigs: 親単語から放射状に48px外側へ分岐)
                const myTwigs = twigs.filter(t => t.parentWord === lNode.label);
                myTwigs.forEach((tNode, tIdx) => {
                  const twigOffset = (myTwigs.length === 1) ? 0 : (tIdx === 0 ? -0.045 : 0.045);
                  const thetaT = thetaL + twigOffset;
                  tNode.targetX = lNode.targetX + 48 * Math.cos(thetaT);
                  tNode.targetY = lNode.targetY + 48 * Math.sin(thetaT);
                  tNode.angle = thetaT;
                });
              });
            });

            // 第3軌道以降: 未開拓のつぼみ (Ghost Buds: 単語軌道の外側にゆったり同心配置)
            const buds = bNode.connectedBuds || [];
            const budCount = buds.length;
            const bSpan = Math.max(0.16, branchSpan * 0.92);
            const budStart = thetaB - bSpan / 2;

            const maxLeafOrbitR = baseLeafR + (numLeafOrbits - 1) * leafOrbitGap;
            const budBaseR = Math.max(680, maxLeafOrbitR + 85);
            const numBudOrbits = budCount > 15 ? 3 : (budCount > 6 ? 2 : 1);
            const budOrbitGap = 65;

            const budBuckets = Array.from({ length: numBudOrbits }, () => []);
            buds.forEach((budNode, budIdx) => {
              budBuckets[budIdx % numBudOrbits].push(budNode);
            });

            budBuckets.forEach((bBucket, boIdx) => {
              const budR = budBaseR + boIdx * budOrbitGap;
              const countInBBucket = bBucket.length;
              if (countInBBucket === 0) return;

              const bStep = (countInBBucket > 1) ? (bSpan / (countInBBucket - 1)) : 0;
              const bStaggerShift = (countInBBucket > 1 && boIdx % 2 === 1) ? (bStep * 0.5) : 0;

              bBucket.forEach((budNode, bbIdx) => {
                const thetaBud = (countInBBucket === 1)
                  ? thetaB
                  : (budStart + bStep * bbIdx) + bStaggerShift;

                budNode.targetX = rNode.targetX + budR * Math.cos(thetaBud);
                budNode.targetY = rNode.targetY + budR * Math.sin(thetaBud);
                budNode.angle = thetaBud;
              });
            });
          });
        });
      });

      // 孤立したtwigがあれば親単語に紐づけて配置
      twigs.forEach((tNode, tIdx) => {
        if (tNode.targetX === undefined) {
          const parentNode = nodeMap.get(`word:en:${tNode.parentWord}#1`) || nodes.find(n => n.label === tNode.parentWord);
          if (parentNode && parentNode.targetX !== undefined) {
            const pAngle = parentNode.angle || 0;
            const thetaT = pAngle + (tIdx % 2 === 0 ? -0.040 : 0.040);
            tNode.targetX = parentNode.targetX + 44 * Math.cos(thetaT);
            tNode.targetY = parentNode.targetY + 44 * Math.sin(thetaT);
          }
        }
      });

      // ノード間の空間的重複をゼロにする高速空間ハッシュ緩和パス (O(N) Relaxation Pass - 3,000単語規模でも数ミリ秒で完了)
      const placedNodes = nodes.filter(n => n.targetX !== undefined && n.type !== 'root');
      const rCell = 70;
      const passes = placedNodes.length > 800 ? 4 : (placedNodes.length > 200 ? 7 : 12);

      for (let pass = 0; pass < passes; pass++) {
        const sGrid = new Map();
        for (let i = 0; i < placedNodes.length; i++) {
          const n = placedNodes[i];
          const cx = Math.floor(n.targetX / rCell);
          const cy = Math.floor(n.targetY / rCell);
          const key = (cx + 32768) * 65536 + (cy + 32768);
          let b = sGrid.get(key);
          if (!b) { b = []; sGrid.set(key, b); }
          b.push(n);
        }

        for (let i = 0; i < placedNodes.length; i++) {
          const na = placedNodes[i];
          const cx = Math.floor(na.targetX / rCell);
          const cy = Math.floor(na.targetY / rCell);

          for (let ox = -1; ox <= 1; ox++) {
            for (let oy = -1; oy <= 1; oy++) {
              const k = (cx + ox + 32768) * 65536 + (cy + oy + 32768);
              const neighborBucket = sGrid.get(k);
              if (!neighborBucket) continue;
              for (let m = 0; m < neighborBucket.length; m++) {
                const nb = neighborBucket[m];
                if (nb === na) continue;
                const dx = nb.targetX - na.targetX;
                const dy = nb.targetY - na.targetY;
                const distSq = dx * dx + dy * dy;
                const minDist = (na.type === 'branch' && nb.type === 'branch')
                  ? 68
                  : ((na.type === 'word' && nb.type === 'word') ? 56 : 46);
                if (distSq < minDist * minDist && distSq > 0.001) {
                  const dist = Math.sqrt(distSq);
                  const push = (minDist - dist) * 0.25;
                  const px = (dx / dist) * push;
                  const py = (dy / dist) * push;
                  na.targetX -= px;
                  na.targetY -= py;
                  nb.targetX += px;
                  nb.targetY += py;
                }
              }
            }
          }
        }
      }

      // 初期位置のセット
      nodes.forEach(n => {
        if (n.x === 0 && n.y === 0 && n.targetX !== undefined) {
          n.x = n.targetX;
          n.y = n.targetY;
        }
      });
    }

    // クイックジャンプ用セレクター (#graphRootJumpSel) & パンくずバーの動的更新
    populateRootJumpSelect(finalRoots);
    updateBreadcrumbUI(finalRoots);

    return { nodes, edges: finalEdges };
  }

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

    let html = '<option value="">全概念領域・全語根: 印欧祖語 (PIE) 大系統樹</option>';
    Object.entries(realms).forEach(([rk, rObj]) => {
      const rList = realmGroups[rk] || [];
      if (!rList.length) return;
      rList.sort((a, b) => b.childCount - a.childCount);
      html += `<optgroup label="[領域] ${rObj.label}">`;
      rList.forEach(r => {
        const m = r.rootMeaning || getRootMeaning(r.label, r.connectedWords);
        const mStr = m ? ` - ${m}` : '';
        html += `<option value="${r.label}">${r.label}${mStr} (${r.childCount}語)</option>`;
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
  function clearRootFocus() {
    graphState.focusedRootKey = '';
    if (typeof document !== 'undefined') {
      const sel = document.getElementById('graphRootJumpSel');
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
      const sel = document.getElementById('graphRootJumpSel');
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
      // モードごとの可視コントロール定義（認知的過負荷の根絶・文脈最適化）
      this.modeConfig = {
        network: ['searchBox', 'langFilter', 'rootJump', 'colorModeBtn', 'clusterBtn', 'physicsBtn', 'zoomControls', 'fitBtn'],
        tree: ['searchBox', 'rootJump', 'skillTreeBtn', 'wateringBtn', 'maskBtn', 'zoomControls', 'fitBtn'],
        mindmap: ['searchBox', 'langFilter', 'rootJump', 'maskBtn'],
        matrix: ['searchBox', 'langFilter']
      };
    }

    getControls() {
      if (typeof document === 'undefined') return {};
      return {
        searchBox: document.getElementById('graphFilterInput'),
        langFilter: document.getElementById('graphLangFilterSel'),
        rootJump: document.getElementById('graphRootJumpSel'),
        treeModeBtn: document.getElementById('graphTreeModeBtn'),
        skillTreeBtn: document.getElementById('graphEikenExplorerBtn'),
        colorModeBtn: document.getElementById('graphColorModeBtn'),
        clusterBtn: document.getElementById('graphClusterFilterBtn'),
        physicsBtn: document.getElementById('graphPhysicsBtn'),
        wateringBtn: document.getElementById('graphWateringBtn'),
        maskBtn: document.getElementById('graphTreeMaskBtn'),
        zoomControls: document.getElementById('graphZoomWrap') || document.getElementById('graphZoomVal')?.parentElement,
        fitBtn: document.getElementById('graphFitBtn') || document.querySelector('button[onclick*="fitGraphToView"]'),
        resetZoomBtn: document.getElementById('graphResetZoomBtn') || document.querySelector('button[onclick*="resetGraphZoom"]'),
        exportBtn: document.getElementById('graphExportBtn') || document.querySelector('button[onclick*="exportGraphImage"]')
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
    graphState.activeViewTab = mode;

    if (typeof document !== 'undefined') {
      // 1. UIの段階的開示（Progressive Disclosure）: モード別コントロールの表示・隠蔽
      graphUIManager.applyMode(mode);

      // 2. タブのアクティブクラス更新
      const tabs = ['network', 'tree', 'mindmap', 'matrix'];
      tabs.forEach(t => {
        const tabBtn = document.getElementById(`graphTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
        if (tabBtn) tabBtn.classList.toggle('active', t === mode);
      });

      const canvasWrap = document.getElementById('graphCanvasWrap');
      const mindmapWrap = document.getElementById('graphMindmapWrap');
      const matrixWrap = document.getElementById('graphMatrixWrap');
      const bcBar = document.getElementById('graphTreeBreadcrumbBar');
      const timelineBar = document.getElementById('graphTimelineBar');
      const physicsBtn = document.getElementById('graphPhysicsBtn');
      const treeModeBtn = document.getElementById('graphTreeModeBtn');

      if (mode === 'network') {
        graphState.layoutMode = 'network';
        if (canvasWrap) canvasWrap.style.display = 'block';
        if (mindmapWrap) mindmapWrap.style.display = 'none';
        if (matrixWrap) matrixWrap.style.display = 'none';
        if (bcBar) bcBar.style.display = 'none';
        if (timelineBar) timelineBar.style.display = 'none';
        if (treeModeBtn) { treeModeBtn.classList.remove('active'); treeModeBtn.textContent = '系統樹'; }
        graphState.physicsPaused = false;
        if (physicsBtn) { physicsBtn.classList.remove('active'); physicsBtn.textContent = '停止'; }
        updateGraphDataAndFit();
      } else if (mode === 'tree') {
        graphState.layoutMode = 'tree';
        if (canvasWrap) canvasWrap.style.display = 'block';
        if (mindmapWrap) mindmapWrap.style.display = 'none';
        if (matrixWrap) matrixWrap.style.display = 'none';
        if (bcBar) bcBar.style.display = 'flex';
        if (timelineBar) timelineBar.style.display = 'flex';
        if (treeModeBtn) { treeModeBtn.classList.add('active'); treeModeBtn.textContent = '系統樹: ON'; }
        graphState.physicsPaused = true;
        if (physicsBtn) { physicsBtn.classList.add('active'); physicsBtn.textContent = '再開'; }
        updateGraphDataAndFit();
        startTreeEasingAnimation();
      } else if (mode === 'mindmap') {
        if (canvasWrap) canvasWrap.style.display = 'none';
        if (mindmapWrap) mindmapWrap.style.display = 'block';
        if (matrixWrap) matrixWrap.style.display = 'none';
        if (bcBar) bcBar.style.display = 'flex';
        if (timelineBar) timelineBar.style.display = 'none';
        renderMindmap();
      } else if (mode === 'matrix') {
        if (canvasWrap) canvasWrap.style.display = 'none';
        if (mindmapWrap) mindmapWrap.style.display = 'none';
        if (matrixWrap) matrixWrap.style.display = 'block';
        if (bcBar) bcBar.style.display = 'none';
        if (timelineBar) timelineBar.style.display = 'none';
        renderMorphologyMatrix();
      }
    } else {
      if (mode === 'tree') {
        graphState.layoutMode = 'tree';
        graphState.physicsPaused = true;
      } else if (mode === 'network') {
        graphState.layoutMode = 'network';
        graphState.physicsPaused = false;
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
   * アイデア⑤: 赤シート連動「ツリー穴埋めテスト（Tree Blind Recall）」
   */
  function toggleTreeMask() {
    graphState.treeMaskMode = !graphState.treeMaskMode;
    const btn = document.getElementById('graphTreeMaskBtn');
    if (btn) {
      btn.textContent = graphState.treeMaskMode ? '赤シート:ON' : '赤シート:OFF';
      btn.classList.toggle('active', graphState.treeMaskMode);
    }
    drawGraph();
    if (graphState.activeViewTab === 'mindmap') renderMindmap();
    const toastFn = global.showToast || global.VocabCore?.showToast;
    if (typeof toastFn === 'function') {
      toastFn(graphState.treeMaskMode ? '赤シート暗記モードをONにしました。意味を伏せて想起テストができます。' : '赤シート暗記モードをOFFにしました。', 'info', 2500);
    }
  }

  /**
   * アイデア④: 語源タイムトラベル・スライダー（年代・伝播フィルター）
   */
  function onTimelineChange(val) {
    const era = parseInt(val, 10);
    graphState.timelineEra = era;
    const lbl = document.getElementById('graphTimelineLabel');
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

      const branchHtml = relBranches.map(b => {
        const bWords = (b.connectedWords || []);
        const wordsRows = bWords.map(w => {
          const item = w.item || {};
          const meaningText = isMask ? '[ ?????????? ]' : escFn(w.meaning);
          const maskStyle = isMask ? 'color:var(--m);font-style:italic;background:var(--bg-hov);padding:1px 6px;border-radius:3px' : '';
          const phonetic = item.phonetic ? `<span style="font-size:10.5px;color:var(--s);font-family:var(--mono);margin-left:4px">${escFn(item.phonetic)}</span>` : '';
          const core = item.core ? `<span style="font-size:10.5px;color:var(--m);margin-left:8px">コア: ${escFn(item.core)}</span>` : '';

          return `
            <div class="mindmap-word-row">
              <div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1">
                <span class="pos-lbl">${escFn(w.lang.toUpperCase())}</span>
                <strong style="font-size:13.5px;color:var(--t)">${escFn(w.label)}</strong>
                ${phonetic}
                <span style="font-size:12px;color:var(--t);${maskStyle}">${meaningText}</span>
                ${core}
              </div>
              <div style="display:flex;align-items:center;gap:6px">
                <button type="button" class="spk-btn" onclick="VocabGraph.speakNodeWord('${escFn(w.label)}','${escFn(w.lang)}')" title="発音を聞く" aria-label="発音">
                  <svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                </button>
                <button type="button" class="btn-o btn-xs" onclick="VocabGraph.jumpToNodeWord('${escFn(w.label)}','${escFn(w.lang)}')">詳細</button>
              </div>
            </div>
          `;
        }).join('');

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

      return `
        <div class="mindmap-root-card">
          <div class="mindmap-root-hd">
            <div class="mindmap-root-title">
              <span class="mindmap-badge">PIE ROOT</span>
              <strong style="font-size:15px;color:var(--ac);font-family:var(--mono)">${escFn(r.label)}</strong>
              <span style="font-size:12px;color:var(--s)">— 全${relWords.length}語</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <button type="button" class="btn-ac btn-xs" onclick="VocabGraph.focusRoot('${escFn(r.label)}'); VocabGraph.startWateringReview()" style="font-weight:700;color:#ffffff !important">この語根を水やり復習</button>
              <button type="button" class="btn-o btn-xs" onclick="VocabGraph.focusRoot('${escFn(r.label)}'); VocabGraph.switchViewMode('tree')">系統樹ツリーで見る</button>
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
    const prefixes = [
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

    const { nodes } = buildGraphData('', false, 'en');
    const roots = nodes.filter(n => n.type === 'root').sort((a, b) => b.childCount - a.childCount).slice(0, 16);
    const words = nodes.filter(n => n.type === 'word');

    const headerThs = prefixes.map(p => `<th class="matrix-th">${escFn(p.label)}</th>`).join('');

    const rowsHtml = roots.map(r => {
      const rootWords = (r.connectedWords || []);

      const cellsHtml = prefixes.map(p => {
        // 接頭辞に合致する単語を検索
        const matched = rootWords.find(w => {
          const lWord = w.label.toLowerCase();
          const ety = String(w.item?.etymology || '').toLowerCase();
          return lWord.startsWith(p.key) || ety.includes(`${p.key}-`);
        });

        if (matched) {
          const now = Date.now();
          const rVal = global.VocabSRS?.getRetrievability ? global.VocabSRS.getRetrievability(matched.item, now) : 0.9;
          const bgPill = rVal >= 0.88 ? 'rgba(16, 185, 129, 0.15)' : (rVal >= 0.70 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(251, 113, 133, 0.15)');
          const borderPill = rVal >= 0.88 ? '#10b981' : (rVal >= 0.70 ? '#f59e0b' : '#fb7185');

          return `
            <td class="matrix-td">
              <div class="matrix-cell-pill" style="background:${bgPill};border:1px solid ${borderPill}" onclick="VocabGraph.jumpToNodeWord('${escFn(matched.label)}','en')">
                <strong style="font-size:12px;color:var(--t)">${escFn(matched.label)}</strong>
                <span style="font-size:10px;color:var(--s);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:90px">${escFn(matched.meaning)}</span>
              </div>
            </td>
          `;
        } else {
          return `
            <td class="matrix-td empty-slot" onclick="VocabGraph.promptMatrixGen('${escFn(p.key)}','${escFn(r.label)}')" title="${escFn(p.label)} + ${escFn(r.label)} をAIで発掘">
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
      're:*kap-': 'receive'
    };

    const targetWord = prefixCandidateMap[`${prefix}:${rootKey}`];
    if (targetWord && typeof regFn === 'function') {
      regFn([{ word: targetWord }], '', true, true);
      if (typeof toastFn === 'function') toastFn(`接頭辞パズルから単語「${targetWord}」をAI生成キューに追加しました！`, 'ok', 4000);
      const toggleModalFn = global.toggleModal || global.VocabCore?.toggleModal;
      if (typeof toggleModalFn === 'function') toggleModalFn('graphModal', false);
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

  function toggleTreeMode() {
    switchViewMode(graphState.layoutMode === 'tree' ? 'network' : 'tree');
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
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#fb7185"></span>復習期日</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#60a5fa"></span>新規</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#f59e0b"></span>学習中(&lt;7日)</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#10b981"></span>長期定着(7日+)</span>
      `;
    } else {
      legend.innerHTML = `
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#7c3aed"></span>語根(Root)</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#38bdf8"></span>英語</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#a78bfa"></span>仏語</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#fbbf24"></span>独語</span>
        <span style="display:inline-flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;background:#34d399"></span>日本語</span>
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
    const pLow = Math.floor(xs.length * 0.02);
    const pHigh = Math.max(0, Math.ceil(xs.length * 0.98) - 1);
    const minX = xs[pLow], maxX = xs[pHigh];
    const minY = ys[pLow], maxY = ys[pHigh];

    const pad = 38;
    const w = Math.max(120, maxX - minX);
    const h = Math.max(120, maxY - minY);
    const scaleX = (graphState.width - pad * 2) / w;
    const scaleY = (graphState.height - pad * 2) / h;
    const isTree = (graphState.layoutMode === 'tree');
    const minZ = 0.50;
    const maxZ = isTree ? 1.65 : 1.35;
    const targetZoom = Math.min(Math.max(Math.min(scaleX, scaleY), minZ), maxZ);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    graphState.zoom = targetZoom;
    graphState.panX = graphState.width / 2 - centerX * targetZoom;
    graphState.panY = graphState.height / 2 - centerY * targetZoom;
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

  function centerOnNode(node, zoomLevel = 1.25, smooth = true) {
    if (!node) return;
    const targetZoom = zoomLevel;
    const targetPanX = graphState.width / 2 - node.x * targetZoom;
    const targetPanY = graphState.height / 2 - node.y * targetZoom;
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

    const targetPanX = graphState.width / 2 - centerX * targetZoom;
    const targetPanY = graphState.height / 2 - centerY * targetZoom;
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = graphState.width * dpr;
    canvas.height = graphState.height * dpr;
    canvas.style.width = graphState.width + 'px';
    canvas.style.height = graphState.height + 'px';

    const normTarget = targetRoot ? cleanRootKey(targetRoot) : '';
    const filterInput = document.getElementById('graphFilterInput');
    if (filterInput) filterInput.value = normTarget ? normTarget : '';
    graphState.filterQuery = normTarget;

    // 軽量化: 重複ビルド（buildGraphDataの多重実行）を完全撤廃しエントリー数から瞬時にclusterOnly判定
    const currentEntryCount = (global.VocabCore?.getAppState?.()?.entries?.length) || (global.App?.entries?.length) || 0;
    if (currentEntryCount > 120 && !targetRoot) {
      graphState.clusterOnly = true;
    } else if (!targetRoot) {
      graphState.clusterOnly = false;
    }

    const clusterBtn = document.getElementById('graphClusterFilterBtn');
    if (clusterBtn) clusterBtn.classList.toggle('active', graphState.clusterOnly);

    // 1回のみ高速ビルド
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

    if (graphUIManager && typeof graphUIManager.applyMode === 'function') {
      graphUIManager.applyMode(graphState.activeViewTab || 'network');
    }

    if (graphState.layoutMode === 'tree') {
      startTreeEasingAnimation();
    } else {
      wakeGraphSimulation();
    }
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

  function selectNode(node, center = true) {
    toggleEikenExplorer(false);
    graphState.selectedNode = node;
    renderDetailDrawer(node);
    if (center && node) {
      centerOnNode(node, graphState.zoom);
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
      badge.textContent = node.isEikenRoot ? '印欧祖語 (PIE Root) ・ 重要語根' : '印欧祖語 (PIE Root)';
      badge.style.background = node.isEikenRoot ? 'rgba(234, 88, 12, 0.15)' : 'rgba(124, 58, 237, 0.15)';
      badge.style.color = node.isEikenRoot ? '#ea580c' : '#a78bfa';
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
        langCountMap[w.lang] = (langCountMap[w.lang] || 0) + 1;
      });
      const langPills = Object.entries(langCountMap).map(([l, cnt]) => `
        <span style="font-size:10.5px;padding:2px 7px;border-radius:4px;background:var(--bg-hov);border:1px solid var(--b)">${l.toUpperCase()}: ${cnt}語</span>
      `).join('');

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

      footer.innerHTML = `
        ${unlockBranchBtn}
        ${node.childCount > 0 ? `
          <button type="button" class="btn-ac btn-sm" onclick="VocabGraph.startRootAnkiReview()" style="font-weight:700;display:flex;align-items:center;justify-content:center;gap:5px">
            <span>この語根をAnkiで集中特訓 (${node.childCount}語)</span>
          </button>
        ` : ''}
        <div style="display:flex;gap:6px">
          <button type="button" class="btn-o btn-xs" onclick="VocabGraph.filterMainListByRoot('${escFn(node.label)}')" style="flex:1">リストで絞り込み</button>
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
        <div class="graph-peer-item" onclick="VocabGraph.selectNodeById('${escFn(w.id)}')">
          <div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1">
            <span style="font-size:9.5px;padding:1px 4px;border-radius:3px;background:var(--bg-hov);font-family:var(--mono);font-weight:700">${escFn(w.lang.toUpperCase())}</span>
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
              <div style="font-size:11px;color:var(--s);margin-top:2px">${escFn(eData.example.ja)}</div>
            </div>
          ` : ''}
        `;

        footer.innerHTML = `
          <button type="button" class="btn-ac btn-sm" onclick="VocabGraph.adoptGhostBud('${escFn(node.label)}','${escFn(node.rootLabel)}')" style="font-weight:700;width:100%;padding:10px;font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;background:linear-gradient(135deg,#ea580c,#f59e0b);border:none;box-shadow:0 4px 14px rgba(234,88,12,0.35);color:#fff;border-radius:6px;cursor:pointer">
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
          <button type="button" class="btn-ac btn-sm" onclick="VocabGraph.adoptGhostBud('${escFn(node.label)}','${escFn(node.rootLabel)}')" style="font-weight:700;width:100%;padding:10px;font-size:13px;display:flex;align-items:center;justify-content:center;gap:6px;background:linear-gradient(135deg,#7c3aed,#2563eb);border:none;color:#fff;border-radius:6px;cursor:pointer">
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
        <button type="button" class="btn-ac btn-sm" onclick="VocabGraph.jumpToNodeWord('${escFn(node.parentWord)}','en')">
          親単語カードを表示
        </button>
      `;
    } else {
      // 単語ノード (Leaf)
      badge.textContent = `${node.lang.toUpperCase()} 単語`;
      badge.style.background = 'rgba(37, 99, 235, 0.15)';
      badge.style.color = '#38bdf8';
      title.textContent = node.label;

      const item = node.item || {};
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
        <button type="button" class="btn-o btn-xs" onclick="VocabGraph.selectNodeById('${escFn(r.id)}')" style="font-family:var(--mono);border-color:var(--ac);color:var(--ac)">${escFn(r.label)}</button>
      `).join('');

      const wMatrix = global.VocabMorphology?.buildCognateMatrix ? global.VocabMorphology.buildCognateMatrix(item, global.App?.rootIndexMap) : null;
      const wMatrixHtml = wMatrix ? (global.VocabMorphology?.renderCognateMatrixHtml ? global.VocabMorphology.renderCognateMatrixHtml(wMatrix) : '') : '';

      body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div>
            <span style="font-size:16px;font-weight:700;color:var(--t)">${escFn(node.label)}</span>
            <span style="font-size:12px;color:var(--s);font-family:var(--mono);margin-left:6px">${escFn(item.phonetic || '')}</span>
          </div>
          <button type="button" class="spk-btn" onclick="VocabGraph.speakNodeWord('${escFn(node.label)}','${escFn(node.lang)}')" title="発音を聞く" aria-label="発音"><svg viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg></button>
        </div>
        ${core}
        <div style="margin-bottom:8px">${meanings}</div>
        ${wMatrixHtml}
        ${ety}
        <div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--b)">
          <span style="font-size:10px;color:var(--m);font-weight:700;display:block;margin-bottom:4px">接続語根:</span>
          <div style="display:flex;gap:4px;flex-wrap:wrap">${rootsPills || '<span style="color:var(--m)">なし</span>'}</div>
        </div>
      `;

      footer.innerHTML = `
        <button type="button" class="btn-ac btn-sm" onclick="VocabGraph.jumpToNodeWord('${escFn(node.label)}','${escFn(node.lang)}')">
          単語カードを表示
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
    const speakFn = global.VocabSpeech?.speakText || global.speakText || global.VocabCore?.speakText;
    if (typeof speakFn === 'function') speakFn(word, lang);
  }

  function jumpToNodeWord(word, lang) {
    const toggleModalFn = global.toggleModal || global.VocabCore?.toggleModal;
    if (typeof toggleModalFn === 'function') toggleModalFn('graphModal', false);
    const jumpFn = global.jumpToWord || global.VocabCore?.jumpToWord;
    if (typeof jumpFn === 'function') {
      setTimeout(() => jumpFn(word, lang), 20);
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
          graphState.unlockParticles.push({
            x: budNode.x,
            y: budNode.y,
            radius: 8,
            maxRadius: 52,
            alpha: 1.0,
            color: '#38bdf8'
          });
        }
        playSkillUnlockSound();
        persistUnlockedEntries([newCard, ...cur], saveKey);
        if (typeof toastFn === 'function') {
          toastFn(`スキル習得！「${budWord}」(${rootLabel}) を覚醒させました！単語帳に追加完了。`, 'ok', 4000);
        }
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
  }

  /**
   * 英検準1級 スキルツリーの展開 / 語根ランキング目次ドロワーの開閉
   */
  function toggleEikenExplorer(forceState) {
    if (typeof document === 'undefined') return;
    const drawer = document.getElementById('graphEikenDrawer');
    const backdrop = document.getElementById('graphEikenBackdrop');
    const btn = document.getElementById('graphEikenExplorerBtn');

    // 系統樹ビューでない場合は、即座に系統樹 & スキルツリーモードへ移行してツリーに内包展開
    if (graphState.layoutMode !== 'tree' || graphState.activeViewTab !== 'tree') {
      graphState.layoutMode = 'tree';
      graphState.activeViewTab = 'tree';
      graphState.eikenSkillMode = true;

      const treeBtn = document.getElementById('graphTreeModeBtn');
      if (treeBtn) treeBtn.textContent = 'ネットワーク';
      const tabTree = document.getElementById('graphTabTree');
      const tabNet = document.getElementById('graphTabNetwork');
      if (tabTree && tabNet) {
        tabTree.classList.add('active');
        tabNet.classList.remove('active');
      }

      // 未習得の準1級語根を自動フォーカス
      if (global.VocabEikenCatalog) {
        const stats = global.VocabEikenCatalog.calcProgress(getEnglishPairKeyAndEntries().entries);
        const unmastered = stats.find(s => s.unlearnedCount > 0) || stats[0];
        if (unmastered) {
          graphState.focusedRootKey = cleanRootKey(unmastered.rootKey);
        }
      }

      if (btn) btn.classList.add('active');
      updateGraphDataAndFit();
      const toastFn = global.showToast || global.VocabCore?.showToast;
      if (typeof toastFn === 'function') {
        toastFn('語源スキルツリーを展開しました。枝分かれしたノードから語彙スキルを習得できます。', 'ok', 3500);
      }
      return;
    }

    // 既に系統樹モードの場合は、目次ドロワー（全体確認）の開閉をトグル
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
      <div class="eiken-root-card ${graphState.focusedRootKey === s.rootKey ? 'active' : ''}" onclick="VocabGraph.focusRoot('${s.rootKey}');VocabGraph.toggleEikenExplorer(false)">
        <div class="eiken-root-hd">
          <div style="display:flex;align-items:center;gap:6px">
            <span class="eiken-root-rank">${s.rank}位</span>
            <span class="eiken-root-key">${s.label}</span>
            <span style="font-size:11px;color:var(--s)">（${s.meaning}）</span>
          </div>
          <span class="eiken-root-prog-text">${s.learnedCount}/${s.total}語 (${s.percent}%)</span>
        </div>
        <div class="eiken-prog-bar">
          <div class="eiken-prog-fill" style="width:${s.percent}%"></div>
        </div>
        <div class="eiken-root-desc">${s.desc}</div>
        <div class="eiken-word-preview">収録: ${(global.VocabEikenCatalog.getWordsByRoot(s.rootKey) || []).map(w => w.word).join(', ')}</div>
      </div>
    `).join('');
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
      const modal = document.getElementById('graphModal');
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
      const kRepulsion = isLargeGraph ? 520 : 640;
      const maxRepulseDist = isLargeGraph ? 165 : 195;
      const maxRepulseDistSq = maxRepulseDist * maxRepulseDist;
      const kSpring = 0.040;
      const springLength = 76;
      const damping = 0.84;
      const maxSpeed = 3.4;
      // 大域重力を以前の1/18に弱め、全クラスターが原点(0,0)に1つに凝縮して毛玉状になるのを完全に防止
      const kGravity = 0.00010;

      // 0. ルートノード（語根）間の大域アイランド反発
      //    異なる語根星団同士が十分な距離（最低320px）を保ち、銀河の星系のように独立した島として配置される
      const rootNodes = [];
      for (let i = 0; i < totalNodes; i++) {
        if (nodes[i].type === 'root') rootNodes.push(nodes[i]);
      }
      const minRootDist = 320;
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
              // 近接ノード間の衝突防止（重なり完全抑止）
              const minDist = (n1.radius || 8) + (n2.radius || 8) + 14;
              let force = 0;
              if (dist < minDist) {
                force = ((minDist - dist) / minDist) * 4.2;
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
    requestAnimationFrame(() => {
      graphDrawScheduled = false;
      drawGraph();
    });
  }

  /**
   * ビューポート・カリング & Semantic Zoom (LOD) 対応のCanvas描画
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
    const isMask = graphState.treeMaskMode;
    const era = graphState.timelineEra;
    const now = Date.now();
    const zoom = graphState.zoom;
    const isTree = (graphState.layoutMode === 'tree');

    // 0. SF/ダークファンタジー調 放射状スキルツリー ガイドライン & セクター分割
    if (isTree) {
      ctx.save();

      // アクティブな語根の中心点を取得
      const treeRoots = graphState.nodes.filter(n => n.type === 'root');
      const rootCenters = treeRoots.length > 0
        ? treeRoots.map(r => ({ x: r.targetX !== undefined ? r.x : 0, y: r.targetY !== undefined ? r.y : 0, label: r.label }))
        : [{ x: 0, y: 0, label: '' }];

      rootCenters.forEach(center => {
        const cx = center.x;
        const cy = center.y;

        // 視野外カリング: 画面外の語根の重いセクターバンド計算・グラデーション描画を完全スキップ
        if (cx + 1200 < viewLeft || cx - 1200 > viewRight || cy + 1200 < viewTop || cy - 1200 > viewBottom) {
          return;
        }

        // A. 語根コア後方の重厚で落ち着いたダークグラデーション（過剰発光を抑えたダークテーマ）
        const bgGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 1180);
        bgGrad.addColorStop(0, isDark ? 'rgba(15, 23, 42, 0.40)' : 'rgba(241, 245, 249, 0.40)');
        bgGrad.addColorStop(0.35, isDark ? 'rgba(11, 17, 32, 0.25)' : 'rgba(248, 250, 252, 0.25)');
        bgGrad.addColorStop(0.80, isDark ? 'rgba(3, 7, 18, 0.12)' : 'rgba(255, 255, 255, 0.12)');
        bgGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = bgGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, 1180, 0, Math.PI * 2);
        ctx.fill();

        // 扇形アーク描画ヘルパー
        function drawSectorBand(innerR, outerR, startAngle, endAngle, fillColor, strokeColor) {
          ctx.beginPath();
          ctx.arc(cx, cy, outerR, startAngle, endAngle, false);
          ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
          ctx.closePath();
          if (fillColor) {
            ctx.fillStyle = fillColor;
            ctx.fill();
          }
          if (strokeColor) {
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 1.0;
            ctx.stroke();
          }
        }

        // B. 第2階層 サンバースト扇状エリア (Tier 2: r = 90 〜 330)
        // ゲルマン語派 (黄〜緑系: 10時〜2時 / 上部)
        drawSectorBand(90, 330, -3 * Math.PI / 4, -Math.PI / 4,
          isDark ? 'rgba(132, 204, 22, 0.05)' : 'rgba(101, 163, 13, 0.04)',
          isDark ? 'rgba(163, 230, 53, 0.12)' : 'rgba(101, 163, 13, 0.10)'
        );
        // イタリック語派 (青〜紫系: 2時〜6時 / 右下)
        drawSectorBand(90, 330, -Math.PI / 4, 3 * Math.PI / 5,
          isDark ? 'rgba(56, 189, 248, 0.05)' : 'rgba(2, 132, 199, 0.04)',
          isDark ? 'rgba(56, 189, 248, 0.12)' : 'rgba(2, 132, 199, 0.10)'
        );
        // ギリシャ古典・その他 (紫系: 6時〜10時 / 左下)
        drawSectorBand(90, 330, 3 * Math.PI / 5, 5 * Math.PI / 4,
          isDark ? 'rgba(192, 132, 252, 0.04)' : 'rgba(147, 51, 234, 0.03)',
          isDark ? 'rgba(192, 132, 252, 0.10)' : 'rgba(147, 51, 234, 0.08)'
        );

        // C. 第3階層 サンバースト扇状エリア (Tier 3: r = 345 〜 520)
        // 西ゲルマン語群 (明るい緑)
        drawSectorBand(345, 520, -3 * Math.PI / 4 + 0.03, -Math.PI / 4 - 0.03,
          isDark ? 'rgba(34, 197, 94, 0.05)' : 'rgba(22, 163, 74, 0.04)',
          isDark ? 'rgba(74, 222, 128, 0.14)' : 'rgba(22, 163, 74, 0.10)'
        );
        // ロマンス諸語 (鮮やかな青)
        drawSectorBand(345, 520, -Math.PI / 4 + 0.03, 3 * Math.PI / 5 - 0.03,
          isDark ? 'rgba(99, 102, 241, 0.05)' : 'rgba(79, 70, 229, 0.04)',
          isDark ? 'rgba(129, 140, 248, 0.14)' : 'rgba(79, 70, 229, 0.10)'
        );
        // ヘレニック・学術語群
        drawSectorBand(345, 520, 3 * Math.PI / 5 + 0.03, 5 * Math.PI / 4 - 0.03,
          isDark ? 'rgba(168, 85, 247, 0.04)' : 'rgba(126, 34, 206, 0.03)',
          isDark ? 'rgba(192, 132, 252, 0.10)' : 'rgba(126, 34, 206, 0.08)'
        );

        // D. 第4階層 ガイドライン (Tier 4: r = 440, 610, 780, 950, 1100)
        const guideOrbits = [440, 610, 780, 950, 1100];
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)';
        ctx.lineWidth = 1.0;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        guideOrbits.forEach(r => {
          ctx.moveTo(cx + r, cy);
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
        });
        ctx.stroke();
        ctx.setLineDash([]);

        // E. 放射状セクター境界線（中心から伸びる細いガイド線）
        const sectorDividers = [-3 * Math.PI / 4, -Math.PI / 4, 3 * Math.PI / 5];
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';
        ctx.lineWidth = 1.0;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        sectorDividers.forEach(angle => {
          ctx.moveTo(cx + 60 * Math.cos(angle), cy + 60 * Math.sin(angle));
          ctx.lineTo(cx + 1100 * Math.cos(angle), cy + 1100 * Math.sin(angle));
        });
        ctx.stroke();
        ctx.setLineDash([]);

        // F. サンバースト各階層の文字ラベル（落ち着いた高コントラストタイポグラフィ）
        if (zoom >= 0.40) {
          ctx.save();
          ctx.textAlign = 'center';

          // Tier 2 ラベル
          ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillStyle = isDark ? '#bef264' : '#4d7c0f';
          ctx.fillText('ゲルマン語派 / Germanic', cx, cy - 210);

          ctx.fillStyle = isDark ? '#7dd3fc' : '#0369a1';
          const itX = cx + 210 * Math.cos(Math.PI / 6);
          const itY = cy + 210 * Math.sin(Math.PI / 6);
          ctx.fillText('イタリック語派 / Italic', itX, itY);

          ctx.fillStyle = isDark ? '#d8b4fe' : '#7e22ce';
          const hlX = cx + 210 * Math.cos(11 * Math.PI / 12);
          const hlY = cy + 210 * Math.sin(11 * Math.PI / 12);
          ctx.fillText('ギリシャ・古典諸派', hlX, hlY);

          // Tier 3 ラベル
          ctx.font = '600 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillStyle = isDark ? '#86efac' : '#15803d';
          ctx.fillText('西ゲルマン語群 / West Germanic', cx, cy - 430);

          ctx.fillStyle = isDark ? '#a5b4fc' : '#4338ca';
          const roX = cx + 430 * Math.cos(Math.PI / 6);
          const roY = cy + 430 * Math.sin(Math.PI / 6);
          ctx.fillText('ロマンス諸語 / Romance', roX, roY);

          ctx.restore();
        }
      });

      ctx.restore();
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

      // 系統樹モード時、派生小枝 (Twig) は親単語がホバー/選択されている時のみ表示して過密を根絶
      if (isTree && isTwigEdge) {
        const pWord = e.source?.label;
        const isParentFocused = focusNode && (focusNode.label === pWord || focusNode === e.source || focusNode === e.target);
        if (!isParentFocused) continue;
      }

      // 大規模語彙（3,000単語規模）最適化:
      // 超俯瞰時 (zoom < 0.60) は末端の細い現代語エッジを省略し、主要ブランチの主幹導管のみを描画（60FPS維持 & 毛玉化防止）
      if (isTree && zoom < 0.60 && !focusNode && !isFiltered && (e.kind === 'branch_to_leaf' || e.kind === 'leaf_to_twig' || e.kind === 'bud_edge')) {
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
          // 古典枝から現代見出し語への導管
          ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.45)' : 'rgba(37, 99, 235, 0.40)';
          ctx.lineWidth = 1.2;
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
      if (isTree) {
        // 放射状スキルツリー用 極座標ベジェ曲線 (Radial Polar Cubic Bezier)
        const rNode = e.source.rootLabel ? rootMap.get(e.source.rootLabel) : null;
        const rx = rNode ? (rNode.targetX !== undefined ? rNode.x : 0) : 0;
        const ry = rNode ? (rNode.targetY !== undefined ? rNode.y : 0) : 0;
        const r1 = Math.hypot(e.source.x - rx, e.source.y - ry);
        const r2 = Math.hypot(e.target.x - rx, e.target.y - ry);
        const midR = (r1 + r2) / 2;
        const angleS = Math.atan2(e.source.y - ry, e.source.x - rx);
        const angleT = Math.atan2(e.target.y - ry, e.target.x - rx);
        let dAngle = angleT - angleS;
        while (dAngle > Math.PI) dAngle -= Math.PI * 2;
        while (dAngle < -Math.PI) dAngle += Math.PI * 2;
        const cpAngle = angleS + dAngle * 0.5;
        const cpX = rx + midR * Math.cos(cpAngle);
        const cpY = ry + midR * Math.sin(cpAngle);
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

    // 2. ノード描画 (Semantic Zoom LOD 対応 & 境界半径バッファ付きカリング)
    const totalWordsCount = graphState.nodes.filter(nd => nd.type === 'word').length;
    // 星団のみモード時や単語数が適度な場合はズーム38%から単語ラベルを美しく表示して実用性を最大化
    const textThresholdZoom = (graphState.clusterOnly || totalWordsCount < 150) ? 0.38 : (totalWordsCount > 400 ? 0.72 : 0.52);

    for (let i = 0; i < graphState.nodes.length; i++) {
      const n = graphState.nodes[i];
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

      ctx.save();
      if (isDimmedByEra) {
        ctx.globalAlpha = 0.12;
      } else if (focusNode && !isSelected && !isHover && !isConnectedToFocus) {
        ctx.globalAlpha = 0.12;
      } else if (isFiltered && !isMatch) {
        ctx.globalAlpha = 0.15;
      }

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
          // 通常表示: 言語系統・ジュエルトーン（赤点混在を完全に根絶）
          if (n.lang === 'fr') nodeColor = '#a78bfa'; // フランス語: ラベンダー
          else if (n.lang === 'de') nodeColor = '#fbbf24'; // ドイツ語: アンバー
          else if (n.lang === 'ja') nodeColor = '#34d399'; // 日本語: ミント
          else nodeColor = '#38bdf8'; // 英語・ゲルマン系: エレガントなシアンアクア
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

        ctx.beginPath();
        ctx.arc(n.x, n.y, drawRadius, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.fill();

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
        ctx.beginPath();
        ctx.arc(n.x, n.y, drawRadius + 2.5, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.10)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, drawRadius, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? 'rgba(217, 119, 6, 0.35)' : 'rgba(245, 158, 11, 0.25)';
        ctx.fill();
        ctx.strokeStyle = isDark ? '#fbbf24' : '#d97706';
        ctx.lineWidth = isSelected ? 2.5 : 1.8;
        ctx.stroke();

        if (zoom >= 0.40 || isSelected || isHover) {
          const bFontSize = Math.round(Math.max(9.5, 11.0 / Math.sqrt(zoom)));
          ctx.font = `700 ${bFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.lineJoin = 'round';
          ctx.strokeStyle = isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)';
          ctx.lineWidth = 3.0;
          ctx.textAlign = 'center';
          const cleanBranchLabel = n.label.replace(/^(Latin|Romance|Germanic|Greek|Borrowed):\s*/i, '');
          const wCount = n.connectedWords?.length || 0;
          const displayBranchText = wCount > 0 ? `${cleanBranchLabel} (${wCount})` : cleanBranchLabel;
          ctx.strokeText(displayBranchText, n.x, n.y + drawRadius + bFontSize + 2);
          ctx.fillStyle = isDark ? '#fbbf24' : '#b45309';
          ctx.fillText(displayBranchText, n.x, n.y + drawRadius + bFontSize + 2);
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
            ctx.restore();
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

        // --- 美麗な多層発光ノード（Luminous Celestial Star Node）---
        // 1. 周囲のソフトグロー（Soft Ambient Glow / 微光ハロー）
        ctx.beginPath();
        ctx.arc(n.x, n.y, drawRadius + 2.5, 0, Math.PI * 2);
        ctx.fillStyle = isFocusHighlight
          ? (isSelected ? 'rgba(56, 189, 248, 0.35)' : 'rgba(167, 139, 250, 0.30)')
          : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)');
        ctx.fill();

        // 2. コア本体
        ctx.beginPath();
        ctx.arc(n.x, n.y, drawRadius, 0, Math.PI * 2);
        ctx.fillStyle = nodeColor;
        ctx.fill();

        // 3. 繊細な外周リムリング（Glass Specular Rim）
        ctx.beginPath();
        ctx.arc(n.x, n.y, drawRadius, 0, Math.PI * 2);
        ctx.strokeStyle = isFocusHighlight
          ? (isSelected ? '#38bdf8' : '#a78bfa')
          : (isDark ? 'rgba(255, 255, 255, 0.40)' : 'rgba(255, 255, 255, 0.70)');
        ctx.lineWidth = isFocusHighlight ? 2.0 : 0.8;
        if (isFocusHighlight) {
          ctx.shadowColor = isSelected ? '#38bdf8' : '#a78bfa';
          ctx.shadowBlur = 8;
        }
        ctx.stroke();
        if (isFocusHighlight) ctx.shadowBlur = 0;

        // 4. 中心スペキュラー輝点（Star Specular Point）: 星のように輝くハイライト
        ctx.beginPath();
        ctx.arc(n.x, n.y, Math.max(1.0, drawRadius * 0.28), 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fill();

        // 見出し語ラベル描画（ズームイン時、ホバー・選択時、または検索マッチ時）
        if (zoom >= textThresholdZoom || isFocusHighlight || isMatch) {
          const wFontSize = Math.round(Math.max(9.5, 10.5 / Math.sqrt(Math.max(0.7, zoom))));

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

          ctx.font = `bold ${wFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.lineJoin = 'round';
          ctx.strokeStyle = isDark ? 'rgba(11, 15, 25, 0.95)' : 'rgba(255, 255, 255, 0.95)';
          ctx.lineWidth = 3.5;
          ctx.textAlign = 'center';
          ctx.strokeText(n.label, n.x, n.y + drawRadius + wFontSize + 3);
          ctx.fillStyle = textColor;
          ctx.fillText(n.label, n.x, n.y + drawRadius + wFontSize + 3);

          // ズームイン時 (zoom >= 1.30) は日本語訳も控えめに添える
          if (isTree && meaningText && (zoom >= 1.30 || isFocusHighlight)) {
            const mFontSize = Math.round(wFontSize * 0.82);
            const shortMeaning = meaningText.length > 9 ? meaningText.slice(0, 8) + '…' : meaningText;
            ctx.font = `500 ${mFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            const mY = n.y + drawRadius + wFontSize + mFontSize + 6;
            ctx.strokeText(shortMeaning, n.x, mY);
            ctx.fillStyle = (isMask && !isHover && !isSelected) ? '#94a3b8' : (isDark ? '#94a3b8' : '#64748b');
            ctx.fillText(shortMeaning, n.x, mY);
          }
        } else {
          // --- 俯瞰・星辰モード: 軽快かつ美しい星屑レンダリング ---
          const dotR = Math.max(3.0, drawRadius * 0.85);
          ctx.beginPath();
          ctx.arc(n.x, n.y, dotR, 0, Math.PI * 2);
          ctx.fillStyle = nodeColor;
          ctx.fill();

          ctx.beginPath();
          ctx.arc(n.x, n.y, dotR, 0, Math.PI * 2);
          ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.60)';
          ctx.lineWidth = 0.7;
          ctx.stroke();

          // 微細な中心ハイライト
          ctx.beginPath();
          ctx.arc(n.x, n.y, Math.max(1.0, dotR * 0.32), 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.fill();
        }
      }

      ctx.restore();
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
      const legendX = 20;
      const legendY = (graphState.height || 600) - 100;
      const legendW = 188;
      const legendH = 82;

      ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.92)';
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(legendX, legendY, legendW, legendH, 8);
      } else {
        ctx.rect(legendX, legendY, legendW, legendH);
      }
      ctx.fill();
      ctx.stroke();

      ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';

      // ■ 印欧祖語 / PIE
      ctx.fillStyle = isDark ? '#ea580c' : '#c2410c';
      ctx.fillRect(legendX + 12, legendY + 12, 10, 10);
      ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
      ctx.fillText('印欧祖語 / PIE', legendX + 28, legendY + 21);

      // ■ ゲルマン系 / Germanic
      ctx.fillStyle = '#84cc16';
      ctx.fillRect(legendX + 12, legendY + 36, 10, 10);
      ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
      ctx.fillText('ゲルマン系 / Germanic', legendX + 28, legendY + 45);

      // ■ ロマンス系 / Romance
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(legendX + 12, legendY + 60, 10, 10);
      ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
      ctx.fillText('ロマンス系 / Romance', legendX + 28, legendY + 69);

      ctx.restore();
    }
  }

  function initGraphEvents() {
    const wrap = document.getElementById('graphCanvasWrap');
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
          } else if (hit.type === 'branch') {
            const wCount = hit.connectedWords?.length || 0;
            const cleanLabel = hit.label.replace(/^(Latin|Romance|Germanic|Greek|Borrowed):\s*/i, '');
            tt.innerHTML = `<strong>古典分岐: ${escFn(cleanLabel)}</strong><div>収録単語: ${wCount}語</div><div style="font-size:10px;color:var(--m);margin-top:3px">クリックでブランチ特訓</div>`;
          } else if (hit.type === 'ghost_bud') {
            tt.innerHTML = `<strong>${escFn(hit.label)} <span style="font-size:10px;color:#ea580c;font-weight:400">[未開拓スキル]</span></strong><div>印欧祖語「${escFn(hit.rootLabel)}」の重要語彙</div><div style="font-size:10px;color:var(--m);margin-top:3px">クリックで単語帳に追加</div>`;
          } else {
            const phonetic = hit.item?.phonetic ? `<span style="font-size:11px;color:var(--s);font-family:var(--mono);font-weight:400;margin-left:6px">${escFn(hit.item.phonetic)}</span>` : '';
            const meaning = (graphState.treeMaskMode) ? '[ ????? ]' : escFn(hit.meaning);
            const posTag = hit.pos ? `<span style="font-size:10px;padding:1px 4px;border-radius:3px;background:var(--bg-hov);font-weight:700;margin-right:4px">${escFn(hit.pos)}</span>` : '';
            tt.innerHTML = `<strong>${escFn(hit.label)} <span style="font-size:10px;color:var(--m);font-weight:400">[${escFn((hit.lang || 'en').toUpperCase())}]</span>${phonetic}</strong><div style="margin-top:2px">${posTag}${meaning}</div><div style="font-size:10px;color:var(--m);margin-top:4px">クリックで単語詳細を表示</div>`;
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
      const modal = document.getElementById('graphModal');
      if (!modal || !modal.classList.contains('open')) return;
      if (shouldIgnoreCanvasEvent(e.target)) {
        if (!graphState.isDragging && !graphState.dragNode) {
          const tt = document.getElementById('graphTooltip');
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
    const drawerBd = document.getElementById('graphDrawerBody');
    if (drawerBd) {
      drawerBd.addEventListener('wheel', e => {
        const matrixGrid = e.target.closest('.cog-matrix-grid');
        if (matrixGrid && (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey)) {
          matrixGrid.scrollLeft += (e.deltaX || e.deltaY);
        } else {
          drawerBd.scrollTop += e.deltaY;
        }
        e.stopPropagation();
      }, { passive: true });
    }
    const eikenList = document.getElementById('graphEikenList');
    if (eikenList) {
      eikenList.addEventListener('wheel', e => {
        eikenList.scrollTop += e.deltaY;
        e.stopPropagation();
      }, { passive: true });
    }

    // ノードクリック時のインスペクター展開
    wrap.addEventListener('click', e => {
      if (shouldIgnoreCanvasEvent(e.target)) return;
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
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        startWateringReview();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleTreeMask();
      } else if (e.key === '1') {
        e.preventDefault();
        switchViewMode('network');
      } else if (e.key === '2') {
        e.preventDefault();
        switchViewMode('tree');
      } else if (e.key === '3') {
        e.preventDefault();
        switchViewMode('mindmap');
      } else if (e.key === '4') {
        e.preventDefault();
        switchViewMode('matrix');
      }
    });

    window.addEventListener('resize', () => {
      const modal = document.getElementById('graphModal');
      if (!modal || !modal.classList.contains('open')) return;
      const canvas = document.getElementById('graphCanvas');
      if (!canvas || !wrap) return;
      const oldW = graphState.width;
      const oldH = graphState.height;
      graphState.width = wrap.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 800);
      graphState.height = wrap.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 600);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = graphState.width * dpr;
      canvas.height = graphState.height * dpr;
      canvas.style.width = graphState.width + 'px';
      canvas.style.height = graphState.height + 'px';
      if (graphState.selectedNode) {
        centerOnNode(graphState.selectedNode, graphState.zoom);
      } else {
        graphState.panX += (graphState.width - oldW) / 2;
        graphState.panY += (graphState.height - oldH) / 2;
        drawGraph();
      }
    });
  }

  /**
   * 10,000語規模の超大規模グラフ向けオフスレッド/Web Worker 物理レイアウト計算関数
   * メインスレッドのUIをブロックせずに座標緩和を反復計算
   */
  function computeOffThreadPositions(nodes, edges, iterations = 30) {
    if (!Array.isArray(nodes) || !nodes.length) return nodes;
    const totalNodes = nodes.length;
    const isLarge = totalNodes > 100;
    const kRepulsion = isLarge ? 520 : 640;
    const maxRepulseDist = isLarge ? 165 : 195;
    const maxRepulseDistSq = maxRepulseDist * maxRepulseDist;
    const kSpring = 0.040;
    const springLength = 76;
    const damping = 0.84;
    const maxSpeed = 3.4;
    const kGravity = 0.00010;

    const simNodes = nodes.map(n => ({
      id: n.id,
      x: Number.isFinite(n.x) ? n.x : 0,
      y: Number.isFinite(n.y) ? n.y : 0,
      vx: Number.isFinite(n.vx) ? n.vx : 0,
      vy: Number.isFinite(n.vy) ? n.vy : 0,
      radius: n.radius || 8,
      type: n.type || 'leaf'
    }));

    const nodeIndexMap = new Map();
    simNodes.forEach((n, i) => nodeIndexMap.set(n.id, i));

    const simEdges = (edges || []).map(e => ({
      s: typeof e.source === 'object' ? nodeIndexMap.get(e.source.id) : nodeIndexMap.get(e.source),
      t: typeof e.target === 'object' ? nodeIndexMap.get(e.target.id) : nodeIndexMap.get(e.target)
    })).filter(e => e.s !== undefined && e.t !== undefined);

    for (let it = 0; it < iterations; it++) {
      for (let i = 0; i < totalNodes; i++) {
        const n1 = simNodes[i];
        for (let j = i + 1; j < totalNodes; j++) {
          const n2 = simNodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const distSq = dx * dx + dy * dy;
          if (distSq > maxRepulseDistSq || distSq < 1) continue;
          const dist = Math.sqrt(distSq);
          const minDist = (n1.radius || 8) + (n2.radius || 8) + 14;
          let force = (dist < minDist) ? ((minDist - dist) / minDist) * 4.2 : (kRepulsion / distSq) * (1 - dist / maxRepulseDist);
          if (force > 4.5) force = 4.5;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          n1.vx -= fx; n1.vy -= fy;
          n2.vx += fx; n2.vy += fy;
        }
      }

      for (let i = 0; i < simEdges.length; i++) {
        const e = simEdges[i];
        const s = simNodes[e.s], t = simNodes[e.t];
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        let force = (dist - springLength) * kSpring;
        if (force > 3.0) force = 3.0;
        if (force < -3.0) force = -3.0;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        s.vx += fx; s.vy += fy;
        t.vx += fx; t.vy += fy;
      }

      for (let i = 0; i < totalNodes; i++) {
        const n = simNodes[i];
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
      }
    }

    return simNodes;
  }

  // グローバル公開オブジェクト
  global.VocabGraph = {
    computeOffThreadPositions,
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
    toggleTreeMode,
    adoptGhostBud,
    startBranchAnkiReview,
    updateZoomDisplay,
    smoothPanZoomTo,
    scheduleGraphDraw,
    // 新規実用機能
    switchViewMode,
    updateBreadcrumbUI,
    clearRootFocus,
    focusRoot,
    startTreeEasingAnimation,
    startWateringReview,
    toggleTreeMask,
    onTimelineChange,
    renderMindmap,
    renderMorphologyMatrix,
    promptMatrixGen,
    // 英検準1級 語根ランキング & Fog of War
    unlockCurrentRootEikenWords,
    toggleEikenExplorer,
    renderEikenExplorer,
    // UX段階的開示 & 空間カリング描画モジュール
    GraphUIManager,
    graphUIManager,
    SpatialCullingRenderer,
    spatialCullingRenderer
  };

  // 既存ハンドラ互換のためにグローバルへ展開
  Object.assign(global, global.VocabGraph);
})(typeof window !== 'undefined' ? window : globalThis);
