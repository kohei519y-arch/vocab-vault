-- ==============================================================================
-- Vocab Vault — Supabase Database Schema (supabase/schema.sql)
-- 本番運用仕様: RLS、厳格な権限管理、事前予約＆補償返還クォータ、
-- アトミックWebhook、カラムグループ別LWW分散同期、GDPR完全抹消
-- ==============================================================================

-- 1. profiles テーブル（プラン判定・月間クォータ・Stripe契約情報・法務証跡）
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'academic')),
  monthly_quota INTEGER NOT NULL DEFAULT 5,
  usage_count INTEGER NOT NULL DEFAULT 0,
  pro_monthly_cap INTEGER NOT NULL DEFAULT 3000,
  quota_reset_at TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('day', NOW()) + INTERVAL '1 day'),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  current_period_end TIMESTAMPTZ,
  grace_period_until TIMESTAMPTZ,
  stripe_last_event_created BIGINT NOT NULL DEFAULT 0,
  terms_accepted_at TIMESTAMPTZ,
  terms_version TEXT DEFAULT '1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription
  ON public.profiles (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- Stripe Webhook 冪等性（Idempotency）保証用テーブル
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 新規ユーザー作成時に profile を自動生成するトリガー
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, plan, monthly_quota, usage_count, pro_monthly_cap,
    quota_reset_at, terms_accepted_at, terms_version
  )
  VALUES (
    NEW.id,
    NEW.email,
    'free',
    5,
    0,
    3000,
    (date_trunc('day', NOW()) + INTERVAL '1 day'),
    NULL, -- ユーザーがUI上で明示同意した時にのみ記録（法務証跡の厳格化）
    '1.0.0'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. user_vocab_entries テーブル（単語帳データ・差分同期・Tombstone論理削除・カラム別LWW）
CREATE TABLE IF NOT EXISTS public.user_vocab_entries (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  id TEXT NOT NULL,
  lang TEXT NOT NULL CHECK (lang IN ('en', 'ja', 'fr', 'de')),
  pair TEXT NOT NULL DEFAULT 'en_ja',
  word_key TEXT NOT NULL,
  num INTEGER NOT NULL DEFAULT 1,
  word TEXT NOT NULL CHECK (length(word) <= 255),
  homograph_index INTEGER NOT NULL DEFAULT 1,
  folder TEXT,
  category TEXT DEFAULT 'その他',
  interval NUMERIC NOT NULL DEFAULT 0,
  repetition INTEGER NOT NULL DEFAULT 0,
  efactor NUMERIC NOT NULL DEFAULT 2.5,
  next_review BIGINT NOT NULL,
  card_data JSONB NOT NULL CHECK (length(card_data::TEXT) <= 50000),
  updated_at BIGINT NOT NULL,
  review_updated_at BIGINT NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  server_updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  PRIMARY KEY (user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_uve_user_server_sync
  ON public.user_vocab_entries (user_id, lang, server_updated_at);
CREATE INDEX IF NOT EXISTS idx_uve_user_pair_sync
  ON public.user_vocab_entries (user_id, pair, server_updated_at);
CREATE INDEX IF NOT EXISTS idx_uve_user_wordkey
  ON public.user_vocab_entries (user_id, word_key);

-- 3. user_tombstones テーブル（旧互換用削除ログ）
CREATE TABLE IF NOT EXISTS public.user_tombstones (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lang TEXT NOT NULL CHECK (lang IN ('en', 'ja', 'fr', 'de')),
  pair TEXT NOT NULL DEFAULT 'en_ja',
  tomb_key TEXT NOT NULL,
  deleted_at BIGINT NOT NULL,
  PRIMARY KEY (user_id, pair, tomb_key)
);

CREATE INDEX IF NOT EXISTS idx_ut_user_pair_del ON public.user_tombstones (user_id, pair, deleted_at);
CREATE INDEX IF NOT EXISTS idx_ut_user_lang_del ON public.user_tombstones (user_id, lang, deleted_at);

-- 4. user_lang_watermarks テーブル（言語全削除ウォーターマーク）
CREATE TABLE IF NOT EXISTS public.user_lang_watermarks (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lang TEXT NOT NULL CHECK (lang IN ('en', 'ja', 'fr', 'de')),
  pair TEXT NOT NULL DEFAULT 'en_ja',
  cleared_at BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, pair)
);

-- 既存テーブル移行マイグレーション（テーブルが既に存在する場合に pair カラムと複合主キーを追加）
ALTER TABLE public.user_tombstones ADD COLUMN IF NOT EXISTS pair TEXT NOT NULL DEFAULT 'en_ja';
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_tombstones_pkey' AND table_name = 'user_tombstones'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.key_column_usage 
      WHERE constraint_name = 'user_tombstones_pkey' AND column_name = 'pair'
    ) THEN
      ALTER TABLE public.user_tombstones DROP CONSTRAINT user_tombstones_pkey;
      ALTER TABLE public.user_tombstones ADD PRIMARY KEY (user_id, pair, tomb_key);
    END IF;
  END IF;
END $$;

ALTER TABLE public.user_lang_watermarks ADD COLUMN IF NOT EXISTS pair TEXT NOT NULL DEFAULT 'en_ja';
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_lang_watermarks_pkey' AND table_name = 'user_lang_watermarks'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.key_column_usage 
      WHERE constraint_name = 'user_lang_watermarks_pkey' AND column_name = 'pair'
    ) THEN
      ALTER TABLE public.user_lang_watermarks DROP CONSTRAINT user_lang_watermarks_pkey;
      ALTER TABLE public.user_lang_watermarks ADD PRIMARY KEY (user_id, pair);
    END IF;
  END IF;
END $$;

-- user_tombstones と user_lang_watermarks の ON CONFLICT (user_id, pair, ...) を100%成功させるユニークインデックス保証
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_tombstones_user_pair_key
  ON public.user_tombstones (user_id, pair, tomb_key);

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_lang_watermarks_user_pair
  ON public.user_lang_watermarks (user_id, pair);


-- 5. global_dictionary_cache テーブル（共有辞書キャッシュ: コスト0円化＆高速化）
CREATE TABLE IF NOT EXISTS public.global_dictionary_cache (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lang TEXT NOT NULL CHECK (lang IN ('en', 'ja', 'fr', 'de')),
  word TEXT NOT NULL,
  homograph_index INTEGER NOT NULL DEFAULT 1,
  word_key TEXT NOT NULL,
  card_data JSONB NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_gdc_lang_wordkey UNIQUE (lang, word_key)
);

CREATE INDEX IF NOT EXISTS idx_gdc_lookup ON public.global_dictionary_cache (lang, word, homograph_index);
CREATE INDEX IF NOT EXISTS idx_gdc_lang_wordkey ON public.global_dictionary_cache (lang, word_key);

-- 6. wiktionary_references テーブル（Wiktionary事前取り込み用）
CREATE TABLE IF NOT EXISTS public.wiktionary_references (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lang TEXT NOT NULL CHECK (lang IN ('en', 'ja', 'fr', 'de')),
  word TEXT NOT NULL,
  clean_ipa TEXT,
  section_extract TEXT,
  source_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lang, word)
);

CREATE INDEX IF NOT EXISTS idx_wikt_lookup ON public.wiktionary_references (lang, word);

-- 7. user_feedbacks テーブル（需要検証・ヒアリング回答）
CREATE TABLE IF NOT EXISTS public.user_feedbacks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  rating INTEGER DEFAULT 5,
  content TEXT,
  email TEXT,
  willingness_to_pay TEXT,
  app_version TEXT,
  active_lang TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_feedback_lengths CHECK (
    length(COALESCE(category, '')) <= 50 AND
    length(COALESCE(content, '')) <= 5000 AND
    length(COALESCE(email, '')) <= 255 AND
    length(COALESCE(willingness_to_pay, '')) <= 50 AND
    length(COALESCE(app_version, '')) <= 50 AND
    length(COALESCE(active_lang, '')) <= 20
  )
);

-- 8. guest_rate_limits テーブル（未ログインゲストのレート制限・アトミック保護）
CREATE TABLE IF NOT EXISTS public.guest_rate_limits (
  ip TEXT PRIMARY KEY,
  usage_count INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- RLS (Row Level Security) 設定
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vocab_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tombstones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lang_watermarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_dictionary_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wiktionary_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_rate_limits ENABLE ROW LEVEL SECURITY;

-- profiles: 本人のみ参照（直接の更新・挿入は権限剥奪）
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- user_vocab_entries: 本人のみ参照（直接のINSERT/UPDATE/DELETEは剥奪し、LWWとカラム別マージを保証する sync_vocab_entries_batch RPC 経由に強制一本化）
DROP POLICY IF EXISTS "Users can manage own vocab entries" ON public.user_vocab_entries;
DROP POLICY IF EXISTS "uve_select_own" ON public.user_vocab_entries;
CREATE POLICY uve_select_own ON public.user_vocab_entries
  FOR SELECT USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.user_vocab_entries FROM anon, authenticated;

-- user_tombstones: 本人のみ全操作
DROP POLICY IF EXISTS "Users can manage own tombstones" ON public.user_tombstones;
CREATE POLICY "Users can manage own tombstones" ON public.user_tombstones
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_lang_watermarks: 本人のみ全操作
DROP POLICY IF EXISTS "Users can manage own watermarks" ON public.user_lang_watermarks;
CREATE POLICY "Users can manage own watermarks" ON public.user_lang_watermarks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- global_dictionary_cache: 全員参照可（未ログイン・ゲスト含む）、書込はService Roleのみ
DROP POLICY IF EXISTS "Authenticated users can read dictionary cache" ON public.global_dictionary_cache;
DROP POLICY IF EXISTS "Anyone can read dictionary cache" ON public.global_dictionary_cache;
CREATE POLICY "Anyone can read dictionary cache" ON public.global_dictionary_cache
  FOR SELECT TO authenticated, anon USING (true);

-- wiktionary_references: 全認証ユーザー参照可
DROP POLICY IF EXISTS "Authenticated users can read wiktionary refs" ON public.wiktionary_references;
CREATE POLICY "Authenticated users can read wiktionary refs" ON public.wiktionary_references
  FOR SELECT TO authenticated USING (true);

-- user_feedbacks: インサートは誰でも可、閲覧は本人のみ
DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.user_feedbacks;
DROP POLICY IF EXISTS "Users can view own feedbacks" ON public.user_feedbacks;
CREATE POLICY "Anyone can insert feedback" ON public.user_feedbacks
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own feedbacks" ON public.user_feedbacks
  FOR SELECT USING (auth.uid() = user_id);

-- [ADD-P1-1 解決] user_feedbacks テーブルに対する匿名スパム爆撃・Storage DoS 防御用レート制限トリガー
CREATE OR REPLACE FUNCTION public.check_feedback_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_count INTEGER;
BEGIN
  -- 直近1分間に全体で30件以上、または同一ユーザーから3件以上の投稿があれば遮断
  SELECT count(*) INTO v_recent_count
  FROM public.user_feedbacks
  WHERE created_at > NOW() - INTERVAL '1 minute'
    AND (NEW.user_id IS NULL OR user_id = NEW.user_id);

  IF (NEW.user_id IS NOT NULL AND v_recent_count >= 3) OR v_recent_count >= 30 THEN
    RAISE EXCEPTION 'FEEDBACK_RATE_LIMIT_EXCEEDED: Too many feedbacks submitted recently.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_feedback_rate_limit ON public.user_feedbacks;
CREATE TRIGGER trg_check_feedback_rate_limit
  BEFORE INSERT ON public.user_feedbacks
  FOR EACH ROW EXECUTE FUNCTION public.check_feedback_rate_limit();



-- ==============================================================================
-- [P0-1 & P0-2 解決] 事前予約(Reserve) & 補償返還(Refund) クォータ管理関数
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.reserve_or_refund_quota(
  p_user_id UUID,
  p_item_count INTEGER,
  p_is_refund BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_effective_limit INTEGER;
BEGIN
  -- 境界値・異常値ガード（1リクエスト1〜15語に厳格制限）
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_USER_ID: p_user_id cannot be null';
  END IF;

  IF p_item_count IS NULL OR p_item_count <= 0 OR p_item_count > 15 THEN
    RAISE EXCEPTION 'INVALID_ITEM_COUNT: p_item_count must be between 1 and 15 (got %)', p_item_count;
  END IF;

  -- 行ロック取得（並列リクエストを直列化しTOCTOUを完全遮断）
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROFILE_NOT_FOUND: user % does not exist', p_user_id;
  END IF;

  -- クォータリセット判定 (Pro/Academic は月次3,000語リセット、Free は日次5語リセット)
  IF v_now >= v_profile.quota_reset_at THEN
    v_profile.usage_count := 0;
    IF v_profile.plan IN ('pro', 'academic') THEN
      v_profile.quota_reset_at := (date_trunc('month', v_now) + INTERVAL '1 month');
    ELSE
      v_profile.quota_reset_at := (date_trunc('day', v_now) + INTERVAL '1 day');
    END IF;
  END IF;

  -- [P0-3 解決] サブスクリプション期限切れ＆猶予期間（Grace Period）満了の厳格判定
  IF v_profile.plan = 'pro' AND v_profile.current_period_end IS NOT NULL THEN
    IF v_now > v_profile.current_period_end AND (v_profile.grace_period_until IS NULL OR v_now > v_profile.grace_period_until) THEN
      v_profile.plan := 'free';
      v_profile.monthly_quota := 5;
      v_profile.usage_count := 0;
      v_profile.quota_reset_at := (date_trunc('day', v_now) + INTERVAL '1 day');
      v_profile.subscription_status := 'canceled';
      v_profile.cancel_at_period_end := FALSE;
    END IF;
  END IF;

  -- プラン別の上限決定（Proプランにもフェアユース上限 pro_monthly_cap を適用し赤字爆弾を防止）
  IF v_profile.plan IN ('pro', 'academic') THEN
    v_effective_limit := v_profile.pro_monthly_cap;
  ELSE
    v_effective_limit := v_profile.monthly_quota;
  END IF;

  -- A. 補償返還（AI呼び出し失敗時の払い戻し）モード
  IF p_is_refund THEN
    v_profile.usage_count := GREATEST(0, v_profile.usage_count - p_item_count);
    UPDATE public.profiles
    SET usage_count = v_profile.usage_count,
        plan = v_profile.plan,
        monthly_quota = v_profile.monthly_quota,
        subscription_status = v_profile.subscription_status,
        cancel_at_period_end = v_profile.cancel_at_period_end,
        quota_reset_at = v_profile.quota_reset_at,
        updated_at = v_now
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
      'allowed', true,
      'action', 'refunded',
      'plan', v_profile.plan,
      'usage_count', v_profile.usage_count,
      'effective_limit', v_effective_limit,
      'remaining', GREATEST(0, v_effective_limit - v_profile.usage_count)
    );
  END IF;

  -- B. 事前予約（Reserve）モード：上限超過チェック
  IF (v_profile.usage_count + p_item_count) > v_effective_limit THEN
    UPDATE public.profiles
    SET usage_count = v_profile.usage_count,
        plan = v_profile.plan,
        monthly_quota = v_profile.monthly_quota,
        subscription_status = v_profile.subscription_status,
        cancel_at_period_end = v_profile.cancel_at_period_end,
        quota_reset_at = v_profile.quota_reset_at,
        updated_at = v_now
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
      'allowed', false,
      'action', 'rejected_quota_exceeded',
      'plan', v_profile.plan,
      'usage_count', v_profile.usage_count,
      'effective_limit', v_effective_limit,
      'remaining', GREATEST(0, v_effective_limit - v_profile.usage_count)
    );
  END IF;

  -- 枠を即座に仮引き落とし（Reserve）して確定
  v_profile.usage_count := v_profile.usage_count + p_item_count;

  UPDATE public.profiles
  SET usage_count = v_profile.usage_count,
      plan = v_profile.plan,
      monthly_quota = v_profile.monthly_quota,
      subscription_status = v_profile.subscription_status,
      cancel_at_period_end = v_profile.cancel_at_period_end,
      quota_reset_at = v_profile.quota_reset_at,
      updated_at = v_now
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'action', 'reserved',
    'plan', v_profile.plan,
    'usage_count', v_profile.usage_count,
    'effective_limit', v_effective_limit,
    'remaining', GREATEST(0, v_effective_limit - v_profile.usage_count)
  );
END;
$$;

-- [P0-1 解決] 一般ユーザーからの直接RPC呼び出しを完全遮断し、service_role のみに限定
REVOKE ALL ON FUNCTION public.reserve_or_refund_quota(UUID, INTEGER, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_or_refund_quota(UUID, INTEGER, BOOLEAN) TO service_role;

-- 旧関数の安全な廃止
DROP FUNCTION IF EXISTS public.check_and_consume_quota(UUID, INTEGER, BOOLEAN);


-- ==============================================================================
-- [P0-6 解決] 未ログイン・ゲストユーザー用のアトミックな日次クォータ消費関数
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.consume_guest_quota(
  p_ip TEXT,
  p_count INTEGER,
  p_daily_limit INTEGER DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_tomorrow TIMESTAMPTZ := (date_trunc('day', v_now) + INTERVAL '1 day');
  v_rec public.guest_rate_limits%ROWTYPE;
  v_current_usage INTEGER := 0;
BEGIN
  IF p_ip IS NULL OR length(trim(p_ip)) = 0 THEN
    p_ip := 'unknown_guest';
  END IF;

  -- 境界値ガード（-15語の返還〜+15語の消費）
  IF p_count IS NULL OR p_count = 0 OR p_count > 15 OR p_count < -15 THEN
    RAISE EXCEPTION 'INVALID_GUEST_COUNT: %', p_count;
  END IF;

  -- 行ロック付きで取得
  SELECT * INTO v_rec FROM public.guest_rate_limits WHERE ip = p_ip FOR UPDATE;

  IF NOT FOUND THEN
    IF p_count < 0 THEN
      -- レコードが存在しない場合の返金は0として初期化
      INSERT INTO public.guest_rate_limits (ip, usage_count, reset_at, updated_at)
      VALUES (p_ip, 0, v_tomorrow, v_now)
      ON CONFLICT (ip) DO NOTHING;
      RETURN jsonb_build_object('allowed', true, 'usage_count', 0, 'remaining', p_daily_limit);
    END IF;

    IF p_count > p_daily_limit THEN
      RETURN jsonb_build_object('allowed', false, 'usage_count', 0, 'remaining', 0);
    END IF;

    INSERT INTO public.guest_rate_limits (ip, usage_count, reset_at, updated_at)
    VALUES (p_ip, p_count, v_tomorrow, v_now)
    ON CONFLICT (ip) DO UPDATE
    SET usage_count = public.guest_rate_limits.usage_count + EXCLUDED.usage_count,
        updated_at = v_now;

    RETURN jsonb_build_object('allowed', true, 'usage_count', p_count, 'remaining', GREATEST(0, p_daily_limit - p_count));
  END IF;

  -- 日付リセット判定
  IF v_now >= v_rec.reset_at THEN
    v_rec.usage_count := 0;
    v_rec.reset_at := v_tomorrow;
  END IF;

  -- 返金（負数）の場合
  IF p_count < 0 THEN
    v_current_usage := GREATEST(0, v_rec.usage_count + p_count);
    UPDATE public.guest_rate_limits
    SET usage_count = v_current_usage,
        updated_at = v_now
    WHERE ip = p_ip;
    RETURN jsonb_build_object('allowed', true, 'usage_count', v_current_usage, 'remaining', GREATEST(0, p_daily_limit - v_current_usage));
  END IF;

  -- 通常消費（正数）の場合
  IF (v_rec.usage_count + p_count) > p_daily_limit THEN
    RETURN jsonb_build_object('allowed', false, 'usage_count', v_rec.usage_count, 'remaining', GREATEST(0, p_daily_limit - v_rec.usage_count));
  END IF;

  v_current_usage := v_rec.usage_count + p_count;

  UPDATE public.guest_rate_limits
  SET usage_count = v_current_usage,
      reset_at = v_rec.reset_at,
      updated_at = v_now
  WHERE ip = p_ip;

  RETURN jsonb_build_object('allowed', true, 'usage_count', v_current_usage, 'remaining', GREATEST(0, p_daily_limit - v_current_usage));
END;
$$;

REVOKE ALL ON FUNCTION public.consume_guest_quota(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_guest_quota(TEXT, INTEGER, INTEGER) TO service_role;


-- ============================================================================
-- [P0-3 解決] アトミック＆順序逆転耐性付き Stripe Webhook 処理関数
-- ============================================================================
CREATE OR REPLACE FUNCTION public.process_stripe_webhook_atomic(
  p_event_id TEXT,
  p_event_type TEXT,
  p_event_created BIGINT,
  p_user_id UUID,
  p_stripe_customer_id TEXT,
  p_stripe_subscription_id TEXT,
  p_plan TEXT,
  p_subscription_status TEXT,
  p_cancel_at_period_end BOOLEAN,
  p_current_period_end TIMESTAMPTZ,
  p_grace_period_until TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_user_id UUID;
  v_last_created BIGINT;
  v_cur_status TEXT;
  v_cur_sub_id TEXT;
BEGIN
  IF p_event_id IS NULL OR length(trim(p_event_id)) = 0 THEN
    RAISE EXCEPTION 'INVALID_EVENT_ID';
  END IF;

  -- 1. 冪等性チェック（単一トランザクション内でINSERT、重複なら何もせず正常終了）
  INSERT INTO public.stripe_events (id, event_type, processed_at)
  VALUES (p_event_id, p_event_type, NOW())
  ON CONFLICT (id) DO NOTHING;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'duplicate_ignored', 'event_id', p_event_id);
  END IF;

  -- 2. 対象ユーザーの特定（user_id または stripe_customer_id から逆引き）
  IF p_user_id IS NOT NULL THEN
    SELECT id, stripe_last_event_created, subscription_status, stripe_subscription_id
    INTO v_target_user_id, v_last_created, v_cur_status, v_cur_sub_id
    FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  ELSE
    SELECT id, stripe_last_event_created, subscription_status, stripe_subscription_id
    INTO v_target_user_id, v_last_created, v_cur_status, v_cur_sub_id
    FROM public.profiles WHERE stripe_customer_id = p_stripe_customer_id FOR UPDATE;
  END IF;

  IF v_target_user_id IS NULL THEN
    -- user_id も stripe_customer_id も指定されていないイベントは無視
    IF p_user_id IS NULL AND (p_stripe_customer_id IS NULL OR length(trim(p_stripe_customer_id)) = 0) THEN
      RETURN jsonb_build_object('status', 'unassociated_event_skipped', 'event_id', p_event_id);
    END IF;

    -- [P1-3 完全解決] checkout.session.completed 以外のイベント（subscription.updated, invoice.paid 等）で
    -- プロフィールが見つからない場合は、退会済みアカウントの遅延イベントであるため 500 再試行させず正常終了
    IF p_event_type <> 'checkout.session.completed' THEN
      RETURN jsonb_build_object(
        'status', 'user_not_found_ignored',
        'event_id', p_event_id,
        'event_type', p_event_type,
        'reason', 'profile_not_found_for_non_checkout_event'
      );
    END IF;

    -- auth.users を照合し、ユーザー自体が存在しない（退会済み）なら200で終了
    IF p_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
      RETURN jsonb_build_object('status', 'user_not_found_ignored', 'event_id', p_event_id, 'reason', 'user_account_deleted');
    END IF;

    -- 新規登録直後の checkout.session.completed レースコンディション時のみ再送させる
    RAISE EXCEPTION 'TARGET_PROFILE_NOT_FOUND: customer % / user % not ready, retry later', p_stripe_customer_id, p_user_id;
  END IF;

  -- [P1-3 解決] 旧サブスクリプションの遅延解約イベントによる有効サブスクの誤爆解約ガード
  IF p_event_type = 'customer.subscription.deleted' AND v_cur_sub_id IS NOT NULL AND p_stripe_subscription_id IS NOT NULL AND v_cur_sub_id <> p_stripe_subscription_id THEN
    RETURN jsonb_build_object(
      'status', 'mismatched_subscription_ignored',
      'event_id', p_event_id,
      'current_subscription_id', v_cur_sub_id,
      'event_subscription_id', p_stripe_subscription_id
    );
  END IF;

  -- [P1-2 解決] 既存のアクティブな別サブスクリプションに対する古い deleted/updated イベントを無視
  IF v_cur_status IN ('active', 'trialing')
     AND p_subscription_status IN ('canceled', 'unpaid', 'incomplete_expired')
     AND p_stripe_subscription_id IS NOT NULL THEN
    PERFORM 1 FROM public.profiles
    WHERE id = v_target_user_id
      AND stripe_subscription_id IS NOT NULL
      AND stripe_subscription_id != p_stripe_subscription_id;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'status', 'stale_subscription_event_ignored',
        'event_id', p_event_id
      );
    END IF;
  END IF;

  -- 3. イベント順序逆転（Out-of-Order Delivery）ガード
  -- 既に処理済みのより新しいイベントが存在する場合は、プロフィールの状態巻き戻しをスキップ
  IF p_event_created < v_last_created THEN
    RETURN jsonb_build_object(
      'status', 'out_of_order_skipped',
      'event_id', p_event_id,
      'event_created', p_event_created,
      'last_event_created', v_last_created
    );
  END IF;

  -- [P2-1 解決] 同秒着信時の解約状態保護（解約・停止済みアカウントの不正巻き戻し防止）
  IF p_event_created = v_last_created AND v_cur_status IN ('canceled', 'unpaid') AND p_subscription_status IN ('active', 'trialing') THEN
    RETURN jsonb_build_object(
      'status', 'same_second_canceled_preserved',
      'event_id', p_event_id
    );
  END IF;

  -- 4. プロフィール状態の更新（解約時は period_end と grace_period を確実にクリア）
  UPDATE public.profiles
  SET stripe_customer_id = COALESCE(p_stripe_customer_id, stripe_customer_id),
      stripe_subscription_id = COALESCE(p_stripe_subscription_id, stripe_subscription_id),
      plan = p_plan,
      monthly_quota = CASE WHEN p_plan = 'free' THEN 5 ELSE monthly_quota END,
      usage_count = CASE
        WHEN p_event_type IN ('checkout.session.completed', 'invoice.paid') OR (v_cur_status <> 'active' AND p_subscription_status = 'active') OR p_plan = 'free'
        THEN 0
        ELSE usage_count
      END,
      quota_reset_at = CASE
        WHEN p_plan = 'free' THEN (date_trunc('day', NOW()) + INTERVAL '1 day')
        WHEN p_event_type IN ('checkout.session.completed', 'invoice.paid') THEN (date_trunc('month', NOW()) + INTERVAL '1 month')
        ELSE quota_reset_at
      END,
      subscription_status = p_subscription_status,
      cancel_at_period_end = COALESCE(p_cancel_at_period_end, cancel_at_period_end),
      current_period_end = CASE
        WHEN p_subscription_status = 'canceled' THEN NULL
        ELSE COALESCE(p_current_period_end, current_period_end)
      END,
      grace_period_until = CASE
        WHEN p_subscription_status IN ('active', 'canceled') THEN NULL
        ELSE p_grace_period_until
      END,
      stripe_last_event_created = p_event_created,
      updated_at = NOW()
  WHERE id = v_target_user_id;

  RETURN jsonb_build_object(
    'status', 'processed',
    'user_id', v_target_user_id,
    'plan', p_plan,
    'subscription_status', p_subscription_status
  );
END;
$$;

REVOKE ALL ON FUNCTION public.process_stripe_webhook_atomic(TEXT, TEXT, BIGINT, UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_stripe_webhook_atomic(TEXT, TEXT, BIGINT, UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ, TIMESTAMPTZ) TO service_role;


-- ============================================================================
-- [P0-2 解決] 端末時計ズレ防止 & カラムグループ別マージ対応 差分同期RPC (直書き排除・アトミック実行)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_vocab_entries_batch(
  p_entries JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_server_now BIGINT := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  v_upserted_count INTEGER := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED: auth.uid() is null';
  END IF;

  IF p_entries IS NULL OR jsonb_typeof(p_entries) != 'array' THEN
    RAISE EXCEPTION 'INVALID_PAYLOAD: p_entries must be a JSON array';
  END IF;

  IF jsonb_array_length(p_entries) > 500 THEN
    RAISE EXCEPTION 'PAYLOAD_TOO_LARGE: maximum 500 entries per sync batch';
  END IF;

  WITH input_rows AS (
    SELECT
      v_uid AS user_id,
      (elem->>'id')::TEXT AS id,
      (elem->>'lang')::TEXT AS lang,
      COALESCE(NULLIF(elem->>'pair', ''), (elem->>'lang')::TEXT || '_ja') AS pair,
      (elem->>'word_key')::TEXT AS word_key,
      CASE 
        WHEN (elem->>'num') ~ '^[0-9]+(\.[0-9]+)?$' 
        THEN GREATEST(1, trunc((elem->>'num')::NUMERIC)::INTEGER)
        ELSE 1 
      END AS num,
      (elem->>'word')::TEXT AS word,
      CASE 
        WHEN (elem->>'homograph_index') ~ '^[0-9]+(\.[0-9]+)?$' 
        THEN GREATEST(1, trunc((elem->>'homograph_index')::NUMERIC)::INTEGER)
        ELSE 1 
      END AS homograph_index,
      (elem->>'folder')::TEXT AS folder,
      -- [P0-2 修正] category の欠落を解消し、未指定時は 'その他'
      COALESCE(NULLIF(elem->>'category', ''), 'その他') AS category,
      -- [P1-1 解決] PostgreSQL NUMERIC 型への NaN / Infinity 伝播を完全無害化
      -- [P0-1 完全保護] interval と efactor にも数値正規表現チェックを適用
      CASE
        WHEN (elem->>'interval') ~ '^-?[0-9]+(\.[0-9]+)?$'
        THEN GREATEST(0, (elem->>'interval')::NUMERIC)
        ELSE 0
      END AS interval,
      CASE 
        WHEN (elem->>'repetition') ~ '^[0-9]+(\.[0-9]+)?$' 
        THEN GREATEST(0, trunc((elem->>'repetition')::NUMERIC)::INTEGER)
        ELSE 0 
      END AS repetition,
      CASE
        WHEN (elem->>'efactor') ~ '^-?[0-9]+(\.[0-9]+)?$'
        THEN GREATEST(1.3, (elem->>'efactor')::NUMERIC)
        ELSE 2.5
      END AS efactor,
      -- [P0-2 修正] 小数の next_review で全バッチが落ちるのを防ぐ正規表現チェック & 切り捨て
      CASE 
        WHEN (elem->>'next_review') ~ '^-?[0-9]+(\.[0-9]+)?$' 
        THEN trunc((elem->>'next_review')::NUMERIC)::BIGINT 
        ELSE v_server_now 
      END AS next_review,
      COALESCE(elem->'card_data', '{}'::JSONB) AS card_data,
      -- クライアント時計が未来にズレていても server_now + 60秒 でクランプ（Clock Skew対策）
      LEAST(
        CASE 
          WHEN (elem->>'updated_at') ~ '^-?[0-9]+(\.[0-9]+)?$' 
          THEN trunc((elem->>'updated_at')::NUMERIC)::BIGINT 
          ELSE v_server_now 
        END,
        v_server_now + 60000
      ) AS updated_at,
      LEAST(
        CASE 
          WHEN (elem->>'review_updated_at') ~ '^-?[0-9]+(\.[0-9]+)?$' 
          THEN trunc((elem->>'review_updated_at')::NUMERIC)::BIGINT 
          ELSE v_server_now 
        END,
        v_server_now + 60000
      ) AS review_updated_at,
      COALESCE((elem->>'is_deleted')::BOOLEAN, FALSE) AS is_deleted
    FROM jsonb_array_elements(p_entries) AS elem
    WHERE elem->>'id' IS NOT NULL 
      AND elem->>'lang' IN ('en', 'ja', 'fr', 'de')
      -- [P0-3 解決] ストレージ枯渇攻撃（巨大文字列・巨大JSONBペイロード注入）を遮断
      AND length(COALESCE(elem->>'word', '')) <= 255
      AND length(COALESCE(elem->'card_data', '{}'::JSONB)::TEXT) <= 50000
  ),
  upserted AS (
    INSERT INTO public.user_vocab_entries (
      user_id, id, lang, pair, word_key, num, word, homograph_index,
      folder, category, interval, repetition, efactor, next_review,
      card_data, updated_at, review_updated_at, is_deleted, server_updated_at
    )
    SELECT
      user_id, id, lang, pair, word_key, num, word, homograph_index,
      folder, category, interval, repetition, efactor, next_review,
      card_data, updated_at, review_updated_at, is_deleted, v_server_now
    FROM input_rows
    ON CONFLICT (user_id, id) DO UPDATE
    SET
      pair = CASE WHEN EXCLUDED.updated_at >= user_vocab_entries.updated_at THEN EXCLUDED.pair ELSE user_vocab_entries.pair END,
      word_key = CASE WHEN EXCLUDED.updated_at >= user_vocab_entries.updated_at THEN EXCLUDED.word_key ELSE user_vocab_entries.word_key END,
      word = CASE WHEN EXCLUDED.updated_at >= user_vocab_entries.updated_at THEN EXCLUDED.word ELSE user_vocab_entries.word END,
      folder = CASE WHEN EXCLUDED.updated_at >= user_vocab_entries.updated_at THEN EXCLUDED.folder ELSE user_vocab_entries.folder END,
      category = CASE WHEN EXCLUDED.updated_at >= user_vocab_entries.updated_at THEN EXCLUDED.category ELSE user_vocab_entries.category END,
      is_deleted = CASE WHEN EXCLUDED.updated_at >= user_vocab_entries.updated_at THEN EXCLUDED.is_deleted ELSE user_vocab_entries.is_deleted END,
      -- カード内容・フォルダ・削除状態は updated_at が新しい方を採用しつつ、非競合JSONBキーを欠落させない双方向マージ
      card_data = (
        CASE 
          WHEN EXCLUDED.updated_at >= user_vocab_entries.updated_at 
          THEN user_vocab_entries.card_data || EXCLUDED.card_data 
          ELSE EXCLUDED.card_data || user_vocab_entries.card_data 
        END
      ) || jsonb_strip_nulls(jsonb_build_object(
        'interval', CASE WHEN EXCLUDED.review_updated_at >= user_vocab_entries.review_updated_at THEN EXCLUDED.interval ELSE user_vocab_entries.interval END,
        'repetition', CASE WHEN EXCLUDED.review_updated_at >= user_vocab_entries.review_updated_at THEN EXCLUDED.repetition ELSE user_vocab_entries.repetition END,
        'efactor', CASE WHEN EXCLUDED.review_updated_at >= user_vocab_entries.review_updated_at THEN EXCLUDED.efactor ELSE user_vocab_entries.efactor END,
        'nextReview', CASE WHEN EXCLUDED.review_updated_at >= user_vocab_entries.review_updated_at THEN EXCLUDED.next_review ELSE user_vocab_entries.next_review END,
        'reviewUpdatedAt', GREATEST(user_vocab_entries.review_updated_at, EXCLUDED.review_updated_at),
        'stability', CASE WHEN EXCLUDED.review_updated_at >= user_vocab_entries.review_updated_at THEN EXCLUDED.card_data->'stability' ELSE user_vocab_entries.card_data->'stability' END,
        'difficulty', CASE WHEN EXCLUDED.review_updated_at >= user_vocab_entries.review_updated_at THEN EXCLUDED.card_data->'difficulty' ELSE user_vocab_entries.card_data->'difficulty' END,
        'retrievability', CASE WHEN EXCLUDED.review_updated_at >= user_vocab_entries.review_updated_at THEN EXCLUDED.card_data->'retrievability' ELSE user_vocab_entries.card_data->'retrievability' END
      )),
      updated_at = GREATEST(user_vocab_entries.updated_at, EXCLUDED.updated_at),
      -- SM-2復習進捗は review_updated_at が新しい方を独立して採用（Macでのフォルダ移動でスマホの学習履歴が消えるのを防ぐ）
      interval = CASE WHEN EXCLUDED.review_updated_at >= user_vocab_entries.review_updated_at THEN EXCLUDED.interval ELSE user_vocab_entries.interval END,
      repetition = CASE WHEN EXCLUDED.review_updated_at >= user_vocab_entries.review_updated_at THEN EXCLUDED.repetition ELSE user_vocab_entries.repetition END,
      efactor = CASE WHEN EXCLUDED.review_updated_at >= user_vocab_entries.review_updated_at THEN EXCLUDED.efactor ELSE user_vocab_entries.efactor END,
      next_review = CASE WHEN EXCLUDED.review_updated_at >= user_vocab_entries.review_updated_at THEN EXCLUDED.next_review ELSE user_vocab_entries.next_review END,
      review_updated_at = GREATEST(user_vocab_entries.review_updated_at, EXCLUDED.review_updated_at),
      -- サーバー同期タイムスタンプは常に現在のサーバー時刻で更新
      server_updated_at = v_server_now
    WHERE EXCLUDED.updated_at >= user_vocab_entries.updated_at
       OR EXCLUDED.review_updated_at >= user_vocab_entries.review_updated_at
    RETURNING 1
  )
  SELECT count(*) INTO v_upserted_count FROM upserted;

  RETURN jsonb_build_object(
    'upserted_count', v_upserted_count,
    'server_timestamp', v_server_now
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sync_vocab_entries_batch(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_vocab_entries_batch(JSONB) TO authenticated, service_role;



-- ==============================================================================
-- ユーザー自己退会・全データ抹消用ストアドプロシージャ（GDPR / 法令対応）
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.delete_user_account(
  p_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := COALESCE(auth.uid(), p_user_id);
  v_status TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- [P0-4 解決] Stripeアクティブ定期課金の残留チェック（幽霊課金防止）
  SELECT subscription_status INTO v_status FROM public.profiles WHERE id = v_uid;
  IF v_status IN ('active', 'trialing') THEN
    RAISE EXCEPTION 'ACTIVE_SUBSCRIPTION: Stripe定期課金が有効な状態です。Stripeカスタマーポータルまたはdelete-account APIから解約の上、退会してください。';
  END IF;

  -- 関連データの抹消
  DELETE FROM public.user_vocab_entries WHERE user_id = v_uid;
  DELETE FROM public.user_tombstones WHERE user_id = v_uid;
  DELETE FROM public.user_lang_watermarks WHERE user_id = v_uid;
  DELETE FROM public.user_feedbacks WHERE user_id = v_uid;
  DELETE FROM public.profiles WHERE id = v_uid;

  -- auth.users からの削除
  DELETE FROM auth.users WHERE id = v_uid;

  RETURN TRUE;
END;
$$;

-- [P1-5 修正] authenticated からの直接RPC実行を剥奪し、Stripe定期課金解約を伴う Edge Function (delete-account) 経由に限定
REVOKE ALL ON FUNCTION public.delete_user_account(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO service_role;


-- ==============================================================================
-- [P0-4 解決] user_tombstones に記録された削除を user_vocab_entries に自動反映するトリガー
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sync_tombstone_to_entries()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id TEXT;
BEGIN
  IF NEW.tomb_key LIKE 'id:%' THEN
    v_entry_id := substring(NEW.tomb_key FROM 4);
    UPDATE public.user_vocab_entries
    SET is_deleted = TRUE,
        updated_at = GREATEST(updated_at, NEW.deleted_at),
        server_updated_at = (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT
    WHERE user_id = NEW.user_id
      AND id = v_entry_id
      AND updated_at <= (NEW.deleted_at + 60000);
  ELSIF NEW.tomb_key LIKE 'wk:%' THEN
    UPDATE public.user_vocab_entries
    SET is_deleted = TRUE,
        updated_at = GREATEST(updated_at, NEW.deleted_at),
        server_updated_at = (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT
    WHERE user_id = NEW.user_id
      AND pair = NEW.pair
      AND word_key = substring(NEW.tomb_key FROM 4)
      AND updated_at <= (NEW.deleted_at + 60000);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_tombstone_to_entries ON public.user_tombstones;
CREATE TRIGGER trg_sync_tombstone_to_entries
  AFTER INSERT OR UPDATE ON public.user_tombstones
  FOR EACH ROW EXECUTE FUNCTION public.sync_tombstone_to_entries();

-- [DEEP-P0-1 解決] user_tombstones と user_lang_watermarks の未来時刻汚染（Clock Skew）防止トリガー
CREATE OR REPLACE FUNCTION public.clamp_sync_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_allowed BIGINT := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT + 60000;
BEGIN
  IF TG_TABLE_NAME = 'user_tombstones' THEN
    NEW.deleted_at := LEAST(GREATEST(0, NEW.deleted_at), v_max_allowed);
  ELSIF TG_TABLE_NAME = 'user_lang_watermarks' THEN
    NEW.cleared_at := LEAST(GREATEST(0, NEW.cleared_at), v_max_allowed);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clamp_tombstone_ts ON public.user_tombstones;
CREATE TRIGGER trg_clamp_tombstone_ts
  BEFORE INSERT OR UPDATE ON public.user_tombstones
  FOR EACH ROW EXECUTE FUNCTION public.clamp_sync_timestamps();

DROP TRIGGER IF EXISTS trg_clamp_watermark_ts ON public.user_lang_watermarks;
CREATE TRIGGER trg_clamp_watermark_ts
  BEFORE INSERT OR UPDATE ON public.user_lang_watermarks
  FOR EACH ROW EXECUTE FUNCTION public.clamp_sync_timestamps();



-- ==============================================================================
-- [P0-3 解決] user_lang_watermarks の全削除を user_vocab_entries に自動反映するトリガー
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sync_watermark_to_entries()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.cleared_at > 0 THEN
    UPDATE public.user_vocab_entries
    SET is_deleted = TRUE,
        updated_at = GREATEST(updated_at, NEW.cleared_at),
        server_updated_at = (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT
    WHERE user_id = NEW.user_id
      AND pair = NEW.pair
      AND updated_at <= NEW.cleared_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_watermark_to_entries ON public.user_lang_watermarks;
CREATE TRIGGER trg_sync_watermark_to_entries
  AFTER INSERT OR UPDATE ON public.user_lang_watermarks
  FOR EACH ROW EXECUTE FUNCTION public.sync_watermark_to_entries();



-- ==============================================================================
-- [P0-1 解決] 期限切れ墓石レコードの自動ガベージコレクション（TTL 30日/90日対応・権限完全遮断）
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.purge_expired_tombstones(p_ttl_days INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff_ms BIGINT;
  v_deleted_count INTEGER;
BEGIN
  -- [P0-1 修正] 負数や30日未満の異常値による全データ破壊・ゾンビ復活攻撃を遮断
  IF p_ttl_days IS NULL OR p_ttl_days < 30 THEN
    RAISE EXCEPTION 'INVALID_TTL: p_ttl_days must be at least 30 days (received: %)', p_ttl_days;
  END IF;

  -- ミリ秒タイムスタンプのカットオフ
  v_cutoff_ms := (EXTRACT(EPOCH FROM (NOW() - (p_ttl_days || ' days')::INTERVAL)) * 1000)::BIGINT;

  -- user_tombstones テーブルから期限切れ墓石をパージ
  DELETE FROM public.user_tombstones
  WHERE deleted_at < v_cutoff_ms;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- user_vocab_entries の論理削除墓石 (is_deleted = true) もパージ
  DELETE FROM public.user_vocab_entries
  WHERE is_deleted = TRUE
    AND updated_at < v_cutoff_ms;

  RETURN v_deleted_count;
END;
$$;

-- [P0-1 解決] 一般ユーザーおよび匿名ユーザーからの実行権限を完全に剥奪し、service_role のみに限定
REVOKE ALL ON FUNCTION public.purge_expired_tombstones(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_tombstones(INTEGER) TO service_role;


-- ==============================================================================
-- [P0-3 解決] クライアント時計依存を排除するサーバーミリ秒取得RPC
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.server_now_ms()
RETURNS BIGINT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
$$;

GRANT EXECUTE ON FUNCTION public.server_now_ms() TO anon, authenticated, service_role;

-- [P0-1 解決] 今後の関数にも波及しないよう、スキーマ全体の既定関数実行権限も剥奪
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

