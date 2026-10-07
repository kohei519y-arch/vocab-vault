-- ==============================================================================
-- Vocab Vault — 共有辞書キャッシュDB 有効化スクリプト
-- Supabase SQL Editorで1回「Run」を実行するだけで即座に稼働します
-- ==============================================================================

-- 1. global_dictionary_cache テーブル作成
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

-- 2. 高速検索インデックス
CREATE INDEX IF NOT EXISTS idx_gdc_lookup ON public.global_dictionary_cache (lang, word, homograph_index);
CREATE INDEX IF NOT EXISTS idx_gdc_lang_wordkey ON public.global_dictionary_cache (lang, word_key);

-- 3. RLS（セキュリティ）設定: 全ユーザー（未ログイン・ゲスト含む）読み取り許可、書込はService Role（Edge Function）のみ
ALTER TABLE public.global_dictionary_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read dictionary cache" ON public.global_dictionary_cache;
DROP POLICY IF EXISTS "Anyone can read dictionary cache" ON public.global_dictionary_cache;
CREATE POLICY "Anyone can read dictionary cache" ON public.global_dictionary_cache
  FOR SELECT TO authenticated, anon USING (true);

-- 4. ゲスト（未ログイン）レートリミット管理テーブル（1日30語まで・悪用対策）
CREATE TABLE IF NOT EXISTS public.guest_rate_limits (
  ip TEXT PRIMARY KEY,
  usage_count INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 day'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Service Role（Edge Function）のみアクセス可能な内部テーブル（一般ユーザーからの直接SELECT/INSERTは拒否）
ALTER TABLE public.guest_rate_limits ENABLE ROW LEVEL SECURITY;

