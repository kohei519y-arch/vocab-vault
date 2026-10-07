# 🤖 Vocab Vault — 外部AIレビュー用包括パック & プロンプト
> **対象AI**: Claude 3.7 / OpenAI o1, GPT-4o / DeepSeek R1 / Gemini 2.0 Pro 等  
> **用途**: 本プロダクトを商用SaaS（月額980円）として本番稼働・一般公開するにあたり、他の最先端AIから多角的・批判的な設計レビューと改善提案を引き出すためのドキュメントです。

---

## 📋 クイックスタート: コピペ用プロンプト

他のAIチャット（Claude, ChatGPT, DeepSeek等）を開き、**以下の枠内のテキストをそのままコピー＆ペースト**してください。  
（※コンテキストウィンドウが大きいAIには、このファイル全体をそのまま添付または貼り付けてください）

```markdown
あなたは、年商数十億円規模のグローバルB2C SaaSを複数スケールさせてきた「チーフアーキテクト兼セキュリティ監査責任者（CPO/CTO視点）」です。

以下の「Vocab Vault（語源・概念史特化型AI単語帳 SaaS）」のシステム設計、データベーススキーマ、決済処理、クライアントコードを熟読し、**一切のお世辞や建前を排して、批判的思考（Critical Thinking）に基づき、本番リリース時に破綻・炎上・不正利用・データ損失・赤字を招くリスクや改善点**を徹底的に洗い出してください。

### 【レビューの重点観点】
1. **セキュリティ & 権限管理 (RLS, APIキー, プロンプトインジェクション)**
   - Supabase RLS（行レベルセキュリティ）の抜け穴やサービスロールの悪用可能性はないか？
   - Edge FunctionsでのGemini API呼び出しに対するタダ乗り、プロンプトインジェクション、DoS攻撃のリスクはないか？
   - BYOK（ユーザー自身のAPIキー直接入力）とプロキシ通信の同居によるセキュリティ・CORS・保存リスクはないか？
2. **決済・Stripe・ビジネスモデル・不正利用対策**
   - Stripe Webhookのライフサイクル管理（課金失敗、チャージバック、返金、即時解約と期間満了）にエッジケースの破綻はないか？
   - Proプランの月間クォータ（9,999語）設定や共有キャッシュ戦略において、運営者のAPI費用が赤字になる構造的欠陥はないか？
3. **データ整合性・オフライン・分散同期 (LocalStorage vs IndexedDB vs PostgreSQL)**
   - LocalStorage（5MB上限）からIndexedDBへの切り替え時の競合やデータ消失リスクはないか？
   - 端末間差分同期（Sync Engine）におけるLast-Write-Wins (LWW) やTombstone（削除墓石）の運用破綻はないか？
   - SM-2アルゴリズムの復習期日計算（Unixタイムスタンプミリ秒）の端末間同期で生じる矛盾はないか？
4. **パフォーマンス・スケーラビリティ**
   - 語彙数が数千〜1万語を超えた際のDOMレンダリング、全文検索（RegExp）、メモリリークの危険性はないか？
   - Supabase PostgreSQLのインデックス設計、クエリ最適化、接続プールのボトルネックはないか？
5. **法務・コンプライアンス・ストア審査**
   - 日本の特定商取引法（定期課金の解約表示）、資金決済法、個人情報保護法、GDPR、Apple/Googleストア審査（アカウント完全削除機能）に適合しているか？
   - 生成AI特有のハルシネーション（語源・歴史の誤情報）に関する法的な免責・利用規約上の穴はないか？
6. **プロダクトUX・グロース・CVR (Conversion Rate)**
   - 初回訪問者が「即座に価値を感じる」オンボーディングになっているか？
   - 無料枠（30語）からProプラン（月額980円）への転換導線やアップセルUXに改善余地はあるか？

---
### 【出力フォーマット】
以下の形式で、優先度順に具体的かつ実装コード/SQL付きで提示してください：
- **🔴 P0 (致命的・リリース阻止リスク)**: 資金流出、データ全消失、重大なセキュリティ脆弱性
- **🟠 P1 (高優先度・整合性/法務リスク)**: Webhookエッジケース、法規制抵触、UX離脱要因
- **🟡 P2 (中優先度・品質/スケーラビリティ改善)**: パフォーマンス改善、コードリファクタリング、CVR改善
- **💡 アーキテクチャ・ビジネスモデルへの戦略的提言**: 今後スケールするための技術・製品ロードマップ
```

---

## 🏗️ 1. プロジェクト概要 & 全体アーキテクチャ

### 1.1 プロダクト概要
* **サービス名**: Vocab Vault（ヴォキャブ・ヴォールト）
* **コンセプト**: 印欧祖語（PIE）語根、古代ギリシャ・ラテン語の語源ネットワーク、思想・概念史の変遷を体系的に学習できる「学術・教養特化型インテリジェント単語帳」。
* **提供形態**: 
  - Web SaaS (PWA: Progressive Web App)
  - macOS 署名付きネイティブアプリバンドル（独立ウィンドウ起動）
  - Android (Trusted Web Activity / Play Store AAB対応)
* **価格体系**:
  - **Freeプラン**: ¥0/月（AI新規生成 30語/月、共有辞書キャッシュ・オフラインSM-2復習は無制限）
  - **Proプラン**: ¥980/月（AI生成無制限、長文/画像OCR抽出無制限、端末間クラウド自動差分同期、優先サポート）
  - **BYOK (Bring Your Own Key)**: 自身のGemini APIキーを入力することで、完全ローカル＆無料枠無制限で直接API利用可能。

### 1.2 技術スタック
* **フロントエンド**: Vanilla JavaScript (ES6+), HTML5, Modern CSS3 (Grid/Flexbox/CSS Variables), Service Worker (CacheFirst + NetworkFallback)
* **暗記エンジン**: SuperMemo SM-2 アルゴリズム改良版（EF factor, Repetition, Interval, NextReviewDate）
* **データストレージ**: LocalStorage ➔ IndexedDB（自動容量超過フェイルセーフ）➔ Supabase PostgreSQL（端末間差分同期）
* **バックエンド / BaaS**: Supabase
  - **Auth**: Email / Password 認証
  - **Database**: PostgreSQL 15 (Row Level Security / RLS 適用)
  - **Serverless**: Supabase Edge Functions (Deno / TypeScript)
* **決済基盤**: Stripe
  - Stripe Checkout (サブスクリプション月額課金)
  - Stripe Customer Portal (セルフサービス解約・カード変更・領収書発行)
  - Stripe Webhooks (署名検証・冪等性制御・期間満了管理)
* **AIエンジン**: Google Gemini 2.0 Flash / Pro (`responseMimeType: "application/json"`, Structured Output Schema)
* **外部辞書API**: Wiktionary REST API (多言語IPA発音記号・品詞裏付け Grounding)

### 1.3 システム構成図
```mermaid
flowchart TD
    Client["フロントエンド (PWA / Vanilla JS / SW)"]
    LS["LocalStorage / IndexedDB"]
    SupabaseAuth["Supabase Auth"]
    DB["Supabase PostgreSQL (RLS)"]
    EF_Gen["Edge Function: vocab-generate"]
    EF_Web["Edge Function: stripe-webhook"]
    Gemini["Google Gemini API (2.0 Flash)"]
    Wikt["Wiktionary API"]
    Stripe["Stripe Billing & Checkout"]

    Client <-->|オフラインファースト / 永続化| LS
    Client -->|サインイン / JWT| SupabaseAuth
    Client <-->|差分同期 (LWW / Tombstone)| DB
    Client -->|AI生成リクエスト| EF_Gen
    EF_Gen <-->|共有辞書キャッシュ検索 / ヒットカウント| DB
    EF_Gen -->|未キャッシュ分のみプロンプト秘匿呼出| Gemini
    Client -->|IPA発音・語義裏付け| Wikt
    Client -->|Checkout作成| Stripe
    Stripe -->|署名付きWebhook| EF_Web
    EF_Web -->|冪等性確認 & Pro昇格/期間満了管理| DB
```

---

## 💾 2. データベース設計 & RLS (Supabase PostgreSQL)

本番で使用している DDL スキーマの抜粋です：

```sql
-- 1. profiles テーブル（プラン判定・月間クォータ・Stripe契約情報）
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'academic')),
  monthly_quota INTEGER NOT NULL DEFAULT 30,
  usage_count INTEGER NOT NULL DEFAULT 0,
  quota_reset_at TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', NOW()) + INTERVAL '1 month'),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: ユーザーは自身のプロフィールを SELECT のみ可能（不正昇格防止のため UPDATE/INSERT は禁止）
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- 2. stripe_events テーブル（Webhook 冪等性保証）
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
-- 一般ユーザーのアクセスは全面拒否（service_role のみ）

-- 3. user_vocab_entries テーブル（単語帳・差分同期用）
CREATE TABLE IF NOT EXISTS public.user_vocab_entries (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  id TEXT NOT NULL,
  lang TEXT NOT NULL CHECK (lang IN ('en', 'fr', 'de')),
  word_key TEXT NOT NULL,
  num INTEGER NOT NULL DEFAULT 1,
  word TEXT NOT NULL,
  homograph_index INTEGER NOT NULL DEFAULT 1,
  folder TEXT,
  category TEXT DEFAULT 'その他',
  interval NUMERIC NOT NULL DEFAULT 0,
  repetition INTEGER NOT NULL DEFAULT 0,
  efactor NUMERIC NOT NULL DEFAULT 2.5,
  next_review BIGINT NOT NULL,
  card_data JSONB NOT NULL,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_uve_user_lang_upd ON public.user_vocab_entries (user_id, lang, updated_at);
CREATE INDEX IF NOT EXISTS idx_uve_user_wordkey ON public.user_vocab_entries (user_id, word_key);

ALTER TABLE public.user_vocab_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own vocab entries" ON public.user_vocab_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. global_dictionary_cache テーブル（辞書共有キャッシュ・コスト削減）
CREATE TABLE IF NOT EXISTS public.global_dictionary_cache (
  word_key TEXT PRIMARY KEY,
  lang TEXT NOT NULL CHECK (lang IN ('en', 'fr', 'de')),
  word TEXT NOT NULL,
  homograph_index INTEGER NOT NULL DEFAULT 1,
  card_data JSONB NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 1,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_gdc_lang_word ON public.global_dictionary_cache (lang, word);

ALTER TABLE public.global_dictionary_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read dictionary cache" ON public.global_dictionary_cache
  FOR SELECT USING (true);

-- 5. クォータ判定・確定消費ストアドプロシージャ（補償トランザクション対応）
CREATE OR REPLACE FUNCTION public.check_and_consume_quota(
  p_user_id UUID,
  p_item_count INTEGER,
  p_consume BOOLEAN DEFAULT TRUE
)
RETURNS JSONB AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_needs_reset BOOLEAN := false;
BEGIN
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  -- 月初リセット判定
  IF v_now >= v_profile.quota_reset_at THEN
    v_profile.usage_count := 0;
    v_profile.quota_reset_at := (date_trunc('month', v_now) + INTERVAL '1 month');
    v_needs_reset := true;
  END IF;

  -- サブスクリプション期限切れの自動ダウングレード（期間満了管理）
  IF v_profile.plan = 'pro' AND v_profile.current_period_end IS NOT NULL AND v_now > v_profile.current_period_end THEN
    IF v_profile.subscription_status != 'active' OR v_profile.cancel_at_period_end THEN
      v_profile.plan := 'free';
      v_profile.monthly_quota := 30;
      v_profile.subscription_status := 'canceled';
      v_profile.cancel_at_period_end := FALSE;
      UPDATE public.profiles
      SET plan = 'free',
          monthly_quota = 30,
          subscription_status = 'canceled',
          cancel_at_period_end = FALSE,
          updated_at = v_now
      WHERE id = p_user_id;
    END IF;
  END IF;

  -- Proプラン判定
  IF v_profile.plan = 'pro' OR v_profile.plan = 'academic' THEN
    IF p_consume THEN
      v_profile.usage_count := v_profile.usage_count + p_item_count;
      UPDATE public.profiles
      SET usage_count = v_profile.usage_count,
          quota_reset_at = v_profile.quota_reset_at,
          updated_at = v_now
      WHERE id = p_user_id;
    ELSIF v_needs_reset THEN
      UPDATE public.profiles
      SET usage_count = 0,
          quota_reset_at = v_profile.quota_reset_at,
          updated_at = v_now
      WHERE id = p_user_id;
    END IF;

    RETURN jsonb_build_object(
      'allowed', true,
      'plan', v_profile.plan,
      'usage_count', v_profile.usage_count,
      'remaining', 9999
    );
  END IF;

  -- Freeプランのクォータ判定
  IF (v_profile.usage_count + p_item_count) > v_profile.monthly_quota THEN
    IF v_needs_reset THEN
      UPDATE public.profiles
      SET usage_count = 0,
          quota_reset_at = v_profile.quota_reset_at,
          updated_at = v_now
      WHERE id = p_user_id;
    END IF;

    RETURN jsonb_build_object(
      'allowed', false,
      'plan', v_profile.plan,
      'usage_count', v_profile.usage_count,
      'monthly_quota', v_profile.monthly_quota,
      'remaining', GREATEST(0, v_profile.monthly_quota - v_profile.usage_count)
    );
  END IF;

  -- 消費実行（p_consume が TRUE の場合のみ）
  IF p_consume THEN
    v_profile.usage_count := v_profile.usage_count + p_item_count;
    UPDATE public.profiles
    SET usage_count = v_profile.usage_count,
        quota_reset_at = v_profile.quota_reset_at,
        updated_at = v_now
    WHERE id = p_user_id;
  ELSIF v_needs_reset THEN
    UPDATE public.profiles
    SET usage_count = 0,
        quota_reset_at = v_profile.quota_reset_at,
        updated_at = v_now
    WHERE id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'plan', v_profile.plan,
    'usage_count', v_profile.usage_count,
    'monthly_quota', v_profile.monthly_quota,
    'remaining', GREATEST(0, v_profile.monthly_quota - v_profile.usage_count)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## ⚡ 3. サーバーレス関数設計 (Supabase Edge Functions)

### 3.1 `vocab-generate` (AI生成プロキシ)
* **目的**: クライアントから直接Geminiを呼ばせず、認証・クォータ・プロンプト秘匿化・共有キャッシュを行う。
* **要点**:
  1. クライアントからの `systemPrompt` / `responseSchema` の送信を完全排除し、サーバー内で固定化（プロンプトインジェクション・悪用遮断）。
  2. 1リクエスト最大15語に制限。
  3. 共有キャッシュ（`global_dictionary_cache`）を `.in("word_key", allKeys)` で一括バッチ検索し、ヒット分はAI呼び出しをバイパス。
  4. 未ヒット語について、まず `check_and_consume_quota(p_consume: false)` で残量確認。
  5. Gemini 2.0 Flash APIを呼び出し、JSON解析成功後に `check_and_consume_quota(p_consume: true)` で**実際に成功した単語数のみ確定消費**。

### 3.2 `stripe-webhook` (決済・サブスクライフサイクル)
* **目的**: Stripeからのイベントを受信し、ユーザーのProプラン昇格・期間満了・解約を管理。
* **要点**:
  1. `stripe.webhooks.constructEventAsync` で署名（`STRIPE_WEBHOOK_SECRET`）を厳格検証。
  2. `stripe_events` テーブルに `event.id` を INSERT。重複（Postgres 23505）時は HTTP 200 `{ received: true, duplicate: true }` で即座に終了（**冪等性保証**）。
  3. `checkout.session.completed`: Stripeから `current_period_end` を取得し、`plan: 'pro'`, `subscription_status: 'active'`, `cancel_at_period_end: false` を保存。
  4. `customer.subscription.updated`: `cancel_at_period_end: true`（解約予約）でも、契約期限（`current_period_end`）までは **Proプランを維持**。
  5. `customer.subscription.deleted`: 期間満了により失効した段階で `plan: 'free'`, `monthly_quota: 30`, `subscription_status: 'canceled'` にダウングレード。

---

## 📱 4. フロントエンド・クライアント設計 (Vanilla JS / PWA)

* **モジュール構成**:
  - `storage.js`: LocalStorage と IndexedDB の透過的ラッパー。容量超過エラー時に IndexedDB 専有モードへ自動フォールバック。
  - `anki.js`: SM-2 アルゴリズム復習エンジン（Swipe操作対応、正解率記録、アンドゥ機能）。
  - `sync.js`: Supabase Auth / REST API / Edge Functions / Stripe 連携モジュール。
  - `app.js`: UIコントローラー、語彙レンダリング、仮想スクロール、OCR画像圧縮、モーダル管理。
* **PWA / オフライン対応**:
  - `sw.js`: コアアセットを CacheFirst でキャッシュし、完全オフラインでも既存単語の復習・学習が可能。
* **アップセル UX (P1対応)**:
  - クォータ上限到達時（HTTP 429）や無料枠0の状態で新規登録を試みた際、単なるエラーではなく魅力的な「Proアップセルモーダル（`#upsellModal`）」を自動表示。月額980円のStripe Checkoutへワンクリック誘導。

---

## 🛠️ 5. 直近で対応完了済みの改善項目 (P0 / P1)
他のAIが重複して指摘しないよう、以下の改善は**すでに実装・検証完了済み**であることを明記します：

1. **[P0完了] 新規登録時の利用規約・プライバシーポリシー同意の強制バリデーション**
   - チェックボックス未選択時は登録をフロントエンドで即座に遮断。
2. **[P0完了] クォータ消費の補償トランザクション化（後払い化）**
   - AIエラー時にユーザーの無料枠が消失するバグを解消（二段階コミット）。
3. **[P0完了] 共有辞書キャッシュのバッチ取得化**
   - ループ直列照会（N+1）を解消し、APIレイテンシを大幅短縮。
4. **[P0完了] macOS ネイティブアプリ化 & ローカルサーバー完全撤廃**
   - `Vocab Vault.app` によるブラウザ枠なし直接起動。ERR_CONNECTION_REFUSED を根絶。
5. **[P1完了] Stripe Webhook の冪等性（Idempotency）保証**
   - `stripe_events` による重複リトライ・多重実行の完全ブロック。
6. **[P1完了] サブスク中途解約時の期間満了管理**
   - `cancel_at_period_end` 判定により、次回更新日まではPro特権を維持。
7. **[P1完了] 無料枠超過時のProアップセルモーダル新設**
   - 離脱防止とCVR向上を実現する専用UIおよびトリガー連携。

---

## 🔍 6. 他のAIに特に深掘りしてほしい検討論点（Open Questions）

1. **Stripe決済の異常系・エッジケース**:
   - クレジットカードの更新失敗（`invoice.payment_failed`）やリトライ期間中の扱い（`past_due`）において、ユーザーへの督促UIや猶予期間（Grace Period）はどうあるべきか？
   - ユーザーが別ブラウザやシークレットモードでサインアップした場合のセッション復元。
2. **分散データ同期の限界**:
   - 2台の端末（Macとスマホ）で同時に異なる単語をオフライン編集した場合、現在の Last-Write-Wins (LWW) と単語単位のタイムスタンプ管理でデータ消失は防ぎきれるか？CRDT等の導入は必要か？
3. **LLMコストと収益性**:
   - Proユーザー（月額980円）が月間数千語の学術難語を一気にインポートした場合のGemini API費用試算と、共有キャッシュのヒット率向上施策。
4. **セキュリティとコンプライアンス**:
   - SupabaseのAuthトークン（JWT）の有効期限切れ時の自動リフレッシュの堅牢性。
   - GDPR / 個人情報保護法に基づく「完全退会時のデータ消去（アカウント削除RPC）」の妥当性。
5. **UI/UXとプロダクトグロース**:
   - 英語・フランス語・ドイツ語の多言語対応における発音記号（IPA）やWiktionaryの精度向上。
   - ユーザーのリテンション（習慣化）を高めるための通知やストリーク機能の設計。
