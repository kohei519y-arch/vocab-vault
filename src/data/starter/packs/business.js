/** Vocab Vault Starter Pack Data (business) */
export default [
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

