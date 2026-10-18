/**
 * Vocab Vault — Graph Layout Engine (js/graph_layout.js)
 * 4-Tier Lineage Skill Tree Layout, Polar Coordinates & O(N) Spatial Hash Relaxation
 */
(function (global) {
  'use strict';

  const defaultGraphState = {
    canvas: null,
    ctx: null,
    nodes: [],
    edges: [],
    zoom: 1,
    panX: 0,
    panY: 0,
    width: 800,
    height: 600,
    colorMode: 'lang',
    physicsEnabled: false,
    clusterOnly: false,
    selectedNode: null,
    hoverNode: null,
    filterQuery: '',
    langFilter: 'all',
    treeEasingRaf: null,
    layoutMode: 'network',
    activeViewTab: 'network',
    timelineEra: 0,
    treeMaskMode: false,
    eikenSkillMode: false,
    focusedRootKey: null,
    unlockParticles: []
  };
  global._sharedGraphState = global._sharedGraphState || defaultGraphState;
  const getGraphState = () => global.VocabGraph?.graphState || global._sharedGraphState;
  const graphState = new Proxy({}, {
    get: (_, prop) => getGraphState()[prop],
    set: (_, prop, val) => {
      getGraphState()[prop] = val;
      return true;
    }
  });

  const getEnglishPairKeyAndEntries = () => {
    if (global.VocabGraph?.getEnglishPairKeyAndEntries) {
      return global.VocabGraph.getEnglishPairKeyAndEntries();
    }
    const app = global.VocabCore?.App || global.App;
    const activeCfg = (global.VocabCore?.getActivePairConfig || global.getActivePairConfig)?.() || { key: 'distinction_entries', srcLang: 'en', tgtLang: 'ja' };
    const isEnJaActive = (activeCfg.srcLang || app?.srcLang || app?.lang || 'en') === 'en' && (activeCfg.tgtLang || app?.tgtLang || 'ja') === 'ja';
    let entries = [];
    if (isEnJaActive && Array.isArray(app?.entries) && app.entries.length) {
      entries = app.entries;
    } else {
      const storageKey = activeCfg.key || 'distinction_entries';
      const stored = (global.VocabStorage?.state?.mem?.[storageKey] || global.VocabStorage?.getRawEntries?.(storageKey) || localStorage?.getItem?.(storageKey));
      if (typeof stored === 'string') {
        try { entries = JSON.parse(stored) || []; } catch (_) { entries = []; }
      } else if (Array.isArray(stored)) {
        entries = stored;
      }
    }
    return { pairKey: activeCfg.key || 'distinction_entries', entries };
  };

  const populateRootJumpSelect = roots => (global.VocabGraphViews?.populateRootJumpSelect || global.VocabGraph?.populateRootJumpSelect)?.(roots);
  const updateBreadcrumbUI = roots => (global.VocabGraphViews?.updateBreadcrumbUI || global.VocabGraph?.updateBreadcrumbUI)?.(roots);

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
   * 語根キーの安全な正規化 & 表記ゆれ・同根統合（印欧祖語PIEおよび東アジア漢字字源 *政 等に両対応）
   */
  function cleanRootKey(k) {
    if (!k) return '';
    let s = String(k).trim();
    // 漢字字源ラベル（「字源: *政」「한자: *政」等）のプレフィックスは除去して正規化へ通す
    s = s.replace(/^(?:字源|漢字|한자|hanzi|hanja|kanji|cjk|root)\s*[:：]\s*/i, '').trim();
    // 言語名ラベル（フランス語:, 中世ラテン語:, etc.）やコロン付きテキストは語根ではないので完全に排除
    if (/[:：]/.test(s)) {
      return '';
    }

    // 東アジア漢字字源ルート（*政, *経, *信 等の単一漢字ルート）の判定と繁体・簡体・新字体統合
    const cjkClean = s.replace(/^\*/, '').replace(/-$/, '').trim();
    if (/^[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]$/.test(cjkClean)) {
      const canonFn = global.VocabMorphology?.canonicalizeCjkChar;
      const cChar = typeof canonFn === 'function' ? canonFn(cjkClean) : cjkClean;
      return `*${cChar}`;
    }

    const sLower = s.toLowerCase();
    if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/.test(sLower)) {
      return '';
    }
    const rawClean = sLower.replace(/^\*/, '').replace(/-$/, '').trim();
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
      if (!res || /[:：]/.test(res)) return '';
      const resRaw = res.replace(/^\*/, '').replace(/-$/, '');
      if (/^[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]$/.test(resRaw)) {
        return `*${resRaw}`;
      }
      if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/.test(res)) return '';
      if (CANONICAL_ROOT_ALIASES[resRaw]) return CANONICAL_ROOT_ALIASES[resRaw];
      return res.startsWith('*') ? res : `*${res}`;
    }
    return sLower.startsWith('*') ? sLower : `*${sLower}`;
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
   * 系統樹モードにおける古典分岐（Branch）の正規化・集約
   * - 重複する同義接頭辞（con- / com-, in- / im- 等）を統合し、過密と文字衝突を根絶
   * - ラテン語とロマンス語（仏・西・伊・葡）、西ゲルマン語（英・独・蘭）、東アジア漢字文化圏（中・韓・日）を統合
   */
  function normalizeBranch(bLabel) {
    if (!bLabel) return 'Germanic: 西ゲルマン語群根幹 (Old English)';
    let clean = String(bLabel).trim();
    if (clean.startsWith('Sinospheric:')) return clean;
    clean = clean.replace(/^(Latin|Romance|Germanic|Greek|Borrowed|Italic|Sinospheric):\s*/i, '');

    if (clean.startsWith('con-') || clean.startsWith('com-')) return 'Italic: con- / com- (共に)';
    if (clean.startsWith('in-') || clean.startsWith('im-') || clean.startsWith('il-') || clean.startsWith('ir-')) return 'Italic: in- / im- (中に/否定)';
    if (clean.startsWith('ad-') || clean.startsWith('ac-') || clean.startsWith('ap-') || clean.startsWith('at-')) return 'Italic: ad- (向かって)';
    if (clean.startsWith('sub-') || clean.startsWith('suc-') || clean.startsWith('suf-') || clean.startsWith('sup-') || clean.startsWith('sus-') || clean.startsWith('sotto-')) return 'Italic: sub- (下に)';
    if (clean.startsWith('per-') || clean.startsWith('par-') || clean.startsWith('por-')) return 'Italic: per- (完全に)';
    if (clean.startsWith('ob-') || clean.startsWith('op-')) return 'Italic: ob- (対して)';
    if (clean.startsWith('ex-') || clean.startsWith('ef-') || clean.startsWith('es-')) return 'Italic: ex- (外に)';
    if (clean.startsWith('re-') || clean.startsWith('ri-')) return 'Italic: re- (再び/後)';
    if (clean.startsWith('de-') || clean.startsWith('dis-') || clean.startsWith('dé-') || clean.startsWith('des-')) return 'Italic: de- / dis- (分離/解除)';
    if (clean.startsWith('pro-') || clean.startsWith('pre-') || clean.startsWith('pour-')) return 'Italic: pre- / pro- (前に)';
    if (clean.startsWith('trans-') || clean.startsWith('tra-') || clean.startsWith('tras-')) return 'Italic: trans- (越えて)';
    if (clean.startsWith('sur-') || clean.startsWith('sobre-') || clean.startsWith('sopra-')) return 'Italic: sur- / sobre- (上に/超越)';
    if (clean.startsWith('フランス') || clean.startsWith('ロマンス') || clean.startsWith('イベロ') || clean.startsWith('イタリア') || clean.includes('romance') || clean.includes('french')) return 'Romance: ロマンス諸語根幹 (仏・西・伊・葡)';
    if (clean.startsWith('西ゲルマン') || clean.startsWith('古英語') || clean.includes('old english')) return 'Germanic: 西ゲルマン語群根幹 (Old English)';
    if (clean.startsWith('オランダ') || ['ont-', 'her-', 'aan-', 'uit-', 'tegen-', 'wan-'].some(x => clean.startsWith(x))) return 'Germanic: オランダ・低地ゲルマン語幹';
    if (clean.startsWith('ドイツ') || ['ver-', 'be-', 'auf-', 'ent-', 'er-', 'ge-', 'ab-', 'vor-', 'nach-', 'aus-', 'zer-'].some(x => clean.startsWith(x))) return 'Germanic: ドイツ・西ゲルマン語幹';
    if (clean.startsWith('ギリシャ') || ['dia-', 'anti-', 'tele-', 'photo-', 'syn-', 'sym-', 'auto-', 'micro-', 'macro-', 'poly-', 'mono-', 'hyper-', 'hypo-'].some(x => clean.startsWith(x))) return 'Greek: ギリシャ古典語幹';

    return bLabel;
  }

  /**
   * 語源テキスト・接頭辞から古典分岐（第2階層: Branch）を抽出
   * 印欧祖語（英・仏・独・西・伊・葡・蘭）および東アジア漢字字源（中・韓・日）の双方に対応
   */
  function extractBranchInfo(item, rootKey, itemLang = '') {
    const ety = String(item?.etymology || '').toLowerCase();
    const word = String(item?.word || '').toLowerCase();
    const rawWord = String(item?.word || '');
    const gram = String(item?.grammar_forms || '');
    const lang = String(itemLang || item?.lang || 'en').toLowerCase();
    const isCjkRoot = Boolean(rootKey && /^\*[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]$/.test(String(rootKey).trim()));

    // 0. 東アジア漢字文化圏（中国語・韓国語・日本語の漢字語・字源系統）
    if (isCjkRoot || lang === 'zh' || lang === 'ko' || (lang === 'ja' && /[\u4E00-\u9FFF]/.test(rawWord))) {
      const cjkText = `${rawWord} ${gram} ${item?.etymology || ''}`;
      if (/^[不非無未反否]|(?:불|비|무|미|반)/.test(rawWord) || /^[不非無未反否]/.test(gram)) {
        return 'Sinospheric: 不-/非-/無- (否定・対抗接頭系)';
      }
      if (/[化性的度力権観論法制権]$|(?:화|성|적|도|력|권|관|론|법|제)$/.test(rawWord) || /[化性的度力権観論法制]$/.test(gram)) {
        return 'Sinospheric: -化/-性/-論/-制 (抽象・制度派生系)';
      }
      if (/^[超全多総高大新再共国際]|(?:초|전|다|총|고|대|신|재|공)/.test(rawWord)) {
        return 'Sinospheric: 超-/全-/共- (程度・統合接頭系)';
      }
      if (lang === 'zh') return 'Sinospheric: 中国語・漢語本源構文 (Chinese)';
      if (lang === 'ko') return 'Sinospheric: 韓国漢字語・東アジア共有語幹 (Korean Hanja)';
      return 'Sinospheric: 和製漢語・東アジア漢字複合語 (Japanese Kanji)';
    }

    // 1. 古典ラテン語系の主要接頭辞（同義異形を統合し、過密と衝突を根絶）
    const latinPrefixes = [
      { p: 'con', label: 'con- / com- (共に)' },
      { p: 'com', label: 'con- / com- (共に)' },
      { p: 'sub', label: 'sub- (下に)' },
      { p: 'suc', label: 'sub- (下に)' },
      { p: 'suf', label: 'sub- (下に)' },
      { p: 'sup', label: 'sub- (下に)' },
      { p: 'sus', label: 'sub- (下に)' },
      { p: 'in', label: 'in- / im- (中に/否定)' },
      { p: 'im', label: 'in- / im- (中に/否定)' },
      { p: 'il', label: 'in- / im- (中に/否定)' },
      { p: 'ir', label: 'in- / im- (中に/否定)' },
      { p: 'ex', label: 'ex- (外に)' },
      { p: 'per', label: 'per- (完全に)' },
      { p: 'trans', label: 'trans- (越えて)' },
      { p: 're', label: 're- (再び/後)' },
      { p: 'pro', label: 'pre- / pro- (前に)' },
      { p: 'pre', label: 'pre- / pro- (前に)' },
      { p: 'de', label: 'de- / dis- (分離/解除)' },
      { p: 'dis', label: 'de- / dis- (分離/解除)' },
      { p: 'di', label: 'de- / dis- (分離/解除)' },
      { p: 'ad', label: 'ad- (向かって)' },
      { p: 'ac', label: 'ad- (向かって)' },
      { p: 'ap', label: 'ad- (向かって)' },
      { p: 'at', label: 'ad- (向かって)' },
      { p: 'ob', label: 'ob- (対して)' },
      { p: 'op', label: 'ob- (対して)' },
      { p: 'inter', label: 'inter- (相互)' },
      { p: 'contra', label: 'contra- (対抗)' },
      { p: 'counter', label: 'counter- (対抗)' }
    ];

    // 2. ロマンス諸語（フランス・スペイン・イタリア・ポルトガル）固有の変形・接頭辞階層
    const romancePrefixes = [
      { p: 'sur', label: 'sur- / sobre- (上に/超越)' },
      { p: 'sobre', label: 'sur- / sobre- (上に/超越)' },
      { p: 'sopra', label: 'sur- / sobre- (上に/超越)' },
      { p: 'sotto', label: 'sub- (下に)' },
      { p: 'en', label: 'en- / em- (内部化/促成)' },
      { p: 'em', label: 'en- / em- (内部化/促成)' },
      { p: 'dé', label: 'de- / dis- (分離/解除)' },
      { p: 'des', label: 'de- / dis- (分離/解除)' },
      { p: 'ri', label: 're- (再び/後)' },
      { p: 'par', label: 'per- (完全に)' },
      { p: 'por', label: 'per- (完全に)' },
      { p: 'tras', label: 'trans- (越えて)' },
      { p: 'tra', label: 'trans- (越えて)' },
      { p: 'entre', label: 'entre- (相互/中間)' },
      { p: 'més', label: 'més- (過誤/悪)' },
      { p: 'pour', label: 'pre- / pro- (前に)' }
    ];

    // 3. 西ゲルマン語群・英語本来語（古英語）の固有接頭辞階層
    const germanicPrefixes = [
      { p: 'under', label: 'under- (下層/基底)' },
      { p: 'over', label: 'over- (超過/支配)' },
      { p: 'fore', label: 'fore- (予め/前方)' },
      { p: 'with', label: 'with- (対抗/後退)' },
      { p: 'out', label: 'out- (外部/凌駕)' },
      { p: 'mis', label: 'mis- (誤り/悪)' },
      { p: 'after', label: 'after- (追従/後)' }
    ];

    // 4. ドイツ語・オランダ語（西ゲルマン大陸諸語）固有の前綴り階層
    const germanDutchPrefixes = [
      { p: 'ver', label: 'ver- (変化/完了)' },
      { p: 'ent', label: 'ent- / ont- (分離/開始)' },
      { p: 'ont', label: 'ent- / ont- (分離/開始)' },
      { p: 'zer', label: 'zer- (解体/破壊)' },
      { p: 'er', label: 'er- / her- (獲得/再起)' },
      { p: 'her', label: 'er- / her- (獲得/再起)' },
      { p: 'ge', label: 'ge- (集合/完了)' },
      { p: 'auf', label: 'auf- / op- (上方/開始)' },
      { p: 'op', label: 'auf- / op- (上方/開始)' },
      { p: 'aus', label: 'aus- / uit- (脱出/徹底)' },
      { p: 'uit', label: 'aus- / uit- (脱出/徹底)' },
      { p: 'ab', label: 'ab- / af- (離脱/減少)' },
      { p: 'af', label: 'ab- / af- (離脱/減少)' },
      { p: 'vor', label: 'vor- / voor- (前方/事前)' },
      { p: 'voor', label: 'vor- / voor- (前方/事前)' },
      { p: 'nach', label: 'nach- / na- (追従/後)' },
      { p: 'aan', label: 'an- / aan- (接触/開始)' },
      { p: 'onder', label: 'under- (下層/基底)' },
      { p: 'tegen', label: 'tegen- / wider- (対抗)' },
      { p: 'be', label: 'be- (他動化/強調)' }
    ];

    // 5. ギリシャ古典語系の接頭辞
    const greekPrefixes = [
      { p: 'tele', label: 'tele- (遠方)' },
      { p: 'photo', label: 'photo- (光)' },
      { p: 'dia', label: 'dia- (貫通/横断)' },
      { p: 'syn', label: 'syn- (共に)' },
      { p: 'sym', label: 'sym- (共に)' },
      { p: 'anti', label: 'anti- (反対/対抗)' },
      { p: 'auto', label: 'auto- (自身)' },
      { p: 'micro', label: 'micro- (微小)' },
      { p: 'macro', label: 'macro- (巨大)' },
      { p: 'poly', label: 'poly- (多数)' },
      { p: 'mono', label: 'mono- (単一)' },
      { p: 'hyper', label: 'hyper- (超過)' },
      { p: 'hypo', label: 'hypo- (下位)' }
    ];

    // --- 分岐判定 ---

    // A. ロマンス諸語（フランス語・スペイン語・イタリア語・ポルトガル語）
    const isRomance = ['fr', 'es', 'it', 'pt'].includes(lang) || ety.includes('french') || ety.includes('spanish') || ety.includes('italian') || ety.includes('portuguese') || ety.includes('français') || ety.includes('old french') || ety.includes('anglo-norman');
    if (isRomance) {
      // 1) ロマンス語固有変形接頭辞
      const matchedRomance = romancePrefixes.find(pr => {
        if (word.startsWith(pr.p) || ety.includes(`${pr.p}-`)) {
          if (pr.p === 'en' && ['end', 'enemy', 'entire', 'entry'].includes(word)) return false;
          if (pr.p === 'em' && ['empire', 'empty'].includes(word)) return false;
          return true;
        }
        return false;
      });
      if (matchedRomance) return `Italic: ${matchedRomance.label}`;

      // 2) ラテン共通接頭辞
      const matchedLatin = latinPrefixes.find(pr => word.startsWith(pr.p) || ety.includes(`${pr.p}-`));
      if (matchedLatin) return `Italic: ${matchedLatin.label}`;

      return 'Romance: ロマンス諸語根幹 (仏・西・伊・葡)';
    }

    // B. ドイツ語・オランダ語（大陸西ゲルマン語群）
    const isGermanDutch = lang === 'de' || lang === 'nl' || ety.includes('german') || ety.includes('dutch') || ety.includes('deutsch') || ety.includes('nederlands') || ety.includes('old high german');
    if (isGermanDutch) {
      const matchedGerman = germanDutchPrefixes.find(pr => word.startsWith(pr.p) || ety.includes(`${pr.p}-`));
      if (matchedGerman) return `Germanic: ${matchedGerman.label}`;
      return lang === 'nl' ? 'Germanic: オランダ・低地ゲルマン語幹' : 'Germanic: ドイツ・西ゲルマン語幹';
    }

    // C. ギリシャ古典語系
    const isGreek = ety.includes('greek') || ety.includes('hellenic') || greekPrefixes.some(pr => word.startsWith(pr.p));
    if (isGreek) {
      const matchedGreek = greekPrefixes.find(pr => word.startsWith(pr.p) || ety.includes(`${pr.p}-`));
      if (matchedGreek) return `Greek: ${matchedGreek.label}`;
      return 'Greek: ギリシャ古典語幹';
    }

    // D. ゲルマン祖語・古英語（本来語根）
    const isExplicitGermanic = ety.includes('old english') || ety.includes('proto-germanic') || ety.includes('germanic') || ety.includes('anglo-saxon') || ety.includes('norse');
    if (isExplicitGermanic) {
      // 1) ゲルマン固有主要接頭辞
      const matchedGmc = germanicPrefixes.find(pr => word.startsWith(pr.p) || ety.includes(`${pr.p}-`));
      if (matchedGmc) return `Germanic: ${matchedGmc.label}`;

      // 2) 特殊語根 (*sta- 等)
      if (rootKey === '*sta-' && (word.includes('stand') || word.includes('stund') || word.includes('steh') || word.includes('staan'))) {
        return 'Germanic: *standaną (立つ)';
      }

      // 3) un- / be- / for- 特殊接頭辞
      if (word.startsWith('un') && word.length > 3 && !['unit', 'unite', 'uncle', 'under', 'unique', 'union', 'until'].some(w => word.startsWith(w))) {
        return 'Germanic: un- (否定/反転)';
      }
      if ((word.startsWith('be') && ['become', 'behold', 'befall', 'believe', 'behave', 'beset', 'beware', 'beside', 'between', 'beyond'].some(w => word.startsWith(w))) || ety.includes('be-')) {
        return 'Germanic: be- (強調/他動化)';
      }
      if ((word.startsWith('for') && ['forbid', 'forgive', 'forget', 'forgo', 'forlorn', 'forsake', 'forbear'].some(w => word.startsWith(w))) || ety.includes('for-')) {
        return 'Germanic: for- (徹底/禁止)';
      }
      if (word.startsWith('up') && ['upright', 'uphold', 'upset', 'upward', 'upbringing', 'upgrade', 'uproar', 'upheaval', 'upside'].some(w => word.startsWith(w))) {
        return 'Germanic: up- (上方/向上)';
      }

      return 'Germanic: 古英語本来語幹 (Old English Core)';
    }

    // E. ラテン系英語（接頭辞あり、またはetymologyにlatin記載）
    const matchedLatinPrefix = latinPrefixes.find(pr => word.startsWith(pr.p) || ety.includes(`${pr.p}-`));
    if (matchedLatinPrefix) {
      return `Italic: ${matchedLatinPrefix.label}`;
    }
    if (ety.includes('latin') || ety.includes('lat.')) {
      if (rootKey === '*sta-') return 'Latin: stāre (立つ)';
      return 'Latin: 古典ラテン語幹';
    }

    // F. 日本語借用語
    if (lang === 'ja') {
      return 'Borrowed: 外来・学術受容';
    }

    // G. 英語の標準語根派生（本来語・接頭辞付き本来語フォールバック）
    const matchedDefaultGmc = germanicPrefixes.find(pr => word.startsWith(pr.p) || ety.includes(`${pr.p}-`));
    if (matchedDefaultGmc) {
      return `Germanic: ${matchedDefaultGmc.label}`;
    }
    if (word.startsWith('un') && word.length > 3 && !['unit', 'unite', 'uncle', 'under', 'unique', 'union', 'until'].some(w => word.startsWith(w))) {
      return 'Germanic: un- (否定/反転)';
    }
    if (rootKey === '*sta-' && (word.includes('stand') || word.includes('stund') || word.includes('steh') || word.includes('staan'))) {
      return 'Germanic: *standaną (立つ)';
    }

    return 'Germanic: 西ゲルマン語群根幹 (Old English)';
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

    // 全登録言語ペア辞書、または標準10言語キーから単語を収集
    const allPairs = (global.VocabCore?.getAllKnownPairConfigs || global.getAllKnownPairConfigs)?.() || [];
    const defaultLangs = (global.LANG_KEYS || global.VocabStorage?.LANG_KEYS || global.VocabCore?.LANG_KEYS || ['en', 'fr', 'de', 'es', 'it', 'pt', 'nl', 'zh', 'ko', 'ja']);
    const langMap = global.LANGS || global.VocabStorage?.LANGS || global.VocabCore?.LANGS || {
      en: { key: 'distinction_entries' },
      fr: { key: 'distinction_entries_fr' },
      de: { key: 'distinction_entries_de' },
      es: { key: 'distinction_entries_es' },
      it: { key: 'distinction_entries_it' },
      pt: { key: 'distinction_entries_pt' },
      nl: { key: 'distinction_entries_nl' },
      zh: { key: 'distinction_entries_zh' },
      ko: { key: 'distinction_entries_ko' },
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
            const pieMatches = String(item.etymology).match(/\*([a-zāēīōūăĕĭŏŭáéíóúàèìòùâêîôûəǭḗh₁₂₃₄ḱǵʷʰ]+(?:-[a-zāēīōūăĕĭŏŭáéíóúàèìòùâêîôûəǭḗh₁₂₃₄ḱǵʷʰ]*)?)/gi);
            const cjkMatches = String(item.etymology).match(/\*([\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF])/g);
            const combined = [...(pieMatches || []), ...(cjkMatches || [])];
            if (combined.length) {
              itemRoots = combined.map(cleanRootKey).filter(r => r && isValidRootFn(r, item));
            }
          }
          // 東アジア言語（zh, ko, ja）で語源タグが未設定の場合、見出し語または活用欄の漢字から共通漢字字源を自動抽出
          if (!itemRoots.length && ['zh', 'ko', 'ja'].includes(srcL)) {
            const cjkSource = `${item.word || ''}${item.grammar_forms || ''}`;
            const cjkChars = cjkSource.match(/[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/g);
            if (cjkChars && cjkChars.length > 0) {
              itemRoots = [...new Set(cjkChars.slice(0, 2).map(ch => cleanRootKey(`*${ch}`)))].filter(Boolean);
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
      const spacing = 460;

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
            const dist = 100 + (cIdx % 5) * 24;
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

      function createUnifiedPieRoot() {
        const uRoot = {
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
              uRoot.connectedWords.push(w);
            }
          });
        });
        uRoot.childCount = uRoot.connectedWords.length;
        return uRoot;
      }

      let isUnifiedPIE = !graphState.focusedRootKey;
      let activeRoots = [];

      if (isUnifiedPIE) {
        // 全語根を1つの「印欧祖語 / PIE」コアに大統合
        activeRoots = [createUnifiedPieRoot()];
      } else {
        const fKey = cleanRootKey(graphState.focusedRootKey);
        const fKeyFlat = fKey.replace(/^\*/, '').replace(/-$/, '').toLowerCase();
        const found = finalRoots.filter(r => {
          const rFlat = (r.label || '').replace(/^\*/, '').replace(/-$/, '').toLowerCase();
          return r.label === fKey || rFlat === fKeyFlat || r.label === graphState.focusedRootKey;
        });
        if (found.length > 0) {
          activeRoots = found;
        } else {
          // 指定語根が見つからない場合は単一統合PIEにフォールバック（200語根が散らばるのを防止）
          isUnifiedPIE = true;
          activeRoots = [createUnifiedPieRoot()];
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
          let bLabel = extractBranchInfo(wNode.item, primRoot, wNode.lang);
          if (isTree || isUnifiedPIE) {
            bLabel = normalizeBranch(bLabel);
          }

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
              radius: 9.5,
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
          let bLabel = extractBranchInfo(budWordData, primRoot, 'en');
          if (isTree || isUnifiedPIE) {
            bLabel = normalizeBranch(bLabel);
          }

          const bId = isUnifiedPIE ? `branch:pie:${bLabel}` : `branch:${rNode.label}:${bLabel}`;
          let bNode = branchMap.get(bId);
          if (!bNode) {
            bNode = {
              id: bId,
              label: bLabel,
              type: 'branch',
              level: 2,
              rootLabel: rNode.label,
              radius: 9.5,
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
            radius: 8.0,
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
              parentWordId: wNode.id,
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
        if (bl.startsWith('germanic') || bl.includes('german') || bl.includes('old english') || bl.includes('deutsch')) {
          return 'germanic';
        }
        if (bl.startsWith('italic') || bl.startsWith('latin') || bl.startsWith('romance') || bl.includes('french') || bl.includes('français')) {
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

          const pad = 0.06; // 境界線とのパディング
          const totalSpan = (sDef.end - sDef.start) - pad * 2;

          // セクター内の各ブランチの単語数（重み）を計算
          const totalWordsInSector = bList.reduce((sum, b) => sum + Math.max(3, (b.connectedWords?.length || 0) + (b.connectedBuds?.length || 0) * 0.5), 0);

          let currentTheta = sDef.start + pad;

          bList.forEach((bNode, bIdx) => {
            const bWords = (bNode.connectedWords?.length || 0) + (bNode.connectedBuds?.length || 0) * 0.5;
            const rawWeight = Math.max(3, bWords) / Math.max(1, totalWordsInSector);
            // 最低限の角度スパン（0.18 rad ≈ 10.3度）を確保してテキスト衝突を防止（セクター境界を超えないようクランプ）
            const branchSpan = (numB === 1) ? totalSpan : (totalSpan < numB * 0.18 ? (totalSpan / numB) : Math.max(0.18, totalSpan * rawWeight));
            const thetaB = (numB === 1) ? sDef.center : (currentTheta + branchSpan / 2);
            currentTheta += branchSpan;

            // 第1軌道: 古典分岐ノード (r = 240, 315, 390 3段階スタガー配置でブランチ同士の接触・重合を解消)
            const bRadius = (numB <= 2) ? 260 : (240 + (bIdx % 3) * 75);
            bNode.targetX = rNode.targetX + bRadius * Math.cos(thetaB);
            bNode.targetY = rNode.targetY + bRadius * Math.sin(thetaB);
            bNode.angle = thetaB;

            // 第2軌道〜外周軌道: 現代語の学習済ノード (Multi-Orbit Staggering: 500px〜)
            // 単語同士の物理距離を十分に空けつつ、親ブランチの放射コーン内に収めて扇状に整然と配置
            const leaves = bNode.connectedWords || [];
            const leafCount = leaves.length;

            const baseLeafR = 500;
            const leafOrbitGap = 72;

            // 軌道数の動的計算（1〜5軌道）
            const numLeafOrbits = leafCount > 24 ? 5 : (leafCount > 12 ? 4 : (leafCount > 6 ? 3 : (leafCount > 2 ? 2 : 1)));

            // 親ブランチの角度スパン内に収め、他ブランチの単語領域と交差・重複しないように厳密にバインド
            const maxAllowedSpan = Math.min(branchSpan * 0.88, 0.45);
            const lSpan = Math.min(maxAllowedSpan, Math.max(0.06, (leafCount - 1) * 0.035));
            const lStart = thetaB - lSpan / 2;

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
                const myTwigs = twigs.filter(t => (t.parentWordId ? t.parentWordId === lNode.id : t.parentWord === lNode.label));
                myTwigs.forEach((tNode, tIdx) => {
                  const twigOffset = (myTwigs.length === 1) ? 0 : (-0.040 + (0.080 / Math.max(1, myTwigs.length - 1)) * tIdx);
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

            const maxLeafOrbitR = baseLeafR + Math.max(0, numLeafOrbits - 1) * leafOrbitGap;
            const budBaseR = maxLeafOrbitR + 80;
            const numBudOrbits = budCount > 12 ? 3 : (budCount > 4 ? 2 : 1);
            const budOrbitGap = 75;

            const budSpan = Math.min(branchSpan * 0.85, 0.42);
            const budStart = thetaB - budSpan / 2;

            const budBuckets = Array.from({ length: numBudOrbits }, () => []);
            buds.forEach((budNode, budIdx) => {
              budBuckets[budIdx % numBudOrbits].push(budNode);
            });

            budBuckets.forEach((bBucket, boIdx) => {
              const budR = budBaseR + boIdx * budOrbitGap;
              const countInBBucket = bBucket.length;
              if (countInBBucket === 0) return;

              const bStep = (countInBBucket > 1) ? (budSpan / (countInBBucket - 1)) : 0;
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
          const parentNode = (tNode.parentWordId ? nodeMap.get(tNode.parentWordId) : null) ||
                             nodeMap.get(`word:en:${tNode.parentWord}#1`) ||
                             nodes.find(n => n.label === tNode.parentWord);
          if (parentNode && parentNode.targetX !== undefined) {
            const pAngle = parentNode.angle || 0;
            const thetaT = pAngle + (tIdx % 2 === 0 ? -0.040 : 0.040);
            tNode.targetX = parentNode.targetX + 48 * Math.cos(thetaT);
            tNode.targetY = parentNode.targetY + 48 * Math.sin(thetaT);
          } else if (parentNode && parentNode.x !== undefined) {
            tNode.targetX = parentNode.x + 48;
            tNode.targetY = parentNode.y;
          }
        }
      });

      // 緩和パス (O(N) Relaxation Pass): 重なり防止の微小補正
      const placedNodes = nodes.filter(n => n.targetX !== undefined && n.type !== 'root');
      const rCell = 80;
      const passes = 3;

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
                  ? 80
                  : ((na.type === 'word' && nb.type === 'word') ? 60 : 50);
                if (distSq < minDist * minDist && distSq > 0.001) {
                  const dist = Math.sqrt(distSq);
                  const push = Math.min(3.5, (minDist - dist) * 0.25);
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

      // 初期位置のセット（系統樹モード時はターゲット確定座標で初期化）
      // 確定座標が付与されなかった孤立ノードを安全に除外して原点(0,0)集中を防止
      const validNodes = [];
      const validNodeSet = new Set();
      nodes.forEach(n => {
        if (n.targetX !== undefined) {
          n.x = n.targetX;
          n.y = n.targetY;
          validNodes.push(n);
          validNodeSet.add(n);
        }
      });
      nodes.length = 0;
      nodes.push(...validNodes);

      const validEdges = finalEdges.filter(e => validNodeSet.has(e.source) && validNodeSet.has(e.target));
      finalEdges.length = 0;
      finalEdges.push(...validEdges);
    }

    // クイックジャンプ用セレクター (#graphRootJumpSel) & パンくずバーの動的更新
    populateRootJumpSelect(finalRoots);
    updateBreadcrumbUI(finalRoots);

    return { nodes, edges: finalEdges };
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


  global.VocabGraphLayout = {
    CANONICAL_ROOT_ALIASES,
    cleanRootKey,
    getRootMeaning,
    resolveRootKey,
    normalizeBranch,
    extractBranchInfo,
    buildGraphData,
    computeOffThreadPositions
  };
})(typeof window !== 'undefined' ? window : globalThis);
