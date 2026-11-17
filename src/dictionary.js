/**
 * Vocab Vault — Multimodal Lexical & AI Engine (js/dictionary.js)
 * High-precision Dictionary Grounding (Wiktionary API), Generative AI (Gemini / Nano) & Offline PIE Knowledge
 */
(function (global) {
  'use strict';

  const foldAscii = s => global.VocabMorphology ? global.VocabMorphology.foldAscii(s) : String(s ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const matchRootInText = (tag, text) => global.VocabMorphology ? global.VocabMorphology.matchRootInText(tag, text) : false;
  const cleanPho = global.VocabStorage?.cleanPho || (p => String(p ?? '').replace(/^[\[/\s]+/, '').replace(/[\]/\s]+$/, '').trim());

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
      '*kap-': { label: '*kap-', meaning: '掴む、捉える、受ける', words: ['have', 'catch', 'capture', 'accept', 'except', 'concept', 'capacity', 'receive', 'capable', 'deceive', 'perceive', 'conceive', 'anticipate', 'occupy', 'recipe'] },
      '*kret-': { label: '*kret-', meaning: '強い、硬い、力', words: ['hard', 'hardly', 'hardship', 'democracy', 'autocracy', 'bureaucracy'] },
      '*ten-': { label: '*ten-', meaning: '伸ばす、張る、保つ', words: ['extend', 'tend', 'attention', 'tension', 'contain', 'obtain', 'maintain', 'attain', 'sustain', 'retain', 'content', 'tenant', 'continue', 'pretend'] },
      '*men-': { label: '*men-', meaning: '心、考える、記憶', words: ['mind', 'mention', 'mental', 'monument', 'memory', 'comment', 'remind', 'monitor', 'monster', 'admonish', 'monumental', 'mania'] },
      '*leg-': { label: '*leg-', meaning: '集める、選ぶ、読む、話す', words: ['collect', 'elect', 'lecture', 'legend', 'logic', 'legible', 'eligible', 'intellect', 'neglect', 'select', 'dialogue', 'analogy', 'apology'] },
      '*spec-': { label: '*spec-', meaning: '見る、観察する', words: ['spectator', 'inspect', 'respect', 'aspect', 'prospect', 'species', 'special', 'suspect', 'circumspect', 'conspicuous', 'despise', 'expect', 'perspective', 'retrospect'] },
      '*wer-': { label: '*wer-', meaning: '注意する、見張る、話す', words: ['word', 'verb', 'wary', 'warden', 'aware', 'beware', 'reward', 'ward', 'guard', 'regard', 'guarantee'] },
      '*kred-': { label: '*kred-', meaning: '信じる、心を委ねる', words: ['credit', 'credible', 'creed', 'incredible', 'credence', 'credential', 'incredulous'] },
      '*dhe-': { label: '*dhe-', meaning: '置く、作る、据える', words: ['do', 'deed', 'fact', 'effect', 'affect', 'factory', 'perfect', 'defect', 'infect', 'efficient', 'sufficient', 'sacrifice', 'artifact'] },
      '*gno-': { label: '*gno-', meaning: '知る、認識する', words: ['know', 'knowledge', 'noble', 'recognize', 'ignore', 'notion', 'quaint', 'cognition', 'diagnosis', 'prognosis', 'connoisseur'] },
      '*sekw-': { label: '*sekw-', meaning: '従う、続く', words: ['sequence', 'second', 'consequence', 'pursue', 'suit', 'ensue', 'subsequent', 'execute', 'persecute', 'suite', 'suitor'] },
      '*bhew-': { label: '*bhew-', meaning: '存在する、成長する、生じる', words: ['be', 'been', 'build', 'future', 'physic', 'physical', 'biology', 'bond', 'bound', 'husband'] },
      '*deik-': { label: '*deik-', meaning: '指し示す、告げる、宣言する', words: ['dictate', 'indicate', 'index', 'teach', 'token', 'digit', 'diction', 'verdict', 'predict', 'dedicate', 'contradict', 'addict'] },
      '*ked-': { label: '*ked-', meaning: '行く、退く、歩み出る', words: ['precedent', 'precede', 'accede', 'concede', 'exceed', 'proceed', 'succeed', 'recede', 'access', 'process'] },
      '*tag-': { label: '*tag-', meaning: '触れる、接する、手にとる、達する', words: ['touch', 'contact', 'tangible', 'tact', 'tactile', 'intact', 'contingency', 'contingent', 'contiguous', 'contagious', 'integrate', 'integrity', 'attain'] },
      '*lau-': { label: '*lau-', meaning: '獲得する、利益を得る', words: ['lucrative', 'lucre'] },
      '*per-': { label: '*per-', meaning: '通す、運ぶ、超える、前へ', words: ['export', 'transport', 'support', 'portable', 'import', 'report', 'port', 'portal'] },
      '*mey-': { label: '*mey-', meaning: '送る、放つ、動かす、交換する', words: ['admit', 'transmit', 'emit', 'submit', 'permit', 'remuneration', 'mission', 'missile', 'commit', 'dismiss'] },
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
      '*mer-': { label: '*mer-', meaning: '死ぬ、消える、衰える', words: ['mortal', 'murder', 'mortgage', 'immortal', 'mortify', 'morbid', 'moribund', 'nightmare'] },
      '*pel-': { label: '*pel-', meaning: '満たす、注ぐ、多い', words: ['plenty', 'complete', 'supply', 'fill', 'full', 'folk', 'poly', 'plural', 'deplete', 'replenish', 'implement'] },
      '*mit-': { label: '*mit-', meaning: '送る、投げる、委ねる', words: ['mission', 'transmit', 'permit', 'admit', 'commit', 'message', 'promise', 'dismiss', 'submit', 'emit', 'remit'] },
      '*wek-': { label: '*wek-', meaning: '声を出す、呼ぶ、語る', words: ['voice', 'vocal', 'advocate', 'invoke', 'provoke', 'revoke', 'vowel', 'vocabulary', 'convoke', 'equivocal'] },
      '*clud-': { label: '*clud-', meaning: '閉じる、塞ぐ、鍵をかける', words: ['close', 'conclude', 'include', 'exclude', 'clause', 'closet', 'seclude', 'preclude', 'enclose'] },
      '*skreybh-': { label: '*skreybh-', meaning: '引っ掻く、記す、書く', words: ['write', 'script', 'describe', 'prescribe', 'subscribe', 'inscribe', 'manuscript', 'transcribe', 'ascribe'] },
      '*blew-': { label: '*blew-', meaning: '流れる、湧き出る、溢れる', words: ['flow', 'fluent', 'fluid', 'influence', 'fluctuate', 'flood', 'affluent', 'superfluous', 'influx'] },
      '*port-': { label: '*port-', meaning: '運ぶ、通す、出入口', words: ['port', 'export', 'import', 'transport', 'report', 'support', 'portal', 'deport', 'opportunity', 'porter', 'transporter', 'pforte', 'transportieren'] },
      '*tragh-': { label: '*tragh-', meaning: '引く、引っ張る、進む', words: ['drag', 'draw', 'tractor', 'attract', 'contract', 'extract', 'distract', 'retract', 'treat', 'trait', 'trace', 'traiter', 'attirer', 'trecken', 'vertrag'] },
      '*sent-': { label: '*sent-', meaning: '感じる、知覚する、向かう', words: ['sense', 'scent', 'sentiment', 'consent', 'resent', 'assent', 'dissent', 'sentence', 'sensitive', 'sentir', 'sentiment', 'sinn', 'sinne', 'senden'] },
      '*vert-': { label: '*vert-', meaning: '回る、向きを変える、転換する', words: ['convert', 'revert', 'divert', 'advertise', 'universe', 'version', 'vertical', 'reverse', 'controversy', 'introvert', 'extrovert', 'convertir', 'verser', 'werden', 'antwort'] },
      '*ye-': { label: '*ye-', meaning: '投げる、放つ、送る', words: ['objective', 'subject', 'project', 'reject', 'inject', 'object', 'adjacent', 'trajectory'] },
      // 東アジア漢字文化圏・共通字源ルート (Sinospheric CJK Character Roots: 中・韓・日横断)
      '*政': { label: '*政', meaning: '正しく治める、統治、行政 (正＋攴)', meaning_ko: '바르게 다스리다, 통치, 행정 (正+攴)', meaning_en: 'govern justly, rule, administration', words: ['政治', '政策', '政府', '行政', '財政', '정치', '정책', '행정'] },
      '*経': { label: '*経', meaning: '縦糸を通す、治める、筋道 (糸＋巠)', meaning_ko: '날실을 꿰다, 다스리다, 질서 (糸+巠)', meaning_en: 'warp thread, weave order, govern', words: ['経済', '経験', '経営', '経緯', '神经', '经济', '经验', '경제', '경험', '경영'] },
      '*理': { label: '*理', meaning: '玉の筋目を磨く、道理、法則 (玉＋里)', meaning_ko: '옥의 결을 다듬다, 도리, 법칙 (玉+里)', meaning_en: 'veins in jade, reason, natural law', words: ['理論', '理解', '理性', '合理', '管理', '心理', '理论', '이론', '이해', '합리'] },
      '*信': { label: '*信', meaning: '言葉に偽りがない、誠、託す (人＋言)', meaning_ko: '말에 거짓이 없다, 믿음, 맡기다 (人+言)', meaning_en: 'truthful speech, trust, faith', words: ['信頼', '信念', '信用', '確信', '通信', '信任', '信念', '신뢰', '신념', '통신'] },
      '*観': { label: '*観', meaning: '広く見渡す、本質を見極める (雚＋見)', meaning_ko: '널리 바라보다, 본질을 살피다 (雚+見)', meaning_en: 'observe broadly, discern essence', words: ['観察', '観点', '価値観', '客観', '主観', '直観', '观念', '客观', '관찰', '관점', '객관'] },
      '*権': { label: '*権', meaning: 'はかりの分銅、釣り合い、力 (木＋雚)', meaning_ko: '저울추, 균형, 정당한 권세 (木+雚)', meaning_en: 'balance weight, authority, right', words: ['権利', '権力', '人権', '主権', '政権', '権威', '权利', '权力', '권리', '권력', '인권'] },
      '*法': { label: '*法', meaning: '水のように平らに裁く、規範 (水＋廌)', meaning_ko: '물처럼 공평히 가리다, 규범, 법칙 (水+廌)', meaning_en: 'level judgment, norm, law', words: ['法律', '憲法', '方法', '法則', '合法', '司法', '法律', '方法', '법률', '헌법', '방법'] },
      '*識': { label: '*識', meaning: '見分ける、心に記す、知る (言＋戠)', meaning_ko: '분별하다, 마음에 새기다, 알다 (言+戠)', meaning_en: 'discern, mark in mind, know', words: ['知識', '意識', '認識', '常識', '良識', '識別', '知识', '意识', '认识', '지식', '의식', '인식'] },
      '*動': { label: '*動', meaning: '重いものを動かす、働きかける (重＋力)', meaning_ko: '무거운 것을 움직이다, 작용하다 (重+力)', meaning_en: 'move heavy weight, act, set in motion', words: ['行動', '運動', '活動', '変動', '動機', '自動', '行动', '活动', '행동', '활동', '운동'] },
      '*制': { label: '*制', meaning: '枝を切り揃える、整える、定める (未＋刀)', meaning_ko: '가지를 쳐서 고르다, 정돈하다, 정하다 (未+刀)', meaning_en: 'trim branches, regulate, institute', words: ['制度', '制限', '体制', '統制', '抑制', '強制', '制度', '体制', '제도', '체제', '통제'] },
      '*生': { label: '*生', meaning: '草木が芽吹く、生きる、産み出す', meaning_ko: '초목이 싹트다, 살다, 낳다', meaning_en: 'sprout, live, produce', words: ['生活', '生命', '生産', '発生', '生態', '生涯', '生活', '生产', '생활', '생명', '생산'] },
      '*心': { label: '*心', meaning: '心臓、こころ、思考と感情の核', meaning_ko: '심장, 마음, 사고와 감정의 핵심', meaning_en: 'heart, mind, core of thought', words: ['心理', '関心', '中心', '良心', '核心', '決心', '心理', '核心', '심리', '관心', '중심'] },
      '*構': { label: '*構', meaning: '木材を組み合わせて枠組みを造る (木＋冓)', meaning_ko: '목재를 얽어 짜서 뼈대를 세우다 (木+冓)', meaning_en: 'join timber, frame, structure', words: ['構造', '结构', '구조', '構成', '構想', '机构'] },
      '*概': { label: '*概', meaning: '枡の米を均す棒、大枠を捉える (木＋既)', meaning_ko: '말의 곡식을 고르게 깎는 막대, 대강을 잡다 (木+既)', meaning_en: 'leveling rod, summarize, general concept', words: ['概念', '개념', '概観', '概要', '大概'] },
      '*al-': { label: '*al-', meaning: '育てる、進行する、計算する', words: ['algorithm', 'alma', 'alimentary', 'altitude', 'adult'] },
      '*kʷel-': { label: '*kʷel-', meaning: '回転する、巡る、操縦する', words: ['cybernetics', 'cycle', 'wheel', 'anachronism', 'colony', 'culture'] },
      '*krewp-': { label: '*krewp-', meaning: '隠す、覆う、秘密', words: ['cryptography', 'crypt', 'cryptic'] },
      '*snéh₁wr̥': { label: '*snéh₁wr̥', meaning: '腱、神経、結びつき', words: ['neural', 'neuron', 'nerve', 'neurology'] },
      '*ter-': { label: '*ter-', meaning: '越える、境界を画する、貫く', words: ['deterministic', 'determine', 'term', 'terminate', 'terminal'] },
      '*wekw-': { label: '*wekw-', meaning: '声、呼ぶ、言う', words: ['equivocate', 'voice', 'vocal', 'advocate', 'evoke', 'invoke', 'convoke'] },
      '*h₂mer-': { label: '*h₂mer-', meaning: '日、朝、輝き', words: ['ephemeral', 'ephemera'] },
      '*pa-': { label: '*pa-', meaning: '守る、養う、全体', words: ['panacea', 'pasture', 'company', 'companion'] },
      '*h₂ek-': { label: '*h₂ek-', meaning: '鋭い、尖る、突き刺す', words: ['panacea', 'acid', 'acumen', 'acupuncture'] },
      '*takʰús': { label: '*takʰús', meaning: '速い、急進的な', words: ['tachycardia', 'tachometer'] },
      '*terkʷ-': { label: '*terkʷ-', meaning: '回す、ねじる、曲げる', words: ['tort', 'torque', 'distort', 'contort', 'retort', 'torture'] },
      '*kʷey-': { label: '*kʷey-', meaning: '償う、罰する、制裁', words: ['subpoena', 'penalty', 'punish', 'pain', 'repent'] },
      '*ag-': { label: '*ag-', meaning: '動かす、駆る、行う、導く', words: ['act', 'action', 'agent', 'agenda', 'agency', 'exact', 'activate', 'actor', 'actual', 'active', 'navigate', 'cogent', 'agitate', 'coagulate', 'prodigal', 'transaction'] },
      '*ghel-': { label: '*ghel-', meaning: '黄色、輝く、光る', words: ['gold', 'golden', 'yellow', 'glow', 'gleam', 'glimmer', 'glass'] },
      '*ghew-': { label: '*ghew-', meaning: '注ぐ、呼びかける、祈る', words: ['god', 'goddess', 'godly', 'geyser', 'gut', 'gush'] },
      '*yewg-': { label: '*yewg-', meaning: '結ぶ、つなぐ、結合する', words: ['joint', 'join', 'junction', 'juncture', 'yoke', 'adjust', 'adjoin', 'conjunction'] },
      '*upo-': { label: '*upo-', meaning: '下から上へ、〜の上に、近くに', words: ['upon', 'up', 'open', 'often', 'eaves'] }
    },
    historical: {
      'act': {
        phonetic: 'ækt',
        grammar_forms: '活用: acts / acted / acting',
        category: 25, // 動作・行為
        etymology: '印欧祖語 *h₂eǵ- / *ag-（動かす、駆る、行う）に由来するラテン語 agere（行う、推進する）の過去分詞語幹 actus（行われたこと、劇の幕、法令の布告）から、古期フランス語 acte を経て中期英語に借入。原義は「推進され為されたこと」。',
        etymologyTags: ['*ag-'],
        core: '意志を持って前へと何かを「動かし、行動・実行に移す」イメージ。',
        history_note: '英国議会制において君主の裁可を経て成立した制定法（Act of Parliament）を指す法制度的用例が近代以降に定着。',
        meanings: [
          { pos: 'N[C]', text: '行為、行動、所業' },
          { pos: 'N[C]', text: '【法律・歴史】（議会を通過した）制定法、法令、議決事項（Act of Parliament / Stamp Act）' },
          { pos: 'N[C]', text: '（演劇などの）幕、一幕；短い出し物、見せかけ（put on an act）' },
          { pos: 'V[I]', text: '行動する、活動する；（薬・刺激が）作用する' },
          { pos: 'V[T]', text: '（役・振る舞いを）演じる、〜のふりをする' }
        ],
        example: {
          foreign: 'Parliament passed the Stamp Act in 1765, sparking widespread protests across the American colonies.',
          ja: '議会は1765年に印紙<b>法（Act）</b>を可決し、それが植民地全域での激しい抗議を引き起こした。',
          used_form: 'Act'
        },
        phrases: [
          { foreign: 'Act of Parliament', ja: '英国議会制定法' },
          { foreign: 'catch someone in the act', ja: '現行犯で捕らえる' },
          { foreign: 'put on an act', ja: '見せかける、芝居を打つ' }
        ],
        derivatives: [
          { word: 'action', phonetic: 'ˈækʃn', pos: 'N[C/U]', meaning: '行動、活動、訴訟' },
          { word: 'active', phonetic: 'ˈæktɪv', pos: 'Adj', meaning: '活動的な、積極的な' },
          { word: 'actor', phonetic: 'ˈæktə', pos: 'N[C]', meaning: '俳優、行動者' }
        ]
      },
      'gold': {
        phonetic: 'ɡəʊld',
        grammar_forms: '不可算名詞 (N[U]) / 派生語: golden',
        category: 3, // 経済・金融
        etymology: '古英語 gold に由来し、ゲルマン祖語 *gulþą、印欧祖語 *gʰel- / *gʰl̥-（黄色、輝く、光る；yellow, glow, glass と同根）に遡る。',
        etymologyTags: ['*ghel-'],
        core: '黄色く光り輝く金属のイメージから、最高位の価値や純粋さへと展開。',
        history_note: '人類史上最古の普遍的価値尺度。19世紀から20世紀にかけて世界経済を規律した『金本位制（Gold Standard）』の基軸資産として機能した。',
        meanings: [
          { pos: 'N[U]', text: '金、黄金（原子番号79の貴金属元素 Au）' },
          { pos: 'N[C/U]', text: '金貨、金製品、金メダル（競技大会の1位）' },
          { pos: 'Adj', text: '金色の、黄金の；素晴らしい、貴重な（gold opportunity）' },
          { pos: 'N[U]', text: '【経済・歴史】金本位制（gold standard）、金準備（国の正貨準備）' }
        ],
        example: {
          foreign: 'During the nineteenth century, major commercial powers anchored their currencies to gold.',
          ja: '19世紀、主要な通商大国は自国の通貨を<b>金（金本位制）</b>に連動させた。',
          used_form: 'gold'
        },
        phrases: [
          { foreign: 'gold standard', ja: '金本位制；（比喩）最高の規範・絶対基準' },
          { foreign: 'gold medal', ja: '金メダル、優勝' },
          { foreign: 'worth its weight in gold', ja: '非常に価値がある、極めて貴重な' }
        ],
        derivatives: [
          { word: 'golden', phonetic: 'ˈɡəʊldən', pos: 'Adj', meaning: '黄金の、輝かしい、絶好の' },
          { word: 'goldsmith', phonetic: 'ˈɡəʊldsmɪθ', pos: 'N[C]', meaning: '金細工師' }
        ]
      },
      'god': {
        phonetic: 'ɡɒd',
        grammar_forms: '名詞 / 複数形: gods / 女性形: goddess',
        category: 13, // 哲学・宗教
        etymology: '古英語 god（神、神霊）に由来し、ゲルマン祖語 *gudą、印欧祖語 *gʰew- / *gʰuto-（注ぐ、神酒を注いで呼ぶ、祈る；geyser, gut と同根）に遡る。',
        etymologyTags: ['*ghew-'],
        core: '祈りとともに神酒を注ぎ、呼びかける至高の超越的実在。',
        history_note: 'ゲルマン神話の自然神や霊的存在（中性名詞 *gudą）から、キリスト教受容に伴い男性名詞の唯一神（God）へと意味が再編成され、英語圏の宗教観・道徳観の根幹を形成した。',
        meanings: [
          { pos: 'N[U]', text: '【唯一神】神、創造主、絶対神（キリスト教・ユダヤ教・イスラム教等の至高の存在；大文字の God）' },
          { pos: 'N[C]', text: '神々、神話の神、偶像（多神教・異教の神、守護神；小文字の god）' },
          { pos: 'N[C]', text: '神のような人、至高の存在、崇拝の的（a god of music: 音楽の神様）' },
          { pos: 'Interj', text: '【感動詞】神よ！、何ということだ！（Oh my God! / Good God!）' }
        ],
        example: {
          foreign: 'The ancient philosophers debated whether God could be comprehended through pure reason alone.',
          ja: '古代の哲学者たちは、純粋理性のみによって<b>神</b>を十全に理解できるか否かを議論した。',
          used_form: 'God'
        },
        phrases: [
          { foreign: 'act of God', ja: '不可抗力、天災、自然災害' },
          { foreign: 'God forbid', ja: '決してそんなことがないように、とんでもない' },
          { foreign: 'for God\'s sake', ja: '頼むから、お願いだから（強い懇願・憤り）' }
        ],
        derivatives: [
          { word: 'godly', phonetic: 'ˈɡɒdli', pos: 'Adj', meaning: '信心深い、敬虔な、神聖な' },
          { word: 'goddess', phonetic: 'ˈɡɒdɪs', pos: 'N[C]', meaning: '女神、絶世の美女' },
          { word: 'godless', phonetic: 'ˈɡɒdlɪs', pos: 'Adj', meaning: '神を信じない、不信心な、邪悪な' }
        ]
      },
      'joint': {
        phonetic: 'dʒɔɪnt',
        grammar_forms: '名詞・形容詞 / 複数形: joints / 派生語: jointly',
        category: 14, // ビジネス・経営
        etymology: '古フランス語 joint（結び目、関節；joindre「結合する」の過去分詞）に由来し、ラテン語 iungere（結ぶ、結合する；iugum「くびき」）、印欧祖語 *yewg-（結ぶ、つなぐ、結合する；join, junction, yoke と同根）に遡る。',
        etymologyTags: ['*yewg-'],
        core: '2つ以上の別々の要素を一つに「結び合わせる」イメージ。',
        history_note: '14世紀に古フランス語から英語へ流入。元来は解剖学・工学における「関節・継ぎ目」を指したが、近代法制・金融において「共同の（joint）」、20世紀米国都市文化において「大衆が集まる場所・酒場（joint）」へと多様に展開した。',
        meanings: [
          { pos: 'Adj', text: '共同の、連帯の、合同の（joint venture: 合弁事業、joint statement: 共同声明）' },
          { pos: 'N[C]', text: '関節（骨と骨の連結部）；継ぎ目、接合部' },
          { pos: 'N[C]', text: '【俗・歴史】人が集まる場所、店、酒場（ジャズクラブ・大衆食堂）' },
          { pos: 'V[T]', text: '〜をつなぐ、結合する；（肉を）関節で切り分ける' }
        ],
        example: {
          foreign: 'The two countries issued a joint declaration to enhance bilateral economic cooperation.',
          ja: '両国は二国間経済協力を強化するための<b>共同</b>宣言を発表した。',
          used_form: 'joint'
        },
        phrases: [
          { foreign: 'joint venture', ja: '合弁事業、共同企業体' },
          { foreign: 'joint statement / declaration', ja: '共同声明、共同宣言' },
          { foreign: 'out of joint', ja: '関節が外れて、脱臼して；（秩序などが）狂って' }
        ],
        derivatives: [
          { word: 'jointly', phonetic: 'ˈdʒɔɪntli', pos: 'Adv', meaning: '共同で、連帯して' },
          { word: 'disjointed', phonetic: 'dɪsˈdʒɔɪntɪd', pos: 'Adj', meaning: 'ばらばらの、脈絡のない' }
        ]
      },
      'join': {
        phonetic: 'dʒɔɪn',
        grammar_forms: '活用: joins / joined / joining',
        category: 25, // 動作・行為
        etymology: '古フランス語 joindre に由来し、ラテン語 iungere（結ぶ、結合する）、印欧祖語 *yewg-（結ぶ、つなぐ；joint, junction, yoke と同根）に遡る。',
        etymologyTags: ['*yewg-'],
        core: '離れていた2つ以上のものを近づけて一つに「結びつける・加わる」イメージ。',
        history_note: 'ノルマン征服以降に英語に入り、ゲルマン系の tie や bind と並んで抽象的・組織的な「参加する、加盟する」意味領域を確立した。',
        meanings: [
          { pos: 'V[T]', text: '（組織・クラブ・団体などに）加入する、参加する' },
          { pos: 'V[T]', text: '〜をつなぐ、結合する、結びつける' },
          { pos: 'V[I]', text: '合流する、交わる、合体する' },
          { pos: 'V[T]', text: '（人）と一緒に行動する、同席する（join us for dinner）' }
        ],
        example: {
          foreign: 'Several prominent scholars decided to join the international research committee.',
          ja: '数名の著名な学者が国際研究委員会に<b>参加する</b>ことを決めた。',
          used_form: 'join'
        },
        phrases: [
          { foreign: 'join hands', ja: '手を結ぶ、協力・提携する' },
          { foreign: 'join in', ja: '（活動などに）加わる、参加する' },
          { foreign: 'join forces', ja: '力を合わせる、団結する' }
        ],
        derivatives: [
          { word: 'joint', phonetic: 'dʒɔɪnt', pos: 'Adj', meaning: '共同の、合同の' },
          { word: 'junction', phonetic: 'ˈdʒʌŋkʃən', pos: 'N[C]', meaning: '合流点、交差点、結合' }
        ]
      },
      'have': {
        phonetic: 'hæv',
        grammar_forms: '活用: has / had / having',
        category: 25, // 動作・行為
        etymology: '古英語 habban（持つ、所有する）に由来し、ゲルマン祖語 *habjaną、印欧祖語 *kh₂pyé-（掴む、捕らえる；*kap-）に遡る。ラテン語 capere（捕らえる）や capture, heavy, heave と同根。',
        etymologyTags: ['*kap-'],
        core: '手でしっかりと掴んで自分の手元・領域内に保持するイメージ。',
        history_note: 'ゲルマン語派の最重要基本動詞。元来の「手で掴み取る（*kap-）」という具体的動作から、次第に「所有する」「関係を持つ」、さらには完了時制を作る助動詞（have + 過去分詞）へと文法化を遂げた。',
        meanings: [
          { pos: 'V[T]', text: '（物・権利・性質などを）持っている、所有する、備えている' },
          { pos: 'V[T]', text: '（経験・時間・機会を）過ごす、経験する；（食事・飲み物を）とる、食べる' },
          { pos: 'V[T]', text: '【使役】（人・物に）〜させる、〜してもらう（have + O + 原形 / 過去分詞）' },
          { pos: 'V[T]', text: '【完了助動詞】〜してしまった、〜したことがある、〜し続けている（have + 過去分詞）' }
        ],
        example: {
          foreign: 'They have extensive experience in sustainable urban architecture.',
          ja: '彼らは持続可能な都市建築において豊富な経験を<b>持っている</b>。',
          used_form: 'have'
        },
        phrases: [
          { foreign: 'have to do', ja: '〜しなければならない' },
          { foreign: 'have an effect on', ja: '〜に影響を与える' },
          { foreign: 'have in mind', ja: '〜を念頭に置いている' },
          { foreign: 'have nothing to do with', ja: '〜と何の関係もない' }
        ],
        derivatives: []
      },
      'hard': {
        phonetic: 'hɑːd',
        grammar_forms: '比較変化: harder / hardest',
        category: 26, // 状態・性質
        etymology: '古英語 heard（硬い、厳しい、勇敢な）に由来し、ゲルマン祖語 *harduz、印欧祖語 *kret- / *kert-（強い、硬い、力）に遡る。ギリシャ語 kratos（力、支配；democracy などの -cracy）と同根。',
        etymologyTags: ['*kret-'],
        core: '外力や圧力に対してびくともせず、強固に抵抗するイメージ。',
        history_note: '印欧祖語の「強い、力」からゲルマン諸語で「硬い（物理的硬度）」および「過酷な・厳しい（精神的・環境的困難）」の両義へ発展。近代以降は「実証的・厳密な（hard science）」や「ハードウェア・強硬路線（hard line）」の対比概念としても定着した。',
        meanings: [
          { pos: 'Adj', text: '（物質・表面が）硬い、固い、頑丈な（対義語: soft）' },
          { pos: 'Adj', text: '（問題・仕事が）難しい、困難な、骨の折れる' },
          { pos: 'Adj', text: '（態度・環境・気候が）厳しい、過酷な、冷酷な' },
          { pos: 'Adj', text: '【科学・金融】実証的な、確固たる（hard data / hard science）；兌換性の高い（hard currency）' },
          { pos: 'Adv', text: '一生懸命に、激しく、熱心に、すぐ近くに' }
        ],
        example: {
          foreign: 'It was a hard decision, but it ultimately yielded remarkable scientific progress.',
          ja: 'それは<b>困難な</b>決断であったが、最終的には顕著な科学的進歩をもたらした。',
          used_form: 'hard'
        },
        phrases: [
          { foreign: 'work hard', ja: '一生懸命に働く、努力する' },
          { foreign: 'hard to believe', ja: '信じがたい' },
          { foreign: 'hard evidence', ja: '確固たる証拠、動かぬ証拠' },
          { foreign: 'hard currency', ja: 'ハードカレンシー（国際決済通貨・強固な通貨）' }
        ],
        derivatives: [
          { word: 'hardly', phonetic: 'ˈhɑːdli', pos: 'Adv', meaning: 'ほとんど〜ない' },
          { word: 'hardship', phonetic: 'ˈhɑːdʃɪp', pos: 'N[C/U]', meaning: '苦難、困窮' },
          { word: 'harden', phonetic: 'ˈhɑːdn', pos: 'V[T/I]', meaning: '硬化させる、硬くなる' }
        ]
      },
      'at home': {
        phonetic: 'æt ˈhoʊm',
        grammar_forms: 'idiomatic prepositional phrase / adjective / countable noun',
        category: 1, // 歴史・考古学
        etymology: '前置詞 at（印欧祖語 *ad-「〜へ、近くで」）＋ 名詞 home（古英語 hām「村、住居、家」；印欧祖語 *tḱey- / *key-「横たわる、定住する」）。',
        etymologyTags: ['*ad-', '*key-'],
        core: '最も安心できる自分の本拠地・領域の内部に身を置いている感覚',
        history_note: '19世紀ヴィクトリア朝の英国社交界で、招待状に『At Home（在宅日）』と日時を記して客を迎えた制度的慣習に由来する歴史的用法がある。',
        meanings: [
          { pos: 'Idiom', text: '在宅して、家にいて、自国で' },
          { pos: 'Idiom', text: 'くつろいで、気楽に（feel at home / make oneself at home 等）' },
          { pos: 'Idiom', text: '（学問・分野などに）精通して、明るく、熟達して（at home in / with 等）' },
          { pos: 'N[C]', text: '【歴史】アット・ホーム（19世紀〜20世紀初頭の英国上流階級において、女主人が指定の時間帯に自宅で在宅・面会可能であることを通知した公式の社交面会日・茶会）' }
        ],
        example: {
          foreign: 'She is equally at home in classical philology and modern computational linguistics.',
          ja: '彼女は古典文献学にも現代の計算言語学にも等しく<b>精通している</b>。',
          used_form: 'at home'
        },
        phrases: [
          { foreign: 'feel at home', ja: 'くつろぐ、居心地よく感じる' },
          { foreign: 'make oneself at home', ja: '自分の家のようにくつろぐ' },
          { foreign: 'at home with', ja: '〜に精通している、〜に慣れ親しんでいる' }
        ],
        derivatives: []
      },
      'bear': {
        phonetic: 'bɛə',
        grammar_forms: '複数形: bears / 活用: bore / borne / bearing',
        category: 1, // 歴史・考古学
        etymology: '【動詞】古英語 beran（運ぶ、耐える、産む）に由来し、印欧祖語 *bher-（運ぶ、生む；ラテン語 ferre、ギリシャ語 pherein と同根）に遡る。【名詞】古英語 bera（熊；原義は「茶色い動物」）。',
        etymologyTags: ['*bher-'],
        core: '重みを受け止めて運び抜く力、および「茶色いもの（熊）」',
        history_note: '18世紀英国の南海泡沫事件前後の証券取引所で、クマの毛皮を捕獲前に先売りする投機家を『bear-skin jobber』と呼んだことが金融用語『ベア（弱気筋）』の起源。',
        meanings: [
          { pos: 'V[T]', text: '（重荷・責任・苦痛などに）耐える、我慢する、負う' },
          { pos: 'V[T]', text: '（子供・実を）産む、結ぶ；（感情・特徴を）抱く、帯びる' },
          { pos: 'N[C]', text: 'クマ（熊）' },
          { pos: 'N[C]', text: '【金融・歴史】弱気筋、売り方（18世紀初頭のロンドンの金融街で「捕らぬクマの皮を売る（空売りする）」という諺から定着した相場下落予想者。対義語: bull）' },
          { pos: 'N[C]', text: '【政治・歴史】「熊」（帝政期〜冷戦期以降の欧米外交・風刺画におけるロシア／ソ連の伝統的象徴）' }
        ],
        example: {
          foreign: 'Citizens should not have to bear the disproportionate burden of fiscal austerity.',
          ja: '市民は財政緊縮の不均衡な負担を<b>負う（耐える）</b>べきではない。',
          used_form: 'bear'
        },
        phrases: [
          { foreign: 'bear in mind', ja: '心に留める、銘記する' },
          { foreign: 'bear market', ja: '弱気相場、下落相場' },
          { foreign: 'bear fruit', ja: '実を結ぶ、成果を上げる' }
        ],
        derivatives: [
          { word: 'bearing', phonetic: 'ˈbɛərɪŋ', pos: 'N[C/U]', meaning: '関係、影響；態度；方位' },
          { word: 'unbearable', phonetic: 'ʌnˈbɛərəbl', pos: 'Adj', meaning: '耐えられない、我慢できない' }
        ]
      },
      'upon': {
        phonetic: 'əˈpɒn',
        grammar_forms: '複合前置詞 (up + on)',
        category: 27, // 時間・空間・頻度
        etymology: '中英語 upon（up「上へ」＋on「〜の上に」の複合語）。古英語 uppan に由来し、印欧祖語 *upo（下から上へ）に遡る。',
        etymologyTags: ['*upo-'],
        core: '下から上へ重なり、対象の表面や時間の直後に密着するイメージ。',
        history_note: '中英語期に成立した複合前置詞。現代英語では on に比べて文語的・格式の高い響きを持ち、学術論文や公式文書、時間的即時性（upon arrival / upon receipt）の文脈で重用される。',
        meanings: [
          { pos: 'Prep', text: '〜の上に、〜の表面に接して' },
          { pos: 'Prep', text: '〜するとすぐに、〜の直後に（upon doing / upon + 名詞）' },
          { pos: 'Prep', text: '（根拠・基準）〜に基づいて、〜に依拠して（based upon / depend upon）' }
        ],
        example: {
          foreign: 'Upon reviewing the experimental data, the research team identified a critical pattern.',
          ja: '実験データを検証する<b>とすぐに</b>、研究チームは決定的なパターンを特定した。',
          used_form: 'Upon'
        },
        phrases: [
          { foreign: 'upon arrival', ja: '到着次第、到着するとすぐに' },
          { foreign: 'once upon a time', ja: '昔々' },
          { foreign: 'upon request', ja: '要請に応じて' }
        ],
        derivatives: []
      },
      'special': {
        phonetic: 'ˈspeʃl',
        grammar_forms: '比較変化: more special / most special',
        category: 28, // 抽象概念・論理
        etymology: 'ラテン語 specialis（個別の、特定の；species「外見、特定の種、種類」＋-alis）に由来し、印欧祖語 *speḱ-（見る、観察する）に遡る。',
        etymologyTags: ['*spec-'],
        core: '他とはっきりと「見て区別できる」独自の種・固有の性質。',
        history_note: '中世ラテン語から古フランス語を経て13世紀に英語へ流入。元々は「個別の種（species）に属する」という哲学的・分類学的な限定の語であったが、次第に「格別の、並外れた、特定の目的のための」という意味へ発展した。',
        meanings: [
          { pos: 'Adj', text: '特別な、格別の、並外れた（通常の枠を超えた）' },
          { pos: 'Adj', text: '特定の、固有の、専門の（特定の目的・対象に限定された）' },
          { pos: 'Adj', text: '【哲学・分類】種（species）に固有の、特殊的な（対義語: general「類的な・一般的な」）' },
          { pos: 'N[C]', text: '特別番組、特別号、特別料理（スペシャルメニュー）、臨時列車' }
        ],
        example: {
          foreign: 'This discovery holds a special significance for modern particle physics.',
          ja: 'この発見は、現代の素粒子物理学にとって<b>特別な</b>意義を持っている。',
          used_form: 'special'
        },
        phrases: [
          { foreign: 'special education', ja: '特別支援教育' },
          { foreign: 'in particular / special case', ja: '特に／特殊な事例' }
        ],
        derivatives: [
          { word: 'specially', phonetic: 'ˈspeʃəli', pos: 'Adv', meaning: '特に、わざわざ、特別に' },
          { word: 'specialist', phonetic: 'ˈspeʃəlɪst', pos: 'N[C]', meaning: '専門家、専門医' },
          { word: 'specialize', phonetic: 'ˈspeʃəlaɪz', pos: 'V[I]', meaning: '専門とする、専攻する' },
          { word: 'specialty', phonetic: 'ˈspeʃəlti', pos: 'N[C]', meaning: '専門、特産品、名物' }
        ]
      },
      'objective': {
        etymology: 'ラテン語 objectivus (objectum 前に投げられたもの; ob- 前へ + iacere 投げる) に由来し、印欧祖語 *ye- (投げる、放つ) に遡る。',
        etymologyTags: ['*ye-'],
        core: '前方に投げ出されて目に入ってくる対象・目指すべき標的のイメージ。',
        history_note: '中世スコラ哲学で「知性に対して対象として投げ出されているもの」を意味した概念が、近代科学で「主観から独立した客観的実在・達成すべき目標」へと転化した。',
        meanings: [
          { pos: 'N[C]', text: '目標、目的、方針' },
          { pos: 'Adj', text: '客観的な、実在の、偏見のない' }
        ],
        example: {
          foreign: 'Our primary objective is to complete the project on schedule.',
          ja: '私たちの主要な目標は、予定通りにプロジェクトを完了させることである。',
          used_form: 'objective'
        }
      },
      'implement': {
        etymology: 'ラテン語 implementum（満たすこと、器具；impleō「満たす」＋-mentum）に由来し、印欧祖語 *pel-（満たす、注ぐ、多い）に遡る。',
        etymologyTags: ['*pel-'],
        core: '目的や空間を「満たす」ための道具・器具から、計画や方針を「実行・充足する」ことへと転化。',
        history_note: '原義は「満たす道具」を意味したが、19世紀以降の近代的行政・組織論において「方針・政策を完全に実施・具体化する」という動詞用法が定着した。',
        meanings: [
          { pos: 'V[T]', text: '（計画・政策・方針を）実行する、実施する、導入する' },
          { pos: 'N[C]', text: '道具、器具、用具（農具・工具など）' }
        ],
        example: {
          foreign: 'The leadership agreed to implement the strategic reforms immediately.',
          ja: '指導部は戦略的改革を直ちに<b>実行する</b>ことで合意した。',
          used_form: 'implement'
        }
      },
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
      },
      'laïcité': {
        etymology: 'ギリシャ語 laikos (民衆・世俗) → ラテン語 laicus → フランス語 laïque 由来。',
        etymologyTags: [],
        core: '宗教的権威から分離された公的市民社会の原理。',
        history_note: '1905年フランス政教分離法（Loi de séparation）によって確立された共和国の根本原理。',
        meanings: [
          { pos: 'N[f]', text: '世俗主義、政教分離原則、ライシテ' }
        ],
        example: {
          foreign: 'La laïcité garantit la liberté de conscience de tous les citoyens.',
          ja: '<b>ライシテ（政教分離）</b>はすべての市民の信教・良心の自由を保障する。',
          used_form: 'laïcité'
        }
      },
      'zeitgeist': {
        etymology: 'ドイツ語 Zeit (時代: 印欧祖語 *da- 分割) + Geist (精神: 印欧祖語 *gʰeizd- 驚く) の複合語。',
        etymologyTags: [],
        core: '特定の時代を特徴づける知的・道徳的・文化的思潮。',
        history_note: 'ヘルダーやヘーゲル哲学を通じて広まり、英語圏へも借用語として定着した概念。',
        meanings: [
          { pos: 'N[m]', text: '時代精神、時代の思潮、ツァイトガイスト' }
        ],
        example: {
          foreign: 'Das Werk spiegelt den Zeitgeist der Romantik wider.',
          ja: 'その作品はロマン主義の<b>時代精神</b>を如実に反映している。',
          used_form: 'Zeitgeist'
        }
      }
    }
  };

  /**
   * 基本・機能語・頻出重要語彙のオフライン学術辞書マスター (Essential English Lexicon)
   */
  const ESSENTIAL_ENGLISH_LEXICON = {
    'moribund': {
      phonetic: 'ˈmɔːrɪbʌnd',
      pos: 'Adj',
      meaning: '瀕死の、死にかかっている；衰退している、終息に向かっている',
      core: '生命力や活力が尽きかけ、死や機能停止の瀬戸際にあるイメージ。',
      etymology: 'ラテン語 moribundus（死にかかっている）に由来。印欧祖語 *mer-（死ぬ、消える、衰える）から発展した。',
      etymologyTags: ['*mer-'],
      category: 26,
      grammar_forms: '比較変化: more moribund / most moribund',
      history_note: '18世紀初頭にラテン語より導入。生物の肉体的な死のみならず、制度・組織・慣行・経済などの「形骸化・衰亡・破綻寸前の状態」を比喩的に指す学術・論評語として定着。',
      example: {
        foreign: 'The central bank intervened to revive the moribund commercial real estate market.',
        ja: '中央銀行は<b>衰退に瀕した</b>商業用不動産市場を立て直すために介入した。',
        used_form: 'moribund'
      },
      phrases: [
        { foreign: 'moribund economy', ja: '停滞・衰退した経済' },
        { foreign: 'moribund patient', ja: '危篤患者、瀕死の患者' }
      ]
    },
    'upon': {
      phonetic: 'əˈpɒn',
      pos: 'Prep',
      meaning: '〜の上に、〜に接して；〜するとすぐに、〜の直後に',
      core: '下から上へ重なり、対象の表面や時間の直後に密着するイメージ。',
      etymology: '中英語 upon（up「上へ」＋on「〜の上に」の複合語）。印欧祖語 *upo（下から上へ）に遡る。',
      etymologyTags: ['*upo-'],
      history_note: '古英語 uppan に由来。現代英語では on に比べて文語的・格式の高い響きを持ち、時間的即時性（upon arrival）や学術・文学的文脈で多用される。',
      example: {
        foreign: 'Upon reviewing the experimental data, the research team identified a critical pattern.',
        ja: '実験データを検証する<b>とすぐに</b>、研究チームは決定的なパターンを特定した。',
        used_form: 'Upon'
      },
      phrases: [
        { foreign: 'upon arrival', ja: '到着次第、到着するとすぐに' },
        { foreign: 'once upon a time', ja: '昔々' },
        { foreign: 'upon request', ja: '要請に応じて' }
      ]
    },
    'onto': {
      phonetic: 'ˈɒntu',
      pos: 'Prep',
      meaning: '〜の上へ、〜の表面へ向かって',
      core: '外側から「対象の表面の上」へと移動して着地するイメージ。',
      etymology: 'on（〜の上に）＋ to（〜へ向かって）の合成前置詞。',
      example: {
        foreign: 'The cat jumped onto the bookshelf with effortless grace.',
        ja: '猫は何気ない優雅さで本棚の<b>上へ</b>飛び乗った。',
        used_form: 'onto'
      }
    },
    'into': {
      phonetic: 'ˈɪntu',
      pos: 'Prep',
      meaning: '〜の中へ、〜の内側へ；〜へ変化して',
      core: '境界を越えて内側の奥深くまで入り込むイメージ。',
      etymology: 'in（内側）＋ to（到達）の複合前置詞。',
      example: {
        foreign: 'The scientist peered deeply into the microscopic structure.',
        ja: '科学者は微視的構造の<b>中を</b>深く覗き込んだ。',
        used_form: 'into'
      }
    },
    'within': {
      phonetic: 'wɪˈðɪn',
      pos: 'Prep',
      meaning: '〜の範囲内で、〜の内側に、〜以内に',
      core: '定められた限界・境界の内側に安全に収まっているイメージ。',
      etymology: '古英語 wiðinnan（wið「接して」＋innan「内側から」）。',
      example: {
        foreign: 'The results must be delivered within three business days.',
        ja: '結果は3営業日<b>以内に</b>提出されなければならない。',
        used_form: 'within'
      }
    },
    'without': {
      phonetic: 'wɪˈðaʊt',
      pos: 'Prep',
      meaning: '〜なしで、〜を持たずに',
      core: '境界の外側にあり、対象が存在しない・伴わないイメージ。',
      etymology: '古英語 wiðutan（wið「接して」＋utan「外側」）。',
      example: {
        foreign: 'Progress is impossible without continuous experimentation.',
        ja: '継続的な実験<b>なしには</b>進歩は不可能である。',
        used_form: 'without'
      }
    },
    'throughout': {
      phonetic: 'θruːˈaʊt',
      pos: 'Prep',
      meaning: '〜の至る所に、〜の隅々まで；〜の間中ずっと',
      core: '空間や時間の最初から最後まで隈なく通り抜けるイメージ。',
      etymology: 'through（貫通）＋ out（外まで完全に行き届く）の強調複合語。',
      example: {
        foreign: 'The theory gained widespread acceptance throughout the scientific community.',
        ja: 'その理論は科学界の<b>至る所で</b>広く受け入れられた。',
        used_form: 'throughout'
      }
    },
    'against': {
      phonetic: 'əˈɡenst',
      pos: 'Prep',
      meaning: '〜に対抗して、〜に反対して；〜に立てかけて、〜を背景にして',
      core: '向かい合ってぶつかり合う・反発するイメージ。',
      etymology: '中英語 ageinst（古英語 ongean「向かい合って」＋副詞語尾 -es）。',
      example: {
        foreign: 'The committee voted against the proposed regulatory amendments.',
        ja: '委員会は提案された規制改正案に<b>反対して</b>投票した。',
        used_form: 'against'
      }
    },
    'between': {
      phonetic: 'bɪˈtwiːn',
      pos: 'Prep',
      meaning: '（2つのものの）間に、〜の間で',
      core: '2つの対象に挟まれた中間の空間・関係のイメージ。',
      etymology: '古英語 betweonum（be-「〜のそばに」＋twā「2つ」）。',
      example: {
        foreign: 'There is a subtle distinction between the two theoretical frameworks.',
        ja: '2つの理論的枠組みの<b>間には</b>微妙な相違がある。',
        used_form: 'between'
      }
    },
    'among': {
      phonetic: 'əˈmʌŋ',
      pos: 'Prep',
      meaning: '（3つ以上のものの）間に、〜の中で、〜に囲まれて',
      core: '混ざり合った多数の集団の中に溶け込んでいるイメージ。',
      etymology: '古英語 ongemang（on「〜の中に」＋gemang「混ざり合い」）。',
      example: {
        foreign: 'The consensus among researchers was clear and unequivocal.',
        ja: '研究者たちの<b>間における</b>合意は明確で疑いのないものであった。',
        used_form: 'among'
      }
    },
    'beyond': {
      phonetic: 'bɪˈjɒnd',
      pos: 'Prep',
      meaning: '〜を越えて、〜の向こうに；〜の能力・限界を超越して',
      core: '既知の境界線や限界の「はるか向こう側」にあるイメージ。',
      etymology: '古英語 begeondan（be-「〜のそばに」＋geond「向こうへ」）。',
      example: {
        foreign: 'The implications of quantum entanglement reach beyond classical physics.',
        ja: '量子もつれの示唆するところは、古典物理学の限界を<b>超えて</b>及んでいる。',
        used_form: 'beyond'
      }
    },
    'towards': {
      phonetic: 'təˈwɔːdz',
      pos: 'Prep',
      meaning: '〜の方へ、〜に向けて；〜を目的として',
      core: 'ある方向や目的に視線・動きが向いているイメージ。',
      etymology: '古英語 tōweard（to「〜へ」＋-ward「〜を向いた」＋副詞語尾 -s）。',
      example: {
        foreign: 'Society is moving towards a more sustainable energy paradigm.',
        ja: '社会はより持続可能なエネルギーの枠組みに<b>向かって</b>進んでいる。',
        used_form: 'towards'
      }
    },
    'despite': {
      phonetic: 'dɪˈspaɪt',
      pos: 'Prep',
      meaning: '〜にもかかわらず',
      core: '妨害や逆境を見下ろして押し通るイメージ。',
      etymology: 'ラテン語 despectus（見下すこと；de-「下へ」＋specere「見る」）。印欧祖語 *speḱ- に由来。',
      etymologyTags: ['*spec-'],
      example: {
        foreign: 'Despite numerous obstacles, the mission achieved its primary objectives.',
        ja: '数多くの障害<b>にもかかわらず</b>、任務はその主要目標を達成した。',
        used_form: 'Despite'
      }
    },
    'during': {
      phonetic: 'ˈdjʊərɪŋ',
      pos: 'Prep',
      meaning: '〜の間に、〜の期間中ずっと',
      core: '時間の幅が持続している「その最中」のイメージ。',
      etymology: '古フランス語 durant（durer「持続する」の現在分詞）。ラテン語 durare 由来。',
      example: {
        foreign: 'Significant advances were accomplished during the final phase of research.',
        ja: '研究の最終段階の<b>間に</b>、重大な進展が達成された。',
        used_form: 'during'
      }
    },
    'although': {
      phonetic: 'ɔːlˈðəʊ',
      pos: 'Conj',
      meaning: '〜だけれども、〜にもかかわらず',
      core: '前述の事実を「すべて認めた上で」なお主節の結論を述べるイメージ。',
      etymology: 'all（完全に）＋ though（〜だけれども）の強調形。',
      example: {
        foreign: 'Although the sample size was modest, the correlations were robust.',
        ja: '標本規模は小さかった<b>けれども</b>、相関関係は極めて強固であった。',
        used_form: 'Although'
      }
    },
    'unless': {
      phonetic: 'ənˈles',
      pos: 'Conj',
      meaning: '〜でない限り、もし〜でなければ',
      core: '例外となる特定の条件を外側に「除外」するイメージ。',
      etymology: '中英語 on lesse than（〜より下でない限り）から短縮。',
      example: {
        foreign: 'The policy cannot be enacted unless ratified by the council.',
        ja: '議会によって批准され<b>ない限り</b>、その政策を施行することはできない。',
        used_form: 'unless'
      }
    },
    'whether': {
      phonetic: 'ˈweðə',
      pos: 'Conj',
      meaning: '〜かどうか、〜であろうとなかろうと',
      core: '2つの選択肢の間で迷う・どちらでも構わないイメージ。',
      etymology: '古英語 hwæðer（2つのうちどちらか）。印欧祖語 *kʷo-（疑問詞語根）。',
      example: {
        foreign: 'Researchers debated whether the anomalous signals were genuinely cosmological.',
        ja: '研究者たちは、その異常な信号が真に宇宙論的なもの<b>であるかどうか</b>を議論した。',
        used_form: 'whether'
      }
    },
    'special': {
      phonetic: 'ˈspeʃl',
      pos: 'Adj',
      meaning: '特別な、特殊な、格別の、専門の、独自の',
      core: '他とはっきりと「見て区別できる」独自の種・固有の性質。',
      etymology: 'ラテン語 specialis（個別の、特定の；species「外見、特定の種」＋-alis）に由来し、印欧祖語 *speḱ-（見る、観察する）に遡る。',
      etymologyTags: ['*spec-'],
      example: {
        foreign: 'This discovery holds a special significance for modern particle physics.',
        ja: 'この発見は、現代の素粒子物理学にとって<b>特別な</b>意義を持っている。',
        used_form: 'special'
      }
    },
    'general': {
      phonetic: 'ˈdʒenrəl',
      pos: 'Adj',
      meaning: '全般的な、一般的な、全体に関する；（名詞: 将軍、大将）',
      core: '個別の種ではなく「族（genus）全体」に共通して広がるイメージ。',
      etymology: 'ラテン語 generalis（属の、一般的な；genus「種族、類」＋-alis）。印欧祖語 *genh₁-（生む）に由来。',
      etymologyTags: ['*genh₁-'],
      example: {
        foreign: 'The general consensus in the academic community favored the new paradigm.',
        ja: '学会における<b>全般的な</b>合意は、新しいパラダイムを支持した。',
        used_form: 'general'
      }
    },
    'important': {
      phonetic: 'ɪmˈpɔːtnt',
      pos: 'Adj',
      meaning: '重要な、重大な、影響力のある',
      core: '価値や意味の重みを内側に「持ち込む」イメージ。',
      etymology: 'ラテン語 importare（持ち込む；in-「中に」＋portare「運ぶ」）。印欧祖語 *per- に由来。',
      etymologyTags: ['*per-'],
      example: {
        foreign: 'Peer review plays an important role in preserving academic integrity.',
        ja: '査読は学術的公正性を維持する上で<b>重要な</b>役割を担っている。',
        used_form: 'important'
      }
    },
    'different': {
      phonetic: 'ˈdɪfrənt',
      pos: 'Adj',
      meaning: '異なる、違った、別々の',
      core: '別々の方向へ「運び去られて」隔たっているイメージ。',
      etymology: 'ラテン語 differre（別々の方向に運ぶ；dis-「離れて」＋ferre「運ぶ」）。印欧祖語 *bher- に由来。',
      etymologyTags: ['*bher-'],
      example: {
        foreign: 'The two laboratories arrived at different conclusions using identical parameters.',
        ja: '2つの研究所は同一の変数を用いながら<b>異なる</b>結論に達した。',
        used_form: 'different'
      }
    },
    'particular': {
      phonetic: 'pəˈtɪkjələ',
      pos: 'Adj',
      meaning: '特定の、特有の、個別の、格別の',
      core: '全体から切り離された「小さな一片（part）」に固有であるイメージ。',
      etymology: 'ラテン語 particularis（小さな部分の；particula「小片」）。印欧祖語 *per-（割り当てる）に由来。',
      example: {
        foreign: 'The author pays particular attention to historical context in this chapter.',
        ja: '著者は本章において、歴史的文脈に<b>格別の</b>注意を払っている。',
        used_form: 'particular'
      }
    },
    'available': {
      phonetic: 'əˈveɪləbl',
      pos: 'Adj',
      meaning: '利用可能な、入手できる、手が空いている',
      core: '価値があり、力をもって活用できる状態にあるイメージ。',
      etymology: '古フランス語 valoir（価値がある、効力がある；ラテン語 valere）＋ a- ＋ -able。',
      example: {
        foreign: 'The primary documentation is readily available in the institutional archives.',
        ja: '一次資料は機関アーカイブにおいて容易に<b>利用可能</b>である。',
        used_form: 'available'
      }
    },
    'possible': {
      phonetic: 'ˈpɒsəbl',
      pos: 'Adj',
      meaning: '可能な、起こり得る、あり得る',
      core: '実現するための「力（potis）」が備わっているイメージ。',
      etymology: 'ラテン語 possibilis（posse「できる、力がある」＋-ibilis）。印欧祖語 *poti-（主、力）に由来。',
      example: {
        foreign: 'Theoretical physicists examined every possible solution to the field equations.',
        ja: '理論物理学者たちは場の方程式に対するあらゆる<b>可能な</b>解を吟味した。',
        used_form: 'possible'
      }
    },
    'significant': {
      phonetic: 'sɪɡˈnɪfɪkənt',
      pos: 'Adj',
      meaning: '重大な、重要な、意味のある、著しい',
      core: '何らかの「しるし（sign）」を示して強い意味を持つイメージ。',
      etymology: 'ラテン語 significare（示す、意味する；signum「印」＋facere「作る」）。印欧祖語 *sekʷ- に由来。',
      example: {
        foreign: 'The trial yielded a statistically significant improvement.',
        ja: 'その治験は統計的に<b>著しい</b>改善をもたらした。',
        used_form: 'significant'
      }
    },
    'crucial': {
      phonetic: 'ˈkruːʃl',
      pos: 'Adj',
      meaning: '極めて重要な、決定的な、死活的な',
      core: '十字路（cross）のように進路を決定づける分岐点にあるイメージ。',
      etymology: 'ラテン語 crucialis（十字の；crux「十字架」）。',
      example: {
        foreign: 'International collaboration played a crucial role in the mission.',
        ja: '国際協力がその任務において<b>決定的な</b>役割を果たした。',
        used_form: 'crucial'
      }
    },
    'essential': {
      phonetic: 'ɪˈsenʃl',
      pos: 'Adj',
      meaning: '本質的な、欠くことのできない、極めて重要な',
      core: '物事の「本質（essence）・存在の核」を成しているイメージ。',
      etymology: 'ラテン語 essentialis（essentia「本質」；esse「存在する」）。印欧祖語 *h₁es-（存在する）に由来。',
      example: {
        foreign: 'Mutual trust is essential for effective diplomatic negotiations.',
        ja: '相互の信頼は効果的な外交交渉にとって<b>欠くことのできない</b>ものである。',
        used_form: 'essential'
      }
    },
    'fundamental': {
      phonetic: 'ˌfʌndəˈmentl',
      pos: 'Adj',
      meaning: '根本的な、基礎的な、基本的な',
      core: '建物の「基礎・土台（foundation）」を底から支えているイメージ。',
      etymology: 'ラテン語 fundamentalis（fundamentum「基礎」；fundus「底、土台」）。印欧祖語 *bʰudʰ-（底）に由来。',
      example: {
        foreign: 'Conservation laws represent fundamental principles of modern physics.',
        ja: '保存則は現代物理学の<b>根本的な</b>原理を表している。',
        used_form: 'fundamental'
      }
    },
    'specific': {
      phonetic: 'spəˈsɪfɪk',
      pos: 'Adj',
      meaning: '具体的な、特定の、明確な、特有の',
      core: '特定の種（species）を明確に指し示して限定するイメージ。',
      etymology: 'ラテン語 specificus（species「種」＋facere「作る」）。印欧祖語 *speḱ-（見る）に遡る。',
      etymologyTags: ['*spec-'],
      example: {
        foreign: 'The protocol requires specific environmental conditions for replication.',
        ja: 'そのプロトコルは再現のために<b>特定の</b>環境条件を必要とする。',
        used_form: 'specific'
      }
    },
    'provide': {
      phonetic: 'prəˈvaɪd',
      pos: 'V[T]',
      meaning: '提供する、供給する、規定する、備える',
      core: '前もって（pro-）見て（videre）用意を整えるイメージ。',
      etymology: 'ラテン語 providere（前もって見る；pro-「前へ」＋videre「見る」）。印欧祖語 *weid-（見る、知る）に遡る。',
      etymologyTags: ['*weid-'],
      example: {
        foreign: 'The laboratory agreed to provide necessary resources for the consortium.',
        ja: '研究所は共同研究体に不可欠な資源を<b>提供する</b>ことに同意した。',
        used_form: 'provide'
      }
    },
    'require': {
      phonetic: 'rɪˈkwaɪə',
      pos: 'V[T]',
      meaning: '必要とする、要求する、命じる',
      core: '後ろから繰り返し強く求め尋ねるイメージ。',
      etymology: 'ラテン語 requirere（探し求める；re-「再び」＋quaerere「探す、尋ねる」）。印欧祖語 *kʷo-（疑問詞）に由来。',
      example: {
        foreign: 'Complex analytical procedures require rigorous calibration.',
        ja: '複雑な分析手順は厳密な校正を<b>必要とする</b>。',
        used_form: 'require'
      }
    },
    'consider': {
      phonetic: 'kənˈsɪdə',
      pos: 'V[T]',
      meaning: 'よく考える、考慮する、〜とみなす',
      core: '星々（sidus）を共に見上げながら注意深く観察・占考するイメージ。',
      etymology: 'ラテン語 considerare（熟考する；con-「共に」＋sidus「星」）。',
      example: {
        foreign: 'Scholars consider this manuscript to be the definitive historical record.',
        ja: '学者たちはこの写本を決定的な歴史的記録であると<b>みなしている</b>。',
        used_form: 'consider'
      }
    },
    'theory': {
      phonetic: 'ˈθɪəri',
      pos: 'N[C/U]',
      meaning: '理論、学説、仮説、原理',
      core: '物事の本質を心の中で深く観察し、全体像を見晴らすイメージ。',
      etymology: 'ギリシャ語 θεωρία（theōría「観察、観照、考察」；theaomai「眺める」）。印欧祖語 *dʰew-（輝く、見る）に由来。',
      example: {
        foreign: 'The general theory explains a broad spectrum of empirical phenomena.',
        ja: 'その一般<b>理論</b>は広範な経験的現象を説明する。',
        used_form: 'theory'
      }
    },
    'analysis': {
      phonetic: 'əˈnæləsɪs',
      pos: 'N[C/U]',
      meaning: '分析、解析、検討、分解',
      core: '絡み合った結び目を「下から解きほぐして（ana- + lyein）」要素に分けるイメージ。',
      etymology: 'ギリシャ語 ἀνάλυσις（análusis「解くこと、分解」；ana-「上へ、完全に」＋luein「解く」）。印欧祖語 *lew-（解く）に由来。',
      example: {
        foreign: 'Detailed spectral analysis confirmed the presence of organic compounds.',
        ja: '詳細なスペクトル<b>分析</b>により有機化合物の存在が確認された。',
        used_form: 'analysis'
      }
    },
    'principle': {
      phonetic: 'ˈprɪnsəpl',
      pos: 'N[C]',
      meaning: '原理、原則、公理、主義、根本方針',
      core: '最初に（primus）掴むべき（capere）根本の土台・出発点のイメージ。',
      etymology: 'ラテン語 principium（始まり、基礎；princeps「最初の」；primus「第一の」＋capere「取る」）。印欧祖語 *kap-（掴む）に由来。',
      etymologyTags: ['*kap-'],
      example: {
        foreign: 'The scientific method is grounded upon the principle of falsifiability.',
        ja: '科学的方法は反証可能性の<b>原理</b>の上に基礎づけられている。',
        used_form: 'principle'
      }
    },
    'concept': {
      phonetic: 'ˈkɒnsept',
      pos: 'N[C]',
      meaning: '概念、観念、構想、着想',
      core: '心の中でバラバラの要素を一つにまとめて「掴み取る」イメージ。',
      etymology: 'ラテン語 conceptus（掴み取られたもの；com-「共に」＋capere「掴む」）。印欧祖語 *kap-（掴む）に由来。',
      etymologyTags: ['*kap-'],
      example: {
        foreign: 'This chapter explores the fundamental concept of quantum entanglement.',
        ja: '本章では量子もつれの基本<b>概念</b>を探求する。',
        used_form: 'concept'
      }
    },
    'context': {
      phonetic: 'ˈkɒntekst',
      pos: 'N[C/U]',
      meaning: '文脈、脈絡、背景、状況',
      core: '複数の要素が縦横に織り合わされて（con- + texere）作られる全体の織物のイメージ。',
      etymology: 'ラテン語 contextus（織り合わされたもの；texere「織る」）。印欧祖語 *teks-（編む、織る）に由来。',
      etymologyTags: ['*teks-'],
      example: {
        foreign: 'Historical terms must always be understood within their specific context.',
        ja: '歴史的用語は常に固有の<b>文脈</b>の中で理解されなければならない。',
        used_form: 'context'
      }
    },
    'subtle': {
      phonetic: 'ˈsʌtl',
      pos: 'Adj',
      meaning: '微妙な、捉えがたい、繊細な、巧みな、目立たない',
      core: '織物の横糸の下（sub）に細かく潜り込み、一見では判別できない細密さのイメージ。',
      etymology: 'ラテン語 subtilis（細密な、精緻な；sub「下に」＋tela「織物・縦糸」；texere「織る」）。印欧祖語 *teks-（織る）に由来。',
      etymologyTags: ['*teks-'],
      example: {
        foreign: 'There is a subtle distinction between theoretical validity and practical utility.',
        ja: '理論的妥当性と実用的な効用との間には<b>微妙な</b>差異が存在する。',
        used_form: 'subtle'
      }
    },
    'arbitrary': {
      phonetic: 'ˈɑːbɪtrəri',
      pos: 'Adj',
      meaning: '任意の、専断的な、独断的な、恣意的な',
      core: '客観的ルールではなく、一人の目撃者・仲裁人（arbiter）の個人的裁量に委ねるイメージ。',
      etymology: 'ラテン語 arbitrarius（仲裁人の判断による；arbiter「目撃者・仲裁人」；ad-「〜へ」＋baetere「行く」）。',
      etymologyTags: [],
      example: {
        foreign: 'The linguistic sign is arbitrary in relation to the conceptual signified.',
        ja: '言語記号は概念的シニフィエに対して<b>恣意的</b>である。',
        used_form: 'arbitrary'
      }
    },
    'resilience': {
      phonetic: 'rɪˈzɪliəns',
      pos: 'N[U]',
      meaning: '回復力、復元力、弾力性、適応力',
      core: '圧力を受けても後ろへ跳ね返り（re- + salire）、元の形状や均衡へ戻るイメージ。',
      etymology: 'ラテン語 resilientia（跳ね返ること；salire「跳ぶ」）。印欧祖語 *sel-（跳ぶ）に由来。',
      etymologyTags: [],
      example: {
        foreign: 'The economic system demonstrated remarkable resilience against market shocks.',
        ja: 'その経済システムは市場ショックに対して顕著な<b>回復力</b>を示した。',
        used_form: 'resilience'
      }
    },
    'perceive': {
      phonetic: 'pəˈsiːv',
      pos: 'V[T]',
      meaning: '知覚する、気づく、理解する、認識する',
      core: '感覚器官を通じて対象を徹底的に（per-）完全に「掴み取る（capere）」イメージ。',
      etymology: 'ラテン語 percipere（完全に掴む、認識する；per-「完全に」＋capere「取る」）。印欧祖語 *kap-（掴む）に由来。',
      etymologyTags: ['*kap-'],
      example: {
        foreign: 'Human beings perceive their environment through culturally conditioned categories.',
        ja: '人間は文化的に条件づけられた範疇を通して環境を<b>知覚する</b>。',
        used_form: 'perceive'
      }
    },
    'establish': {
      phonetic: 'ɪˈstæblɪʃ',
      pos: 'V[T]',
      meaning: '確立する、設立する、定着させる、立証する',
      core: '堅固に立たせて（sta-）揺るぎない土台を作るイメージ。',
      etymology: 'ラテン語 stabilire（安定させる；stare「立つ」）。印欧祖語 *sta-（立つ）に由来。',
      etymologyTags: ['*sta-'],
      example: {
        foreign: 'Recent archaeological excavations establish a new chronological timeline.',
        ja: '近年の考古学的発掘は新たな編年史的タイムラインを<b>確立した</b>。',
        used_form: 'establish'
      }
    },
    'structure': {
      phonetic: 'ˈstrʌktʃə',
      pos: 'N[C/U]',
      meaning: '構造、機構、組織、体系、建造物',
      core: '層を積み重ねて（struere）一つの堅牢な全体を組み立てるイメージ。',
      etymology: 'ラテン語 structura（建築、組み立て；struere「積み重ねる、築く」）。印欧祖語 *strew-（広げる、積み上げる）に由来。',
      etymologyTags: [],
      example: {
        foreign: 'The institutional structure of the state dictates policy execution.',
        ja: '国家の制度的<b>構造</b>が政策の遂行を左右する。',
        used_form: 'structure'
      }
    },
    'process': {
      phonetic: 'ˈprəʊses',
      pos: 'N[C]',
      meaning: '過程、工程、プロセス、変化の推移',
      core: '前方へ（pro-）着実に進んでいく（cedere）一連の歩みのイメージ。',
      etymology: 'ラテン語 processus（前進；pro-「前へ」＋cedere「歩む、進む」）。印欧祖語 *ked-（行く、譲る）に由来。',
      etymologyTags: ['*ked-'],
      example: {
        foreign: 'Scientific discovery is an iterative process of conjecture and refutation.',
        ja: '科学的発見は推測と反駁の反復的な<b>過程</b>である。',
        used_form: 'process'
      }
    },
    'phenomenon': {
      phonetic: 'fəˈnɒmɪnən',
      pos: 'N[C]',
      meaning: '現象、事象、驚異的な人物・出来事',
      core: '光に照らされて目に見える姿として「現れ出たもの」のイメージ。',
      etymology: '古代ギリシャ語 phainomenon（現れているもの；phainein「光を当てる、現す」）。印欧祖語 *bha-（輝く）に由来。',
      etymologyTags: ['*bha-'],
      example: {
        foreign: 'Urbanization was a transformative social phenomenon of the nineteenth century.',
        ja: '都市化は19世紀の変革的な社会<b>現象</b>であった。',
        used_form: 'phenomenon'
      }
    },
    'paradigm': {
      phonetic: 'ˈpærədaɪm',
      pos: 'N[C]',
      meaning: '規範、範例、パラダイム、理論的枠組み',
      core: '手本として傍らに（para-）並べて見せる（deik-）模範・思考モデルのイメージ。',
      etymology: '古代ギリシャ語 paradeigma（模範、実例；para-「傍らに」＋deiknynai「指し示す」）。印欧祖語 *deik-（指し示す）に由来。',
      etymologyTags: ['*deik-'],
      example: {
        foreign: 'The discovery of genetics precipitated a profound paradigm shift in evolutionary biology.',
        ja: '遺伝学の発見は進化生物学において深遠な<b>パラダイム</b>転換を引き起こした。',
        used_form: 'paradigm'
      }
    },
    'hypothesis': {
      phonetic: 'haɪˈpɒθəsɪs',
      pos: 'N[C]',
      meaning: '仮説、前提、仮定',
      core: '議論や理論の土台として下に（hypo-）置かれた（thesis）命題のイメージ。',
      etymology: '古代ギリシャ語 hypothesis（基礎、仮定；hypo-「下に」＋tithenai「置く」）。印欧祖語 *dhe-（置く）に由来。',
      etymologyTags: ['*dhe-'],
      example: {
        foreign: 'The empirical data strongly supported the researcher\'s working hypothesis.',
        ja: '実証データは研究者の作業<b>仮説</b>を強力に支持した。',
        used_form: 'hypothesis'
      }
    },
    'criterion': {
      phonetic: 'kraɪˈtɪəriən',
      pos: 'N[C]',
      meaning: '基準、評価規範、判断標準',
      core: '物事を分けて（krinein）判別・判定するための手秤・道具のイメージ。',
      etymology: '古代ギリシャ語 kriterion（判断基準；krinein「分ける、裁く、識別する」）。印欧祖語 *krei-（ふるいにかける、識別する）に由来。',
      etymologyTags: ['*krei-'],
      example: {
        foreign: 'Logical consistency serves as a primary criterion for rigorous philosophical inquiry.',
        ja: '論理的一貫性は厳密な哲学的探究における主要な<b>基準</b>として機能する。',
        used_form: 'criterion'
      }
    },
    'discourse': {
      phonetic: 'ˈdɪskɔːs',
      pos: 'N[C/U]',
      meaning: '言説、論説、言説空間、談話',
      core: '言葉や思考があちこちへ（dis-）駆け巡り（currere）展開するイメージ。',
      etymology: 'ラテン語 discursus（走り回ること、論談；currere「走る」）。印欧祖語 *kers-（走る）に由来。',
      etymologyTags: ['*kers-'],
      example: {
        foreign: 'Public discourse was heavily shaped by mass media during the mid-twentieth century.',
        ja: '20世紀半ばの公共<b>言説</b>はマスメディアによって大きく形作られていた。',
        used_form: 'discourse'
      }
    }
  };

  /**
   * 基礎最頻出コア語彙（中学・高校・NGSL基礎語彙のフォールバック救済辞書）
   */
  const BASIC_CORE_DEFINITIONS = {
    'have': { pos: 'V[T]', meaning: '持っている、所有する；（経験・時間を）過ごす；（食事を）食べる；〜させる', core: '手で掴み取って自分の領域内に保持するイメージ。', etymology: '古英語 habban、印欧祖語 *kap-（掴む、捕らえる）に遡る。' },
    'hard': { pos: 'Adj', meaning: '硬い、頑丈な；難しい、困難な；厳しい、辛い；熱心な', core: '外力にびくともせず強固に抵抗するイメージ。', etymology: '古英語 heard、印欧祖語 *kret-（強い、硬い）に遡る。' },
    'be': { pos: 'V[I]', meaning: '〜である、存在する、いる、ある', core: '主語と述語を結びつける存在そのもののイメージ。', etymology: '印欧祖語 *bhu-（成長する、存在する）および *es-（存在する）に遡る。' },
    'do': { pos: 'V[T/I]', meaning: 'する、行う、果たす、処理する；役立つ', core: '意志を持って動作を現実化・達成させるイメージ。', etymology: '印欧祖語 *dhe-（置く、設ける、行う）に遡る。' },
    'say': { pos: 'V[T/I]', meaning: '言う、述べる、話す、口にする', core: '心の中の考えを言葉として外へ指し示すイメージ。', etymology: '印欧祖語 *sekw-（話す、指し示す）に遡る。' },
    'go': { pos: 'V[I]', meaning: '行く、進む、立ち去る、機能する；〜になる', core: '現在いる場所から離れて前方へ移動していくイメージ。', etymology: '印欧祖語 *ghe-（離れる、前進する）に遡る。' },
    'get': { pos: 'V[T/I]', meaning: '得る、手に入れる；受け取る；（状態に）なる；〜させる', core: '自分の手元へ引き寄せて新しい状態に至るイメージ。', etymology: '印欧祖語 *ghend-（掴む、獲得する）に遡る。' },
    'make': { pos: 'V[T]', meaning: '作る、作成する；〜にする；引き起こす；〜させる', core: '素材を加工して新しい形や状態を生み出すイメージ。', etymology: 'ゲルマン祖語 *makon（組み合わせる、適合させる）に遡る。' },
    'know': { pos: 'V[T/I]', meaning: '知っている、分かっている、認識している、識別する', core: '頭の中で事象の本質を把握して識別しているイメージ。', etymology: '印欧祖語 *gno-（知る、認識する）に遡る。' },
    'think': { pos: 'V[T/I]', meaning: '考える、思う、推測する、回想する', core: '心の中で概念や可能性を照らし合わせて考察するイメージ。', etymology: '印欧祖語 *tong-（感じる、考える）に遡る。' },
    'take': { pos: 'V[T]', meaning: '取る、手に取る；連れて行く、持って行く；引き受ける；必要とする', core: '自分の意志で主体的に手で取り込むイメージ。', etymology: '古ノルド語 taka（掴む、受領する）に遡る。' },
    'see': { pos: 'V[T/I]', meaning: '見る、見える；会う；理解する、確かめる', core: '光を通して事物が視界に自然と入ってくるイメージ。', etymology: '印欧祖語 *sekw-（追う、目線で追う）に遡る。' },
    'come': { pos: 'V[I]', meaning: '来る、やって来る、到達する；生じる', core: '話し手や注目している場所へと近づいてくるイメージ。', etymology: '印欧祖語 *gwem-（行く、やって来る）に遡る。' },
    'want': { pos: 'V[T]', meaning: '欲しい、望む、〜したい；不足している', core: '満たされていない欠如を埋めようと希求するイメージ。', etymology: '古ノルド語 vanta（欠けている、不足する）に遡る。' },
    'look': { pos: 'V[I]', meaning: '見る、眺める；〜に見える；調べる、探す', core: '特定の対象に意識的に目線を向けるイメージ。', etymology: '古英語 locian（視線を注ぐ）に遡る。' },
    'use': { pos: 'V[T]', meaning: '使う、利用する、消費する；（名詞）使用、用途', core: '目的のために道具や手段を実際に稼働させるイメージ。', etymology: 'ラテン語 uti（使う、経験する）に遡る。' },
    'find': { pos: 'V[T]', meaning: '見つける、発見する、気づく、理解する', core: '探し求めていた対象に出会い手に入れるイメージ。', etymology: '印欧祖語 *pent-（道を行く、見出す）に遡る。' },
    'give': { pos: 'V[T/I]', meaning: '与える、あげる、贈る、渡す、授与する', core: '自分の手元から相手へと対象を手渡すイメージ。', etymology: 'ゲルマン祖語 *gebaną（授与する）に遡る。' },
    'tell': { pos: 'V[T/I]', meaning: '話す、教える、伝える、指示する、識別する', core: '順序立てて事象を相手に語り聞かせるイメージ。', etymology: '古英語 tellan（数える、語る）に遡る。' },
    'work': { pos: 'V[I/T]', meaning: '働く、機能する、作用する；（名詞）仕事、作品、労働', core: 'エネルギーを注いで目的に向かって活動するイメージ。', etymology: '印欧祖語 *werg-（行う、働く）に遡る。' },
    'call': { pos: 'V[T/I]', meaning: '呼ぶ、電話する、名付ける、召集する', core: '大きな声や信号で注意を引きつけるイメージ。', etymology: '古ノルド語 kalla（大声で叫ぶ）に遡る。' },
    'try': { pos: 'V[T/I]', meaning: '試す、試みる、努力する、裁判にかける', core: '良否を判別するために実験・挑戦するイメージ。', etymology: '古フランス語 trier（選別する、識別する）に遡る。' },
    'ask': { pos: 'V[T/I]', meaning: '尋ねる、質問する、頼む、求める', core: '相手に向かって答えや行為を求めるイメージ。', etymology: '古英語 ascian（求める、尋ねる）に遡る。' },
    'need': { pos: 'V[T]', meaning: '必要とする、〜する必要がある；（名詞）必要性、困窮', core: '欠乏によって行動や補充が不可欠なイメージ。', etymology: '古英語 nied（必要、困窮）に遡る。' },
    'feel': { pos: 'V[T/I]', meaning: '感じる、触れる、察する、〜な気分である', core: '皮膚や心で対象に触れて刺激を受け取るイメージ。', etymology: '印欧祖語 *pal-（触れる、探る）に遡る。' },
    'become': { pos: 'V[I]', meaning: '〜になる、適する、似合う', core: 'ある状態から別の新しい状態へと移り変わるイメージ。', etymology: '古英語 becuman（やって来る、〜になる）に遡る。' },
    'leave': { pos: 'V[T/I]', meaning: '去る、出発する、残す、遺産を残す；任せる', core: '場所を後にして対象をそのままその場に留めるイメージ。', etymology: '印欧祖語 *leip-（残る、付着する）に遡る。' },
    'put': { pos: 'V[T]', meaning: '置く、入れる、設置する、表現する', core: 'ある場所を定めて対象をそこへ据えるイメージ。', etymology: '古英語 putian（押す、据える）に遡る。' },
    'mean': { pos: 'V[T]', meaning: '意味する、意図する；（形容詞）卑劣な；平均の', core: '心の中に意図や意義をしっかりと抱くイメージ。', etymology: '印欧祖語 *men-（心、考える）に遡る。' },
    'keep': { pos: 'V[T/I]', meaning: '保つ、保持する、続ける、守る、飼育する', core: '状態や物が散逸しないよう枠の中に留めておくイメージ。', etymology: '古英語 cepan（見張る、保つ）に遡る。' },
    'let': { pos: 'V[T]', meaning: '〜させる、許可する、貸し出す', core: '束縛を緩めて障害を取り除き通してやるイメージ。', etymology: '印欧祖語 *led-（緩める、放す）に遡る。' },
    'begin': { pos: 'V[T/I]', meaning: '始まる、始める、着手する', core: '新しい行動やプロセスの最初の第一歩を踏み出すイメージ。', etymology: '古英語 beginnan（開始する）に遡る。' },
    'seem': { pos: 'V[I]', meaning: '〜のように見える、思われる', core: '外見や状況からそのように推測されるイメージ。', etymology: '古ノルド語 soema（適合する、見える）に遡る。' },
    'help': { pos: 'V[T/I]', meaning: '助ける、手伝う、役立つ；（名詞）救助、援助', core: '他者の負担を軽減するために力を添えるイメージ。', etymology: 'ゲルマン祖語 *helpaną（援助する）に遡る。' },
    'show': { pos: 'V[T/I]', meaning: '見せる、示す、案内する、展示する；（名詞）展示', core: '相手の視界に入るように対象を提示するイメージ。', etymology: '古英語 sceawian（見張る、見る、見せる）に遡る。' },
    'hear': { pos: 'V[T/I]', meaning: '聞く、聞こえる、聞き及ぶ', core: '耳を通して外部の音が自然と認識されるイメージ。', etymology: '印欧祖語 *kous-（聞く、注意する）に遡る。' },
    'run': { pos: 'V[I/T]', meaning: '走る、経営する、運行する、流れる', core: '勢いよく前へ迅速に進み続けるイメージ。', etymology: '印欧祖語 *ren-（走る、流れる）に遡る。' },
    'move': { pos: 'V[T/I]', meaning: '動く、移動する、引っ越す、感動させる', core: 'ある位置や感情から別の場所へ変位するイメージ。', etymology: 'ラテン語 movere（動かす）に遡る。' },
    'live': { pos: 'V[I]', meaning: '生きる、暮らす、住む；（形容詞）生きている、生の', core: '生命を維持してその土地で呼吸し続けるイメージ。', etymology: '印欧祖語 *leip-（残る、固執する）に遡る。' },
    'hold': { pos: 'V[T/I]', meaning: '持つ、握る、保持する、開催する、収容する', core: '逃げないように手や容器でしっかりと支えるイメージ。', etymology: '印欧祖語 *kel-（見張る、保つ）に遡る。' },
    'bring': { pos: 'V[T]', meaning: '持ってくる、連れてくる、もたらす', core: '対象を伴ってこちら側へと運ぶイメージ。', etymology: 'ゲルマン祖語 *brenganą（運ぶ）に遡る。' },
    'write': { pos: 'V[T/I]', meaning: '書く、著述する、作曲する', core: '表面に文字や印を刻みつけて記録するイメージ。', etymology: '古英語 writan（刻む、書く）に遡る。' },
    'stand': { pos: 'V[I/T]', meaning: '立つ、立ち上がる、我慢する、耐える', core: '地面に足を据えて直立し、揺るがないイメージ。', etymology: '印欧祖語 *sta-（立つ、不動の）に遡る。' },
    'good': { pos: 'Adj', meaning: '良い、優れた、立派な、親切な、適切な', core: '望ましい基準や道徳に調和して満たされているイメージ。', etymology: '印欧祖語 *ghedh-（結合する、適合する）に遡る。' },
    'new': { pos: 'Adj', meaning: '新しい、最新の、新米の、見慣れない', core: '今までに存在しなかったものが現れるイメージ。', etymology: '印欧祖語 *newos（新しい）に遡る。' },
    'great': { pos: 'Adj', meaning: '偉大な、巨大な、素晴らしい、顕著な', core: '規模や価値が通常の水準を遥かに超えているイメージ。', etymology: '古英語 great（大きい、厚い）に遡る。' },
    'old': { pos: 'Adj', meaning: '古い、年をとった、昔の、馴染みの', core: '長い時間の経過を経て滋味や年輪を帯びたイメージ。', etymology: '印欧祖語 *al-（育つ、年輪を重ねる）に遡る。' },
    'right': { pos: 'Adj', meaning: '正しい、適切な；右の；（名詞）権利、正義', core: 'まっすぐ曲がらずに規律や真実に従っているイメージ。', etymology: '印欧祖語 *reg-（まっすぐに導く、統治する）に遡る。' },
    'big': { pos: 'Adj', meaning: '大きい、巨大な、重大な、寛大な', core: '体積やスケールが力強く拡大しているイメージ。', etymology: '中英語 bigge（力強い、大きい）に遡る。' },
    'high': { pos: 'Adj', meaning: '高い、高度な、高級な、高位の', core: '地面から垂直に高くそびえ立っているイメージ。', etymology: '印欧祖語 *kouk-（高い、丘）に遡る。' },
    'different': { pos: 'Adj', meaning: '異なる、違った、別々の、様々な', core: '互いに別々の方向へ離れて区別されるイメージ。', etymology: 'ラテン語 differre（別れる；dis-＋ferre）に遡る。' },
    'small': { pos: 'Adj', meaning: '小さい、わずかな、重要でない', core: '細くて狭く、規模が控えめなイメージ。', etymology: '印欧祖語 *smelo-（小さい家畜、細い）に遡る。' },
    'large': { pos: 'Adj', meaning: '大きい、広い、大規模な、多量の', core: '枠が広大で寛容に多くのものを受け入れるイメージ。', etymology: 'ラテン語 largus（豊富な、寛大な）に遡る。' },
    'easy': { pos: 'Adj', meaning: '簡単な、容易な、気楽な、穏やかな', core: '抵抗や摩擦がなく滑らかに進むイメージ。', etymology: '古フランス語 aisie（ゆったりとした）に遡る。' },
    'clear': { pos: 'Adj', meaning: '明快な、明確な、澄んだ；（動詞）片付ける、晴れる', core: '濁りや障害物が一切なく、向こう側まで見通せるイメージ。', etymology: 'ラテン語 clarus（明るい、明瞭な）に遡る。' },
    'strong': { pos: 'Adj', meaning: '強い、強固な、頑丈な、説得力のある', core: '外力に耐える引き締まった強靭な肉体・構造のイメージ。', etymology: '印欧祖語 *strenk-（引き締まった、堅い）に遡る。' }
  };

  const IRREGULAR_FORMS_MAP = {
    'be': '活用: am, is, are / was, were / been / being',
    'have': '活用: has / had / having',
    'do': '活用: does / did / done / doing',
    'say': '活用: says / said / saying',
    'go': '活用: goes / went / gone / going',
    'get': '活用: gets / got / gotten / getting',
    'make': '活用: makes / made / making',
    'know': '活用: knows / knew / known / knowing',
    'think': '活用: thinks / thought / thinking',
    'take': '活用: takes / took / taken / taking',
    'see': '活用: sees / saw / seen / seeing',
    'come': '活用: comes / came / come / coming',
    'give': '活用: gives / gave / given / giving',
    'find': '活用: finds / found / finding',
    'tell': '活用: tells / told / telling',
    'feel': '活用: feels / felt / feeling',
    'become': '活用: becomes / became / become / becoming',
    'leave': '活用: leaves / left / leaving',
    'put': '活用: puts / put / putting',
    'mean': '活用: means / meant / meaning',
    'keep': '活用: keeps / kept / keeping',
    'let': '活用: lets / let / letting',
    'begin': '活用: begins / began / begun / beginning',
    'show': '活用: shows / showed / shown / showing',
    'hear': '活用: hears / heard / hearing',
    'run': '活用: runs / ran / run / running',
    'hold': '活用: holds / held / holding',
    'bring': '活用: brings / brought / bringing',
    'write': '活用: writes / wrote / written / writing',
    'stand': '活用: stands / stood / standing',
    'bear': '複数形: bears / 活用: bore / borne / bearing',
    'god': '複数形: gods / 女性形: goddess',
    'good': '比較変化: better / best',
    'hard': '比較変化: harder / hardest',
    'new': '比較変化: newer / newest',
    'great': '比較変化: greater / greatest',
    'old': '比較変化: older, elder / oldest, eldest',
    'big': '比較変化: bigger / biggest',
    'high': '比較変化: higher / highest',
    'small': '比較変化: smaller / smallest',
    'large': '比較変化: larger / largest',
    'easy': '比較変化: easier / easiest',
    'clear': '比較変化: clearer / clearest',
    'strong': '比較変化: stronger / strongest'
  };

  const inferGrammarForms = (cand, pos) => {
    if (!cand) return '';
    const cLow = String(cand).toLowerCase();
    if (IRREGULAR_FORMS_MAP[cLow]) return IRREGULAR_FORMS_MAP[cLow];
    const p = String(pos || '');
    if (p.startsWith('V')) {
      const sForm = /(?:s|sh|ch|x|z|o)$/.test(cLow) ? `${cLow}es` : (/[^aeiou]y$/.test(cLow) ? `${cLow.slice(0, -1)}ies` : `${cLow}s`);
      const edForm = cLow.endsWith('e') ? `${cLow}d` : (/[^aeiou]y$/.test(cLow) ? `${cLow.slice(0, -1)}ied` : `${cLow}ed`);
      const ingForm = (cLow.endsWith('e') && !cLow.endsWith('ee')) ? `${cLow.slice(0, -1)}ing` : `${cLow}ing`;
      return `活用: ${sForm} / ${edForm} / ${ingForm}`;
    }
    if (p.startsWith('N[C') || p === 'Noun' || p === 'N') {
      const pl = /(?:s|sh|ch|x|z)$/.test(cLow) ? `${cLow}es` : (/[^aeiou]y$/.test(cLow) ? `${cLow.slice(0, -1)}ies` : `${cLow}s`);
      return `複数形: ${pl}`;
    }
    if (p === 'Adj' && cLow.length > 6) {
      return `比較変化: more ${cLow} / most ${cLow}`;
    }
    return '';
  };

  const inferCategoryByPos = pos => {
    const p = String(pos || '');
    if (p.startsWith('V')) return 25; // 動作・行為
    if (p === 'Adj' || p === 'Adv') return 26; // 状態・性質
    if (p === 'Prep' || p === 'Conj') return 27; // 時間・空間・頻度
    return 28; // 抽象概念・論理
  };

  /**
   * 単語を包括的学術辞書マスターから照合
   */
  function lookupEssentialLexicon(word) {
    if (!word) return null;
    const rawW = String(word).trim();
    const w = rawW.toLowerCase();

    const cloneSafe = obj => {
      if (!obj) return null;
      try { return JSON.parse(JSON.stringify(obj)); } catch { return obj; }
    };

    const splitLexiconMeanings = (basePos, rawMeaning) => {
      const text = String(rawMeaning || '').trim();
      if (!text) return [{ pos: basePos || 'N[C]', text: rawW }];
      const parts = text.split(/[；;]\s*/).map(s => s.trim()).filter(Boolean);
      if (parts.length <= 1) return [{ pos: basePos || 'N[C]', text }];
      return parts.map(part => {
        let p = basePos || 'N[C]';
        let clean = part;
        const m = clean.match(/^[（(](名詞|動詞|他動詞|自動詞|形容詞|副詞|前置詞|接続詞|助動詞)[）)]\s*(.+)$/);
        if (m) {
          const mapPos = { '名詞': 'N[C]', '動詞': 'V[T]', '他動詞': 'V[T]', '自動詞': 'V[I]', '形容詞': 'Adj', '副詞': 'Adv', '前置詞': 'Prep', '接続詞': 'Conj', '助動詞': 'V[T]' };
          p = mapPos[m[1]] || p;
          clean = m[2].trim();
        }
        return { pos: p, text: clean };
      });
    };

    // 屈折語尾の語幹候補
    const cands = [w];
    if (w.endsWith('ies') && w.length > 4) cands.push(w.slice(0, -3) + 'y');
    if (w.endsWith('ied') && w.length > 4) cands.push(w.slice(0, -3) + 'y');
    if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) cands.push(w.slice(0, -1));
    if (w.endsWith('es') && w.length > 3) cands.push(w.slice(0, -2));
    if (w.endsWith('ed') && w.length > 3) { cands.push(w.slice(0, -1)); cands.push(w.slice(0, -2)); }
    if (w.endsWith('ing') && w.length > 4) { cands.push(w.slice(0, -3)); cands.push(w.slice(0, -3) + 'e'); }

    for (const cand of cands) {
      // 1. BUILTIN_ETYMOLOGY_KNOWLEDGE.historical を最優先
      if (BUILTIN_ETYMOLOGY_KNOWLEDGE.historical[cand]) {
        const h = BUILTIN_ETYMOLOGY_KNOWLEDGE.historical[cand];
        const firstPos = h.meanings?.[0]?.pos || 'N[C]';
        return cloneSafe({
          word: rawW,
          pos: firstPos,
          phonetic: h.phonetic || '',
          grammar_forms: h.grammar_forms || inferGrammarForms(cand, firstPos),
          category: (typeof h.category === 'number' && h.category !== 29) ? h.category : inferCategoryByPos(firstPos),
          etymology: h.etymology || '',
          etymologyTags: h.etymologyTags || [],
          core: h.core || '',
          history_note: h.history_note || '',
          meanings: h.meanings || [],
          example: h.example || { foreign: '', ja: '', used_form: rawW },
          phrases: h.phrases || [],
          derivatives: h.derivatives || [],
          etymologyConfidence: 'certain'
        });
      }

      // 2. ESSENTIAL_ENGLISH_LEXICON を照合
      if (ESSENTIAL_ENGLISH_LEXICON[cand]) {
        const e = ESSENTIAL_ENGLISH_LEXICON[cand];
        const meanings = e.meanings || splitLexiconMeanings(e.pos || 'N[C]', e.meaning || '');
        const firstPos = e.pos || meanings[0]?.pos || 'N[C]';
        return cloneSafe({
          word: rawW,
          pos: firstPos,
          phonetic: e.phonetic || '',
          grammar_forms: e.grammar_forms || inferGrammarForms(cand, e.pos),
          category: (typeof e.category === 'number' && e.category !== 29) ? e.category : inferCategoryByPos(e.pos),
          etymology: e.etymology || '',
          etymologyTags: e.etymologyTags || [],
          core: e.core || '',
          history_note: e.history_note || '',
          meanings,
          example: e.example || { foreign: '', ja: '', used_form: rawW },
          phrases: e.phrases || [],
          derivatives: e.derivatives || [],
          etymologyConfidence: 'certain'
        });
      }

      // 3. VocabStarterPack から照合 (1,000語以上の完全な学術・ビジネス・日常英和マスター)
      const starterFn = global.lookupStarterWord || global.VocabStarterPack?.lookupStarterWord;
      if (starterFn) {
        const s = starterFn(cand);
        if (s && s.word && Array.isArray(s.meanings) && s.meanings.length > 0) {
          const firstPos = s.meanings[0]?.pos || 'N[C]';
          return cloneSafe({
            word: rawW,
            pos: firstPos,
            phonetic: s.phonetic || '',
            grammar_forms: s.grammar_forms || inferGrammarForms(cand, firstPos),
            category: (typeof s.category === 'number' && s.category !== 29) ? s.category : ((typeof s.category === 'string' && s.category && s.category !== 'その他') ? s.category : inferCategoryByPos(firstPos)),
            etymology: s.etymology || '',
            etymologyTags: s.etymologyTags || [],
            core: s.core || '',
            history_note: s.history_note || '',
            meanings: s.meanings,
            example: s.example || { foreign: '', ja: '', used_form: rawW },
            phrases: s.phrases || [],
            derivatives: s.derivatives || [],
            etymologyConfidence: s.etymologyConfidence || 'certain'
          });
        }
      }

      // 4. VocabEikenCatalog から照合 (英検準1級＋派生語)
      if (global.VocabEikenCatalog?.getWord) {
        const ek = global.VocabEikenCatalog.getWord(cand);
        if (ek && ek.word && Array.isArray(ek.meanings) && ek.meanings.length > 0) {
          const firstPos = ek.meanings[0]?.pos || 'N[C]';
          return cloneSafe({
            word: rawW,
            pos: firstPos,
            phonetic: ek.phonetic || '',
            grammar_forms: ek.grammar_forms || inferGrammarForms(cand, firstPos),
            category: (typeof ek.category === 'number' && ek.category !== 29) ? ek.category : ((typeof ek.category === 'string' && ek.category && ek.category !== 'その他') ? ek.category : inferCategoryByPos(firstPos)),
            etymology: ek.etymology || '',
            etymologyTags: ek.etymologyTags || [],
            core: ek.core || '',
            history_note: ek.history_note || '',
            meanings: ek.meanings,
            example: ek.example || { foreign: '', ja: '', used_form: rawW },
            phrases: ek.phrases || [],
            derivatives: ek.derivatives || [],
            etymologyConfidence: ek.etymologyConfidence || 'certain'
          });
        }
      }

      // 5. BASIC_CORE_DEFINITIONS から照合 (日常英会話・基礎最頻出コア語彙: have, hard, be, do, etc.)
      if (BASIC_CORE_DEFINITIONS[cand]) {
        const b = BASIC_CORE_DEFINITIONS[cand];
        const meanings = b.meanings || splitLexiconMeanings(b.pos || 'N[C]', b.meaning || '');
        return cloneSafe({
          word: rawW,
          phonetic: b.phonetic || '',
          grammar_forms: b.grammar_forms || inferGrammarForms(cand, b.pos),
          category: (typeof b.category === 'number' && b.category !== 29) ? b.category : inferCategoryByPos(b.pos),
          etymology: b.etymology || '',
          etymologyTags: b.etymologyTags || [],
          core: b.core || '',
          history_note: b.history_note || '',
          meanings,
          example: b.example || { foreign: '', ja: '', used_form: rawW },
          phrases: b.phrases || [],
          derivatives: b.derivatives || [],
          etymologyConfidence: 'certain'
        });
      }
    }

    return null;
  }

  /**
   * 単語の語尾・品詞・形態素を高精度推定
   */
  function guessMorphologicalPos(word) {
    const w = String(word || '').trim().toLowerCase();
    if (!w) return 'N[C]';
    if (w.includes(' ')) return 'Idiom';

    // 1. 前置詞 (Prepositions)
    const PREPOSITIONS = new Set([
      'upon', 'on', 'in', 'at', 'by', 'with', 'for', 'from', 'about', 'into',
      'through', 'after', 'over', 'between', 'out', 'against', 'during', 'without',
      'before', 'under', 'around', 'among', 'onto', 'across', 'behind', 'beyond',
      'within', 'beneath', 'above', 'below', 'towards', 'toward', 'throughout',
      'beside', 'besides', 'despite', 'versus', 'per', 'via', 'amid', 'amidst'
    ]);
    if (PREPOSITIONS.has(w)) return 'Prep';

    // 2. 接続詞 (Conjunctions)
    const CONJUNCTIONS = new Set([
      'and', 'but', 'or', 'nor', 'for', 'yet', 'so', 'although', 'though', 'while',
      'whereas', 'unless', 'since', 'until', 'till', 'if', 'whether', 'because',
      'lest', 'provided', 'providing'
    ]);
    if (CONJUNCTIONS.has(w)) return 'Conj';

    // 3. 代名詞 (Pronouns)
    const PRONOUNS = new Set([
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
      'my', 'your', 'his', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs',
      'this', 'that', 'these', 'those', 'who', 'whom', 'whose', 'which', 'what',
      'anyone', 'someone', 'everyone', 'no one', 'nobody', 'somebody', 'anybody', 'everybody',
      'anything', 'something', 'everything', 'nothing'
    ]);
    if (PRONOUNS.has(w)) return 'Pron';

    // 4. 基本動詞 (Common Verbs)
    const COMMON_VERBS = new Set([
      'be', 'have', 'do', 'say', 'go', 'get', 'make', 'know', 'think', 'take',
      'see', 'come', 'want', 'look', 'use', 'find', 'give', 'tell', 'work', 'call',
      'try', 'ask', 'need', 'feel', 'become', 'leave', 'put', 'mean', 'keep', 'let',
      'begin', 'seem', 'help', 'talk', 'turn', 'start', 'show', 'hear', 'play', 'run',
      'move', 'like', 'live', 'believe', 'hold', 'bring', 'happen', 'write', 'provide',
      'sit', 'stand', 'lose', 'pay', 'meet', 'include', 'continue', 'set', 'learn', 'change',
      'lead', 'understand', 'watch', 'follow', 'stop', 'create', 'speak', 'read', 'allow', 'add'
    ]);
    if (COMMON_VERBS.has(w)) return 'V[T]';

    // 5. 特殊基本形容詞
    const COMMON_ADJECTIVES = new Set([
      'subtle', 'special', 'general', 'important', 'different', 'particular', 'available', 'possible',
      'significant', 'crucial', 'essential', 'fundamental', 'specific', 'fragile', 'agile', 'hostile',
      'facile', 'futile', 'docile', 'tactile', 'volatile', 'versatile', 'vulnerable', 'appropriate',
      'consistent', 'distinct', 'diverse', 'evident', 'explicit', 'implicit', 'inevitable', 'inherent',
      'initial', 'intense', 'legitimate', 'mutual', 'neutral', 'passive', 'precise', 'primary',
      'prominent', 'radical', 'rational', 'relative', 'relevant', 'rigorous', 'spontaneous', 'subsequent',
      'sufficient', 'valid', 'viable'
    ]);
    if (COMMON_ADJECTIVES.has(w)) return 'Adj';

    // 6. 接尾辞による判定
    if (/ly$/.test(w) && !/^(friendly|lovely|lonely|costly|lively|elderly|silly|ugly|deadly|holy)$/.test(w)) return 'Adv';
    if (/(?:al|ic|ive|ous|ful|less|ent|ant|ish|ary|ory|able|ible|ed|ing|ian|ile|ular|ern|bund|cund)$/.test(w) && !/^(animal|hospital|capital|metal|journal|signal|festival|individual|arrival|proposal|approval|trial|denial|moment)$/.test(w)) return 'Adj';
    if (/(?:tion|sion|ment|ness|ity|ence|ance|dom|ism|sis)$/.test(w)) return 'N[U]';
    if (/(?:ship|hood|ist|er|or|ee|logy|graphy|meter|scope|on|um|us)$/.test(w)) return 'N[C]';
    if (/(?:ize|ise|ate|ify|en)$/.test(w)) return 'V[T]';

    return 'N[C]';
  }

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
    const langNames = {
      en: 'English', fr: 'French', de: 'German', es: 'Spanish',
      it: 'Italian', pt: 'Portuguese', nl: 'Dutch', zh: 'Chinese',
      ko: 'Korean', ja: 'Japanese'
    };
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
    const etyM = /^===+\s*(?:Etymology|Étymologie|Herkunft|Etimología|Etimologia|Herkomst|어원|字源)[^=]*===+\s*$/im.exec(section);
    const snippet = etyM ? `${section.slice(0, Math.min(400, etyM.index))}\n${section.slice(etyM.index, etyM.index + 1200)}`.trim() : section.slice(0, 1400).trim();
    return snippet ? { extract: snippet.slice(0, 1500), fullSection: section.slice(0, 6000), ipa } : null;
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
      const r = await fetchWithTimeout(url, {}, 2500);
      if (!r.ok) return null;
      const pages = (await r.json())?.query?.pages;
      const page = pages ? Object.values(pages)[0] : null;
      if (!page || page.missing !== undefined || !page.extract) return null;
      const parsed = extractWiktLangSection(page.extract, targetLang, host);
      return parsed ? { extract: parsed.extract, fullSection: parsed.fullSection || parsed.extract, ipa: parsed.ipa, url: `https://${host}.wiktionary.org/wiki/${toWikiSlug(page.title || title)}` } : null;
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
    const allParts = cand.content?.parts || [];
    const nonThoughtParts = allParts.filter(p => !p?.thought);
    const rawText = (nonThoughtParts.length ? nonThoughtParts : allParts).map(p => p?.text || '').join('').trim();
    if (!rawText) throw new Error(`AI応答が空でした (finishReason: ${reason || 'UNKNOWN'})`);
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    const repairJson = str => str
      .replace(/,\s*([\]\}])/g, '$1') // 末尾カンマ修復
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); // 制御文字除去

    const repairTruncatedArray = str => {
      const trimmed = str.trim();
      const openIdx = trimmed.indexOf('[');
      if (openIdx === -1) return null;
      const lastBrace = trimmed.lastIndexOf('}');
      if (lastBrace > openIdx) {
        return trimmed.slice(openIdx, lastBrace + 1) + ']';
      }
      return null;
    };

    const repairTruncatedObject = str => {
      const trimmed = str.trim();
      const openIdx = trimmed.indexOf('{');
      if (openIdx === -1) return null;
      let s = trimmed.slice(openIdx);
      if (s.endsWith('}')) return null;

      s = s.replace(/,\s*(?:"[^"]*)?$/, '');
      s = s.replace(/:\s*$/, '');

      const quoteCount = (s.match(/(?<!\\)"/g) || []).length;
      if (quoteCount % 2 !== 0) {
        s += '"';
      }

      const stack = [];
      let inString = false;
      let isEscaped = false;
      for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (isEscaped) {
          isEscaped = false;
          continue;
        }
        if (c === '\\') {
          isEscaped = true;
          continue;
        }
        if (c === '"') {
          inString = !inString;
          continue;
        }
        if (!inString) {
          if (c === '{') {
            stack.push('}');
          } else if (c === '[') {
            stack.push(']');
          } else if (c === '}') {
            if (stack.length && stack[stack.length - 1] === '}') stack.pop();
          } else if (c === ']') {
            if (stack.length && stack[stack.length - 1] === ']') stack.pop();
          }
        }
      }

      while (stack.length > 0) {
        s += stack.pop();
      }
      return s;
    };

    try { return JSON.parse(cleaned); } catch {
      try { return JSON.parse(repairJson(cleaned)); } catch {}
      const repArr = repairTruncatedArray(cleaned);
      if (repArr) {
        try { return JSON.parse(repArr); } catch {}
        try { return JSON.parse(repairJson(repArr)); } catch {}
      }
      const repObj = repairTruncatedObject(cleaned);
      if (repObj) {
        try { return JSON.parse(repObj); } catch {}
        try { return JSON.parse(repairJson(repObj)); } catch {}
      }
      const arrM = cleaned.match(/\[[\s\S]*\]/);
      if (arrM) {
        try { return JSON.parse(arrM[0]); } catch {}
        try { return JSON.parse(repairJson(arrM[0])); } catch {}
      }
      const objM = cleaned.match(/\{[\s\S]*\}/);
      if (objM) {
        try { return JSON.parse(objM[0]); } catch {}
        try { return JSON.parse(repairJson(objM[0])); } catch {}
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

  const WIKT_ETY_SECTION_RE = /^(?:etymology|étymologie|herkunft|etimología|etimologia|herkomst|어원|字源|語源|词源)\b/i;
  const WIKT_SKIP_SECTION_RE = /^(?:etymology|étymologie|herkunft|etimología|etimologia|herkomst|어원|字源|語源|词源|pronunciation|prononciation|aussprache|pronunciación|pronuncia|uitspraak|発音|발음|发音|alternative forms|variantes|derived terms|dérivés|related terms|apparentés|translations|traductions|übersetzungen|anagrams|anagrammes|further reading|references|références|quellen|usage notes|synonyms|synonymes|antonyms|antonymes|flexions|voir aussi|参照|類義語|対義語|関連語|翻訳)/i;
  const WIKT_ETY_PROSE_RE = /^(?:from |inherited from |borrowed from |derived from |learned borrowing |orthographic borrowing |calque of |cognate with |compare |see also |ipa\(|rhymes:|du latin|de l'ancien|dérivé de|emprunté au|mot composé de|aus dem |vom |von |del latín|dal latino|do latim|van het )/i;

  /**
   * Wiktionary + 辞書API + 翻訳エンジン統合による高精度マルチセンス合成ヘルパー
   */
  async function synthesizeRichLexicalEntry(rawW, normW, sLang, tLang, wRef, rootKey, rootInfo) {
    const canFetch = typeof window !== 'undefined' && typeof process === 'undefined' && typeof fetch === 'function' && (typeof navigator === 'undefined' || navigator.onLine !== false);
    const wText = String(wRef?.fullSection || wRef?.extract || '');
    const extractedSenses = [];
    let extractedGrammarForms = '';
    let extractedEtyLine = '';
    let extractedExample = '';
    const extractedTags = rootKey ? [rootKey] : [];

    // 1. Wiktionary本文から活用行・語源行・複数品詞定義を抽出
    if (wText) {
      const rootMatches = [...wText.matchAll(/\*([a-zA-Z0-9_äöüßÄÖÜāēīōūăĕĭŏŭáéíóúàèìòùâêîôûəǭḗ₁₂₃₄ḱǵʷʰ-]+-)/g)];
      for (const rm of rootMatches) {
        const tag = `*${rm[1]}`;
        if (!extractedTags.includes(tag) && extractedTags.length < 3) extractedTags.push(tag);
      }

      const lines = wText.split('\n');
      let curSection = '';
      let curPos = guessMorphologicalPos(rawW);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('=')) {
          const sec = trimmed.replace(/=/g, '').trim().toLowerCase();
          curSection = sec;
          if (/^noun\b/i.test(sec) || /^proper noun\b/i.test(sec)) curPos = 'N[C]';
          else if (/^verb\b/i.test(sec)) curPos = 'V[T]';
          else if (/^adj(ective)?\b/i.test(sec)) curPos = 'Adj';
          else if (/^adv(erb)?\b/i.test(sec)) curPos = 'Adv';
          else if (/^prep(osition)?\b/i.test(sec)) curPos = 'Prep';
          else if (/^conj(unction)?\b/i.test(sec)) curPos = 'Conj';
          else if (/^pron(oun)?\b/i.test(sec)) curPos = 'Pron';
          else if (/^(idiom|phrase|proverb)\b/i.test(sec)) curPos = 'Idiom';
          continue;
        }
        if (WIKT_ETY_SECTION_RE.test(curSection)) {
          if (!extractedEtyLine && trimmed.length > 15 && !/^(from|see also|compare)$/i.test(trimmed)) {
            extractedEtyLine = trimmed.slice(0, 260);
          }
          continue;
        }
        if (WIKT_SKIP_SECTION_RE.test(curSection)) {
          continue;
        }
        const lower = trimmed.toLowerCase();
        if (lower.startsWith(normW + ' (') && /(plural|third-person|present participle|past tense|comparative|superlative|countable|uncountable)/i.test(lower)) {
          if (!extractedGrammarForms) {
            const inner = trimmed.slice(normW.length).replace(/^\s*\(|\)\s*$/g, '').trim();
            if (inner) extractedGrammarForms = inner.slice(0, 90);
          }
          continue;
        }
        if (WIKT_ETY_PROSE_RE.test(trimmed)) {
          if (!extractedEtyLine && /^(from |inherited from |borrowed from |derived from )/i.test(trimmed)) {
            extractedEtyLine = trimmed.slice(0, 260);
          }
          continue;
        }
        const clean = trimmed.replace(/^#+\s*/, '').replace(/^[0-9*.\s]+/, '').trim();
        if (clean.length > 4 && !clean.startsWith('(') && extractedSenses.length < 5) {
          extractedSenses.push({ pos: curPos, text: clean.slice(0, 160) });
        }
      }
    }

    if (!canFetch) return null;

    // 2. Free Dictionary API (英語語義・例文・音声IPA補完) + Google Translate Dictionary (多品詞対訳・例文翻訳)
    let gtxData = null;
    let dictApiEntry = null;
    try {
      const tasks = [
        fetchWithTimeout(
          `https://translate.google.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sLang)}&tl=${encodeURIComponent(tLang)}&dt=t&dt=bd&q=${encodeURIComponent(rawW)}`,
          {},
          4500
        ).then(r => (r && r.ok && typeof r.json === 'function') ? r.json() : null).catch(() => null)
      ];
      if (sLang === 'en' && (!extractedSenses.length || !extractedExample)) {
        tasks.push(
          fetchWithTimeout(
            `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normW)}`,
            {},
            4500
          ).then(r => (r && r.ok && typeof r.json === 'function') ? r.json() : null).catch(() => null)
        );
      }
      const [gRes, dRes] = await Promise.all(tasks);
      if (Array.isArray(gRes)) gtxData = gRes;
      if (Array.isArray(dRes) && dRes[0]?.meanings) dictApiEntry = dRes[0];
    } catch {}

    if (dictApiEntry && Array.isArray(dictApiEntry.meanings)) {
      const posMap = { noun: 'N[C]', verb: 'V[T]', adjective: 'Adj', adverb: 'Adv', preposition: 'Prep', conjunction: 'Conj', pronoun: 'Pron', interjection: 'Idiom' };
      for (const mGroup of dictApiEntry.meanings) {
        const mappedPos = posMap[String(mGroup.partOfSpeech || '').toLowerCase()] || guessMorphologicalPos(rawW);
        for (const d of (mGroup.definitions || []).slice(0, 2)) {
          if (d?.definition && extractedSenses.length < 5) {
            extractedSenses.push({ pos: mappedPos, text: String(d.definition).trim() });
          }
          if (!extractedExample && d?.example) {
            extractedExample = String(d.example).trim();
          }
        }
      }
    }

    const finalMeanings = [];
    const posMapGtx = {
      noun: 'N[C]', verb: 'V[T]', adjective: 'Adj', adverb: 'Adv',
      preposition: 'Prep', conjunction: 'Conj', pronoun: 'Pron',
      phrase: 'Idiom', idiom: 'Idiom', 'auxiliary verb': 'V[T]',
      '名詞': 'N[C]', '動詞': 'V[T]', '形容詞': 'Adj', '副詞': 'Adv', '前置詞': 'Prep', '接続詞': 'Conj', '代名詞': 'Pron'
    };

    // Google Translate 辞書データ (data[1]) から品詞別の対訳語群を抽出
    if (Array.isArray(gtxData?.[1])) {
      for (const group of gtxData[1]) {
        const rawPos = String(group?.[0] || '').toLowerCase();
        const mappedPos = posMapGtx[rawPos] || guessMorphologicalPos(rawW);
        const terms = Array.isArray(group?.[1]) ? group[1].slice(0, 5).filter(Boolean) : [];
        if (terms.length > 0 && finalMeanings.length < 4) {
          finalMeanings.push({ pos: mappedPos, text: terms.join('、') });
        }
      }
    }

    // 英語定義や語源・例文をターゲット言語へ一括翻訳してリッチな語義・語源・例文を構築
    let translatedEty = '';
    let translatedEx = '';
    if (sLang !== tLang && (extractedSenses.length > 0 || extractedEtyLine || extractedExample)) {
      const linesToTranslate = [];
      const senseIndices = [];
      extractedSenses.slice(0, 3).forEach((s) => {
        senseIndices.push({ pos: s.pos, lineIdx: linesToTranslate.length });
        linesToTranslate.push(s.text);
      });
      const etyLineIdx = extractedEtyLine ? linesToTranslate.length : -1;
      if (extractedEtyLine) linesToTranslate.push(extractedEtyLine);
      const exLineIdx = extractedExample ? linesToTranslate.length : -1;
      if (extractedExample) linesToTranslate.push(extractedExample);

      if (linesToTranslate.length > 0) {
        try {
          const joined = linesToTranslate.join('\n');
          const trRes = await fetchWithTimeout(
            `https://translate.google.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sLang)}&tl=${encodeURIComponent(tLang)}&dt=t&q=${encodeURIComponent(joined)}`,
            {},
            4500
          ).then(r => (r && r.ok && typeof r.json === 'function') ? r.json() : null).catch(() => null);
          if (Array.isArray(trRes?.[0])) {
            const fullTranslated = trRes[0].map(seg => seg?.[0] || '').join('');
            const splitTr = fullTranslated.split('\n').map(s => s.trim());
            for (const si of senseIndices) {
              const trText = splitTr[si.lineIdx];
              if (trText && finalMeanings.length < 5 && !finalMeanings.some(m => m.text === trText)) {
                finalMeanings.push({ pos: si.pos, text: trText });
              }
            }
            if (etyLineIdx !== -1 && splitTr[etyLineIdx]) translatedEty = splitTr[etyLineIdx];
            if (exLineIdx !== -1 && splitTr[exLineIdx]) translatedEx = splitTr[exLineIdx];
          }
        } catch {}
      }
    } else if (sLang === tLang && extractedSenses.length > 0) {
      extractedSenses.slice(0, 4).forEach(s => finalMeanings.push(s));
    }

    // 万一辞書グループが空でも先頭翻訳(gtxData[0])があれば採用
    if (!finalMeanings.length && Array.isArray(gtxData?.[0])) {
      const topTrans = gtxData[0].map(seg => seg?.[0] || '').join('').trim();
      if (topTrans && topTrans.toLowerCase() !== normW) {
        finalMeanings.push({ pos: guessMorphologicalPos(rawW), text: topTrans });
      }
    }

    if (!finalMeanings.length) return null;

    const firstPos = finalMeanings[0]?.pos || guessMorphologicalPos(rawW);
    const catId = firstPos.startsWith('V') ? 25 : ((firstPos === 'Adj' || firstPos === 'Adv') ? 26 : ((firstPos === 'Prep' || firstPos === 'Conj') ? 27 : 28));
    const primaryGloss = String(finalMeanings[0].text || '').split(/[、；;,/]/)[0].trim() || rawW;
    const ETY_FROM_PIE_I18N = {
      ja: (rk, rm) => `印欧祖語 ${rk}（${rm}）に由来。`,
      en: (rk, rm) => `Derived from PIE ${rk} (${rm}).`,
      fr: (rk, rm) => `Issu de l'indo-européen commun ${rk} (${rm}).`,
      de: (rk, rm) => `Abgeleitet vom Indogermanischen ${rk} (${rm}).`,
      es: (rk, rm) => `Derivado del protoindoeuropeo ${rk} (${rm}).`,
      it: (rk, rm) => `Derivato dall'indoeuropeo ${rk} (${rm}).`,
      pt: (rk, rm) => `Derivado do proto-indo-europeu ${rk} (${rm}).`,
      nl: (rk, rm) => `Afgeleid van Proto-Indo-Europees ${rk} (${rm}).`,
      zh: (rk, rm) => `源自原始印欧语 ${rk}（${rm}）。`,
      ko: (rk, rm) => `인도유럽조어 ${rk}(${rm})에서 유래.`
    };
    const CORE_WITH_ROOT_I18N = {
      ja: (rm, gl) => `「${rm}」を核として「${gl}」へと展開するイメージ`,
      en: (rm, gl) => `Core image expanding from "${rm}" into "${gl}"`,
      fr: (rm, gl) => `Image centrale évoluant de « ${rm} » vers « ${gl} »`,
      de: (rm, gl) => `Kernbild, das sich von „${rm}“ zu „${gl}“ entfaltet`,
      es: (rm, gl) => `Imagen central que se expande de «${rm}» a «${gl}»`,
      it: (rm, gl) => `Immagine centrale che si sviluppa da «${rm}» a «${gl}»`,
      pt: (rm, gl) => `Imagem central que se expande de "${rm}" para "${gl}"`,
      nl: (rm, gl) => `Kernbeeld dat zich ontvouwt van "${rm}" naar "${gl}"`,
      zh: (rm, gl) => `以“${rm}”为核心延伸出“${gl}”的核心意象`,
      ko: (rm, gl) => `'${rm}'을(를) 핵으로 '${gl}'(으)로 전개되는 코어 이미지`
    };
    const CORE_NO_ROOT_I18N = {
      ja: (gl) => `「${gl}」を中心に展開するコアイメージ`,
      en: (gl) => `Core image centered around "${gl}"`,
      fr: (gl) => `Image centrale articulée autour de « ${gl} »`,
      de: (gl) => `Kernbild rund um „${gl}“`,
      es: (gl) => `Imagen central en torno a «${gl}»`,
      it: (gl) => `Immagine centrale incentrata su «${gl}»`,
      pt: (gl) => `Imagem central em torno de "${gl}"`,
      nl: (gl) => `Kernbeeld rondom "${gl}"`,
      zh: (gl) => `围绕“${gl}”展开的核心意象`,
      ko: (gl) => `'${gl}'을(를) 중심으로 전개되는 코어 이미지`
    };
    const pieFn = ETY_FROM_PIE_I18N[tLang] || ETY_FROM_PIE_I18N.en;
    const coreRootFn = CORE_WITH_ROOT_I18N[tLang] || CORE_WITH_ROOT_I18N.en;
    const coreNoRootFn = CORE_NO_ROOT_I18N[tLang] || CORE_NO_ROOT_I18N.en;
    const finalEty = translatedEty
      ? (rootInfo ? `${translatedEty} (${pieFn(rootKey, rootInfo.meaning)})` : translatedEty)
      : (rootInfo ? pieFn(rootKey, rootInfo.meaning) : (extractedEtyLine || ''));
    const finalCore = rootInfo
      ? coreRootFn(rootInfo.meaning, primaryGloss)
      : coreNoRootFn(primaryGloss);

    let exampleObj = null;
    if (extractedExample && (translatedEx || sLang === tLang)) {
      const tr = sLang === tLang ? extractedExample : translatedEx;
      exampleObj = {
        foreign: extractedExample,
        ja: tr,
        trans: tr,
        [tLang]: tr,
        used_form: rawW
      };
    }

    return {
      category: catId,
      grammar_forms: extractedGrammarForms || inferGrammarForms(rawW, firstPos),
      etymology: finalEty,
      etymologyTags: extractedTags,
      etymologyConfidence: (extractedTags.length > 0 || extractedEtyLine) ? 'certain' : 'probable',
      core: finalCore,
      meanings: finalMeanings,
      example: exampleObj
    };
  }

  /**
   * 内蔵語源ナレッジベース ＆ ルール合成エンジン (完全オフライン対応 + オンライン辞書統合)
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

    const items = await Promise.all(payloadItems.map(async (it, idx) => {
      const rawW = String(it.reqWord || it.word || '').trim();
      const normW = rawW.toLowerCase().normalize('NFC');

      // 屈折語尾の原形推定 (Lemmatization: 複数形・過去形・進行形・重複子音対応)
      const stemCandidates = [normW];
      if (normW.endsWith('ies') && normW.length > 4) stemCandidates.push(normW.slice(0, -3) + 'y');
      if (normW.endsWith('ied') && normW.length > 4) stemCandidates.push(normW.slice(0, -3) + 'y');
      if (normW.endsWith('s') && !normW.endsWith('ss') && normW.length > 3) stemCandidates.push(normW.slice(0, -1));
      if (normW.endsWith('es') && normW.length > 3) stemCandidates.push(normW.slice(0, -2));
      if (normW.endsWith('ed') && normW.length > 3) {
        stemCandidates.push(normW.slice(0, -1));
        const baseEd = normW.slice(0, -2);
        stemCandidates.push(baseEd);
        if (baseEd.length >= 3 && baseEd[baseEd.length - 1] === baseEd[baseEd.length - 2]) {
          stemCandidates.push(baseEd.slice(0, -1));
        }
      }
      if (normW.endsWith('ing') && normW.length > 4) {
        const baseIng = normW.slice(0, -3);
        stemCandidates.push(baseIng + 'e');
        stemCandidates.push(baseIng);
        if (baseIng.length >= 3 && baseIng[baseIng.length - 1] === baseIng[baseIng.length - 2]) {
          stemCandidates.push(baseIng.slice(0, -1));
        }
      }

      // 0. 包括的英和コア辞書マスター (Essential English Lexicon) の最優先照合
      let essentialCard = null;
      for (const cand of stemCandidates) {
        essentialCard = lookupEssentialLexicon(cand);
        if (essentialCard) break;
      }

      if (essentialCard) {
        return {
          reqIndex: it.reqIndex ?? idx,
          reqWord: rawW,
          word: rawW,
          category: typeof it.category === 'number' ? it.category : (typeof essentialCard.category === 'number' ? essentialCard.category : 28),
          phonetic: essentialCard.phonetic || '',
          grammar_forms: essentialCard.grammar_forms || '',
          etymologyConfidence: 'certain',
          etymology: essentialCard.etymology || '',
          etymologyTags: essentialCard.etymologyTags || [],
          history_note: essentialCard.history_note || '',
          core: essentialCard.core || '',
          meanings: essentialCard.meanings || [{ pos: 'Prep', text: rawW }],
          example: essentialCard.example || { foreign: '', ja: '', used_form: rawW },
          phrases: essentialCard.phrases || [],
          derivatives: essentialCard.derivatives || []
        };
      }

      // 英検準1級カタログの完全オフライン照合 (原形候補も含めて走査)
      let eikenCard = null;
      if (global.VocabEikenCatalog) {
        for (const cand of stemCandidates) {
          eikenCard = global.VocabEikenCatalog.getWord(cand);
          if (eikenCard) break;
        }
      }

      if (eikenCard) {
        return {
          reqIndex: idx,
          reqWord: rawW,
          word: rawW,
          category: typeof it.category === 'number' ? it.category : (typeof eikenCard.category === 'number' ? eikenCard.category : 28),
          phonetic: eikenCard.phonetic || '',
          grammar_forms: eikenCard.grammar_forms || '',
          etymologyConfidence: 'certain',
          etymology: eikenCard.etymology || '',
          etymologyTags: eikenCard.etymologyTags || [],
          history_note: eikenCard.history_note || '',
          core: eikenCard.core || '',
          meanings: eikenCard.meanings || [{ pos: 'Noun', text: rawW }],
          example: eikenCard.example || { foreign: '', ja: '', used_form: rawW },
          phrases: eikenCard.phrases || [],
          derivatives: eikenCard.derivatives || []
        };
      }

      const wRef = wiktMap?.get ? wiktMap.get(idx) : null;
      const wiktFullText = String(wRef?.fullSection || wRef?.extract || '');

      // 内蔵語源・歴史ナレッジの照合 (原形候補も含めて走査)
      let histData = null;
      for (const cand of stemCandidates) {
        if (BUILTIN_ETYMOLOGY_KNOWLEDGE.historical[cand]) {
          histData = BUILTIN_ETYMOLOGY_KNOWLEDGE.historical[cand];
          break;
        }
      }

      let rootKey = null;
      if (histData?.etymologyTags?.length) {
        rootKey = histData.etymologyTags[0];
      } else {
        for (const cand of stemCandidates) {
          for (const [rKey, rInfo] of Object.entries(BUILTIN_ETYMOLOGY_KNOWLEDGE.roots)) {
            if (rInfo.words && rInfo.words.includes(cand)) {
              rootKey = rKey;
              break;
            }
          }
          if (rootKey) break;
        }
      }

      if (!rootKey && wiktFullText) {
        const m = wiktFullText.match(/\*([a-zA-Z0-9_äöüßÄÖÜāēīōūăĕĭŏŭáéíóúàèìòùâêîôûəǭḗ₁₂₃₄ḱǵʷʰ-]+-?)/);
        if (m) {
          const cand = `*${m[1].replace(/^-|-$/g, '')}-`;
          if (BUILTIN_ETYMOLOGY_KNOWLEDGE.roots[cand]) rootKey = cand;
        }
      }

      const rootInfo = rootKey ? BUILTIN_ETYMOLOGY_KNOWLEDGE.roots[rootKey] : null;

      // オンライン辞書 + Wiktionary統合によるリッチカード合成を試行
      if (!histData) {
        const richSynthesized = await synthesizeRichLexicalEntry(rawW, normW, sLang, tLang, wRef, rootKey, rootInfo);
        if (richSynthesized && Array.isArray(richSynthesized.meanings) && richSynthesized.meanings.length > 0) {
          const fallbackEx = richSynthesized.example || {
            foreign: `The study examines how ${rawW} functions within this historical framework.`,
            trans: tLang === 'ja' ? `本研究はこの歴史的枠組みの中で<b>${rawW}</b>がどのように機能するかを検証する。` : `The study examines how <b>${rawW}</b> functions within this historical framework.`,
            [tLang]: tLang === 'ja' ? `本研究はこの歴史的枠組みの中で<b>${rawW}</b>がどのように機能するかを検証する。` : `The study examines how <b>${rawW}</b> functions within this historical framework.`,
            ja: tLang === 'ja' ? `本研究はこの歴史的枠組みの中で<b>${rawW}</b>がどのように機能するかを検証する。` : `The study examines how <b>${rawW}</b> functions within this historical framework.`,
            used_form: rawW
          };
          return {
            reqIndex: it.reqIndex ?? idx,
            reqWord: rawW,
            word: rawW,
            homographIndex: it.homographIndex || 1,
            category: typeof it.category === 'number' ? it.category : richSynthesized.category,
            phonetic: wRef?.ipa || '',
            grammar_forms: richSynthesized.grammar_forms || '',
            etymologyConfidence: richSynthesized.etymologyConfidence || 'certain',
            etymology: richSynthesized.etymology || (rootInfo ? `印欧祖語 ${rootKey}（${rootInfo.meaning}）に由来。` : `語源資料（Wiktionary等）に基づく語彙。`),
            etymologyTags: richSynthesized.etymologyTags || (rootKey ? [rootKey] : []),
            history_note: '',
            core: richSynthesized.core || '',
            meanings: richSynthesized.meanings,
            example: fallbackEx,
            phrases: [],
            derivatives: []
          };
        }
      }

      let etymology = histData?.etymology;
      if (!etymology) {
        if (rootInfo) {
          etymology = `印欧祖語 ${rootKey}（${rootInfo.meaning}）に由来。語根のコアイメージが保持され、定着した。`;
        } else if (wiktFullText) {
          // Wiktionary本文から実語源セクションを動的抽出
          let extractedWiktEty = '';
          const lines = wiktFullText.split('\n');
          let inEty = false;
          for (const line of lines) {
            const tr = line.trim();
            if (tr.startsWith('=')) {
              inEty = WIKT_ETY_SECTION_RE.test(tr.replace(/=/g, '').trim());
              continue;
            }
            if (inEty && tr && tr.length > 15 && !/^(see also|references|further reading)/i.test(tr)) {
              extractedWiktEty = tr.slice(0, 240);
              break;
            }
          }
          etymology = extractedWiktEty || `語源資料（Wiktionary等）の記録に基づく語彙。古英語・ラテン語等の語形成を経る。`;
        } else {
          etymology = `個別語源（借用語・新造語等）。確固たるPIE語根は未確定。`;
        }
      }

      const etymologyTags = rootKey ? [rootKey] : (histData?.etymologyTags || []);
      const etymologyConfidence = rootKey ? 'certain' : (histData ? 'certain' : 'probable');
      const core = histData?.core || (rootInfo ? `「${rootInfo.meaning}」をコアイメージとして語義が展開。` : `「${rawW}」の中核概念`);
      const history_note = (useHist && histData?.history_note) ? histData.history_note : '';

      let isDummyPlaceholder = false;
      let meanings = histData?.meanings;
      if (!meanings || !meanings.length) {
        const isPhrase = rawW.includes(' ');
        let pos = guessMorphologicalPos(rawW);
        let defText = '';
        let wiktPos = '';
        if (wiktFullText) {
          const lines = wiktFullText.split('\n');
          let inSkipSection = false;
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (trimmed.startsWith('=')) {
              const sec = trimmed.replace(/=/g, '').trim().toLowerCase();
              if (/^noun\b/i.test(sec) || /^proper noun\b/i.test(sec)) wiktPos = 'N[C]';
              else if (/^verb\b/i.test(sec)) wiktPos = 'V[T]';
              else if (/^adj(ective)?\b/i.test(sec)) wiktPos = 'Adj';
              else if (/^adv(erb)?\b/i.test(sec)) wiktPos = 'Adv';
              else if (/^prep(osition)?\b/i.test(sec)) wiktPos = 'Prep';
              else if (/^conj(unction)?\b/i.test(sec)) wiktPos = 'Conj';
              else if (/^pron(oun)?\b/i.test(sec)) wiktPos = 'Pron';
              inSkipSection = WIKT_SKIP_SECTION_RE.test(sec);
              continue;
            }
            if (inSkipSection) continue;
            const lower = trimmed.toLowerCase();
            if (
              lower.includes('borrowed from') ||
              lower.includes('etymology') ||
              WIKT_ETY_PROSE_RE.test(trimmed) ||
              (lower.startsWith(normW + ' (') && /(plural|third-person|present participle|past tense|comparative|countable|uncountable)/i.test(lower))
            ) {
              continue;
            }
            const clean = trimmed.replace(/^#+\s*/, '').replace(/^[0-9*.\s]+/, '').replace(/^\([^)]*\)\s*/, '').trim();
            if (clean.length > 3 && !clean.startsWith('(')) {
              defText = clean.slice(0, 140);
              break;
            }
          }
        }
        if (wiktPos) pos = wiktPos;

        const matched = lookupEssentialLexicon(rawW);
        const needsJaTrans = (tLang === 'ja' && sLang !== 'ja');
        const hasJaChars = s => /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/.test(String(s || ''));
        if (matched && matched.meanings?.length) {
          meanings = matched.meanings;
        } else if (it.targetSenseOrMeaning && (!needsJaTrans || hasJaChars(it.targetSenseOrMeaning))) {
          meanings = [{ pos, text: String(it.targetSenseOrMeaning).trim() }];
        } else if (rootInfo) {
          meanings = [{ pos, text: (defText && (!needsJaTrans || hasJaChars(defText))) ? `${rootInfo.meaning}（${defText}）` : `${rootInfo.meaning}（語根 ${rootKey} に由来する語義展開）` }];
        } else if (defText && (!needsJaTrans || hasJaChars(defText))) {
          meanings = [{ pos, text: defText }];
        } else {
          isDummyPlaceholder = true;
          const posName = pos.startsWith('Adj') ? '形容詞' : (pos.startsWith('V') ? '動詞' : (pos.startsWith('Adv') ? '副詞' : '名詞'));
          meanings = [{ pos, text: isPhrase ? `成句・熟語表現` : `${rawW}（${posName}）` }];
        }
      }

      let example = histData?.example;
      if (!example) {
        let exampleForeign = '';
        let exampleTrans = '';
        if (it.contextSentence) {
          exampleForeign = String(it.contextSentence).trim();
          const escW = rawW.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const hiCtx = new RegExp(`(${escW})`, 'i').test(exampleForeign)
            ? exampleForeign.replace(new RegExp(`(${escW})`, 'i'), '<b>$1</b>')
            : `<b>${rawW}</b> — ${exampleForeign}`;
          exampleTrans = tLang === 'ja' ? `文脈用例: ${hiCtx}` : hiCtx;
        } else if (wiktFullText) {
          const exLines = wiktFullText.split('\n');
          for (const el of exLines) {
            const tr = el.trim();
            if ((tr.startsWith('#*') || tr.startsWith('#:')) && tr.length > 20 && !tr.includes('http')) {
              exampleForeign = tr.replace(/^[#*:\s]+/, '').trim().slice(0, 180);
              break;
            }
          }
        }
        if (!exampleForeign) {
          exampleForeign = `The core contextual usage of ${rawW} is demonstrated here.`;
        }
        if (!exampleTrans) {
          exampleTrans = tLang === 'ja'
            ? `<b>${rawW}</b>の基本的・文脈的用例。`
            : `Core contextual usage of <b>${rawW}</b>.`;
        }
        example = {
          foreign: exampleForeign,
          ja: exampleTrans,
          trans: exampleTrans,
          [tLang]: exampleTrans,
          used_form: rawW
        };
      }

      const firstPos = meanings[0]?.pos || guessMorphologicalPos(rawW);
      const defaultCat = histData?.category || inferCategoryByPos(firstPos);
      const grammarForms = histData?.grammar_forms || inferGrammarForms(rawW, firstPos);

      return {
        reqIndex: it.reqIndex ?? idx,
        reqWord: rawW,
        word: rawW,
        homographIndex: it.homographIndex || 1,
        isDummyPlaceholder,
        category: typeof it.category === 'number' ? it.category : defaultCat,
        phonetic: wRef?.ipa || histData?.phonetic || '',
        grammar_forms: grammarForms,
        etymologyConfidence,
        etymology,
        etymologyTags,
        history_note,
        core,
        meanings,
        example,
        phrases: histData?.phrases || [],
        derivatives: histData?.derivatives || []
      };
    }));

    return { items, usedModel: 'builtin-knowledge-engine' };
  }

  /**
   * Gemini API 利用可能モデル一覧の取得 (1時間TTLキャッシュ)
   */
  const EXCLUDE_MODELS = ['tts', 'image', 'vision', 'embedding', 'aqa', 'audio', 'learnlm', 'robotics'];
  let _cachedModels = null;
  let _cachedModelsTs = 0;
  const MODELS_CACHE_TTL = 3600000; // 1時間
  let _cachedModelsKey = '';

  async function fetchModels(key, strictCheck = false) {
    if (!key) return [];
    const now = Date.now();
    if (!strictCheck && _cachedModels && _cachedModelsKey === key && (now - _cachedModelsTs < MODELS_CACHE_TTL)) {
      return _cachedModels;
    }
    if (!strictCheck && _cachedModelsKey === key) {
      try {
        const saved = (typeof localStorage !== 'undefined') ? localStorage.getItem('vv_cached_gemini_models') : null;
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && Array.isArray(parsed.models) && (now - parsed.ts < MODELS_CACHE_TTL)) {
            _cachedModels = parsed.models;
            _cachedModelsTs = parsed.ts;
            return _cachedModels;
          }
        }
      } catch {}
    }

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
        if (valid.length) {
          _cachedModels = valid;
          _cachedModelsTs = now;
          _cachedModelsKey = key;
          try {
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem('vv_cached_gemini_models', JSON.stringify({ ts: now, models: valid }));
            }
          } catch {}
          return valid;
        }
      } else {
        if (strictCheck || res.status === 400 || res.status === 401 || res.status === 403) {
          throw new Error(`APIキーが無効です (HTTP ${res.status})。正しいGemini APIキーを入力してください。`);
        }
      }
    } catch (e) {
      if (strictCheck || e?.message?.includes('APIキーが無効')) {
        throw e;
      }
      console.warn('[fetchModels fallback]', e?.message || e);
    }
    return ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite'];
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
      const userTxt = usrParts[0]?.text || '';
      const wCount = (userTxt.match(/"reqWord"|"word"/g) || []).length || 1;
      const thinkExtra = (think && deep) ? 1024 : 0;
      const dynamicTokens = (wCount === 1 ? (deep ? 3000 : 2500) : (wCount <= 3 ? 4500 : (wCount <= 6 ? 6000 : 8192))) + thinkExtra;
      const cfg = schema ? { temperature: 0.1, maxOutputTokens: dynamicTokens, responseMimeType: "application/json", responseSchema: schema } : { temperature: 0.1, maxOutputTokens: Math.max(dynamicTokens, 8192) };
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
    ESSENTIAL_ENGLISH_LEXICON,
    lookupEssentialLexicon,
    inferGrammarForms,
    inferCategoryByPos,
    guessMorphologicalPos,
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
  global.lookupEssentialLexicon = lookupEssentialLexicon;
  global.inferGrammarForms = inferGrammarForms;
  global.inferCategoryByPos = inferCategoryByPos;
  global.guessMorphologicalPos = guessMorphologicalPos;
})(typeof window !== 'undefined' ? window : globalThis);

export {};
