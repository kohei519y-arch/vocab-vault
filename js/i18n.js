/**
 * Vocab Vault — Lightweight Internationalization & Localization Engine (js/i18n.js)
 * Zero-dependency, instantaneous locale switching for global SaaS expansion.
 * Auto-detects browser locale (default English for global, Japanese for ja-*)
 */
(function(global) {
  'use strict';

  const STORAGE_KEY = 'vv_ui_locale';
  const SUPPORTED_LOCALES = ['en', 'ja'];

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
    '英検準1級': '英検準1級'
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
    }
    return 'en'; // デフォルトは世界展開を見据えて英語
  }

  let currentLocale = detectInitialLocale();

  /**
   * 翻訳文字列の取得
   */
  function t(key, fallback = '') {
    const dict = TRANSLATIONS[currentLocale] || TRANSLATIONS.en;
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
   * カテゴリ文字列の多言語翻訳
   */
  function translateCategory(rawCat) {
    if (!rawCat) return t('cat.general');
    const key = CATEGORY_MAP[rawCat];
    if (key) return t(key);
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
    if (titleEl) titleEl.textContent = isEn ? 'Settings & Cloud Sync & Data Management' : '設定・クラウド同期・データ管理';

    // 2. 音声設定チェックボックス
    const chkAutoSpeak = document.getElementById('chkAutoSpeak');
    if (chkAutoSpeak && chkAutoSpeak.parentElement && chkAutoSpeak.parentElement.childNodes) {
      try {
        const parent = chkAutoSpeak.parentElement;
        const nodes = Array.from(parent.childNodes || []);
        const textNode = nodes.find(n => n && (n.nodeType === 3 || (typeof Node !== 'undefined' && n.nodeType === Node.TEXT_NODE)));
        if (textNode) {
          textNode.nodeValue = isEn ? 'Auto-pronounce during review' : '復習時に自動発音';
        }
      } catch (e) {}
    }

    // 3. 音声速度セレクタ
    const ttsRateSel = document.getElementById('ttsRateSel');
    if (ttsRateSel && ttsRateSel.options) {
      try {
        Array.from(ttsRateSel.options).forEach(opt => {
          if (!opt) return;
          if (opt.value === '0.85') opt.textContent = isEn ? 'Speed: 0.85x (Slow)' : '速度: 0.85x (ゆっくり)';
          else if (opt.value === '0.95') opt.textContent = isEn ? 'Speed: 0.95x (Natural)' : '速度: 0.95x (自然)';
          else if (opt.value === '1.05') opt.textContent = isEn ? 'Speed: 1.05x (Fast)' : '速度: 1.05x (やや速め)';
        });
      } catch (e) {}
    }

    // 4. アカウント認証フォームプレースホルダー & ボタン
    const sbEmailInput = document.getElementById('sbEmailInput');
    if (sbEmailInput) sbEmailInput.placeholder = isEn ? 'Email address' : 'メールアドレス';
    const sbPassInput = document.getElementById('sbPassInput');
    if (sbPassInput) sbPassInput.placeholder = isEn ? 'Password (6+ characters)' : 'パスワード (6文字以上)';
    const sbUrlInput = document.getElementById('sbUrlInput');
    if (sbUrlInput) sbUrlInput.placeholder = isEn ? 'Supabase URL (https://xxx.supabase.co)' : 'Supabase URL (https://xxx.supabase.co)';
    const sbAnonInput = document.getElementById('sbAnonInput');
    if (sbAnonInput) sbAnonInput.placeholder = isEn ? 'Supabase Anon Public Key' : 'Supabase Anon Public Key';

    const sbAuthFormRow = document.getElementById('sbAuthFormRow');
    if (sbAuthFormRow && sbAuthFormRow.querySelectorAll) {
      try {
        const btns = sbAuthFormRow.querySelectorAll('button');
        if (btns && btns.length >= 2) {
          if (btns[0]) btns[0].textContent = isEn ? 'Sign In' : 'ログイン';
          if (btns[1]) btns[1].textContent = isEn ? 'Sign Up' : '新規登録';
        }
      } catch (e) {}
    }

    // 5. バッジ類
    const sbStatusBadge = document.getElementById('sbStatusBadge');
    if (sbStatusBadge && sbStatusBadge.textContent && sbStatusBadge.textContent.includes('ログイン')) {
      sbStatusBadge.textContent = isEn ? 'Not Signed In' : '未ログイン';
    }
    const curPlanBadge = document.getElementById('curPlanBadge');
    if (curPlanBadge) {
      const cur = curPlanBadge.textContent || '';
      if (cur.includes('Free') || cur.includes('フリー')) {
        curPlanBadge.textContent = isEn ? 'Free Tier' : 'Free プラン';
      } else if (cur.includes('Pro')) {
        curPlanBadge.textContent = isEn ? 'Pro Plan' : 'Pro プラン';
      }
    }
    const pwaStatusBadge = document.getElementById('pwaStatusBadge');
    if (pwaStatusBadge) pwaStatusBadge.textContent = isEn ? 'Standalone Ready' : '単体起動対応';
    const metricsEfficiencyBadge = document.getElementById('metricsEfficiencyBadge');
    if (metricsEfficiencyBadge) metricsEfficiencyBadge.textContent = isEn ? 'High-Efficiency Cache Active' : '高効率キャッシュ稼働中';
    const apiBadge = document.getElementById('apiBadge');
    if (apiBadge) apiBadge.textContent = isEn ? 'Embedded AI Active (Full Privacy)' : '内蔵AI稼働中 (完全機密保護)';
    const storageBadge = document.getElementById('storageBadge');
    if (storageBadge) storageBadge.textContent = isEn ? 'Storage Normal' : '保存正常';
    const fsrsOptBadge = document.getElementById('fsrsOptBadge');
    if (fsrsOptBadge) fsrsOptBadge.textContent = isEn ? 'FSRS-4.5 Optimized' : 'FSRS-4.5 最適化済';
    const smartNotifyBadge = document.getElementById('smartNotifyBadge');
    if (smartNotifyBadge) smartNotifyBadge.textContent = isEn ? 'Smart Standby' : 'スマート待機中';

    // 6. 復習上限セレクタ
    const selDailyCap = document.getElementById('selDailyCap');
    if (selDailyCap && selDailyCap.options) {
      try {
        Array.from(selDailyCap.options).forEach(opt => {
          if (!opt) return;
          if (opt.value === '20') opt.textContent = isEn ? '20 words (Relaxed)' : '20 語 (ゆったり)';
          else if (opt.value === '30') opt.textContent = isEn ? '30 words (Recommended)' : '30 語 (推奨・標準)';
          else if (opt.value === '50') opt.textContent = isEn ? '50 words (Intensive)' : '50 語 (集中)';
          else if (opt.value === '99999') opt.textContent = isEn ? 'Unlimited (All)' : '無制限 (すべて)';
        });
      } catch (e) {}
    }

    // 7. クォータ説明文
    const sbQuotaText = document.getElementById('sbQuotaText');
    if (sbQuotaText) {
      sbQuotaText.textContent = isEn
        ? '*Free accounts can generate up to 5 AI words per day (unlimited shared cache). Real-time cross-device cloud sync is included in the Pro plan ($3.99/mo).'
        : '※無料アカウント登録で1日5語までAI新規生成可能（共有キャッシュは無制限）。複数端末間のクラウド自動同期はProプラン（月480円）でご利用いただけます。';
    }

    // 8. 課金切り替えタブの年払い無料バッジ
    const settingsBillingAnnualBtn = document.getElementById('settingsBillingAnnualBtn');
    if (settingsBillingAnnualBtn) {
      settingsBillingAnnualBtn.innerHTML = isEn
        ? 'Annual <span style="color:var(--ok);font-size:10px">(Save 17%)</span>'
        : '年払い <span style="color:var(--ok);font-size:10px">(2ヶ月無料)</span>';
    }
  }

  /**
   * メインUI・ツールバーの網羅的翻訳パス
   */
  function translateMainUI(isEn) {
    if (typeof document === 'undefined') return;

    // 1. 言語ペアセレクタの表示ラベル
    const srcLangSel = document.getElementById('srcLangSel');
    if (srcLangSel && srcLangSel.options) {
      try {
        Array.from(srcLangSel.options).forEach(opt => {
          if (!opt) return;
          if (opt.value === 'en') opt.textContent = isEn ? 'English (EN)' : '英語 (EN)';
          else if (opt.value === 'fr') opt.textContent = isEn ? 'French (FR)' : '仏語 (FR)';
          else if (opt.value === 'de') opt.textContent = isEn ? 'German (DE)' : '独語 (DE)';
          else if (opt.value === 'ja') opt.textContent = isEn ? 'Japanese (JA)' : '日本語 (JA)';
        });
      } catch (e) {}
    }
    const tgtLangSel = document.getElementById('tgtLangSel');
    if (tgtLangSel && tgtLangSel.options) {
      try {
        Array.from(tgtLangSel.options).forEach(opt => {
          if (!opt) return;
          if (opt.value === 'ja') opt.textContent = isEn ? 'Japanese (JA)' : '日本語 (JA)';
          else if (opt.value === 'en') opt.textContent = isEn ? 'English (EN)' : '英語 (EN)';
          else if (opt.value === 'fr') opt.textContent = isEn ? 'French (FR)' : '仏語 (FR)';
          else if (opt.value === 'de') opt.textContent = isEn ? 'German (DE)' : '独語 (DE)';
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
    const graphLangFilterSel = document.getElementById('graphLangFilterSel');
    if (graphLangFilterSel && graphLangFilterSel.options) {
      try {
        Array.from(graphLangFilterSel.options).forEach(opt => {
          if (!opt) return;
          if (opt.value === 'all') opt.textContent = isEn ? 'All Languages' : '全言語';
          else if (opt.value === 'en') opt.textContent = isEn ? 'English Only' : '英語のみ';
          else if (opt.value === 'fr') opt.textContent = isEn ? 'French Only' : '仏語のみ';
          else if (opt.value === 'de') opt.textContent = isEn ? 'German Only' : '独語のみ';
          else if (opt.value === 'ja') opt.textContent = isEn ? 'Japanese Only' : '日本語のみ';
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
    TRANSLATIONS
  };

  // 互換短縮エイリアス
  global.t = t;

})(typeof window !== 'undefined' ? window : globalThis);
