/**
 * Vocab Vault — Modular Starter Pack Metadata & Lazy Chunk Loader (src/starter_pack.js)
 * Keeps pack items & 9-language localization tables in lazy chunks under dist/chunks/.
 */
import { loadChunkScript, loadChunkSyncIfJsc, hasNativeJscLoad } from './chunk_loader.js';

const global = typeof window !== 'undefined' ? window : globalThis;
const PACKS = Object.create(null);
const STARTER_LOCALIZATIONS = Object.create(null);
const STATIC_PACK_IDS = new Set([
  'academic', 'business', 'essential', 'classical_roots', 'philosophy',
  'fr_pre1', 'de_pre1', 'es_pre1', 'it_pre1', 'pt_pre1', 'nl_pre1',
  'zh_pre1', 'ko_pre1', 'ja_pre1', 'medical_roots', 'legal_roots', 'tech_ai', 'gre_verbal'
]);
let _locsLoaded = false;

global.__VV_REG_PACK__ = function registerPackChunk(packId, items) {
  if (packId && Array.isArray(items)) {
    PACKS[packId] = items;
    if (typeof STARTER_WORD_MAP !== 'undefined' && STARTER_WORD_MAP?.clear) {
      STARTER_WORD_MAP.clear();
    }
  }
};

global.__VV_REG_STARTER_LOCS__ = function registerStarterLocsChunk(locs) {
  if (locs && typeof locs === 'object') {
    Object.assign(STARTER_LOCALIZATIONS, locs);
    _locsLoaded = true;
  }
};

function resolvePackKey(lang = 'en', packType = 'academic') {
  if ((packType === 'academic' || packType === 'default') && DEFAULT_PACK_BY_LANG[lang]) {
    return DEFAULT_PACK_BY_LANG[lang];
  }
  return packType || DEFAULT_PACK_BY_LANG[lang] || 'academic';
}

function ensurePackSyncIfJsc(resolved) {
  if (PACKS[resolved] || !STATIC_PACK_IDS.has(resolved)) return false;
  return loadChunkSyncIfJsc('dist/chunks/starter-' + resolved + '.js');
}

function ensureLocsSyncIfJsc() {
  if (_locsLoaded) return true;
  return loadChunkSyncIfJsc('dist/chunks/starter-locs.js');
}

function isPackReady(packType = 'academic', lang = 'en') {
  const resolved = resolvePackKey(lang, packType);
  if (PACKS[resolved] && PACKS[resolved].length > 0) return true;
  if (!STATIC_PACK_IDS.has(resolved)) return true;
  ensurePackSyncIfJsc(resolved);
  return Boolean(PACKS[resolved] && PACKS[resolved].length > 0);
}

function isLocsReady() {
  if (_locsLoaded) return true;
  ensureLocsSyncIfJsc();
  return _locsLoaded;
}

async function ensurePack(packType = 'academic', lang = 'en') {
  const resolved = resolvePackKey(lang, packType);
  if (isPackReady(resolved, lang)) return true;
  await loadChunkScript('dist/chunks/starter-' + resolved + '.js');
  return Boolean(PACKS[resolved]);
}

async function ensureStarterLocalizations() {
  if (isLocsReady()) return true;
  await loadChunkScript('dist/chunks/starter-locs.js');
  return _locsLoaded;
}
  const PACK_METADATA = {
    academic: { id: 'academic', lang: 'en', name: '学術・教養コア20選', desc: '哲学・認知科学・思想史を貫く深層語彙', badge: '学術・思想', count: 20, wordsPreview: 'epiphany, lucid, constant, premise...' },
    eiken_pre1_pack1: { id: 'eiken_pre1_pack1', lang: 'en', name: '英検準1級 語根パック①【掴む・運ぶ・立つ】', desc: '*kap-, *bher-, *sta- で制覇する抽象動詞・制度語彙群', badge: '英検準1級・頻出', count: 25, wordsPreview: 'conceive, deceive, perceive, constitute, destitute, defer, proffer...' },
    eiken_pre1_pack2: { id: 'eiken_pre1_pack2', lang: 'en', name: '英検準1級 語根パック②【見る・言う・保つ】', desc: '*spec-, *deik-, *ten- で覚える観察・言明・持続の重要語', badge: '英検準1級・頻出', count: 20, wordsPreview: 'circumspect, conspicuous, vindicate, verdict, sustain, abstain...' },
    eiken_pre1_pack3: { id: 'eiken_pre1_pack3', lang: 'en', name: '英検準1級 語根パック③【動かす・座る・従う】', desc: '*ag-, *sed-, *sekw- で整理する社会・法学・論理語彙', badge: '英検準1級・頻出', count: 20, wordsPreview: 'agitate, cogent, preside, subsidize, subsequent, prosecute...' },
    eiken_pre1_pack4: { id: 'eiken_pre1_pack4', lang: 'en', name: '英検準1級 難単語パック【接頭辞の対比動詞】', desc: 'prescribe / proscribe / ascribe や subvert / avert の混同を語根で根絶', badge: '英検準1級・精選', count: 20, wordsPreview: 'prescribe, proscribe, ascribe, inscribe, subvert, avert, compel...' },
    classical_roots: { id: 'classical_roots', lang: 'en', name: 'ラテン・ギリシャ古典語根マスター', desc: '*ǵneh₃-, *bʰer-, *speḱ- 等の深層印欧祖語ファミリー', badge: '語源・比較言語学', count: 5, wordsPreview: 'gnosis, transfer, circumspect, dictum, evidence' },
    philosophy: { id: 'philosophy', lang: 'en', name: '西洋哲学・人文学キーコンセプト', desc: '目的論、パラダイム、存在論、弁証法、アポリア', badge: '形而上学・認識論', count: 5, wordsPreview: 'teleology, paradigm, ontology, dialectic, aporia' },
    medical_roots: { id: 'medical_roots', lang: 'en', name: '医学・解剖学ラテン・ギリシャ語根（USMLE）', desc: '*kʷentʰ-, *mū-, *ḱerd-, *snéh₁wr̥, *steh₂- で覚える解剖・病理用語', badge: '医学・USMLE・解剖', count: 7, wordsPreview: 'pathology, myocardium, neurology, hemostasis, cephalic, tachycardia, homeostasis' },
    legal_roots: { id: 'legal_roots', lang: 'en', name: '英米法・国際法学ラテン語根（Law/MBA）', desc: '*yew-, *ked-, *bʰeydʰ-, *dap- で読み解く裁判管轄・判例・免責法理', badge: '法学・契約・MBA', count: 7, wordsPreview: 'jurisdiction, precedent, affidavit, indemnify, sovereignty, tort, subpoena' },
    tech_ai: { id: 'tech_ai', lang: 'en', name: 'AI・データサイエンス・先端工学語根', desc: '*al-, *kʷel-, *krewp-, *snéh₁wr̥, *med-, *ter- で読み解く現代先端計算科学', badge: 'AI・CS・先端技術', count: 6, wordsPreview: 'algorithm, cybernetics, cryptography, neural, parameter, deterministic' },
    gre_verbal: { id: 'gre_verbal', lang: 'en', name: 'GRE・SAT最難関・教養語根マスター', desc: '*kʷel-, *wekw-, *h₂mer-, *pa-, *en-, *wer- で挑む米大学院・最高峰アカデミック語彙', badge: 'GRE・SAT・最難関', count: 6, wordsPreview: 'anachronism, equivocate, ephemeral, panacea, esoteric, heuristic' },
    business: { id: 'business', lang: 'en', name: '実践ビジネス・TOEIC 800+ 20選', desc: '契約・財務・市場分析を支える実務必須語彙', badge: '実務・経済', count: 20, wordsPreview: 'consolidate, diversify, leverage, volatile...' },
    essential: { id: 'essential', lang: 'en', name: '重要語根ファミリー20選', desc: '*speḱ- (見る), *deyk- (言う) など語根で覚える高速基礎群', badge: '語根基礎', count: 20, wordsPreview: 'spectacle, predict, contradict, factory...' },
    fr_pre1: { id: 'fr_pre1', lang: 'fr', name: '仏検準1級・DELF B2 語根コア20選', desc: '*kap-, *sta-, *ten-, *bher- 等ラテン語直系の思考・認識・制度動詞群', badge: '仏検準1級・DELF B2', count: 20, wordsPreview: 'concevoir, percevoir, constater, maintenir, susciter, différer...' },
    de_pre1: { id: 'de_pre1', lang: 'de', name: '独検準1級・Goethe B2 語根・分離動詞20選', desc: '*sta-, *dʰregʰ-, *dewk-, *kel- 等ゲルマン祖語と接頭辞の構造化動詞群', badge: '独検準1級・Goethe B2', count: 20, wordsPreview: 'bestehen, entstehen, einbeziehen, bewältigen, nachhaltig, übertragen...' },
    es_pre1: { id: 'es_pre1', lang: 'es', name: 'スペイン語 DELE B2・印欧語根コア選', desc: '*kap-, *ten-, *sta-, *bher-, *spec- で英・仏・羅と繋がる学術スペイン語', badge: 'DELE B2・西検準1級', count: 6, wordsPreview: 'concebir, mantener, establecer, transferir, perspectiva, contradecir' },
    it_pre1: { id: 'it_pre1', lang: 'it', name: 'イタリア語 CILS B2・ルネサンス語根選', desc: 'ラテン語直系の *kap-, *ten-, *sta-, *spec- を体現するイタリア教養語彙', badge: 'CILS B2・伊検準1級', count: 6, wordsPreview: 'concepire, sostenere, costituire, trasferire, prospettiva, presiedere' },
    pt_pre1: { id: 'pt_pre1', lang: 'pt', name: 'ポルトガル語 CELPE-Bras・ロマンス語根選', desc: 'イベロ・ロマンス語派の *kap-, *ten-, *sta-, *bher- 基幹語彙', badge: 'CELPE-Bras・B2', count: 5, wordsPreview: 'conceber, manter, estabelecer, transferir, perspectiva' },
    nl_pre1: { id: 'nl_pre1', lang: 'nl', name: 'オランダ語 NT2 II・西ゲルマン語根選', desc: '英語とドイツ語を架橋する *sta-, *kap-, *tragh-, *ten- 前綴り動詞群', badge: 'NT2 II・CNaVT B2', count: 5, wordsPreview: 'bestaan, ontstaan, begrijpen, overdragen, onderhouden' },
    zh_pre1: { id: 'zh_pre1', lang: 'zh', name: '中国語 HSK 5-6級・東アジア漢字字源選', desc: '*政, *経, *理, *観, *権, *識, *構, *概 で日中韓を貫く近代学術漢語コア', badge: 'HSK 6級・字源系統樹', count: 8, wordsPreview: '政策, 经济, 理论, 观念, 权利, 认识, 结构, 概念' },
    ko_pre1: { id: 'ko_pre1', lang: 'ko', name: '韓国語 TOPIK II・漢字語字源ネットワーク選', desc: '頭音法則・流音化を漢字字源 (*政, *経, *理, *観, *権, *識, *構, *概) で体系攻略', badge: 'TOPIK II・ハン検準2級', count: 8, wordsPreview: '정책, 경제, 이론, 관점, 권리, 인식, 구조, 개념' },
    ja_pre1: { id: 'ja_pre1', lang: 'ja', name: '日本語能力試験 N1・東アジア漢字字源選', desc: '*政, *経, *理, *観, *権, *識, *構, *概 など東アジア共通漢字字源ネットワーク', badge: 'JLPT N1・字源', count: 8, wordsPreview: '政策, 経済, 理論, 観点, 権利, 認識, 構造, 概念' }
  };

  const LANG_TAG_LABELS = {
    en: '[英語] ',
    fr: '[仏語] ',
    de: '[独語] ',
    es: '[西語] ',
    it: '[伊語] ',
    pt: '[葡語] ',
    nl: '[蘭語] ',
    zh: '[中語] ',
    ko: '[韓語] ',
    ja: '[日語] '
  };

  const LANG_NAMES = {
    en: '英語',
    fr: 'フランス語',
    de: 'ドイツ語',
    es: 'スペイン語',
    it: 'イタリア語',
    pt: 'ポルトガル語',
    nl: 'オランダ語',
    zh: '中国語',
    ko: '韓国語',
    ja: '日本語'
  };

  function buildStarterPackGalleryHtml(currentLang = 'all') {
    const packs = Object.values(PACK_METADATA);
    const activeL = (currentLang && currentLang !== 'all') ? String(currentLang).toLowerCase() : 'all';

    // 言語別パック数集計
    const langCounts = {};
    packs.forEach(p => {
      const l = p.lang || 'en';
      langCounts[l] = (langCounts[l] || 0) + 1;
    });

    // フィルタバー構築
    const filterButtons = [
      `<button type="button" class="spk-filter-btn active" data-act="filter-spk-lang" data-lang="all">すべて (${packs.length})</button>`
    ];

    Object.keys(LANG_NAMES).forEach(l => {
      if (langCounts[l]) {
        const isCur = (l === activeL);
        const name = LANG_NAMES[l] || l;
        filterButtons.push(
          `<button type="button" class="spk-filter-btn" data-act="filter-spk-lang" data-lang="${l}">
            ${isCur ? '[推奨] ' : ''}${name} (${langCounts[l]})
          </button>`
        );
      }
    });

    // 現在の選択言語に適合するパックを最上位に優先ソート
    const sorted = [...packs].sort((a, b) => {
      const aMatch = (activeL !== 'all' && (a.lang || 'en') === activeL);
      const bMatch = (activeL !== 'all' && (b.lang || 'en') === activeL);
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });

    const recomBanner = (activeL !== 'all' && langCounts[activeL]) ? `
      <div class="spk-recom-banner">
        <strong>選択中の学習言語: ${LANG_NAMES[activeL] || activeL.toUpperCase()}</strong>
        <span style="opacity:0.85;">— 最適化されたスターターパックを優先表示しています</span>
      </div>
    ` : '';

    const cards = sorted.map(p => {
      const pLang = p.lang || 'en';
      const langLabel = LANG_TAG_LABELS[pLang] || '[英語] ';
      const isMatch = (activeL !== 'all' && pLang === activeL);
      const matchBadge = isMatch ? '<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:rgba(52,211,153,0.15);color:#10b981;font-weight:600">現在選択中の言語</span>' : '';
      return `
      <div class="starter-pack-card" data-pack="${p.id}" data-lang="${pLang}" style="${isMatch ? 'border-color:var(--ac);box-shadow:0 0 0 1px var(--ac);' : ''}">
        <div class="spk-header">
          <span class="spk-badge">${langLabel}${p.badge}</span>
          ${matchBadge}
          <span class="spk-count">${p.count} 語</span>
        </div>
        <h4 class="spk-title">${p.name}</h4>
        <p class="spk-desc">${p.desc}</p>
        <div class="spk-preview"><strong>収録語例:</strong> ${p.wordsPreview}</div>
        <button type="button" class="spk-install-btn" data-act="install-starter-pack" data-pack="${p.id}">
          このパックを取り込む（無料）
        </button>
      </div>
    `;
    }).join('');

    return `
      <div class="starter-pack-gallery-wrap">
        <div class="spk-gallery-intro">
          <h3>公式スターターパック ＆ 語根・字源マスター（全10言語対応）</h3>
          <p>単語の手動登録は不要です。印欧祖語（英・仏・独・西・伊・葡・蘭）および東アジア漢字字源（中・韓・日）によって体系化された厳選語彙を1クリックで導入し、多言語が1つの根で繋がる系統樹とFSRS学習をすぐに体験できます。</p>
        </div>
        ${recomBanner}
        <div class="spk-filter-bar">${filterButtons.join('')}</div>
        <div class="starter-pack-grid">${cards}</div>
      </div>
    `;
  }

  function localizeStarterItem(item, tgtLang = 'ja', srcLang = null) {
    if (!item || typeof item !== 'object') return item;
    const t = String(tgtLang || 'ja').toLowerCase();
    if (t === 'ja' || !t) return item;
    const s = String(srcLang || item.lang || 'en').toLowerCase();

    const w = String(item.word || '').trim();
    ensureLocsSyncIfJsc();
    const locDict = STARTER_LOCALIZATIONS[w] || STARTER_LOCALIZATIONS[w.toLowerCase()];
    const loc = locDict ? (locDict[t] || locDict['en']) : null;

    const cloned = JSON.parse(JSON.stringify(item));
    cloned.tgtLang = t;
    cloned.pair = `${s}_${t}`;

    if (loc) {
      if (loc.grammar_forms) cloned.grammar_forms = loc.grammar_forms;
      if (loc.meanings) cloned.meanings = JSON.parse(JSON.stringify(loc.meanings));
      if (loc.core) cloned.core = loc.core;
      if (loc.etymology) cloned.etymology = loc.etymology;
      if (loc.history_note) cloned.history_note = loc.history_note;
      if (cloned.example && loc.exTrans) {
        cloned.example.trans = loc.exTrans;
        cloned.example[t] = loc.exTrans;
      }
      if (Array.isArray(cloned.phrases) && Array.isArray(loc.phrases)) {
        cloned.phrases = cloned.phrases.map((p, idx) => {
          const lp = loc.phrases[idx];
          return { foreign: p.foreign, trans: lp?.trans || p.trans || p.ja || '' };
        });
      }
      if (Array.isArray(cloned.derivatives) && Array.isArray(loc.derivatives)) {
        cloned.derivatives = cloned.derivatives.map((d, idx) => {
          const ld = loc.derivatives[idx];
          return { ...d, meaning: ld?.meaning || d.meaning || '' };
        });
      }
      if (loc.category) cloned.category = loc.category;
    }

    if (global.VocabI18n?.translateCategory) {
      cloned.category = global.VocabI18n.translateCategory(cloned.category, t);
    }
    if (typeof cloned.folder === 'string' && (/[\u3040-\u309f\u30a0-\u30ff]/.test(cloned.folder) || cloned.folder.includes('Starter Pack'))) {
      const spLabel = global.VocabI18n?.t ? global.VocabI18n.t('folder.starter_pack', 'Starter Pack', t) : 'Starter Pack';
      cloned.folder = `${s.toUpperCase()} ${spLabel}`;
    }

    return cloned;
  }

  const DEFAULT_PACK_BY_LANG = {
    fr: 'fr_pre1',
    de: 'de_pre1',
    es: 'es_pre1',
    it: 'it_pre1',
    pt: 'pt_pre1',
    nl: 'nl_pre1',
    zh: 'zh_pre1',
    ko: 'ko_pre1',
    ja: 'ja_pre1'
  };

  function getStarterPack(lang = 'en', packType = 'academic') {
    const resolvedReq = resolvePackKey(lang, packType);
    ensurePackSyncIfJsc(resolvedReq);
    if ((packType === 'academic' || packType === 'default') && DEFAULT_PACK_BY_LANG[lang] && PACKS[DEFAULT_PACK_BY_LANG[lang]]) {
      return JSON.parse(JSON.stringify(PACKS[DEFAULT_PACK_BY_LANG[lang]]));
    }
    if (PACKS[packType]) {
      return JSON.parse(JSON.stringify(PACKS[packType]));
    }
    // 英検準1級パックの動的構築
    if (packType === 'eiken_pre1_pack1' && global.VocabEikenCatalog) {
      const w1 = global.VocabEikenCatalog.getWordsByRoot('*kap-');
      const w2 = global.VocabEikenCatalog.getWordsByRoot('*bher-');
      const w3 = global.VocabEikenCatalog.getWordsByRoot('*sta-');
      return JSON.parse(JSON.stringify([...w1, ...w2, ...w3]));
    }
    if (packType === 'eiken_pre1_pack2' && global.VocabEikenCatalog) {
      const w1 = global.VocabEikenCatalog.getWordsByRoot('*spec-');
      const w2 = global.VocabEikenCatalog.getWordsByRoot('*deik-');
      const w3 = global.VocabEikenCatalog.getWordsByRoot('*ten-');
      return JSON.parse(JSON.stringify([...w1, ...w2, ...w3]));
    }
    if (packType === 'eiken_pre1_pack3' && global.VocabEikenCatalog) {
      const w1 = global.VocabEikenCatalog.getWordsByRoot('*ag-');
      const w2 = global.VocabEikenCatalog.getWordsByRoot('*sed-');
      const w3 = global.VocabEikenCatalog.getWordsByRoot('*sekw-');
      return JSON.parse(JSON.stringify([...w1, ...w2, ...w3]));
    }
    if (packType === 'eiken_pre1_pack4' && global.VocabEikenCatalog) {
      const w1 = global.VocabEikenCatalog.getWordsByRoot('*grebh-');
      const w2 = global.VocabEikenCatalog.getWordsByRoot('*vert-');
      const w3 = global.VocabEikenCatalog.getWordsByRoot('*pel-');
      return JSON.parse(JSON.stringify([...w1, ...w2, ...w3]));
    }
    const fallbackKey = DEFAULT_PACK_BY_LANG[lang] || 'academic';
    const list = PACKS[packType] || PACKS[fallbackKey] || [];
    return JSON.parse(JSON.stringify(list));
  }

  function getStarterPacksInfo() {
    return Object.values(PACK_METADATA);
  }

  function populateStarterPack(currentEntries, lang = 'en', packType = 'academic', targetPairKey = null, targetTgtLang = null) {
    let resolvedPack = packType;
    if (packType === 'academic' && DEFAULT_PACK_BY_LANG[lang]) {
      resolvedPack = DEFAULT_PACK_BY_LANG[lang];
    }
    const starterItems = getStarterPack(lang, resolvedPack);
    if (!starterItems.length) return { added: [], merged: currentEntries };
    const cur = Array.isArray(currentEntries) ? currentEntries : [];
    const makeLookupKey = global.VocabMorphology?.makeLookupKey || ((w, l, h) => `${l}:${String(w || '').trim().toLowerCase()}${h && h > 1 ? '#' + h : ''}`);
    const makeWordKey = global.VocabMorphology?.makeWordKey || ((w, l, pos, h) => `${l}:${String(w || '').trim().toLowerCase()}${h && h > 1 ? '#' + h : ''}`);
    const existingWords = new Set(cur.filter(x => x && !x.isDeleted).map(x => makeLookupKey(x.word, x.lang || lang, x.homographIndex)));
    const toAdd = [];

    const pairKey = targetPairKey || (global.VocabStorage?.resolveConfig ? global.VocabStorage.resolveConfig(lang).key : (lang === 'en' ? 'distinction_entries' : `distinction_entries_${lang}`));
    const clearedAt = global.VocabStorage?.getClearedAt ? global.VocabStorage.getClearedAt(pairKey) : 0;
    const tombMap = global.VocabStorage?.getTombstones ? global.VocabStorage.getTombstones(pairKey) : null;
    const now = Math.max(Date.now(), (Number(clearedAt) || 0) + 1);

    let maxNum = cur.reduce((m, x) => Math.max(m, Number(x.num) || 0), 0);
    const meta = PACK_METADATA[resolvedPack] || PACK_METADATA.academic;
    const defaultFolder = meta ? meta.name : 'スターターパック';
    let tombChanged = false;

    starterItems.forEach(item => {
      const itemLang = item.lang || (meta && meta.lang ? meta.lang : 'en');
      const hIdx = Number(item.homographIndex) || 1;
      const k = makeLookupKey(item.word, itemLang, hIdx);
      if (!existingWords.has(k)) {
        maxNum++;
        const activeTgtLang = targetTgtLang || (global.App?.tgtLang) || 'ja';
        const localizedItem = (activeTgtLang && activeTgtLang !== 'ja' && typeof localizeStarterItem === 'function')
          ? localizeStarterItem(item, activeTgtLang, itemLang)
          : item;
        const cleanSlug = String(localizedItem.word || '').trim().toLowerCase().replace(/[^a-z0-9\u00C0-\u024F\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]+/g, '_') || String(maxNum);
        const cardId = localizedItem.id || `starter_${resolvedPack}_${cleanSlug}${hIdx > 1 ? '_' + hIdx : ''}`;
        const cardWk = localizedItem.wordKey || makeWordKey(localizedItem.word, itemLang, localizedItem.meanings?.[0]?.pos, hIdx);
        const card = {
          ...localizedItem,
          id: cardId,
          wordKey: cardWk,
          homographIndex: hIdx,
          version: Number(localizedItem.version) || 1,
          num: maxNum,
          lang: itemLang,
          tgtLang: activeTgtLang,
          pair: `${itemLang}_${activeTgtLang}`,
          category: localizedItem.category || (resolvedPack.startsWith('eiken_') ? '英検準1級' : '一般・その他'),
          folder: localizedItem.folder || ((activeTgtLang && activeTgtLang !== 'ja' && /[\u3040-\u309f\u30a0-\u30ff]/.test(defaultFolder)) ? `${itemLang.toUpperCase()} ${global.VocabI18n?.t ? global.VocabI18n.t('folder.starter_pack', 'Starter Pack', activeTgtLang) : 'Starter Pack'}` : defaultFolder),
          interval: 0,
          repetition: 0,
          efactor: 2.5,
          nextReview: now,
          updatedAt: now,
          reviewUpdatedAt: 0,
          isDeleted: false
        };
        if (tombMap) {
          if (tombMap.delete(`id:${cardId}`)) tombChanged = true;
          if (tombMap.delete(`wk:${cardWk}`)) tombChanged = true;
          const normW = String(item.word || '').trim().toLowerCase();
          if (normW && tombMap.delete(`word:${normW}`)) tombChanged = true;
        }
        toAdd.push(card);
        existingWords.add(k);
      }
    });

    if (tombChanged && tombMap && global.VocabStorage?.saveTombstones) {
      global.VocabStorage.saveTombstones(pairKey, tombMap);
    }

    return { added: toAdd, merged: [...cur, ...toAdd] };
  }

  /**
   * 外部JSON / IndexedDB / バンドルフォールバック対応の非同期スターターパックデータローダー
   */
  async function loadStarterPackData(packId, lang = 'en') {
    const resolved = packId === 'academic' && DEFAULT_PACK_BY_LANG[lang] ? DEFAULT_PACK_BY_LANG[lang] : packId;
    await ensurePack(resolved, lang);
    await ensureStarterLocalizations();
    if (PACKS[resolved] && PACKS[resolved].length > 0) {
      return PACKS[resolved];
    }
    if (typeof fetch === 'function') {
      try {
        const res = await fetch(`./data/starter_packs/${resolved}.json`);
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json) && json.length > 0) {
            PACKS[resolved] = json;
            STARTER_WORD_MAP.clear();
            return json;
          }
        }
      } catch (err) {
        // オフライン・フォールバック
      }
    }
    return getStarterPack(lang, resolved);
  }

  const STARTER_WORD_MAP = new Map();
  function buildStarterWordIndex() {
    if (STARTER_WORD_MAP.size > 0) return;
    if (hasNativeJscLoad() && (typeof document === 'undefined' || !document || !document.head || typeof document.head.appendChild !== 'function')) {
      STATIC_PACK_IDS.forEach(p => ensurePackSyncIfJsc(p));
    }
    Object.values(PACKS).forEach(pack => {
      if (Array.isArray(pack)) {
        pack.forEach(item => {
          if (item && item.word) {
            const low = String(item.word).trim().toLowerCase();
            if (!STARTER_WORD_MAP.has(low)) {
              STARTER_WORD_MAP.set(low, item);
            }
          }
        });
      }
    });
  }

  function lookupStarterWord(word) {
    if (!word) return null;
    buildStarterWordIndex();
    return STARTER_WORD_MAP.get(String(word).trim().toLowerCase()) || null;
  }

  function registerPackData(packId, items) {
    if (packId && Array.isArray(items)) {
      PACKS[packId] = items;
      STARTER_WORD_MAP.clear();
      return true;
    }
    return false;
  }

  global.VocabStarterPack = {
    getStarterPack,
    getStarterPacksInfo,
    populateStarterPack,
    localizeStarterItem,
    STARTER_LOCALIZATIONS,
    buildStarterPackGalleryHtml,
    loadStarterPackData,
    registerPackData,
    lookupStarterWord,
    PACKS,
    PACK_METADATA
  };
  global.lookupStarterWord = lookupStarterWord;

global.VocabStarterPack.ensurePack = ensurePack;
global.VocabStarterPack.isPackReady = isPackReady;
global.VocabStarterPack.ensureStarterLocalizations = ensureStarterLocalizations;
global.VocabStarterPack.isLocsReady = isLocsReady;
export const VocabStarterPack = global.VocabStarterPack;
export default VocabStarterPack;
