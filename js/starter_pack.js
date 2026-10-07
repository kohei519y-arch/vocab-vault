/**
 * Vocab Vault — おすすめスターターパック (Starter Pack)
 * コールドスタート問題を解消し、初回起動時から美しい語源ネットワーク・Anki復習を体感可能にする厳選20選
 */
(function(global) {
  'use strict';

  const EN_JA_STARTER = [
    {
      id: 'starter_epiphany',
      num: 1,
      word: 'epiphany',
      homographIndex: 1,
      phonetic: '/ɪˈpɪfəni/',
      grammar_forms: 'pl. epiphanies',
      category: '哲学・宗教',
      meanings: [
        { pos: 'N[C]', text: '（物事の本質や真理についての）突然のひらめき、直観、悟り' },
        { pos: 'N[C, U]', text: '【キリスト教】公現祭、主の顕現祝日（1月6日）；神の顕現' }
      ],
      core: '神の姿や物事の本質が突如として目の前に「光り現れ出ること」',
      etymology: '古代ギリシャ語 ἐπιφάνεια（epipháneia, 「顕現、出現」；ἐπί「〜の上へ」＋φαίνω「現れる、光る」）に由来し、印欧祖語 *bʰeh₂-（光る、輝く）に遡る。作家ジェイムズ・ジョイスが文学概念として転用し世俗的直観の意が定着。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*bʰeh₂-'],
      history_note: '東方の三博士へのイエス顕現を祝う公現祭（1月6日）に由来し、作家ジョイスの文学的転用を経て世俗的な直観の意へ拡張。',
      example: {
        foreign: 'While walking along the shore, she experienced a sudden <b>epiphany</b> that changed her life.',
        ja: '海岸沿いを歩いているとき、彼女は自らの人生を変える突然の<b>ひらめき</b>を経験した。',
        trans: '海岸沿いを歩いているとき、彼女は自らの人生を変える突然のひらめきを経験した。',
        used_form: 'epiphany'
      },
      derivatives: [
        { word: 'epiphanic', phonetic: '/ˌepɪˈfænɪk/', pos: 'Adj', meaning: '直観の、啓示的な' }
      ],
      phrases: [
        { foreign: 'have an epiphany', ja: '突然ひらめく、悟りを開く' }
      ]
    },
    {
      id: 'starter_lucid',
      num: 2,
      word: 'lucid',
      homographIndex: 1,
      phonetic: '/ˈluːsɪd/',
      grammar_forms: 'more lucid, most lucid',
      category: '心理学・精神',
      meanings: [
        { pos: 'Adj', text: '明快な、分かりやすい、筋道の通った' },
        { pos: 'Adj', text: '（病気や泥酔時などに意識が）はっきりした、正気の' },
        { pos: 'Adj', text: '【歴史・法学】（精神異常者の）一時的寛解期の、明晰な' }
      ],
      core: '光が遮るものなく差し込んで「明るく透き通っている」状態。',
      etymology: 'ラテン語 lucidus（澄んだ、光り輝く）に由来し、名詞 lux（光）や動詞 lucere（輝く）から派生。印欧祖語 *leuk-（明るい、光る）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*leuk-'],
      history_note: '英米法や医学史において、精神錯乱者が一時的に責任能力や遺言能力を取り戻す「明晰期（lucid interval）」は重要な法概念であった。',
      example: {
        foreign: 'During a <b>lucid</b> interval, the patient was able to sign the legal document.',
        ja: '<b>一時的に意識が回復した</b>合間に、その患者は法的文書に署名することができた。',
        trans: '一時的に意識が回復した合間に、その患者は法的文書に署名することができた。',
        used_form: 'lucid'
      },
      derivatives: [
        { word: 'lucidity', phonetic: '/luːˈsɪdəti/', pos: 'N[U]', meaning: '明晰さ、正気' },
        { word: 'elucidate', phonetic: '/ɪˈluːsɪdeɪt/', pos: 'V[T]', meaning: '解明する、明瞭にする' }
      ],
      phrases: [
        { foreign: 'lucid dream', ja: '明晰夢（自覚夢）' },
        { foreign: 'lucid interval', ja: '（医学・法学上の）明晰期' }
      ]
    },
    {
      id: 'starter_constant',
      num: 3,
      word: 'constant',
      homographIndex: 1,
      phonetic: '/ˈkɒnstənt/',
      grammar_forms: 'more constant, most constant',
      category: '科学・テクノロジー',
      meanings: [
        { pos: 'Adj', text: '一定の、不変の、絶え間ない' },
        { pos: 'N[C]', text: '【数学・物理】定数、不変量' }
      ],
      core: '共に（con-）しっかりと立ち続けて（-stant）動かないこと。',
      etymology: 'ラテン語 constans（しっかりと立つ）に由来。接頭辞 con-（共に）＋ stare（立つ）から成り、印欧祖語 *sta-（立つ）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*sta-'],
      example: {
        foreign: 'The speed of light in a vacuum is a <b>constant</b> in physics.',
        ja: '真空中における光速は、物理学における<b>不変量（定数）</b>である。',
        trans: '真空中における光速は、物理学における不変量（定数）である。',
        used_form: 'constant'
      },
      derivatives: [
        { word: 'constantly', phonetic: '/ˈkɒnstəntli/', pos: 'Adv', meaning: '絶えず、いつも' },
        { word: 'constancy', phonetic: '/ˈkɒnstənsi/', pos: 'N[U]', meaning: '恒常性、不変' }
      ],
      phrases: [
        { foreign: 'constant variable', ja: '定数変数' }
      ]
    },
    {
      id: 'starter_station',
      num: 4,
      word: 'station',
      homographIndex: 1,
      phonetic: '/ˈsteɪʃn/',
      grammar_forms: 'pl. stations',
      category: '交通・インフラ',
      meanings: [
        { pos: 'N[C]', text: '駅、部署、駐屯地' },
        { pos: 'V[T]', text: '配置する、駐留させる' }
      ],
      core: 'しっかりと立ち止まる定位置・拠点。',
      etymology: 'ラテン語 statio（立っていること、拠点、持ち場）に由来し、印欧祖語 *sta-（立つ）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*sta-'],
      example: {
        foreign: 'The guards were <b>stationed</b> at the main entrance of the embassy.',
        ja: '警備兵たちが大使館の正面玄関に<b>配置された</b>。',
        trans: '警備兵たちが大使館の正面玄関に配置された。',
        used_form: 'stationed'
      },
      derivatives: [
        { word: 'stationary', phonetic: '/ˈsteɪʃənri/', pos: 'Adj', meaning: '静止した、固定された' }
      ],
      phrases: [
        { foreign: 'police station', ja: '警察署' }
      ]
    },
    {
      id: 'starter_permanent',
      num: 5,
      word: 'permanent',
      homographIndex: 1,
      phonetic: '/ˈpɜːmənənt/',
      grammar_forms: 'more permanent, most permanent',
      category: '状態・性質',
      meanings: [
        { pos: 'Adj', text: '永続する、恒久的な、常設の' }
      ],
      core: '徹底的に（per-）その場に留まり続ける（-manent）こと。',
      etymology: 'ラテン語 permanere（留まり続ける；per「徹底的に」＋manere「留まる」）に由来し、印欧祖語 *men-（留まる）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*men-'],
      example: {
        foreign: 'They established a <b>permanent</b> residency in Kyoto.',
        ja: '彼らは京都に<b>恒久的な</b>住居を構えた。',
        trans: '彼らは京都に恒久的な住居を構えた。',
        used_form: 'permanent'
      },
      derivatives: [
        { word: 'permanently', phonetic: '/ˈpɜːmənəntli/', pos: 'Adv', meaning: '恒久的に、永久に' },
        { word: 'permanence', phonetic: '/ˈpɜːmənəns/', pos: 'N[U]', meaning: '永続性' }
      ],
      phrases: [
        { foreign: 'permanent address', ja: '本籍地、本住所' }
      ]
    },
    {
      id: 'starter_perspective',
      num: 6,
      word: 'perspective',
      homographIndex: 1,
      phonetic: '/pəˈspektɪv/',
      grammar_forms: 'pl. perspectives',
      category: '芸術・文学・文化',
      meanings: [
        { pos: 'N[C, U]', text: '視点、観点、大局観；遠近法' }
      ],
      core: '物事の隅々まで遮るものなく見通す（per-「通して」＋spec-「見る」）こと。',
      etymology: 'ラテン語 perspectiva（見通す技術）に由来。動詞 perspicere（見通す）を経て、印欧祖語 *speḱ-（見る、観察する）に遡る。ルネサンス期に絵画の遠近法として確立。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*speḱ-'],
      history_note: 'ルネサンス期イタリアでブルネレスキやアルベルティにより幾何学的遠近法として理論化され、後に知的大局観の意へ転用。',
      example: {
        foreign: 'Traveling abroad gives you a broader <b>perspective</b> on your own culture.',
        ja: '海外旅行は自らの文化に対するより広い<b>視点・大局観</b>を与えてくれる。',
        trans: '海外旅行は自らの文化に対するより広い視点・大局観を与えてくれる。',
        used_form: 'perspective'
      },
      derivatives: [
        { word: 'perspicuous', phonetic: '/pəˈspɪkjuəs/', pos: 'Adj', meaning: '明快な、明瞭な' }
      ],
      phrases: [
        { foreign: 'keep things in perspective', ja: '大局的な見失わない' }
      ]
    },
    {
      id: 'starter_spectacle',
      num: 7,
      word: 'spectacle',
      homographIndex: 1,
      phonetic: '/ˈspektəkl/',
      grammar_forms: 'pl. spectacles',
      category: '芸術・文学・文化',
      meanings: [
        { pos: 'N[C]', text: '壮観、壮大な見もの、光景' },
        { pos: 'N[pl]', text: '（複数形で）眼鏡' }
      ],
      core: '思わず目を奪われてじっと見つめる対象。',
      etymology: 'ラテン語 spectaculum（見もの）に由来し、spectare（見つめる）を経て印欧祖語 *speḱ-（見る）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*speḱ-'],
      example: {
        foreign: 'The fireworks display was a magnificent <b>spectacle</b> over the bay.',
        ja: '湾の上で打ち上げられた花火大会は壮大な<b>見もの（壮観）</b>であった。',
        trans: '湾の上で打ち上げられた花火大会は壮大な見もの（壮観）であった。',
        used_form: 'spectacle'
      },
      derivatives: [
        { word: 'spectacular', phonetic: '/spekˈtækjələ/', pos: 'Adj', meaning: '壮大な、目覚ましい' }
      ],
      phrases: [
        { foreign: 'make a spectacle of oneself', ja: '人前で醜態をさらす' }
      ]
    },
    {
      id: 'starter_telescope',
      num: 8,
      word: 'telescope',
      homographIndex: 1,
      phonetic: '/ˈtelɪskəʊp/',
      grammar_forms: 'pl. telescopes',
      category: '科学・テクノロジー',
      meanings: [
        { pos: 'N[C]', text: '望遠鏡' },
        { pos: 'V[I, T]', text: '伸縮する、短縮する' }
      ],
      core: '遠く離れた（tele-）対象を視覚で捉える（-scope）装置。',
      etymology: 'ギリシャ語 τηλεσκόπος（teleskopos；tēle「遠く」＋skopein「見る」）に由来し、印欧祖語 *speḱ-（見る）に遡る。ガリレオの観測機器に命名。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*speḱ-'],
      example: {
        foreign: 'Galileo improved the design of the optical <b>telescope</b> in 1609.',
        ja: 'ガリレオは1609年に光学<b>望遠鏡</b>の設計を改良した。',
        trans: 'ガリレオは1609年に光学望遠鏡の設計を改良した。',
        used_form: 'telescope'
      },
      derivatives: [
        { word: 'telescopic', phonetic: '/ˌtelɪˈskɒpɪk/', pos: 'Adj', meaning: '望遠鏡の、伸縮自在の' }
      ],
      phrases: [
        { foreign: 'space telescope', ja: '宇宙望遠鏡' }
      ]
    },
    {
      id: 'starter_sympathy',
      num: 9,
      word: 'sympathy',
      homographIndex: 1,
      phonetic: '/ˈsɪmpəθi/',
      grammar_forms: 'pl. sympathies',
      category: '感情・性格',
      meanings: [
        { pos: 'N[U, C]', text: '同情、共感、思いやり；賛意' }
      ],
      core: '他者と共に（syn-）同じ感情や痛みを被る（pathos）こと。',
      etymology: '古代ギリシャ語 συμπάθεια（sympatheia；syn「共に」＋pathos「感情、苦痛」）に由来し、印欧祖語 *kʷentʰ-（苦しむ、感じる）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*kʷentʰ-'],
      example: {
        foreign: 'She expressed deep <b>sympathy</b> for the families of the disaster victims.',
        ja: '彼女は被災者の遺族に対して深い<b>同情と哀悼</b>の意を表した。',
        trans: '彼女は被災者の遺族に対して深い同情と哀悼の意を表した。',
        used_form: 'sympathy'
      },
      derivatives: [
        { word: 'sympathize', phonetic: '/ˈsɪmpəθaɪz/', pos: 'V[I]', meaning: '同情する、共鳴する' },
        { word: 'sympathetic', phonetic: '/ˌsɪmpəˈθetɪk/', pos: 'Adj', meaning: '思いやりのある、好意的な' }
      ],
      phrases: [
        { foreign: 'in sympathy with', ja: '〜に共鳴して、〜と同調して' }
      ]
    },
    {
      id: 'starter_metaphor',
      num: 10,
      word: 'metaphor',
      homographIndex: 1,
      phonetic: '/ˈmetəfə/',
      grammar_forms: 'pl. metaphors',
      category: '言語・コミュニケーション',
      meanings: [
        { pos: 'N[C, U]', text: '隠喩、メタファー、比喩' }
      ],
      core: 'ある意味を別の場所へと向こう側へ（meta-）運び渡す（phor）こと。',
      etymology: '古代ギリシャ語 μεταφορά（metaphorá；meta「向こうへ、変化」＋pherein「運ぶ」）に由来し、印欧祖語 *bʰer-（運ぶ、産む）に遡る。アリストテレス『詩学』で理論化。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*bʰer-'],
      history_note: 'アリストテレスが『詩学』においてある物から別の物への意味転移の修辞法として定義し、西洋詩学・認知言語学の基幹概念となった。',
      example: {
        foreign: 'The poet used the sea as a <b>metaphor</b> for the human subconscious.',
        ja: 'その詩人は海を人間の無意識の<b>隠喩（メタファー）</b>として用いた。',
        trans: 'その詩人は海を人間の無意識の隠喩（メタファー）として用いた。',
        used_form: 'metaphor'
      },
      derivatives: [
        { word: 'metaphorical', phonetic: '/ˌmetəˈfɒrɪkl/', pos: 'Adj', meaning: '比喩的な、隠喩の' }
      ],
      phrases: [
        { foreign: 'mixed metaphor', ja: '混淆比喩' }
      ]
    },
    {
      id: 'starter_dialogue',
      num: 11,
      word: 'dialogue',
      homographIndex: 1,
      phonetic: '/ˈdaɪəlɒɡ/',
      grammar_forms: 'pl. dialogues',
      category: '言語・コミュニケーション',
      meanings: [
        { pos: 'N[C, U]', text: '対話、対談、意見交換' }
      ],
      core: '言葉・ロゴス（logos）を通じて（dia-）互いに意味を交わし合うこと。',
      etymology: 'ギリシャ語 διάλογος（dialogos；dia「〜を通じて」＋logos「言葉、理性」）に由来し、印欧祖語 *leǵ-（集める、話す）に遡る。プラトンの対話篇に代表される。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*leǵ-'],
      history_note: 'プラトンがソクラテスの問答法を劇的形式で著した「対話篇（Dialogues）」により、哲学的探求の理想的形式として定着。',
      example: {
        foreign: 'Constructive <b>dialogue</b> between the two nations led to a historic peace accord.',
        ja: '両国間の建設的な<b>対話</b>が、歴史的な和平合意へと繋がった。',
        trans: '両国間の建設的な対話が、歴史的な和平合意へと繋がった。',
        used_form: 'dialogue'
      },
      derivatives: [
        { word: 'dialogic', phonetic: '/ˌdaɪəˈlɒdʒɪk/', pos: 'Adj', meaning: '対話的な' }
      ],
      phrases: [
        { foreign: 'open dialogue', ja: '率直な対話' }
      ]
    },
    {
      id: 'starter_radical',
      num: 12,
      word: 'radical',
      homographIndex: 1,
      phonetic: '/ˈrædɪkl/',
      grammar_forms: 'more radical, most radical',
      category: '政治・国際関係',
      meanings: [
        { pos: 'Adj', text: '根本的な、徹底的な；急進的な、過激な' },
        { pos: 'N[C]', text: '急進主義者；【化学】基、ラジカル；【数学】根号' }
      ],
      core: '草木の「根（radix）」そのものに深く切り込むさま。',
      etymology: 'ラテン語 radicalis（根を持つ）に由来し、名詞 radix（根）から派生。印欧祖語 *wréh₂ds（根）に遡る。18世紀英国で根本的改革派（Radicals）を指す政治用語となった。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*wréh₂ds'],
      history_note: '18世紀末の英国議会改革運動において、制度を「根底から改革する者」を指す政治用語として急進派（Radicals）の意が確立。',
      example: {
        foreign: 'The new prime minister proposed a <b>radical</b> overhaul of the tax system.',
        ja: '新首相は税制の<b>根本的な（抜本的）</b>見直しを提案した。',
        trans: '新首相は税制の根本的な見直しを提案した。',
        used_form: 'radical'
      },
      derivatives: [
        { word: 'radically', phonetic: '/ˈrædɪkli/', pos: 'Adv', meaning: '根本から、徹底的に' },
        { word: 'radicalize', phonetic: '/ˈrædɪkəlaɪz/', pos: 'V[T]', meaning: '急進化させる' }
      ],
      phrases: [
        { foreign: 'radical change', ja: '抜本的な変化' }
      ]
    },
    {
      id: 'starter_inspire',
      num: 13,
      word: 'inspire',
      homographIndex: 1,
      phonetic: '/ɪnˈspaɪə/',
      grammar_forms: 'inspires, inspired, inspiring',
      category: '心理学・精神',
      meanings: [
        { pos: 'V[T]', text: 'ひらめきを与える、鼓舞する、呼び起こす' },
        { pos: 'V[I, T]', text: '（息を）吸い込む' }
      ],
      core: '人の心の中へと新たな息吹（spir-）を吹き込む（in-）こと。',
      etymology: 'ラテン語 inspirare（息を吹き込む；in「中へ」＋spirare「息をする」）に由来し、印欧祖語 *speys-（息をする）に遡る。神が霊感を授けるという神学用語に由来。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*speys-'],
      example: {
        foreign: 'Her courage <b>inspired</b> millions of citizens across the globe.',
        ja: '彼女の勇気は、世界中の何百万もの市民を<b>鼓舞した（奮い立たせた）</b>。',
        trans: '彼女の勇気は、世界中の何百万もの市民を鼓舞した。',
        used_form: 'inspired'
      },
      derivatives: [
        { word: 'inspiration', phonetic: '/ˌɪnspəˈreɪʃn/', pos: 'N[U, C]', meaning: '霊感、ひらめき、鼓舞' },
        { word: 'inspirational', phonetic: '/ˌɪnspəˈreɪʃənl/', pos: 'Adj', meaning: '勇気を与える' }
      ],
      phrases: [
        { foreign: 'draw inspiration from', ja: '〜から着想を得る' }
      ]
    },
    {
      id: 'starter_spirit',
      num: 14,
      word: 'spirit',
      homographIndex: 1,
      phonetic: '/ˈspɪrɪt/',
      grammar_forms: 'pl. spirits',
      category: '哲学・宗教',
      meanings: [
        { pos: 'N[U, C]', text: '精神、魂、気迫；時代の精神' },
        { pos: 'N[pl]', text: '（強い）蒸留酒' }
      ],
      core: '肉体に命を宿らせる目に見えない「息吹・生命の気息」。',
      etymology: 'ラテン語 spiritus（息、生命の息吹、精神）に由来し、spirare（呼吸する）を経て印欧祖語 *speys-（息をする）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*speys-'],
      example: {
        foreign: 'Democracy thrives only when the true <b>spirit</b> of liberty is maintained.',
        ja: '民主主義は、自由の真の<b>精神</b>が保たれていて初めて繁栄する。',
        trans: '民主主義は、自由の真の精神が保たれていて初めて繁栄する。',
        used_form: 'spirit'
      },
      derivatives: [
        { word: 'spiritual', phonetic: '/ˈspɪrɪtʃuəl/', pos: 'Adj', meaning: '精神の、霊的な' }
      ],
      phrases: [
        { foreign: 'spirit of the age', ja: '時代精神（ツァイトガイスト）' }
      ]
    },
    {
      id: 'starter_introvert',
      num: 15,
      word: 'introvert',
      homographIndex: 1,
      phonetic: '/ˈɪntrəvɜːt/',
      grammar_forms: 'pl. introverts',
      category: '心理学・精神',
      meanings: [
        { pos: 'N[C]', text: '内向的な人、内省的な性格の人' },
        { pos: 'Adj', text: '内向性の' }
      ],
      core: '関心やエネルギーを自分自身の内側へ（intro-）向ける（-vert）こと。',
      etymology: 'ラテン語 introvertere（内側に向ける；intro「内へ」＋vertere「回す、向ける」）に由来し、印欧祖語 *wer-（回る、曲がる）に遡る。心理学者ユングが性格類型論で命名。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*wer-'],
      history_note: 'スイスの精神分析学者カール・ユングが1921年の『心理学的類型』において、リビドーの向かう方向として外向型（extravert）と対比して提唱。',
      example: {
        foreign: 'As an <b>introvert</b>, he recharged his energy through quiet reading.',
        ja: '<b>内向的な性格</b>であったため、彼は静かに読書をすることで活力を回復した。',
        trans: '内向的な性格であったため、彼は静かに読書をすることで活力を回復した。',
        used_form: 'introvert'
      },
      derivatives: [
        { word: 'introversion', phonetic: '/ˌɪntrəˈvɜːʃn/', pos: 'N[U]', meaning: '内向性' }
      ],
      phrases: [
        { foreign: 'introverted personality', ja: '内向的な性格' }
      ]
    },
    {
      id: 'starter_divert',
      num: 16,
      word: 'divert',
      homographIndex: 1,
      phonetic: '/daɪˈvɜːt/',
      grammar_forms: 'diverts, diverted, diverting',
      category: '交通・インフラ',
      meanings: [
        { pos: 'V[T]', text: '方向を変える、迂回させる、転用する；（注意を）そらす' }
      ],
      core: '本来の道筋から離れた別の方向へと（di-）向きを変える（-vert）こと。',
      etymology: 'ラテン語 divertere（分かれて向きを変える；dis-「離れて」＋vertere「回す」）に由来し、印欧祖語 *wer-（回る）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*wer-'],
      example: {
        foreign: 'The flight was <b>diverted</b> to Osaka due to severe turbulence.',
        ja: 'その便は激しい乱気流のため大阪へ<b>進路変更（ダイバート）</b>された。',
        trans: 'その便は激しい乱気流のため大阪へ進路変更された。',
        used_form: 'diverted'
      },
      derivatives: [
        { word: 'diversion', phonetic: '/daɪˈvɜːʃn/', pos: 'N[C, U]', meaning: '迂回、転用、気晴らし' }
      ],
      phrases: [
        { foreign: 'divert attention from', ja: '〜から注意をそらす' }
      ]
    },
    {
      id: 'starter_comprehend',
      num: 17,
      word: 'comprehend',
      homographIndex: 1,
      phonetic: '/ˌkɒmprɪˈhend/',
      grammar_forms: 'comprehends, comprehended, comprehending',
      category: '心理学・精神',
      meanings: [
        { pos: 'V[T]', text: '十分に理解する、把握する；包括する' }
      ],
      core: '要素をすべて丸ごと完全に（com-）手中に掴み取る（-prehend）こと。',
      etymology: 'ラテン語 comprehendere（しっかりと掴む；com「共に、完全に」＋prehendere「掴む」）に由来し、印欧祖語 *gʰed-（掴む）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*gʰed-'],
      example: {
        foreign: 'The philosophical treatise was too complex for a novice to <b>comprehend</b>.',
        ja: 'その哲学論文は、初学者が<b>十分に理解する</b>にはあまりに難解であった。',
        trans: 'その哲学論文は、初学者が十分に理解するにはあまりに難解であった。',
        used_form: 'comprehend'
      },
      derivatives: [
        { word: 'comprehensive', phonetic: '/ˌkɒmprɪˈhensɪv/', pos: 'Adj', meaning: '包括的な、総合的な' },
        { word: 'comprehension', phonetic: '/ˌkɒmprɪˈhenʃn/', pos: 'N[U]', meaning: '理解力、読解' }
      ],
      phrases: [
        { foreign: 'beyond comprehension', ja: '理解を超える、到底理解できない' }
      ]
    },
    {
      id: 'starter_contract',
      num: 18,
      word: 'contract',
      homographIndex: 1,
      phonetic: '/ˈkɒntrækt/',
      grammar_forms: 'pl. contracts',
      category: '法律・司法',
      meanings: [
        { pos: 'N[C]', text: '契約、協定、盟約' },
        { pos: 'V[T, I]', text: '収縮する；契約を結ぶ；（病気に）かかる' }
      ],
      core: '双方の合意を一つにまとめて手元へと（con-）引き寄せる（-tract）こと。',
      etymology: 'ラテン語 contractus（引き寄せられたもの、合意）に由来。動詞 contrahere（共に引く；con-「共に」＋trahere「引く」）から成り、印欧祖語 *tregʰ-（引く、引きずる）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*tregʰ-'],
      history_note: '近代法において社会契約説（ルソー・ホッブズ）の核となり、自由意志に基づく拘束力ある合意として現代契約法の根幹を成す。',
      example: {
        foreign: 'Both parties formally signed the binding commercial <b>contract</b>.',
        ja: '双方が法的に拘束力のある商業<b>契約</b>に正式に署名した。',
        trans: '双方が法的に拘束力のある商業契約に正式に署名した。',
        used_form: 'contract'
      },
      derivatives: [
        { word: 'contractual', phonetic: '/kənˈtræktʃuəl/', pos: 'Adj', meaning: '契約上の' },
        { word: 'contraction', phonetic: '/kənˈtrækʃn/', pos: 'N[C, U]', meaning: '収縮、短縮' }
      ],
      phrases: [
        { foreign: 'social contract', ja: '社会契約' },
        { foreign: 'breach of contract', ja: '契約違反' }
      ]
    },
    {
      id: 'starter_quarantine',
      num: 19,
      word: 'quarantine',
      homographIndex: 1,
      phonetic: '/ˈkwɒrəntiːn/',
      grammar_forms: 'quarantines, quarantined',
      category: '医療・健康',
      meanings: [
        { pos: 'N[U, C]', text: '隔離、検疫；検疫期間' },
        { pos: 'V[T]', text: '検疫隔離する、遮断する' }
      ],
      core: 'ペスト感染を防ぐために設定された「40日（quaranta）の停泊隔離」。',
      etymology: 'イタリア語（ヴェネツィア方言）quarantena（40日間）に由来し、ラテン語 quadraginta（40）から派生。14世紀のヴェネツィア共和国で、ペスト疑いのある船をラグーナに40日間留め置いた公衆衛生制度が発祥。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*kʷetwóres'],
      history_note: '14世紀中葉の黒死病（ペスト）禍において、ヴェネツィア共和国が寄港船に40日間の海上隔離（quarantina）を義務付けた史上初の近代検疫制度。',
      example: {
        foreign: 'Incoming travelers were placed in strict <b>quarantine</b> for two weeks.',
        ja: '入国した渡航者たちは2週間の厳格な<b>検疫隔離</b>下に置かれた。',
        trans: '入国した渡航者たちは2週間の厳格な検疫隔離下に置かれた。',
        used_form: 'quarantine'
      },
      derivatives: [
        { word: 'quarantined', phonetic: '/ˈkwɒrəntiːnd/', pos: 'Adj', meaning: '隔離された' }
      ],
      phrases: [
        { foreign: 'quarantine station', ja: '検疫所' }
      ]
    },
    {
      id: 'starter_wet',
      num: 20,
      word: 'wet',
      homographIndex: 1,
      phonetic: '/wet/',
      grammar_forms: 'wetter, wettest',
      category: '歴史・考古学',
      meanings: [
        { pos: 'Adj', text: '濡れた、湿った、水気のある' },
        { pos: 'Adj', text: '【歴史・禁酒法】（米国禁酒法時代に）酒類販売を支持・容認する、反禁酒派の' }
      ],
      core: '水気を含んで潤っていること。',
      etymology: '古英語 wǣt（湿った）に由来し、印欧祖語 *wed-（水、湿る；英語 water, ドイツ語 Wasser と同族）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*wed-'],
      history_note: '1920〜33年の米国禁酒法（ボルステッド法）時代、酒類合法化・販売継続を主張した「反禁酒派」は wets、禁酒推進派は drys と呼ばれた。',
      example: {
        foreign: 'In the 1928 presidential election, the Democratic candidate was favored by the <b>wet</b> voters who opposed Prohibition.',
        ja: '1928年の大統領選挙において、民主党候補は禁酒法に反対する<b>反禁酒派（酒類容認派）</b>の有権者から支持された。',
        trans: '1928年の大統領選挙において、民主党候補は禁酒法に反対する反禁酒派（酒類容認派）の有権者から支持された。',
        used_form: 'wet'
      },
      derivatives: [
        { word: 'wetness', phonetic: '/ˈwetnəs/', pos: 'N[U]', meaning: '湿り気、湿潤' }
      ],
      phrases: [
        { foreign: 'wet blanket', ja: '場を白けさせる人' }
      ]
    }
  ];

  function getStarterPack(lang = 'en') {
    if (lang === 'en') {
      return JSON.parse(JSON.stringify(EN_JA_STARTER));
    }
    return JSON.parse(JSON.stringify(EN_JA_STARTER));
  }

  global.VocabStarterPack = {
    getStarterPack
  };

})(typeof window !== 'undefined' ? window : globalThis);
