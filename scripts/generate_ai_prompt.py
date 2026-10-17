#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/generate_ai_prompt.py
Vocab Vault — 本番リリース最終判定 再監査（Re-Audit）統合プロンプトパック生成スクリプト
全32ファイルの最新ソースコードを埋め込み、オールインワン版および【3分割版】を自動生成します。
"""
import os
import zipfile

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(BASE_DIR, "ai_audit_prompts")
os.makedirs(OUTPUT_DIR, exist_ok=True)

AUDIT_ZIP_FILE = os.path.join(OUTPUT_DIR, "VocabVault_Audit_SourceCode.zip")

RE_AUDIT_PROMPT_FILE = os.path.join(OUTPUT_DIR, "RE_AUDIT_PROMPT.md")
ALL_IN_ONE_FILE = os.path.join(OUTPUT_DIR, "ALL_IN_ONE_AI_PROMPT.md")
PART1_BACKEND_FILE = os.path.join(OUTPUT_DIR, "RE_AUDIT_PART1_BACKEND.md")
PART2_FRONTEND_FILE = os.path.join(OUTPUT_DIR, "RE_AUDIT_PART2_FRONTEND.md")
PART3_GRAPH_FILE = os.path.join(OUTPUT_DIR, "RE_AUDIT_PART3_GRAPH_SUITE.md")
INSTRUCTION_ONLY_FILE = os.path.join(OUTPUT_DIR, "RE_AUDIT_INSTRUCTION_ONLY.md")

HEADER_COMMON = r"""## Vocab Vault — 本番リリース最終判定 再監査（Re-Audit）統合パック
> このプロンプトは、Claude 3.7 Sonnet / OpenAI o1 / GPT-4o / Gemini 2.0 Pro / DeepSeek 等の最先端AIにそのまま送信して厳格な再監査を受けるためのマスタープロンプトです。

---

# Role & Operational Directive（監査者への絶対指示）
あなたは何者にも忖度しない世界最高峰の客観性と論理的厳密さを備えた「主席ソフトウェアアーキテクト兼セキュリティ・堅牢性監査責任者（Principal Architect & Lead Red Team Auditor / CTO & CPO視点）」です。

本プロンプトは、第1次〜第5次の多層監査において下された指摘事項（P0〜P2）およびビジネスモデル・学習UX上のボトルネック指摘を受け、開発チームが全指摘項目に対して根本的な設計修正・リファクタリング・保護策を実施した最新コードベース（全32ファイル完全収録）を提示するものです。

私との対話において、一切の社交辞令、お世辞、迎合（Sycophancy）、抽象的な一般論、および感情的配慮を完全に排除してください。
あなたの目的は、チームの修正を安易に承認することではなく、「修正によって新たなデグレードや副作用、潜在的競合が生じていないか」「前回未精読だった領域に致命的なリスクが潜んでいないか」「極限負荷や悪意ある攻撃に対して本当に耐えうるか」「グローバルSaaS（月額$3.99/480円）として商用サービス基準を満たしているか」を第一原理（First Principles）に基づいて冷徹に暴き、本番投入可否を最終判定することです。

---

## 1. 監査指摘事項と修正対比表（Verification Target）

これまでの第1次〜第5次監査で指摘された以下の P0〜P2 の全件について、修正実装（該当ファイル）が真に根本解決となっているか、新たな穴を生んでいないかを徹底的に再検証してください。

| 重大度 | 指摘項目 | 指摘内容 | 今回の修正実装・保護ロジック | 主な該当ファイル |
| :--- | :--- | :--- | :--- | :--- |
| **[P0]** | **P0-1** | **数値型キャスト例外による差分同期バッチ全滅**: `sync_vocab_entries_batch` で `updated_at`, `num` 等に小数・指数表記が混入すると PostgreSQL の `::BIGINT`/`::INTEGER` キャストが例外をスローし、50件バッチ全体がロールバックされて同期不能になる。 | `input_rows` CTE で `num`, `homograph_index`, `repetition`, `updated_at`, `review_updated_at` の全項目に数値正規表現チェック (`~ '^-?[0-9]+(\.[0-9]+)?$'`) と `trunc(...::NUMERIC)::BIGINT/INTEGER` 切り捨て保護を適用。 | `supabase/schema.sql` |
| **[P0]** | **P0-2** | **Stripe カスタマーポータル未実装による解約不能（特商法違反）**: フロントエンド `js/sync.js` が `/functions/v1/stripe-portal` を呼ぶがバックエンドが未実装（HTTP 404）で、課金ユーザーが自力でサブスクを解約する手段がアカウント削除以外に存在しなかった。 | `supabase/functions/stripe-portal/index.ts` を完全新規実装。Stripe Billing Portal Session を動的生成し、安全な returnUrl バリデーションとともに提供。 | `supabase/functions/stripe-portal/index.ts` |
| **[P0]** | **P0-3** | **複数言語ペア（en_ja, en_en等）利用時の墓石混同・ゾンビ復活**: `storage.js` の `migrateFromLocalStorageIfNeeded`, `syncFromIdbForLang`, `mergeWords` がペアキーではなく2文字の言語コード（`'en'`）を渡していたため、英英（`en_en`）の墓石が参照されず削除単語が復活・汚染された。 | `storage.js` の `mergeWords` が完全なペアキー（`lOrKey`）を受け取り、`resolveConfig` により `cfg.srcLang` と `tombTarget` を厳格分離。起動時マイグレーション、IndexedDB コミット、同期処理の全経路でペアキーを厳格伝搬。 | `js/storage.js`<br>`js/sync.js`<br>`supabase/schema.sql` |
| **[P0]** | **P0-4** | **退会済みユーザーへの Webhook 受信による 500 リトライ無限ループ**: アカウント削除後に Stripe から届く `customer.subscription.updated` や `invoice.paid` 等で、DB にユーザーが見つからず例外スロー → Stripe の指数バックオフリトライ（500）が延々ループ。 | `process_stripe_webhook_atomic` で、プロファイル不在時の `checkout.session.completed` 以外の全イベントを `user_not_found_ignored`（HTTP 200 OK）として安全に無視・終了。 | `supabase/schema.sql` |
| **[P0]** | **P0-5** | **英検準1級 Fog of War アンロック時の未定義関数クラッシュとデータ消失**: `graph.js` でアンロックした単語を配列に追加後、未定義関数 `global.saveData()` を呼び出して即死し、IndexedDB/LocalStorage に永続化されずリロードで全単語が消滅した。 | 未定義関数を撤廃し、正規の `setJson(pairKey, nextList, true, true)` に置換。メモリ更新と同時に IndexedDB への非同期アトミックコミットを保証。 | `js/graph.js` |
| **[P0]** | **P0-6** | **系統樹ツリーイージング計算における定数デクリメント構文エラー即死**: `graph.js` の `startTreeEasingAnimation()` 内で `const t = frame / maxFrames; (--t) * t * t + 1;` と `const` 定数に対してデクリメント演算子を実行し即時クラッシュした。 | `let t = frame / maxFrames; const progress = (--t) * t * t + 1;` に修正し、構文エラーを完全根絶。 | `js/graph.js` |
| **[P0]** | **P0-7** | **CSP による Google TTS 外部音声の 100% ブロック**: モバイル Safari 等で Service Worker が fetch インターセプトした際、CSP の `connect-src` に `translate.google.com` と `api.dictionaryapi.dev` が無く音声再生が拒否された。 | `index.html` および `dev.html` の CSP `connect-src` に `https://translate.google.com` と `https://api.dictionaryapi.dev` を明示追加。`sw.js` の fetch 除外リストにも両ホストを追加して SW キャッシュ干渉を遮断。 | `index.html`<br>`dev.html`<br>`sw.js` |
| **[P1]** | **P1-1** | **Wiktionary URL 正規表現のアポストロフィ拒否による裏付バッジ破損**: `storage.js` および `app.js` の `WIKT_URL_RE` が文字クラスで `'` を除外していたため、`aujourd'hui` や `l'arbre` 等のフランス語・熟語で Wiktionary URL と `wiktGrounded` バッジが保存時に消滅した。 | `WIKT_URL_RE` から `'` の除外指定を外し、パーセントエンコードおよび生アポストロフィ付き URL を安全に許容。 | `js/storage.js`<br>`js/app.js` |
| **[P1]** | **P1-2** | **ストレージ初期化順序依存による墓石判定スキップ**: `storage.js` が `app.js` より先にロードされるため、初期化中の `recordTombstone` と `isTombstoned` が `global.VocabCore?.makeWordKey` を参照すると未定義となり、単語キー墓石が効かずに削除単語が復活した。 | `global.VocabMorphology?.makeWordKey` を最優先参照し、未定義時でも安全なフォールバック関数 `(w, lg) => `${lg}:${String(w || '').trim().toLowerCase()}`` を内蔵。 | `js/storage.js` |
| **[P1]** | **P1-3** | **退会処理における IndexedDB（SSOT）の物理削除漏れ**: `deleteAccountPermanently` が `localStorage` のみ消去し、IndexedDB 内の全単語・復習ログ・スナップショットを放置していた。 | `VocabStorage.idbClearAll()` を実装・公開し、IndexedDB の全オブジェクトストア（words, tombstones, watermarks, review_history, snapshots）を完全抹消。 | `js/events.js`<br>`js/storage.js` |
| **[P1]** | **P1-4** | **AI 生成カードの文字列カテゴリ破壊**: `vocab-generate/index.ts` の `sanitizeCard` が `typeof card?.category === 'number'` 以外を数値 1 または 29 で強制上書きし、共有キャッシュの文字列カテゴリ（例: "日常会話"）を破壊していた。 | 文字列カテゴリ（`typeof === 'string' && length > 0`）も非破壊で維持するよう条件分岐を拡張。 | `supabase/functions/vocab-generate/index.ts` |
| **[P1]** | **P1-5** | **スヌーズ再配分・DB修復時の論理クロック未更新によるマージ敗北**: `rescheduleOverdueReviews` および `runDatabaseDiagnosticsAndRepair` が `item.version`（Lamport Version）をインクリメントせず、他端末や IndexedDB の HLC マージでスヌーズ結果が負けて元に戻った。 | スヌーズおよび不整合修復時に `item.version = (Number(item.version) || 1) + 1` を確実に実行し、更新勝敗を確定。 | `js/events.js`<br>`js/anki_view.js` |
| **[P1]** | **P1-6** | **Anki インポート時の墓石未解除とデータサニタイズ欠落**: `importAnkiText` が生データを直接挿入し、過去に同単語を削除した際の墓石が残存していると次回復習時や同期時に即座に墓石で消去された。 | インポート時に `sanitizeFn` を適用、`wordKey` を付与し、該当ペアの墓石マップから `id:` および `wk:` を即座に破棄して保存。 | `js/export.js` |
| **[P0]** | **P0-8** | **語源系統樹における二重表示（CanvasカードとDOMツールチップの重複競合）**: ノードホバー時に、Canvas 2D内部で直接描画していたフローティングカードとHTMLのDOMツールチップ（`#graphTooltip`）が同一座標に重複描画され、文字が二重にブレて視認不能になっていた。 | Canvas内部での重畳カード描画（長方形ボックス）を完全撤去。単一のDOMツールチップ（`#graphTooltip`）に一本化し、Canvas上は発光オーラリング（`#38bdf8`/`#a78bfa`）のみを描画して視認性と60FPSを両立。 | `js/graph.js`<br>`css/app.css` |
| **[P0]** | **P0-9** | **3,000単語規模におけるノード重なり・密集の解消と超高速描画**: 語彙が数千単語に達した際にノードとラベルテキストが過密に重なり合い、力学計算が重層化してFPS低下と視認破綻が生じる。 | $O(N)$ 空間ハッシュグリッド（Spatial Hash Grid）リラクゼーション、動的セマンティックズーム閾値（`textThresholdZoom`）、および視界外フラスティングカリング（Frustum Culling）を導入し、数千語規模でも60FPS描画と高い可読性を保証。 | `js/graph.js` |
| **[P0]** | **P0-10** | **データバインディング欠陥による `[object Object]` 表示と印欧祖語（PIE）語根の分散重複**: JSONオブジェクトが適切に文字列化されず `[object Object]` と表示されるデータバインディングバグ、および同一印欧祖語（`*sta-`, `*kap-` 等）が複数ノードに分裂・重複して階層関係が破綻していた。 | 型安全なデータマッピング・サニタイズ処理とフォールバックを実装し、PIE語根マップによる名寄せ統合を実施。語根重複を根絶し階層系統樹を統一。 | `js/graph.js`<br>`js/morphology.js` |
| **[P0]** | **P0-11** | **macOS ネイティブシェル（WKWebView）における単語削除・操作不能**: WKUIDelegate の `runJavaScriptConfirmPanelWithMessage` が未実装の場合、WebKit は JS の `confirm()` に無条件で `false` を返却し、単語削除ボタンが一切反応しなくなる。 | `scripts/native_app/main.m` に NSAlert による動的確認シートを実装。さらにメッセージ内容を解析し、「削除」「保存」「リセット」「再分散する」「開始」「OK」を文脈に応じて動的切り替え。 | `scripts/native_app/main.m` |
| **[P0]** | **P0-12** | **ネイティブシェルにおける Blob URL / ファイル保存・読込遮断**: WKWebView 上で `<a>` タグの `blob:` ダウンロードを実行すると外部アプリ呼出の誤作動や保存不能が生じる。 | `nativeSave` スクリプトメッセージハンドラによる `NSSavePanel` 保存、`runOpenPanelWithParameters` による `NSOpenPanel` 読込、および `blob:` ナビゲーションの安全遮断を実装。 | `scripts/native_app/main.m`<br>`js/export.js` |
| **[P1]** | **P1-7** | **語源系統樹における段階的開示（Progressive Disclosure）と視覚的過負荷の防止**: 一度に全ノードを展開すると認知負荷が超過するため、初期表示は主要語根のみに抑え、クリックで下位ブランチを動的展開するアコーディオン設計を導入。 | `graphUIManager` による段階的開示、パンくずリスト（Breadcrumbs）、および確定座標イージングアニメーション（Cubic Bezier）を整備。 | `js/graph.js` |
| **[P1]** | **P1-8** | **語源生マークアップ混入と不規則・屈折語尾の Lemmatization 欠落**: 複数形（`objectives` 等）で語源照合に失敗しダミーが生成される問題、および Wiktionary の `extract` から語源ヘッダー（`=== Etymology ===`）が語義欄に漏出する問題。 | `js/dictionary.js` で屈折語尾 Lemmatization（`-s`, `-es`, `-ed`, `-ing`）と語源ヘッダー除外フィルターを導入。`js/storage.js` で既存壊れカードの自己修復サニタイズを実装。 | `js/dictionary.js`<br>`js/storage.js` |
| **[P1]** | **P1-9** | **救出データのゾンビ復活・再上書きリスク**: 初回起動時のデータ復元がセッションフラグのみの場合、ユーザーが単語を削除した後に再起動するとバックアップから削除単語がゾンビ復活する。 | `scripts/native_app/main.m` において、`localStorage.getItem('vv_native_restored_v1')` による初回 1 回限定の安全永続化ガードを導入。 | `scripts/native_app/main.m` |

---

## 2. 新規実装されたアーキテクチャ・収益化・学習効果倍増機能（New Architecture & Feature Audit）

グローバル展開と収益化、および学習定着度を実現するために新規導入された以下の機能を精読してください。

### ① グローバル化（i18n）＆多通貨 Stripe Checkout（Phase 1）
- **UI / カテゴリ / トースト完全多言語化 (`js/i18n.js`)**:
  - ブラウザ言語（`navigator.language`）やユーザー設定に応じた日英自動切替。
  - カテゴリコードの正規化と表示名ローカライズ（日常会話/Daily Conversation, ビジネス/Business, 英検/Eiken等）。
  - クオータ超過時の 429 エラーメッセージの多言語化。
- **多通貨対応 Stripe Checkout Edge Function (`supabase/functions/stripe-checkout/index.ts`)**:
  - `price_id` ハードコードを廃止し、通貨（USD/JPY）と期間（monthly/annual）に応じた動的 line_items 生成。
  - USD: $3.99/mo, $39.00/yr / JPY: ¥480/mo, ¥4,800/yr。
  - Stripe Customer 作成、メタデータ紐付け、Idempotent なセッション発行。
- **特商法準拠 Stripe カスタマーポータル (`supabase/functions/stripe-portal/index.ts`)**:
  - ログインユーザーの Stripe カスタマー ID から Billing Portal Session を発行し、自力での解約・カード変更・請求書確認を完全開通。

### ② 4階層言語進化系統樹（Lineage Tree）＆3,000語スケーラビリティ（Phase 2）
- **確定座標イージング & 空間ハッシュグリッドリラクゼーション (`js/graph.js`)**:
  - ツリーモード時は反発シミュレーション（Spring/Repulsion）を停止し確定座標へ配置。
  - 3,000語規模の密集時にも $O(N)$ 空間ハッシュグリッドによる重なり解消リラクゼーションを実施。
  - 親から子への確定座標（X, Y）を一発計算し、0.3秒の `cubic-bezier` イージングで整列後に完全静止。
- **ホバー単一ツールチップ化 & オーラリングハイライト**:
  - 重複していたCanvasフローティングカード枠を全廃し、発音記号・品詞・マスク連動を備えた高品質DOMツールチップ（`#graphTooltip`）に一本化。
  - ホバー/選択ノードはCanvas上でスマートな発光オーラリング（`#38bdf8`/`#a78bfa`）のみを軽快に描画。
- **1語根フォーカス＆情報密度コントロール（Semantic Zoom & Accordion）**:
  - 初期表示時は主要語根（`*sta-`, `*kap-`, `*gen-` 等）のみを表示し、クリックした語根のみを展開するアコーディオン。
  - ズーム倍率に応じた動的テキスト閾値（`textThresholdZoom`）制御とビューポート外フラスティングカリング。
- **英検準1級 200語オフラインカタログ＆Fog of War (`js/eiken_catalog.js`, `js/starter_pack.js`)**:
  - 16主要語根に紐づく準1級頻出200語を構造化内蔵（APIコストゼロ・即時展開）。
  - 未学習単語を半透明（Fog of War / つぼみ）で表示し、ワンクリックで解放（`setJson` による即時永続化）。
  - パンくずリスト、時系列タイムラインフィルター、水やり復習（Watering Review）連携。


### ③ 文脈穴埋め・産出モード（Cloze Deletion / Active Recall）
- **実装内容 (`js/anki_view.js`)**:
  - 例文内の対象単語を `[ ______ ]` に置換して出題。
  - 例文和訳・コアイメージ・語根ヒントを段階的に開示。
  - タイピング入力と想起トグル、ショートカット `M` キー切り替え。FSRS-4.5 と完全連動。

### ④ 文脈記憶カード＆音声 Playlist 自動連続再生
- **文脈記憶 (`js/anki_view.js`)**: 長文・OCRからのコンテキスト文をカード表面に安全に表示。
- **耳学 Playlist モード (`js/speech.js`)**: 単語 → 意味 → 例文 をシームレスに自動ループ再生。ショートカット `L`, `P` キー対応。

### ⑤ SNS シェアカード生成機能（Phase 3）
- **高解像度 OGP Canvas 合成 (`js/graph.js`)**:
  - 1200x630 の Twitter/X 向け OGP カードを Canvas 上に動的レンダリング。
  - 系統樹ビジュアル、語彙数、記憶定着率、語根バッジ、アプリロゴを美しく配置し、高画質 PNG としてワンクリック出力。

---

## 3. 今回の監査対象ファイル構成（全32ファイル完全収録・3分割構成）

本コードベースの全32ファイルを完全に収録しています。チャット入力上限に合わせて【3分割】構成で提供します。

### 【Part 1: バックエンド・DB・課金・ストレージ・基本シェル】（計11ファイル）
1. `supabase/schema.sql` — PostgreSQL 15 スキーマ、RLS、クォータ、差分同期 RPC、Tombstone 連動トリガー、Webhook冪等処理
2. `supabase/functions/vocab-generate/index.ts` — Deno/Edge Functions AI プロキシ、共有キャッシュ、レート制限、多言語429
3. `supabase/functions/stripe-checkout/index.ts` — Stripe Checkout セッション生成、多通貨動的ラインアイテム（USD/JPY、月額/年額）
4. `supabase/functions/stripe-webhook/index.ts` — Stripe 決済 Webhook、定期課金同期、退会後イベント無害化
5. `supabase/functions/stripe-portal/index.ts` — Stripe Billing Portal Session 生成、自力解約・カード変更
6. `supabase/functions/delete-account/index.ts` — アカウント抹消、Stripe 解約、データ物理パージ
7. `js/sync.js` — クライアント側差分同期、Stripe チェックアウト連携、言語ペア分離
8. `js/storage.js` — LocalStorage + IndexedDB 階層化ストレージ、Tombstone 墓石管理、完全消去
9. `sw.js` — Service Worker、PWA キャッシュ、オフライン耐性、外部APIバイパス
10. `index.html` — 本番 Web/PWA メイン UI、2カラムレイアウト、モーダル定義、i18n対応、CSP
11. `css/app.css` — モダン UI スタイリング、ダークモード、系統樹キャンバス、Eiken Pre-1 Explorer

### 【Part 2: フロントエンドコア・FSRS忘却曲線・AIキュー・辞書・復習UI】（計10ファイル）
12. `js/i18n.js` — グローバル多言語辞書（en/ja）、UI自動ローカライズ、多通貨価格表示、カテゴリ英訳
13. `js/app.js` — アプリケーションライフサイクル、初期化、言語ペア切り替え、Wiktionary URL
14. `js/events.js` — イベント委譲、キーボードショートカット、UI 連動、退会処理、スヌーズ再配分
15. `js/queue.js` — AI 生成タスクキュー、バックグラウンドワーカー、429 Paywall 制御
16. `js/list_view.js` — 単語リスト DOM 差分更新（reconcileList）、仮想スクロール
17. `js/card_view.js` — 単語詳細カード DOM レンダリング、アコーディオン
18. `js/dictionary.js` — 語源ナレッジ生成、Wiktionary 裏付け、PIE 語根辞書
19. `js/speech.js` — Web Speech API / 外部音声多層 TTS、Playlist 自動連続再生
20. `js/anki.js` — FSRS-4.5 / SM-2 間隔反復忘却曲線エンジン、パラメータ最適化
21. `js/anki_view.js` — フラッシュカード復習 UI、Cloze 産出モード、Undo 復元、スヌーズ再配分

### 【Part 3: 語源ネットワーク・系統樹・カタログ・ネイティブアプリ・開発環境】（計12ファイル）
22. `js/morphology.js` — 印欧祖語(PIE)語根ナレッジ、同根語マトリクス、語根抽出、i18n対応
23. `js/eiken_catalog.js` — 英検準1級 語根マスターカタログ (200語)・Fog of War・ゼロAPIコスト展開
24. `js/graph.js` — 4階層言語進化系統樹・語彙スキルツリー・確定座標イージング・Canvas 2Dエンジン
25. `js/starter_pack.js` — 初回起動用スターターパック（英検準1級クラスターパック1-4等）
26. `js/ocr.js` — 画像圧縮、クリップボードペースト、Gemini Vision OCR
27. `js/search.js` — 高速インクリメンタル検索エンジン、Unicode 正規化
28. `js/navigation.js` — キーボードナビゲーション、フォーカストラップ、アクセシビリティ
29. `js/modal.js` — モーダル管理、Anki インポート、アカウント設定、診断
30. `js/feedback.js` — ユーザーフィードバック収集、問い合わせ
31. `js/export.js` — Anki TSV / Obsidian Markdown / JSON バックアップ出力
32. `scripts/native_app/main.m` — macOS Cocoa/WebKit スタンドアロンネイティブシェル、ダイアログ、ファイルI/O
33. `dev.html` — 開発者マスター版（課金・クォータ制限バイパス環境）

---

## 4. 回答フォーマット要求

客観的・批判的な視点から、以下の構成で冷徹に出力してください（お世辞・社交辞令は一切不要です）：

1. **本番リリース判定（Production Launch Verdict）**:
   - `[RELEASE GRANTED / 本番投入可]` または `[RELEASE BLOCKED / 本番投入不可]`
   - 判定理由（要約：P0 の有無、商用決済・データ保全の信頼性、SaaSとしての完成度）

2. **指摘事項（P0〜P1 計17件）の再評価**:
   - 各指摘について「完全解決」「不完全（残存リスクあり）」「デグレード発生」のいずれかを判定し、根拠コードを示して理由を述べてください。

3. **新規実装機能（Phase 1: i18n/Stripe Checkout/Portal, Phase 2: 系統樹確定レイアウト/英検200語/Cloze/Playlist, Phase 3: SNSシェア, Phase 4: Macネイティブ独立アプリ）の品質評価**:
   - アルゴリズムの正確性、メモリリークの有無、UI パフォーマンス、エッジケース処理の合否。

4. **新規検出リスク一覧（Severity 別）**:
   - **[P0] (致命的・リリース阻止リスク)**: 資金流出、データ全消失、クラッシュ、重大なセキュリティ脆弱性
   - **[P1] (高優先度・整合性/法務リスク)**: Webhook/同期エッジケース、アルゴリズム破綻、UX重大阻害
   - **[P2] (中優先度・品質/スケーラビリティ改善)**: パフォーマンスボトルネック、メモリ効率、アクセシビリティ
   - **[提言] 戦略的アーキテクチャ提言**: 将来的な拡張性・保守性のための提言

5. **検出された問題に対する具体的な修正コード / SQL パッチ**

---
"""

# Part 1: Backend, Storage, Sync, DB, PWA, Shell (11 files)
FILES_PART1 = [
    ("supabase/schema.sql", "sql", "【ファイル: supabase/schema.sql — データベーススキーマ・RLS・クォータ管理・差分同期RPC・Tombstone連動】"),
    ("supabase/functions/vocab-generate/index.ts", "typescript", "【ファイル: supabase/functions/vocab-generate/index.ts — AIプロキシ・共有キャッシュ・クォータ制御・多言語429】"),
    ("supabase/functions/stripe-checkout/index.ts", "typescript", "【ファイル: supabase/functions/stripe-checkout/index.ts — Stripe Checkout 多通貨動的ラインアイテム（USD/JPY）】"),
    ("supabase/functions/stripe-webhook/index.ts", "typescript", "【ファイル: supabase/functions/stripe-webhook/index.ts — Stripe Webhook決済・定期課金同期・退会イベント無害化】"),
    ("supabase/functions/stripe-portal/index.ts", "typescript", "【ファイル: supabase/functions/stripe-portal/index.ts — Stripe Billing Portal Session 生成・解約・特商法準拠】"),
    ("supabase/functions/delete-account/index.ts", "typescript", "【ファイル: supabase/functions/delete-account/index.ts — アカウント完全抹消・Stripe定期課金即時解約】"),
    ("js/sync.js", "javascript", "【ファイル: js/sync.js — Supabase端末間差分同期・Stripe決済・言語ペア分離】"),
    ("js/storage.js", "javascript", "【ファイル: js/storage.js — 階層化ストレージ (LocalStorage + IndexedDB + Tombstone墓石・完全消去)】"),
    ("sw.js", "javascript", "【ファイル: sw.js — Service Worker・PWA耐障害性プリキャッシュ・Network-Firstルーティング】"),
    ("index.html", "html", "【ファイル: index.html — 本番UI構造・PWA・モーダル定義・i18n対応・CSP】"),
    ("css/app.css", "css", "【ファイル: css/app.css — UIスタイリング・レスポンシブ2カラムグリッド・系統樹Canvas】"),
]

# Part 2: Frontend Logic, FSRS, AI Queue, Dictionary, Speech, Components (10 files)
FILES_PART2 = [
    ("js/i18n.js", "javascript", "【ファイル: js/i18n.js — グローバル多言語辞書（en/ja）・UI自動ローカライズ・多通貨価格管理】"),
    ("js/app.js", "javascript", "【ファイル: js/app.js — アプリケーションコア・ライフサイクル・初期化】"),
    ("js/events.js", "javascript", "【ファイル: js/events.js — イベント委譲・ショートカット・UIライフサイクル監視・退会・スヌーズ】"),
    ("js/queue.js", "javascript", "【ファイル: js/queue.js — AI生成タスクキュー・クラウド/オンデバイス自動切替・Paywall制御】"),
    ("js/list_view.js", "javascript", "【ファイル: js/list_view.js — DOM差分更新 reconcileList・無限スクロール・仮想表示制御】"),
    ("js/card_view.js", "javascript", "【ファイル: js/card_view.js — 単語カードDOM構築・安全挿入・アコーディオン】"),
    ("js/dictionary.js", "javascript", "【ファイル: js/dictionary.js — 語源生成・Wiktionary裏付け・内蔵辞書ナレッジ】"),
    ("js/speech.js", "javascript", "【ファイル: js/speech.js — 多層音声合成 TTS・Playlist自動連続再生・カラオケハイライト】"),
    ("js/anki.js", "javascript", "【ファイル: js/anki.js — FSRS/SM-2間隔反復忘却曲線アルゴリズム・パーソナライズ最適化】"),
    ("js/anki_view.js", "javascript", "【ファイル: js/anki_view.js — フラッシュカード復習UI・Cloze産出モード・Undo復元・学習アナリティクス】"),
]

# Part 3: Etymology Graph, Catalog, Morphology, Vision OCR, Search, Navigation, Export, Native Shell & Dev (12 files)
FILES_PART3 = [
    ("js/morphology.js", "javascript", "【ファイル: js/morphology.js — 印欧祖語(PIE)語根ナレッジ・同根語マトリクス・語根抽出】"),
    ("js/eiken_catalog.js", "javascript", "【ファイル: js/eiken_catalog.js — 英検準1級 語根マスターカタログ (200語)・Fog of War・ゼロAPIコスト展開】"),
    ("js/graph.js", "javascript", "【ファイル: js/graph.js — 4階層言語進化系統樹・語彙スキルツリー・確定座標イージング・Canvas 2Dエンジン】"),
    ("js/starter_pack.js", "javascript", "【ファイル: js/starter_pack.js — コールドスタート用厳選スターターパック】"),
    ("js/ocr.js", "javascript", "【ファイル: js/ocr.js — 画像圧縮・クリップボードペースト・Gemini Vision OCR】"),
    ("js/search.js", "javascript", "【ファイル: js/search.js — 高速多機能検索エンジン・Unicode正規化・ReDoS防止】"),
    ("js/navigation.js", "javascript", "【ファイル: js/navigation.js — キーボードショートカット・a11yフォーカストラップ】"),
    ("js/modal.js", "javascript", "【ファイル: js/modal.js — モーダルUI・Anki TSVインポート・アカウント設定・診断】"),
    ("js/feedback.js", "javascript", "【ファイル: js/feedback.js — 需要検証・ユーザーフィードバック収集・ヒアリング】"),
    ("js/export.js", "javascript", "【ファイル: js/export.js — Anki TSV / Obsidian Markdown / JSON バックアップ出力】"),
    ("scripts/native_app/main.m", "objectivec", "【ファイル: scripts/native_app/main.m — macOS Cocoa/WebKit スタンドアロンネイティブシェル・ダイアログ・ファイルI/O・自動復元】"),
    ("dev.html", "html", "【ファイル: dev.html — 開発者マスター版（課金制限バイパス）】"),
]

def load_file_content(rel_path, lang, title):
    full_path = os.path.join(BASE_DIR, rel_path)
    if not os.path.exists(full_path):
        print(f"Warning: {full_path} not found!")
        return f"\n### {title}\n(ファイルが存在しません)\n"
    with open(full_path, "r", encoding="utf-8") as f:
        content = f.read()
    return f"\n### {title}\n```{lang}\n{content}\n```\n"

def main():
    # 1. Instruction Only (.md & .txt)
    with open(INSTRUCTION_ONLY_FILE, "w", encoding="utf-8") as f:
        f.write(HEADER_COMMON)
    with open(os.path.join(OUTPUT_DIR, "RE_AUDIT_INSTRUCTION_ONLY.txt"), "w", encoding="utf-8") as f:
        f.write(HEADER_COMMON)
    print(f"Generated {INSTRUCTION_ONLY_FILE}")

    # 2. All-in-One Prompt (.md & .txt)
    all_files = FILES_PART1 + FILES_PART2 + FILES_PART3
    all_parts = [HEADER_COMMON, "## 5. 全ソースコード (Complete Source Code — 全32ファイル)\n"]
    for rel, lang, title in all_files:
        all_parts.append(load_file_content(rel, lang, title))
    all_content = "\n".join(all_parts)

    with open(RE_AUDIT_PROMPT_FILE, "w", encoding="utf-8") as f:
        f.write(all_content)
    with open(ALL_IN_ONE_FILE, "w", encoding="utf-8") as f:
        f.write(all_content)
    with open(os.path.join(OUTPUT_DIR, "VocabVault_All_In_One.txt"), "w", encoding="utf-8") as f:
        f.write(all_content)
    with open(os.path.join(BASE_DIR, "VocabVault_All_In_One.txt"), "w", encoding="utf-8") as f:
        f.write(all_content)
    print(f"Generated {RE_AUDIT_PROMPT_FILE} ({len(all_content)} bytes)")

    # 3. Part 1 (Backend / Storage / DB / Sync / Shell) (.md & .txt)
    p1_header = HEADER_COMMON + "\n> **【重要: 3分割送信 Part 1 of 3 — バックエンド・DB・課金・同期・ストレージ・基本シェル】**\n> 本コードベース（全32ファイル）をAIに送信するため、3分割した第1弾です。\n> 【Part 1 収録内容（計11ファイル）】\n> - データベーススキーマ・RLS・差分同期RPC・Tombstone（schema.sql）\n> - Supabase Edge Functions（vocab-generate, stripe-checkout, stripe-webhook, stripe-portal, delete-account）\n> - クライアント側差分同期（sync.js）\n> - 階層化ストレージ＆完全抹消（storage.js）\n> - Service Worker PWA（sw.js）\n> - メインUI・シェル・モーダル定義・CSP（index.html）\n> - アプリスタイリング・レスポンシブデザイン（css/app.css）\n>\n> ※続けて送信する「Part 2（フロントエンドコア・FSRS忘却曲線・復習UI）」および「Part 3（語源ネットワーク・系統樹・カタログ・開発環境）」と合わせて包括的に監査・評価してください。\n\n## 5. ソースコード Part 1 (Backend / Storage / Sync / DB / PWA Shell)\n"
    p1_parts = [p1_header]
    for rel, lang, title in FILES_PART1:
        p1_parts.append(load_file_content(rel, lang, title))
    p1_content = "\n".join(p1_parts)
    with open(PART1_BACKEND_FILE, "w", encoding="utf-8") as f:
        f.write(p1_content)
    p1_txt_path = os.path.join(OUTPUT_DIR, "Part1_Backend_DB_Sync.txt")
    with open(p1_txt_path, "w", encoding="utf-8") as f:
        f.write(p1_content)
    with open(os.path.join(BASE_DIR, "Part1_Backend_DB_Sync.txt"), "w", encoding="utf-8") as f:
        f.write(p1_content)
    print(f"Generated {PART1_BACKEND_FILE} & {p1_txt_path} ({len(p1_content)} bytes)")

    # 4. Part 2 (Frontend Core Logic / FSRS / AI Queue / Speech / Anki View) (.md & .txt)
    p2_header = HEADER_COMMON + "\n> **【重要: 3分割送信 Part 2 of 3 — フロントエンドコア・FSRS忘却曲線・AI生成キュー・復習UI】**\n> 本コードベース（全32ファイル）をAIに送信するため、3分割した第2弾です。\n> 【Part 2 収録内容（計10ファイル）】\n> - グローバル多言語化・多通貨価格管理（i18n.js）\n> - アプリケーションライフサイクル＆初期化（app.js）\n> - イベント委譲・ショートカット・UIライフサイクル（events.js）\n> - AI生成タスクキュー＆Paywall制御（queue.js）\n> - 単語リストDOM差分更新 reconcileList・仮想表示（list_view.js）\n> - 単語詳細カードDOMレンダリング（card_view.js）\n> - 語源ナレッジ生成＆Wiktionary裏付け辞書（dictionary.js）\n> - 多層音声合成TTS＆Playlist自動連続再生（speech.js）\n> - FSRS-4.5 / SM-2 間隔反復忘却曲線エンジン（anki.js）\n> - フラッシュカード復習UI・Cloze産出モード・Undo復元（anki_view.js）\n>\n> ※「Part 1（バックエンド・DB・ストレージ）」および続けて送信する「Part 3（語源ネットワーク・系統樹・カタログ・開発環境）」と合わせて包括的に監査・評価してください。\n\n## 5. ソースコード Part 2 (Frontend Logic / FSRS / UI / Modules)\n"
    p2_parts = [p2_header]
    for rel, lang, title in FILES_PART2:
        p2_parts.append(load_file_content(rel, lang, title))
    p2_content = "\n".join(p2_parts)
    with open(PART2_FRONTEND_FILE, "w", encoding="utf-8") as f:
        f.write(p2_content)
    p2_txt_path = os.path.join(OUTPUT_DIR, "Part2_Frontend_Logic_FSRS.txt")
    with open(p2_txt_path, "w", encoding="utf-8") as f:
        f.write(p2_content)
    with open(os.path.join(BASE_DIR, "Part2_Frontend_Logic_FSRS.txt"), "w", encoding="utf-8") as f:
        f.write(p2_content)
    print(f"Generated {PART2_FRONTEND_FILE} & {p2_txt_path} ({len(p2_content)} bytes)")

    # 5. Part 3 (Etymology Graph / Eiken Catalog / Morphology / OCR / Navigation / Native App / Dev) (.md & .txt)
    p3_header = HEADER_COMMON + "\n> **【重要: 3分割送信 Part 3 of 3 — 語源ネットワーク・系統樹・カタログ・ネイティブアプリ・開発ツール】**\n> 本コードベース（全33ファイル）をAIに送信するため、3分割した第3弾（完結編）です。\n> 【Part 3 収録内容（計12ファイル）】\n> - 印欧祖語(PIE)語根ナレッジ・同根語マトリクス（morphology.js）\n> - 英検準1級 語根マスターカタログ (200語)・Fog of War（eiken_catalog.js）\n> - 4階層言語進化系統樹・語彙スキルツリー・Canvas 2Dエンジン（graph.js）\n> - 初回起動用スターターパック（starter_pack.js）\n> - 画像圧縮＆Gemini Vision OCR（ocr.js）\n> - 高速インクリメンタル検索エンジン（search.js）\n> - キーボードナビゲーション＆a11yフォーカストラップ（navigation.js）\n> - モーダル管理・Ankiインポート・診断（modal.js）\n> - ユーザーフィードバック収集（feedback.js）\n> - Anki TSV / Obsidian Markdown / JSON バックアップ出力（export.js）\n> - macOS Cocoa/WebKit スタンドアロンネイティブシェル（scripts/native_app/main.m）\n> - 開発者マスター環境・課金バイパス版（dev.html）\n>\n> ※「Part 1（バックエンド・DB・同期）」および「Part 2（フロントエンドコア・FSRS）」と全パーツが揃いました。全33ファイルに基づき、最終判定および包括的な改善提案を提示してください。\n\n## 5. ソースコード Part 3 (Etymology Graph / Catalog / Native Shell / Suite)\n"
    p3_parts = [p3_header]
    for rel, lang, title in FILES_PART3:
        p3_parts.append(load_file_content(rel, lang, title))
    p3_content = "\n".join(p3_parts)
    with open(PART3_GRAPH_FILE, "w", encoding="utf-8") as f:
        f.write(p3_content)
    p3_txt_path = os.path.join(OUTPUT_DIR, "Part3_Graph_Catalog_Suite.txt")
    with open(p3_txt_path, "w", encoding="utf-8") as f:
        f.write(p3_content)
    with open(os.path.join(BASE_DIR, "Part3_Graph_Catalog_Suite.txt"), "w", encoding="utf-8") as f:
        f.write(p3_content)
    print(f"Generated {PART3_GRAPH_FILE} & {p3_txt_path} ({len(p3_content)} bytes)")

    # 6. Pack All Source Files into Audit Zip Archive & Extract into Raw Folder
    source_folder = os.path.join(OUTPUT_DIR, "VocabVault_Source_Files")
    os.makedirs(source_folder, exist_ok=True)
    with zipfile.ZipFile(AUDIT_ZIP_FILE, 'w', zipfile.ZIP_DEFLATED) as zf:
        for rel, _, _ in all_files:
            fp = os.path.join(BASE_DIR, rel)
            if os.path.exists(fp):
                zf.write(fp, arcname=rel)
                dest_file = os.path.join(source_folder, rel)
                os.makedirs(os.path.dirname(dest_file), exist_ok=True)
                with open(fp, "rb") as sf, open(dest_file, "wb") as df:
                    df.write(sf.read())
    print(f"Generated {AUDIT_ZIP_FILE} and populated {source_folder}")

    # 7. README in ai_audit_prompts
    readme_path = os.path.join(OUTPUT_DIR, "README.md")
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write("""# Vocab Vault — AI再監査（Re-Audit）プロンプトパック

本フォルダには、外部の最先端AI（Claude 3.7 Sonnet / OpenAI o1 / GPT-4o / Gemini 2.0 Pro / DeepSeek 等）にコードベース全体の再監査を依頼するためのプロンプトおよびソースコード一式が格納されています。

## AIがZipファイルを開けない理由と解決策

ChatGPT や Claude のWebチャット画面は、セキュリティ上の制限により **.zip 圧縮ファイルの直接展開に対応していません**。
そのため、AIにコードを読み込ませる際は **.txt ファイルとしてドラッグ＆ドロップ添付する** のが最も確実です。

---

## おすすめ送信手順（確実にAIが読める【3分割】送信方法）

全33ファイル（約1.4MB）を約350KB〜490KBずつの【3分割】に整理しています。どのAIでも文字数・トークン上限に引っかかることなく快適に送信できます。

### 方法A: Claude 3.7 Sonnet または ChatGPT Plus (o1 / GPT-4o)
1. **Part1_Backend_DB_Sync.txt** をチャット画面にドラッグ＆ドロップして送信。
2. 続けて **Part2_Frontend_Logic_FSRS.txt** をドラッグ＆ドロップして送信。
3. 続けて **Part3_Graph_Catalog_Suite.txt** をドラッグ＆ドロップして送信。
※ Claude 3.7 Sonnetなら3つのファイルを同時にチャット欄に添付して送信することも可能です。

### 方法B: Google AI Studio / Gemini 2.0 Pro（超長文 100万〜200万トークン対応）
1. **VocabVault_All_In_One.txt**（約1.4MB）を1ファイルだけドラッグ＆ドロップして送信。

---

## 3分割ファイル一覧

| ファイル名 | 推奨AI | 説明 |
| :--- | :--- | :--- |
| **Part1_Backend_DB_Sync.txt** | **全AI共通（Part 1）** | 指示文 + バックエンド・DB・Stripe・同期・ストレージ・シェル（計11ファイル、約365KB）。 |
| **Part2_Frontend_Logic_FSRS.txt** | **全AI共通（Part 2）** | 指示文 + フロントエンドコア・FSRS忘却曲線・AI生成キュー・復習UI（計10ファイル、約415KB）。 |
| **Part3_Graph_Catalog_Suite.txt** | **全AI共通（Part 3）** | 指示文 + 語源ネットワーク・系統樹・英検カタログ・OCR・ネイティブシェル・開発環境（計12ファイル、約490KB）。 |
| **VocabVault_All_In_One.txt** | **Google AI Studio / Gemini** | 指示文 + 全33ファイルを1つに結合した完全版（約1.4MB）。長大コンテキスト対応AI向け。 |
| **RE_AUDIT_INSTRUCTION_ONLY.txt** | **指示文のみコピペ用** | 指示文と指摘事項対比表のみ（約19KB）。 |

## クイック実行（Mac）

プロジェクト直下の **Part1_コピー.command**, **Part2_コピー.command**, **Part3_コピー.command** をダブルクリックすると、各Partがワンタッチでクリップボードにコピーされます。
""")
    print(f"Generated {readme_path}")

if __name__ == "__main__":
    main()
