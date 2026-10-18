/**
 * Vocab Vault — 英検準1級（CEFR B2 / TOEIC 700〜850）語根マスターカタログ (js/eiken_catalog.js)
 * 頻出トップ16語根・厳選200語以上の完全構造化辞書データ
 * ゼロAPIコスト・完全オフライン即時展開・Fog of War（未開拓ノード）アンロック対応
 */
(function(global) {
  'use strict';

  /**
   * 英検準1級 頻出主要語根メタデータ (トップ16)
   */
  const EIKEN_PRE1_ROOTS = [
    {
      rootKey: '*kap-',
      label: '*kap-',
      meaning: '掴む、捉える、受ける',
      rank: 1,
      desc: 'ラテン語 capere（取る）に由来。conceive, deceive, perceive や anticipate, emancipate, susceptible など、準1級最頻出の思考・知覚・抽象動詞の中核を成す。'
    },
    {
      rootKey: '*sta-',
      label: '*sta-',
      meaning: '立つ、静止する、堅固である',
      rank: 2,
      desc: 'ラテン語 stare（立つ）や statuere（立てる）に由来。constitute, destitute, obstinate, statute, extant など、制度や確固たる状態を表す抽象語彙が集中。'
    },
    {
      rootKey: '*bher-',
      label: '*bher-',
      meaning: '運ぶ、耐える、生む',
      rank: 3,
      desc: 'ラテン語 ferre（運ぶ）に由来。transfer, defer, infer, proffer, fertile, deference など、情報や敬意を「届ける・生み出す」重要語の宝庫。'
    },
    {
      rootKey: '*spec-',
      label: '*spec-',
      meaning: '見る、観察する',
      rank: 4,
      desc: 'ラテン語 specere（見る）に由来。inspect, retrospect, prospect, circumspect, conspicuous, despicable など、視線や展望に関する高頻度語彙群。'
    },
    {
      rootKey: '*ten-',
      label: '*ten-',
      meaning: '伸ばす、張る、保つ',
      rank: 5,
      desc: 'ラテン語 tenere（保つ）や tendere（伸ばす）に由来。sustain, abstain, pertain, retain, tenant, tenuous, contentious など、関係や状態の持続を表す重要動詞・形容詞。'
    },
    {
      rootKey: '*sed-',
      label: '*sed-',
      meaning: '座る、落ち着く',
      rank: 6,
      desc: 'ラテン語 sedere（座る）に由来。reside, preside, subsidize, sedentary, supersede, assess, sediment など、役職や定住・財政支援に直結する公的語彙。'
    },
    {
      rootKey: '*ag-',
      label: '*ag-',
      meaning: '動かす、行う、導く',
      rank: 7,
      desc: 'ラテン語 agere（動かす・駆る）に由来。agitate, cogent, prodigal, coagulate, proactive, agile, mitigate など、社会運動や行動力を示す難関語群。'
    },
    {
      rootKey: '*dhe-',
      label: '*dhe-',
      meaning: '置く、作る、据える',
      rank: 8,
      desc: 'ラテン語 facere（作る）に由来。affect, defect, infect, proficient, deficient, facade, forfeit, artifact など、行為や結果・出来栄えを表す根幹語彙。'
    },
    {
      rootKey: '*deik-',
      label: '*deik-',
      meaning: '指し示す、告げる、宣言する',
      rank: 9,
      desc: 'ラテン語 dicere（言う）に由来。predict, contradict, dedicate, vindicate, verdict, indict, abdicate など、言明や司法・公式宣言に関わる必須語。'
    },
    {
      rootKey: '*sekw-',
      label: '*sekw-',
      meaning: '従う、続く',
      rank: 10,
      desc: 'ラテン語 sequi（従う）に由来。consequence, subsequent, persecute, prosecute, execute, ensue, obsequious など、論理的帰結や法的手続きの基本語。'
    },
    {
      rootKey: '*leg-',
      label: '*leg-',
      meaning: '集める、選ぶ、読む、話す',
      rank: 11,
      desc: 'ラテン語 legere（集める・読む）に由来。eligible, legible, diligent, negligent, delegate, colleague, legacy など、資格・勤勉さ・選抜を表す実務必須語。'
    },
    {
      rootKey: '*men-',
      label: '*men-',
      meaning: '心、考える、記憶',
      rank: 12,
      desc: '印欧祖語 *men- に由来。admonish, monumental, demented, reminisce, mentor, mentality など、精神活動や戒め・記念碑的規模を表現する教養語。'
    },
    {
      rootKey: '*weid-',
      label: '*weid-',
      meaning: '見る、知る',
      rank: 13,
      desc: 'ラテン語 videre（見る）に由来。evident, provision, improvise, prudent, supervise, revise, envisage など、先見の明や証拠・準備に関わる頻出語。'
    },
    {
      rootKey: '*pel-',
      label: '*pel-',
      meaning: '押す、駆り立てる',
      rank: 14,
      desc: 'ラテン語 pellere（押す・駆る）に由来。compel, expel, repel, propel, impulsive, compulsory, dispel など、外的・内的な強制力や反発を表す語彙群。'
    },
    {
      rootKey: '*vert-',
      label: '*vert-',
      meaning: '回す、向ける',
      rank: 15,
      desc: 'ラテン語 vertere（回す・向ける）に由来。convert, divert, invert, revert, subvert, avert, adverse, controversy など、方向転換や論争・逆境を示す抽象語。'
    },
    {
      rootKey: '*grebh-',
      label: '*grebh-',
      meaning: '引っ掻く、書く、刻む',
      rank: 16,
      desc: 'ラテン語 scribere（書く）に由来。prescribe, proscribe, ascribe, inscribe, subscribe, transcribe, circumscribe など、規定や帰属・限定を表す接頭辞対比の代表格。'
    }
  ];

  /**
   * 厳選200語以上の完全構造化辞書マスターデータ
   */
  const EIKEN_PRE1_WORDS = [
    // ------------------------------------------------------------------------
    // Root 1: *kap- (掴む、捉える、受ける)
    // ------------------------------------------------------------------------
    {
      word: 'conceive',
      phonetic: '/kənˈsiːv/',
      meanings: [{ pos: 'V[T/I]', text: '（考え・計画などを）心に思いつく、抱く；（子供を）妊娠する' }],
      core: '心の中にアイデアをしっかりと「掴み取る（con- 完全に + ceive 掴む）」こと。',
      etymology: 'ラテン語 concipere（心に抱く、妊娠する；con-「完全に」＋ capere「掴む」）に由来し、印欧祖語 *kap-（掴む）に遡る。',
      etymologyTags: ['*kap-'],
      example: {
        foreign: 'The scientist was unable to <b>conceive</b> of any other explanation for the anomalies.',
        ja: 'その科学者は、その異常現象について他のいかなる説明も<b>思いつく</b>ことができなかった。',
        used_form: 'conceive'
      },
      derivatives: [{ word: 'concept', phonetic: '/ˈkɒnsept/', pos: 'N[C]', meaning: '概念、着想' }, { word: 'conception', phonetic: '/kənˈsepʃn/', pos: 'N[C, U]', meaning: '着想、妊娠' }]
    },
    {
      word: 'deceive',
      phonetic: '/dɪˈsiːv/',
      meanings: [{ pos: 'V[T]', text: '〜を騙す、欺く、思い違いをさせる' }],
      core: '相手の正当な受け取り場所から「掴み損ねさせる（de- 離れて + ceive 掴む）」こと。',
      etymology: 'ラテン語 decipere（罠にかける、欺く；de-「下へ、離れて」＋ capere「掴む」）に由来し、印欧祖語 *kap- に遡る。',
      etymologyTags: ['*kap-'],
      example: {
        foreign: 'He tried to <b>deceive</b> the public with falsified statistical data.',
        ja: '彼は改ざんされた統計データを用いて国民を<b>騙そう</b>とした。',
        used_form: 'deceive'
      },
      derivatives: [{ word: 'deception', phonetic: '/dɪˈsepʃn/', pos: 'N[C, U]', meaning: '詐欺、騙し' }, { word: 'deceptive', phonetic: '/dɪˈseptɪv/', pos: 'Adj', meaning: '人を惑わす、見かけ倒しの' }]
    },
    {
      word: 'perceive',
      phonetic: '/pəˈsiːv/',
      meanings: [{ pos: 'V[T]', text: '（五感で）〜を知覚する、気づく；〜であると理解する・認識する' }],
      core: '感覚器官を通して情報を「余すところなく完全に掴み取る（per- 完全に + ceive 掴む）」こと。',
      etymology: 'ラテン語 percipere（完全に把握する；per-「余すところなく」＋ capere「掴む」）に由来し、印欧祖語 *kap- に遡る。',
      etymologyTags: ['*kap-'],
      example: {
        foreign: 'Animals can often <b>perceive</b> subtle changes in environmental pressure.',
        ja: '動物は環境気圧の微妙な変化を<b>知覚する</b>ことができる場合が多い。',
        used_form: 'perceive'
      },
      derivatives: [{ word: 'perception', phonetic: '/pəˈsepʃn/', pos: 'N[C, U]', meaning: '知覚、認識' }, { word: 'perceptive', phonetic: '/pəˈseptɪv/', pos: 'Adj', meaning: '洞察力の鋭い' }]
    },
    {
      word: 'anticipate',
      phonetic: '/ænˈtɪsɪpeɪt/',
      meanings: [{ pos: 'V[T]', text: '〜を予期する、見込む；〜を楽しみに待つ' }],
      core: '事が起きる前に「先回りして手中に掴む（anti- 前もって + cip 掴む）」こと。',
      etymology: 'ラテン語 anticipare（前もって手に入れる；anti-「前に」＋ capere「取る」）に由来し、印欧祖語 *kap- に遡る。',
      etymologyTags: ['*kap-'],
      example: {
        foreign: 'Economists <b>anticipate</b> a gradual recovery in consumer spending next quarter.',
        ja: '経済学者たちは次四半期における個人消費の緩やかな回復を<b>見込んでいる</b>。',
        used_form: 'anticipate'
      },
      derivatives: [{ word: 'anticipation', phonetic: '/ænˌtɪsɪˈpeɪʃn/', pos: 'N[U]', meaning: '予期、期待' }]
    },
    {
      word: 'emancipate',
      phonetic: '/ɪˈmænsɪpeɪt/',
      meanings: [{ pos: 'V[T]', text: '（奴隷・被支配者を法や束縛から）解放する、自由にする' }],
      core: '他者の手権力（manus 手）の「掴み（cipare）から外へ（e- 外へ）解き放つ」こと。',
      etymology: 'ラテン語 emancipare（親権から解放する；e-「外へ」＋ manus「手」＋ capere「取る」）に由来し、印欧祖語 *kap- に遡る。',
      etymologyTags: ['*kap-'],
      example: {
        foreign: 'The historic decree aimed to <b>emancipate</b> all enslaved individuals nationwide.',
        ja: 'その歴史的な布告は、全国のすべての奴隷状態にある人々を<b>解放する</b>ことを目的とした。',
        used_form: 'emancipate'
      },
      derivatives: [{ word: 'emancipation', phonetic: '/ɪˌmænsɪˈpeɪʃn/', pos: 'N[U]', meaning: '奴隷解放、自由化' }]
    },
    {
      word: 'susceptible',
      phonetic: '/səˈseptəbl/',
      meanings: [{ pos: 'Adj', text: '（病気・影響などを）受けやすい、感染しやすい、影響されやすい' }],
      core: '下側から手を出して「受動的に掴まれてしまう（sus- 下から + cept 掴む + ible できる）」状態。',
      etymology: 'ラテン語 susceptibilis（受けやすい；sus-「下から」＋ capere「取る」）に由来し、印欧祖語 *kap- に遡る。',
      etymologyTags: ['*kap-'],
      example: {
        foreign: 'Young seedlings are particularly <b>susceptible</b> to sudden frost.',
        ja: '若い苗木は、突然の霜の影響を特に<b>受けやすい</b>。',
        used_form: 'susceptible'
      },
      derivatives: [{ word: 'susceptibility', phonetic: '/səˌseptəˈbɪləti/', pos: 'N[U]', meaning: '感受性、罹患率' }]
    },
    {
      word: 'capture',
      phonetic: '/ˈkæptʃə(r)/',
      meanings: [{ pos: 'V[T]', text: '〜を捕らえる、捕獲する；（人心・注意などを）捉える' }],
      core: '手でしっかりと「掴み取ること」。',
      etymology: 'ラテン語 captura（捕獲）に由来し、動詞 capere（捕らえる）および印欧祖語 *kap- に遡る。',
      etymologyTags: ['*kap-'],
      example: {
        foreign: 'The documentary managed to <b>capture</b> the authentic spirit of the festival.',
        ja: 'そのドキュメンタリー映画は、祭りの真正な精神を鮮やかに<b>捉える</b>ことに成功した。',
        used_form: 'capture'
      }
    },
    {
      word: 'capacity',
      phonetic: '/kəˈpæsəti/',
      meanings: [{ pos: 'N[C, U]', text: '収容能力、定員；受容力、才能' }],
      core: 'どれだけの分量を「中に抱え込んで掴んでおけるか」という度合い。',
      etymology: 'ラテン語 capacitas（受容能力）に由来し、capax（多くを容れる；capere「取る」）から派生。印欧祖語 *kap- に遡る。',
      etymologyTags: ['*kap-'],
      example: {
        foreign: 'The stadium was filled to its maximum seating <b>capacity</b>.',
        ja: 'そのスタジアムは最大収容<b>定員</b>まで満員になった。',
        used_form: 'capacity'
      }
    },
    {
      word: 'municipal',
      phonetic: '/mjuːˈnɪsɪpl/',
      meanings: [{ pos: 'Adj', text: '市町村の、自治体の、都市の' }],
      core: '市民としての公共の義務（munus）を「自ら引き受けて掴む（capere）」地方自治体。',
      etymology: 'ラテン語 municipalis（自治市の；munus「職務・義務」＋ capere「取る」）に由来し、印欧祖語 *kap- に遡る。',
      etymologyTags: ['*kap-'],
      example: {
        foreign: 'Residents voted overwhelmingly for the new <b>municipal</b> recycling initiative.',
        ja: '住民たちは新しい<b>自治体の</b>リサイクル計画に圧倒的多数で賛成票を投じた。',
        used_form: 'municipal'
      }
    },
    {
      word: 'recipient',
      phonetic: '/rɪˈsɪpiənt/',
      meanings: [{ pos: 'N[C]', text: '受取人、受贈者、レシピエント' }],
      core: '送られてきたものを「後ろから戻して受け取る（re- 再び + cip 掴む + ent 人）」人。',
      etymology: 'ラテン語 recipiens（受け取る人；re-「後ろへ」＋ capere「取る」）に由来し、印欧祖語 *kap- に遡る。',
      etymologyTags: ['*kap-'],
      example: {
        foreign: 'The Nobel laureate was a worthy <b>recipient</b> of the international honor.',
        ja: 'ノーベル賞受賞者は、その国際的栄誉のふさわしい<b>受取人</b>であった。',
        used_form: 'recipient'
      }
    },
    {
      word: 'incipient',
      phonetic: '/ɪnˈsɪpiənt/',
      meanings: [{ pos: 'Adj', text: '初期の、始まりの、発端の' }],
      core: '物事の中に入って「最初の第一手を掴み取ったばかり（in- 中で + cip 掴む + ient）」の段階。',
      etymology: 'ラテン語 incipiens（始める；in-「中に」＋ capere「取る」）に由来し、印欧祖語 *kap- に遡る。',
      etymologyTags: ['*kap-'],
      example: {
        foreign: 'Early intervention can halt the disease in its <b>incipient</b> stages.',
        ja: '早期の介入により、その疾患を<b>初期</b>段階で食い止めることができる。',
        used_form: 'incipient'
      }
    },
    {
      word: 'percipient',
      phonetic: '/pəˈsɪpiənt/',
      meanings: [{ pos: 'Adj', text: '知覚の鋭い、洞察力に富んだ' }],
      core: 'あらゆる兆候を完全に「感知して掴み取る（per- 完全に + cip 掴む）」こと。',
      etymology: 'ラテン語 percipiens（知覚する）に由来し、印欧祖語 *kap- に遡る。',
      etymologyTags: ['*kap-'],
      example: {
        foreign: 'The critic gave a remarkably <b>percipient</b> analysis of modern architecture.',
        ja: 'その批評家は現代建築についての際立って<b>鋭敏な</b>分析を行った。',
        used_form: 'percipient'
      }
    },

    // ------------------------------------------------------------------------
    // Root 2: *sta- (立つ、静止する、堅固である)
    // ------------------------------------------------------------------------
    {
      word: 'constitute',
      phonetic: '/ˈkɒnstɪtjuːt/',
      meanings: [{ pos: 'V[T]', text: '〜を構成する、〜の組織となる；〜を制定する、設立する' }],
      core: '諸要素を共に集めて「しっかりと立てて据える（con- 共に + stitute 立てる）」こと。',
      etymology: 'ラテン語 constituere（設置する；con-「完全に」＋ statuere「立てる」；stare「立つ」）に由来し、印欧祖語 *sta- に遡る。',
      etymologyTags: ['*sta-'],
      example: {
        foreign: 'Twelve distinct committees <b>constitute</b> the executive governing board.',
        ja: '12の異なる委員会が幹部理事会を<b>構成している</b>。',
        used_form: 'constitute'
      },
      derivatives: [{ word: 'constitution', phonetic: '/ˌkɒnstɪˈtjuːʃn/', pos: 'N[C, U]', meaning: '憲法、構成' }, { word: 'constituent', phonetic: '/kənˈstɪtʃuənt/', pos: 'N[C]', meaning: '構成要素、有権者' }]
    },
    {
      word: 'destitute',
      phonetic: '/ˈdestɪtjuːt/',
      meanings: [{ pos: 'Adj', text: '極貧の、極めて困窮した；（〜を）完全に欠いている' }],
      core: '支えから「引き離されて立たされている（de- 離れて + stitute 立てる）」状態。',
      etymology: 'ラテン語 destituere（置き去りにする；de-「離れて」＋ statuere「置く」）に由来し、印欧祖語 *sta- に遡る。',
      etymologyTags: ['*sta-'],
      example: {
        foreign: 'The charitable mission provided food and shelter for <b>destitute</b> families.',
        ja: 'その慈善活動は、<b>極貧の</b>家族たちに食料と住居を提供した。',
        used_form: 'destitute'
      },
      derivatives: [{ word: 'destitution', phonetic: '/ˌdestɪˈtjuːʃn/', pos: 'N[U]', meaning: '極貧、欠乏' }]
    },
    {
      word: 'obstinate',
      phonetic: '/ˈɒbstɪnət/',
      meanings: [{ pos: 'Adj', text: '頑固な、強情な；（病気などが）治りにくい' }],
      core: '相手の前に「意地を張って立ちはだかる（ob- 向かい合って + stin 立つ + ate）」態度。',
      etymology: 'ラテン語 obstinatus（頑固な；ob-「向かって」＋ stare「立つ」）に由来し、印欧祖語 *sta- に遡る。',
      etymologyTags: ['*sta-'],
      example: {
        foreign: 'Despite repeated warnings, he remained <b>obstinate</b> in his refusal to comply.',
        ja: '度重なる警告にもかかわらず、彼は従うことを拒否して<b>頑固な</b>ままであった。',
        used_form: 'obstinate'
      },
      derivatives: [{ word: 'obstinacy', phonetic: '/ˈɒbstɪnəsi/', pos: 'N[U]', meaning: '頑固さ、強情' }]
    },
    {
      word: 'statute',
      phonetic: '/ˈstætʃuːt/',
      meanings: [{ pos: 'N[C]', text: '法令、制定法、定款' }],
      core: '社会の基盤として「公に立てられた確固たる法規」。',
      etymology: 'ラテン語 statutum（布告、制定法；statuere「立てる」）に由来し、印欧祖語 *sta- に遡る。',
      etymologyTags: ['*sta-'],
      example: {
        foreign: 'The new environmental <b>statute</b> requires mandatory emissions reporting.',
        ja: '新たな環境<b>法令</b>は、排出量の義務的報告を要求している。',
        used_form: 'statute'
      },
      derivatives: [{ word: 'statutory', phonetic: '/ˈstætʃətri/', pos: 'Adj', meaning: '法令の、法定義務の' }]
    },
    {
      word: 'extant',
      phonetic: '/ekˈstænt/',
      meanings: [{ pos: 'Adj', text: '（古代の書物・記録などが失われずに）現存する、今なお残っている' }],
      core: '時の破壊を耐え抜いて「歴史の外側に直立し続けている（ex- 外へ + tant 立つ）」こと。',
      etymology: 'ラテン語 exstans（突き出ている、現存する；ex-「外へ」＋ stare「立つ」）に由来し、印欧祖語 *sta- に遡る。',
      etymologyTags: ['*sta-'],
      example: {
        foreign: 'This manuscript is the only <b>extant</b> copy of the lost classical treatise.',
        ja: 'この写本は、失われた古典論文の唯一の<b>現存する</b>複製である。',
        used_form: 'extant'
      }
    },
    {
      word: 'substitute',
      phonetic: '/ˈsʌbstɪtjuːt/',
      meanings: [{ pos: 'V[T/I]', text: '〜を代わりに用いる、代用する；代わりを務める' }, { pos: 'N[C]', text: '代用品、補欠' }],
      core: '下側から入って「その位置に代わりに立つ（sub- 下から + stitute 立てる）」こと。',
      etymology: 'ラテン語 substituere（下に置く、代わりに立てる；sub-「下に」＋ statuere「立てる」）に由来し、印欧祖語 *sta- に遡る。',
      etymologyTags: ['*sta-'],
      example: {
        foreign: 'You can <b>substitute</b> almond milk for regular dairy milk in this recipe.',
        ja: 'このレシピでは、通常の牛乳の代わりにアーモンドミルクを<b>代用する</b>ことができる。',
        used_form: 'substitute'
      }
    },
    {
      word: 'substance',
      phonetic: '/ˈsʌbstəns/',
      meanings: [{ pos: 'N[C, U]', text: '物質、実体；実質、重要性、本質' }],
      core: '見かけの表面の下に「根本として立っている（sub- 下に + stance 立つ）」本質。',
      etymology: 'ラテン語 substantia（実体、本質；sub-「下に」＋ stare「立つ」）に由来し、印欧祖語 *sta- に遡る。',
      etymologyTags: ['*sta-'],
      example: {
        foreign: 'The policy announcement lacked concrete <b>substance</b> and measurable goals.',
        ja: 'その政策発表は具体的な<b>実質（中身）</b>と測定可能な目標を欠いていた。',
        used_form: 'substance'
      },
      derivatives: [{ word: 'substantial', phonetic: '/səbˈstænʃl/', pos: 'Adj', meaning: '相当な、実質的な' }]
    },
    {
      word: 'persist',
      phonetic: '/pəˈsɪst/',
      meanings: [{ pos: 'V[I]', text: '固執する、しつこく続ける；（困難や嵐が）持続する、残る' }],
      core: '最後まで徹底して「直立し続ける（per- 徹底して + sist 立つ）」こと。',
      etymology: 'ラテン語 persistere（立ち続ける；per-「最後まで」＋ sistere「立たせる」；stare「立つ」）に由来し、印欧祖語 *sta- に遡る。',
      etymologyTags: ['*sta-'],
      example: {
        foreign: 'If symptoms <b>persist</b> for more than three days, consult your physician.',
        ja: '症状が3日以上<b>続く</b>場合は、かかりつけの医師に相談してください。',
        used_form: 'persist'
      },
      derivatives: [{ word: 'persistence', phonetic: '/pəˈsɪstəns/', pos: 'N[U]', meaning: '持続性、不屈の粘り強さ' }, { word: 'persistent', phonetic: '/pəˈsɪstənt/', pos: 'Adj', meaning: 'しつこい、根強い' }]
    },

    // ------------------------------------------------------------------------
    // Root 3: *bher- (運ぶ、耐える、生む)
    // ------------------------------------------------------------------------
    {
      word: 'defer',
      phonetic: '/dɪˈfɜː(r)/',
      meanings: [{ pos: 'V[T/I]', text: '（決定・行動などを）延期する、先送りにする；（敬意を払って相手の意見に）従う' }],
      core: '決定を別の時期や他者へ「持ち去って運び去る（de- 離れて + fer 運ぶ）」こと。',
      etymology: 'ラテン語 differre（散らす、先送りにする；dis-/de-「離れて」＋ ferre「運ぶ」）に由来し、印欧祖語 *bher- に遡る。',
      etymologyTags: ['*bher-'],
      example: {
        foreign: 'The board decided to <b>defer</b> the vote until additional audit results were released.',
        ja: '理事会は追加の監査結果が公表されるまで採決を<b>延期する</b>ことを決定した。',
        used_form: 'defer'
      },
      derivatives: [{ word: 'deference', phonetic: '/ˈdefərəns/', pos: 'N[U]', meaning: '敬意、服従' }]
    },
    {
      word: 'proffer',
      phonetic: '/ˈprɒfə(r)/',
      meanings: [{ pos: 'V[T]', text: '（助言・援助・提案などを）差し出す、申し出る' }, { pos: 'N[C]', text: '申し出、提示' }],
      core: '相手の目の前へ「運び出す（pro- 前へ + fer 運ぶ）」こと。',
      etymology: '古フランス語 profrir（前に差し出す；pro-「前へ」＋ offrir「運ぶ・提供する」；ラテン語 ferre）に由来し、印欧祖語 *bher- に遡る。',
      etymologyTags: ['*bher-'],
      example: {
        foreign: 'He was cautious not to <b>proffer</b> unsolicited advice during the negotiation.',
        ja: '彼は交渉中に求められてもいない助言を<b>差し出す</b>ことのないよう慎重であった。',
        used_form: 'proffer'
      }
    },
    {
      word: 'fertile',
      phonetic: '/ˈfɜːtaɪl/',
      meanings: [{ pos: 'Adj', text: '（土地が）肥沃な、多産の；（知性・想像力が）豊かな' }],
      core: '豊かな実りを「運んで生み出す（fer- 運ぶ・生む + tile できる）」こと。',
      etymology: 'ラテン語 fertilis（実りの多い；ferre「運ぶ、実を結ぶ」）に由来し、印欧祖語 *bher- に遡る。',
      etymologyTags: ['*bher-'],
      example: {
        foreign: 'The volcanic soil provides exceptionally <b>fertile</b> ground for agriculture.',
        ja: '火山灰の土壌は、農業にとって極めて<b>肥沃な</b>土地を提供している。',
        used_form: 'fertile'
      },
      derivatives: [{ word: 'fertility', phonetic: '/fəˈtɪləti/', pos: 'N[U]', meaning: '肥沃さ、出生率' }, { word: 'fertilizer', phonetic: '/ˈfɜːtəlaɪzə(r)/', pos: 'N[C, U]', meaning: '化学肥料' }]
    },
    {
      word: 'proliferate',
      phonetic: '/prəˈlɪfəreɪt/',
      meanings: [{ pos: 'V[I]', text: '（細胞・組織などが）急増する、急速に繁殖する、蔓延する' }],
      core: '子孫・新芽（proles）を「次々に運んで生み出す（fer 運ぶ・生む）」こと。',
      etymology: 'ラテン語 proles（子孫）＋ ferre（生む）から成り、印欧祖語 *bher- に遡る。',
      etymologyTags: ['*bher-'],
      example: {
        foreign: 'Digital payment platforms continue to <b>proliferate</b> across emerging markets.',
        ja: 'デジタル決済プラットフォームは、新興市場全体で<b>急増し</b>続けている。',
        used_form: 'proliferate'
      },
      derivatives: [{ word: 'proliferation', phonetic: '/prəˌlɪfəˈreɪʃn/', pos: 'N[U]', meaning: '拡散、急増' }]
    },
    {
      word: 'vociferous',
      phonetic: '/vəˈsɪfərəs/',
      meanings: [{ pos: 'Adj', text: '（抗議などが）大声を張り上げる、声高な、やかましい' }],
      core: '大声（vox, 声）を「外へ運んで轟かせる（fer 運ぶ + ous）」こと。',
      etymology: 'ラテン語 vociferari（大声で叫ぶ；vox「声」＋ ferre「運ぶ」）に由来し、印欧祖語 *bher- に遡る。',
      etymologyTags: ['*bher-'],
      example: {
        foreign: 'The proposal met with <b>vociferous</b> opposition from community leaders.',
        ja: 'その提案は、地域の指導者たちからの<b>激しい声高な</b>反対に直面した。',
        used_form: 'vociferous'
      }
    },
    {
      word: 'infer',
      phonetic: '/ɪnˈfɜː(r)/',
      meanings: [{ pos: 'V[T]', text: '（証拠から事実を）推論する、推測する' }],
      core: '前提から結論へと「思考を運び込む（in- 中へ + fer 運ぶ）」こと。',
      etymology: 'ラテン語 inferre（運び込む、結論を導く；in-「中に」＋ ferre「運ぶ」）に由来し、印欧祖語 *bher- に遡る。',
      etymologyTags: ['*bher-'],
      example: {
        foreign: 'We can reasonably <b>infer</b> from the data that the campaign was successful.',
        ja: '私たちはそのデータから、キャンペーンが成功であったと合理的に<b>推論する</b>ことができる。',
        used_form: 'infer'
      },
      derivatives: [{ word: 'inference', phonetic: '/ˈɪnfərəns/', pos: 'N[C, U]', meaning: '推論、推測' }]
    },

    // ------------------------------------------------------------------------
    // Root 4: *spec- (見る、観察する)
    // ------------------------------------------------------------------------
    {
      word: 'circumspect',
      phonetic: '/ˈsɜːkəmspekt/',
      meanings: [{ pos: 'Adj', text: '慎重な、用心深い、周到な' }],
      core: '周囲をぐるりと「360度見回して観察する（circum- 周囲を + spect 見る）」こと。',
      etymology: 'ラテン語 circumspectus（用心深い；circum-「周りに」＋ specere「見る」）に由来し、印欧祖語 *spec- に遡る。',
      etymologyTags: ['*spec-'],
      example: {
        foreign: 'Officials remained <b>circumspect</b> when answering sensitive questions from reporters.',
        ja: '当局者らは記者たちからの機微に触れる質問に答える際、<b>極めて慎重な</b>態度を崩さなかった。',
        used_form: 'circumspect'
      },
      derivatives: [{ word: 'circumspection', phonetic: '/ˌsɜːkəmˈspekʃn/', pos: 'N[U]', meaning: '慎重さ、用心' }]
    },
    {
      word: 'conspicuous',
      phonetic: '/kənˈspɪkjuəs/',
      meanings: [{ pos: 'Adj', text: '目立つ、人目を引く、顕著な' }],
      core: '誰もが完全に「視界に入れて見つけられる（con- 完全に + spic 見る + uous）」こと。',
      etymology: 'ラテン語 conspicuus（目に見える、著名な；con-「完全に」＋ specere「見る」）に由来し、印欧祖語 *spec- に遡る。',
      etymologyTags: ['*spec-'],
      example: {
        foreign: 'His absence from the emergency council was <b>conspicuous</b> and noted by all.',
        ja: '緊急評議会における彼の欠席は<b>際立っており</b>、全員の知るところとなった。',
        used_form: 'conspicuous'
      }
    },
    {
      word: 'despicable',
      phonetic: '/dɪˈspɪkəbl/',
      meanings: [{ pos: 'Adj', text: '卑劣な、極めて軽蔑すべき' }],
      core: '見下して「唾棄するように見下ろす（de- 下へ + spic 見る + able）」行為。',
      etymology: 'ラテン語 despicabilis（軽蔑すべき；despicere「見下す」；de-「下へ」＋ specere「見る」）に由来し、印欧祖語 *spec- に遡る。',
      etymologyTags: ['*spec-'],
      example: {
        foreign: 'Exploiting vulnerable citizens for personal profit is utterly <b>despicable</b>.',
        ja: '個人の私利のために社会的弱者を搾取することは、全くもって<b>卑劣である</b>。',
        used_form: 'despicable'
      },
      derivatives: [{ word: 'despise', phonetic: '/dɪˈspaɪz/', pos: 'V[T]', meaning: '見下す、軽蔑する' }]
    },
    {
      word: 'retrospect',
      phonetic: '/ˈretrəspekt/',
      meanings: [{ pos: 'N[U]', text: '回顧、追憶（in retrospect で「振り返ってみると」）' }],
      core: '過去の後ろを「振り返って見つめる（retro- 後ろへ + spect 見る）」こと。',
      etymology: 'ラテン語 retrospicere（後ろを振り返る；retro-「後ろに」＋ specere「見る」）に由来し、印欧祖語 *spec- に遡る。',
      etymologyTags: ['*spec-'],
      example: {
        foreign: 'In <b>retrospect</b>, postponing the launch was the most prudent decision possible.',
        ja: '<b>振り返ってみると</b>、発売の延期は可能な限り最も分別のある賢明な判断であった。',
        used_form: 'retrospect'
      },
      derivatives: [{ word: 'retrospective', phonetic: '/ˌretrəˈspektɪv/', pos: 'Adj', meaning: '回顧的な、過去に遡及する' }]
    },
    {
      word: 'introspective',
      phonetic: '/ˌɪntrəˈspektɪv/',
      meanings: [{ pos: 'Adj', text: '内省的な、自己反省の' }],
      core: '自分自身の心の内側を「じっと見つめる（intro- 内へ + spect 見る + ive）」こと。',
      etymology: 'ラテン語 introspicere（内部を見る；intro-「内に」＋ specere「見る」）に由来し、印欧祖語 *spec- に遡る。',
      etymologyTags: ['*spec-'],
      example: {
        foreign: 'The poet was known for her quiet and deeply <b>introspective</b> lyrics.',
        ja: 'その詩人は、静謐で深く<b>内省的な</b>詩句で知られていた。',
        used_form: 'introspective'
      }
    },

    // ------------------------------------------------------------------------
    // Root 5: *ten- (伸ばす、張る、保つ)
    // ------------------------------------------------------------------------
    {
      word: 'sustain',
      phonetic: '/səˈsteɪn/',
      meanings: [{ pos: 'V[T]', text: '〜を持続させる、維持する；（損害・打撃を）被る、耐える' }],
      core: '下から支え上げて「重みに耐えて保ち続ける（sus- 下から + tain 保つ）」こと。',
      etymology: 'ラテン語 sustinere（支える、持ちこたえる；sub-「下に」＋ tenere「保つ」）に由来し、印欧祖語 *ten- に遡る。',
      etymologyTags: ['*ten-'],
      example: {
        foreign: 'The fragile ecosystem cannot <b>sustain</b> such aggressive industrial development.',
        ja: 'その脆弱な生態系は、そのような攻撃的な産業開発を<b>維持し続ける</b>ことはできない。',
        used_form: 'sustain'
      },
      derivatives: [{ word: 'sustainable', phonetic: '/səˈsteɪnəbl/', pos: 'Adj', meaning: '持続可能な' }, { word: 'sustenance', phonetic: '/ˈsʌstənəns/', pos: 'N[U]', meaning: '食物、維持' }]
    },
    {
      word: 'abstain',
      phonetic: '/əbˈsteɪn/',
      meanings: [{ pos: 'V[I]', text: '（投票で）棄権する；（酒・甘いものなどを）控える、慎む' }],
      core: '手を出さずに「離れた位置に我が身を留め保つ（ab- 離れて + stain 保つ）」こと。',
      etymology: 'ラテン語 abstinere（控える；ab-「離れて」＋ tenere「保つ」）に由来し、印欧祖語 *ten- に遡る。',
      etymologyTags: ['*ten-'],
      example: {
        foreign: 'Several member states chose to <b>abstain</b> from the controversial resolution.',
        ja: '複数の加盟国が、その物議を醸す決議案への投票を<b>棄権する</b>ことを選択した。',
        used_form: 'abstain'
      },
      derivatives: [{ word: 'abstinence', phonetic: '/ˈæbstɪnəns/', pos: 'N[U]', meaning: '禁欲、自制' }]
    },
    {
      word: 'pertain',
      phonetic: '/pəˈteɪn/',
      meanings: [{ pos: 'V[I]', text: '（〜に）関連する、属する、適している（pertain to ...）' }],
      core: '最初から最後まで「しっかりと繋がって保持されている（per- 完全に + tain 保つ）」こと。',
      etymology: 'ラテン語 pertinere（届く、関連する；per-「完全に」＋ tenere「保つ」）に由来し、印欧祖語 *ten- に遡る。',
      etymologyTags: ['*ten-'],
      example: {
        foreign: 'The regulations <b>pertain</b> specifically to financial transactions overseas.',
        ja: 'その規制規則は、特に海外での金融取引に<b>関連している</b>。',
        used_form: 'pertain'
      },
      derivatives: [{ word: 'pertinent', phonetic: '/ˈpɜːtɪnənt/', pos: 'Adj', meaning: '関連のある、適切な' }]
    },
    {
      word: 'tenuous',
      phonetic: '/ˈtenjuəs/',
      meanings: [{ pos: 'Adj', text: '（関係・根拠などが）希薄な、薄弱な、頼りない' }],
      core: '糸のように極限まで「引き伸ばされて今にも切れそうな（ten- 伸ばす + uous）」状態。',
      etymology: 'ラテン語 tenuis（薄い、細い；tenere「伸ばす」）に由来し、印欧祖語 *ten- に遡る。',
      etymologyTags: ['*ten-'],
      example: {
        foreign: 'The prosecution established only a <b>tenuous</b> link between the suspect and the crime.',
        ja: '検察側は、容疑者と犯罪との間の極めて<b>薄弱な</b>結びつきしか立証できなかった。',
        used_form: 'tenuous'
      }
    },
    {
      word: 'contentious',
      phonetic: '/kənˈtenʃəs/',
      meanings: [{ pos: 'Adj', text: '論争を招く、異論の多い；議論好きな' }],
      core: '互いに自説を「激しく張り合って綱引きしている（con- 共に + tent 伸ばす/張る + ious）」こと。',
      etymology: 'ラテン語 contentio（争い；contendere「張り合う」；con-「共に」＋ tendere「張る」）に由来し、印欧祖語 *ten- に遡る。',
      etymologyTags: ['*ten-'],
      example: {
        foreign: 'Immigration policy remains one of the most <b>contentious</b> issues in parliament.',
        ja: '移民政策は、議会において最も<b>論争を引き起こす</b>問題の一つであり続けている。',
        used_form: 'contentious'
      }
    },

    // ------------------------------------------------------------------------
    // Root 6: *sed- (座る、落ち着く)
    // ------------------------------------------------------------------------
    {
      word: 'preside',
      phonetic: '/prɪˈzaɪd/',
      meanings: [{ pos: 'V[I]', text: '（会議・法廷などの）議長を務める、司会をする、統括する' }],
      core: '人々の前に「威厳をもって着席する（pre- 前に + side 座る）」こと。',
      etymology: 'ラテン語 praesidere（先頭に座る、守る；prae-「前に」＋ sedere「座る」）に由来し、印欧祖語 *sed- に遡る。',
      etymologyTags: ['*sed-'],
      example: {
        foreign: 'The senior judge will <b>preside</b> over the landmark appellate hearing.',
        ja: '主席判事が、その画期的な控訴審判決公判の<b>裁判長を務める</b>予定である。',
        used_form: 'preside'
      },
      derivatives: [{ word: 'president', phonetic: '/ˈprezɪdənt/', pos: 'N[C]', meaning: '大統領、議長' }]
    },
    {
      word: 'subsidize',
      phonetic: '/ˈsʌbsɪdaɪz/',
      meanings: [{ pos: 'V[T]', text: '〜に助成金を支給する、財政的援助をする' }],
      core: '背後で予備軍として「座って下支えする（sub- 下に + sid 座る + ize）」こと。',
      etymology: 'ラテン語 subsidium（予備軍、支援；sub-「下に」＋ sedere「座る」）に由来し、印欧祖語 *sed- に遡る。',
      etymologyTags: ['*sed-'],
      example: {
        foreign: 'The government agreed to <b>subsidize</b> renewable energy research projects.',
        ja: '政府は再生可能エネルギーの研究プロジェクトに<b>助成金を支給する</b>ことに合意した。',
        used_form: 'subsidize'
      },
      derivatives: [{ word: 'subsidy', phonetic: '/ˈsʌbsədi/', pos: 'N[C]', meaning: '補助金、助成金' }]
    },
    {
      word: 'sedentary',
      phonetic: '/ˈsedntri/',
      meanings: [{ pos: 'Adj', text: '座りがちの、デスクワーク中心の；定住性の' }],
      core: '一日中ずっと椅子に「座りっぱなしで動かない」生活様式。',
      etymology: 'ラテン語 sedentarius（座っている；sedere「座る」）に由来し、印欧祖語 *sed- に遡る。',
      etymologyTags: ['*sed-'],
      example: {
        foreign: 'Adopting a <b>sedentary</b> lifestyle increases the risk of chronic health disorders.',
        ja: '<b>座りがちの</b>生活様式を続けることは、慢性の健康障害のリスクを高める。',
        used_form: 'sedentary'
      }
    },
    {
      word: 'supersede',
      phonetic: '/ˌsuːpəˈsiːd/',
      meanings: [{ pos: 'V[T]', text: '（古いもの・規格などに）取って代わる、後任となる' }],
      core: '前任者の上から「覆いかぶさるように上座に座る（super- 上に + sede 座る）」こと。',
      etymology: 'ラテン語 supersedere（上に座る、見合わせる；super-「上に」＋ sedere「座る」）に由来し、印欧祖語 *sed- に遡る。',
      etymologyTags: ['*sed-'],
      example: {
        foreign: 'Advanced quantum computing may soon <b>supersede</b> traditional silicon architectures.',
        ja: '先進的な量子コンピューティングは、やがて従来のシリコン構造に<b>取って代わる</b>かもしれない。',
        used_form: 'supersede'
      }
    },

    // ------------------------------------------------------------------------
    // Root 7: *ag- (動かす、行う、導く)
    // ------------------------------------------------------------------------
    {
      word: 'agitate',
      phonetic: '/ˈædʒɪteɪt/',
      meanings: [{ pos: 'V[T/I]', text: '（社会・人心を）激しく動揺させる、扇動する；（液体などを）撹拌する' }],
      core: '静まっているものを激しく「突いて動かす（agere の反復形）」こと。',
      etymology: 'ラテン語 agitare（激しく動かす；agere「動かす」の反復頻動詞）に由来し、印欧祖語 *ag- に遡る。',
      etymologyTags: ['*ag-'],
      example: {
        foreign: 'Union activists continued to <b>agitate</b> for higher wages and better safety measures.',
        ja: '労働組合の活動家たちは、賃上げと安全対策の改善を求めて<b>激しい扇動・運動を続けた</b>。',
        used_form: 'agitate'
      },
      derivatives: [{ word: 'agitation', phonetic: '/ˌædʒɪˈteɪʃn/', pos: 'N[U]', meaning: '動揺、扇動' }]
    },
    {
      word: 'cogent',
      phonetic: '/ˈkəʊdʒənt/',
      meanings: [{ pos: 'Adj', text: '（議論・論拠などが）説得力のある、首尾一貫した、適切な' }],
      core: '証拠を一つにまとめて「強く相手の心を突き動かす（co- 共に + gent 動かす）」こと。',
      etymology: 'ラテン語 cogere（一箇所に集める、強制する；con-「共に」＋ agere「駆る」）に由来し、印欧祖語 *ag- に遡る。',
      etymologyTags: ['*ag-'],
      example: {
        foreign: 'The defense attorney presented a remarkably <b>cogent</b> argument to the jury.',
        ja: '弁護人は陪審員団に対して際立って<b>説得力のある</b>議論を提示した。',
        used_form: 'cogent'
      }
    },
    {
      word: 'prodigal',
      phonetic: '/ˈprɒdɪɡl/',
      meanings: [{ pos: 'Adj', text: '浪費する、散財する、贅沢な' }, { pos: 'N[C]', text: '放蕩者（放蕩息子 the prodigal son）' }],
      core: '財産を前へ前へと「無計画に追いやる（pro- 前へ + agere 駆る）」こと。',
      etymology: 'ラテン語 prodigus（浪費する；prodigere「追い払う、浪費する」；pro-「前へ」＋ agere「駆る」）に由来し、印欧祖語 *ag- に遡る。',
      etymologyTags: ['*ag-'],
      example: {
        foreign: 'The heir squandered his substantial inheritance through <b>prodigal</b> habits.',
        ja: 'その相続人は、<b>放蕩な</b>散財癖によって莫大な遺産を浪費してしまった。',
        used_form: 'prodigal'
      }
    },
    {
      word: 'mitigate',
      phonetic: '/ˈmɪtɪɡeɪt/',
      meanings: [{ pos: 'V[T]', text: '（苦痛・被害・悪影響などを）和らげる、緩和する、軽減する' }],
      core: '穏やかな状態（mitis）へと「導いて動かす（mitis 穏やかな + agere 導く）」こと。',
      etymology: 'ラテン語 mitigare（穏やかにする；mitis「柔らかい、温和な」＋ agere「行う」）に由来し、印欧祖語 *ag- に遡る。',
      etymologyTags: ['*ag-'],
      example: {
        foreign: 'Effective flood barriers helped to <b>mitigate</b> property damage during the storm.',
        ja: '効果的な防潮堤のおかげで、嵐の間における財産被害を<b>軽減する</b>ことができた。',
        used_form: 'mitigate'
      },
      derivatives: [{ word: 'mitigation', phonetic: '/ˌmɪtɪˈɡeɪʃn/', pos: 'N[U]', meaning: '緩和、軽減' }]
    },

    // ------------------------------------------------------------------------
    // Root 8: *dhe- (置く、作る、据える)
    // ------------------------------------------------------------------------
    {
      word: 'proficient',
      phonetic: '/prəˈfɪʃnt/',
      meanings: [{ pos: 'Adj', text: '（技術・語学などに）熟達した、能熟な、堪能な' }],
      core: '前進するように「しっかりと物事を作り上げて成果を出す（pro- 前へ + fic 作る + ient）」こと。',
      etymology: 'ラテン語 proficiens（進歩する；pro-「前へ」＋ facere「作る・行う」）に由来し、印欧祖語 *dhe- に遡る。',
      etymologyTags: ['*dhe-'],
      example: {
        foreign: 'Candidates must be fully <b>proficient</b> in both written and spoken German.',
        ja: '候補者はドイツ語の読み書きと会話の双方に完全に<b>熟達していなければ</b>ならない。',
        used_form: 'proficient'
      },
      derivatives: [{ word: 'proficiency', phonetic: '/prəˈfɪʃnsi/', pos: 'N[U]', meaning: '熟達、習熟度' }]
    },
    {
      word: 'deficient',
      phonetic: '/dɪˈfɪʃnt/',
      meanings: [{ pos: 'Adj', text: '（必要なものが）不足している、欠乏している；不完全な' }],
      core: '必要な基準から「下回って作り損ねている（de- 下へ + fic 作る + ient）」状態。',
      etymology: 'ラテン語 deficiens（不足する；de-「下へ、離れて」＋ facere「作る」）に由来し、印欧祖語 *dhe- に遡る。',
      etymologyTags: ['*dhe-'],
      example: {
        foreign: 'The proposed budget is seriously <b>deficient</b> in funding for rural healthcare.',
        ja: '提案された予算案は、地方の医療向け資金調達において著しく<b>不足している</b>。',
        used_form: 'deficient'
      },
      derivatives: [{ word: 'deficiency', phonetic: '/dɪˈfɪʃnsi/', pos: 'N[C, U]', meaning: '欠乏症、不足' }]
    },
    {
      word: 'facade',
      phonetic: '/fəˈsɑːd/',
      meanings: [{ pos: 'N[C]', text: '（建物の）正面、ファサード；（本質を覆い隠す）見せかけ、外見' }],
      core: '人の目に映るように「表側に作られた顔（facies 顔・外見；facere 作る）」。',
      etymology: 'フランス語 façade（正面；イタリア語 facciata；ラテン語 facies「顔」、facere「作る」）に由来し、印欧祖語 *dhe- に遡る。',
      etymologyTags: ['*dhe-'],
      example: {
        foreign: 'Behind a polite public <b>facade</b>, intense corporate rivalry was brewing.',
        ja: '礼儀正しい公の見せかけの<b>外見</b>の裏で、激しい企業間競争が渦巻いていた。',
        used_form: 'facade'
      }
    },
    {
      word: 'forfeit',
      phonetic: '/ˈfɔːfɪt/',
      meanings: [{ pos: 'V[T]', text: '（権利・財産などを違反により）没収される、喪失する' }, { pos: 'N[C]', text: '没収物、罰金' }],
      core: '法の外側へ「誤って作り出して手放す（foris 外側で + faire 作る/行う）」こと。',
      etymology: '古フランス語 forfaire（過ちを犯す；foris「外に」＋ faire「行う」；ラテン語 facere）に由来し、印欧祖語 *dhe- に遡る。',
      etymologyTags: ['*dhe-'],
      example: {
        foreign: 'Violating the contractual non-disclosure clause will cause you to <b>forfeit</b> all severance.',
        ja: '契約の守秘義務条項に違反した場合、すべての退職手当を<b>喪失する</b>ことになる。',
        used_form: 'forfeit'
      }
    },

    // ------------------------------------------------------------------------
    // Root 9: *deik- (指し示す、告げる、宣言する)
    // ------------------------------------------------------------------------
    {
      word: 'vindicate',
      phonetic: '/ˈvɪndɪkeɪt/',
      meanings: [{ pos: 'V[T]', text: '（非難・疑いに対して正当性を）証明する、晴らす；権利を主張する' }],
      core: '武力や主張（vindex）を掲げて「法的に正当であると宣言する（vindex 主張者 + dicare 宣言する）」こと。',
      etymology: 'ラテン語 vindicare（権利を主張する、復讐する；vis「力」＋ dicere「告げる」）に由来し、印欧祖語 *deik- に遡る。',
      etymologyTags: ['*deik-'],
      example: {
        foreign: 'Subsequent DNA evidence helped to <b>vindicate</b> the wrongfully convicted man.',
        ja: 'その後のDNA鑑定結果により、冤罪で有罪判決を受けていた男性の潔白が<b>証明された</b>。',
        used_form: 'vindicate'
      },
      derivatives: [{ word: 'vindication', phonetic: '/ˌvɪndɪˈkeɪʃn/', pos: 'N[U]', meaning: '弁明、正当性の立証' }]
    },
    {
      word: 'verdict',
      phonetic: '/ˈvɜːdɪkt/',
      meanings: [{ pos: 'N[C]', text: '（陪審員の）評決、判断、判定' }],
      core: '真実（verus）を法廷で「公式に言い渡す（verus 真実の + dictum 言葉）」こと。',
      etymology: 'アングロ・フランス語 verdit（評決；ラテン語 vere「真実に」＋ dictum「言われたこと」；dicere「言う」）に由来し、印欧祖語 *deik- に遡る。',
      etymologyTags: ['*deik-'],
      example: {
        foreign: 'The jury deliberated for three full days before reaching a unanimous <b>verdict</b>.',
        ja: '陪審員団は満場一致の<b>評決</b>に達するまで丸3日間審議を重ねた。',
        used_form: 'verdict'
      }
    },
    {
      word: 'indict',
      phonetic: '/ɪnˈdaɪt/',
      meanings: [{ pos: 'V[T]', text: '（大陪審などが〜を罪で）起訴する、告発する' }],
      core: '法廷の中へ罪状を「指し示して公式に読み上げる（in- 中へ + dictare 言う）」こと。',
      etymology: 'アングロ・フランス語 enditer（告発する；ラテン語 indicere「宣言する」；in-「中に」＋ dicere「言う」）に由来し、印欧祖語 *deik- に遡る。',
      etymologyTags: ['*deik-'],
      example: {
        foreign: 'A federal grand jury voted to <b>indict</b> the executive on charges of fraud.',
        ja: '連邦大陪審は詐欺の罪でその幹部を<b>起訴する</b>ことを議決した。',
        used_form: 'indict'
      },
      derivatives: [{ word: 'indictment', phonetic: '/ɪnˈdaɪtmənt/', pos: 'N[C, U]', meaning: '起訴状、告発' }]
    },
    {
      word: 'abdicate',
      phonetic: '/ˈæbdɪkeɪt/',
      meanings: [{ pos: 'V[T/I]', text: '（王位・権力などを）退位する、放棄する；（責任を）放棄する' }],
      core: '自らの地位から離れることを「公に口頭で宣言する（ab- 離れて + dicare 宣言する）」こと。',
      etymology: 'ラテン語 abdicare（権利を放棄する；ab-「離れて」＋ dicare「宣言する」）に由来し、印欧祖語 *deik- に遡る。',
      etymologyTags: ['*deik-'],
      example: {
        foreign: 'The aging monarch decided to <b>abdicate</b> the throne in favor of the crown prince.',
        ja: '高齢の君主は皇太子に譲るため王位を<b>退位する</b>決断を下した。',
        used_form: 'abdicate'
      }
    },

    // ------------------------------------------------------------------------
    // Root 10: *sekw- (従う、続く)
    // ------------------------------------------------------------------------
    {
      word: 'subsequent',
      phonetic: '/ˈsʌbsɪkwənt/',
      meanings: [{ pos: 'Adj', text: 'その後の、続いて起こる、後続の' }],
      core: 'すぐ後ろから「下をくぐるように続いて従ってくる（sub- 後から + sequi 従う）」こと。',
      etymology: 'ラテン語 subsequens（直後に続く；sub-「後ろから」＋ sequi「従う」）に由来し、印欧祖語 *sekw- に遡る。',
      etymologyTags: ['*sekw-'],
      example: {
        foreign: 'The preliminary survey was validated by <b>subsequent</b> laboratory experiments.',
        ja: '予備調査の結果は、<b>その後の</b>室内実験によって検証された。',
        used_form: 'subsequent'
      },
      derivatives: [{ word: 'subsequently', phonetic: '/ˈsʌbsɪkwəntli/', pos: 'Adv', meaning: 'その後、引き続いて' }]
    },
    {
      word: 'persecute',
      phonetic: '/ˈpɜːsɪkjuːt/',
      meanings: [{ pos: 'V[T]', text: '（宗教・人種などで〜を不当に）迫害する、苦しめる' }],
      core: '相手を追い詰めるために「どこまでも徹底して執拗につけ回す（per- 徹底して + secute 従う/追う）」こと。',
      etymology: 'ラテン語 persequi（徹底して追い詰める；per-「最後まで」＋ sequi「従う、追う」）に由来し、印欧祖語 *sekw- に遡る。',
      etymologyTags: ['*sekw-'],
      example: {
        foreign: 'Refugees often flee their homelands when regimes begin to <b>persecute</b> minorities.',
        ja: '政権が少数民族を<b>迫害し</b>始めると、難民たちはしばしば祖国を脱出する。',
        used_form: 'persecute'
      },
      derivatives: [{ word: 'persecution', phonetic: '/ˌpɜːsɪˈkjuːʃn/', pos: 'N[C, U]', meaning: '迫害' }]
    },
    {
      word: 'prosecute',
      phonetic: '/ˈprɒsɪkjuːt/',
      meanings: [{ pos: 'V[T/I]', text: '（刑事事件で〜を）起訴する、訴追する；（事業などを）遂行する' }],
      core: '法の下で判決に向かって「前へ前へと追求して従わせる（pro- 前へ + secute 追う）」こと。',
      etymology: 'ラテン語 prosequi（前に進める、追及する；pro-「前へ」＋ sequi「従う、追う」）に由来し、印欧祖語 *sekw- に遡る。',
      etymologyTags: ['*sekw-'],
      example: {
        foreign: 'The attorney general vowed to rigorously <b>prosecute</b> corporate financial crimes.',
        ja: '司法長官は、企業の金融犯罪を徹底的に<b>訴追する</b>ことを誓った。',
        used_form: 'prosecute'
      },
      derivatives: [{ word: 'prosecution', phonetic: '/ˌprɒsɪˈkjuːʃn/', pos: 'N[U]', meaning: '起訴、検察側' }, { word: 'prosecutor', phonetic: '/ˈprɒsɪkjuːtə(r)/', pos: 'N[C]', meaning: '検察官' }]
    },
    {
      word: 'obsequious',
      phonetic: '/əbˈsiːkwiəs/',
      meanings: [{ pos: 'Adj', text: 'へつらう、媚びる、卑屈に従順な' }],
      core: '権力者の後ろに「犬のようにべったりとついて回る（ob- ぴったりと + sequi 従う + ous）」態度。',
      etymology: 'ラテン語 obsequiosus（従順な；obsequi「従う」；ob-「向かって」＋ sequi「従う」）に由来し、印欧祖語 *sekw- に遡る。',
      etymologyTags: ['*sekw-'],
      example: {
        foreign: 'He was surrounded by <b>obsequious</b> aides who never dared to challenge his ideas.',
        ja: '彼は自らの考えに決して異議を唱えようとしない<b>へつらう</b>側近たちに囲まれていた。',
        used_form: 'obsequious'
      }
    },

    // ------------------------------------------------------------------------
    // Root 11: *leg- (集める、選ぶ、読む、話す)
    // ------------------------------------------------------------------------
    {
      word: 'eligible',
      phonetic: '/ˈelɪdʒəbl/',
      meanings: [{ pos: 'Adj', text: '（条件を満たして）適格の、資格のある；（結婚相手などとして）望ましい' }],
      core: '多くの候補者の中から「外へ選び出されるに値する（e- 外へ + lig 選ぶ + ible できる）」こと。',
      etymology: '後期ラテン語 eligibilis（選ばれるに値する；eligere「選び出す」；ex-「外へ」＋ legere「選ぶ」）に由来し、印欧祖語 *leg- に遡る。',
      etymologyTags: ['*leg-'],
      example: {
        foreign: 'Only full-time enrolled students are <b>eligible</b> for the university scholarship.',
        ja: '正規の全日制在籍生のみが、大学の奨学金の受給<b>資格がある</b>。',
        used_form: 'eligible'
      },
      derivatives: [{ word: 'eligibility', phonetic: '/ˌelɪdʒəˈbɪləti/', pos: 'N[U]', meaning: '適格性、被選挙権' }]
    },
    {
      word: 'legible',
      phonetic: '/ˈledʒəbl/',
      meanings: [{ pos: 'Adj', text: '（筆跡や印刷が）読みやすい、判読できる' }],
      core: '文字を一つずつ目で「拾い集めて読める（leg- 読む + ible できる）」状態。',
      etymology: '後期ラテン語 legibilis（読める；legere「読む・集める」）に由来し、印欧祖語 *leg- に遡る。',
      etymologyTags: ['*leg-'],
      example: {
        foreign: 'Please write clearly so that your signature is entirely <b>legible</b> on the carbon copy.',
        ja: 'カーボン複写の上でも署名が完全に<b>判読できるように</b>、はっきりと書いてください。',
        used_form: 'legible'
      }
    },
    {
      word: 'negligent',
      phonetic: '/ˈneɡlɪdʒənt/',
      meanings: [{ pos: 'Adj', text: '（義務・配慮を怠って）怠慢な、不注意な、なおざりな' }],
      core: '必要な注意を「拾い上げようとしない（neg- しない + lig 拾う/選ぶ + ent）」こと。',
      etymology: 'ラテン語 negligens（無視する；neg-「否定」＋ legere「拾う・集める」）に由来し、印欧祖語 *leg- に遡る。',
      etymologyTags: ['*leg-'],
      example: {
        foreign: 'The auditing firm was found to be <b>negligent</b> in checking corporate expense receipts.',
        ja: 'その監査法人は、企業の経費領収書の照合において<b>怠慢であった</b>と認定された。',
        used_form: 'negligent'
      },
      derivatives: [{ word: 'negligence', phonetic: '/ˈneɡlɪdʒəns/', pos: 'N[U]', meaning: '過失、怠慢' }]
    },
    {
      word: 'delegate',
      phonetic: '/ˈdelɪɡət/',
      meanings: [{ pos: 'N[C]', text: '代表者、代理使節' }, { pos: 'V[T]', text: '（権限・任務などを）委任する、委託する' }],
      core: '法の下に選び出して「特使として送り出す（de- 離れて + legare 法で任命する；lex 法/legere 選ぶ）」こと。',
      etymology: 'ラテン語 delegare（任務を委ねる；de-「離れて」＋ legare「任命する」；lex「法律」）に由来し、印欧祖語 *leg- に遡る。',
      etymologyTags: ['*leg-'],
      example: {
        foreign: 'An effective manager knows how to <b>delegate</b> complex tasks to qualified team members.',
        ja: '有能な管理職は、資格のあるチームメンバーに複雑な業務を<b>委任する</b>方法を知っている。',
        used_form: 'delegate'
      },
      derivatives: [{ word: 'delegation', phonetic: '/ˌdelɪˈɡeɪʃn/', pos: 'N[C, U]', meaning: '代表団、権限委譲' }]
    },

    // ------------------------------------------------------------------------
    // Root 12: *men- (心、考える、記憶)
    // ------------------------------------------------------------------------
    {
      word: 'admonish',
      phonetic: '/ədˈmɒnɪʃ/',
      meanings: [{ pos: 'V[T]', text: '（過ちを優しく厳しく）戒める、忠告する、説諭する' }],
      core: '相手の心（mind）に向けて「注意を思い出させる（ad- 促して + mon 警告する/思い起こさせる）」こと。',
      etymology: 'ラテン語 admonere（思い出させる、警告する；ad-「〜へ」＋ monere「警告する」；印欧祖語 *men-「心」）に由来。',
      etymologyTags: ['*men-'],
      example: {
        foreign: 'The judge chose to <b>admonish</b> the young defendant rather than impose jail time.',
        ja: '裁判官は懲役刑を科すのではなく、若い被告人を<b>諭して戒める</b>ことを選んだ。',
        used_form: 'admonish'
      },
      derivatives: [{ word: 'admonition', phonetic: '/ˌædməˈnɪʃn/', pos: 'N[C, U]', meaning: '警告、訓戒' }]
    },
    {
      word: 'monumental',
      phonetic: '/ˌmɒnjuˈmentl/',
      meanings: [{ pos: 'Adj', text: '記念碑的な、歴史に刻まれるほどの；（規模が）途方もなく巨大な' }],
      core: '後世の人々の記憶・心に「永続的に思い出させる（monere 思い出させる）規模のもの」。',
      etymology: 'ラテン語 monumentalis（記念の；monumentum「記念碑」；monere「思い出させる」）に由来し、印欧祖語 *men- に遡る。',
      etymologyTags: ['*men-'],
      example: {
        foreign: 'Mapping the entire human genome was a <b>monumental</b> scientific achievement.',
        ja: 'ヒトゲノム全体を解読したことは、<b>歴史的かつ記念碑的な</b>科学の偉業であった。',
        used_form: 'monumental'
      }
    },
    {
      word: 'reminisce',
      phonetic: '/ˌremɪˈnɪs/',
      meanings: [{ pos: 'V[I]', text: '（楽しかった過去の出来事を）追憶する、思い出を語り合う' }],
      core: '記憶を心の中で「再び手繰り寄せて思い起こす（re- 再び + min 記憶）」こと。',
      etymology: 'ラテン語 reminisci（思い出す；re-「再び」＋ *men-「心、記憶」）に由来。',
      etymologyTags: ['*men-'],
      example: {
        foreign: 'Former college classmates gathered at the alumni banquet to <b>reminisce</b> about old times.',
        ja: '大学の同窓生たちは同窓会晩餐会に集まり、昔のことについて<b>思い出を語り合った</b>。',
        used_form: 'reminisce'
      },
      derivatives: [{ word: 'reminiscence', phonetic: '/ˌremɪˈnɪsns/', pos: 'N[C, U]', meaning: '回想、追憶' }]
    },

    // ------------------------------------------------------------------------
    // Root 13: *weid- (見る、知る)
    // ------------------------------------------------------------------------
    {
      word: 'improvise',
      phonetic: '/ˈɪmprəvaɪz/',
      meanings: [{ pos: 'V[T/I]', text: '（音楽・スピーチなどを）即興で作る・演奏する；（手近な材料で）間に合わせる' }],
      core: '前もって見て準備をしておかない（im- 否定 + pro 前に + vise 見る）こと。',
      etymology: 'ラテン語 improvisus（予期しない；in-「無」＋ pro-「前もって」＋ videre「見る」）に由来し、印欧祖語 *weid- に遡る。',
      etymologyTags: ['*weid-'],
      example: {
        foreign: 'When the projector broke down, the speaker had to <b>improvise</b> the entire presentation.',
        ja: 'プロジェクターが故障したため、講演者はプレゼンテーション全体を<b>即興で行わ</b>ねばならなかった。',
        used_form: 'improvise'
      },
      derivatives: [{ word: 'improvisation', phonetic: '/ˌɪmprəvaɪˈzeɪʃn/', pos: 'N[C, U]', meaning: '即興、アドリブ' }]
    },
    {
      word: 'prudent',
      phonetic: '/ˈpruːdnt/',
      meanings: [{ pos: 'Adj', text: '分別のある、賢明な、将来を見据えて慎重な' }],
      core: '先の危険を「前もってよく見通している（provident の短縮形；pro- 前を + vid 見る）」こと。',
      etymology: 'ラテン語 prudens（用心深い；providens「先を見越す」の短縮形；pro-「前へ」＋ videre「見る」）に由来し、印欧祖語 *weid- に遡る。',
      etymologyTags: ['*weid-'],
      example: {
        foreign: 'It is always <b>prudent</b> to maintain an emergency cash reserve for unexpected expenses.',
        ja: '不意の出費に備えて緊急用の予備現金を維持しておくことは、常に<b>賢明な判断</b>である。',
        used_form: 'prudent'
      },
      derivatives: [{ word: 'prudence', phonetic: '/ˈpruːdns/', pos: 'N[U]', meaning: '慎重さ、思慮分別' }]
    },
    {
      word: 'envisage',
      phonetic: '/ɪnˈvɪzɪdʒ/',
      meanings: [{ pos: 'V[T]', text: '（将来の状況を心に）描く、予期する、見込む' }],
      core: '心の中の視界に「顔・光景として思い浮かべて見る（en- 中に + visage 顔/見る）」こと。',
      etymology: '古フランス語 envisager（顔を見る；en-「中に」＋ visage「顔、視界」；ラテン語 videre「見る」）に由来し、印欧祖語 *weid- に遡る。',
      etymologyTags: ['*weid-'],
      example: {
        foreign: 'Architects <b>envisage</b> a zero-emission transit hub powered entirely by solar panels.',
        ja: '建築家たちは、すべてソーラーパネルで電力を賄うゼロエミッションの交通拠点を<b>心に描いている</b>。',
        used_form: 'envisage'
      }
    },

    // ------------------------------------------------------------------------
    // Root 14: *pel- (押す、駆り立てる)
    // ------------------------------------------------------------------------
    {
      word: 'compel',
      phonetic: '/kəmˈpel/',
      meanings: [{ pos: 'V[T]', text: '（力や法で〜に）強いる、強制する；（服従を）余儀なくさせる' }],
      core: '相手を追い込んで「共に強く押し出す（com- 完全に + pel 押す）」こと。',
      etymology: 'ラテン語 compellere（駆り立てる；con-「完全に」＋ pellere「押す・駆る」）に由来し、印欧祖語 *pel- に遡る。',
      etymologyTags: ['*pel-'],
      example: {
        foreign: 'The high court can legally <b>compel</b> testimony through a binding subpoena.',
        ja: '高等裁判所は法的拘束力のある召喚状を通じて、証言を法的に<b>強制する</b>ことができる。',
        used_form: 'compel'
      },
      derivatives: [{ word: 'compulsory', phonetic: '/kəmˈpʌlsəri/', pos: 'Adj', meaning: '義務的な、強制の' }, { word: 'compelling', phonetic: '/kəmˈpelɪŋ/', pos: 'Adj', meaning: '抗しがたい、説得力のある' }]
    },
    {
      word: 'repel',
      phonetic: '/rɪˈpel/',
      meanings: [{ pos: 'V[T]', text: '（敵や攻撃を）撃退する、追い払う；（人を）不快にさせる；（水などを）弾く' }],
      core: '迫ってくるものを「後ろへ向かって強く押し戻す（re- 後ろへ + pel 押す）」こと。',
      etymology: 'ラテン語 repellere（押し返す；re-「後ろへ」＋ pellere「押す」）に由来し、印欧祖語 *pel- に遡る。',
      etymologyTags: ['*pel-'],
      example: {
        foreign: 'The fortress walls were designed to successfully <b>repel</b> any siege artillery.',
        ja: 'その要塞の壁は、あらゆる攻城砲撃を完全に<b>撃退する</b>ように設計されていた。',
        used_form: 'repel'
      },
      derivatives: [{ word: 'repellent', phonetic: '/rɪˈpelənt/', pos: 'Adj', meaning: '嫌悪感を起こさせる、防虫の' }]
    },
    {
      word: 'dispel',
      phonetic: '/dɪˈspel/',
      meanings: [{ pos: 'V[T]', text: '（不安・疑念・迷信などを）一掃する、追い散らす、晴らす' }],
      core: '群がっている雲や懸念を「四方八方へ押し散らす（dis- 四方へ + pel 押す）」こと。',
      etymology: 'ラテン語 dispellere（追い散らす；dis-「離れて」＋ pellere「押す」）に由来し、印欧祖語 *pel- に遡る。',
      etymologyTags: ['*pel-'],
      example: {
        foreign: 'The CEO held an emergency town hall to <b>dispel</b> rumors of impending layoffs.',
        ja: '最高経営責任者は、差し迫った人員削減の噂を<b>一掃する</b>ため緊急の全社会議を開催した。',
        used_form: 'dispel'
      }
    },

    // ------------------------------------------------------------------------
    // Root 15: *vert- (回す、向ける)
    // ------------------------------------------------------------------------
    {
      word: 'divert',
      phonetic: '/daɪˈvɜːt/',
      meanings: [{ pos: 'V[T]', text: '（進路・交通・資金・注意などを）逸らす、転換する；気晴らしさせる' }],
      core: '元々の直線コースから「脇の方向へと回す（di- 離れて + vert 回す）」こと。',
      etymology: 'ラテン語 divertere（異なる方向へ向ける；dis-「離れて」＋ vertere「回す」）に由来し、印欧祖語 *vert- に遡る。',
      etymologyTags: ['*vert-'],
      example: {
        foreign: 'Authorities had to <b>divert</b> highway traffic due to a major fuel tanker spill.',
        ja: '大規模な燃料タンカー流出事故のため、当局は高速道路の交通を<b>迂回・転換させねば</b>ならなかった。',
        used_form: 'divert'
      },
      derivatives: [{ word: 'diversion', phonetic: '/daɪˈvɜːʃn/', pos: 'N[C, U]', meaning: '迂回、注意そらし、気晴らし' }]
    },
    {
      word: 'subvert',
      phonetic: '/səbˈvɜːt/',
      meanings: [{ pos: 'V[T]', text: '（秩序・体制・権威などを）根底から覆す、転覆させる、壊乱する' }],
      core: '下側から潜り込んで「ひっくり返すように回転させる（sub- 下から + vert 回す）」こと。',
      etymology: 'ラテン語 subvertere（ひっくり返す；sub-「下に」＋ vertere「回す」）に由来し、印欧祖語 *vert- に遡る。',
      etymologyTags: ['*vert-'],
      example: {
        foreign: 'Foreign agents attempted to <b>subvert</b> democratic elections through covert disinformation.',
        ja: '外国の工作員たちは、秘密裏の偽情報工作を通じて民主的選挙を<b>覆そう</b>と試みた。',
        used_form: 'subvert'
      },
      derivatives: [{ word: 'subversive', phonetic: '/səbˈvɜːsɪv/', pos: 'Adj', meaning: '体制転覆の、破壊的な' }]
    },
    {
      word: 'avert',
      phonetic: '/əˈvɜːt/',
      meanings: [{ pos: 'V[T]', text: '（目・視線を）背ける；（危険・悲劇などを）回避する、防ぐ' }],
      core: '迫り来る危機から「進路や視線を別の方向へ回す（ab- 離れて + vert 回す）」こと。',
      etymology: 'ラテン語 avertere（背ける、避ける；ab-「離れて」＋ vertere「回す」）に由来し、印欧祖語 *vert- に遡る。',
      etymologyTags: ['*vert-'],
      example: {
        foreign: 'Swift diplomatic intervention helped to <b>avert</b> an escalating military confrontation.',
        ja: '迅速な外交介入のおかげで、エスカレートする軍事衝突を<b>回避する</b>ことができた。',
        used_form: 'avert'
      }
    },
    {
      word: 'adverse',
      phonetic: '/ˈædvɜːs/',
      meanings: [{ pos: 'Adj', text: '（状況・天候などが）逆の、不利な、有害な（adverse effects「副作用」）' }],
      core: '向かい風のように真正面から「自分に向かって回って逆風となる（ad- 向かって + verse 回る）」こと。',
      etymology: 'ラテン語 adversus（向かい合った、敵対する；ad-「向かって」＋ vertere「回す」）に由来し、印欧祖語 *vert- に遡る。',
      etymologyTags: ['*vert-'],
      example: {
        foreign: 'The clinical trial was suspended after patients reported severe <b>adverse</b> reactions.',
        ja: '患者たちが重篤な<b>有害な</b>副作用を訴えたため、治験は一時中断された。',
        used_form: 'adverse'
      },
      derivatives: [{ word: 'adversity', phonetic: '/ədˈvɜːsəti/', pos: 'N[U]', meaning: '逆境、不運' }]
    },

    // ------------------------------------------------------------------------
    // Root 16: *grebh- / *scrip- (引っ掻く、書く、刻む)
    // ------------------------------------------------------------------------
    {
      word: 'prescribe',
      phonetic: '/prɪˈskraɪb/',
      meanings: [{ pos: 'V[T]', text: '（薬・治療法を）処方する；（規則・法令を）規定する、指示する' }],
      core: '事前に書面で「前もって決めて書き記す（pre- 前もって + scribe 書く）」こと。',
      etymology: 'ラテン語 praescribere（前に書く、規定する；prae-「前に」＋ scribere「書く」）に由来し、印欧祖語 *grebh-（引っ掻く・彫る）に遡る。',
      etymologyTags: ['*grebh-'],
      example: {
        foreign: 'Physicians should only <b>prescribe</b> antibiotics when a bacterial infection is confirmed.',
        ja: '医師は細菌感染が確認された場合にのみ、抗生物質を<b>処方すべき</b>である。',
        used_form: 'prescribe'
      },
      derivatives: [{ word: 'prescription', phonetic: '/prɪˈskrɪpʃn/', pos: 'N[C]', meaning: '処方箋、規定' }]
    },
    {
      word: 'proscribe',
      phonetic: '/prəˈskraɪb/',
      meanings: [{ pos: 'V[T]', text: '（危険な行為・組織などを法で）禁止する、排斥する' }],
      core: '公の掲示板の前に「禁止対象者の氏名を書いて張り出す（pro- 前に + scribe 書く）」こと。',
      etymology: 'ラテン語 proscribere（公開処刑や追放のリストを公示する；pro-「前に」＋ scribere「書く」）に由来し、印欧祖語 *grebh- に遡る。',
      etymologyTags: ['*grebh-'],
      example: {
        foreign: 'The international treaty explicitly aims to <b>proscribe</b> biological weapon testing.',
        ja: 'その国際条約は、生物兵器の実験を明確に<b>禁止する</b>ことを目的としている。',
        used_form: 'proscribe'
      },
      derivatives: [{ word: 'proscription', phonetic: '/prəˈskrɪpʃn/', pos: 'N[C, U]', meaning: '禁止、排斥' }]
    },
    {
      word: 'ascribe',
      phonetic: '/əˈskraɪb/',
      meanings: [{ pos: 'V[T]', text: '（原因・結果・作品などを〜に）帰する、〜のせいにする（ascribe A to B）' }],
      core: '〜の元へと「原因の帰属先を書き添える（ad- 〜へ + scribe 書く）」こと。',
      etymology: 'ラテン語 ascribere（書き加える、割り当てる；ad-「〜へ」＋ scribere「書く」）に由来し、印欧祖語 *grebh- に遡る。',
      etymologyTags: ['*grebh-'],
      example: {
        foreign: 'Biologists <b>ascribe</b> the population resurgence to strict habitat preservation.',
        ja: '生物学者たちは、個体数の回復を厳格な生息環境保全の<b>成果であると帰している</b>。',
        used_form: 'ascribe'
      }
    },
    {
      word: 'inscribe',
      phonetic: '/ɪnˈskraɪb/',
      meanings: [{ pos: 'V[T]', text: '（石・金属・心などに文字や名前を）刻む、記す、銘記する' }],
      core: '表面の内側へ「深く彫り込んで書き刻む（in- 中に + scribe 書く）」こと。',
      etymology: 'ラテン語 inscribere（銘を刻む；in-「中に」＋ scribere「書く」）に由来し、印欧祖語 *grebh- に遡る。',
      etymologyTags: ['*grebh-'],
      example: {
        foreign: 'The artisan was commissioned to <b>inscribe</b> the heroes\' names upon the memorial.',
        ja: 'その職人は、記念碑に英雄たちの名前を<b>刻み込む</b>ことを依頼された。',
        used_form: 'inscribe'
      },
      derivatives: [{ word: 'inscription', phonetic: '/ɪnˈskrɪpʃn/', pos: 'N[C]', meaning: '碑文、刻まれた文字' }]
    },
    {
      word: 'circumscribe',
      phonetic: '/ˈsɜːkəmskraɪb/',
      meanings: [{ pos: 'V[T]', text: '（権限・自由・範囲などを）制限する、周囲に境界線を引く' }],
      core: '外に出て行けないように「周囲にぐるりと境界線を引く（circum- 周囲に + scribe 書く）」こと。',
      etymology: 'ラテン語 circumscribere（周囲を囲む、制限する；circum-「周りに」＋ scribere「書く」）に由来し、印欧祖語 *grebh- に遡る。',
      etymologyTags: ['*grebh-'],
      example: {
        foreign: 'The new executive charter is strictly intended to <b>circumscribe</b> presidential decree power.',
        ja: '新たな基本定款は、大統領令の権限を厳格に<b>制限する</b>ことを意図している。',
        used_form: 'circumscribe'
      }
    }
  ];

  /**
   * 単語検索インデックス
   */
  const WORD_INDEX = new Map();
  EIKEN_PRE1_WORDS.forEach(w => {
    WORD_INDEX.set(w.word.toLowerCase(), w);
  });

  /**
   * 語根ごとの単語グループ
   */
  const ROOT_WORD_MAP = new Map();
  EIKEN_PRE1_ROOTS.forEach(r => {
    ROOT_WORD_MAP.set(r.rootKey, []);
  });
  EIKEN_PRE1_WORDS.forEach(w => {
    (w.etymologyTags || []).forEach(tag => {
      const clean = tag.replace(/h[1-3₁-₃]/g, '').toLowerCase();
      // *kap-, *sta- などにマッピング
      for (const [rKey, list] of ROOT_WORD_MAP.entries()) {
        const cleanR = rKey.replace(/h[1-3₁-₃]/g, '').toLowerCase();
        if (clean === cleanR || clean.startsWith(cleanR.replace(/-$/, ''))) {
          list.push(w);
          break;
        }
      }
    });
  });

  // 公開 API
  global.VocabEikenCatalog = {
    ROOTS: EIKEN_PRE1_ROOTS,
    WORDS: EIKEN_PRE1_WORDS,

    /**
     * トップ語根一覧を取得（ランキング順）
     */
    getRoots: function() {
      return EIKEN_PRE1_ROOTS.map(r => ({
        ...r,
        wordCount: (ROOT_WORD_MAP.get(r.rootKey) || []).length
      }));
    },

    /**
     * 単一語根のメタデータを取得
     */
    getRoot: function(rootKey) {
      if (!rootKey) return null;
      const norm = s => String(s || '').trim().toLowerCase().replace(/^\*/, '').replace(/-$/, '');
      const target = norm(rootKey);
      return EIKEN_PRE1_ROOTS.find(r => norm(r.rootKey) === target) || null;
    },

    /**
     * 指定語根の全準1級単語を取得
     */
    getWordsByRoot: function(rootKey) {
      if (!rootKey) return [];
      const CATALOG_ROOT_ALIASES = {
        '*dic-': '*deik-',
        '*dic': '*deik-',
        '*vid-': '*weid-',
        '*vid': '*weid-',
        '*sec-': '*sekw-',
        '*sec': '*sekw-',
        '*stā-': '*sta-',
        '*stā': '*sta-',
        '*gn-': '*gno-',
        '*gn': '*gno-',
        '*graph-': '*grebh-',
        '*graph': '*grebh-'
      };
      const normRoot = s => String(s || '').trim().toLowerCase()
        .replace(/h[1-3₁-₃]/g, '')
        .replace(/[āăáàâ]/g, 'a')
        .replace(/[ēĕéèêḗ]/g, 'e')
        .replace(/[īĭíìî]/g, 'i')
        .replace(/[ōŏóòôǭ]/g, 'o')
        .replace(/[ūŭúùû]/g, 'u');
      const rawR = normRoot(rootKey);
      const mappedR = CATALOG_ROOT_ALIASES[rawR] || rawR;
      const cleanR = normRoot(mappedR);
      for (const [rKey, list] of ROOT_WORD_MAP.entries()) {
        const c = normRoot(rKey);
        if (cleanR === c || cleanR.startsWith(c.replace(/-$/, ''))) {
          return list;
        }
      }
      return [];
    },

    /**
     * 単語名から完全なカードデータを取得 (O(1))
     */
    getWord: function(word) {
      if (!word) return null;
      return WORD_INDEX.get(String(word).trim().toLowerCase()) || null;
    },

    /**
     * 登録済みカタログ単語リストの全キーを配列で取得
     */
    getAllWords: function() {
      return Array.from(WORD_INDEX.keys());
    },

    /**
     * 現在の単語帳（currentEntries）と照合して、語根ごとの達成率・未学習語を計算
     */
    calcProgress: function(currentEntries) {
      const registered = new Set();
      if (Array.isArray(currentEntries)) {
        currentEntries.forEach(e => {
          if (e && e.word && !e.isDeleted) {
            registered.add(e.word.toLowerCase());
          }
        });
      }

      return EIKEN_PRE1_ROOTS.map(r => {
        const words = ROOT_WORD_MAP.get(r.rootKey) || [];
        const total = words.length;
        const learned = words.filter(w => registered.has(w.word.toLowerCase()));
        const unlearned = words.filter(w => !registered.has(w.word.toLowerCase()));
        const percent = total > 0 ? Math.round((learned.length / total) * 100) : 0;

        return {
          rootKey: r.rootKey,
          label: r.label,
          meaning: r.meaning,
          rank: r.rank,
          desc: r.desc,
          total,
          learnedCount: learned.length,
          unlearnedCount: unlearned.length,
          unlearnedWords: unlearned,
          percent
        };
      });
    }
  };

})(typeof window !== 'undefined' ? window : globalThis);
