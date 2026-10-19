/**
 * Vocab Vault — Lightweight Internationalization & Localization Engine (js/i18n.js)
 * Zero-dependency, instantaneous locale switching for global SaaS expansion.
 * Auto-detects browser locale (default English for global, Japanese for ja-*)
 */
(function(global) {
  'use strict';

  const STORAGE_KEY = 'vv_ui_locale';
  const SUPPORTED_LOCALES = ['en', 'ja', 'fr', 'de', 'es', 'it', 'pt', 'nl', 'zh', 'ko'];

  // 多言語対照辞書 (Translation Lexicon)
  const TRANSLATIONS = {
    ja: {
      // 共通・ナビゲーション
      'app.title': 'Vocab Vault',
      'app.tagline': '語源と概念史で深く刻む、知的探求者のためのボキャブラリー・ヴォールト',
      'nav.explore': '探す',
      'nav.list': '一覧',
      'nav.extract': '抽出',
      'nav.review': '復習',
      'nav.analytics': '分析',
      'nav.mask': '赤シート',
      'side.explorer': 'エクスプローラ・検索',
      'nav.all_words': 'すべての単語',
      'nav.anki': 'Anki 復習',
      'nav.graph': '語根ネットワーク',
      'nav.settings': '設定',
      'nav.add_word': '単語を追加',
      'nav.search_ph': '検索: 単語, 意味, *語根, #品詞, @カテゴリ, ?条件...',
      'nav.sync_cloud': 'クラウド同期',
      'nav.syncing': '同期中...',
      'nav.synced': '同期完了',
      'nav.offline': 'オフライン',
      'nav.ear_learning': '耳学',
      'nav.ear_learning_title': '表示中の単語を音声で自動連続再生 (L)',
      'nav.mode_academic': '学術・詳細',
      'nav.mode_simple': 'シンプル',
      'nav.sort_new': '並び順: 新しい順',
      'nav.sort_old': '並び順: 古い順 (#1〜)',
      'nav.sort_due': '並び順: 復習期日が近い順',
      'nav.sort_alpha': '並び順: アルファベット順',

      // Anki 復習
      'anki.recog': '認識',
      'anki.cloze': '産出 (Cloze)',
      'anki.recog_title': '単語から意味を想起 (M)',
      'anki.cloze_title': '例文穴埋めから単語を想起 (M)',
      'anki.undo': '元に戻す (Z)',
      'anki.show_ans': '解答を表示 (Space)',
      'anki.again': 'もう一度 (1)',
      'anki.hard': '難しい (2)',
      'anki.good': '覚えた (3)',
      'anki.easy': '簡単 (4)',
      'anki.offline_badge': '未同期の復習',
      'anki.context_title': '出会った文脈 (Episode Context)',
      'anki.swipe_left': '← 左スワイプ: もう一度',
      'anki.swipe_right': '右スワイプ: 覚えた →',
      'anki.empty_title': '本日の復習はすべて完了しました！',
      'anki.empty_desc': '新しい単語を登録するか、スターターパックを取り込んで語彙ネットワークを広げましょう。',

      // グラフビュー
      'graph.title': '語根・語源ネットワーク',
      'graph.tab_network': 'ネットワーク',
      'graph.tab_tree': '系統樹ツリー',
      'graph.tab_mindmap': 'マインドマップ',
      'graph.tab_matrix': '接頭辞×語根',
      'graph.eiken_btn': 'スキルツリー',
      'graph.watering_btn': '水やり復習',
      'graph.mask_btn_off': '赤シート:OFF',
      'graph.mask_btn_on': '赤シート:ON',
      'graph.cluster_btn': '星団のみ',
      'graph.color_btn': '言語色',
      'graph.physics_stop': '停止',
      'graph.physics_run': '稼働',
      'graph.fit_btn': '全体表示',
      'graph.save_img': '画像保存',
      'graph.filter_ph': '語根・単語で検索...',
      'graph.all_lang': '全言語',
      'graph.en_only': '英語のみ',
      'graph.fr_only': '仏語のみ',
      'graph.de_only': '独語のみ',
      'graph.ja_only': '日本語のみ',
      'graph.root_jump_default': '主要語根へ飛ぶ...',
      'graph.all_roots': '全語根一覧',
      'graph.unlock_eiken': 'この系統樹を一括習得',

      // 設定・プラン
      'settings.title': '設定 & アカウント',
      'settings.modal_title': '設定・クラウド同期・データ管理',
      'settings.tab_general': '一般・表示',
      'settings.tab_account': 'アカウント・同期',
      'settings.tab_plans': 'プラン・課金',
      'settings.tab_ai': 'AI・忘却曲線',
      'settings.tab_storage': 'データ管理',
      'settings.lang_heading': '表示言語 (Language)',
      'settings.lang_desc': 'UIおよびメニューの表示言語を選択します。',
      'settings.theme_heading': '表示・音声設定',
      'settings.theme_dark': 'ダークモード',
      'settings.theme_light': 'ライトモード',
      'settings.auto_speak': '復習時に自動発音',
      'settings.auto_speak_title': '暗記復習(Anki)モードでカード表示時に自動発音',
      'settings.tts_rate_title': '読み上げ速度',
      'settings.tts_rate_slow': '速度: 0.85x (ゆっくり)',
      'settings.tts_rate_natural': '速度: 0.95x (自然)',
      'settings.tts_rate_fast': '速度: 1.05x (やや速め)',

      'settings.onboarding_title': '初期オンボーディング・操作ガイド',
      'settings.onboarding_badge': 'いつでも再確認可能',
      'settings.onboarding_desc': '印欧祖語（語根）による芋づる式暗記の基礎概念、FSRS-4.5科学的忘却曲線、および表示モードの選択ガイドツアーをいつでも再確認できます。',
      'settings.onboarding_btn': 'オンボーディングツアーを開く',

      'settings.pwa_title': 'アプリ単体で開く (Chrome等のブラウザ枠なし起動)',
      'settings.pwa_badge': '単体起動対応',
      'settings.pwa_desc': 'ChromeのURLバーやタブを介さず、Mac・Windows・スマホで独立した専用アプリウィンドウとして快適にご利用いただけます。',
      'settings.pwa_install_btn': 'アプリをインストール（単独起動）',
      'settings.pwa_guide_btn': 'OS別セットアップ手順',
      'settings.pwa_mac_note': '※Macの方は、本フォルダ内の「Vocab Vault.app」または「Vocab Vault.command」をダブルクリックするだけで、ブラウザ枠なしの単体アプリとして直接起動できます。',

      'settings.account_title': 'アカウント管理 ＆ クラウド同期',
      'settings.not_logged_in': '未ログイン',
      'settings.logged_in': 'ログイン済',
      'settings.email_ph': 'メールアドレス',
      'settings.pass_ph': 'パスワード (6文字以上)',
      'settings.login_btn': 'ログイン',
      'settings.signup_btn': '新規登録',
      'settings.agree_terms': '利用規約',
      'settings.agree_and': ' および ',
      'settings.agree_privacy': 'プライバシーポリシー',
      'settings.agree_suffix': ' に同意する',
      'settings.supabase_selfhost_title': '上級者向け: 独自のSupabaseサーバー（セルフホスト）を使用する場合',
      'settings.supabase_url_ph': 'Supabase URL (https://xxx.supabase.co)',
      'settings.supabase_anon_ph': 'Supabase Anon Public Key',
      'settings.supabase_selfhost_desc': '※通常は入力不要です。公式クラウドサーバー（TLS/SSL完全暗号化）に自動接続されます。',
      'settings.sync_now_btn': '今すぐ差分同期',
      'settings.logout_btn': 'ログアウト',
      'settings.quota_desc': '※無料アカウント登録で1日5語までAI新規生成可能（共有キャッシュは無制限）。複数端末間のクラウド自動同期はProプラン（月480円）でご利用いただけます。',

      'settings.plan_heading': 'プラン & サブスクリプション (Stripe決済)',
      'settings.free_plan': 'Free プラン',
      'settings.pro_plan': 'Pro プラン',
      'settings.current_plan': '現在のプラン',
      'settings.recommended': 'おすすめ',
      'settings.plan_monthly': '月払い',
      'settings.plan_annual': '年払い (2ヶ月分無料)',
      'settings.price_free': '¥0 / 月',
      'settings.price_pro_monthly': '¥480 / 月',
      'settings.price_pro_annual': '¥4,800 / 年 (月換算 ¥400)',
      'settings.free_feat1': '1日 5 語までのAI新規生成',
      'settings.free_feat2': '共有辞書キャッシュの利用（無制限）',
      'settings.free_feat3': '1端末ローカル保持（手動JSON保存対応）',
      'settings.free_feat4': 'SM-2/FSRS暗記復習・スワイプUI',
      'settings.pro_feat1': 'AI新規生成・概念史深掘り 無制限',
      'settings.pro_feat2': '長文・画像OCR抽出 無制限',
      'settings.pro_feat3': '複数端末クラウド自動差分同期',
      'settings.pro_feat4': '優先サポート',
      'settings.legal_notice_title': '【定期課金・解約に関する法定明示】',
      'settings.legal_notice_1': '・月額480円（税込）または年額4,800円（税込）の自動更新',
      'settings.legal_notice_2': '・次回更新日の前日までに設定画面（またはStripeポータル）よりいつでも解約可能',
      'settings.legal_notice_3': '・解約後も次回更新日まではPro機能を利用可能（日割り精算なし）',
      'settings.upgrade_btn': 'Pro プランにアップグレード',
      'settings.portal_btn': '契約・請求管理 (Stripeポータル)',
      'settings.stripe_secure_note': '※決済はStripeのSSL暗号化決済ページで行われます。',
      'settings.link_terms': '利用規約',
      'settings.link_privacy': 'プライバシー',
      'settings.link_tokusho': '特定商取引法',

      'settings.metrics_title': 'AI生成・トークン消費メトリクス ＆ 節約量',
      'settings.metrics_badge_cache': '高効率キャッシュ稼働中',
      'settings.metric_total_words': '総生成リクエスト',
      'settings.metric_cache_rate': '共有キャッシュヒット率',
      'settings.metric_tokens_saved': '削減トークン推定',
      'settings.metric_daily_quota': '本日AI新規生成残枠',
      'settings.metrics_desc': '※共有辞書キャッシュから即時展開された単語は、Gemini APIトークンを消費せず待ち時間ゼロ(0ms)で高速登録されます。',

      'settings.ai_engine_title': 'AI生成エンジン ＆ プライバシー機密保護',
      'settings.ai_engine_badge': '内蔵AI稼働中 (完全機密保護)',
      'settings.ai_engine_desc': '本アプリは内部にAIエンジンが埋め込まれており、個人のAPIキーを入力することなく安全にご利用いただけます。すべての通信はTLS/SSL暗号化され、プライバシーは厳格に保護されます。',
      'settings.byok_title': '上級者向け設定: カスタムGemini APIキー (BYOK: HTTPS直接通信)',
      'settings.byok_ph': 'AIzaSy... (通常は未入力で問題ありません)',
      'settings.byok_show': '表示',
      'settings.byok_hide': '隠す',
      'settings.byok_save': '保存・確認',
      'settings.byok_session_only': 'ブラウザを閉じたら消去する（このセッションのみ有効 / sessionStorage）',
      'settings.byok_desc': '※ご自身のGoogle AI Studio発行キーで直接通信したい場合のみ設定してください。キーはローカルブラウザ内にのみ保持され、Google Gemini APIとのHTTPS通信にのみ使用されます。',
      'settings.byok_model_lbl': '使用AIモデル:',
      'settings.byok_model_auto': '自動（モード別最適モデル）',
      'settings.byok_reload': '再取得',

      'settings.storage_title': 'データ管理・大容量IndexedDB主ストア',
      'settings.storage_badge': '保存正常',
      'settings.export_json': 'JSON保存',
      'settings.export_json_desc': '全言語データを保存',
      'settings.import_json': 'JSON復元',
      'settings.import_json_desc': 'バックアップを統合',
      'settings.export_tsv': 'Anki / TSV出力',
      'settings.export_tsv_desc': '表示中リストを出力',
      'settings.export_apkg': 'Anki (.apkg) 出力',
      'settings.export_apkg_desc': '公式Ankiパッケージ保存',
      'settings.export_obsidian': 'Obsidian出力',
      'settings.export_obsidian_desc': 'Wikiリンク・語根付き.md',
      'settings.sync_obsidian': 'Obsidian直接同期',
      'settings.sync_obsidian_desc': 'Vaultフォルダへ直書き出し',
      'settings.share_deck_url': '共有デッキURL発行',
      'settings.share_deck_url_desc': 'URLで友人に単語配布',
      'settings.starter_pack': 'スターターパック',
      'settings.starter_pack_desc': '厳選学術パックを導入',
      'settings.anki_import': 'Ankiインポート',
      'settings.anki_import_desc': 'APKG/TSVから取り込み',
      'settings.salvage_all': '全ストレージ救出',
      'settings.salvage_all_desc': '退避スナップショットを含め復元',

      'settings.fsrs_title': '個人適応型 FSRS 重みオプティマイザ (Personalized FSRS)',
      'settings.fsrs_badge': 'FSRS-4.5 最適化済',
      'settings.fsrs_desc': '復習履歴ログに基づき、想起予測誤差（MSE）を最小化する個人専用の忘却曲線係数を動的に適用します。',
      'settings.fsrs_manual_opt': 'FSRS重み手動最適化',
      'settings.fsrs_manual_opt_desc': '直近500件の復習ログから忘却速度を再計算し、係数を最新化します。',
      'settings.fsrs_opt_now': '今すぐ最適化',
      'settings.fsrs_reset_weights': '初期値にリセット',

      'settings.notify_title': '忘却臨界点スマートPush通知 (Smart Retention Reminder)',
      'settings.notify_badge': 'スマート待機中',
      'settings.notify_heading': '臨界点（記憶定着率 90% 直前）自動介入',
      'settings.notify_desc': '固定時間アラームではなく、登録単語の想起率が90%を下回る直前に自動通知します。',
      'settings.notify_enable': '有効',
      'settings.notify_perm_heading': 'ブラウザ通知の許可状態',
      'settings.notify_perm_desc': 'Web Notification API によるデスクトップ・スマホ通知',
      'settings.notify_perm_btn': '通知を許可する',

      'settings.cap_title': '復習上限 ＆ スヌーズ均等再配分 (FSRS-4.5 SRS)',
      'settings.cap_badge': '最適化済',
      'settings.cap_heading': '1日の最大復習上限 (Daily Review Cap)',
      'settings.cap_desc': '復習が溜まりすぎて学習破綻するのを防ぐため、1日のセッション数を制限します。',
      'settings.cap_opt_20': '20 語 (ゆったり)',
      'settings.cap_opt_30': '30 語 (推奨・標準)',
      'settings.cap_opt_50': '50 語 (集中)',
      'settings.cap_opt_unlimited': '無制限 (すべて)',
      'settings.snooze_heading': '溜まった復習のなだらかな再分散 (Snooze)',
      'settings.snooze_desc': '長期不在等で溜まった復習期日超過単語を、今後7日間に均等になだらかに再配分します。',
      'settings.snooze_btn': '均等に再配分',
      'settings.diagnostics_heading': 'データベース整合性診断 & 自己修復 (Self-Healing)',
      'settings.diagnostics_desc': '全単語レコードの整合性、重複ID、無効な日付、および不要Tombstoneを自動スキャンし最適化します。',
      'settings.diagnostics_btn': '診断 & 修復を実行',

      'settings.sovereignty_title': 'データ主権と永久無料の安心保証',
      'settings.sovereignty_desc': '有料Proプランをご解約された後でも、これまでに登録・生成されたすべての単語データ、暗記復習機能（Anki SRS）、およびJSON / TSV / Obsidianエクスポート機能は永久に完全無料でご利用いただけます。お客様の大切な知的学習資産がロックされることは一切ありません。',

      'settings.dev_title': '開発者マスター権限 (Developer Mode)',
      'settings.dev_desc': '開発者・管理者向けに課金制限・クォータ制限を完全解除し、全機能を無制限・無料で利用します。',
      'settings.dev_btn': '権限を切替',

      'settings.clear_lang_title': '現在の言語データを全削除',
      'settings.clear_lang_desc_pre': '選択中の言語（',
      'settings.clear_lang_desc_post': '）を消去します（リロードしても復活しません）。',
      'settings.clear_lang_btn': '全削除',

      'settings.delete_acct_title': 'アカウント完全削除（退会）',
      'settings.delete_acct_desc': 'クラウド上の全ての単語データ・学習履歴・アカウント情報を恒久的に抹消します。この操作は取り消せません。',
      'settings.delete_acct_btn': '退会・データ抹消',
      'settings.close_btn': '設定を閉じる',

      // ツールバー・入力・サイドバー
      'toolbar.wordbook': '単語帳',
      'toolbar.swap_lang': '言語を入れ替え (⇄)',
      'toolbar.storage_status': '保存状態を確認',
      'toolbar.ai_quota_prefix': 'AI残: ',
      'toolbar.cloud_ai_active': '内蔵AI: 稼働中 (完全機密保護)',
      'addbar.fol_ph': '分野 (任意)',
      'addbar.word_ph': '単語・熟語を入力（カンマや改行で複数一括登録 / 例: wet blanket, look up）',
      'addbar.hist_lbl': '歴史',
      'addbar.hist_title': '歴史・制度・時代背景を深く解説',
      'addbar.wikt_lbl': 'Wikt',
      'addbar.wikt_title': 'Wiktionary語源・IPAと照合裏付け',
      'addbar.submit': '登録',
      'addbar.opts_title': '分野・オプションを展開',
      'feedback.banner_notice': 'ご案内',
      'feedback.banner_text': '機能改善や学術語彙・語源学習に関するご意見・ヒアリングを募集しています（参加者にProプラン1年分進呈）',
      'feedback.participate': '参加・回答する',
      'feedback.close': '閉じる',
      'list.all_words': 'すべての単語',
      'list.audio_loop': '耳学',
      'list.audio_loop_title': '表示中の単語を音声で自動連続再生 (L)',
      'list.academic': '学術・詳細',
      'list.academic_title': '語源・概念史・コアイメージを常時フル表示',
      'list.simple': 'シンプル',
      'list.simple_title': '意味と例文のみをスッキリ表示（タップで語源展開）',
      'side.lang_pairs': '言語ペア (Language Pairs)',
      'side.status_filter': '状態・要確認フィルタ',
      'side.field_filter': 'タイトル・分野',
      'side.pos_filter': '品詞 (POS)',
      'side.cat_filter': 'カテゴリ',
      'side.feedback': 'ご意見',
      'side.settings': '設定',
      'side.xlang_btn': '全言語横断',
      'side.xlang_title': '全言語ペアを横断検索',
      'side.reset_btn': '解除',

      // カテゴリ
      'cat.philosophy': '哲学・思想',
      'cat.psychology': '心理・精神',
      'cat.science': '科学・技術',
      'cat.politics': '政治・法学',
      'cat.business': '実務・経済',
      'cat.arts': '文学・芸術',
      'cat.daily': '日常・一般',
      'cat.general': '一般・その他',
      'cat.logic': '論理・討論',
      'cat.exam': '検定・試験',

      // アップセルモーダル
      'upsell.title': '語彙の限界を突破する — Vocab Vault Pro',
      'upsell.subtitle': '単なる暗記帳を卒業し、学術論文読解・英語での発信を自在にする深層学習環境へ。',
      'upsell.feat_ai': 'AI新規生成・概念史深掘り（無制限）',
      'upsell.feat_cache': '共有辞書キャッシュ・2,000語カタログ（無制限）',
      'upsell.feat_sync': '複数端末クラウド自動差分同期（リアルタイム）',
      'upsell.feat_ocr': '長文・画像OCR抽出（無制限）',
      'upsell.feat_analytics': 'FSRS-4.5 パーソナライズ忘却曲線オプティマイザ',
      'upsell.save_badge': '年払いで2ヶ月分無料！',
      'upsell.upgrade_now': '今すぐProプランで始める',
      'upsell.skip': '今は見送る',

      // トースト・通知
      'toast.saved': '保存しました',
      'toast.sync_success': 'クラウドとの差分同期が完了しました',
      'toast.unlocked': 'スキルを習得して単語帳に追加しました',
      'toast.eiken_all_unlocked': '語根の語彙スキルを一括習得しました'
    },

    en: {
      // Common & Navigation
      'app.title': 'Vocab Vault',
      'app.tagline': 'Deep PIE Etymology & Conceptual History for Intellectual Learners',
      'nav.explore': 'Explore',
      'nav.list': 'List',
      'nav.extract': 'Extract',
      'nav.review': 'Review',
      'nav.analytics': 'Analytics',
      'nav.mask': 'Mask',
      'side.explorer': 'Explorer & Search',
      'nav.all_words': 'All Words',
      'nav.anki': 'Anki Review',
      'nav.graph': 'Root Network',
      'nav.settings': 'Settings',
      'nav.add_word': 'Add Word',
      'nav.search_ph': 'Search: word, meaning, *root, #pos, @category, ?filter...',
      'nav.sync_cloud': 'Cloud Sync',
      'nav.syncing': 'Syncing...',
      'nav.synced': 'Synced',
      'nav.offline': 'Offline',
      'nav.ear_learning': 'Audio Loop',
      'nav.ear_learning_title': 'Play words & examples automatically in background loop (L)',
      'nav.mode_academic': 'Academic',
      'nav.mode_simple': 'Simple',
      'nav.sort_new': 'Sort: Newest',
      'nav.sort_old': 'Sort: Oldest (#1~)',
      'nav.sort_due': 'Sort: Due for Review',
      'nav.sort_alpha': 'Sort: Alphabetical',

      // Anki Review
      'anki.recog': 'Recognition',
      'anki.cloze': 'Production (Cloze)',
      'anki.recog_title': 'Recall meaning from word (M)',
      'anki.cloze_title': 'Fill in the blank from context (M)',
      'anki.undo': 'Undo (Z)',
      'anki.show_ans': 'Show Answer (Space)',
      'anki.again': 'Again (1)',
      'anki.hard': 'Hard (2)',
      'anki.good': 'Good (3)',
      'anki.easy': 'Easy (4)',
      'anki.offline_badge': 'Unsynced reviews',
      'anki.context_title': 'Encountered Context (Episode Memory)',
      'anki.swipe_left': '← Swipe Left: Again',
      'anki.swipe_right': 'Swipe Right: Good →',
      'anki.empty_title': 'All reviews completed for today!',
      'anki.empty_desc': 'Add new words or install a starter pack to expand your root network.',

      // Graph View
      'graph.title': 'Root & Etymology Network',
      'graph.tab_network': 'Network',
      'graph.tab_tree': 'Lineage Tree',
      'graph.tab_mindmap': 'Mindmap',
      'graph.tab_matrix': 'Prefix x Root',
      'graph.eiken_btn': 'Top Roots Catalog',
      'graph.watering_btn': 'Targeted Review',
      'graph.mask_btn_off': 'Mask: OFF',
      'graph.mask_btn_on': 'Mask: ON',
      'graph.cluster_btn': 'Clusters Only',
      'graph.color_btn': 'Lang Color',
      'graph.physics_stop': 'Pause',
      'graph.physics_run': 'Run',
      'graph.fit_btn': 'Fit View',
      'graph.save_img': 'Export PNG',
      'graph.filter_ph': 'Filter roots or words...',
      'graph.all_lang': 'All Languages',
      'graph.en_only': 'English Only',
      'graph.fr_only': 'French Only',
      'graph.de_only': 'German Only',
      'graph.ja_only': 'Japanese Only',
      'graph.root_jump_default': 'Jump to Root...',
      'graph.all_roots': 'All Roots Directory',
      'graph.unlock_eiken': 'Learn All Branch Skills',

      // Settings & Plans
      'settings.title': 'Settings & Account',
      'settings.modal_title': 'Settings & Cloud Sync & Data Management',
      'settings.tab_general': 'General & Display',
      'settings.tab_account': 'Account & Sync',
      'settings.tab_plans': 'Plans & Billing',
      'settings.tab_ai': 'AI & Retention',
      'settings.tab_storage': 'Data & Storage',
      'settings.lang_heading': 'Interface Language',
      'settings.lang_desc': 'Choose the display language for UI controls and menus.',
      'settings.theme_heading': 'Display & Audio Settings',
      'settings.theme_dark': 'Dark Mode',
      'settings.theme_light': 'Light Mode',
      'settings.auto_speak': 'Auto-pronounce during review',
      'settings.auto_speak_title': 'Automatically speak word when card appears in Anki review mode',
      'settings.tts_rate_title': 'Speech rate',
      'settings.tts_rate_slow': 'Speed: 0.85x (Slow)',
      'settings.tts_rate_natural': 'Speed: 0.95x (Natural)',
      'settings.tts_rate_fast': 'Speed: 1.05x (Fast)',

      'settings.onboarding_title': 'Initial Onboarding & User Guide',
      'settings.onboarding_badge': 'Available Anytime',
      'settings.onboarding_desc': 'Review the guided tour anytime for PIE root cluster memorization, FSRS-4.5 spaced repetition, and view modes.',
      'settings.onboarding_btn': 'Open Onboarding Tour',

      'settings.pwa_title': 'Open as Standalone App (Borderless Window)',
      'settings.pwa_badge': 'Standalone Ready',
      'settings.pwa_desc': 'Use as an independent app window on Mac, Windows, and mobile without browser URL bars or tabs.',
      'settings.pwa_install_btn': 'Install App (Standalone)',
      'settings.pwa_guide_btn': 'OS Setup Guide',
      'settings.pwa_mac_note': '*Mac users can launch directly as a borderless standalone app by double-clicking "Vocab Vault.app" or "Vocab Vault.command" in this folder.',

      'settings.account_title': 'Account Management & Cloud Sync',
      'settings.not_logged_in': 'Not Signed In',
      'settings.logged_in': 'Signed In',
      'settings.email_ph': 'Email address',
      'settings.pass_ph': 'Password (6+ characters)',
      'settings.login_btn': 'Sign In',
      'settings.signup_btn': 'Sign Up',
      'settings.agree_terms': 'Terms of Service',
      'settings.agree_and': ' and ',
      'settings.agree_privacy': 'Privacy Policy',
      'settings.agree_suffix': '',
      'settings.supabase_selfhost_title': 'Advanced: Custom Self-Hosted Supabase Endpoint',
      'settings.supabase_url_ph': 'Supabase URL (https://xxx.supabase.co)',
      'settings.supabase_anon_ph': 'Supabase Anon Public Key',
      'settings.supabase_selfhost_desc': '*Normally not required. Automatically connects to the official cloud server with TLS/SSL encryption.',
      'settings.sync_now_btn': 'Sync Diff Now',
      'settings.logout_btn': 'Sign Out',
      'settings.quota_desc': '*Free accounts can generate up to 5 AI words per day (unlimited shared cache). Real-time cross-device cloud sync is included in the Pro plan ($3.99/mo).',

      'settings.plan_heading': 'Subscription & Plans (Stripe)',
      'settings.free_plan': 'Free Tier',
      'settings.pro_plan': 'Pro Plan',
      'settings.current_plan': 'Current Plan',
      'settings.recommended': 'Recommended',
      'settings.plan_monthly': 'Monthly',
      'settings.plan_annual': 'Annual (Save 17% / 2 Months Free)',
      'settings.price_free': '$0 / mo',
      'settings.price_pro_monthly': '$3.99 / mo',
      'settings.price_pro_annual': '$39.00 / yr ($3.25 / mo)',
      'settings.free_feat1': 'Up to 5 new AI word generations per day',
      'settings.free_feat2': 'Unlimited shared dictionary cache access',
      'settings.free_feat3': 'Single device local storage with JSON backup',
      'settings.free_feat4': 'SM-2 / FSRS spaced repetition review & swipe UI',
      'settings.pro_feat1': 'Unlimited AI generation & deep conceptual history',
      'settings.pro_feat2': 'Unlimited passage & image OCR extraction',
      'settings.pro_feat3': 'Multi-device real-time cloud diff sync',
      'settings.pro_feat4': 'Priority support',
      'settings.legal_notice_title': '[Subscription & Cancellation Disclosure]',
      'settings.legal_notice_1': '• Auto-renewing at $3.99/mo or $39.00/yr',
      'settings.legal_notice_2': '• Cancel anytime before renewal date via Settings or Stripe Portal',
      'settings.legal_notice_3': '• Pro features remain active until the end of the billing period after cancellation',
      'settings.upgrade_btn': 'Upgrade to Pro Plan',
      'settings.portal_btn': 'Billing & Invoices (Stripe Portal)',
      'settings.stripe_secure_note': '*Payments are processed securely via Stripe SSL encrypted checkout.',
      'settings.link_terms': 'Terms of Service',
      'settings.link_privacy': 'Privacy Policy',
      'settings.link_tokusho': 'Commercial Disclosure',

      'settings.metrics_title': 'AI Generation & Token Savings Metrics',
      'settings.metrics_badge_cache': 'High-Efficiency Cache Active',
      'settings.metric_total_words': 'Total Generation Requests',
      'settings.metric_cache_rate': 'Shared Cache Hit Rate',
      'settings.metric_tokens_saved': 'Estimated Tokens Saved',
      'settings.metric_daily_quota': 'Daily AI Generation Quota',
      'settings.metrics_desc': '*Words retrieved from shared cache consume zero API tokens and register instantly with 0ms latency.',

      'settings.ai_engine_title': 'AI Engine & Privacy Protection',
      'settings.ai_engine_badge': 'Embedded AI Active (Full Privacy)',
      'settings.ai_engine_desc': 'The app includes an embedded AI engine, allowing secure usage without entering personal API keys. All communications are TLS/SSL encrypted and strictly private.',
      'settings.byok_title': 'Advanced: Custom Gemini API Key (BYOK: Direct HTTPS)',
      'settings.byok_ph': 'AIzaSy... (Normally leave blank)',
      'settings.byok_show': 'Show',
      'settings.byok_hide': 'Hide',
      'settings.byok_save': 'Save & Verify',
      'settings.byok_session_only': 'Clear when browser is closed (Session only / sessionStorage)',
      'settings.byok_desc': '*Configure only if you prefer using your own Google AI Studio key. The key is kept strictly in local browser storage and used solely for HTTPS requests to Gemini API.',
      'settings.byok_model_lbl': 'AI Model:',
      'settings.byok_model_auto': 'Auto (Optimized per mode)',
      'settings.byok_reload': 'Reload',

      'settings.storage_title': 'Data Management & High-Capacity IndexedDB Store',
      'settings.storage_badge': 'Storage Normal',
      'settings.export_json': 'Export JSON',
      'settings.export_json_desc': 'Backup all language data',
      'settings.import_json': 'Import JSON',
      'settings.import_json_desc': 'Restore & merge backup',
      'settings.export_tsv': 'Export TSV',
      'settings.export_tsv_desc': 'Export current word list',
      'settings.export_apkg': 'Export APKG',
      'settings.export_apkg_desc': 'Save official Anki package',
      'settings.export_obsidian': 'Export Obsidian',
      'settings.export_obsidian_desc': 'Markdown with wiki links & roots',
      'settings.sync_obsidian': 'Direct Obsidian Sync',
      'settings.sync_obsidian_desc': 'Write directly to vault folder',
      'settings.share_deck_url': 'Share Deck URL',
      'settings.share_deck_url_desc': 'Share vocabulary via link',
      'settings.starter_pack': 'Starter Packs',
      'settings.starter_pack_desc': 'Install curated academic packs',
      'settings.anki_import': 'Import Anki',
      'settings.anki_import_desc': 'Import from APKG / TSV',
      'settings.salvage_all': 'Salvage All Storage',
      'settings.salvage_all_desc': 'Restore snapshots & backups',

      'settings.fsrs_title': 'Personalized FSRS Weight Optimizer',
      'settings.fsrs_badge': 'FSRS-4.5 Optimized',
      'settings.fsrs_desc': 'Dynamically applies personalized retention parameters to minimize mean squared error (MSE) based on your review history.',
      'settings.fsrs_manual_opt': 'Manual FSRS Optimization',
      'settings.fsrs_manual_opt_desc': 'Recalculates forgetting rates from your last 500 reviews to update parameters.',
      'settings.fsrs_opt_now': 'Optimize Now',
      'settings.fsrs_reset_weights': 'Reset to Defaults',

      'settings.notify_title': 'Smart Retention Threshold Reminders',
      'settings.notify_badge': 'Smart Standby',
      'settings.notify_heading': 'Intervene at 90% Retention Threshold',
      'settings.notify_desc': 'Sends proactive reminders when word recall is about to drop below 90%, avoiding rigid alarm schedules.',
      'settings.notify_enable': 'Enabled',
      'settings.notify_perm_heading': 'Browser Notification Permission',
      'settings.notify_perm_desc': 'Desktop & mobile alerts via Web Notification API',
      'settings.notify_perm_btn': 'Enable Notifications',

      'settings.cap_title': 'Review Cap & Snooze Redistribution (FSRS-4.5 SRS)',
      'settings.cap_badge': 'Optimized',
      'settings.cap_heading': 'Daily Review Cap',
      'settings.cap_desc': 'Limits daily reviews to prevent backlog burnout and maintain sustainable retention.',
      'settings.cap_opt_20': '20 words (Relaxed)',
      'settings.cap_opt_30': '30 words (Recommended)',
      'settings.cap_opt_50': '50 words (Intensive)',
      'settings.cap_opt_unlimited': 'Unlimited (All)',
      'settings.snooze_heading': 'Smooth Overdue Backlog Redistribution (Snooze)',
      'settings.snooze_desc': 'Evenly redistributes overdue cards across the next 7 days after extended breaks.',
      'settings.snooze_btn': 'Redistribute Overdue',
      'settings.diagnostics_heading': 'Database Integrity & Self-Healing',
      'settings.diagnostics_desc': 'Scans and repairs duplicate IDs, invalid timestamps, and redundant tombstones.',
      'settings.diagnostics_btn': 'Run Diagnostics & Repair',

      'settings.sovereignty_title': 'Data Sovereignty & Lifetime Free Guarantee',
      'settings.sovereignty_desc': 'Even if you cancel your Pro subscription, all registered words, Anki SRS reviews, and JSON / TSV / Obsidian export features remain completely free forever. Your intellectual learning assets will never be locked.',

      'settings.dev_title': 'Developer Master Mode',
      'settings.dev_desc': 'Unlocks all quotas and billing limits for developer and administrator usage.',
      'settings.dev_btn': 'Toggle Permissions',

      'settings.clear_lang_title': 'Delete All Data for Current Language',
      'settings.clear_lang_desc_pre': 'Permanently deletes all words for current language (',
      'settings.clear_lang_desc_post': ') (cannot be undone).',
      'settings.clear_lang_btn': 'Delete All',

      'settings.delete_acct_title': 'Permanently Delete Account',
      'settings.delete_acct_desc': 'Permanently erases all cloud data, learning history, and account profile. This cannot be undone.',
      'settings.delete_acct_btn': 'Delete Account & Data',
      'settings.close_btn': 'Close Settings',

      // Toolbar & Inputs & Sidebar
      'toolbar.wordbook': 'Wordbook',
      'toolbar.swap_lang': 'Swap Languages (⇄)',
      'toolbar.storage_status': 'Check Storage Status',
      'toolbar.ai_quota_prefix': 'AI Left: ',
      'toolbar.cloud_ai_active': 'Embedded AI: Active (Private)',
      'addbar.fol_ph': 'Category / Field (optional)',
      'addbar.word_ph': 'Enter word or phrase (comma or newline for batch / e.g. wet blanket, look up)',
      'addbar.hist_lbl': 'History',
      'addbar.hist_title': 'Deep historical, institutional, and conceptual background',
      'addbar.wikt_lbl': 'Wikt',
      'addbar.wikt_title': 'Cross-reference with Wiktionary etymology & IPA',
      'addbar.submit': 'Add',
      'addbar.opts_title': 'Expand options & categories',
      'feedback.banner_notice': 'Notice',
      'feedback.banner_text': 'We welcome user feedback on academic vocabulary and etymology learning (participants receive 1 year of Pro free).',
      'feedback.participate': 'Participate',
      'feedback.close': 'Close',
      'list.all_words': 'All Words',
      'list.audio_loop': 'Audio Loop',
      'list.audio_loop_title': 'Continuous audio playback for current words (L)',
      'list.academic': 'Academic',
      'list.academic_title': 'Full etymology, conceptual history, and core images',
      'list.simple': 'Simple',
      'list.simple_title': 'Clean view with meaning and examples (tap to expand etymology)',
      'side.lang_pairs': 'Language Pairs',
      'side.status_filter': 'Status & Review Filter',
      'side.field_filter': 'Category & Field',
      'side.pos_filter': 'Part of Speech (POS)',
      'side.cat_filter': 'Categories',
      'side.feedback': 'Feedback',
      'side.settings': 'Settings',
      'side.xlang_btn': 'Cross-Language',
      'side.xlang_title': 'Search across all language pairs',
      'side.reset_btn': 'Reset',

      // Categories
      'cat.philosophy': 'Philosophy & Thought',
      'cat.psychology': 'Psychology & Mind',
      'cat.science': 'Science & Tech',
      'cat.politics': 'Politics & Law',
      'cat.business': 'Business & Economics',
      'cat.arts': 'Literature & Arts',
      'cat.daily': 'Daily & General',
      'cat.general': 'General',
      'cat.logic': 'Logic & Debate',
      'cat.exam': 'Exam Preparation',

      // Upsell Modal
      'upsell.title': 'Transcend Rote Memorization with Vocab Vault Pro',
      'upsell.subtitle': 'Unlock infinite generative PIE root grounding, real-time cross-device sync, and adaptive FSRS retention.',
      'upsell.feat_ai': 'Unlimited AI Deep Conceptual History & Etymology',
      'upsell.feat_cache': 'Unlimited Shared Cache & 2,000 Academic Words Catalog',
      'upsell.feat_sync': 'Real-time Cross-device Cloud Diff Sync',
      'upsell.feat_ocr': 'Unlimited Article & Camera OCR Extraction',
      'upsell.feat_analytics': 'Personalized FSRS-4.5 Retention Optimizer',
      'upsell.save_badge': 'Save 17% with Annual Billing!',
      'upsell.upgrade_now': 'Start Pro Plan Now',
      'upsell.skip': 'Maybe Later',

      // Toasts
      'toast.saved': 'Saved successfully',
      'toast.sync_success': 'Cloud differential sync completed',
      'toast.unlocked': 'Skill learned and added to vocabulary',
      'toast.eiken_all_unlocked': 'All branch skills for this root learned'
    },

    fr: {
      // Commun & Navigation
      'app.title': 'Vocab Vault',
      'app.tagline': 'Étymologie indo-européenne et histoire des concepts pour les esprits intellectuels',
      'nav.explore': 'Explorer',
      'nav.list': 'Liste',
      'nav.extract': 'Extraire',
      'nav.review': 'Réviser',
      'nav.analytics': 'Analyses',
      'nav.mask': 'Masque',
      'side.explorer': 'Explorateur & Recherche',
      'nav.all_words': 'Tous les mots',
      'nav.anki': 'Révision Anki',
      'nav.graph': 'Réseau de racines',
      'nav.settings': 'Paramètres',
      'nav.add_word': 'Ajouter un mot',
      'nav.search_ph': 'Rechercher: mot, sens, *racine, #catégorie, @domaine...',
      'nav.sync_cloud': 'Sync Cloud',
      'nav.syncing': 'Synchronisation...',
      'nav.synced': 'Synchronisé',
      'nav.offline': 'Hors ligne',
      'nav.ear_learning': 'Boucle audio',
      'nav.ear_learning_title': 'Lecture audio continue des mots et exemples (L)',
      'nav.mode_academic': 'Académique',
      'nav.mode_simple': 'Simple',
      'nav.sort_new': 'Tri: Plus récent',
      'nav.sort_old': 'Tri: Plus ancien (#1~)',
      'nav.sort_due': 'Tri: À réviser en priorité',
      'nav.sort_alpha': 'Tri: Alphabétique',

      // Révision Anki
      'anki.recog': 'Reconnaissance',
      'anki.cloze': 'Production (Texte à trous)',
      'anki.recog_title': 'Rappeler le sens depuis le mot (M)',
      'anki.cloze_title': 'Compléter le mot dans le contexte (M)',
      'anki.undo': 'Annuler (Z)',
      'anki.show_ans': 'Afficher la réponse (Espace)',
      'anki.again': 'À revoir (1)',
      'anki.hard': 'Difficile (2)',
      'anki.good': 'Correct (3)',
      'anki.easy': 'Facile (4)',
      'anki.offline_badge': 'Révisions non synchronisées',
      'anki.context_title': 'Contexte rencontré (Mémoire épisodique)',
      'anki.swipe_left': '← Glisser vers la gauche: À revoir',
      'anki.swipe_right': 'Glisser vers la droite: Correct →',
      'anki.empty_title': 'Toutes les révisions du jour sont terminées !',
      'anki.empty_desc': 'Ajoutez de nouveaux mots ou installez un pack de démarrage pour enrichir votre réseau de racines.',

      // Vue Réseau
      'graph.title': 'Réseau de racines étymologiques',
      'graph.tab_network': 'Réseau',
      'graph.tab_tree': 'Arbre généalogique',
      'graph.tab_mindmap': 'Carte mentale',
      'graph.tab_matrix': 'Préfixe x Racine',
      'graph.eiken_btn': 'Catalogue des racines',
      'graph.watering_btn': 'Révision ciblée',
      'graph.mask_btn_off': 'Masque: DÉSACTIVÉ',
      'graph.mask_btn_on': 'Masque: ACTIVÉ',
      'graph.cluster_btn': 'Groupes seuls',
      'graph.color_btn': 'Couleur par langue',
      'graph.physics_stop': 'Pause',
      'graph.physics_run': 'Actif',
      'graph.fit_btn': 'Ajuster la vue',
      'graph.save_img': 'Exporter PNG',
      'graph.filter_ph': 'Filtrer par racine ou mot...',
      'graph.all_lang': 'Toutes les langues',
      'graph.en_only': 'Anglais uniquement',
      'graph.fr_only': 'Français uniquement',
      'graph.de_only': 'Allemand uniquement',
      'graph.ja_only': 'Japonais uniquement',
      'graph.root_jump_default': 'Aller à la racine...',
      'graph.all_roots': 'Répertoire de toutes les racines',
      'graph.unlock_eiken': 'Apprendre toutes les branches',

      // Paramètres & Forfaits
      'settings.title': 'Paramètres & Compte',
      'settings.modal_title': 'Paramètres, Synchronisation Cloud & Données',
      'settings.tab_general': 'Général & Affichage',
      'settings.tab_account': 'Compte & Synchronisation',
      'settings.tab_plans': 'Forfaits & Facturation',
      'settings.tab_ai': 'IA & Mémorisation',
      'settings.tab_storage': 'Gestion des données',
      'settings.lang_heading': 'Langue de l\'interface',
      'settings.lang_desc': 'Choisissez la langue d\'affichage des menus et commandes.',
      'settings.theme_heading': 'Paramètres d\'affichage & audio',
      'settings.theme_dark': 'Mode sombre',
      'settings.theme_light': 'Mode clair',
      'settings.auto_speak': 'Prononciation automatique en révision',
      'settings.auto_speak_title': 'Prononcer automatiquement le mot en mode Anki',
      'settings.tts_rate_title': 'Vitesse de diction',
      'settings.tts_rate_slow': 'Vitesse: 0.85x (Lente)',
      'settings.tts_rate_natural': 'Vitesse: 0.95x (Naturelle)',
      'settings.tts_rate_fast': 'Vitesse: 1.05x (Rapide)',
      'settings.onboarding_title': 'Guide de démarrage & Visite guidée',
      'settings.onboarding_badge': 'Disponible à tout moment',
      'settings.onboarding_desc': 'Redécouvrez les principes de mémorisation par racines étymologiques, l\'algorithme FSRS-4.5 et les modes de vue.',
      'settings.onboarding_btn': 'Ouvrir la visite guidée',
      'settings.pwa_title': 'Ouvrir en application autonome (sans cadre navigateur)',
      'settings.pwa_badge': 'Compatible autonome',
      'settings.pwa_desc': 'Utilisez l\'application dans une fenêtre dédiée sans barre d\'URL sur Mac, Windows et mobile.',
      'settings.pwa_install_btn': 'Installer l\'application (Autonome)',
      'settings.pwa_guide_btn': 'Guide d\'installation par OS',
      'settings.pwa_mac_note': '*Sur Mac, lancez directement l\'application sans navigateur en double-cliquant sur "Vocab Vault.app" dans ce dossier.',
      'settings.account_title': 'Gestion du compte & Synchronisation Cloud',
      'settings.not_logged_in': 'Non connecté',
      'settings.logged_in': 'Connecté',
      'settings.email_ph': 'Adresse e-mail',
      'settings.pass_ph': 'Mot de passe (6+ caractères)',
      'settings.login_btn': 'Connexion',
      'settings.signup_btn': 'Inscription',
      'settings.agree_terms': 'Conditions d\'utilisation',
      'settings.agree_and': ' et ',
      'settings.agree_privacy': 'Politique de confidentialité',
      'settings.agree_suffix': '',
      'settings.supabase_selfhost_title': 'Avancé: Point de terminaison Supabase personnalisé',
      'settings.supabase_url_ph': 'Supabase URL (https://xxx.supabase.co)',
      'settings.supabase_anon_ph': 'Clé publique anon Supabase',
      'settings.supabase_selfhost_desc': '*Non requis en temps normal. Connexion chiffrée SSL automatique au serveur officiel.',
      'settings.sync_now_btn': 'Synchroniser maintenant',
      'settings.logout_btn': 'Déconnexion',
      'settings.quota_desc': '*Les comptes gratuits peuvent générer 5 mots IA par jour (cache partagé illimité). La synchronisation multi-appareils est incluse dans le forfait Pro (3,99 $/mois).',
      'settings.plan_heading': 'Abonnements & Forfaits (Stripe)',
      'settings.free_plan': 'Forfait Gratuit',
      'settings.pro_plan': 'Forfait Pro',
      'settings.current_plan': 'Forfait actuel',
      'settings.recommended': 'Recommandé',
      'settings.plan_monthly': 'Mensuel',
      'settings.plan_annual': 'Annuel (-17% / 2 mois offerts)',
      'settings.price_free': '0 $/mois',
      'settings.price_pro_monthly': '3,99 $/mois',
      'settings.price_pro_annual': '39,00 $/an (3,25 $/mois)',
      'settings.free_feat1': 'Jusqu\'à 5 nouvelles générations de mots IA par jour',
      'settings.free_feat2': 'Accès illimité au dictionnaire partagé en cache',
      'settings.free_feat3': 'Stockage local sur un appareil avec sauvegarde JSON',
      'settings.free_feat4': 'Révision espacée SM-2/FSRS et interface tactile',
      'settings.pro_feat1': 'Génération IA illimitée et histoire conceptuelle approfondie',
      'settings.pro_feat2': 'Extraction illimitée de textes longs et OCR image',
      'settings.pro_feat3': 'Synchronisation différentielle cloud multi-appareils',
      'settings.pro_feat4': 'Support prioritaire',
      'settings.legal_notice_title': '[Informations légales sur le renouvellement et l\'annulation]',
      'settings.legal_notice_1': '• Renouvellement automatique à 3,99 $/mois ou 39,00 $/an',
      'settings.legal_notice_2': '• Résiliable à tout moment avant renouvellement via Paramètres ou Portail Stripe',
      'settings.legal_notice_3': '• Les fonctionnalités Pro restent actives jusqu\'à la fin de la période en cours',
      'settings.upgrade_btn': 'Passer au Forfait Pro',
      'settings.portal_btn': 'Facturation & Factures (Portail Stripe)',
      'settings.stripe_secure_note': '*Paiements sécurisés via le protocole SSL chiffré de Stripe.',
      'settings.link_terms': 'Conditions',
      'settings.link_privacy': 'Confidentialité',
      'settings.link_tokusho': 'Mentions légales',
      'settings.metrics_title': 'Métriques de génération IA et d\'économie de jetons',
      'settings.metrics_badge_cache': 'Cache haute efficacité actif',
      'settings.metric_total_words': 'Requêtes de génération',
      'settings.metric_cache_rate': 'Taux de succès du cache',
      'settings.metric_tokens_saved': 'Jetons économisés estimés',
      'settings.metric_daily_quota': 'Quota quotidien d\'IA',
      'settings.metrics_desc': '*Les mots extraits du cache partagé ne consomment aucun jeton et s\'enregistrent instantanément sans latence (0 ms).',
      'settings.ai_engine_title': 'Moteur IA et protection de la confidentialité',
      'settings.ai_engine_badge': 'IA intégrée active (Confidentialité totale)',
      'settings.ai_engine_desc': 'Cette application intègre un moteur IA chiffré TLS/SSL. Vos données personnelles et clés restent entièrement protégées.',
      'settings.byok_title': 'Avancé: Clé API Gemini personnalisée (BYOK: HTTPS direct)',
      'settings.byok_ph': 'AIzaSy... (Non requis en temps normal)',
      'settings.byok_show': 'Afficher',
      'settings.byok_save': 'Enregistrer & Vérifier',
      'settings.byok_session_only': 'Effacer à la fermeture du navigateur (sessionStorage uniquement)',
      'settings.byok_desc': '*À configurer uniquement si vous utilisez votre propre clé Google AI Studio. La clé reste strictement stockée dans votre navigateur local.',
      'settings.byok_model_lbl': 'Modèle IA:',
      'settings.byok_model_auto': 'Automatique (Modèle optimal par mode)',
      'settings.byok_reload': 'Actualiser',
      'settings.storage_title': 'Stockage principal IndexedDB haute capacité',
      'settings.storage_badge': 'Stockage normal',
      'settings.export_json': 'Exporter JSON',
      'settings.export_json_desc': 'Sauvegarder toutes les langues',
      'settings.import_json': 'Importer JSON',
      'settings.import_json_desc': 'Fusionner une sauvegarde',
      'settings.export_tsv': 'Export Anki / TSV',
      'settings.export_tsv_desc': 'Exporter la liste affichée',
      'settings.export_apkg': 'Export Anki (.apkg)',
      'settings.export_apkg_desc': 'Paquet officiel Anki',
      'settings.export_obsidian': 'Export Obsidian',
      'settings.export_obsidian_desc': 'Fichiers .md avec liens wiki',
      'settings.sync_obsidian': 'Sync directe Obsidian',
      'settings.sync_obsidian_desc': 'Écriture directe dans le Vault',
      'settings.share_deck_url': 'Créer une URL partagée',
      'settings.share_deck_url_desc': 'Partager un paquet par lien',
      'settings.starter_pack': 'Packs de démarrage',
      'settings.starter_pack_desc': 'Importer des listes académiques',
      'settings.anki_import': 'Import Anki',
      'settings.anki_import_desc': 'Importer depuis APKG/TSV',
      'settings.salvage_all': 'Récupération intégrale',
      'settings.salvage_all_desc': 'Restaurer depuis les instantanés',
      'settings.fsrs_title': 'Optimiseur FSRS personnalisé (Personalized FSRS)',
      'settings.fsrs_badge': 'FSRS-4.5 optimisé',
      'settings.fsrs_desc': 'Ajuste dynamiquement les coefficients d\'oubli individuels en minimisant l\'erreur quadratique moyenne (MSE).',
      'settings.fsrs_manual_opt': 'Optimisation manuelle des poids FSRS',
      'settings.fsrs_manual_opt_desc': 'Recalcule la vitesse d\'oubli sur les 500 derniers journaux de révision.',
      'settings.fsrs_opt_now': 'Optimiser maintenant',
      'settings.fsrs_reset_weights': 'Réinitialiser aux valeurs par défaut',
      'settings.notify_title': 'Rappels push intelligents au seuil d\'oubli',
      'settings.notify_badge': 'Veille intelligente',
      'settings.notify_heading': 'Alerte automatique juste avant le seuil de 90%',
      'settings.notify_desc': 'Vous alerte automatiquement lorsque la rétention prédictive passe sous 90%.',
      'settings.notify_enable': 'Activé',
      'settings.notify_perm_heading': 'Autorisation des notifications navigateur',
      'settings.notify_perm_desc': 'Notifications bureau et mobile via l\'API Web Notification',
      'settings.notify_perm_btn': 'Autoriser les notifications',
      'settings.cap_title': 'Limite de révision & redistribution du retard (FSRS-4.5)',
      'settings.cap_badge': 'Optimisé',
      'settings.cap_heading': 'Plafond quotidien de révision',
      'settings.cap_desc': 'Limite le volume journalier pour prévenir la surcharge cognitive.',
      'settings.cap_opt_20': '20 mots (Détendu)',
      'settings.cap_opt_30': '30 mots (Recommandé)',
      'settings.cap_opt_50': '50 mots (Intensif)',
      'settings.cap_opt_unlimited': 'Illimité (Tout)',
      'settings.snooze_heading': 'Redistribution fluide des cartes en retard (Snooze)',
      'settings.snooze_desc': 'Répartit uniformément les révisions en retard sur les 7 prochains jours.',
      'settings.snooze_btn': 'Redistribuer le retard',
      'settings.diagnostics_heading': 'Diagnostic d\'intégrité & Auto-réparation de la base',
      'settings.diagnostics_desc': 'Détecte et répare les doublons, dates corrompues et tombstones obsolètes.',
      'settings.diagnostics_btn': 'Lancer le diagnostic & réparer',
      'settings.sovereignty_title': 'Souveraineté des données & Garantie de gratuité à vie',
      'settings.sovereignty_desc': 'Même en résiliant le forfait Pro, l\'intégralité de vos mots enregistrés, le système Anki SRS et les fonctions d\'export restent gratuits à vie. Votre patrimoine intellectuel ne sera jamais verrouillé.',
      'settings.dev_title': 'Mode Maître Développeur',
      'settings.dev_desc': 'Débloque tous les quotas et restrictions pour les développeurs et administrateurs.',
      'settings.dev_btn': 'Basculer les autorisations',
      'settings.clear_lang_title': 'Supprimer toutes les données de la langue actuelle',
      'settings.clear_lang_desc_pre': 'Supprime définitivement les mots pour la langue (',
      'settings.clear_lang_desc_post': ') (action irréversible).',
      'settings.clear_lang_btn': 'Tout supprimer',
      'settings.delete_acct_title': 'Supprimer définitivement le compte',
      'settings.delete_acct_desc': 'Efface de manière irréversible toutes les données cloud, l\'historique et le profil.',
      'settings.delete_acct_btn': 'Supprimer compte & données',
      'settings.close_btn': 'Fermer les paramètres',
      'toolbar.wordbook': 'Vocabulaire',
      'toolbar.swap_lang': 'Intervertir les langues (⇄)',
      'toolbar.storage_status': 'État du stockage',
      'toolbar.ai_quota_prefix': 'IA restante: ',
      'toolbar.cloud_ai_active': 'IA intégrée: Active (Privée)',
      'addbar.fol_ph': 'Catégorie / Domaine (facultatif)',
      'addbar.word_ph': 'Saisissez un mot ou une expression (virgule ou retour à la ligne pour l\'ajout par lot)',
      'addbar.hist_lbl': 'Histoire',
      'addbar.hist_title': 'Contexte historique, institutionnel et conceptuel approfondi',
      'addbar.wikt_lbl': 'Wikt',
      'addbar.wikt_title': 'Recoupement avec l\'étymologie et l\'API de Wiktionary',
      'addbar.submit': 'Ajouter',
      'addbar.opts_title': 'Développer les options & catégories',
      'feedback.banner_notice': 'Annonce',
      'feedback.banner_text': 'Donnez votre avis sur l\'apprentissage étymologique (bénéficiez d\'un an de Pro offert).',
      'feedback.participate': 'Participer',
      'feedback.close': 'Fermer',
      'list.all_words': 'Tous les mots',
      'list.audio_loop': 'Boucle audio',
      'list.audio_loop_title': 'Lecture audio en continu des mots affichés (L)',
      'list.academic': 'Académique',
      'list.academic_title': 'Étymologie complète, histoire conceptuelle et représentations clés',
      'list.simple': 'Simple',
      'list.simple_title': 'Vue épurée avec définitions et exemples',
      'side.lang_pairs': 'Paires de langues',
      'side.status_filter': 'Statut & Révision',
      'side.field_filter': 'Catégorie & Domaine',
      'side.pos_filter': 'Partie du discours (POS)',
      'side.cat_filter': 'Catégories',
      'side.feedback': 'Commentaires',
      'side.settings': 'Paramètres',
      'side.xlang_btn': 'Trans-linguistique',
      'side.xlang_title': 'Rechercher parmi toutes les paires linguistiques',
      'side.reset_btn': 'Réinitialiser',
      'cat.philosophy': 'Philosophie & Pensée',
      'cat.psychology': 'Psychologie & Esprit',
      'cat.science': 'Sciences & Technologies',
      'cat.politics': 'Politique & Droit',
      'cat.business': 'Économie & Affaires',
      'cat.arts': 'Littérature & Arts',
      'cat.daily': 'Quotidien & Général',
      'cat.general': 'Général',
      'cat.logic': 'Logique & Débat',
      'cat.exam': 'Examens & Certifications',
      'upsell.title': 'Dépassez la mémorisation mécanique avec Vocab Vault Pro',
      'upsell.subtitle': 'Accédez à l\'étymologie générative illimitée, la synchronisation temps réel et l\'optimisation FSRS.',
      'upsell.feat_ai': 'Génération IA illimitée et histoire conceptuelle approfondie',
      'upsell.feat_cache': 'Accès illimité au cache partagé et aux 2 000 mots académiques',
      'upsell.feat_sync': 'Synchronisation différentielle cloud multi-appareils',
      'upsell.feat_ocr': 'Extraction illimitée de textes et OCR appareil photo',
      'upsell.feat_analytics': 'Optimiseur de rétention personnalisé FSRS-4.5',
      'upsell.save_badge': 'Économisez 17% avec la facturation annuelle !',
      'upsell.upgrade_now': 'Commencer le Forfait Pro',
      'upsell.skip': 'Peut-être plus tard',
      'toast.saved': 'Enregistré avec succès',
      'toast.sync_success': 'Synchronisation cloud terminée',
      'toast.unlocked': 'Compétence acquise et ajoutée au vocabulaire',
      'toast.eiken_all_unlocked': 'Toutes les compétences de cette racine acquises'
    },

    de: {
      // Allgemein & Navigation
      'app.title': 'Vocab Vault',
      'app.tagline': 'Indogermanische Etymologie und Begriffsgeschichte für intellektuelle Lerner',
      'nav.explore': 'Erkunden',
      'nav.list': 'Liste',
      'nav.extract': 'Extrahieren',
      'nav.review': 'Wiederholen',
      'nav.analytics': 'Analysen',
      'nav.mask': 'Maske',
      'side.explorer': 'Explorer & Suche',
      'nav.all_words': 'Alle Wörter',
      'nav.anki': 'Anki-Wiederholung',
      'nav.graph': 'Wurzelnetzwerk',
      'nav.settings': 'Einstellungen',
      'nav.add_word': 'Wort hinzufügen',
      'nav.search_ph': 'Suche: Wort, Bedeutung, *Wurzel, #Wortart, @Kategorie...',
      'nav.sync_cloud': 'Cloud-Sync',
      'nav.syncing': 'Synchronisierung...',
      'nav.synced': 'Synchronisiert',
      'nav.offline': 'Offline',
      'nav.ear_learning': 'Audio-Schleife',
      'nav.ear_learning_title': 'Wörter und Beispielsätze automatisch im Hintergrund abspielen (L)',
      'nav.mode_academic': 'Akademisch',
      'nav.mode_simple': 'Einfach',
      'nav.sort_new': 'Sortierung: Neueste',
      'nav.sort_old': 'Sortierung: Älteste (#1~)',
      'nav.sort_due': 'Sortierung: Fällig zur Wiederholung',
      'nav.sort_alpha': 'Sortierung: Alphabetisch',

      // Anki-Wiederholung
      'anki.recog': 'Erkennung',
      'anki.cloze': 'Produktion (Lückentext)',
      'anki.recog_title': 'Bedeutung anhand des Wortes abrufen (M)',
      'anki.cloze_title': 'Wort aus dem Kontext ergänzen (M)',
      'anki.undo': 'Rückgängig (Z)',
      'anki.show_ans': 'Antwort anzeigen (Leertaste)',
      'anki.again': 'Nochmal (1)',
      'anki.hard': 'Schwer (2)',
      'anki.good': 'Gut (3)',
      'anki.easy': 'Einfach (4)',
      'anki.offline_badge': 'Nicht synchronisierte Wiederholungen',
      'anki.context_title': 'Begegnungskontext (Episodisches Gedächtnis)',
      'anki.swipe_left': '← Nach links wischen: Nochmal',
      'anki.swipe_right': 'Nach rechts wischen: Gut →',
      'anki.empty_title': 'Alle heutigen Wiederholungen sind abgeschlossen!',
      'anki.empty_desc': 'Fügen Sie neue Wörter hinzu oder installieren Sie ein Starterpaket, um Ihr Wurzelnetzwerk zu erweitern.',

      // Graph-Ansicht
      'graph.title': 'Etymologisches Wurzelnetzwerk',
      'graph.tab_network': 'Netzwerk',
      'graph.tab_tree': 'Stammbaum',
      'graph.tab_mindmap': 'Mindmap',
      'graph.tab_matrix': 'Präfix x Wurzel',
      'graph.eiken_btn': 'Wurzelkatalog',
      'graph.watering_btn': 'Gezielte Wiederholung',
      'graph.mask_btn_off': 'Maske: AUS',
      'graph.mask_btn_on': 'Maske: AN',
      'graph.cluster_btn': 'Nur Cluster',
      'graph.color_btn': 'Farbe nach Sprache',
      'graph.physics_stop': 'Pause',
      'graph.physics_run': 'Aktiv',
      'graph.fit_btn': 'Ansicht anpassen',
      'graph.save_img': 'PNG exportieren',
      'graph.filter_ph': 'Nach Wurzel oder Wort filtern...',
      'graph.all_lang': 'Alle Sprachen',
      'graph.en_only': 'Nur Englisch',
      'graph.fr_only': 'Nur Französisch',
      'graph.de_only': 'Nur Deutsch',
      'graph.ja_only': 'Nur Japanisch',
      'graph.root_jump_default': 'Zur Wurzel springen...',
      'graph.all_roots': 'Verzeichnis aller Wurzeln',
      'graph.unlock_eiken': 'Alle Zweige erlernen',

      // Einstellungen & Pläne
      'settings.title': 'Einstellungen & Konto',
      'settings.modal_title': 'Einstellungen, Cloud-Synchronisierung & Daten',
      'settings.tab_general': 'Allgemein & Anzeige',
      'settings.tab_account': 'Konto & Synchronisierung',
      'settings.tab_plans': 'Pläne & Abrechnung',
      'settings.tab_ai': 'KI & Gedächtnis',
      'settings.tab_storage': 'Datenverwaltung',
      'settings.lang_heading': 'Oberflächensprache',
      'settings.lang_desc': 'Wählen Sie die Anzeigesprache für Menüs und Bedienelemente.',
      'settings.theme_heading': 'Anzeige- & Audioeinstellungen',
      'settings.theme_dark': 'Dunkelmodus',
      'settings.theme_light': 'Hellmodus',
      'settings.auto_speak': 'Automatische Aussprache bei Wiederholung',
      'settings.auto_speak_title': 'Wort im Anki-Modus automatisch aussprechen',
      'settings.tts_rate_title': 'Sprechgeschwindigkeit',
      'settings.tts_rate_slow': 'Tempo: 0.85x (Langsam)',
      'settings.tts_rate_natural': 'Tempo: 0.95x (Natürlich)',
      'settings.tts_rate_fast': 'Tempo: 1.05x (Schnell)',
      'settings.onboarding_title': 'Einführung & Bedienungsanleitung',
      'settings.onboarding_badge': 'Jederzeit verfügbar',
      'settings.onboarding_desc': 'Entdecken Sie die Grundlagen des etymologischen Lernens, den FSRS-4.5-Algorithmus und die Ansichtsmodi.',
      'settings.onboarding_btn': 'Einführungstour öffnen',
      'settings.pwa_title': 'Als eigenständige App öffnen (ohne Browserrahmen)',
      'settings.pwa_badge': 'App-fähig',
      'settings.pwa_desc': 'Nutzen Sie die App in einem separaten Fenster ohne URL-Leiste auf Mac, Windows und Mobilgeräten.',
      'settings.pwa_install_btn': 'App installieren (Eigenständig)',
      'settings.pwa_guide_btn': 'Installationsanleitung je Betriebssystem',
      'settings.pwa_mac_note': '*Auf dem Mac können Sie die App direkt per Doppelklick auf "Vocab Vault.app" in diesem Ordner starten.',
      'settings.account_title': 'Kontoverwaltung & Cloud-Synchronisierung',
      'settings.not_logged_in': 'Nicht angemeldet',
      'settings.logged_in': 'Angemeldet',
      'settings.email_ph': 'E-Mail-Adresse',
      'settings.pass_ph': 'Passwort (mindestens 6 Zeichen)',
      'settings.login_btn': 'Anmelden',
      'settings.signup_btn': 'Registrieren',
      'settings.agree_terms': 'Nutzungsbedingungen',
      'settings.agree_and': ' und ',
      'settings.agree_privacy': 'Datenschutzerklärung',
      'settings.agree_suffix': '',
      'settings.supabase_selfhost_title': 'Erweitert: Eigener Supabase-Server (Self-Hosted)',
      'settings.supabase_url_ph': 'Supabase URL (https://xxx.supabase.co)',
      'settings.supabase_anon_ph': 'Supabase Anon Public Key',
      'settings.supabase_selfhost_desc': '*Normalerweise nicht erforderlich. Automatische SSL-Verbindung zum offiziellen Server.',
      'settings.sync_now_btn': 'Jetzt synchronisieren',
      'settings.logout_btn': 'Abmelden',
      'settings.quota_desc': '*Kostenlose Konten können 5 KI-Wörter pro Tag generieren (unbegrenzter Shared Cache). Multi-Device-Sync ist im Pro-Plan (3,99 $/Monat) enthalten.',
      'settings.plan_heading': 'Abonnements & Pläne (Stripe)',
      'settings.free_plan': 'Kostenloser Plan',
      'settings.pro_plan': 'Pro-Plan',
      'settings.current_plan': 'Aktueller Plan',
      'settings.recommended': 'Empfohlen',
      'settings.plan_monthly': 'Monatlich',
      'settings.plan_annual': 'Jährlich (17% sparen / 2 Monate gratis)',
      'settings.price_free': '0 $/Monat',
      'settings.price_pro_monthly': '3,99 $/Monat',
      'settings.price_pro_annual': '39,00 $/Jahr (3,25 $/Monat)',
      'settings.free_feat1': 'Bis zu 5 neue KI-Wortgenerierungen pro Tag',
      'settings.free_feat2': 'Unbegrenzter Zugriff auf geteilten Wörterbuch-Cache',
      'settings.free_feat3': 'Lokale Speicherung auf 1 Gerät mit JSON-Backup',
      'settings.free_feat4': 'SM-2/FSRS Spaced Repetition und Wischgesten',
      'settings.pro_feat1': 'Unbegrenzte KI-Generierung & vertiefte Begriffsgeschichte',
      'settings.pro_feat2': 'Unbegrenzte Textextraktion & Kamera-OCR',
      'settings.pro_feat3': 'Echtzeit-Cloud-Diff-Sync für mehrere Geräte',
      'settings.pro_feat4': 'Prioritäts-Support',
      'settings.legal_notice_title': '[Gesetzliche Hinweise zu Verlängerung und Kündigung]',
      'settings.legal_notice_1': '• Automatische Verlängerung zu 3,99 $/Monat oder 39,00 $/Jahr',
      'settings.legal_notice_2': '• Jederzeit vor Verlängerung in den Einstellungen oder im Stripe-Portal kündbar',
      'settings.legal_notice_3': '• Pro-Funktionen bleiben nach Kündigung bis zum Periodenende aktiv',
      'settings.upgrade_btn': 'Auf Pro upgraden',
      'settings.portal_btn': 'Rechnungen & Abo verwalten (Stripe-Portal)',
      'settings.stripe_secure_note': '*Sichere Zahlungen über die SSL-Verschlüsselung von Stripe.',
      'settings.link_terms': 'Bedingungen',
      'settings.link_privacy': 'Datenschutz',
      'settings.link_tokusho': 'Impressum',
      'settings.metrics_title': 'KI-Generierungs- & Token-Ersparnismetriken',
      'settings.metrics_badge_cache': 'Hocheffizienter Cache aktiv',
      'settings.metric_total_words': 'Gesamte Generierungsanfragen',
      'settings.metric_cache_rate': 'Cache-Trefferquote',
      'settings.metric_tokens_saved': 'Geschätzte Token-Ersparnis',
      'settings.metric_daily_quota': 'Tägliches KI-Restkontingent',
      'settings.metrics_desc': '*Aus dem Shared Cache geladene Wörter verbrauchen keine API-Tokens und laden sofort ohne Wartezeit (0 ms).',
      'settings.ai_engine_title': 'KI-Engine & Datenschutz',
      'settings.ai_engine_badge': 'Eingebettete KI aktiv (Voller Datenschutz)',
      'settings.ai_engine_desc': 'Diese App verfügt über eine TLS/SSL-verschlüsselte integrierte KI. Ihre Privatsphäre bleibt geschützt.',
      'settings.byok_title': 'Erweitert: Eigener Gemini-API-Schlüssel (BYOK: Direktes HTTPS)',
      'settings.byok_ph': 'AIzaSy... (Normalerweise nicht erforderlich)',
      'settings.byok_show': 'Anzeigen',
      'settings.byok_save': 'Speichern & Prüfen',
      'settings.byok_session_only': 'Beim Schließen des Browsers löschen (nur sessionStorage)',
      'settings.byok_desc': '*Nur erforderlich, wenn Sie Ihren eigenen Google AI Studio Schlüssel verwenden möchten. Der Schlüssel verbleibt lokal in Ihrem Browser.',
      'settings.byok_model_lbl': 'KI-Modell:',
      'settings.byok_model_auto': 'Automatisch (Optimal je Modus)',
      'settings.byok_reload': 'Neu laden',
      'settings.storage_title': 'IndexedDB-Hauptspeicher hoher Kapazität',
      'settings.storage_badge': 'Speicher normal',
      'settings.export_json': 'JSON exportieren',
      'settings.export_json_desc': 'Alle Sprachdaten sichern',
      'settings.import_json': 'JSON importieren',
      'settings.import_json_desc': 'Backup zusammenführen',
      'settings.export_tsv': 'Anki / TSV Export',
      'settings.export_tsv_desc': 'Aktuelle Liste exportieren',
      'settings.export_apkg': 'Anki (.apkg) Export',
      'settings.export_apkg_desc': 'Offizielles Anki-Paket',
      'settings.export_obsidian': 'Obsidian Export',
      'settings.export_obsidian_desc': '.md-Dateien mit Wiki-Links',
      'settings.sync_obsidian': 'Direkter Obsidian-Sync',
      'settings.sync_obsidian_desc': 'Direkt ins Vault-Verzeichnis schreiben',
      'settings.share_deck_url': 'Geteilte Deck-URL erstellen',
      'settings.share_deck_url_desc': 'Deck per Link mit Freunden teilen',
      'settings.starter_pack': 'Starterpakete',
      'settings.starter_pack_desc': 'Akademische Wortlisten laden',
      'settings.anki_import': 'Anki-Import',
      'settings.anki_import_desc': 'Aus APKG/TSV importieren',
      'settings.salvage_all': 'Vollständige Rettung',
      'settings.salvage_all_desc': 'Aus Snapshots wiederherstellen',
      'settings.fsrs_title': 'Personalisierter FSRS-Gewichtsoptimierer (Personalized FSRS)',
      'settings.fsrs_badge': 'FSRS-4.5 optimiert',
      'settings.fsrs_desc': 'Passt individuelle Vergessenskurven dynamisch an, um den mittleren quadratischen Vorhersagefehler (MSE) zu minimieren.',
      'settings.fsrs_manual_opt': 'FSRS-Gewichte manuell optimieren',
      'settings.fsrs_manual_opt_desc': 'Berechnet die Vergessensrate anhand der letzten 500 Wiederholungsprotokolle neu.',
      'settings.fsrs_opt_now': 'Jetzt optimieren',
      'settings.fsrs_reset_weights': 'Auf Standardwerte zurücksetzen',
      'settings.notify_title': 'Intelligente Push-Erinnerungen an der Vergessensgrenze',
      'settings.notify_badge': 'Intelligenter Bereitschaftsmodus',
      'settings.notify_heading': 'Automatische Erinnerung kurz vor 90% Behaltenswahrscheinlichkeit',
      'settings.notify_desc': 'Erinnert Sie rechtzeitig, bevor das Erinnerungsniveau unter 90% sinkt.',
      'settings.notify_enable': 'Aktiviert',
      'settings.notify_perm_heading': 'Berechtigung für Browser-Benachrichtigungen',
      'settings.notify_perm_desc': 'Desktop- und Mobilbenachrichtigungen über die Web Notification API',
      'settings.notify_perm_btn': 'Benachrichtigungen erlauben',
      'settings.cap_title': 'Wiederholungslimit & Entzerrung fälliger Karten (FSRS-4.5)',
      'settings.cap_badge': 'Optimiert',
      'settings.cap_heading': 'Tägliches maximales Wiederholungslimit',
      'settings.cap_desc': 'Begrenzt das tägliche Pensum, um Überlastung zu vermeiden.',
      'settings.cap_opt_20': '20 Wörter (Entspannt)',
      'settings.cap_opt_30': '30 Wörter (Empfohlen)',
      'settings.cap_opt_50': '50 Wörter (Intensiv)',
      'settings.cap_opt_unlimited': 'Unbegrenzt (Alle)',
      'settings.snooze_heading': 'Sanfte Entzerrung überfälliger Karten (Snooze)',
      'settings.snooze_desc': 'Verteilt überfällige Karten gleichmäßig über die nächsten 7 Tage.',
      'settings.snooze_btn': 'Gleichmäßig verteilen',
      'settings.diagnostics_heading': 'Datenbankintegrität & Selbstreparatur (Self-Healing)',
      'settings.diagnostics_desc': 'Erkennt und repariert Duplikate, fehlerhafte Daten und veraltete Tombstones.',
      'settings.diagnostics_btn': 'Diagnose & Reparatur starten',
      'settings.sovereignty_title': 'Datensouveränität & Lebenslange Kostenlos-Garantie',
      'settings.sovereignty_desc': 'Auch nach Kündigung des Pro-Abonnements bleiben alle Ihre Wörter, die Anki SRS-Funktion und Exportmöglichkeiten dauerhaft kostenlos. Ihre Lerninhalte werden niemals gesperrt.',
      'settings.dev_title': 'Entwickler-Master-Modus',
      'settings.dev_desc': 'Hebt alle Kontingente und Begrenzungen für Entwickler und Administratoren auf.',
      'settings.dev_btn': 'Berechtigungen umschalten',
      'settings.clear_lang_title': 'Alle Daten der aktuellen Sprache löschen',
      'settings.clear_lang_desc_pre': 'Löscht unwiderruflich alle Wörter der Sprache (',
      'settings.clear_lang_desc_post': ') (kann nicht rückgängig gemacht werden).',
      'settings.clear_lang_btn': 'Alles löschen',
      'settings.delete_acct_title': 'Konto dauerhaft löschen',
      'settings.delete_acct_desc': 'Löscht unwiderruflich alle Cloud-Daten, den Verlauf und das Kontoprofil.',
      'settings.delete_acct_btn': 'Konto & Daten löschen',
      'settings.close_btn': 'Einstellungen schließen',
      'toolbar.wordbook': 'Wortschatz',
      'toolbar.swap_lang': 'Sprachen tauschen (⇄)',
      'toolbar.storage_status': 'Speicherstatus',
      'toolbar.ai_quota_prefix': 'Verbleibende KI: ',
      'toolbar.cloud_ai_active': 'Eingebettete KI: Aktiv (Geschützt)',
      'addbar.fol_ph': 'Kategorie / Fachgebiet (optional)',
      'addbar.word_ph': 'Wort oder Phrase eingeben (Komma oder Zeilenumbruch für Stapel)',
      'addbar.hist_lbl': 'Geschichte',
      'addbar.hist_title': 'Vertiefte historische, institutionelle und begriffliche Hintergründe',
      'addbar.wikt_lbl': 'Wikt',
      'addbar.wikt_title': 'Gegenprüfung mit Wiktionary-Etymologie und Lautschrift',
      'addbar.submit': 'Hinzufügen',
      'addbar.opts_title': 'Optionen & Kategorien einblenden',
      'feedback.banner_notice': 'Hinweis',
      'feedback.banner_text': 'Geben Sie Feedback zum etymologischen Lernen (1 Jahr Pro kostenlos).',
      'feedback.participate': 'Teilnehmen',
      'feedback.close': 'Schließen',
      'list.all_words': 'Alle Wörter',
      'list.audio_loop': 'Audio-Schleife',
      'list.audio_loop_title': 'Kontinuierliche Audiowiedergabe der Wörter (L)',
      'list.academic': 'Akademisch',
      'list.academic_title': 'Vollständige Etymologie, Begriffsgeschichte und Kernbilder',
      'list.simple': 'Einfach',
      'list.simple_title': 'Schlanke Ansicht mit Bedeutungen und Beispielen',
      'side.lang_pairs': 'Sprachpaare',
      'side.status_filter': 'Status & Wiederholung',
      'side.field_filter': 'Kategorie & Fachgebiet',
      'side.pos_filter': 'Wortart (POS)',
      'side.cat_filter': 'Kategorien',
      'side.feedback': 'Feedback',
      'side.settings': 'Einstellungen',
      'side.xlang_btn': 'Sprachübergreifend',
      'side.xlang_title': 'Über alle Sprachpaare hinweg suchen',
      'side.reset_btn': 'Zurücksetzen',
      'cat.philosophy': 'Philosophie & Geistesleben',
      'cat.psychology': 'Psychologie & Geist',
      'cat.science': 'Wissenschaft & Technik',
      'cat.politics': 'Politik & Recht',
      'cat.business': 'Wirtschaft & Finanzen',
      'cat.arts': 'Literatur & Kunst',
      'cat.daily': 'Alltag & Allgemeines',
      'cat.general': 'Allgemein',
      'cat.logic': 'Logik & Debatte',
      'cat.exam': 'Prüfungsvorbereitung',
      'upsell.title': 'Überwinden Sie mechanisches Auswendiglernen mit Vocab Vault Pro',
      'upsell.subtitle': 'Nutzen Sie unbegrenzte generative Etymologie, Echtzeit-Synchronisation und adaptive FSRS-Wiederholung.',
      'upsell.feat_ai': 'Unbegrenzte KI-Begriffsgeschichte & Etymologie',
      'upsell.feat_cache': 'Unbegrenzter Zugriff auf geteilten Cache & 2.000 akademische Wörter',
      'upsell.feat_sync': 'Echtzeit-Cloud-Diff-Sync für mehrere Geräte',
      'upsell.feat_ocr': 'Unbegrenzte Textextraktion & Kamera-OCR',
      'upsell.feat_analytics': 'Personalisierter FSRS-4.5 Retentionsoptimierer',
      'upsell.save_badge': '17% sparen mit jährlicher Abrechnung!',
      'upsell.upgrade_now': 'Pro-Plan starten',
      'upsell.skip': 'Vielleicht später',
      'toast.saved': 'Erfolgreich gespeichert',
      'toast.sync_success': 'Cloud-Synchronisierung abgeschlossen',
      'toast.unlocked': 'Fähigkeit gemeistert und zum Wortschatz hinzugefügt',
      'toast.eiken_all_unlocked': 'Alle Zweigfähigkeiten dieser Wurzel gemeistert'
    },

    es: {
      // Común y Navegación
      'app.title': 'Vocab Vault',
      'app.tagline': 'Etimología indoeuropea e historia conceptual para mentes intelectuales',
      'nav.explore': 'Explorar',
      'nav.list': 'Lista',
      'nav.extract': 'Extraer',
      'nav.review': 'Repasar',
      'nav.analytics': 'Analítica',
      'nav.mask': 'Máscara',
      'side.explorer': 'Explorador y Búsqueda',
      'nav.all_words': 'Todas las palabras',
      'nav.anki': 'Repaso Anki',
      'nav.graph': 'Red de raíces',
      'nav.settings': 'Ajustes',
      'nav.add_word': 'Añadir palabra',
      'nav.search_ph': 'Buscar: palabra, significado, *raíz, #categoría, @área...',
      'nav.sync_cloud': 'Sync en la nube',
      'nav.syncing': 'Sincronizando...',
      'nav.synced': 'Sincronizado',
      'nav.offline': 'Sin conexión',
      'nav.ear_learning': 'Bucle de audio',
      'nav.ear_learning_title': 'Reproducción continua automática en segundo plano (L)',
      'nav.mode_academic': 'Académico',
      'nav.mode_simple': 'Simple',
      'nav.sort_new': 'Orden: Más recientes',
      'nav.sort_old': 'Orden: Más antiguos (#1~)',
      'nav.sort_due': 'Orden: Pendientes de repaso',
      'nav.sort_alpha': 'Orden: Alfabético',

      // Repaso Anki
      'anki.recog': 'Reconocimiento',
      'anki.cloze': 'Producción (Texto con huecos)',
      'anki.recog_title': 'Recordar significado a partir de la palabra (M)',
      'anki.cloze_title': 'Completar la palabra en el contexto (M)',
      'anki.undo': 'Deshacer (Z)',
      'anki.show_ans': 'Mostrar respuesta (Espacio)',
      'anki.again': 'Otra vez (1)',
      'anki.hard': 'Difícil (2)',
      'anki.good': 'Bien (3)',
      'anki.easy': 'Fácil (4)',
      'anki.offline_badge': 'Repasos pendientes de sincronizar',
      'anki.context_title': 'Contexto encontrado (Memoria episódica)',
      'anki.swipe_left': '← Deslizar a la izquierda: Otra vez',
      'anki.swipe_right': 'Deslizar a la derecha: Bien →',
      'anki.empty_title': '¡Todos los repasos de hoy están completados!',
      'anki.empty_desc': 'Añada nuevas palabras o instale un paquete inicial para ampliar su red de raíces.',

      // Vista de Red
      'graph.title': 'Red de raíces etimológicas',
      'graph.tab_network': 'Red',
      'graph.tab_tree': 'Árbol genealógico',
      'graph.tab_mindmap': 'Mapa mental',
      'graph.tab_matrix': 'Prefijo x Raíz',
      'graph.eiken_btn': 'Catálogo de raíces',
      'graph.watering_btn': 'Repaso específico',
      'graph.mask_btn_off': 'Máscara: DESACTIVADA',
      'graph.mask_btn_on': 'Máscara: ACTIVADA',
      'graph.cluster_btn': 'Solo agrupaciones',
      'graph.color_btn': 'Color por idioma',
      'graph.physics_stop': 'Pausar',
      'graph.physics_run': 'Activo',
      'graph.fit_btn': 'Ajustar vista',
      'graph.save_img': 'Exportar PNG',
      'graph.filter_ph': 'Filtrar por raíz o palabra...',
      'graph.all_lang': 'Todos los idiomas',
      'graph.en_only': 'Solo inglés',
      'graph.fr_only': 'Solo francés',
      'graph.de_only': 'Solo alemán',
      'graph.ja_only': 'Solo japonés',
      'graph.root_jump_default': 'Ir a la raíz...',
      'graph.all_roots': 'Directorio de todas las raíces',
      'graph.unlock_eiken': 'Aprender todas las ramas',

      // Ajustes y Planes
      'settings.title': 'Ajustes y Cuenta',
      'settings.modal_title': 'Ajustes, Sincronización en la Nube y Datos',
      'settings.tab_general': 'General y Pantalla',
      'settings.tab_account': 'Cuenta y Sincronización',
      'settings.tab_plans': 'Planes y Facturación',
      'settings.tab_ai': 'IA y Retención',
      'settings.tab_storage': 'Gestión de datos',
      'settings.lang_heading': 'Idioma de la interfaz',
      'settings.lang_desc': 'Seleccione el idioma para los menús y controles de la interfaz.',
      'settings.theme_heading': 'Ajustes de pantalla y audio',
      'settings.theme_dark': 'Modo oscuro',
      'settings.theme_light': 'Modo claro',
      'settings.auto_speak': 'Pronunciación automática al repasar',
      'settings.auto_speak_title': 'Pronunciar automáticamente la palabra en modo Anki',
      'settings.tts_rate_title': 'Velocidad de voz',
      'settings.tts_rate_slow': 'Velocidad: 0.85x (Lenta)',
      'settings.tts_rate_natural': 'Velocidad: 0.95x (Natural)',
      'settings.tts_rate_fast': 'Velocidad: 1.05x (Rápida)',
      'settings.onboarding_title': 'Guía de inicio y recorrido',
      'settings.onboarding_badge': 'Disponible en todo momento',
      'settings.onboarding_desc': 'Revise los fundamentos del aprendizaje por raíces, el algoritmo FSRS-4.5 y los modos de visualización.',
      'settings.onboarding_btn': 'Abrir recorrido guiado',
      'settings.pwa_title': 'Abrir como aplicación independiente (sin marco de navegador)',
      'settings.pwa_badge': 'Compatible como app',
      'settings.pwa_desc': 'Utilice la aplicación en una ventana dedicada sin barra de URL en Mac, Windows y móvil.',
      'settings.pwa_install_btn': 'Instalar aplicación (Independiente)',
      'settings.pwa_guide_btn': 'Guía de instalación por SO',
      'settings.pwa_mac_note': '*En Mac, puede iniciar la app directamente haciendo doble clic en "Vocab Vault.app" en esta carpeta.',
      'settings.account_title': 'Gestión de cuenta y sincronización en la nube',
      'settings.not_logged_in': 'No identificado',
      'settings.logged_in': 'Identificado',
      'settings.email_ph': 'Correo electrónico',
      'settings.pass_ph': 'Contraseña (mínimo 6 caracteres)',
      'settings.login_btn': 'Iniciar sesión',
      'settings.signup_btn': 'Registrarse',
      'settings.agree_terms': 'Términos de servicio',
      'settings.agree_and': ' y ',
      'settings.agree_privacy': 'Política de privacidad',
      'settings.agree_suffix': '',
      'settings.supabase_selfhost_title': 'Avanzado: Servidor Supabase personalizado (Auto-alojado)',
      'settings.supabase_url_ph': 'Supabase URL (https://xxx.supabase.co)',
      'settings.supabase_anon_ph': 'Clave pública anon de Supabase',
      'settings.supabase_selfhost_desc': '*Normalmente no se requiere. Conexión cifrada SSL automática con el servidor oficial.',
      'settings.sync_now_btn': 'Sincronizar ahora',
      'settings.logout_btn': 'Cerrar sesión',
      'settings.quota_desc': '*Las cuentas gratuitas pueden generar 5 palabras IA al día (caché compartida ilimitada). La sincronización multidispositivo está incluida en el plan Pro (3,99 $/mes).',
      'settings.plan_heading': 'Suscripciones y Planes (Stripe)',
      'settings.free_plan': 'Plan Gratuito',
      'settings.pro_plan': 'Plan Pro',
      'settings.current_plan': 'Plan actual',
      'settings.recommended': 'Recomendado',
      'settings.plan_monthly': 'Mensual',
      'settings.plan_annual': 'Anual (Ahorre 17% / 2 meses gratis)',
      'settings.price_free': '0 $/mes',
      'settings.price_pro_monthly': '3,99 $/mes',
      'settings.price_pro_annual': '39,00 $/año (3,25 $/mes)',
      'settings.free_feat1': 'Hasta 5 nuevas generaciones IA por día',
      'settings.free_feat2': 'Acceso ilimitado a la caché compartida',
      'settings.free_feat3': 'Almacenamiento local en 1 dispositivo con respaldo JSON',
      'settings.free_feat4': 'Repaso espaciado SM-2/FSRS e interfaz táctil',
      'settings.pro_feat1': 'Generación IA ilimitada e historia conceptual profunda',
      'settings.pro_feat2': 'Extracción ilimitada de textos y OCR con cámara',
      'settings.pro_feat3': 'Sincronización diferencial en la nube en tiempo real',
      'settings.pro_feat4': 'Soporte prioritario',
      'settings.legal_notice_title': '[Información legal sobre renovación y cancelación]',
      'settings.legal_notice_1': '• Renovación automática a 3,99 $/mes o 39,00 $/año',
      'settings.legal_notice_2': '• Cancele en cualquier momento antes de la renovación desde Ajustes o Portal de Stripe',
      'settings.legal_notice_3': '• Las funciones Pro permanecen activas hasta el fin del periodo tras cancelar',
      'settings.upgrade_btn': 'Mejorar a Plan Pro',
      'settings.portal_btn': 'Gestión de facturación (Portal Stripe)',
      'settings.stripe_secure_note': '*Pagos procesados de forma segura mediante cifrado SSL de Stripe.',
      'settings.link_terms': 'Términos',
      'settings.link_privacy': 'Privacidad',
      'settings.link_tokusho': 'Aviso legal',
      'settings.metrics_title': 'Métricas de generación IA y ahorro de tokens',
      'settings.metrics_badge_cache': 'Caché de alta eficiencia activa',
      'settings.metric_total_words': 'Peticiones de generación',
      'settings.metric_cache_rate': 'Tasa de acierto de caché',
      'settings.metric_tokens_saved': 'Tokens ahorrados estimados',
      'settings.metric_daily_quota': 'Cupo diario restante de IA',
      'settings.metrics_desc': '*Las palabras recuperadas de la caché compartida no consumen tokens y se registran al instante (0 ms).',
      'settings.ai_engine_title': 'Motor de IA y protección de la privacidad',
      'settings.ai_engine_badge': 'IA integrada activa (Privacidad total)',
      'settings.ai_engine_desc': 'Esta aplicación integra un motor de IA cifrado TLS/SSL. Sus datos personales y claves permanecen totalmente protegidos.',
      'settings.byok_title': 'Avanzado: Clave API personalizada de Gemini (BYOK: HTTPS directo)',
      'settings.byok_ph': 'AIzaSy... (Normalmente no se requiere)',
      'settings.byok_show': 'Mostrar',
      'settings.byok_save': 'Guardar y verificar',
      'settings.byok_session_only': 'Borrar al cerrar el navegador (solo sessionStorage)',
      'settings.byok_desc': '*Configure esto solo si desea usar su propia clave de Google AI Studio. La clave se almacena exclusivamente en su navegador local.',
      'settings.byok_model_lbl': 'Modelo de IA:',
      'settings.byok_model_auto': 'Automático (Óptimo según modo)',
      'settings.byok_reload': 'Actualizar',
      'settings.storage_title': 'Almacenamiento principal IndexedDB de alta capacidad',
      'settings.storage_badge': 'Almacenamiento normal',
      'settings.export_json': 'Guardar JSON',
      'settings.export_json_desc': 'Respaldar todos los idiomas',
      'settings.import_json': 'Restaurar JSON',
      'settings.import_json_desc': 'Fusionar copia de seguridad',
      'settings.export_tsv': 'Exportar Anki / TSV',
      'settings.export_tsv_desc': 'Exportar la lista mostrada',
      'settings.export_apkg': 'Exportar Anki (.apkg)',
      'settings.export_apkg_desc': 'Paquete oficial de Anki',
      'settings.export_obsidian': 'Exportar Obsidian',
      'settings.export_obsidian_desc': 'Archivos .md con enlaces wiki',
      'settings.sync_obsidian': 'Sync directo con Obsidian',
      'settings.sync_obsidian_desc': 'Escritura directa en la carpeta Vault',
      'settings.share_deck_url': 'Crear URL de mazo compartido',
      'settings.share_deck_url_desc': 'Compartir mazo por enlace',
      'settings.starter_pack': 'Paquetes iniciales',
      'settings.starter_pack_desc': 'Instalar selecciones académicas',
      'settings.anki_import': 'Importar Anki',
      'settings.anki_import_desc': 'Importar desde APKG/TSV',
      'settings.salvage_all': 'Rescate integral',
      'settings.salvage_all_desc': 'Restaurar desde instantáneas',
      'settings.fsrs_title': 'Optimizador de pesos FSRS personalizado (Personalized FSRS)',
      'settings.fsrs_badge': 'FSRS-4.5 optimizado',
      'settings.fsrs_desc': 'Ajusta dinámicamente los coeficientes de olvido individuales minimizando el error cuadrático medio (MSE).',
      'settings.fsrs_manual_opt': 'Optimización manual de pesos FSRS',
      'settings.fsrs_manual_opt_desc': 'Recalcula la velocidad de olvido con los últimos 500 registros de repaso.',
      'settings.fsrs_opt_now': 'Optimizar ahora',
      'settings.fsrs_reset_weights': 'Restablecer a valores iniciales',
      'settings.notify_title': 'Notificaciones push inteligentes en el umbral de olvido',
      'settings.notify_badge': 'Modo inteligente activo',
      'settings.notify_heading': 'Aviso automático justo antes del 90% de retención',
      'settings.notify_desc': 'Le notifica automáticamente antes de que la probabilidad de recuerdo baje del 90%.',
      'settings.notify_enable': 'Activado',
      'settings.notify_perm_heading': 'Permiso de notificaciones del navegador',
      'settings.notify_perm_desc': 'Notificaciones en escritorio y móvil mediante la Web Notification API',
      'settings.notify_perm_btn': 'Permitir notificaciones',
      'settings.cap_title': 'Límite de repaso y redistribución de tarjetas acumuladas (FSRS-4.5)',
      'settings.cap_badge': 'Optimizado',
      'settings.cap_heading': 'Límite máximo diario de repaso',
      'settings.cap_desc': 'Limita el volumen diario para prevenir la saturación cognitiva.',
      'settings.cap_opt_20': '20 palabras (Relajado)',
      'settings.cap_opt_30': '30 palabras (Recomendado)',
      'settings.cap_opt_50': '50 palabras (Intensivo)',
      'settings.cap_opt_unlimited': 'Ilimitado (Todo)',
      'settings.snooze_heading': 'Redistribución suave de repasos atrasados (Snooze)',
      'settings.snooze_desc': 'Distribuye uniformemente las tarjetas vencidas en los próximos 7 días.',
      'settings.snooze_btn': 'Redistribuir de forma uniforme',
      'settings.diagnostics_heading': 'Diagnóstico de integridad y autorreparación (Self-Healing)',
      'settings.diagnostics_desc': 'Detecta y repara duplicados, fechas erróneas y lápidas obsoletas.',
      'settings.diagnostics_btn': 'Ejecutar diagnóstico y reparación',
      'settings.sovereignty_title': 'Soberanía de datos y garantía gratuita de por vida',
      'settings.sovereignty_desc': 'Incluso tras cancelar la suscripción Pro, todas sus palabras, el sistema Anki SRS y las funciones de exportación siguen siendo gratuitas para siempre. Sus activos de aprendizaje nunca serán bloqueados.',
      'settings.dev_title': 'Modo Maestro Desarrollador',
      'settings.dev_desc': 'Desbloquea todos los límites de cuota y facturación para uso administrativo y desarrollo.',
      'settings.dev_btn': 'Cambiar permisos',
      'settings.clear_lang_title': 'Eliminar todos los datos del idioma actual',
      'settings.clear_lang_desc_pre': 'Elimina permanentemente las palabras del idioma (',
      'settings.clear_lang_desc_post': ') (no se puede deshacer).',
      'settings.clear_lang_btn': 'Eliminar todo',
      'settings.delete_acct_title': 'Eliminar cuenta permanentemente',
      'settings.delete_acct_desc': 'Borra de forma irreversible todos los datos en la nube, el historial y el perfil.',
      'settings.delete_acct_btn': 'Eliminar cuenta y datos',
      'settings.close_btn': 'Cerrar ajustes',
      'toolbar.wordbook': 'Vocabulario',
      'toolbar.swap_lang': 'Intercambiar idiomas (⇄)',
      'toolbar.storage_status': 'Estado de almacenamiento',
      'toolbar.ai_quota_prefix': 'IA restante: ',
      'toolbar.cloud_ai_active': 'IA integrada: Activa (Privada)',
      'addbar.fol_ph': 'Categoría / Área (opcional)',
      'addbar.word_ph': 'Escriba una palabra o frase (coma o salto de línea para añadir por lote)',
      'addbar.hist_lbl': 'Historia',
      'addbar.hist_title': 'Contexto histórico, institucional y conceptual profundo',
      'addbar.wikt_lbl': 'Wikt',
      'addbar.wikt_title': 'Cotejo con etimología y pronunciación de Wiktionary',
      'addbar.submit': 'Añadir',
      'addbar.opts_title': 'Desplegar opciones y categorías',
      'feedback.banner_notice': 'Aviso',
      'feedback.banner_text': 'Comparta su opinión sobre el aprendizaje etimológico (reciba 1 año de Pro gratis).',
      'feedback.participate': 'Participar',
      'feedback.close': 'Cerrar',
      'list.all_words': 'Todas las palabras',
      'list.audio_loop': 'Bucle de audio',
      'list.audio_loop_title': 'Reproducción continua de audio de las palabras mostradas (L)',
      'list.academic': 'Académico',
      'list.academic_title': 'Etimología completa, historia conceptual e imágenes esenciales',
      'list.simple': 'Simple',
      'list.simple_title': 'Vista limpia con significados y ejemplos',
      'side.lang_pairs': 'Pares de idiomas',
      'side.status_filter': 'Filtro de estado y repaso',
      'side.field_filter': 'Categoría y Área',
      'side.pos_filter': 'Categoría gramatical (POS)',
      'side.cat_filter': 'Categorías',
      'side.feedback': 'Comentarios',
      'side.settings': 'Ajustes',
      'side.xlang_btn': 'Inter-idiomas',
      'side.xlang_title': 'Buscar en todos los pares de idiomas',
      'side.reset_btn': 'Restablecer',
      'cat.philosophy': 'Filosofía y Pensamiento',
      'cat.psychology': 'Psicología y Mente',
      'cat.science': 'Ciencia y Tecnología',
      'cat.politics': 'Política y Derecho',
      'cat.business': 'Economía y Negocios',
      'cat.arts': 'Literatura y Artes',
      'cat.daily': 'Cotidiano y General',
      'cat.general': 'General',
      'cat.logic': 'Logic & Debate',
      'cat.exam': 'Exam Preparation',
      'upsell.title': 'Supere la memorización mecánica con Vocab Vault Pro',
      'upsell.subtitle': 'Desbloquee etimología generativa ilimitada, sincronización en tiempo real y optimización FSRS.',
      'upsell.feat_ai': 'Historia conceptual profunda y etimología IA ilimitadas',
      'upsell.feat_cache': 'Acceso ilimitado a la caché compartida y a 2.000 palabras académicas',
      'upsell.feat_sync': 'Sincronización diferencial en la nube para múltiples dispositivos',
      'upsell.feat_ocr': 'Extracción ilimitada de textos y OCR con cámara',
      'upsell.feat_analytics': 'Optimizador de retención adaptativo FSRS-4.5',
      'upsell.save_badge': '¡Ahorre un 17% con facturación anual!',
      'upsell.upgrade_now': 'Comenzar Plan Pro',
      'upsell.skip': 'Quizás más tarde',
      'toast.saved': 'Guardado con éxito',
      'toast.sync_success': 'Sincronización con la nube completada',
      'toast.unlocked': 'Habilidad aprendida y añadida al vocabulario',
      'toast.eiken_all_unlocked': 'Todas las habilidades de esta raíz aprendidas'
    },
    it: {
      'app.title': 'Vocab Vault',
      'app.tagline': 'Vocabolario etimologico e storia dei concetti per studiosi ed esploratori',
      'nav.explore': 'Esplora',
      'nav.list': 'Elenco',
      'nav.extract': 'Estrai',
      'nav.review': 'Ripasso',
      'nav.analytics': 'Analisi',
      'nav.mask': 'Maschera',
      'side.explorer': 'Esplora e Cerca',
      'nav.all_words': 'Tutte le parole',
      'nav.anki': 'Ripasso Anki',
      'nav.graph': 'Albero Etimologico',
      'nav.settings': 'Impostazioni',
      'nav.add_word': 'Aggiungi parola',
      'nav.search_ph': 'Cerca: parola, significato, *radice, #pos, @cat...',
      'nav.sync_cloud': 'Sincronizza Cloud',
      'nav.mode_academic': 'Accademico',
      'nav.mode_simple': 'Semplice',
      'anki.recog': 'Riconoscimento',
      'anki.cloze': 'Produzione (Cloze)',
      'anki.show_ans': 'Mostra risposta (Space)',
      'anki.again': 'Di nuovo (1)',
      'anki.hard': 'Difficile (2)',
      'anki.good': 'Bene (3)',
      'anki.easy': 'Facile (4)',
      'graph.title': 'Albero Genealogico ed Etimologico',
      'graph.tab_network': 'Rete',
      'graph.tab_tree': 'Albero Genealogico',
      'graph.tab_mindmap': 'Mappa Mentale',
      'graph.tab_matrix': 'Prefisso × Radice',
      'settings.title': 'Impostazioni e Account',
      'settings.modal_title': 'Impostazioni, Sincronizzazione Cloud e Dati',
      'settings.tab_general': 'Generale',
      'settings.tab_account': 'Account e Sync',
      'settings.tab_plans': 'Piani e Prezzi',
      'settings.tab_ai': 'IA e Memoria',
      'settings.tab_storage': 'Dati e Backup',
      'settings.lang_heading': 'Lingua dell\'interfaccia (Language)',
      'settings.lang_desc': 'Seleziona la lingua di visualizzazione dei menu:',
      'settings.theme_heading': 'Aspetto e Voce',
      'settings.theme_dark': 'Modalità scura',
      'settings.auto_speak': 'Pronuncia automatica nel ripasso',
      'settings.close_btn': 'Chiudi impostazioni',
      'toolbar.wordbook': 'Vocabolario',
      'addbar.submit': 'Aggiungi',
      'list.all_words': 'Tutte le parole',
      'side.lang_pairs': 'Coppie di lingue',
      'side.settings': 'Impostazioni',
      'cat.philosophy': 'Filosofia e Pensiero',
      'cat.psychology': 'Psicologia e Mente',
      'cat.science': 'Scienza e Tecnologia',
      'cat.politics': 'Politica e Diritto',
      'cat.business': 'Economia e Affari',
      'cat.arts': 'Letteratura e Arti',
      'cat.daily': 'Quotidiano e Generale',
      'cat.general': 'Generale',
      'cat.logic': 'Logica e Dibattito',
      'cat.exam': 'Preparazione Esami'
    },
    pt: {
      'app.title': 'Vocab Vault',
      'app.tagline': 'Cofre de vocabulário etimológico e história conceitual',
      'nav.explore': 'Explorar',
      'nav.list': 'Lista',
      'nav.extract': 'Extrair',
      'nav.review': 'Revisão',
      'nav.analytics': 'Análise',
      'nav.mask': 'Máscara',
      'side.explorer': 'Explorador e Busca',
      'nav.all_words': 'Todas as palavras',
      'nav.anki': 'Revisão Anki',
      'nav.graph': 'Árvore Etimológica',
      'nav.settings': 'Configurações',
      'nav.add_word': 'Adicionar palavra',
      'nav.search_ph': 'Buscar: palavra, sentido, *raiz, #pos, @cat...',
      'nav.sync_cloud': 'Sincronizar Nuvem',
      'nav.mode_academic': 'Acadêmico',
      'nav.mode_simple': 'Simples',
      'anki.recog': 'Reconhecimento',
      'anki.cloze': 'Produção (Cloze)',
      'anki.show_ans': 'Mostrar resposta (Space)',
      'anki.again': 'Novamente (1)',
      'anki.hard': 'Difícil (2)',
      'anki.good': 'Bom (3)',
      'anki.easy': 'Fácil (4)',
      'graph.title': 'Árvore Genealógica e Etimológica',
      'graph.tab_network': 'Rede',
      'graph.tab_tree': 'Árvore Genealógica',
      'graph.tab_mindmap': 'Mapa Mental',
      'graph.tab_matrix': 'Prefixo × Raiz',
      'settings.title': 'Configurações e Conta',
      'settings.modal_title': 'Configurações, Sincronização na Nuvem e Dados',
      'settings.tab_general': 'Geral',
      'settings.tab_account': 'Conta e Sync',
      'settings.tab_plans': 'Planos e Preços',
      'settings.tab_ai': 'IA e Memória',
      'settings.tab_storage': 'Dados e Backup',
      'settings.lang_heading': 'Idioma da Interface (Language)',
      'settings.lang_desc': 'Selecione o idioma de exibição dos menus:',
      'settings.theme_heading': 'Aparência e Voz',
      'settings.theme_dark': 'Modo escuro',
      'settings.auto_speak': 'Pronúncia automática na revisão',
      'settings.close_btn': 'Fechar configurações',
      'toolbar.wordbook': 'Vocabulário',
      'addbar.submit': 'Adicionar',
      'list.all_words': 'Todas as palavras',
      'side.lang_pairs': 'Pares de idiomas',
      'side.settings': 'Configurações',
      'cat.philosophy': 'Filosofia e Pensamento',
      'cat.psychology': 'Psicologia e Mente',
      'cat.science': 'Ciência e Tecnologia',
      'cat.politics': 'Política e Direito',
      'cat.business': 'Economia e Negócios',
      'cat.arts': 'Literatura e Artes',
      'cat.daily': 'Cotidiano e Geral',
      'cat.general': 'Geral',
      'cat.logic': 'Lógica e Debate',
      'cat.exam': 'Preparação para Exames'
    },
    nl: {
      'app.title': 'Vocab Vault',
      'app.tagline': 'Etymologische woordenschat en begripsgeschiedenis',
      'nav.explore': 'Verkennen',
      'nav.list': 'Lijst',
      'nav.extract': 'Extractie',
      'nav.review': 'Herhalen',
      'nav.analytics': 'Analyse',
      'nav.mask': 'Masker',
      'side.explorer': 'Verkennen & Zoeken',
      'nav.all_words': 'Alle woorden',
      'nav.anki': 'Anki Herhaling',
      'nav.graph': 'Etymologische Boom',
      'nav.settings': 'Instellingen',
      'nav.add_word': 'Woord toevoegen',
      'nav.search_ph': 'Zoek: woord, betekenis, *wortel, #pos, @cat...',
      'nav.sync_cloud': 'Cloud Sync',
      'nav.mode_academic': 'Academisch',
      'nav.mode_simple': 'Eenvoudig',
      'anki.recog': 'Herkenning',
      'anki.cloze': 'Productie (Cloze)',
      'anki.show_ans': 'Toon antwoord (Space)',
      'anki.again': 'Opnieuw (1)',
      'anki.hard': 'Moeilijk (2)',
      'anki.good': 'Goed (3)',
      'anki.easy': 'Makkelijk (4)',
      'graph.title': 'Etymologische Stamboom & Netwerk',
      'graph.tab_network': 'Netwerk',
      'graph.tab_tree': 'Stamboom',
      'graph.tab_mindmap': 'Mindmap',
      'graph.tab_matrix': 'Voorvoegsel × Wortel',
      'settings.title': 'Instellingen & Account',
      'settings.modal_title': 'Instellingen, Cloudsynchronisatie & Gegevens',
      'settings.tab_general': 'Algemeen',
      'settings.tab_account': 'Account & Sync',
      'settings.tab_plans': 'Abonnementen',
      'settings.tab_ai': 'AI & Geheugen',
      'settings.tab_storage': 'Gegevensbeheer',
      'settings.lang_heading': 'Weergavetaal (Language)',
      'settings.lang_desc': 'Selecteer de taal voor menu\'s en interface:',
      'settings.theme_heading': 'Weergave & Spraak',
      'settings.theme_dark': 'Donkere modus',
      'settings.auto_speak': 'Automatisch uitspreken bij herhaling',
      'settings.close_btn': 'Instellingen sluiten',
      'toolbar.wordbook': 'Woordenboek',
      'addbar.submit': 'Toevoegen',
      'list.all_words': 'Alle woorden',
      'side.lang_pairs': 'Taalparen',
      'side.settings': 'Instellingen',
      'cat.philosophy': 'Filosofie & Denken',
      'cat.psychology': 'Psychologie & Geest',
      'cat.science': 'Wetenschap & Technologie',
      'cat.politics': 'Politiek & Recht',
      'cat.business': 'Economie & Zaken',
      'cat.arts': 'Literatuur & Kunst',
      'cat.daily': 'Dagelijks & Algemeen',
      'cat.general': 'Algemeen'
    },
    zh: {
      'app.title': 'Vocab Vault',
      'app.tagline': '以词源学与概念史深耕记忆的学术级词汇宝库',
      'nav.explore': '探索',
      'nav.list': '列表',
      'nav.extract': '提取',
      'nav.review': '复习',
      'nav.analytics': '分析',
      'nav.mask': '遮罩',
      'side.explorer': '导航与搜索',
      'nav.all_words': '全部词汇',
      'nav.anki': 'Anki 复习',
      'nav.graph': '词根谱系树',
      'nav.settings': '设置',
      'nav.add_word': '添加词汇',
      'nav.search_ph': '搜索: 词汇, 释义, *词根/字源, #词性, @分类...',
      'nav.sync_cloud': '云端同步',
      'nav.mode_academic': '学术详尽',
      'nav.mode_simple': '精简模式',
      'anki.recog': '认读模式',
      'anki.cloze': '产出填空 (Cloze)',
      'anki.show_ans': '显示答案 (Space)',
      'anki.again': '重来 (1)',
      'anki.hard': '困难 (2)',
      'anki.good': '掌握 (3)',
      'anki.easy': '轻松 (4)',
      'graph.title': '印欧词根与汉字字源网络',
      'graph.tab_network': '星系网络',
      'graph.tab_tree': '谱系树',
      'graph.tab_mindmap': '思维导图',
      'graph.tab_matrix': '前缀 × 词根',
      'settings.title': '设置与账户',
      'settings.modal_title': '设置・云端同步・数据管理',
      'settings.tab_general': '常规与显示',
      'settings.tab_account': '账户与同步',
      'settings.tab_plans': '订阅方案',
      'settings.tab_ai': 'AI 与记忆算法',
      'settings.tab_storage': '数据管理',
      'settings.lang_heading': '界面语言 (Display Language)',
      'settings.lang_desc': '选择界面与菜单的显示语言:',
      'settings.theme_heading': '外观与语音设置',
      'settings.theme_dark': '深色模式',
      'settings.auto_speak': '复习时自动发音',
      'settings.close_btn': '关闭设置',
      'toolbar.wordbook': '词汇本',
      'addbar.submit': '添加',
      'list.all_words': '全部词汇',
      'side.lang_pairs': '学习语言对',
      'side.settings': '设置',
      'cat.philosophy': '哲学与思想',
      'cat.psychology': '心理与精神',
      'cat.science': '科学与技术',
      'cat.politics': '政治与法律',
      'cat.business': '经济与商业',
      'cat.arts': '文学与艺术',
      'cat.daily': '日常与综合',
      'cat.general': '综合',
      'cat.logic': '逻辑与辩论',
      'cat.exam': '考试认证'
    },
    ko: {
      'app.title': 'Vocab Vault',
      'app.tagline': '어원학과 개념사로 깊이 각인하는 학술 어휘 아카이브',
      'nav.explore': '탐색',
      'nav.list': '목록',
      'nav.extract': '추출',
      'nav.review': '복습',
      'nav.analytics': '분석',
      'nav.mask': '가림막',
      'side.explorer': '탐색 및 검색',
      'nav.all_words': '모든 단어',
      'nav.anki': 'Anki 복습',
      'nav.graph': '어근 계통수',
      'nav.settings': '설정',
      'nav.add_word': '단어 추가',
      'nav.search_ph': '검색: 단어, 의미, *어근/자원, #품사, @분류...',
      'nav.sync_cloud': '클라우드 동기화',
      'nav.mode_academic': '학술 상세',
      'nav.mode_simple': '심플 모드',
      'anki.recog': '인식 모드',
      'anki.cloze': '산출 빈칸 (Cloze)',
      'anki.show_ans': '정답 보기 (Space)',
      'anki.again': '다시 (1)',
      'anki.hard': '어려움 (2)',
      'anki.good': '기억함 (3)',
      'anki.easy': '쉬움 (4)',
      'graph.title': '인도유럽 어근 및 한자 자원 네트워크',
      'graph.tab_network': '네트워크',
      'graph.tab_tree': '계통수 트리',
      'graph.tab_mindmap': '마인드맵',
      'graph.tab_matrix': '접두사 × 어근',
      'settings.title': '설정 및 계정',
      'settings.modal_title': '설정・클라우드 동기화・데이터 관리',
      'settings.tab_general': '일반 및 표시',
      'settings.tab_account': '계정 및 동기화',
      'settings.tab_plans': '요금제 및 결제',
      'settings.tab_ai': 'AI 및 망각곡선',
      'settings.tab_storage': '데이터 관리',
      'settings.lang_heading': '표시 언어 (Display Language)',
      'settings.lang_desc': 'UI 및 메뉴 표시 언어를 선택합니다:',
      'settings.theme_heading': '화면 및 음성 설정',
      'settings.theme_dark': '다크 모드',
      'settings.auto_speak': '복습 시 자동 발음',
      'settings.close_btn': '설정 닫기',
      'toolbar.wordbook': '단어장',
      'addbar.submit': '등록',
      'list.all_words': '모든 단어',
      'side.lang_pairs': '언어 쌍',
      'side.settings': '설정',
      'cat.philosophy': '철학 및 사상',
      'cat.psychology': '심리 및 정신',
      'cat.science': '과학 및 기술',
      'cat.politics': '정치 및 법학',
      'cat.business': '경제 및 비즈니스',
      'cat.arts': '문학 및 예술',
      'cat.daily': '일상 및 일반',
      'cat.general': '일반',
      'cat.logic': '논리 및 토론',
      'cat.exam': '시험 및 검정'
    }
  };

  /**
   * カテゴリ多言語マッピング辞書
   */
  const CATEGORY_MAP = {
    '哲学・思想': 'cat.philosophy',
    '哲学・宗教': 'cat.philosophy',
    '心理・精神': 'cat.psychology',
    '心理学・精神': 'cat.psychology',
    '科学・技術': 'cat.science',
    '科学・テクノロジー': 'cat.science',
    '政治・法学': 'cat.politics',
    '政治・国際関係': 'cat.politics',
    '実務・経済': 'cat.business',
    '経済・ビジネス': 'cat.business',
    '文学・芸術': 'cat.arts',
    '日常・一般': 'cat.daily',
    '一般・その他': 'cat.general',
    '論理・討論': 'cat.logic',
    '論理・政策': 'cat.logic',
    '論理・環境': 'cat.logic',
    '論理・科学': 'cat.logic',
    '英検準1級': 'cat.exam'
  };

  const CATEGORY_PART_MAP = {
    '哲学': 'Philosophy',
    '思想': 'Thought',
    '宗教': 'Religion',
    '心理': 'Psychology',
    '精神': 'Psychiatry',
    '科学': 'Science',
    '技術': 'Technology',
    '政治': 'Politics',
    '法学': 'Law',
    '法律': 'Law',
    '司法': 'Judiciary',
    '実務': 'Practice',
    '経済': 'Economy',
    'ビジネス': 'Business',
    '文学': 'Literature',
    '芸術': 'Arts',
    '日常': 'Daily',
    '一般': 'General',
    '論理': 'Logic',
    '討論': 'Debate',
    '政策': 'Policy',
    '環境': 'Environment',
    '歴史': 'History',
    '文化': 'Culture',
    '社会': 'Society',
    '医療': 'Medicine',
    '健康': 'Health',
    '教育': 'Education',
    '言語': 'Language',
    '認知': 'Cognition',
    '認識': 'Epistemology',
    '制度': 'Institutions',
    '財務': 'Finance',
    '会計': 'Accounting',
    '監査': 'Audit',
    '契約': 'Contract',
    '人権': 'Human Rights'
  };

  /**
   * 初期ロケールの決定
   */
  function detectInitialLocale() {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED_LOCALES.includes(saved)) return saved;
    }
    if (typeof navigator !== 'undefined') {
      const navLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
      if (navLang.startsWith('ja')) return 'ja';
      if (navLang.startsWith('fr')) return 'fr';
      if (navLang.startsWith('de')) return 'de';
      if (navLang.startsWith('es')) return 'es';
      if (navLang.startsWith('it')) return 'it';
      if (navLang.startsWith('pt')) return 'pt';
      if (navLang.startsWith('nl')) return 'nl';
      if (navLang.startsWith('zh')) return 'zh';
      if (navLang.startsWith('ko')) return 'ko';
    }
    return 'en'; // デフォルトは世界展開を見据えて英語
  }

  let currentLocale = detectInitialLocale();

  /**
   * 翻訳文字列の取得
   */
  function t(key, fallback = '', targetLocale = null) {
    const loc = (targetLocale && SUPPORTED_LOCALES.includes(targetLocale)) ? targetLocale : currentLocale;
    const dict = TRANSLATIONS[loc] || TRANSLATIONS.en;
    if (dict && dict[key]) return dict[key];
    const fallbackDict = TRANSLATIONS.en;
    if (fallbackDict && fallbackDict[key]) return fallbackDict[key];
    return fallback || key;
  }

  /**
   * ロケール切り替え
   */
  function setLocale(newLocale) {
    if (!SUPPORTED_LOCALES.includes(newLocale)) return;
    currentLocale = newLocale;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newLocale);
    }
    applyI18nToDOM();
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('vocab-locale-changed', { detail: { locale: newLocale } }));
      } catch (e) {}
    }
  }

  /**
   * 現在のロケール取得
   */
  function getLocale() {
    return currentLocale;
  }

  /**
   * カテゴリ文字列の多言語翻訳（複合カテゴリの自動分解・他言語フォールバック対応）
   */
  function translateCategory(rawCat, targetLocale = null) {
    if (!rawCat) return t('cat.general', 'General', targetLocale);
    const loc = (targetLocale && SUPPORTED_LOCALES.includes(targetLocale)) ? targetLocale : currentLocale;
    if (loc === 'ja') return rawCat;

    const key = CATEGORY_MAP[rawCat];
    if (key) {
      const translated = t(key, '', loc);
      if (translated && translated !== key) return translated;
    }

    // 複合カテゴリの分解翻訳 (例: '論理・討論' -> 'Logic & Debate')
    if (rawCat.includes('・')) {
      const parts = rawCat.split('・').map(p => CATEGORY_PART_MAP[p.trim()] || p.trim());
      if (parts.length > 0 && !/[\u3040-\u30ff]/.test(parts.join(''))) {
        return parts.join(' & ');
      }
    } else if (CATEGORY_PART_MAP[rawCat]) {
      return CATEGORY_PART_MAP[rawCat];
    }

    // 目標言語が非日本語の場合、未翻訳の日本語文字列の露出を防止
    if (/[\u3040-\u30ff]/.test(rawCat)) {
      return t('cat.general', 'General', loc);
    }
    return rawCat;
  }

  let currentBillingInterval = 'month';

  /**
   * 課金サイクルの取得
   */
  function getBillingInterval() {
    return currentBillingInterval;
  }

  /**
   * 課金サイクルの設定とUI連動
   */
  function setBillingInterval(interval) {
    currentBillingInterval = interval === 'year' ? 'year' : 'month';
    updatePricingUI();
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('vocab-billing-interval-changed', {
          detail: { interval: currentBillingInterval }
        }));
      } catch (e) {}
    }
  }

  /**
   * 通貨表示フォーマッタ
   */
  function getPlanPriceInfo(interval = currentBillingInterval) {
    const isEn = currentLocale !== 'ja';
    const isYear = interval === 'year';
    if (isEn) {
      return {
        currency: 'usd',
        symbol: '$',
        priceMonthly: '$3.99',
        priceAnnual: '$39.00',
        priceAnnualPerMonth: '$3.25',
        intervalText: isYear ? '/ yr' : '/ mo',
        currentDisplay: isYear ? '$39.00' : '$3.99',
        perMonthDisplay: isYear ? '$3.25/mo' : '$3.99/mo',
        saveText: 'Save 17% (2 Months Free)'
      };
    } else {
      return {
        currency: 'jpy',
        symbol: '¥',
        priceMonthly: '¥480',
        priceAnnual: '¥4,800',
        priceAnnualPerMonth: '¥400',
        intervalText: isYear ? '/ 年' : '/ 月',
        currentDisplay: isYear ? '¥4,800' : '¥480',
        perMonthDisplay: isYear ? '月換算 ¥400' : '¥480/月',
        saveText: '年払いで2ヶ月分無料'
      };
    }
  }

  /**
   * 価格表示UIの同期
   */
  function updatePricingUI() {
    if (typeof document === 'undefined') return;

    const isYear = currentBillingInterval === 'year';
    const isEn = currentLocale !== 'ja';
    const p = getPlanPriceInfo(currentBillingInterval);

    // 1. Settings モーダルのタブ切り替え
    const setMonthBtn = document.getElementById('settingsBillingMonthlyBtn');
    const setYearBtn = document.getElementById('settingsBillingAnnualBtn');
    if (setMonthBtn && setYearBtn) {
      setMonthBtn.className = isYear ? 'btn-xs btn-o' : 'btn-xs active';
      setYearBtn.className = isYear ? 'btn-xs active' : 'btn-xs btn-o';
    }

    // 2. Upsell モーダルのタブ切り替え
    const upMonthBtn = document.getElementById('upsellBillingMonthlyBtn');
    const upYearBtn = document.getElementById('upsellBillingAnnualBtn');
    if (upMonthBtn && upYearBtn) {
      upMonthBtn.className = isYear ? 'btn-xs btn-o' : 'btn-xs active';
      upYearBtn.className = isYear ? 'btn-xs active' : 'btn-xs btn-o';
    }

    // 3. Settings Pro価格テキスト
    const setProPrice = document.getElementById('settingsProPriceText');
    if (setProPrice) {
      if (isEn) {
        setProPrice.innerHTML = isYear
          ? '$39.00 <small>/ yr ($3.25/mo, 2 months free)</small>'
          : '$3.99 <small>/ mo ($39.00/yr)</small>';
      } else {
        setProPrice.innerHTML = isYear
          ? '¥4,800 <small>/ 年 (月換算 ¥400・2ヶ月無料)</small>'
          : '¥480 <small>/ 月 (年額 ¥4,800)</small>';
      }
    }

    // 4. Settings Proアップグレードボタン
    const btnUpgradePro = document.getElementById('btnUpgradePro');
    if (btnUpgradePro && !btnUpgradePro.disabled) {
      if (isEn) {
        btnUpgradePro.textContent = isYear
          ? 'Upgrade to Pro ($39.00 / yr)'
          : 'Upgrade to Pro ($3.99 / mo)';
      } else {
        btnUpgradePro.textContent = isYear
          ? 'Proにアップグレード (¥4,800/年)'
          : 'Proにアップグレード (¥480/月)';
      }
    }

    // 5. Upsell モーダル価格表示
    const upsellPriceText = document.getElementById('upsellPriceText');
    if (upsellPriceText) {
      if (isEn) {
        upsellPriceText.innerHTML = isYear
          ? '$39.00 <span style="font-size:13px;font-weight:normal;color:var(--s)">/ yr ($3.25/mo)</span>'
          : '$3.99 <span style="font-size:13px;font-weight:normal;color:var(--s)">/ mo</span>';
      } else {
        upsellPriceText.innerHTML = isYear
          ? '¥4,800 <span style="font-size:13px;font-weight:normal;color:var(--s)">/ 年 (税込・月換算¥400)</span>'
          : '¥480 <span style="font-size:13px;font-weight:normal;color:var(--s)">/ 月 (税込)</span>';
      }
    }

    // 6. Upsell モーダルボタン
    const btnUpsellUpgrade = document.getElementById('btnUpsellUpgrade');
    if (btnUpsellUpgrade && !btnUpsellUpgrade.disabled) {
      if (isEn) {
        btnUpsellUpgrade.textContent = isYear
          ? 'Start Vocab Vault Pro ($39.00 / yr)'
          : 'Start Vocab Vault Pro ($3.99 / mo)';
      } else {
        btnUpsellUpgrade.textContent = isYear
          ? '今すぐProプランで始める (¥4,800/年)'
          : '今すぐProプランで始める (¥480/月)';
      }
    }
  }

  /**
   * 設定モーダルの網羅的翻訳パス（動的ノード・フォールバック対応）
   */
  function translateSettingsModal(isEn) {
    if (typeof document === 'undefined') return;

    // 1. モーダルタイトル
    const titleEl = document.getElementById('cfgModalTitle');
    if (titleEl) titleEl.textContent = t('settings.modal_title');

    // 2. 言語セレクタ & バッジ同期
    const uiLanguageSel = document.getElementById('uiLanguageSel');
    if (uiLanguageSel && uiLanguageSel.value !== currentLocale) {
      uiLanguageSel.value = currentLocale;
    }
    const uiLangBadge = document.getElementById('uiLangBadge');
    if (uiLangBadge) {
      const badgeNames = {
        en: 'Global (EN)',
        ja: '日本語 (JA)',
        fr: 'Français (FR)',
        de: 'Deutsch (DE)',
        es: 'Español (ES)',
        it: 'Italiano (IT)',
        pt: 'Português (PT)',
        nl: 'Nederlands (NL)',
        zh: '中文 (ZH)',
        ko: '한국어 (KO)'
      };
      uiLangBadge.textContent = badgeNames[currentLocale] || 'Global';
    }

    // 3. 音声設定チェックボックス
    const chkAutoSpeak = document.getElementById('chkAutoSpeak');
    if (chkAutoSpeak && chkAutoSpeak.parentElement && chkAutoSpeak.parentElement.childNodes) {
      try {
        const parent = chkAutoSpeak.parentElement;
        const nodes = Array.from(parent.childNodes || []);
        const textNode = nodes.find(n => n && (n.nodeType === 3 || (typeof Node !== 'undefined' && n.nodeType === Node.TEXT_NODE)));
        if (textNode) {
          textNode.nodeValue = t('settings.auto_speak');
        }
      } catch (e) {}
    }

    // 4. 音声速度セレクタ
    const ttsRateSel = document.getElementById('ttsRateSel');
    if (ttsRateSel && ttsRateSel.options) {
      try {
        Array.from(ttsRateSel.options).forEach(opt => {
          if (!opt) return;
          if (opt.value === '0.85') opt.textContent = t('settings.tts_rate_slow');
          else if (opt.value === '0.95') opt.textContent = t('settings.tts_rate_natural');
          else if (opt.value === '1.05') opt.textContent = t('settings.tts_rate_fast');
        });
      } catch (e) {}
    }

    // 5. アカウント認証フォームプレースホルダー & ボタン
    const sbEmailInput = document.getElementById('sbEmailInput');
    if (sbEmailInput) sbEmailInput.placeholder = t('settings.email_ph');
    const sbPassInput = document.getElementById('sbPassInput');
    if (sbPassInput) sbPassInput.placeholder = t('settings.pass_ph');
    const sbUrlInput = document.getElementById('sbUrlInput');
    if (sbUrlInput) sbUrlInput.placeholder = t('settings.supabase_url_ph');
    const sbAnonInput = document.getElementById('sbAnonInput');
    if (sbAnonInput) sbAnonInput.placeholder = t('settings.supabase_anon_ph');

    const sbAuthFormRow = document.getElementById('sbAuthFormRow');
    if (sbAuthFormRow && sbAuthFormRow.querySelectorAll) {
      try {
        const btns = sbAuthFormRow.querySelectorAll('button');
        if (btns && btns.length >= 2) {
          if (btns[0]) btns[0].textContent = t('settings.login_btn');
          if (btns[1]) btns[1].textContent = t('settings.signup_btn');
        }
      } catch (e) {}
    }

    // 6. バッジ類
    const sbStatusBadge = document.getElementById('sbStatusBadge');
    if (sbStatusBadge && sbStatusBadge.textContent && sbStatusBadge.textContent.includes('ログイン')) {
      sbStatusBadge.textContent = t('settings.not_logged_in');
    }
    const curPlanBadge = document.getElementById('curPlanBadge');
    if (curPlanBadge) {
      const cur = curPlanBadge.textContent || '';
      if (cur.includes('Free') || cur.includes('フリー') || cur.includes('Gratuit') || cur.includes('Kostenlos') || cur.includes('Gratuito')) {
        curPlanBadge.textContent = t('settings.free_plan');
      } else if (cur.includes('Pro')) {
        curPlanBadge.textContent = t('settings.pro_plan');
      }
    }
    const pwaStatusBadge = document.getElementById('pwaStatusBadge');
    if (pwaStatusBadge) pwaStatusBadge.textContent = t('settings.pwa_badge');
    const metricsEfficiencyBadge = document.getElementById('metricsEfficiencyBadge');
    if (metricsEfficiencyBadge) metricsEfficiencyBadge.textContent = t('settings.metrics_badge_cache');
    const apiBadge = document.getElementById('apiBadge');
    if (apiBadge) apiBadge.textContent = t('settings.ai_engine_badge');
    const storageBadge = document.getElementById('storageBadge');
    if (storageBadge) storageBadge.textContent = t('settings.storage_badge');
    const fsrsOptBadge = document.getElementById('fsrsOptBadge');
    if (fsrsOptBadge) fsrsOptBadge.textContent = t('settings.fsrs_badge');
    const smartNotifyBadge = document.getElementById('smartNotifyBadge');
    if (smartNotifyBadge) smartNotifyBadge.textContent = t('settings.notify_badge');

    // 7. 復習上限セレクタ
    const selDailyCap = document.getElementById('selDailyCap');
    if (selDailyCap && selDailyCap.options) {
      try {
        Array.from(selDailyCap.options).forEach(opt => {
          if (!opt) return;
          if (opt.value === '20') opt.textContent = t('settings.cap_opt_20');
          else if (opt.value === '30') opt.textContent = t('settings.cap_opt_30');
          else if (opt.value === '50') opt.textContent = t('settings.cap_opt_50');
          else if (opt.value === '99999') opt.textContent = t('settings.cap_opt_unlimited');
        });
      } catch (e) {}
    }

    // 8. クォータ説明文
    const sbQuotaText = document.getElementById('sbQuotaText');
    if (sbQuotaText) {
      sbQuotaText.textContent = t('settings.quota_desc');
    }

    // 9. 課金切り替えタブの年払い無料バッジ
    const settingsBillingAnnualBtn = document.getElementById('settingsBillingAnnualBtn');
    if (settingsBillingAnnualBtn) {
      settingsBillingAnnualBtn.innerHTML = currentLocale === 'ja'
        ? '年払い <span style="color:var(--ok);font-size:10px">(2ヶ月無料)</span>'
        : (currentLocale === 'fr'
          ? 'Annuel <span style="color:var(--ok);font-size:10px">(-17%)</span>'
          : (currentLocale === 'de'
            ? 'Jährlich <span style="color:var(--ok);font-size:10px">(17% sparen)</span>'
            : (currentLocale === 'es'
              ? 'Anual <span style="color:var(--ok);font-size:10px">(Ahorre 17%)</span>'
              : 'Annual <span style="color:var(--ok);font-size:10px">(Save 17%)</span>')));
    }
  }

  /**
   * メインUI・ツールバーの網羅的翻訳パス
   */
  function translateMainUI(isEn) {
    if (typeof document === 'undefined') return;

    const langLabelsEn = {
      en: 'English (EN)',
      fr: 'French (FR)',
      de: 'German (DE)',
      es: 'Spanish (ES)',
      it: 'Italian (IT)',
      pt: 'Portuguese (PT)',
      nl: 'Dutch (NL)',
      zh: 'Chinese (ZH)',
      ko: 'Korean (KO)',
      ja: 'Japanese (JA)'
    };
    const langLabelsJa = {
      en: '英語 (EN)',
      fr: '仏語 (FR)',
      de: '独語 (DE)',
      es: '西語 (ES)',
      it: '伊語 (IT)',
      pt: '葡語 (PT)',
      nl: '蘭語 (NL)',
      zh: '中国語 (ZH)',
      ko: '韓国語 (KO)',
      ja: '日本語 (JA)'
    };

    // 1. 言語ペアセレクタの表示ラベル
    const srcLangSel = document.getElementById('srcLangSel');
    if (srcLangSel && srcLangSel.options) {
      try {
        Array.from(srcLangSel.options).forEach(opt => {
          if (!opt) return;
          const lbl = isEn ? langLabelsEn[opt.value] : langLabelsJa[opt.value];
          if (lbl) opt.textContent = lbl;
        });
      } catch (e) {}
    }
    const tgtLangSel = document.getElementById('tgtLangSel');
    if (tgtLangSel && tgtLangSel.options) {
      try {
        Array.from(tgtLangSel.options).forEach(opt => {
          if (!opt) return;
          const lbl = isEn ? langLabelsEn[opt.value] : langLabelsJa[opt.value];
          if (lbl) opt.textContent = lbl;
        });
      } catch (e) {}
    }

    // 2. ソート順セレクタ
    const sortSel = document.getElementById('sortSel');
    if (sortSel && sortSel.options) {
      try {
        Array.from(sortSel.options).forEach(opt => {
          if (!opt) return;
          if (opt.value === 'new') opt.textContent = isEn ? 'Sort: Newest' : '並び順: 新しい順';
          else if (opt.value === 'old') opt.textContent = isEn ? 'Sort: Oldest (#1~)' : '並び順: 古い順 (#1〜)';
          else if (opt.value === 'due') opt.textContent = isEn ? 'Sort: Due for Review' : '並び順: 復習期日が近い順';
          else if (opt.value === 'alpha') opt.textContent = isEn ? 'Sort: Alphabetical' : '並び順: アルファベット順';
        });
      } catch (e) {}
    }

    // 3. グラフ内言語フィルタセレクタ
    const graphFilterEn = {
      all: 'All Languages',
      en: 'English Only',
      fr: 'French Only',
      de: 'German Only',
      es: 'Spanish Only',
      it: 'Italian Only',
      pt: 'Portuguese Only',
      nl: 'Dutch Only',
      zh: 'Chinese Only',
      ko: 'Korean Only',
      ja: 'Japanese Only'
    };
    const graphFilterJa = {
      all: '全言語',
      en: '英語のみ',
      fr: '仏語のみ',
      de: '独語のみ',
      es: '西語のみ',
      it: '伊語のみ',
      pt: '葡語のみ',
      nl: '蘭語のみ',
      zh: '中国語のみ',
      ko: '韓国語のみ',
      ja: '日本語のみ'
    };
    const graphLangFilterSel = document.getElementById('graphLangFilterSel');
    if (graphLangFilterSel && graphLangFilterSel.options) {
      try {
        Array.from(graphLangFilterSel.options).forEach(opt => {
          if (!opt) return;
          const lbl = isEn ? graphFilterEn[opt.value] : graphFilterJa[opt.value];
          if (lbl) opt.textContent = lbl;
        });
      } catch (e) {}
    }
  }

  /**
   * DOM 一括翻訳バインディング
   */
  function applyI18nToDOM() {
    if (typeof document === 'undefined') return;

    const isEn = currentLocale !== 'ja';
    if (document.documentElement) {
      document.documentElement.lang = currentLocale;
    }

    // テキスト置換 [data-i18n]
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        const trans = t(key);
        if (trans) el.textContent = trans;
      }
    });

    // ツールチップ置換 [data-i18n-title]
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key) {
        const trans = t(key);
        if (trans) el.setAttribute('title', trans);
      }
    });

    // プレースホルダー置換 [data-i18n-ph]
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const key = el.getAttribute('data-i18n-ph');
      if (key) {
        const trans = t(key);
        if (trans) el.setAttribute('placeholder', trans);
      }
    });

    // HTML置換 [data-i18n-html]
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      if (key) {
        const trans = t(key);
        if (trans) el.innerHTML = trans;
      }
    });

    // 言語セレクタがある場合の同期
    const langSel = document.getElementById('uiLanguageSel');
    if (langSel) langSel.value = currentLocale;

    // 設定モーダル & メインUIの詳細翻訳パス
    translateSettingsModal(isEn);
    translateMainUI(isEn);

    // 価格表示の同期
    updatePricingUI();
  }

  // 初期化時に DOM 読み込み完了後に適用
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyI18nToDOM);
    } else {
      setTimeout(applyI18nToDOM, 0);
    }
  }

  global.VocabI18n = {
    t,
    setLocale,
    getLocale,
    translateCategory,
    getBillingInterval,
    setBillingInterval,
    getPlanPriceInfo,
    updatePricingUI,
    applyI18nToDOM,
    SUPPORTED_LOCALES,
    TRANSLATIONS
  };

  // 互換短縮エイリアス
  global.t = t;

})(typeof window !== 'undefined' ? window : globalThis);
