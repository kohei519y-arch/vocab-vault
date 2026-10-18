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

  const EN_JA_STARTER_BUSINESS = [
    {
      id: 'biz_precedent',
      num: 1,
      word: 'precedent',
      homographIndex: 1,
      phonetic: '/ˈpresɪdənt/',
      grammar_forms: 'pl. precedents',
      category: 'ビジネス・法務',
      meanings: [
        { pos: 'N[C]', text: '前例、先例；判例、過去の基準' },
        { pos: 'Adj', text: '先行する、前の、過去の' }
      ],
      core: '他の事象よりも先に前（pre-）へと歩み進む（cedere）こと。',
      etymology: 'ラテン語 praecedens（先行する）に由来。接頭辞 prae-（前に）＋ cedere（行く、退く）から成り、印欧祖語 *ked-（行く）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*ked-'],
      history_note: '英米法（コモン・ロー）における「先例拘束性の原理（stare decisis）」の中核をなす語。',
      example: {
        foreign: 'The court ruling set a dangerous <b>precedent</b> for future intellectual property disputes.',
        ja: 'その裁判所の判決は、将来の知的財産紛争に対して危険な<b>先例</b>を作った。',
        trans: 'その裁判所の判決は、将来の知的財産紛争に対して危険な先例を作った。',
        used_form: 'precedent'
      },
      derivatives: [
        { word: 'unprecedented', phonetic: '/ʌnˈpresɪdentɪd/', pos: 'Adj', meaning: '前例のない、未曾有の' }
      ],
      phrases: [
        { foreign: 'set a precedent', ja: '先例を作る' }
      ]
    },
    {
      id: 'biz_contingency',
      num: 2,
      word: 'contingency',
      homographIndex: 1,
      phonetic: '/kənˈtɪndʒənsi/',
      grammar_forms: 'pl. contingencies',
      category: 'ビジネス・経営戦略',
      meanings: [
        { pos: 'N[C]', text: '不測の事態、偶発事件、緊急事態' },
        { pos: 'N[U]', text: '偶然性、不確実性' }
      ],
      core: '予期せぬ出来事が互いに触れ合い（con- + tangere）、ぶつかり合うこと。',
      etymology: 'ラテン語 contingere（触れる、起こる）に由来。接頭辞 con-（共に）＋ tangere（触れる）から成り、印欧祖語 *tag-（触れる）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*tag-'],
      history_note: '経営管理論において不確実な環境変化に適応する「コンティンジェンシー理論」として体系化された。',
      example: {
        foreign: 'We have developed a comprehensive <b>contingency</b> plan to mitigate supply chain disruptions.',
        ja: 'サプライチェーンの寸断を緩和するため、包括的な<b>緊急時対応（不測事態）</b>計画を策定した。',
        trans: 'サプライチェーンの寸断を緩和するため、包括的な緊急時対応（不測事態）計画を策定した。',
        used_form: 'contingency'
      },
      derivatives: [
        { word: 'contingent', phonetic: '/kənˈtɪndʒənt/', pos: 'Adj', meaning: '〜を条件とする、偶発的な' }
      ],
      phrases: [
        { foreign: 'contingency plan', ja: '緊急時対応計画（コンティンジェンシープラン）' }
      ]
    },
    {
      id: 'biz_lucrative',
      num: 3,
      word: 'lucrative',
      homographIndex: 1,
      phonetic: '/ˈluːkrətɪv/',
      grammar_forms: 'more lucrative, most lucrative',
      category: 'ビジネス・財務',
      meanings: [
        { pos: 'Adj', text: '非常に利益の上がる、儲かる、実入りの良い' }
      ],
      core: '努力や投資に対して豊かな獲物・利得（lucrum）をもたらすこと。',
      etymology: 'ラテン語 lucrativus（利益をもたらす）に由来。名詞 lucrum（利得、富）から派生し、印欧祖語 *lau-（利得、獲物）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*lau-'],
      history_note: '古代ローマの商取引において、正当な対価としての利益（lucrum）を表す法用語から発展。',
      example: {
        foreign: 'The cross-border merger proved to be a highly <b>lucrative</b> venture for both corporations.',
        ja: 'そのクロスボーダー企業合併は、両社にとって極めて<b>実入りの良い（高収益な）</b>事業であることが判明した。',
        trans: 'そのクロスボーダー企業合併は、両社にとって極めて実入りの良い（高収益な）事業であることが判明した。',
        used_form: 'lucrative'
      },
      derivatives: [
        { word: 'lucre', phonetic: '/ˈluːkər/', pos: 'N[U]', meaning: '金儲け、利得' }
      ],
      phrases: [
        { foreign: 'lucrative market', ja: '収益性の高い市場' }
      ]
    },
    {
      id: 'biz_aggregate',
      num: 4,
      word: 'aggregate',
      homographIndex: 1,
      phonetic: '/ˈæɡrɪɡət/',
      grammar_forms: 'aggregates, aggregated, aggregating',
      category: 'ビジネス・経済学',
      meanings: [
        { pos: 'Adj', text: '総計の、集計された、全体の' },
        { pos: 'N[C]', text: '総数、集合体、合計' },
        { pos: 'V[T]', text: '〜を集計する、集める' }
      ],
      core: '散らばっていた個体を群れ（grex）の中へ引き寄せて合算すること。',
      etymology: 'ラテン語 aggregare（群れに加える）に由来。ad-（〜へ）＋ grex（家畜の群れ）から成り、印欧祖語 *ger-（集まる）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*ger-'],
      history_note: 'マクロ経済学において国民経済全体の総需要（aggregate demand）を分析する基幹概念。',
      example: {
        foreign: '<b>Aggregate</b> consumer demand in the domestic market showed robust quarterly growth.',
        ja: '国内市場における<b>総</b>個人消費需要は、四半期ベースで力強い成長を示した。',
        trans: '国内市場における総個人消費需要は、四半期ベースで力強い成長を示した。',
        used_form: 'Aggregate'
      },
      derivatives: [
        { word: 'aggregation', phonetic: '/ˌæɡrɪˈɡeɪʃən/', pos: 'N[U]', meaning: '集約、集計' }
      ],
      phrases: [
        { foreign: 'in the aggregate', ja: '全体として、合計で' }
      ]
    },
    {
      id: 'biz_discrepancy',
      num: 5,
      word: 'discrepancy',
      homographIndex: 1,
      phonetic: '/dɪˈskrepənsi/',
      grammar_forms: 'pl. discrepancies',
      category: 'ビジネス・会計・監査',
      meanings: [
        { pos: 'N[C, U]', text: '（計算や報告の）不一致、食い違い、相違、矛盾' }
      ],
      core: '調和すべき2つの音が離れて（dis-）不快にガラガラ鳴り響く（crepare）こと。',
      etymology: 'ラテン語 discrepare（不協和音を出す、相違する）に由来。dis-（離れて）＋ crepare（軋む、音を立てる）から成り、印欧祖語 *krep-（ガラガラ鳴る）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*krep-'],
      history_note: '財務諸表監査において、帳簿記録と実地棚卸高・銀行残高との差異を指摘する基本用語。',
      example: {
        foreign: 'The forensic audit revealed an unexplained <b>discrepancy</b> between inventory records and physical stock.',
        ja: '不正検査監査により、棚卸記録と実際の在庫との間に原因不明の<b>食い違い</b>が発覚した。',
        trans: '不正検査監査により、棚卸記録と実際の在庫との間に原因不明の食い違いが発覚した。',
        used_form: 'discrepancy'
      },
      derivatives: [
        { word: 'discrepant', phonetic: '/dɪˈskrepənt/', pos: 'Adj', meaning: '矛盾した、食い違った' }
      ],
      phrases: [
        { foreign: 'reconcile a discrepancy', ja: '不一致を調整・解明する' }
      ]
    },
    {
      id: 'biz_volatile',
      num: 6,
      word: 'volatile',
      homographIndex: 1,
      phonetic: '/ˈvɒlətaɪl/',
      grammar_forms: 'more volatile, most volatile',
      category: 'ビジネス・金融市場',
      meanings: [
        { pos: 'Adj', text: '（価格や相場が）変動しやすい、不安定な；揮発性の' },
        { pos: 'Adj', text: '（情勢や感情が）一触即発の、変わりやすい' }
      ],
      core: '空中にパッと飛び立ち（volare）、留まることなく移ろいやすいこと。',
      etymology: 'ラテン語 volatilis（飛ぶことができる、軽薄な）に由来。動詞 volare（飛ぶ）から派生し、印欧祖語 *gʷel-（飛ぶ）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*gʷel-'],
      history_note: '現代金融工学における資産価格の価格変動率（ボラティリティ）の指標として定着。',
      example: {
        foreign: 'Equity markets turned highly <b>volatile</b> following the central bank\'s interest rate announcement.',
        ja: '中央銀行の政策金利発表を受けて、株式市場は極めて<b>不安定（乱高下）</b>な展開となった。',
        trans: '中央銀行の政策金利発表を受けて、株式市場は極めて不安定（乱高下）な展開となった。',
        used_form: 'volatile'
      },
      derivatives: [
        { word: 'volatility', phonetic: '/ˌvɒləˈtɪləti/', pos: 'N[U]', meaning: '変動性、ボラティリティ' }
      ],
      phrases: [
        { foreign: 'market volatility', ja: '相場のボラティリティ（変動性）' }
      ]
    },
    {
      id: 'biz_leverage',
      num: 7,
      word: 'leverage',
      homographIndex: 1,
      phonetic: '/ˈliːvərɪdʒ/',
      grammar_forms: 'leverages, leveraged, leveraging',
      category: 'ビジネス・財務戦略',
      meanings: [
        { pos: 'N[U]', text: 'てこの作用；財務レバレッジ（自己資本比率に対する借入金利用度）；影響力' },
        { pos: 'V[T]', text: '〜を（てこの原理で）有効活用する、借入金で投資する' }
      ],
      core: '重いものを軽々と持ち上げる（levare）てこの力。',
      etymology: '古フランス語 levier（てこ）に接尾辞 -age が付加。ラテン語 levare（軽くする、持ち上げる）に由来し、印欧祖語 *legʷʰ-（軽い）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*legʷʰ-'],
      history_note: '少額の自己資本に借入金をテコとして掛け合わせ、巨額の企業買収を行うLBO等の核心概念。',
      example: {
        foreign: 'The enterprise <b>leveraged</b> its extensive distribution network to launch the new SaaS suite.',
        ja: 'その企業は、自社の広範な流通ネットワークを<b>テコに活用して</b>新たなSaaS製品群を投入した。',
        trans: 'その企業は、自社の広範な流通ネットワークをテコに活用して新たなSaaS製品群を投入した。',
        used_form: 'leveraged'
      },
      derivatives: [
        { word: 'deleverage', phonetic: '/diːˈliːvərɪdʒ/', pos: 'V[I, T]', meaning: 'レバレッジを縮小（負債削減）する' }
      ],
      phrases: [
        { foreign: 'gain leverage', ja: '有利な交渉力・足がかりを得る' }
      ]
    },
    {
      id: 'biz_subsidiary',
      num: 8,
      word: 'subsidiary',
      homographIndex: 1,
      phonetic: '/səbˈsɪdiəri/',
      grammar_forms: 'pl. subsidiaries',
      category: 'ビジネス・企業組織',
      meanings: [
        { pos: 'N[C]', text: '子会社、傘下企業' },
        { pos: 'Adj', text: '補助的な、付随する、従属する' }
      ],
      core: '本体の後ろや下に座って（sedere）援護・控えている存在。',
      etymology: 'ラテン語 subsidiarius（予備軍の、援軍の）に由来。接頭辞 sub-（下に）＋ sedere（座る）から成り、印欧祖語 *sed-（座る）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*sed-'],
      history_note: '古代ローマ軍において最前線の背後に控えていた予備援兵（subsidium）が原義。',
      example: {
        foreign: 'The Japanese conglomerate established a wholly owned <b>subsidiary</b> in Munich.',
        ja: 'その日本のコングロマリットは、ミュンヘンに完全<b>子会社</b>を設立した。',
        trans: 'その日本のコングロマリットは、ミュンヘンに完全子会社を設立した。',
        used_form: 'subsidiary'
      },
      derivatives: [
        { word: 'subsidize', phonetic: '/ˈsʌbsɪdaɪz/', pos: 'V[T]', meaning: '助成金・補助金を支給する' }
      ],
      phrases: [
        { foreign: 'wholly owned subsidiary', ja: '完全子会社' }
      ]
    },
    {
      id: 'biz_stipulate',
      num: 9,
      word: 'stipulate',
      homographIndex: 1,
      phonetic: '/ˈstɪpjuleɪt/',
      grammar_forms: 'stipulates, stipulated, stipulating',
      category: 'ビジネス・契約法務',
      meanings: [
        { pos: 'V[T]', text: '（契約や協定で条件を）明記する、規定する、約定する' }
      ],
      core: '藁や棒（stipula）を折って堅固な合意を明確に形作ること。',
      etymology: 'ラテン語 stipulari（約束する）に由来。stips（堅固な）や契約締結時に棒を折った慣習に因む。印欧祖語 *steyp-（固い、密集した）に遡る。',
      etymologyConfidence: 'probable',
      etymologyTags: ['*steyp-'],
      history_note: '古代ローマ法の問答契約（stipulatio）に由来し、定式化された文言で厳格な債務関係を形成した。',
      example: {
        foreign: 'Clause 4 explicitly <b>stipulates</b> that intellectual property rights belong exclusively to the client.',
        ja: '第4条は、知的財産権が排他的にクライアントに帰属することを明確に<b>規定している</b>。',
        trans: '第4条は、知的財産権が排他的にクライアントに帰属することを明確に規定している。',
        used_form: 'stipulates'
      },
      derivatives: [
        { word: 'stipulation', phonetic: '/ˌstɪpjuˈleɪʃən/', pos: 'N[C]', meaning: '条項、約定、明文規定' }
      ],
      phrases: [
        { foreign: 'contractual stipulation', ja: '契約上の明記条項' }
      ]
    },
    {
      id: 'biz_benchmark',
      num: 10,
      word: 'benchmark',
      homographIndex: 1,
      phonetic: '/ˈbentʃmɑːk/',
      grammar_forms: 'benchmarks, benchmarked, benchmarking',
      category: 'ビジネス・経営指標',
      meanings: [
        { pos: 'N[C]', text: '基準、指標、ベンチマーク（比較評価の基準点）' },
        { pos: 'V[T]', text: '〜を基準と比較評価・測定する' }
      ],
      core: '測量台（bench）に水準器を固定するために刻んだ印（mark）。',
      etymology: '英語 bench（台）＋ mark（印）。印欧祖語 *bʰengh-（厚い、固い）および *merg-（境界、印）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*merg-'],
      history_note: '測量士の基準高度の刻み目から、業界最高水準（Best Practice）との比較評価手法へ発展。',
      example: {
        foreign: 'The portfolio manager used the S&P 500 index as the primary <b>benchmark</b> for fund performance.',
        ja: 'ポートフォリオ・マネージャーは、ファンド運用の主要な<b>比較基準（ベンチマーク）</b>としてS&P 500指数を採用した。',
        trans: 'ポートフォリオ・マネージャーは、ファンド運用の主要な比較基準（ベンチマーク）としてS&P 500指数を採用した。',
        used_form: 'benchmark'
      },
      derivatives: [
        { word: 'benchmarking', phonetic: '/ˈbentʃmɑːkɪŋ/', pos: 'N[U]', meaning: 'ベンチマーキング（比較評価手法）' }
      ],
      phrases: [
        { foreign: 'industry benchmark', ja: '業界標準指標' }
      ]
    },
    {
      id: 'biz_mitigate',
      num: 11,
      word: 'mitigate',
      homographIndex: 1,
      phonetic: '/ˈmɪtɪɡeɪt/',
      grammar_forms: 'mitigates, mitigated, mitigating',
      category: 'ビジネス・リスク管理',
      meanings: [
        { pos: 'V[T]', text: '（苦痛・損害・リスクなどを）和らげる、軽減する、緩和する' }
      ],
      core: '厳しく尖った状況を穏やか（mitis）な方向へ導き動かす（agere）こと。',
      etymology: 'ラテン語 mitigare（穏やかにする）に由来。mitis（穏やかな）＋ agere（導く、行う）から成り、印欧祖語 *mey-（穏やかな）および *aǵ-（駆動する）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*aǵ-'],
      history_note: '企業のリスクマネジメントにおいて、発生頻度や影響度を最小化する中核戦略。',
      example: {
        foreign: 'Hedging through currency forwards is an effective way to <b>mitigate</b> foreign exchange risk.',
        ja: '通貨先渡取引によるヘッジは、為替変動リスクを<b>軽減する</b>効果的な手法である。',
        trans: '通貨先渡取引によるヘッジは、為替変動リスクを軽減する効果的な手法である。',
        used_form: 'mitigate'
      },
      derivatives: [
        { word: 'mitigation', phonetic: '/ˌmɪtɪˈɡeɪʃən/', pos: 'N[U]', meaning: '軽減、緩和' }
      ],
      phrases: [
        { foreign: 'mitigate damages', ja: '損害を最小限に食い止める' }
      ]
    },
    {
      id: 'biz_arbitrary',
      num: 12,
      word: 'arbitrary',
      homographIndex: 1,
      phonetic: '/ˈɑːbɪtrəri/',
      grammar_forms: 'more arbitrary, most arbitrary',
      category: 'ビジネス・法務・ガバナンス',
      meanings: [
        { pos: 'Adj', text: '独断的な、専横な、恣意的な；任意の、ランダムな' }
      ],
      core: '客観的規範ではなく、第三者や裁定者（arbiter）の個人的裁量に委ねられていること。',
      etymology: 'ラテン語 arbitrarius（裁定者の判断に基づく）に由来。arbiter（見張り、証人、仲裁者）から派生し、印欧祖語 *bʰey-（行く）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*bʰey-'],
      history_note: '法治主義において、恣意的な行政処分や専横な解雇を防ぐための重要論点。',
      example: {
        foreign: 'The appellate court overturned the penalty, citing an <b>arbitrary</b> interpretation of labor law.',
        ja: '控訴裁判所は、労働法の<b>恣意的な（独断的な）</b>解釈を理由にその懲戒処分を破棄した。',
        trans: '控訴裁判所は、労働法の恣意的な（独断的な）解釈を理由にその懲戒処分を破棄した。',
        used_form: 'arbitrary'
      },
      derivatives: [
        { word: 'arbitrate', phonetic: '/ˈɑːbɪtreɪt/', pos: 'V[T, I]', meaning: '仲裁する' },
        { word: 'arbitrage', phonetic: '/ˈɑːbɪtrɑːʒ/', pos: 'N[U]', meaning: '裁定取引' }
      ],
      phrases: [
        { foreign: 'arbitrary decision', ja: '恣意的な判断' }
      ]
    },
    {
      id: 'biz_consolidate',
      num: 13,
      word: 'consolidate',
      homographIndex: 1,
      phonetic: '/kənˈsɒlɪdeɪt/',
      grammar_forms: 'consolidates, consolidated, consolidating',
      category: 'ビジネス・企業再編',
      meanings: [
        { pos: 'V[T]', text: '（事業や負債を）統合・集約する；強固にする、固める' },
        { pos: 'Adj', text: '【会計】連結の（consolidated）' }
      ],
      core: 'ばらばらな要素を一つに集めて（con-）硬く強固（solidus）に一体化させること。',
      etymology: 'ラテン語 consolidare（強固にする）に由来。con-（共に）＋ solidus（堅い、完全な）から成り、印欧祖語 *sol-（全体の、損なわれていない）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*sol-'],
      history_note: 'グループ企業全体の財政状態を開示する「連結財務諸表」の根幹概念。',
      example: {
        foreign: 'The corporation plans to <b>consolidate</b> its overseas manufacturing operations to cut fixed costs.',
        ja: '同社は固定費を削減するため、海外の製造拠点を<b>統合・集約する</b>計画である。',
        trans: '同社は固定費を削減するため、海外の製造拠点を統合・集約する計画である。',
        used_form: 'consolidate'
      },
      derivatives: [
        { word: 'consolidation', phonetic: '/kənˌsɒlɪˈdeɪʃən/', pos: 'N[U]', meaning: '整理統合、連結' }
      ],
      phrases: [
        { foreign: 'consolidated financial statements', ja: '連結財務諸表' }
      ]
    },
    {
      id: 'biz_fiscal',
      num: 14,
      word: 'fiscal',
      homographIndex: 1,
      phonetic: '/ˈfɪskəl/',
      grammar_forms: 'more fiscal, most fiscal',
      category: 'ビジネス・会計・財政',
      meanings: [
        { pos: 'Adj', text: '財政の、会計の、歳入の' }
      ],
      core: '国家や支配者が徴収した硬貨を蓄える編みカゴ（fiscus）。',
      etymology: 'ラテン語 fiscalis（国庫の）に由来。名詞 fiscus（編みカゴ、金庫、公金）から派生し、印欧祖語 *bʰidʰ-（編む、結ぶ）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*bʰidʰ-'],
      history_note: '初代ローマ皇帝アウグストゥスが創設した皇帝金庫（fiscus）が原義。',
      example: {
        foreign: 'Operating revenue exceeded forecast by 12% in the final quarter of the <b>fiscal</b> year.',
        ja: '本<b>会計</b>年度の第4四半期において、営業収益は予想を12%上回った。',
        trans: '本会計年度の第4四半期において、営業収益は予想を12%上回った。',
        used_form: 'fiscal'
      },
      derivatives: [
        { word: 'confiscate', phonetic: '/ˈkɒnfɪskeɪt/', pos: 'V[T]', meaning: '没収する' }
      ],
      phrases: [
        { foreign: 'fiscal year', ja: '会計年度 (FY)' },
        { foreign: 'fiscal stimulus', ja: '財政出動' }
      ]
    },
    {
      id: 'biz_default',
      num: 15,
      word: 'default',
      homographIndex: 1,
      phonetic: '/dɪˈfɔːlt/',
      grammar_forms: 'defaults, defaulted, defaulting',
      category: 'ビジネス・信用取引',
      meanings: [
        { pos: 'N[C, U]', text: '債務不履行、デフォルト；怠慢、不履行；初期設定値' },
        { pos: 'V[I]', text: '（債務や支払いを）不履行にする' }
      ],
      core: '果たすべき義務から完全に（de-）脱落して過つ（fallere）こと。',
      etymology: '古フランス語 defaut（不足、過失）に由来。de-（完全に）＋ fallere（欺く、落ち度がある）から成り、印欧祖語 *gʷʰal-（倒れる、過つ）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*gʷʰal-'],
      history_note: '債券市場における信用格付け低下やデフォルト危機から、ITの初期設定（デフォルト）へ派生。',
      example: {
        foreign: 'The sovereign nation risked a debt <b>default</b> unless bailout negotiations concluded promptly.',
        ja: '救済交渉が速やかに妥結しない限り、その主権国家は債務<b>不履行（デフォルト）</b>の危機に瀕していた。',
        trans: '救済交渉が速やかに妥結しない限り、その主権国家は債務不履行（デフォルト）の危機に瀕していた。',
        used_form: 'default'
      },
      derivatives: [
        { word: 'defaulter', phonetic: '/dɪˈfɔːltər/', pos: 'N[C]', meaning: '債務不履行者' }
      ],
      phrases: [
        { foreign: 'in default of', ja: '〜を怠って、〜がないために' }
      ]
    },
    {
      id: 'biz_delegate',
      num: 16,
      word: 'delegate',
      homographIndex: 1,
      phonetic: '/ˈdelɪɡət/',
      grammar_forms: 'delegates, delegated, delegating',
      category: 'ビジネス・組織論',
      meanings: [
        { pos: 'V[T]', text: '（権限や職務を）委任する、委託する、委譲する' },
        { pos: 'N[C]', text: '代表者、派遣委員' }
      ],
      core: '法律や公的使節として（legare）権能を他者に預け送ること。',
      etymology: 'ラテン語 delegare（任命して送る）に由来。de-（〜から）＋ legare（特使として派遣する；lex「法」と同系）から成り、印欧祖語 *leǵ-（集める、選ぶ）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*leǵ-'],
      history_note: 'マネジメント論における「権限移譲（delegation）」は組織スケーラビリティの最重要原則。',
      example: {
        foreign: 'The Chief Executive decided to <b>delegate</b> operational responsibilities to the regional directors.',
        ja: '最高経営責任者は、業務執行責任を地域担当ディレクターに<b>委任する（委譲する）</b>ことを決めた。',
        trans: '最高経営責任者は、業務執行責任を地域担当ディレクターに委任する（委譲する）ことを決めた。',
        used_form: 'delegate'
      },
      derivatives: [
        { word: 'delegation', phonetic: '/ˌdelɪˈɡeɪʃən/', pos: 'N[U, C]', meaning: '権限委譲；代表団' }
      ],
      phrases: [
        { foreign: 'delegate authority', ja: '権限を委譲する' }
      ]
    },
    {
      id: 'biz_redundant',
      num: 17,
      word: 'redundant',
      homographIndex: 1,
      phonetic: '/rɪˈdʌndənt/',
      grammar_forms: 'more redundant, most redundant',
      category: 'ビジネス・人事・工学',
      meanings: [
        { pos: 'Adj', text: '余剰の、不要となった；（英国）人員削減された；冗長な' }
      ],
      core: '水が再び（re-）波打って（undare）器から溢れ出ること。',
      etymology: 'ラテン語 redundans（溢れ出る）に由来。re-（再び）＋ undare（波立つ；名詞 unda「波」）から成り、印欧祖語 *wed-（水）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*wed-'],
      history_note: '英連邦の労働法において整理解雇（redundancy）を表す標準法用語。',
      example: {
        foreign: 'Post-merger restructuring made several duplicate administrative roles <b>redundant</b>.',
        ja: '合併後の組織再編に伴い、重複していた複数の管理業務ポジションが<b>余剰（人員削減対象）</b>となった。',
        trans: '合併後の組織再編に伴い、重複していた複数の管理業務ポジションが余剰（人員削減対象）となった。',
        used_form: 'redundant'
      },
      derivatives: [
        { word: 'redundancy', phonetic: '/rɪˈdʌndənsi/', pos: 'N[U, C]', meaning: '余剰人員、冗長性' }
      ],
      phrases: [
        { foreign: 'make redundant', ja: '人員削減・解雇する' }
      ]
    },
    {
      id: 'biz_procure',
      num: 18,
      word: 'procure',
      homographIndex: 1,
      phonetic: '/prəˈkjʊər/',
      grammar_forms: 'procures, procured, procuring',
      category: 'ビジネス・調達・購買',
      meanings: [
        { pos: 'V[T]', text: '（努力や交渉によって物資や資金を）調達する、確保する' }
      ],
      core: '前もって（pro-）周到に配慮と世話（curare）を行き届かせること。',
      etymology: 'ラテン語 procurare（管理する、配慮する）に由来。pro-（前もって）＋ curare（世話する；名詞 cura「配慮」）から成り、印欧祖語 *kʷeys-（注意を払う）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*kʷeys-'],
      history_note: '古代軍の兵站調達から現代サプライチェーンの「購買調達（procurement）」へ発展。',
      example: {
        foreign: 'The aerospace manufacturer struggled to <b>procure</b> specialized titanium alloys during the embargo.',
        ja: 'その航空宇宙メーカーは、禁輸措置の期間中に特殊チタン合金を<b>調達する</b>のに苦心した。',
        trans: 'その航空宇宙メーカーは、禁輸措置の期間中に特殊チタン合金を調達するのに苦心した。',
        used_form: 'procure'
      },
      derivatives: [
        { word: 'procurement', phonetic: '/prəˈkjʊəmənt/', pos: 'N[U]', meaning: '調達、購買' }
      ],
      phrases: [
        { foreign: 'procure raw materials', ja: '原材料を調達する' }
      ]
    },
    {
      id: 'biz_insolvent',
      num: 19,
      word: 'insolvent',
      homographIndex: 1,
      phonetic: '/ɪnˈsɒlvənt/',
      grammar_forms: 'more insolvent, most insolvent',
      category: 'ビジネス・倒産法務',
      meanings: [
        { pos: 'Adj', text: '破産した、支払不能の、債務超過の' },
        { pos: 'N[C]', text: '支払不能者、破産者' }
      ],
      core: '結び目や借金を解いて決済（solvere）することができない（in-）状態。',
      etymology: 'ラテン語 in-（否定）＋ solvens（支払う、解く；動詞 solvere）から成り、印欧祖語 *leu-（解く、解放する）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*leu-'],
      history_note: '債務者が弁済期にある債務を一般的な弁済能力の欠如により弁済できない状態を指す破産法の中核概念。',
      example: {
        foreign: 'Trading in the commercial bank\'s shares was halted after auditors warned it was effectively <b>insolvent</b>.',
        ja: '監査人が同商業銀行の実質的な<b>支払不能（破産状態）</b>を警告したことを受け、株式の取引が停止された。',
        trans: '監査人が同商業銀行の実質的な支払不能（破産状態）を警告したことを受け、株式の取引が停止された。',
        used_form: 'insolvent'
      },
      derivatives: [
        { word: 'insolvency', phonetic: '/ɪnˈsɒlvənsi/', pos: 'N[U]', meaning: '支払不能、倒産状態' }
      ],
      phrases: [
        { foreign: 'declare insolvent', ja: '支払不能を宣言する' }
      ]
    },
    {
      id: 'biz_remuneration',
      num: 20,
      word: 'remuneration',
      homographIndex: 1,
      phonetic: '/rɪˌmjuːnəˈreɪʃən/',
      grammar_forms: 'pl. remunerations',
      category: 'ビジネス・人事・役員報酬',
      meanings: [
        { pos: 'N[U, C]', text: '報酬、給与、手当、謝礼' }
      ],
      core: '提供された労務に対し、返礼として贈り物や対価（munus）を手渡すこと。',
      etymology: 'ラテン語 remunerari（報いる）に由来。re-（返礼として）＋ munerari（贈る；名詞 munus「贈り物、義務」）から成り、印欧祖語 *mey-（交換する）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*mey-'],
      history_note: 'コーポレートガバナンスにおける「役員報酬委員会（Remuneration Committee）」の定型法制用語。',
      example: {
        foreign: 'Shareholders voted down the proposed executive <b>remuneration</b> package at the annual general meeting.',
        ja: '定時株主総会において、株主たちは提案された役員<b>報酬</b>パッケージを否決した。',
        trans: '定時株主総会において、株主たちは提案された役員報酬パッケージを否決した。',
        used_form: 'remuneration'
      },
      derivatives: [
        { word: 'remunerate', phonetic: '/rɪˈmjuːnəreɪt/', pos: 'V[T]', meaning: '〜に報酬を支払う' }
      ],
      phrases: [
        { foreign: 'remuneration package', ja: '報酬パッケージ' }
      ]
    }
  ];

  const EN_JA_STARTER_ESSENTIAL = [
    {
      id: 'ess_inspect',
      num: 1,
      word: 'inspect',
      homographIndex: 1,
      phonetic: '/ɪnˈspekt/',
      grammar_forms: 'inspects, inspected, inspecting',
      category: '語根 *speḱ- (見る)',
      meanings: [
        { pos: 'V[T]', text: '（詳しく）検査する、点検する、視察する' }
      ],
      core: '対象の内側に深く視線（spect）を入れて調べること。',
      etymology: 'ラテン語 inspicere（中を見る）に由来。in-（中に）＋ specere（見る）から成り、印欧祖語 *speḱ-（見る、観察する）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*speḱ-'],
      history_note: '印欧語根 *speḱ-（見る）から生まれた代表語群の一つ。内部を凝視する動作を表す。',
      example: {
        foreign: 'Customs officials carefully <b>inspect</b> every imported cargo crate.',
        ja: '税関職員は、すべての輸入貨物木箱を入念に<b>検査する</b>。',
        trans: '税関職員は、すべての輸入貨物木箱を入念に検査する。',
        used_form: 'inspect'
      },
      derivatives: [
        { word: 'inspection', phonetic: '/ɪnˈspekʃən/', pos: 'N[C, U]', meaning: '検査、視察' },
        { word: 'inspector', phonetic: '/ɪnˈspektər/', pos: 'N[C]', meaning: '検査官、警部' }
      ],
      phrases: [
        { foreign: 'inspect closely', ja: '綿密に点検する' }
      ]
    },
    {
      id: 'ess_respect',
      num: 2,
      word: 'respect',
      homographIndex: 1,
      phonetic: '/rɪˈspekt/',
      grammar_forms: 'respects, respected, respecting',
      category: '語根 *speḱ- (見る)',
      meanings: [
        { pos: 'V[T]', text: '尊敬する、尊重する、配慮する' },
        { pos: 'N[U, C]', text: '敬意、尊敬；点、箇所' }
      ],
      core: '通り過ぎずに立ち止まり、何度も後ろを振り返って丁寧に見つめる（spect）こと。',
      etymology: 'ラテン語 respicere（振り返る、配慮する）に由来。re-（再び、後ろへ）＋ specere（見る）から成り、印欧祖語 *speḱ-（見る）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*speḱ-'],
      history_note: '単にすれ違うのではなく、足を止めて「二度見する」ほどの畏敬と配慮が原義。',
      example: {
        foreign: 'Scholars deeply <b>respect</b> the foundational discoveries of early astronomers.',
        ja: '学者たちは、初期の天文学者たちの基礎的な発見を深く<b>尊敬・尊重している</b>。',
        trans: '学者たちは、初期の天文学者たちの基礎的な発見を深く尊敬・尊重している。',
        used_form: 'respect'
      },
      derivatives: [
        { word: 'respectful', phonetic: '/rɪˈspektfəl/', pos: 'Adj', meaning: '礼儀正しい、敬意を表す' },
        { word: 'respective', phonetic: '/rɪˈspektɪv/', pos: 'Adj', meaning: 'それぞれの、各自の' }
      ],
      phrases: [
        { foreign: 'with respect to', ja: '〜に関して' }
      ]
    },
    {
      id: 'ess_prospect',
      num: 3,
      word: 'prospect',
      homographIndex: 1,
      phonetic: '/ˈprɒspekt/',
      grammar_forms: 'pl. prospects',
      category: '語根 *speḱ- (見る)',
      meanings: [
        { pos: 'N[C]', text: '見込み、展望、期待；見晴らし、眺望' },
        { pos: 'V[I]', text: '（鉱山や金鉱を）試掘する、探鉱する' }
      ],
      core: '遥か遠くの前方（pro-）を見渡す（spect）こと。',
      etymology: 'ラテン語 prospicere（前方を眺める）に由来。pro-（前方へ）＋ specere（見る）から成り、印欧祖語 *speḱ-（見る）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*speḱ-'],
      history_note: 'ゴールドラッシュ時代の「山師・探鉱者（prospector）」から、ビジネスの将来展望へ展開。',
      example: {
        foreign: 'The long-term <b>prospect</b> for clean hydrogen energy has attracted massive investment.',
        ja: 'クリーンな水素エネルギーの長期的な<b>展望（見込み）</b>は、巨額の投資を引き寄せている。',
        trans: 'クリーンな水素エネルギーの長期的な展望（見込み）は、巨額の投資を引き寄せている。',
        used_form: 'prospect'
      },
      derivatives: [
        { word: 'prospective', phonetic: '/prəˈspektɪv/', pos: 'Adj', meaning: '見込みのある、将来の' }
      ],
      phrases: [
        { foreign: 'career prospects', ja: 'キャリアの将来性' }
      ]
    },
    {
      id: 'ess_suspect',
      num: 4,
      word: 'suspect',
      homographIndex: 1,
      phonetic: '/səˈspekt/',
      grammar_forms: 'suspects, suspected, suspecting',
      category: '語根 *speḱ- (見る)',
      meanings: [
        { pos: 'V[T]', text: '（悪事や真実を）〜ではないかと疑う、怪しむ' },
        { pos: 'N[C]', text: '容疑者、被疑者' },
        { pos: 'Adj', text: '怪しい、不審な' }
      ],
      core: '下から（sub-）斜めに疑いの目を向けて見上げる（spect）こと。',
      etymology: 'ラテン語 suspicere（下から見上げる、怪しむ）に由来。sub-（下に）＋ specere（見る）から成り、印欧祖語 *speḱ-（見る）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*speḱ-'],
      history_note: 'まっすぐ正視せず、眉をひそめて下から相手の挙動を監視する姿勢が原義。',
      example: {
        foreign: 'Epidemiologists <b>suspect</b> that the virus underwent mutation during the winter surge.',
        ja: '疫学者たちは、冬の感染拡大期にウイルスが変異を起こしたのではないかと<b>疑っている</b>。',
        trans: '疫学者たちは、冬の感染拡大期にウイルスが変異を起こしたのではないかと疑っている。',
        used_form: 'suspect'
      },
      derivatives: [
        { word: 'suspicion', phonetic: '/səˈspɪʃən/', pos: 'N[U, C]', meaning: '容疑、疑惑' },
        { word: 'suspicious', phonetic: '/səˈspɪʃəs/', pos: 'Adj', meaning: '疑わしい、怪しい' }
      ],
      phrases: [
        { foreign: 'prime suspect', ja: '最重要容疑者' }
      ]
    },
    {
      id: 'ess_predict',
      num: 5,
      word: 'predict',
      homographIndex: 1,
      phonetic: '/prɪˈdɪkt/',
      grammar_forms: 'predicts, predicted, predicting',
      category: '語根 *deyk- (示す・言う)',
      meanings: [
        { pos: 'V[T]', text: '予言する、予測する、予報する' }
      ],
      core: '出来事が起こる前に（pre-）あらかじめ言葉で告げる（dict）こと。',
      etymology: 'ラテン語 praedicere（事前に告げる）に由来。prae-（前に）＋ dicere（言う）から成り、印欧祖語 *deyk-（示す、言う）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*deyk-'],
      history_note: '印欧語根 *deyk-（指し示す、言う）はラテン語 dicere（言う）やギリシャ語 deiknynai（示す）の源流。',
      example: {
        foreign: 'Meteorologists can now <b>predict</b> typhoon trajectories with remarkable precision.',
        ja: '気象学者たちは今や、目覚ましい精度で台風の進路を<b>予測する</b>ことができる。',
        trans: '気象学者たちは今や、目覚ましい精度で台風の進路を予測することができる。',
        used_form: 'predict'
      },
      derivatives: [
        { word: 'prediction', phonetic: '/prɪˈdɪkʃən/', pos: 'N[C, U]', meaning: '予言、予測' },
        { word: 'predictable', phonetic: '/prɪˈdɪktəbəl/', pos: 'Adj', meaning: '予測可能な' }
      ],
      phrases: [
        { foreign: 'hard to predict', ja: '予測が困難な' }
      ]
    },
    {
      id: 'ess_dictate',
      num: 6,
      word: 'dictate',
      homographIndex: 1,
      phonetic: '/dɪkˈteɪt/',
      grammar_forms: 'dictates, dictated, dictating',
      category: '語根 *deyk- (示す・言う)',
      meanings: [
        { pos: 'V[T, I]', text: '口述する、書き取らせる；指図する、命じる、決定づける' },
        { pos: 'N[C]', text: '（理性や良心の）命令、規範' }
      ],
      core: '言葉を強く繰り返し告げ（dictare）、相手に従わせること。',
      etymology: 'ラテン語 dictare（繰り返し言う、命令する）に由来。dicere（言う）の頻愛動詞で、印欧祖語 *deyk-（示す、言う）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*deyk-'],
      history_note: '古代ローマの独裁官（dictator）は非常時に全権を委ねられ、口頭の命令（dictatum）がそのまま法となった。',
      example: {
        foreign: 'Pragmatic commercial considerations ultimately <b>dictated</b> the choice of hardware vendor.',
        ja: '実用的な商業上の考慮が、最終的にハードウェア選定を<b>決定づけた</b>。',
        trans: '実用的な商業上の考慮が、最終的にハードウェア選定を決定づけた。',
        used_form: 'dictated'
      },
      derivatives: [
        { word: 'dictation', phonetic: '/dɪkˈteɪʃən/', pos: 'N[U]', meaning: '口述筆記、指図' },
        { word: 'dictator', phonetic: '/dɪkˈteɪtər/', pos: 'N[C]', meaning: '独裁者' }
      ],
      phrases: [
        { foreign: 'dictates of reason', ja: '理性の命ずるところ' }
      ]
    },
    {
      id: 'ess_contradict',
      num: 7,
      word: 'contradict',
      homographIndex: 1,
      phonetic: '/ˌkɒntrəˈdɪkt/',
      grammar_forms: 'contradicts, contradicted, contradicting',
      category: '語根 *deyk- (示す・言う)',
      meanings: [
        { pos: 'V[T]', text: '〜と矛盾する、食い違う；〜に反対を唱える、反駁する' }
      ],
      core: '相手の言葉に対して真っ向から反対を（contra-）告げる（dict）こと。',
      etymology: 'ラテン語 contradicere（反対を言う）に由来。contra-（反対に）＋ dicere（言う）から成り、印欧祖語 *deyk-（示す、言う）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*deyk-'],
      history_note: 'アリストテレス論理学における「矛盾律（law of non-contradiction）」の西洋思想的基盤。',
      example: {
        foreign: 'The new experimental observations directly <b>contradict</b> the prevailing classical theorem.',
        ja: '新たな実験的観測結果は、支配的な古典的定理と真っ向から<b>矛盾している</b>。',
        trans: '新たな実験的観測結果は、支配的な古典的定理と真っ向から矛盾している。',
        used_form: 'contradict'
      },
      derivatives: [
        { word: 'contradiction', phonetic: '/ˌkɒntrəˈdɪkʃən/', pos: 'N[C, U]', meaning: '矛盾、反対論' },
        { word: 'contradictory', phonetic: '/ˌkɒntrəˈdɪktəri/', pos: 'Adj', meaning: '矛盾した' }
      ],
      phrases: [
        { foreign: 'contradict oneself', ja: '言っていることが自己矛盾する' }
      ]
    },
    {
      id: 'ess_verdict',
      num: 8,
      word: 'verdict',
      homographIndex: 1,
      phonetic: '/ˈvɜːdɪkt/',
      grammar_forms: 'pl. verdicts',
      category: '語根 *deyk- (示す・言う)',
      meanings: [
        { pos: 'N[C]', text: '（陪審員の）評決、判定；下された判断、決定' }
      ],
      core: '真実（verus）を正しく告げられた（dictum）言葉。',
      etymology: 'アングロ＝フランス語 verdit（真実を言ったこと）に由来。ラテン語 vere（真実に）＋ dictum（言われたこと；dicereの過去分詞）から成り、印欧祖語 *deyk-（示す、言う）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*deyk-'],
      history_note: '中世英国の陪審制度において、陪審員団が宣誓の上で述べる真実の言明が原義。',
      example: {
        foreign: 'The jury deliberated for three days before reaching a unanimous guilty <b>verdict</b>.',
        ja: '陪審団は3日間にわたって審理を重ね、全員一致の有罪<b>評決</b>に達した。',
        trans: '陪審団は3日間にわたって審理を重ね、全員一致の有罪評決に達した。',
        used_form: 'verdict'
      },
      derivatives: [
        { word: 'dictum', phonetic: '/ˈdɪktəm/', pos: 'N[C]', meaning: '格言、公式言明' }
      ],
      phrases: [
        { foreign: 'deliver a verdict', ja: '評決を下す' }
      ]
    },
    {
      id: 'ess_export',
      num: 9,
      word: 'export',
      homographIndex: 1,
      phonetic: '/ɪkˈspɔːt/',
      grammar_forms: 'exports, exported, exporting',
      category: '語根 *per- (運ぶ・通す)',
      meanings: [
        { pos: 'V[T]', text: '輸出する；（思想やデータを）他所へ持ち出す' },
        { pos: 'N[C, U]', text: '輸出品、輸出' }
      ],
      core: '港や国境の外へ（ex-）物資を運ぶ（portare）こと。',
      etymology: 'ラテン語 exportare（運び出す）に由来。ex-（外へ）＋ portare（運ぶ）から成り、印欧祖語 *per-（通す、運ぶ）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*per-'],
      history_note: '印欧語根 *per-（向こう側へ通す・運ぶ）は港（port）や携帯（portable）の基礎語。',
      example: {
        foreign: 'Leading tech nations <b>export</b> sophisticated semiconductor fabrication tools.',
        ja: '主要な技術立国は、高度な半導体製造装置を<b>輸出している</b>。',
        trans: '主要な技術立国は、高度な半導体製造装置を輸出している。',
        used_form: 'export'
      },
      derivatives: [
        { word: 'exporter', phonetic: '/ɪkˈspɔːtər/', pos: 'N[C]', meaning: '輸出業者' },
        { word: 'exportation', phonetic: '/ˌekspɔːˈteɪʃən/', pos: 'N[U]', meaning: '輸出業務' }
      ],
      phrases: [
        { foreign: 'export controls', ja: '輸出規制' }
      ]
    },
    {
      id: 'ess_transport',
      num: 10,
      word: 'transport',
      homographIndex: 1,
      phonetic: '/trænˈspɔːt/',
      grammar_forms: 'transports, transported, transporting',
      category: '語根 *per- (運ぶ・通す)',
      meanings: [
        { pos: 'V[T]', text: '輸送する、運ぶ、移送する' },
        { pos: 'N[U]', text: '輸送、交通機関、運送' }
      ],
      core: '海や国境の向こう側へ（trans-）人や貨物を運ぶ（portare）こと。',
      etymology: 'ラテン語 transportare（向こう側へ運ぶ）に由来。trans-（越えて）＋ portare（運ぶ）から成り、印欧祖語 *per-（通す、運ぶ）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*per-'],
      history_note: '大航海時代以降のグローバル物流インフラの概念的中核。',
      example: {
        foreign: 'Cargo trains <b>transport</b> agricultural grains across thousands of miles daily.',
        ja: '貨物列車は、毎日数千マイルにわたって農産穀物を<b>輸送している</b>。',
        trans: '貨物列車は、毎日数千マイルにわたって農産穀物を輸送している。',
        used_form: 'transport'
      },
      derivatives: [
        { word: 'transportation', phonetic: '/ˌtrænspɔːˈteɪʃən/', pos: 'N[U]', meaning: '交通機関、輸送' }
      ],
      phrases: [
        { foreign: 'public transport', ja: '公共交通機関' }
      ]
    },
    {
      id: 'ess_support',
      num: 11,
      word: 'support',
      homographIndex: 1,
      phonetic: '/səˈpɔːt/',
      grammar_forms: 'supports, supported, supporting',
      category: '語根 *per- (運ぶ・通す)',
      meanings: [
        { pos: 'V[T]', text: '支持する、支える；扶養する；裏付ける' },
        { pos: 'N[U]', text: '支持、支援、扶養；支柱' }
      ],
      core: '下から（sub-）重荷を抱えて持ち上げ運ぶ（portare）こと。',
      etymology: 'ラテン語 supportare（下から支え運ぶ）に由来。sub-（下に）＋ portare（運ぶ）から成り、印欧祖語 *per-（通す、運ぶ）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*per-'],
      history_note: '物理的な建築支柱の役割から、精神的・理論的・経済的支援の概念へ拡張。',
      example: {
        foreign: 'Peer-reviewed clinical trials strongly <b>support</b> the efficacy of the novel therapeutic.',
        ja: '査読済みの臨床試験は、その新規治療薬の有効性を強力に<b>裏付けている（支持している）</b>。',
        trans: '査読済みの臨床試験は、その新規治療薬の有効性を強力に裏付けている（支持している）。',
        used_form: 'support'
      },
      derivatives: [
        { word: 'supporter', phonetic: '/səˈpɔːtər/', pos: 'N[C]', meaning: '支持者' },
        { word: 'supportive', phonetic: '/səˈpɔːtɪv/', pos: 'Adj', meaning: '協力的な' }
      ],
      phrases: [
        { foreign: 'in support of', ja: '〜を支持して' }
      ]
    },
    {
      id: 'ess_portable',
      num: 12,
      word: 'portable',
      homographIndex: 1,
      phonetic: '/ˈpɔːtəbəl/',
      grammar_forms: 'more portable, most portable',
      category: '語根 *per- (運ぶ・通す)',
      meanings: [
        { pos: 'Adj', text: '携帯できる、持ち運び可能な、ポータブルな' },
        { pos: 'N[C]', text: '携帯型器具、ポータブル機器' }
      ],
      core: '手で軽々と運ぶ（portare）ことができる（-able）性質。',
      etymology: '後期ラテン語 portabilis（運べる）に由来。portare（運ぶ）＋ -bilis（可能）から成り、印欧祖語 *per-（通す、運ぶ）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*per-'],
      history_note: '1970年代以降のパーソナルコンピュータや携帯電話の進化を象徴する形容詞。',
      example: {
        foreign: 'Engineers designed a highly <b>portable</b> ultrasound device for rural emergency clinics.',
        ja: '技術者たちは、過疎地の緊急診療所向けに極めて<b>持ち運び可能な（小型携帯型）</b>超音波診断装置を設計した。',
        trans: '技術者たちは、過疎地の緊急診療所向けに極めて持ち運び可能な（小型携帯型）超音波診断装置を設計した。',
        used_form: 'portable'
      },
      derivatives: [
        { word: 'portability', phonetic: '/ˌpɔːtəˈbɪləti/', pos: 'N[U]', meaning: '携帯性、移植性' }
      ],
      phrases: [
        { foreign: 'portable document format', ja: 'ポータブル・ドキュメント・フォーマット (PDF)' }
      ]
    },
    {
      id: 'ess_admit',
      num: 13,
      word: 'admit',
      homographIndex: 1,
      phonetic: '/ədˈmɪt/',
      grammar_forms: 'admits, admitted, admitting',
      category: '語根 *mey- (送る・放つ)',
      meanings: [
        { pos: 'V[T]', text: '（事実や過失を）認める、自白する；（入場や入学を）許可する' }
      ],
      core: '門や心の内側へと（ad-）人や物を通し送る（mittere）こと。',
      etymology: 'ラテン語 admittere（受け入れる、送る）に由来。ad-（〜へ）＋ mittere（送る、放つ）から成り、印欧祖語 *mey-（動かす、送る）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*mey-'],
      history_note: 'ラテン語 mittere（送る）は英語の mission, transmit, permit などの大語族を形成。',
      example: {
        foreign: 'The spokesperson frankly <b>admitted</b> that mistakes had been made during initial rollout.',
        ja: '報道担当者は、初期リリースの段階で手落ちがあったことを率直に<b>認めた</b>。',
        trans: '報道担当者は、初期リリースの段階で手落ちがあったことを率直に認めた。',
        used_form: 'admitted'
      },
      derivatives: [
        { word: 'admission', phonetic: '/ədˈmɪʃən/', pos: 'N[U, C]', meaning: '入場許可、自認' },
        { word: 'admittance', phonetic: '/ədˈmɪtəns/', pos: 'N[U]', meaning: '入場許可' }
      ],
      phrases: [
        { foreign: 'admit defeat', ja: '敗北を認める' }
      ]
    },
    {
      id: 'ess_transmit',
      num: 14,
      word: 'transmit',
      homographIndex: 1,
      phonetic: '/trænzˈmɪt/',
      grammar_forms: 'transmits, transmitted, transmitting',
      category: '語根 *mey- (送る・放つ)',
      meanings: [
        { pos: 'V[T]', text: '（電波・信号・データを）送信する、伝送する；（病気や熱を）伝染・伝達する' }
      ],
      core: '空間や媒体を横切って（trans-）信号を遠くへ送る（mittere）こと。',
      etymology: 'ラテン語 transmittere（向こう側へ送る）に由来。trans-（越えて）＋ mittere（送る）から成り、印欧祖語 *mey-（動かす、送る）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*mey-'],
      history_note: '電信（テレグラフ）や電波通信の黎明期において工学の基幹概念として確立。',
      example: {
        foreign: 'Optical fiber networks <b>transmit</b> petabytes of information under the ocean in seconds.',
        ja: '海底光ファイバー網は、数秒でペタバイト規模の情報を大洋を越えて<b>伝送している</b>。',
        trans: '海底光ファイバー網は、数秒でペタバイト規模の情報を大洋を越えて伝送している。',
        used_form: 'transmit'
      },
      derivatives: [
        { word: 'transmission', phonetic: '/trænzˈmɪʃən/', pos: 'N[U, C]', meaning: '伝送、送信；変速機' },
        { word: 'transmitter', phonetic: '/trænzˈmɪtər/', pos: 'N[C]', meaning: '送信機' }
      ],
      phrases: [
        { foreign: 'transmit disease', ja: '病気を媒介・感染させる' }
      ]
    },
    {
      id: 'ess_emit',
      num: 15,
      word: 'emit',
      homographIndex: 1,
      phonetic: '/ɪˈmɪt/',
      grammar_forms: 'emits, emitted, emitting',
      category: '語根 *mey- (送る・放つ)',
      meanings: [
        { pos: 'V[T]', text: '（光・熱・気体・音などを）放出する、放射する、発する' }
      ],
      core: '内側から外へと（ex-）気体やエネルギーを放ち送る（mittere）こと。',
      etymology: 'ラテン語 emittere（外へ放つ）に由来。e-（外へ）＋ mittere（送る）から成り、印欧祖語 *mey-（動かす、送る）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*mey-'],
      history_note: '物理学における光子放出や環境問題の温室効果ガス排出量（carbon emission）の中核語。',
      example: {
        foreign: 'Certain deep-sea organisms <b>emit</b> bioluminescent blue light to deter predators.',
        ja: '特定の深海生物は、捕食者を威嚇するために生物発光による青い光を<b>放つ</b>。',
        trans: '特定の深海生物は、捕食者を威嚇するために生物発光による青い光を放つ。',
        used_form: 'emit'
      },
      derivatives: [
        { word: 'emission', phonetic: '/ɪˈmɪʃən/', pos: 'N[C, U]', meaning: '排出、放出物' },
        { word: 'emitter', phonetic: '/ɪˈmɪtər/', pos: 'N[C]', meaning: '放射体、エミッタ' }
      ],
      phrases: [
        { foreign: 'zero-emission vehicle', ja: 'ゼロエミッション車' }
      ]
    },
    {
      id: 'ess_submit',
      num: 16,
      word: 'submit',
      homographIndex: 1,
      phonetic: '/səbˈmɪt/',
      grammar_forms: 'submits, submitted, submitting',
      category: '語根 *mey- (送る・放つ)',
      meanings: [
        { pos: 'V[T]', text: '（書類や提案を）提出する；服従させる' },
        { pos: 'V[I]', text: '屈服する、従う' }
      ],
      core: '頭を低く下げて下から（sub-）相手の前に差し出し送る（mittere）こと。',
      etymology: 'ラテン語 submittere（下に置く、譲る）に由来。sub-（下に）＋ mittere（送る）から成り、印欧祖語 *mey-（動かす、送る）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*mey-'],
      history_note: '封建制における服従の誓いから、近代学術論文や行政申請書の提出へ意味が転化。',
      example: {
        foreign: 'Researchers must <b>submit</b> their experimental grant proposals by Friday midnight.',
        ja: '研究者たちは、金曜日の深夜までに実験助成金申請書を<b>提出しなければならない</b>。',
        trans: '研究者たちは、金曜日の深夜までに実験助成金申請書を提出しなければならない。',
        used_form: 'submit'
      },
      derivatives: [
        { word: 'submission', phonetic: '/səbˈmɪʃən/', pos: 'N[U, C]', meaning: '提出、提出物；服従' },
        { word: 'submissive', phonetic: '/səbˈmɪsɪv/', pos: 'Adj', meaning: '従順な' }
      ],
      phrases: [
        { foreign: 'submit to authority', ja: '権威に服従する' }
      ]
    },
    {
      id: 'ess_retain',
      num: 17,
      word: 'retain',
      homographIndex: 1,
      phonetic: '/rɪˈteɪn/',
      grammar_forms: 'retains, retained, retaining',
      category: '語根 *ten- (伸ばす・保つ)',
      meanings: [
        { pos: 'V[T]', text: '（手元に）保持する、維持する；記憶に留める；（弁護士を）雇っておく' }
      ],
      core: '離れて行かないよう、手元に引き留めて保ち続ける（tenere）こと。',
      etymology: 'ラテン語 retinere（引き留める）に由来。re-（後ろに、留めて）＋ tenere（保つ、握る）から成り、印欧祖語 *ten-（伸ばす、保つ）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*ten-'],
      history_note: '印欧語根 *ten-（ピンと張る、保つ）はラテン語 tenere（保つ）を通じて広大な語族を形成。',
      example: {
        foreign: 'Spaced repetition algorithms help learners <b>retain</b> vocabulary for decades.',
        ja: '間隔反復アルゴリズムは、学習者が語彙を数十年間にわたって<b>記憶に留める（保持する）</b>のを助ける。',
        trans: '間隔反復アルゴリズムは、学習者が語彙を数十年間にわたって記憶に留める（保持する）のを助ける。',
        used_form: 'retain'
      },
      derivatives: [
        { word: 'retention', phonetic: '/rɪˈtenʃən/', pos: 'N[U]', meaning: '保持、記憶定着' },
        { word: 'retainer', phonetic: '/rɪˈteɪnər/', pos: 'N[C]', meaning: '顧問料、保持具' }
      ],
      phrases: [
        { foreign: 'retain information', ja: '情報を記憶に留める' }
      ]
    },
    {
      id: 'ess_contain',
      num: 18,
      word: 'contain',
      homographIndex: 1,
      phonetic: '/kənˈteɪn/',
      grammar_forms: 'contains, contained, containing',
      category: '語根 *ten- (伸ばす・保つ)',
      meanings: [
        { pos: 'V[T]', text: '（内容として）含む、収容する；（感染症や感情を）封じ込める、抑制する' }
      ],
      core: '外に漏れ出さないよう、枠の中で共に（con-）しっかりと保持する（tenere）こと。',
      etymology: 'ラテン語 continere（共に保つ、抑える）に由来。con-（共に）＋ tenere（保つ）から成り、印欧祖語 *ten-（伸ばす、保つ）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*ten-'],
      history_note: '内容物を内包する意味と、危機を外部に漏らさない「封じ込め（containment）」の双方の原点。',
      example: {
        foreign: 'The antique vault was discovered to <b>contain</b> rare illuminated manuscripts.',
        ja: 'その年代物の金庫には、希少な彩飾写本が<b>収蔵（内包）</b>されていたことが判明した。',
        trans: 'その年代物の金庫には、希少な彩飾写本が収蔵（内包）されていたことが判明した。',
        used_form: 'contain'
      },
      derivatives: [
        { word: 'container', phonetic: '/kənˈteɪnər/', pos: 'N[C]', meaning: '容器、コンテナ' },
        { word: 'containment', phonetic: '/kənˈteɪnmənt/', pos: 'N[U]', meaning: '封じ込め、牽制' }
      ],
      phrases: [
        { foreign: 'contain inflation', ja: 'インフレを抑制する' }
      ]
    },
    {
      id: 'ess_sustain',
      num: 19,
      word: 'sustain',
      homographIndex: 1,
      phonetic: '/səˈsteɪn/',
      grammar_forms: 'sustains, sustained, sustaining',
      category: '語根 *ten- (伸ばす・保つ)',
      meanings: [
        { pos: 'V[T]', text: '持続させる、維持する；（生命を）支える；（損害や負傷を）被る' }
      ],
      core: '倒れそうな重荷を下から（sub-）力強く支え持ち続ける（tenere）こと。',
      etymology: 'ラテン語 sustinere（下から支える、耐える）に由来。sub-（下に）＋ tenere（保つ）から成り、印欧祖語 *ten-（伸ばす、保つ）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*ten-'],
      history_note: '現代文明のキーワード「持続可能性（sustainability）」の根幹。',
      example: {
        foreign: 'Solar and wind installations help <b>sustain</b> national power grids during peak summer demand.',
        ja: '太陽光や風力発電施設は、夏のピーク需要期において国の電力網を<b>維持・支える</b>のに寄与している。',
        trans: '太陽光や風力発電施設は、夏のピーク需要期において国の電力網を維持・支えるのに寄与している。',
        used_form: 'sustain'
      },
      derivatives: [
        { word: 'sustainable', phonetic: '/səˈsteɪnəbəl/', pos: 'Adj', meaning: '持続可能な' },
        { word: 'sustenance', phonetic: '/ˈsʌstənəns/', pos: 'N[U]', meaning: '生命の糧、栄養' }
      ],
      phrases: [
        { foreign: 'sustain injuries', ja: '負傷を被る' }
      ]
    },
    {
      id: 'ess_maintain',
      num: 20,
      word: 'maintain',
      homographIndex: 1,
      phonetic: '/meɪnˈteɪn/',
      grammar_forms: 'maintains, maintained, maintaining',
      category: '語根 *ten- (伸ばす・保つ)',
      meanings: [
        { pos: 'V[T]', text: '維持する、保つ；（機械や施設を）保守点検する；（主張を）固持する' }
      ],
      core: '自分の手（manus）の中にしっかりと握り保ち続ける（tenere）こと。',
      etymology: 'ラテン語 manu tenere（手の中に保つ）に由来。manus（手）＋ tenere（保つ）から成り、印欧祖語 *ten-（伸ばす、保つ）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*ten-'],
      history_note: '手放さずに握り続けることから、物理的な保守（メンテナンス）と論理的主張の維持へ発展。',
      example: {
        foreign: 'System administrators <b>maintain</b> round-the-clock server uptime for the database.',
        ja: 'システム管理者は、そのデータベースの24時間サーバー稼働を<b>維持・保守している</b>。',
        trans: 'システム管理者は、そのデータベースの24時間サーバー稼働を維持・保守している。',
        used_form: 'maintain'
      },
      derivatives: [
        { word: 'maintenance', phonetic: '/ˈmeɪntənəns/', pos: 'N[U]', meaning: '保守、維持管理' }
      ],
      phrases: [
        { foreign: 'maintain one\'s innocence', ja: '無罪を主張し続ける' }
      ]
    }
  ];

  const CLASSICAL_ROOTS_STARTER = [
    {
      id: 'starter_gnosis',
      num: 101,
      word: 'gnosis',
      phonetic: '/ˈnoʊsɪs/',
      category: '哲学・宗教',
      meanings: [{ pos: 'N[U]', text: '（直観的・霊的な）霊知、神聖な知識；グノーシス' }],
      core: '感覚や論理を超えて直接に対象の本質を「深く知る」こと。',
      etymology: '古代ギリシャ語 γνῶσις（gnôsis, 「知識、知ること」）に由来。印欧祖語 *ǵneh₃-（知る）に遡り、英語の know, recognize, ignore やラテン語 cognoscere と同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*ǵneh₃-'],
      example: {
        foreign: 'The mystical text claimed to impart secret <b>gnosis</b> to the initiated.',
        ja: 'その神秘主義の文書は、入門者に秘められた<b>霊知（グノーシス）</b>を授けると主張していた。',
        trans: 'その神秘主義の文書は、入門者に秘められた霊知（グノーシス）を授けると主張していた。',
        used_form: 'gnosis'
      },
      derivatives: [
        { word: 'prognosis', phonetic: '/prɒɡˈnoʊsɪs/', pos: 'N[C]', meaning: '予後、予測' },
        { word: 'diagnosis', phonetic: '/ˌdaɪəɡˈnoʊsɪs/', pos: 'N[C]', meaning: '診断、識別' }
      ]
    },
    {
      id: 'starter_transfer',
      num: 102,
      word: 'transfer',
      phonetic: '/trænsˈfɜːr/',
      category: '学術・社会',
      meanings: [
        { pos: 'V[T]', text: '移転させる、転属させる、譲渡する' },
        { pos: 'N[C,U]', text: '移動、転任、譲渡' }
      ],
      core: '一方から他方へ向けて向こう側へ（trans-）運ぶ（-fer）こと。',
      etymology: 'ラテン語 transferre（向こうへ運ぶ）に由来。接頭辞 trans-（向こうへ）＋ ferre（運ぶ・産む）から成り、印欧祖語 *bʰer-（運ぶ、産む）に遡る。英語の bear（運ぶ、耐える）や birth（誕生）と同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*bʰer-'],
      example: {
        foreign: 'The university allowed students to <b>transfer</b> credits from accredited institutions.',
        ja: '大学は認定機関からの単位の<b>移行（トランスファー）</b>を学生に認めた。',
        trans: '大学は認定機関からの単位の移行を学生に認めた。',
        used_form: 'transfer'
      },
      derivatives: [
        { word: 'transference', phonetic: '/trænsˈfɜːrəns/', pos: 'N[U]', meaning: '転移、移転' }
      ]
    },
    {
      id: 'starter_circumspect',
      num: 103,
      word: 'circumspect',
      phonetic: '/ˈsɜːrkəmspekt/',
      category: '心理・倫理',
      meanings: [{ pos: 'Adj', text: '慎重な、用心深い、周囲に気を配った' }],
      core: '行動する前に自分の周囲（circum-）をぐるりと注意深く見回す（-spect）こと。',
      etymology: 'ラテン語 circumspectus（用心深い）に由来。circum-（周囲に）＋ spicere（見る）から成り、印欧祖語 *speḱ-（見る、観察する）に遡る。英語の inspect, spectacle, suspect や独 Späher（偵察者）と同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*speḱ-'],
      example: {
        foreign: 'The diplomat was extremely <b>circumspect</b> in answering sensitive political questions.',
        ja: 'その外交官は、デリケートな政治的質問への回答において極めて<b>慎重</b>であった。',
        trans: 'その外交官は、デリケートな政治的質問への回答において極めて慎重であった。',
        used_form: 'circumspect'
      },
      derivatives: [
        { word: 'circumspection', phonetic: '/ˌsɜːrkəmˈspekʃən/', pos: 'N[U]', meaning: '慎重さ、周到さ' }
      ]
    },
    {
      id: 'starter_dictum',
      num: 104,
      word: 'dictum',
      phonetic: '/ˈdɪktəm/',
      category: '法学・思想',
      meanings: [
        { pos: 'N[C]', text: '格言、金言、定評のある言葉' },
        { pos: 'N[C]', text: '【法学】判決理由中の裁判官の意見（傍論：obiter dictum）' }
      ],
      core: '権威ある立場から「公式に言われたこと」。',
      etymology: 'ラテン語 dictum（言われたこと、格言）に由来。動詞 dicere（言う）の過去分詞中性形から成り、印欧祖語 *deyk-（指し示す、宣言する）に遡る。英語の judge（判断する、法を宣言する）と同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*deyk-'],
      example: {
        foreign: 'She often quoted the ancient <b>dictum</b>: "Know thyself."',
        ja: '彼女はよく「汝自身を知れ」という古代の<b>格言</b>を引用した。',
        trans: '彼女はよく「汝自身を知れ」という古代の格言を引用した。',
        used_form: 'dictum'
      }
    },
    {
      id: 'starter_evidence',
      num: 105,
      word: 'evidence',
      phonetic: '/ˈevɪdəns/',
      category: '学術・科学・法学',
      meanings: [
        { pos: 'N[U]', text: '証拠、根拠、証言' },
        { pos: 'V[T]', text: '（証拠によって）明白にする、立証する' }
      ],
      core: '外から見て（e- / ex-）はっきりと「見えている（-vid-）」こと。',
      etymology: 'ラテン語 evidentia（明白さ、証拠）に由来。ex-（外へ）＋ videre（見る）から成り、印欧祖語 *weyd-（見る、知る）に遡る。英語の vision, wise, witness や独 wissen（知っている）と同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*weyd-'],
      example: {
        foreign: 'The empirical <b>evidence</b> strongly supported the falsifiable hypothesis.',
        ja: '実証的な<b>証拠</b>は、反証可能な仮説を強力に支持した。',
        trans: '実証的な証拠は、反証可能な仮説を強力に支持した。',
        used_form: 'evidence'
      }
    }
  ];

  const PHILOSOPHY_STARTER = [
    {
      id: 'starter_teleology',
      num: 201,
      word: 'teleology',
      phonetic: '/ˌtiːliˈɒlədʒi/',
      category: '哲学・科学史',
      meanings: [{ pos: 'N[U]', text: '目的論（自然界の事象や事物は内在的な目的や終局因に向かって生起するという哲学説）' }],
      core: 'すべての存在や現象が究極の「目的・終わり（telos）」に向かって動いていると捉える思索。',
      etymology: 'ギリシャ語 τέλος（télos, 「終わり、目的」）＋ -λογία（-logia, 「論、学問」）に由来。印欧祖語 *kʷel-（回転する、完結する）に遡る。アリストテレス哲学の四原因説（終局因）の中核概念。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*kʷel-'],
      example: {
        foreign: 'Aristotelian physics relied heavily on <b>teleology</b> to explain natural movement.',
        ja: 'アリストテレスの自然学は、自然の運動を説明するために<b>目的論</b>に大きく依拠していた。',
        trans: 'アリストテレスの自然学は、自然の運動を説明するために目的論に大きく依拠していた。',
        used_form: 'teleology'
      },
      derivatives: [
        { word: 'teleological', phonetic: '/ˌtiːliəˈlɒdʒɪkəl/', pos: 'Adj', meaning: '目的論的な' }
      ]
    },
    {
      id: 'starter_paradigm',
      num: 202,
      word: 'paradigm',
      phonetic: '/ˈpærədaɪm/',
      category: '科学哲学・認識論',
      meanings: [
        { pos: 'N[C]', text: '（一時代を支配する科学的・知的）パラダイム、枠組み、規範的モデル' },
        { pos: 'N[C]', text: '模範、典型例' }
      ],
      core: '物事の横に並べて（para-）手本として「指し示す（-deik-）」規範的枠組み。',
      etymology: '古代ギリシャ語 παράδειγμα（parádeigma, 「手本、範例」；para-「並んで」＋ deiknynai「示す」）に由来。印欧祖語 *deyk-（示す）に遡る。科学哲学者トーマス・クーンが『科学革命の構造』で科学理論の転換（パラダイム・シフト）として定義。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*deyk-'],
      example: {
        foreign: 'The shift from Newtonian mechanics to relativity represented a monumental <b>paradigm</b> shift.',
        ja: 'ニュートン力学から相対性理論への移行は、記念碑的な<b>パラダイム</b>転換を意味していた。',
        trans: 'ニュートン力学から相対性理論への移行は、記念碑的なパラダイム転換を意味していた。',
        used_form: 'paradigm'
      }
    },
    {
      id: 'starter_ontology',
      num: 203,
      word: 'ontology',
      phonetic: '/ɒnˈtɒlədʒi/',
      category: '哲学・情報科学',
      meanings: [
        { pos: 'N[U]', text: '【哲学】存在論（存在そのものの本質・根拠を探究する形而上学の根本部門）' },
        { pos: 'N[C]', text: '【計算機科学】オントロジー（特定の領域における概念・関係性の形式的体系化）' }
      ],
      core: '「存在する（on）」ことそのものの根源と秩序を論理（-logy）で解明する学問。',
      etymology: 'ギリシャ語 ὄν（ón, 「存在するもの」；動詞 eimi「ある」の現在分詞）＋ -λογία（-logia, 「学問」）に由来。印欧祖語 *h₁es-（ある、存在する）に遡り、英語の is, essence, entity と同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*h₁es-'],
      example: {
        foreign: 'Heidegger sought to reconstruct fundamental <b>ontology</b> by inquiring into the meaning of Being.',
        ja: 'ハイデガーは存在の意味を問うことによって、基礎的<b>存在論</b>を再構築しようとした。',
        trans: 'ハイデガーは存在の意味を問うことによって、基礎的存在論を再構築しようとした。',
        used_form: 'ontology'
      },
      derivatives: [
        { word: 'ontological', phonetic: '/ˌɒntəˈlɒdʒɪkəl/', pos: 'Adj', meaning: '存在論的な' }
      ]
    },
    {
      id: 'starter_dialectic',
      num: 204,
      word: 'dialectic',
      phonetic: '/ˌdaɪəˈlektɪk/',
      category: '哲学・論理学',
      meanings: [
        { pos: 'N[U, C]', text: '弁証法（対立・矛盾を止揚（アウフヘーベン）して高次の総合へと発展させる論理的思考法）' },
        { pos: 'Adj', text: '弁証法的な' }
      ],
      core: '対話者同士が互いの主張を交わし（dia-）、吟味・選別して（-lectic）真理へ昇華させること。',
      etymology: '古代ギリシャ語 διαλεκτική（dialektikḗ, 「対話の技法」；dia-「相互に」＋ legein「話す、集める、選ぶ」）に由来。印欧祖語 *leǵ-（集める、選ぶ、話す）に遡り、英語の lexicon, logic, collect と同根。ソクラテスの問答法からヘーゲル、マルクスへと継承。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*leǵ-'],
      example: {
        foreign: 'Hegel argued that historical progress unfolds through the triadic <b>dialectic</b> of thesis, antithesis, and synthesis.',
        ja: 'ヘーゲルは、歴史的進歩は正・反・合の三肢的<b>弁証法</b>を通じて展開すると主張した。',
        trans: 'ヘーゲルは、歴史的進歩は正・反・合の三肢的弁証法を通じて展開すると主張した。',
        used_form: 'dialectic'
      }
    },
    {
      id: 'starter_aporia',
      num: 205,
      word: 'aporia',
      phonetic: '/əˈpɔːriə/',
      category: '哲学・修辞学',
      meanings: [{ pos: 'N[C, U]', text: 'アポリア、難局、行き詰まり（解決不能な論理的矛盾や袋小路）' }],
      core: '道（poros）が通じておらず（a-）、どこへも進めない「完全な袋小路」。',
      etymology: '古代ギリシャ語 ἀπορία（aporía, 「行き詰まり、途方に暮れること」；否定接頭辞 a-「無・非」＋ πόρος「道、通り道、手段」）に由来。印欧祖語 *per-（前に進む、渡る）に遡り、英語の ford（浅瀬）, port（港）, fare（運賃・進む）と同根。デリダら脱構築批評でも多用。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*per-'],
      example: {
        foreign: 'The philosophical inquiry reached an unresolved <b>aporia</b>, exposing the limits of pure reason.',
        ja: 'その哲学的探究は未解決の<b>アポリア（袋小路）</b>に行き当たり、純粋理性の限界を露呈させた。',
        trans: 'その哲学的探究は未解決のアポリア（袋小路）に行き当たり、純粋理性の限界を露呈させた。',
        used_form: 'aporia'
      }
    }
  ];

  /**
   * 仏検準1級・DELF B2 語根コア20選 (FR_JA_STARTER)
   * ラテン語直系の抽象動詞・制度概念・認知語彙群
   */
  const FR_JA_STARTER = [
    {
      id: 'fr_pre1_concevoir',
      num: 1,
      word: 'concevoir',
      homographIndex: 1,
      phonetic: '/kɔ̃.sə.vwaʁ/',
      grammar_forms: 'v. tr. (ind. pr. je conçois, p.p. conçu)',
      category: '思考・哲学',
      meanings: [
        { pos: 'v. tr.', text: '（概念・計画などを）着想する、構想する、案出する' },
        { pos: 'v. tr.', text: '（感情などを）心に抱く；理解する' },
        { pos: 'v. tr.', text: '身ごもる、受胎する' }
      ],
      core: '外にある要素や思考の断片を、心（または胎内）の中に「一括して掴み入れる（con- + capere）」こと。',
      etymology: 'ラテン語 concipere（身ごもる、心に抱く；con-「共に」＋capere「掴む」）に由来し、印欧祖語 *kap-（掴む、捉える）に遡る。英語 conceive と完全同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*kap-'],
      history_note: 'デカルトの合理的認識論において、精神が事物の本質を明晰判明に把握する動詞として重視され、抽象的概念を創造する哲学的思索の中核語となった。',
      example: {
        foreign: "L'architecte a su <b>concevoir</b> un bâtiment qui allie tradition et modernité.",
        ja: 'その建築家は伝統と現代性を融合させた建物を<b>構想する</b>ことができた。',
        trans: 'その建築家は伝統と現代性を融合させた建物を構想することができた。',
        used_form: 'concevoir'
      },
      derivatives: [
        { word: 'conception', phonetic: '/kɔ̃.sɛp.sjɔ̃/', pos: 'n. f.', meaning: '概念、構想、受胎' },
        { word: 'conceptuel', phonetic: '/kɔ̃.sɛp.tɥɛl/', pos: 'adj.', meaning: '概念的な' }
      ],
      phrases: [
        { foreign: 'concevoir un projet', ja: 'プロジェクトを構想する' }
      ],
      lang: 'fr',
      pair: 'fr_ja'
    },
    {
      id: 'fr_pre1_percevoir',
      num: 2,
      word: 'percevoir',
      homographIndex: 1,
      phonetic: '/pɛʁ.sə.vwaʁ/',
      grammar_forms: 'v. tr. (ind. pr. je perçois, p.p. perçu)',
      category: '認知・知覚',
      meanings: [
        { pos: 'v. tr.', text: '（五感や直観で）知覚する、感じ取る、把握する' },
        { pos: 'v. tr.', text: '【公的・行政】（税金や給与を）徴収する、受領する' }
      ],
      core: '対象を五感や権能を通じて「余すところなく徹底的に捉え取る（per- + capere）」こと。',
      etymology: 'ラテン語 percipere（完全に捉える、知覚する；per-「徹底的に」＋capere「掴む」）に由来し、印欧祖語 *kap-（掴む）に遡る。英語 perceive と完全同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*kap-'],
      history_note: 'ベルクソンらのフランス哲学において、純粋持続と外界の事象を捉える感覚的把握の基本概念として精緻に論じられた。',
      example: {
        foreign: 'Elle parvient à <b>percevoir</b> des nuances subtiles dans son discours.',
        ja: '彼女は彼の言説の中に潜む微細なニュアンスを<b>感じ取る</b>ことができる。',
        trans: '彼女は彼の言説の中に潜む微細なニュアンスを感じ取ることができる。',
        used_form: 'percevoir'
      },
      derivatives: [
        { word: 'perception', phonetic: '/pɛʁ.sɛp.sjɔ̃/', pos: 'n. f.', meaning: '知覚、認知、徴収' },
        { word: 'perceptible', phonetic: '/pɛʁ.sɛp.tibl/', pos: 'adj.', meaning: '感知できる' }
      ],
      phrases: [
        { foreign: 'percevoir un impôt', ja: '税金を徴収する' }
      ],
      lang: 'fr',
      pair: 'fr_ja'
    },
    {
      id: 'fr_pre1_constater',
      num: 3,
      word: 'constater',
      homographIndex: 1,
      phonetic: '/kɔ̃s.ta.te/',
      grammar_forms: 'v. tr. (ind. pr. je constate)',
      category: '論理・科学',
      meanings: [
        { pos: 'v. tr.', text: '（客観的事実として）確認する、認める、気付く' },
        { pos: 'v. tr.', text: '【法学・行政】（証拠などに基づいて）公式に立証・記録する' }
      ],
      core: '物事が目の前で「確固として立っている（con- + stare）」状態を直視し、事実として認めること。',
      etymology: 'ラテン語 constare（堅固に立つ、一致する；con-「共に」＋stare「立つ」）の頻回形 constatare に由来し、印欧祖語 *sta-（立つ）に遡る。英語 constant, constitute と同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*sta-'],
      history_note: '18世紀の啓蒙思想および実証科学の発展期に、主観的推測と峻別された「実証的観察に基づく事実の確認」を表す公的語彙として定着。',
      example: {
        foreign: 'Les experts ont pu <b>constater</b> une nette amélioration de la situation économique.',
        ja: '専門家たちは経済状況の明らかな改善を<b>確認する</b>ことができた。',
        trans: '専門家たちは経済状況の明らかな改善を確認することができた。',
        used_form: 'constater'
      },
      derivatives: [
        { word: 'constat', phonetic: '/kɔ̃s.ta/', pos: 'n. m.', meaning: '現状確認、調書、報告書' },
        { word: 'constatation', phonetic: '/kɔ̃s.ta.ta.sjɔ̃/', pos: 'n. f.', meaning: '確認、事実認定' }
      ],
      phrases: [
        { foreign: 'dresser un constat', ja: '調書を作成する、現状を総括する' }
      ],
      lang: 'fr',
      pair: 'fr_ja'
    },
    {
      id: 'fr_pre1_subsister',
      num: 4,
      word: 'subsister',
      homographIndex: 1,
      phonetic: '/syp.sis.te/',
      grammar_forms: 'v. intr. (ind. pr. il subsiste)',
      category: '哲学・歴史',
      meanings: [
        { pos: 'v. intr.', text: '（時代や困難を経てなお）存続する、生き延びる、残存する' },
        { pos: 'v. intr.', text: '（人が）自活する、生計を立てる' }
      ],
      core: '表面的な変化の「下に踏みとどまって立ち続ける（sub- + sistere/stare）」こと。',
      etymology: 'ラテン語 subsistere（留まる、持ちこたえる；sub-「下に」＋sistere「立たせる、立つ」）に由来し、印欧祖語 *sta-（立つ）に遡る。英語 subsist と完全同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*sta-'],
      history_note: '中世スコラ哲学において、独立して自立的に存在し続ける「実体（substantia）」の存立様態を表す術語として用いられた。',
      example: {
        foreign: 'Malgré les siècles écoulés, ces traditions ancestrales continuent de <b>subsister</b>.',
        ja: '何世紀もの歳月が流れたにもかかわらず、これらの先祖代々の伝統は<b>存続し</b>続けている。',
        trans: '何世紀もの歳月が流れたにもかかわらず、これらの先祖代々の伝統は存続し続けている。',
        used_form: 'subsister'
      },
      derivatives: [
        { word: 'subsistance', phonetic: '/syp.sis.tɑ̃s/', pos: 'n. f.', meaning: '生存、生計、扶養' },
        { word: 'subsistant', phonetic: '/syp.sis.tɑ̃/', pos: 'adj.', meaning: '存続している、現存する' }
      ],
      phrases: [
        { foreign: 'moyens de subsistance', ja: '生計手段、生活の糧' }
      ],
      lang: 'fr',
      pair: 'fr_ja'
    },
    {
      id: 'fr_pre1_maintenir',
      num: 5,
      word: 'maintenir',
      homographIndex: 1,
      phonetic: '/mɛ̃t.niʁ/',
      grammar_forms: 'v. tr. (ind. pr. je maintiens, p.p. maintenu)',
      category: '社会・政治',
      meanings: [
        { pos: 'v. tr.', text: '（状態・秩序・水準を）維持する、保つ' },
        { pos: 'v. tr.', text: '（意見・立場を）主張し続ける、固執する' },
        { pos: 'v. pr.', text: '（se maintenir）持続する、持ちこたえる' }
      ],
      core: '物事を文字通り「自らの手（main）でしっかりと握り保つ（tenere）」こと。',
      etymology: '古フランス語 maintenir（手で保つ；ラテン語 manus「手」＋tenere「保つ」）に由来し、tenere は印欧祖語 *ten-（伸ばす、張る、保つ）に遡る。英語 maintain と完全同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*ten-'],
      history_note: '封建法において領主が臣下の権利や秩序を「手中において擁護・保持する」宣誓用語から発展し、近代的法治国家の治安維持や信条堅持の表現へ展開。',
      example: {
        foreign: "Le gouvernement s'efforce de <b>maintenir</b> la stabilité des prix.",
        ja: '政府は物価の安定を<b>維持する</b>よう尽力している。',
        trans: '政府は物価の安定を維持するよう尽力している。',
        used_form: 'maintenir'
      },
      derivatives: [
        { word: 'maintien', phonetic: '/mɛ̃.tjɛ̃/', pos: 'n. m.', meaning: '維持、保持、物腰・姿勢' },
        { word: 'mainteneur', phonetic: '/mɛ̃t.nœʁ/', pos: 'n. m.', meaning: '維持管理者' }
      ],
      phrases: [
        { foreign: "maintien de l'ordre", ja: '治安維持、秩序の保持' }
      ],
      lang: 'fr',
      pair: 'fr_ja'
    },
    {
      id: 'fr_pre1_soutenir',
      num: 6,
      word: 'soutenir',
      homographIndex: 1,
      phonetic: '/sut.niʁ/',
      grammar_forms: 'v. tr. (ind. pr. je soutiens, p.p. soutenu)',
      category: '社会・学術',
      meanings: [
        { pos: 'v. tr.', text: '（下から支えて）支える、持ちこたえさせる' },
        { pos: 'v. tr.', text: '支持する、擁護する、援助する' },
        { pos: 'v. tr.', text: '【学術】（学位論文を審査会で）口頭試問・論述防衛する' }
      ],
      core: '崩れ落ちそうな重みを「下から押し当てて握り支える（sub- + tenere）」こと。',
      etymology: 'ラテン語 sustinere（支える、持ちこたえる；sub-「下から」＋tenere「保つ」）に由来し、印欧祖語 *ten-（伸ばす、保つ）に遡る。英語 sustain と完全同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*ten-'],
      history_note: 'フランスの大学制度において、博士論文の公聴会で自らの学説を審査員団の前で擁護・立証する「soutenir une thèse」は最重要のアカデミック儀礼である。',
      example: {
        foreign: 'Elle doit <b>soutenir</b> sa thèse de doctorat devant un jury international le mois prochain.',
        ja: '彼女は来月、国際審査委員団の前で博士論文を<b>口頭防衛（審査発表）する</b>予定だ。',
        trans: '彼女は来月、国際審査委員団の前で博士論文を口頭防衛する予定だ。',
        used_form: 'soutenir'
      },
      derivatives: [
        { word: 'soutien', phonetic: '/su.tjɛ̃/', pos: 'n. m.', meaning: '支援、支持、支柱' },
        { word: 'soutenable', phonetic: '/sut.nabl/', pos: 'adj.', meaning: '支持できる、耐えうる' }
      ],
      phrases: [
        { foreign: 'soutenir une thèse', ja: '博士論文の口頭試問を受ける、論文を防衛する' }
      ],
      lang: 'fr',
      pair: 'fr_ja'
    },
    {
      id: 'fr_pre1_differer',
      num: 7,
      word: 'différer',
      homographIndex: 1,
      phonetic: '/di.fe.ʁe/',
      grammar_forms: 'v. tr. / v. intr. (ind. pr. je diffère)',
      category: '哲学・論理',
      meanings: [
        { pos: 'v. tr.', text: '（期日・実行などを）延期する、先送りにする' },
        { pos: 'v. intr.', text: '（de 〜と）異なる、意見が食い違う' }
      ],
      core: '物事や意見を「別々の方向へ運び離す（dis- + ferre）」こと。時間的に離せば「延期」、空間・質的に離せば「差異」。',
      etymology: 'ラテン語 differre（四方に散らす、延期する、異なる；dis-「離れて」＋ferre「運ぶ」）に由来し、印欧祖語 *bher-（運ぶ、耐える）に遡る。英語 defer, differ と同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*bher-'],
      history_note: '哲学者ジャック・デリダは、この単語が「異なる（différer）」と「遅延させる（différer）」の二義を兼ね備えていることに着目し、脱構築の中核概念「差延（différance）」を創出した。',
      example: {
        foreign: "Il est préférable de <b>différer</b> la réunion jusqu'à ce que toutes les données soient réunies.",
        ja: '全データが揃うまで会議を<b>延期する</b>のが賢明だ。',
        trans: '全データが揃うまで会議を延期するのが賢明だ。',
        used_form: 'différer'
      },
      derivatives: [
        { word: 'différence', phonetic: '/di.fe.ʁɑ̃s/', pos: 'n. f.', meaning: '違い、差異' },
        { word: 'différé', phonetic: '/di.fe.ʁe/', pos: 'adj. / n. m.', meaning: '録画放送の、繰り延べの' }
      ],
      phrases: [
        { foreign: 'sans différer', ja: '遅滞なく、直ちに' }
      ],
      lang: 'fr',
      pair: 'fr_ja'
    },
    {
      id: 'fr_pre1_conferer',
      num: 8,
      word: 'conférer',
      homographIndex: 1,
      phonetic: '/kɔ̃.fe.ʁe/',
      grammar_forms: 'v. tr. / v. intr. (ind. pr. je confère)',
      category: '法学・政治',
      meanings: [
        { pos: 'v. tr.', text: '（資格・称号・権限などを）授与する、与える' },
        { pos: 'v. intr.', text: '（avec 〜と）協議する、意見を交わす' }
      ],
      core: '双方の要素や権威を一箇所に「持ち寄って突き合わせる（con- + ferre）」こと。',
      etymology: 'ラテン語 conferre（持ち寄る、授ける、協議する；con-「共に」＋ferre「運ぶ」）に由来し、印欧祖語 *bher-（運ぶ）に遡る。英語 confer と完全同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*bher-'],
      history_note: 'ローマ法において皇帝や元老院が特権を臣民に授与する公式用語から、近代憲法における主権者の権限付与を表す格調高い動詞として定着。',
      example: {
        foreign: "Ce diplôme d'État vient lui <b>conférer</b> le statut officiel de chercheur qualifié.",
        ja: 'この国家免状は彼に有資格研究者としての公式地位を<b>付与する</b>ものである。',
        trans: 'この国家免状は彼に有資格研究者としての公式地位を付与するものである。',
        used_form: 'conférer'
      },
      derivatives: [
        { word: 'conférence', phonetic: '/kɔ̃.fe.ʁɑ̃s/', pos: 'n. f.', meaning: '講演、会議、会談' },
        { word: 'confrérie', phonetic: '/kɔ̃.fʁe.ʁi/', pos: 'n. f.', meaning: '同業者団体、友愛会' }
      ],
      phrases: [
        { foreign: 'conférer un pouvoir à qn', ja: '人に権限を与える' }
      ],
      lang: 'fr',
      pair: 'fr_ja'
    },
    {
      id: 'fr_pre1_perspicace',
      num: 9,
      word: 'perspicace',
      homographIndex: 1,
      phonetic: '/pɛʁs.pi.kas/',
      grammar_forms: 'adj.',
      category: '心理・人物',
      meanings: [
        { pos: 'adj.', text: '洞察力のある、明敏な、物事の本質を鋭く見抜く' }
      ],
      core: '表面的な覆いを「突き通して奥底まで透視して見る（per- + specere）」性質。',
      etymology: 'ラテン語 perspicax（鋭敏に見抜く；per-「貫いて」＋specere「見る」）に由来し、印欧祖語 *spec-（見る、観察する）に遡る。英語 perspicacious と同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*spec-'],
      history_note: '古典期の文学や道徳論（モラリスト文学）において、人間の複雑な心理的虚栄や欺瞞を暴く批評的精神の賛辞として用いられた。',
      example: {
        foreign: 'Grâce à son esprit <b>perspicace</b>, elle a tout de suite décelé la faille dans le raisonnement.',
        ja: 'その<b>明敏な</b>頭脳のおかげで、彼女は論理の破綻を即座に見抜いた。',
        trans: 'その明敏な頭脳のおかげで、彼女は論理の破綻を即座に見抜いた。',
        used_form: 'perspicace'
      },
      derivatives: [
        { word: 'perspicacité', phonetic: '/pɛʁs.pi.ka.si.te/', pos: 'n. f.', meaning: '洞察力、明敏さ' }
      ],
      phrases: [
        { foreign: 'un regard perspicace', ja: '鋭い眼差し、洞察力に満ちた目' }
      ],
      lang: 'fr',
      pair: 'fr_ja'
    },
    {
      id: 'fr_pre1_retrospectif',
      num: 10,
      word: 'rétrospectif',
      homographIndex: 1,
      phonetic: '/ʁe.tʁɔs.pɛk.tif/',
      grammar_forms: 'adj. (f. rétrospective)',
      category: '文化・歴史',
      meanings: [
        { pos: 'adj.', text: '回顧的な、過去を振り返る、追想の' },
        { pos: 'n. f.', text: '（rétrospective）回顧展、レトロスペクティブ' }
      ],
      core: '視線を現在の位置から「後ろ（過去）へ向けて見通す（retro- + specere）」こと。',
      etymology: 'ラテン語 retrospicere（後ろを振り返る；retro-「後方に」＋specere「見る」）に由来し、印欧祖語 *spec-（見る）に遡る。英語 retrospective と完全同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*spec-'],
      history_note: '19世紀後半の美術批評において、巨匠画家の生涯にわたる全業績を年代順に検証する大回顧展を表す術語として確立した。',
      example: {
        foreign: "Le musée consacre une exposition <b>rétrospective</b> majeure à l'ensemble de son œuvre.",
        ja: '美術館は彼の全作品を網羅する大規模な<b>回顧</b>展を開催している。',
        trans: '美術館は彼の全作品を網羅する大規模な回顧展を開催している。',
        used_form: 'rétrospective'
      },
      derivatives: [
        { word: 'rétrospectivement', phonetic: '/ʁe.tʁɔs.pɛk.tiv.mɑ̃/', pos: 'adv.', meaning: '回顧的に、振り返ってみれば' }
      ],
      phrases: [
        { foreign: 'avec un regard rétrospectif', ja: '過去を振り返る視点で' }
      ],
      lang: 'fr',
      pair: 'fr_ja'
    },
    {
      id: 'fr_pre1_resider',
      num: 11,
      word: 'résider',
      homographIndex: 1,
      phonetic: '/ʁe.zi.de/',
      grammar_forms: 'v. intr. (ind. pr. je réside)',
      category: '法学・哲学',
      meanings: [
        { pos: 'v. intr.', text: '居住する、定住する' },
        { pos: 'v. intr.', text: '（en/dans 〜に）本質がある、原因が存する' }
      ],
      core: '物事や人が「後ろに腰を落ち着けて鎮座する（re- + sedere）」こと。',
      etymology: 'ラテン語 residere（座り込む、定住する；re-「後ろに、再び」＋sedere「座る」）に由来し、印欧祖語 *sed-（座る）に遡る。英語 reside と完全同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*sed-'],
      history_note: 'フランス革命期の憲法論において、「主権は国民に存する（La souveraineté réside dans la nation）」という国家の根幹条文を形成した。',
      example: {
        foreign: 'La véritable difficulté ne <b>réside</b> pas dans la théorie, mais dans sa mise en pratique.',
        ja: '真の難しさは理論にあるのではなく、その実践に<b>存する</b>。',
        trans: '真の難しさは理論にあるのではなく、その実践に存する。',
        used_form: 'réside'
      },
      derivatives: [
        { word: 'résidence', phonetic: '/ʁe.zi.dɑ̃s/', pos: 'n. f.', meaning: '邸宅、居所、滞在' },
        { word: 'résidentiel', phonetic: '/ʁe.zi.dɑ̃.sjɛl/', pos: 'adj.', meaning: '住宅地の' }
      ],
      phrases: [
        { foreign: 'résider dans le fait que', ja: '〜という事実に本質がある' }
      ],
      lang: 'fr',
      pair: 'fr_ja'
    },
    {
      id: 'fr_pre1_subventionner',
      num: 12,
      word: 'subventionner',
      homographIndex: 1,
      phonetic: '/syp.vɑ̃.sjɔ.ne/',
      grammar_forms: 'v. tr. (ind. pr. je subventionne)',
      category: '経済・社会',
      meanings: [
        { pos: 'v. tr.', text: '（国や自治体が）助成金を交付する、補助金を支給する' }
      ],
      core: '困窮する事業の「下へ駆けつけて手助けする（sub- + venire）」こと。',
      etymology: 'ラテン語 subvenire（救済に駆けつける；sub-「下に」＋venire「来る」）の名詞 subventio に由来。venire は印欧祖語 *gʷem-（来る）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*gʷem-'],
      history_note: "フランスの文化保護政策（文化例外条項：l'exception culturelle）において、芸術や映画を国家が手厚く助成する制度的伝統の基盤語彙。",
      example: {
        foreign: 'Le ministère a décidé de <b>subventionner</b> ce projet innovant de transition énergétique.',
        ja: '省はこのエネルギー転換の革新的プロジェクトに<b>助成金を交付する</b>ことを決定した。',
        trans: '省はこのエネルギー転換の革新的プロジェクトに助成金を交付することを決定した。',
        used_form: 'subventionner'
      },
      derivatives: [
        { word: 'subvention', phonetic: '/syp.vɑ̃.sjɔ̃/', pos: 'n. f.', meaning: '助成金、補助金' }
      ],
      phrases: [
        { foreign: 'accorder une subvention', ja: '補助金を認可・支給する' }
      ],
      lang: 'fr',
      pair: 'fr_ja'
    },
    {
      id: 'fr_pre1_attenuer',
      num: 13,
      word: 'atténuer',
      homographIndex: 1,
      phonetic: '/a.te.nɥe/',
      grammar_forms: "v. tr. (ind. pr. j'atténue)",
      category: '医療・法律',
      meanings: [
        { pos: 'v. tr.', text: '（苦痛・衝撃・影響などを）和らげる、緩和する' },
        { pos: 'v. tr.', text: '【法学】（罪状・刑罰を）減軽する' }
      ],
      core: 'ピンと張った強情なものを「薄く引き伸ばして弱める（ad- + tenuis）」こと。',
      etymology: 'ラテン語 attenuare（薄くする、弱める；ad-「〜へ」＋tenuis「薄い、細い」）に由来し、tenuis は印欧祖語 *ten-（伸ばす、張る）に遡る。英語 attenuate と完全同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*ten-'],
      history_note: '刑法において「情状酌量（circonstances atténuantes）」の減軽要件として不可欠の法的概念。',
      example: {
        foreign: "Ces mesures d'urgence ont permis d'<b>atténuer</b> l'impact de la crise sanitaire.",
        ja: 'これらの緊急措置によって衛生危機の衝撃を<b>和らげる</b>ことが可能となった。',
        trans: 'これらの緊急措置によって衛生危機の衝撃を和らげることが可能となった。',
        used_form: 'atténuer'
      },
      derivatives: [
        { word: 'atténuation', phonetic: '/a.te.nɥa.sjɔ̃/', pos: 'n. f.', meaning: '緩和、減刑、減衰' }
      ],
      phrases: [
        { foreign: 'circonstances atténuantes', ja: '【法】情状酌量の余地、減刑理由' }
      ],
      lang: 'fr',
      pair: 'fr_ja'
    },
    {
      id: 'fr_pre1_entraver',
      num: 14,
      word: 'entraver',
      homographIndex: 1,
      phonetic: '/ɑ̃.tʁa.ve/',
      grammar_forms: "v. tr. (ind. pr. j'entrave)",
      category: '政治・社会',
      meanings: [
        { pos: 'v. tr.', text: '（進行・自由・発展を）妨げる、阻害する、足かせをはめる' }
      ],
      core: '馬の足に木製の「足かせ（entrave）をはめて」前進を封じること。',
      etymology: 'ラテン語 trabs（梁、丸太；印欧祖語 *treb-「住居、梁」）から派生した中世ラテン語 intravare（足かせをかける）に由来。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*treb-'],
      history_note: '中世の牧畜で逃亡防止に馬へ付けた足輪具から転じ、個人の自由を制限する行政的・政治的抑圧の告発動詞へと意味が洗練された。',
      example: {
        foreign: "La lourdeur administrative risque d'<b>entraver</b> la libre circulation des talents.",
        ja: '行政の煩雑さは人材の自由な移動を<b>妨げる</b>恐れがある。',
        trans: '行政の煩雑さは人材の自由な移動を妨げる恐れがある。',
        used_form: 'entraver'
      },
      derivatives: [
        { word: 'entrave', phonetic: '/ɑ̃.tʁav/', pos: 'n. f.', meaning: '足かせ、障害、束縛' }
      ],
      phrases: [
        { foreign: 'mettre des entraves à', ja: '〜に足かせをはめる、〜を阻害する' }
      ],
      lang: 'fr',
      pair: 'fr_ja'
    },
    {
      id: 'fr_pre1_preconiser',
      num: 15,
      word: 'préconiser',
      homographIndex: 1,
      phonetic: '/pʁe.kɔ.ni.ze/',
      grammar_forms: 'v. tr. (ind. pr. je préconise)',
      category: '政策・社会',
      meanings: [
        { pos: 'v. tr.', text: '（対策や改革などを公に）推奨する、提唱する、唱道する' }
      ],
      core: '公衆の面前で町の布告役（praeco）が「高らかに宣言して歌い上げる（prae- + canere）」こと。',
      etymology: 'ラテン語 praeco（布告人、使者；prae-「前に」＋canere「歌う、叫ぶ」）に由来し、印欧祖語 *kan-（歌う）に遡る。フランス語 chanter や英語 accent と同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*kan-'],
      history_note: 'カトリック教会で教皇が枢機卿会議において新任司教の任命を公に推薦・承認する儀礼語から、現代の政策提言用語へ展開。',
      example: {
        foreign: 'Le rapport parlementaire vient de <b>préconiser</b> une refonte totale du système fiscal.',
        ja: '議会報告書は税制の抜本的見直しを<b>提唱した</b>ところである。',
        trans: '議会報告書は税制の抜本的見直しを提唱したところである。',
        used_form: 'préconiser'
      },
      derivatives: [
        { word: 'préconisation', phonetic: '/pʁe.kɔ.ni.za.sjɔ̃/', pos: 'n. f.', meaning: '推奨、提言、勧告' }
      ],
      phrases: [
        { foreign: 'préconiser une réforme', ja: '改革を提唱する' }
      ],
      lang: 'fr',
      pair: 'fr_ja'
    },
    {
      id: 'fr_pre1_susciter',
      num: 16,
      word: 'susciter',
      homographIndex: 1,
      phonetic: '/sy.si.te/',
      grammar_forms: 'v. tr. (ind. pr. je suscite)',
      category: '文化・社会',
      meanings: [
        { pos: 'v. tr.', text: '（感情・論争・反響などを）引き起こす、生じさせる、呼び覚ます' }
      ],
      core: '眠っていたものを「下から突き動かして呼び覚ます（sub- + citare）」こと。',
      etymology: 'ラテン語 suscitare（呼び起こす、燃え立たせる；sub-「下から」＋citare「動かす、呼ぶ」）に由来し、印欧祖語 *kei-（動かす、進める）に遡る。英語 cite, excite と同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*kei-'],
      history_note: '聖書翻訳において神が預言者や救済者を「奮い立たせる」動詞として用いられ、フランス文学では熱情や激論の喚起を表す優雅な動詞となった。',
      example: {
        foreign: "Cette publication controversée n'a pas manqué de <b>susciter</b> de vives réactions au sein de la communauté.",
        ja: 'この物議を醸す出版物は、共同体内部で激しい反応を<b>引き起こさ</b>ずにはおかなかった。',
        trans: 'この物議を醸す出版物は、共同体内部で激しい反応を引き起こさずにはおかなかった。',
        used_form: 'susciter'
      },
      derivatives: [
        { word: 'suscitateur', phonetic: '/sy.si.ta.tœʁ/', pos: 'n. m.', meaning: '扇動者、喚起者' }
      ],
      phrases: [
        { foreign: "susciter l'admiration", ja: '称賛を浴びる、感嘆を呼び起こす' }
      ],
      lang: 'fr',
      pair: 'fr_ja'
    },
    {
      id: 'fr_pre1_inscrire',
      num: 17,
      word: 'inscrire',
      homographIndex: 1,
      phonetic: '/ɛ̃s.kʁiʁ/',
      grammar_forms: "v. tr. (ind. pr. j'inscris, p.p. inscrit)",
      category: '制度・文化',
      meanings: [
        { pos: 'v. tr.', text: '（名簿や台帳に）登録する、記載する' },
        { pos: 'v. tr.', text: '刻み込む、銘記する' },
        { pos: 'v. pr.', text: "（s'inscrire dans）〜の一環を成す、〜の流れに位置づけられる" }
      ],
      core: '文字や記念の痕跡を「石や書物の中へ刻み記す（in- + scribere）」こと。',
      etymology: 'ラテン語 inscribere（書き入れる、刻む；in-「中に」＋scribere「書く」）に由来し、印欧祖語 *skribʰ-（引く、刻みつける）に遡る。英語 inscribe と完全同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*skribʰ-'],
      history_note: '古代ローマの碑文文化（碑文：inscriptio）から、現代ユネスコ世界遺産の登録（inscrire au patrimoine mondial）まで、歴史的価値の公認を象徴する語。',
      example: {
        foreign: "Ce chef-d'œuvre architectural a été choisi pour s'<b>inscrire</b> au patrimoine mondial de l'humanité.",
        ja: 'この建築の傑作は、人類の世界遺産に<b>登録される</b>ことになった。',
        trans: 'この建築の傑作は、人類の世界遺産に登録されることになった。',
        used_form: 'inscrire'
      },
      derivatives: [
        { word: 'inscription', phonetic: '/ɛ̃s.kʁip.sjɔ̃/', pos: 'n. f.', meaning: '登録、受講申し込み、碑文' },
        { word: 'inscriptible', phonetic: '/ɛ̃s.kʁip.tibl/', pos: 'adj.', meaning: '内接できる、登録可能な' }
      ],
      phrases: [
        { foreign: "s'inscrire dans la durée", ja: '長期的展望に根ざす、持続的枠組みに入る' }
      ],
      lang: 'fr',
      pair: 'fr_ja'
    },
    {
      id: 'fr_pre1_subvertir',
      num: 18,
      word: 'subvertir',
      homographIndex: 1,
      phonetic: '/syp.vɛʁ.tiʁ/',
      grammar_forms: 'v. tr. (ind. pr. je subvertis, p.p. subverti)',
      category: '政治・哲学',
      meanings: [
        { pos: 'v. tr.', text: '（体制・価値観・秩序を根底から）覆す、転覆させる、破壊する' }
      ],
      core: '足元を「下から引っくり返してひっくり返す（sub- + vertere）」こと。',
      etymology: 'ラテン語 subvertere（下から覆す、倒す；sub-「下に」＋vertere「回す、向ける」）に由来し、印欧祖語 *wert-（回る、曲がる）に遡る。英語 subvert と完全同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*vert-'],
      history_note: '20世紀のフランス現代思想（フーコーやデリダ）において、固定化された言説権力や二項対立の制度を脱構築する哲学的反抗の術語として多用された。',
      example: {
        foreign: "L'avant-garde artistique cherchait à <b>subvertir</b> les codes esthétiques de la bourgeoisie.",
        ja: '芸術的前衛派はブルジョワジーの美学的規範を<b>根底から覆す</b>ことを試みていた。',
        trans: '芸術的前衛派はブルジョワジーの美学的規範を根底から覆すことを試みていた。',
        used_form: 'subvertir'
      },
      derivatives: [
        { word: 'subversion', phonetic: '/syp.vɛʁ.sjɔ̃/', pos: 'n. f.', meaning: '転覆、破壊工作、秩序破壊' },
        { word: 'subversif', phonetic: '/syp.vɛʁ.sif/', pos: 'adj.', meaning: '体制転覆の、破壊的な' }
      ],
      phrases: [
        { foreign: "subvertir l'ordre établi", ja: '既成秩序を根底から覆す' }
      ],
      lang: 'fr',
      pair: 'fr_ja'
    },
    {
      id: 'fr_pre1_repercussion',
      num: 19,
      word: 'répercussion',
      homographIndex: 1,
      phonetic: '/ʁe.pɛʁ.ky.sjɔ̃/',
      grammar_forms: 'n. f.',
      category: '経済・政治',
      meanings: [
        { pos: 'n. f.', text: '（出来事・危機の）影響、反響、余波、跳ね返り' },
        { pos: 'n. f.', text: '【物理・音響】反射、反跳' }
      ],
      core: '打撃の衝撃が「壁に当たって再びこちらへ跳ね返ってくる（re- + percutere）」こと。',
      etymology: 'ラテン語 repercussio（跳ね返り、反射；re-「再び」＋percutere「強く打つ」）に由来。英語 repercussion と完全同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*pewg-'],
      history_note: '近代経済学および外交史において、ある国家の金融変動や地政学的摩擦が同盟国へもたらす「ドミノ倒し的波及効果」の定形分析語。',
      example: {
        foreign: "La hausse soudaine du pétrole aura une <b>répercussion</b> directe sur le pouvoir d'achat.",
        ja: '石油の急騰は家計の購買力に直接の<b>波及（影響）</b>をもたらすだろう。',
        trans: '石油の急騰は家計の購買力に直接の波及（影響）をもたらすだろう。',
        used_form: 'répercussion'
      },
      derivatives: [
        { word: 'répercuter', phonetic: '/ʁe.pɛʁ.ky.te/', pos: 'v. tr.', meaning: '（影響・価格を）転嫁する、跳ね返らせる' }
      ],
      phrases: [
        { foreign: 'avoir des répercussions sur', ja: '〜に波及効果・重大な影響を及ぼす' }
      ],
      lang: 'fr',
      pair: 'fr_ja'
    },
    {
      id: 'fr_pre1_contrainte',
      num: 20,
      word: 'contrainte',
      homographIndex: 1,
      phonetic: '/kɔ̃.tʁɛ̃t/',
      grammar_forms: 'n. f.',
      category: '社会・哲学',
      meanings: [
        { pos: 'n. f.', text: '制約、制約条件、束縛、不自由' },
        { pos: 'n. f.', text: '【法学】強制、強迫' }
      ],
      core: '四方から帯や縄で「締め上げて自由を奪う（con- + stringere）」こと。',
      etymology: 'ラテン語 constringere（縛り合わせる；con-「共に」＋stringere「締める」）の受動分詞 fem. constricta に由来し、印欧祖語 *strengʰ-（きつく締める）に遡る。英語 constraint と完全同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*strengʰ-'],
      history_note: 'ルソーの社会契約論において、人間を抑圧する自然的・専制的な強制力と、法による正当な義務の峻別を論じる中核語。ウリポ（潜在的文学工房）の「制約文学」でも有名。',
      example: {
        foreign: "La liberté de création peut paradoxalement s'épanouir sous une <b>contrainte</b> formelle rigoureuse.",
        ja: '創造の自由は、逆説的に厳格な形式的<b>制約</b>のもとでこそ開花しうる。',
        trans: '創造の自由は、逆説的に厳格な形式的制約のもとでこそ開花しうる。',
        used_form: 'contrainte'
      },
      derivatives: [
        { word: 'contraindre', phonetic: '/kɔ̃.tʁɛ̃dʁ/', pos: 'v. tr.', meaning: '強制する、強いる' },
        { word: 'contraignant', phonetic: '/kɔ̃.tʁɛ.ɲɑ̃/', pos: 'adj.', meaning: '拘束力のある、窮屈な' }
      ],
      phrases: [
        { foreign: 'agir sous la contrainte', ja: '強制されて行動する、不本意ながら行う' }
      ],
      lang: 'fr',
      pair: 'fr_ja'
    }
  ];

  /**
   * 独検準1級・Goethe B2 語根・分離動詞20選 (DE_JA_STARTER)
   * ゲルマン祖語と接頭辞の構造化による必須制度・抽象動詞群
   */
  const DE_JA_STARTER = [
    {
      id: 'de_pre1_bestehen',
      num: 1,
      word: 'bestehen',
      homographIndex: 1,
      phonetic: '/bəˈʃteːən/',
      grammar_forms: 'bestand, hat bestanden; Vt / Vi',
      category: '制度・哲学',
      meanings: [
        { pos: 'Vi', text: '（時代や困難を経て）存続する、存在する' },
        { pos: 'Vi', text: '（aus 〜から）成り立っている、構成される' },
        { pos: 'Vt', text: '（試験や危機を）無事に切り抜ける、合格する' },
        { pos: 'Vi', text: '（auf 〜を）主張し通す、固執する' }
      ],
      core: '周りに揺さぶられても「そこに確固として立ち続ける（be- + stehen）」こと。',
      etymology: '中高ドイツ語 bestehen（立ち向かう、存続する）に由来。stehen はゲルマン祖語 *standaną、印欧祖語 *sta-（立つ）に遡る。英語 stand, consist と同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*sta-'],
      history_note: 'カントの認識論やヘーゲルの弁証法において、現象の背後に存在する客観的実在の「持続的存立」を表す基本動詞として哲学史に刻まれた。',
      example: {
        foreign: 'Trotz tiefgreifender Krisen konnte diese demokratische Institution ununterbrochen <b>bestehen</b>.',
        ja: '深刻な危機にもかかわらず、この民主的機関は途切れることなく<b>存続する</b>ことができた。',
        trans: '深刻な危機にもかかわらず、この民主的機関は途切れることなく存続することができた。',
        used_form: 'bestehen'
      },
      derivatives: [
        { word: 'Bestand', phonetic: '/bəˈʃtant/', pos: 'Subst. m.', meaning: '存続、在庫、残高' },
        { word: 'beständig', phonetic: '/bəˈʃtɛndɪç/', pos: 'Adj.', meaning: '持続的な、不変の' }
      ],
      phrases: [
        { foreign: 'eine Prüfung bestehen', ja: '試験に合格する' },
        { foreign: 'aus etw. bestehen', ja: '〜から成り立つ' }
      ],
      lang: 'de',
      pair: 'de_ja'
    },
    {
      id: 'de_pre1_entstehen',
      num: 2,
      word: 'entstehen',
      homographIndex: 1,
      phonetic: '/ɛntˈʃteːən/',
      grammar_forms: 'entstand, ist entstanden; Vi',
      category: '自然・科学',
      meanings: [
        { pos: 'Vi', text: '（物・事態が新たに）生じる、発生する、生まれる' },
        { pos: 'Vi', text: '（aus 〜から）起源を発する' }
      ],
      core: '何もないところから離脱して「突如として立ち現れ出る（ent- + stehen）」こと。',
      etymology: '接頭辞 ent-（〜から外へ、開始）＋stehen（立つ）。印欧祖語 *sta-（立つ）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*sta-'],
      history_note: 'ゲーテの自然形態学において、生命や事象が原初の形態から自己組織化して「現成する」動態的生成概念のキーワード。',
      example: {
        foreign: 'Aus diesem wissenschaftlichen Dialog kann eine völlig neue Perspektive <b>entstehen</b>.',
        ja: 'この学術対話から、まったく新しい視座が<b>生じる</b>可能性がある。',
        trans: 'この学術対話から、まったく新しい視座が生じる可能性がある。',
        used_form: 'entstehen'
      },
      derivatives: [
        { word: 'Entstehung', phonetic: '/ɛntˈʃteːʊŋ/', pos: 'Subst. f.', meaning: '発生、起源、成立' }
      ],
      phrases: [
        { foreign: 'Kosten entstehen', ja: '費用が発生する' }
      ],
      lang: 'de',
      pair: 'de_ja'
    },
    {
      id: 'de_pre1_kapieren',
      num: 3,
      word: 'kapieren',
      homographIndex: 1,
      phonetic: '/kaˈpiːʁən/',
      grammar_forms: 'kapierte, hat kapiert; Vt',
      category: '心理・思考',
      meanings: [
        { pos: 'Vt', text: '（複雑な事情や論理を）理解する、飲み込む、把握する' }
      ],
      core: '飛び交う思考の要点を手で「ひっつかんで我が物にする（capere）」こと。',
      etymology: 'ラテン語 capere（掴む、受ける；印欧祖語 *kap-「掴む」）の学生俗語借用（16世紀大学都市）。英語 capture, conceive やフランス語 concevoir と同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*kap-'],
      history_note: 'ドイツの大学街でラテン語教育を受けた学生が日常語へ持ち込んだ学術由来の俗語。口語から徐々に知性的把握を指す表現として定着。',
      example: {
        foreign: 'Es hat lange gedauert, bis alle die Tragweite des Problems wirklich <b>kapieren</b> konnten.',
        ja: '全員が問題の重大性を本当に<b>理解する</b>ことができるまで、長い時間を要した。',
        trans: '全員が問題の重大性を本当に理解することができるまで、長い時間を要した。',
        used_form: 'kapieren'
      },
      derivatives: [
        { word: 'kapiert', phonetic: '/kaˈpiːɐ̯t/', pos: 'Adj.', meaning: '理解した' }
      ],
      phrases: [
        { foreign: 'etwas blitzschnell kapieren', ja: '物事を電光石火の速さで理解する' }
      ],
      lang: 'de',
      pair: 'de_ja'
    },
    {
      id: 'de_pre1_beibehalten',
      num: 4,
      word: 'beibehalten',
      homographIndex: 1,
      phonetic: '/ˈbaɪ̯bəˌhaltn̩/',
      grammar_forms: 'behielt bei, hat beibehalten; Vt (trennbar)',
      category: '政治・社会',
      meanings: [
        { pos: 'Vt', text: '（方針・習慣・態度などを変えずに）維持する、保持する、継続する' }
      ],
      core: '手元に引き寄せたまま「脇に抱えて手放さず保つ（bei- + halten）」こと。',
      etymology: 'bei-（近接・手元）＋halten（保つ、抑える）。halten はゲルマン祖語 *haldaną（見張る、保つ）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*kel-'],
      history_note: '政策決定や外交において、急進的変更を避けて従来路線を堅持する「継続性（Kontinuität）」の基本述語。',
      example: {
        foreign: 'Die Regierung will ihren bewährten wirtschaftspolitischen Kurs vorerst <b>beibehalten</b>.',
        ja: '政府はこれまでの実績ある経済政策方針を当面<b>維持する</b>意向である。',
        trans: '政府はこれまでの実績ある経済政策方針を当面維持する意向である。',
        used_form: 'beibehalten'
      },
      derivatives: [
        { word: 'Beibehaltung', phonetic: '/ˈbaɪ̯bəˌhaltʊŋ/', pos: 'Subst. f.', meaning: '維持、保持、継続' }
      ],
      phrases: [
        { foreign: 'eine Tradition beibehalten', ja: '伝統を守り続ける' }
      ],
      lang: 'de',
      pair: 'de_ja'
    },
    {
      id: 'de_pre1_unterhalten',
      num: 5,
      word: 'unterhalten',
      homographIndex: 1,
      phonetic: '/ˌʊntɐˈhaltn̩/',
      grammar_forms: 'unterhielt, hat unterhalten; Vt / Vpr (untrennbar)',
      category: '文化・経済',
      meanings: [
        { pos: 'Vt', text: '（家族・施設・関係を）扶養する、維持管理する' },
        { pos: 'Vt', text: '（観客などを）楽しませる、もてなす' },
        { pos: 'Vpr', text: '（sich unterhalten）歓談する、語り合う' }
      ],
      core: '重荷を下から「下支えして持続させる（unter- + halten）」こと。ラテン語 sustinere / maintenir と同一の思考構造。',
      etymology: 'unter-（下に）＋halten（保つ）。ラテン語 sustinere（下から保つ）の借用翻訳（Lehnübersetzung）。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*kel-'],
      history_note: '中世騎士道社会での「客人のもてなし（Gastfreundschaft）」から、現代のインフラ維持（unterhalten）やエンターテインメント（Unterhaltung）へと多層化した。',
      example: {
        foreign: 'Die Universität muss enorme Mittel aufwenden, um diese historischen Archive zu <b>unterhalten</b>.',
        ja: '大学はこの歴史的アーカイブを<b>維持管理する</b>ために莫大な資金を投じなければならない。',
        trans: '大学はこの歴史的アーカイブを維持管理するために莫大な資金を投じなければならない。',
        used_form: 'unterhalten'
      },
      derivatives: [
        { word: 'Unterhaltung', phonetic: '/ˌʊntɐˈhaltʊŋ/', pos: 'Subst. f.', meaning: '娯楽、歓談、維持費' },
        { word: 'Unterhalt', phonetic: '/ˈʊntɐˌhalt/', pos: 'Subst. m.', meaning: '生活費、養育費' }
      ],
      phrases: [
        { foreign: 'diplomatische Beziehungen unterhalten', ja: '外交関係を維持する' }
      ],
      lang: 'de',
      pair: 'de_ja'
    },
    {
      id: 'de_pre1_ubertragen',
      num: 6,
      word: 'übertragen',
      homographIndex: 1,
      phonetic: '/ˌyːbɐˈtʁaːɡn̩/',
      grammar_forms: 'übertrug, hat übertragen; Vt (untrennbar)',
      category: '法学・通信',
      meanings: [
        { pos: 'Vt', text: '（権限・責任・権利を）委託する、譲渡する' },
        { pos: 'Vt', text: '（病気などを）伝染させる；（電波・映像を）中継放送する' },
        { pos: 'Vt', text: '（ある分野のモデルを他へ）応用する、比喩的に用いる' }
      ],
      core: 'ある場所から川や境界の「向こう岸へと担いで運ぶ（über- + tragen）」こと。',
      etymology: 'über-（〜を越えて）＋tragen（運ぶ）。tragen はゲルマン祖語 *draganą、印欧祖語 *dʰregʰ-（引く、運ぶ）に遡る。ラテン語 transferre（英語 transfer）の完全な対訳語。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*dʰregʰ-'],
      history_note: 'ラテン語 transferre（運ぶ・比喩にする）を中高ドイツ語期にゲルマン語根で忠実に訳出した借用翻訳詞。法律・医学・メディア通信の全領域で中核動詞。',
      example: {
        foreign: 'Der Vorstand hat beschlossen, ihm die gesamte Verantwortung für das Projekt zu <b>übertragen</b>.',
        ja: '取締役会はプロジェクトに関する全責任を彼に<b>委任する（委託する）</b>ことを決定した。',
        trans: '取締役会はプロジェクトに関する全責任を彼に委任することを決定した。',
        used_form: 'übertragen'
      },
      derivatives: [
        { word: 'Übertragung', phonetic: '/ˌyːbɐˈtʁaːɡʊŋ/', pos: 'Subst. f.', meaning: '譲渡、委任、生中継、伝染' },
        { word: 'übertragbar', phonetic: '/ˌyːbɐˈtʁaːkbaːɐ̯/', pos: 'Adj.', meaning: '譲渡可能な、感染性の' }
      ],
      phrases: [
        { foreign: 'im übertragenen Sinne', ja: '比喩的な意味で、転じて' }
      ],
      lang: 'de',
      pair: 'de_ja'
    },
    {
      id: 'de_pre1_vertragen',
      num: 7,
      word: 'vertragen',
      homographIndex: 1,
      phonetic: '/fɛɐ̯ˈtʁaːɡn̩/',
      grammar_forms: 'vertrug, hat vertragen; Vt / Vpr (untrennbar)',
      category: '心理・社会',
      meanings: [
        { pos: 'Vt', text: '（苦痛・暑さ・批判などに）耐える、我慢する、持ちこたえる' },
        { pos: 'Vpr', text: '（sich mit 〜と）仲良くやる、和解する、相性が合う' }
      ],
      core: '重荷を最後まで「担ぎ通して持ちこたえる」、または互いの重荷を擦り合わせて「折り合う」こと。',
      etymology: 'ver-（完了・徹底）＋tragen（運ぶ、耐える）。印欧祖語 *dʰregʰ-（引く、運ぶ）に遡る。英語 tolerate, contract と思想的同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*dʰregʰ-'],
      history_note: '「互いに我慢して折り合う」名詞形 Vertrag（条約、契約）は、ドイツ法制史においてウェストファリア条約などに代表される平和合意の中核概念となった。',
      example: {
        foreign: 'Ein wahrhaft demokratischer Diskurs muss es <b>vertragen</b> können, scharfe Kritik auszuhalten.',
        ja: '真に民主的な言説空間は、鋭い批判に<b>耐えうる</b>ものでなければならない。',
        trans: '真に民主的な言説空間は、鋭い批判に耐えうるものでなければならない。',
        used_form: 'vertragen'
      },
      derivatives: [
        { word: 'Vertrag', phonetic: '/fɛɐ̯ˈtʁaːk/', pos: 'Subst. m.', meaning: '契約、条約' },
        { word: 'verträglich', phonetic: '/fɛɐ̯ˈtʁeːklɪç/', pos: 'Adj.', meaning: '耐えられる、相性の良い' }
      ],
      phrases: [
        { foreign: 'Kritik vertragen', ja: '批判に耐える、批判を受け止める' }
      ],
      lang: 'de',
      pair: 'de_ja'
    },
    {
      id: 'de_pre1_einbeziehen',
      num: 8,
      word: 'einbeziehen',
      homographIndex: 1,
      phonetic: '/ˈaɪ̯nbəˌtsiːən/',
      grammar_forms: 'bezog ein, hat einbezogen; Vt (trennbar)',
      category: '論理・政策',
      meanings: [
        { pos: 'Vt', text: '（計画や考慮の中に）算入する、考慮に入れる、含める、巻き込む' }
      ],
      core: '外部にある対象を「輪の中へと引っ張り込んで包み込む（ein- + beziehen）」こと。',
      etymology: 'ein-（内へ）＋be-＋ziehen（引く）。ziehen はゲルマン祖語 *teuhaną、印欧祖語 *dewk-（引く、導く）に遡る。英語 include や educate と同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*dewk-'],
      history_note: '環境影響評価や市民参加型政治において、多様なステークホルダーの意見を政策形成に「インクルード（包含）する」現代行政の定番動詞。',
      example: {
        foreign: 'Wir müssen bei dieser Prognose alle ökologischen Faktoren verbindlich <b>einbeziehen</b>.',
        ja: '私たちはこの予測において、すべての生態学的要因を義務的に<b>考慮に入れ</b>なければならない。',
        trans: '私たちはこの予測において、すべての生態学的要因を義務的に考慮に入れなければならない。',
        used_form: 'einbeziehen'
      },
      derivatives: [
        { word: 'Einbeziehung', phonetic: '/ˈaɪ̯nbəˌtsiːʊŋ/', pos: 'Subst. f.', meaning: '算入、包含、関与' }
      ],
      phrases: [
        { foreign: 'jdn. in die Entscheidung einbeziehen', ja: '決定プロセスに人を巻き込む' }
      ],
      lang: 'de',
      pair: 'de_ja'
    },
    {
      id: 'de_pre1_vollziehen',
      num: 9,
      word: 'vollziehen',
      homographIndex: 1,
      phonetic: '/fɔlˈtsiːən/',
      grammar_forms: 'vollzog, hat vollzogen; Vt / Vpr (untrennbar)',
      category: '法学・政治',
      meanings: [
        { pos: 'Vt', text: '（法律・判決・儀式などを）執行する、実行する、執り行う' },
        { pos: 'Vpr', text: '（sich vollziehen）行われる、生じる、推移する' }
      ],
      core: '引き綱を引っ張って「完全に終点まで引き切る（voll- + ziehen）」こと。',
      etymology: 'voll-（完全に；印欧祖語 *pelh₁-「満たす」）＋ziehen（引く；印欧祖語 *dewk-「引く」）。英語 execute, implement に相当。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*dewk-', '*pelh₁-'],
      history_note: '三権分立における「執行権（vollziehende Gewalt）」の語幹であり、国家権力の法的決定を現実に執行する重厚な動詞。',
      example: {
        foreign: 'In der europäischen Gesellschaft hat sich ein grundlegender Wandel <b>vollzogen</b>.',
        ja: 'ヨーロッパ社会において根本的な変革が<b>生じた（推移した）</b>。',
        trans: 'ヨーロッパ社会において根本的な変革が生じた。',
        used_form: 'vollzogen'
      },
      derivatives: [
        { word: 'Vollzug', phonetic: '/fɔlˈtsuːk/', pos: 'Subst. m.', meaning: '執行、履行、刑務所収容' },
        { word: 'vollziehend', phonetic: '/fɔlˈtsiːənt/', pos: 'Adj.', meaning: '執行の（vollziehende Gewalt: 行政権）' }
      ],
      phrases: [
        { foreign: 'ein Urteil vollziehen', ja: '判決を執行する' }
      ],
      lang: 'de',
      pair: 'de_ja'
    },
    {
      id: 'de_pre1_bewaltigen',
      num: 10,
      word: 'bewältigen',
      homographIndex: 1,
      phonetic: '/bəˈvɛltɪɡn̩/',
      grammar_forms: 'bewältigte, hat bewältigt; Vt',
      category: '歴史・心理',
      meanings: [
        { pos: 'Vt', text: '（困難・課題・危機を）克服する、やり遂げる、処理する' },
        { pos: 'Vt', text: '（過去の過ちやトラウマに）真摯に向き合って乗り越える' }
      ],
      core: '圧倒的な困難の上に乗っかり、自らの力で「支配下に収める（Gewalt）」こと。',
      etymology: 'be-＋Gewalt（力、支配；ゲルマン祖語 *waldaną「支配する」、印欧祖語 *wal-「強い、支配する」）。英語 wield やラテン語 valere（強い）と同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*wal-'],
      history_note: 'ドイツ現代史における「過去の克服（Vergangenheitsbewältigung）」という著名な歴史概念の根幹動詞。ナチズムの罪責に国民全体が向き合う哲学的・道徳的営為を指す。',
      example: {
        foreign: 'Die Nation musste lernen, die schmerzhaften Schatten ihrer Vergangenheit aufrichtig zu <b>bewältigen</b>.',
        ja: '国民は自らの過去の痛ましい影に誠実に向き合い<b>克服する</b>ことを学ばねばならなかった。',
        trans: '国民は自らの過去の痛ましい影に誠実に向き合い克服することを学ばねばならなかった。',
        used_form: 'bewältigen'
      },
      derivatives: [
        { word: 'Bewältigung', phonetic: '/bəˈvɛltɪɡʊŋ/', pos: 'Subst. f.', meaning: '克服、処理、解決' }
      ],
      phrases: [
        { foreign: 'eine Krise bewältigen', ja: '危機を乗り切る' }
      ],
      lang: 'de',
      pair: 'de_ja'
    },
    {
      id: 'de_pre1_nachhaltig',
      num: 11,
      word: 'nachhaltig',
      homographIndex: 1,
      phonetic: '/ˈnaːxˌhaltɪç/',
      grammar_forms: 'Adj. (Komp. nachhaltiger, Sup. am nachhaltigsten)',
      category: '環境・経済',
      meanings: [
        { pos: 'Adj.', text: '持続可能な、環境に配慮したサステナブルな' },
        { pos: 'Adj.', text: '（影響などが）長く残る、決定的な、持続的な' }
      ],
      core: '使ったあとも「後ろからずっと支え続けられる（nach- + halten）」こと。',
      etymology: 'nach-（後へ、追って）＋halten（保つ）＋-ig。1713年、ハンス・カール・フォン・カロヴィッツが林業著作で創出したドイツ発祥の概念。英語 sustainable の語源モデル。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*kel-'],
      history_note: 'ザクセン鉱山監督官カロヴィッツが木材資源の乱伐を防ぐため「伐採した分だけ植林し、次世代へ森を持続させる」原則として生み出した世界標準概念（Nachhaltigkeit）。',
      example: {
        foreign: 'Wir müssen Strategien entwickeln, die eine <b>nachhaltig</b> wirtschaftliche Entwicklung garantieren.',
        ja: '私たちは<b>持続可能な</b>経済発展を保証する戦略を策定しなければならない。',
        trans: '私たちは持続可能な経済発展を保証する戦略を策定しなければならない。',
        used_form: 'nachhaltig'
      },
      derivatives: [
        { word: 'Nachhaltigkeit', phonetic: '/ˈnaːxˌhaltɪçkaɪ̯t/', pos: 'Subst. f.', meaning: '持続可能性、サステナビリティ' }
      ],
      phrases: [
        { foreign: 'nachhaltige Wirkung', ja: '永続的な効果、長引く影響' }
      ],
      lang: 'de',
      pair: 'de_ja'
    },
    {
      id: 'de_pre1_begrunden',
      num: 12,
      word: 'begründen',
      homographIndex: 1,
      phonetic: '/bəˈɡʁʏndn̩/',
      grammar_forms: 'begründete, hat begründet; Vt',
      category: '学術・哲学',
      meanings: [
        { pos: 'Vt', text: '（主張・判断の）根拠を挙げる、理由づける' },
        { pos: 'Vt', text: '（学派・伝統・制度を）創始する、基礎づける' }
      ],
      core: '建物の土台のように「大地・底板（Grund）をしっかりと敷き詰める」こと。',
      etymology: 'be-＋Grund（地面、根拠；ゲルマン祖語 *grunduz「海底、地面」、印欧祖語 *gʰrendʰ-）。英語 ground, foundation と同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*gʰrendʰ-'],
      history_note: 'カントの「道徳形而上学の基礎づけ（Grundlegung）」や論理学において、主観的主張に客観的妥当性を与える決定的作業を表す。',
      example: {
        foreign: 'Der Forscher konnte seine kühne Hypothese durch solide empirische Daten überzeugend <b>begründen</b>.',
        ja: '研究者は自らの大胆な仮説を確固たる実証データによって説得的に<b>論拠づける</b>ことができた。',
        trans: '研究者は自らの大胆な仮説を確固たる実証データによって説得的に論拠づけることができた。',
        used_form: 'begründen'
      },
      derivatives: [
        { word: 'Begründung', phonetic: '/bəˈɡʁʏndʊŋ/', pos: 'Subst. f.', meaning: '理由、論拠、創設' },
        { word: 'begründet', phonetic: '/bəˈɡʁʏndət/', pos: 'Adj.', meaning: '正当な理由のある' }
      ],
      phrases: [
        { foreign: 'einen Antrag begründen', ja: '申請の理由を説明する' }
      ],
      lang: 'de',
      pair: 'de_ja'
    },
    {
      id: 'de_pre1_verhandeln',
      num: 13,
      word: 'verhandeln',
      homographIndex: 1,
      phonetic: '/fɛɐ̯ˈhandl̩n/',
      grammar_forms: 'verhandelte, hat verhandelt; Vt / Vi',
      category: '政治・経済',
      meanings: [
        { pos: 'Vt / Vi', text: '（条約・条件・価格について）交渉する、協議する' },
        { pos: 'Vt', text: '【法学】（法廷で事件を）審理する' }
      ],
      core: '物事をお互いの「手の平（Hand）の上に乗せてやり取りし、合意を図る」こと。',
      etymology: 'ver-＋handeln（商う、行動する；Hand「手」に由来、ゲルマン祖語 *handuz）。英語 negotiate, handle と思想的同根。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*kont-'],
      history_note: '中世のハンザ同盟や商取引で品物を手にとって商談した行為から、近現代の労使交渉や国際外交の最高度対話用語へ進化した。',
      example: {
        foreign: 'Die Delegierten müssen Tag und Nacht <b>verhandeln</b>, um einen Waffenstillstand zu erreichen.',
        ja: '代表団は停戦を達成するために昼夜を問わず<b>交渉し</b>なければならない。',
        trans: '代表団は停戦を達成するために昼夜を問わず交渉しなければならない。',
        used_form: 'verhandeln'
      },
      derivatives: [
        { word: 'Verhandlung', phonetic: '/fɛɐ̯ˈhandlʊŋ/', pos: 'Subst. f.', meaning: '交渉、協議、法廷審理' },
        { word: 'Verhandlungsbasis', phonetic: '/fɛɐ̯ˈhandlʊŋsˌbaːzɪs/', pos: 'Subst. f.', meaning: '交渉の土台' }
      ],
      phrases: [
        { foreign: 'vor Gericht verhandeln', ja: '法廷で審理する' }
      ],
      lang: 'de',
      pair: 'de_ja'
    },
    {
      id: 'de_pre1_widerrufen',
      num: 14,
      word: 'widerrufen',
      homographIndex: 1,
      phonetic: '/ˌviːdɐˈʁuːfn̩/',
      grammar_forms: 'widerrief, hat widerrufen; Vt (untrennbar)',
      category: '法学・契約',
      meanings: [
        { pos: 'Vt', text: '（発言・命令・遺言・契約などを）撤回する、取り消す、否認する' }
      ],
      core: '放った声を「逆方向へ呼び戻して帳消しにする（wider- + rufen）」こと。',
      etymology: 'wider-（逆へ、反して）＋rufen（叫ぶ、呼ぶ；ゲルマン祖語 *hrōpaną、印欧祖語 *hrewp-）。英語 revoke と同一の造語法。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*hrewp-'],
      history_note: '宗教改革期にマルティン・ルターがヴォルムス帝国議会で自らの著作を「撤回せよ」と迫られ、"Ich kann nicht widerrufen"（私は撤回できない）と拒絶した歴史的逸話で知られる。',
      example: {
        foreign: 'Der Zeuge hat beschlossen, seine frühere Aussage vor Gericht feierlich zu <b>widerrufen</b>.',
        ja: '証人は法廷における前回の証言を公式に<b>撤回する</b>ことを決意した。',
        trans: '証人は法廷における前回の証言を公式に撤回することを決意した。',
        used_form: 'widerrufen'
      },
      derivatives: [
        { word: 'Widerruf', phonetic: '/ˈviːdɐˌʁuːf/', pos: 'Subst. m.', meaning: '撤回、取り消し' },
        { word: 'unwiderruflich', phonetic: '/ˌʊnviːdɐˈʁuːflɪç/', pos: 'Adj.', meaning: '取り返しのつかない、最終決定の' }
      ],
      phrases: [
        { foreign: 'sein Wort widerrufen', ja: '前言を撤回する' }
      ],
      lang: 'de',
      pair: 'de_ja'
    },
    {
      id: 'de_pre1_vorschreiben',
      num: 15,
      word: 'vorschreiben',
      homographIndex: 1,
      phonetic: '/ˈfoːɐ̯ˌʃʁaɪ̯bn̩/',
      grammar_forms: 'schrieb vor, hat vorgeschrieben; Vt (trennbar)',
      category: '法律・規則',
      meanings: [
        { pos: 'Vt', text: '（法規や権威が義務として）規定する、指示する、命令する' }
      ],
      core: 'あらかじめ前もって「紙に書いて目の前に突きつける（vor- + schreiben）」こと。',
      etymology: 'vor-（前に）＋schreiben（書く）。schreiben はラテン語 scribere（書く、刻む；印欧祖語 *skribʰ-）からの借用語。英語 prescribe と完全同一構造。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*skribʰ-'],
      history_note: 'ラテン語 praescribere（英語 prescribe）をゲルマン語の接頭辞 vor- でそのまま訳出した公法用語。法規による義務付けを意味する。',
      example: {
        foreign: 'Das neue Sicherheitsgesetz will strenge Umweltstandards für alle Betriebe <b>vorschreiben</b>.',
        ja: '新しい安全法は全事業体に対して厳格な環境基準を<b>規定する（義務付ける）</b>方針である。',
        trans: '新しい安全法は全事業体に対して厳格な環境基準を規定する方針である。',
        used_form: 'vorschreiben'
      },
      derivatives: [
        { word: 'Vorschrift', phonetic: '/ˈfoːɐ̯ˌʃʁɪft/', pos: 'Subst. f.', meaning: '規定、規則、指示' },
        { word: 'vorschriftsmäßig', phonetic: '/ˈfoːɐ̯ʃʁɪftsˌmɛːsɪç/', pos: 'Adj.', meaning: '規則通りの' }
      ],
      phrases: [
        { foreign: 'nach Vorschrift handeln', ja: 'マニュアル・規則通りに行動する' }
      ],
      lang: 'de',
      pair: 'de_ja'
    },
    {
      id: 'de_pre1_verwerfen',
      num: 16,
      word: 'verwerfen',
      homographIndex: 1,
      phonetic: '/fɛɐ̯ˈvɛʁfn̩/',
      grammar_forms: 'verwarf, hat verworfen; Vt (untrennbar)',
      category: '法学・哲学',
      meanings: [
        { pos: 'Vt', text: '（提案・法案・学説・異議などを）却下する、否決する、退ける' }
      ],
      core: '差し出されたものを「不要物として遠くへ投げ捨てる（ver- + werfen）」こと。',
      etymology: 'ver-（除外・消失）＋werfen（投げる；ゲルマン祖語 *werpaną、印欧祖語 *werp-「回す、投げる」）。ラテン語 reicere（英語 reject）と等価。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*werp-'],
      history_note: 'ドイツ連邦憲法裁判所（BVerfG）が違憲と判断した法案や上告を公式に退ける最高司法用語。',
      example: {
        foreign: 'Das Verfassungsgericht musste die eingereichte Klage als unbegründet <b>verwerfen</b>.',
        ja: '憲法裁判所は提出された訴えを理由不十分として<b>却下し</b>なければならなかった。',
        trans: '憲法裁判所は提出された訴えを理由不十分として却下しなければならなかった。',
        used_form: 'verwerfen'
      },
      derivatives: [
        { word: 'Verwerfung', phonetic: '/fɛɐ̯ˈvɛʁfʊŋ/', pos: 'Subst. f.', meaning: '却下、断層、歪み' },
        { word: 'verwerflich', phonetic: '/fɛɐ̯ˈvɛʁflɪç/', pos: 'Adj.', meaning: '非難すべき、言語道断の' }
      ],
      phrases: [
        { foreign: 'einen Plan verwerfen', ja: '計画を白紙撤回する・放棄する' }
      ],
      lang: 'de',
      pair: 'de_ja'
    },
    {
      id: 'de_pre1_beanspruchen',
      num: 17,
      word: 'beanspruchen',
      homographIndex: 1,
      phonetic: '/bəˈʔanˌʃpʁʊxn̩/',
      grammar_forms: 'beanspruchte, hat beansprucht; Vt',
      category: '法律・技術',
      meanings: [
        { pos: 'Vt', text: '（権利・保護・手当などを正当なものとして）要求する、請求する' },
        { pos: 'Vt', text: '（時間・注意力・体力を）酷使する、必要とする' }
      ],
      core: '対象に向かって「自らのものだと声高に発話・名乗りをあげる（be- + an- + sprechen）」こと。',
      etymology: '名詞 Anspruch（要求、権利；an-「〜へ」＋sprechen「話す」）から派生。sprechen は印欧祖語 *sprek-（話す、散らす）に遡る。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*sprek-'],
      history_note: '法学において権利者が正当な法的請求権（Anspruch）を行使する行為、および工学において材料にかかる負荷（Beanspruchung）の双方で中核語。',
      example: {
        foreign: 'Diese anspruchsvolle Analyse wird deine volle Konzentration über mehrere Stunden <b>beanspruchen</b>.',
        ja: 'この難度の高い分析は、何時間にもわたって君の全集中力を<b>必要とする（酷使する）</b>だろう。',
        trans: 'この難度の高い分析は、何時間にもわたって君の全集中力を必要とするだろう。',
        used_form: 'beanspruchen'
      },
      derivatives: [
        { word: 'Anspruch', phonetic: '/ˈanˌʃpʁʊx/', pos: 'Subst. m.', meaning: '要求、権利、高い要求水準' },
        { word: 'anspruchsvoll', phonetic: '/ˈanˌʃpʁʊxsfɔl/', pos: 'Adj.', meaning: '要求の高い、ハイレベルな' }
      ],
      phrases: [
        { foreign: 'ein Recht beanspruchen', ja: '権利を主張・行使する' }
      ],
      lang: 'de',
      pair: 'de_ja'
    },
    {
      id: 'de_pre1_abstimmen',
      num: 18,
      word: 'abstimmen',
      homographIndex: 1,
      phonetic: '/ˈapˌʃtɪmən/',
      grammar_forms: 'stimmte ab, hat abgestimmt; Vi / Vt (trennbar)',
      category: '政治・組織',
      meanings: [
        { pos: 'Vi', text: '（über 〜について）投票する、採決を行う' },
        { pos: 'Vt', text: '（auf/mit 〜と）波長・スケジュールを調整する、調和させる' }
      ],
      core: '全員の「声（Stimme）を一つずつ数え上げて決着させる」、または「楽器の弦の音を合わせる」こと。',
      etymology: 'ab-（切り離し、完了）＋stimmen（声を出す、調律する；Stimme「声」に由来、印欧祖語 *stem-「支柱、立ち木」）。英語 tune, vote と同等機能。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*stem-'],
      history_note: 'ゲルマン部族の民会（Thing）において、戦士たちが武器を打ち鳴らして賛否の声（Stimme）を響かせた採決の伝統に根ざす。',
      example: {
        foreign: 'Das Parlament wird morgen über den neuen Haushaltsentwurf endgültig <b>abstimmen</b>.',
        ja: '議会は明日、新しい予算案について最終的な<b>採決を行う（投票する）</b>予定だ。',
        trans: '議会は明日、新しい予算案について最終的な採決を行う予定だ。',
        used_form: 'abstimmen'
      },
      derivatives: [
        { word: 'Abstimmung', phonetic: '/ˈapˌʃtɪmʊŋ/', pos: 'Subst. f.', meaning: '採決、投票、調整' }
      ],
      phrases: [
        { foreign: 'sich mit jdm. abstimmen', ja: '人と綿密に打ち合わせ・調整をする' }
      ],
      lang: 'de',
      pair: 'de_ja'
    },
    {
      id: 'de_pre1_vernachlassigen',
      num: 19,
      word: 'vernachlässigen',
      homographIndex: 1,
      phonetic: '/fɛɐ̯ˈnaːxˌlɛsɪɡn̩/',
      grammar_forms: 'vernachlässigte, hat vernachlässigt; Vt (untrennbar)',
      category: '教育・倫理',
      meanings: [
        { pos: 'Vt', text: '（義務・健康・子供・学業などを）怠る、おろそかにする、軽視する' }
      ],
      core: '後回し（nach-）にして手綱を「緩めて放置する（lassen）」こと。',
      etymology: 'ver-＋nachlässig（だらしない；nach「後ろ」＋lassen「放任する」、印欧祖語 *lēd- / *lē-「緩める、疲れる」）。英語 neglect と同等。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*lē-'],
      history_note: '教育学や倫理学において、注意力やケアを放棄した過失（怠慢：Vernachlässigung）を表す重要動詞。',
      example: {
        foreign: 'Bei aller beruflichen Ambition darf man die eigene Gesundheit keineswegs <b>vernachlässigen</b>.',
        ja: 'どれほど仕事上の野心があろうとも、自分自身の健康を決して<b>おろそかにして</b>はならない。',
        trans: 'どれほど仕事上の野心があろうとも、自分自身の健康を決しておろそかにしてはならない。',
        used_form: 'vernachlässigen'
      },
      derivatives: [
        { word: 'Vernachlässigung', phonetic: '/fɛɐ̯ˈnaːxˌlɛsɪɡʊŋ/', pos: 'Subst. f.', meaning: 'ネグレクト、怠慢、放置' }
      ],
      phrases: [
        { foreign: 'seine Pflichten vernachlässigen', ja: '義務を怠る' }
      ],
      lang: 'de',
      pair: 'de_ja'
    },
    {
      id: 'de_pre1_einschranken',
      num: 20,
      word: 'einschränken',
      homographIndex: 1,
      phonetic: '/ˈaɪ̯nˌʃʁɛŋkn̩/',
      grammar_forms: 'schränkte ein, hat eingeschränkt; Vt / Vpr (trennbar)',
      category: '政治・経済',
      meanings: [
        { pos: 'Vt', text: '（自由・予算・権利・活動などを）制限する、縮小する' },
        { pos: 'Vpr', text: '（sich einschränken）支出を切り詰める、節制する' }
      ],
      core: '周りに「柵や関門（Schranke）を巡らせて」、行動範囲を狭めること。',
      etymology: 'ein-（内へ）＋Schranke（柵、境界、関門；ゲルマン祖語 *skrankō、印欧祖語 *skrenk-「曲げる、網」）。英語 restrict, limit と同等。',
      etymologyConfidence: 'certain',
      etymologyTags: ['*skrenk-'],
      history_note: '憲法学において基本的人権を公共の福祉等のために「制限する（Einschränkung der Grundrechte）」法律用語として最重要。',
      example: {
        foreign: 'Der Staat darf die Meinungsfreiheit nur unter außergewöhnlichen Bedingungen <b>einschränken</b>.',
        ja: '国家は極めて例外的な条件下においてのみ表現の自由を<b>制限する</b>ことが許される。',
        trans: '国家は極めて例外的な条件下においてのみ表現の自由を制限することが許される。',
        used_form: 'einschränken'
      },
      derivatives: [
        { word: 'Einschränkung', phonetic: '/ˈaɪ̯nˌʃʁɛŋkʊŋ/', pos: 'Subst. f.', meaning: '制限、制約、節制' },
        { word: 'eingeschränkt', phonetic: '/ˈaɪ̯nɡəˌʃʁɛŋkt/', pos: 'Adj.', meaning: '制限された、限られた' }
      ],
      phrases: [
        { foreign: 'die Ausgaben einschränken', ja: '支出を切り詰める' }
      ],
      lang: 'de',
      pair: 'de_ja'
    }
  ];

  const PACKS = {
    academic: EN_JA_STARTER,
    classical_roots: CLASSICAL_ROOTS_STARTER,
    philosophy: PHILOSOPHY_STARTER,
    business: EN_JA_STARTER_BUSINESS,
    essential: EN_JA_STARTER_ESSENTIAL,
    fr_pre1: FR_JA_STARTER,
    de_pre1: DE_JA_STARTER
  };

  const PACK_METADATA = {
    academic: { id: 'academic', lang: 'en', name: '学術・教養コア20選', desc: '哲学・認知科学・思想史を貫く深層語彙', badge: '学術・思想', count: 20, wordsPreview: 'epiphany, lucid, constant, premise...' },
    eiken_pre1_pack1: { id: 'eiken_pre1_pack1', lang: 'en', name: '英検準1級 語根パック①【掴む・運ぶ・立つ】', desc: '*kap-, *bher-, *sta- で制覇する抽象動詞・制度語彙群', badge: '英検準1級・頻出', count: 25, wordsPreview: 'conceive, deceive, perceive, constitute, destitute, defer, proffer...' },
    eiken_pre1_pack2: { id: 'eiken_pre1_pack2', lang: 'en', name: '英検準1級 語根パック②【見る・言う・保つ】', desc: '*spec-, *deik-, *ten- で覚える観察・言明・持続の重要語', badge: '英検準1級・頻出', count: 20, wordsPreview: 'circumspect, conspicuous, vindicate, verdict, sustain, abstain...' },
    eiken_pre1_pack3: { id: 'eiken_pre1_pack3', lang: 'en', name: '英検準1級 語根パック③【動かす・座る・従う】', desc: '*ag-, *sed-, *sekw- で整理する社会・法学・論理語彙', badge: '英検準1級・頻出', count: 20, wordsPreview: 'agitate, cogent, preside, subsidize, subsequent, prosecute...' },
    eiken_pre1_pack4: { id: 'eiken_pre1_pack4', lang: 'en', name: '英検準1級 難単語パック【接頭辞の対比動詞】', desc: 'prescribe / proscribe / ascribe や subvert / avert の混同を語根で根絶', badge: '英検準1級・精選', count: 20, wordsPreview: 'prescribe, proscribe, ascribe, inscribe, subvert, avert, compel...' },
    classical_roots: { id: 'classical_roots', lang: 'en', name: 'ラテン・ギリシャ古典語根マスター', desc: '*ǵneh₃-, *bʰer-, *speḱ- 等の深層印欧祖語ファミリー', badge: '語源・比較言語学', count: 5, wordsPreview: 'gnosis, transfer, circumspect, dictum, evidence' },
    philosophy: { id: 'philosophy', lang: 'en', name: '西洋哲学・人文学キーコンセプト', desc: '目的論、パラダイム、存在論、弁証法、アポリア', badge: '形而上学・認識論', count: 5, wordsPreview: 'teleology, paradigm, ontology, dialectic, aporia' },
    business: { id: 'business', lang: 'en', name: '実践ビジネス・TOEIC 800+ 20選', desc: '契約・財務・市場分析を支える実務必須語彙', badge: '実務・経済', count: 20, wordsPreview: 'consolidate, diversify, leverage, volatile...' },
    essential: { id: 'essential', lang: 'en', name: '重要語根ファミリー20選', desc: '*speḱ- (見る), *deyk- (言う) など語根で覚える高速基礎群', badge: '語根基礎', count: 20, wordsPreview: 'spectacle, predict, contradict, factory...' },
    fr_pre1: { id: 'fr_pre1', lang: 'fr', name: '仏検準1級・DELF B2 語根コア20選', desc: '*kap-, *sta-, *ten-, *bher- 等ラテン語直系の思考・認識・制度動詞群', badge: '仏検準1級・DELF B2', count: 20, wordsPreview: 'concevoir, percevoir, constater, maintenir, susciter, différer...' },
    de_pre1: { id: 'de_pre1', lang: 'de', name: '独検準1級・Goethe B2 語根・分離動詞20選', desc: '*sta-, *dʰregʰ-, *dewk-, *kel- 等ゲルマン祖語と接頭辞の構造化動詞群', badge: '独検準1級・Goethe B2', count: 20, wordsPreview: 'bestehen, entstehen, einbeziehen, bewältigen, nachhaltig, übertragen...' }
  };

  function buildStarterPackGalleryHtml(currentLang = 'all') {
    const packs = Object.values(PACK_METADATA);
    const cards = packs.map(p => {
      const langLabel = p.lang === 'fr' ? '[仏語] ' : (p.lang === 'de' ? '[独語] ' : '[英語] ');
      const isMatch = (currentLang === 'all' || !p.lang || p.lang === currentLang);
      const matchBadge = isMatch ? '<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:rgba(52,211,153,0.15);color:#10b981;font-weight:600">現在選択中の言語</span>' : '';
      return `
      <div class="starter-pack-card" data-pack="${p.id}" data-lang="${p.lang || 'en'}" style="${isMatch ? 'border-color:var(--ac);' : ''}">
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
          <h3>公式スターターパック ＆ 語根マスター（英語・フランス語・ドイツ語）</h3>
          <p>単語の手動登録は不要です。言語学者・認知科学者によって厳選・構造化された学術・英検・仏検・独検準1級語彙を1クリックでライブラリへ導入し、すぐにFSRS学習を開始できます。</p>
        </div>
        <div class="starter-pack-grid">${cards}</div>
      </div>
    `;
  }

  function getStarterPack(lang = 'en', packType = 'academic') {
    // フランス語パック解決
    if (packType === 'fr_pre1' || (lang === 'fr' && (packType === 'academic' || packType === 'default'))) {
      return JSON.parse(JSON.stringify(FR_JA_STARTER));
    }
    // ドイツ語パック解決
    if (packType === 'de_pre1' || (lang === 'de' && (packType === 'academic' || packType === 'default'))) {
      return JSON.parse(JSON.stringify(DE_JA_STARTER));
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
    const list = PACKS[packType] || (lang === 'fr' ? FR_JA_STARTER : (lang === 'de' ? DE_JA_STARTER : (PACKS.academic || EN_JA_STARTER)));
    return JSON.parse(JSON.stringify(list));
  }

  function getStarterPacksInfo() {
    return Object.values(PACK_METADATA);
  }

  function populateStarterPack(currentEntries, lang = 'en', packType = 'academic', targetPairKey = null) {
    let resolvedPack = packType;
    if (packType === 'academic') {
      if (lang === 'fr') resolvedPack = 'fr_pre1';
      else if (lang === 'de') resolvedPack = 'de_pre1';
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
      const itemLang = item.lang || lang;
      const hIdx = Number(item.homographIndex) || 1;
      const k = makeLookupKey(item.word, itemLang, hIdx);
      if (!existingWords.has(k)) {
        maxNum++;
        const cleanSlug = String(item.word || '').trim().toLowerCase().replace(/[^a-z0-9\u00C0-\u024F\u3040-\u30FF\u4E00-\u9FFF]+/g, '_') || String(maxNum);
        const cardId = item.id || `starter_${resolvedPack}_${cleanSlug}${hIdx > 1 ? '_' + hIdx : ''}`;
        const cardWk = item.wordKey || makeWordKey(item.word, itemLang, item.meanings?.[0]?.pos, hIdx);
        const card = {
          ...item,
          id: cardId,
          wordKey: cardWk,
          homographIndex: hIdx,
          version: Number(item.version) || 1,
          num: maxNum,
          lang: itemLang,
          category: item.category || (resolvedPack.startsWith('eiken_') ? '英検準1級' : '一般・その他'),
          folder: item.folder || defaultFolder,
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
    const resolved = resolvePackId(packId, lang);
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
            return json;
          }
        }
      } catch (err) {
        // オフライン・フォールバック
      }
    }
    return getStarterPack(resolved, lang);
  }

  function registerPackData(packId, items) {
    if (packId && Array.isArray(items)) {
      PACKS[packId] = items;
      return true;
    }
    return false;
  }

  global.VocabStarterPack = {
    getStarterPack,
    getStarterPacksInfo,
    populateStarterPack,
    buildStarterPackGalleryHtml,
    loadStarterPackData,
    registerPackData,
    PACKS,
    PACK_METADATA
  };

})(typeof window !== 'undefined' ? window : globalThis);
