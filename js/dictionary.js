/**
 * Vocab Vault — Multimodal Lexical & AI Engine (js/dictionary.js)
 * High-precision Dictionary Grounding (Wiktionary API), Generative AI (Gemini / Nano) & Offline PIE Knowledge
 */
(function (global) {
  'use strict';

  const foldAscii = s => global.VocabMorphology ? global.VocabMorphology.foldAscii(s) : String(s ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const matchRootInText = (tag, text) => global.VocabMorphology ? global.VocabMorphology.matchRootInText(tag, text) : false;
  const cleanPho = p => String(p ?? '').replace(/^[\[/\s]+/, '').replace(/[\]/\s]+$/, '').trim();

  const IPA_OK = /^[\p{L}\p{M}ˈˌːˑ.\-‿ ()/]+$/u;
  const WIKT_BAD_BRACKET = /^(?:transitive|intransitive|reflexive|countable|uncountable|obsolete|archaic|dated|rare|slang|figurative|literally|by extension|chiefly|uk|us|rp|general american|received pronunciation|\d+.*)$/i;
  const IPA_SPEC_CHAR = /[ˈˌːˑəɛɪʊɔæɑɒʌɜɝɐɨʉɯɤɵɶœçʝʃʒθðŋɲɳɴʎɾɽʁχħʕʔβɸɣxɥwɧʦʣʧʤ]/;

  const POS_ENUM = ["Noun","N[C]","N[U]","N[C/U]","N[pl]","N[m]","N[f]","N[n]","Verb","V[T]","V[I]","V[T/I]","V[refl]","Phrasal V","Adj","Adv","Prep","Conj","Pron","Idiom"];
  const ETY_CONF_ENUM = ["certain", "probable", "disputed", "unknown"];

  const S_STR = { type: "STRING" };
  const S_INT = { type: "INTEGER" };
  const S_POS = { type: "STRING", enum: POS_ENUM };
  const S_OBJ = (p, req = Object.keys(p)) => ({ type: "OBJECT", properties: p, required: req });
  const S_ARR = items => ({ type: "ARRAY", items });

  const RESPONSE_SCHEMA = S_ARR(S_OBJ({
    reqIndex: S_INT, reqWord: S_STR, word: S_STR, category: S_INT, phonetic: S_STR, grammar_forms: S_STR,
    etymologyConfidence: { type: "STRING", enum: ETY_CONF_ENUM }, etymology: S_STR, etymologyTags: S_ARR(S_STR),
    history_note: S_STR, core: S_STR, meanings: S_ARR(S_OBJ({ pos: S_POS, text: S_STR })),
    example: S_OBJ({ foreign: S_STR, ja: S_STR, used_form: S_STR }),
    phrases: S_ARR(S_OBJ({ foreign: S_STR, ja: S_STR })),
    derivatives: S_ARR(S_OBJ({ word: S_STR, phonetic: S_STR, pos: S_POS, meaning: S_STR, sub_phrase: S_STR, sub_trans: S_STR }))
  }));

  const EXTRACT_SCHEMA = S_ARR(S_OBJ({ word: S_STR, pos: S_STR, meaning: S_STR, sentence: S_STR }));

  /**
   * 内蔵オフライン語源ナレッジベース (18 PIE語根 & 代表的歴史語彙)
   */
  const BUILTIN_ETYMOLOGY_KNOWLEDGE = {
    roots: {
      '*sta-': { label: '*sta-', meaning: '立つ、静止する、堅固である', words: ['station', 'constant', 'instant', 'distant', 'state', 'statue', 'substance', 'persist', 'status', 'stage', 'stable', 'establish', 'stand', 'standard', 'stature', 'obstacle', 'substitute', 'statute', 'contrast'] },
      '*genh₁-': { label: '*genh₁-', meaning: '生む、生じる、種族', words: ['generate', 'genesis', 'gentle', 'genius', 'general', 'gender', 'nation', 'native', 'pregnant', 'gene', 'genuine', 'congenial', 'degenerate', 'generous', 'ingenious', 'kin', 'kind'] },
      '*bher-': { label: '*bher-', meaning: '運ぶ、耐える、生む', words: ['bear', 'bring', 'transfer', 'differ', 'infer', 'prefer', 'suffer', 'conference', 'offer', 'refer', 'fertile', 'circumference', 'defer', 'proffer'] },
      '*wed-': { label: '*wed-', meaning: '水、濡らす', words: ['wet', 'water', 'wash', 'otter', 'vodka', 'hydrate', 'hydrogen'] },
      '*ped-': { label: '*ped-', meaning: '足、歩む', words: ['pedal', 'pedestrian', 'expedition', 'impede', 'podium', 'tripod', 'centipede', 'pawn', 'pioneer'] },
      '*sed-': { label: '*sed-', meaning: '座る、落ち着く', words: ['sit', 'session', 'president', 'sedentary', 'reside', 'assess', 'possess', 'subsidy', 'sedate', 'sediment'] },
      '*weid-': { label: '*weid-', meaning: '見る、知る', words: ['vision', 'visible', 'video', 'advice', 'evidence', 'wise', 'idea', 'wit', 'witness', 'envy', 'provide', 'visit', 'visual', 'supervise'] },
      '*kap-': { label: '*kap-', meaning: '掴む、捉える、受ける', words: ['catch', 'capture', 'accept', 'except', 'concept', 'capacity', 'receive', 'capable', 'deceive', 'perceive', 'conceive', 'anticipate', 'occupy', 'recipe'] },
      '*ten-': { label: '*ten-', meaning: '伸ばす、張る、保つ', words: ['extend', 'tend', 'attention', 'tension', 'contain', 'obtain', 'maintain', 'attain', 'sustain', 'retain', 'content', 'tenant', 'continue', 'pretend'] },
      '*men-': { label: '*men-', meaning: '心、考える、記憶', words: ['mind', 'mention', 'mental', 'monument', 'memory', 'comment', 'remind', 'monitor', 'monster', 'admonish', 'monumental', 'mania'] },
      '*leg-': { label: '*leg-', meaning: '集める、選ぶ、読む、話す', words: ['collect', 'elect', 'lecture', 'legend', 'logic', 'legible', 'eligible', 'intellect', 'neglect', 'select', 'dialogue', 'analogy', 'apology'] },
      '*spec-': { label: '*spec-', meaning: '見る、観察する', words: ['spectator', 'inspect', 'respect', 'aspect', 'prospect', 'species', 'suspect', 'circumspect', 'conspicuous', 'despise', 'expect', 'perspective', 'retrospect'] },
      '*ag-': { label: '*ag-', meaning: '動かす、行う、導く', words: ['agent', 'action', 'active', 'exact', 'agenda', 'navigate', 'cogent', 'agency', 'agitate', 'coagulate', 'prodigal', 'transaction'] },
      '*wer-': { label: '*wer-', meaning: '注意する、見張る、話す', words: ['word', 'verb', 'wary', 'warden', 'aware', 'beware', 'reward', 'ward', 'guard', 'regard', 'guarantee'] },
      '*kred-': { label: '*kred-', meaning: '信じる、心を委ねる', words: ['credit', 'credible', 'creed', 'incredible', 'credence', 'credential', 'incredulous'] },
      '*dhe-': { label: '*dhe-', meaning: '置く、作る、据える', words: ['do', 'deed', 'fact', 'effect', 'affect', 'factory', 'perfect', 'defect', 'infect', 'efficient', 'sufficient', 'sacrifice', 'artifact'] },
      '*gno-': { label: '*gno-', meaning: '知る、認識する', words: ['know', 'knowledge', 'noble', 'recognize', 'ignore', 'notion', 'quaint', 'cognition', 'diagnosis', 'prognosis', 'connoisseur'] },
      '*sekw-': { label: '*sekw-', meaning: '従う、続く', words: ['sequence', 'second', 'consequence', 'pursue', 'suit', 'ensue', 'subsequent', 'execute', 'persecute', 'suite', 'suitor'] },
      '*bhew-': { label: '*bhew-', meaning: '存在する、成長する、生じる', words: ['be', 'been', 'build', 'future', 'physic', 'physical', 'biology', 'bond', 'bound', 'husband'] },
      '*deik-': { label: '*deik-', meaning: '指し示す、告げる、宣言する', words: ['dictate', 'indicate', 'index', 'teach', 'token', 'digit', 'diction', 'verdict', 'predict', 'dedicate', 'contradict', 'addict'] },
      '*kwel-': { label: '*kwel-', meaning: '回転する、巡る、耕す', words: ['cycle', 'wheel', 'culture', 'cultivate', 'colony', 'polar', 'pole', 'collar', 'pulley', 'cyclical'] },
      '*gwem-': { label: '*gwem-', meaning: '来る、歩む、近づく', words: ['come', 'become', 'advent', 'prevent', 'convene', 'venue', 'event', 'invent', 'revenue', 'intervene', 'souvenir'] },
      '*med-': { label: '*med-', meaning: '測る、適切な処置をとる', words: ['measure', 'medicine', 'moderate', 'modify', 'meditate', 'commodity', 'remedy', 'modest', 'accommodate'] },
      '*nem-': { label: '*nem-', meaning: '割り当てる、数える、尊ぶ', words: ['number', 'economy', 'autonomy', 'nemesis', 'nomad', 'astronomy', 'numeral', 'enormous'] },
      '*prek-': { label: '*prek-', meaning: '求める、祈る、問う', words: ['pray', 'precarious', 'deprecate', 'request', 'question', 'require', 'acquire', 'inquire', 'exquisite'] },
      '*reg-': { label: '*reg-', meaning: 'まっすぐ導く、支配する、正す', words: ['right', 'direct', 'correct', 'regular', 'regime', 'reign', 'royal', 'region', 'erect', 'rectangle', 'ruler'] },
      '*sek-': { label: '*sek-', meaning: '切る、分ける、切り離す', words: ['section', 'insect', 'segment', 'sickle', 'sector', 'dissect', 'bisect', 'intersect', 'saw'] },
      '*sked-': { label: '*sked-', meaning: '分ける、散らす、見分ける', words: ['science', 'conscious', 'schedule', 'shield', 'shed', 'scissors', 'scission', 'prescient'] },
      '*ster-': { label: '*ster-', meaning: '広げる、敷く、構造化する', words: ['spread', 'street', 'structure', 'construct', 'destroy', 'instruct', 'instrument', 'industry', 'obstruction'] },
      '*tekw-': { label: '*tekw-', meaning: '織る、組み立てる、流れる', words: ['technology', 'context', 'text', 'textile', 'tissue', 'subtle', 'pretext', 'architect'] },
      '*ters-': { label: '*ters-', meaning: '乾く、渇く、大地', words: ['thirst', 'toast', 'terrain', 'terrestrial', 'territory', 'terrace', 'mediterranean', 'torrid'] },
      '*mer-': { label: '*mer-', meaning: '死ぬ、消える、衰える', words: ['mortal', 'murder', 'mortgage', 'immortal', 'mortify', 'morbid', 'nightmare'] },
      '*pel-': { label: '*pel-', meaning: '満たす、注ぐ、多い', words: ['plenty', 'complete', 'supply', 'fill', 'full', 'folk', 'poly', 'plural', 'deplete', 'replenish', 'implement'] },
      '*mit-': { label: '*mit-', meaning: '送る、投げる、委ねる', words: ['mission', 'transmit', 'permit', 'admit', 'commit', 'message', 'promise', 'dismiss', 'submit', 'emit', 'remit'] },
      '*wek-': { label: '*wek-', meaning: '声を出す、呼ぶ、語る', words: ['voice', 'vocal', 'advocate', 'invoke', 'provoke', 'revoke', 'vowel', 'vocabulary', 'convoke', 'equivocal'] },
      '*clud-': { label: '*clud-', meaning: '閉じる、塞ぐ、鍵をかける', words: ['close', 'conclude', 'include', 'exclude', 'clause', 'closet', 'seclude', 'preclude', 'enclose'] },
      '*skreybh-': { label: '*skreybh-', meaning: '引っ掻く、記す、書く', words: ['write', 'script', 'describe', 'prescribe', 'subscribe', 'inscribe', 'manuscript', 'transcribe', 'ascribe'] },
      '*blew-': { label: '*blew-', meaning: '流れる、湧き出る、溢れる', words: ['flow', 'fluent', 'fluid', 'influence', 'fluctuate', 'flood', 'affluent', 'superfluous', 'influx'] },
      '*tag-': { label: '*tag-', meaning: '触れる、手にとる、達する', words: ['touch', 'contact', 'tangible', 'attain', 'tactile', 'intact', 'contingent', 'contagious'] },
      '*port-': { label: '*port-', meaning: '運ぶ、通す、出入口', words: ['port', 'export', 'import', 'transport', 'report', 'support', 'portal', 'deport', 'opportunity'] },
      '*tragh-': { label: '*tragh-', meaning: '引く、引っ張る、進む', words: ['drag', 'draw', 'tractor', 'attract', 'contract', 'extract', 'distract', 'retract', 'treat', 'trait', 'trace'] },
      '*sent-': { label: '*sent-', meaning: '感じる、知覚する、向かう', words: ['sense', 'scent', 'sentiment', 'consent', 'resent', 'assent', 'dissent', 'sentence', 'sensitive'] },
      '*vert-': { label: '*vert-', meaning: '回る、向きを変える、転換する', words: ['convert', 'revert', 'divert', 'advertise', 'universe', 'version', 'vertical', 'reverse', 'controversy', 'introvert', 'extrovert'] }
    },
    historical: {
      'wet': {
        etymology: '古英語 wæt (印欧祖語 *wed- 水) 由来。',
        etymologyTags: ['*wed-'],
        core: '水分を含んで濡れているイメージから、酒類の流通・容認へ転化。',
        history_note: '1920年代米国の禁酒法時代、酒類製造販売の禁止に反対した立場（反禁酒派）を指す（対義語: dry）。',
        meanings: [
          { pos: 'Adj', text: '濡れた、湿った、雨降りの' },
          { pos: 'Adj', text: '【米・歴史】反禁酒派の、酒類合法化支持の（名詞: 反禁酒派の人）' }
        ],
        example: {
          foreign: 'During the Prohibition era, the city voted to remain wet.',
          ja: '禁酒法時代、その都市は<b>反禁酒（酒類合法）</b>の立場を維持することを選んだ。',
          used_form: 'wet'
        }
      },
      'dry': {
        etymology: '古英語 dryge (印欧祖語 *dher- 固まる) 由来。',
        etymologyTags: ['*dher-'],
        core: '水分がない乾いた状態から、酒類のない禁酒状態へ転化。',
        history_note: '米国禁酒法時代に酒類禁止を支持した立場（禁酒派）、または酒類販売が禁止された地域（dry county）。',
        meanings: [
          { pos: 'Adj', text: '乾いた、乾燥した' },
          { pos: 'Adj', text: '【米・歴史】禁酒派の、酒類販売禁止の（名詞: 禁酒運動支持者）' }
        ],
        example: {
          foreign: 'Several southern counties remained dry long after national Prohibition ended.',
          ja: '全米禁酒法が終了した後も、いくつかの南部郡は<b>禁酒（酒類販売禁止）</b>のままであった。',
          used_form: 'dry'
        }
      },
      'wet blanket': {
        etymology: '火を消すために被せる濡れ毛布（wet blanket）の比喩表現。',
        etymologyTags: ['*wed-'],
        core: '燃え盛る火（場の盛り上がり）に冷たい水を浴びせて鎮火するイメージ。',
        history_note: '19世紀初頭の比喩から定着した慣用句。',
        meanings: [
          { pos: 'Idiom', text: '座をしらけさせる人、興ざめな人、水を差す人' }
        ],
        example: {
          foreign: "Don't be such a wet blanket, come and join the party!",
          ja: 'そんなに<b>座をしらけさせる</b>ようなことを言わず、パーティーに参加しなよ！',
          used_form: 'wet blanket'
        }
      },
      'hawk': {
        etymology: '古英語 hafoc (印欧祖語 *kap- 掴む) 由来。',
        etymologyTags: ['*kap-'],
        core: '鋭い爪で獲物を攻撃的に捕らえる猛禽のイメージ。',
        history_note: '冷戦期以降の政治・外交において、強硬派・好戦派を指す（対義語: dove）。',
        meanings: [
          { pos: 'N[C]', text: 'タカ（鳥類）' },
          { pos: 'N[C]', text: '【政治・歴史】タカ派、強硬論者' }
        ],
        example: {
          foreign: 'During the Cold War crisis, foreign policy hawks advocated for military intervention.',
          ja: '冷戦期の危機において、外交政策の<b>タカ派（強硬派）</b>は軍事介入を主張した。',
          used_form: 'hawks'
        }
      },
      'dove': {
        etymology: '古英語 dūfe (ゲルマン祖語 *dūbǭ 潜る鳥) 由来。',
        etymologyTags: [],
        core: '穏やかに空を舞う平和のシンボル。',
        history_note: '冷戦期以降、平和的対話や軍縮を支持する穏健派・ハト派を指す（対義語: hawk）。',
        meanings: [
          { pos: 'N[C]', text: 'ハト（平和の象徴）' },
          { pos: 'N[C]', text: '【政治・歴史】ハト派、平和穏健派' }
        ],
        example: {
          foreign: 'The doves in the administration urged a diplomatic resolution instead of arms buildup.',
          ja: '政権内の<b>ハト派（穏健派）</b>は軍備増強ではなく外交的解決を強く促した。',
          used_form: 'doves'
        }
      }
    }
  };

  /**
   * タイムアウト付きフェッチヘルパー
   */
  async function fetchWithTimeout(url, options, timeoutMs = 45000) {
    if (typeof AbortController === 'undefined') {
      return fetch(url, options);
    }
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: ctrl.signal });
    } finally {
      clearTimeout(id);
    }
  }

  /**
   * Wiktionary本文から発音記号(IPA)を抽出
   */
  function extractCleanIpa(section) {
    const pronM = /^===+\s*(?:Pronunciation|Prononciation|Aussprache)[^=]*===+\s*$/im.exec(section);
    const scope = pronM ? section.slice(pronM.index, pronM.index + 900) : section.slice(0, 700);
    const labeled = scope.match(/(?:IPA|API|Lautschrift)[^/\[\n]{0,30}(?:\/([^/\n]{2,35})\/|\[([^\]\n]{2,35})\])/i);
    if (labeled) {
      const cand = cleanPho(labeled[1] || labeled[2]);
      if (cand && IPA_OK.test(cand) && !WIKT_BAD_BRACKET.test(cand)) return cand;
    }
    const slashMatches = [...scope.matchAll(/\/([^/\n]{2,35})\//g)];
    for (const m of slashMatches) {
      const cand = cleanPho(m[1]);
      if (cand && IPA_OK.test(cand) && !WIKT_BAD_BRACKET.test(cand) && (IPA_SPEC_CHAR.test(cand) || Boolean(pronM))) return cand;
    }
    if (pronM) {
      const brMatches = [...scope.matchAll(/\[([^\]\n]{2,35})\]/g)];
      for (const m of brMatches) {
        const cand = cleanPho(m[1]);
        if (cand && IPA_OK.test(cand) && !WIKT_BAD_BRACKET.test(cand) && IPA_SPEC_CHAR.test(cand)) return cand;
      }
    }
    return '';
  }

  /**
   * Wiktionary本文から対象言語セクションと語源テキストを抽出
   */
  function extractWiktLangSection(fullText, targetLang = 'en', host = 'en') {
    const text = String(fullText ?? '');
    if (!text) return null;
    const langNames = { en: 'English', fr: 'French', de: 'German', ja: 'Japanese' };
    const langName = (global.LANGS && global.LANGS[targetLang]?.wiktName) || langNames[targetLang] || 'English';
    let section = text;
    if (host === 'en') {
      const m = new RegExp(`^==\\s*${langName}\\s*==\\s*$`, 'm').exec(text);
      if (!m) return null;
      const rest = text.slice(m.index + m[0].length);
      const nextL2 = rest.search(/^==\s*[^=]+\s*==\s*$/m);
      section = nextL2 !== -1 ? rest.slice(0, nextL2) : rest;
    }
    const ipa = extractCleanIpa(section);
    const etyM = /^===+\s*(?:Etymology|Étymologie|Herkunft)[^=]*===+\s*$/im.exec(section);
    const snippet = etyM ? `${section.slice(0, Math.min(400, etyM.index))}\n${section.slice(etyM.index, etyM.index + 1200)}`.trim() : section.slice(0, 1400).trim();
    return snippet ? { extract: snippet.slice(0, 1500), ipa } : null;
  }

  /**
   * Wiktionary API単体クエリ
   */
  async function fetchWiktOne(word, targetLang = 'en') {
    const cleanW = String(word ?? '').trim();
    if (!cleanW || /[\u3040-\u30ff\u4e00-\u9faf]/.test(cleanW)) return null;
    const toWikiSlug = s => encodeURIComponent(String(s).trim().replace(/\s+/g, '_'));
    const tryFetch = async (host, title) => {
      const url = `https://${host}.wiktionary.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&titles=${encodeURIComponent(title)}&format=json&origin=*`;
      const r = await fetchWithTimeout(url, {}, 3500);
      if (!r.ok) return null;
      const pages = (await r.json())?.query?.pages;
      const page = pages ? Object.values(pages)[0] : null;
      if (!page || page.missing !== undefined || !page.extract) return null;
      const parsed = extractWiktLangSection(page.extract, targetLang, host);
      return parsed ? { extract: parsed.extract, ipa: parsed.ipa, url: `https://${host}.wiktionary.org/wiki/${toWikiSlug(page.title || title)}` } : null;
    };
    try {
      return (await tryFetch('en', cleanW)) || (targetLang !== 'en' ? await tryFetch(targetLang, cleanW) : null) || (cleanW !== cleanW.toLowerCase() ? await tryFetch('en', cleanW.toLowerCase()) : null);
    } catch { return null; }
  }

  /**
   * 単語エントリのWiktionary接地真正性検証
   */
  function verifyWiktGrounding(item, wRef) {
    if (!wRef?.extract || !wRef?.url) return false;
    const extFold = foldAscii(wRef.extract);
    if (extFold.length < 20) return false;

    // 1. 語根タグ（*sta-, *bher- 等）がWiktionary本文に実在するか照合
    if (Array.isArray(item.etymologyTags) && item.etymologyTags.length > 0) {
      if (item.etymologyTags.some(t => matchRootInText(t, extFold))) return true;
    }

    // 2. 語源解説（etymology）内に登場する再構形・借用語・原義語根がWiktionary本文と一致するか照合
    const etyText = foldAscii(item.etymology || '');
    if (etyText.length > 5) {
      // 再構形（*...）の照合
      const reconstructedStems = etyText.match(/\*[\p{L}\p{M}0-9₁₂₃₄ḱǵʷʰ-]+/gu);
      if (reconstructedStems && reconstructedStems.some(stem => extFold.includes(stem.toLowerCase()))) {
        return true;
      }
      // 単語の見出し語自身と異なる具体的祖語・借用元語（例: epiphaneia, stationem など）の照合
      const foreignTokens = etyText.match(/[a-z]{4,}/g);
      const headwordFold = foldAscii(item.word || '').toLowerCase();
      if (foreignTokens) {
        const significant = foreignTokens.filter(tok => tok !== headwordFold && !['from', 'with', 'that', 'this', 'into', 'have', 'been', 'word', 'root', 'term', 'etymology'].includes(tok));
        if (significant.some(tok => extFold.includes(tok))) {
          return true;
        }
      }
    }

    // 3. 発音（IPA）がWiktionaryの公式発音と一致するか照合
    if (wRef.ipa && item.phonetic && cleanPho(item.phonetic) === wRef.ipa) {
      return true;
    }

    return false;
  }

  /**
   * AI APIレスポンスJSONの厳密なサニタイズ＆パース
   */
  async function parseApiJson(r) {
    if (!r) return [];
    let data;
    if (typeof r === 'string') {
      try {
        const direct = JSON.parse(r);
        if (Array.isArray(direct)) return direct;
        data = direct;
      } catch {
        data = { candidates: [{ content: { parts: [{ text: r }] } }] };
      }
    } else if (r && typeof r.json === 'function') {
      data = await r.json();
    } else if (r && typeof r.text === 'function') {
      data = JSON.parse(await r.text());
    } else {
      data = r;
    }
    if (Array.isArray(data)) return data;

    const cand = data?.candidates?.[0];
    if (!cand) throw new Error(data?.promptFeedback?.blockReason ? `入力がブロックされました (${data.promptFeedback.blockReason})` : 'AIから有効な候補が返されませんでした。');
    const reason = cand.finishReason;
    if (reason && reason !== 'STOP') {
      if (reason === 'MAX_TOKENS') { const er = new Error('AI応答が最大トークン数に達し途中で切れました。'); er.code = 'MAX_TOKENS'; throw er; }
      if (reason === 'SAFETY' || reason === 'RECITATION') throw new Error(`安全フィルタにより出力が中断されました (${reason})。`);
    }
    const rawText = (cand.content?.parts || []).map(p => p.text || '').join('').trim();
    if (!rawText) throw new Error(`AI応答が空でした (finishReason: ${reason || 'UNKNOWN'})`);
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    try { return JSON.parse(cleaned); } catch {
      const arrM = cleaned.match(/\[[\s\S]*\]/);
      if (arrM) {
        try { return JSON.parse(arrM[0]); } catch {}
      }
      const objM = cleaned.match(/\{[\s\S]*\}/);
      if (objM) {
        try { return JSON.parse(objM[0]); } catch {}
      }
      throw new Error('AI応答のJSON解析に失敗しました。');
    }
  }

  /**
   * Chrome Built-in AI (Prompt API: Gemini Nano) 呼び出し
   */
  async function callOnDeviceGeminiNano(sys, promptText) {
    if (typeof window === 'undefined') return null;
    const aiObj = window.ai || window.model;
    if (!aiObj?.languageModel) return null;
    try {
      const caps = await aiObj.languageModel.capabilities?.();
      if (!caps || (caps.available !== 'readily' && caps.available !== 'after-download')) return null;
      const session = await aiObj.languageModel.create({
        systemPrompt: sys,
        temperature: 0.1
      });
      const res = await session.prompt(promptText);
      session.destroy?.();
      return res;
    } catch {
      return null;
    }
  }

  /**
   * 内蔵語源ナレッジベース ＆ ルール合成エンジン (完全オフライン対応)
   */
  async function generateWithInternalAI(payloadItems, sLang = 'en', tLang = 'ja', fName = '', useHist = false, wiktMap = null) {
    const itemsJson = JSON.stringify(payloadItems);
    const nanoPrompt = `対象語(${payloadItems.length}件):${itemsJson}${fName ? `\n分野:${fName}` : ''}`;
    const nanoSys = `あなたは端末内蔵の学術的語源・概念史辞書AIエンジンです。JSON配列を出力してください。`;
    const nanoRaw = await callOnDeviceGeminiNano(nanoSys, nanoPrompt);
    if (nanoRaw) {
      try {
        const parsed = JSON.parse(nanoRaw.replace(/^```json/i, '').replace(/```$/i, '').trim());
        if (Array.isArray(parsed) && parsed.length) return { items: parsed, usedModel: 'gemini-nano-ondevice' };
      } catch {}
    }

    const items = payloadItems.map((it, idx) => {
      const rawW = String(it.reqWord || it.word || '').trim();
      const normW = rawW.toLowerCase().normalize('NFC');
      const wRef = wiktMap?.get ? wiktMap.get(idx) : null;
      const histData = BUILTIN_ETYMOLOGY_KNOWLEDGE.historical[normW];

      let rootKey = null;
      if (histData?.etymologyTags?.length) {
        rootKey = histData.etymologyTags[0];
      } else {
        for (const [rKey, rInfo] of Object.entries(BUILTIN_ETYMOLOGY_KNOWLEDGE.roots)) {
          if (rInfo.words && rInfo.words.includes(normW)) {
            rootKey = rKey;
            break;
          }
        }
      }

      if (!rootKey && wRef?.extract) {
        const m = wRef.extract.match(/\*([a-zA-Z0-9_äöüßÄÖÜ₁₂₃₄ḱǵʷʰ-]+-?)/);
        if (m) {
          const cand = `*${m[1].replace(/^-|-$/g, '')}-`;
          if (BUILTIN_ETYMOLOGY_KNOWLEDGE.roots[cand]) rootKey = cand;
        }
      }

      const rootInfo = rootKey ? BUILTIN_ETYMOLOGY_KNOWLEDGE.roots[rootKey] : null;

      let etymology = histData?.etymology;
      if (!etymology) {
        if (rootInfo) {
          etymology = `印欧祖語 ${rootKey}（${rootInfo.meaning}）に由来。語根のコアイメージが保持され、定着した。`;
        } else if (wRef?.extract) {
          etymology = `語源資料（Wiktionary等）の記録に基づく学術語彙。古期英語・ラテン語等の語形成を経る。`;
        } else {
          etymology = `個別語源（借用語・新造語等）。確固たるPIE語根は未確定。`;
        }
      }

      const etymologyTags = rootKey ? [rootKey] : (histData?.etymologyTags || []);
      const etymologyConfidence = rootKey ? 'certain' : (histData ? 'certain' : 'unknown');
      const core = histData?.core || (rootInfo ? `「${rootInfo.meaning}」をコアイメージとして語義が展開。` : `「${rawW}」の持つ本質的・直感的なイメージ。`);
      const history_note = (useHist && histData?.history_note) ? histData.history_note : '';

      let meanings = histData?.meanings;
      if (!meanings || !meanings.length) {
        const isPhrase = rawW.includes(' ');
        const pos = isPhrase ? 'Idiom' : (rawW.endsWith('ly') ? 'Adv' : (rawW.endsWith('tion') || rawW.endsWith('ment') ? 'N[U]' : (rawW.endsWith('ed') || rawW.endsWith('ing') || rawW.endsWith('able') ? 'Adj' : 'N[C]')));
        meanings = [{ pos, text: `${rawW}の主要な意味・文脈的語義` }];
      }

      let example = histData?.example;
      if (!example) {
        example = {
          foreign: `This example illustrates the proper academic usage of ${rawW}.`,
          ja: `この例文は<b>${rawW}</b>の適切な学術的用法を示している。`,
          used_form: rawW
        };
      }

      return {
        reqIndex: it.reqIndex ?? idx,
        reqWord: rawW,
        word: rawW,
        homographIndex: it.homographIndex || 1,
        category: 0,
        phonetic: wRef?.ipa || '',
        grammar_forms: '',
        etymologyConfidence,
        etymology,
        etymologyTags,
        history_note,
        core,
        meanings,
        example,
        phrases: [],
        derivatives: []
      };
    });

    return { items, usedModel: 'builtin-knowledge-engine' };
  }

  /**
   * Gemini API 利用可能モデル一覧の取得
   */
  const EXCLUDE_MODELS = ['tts', 'image', 'vision', 'embedding', 'aqa', 'audio', 'learnlm', 'robotics'];
  async function fetchModels(key) {
    if (!key) return [];
    try {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', { headers: { 'x-goog-api-key': key } });
      if (res.ok) {
        const json = await res.json();
        const valid = (json.models || [])
          .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
          .map(m => m.name.replace(/^models\//, ''))
          .filter(n => { const low = n.toLowerCase(); return low.startsWith('gemini') && !EXCLUDE_MODELS.some(t => low.includes(t)); });

        const scoreModel = n => {
          const isFlashStd = n.includes('flash') && !n.includes('lite') && !n.includes('8b');
          const ver = parseFloat(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] || '0');
          return (isFlashStd ? 400 : n.includes('lite') ? 300 : 100) + ver * 10 - (/preview|-exp/.test(n) ? 60 : 0);
        };
        valid.sort((a, b) => scoreModel(b) - scoreModel(a));
        if (valid.length) return valid;
      }
    } catch (e) {
      console.warn('[fetchModels fallback]', e?.message || e);
    }
    return ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  }

  /**
   * Gemini API 呼び出し (リトライ・Thinking予算・JSONスキーマフェイルセーフ対応)
   */
  async function callGemini(sys, parts, key, st = null, schema = RESPONSE_SCHEMA, deep = false, prefModel = 'auto') {
    const models = await fetchModels(key);
    const std = models.filter(m => m.includes('flash') && !m.includes('lite') && !m.includes('8b'));
    const order = (prefModel && prefModel !== 'auto' && models.includes(prefModel))
      ? [prefModel, ...std.filter(x => x !== prefModel)]
      : (std.length ? [...std, ...models.filter(x => !std.includes(x))] : models.slice(0, 3));
    const usrParts = Array.isArray(parts) ? parts : [{ text: parts }];

    const setStatus = msg => {
      if (typeof st === 'function') st(msg);
      else if (st && typeof st.textContent !== 'undefined') st.textContent = msg;
    };

    const req = (m, think) => {
      const cfg = schema ? { temperature: 0.1, maxOutputTokens: 8192, responseMimeType: "application/json", responseSchema: schema } : { temperature: 0.1, maxOutputTokens: 4096 };
      if (think && schema && (m.includes('gemini-2.5') || m.includes('gemini-3')) && !m.includes('pro')) {
        cfg.thinkingConfig = { thinkingBudget: deep ? 512 : 0 };
      }
      return fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: [{ role: "user", parts: usrParts }], generationConfig: cfg })
      });
    };

    let lastErr;
    for (const m of [...new Set(order)].filter(Boolean).slice(0, 3)) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          setStatus(`${m} で処理中...${attempt > 0 ? `(再試行${attempt})` : ''}`);
          let r = await req(m, true);
          if (r.status === 400) r = await req(m, false);
          if (r.status === 400 && schema) {
            r = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
              body: JSON.stringify({ systemInstruction: { parts: [{ text: `${sys}\n必ず純粋なJSONのみを出力し、解説文やマークダウンは除外せよ。` }] }, contents: [{ role: "user", parts: usrParts }], generationConfig: { temperature: 0.1, maxOutputTokens: 8192 } })
            });
          }
          if (r.ok) { r.usedModel = m; return r; }
          if (r.status === 401 || r.status === 403) { const e = new Error(`APIキーが無効、または権限がありません (HTTP ${r.status})`); e.fatal = true; throw e; }
          if (r.status === 429 || r.status === 503) {
            lastErr = new Error(`${m}: レート制限または混雑 (HTTP ${r.status})`);
            const waitMs = Math.min(8000, 1200 * Math.pow(2, attempt) + Math.random() * 400);
            setStatus(`混雑中 (${r.status}) — ${Math.round(waitMs / 1000)}秒後に再試行...`);
            await new Promise(res => setTimeout(res, waitMs));
            continue;
          }
          lastErr = new Error(`${m}: HTTP ${r.status}`);
          break;
        } catch (err) {
          if (err.fatal) throw err;
          lastErr = err.name === 'AbortError' ? new Error(`${m}: タイムアウトしました`) : err;
          break;
        }
      }
    }
    throw lastErr || new Error('API通信エラー');
  }

  // --- グローバルエクスポート ---
  global.RESPONSE_SCHEMA = RESPONSE_SCHEMA;
  global.parseApiJson = parseApiJson;
  global.PROMPT_VERSION = '2026-10-f';

  global.VocabDictionary = {
    BUILTIN_ETYMOLOGY_KNOWLEDGE,
    RESPONSE_SCHEMA,
    EXTRACT_SCHEMA,
    fetchWithTimeout,
    extractCleanIpa,
    extractWiktLangSection,
    fetchWiktOne,
    verifyWiktGrounding,
    parseApiJson,
    callOnDeviceGeminiNano,
    generateWithInternalAI,
    fetchModels,
    callGemini
  };
  global.VocabAI = global.VocabDictionary;
})(typeof window !== 'undefined' ? window : globalThis);
