-- Drop duplicate unique indexes redundant with primary keys,
-- move SECURITY DEFINER admin helpers to non-exposed private schema,
-- and ensure atomic delete_user_account exists for service_role only.

DROP INDEX IF EXISTS public.uq_user_tombstones_user_pair_key;
DROP INDEX IF EXISTS public.uq_user_lang_watermarks_user_pair;
DROP INDEX IF EXISTS public.uq_user_app_settings_key;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_is_admin BOOLEAN := FALSE;
  v_jwt JSONB := COALESCE(auth.jwt(), '{}'::JSONB);
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  IF COALESCE(v_jwt->'app_metadata'->>'role', '') = 'admin'
     OR LOWER(COALESCE(v_jwt->'app_metadata'->>'is_admin', 'false')) = 'true' THEN
    RETURN TRUE;
  END IF;

  SELECT COALESCE(is_admin, FALSE) INTO v_is_admin
  FROM public.profiles
  WHERE id = v_uid;

  RETURN COALESCE(v_is_admin, FALSE);
END;
$$;

REVOKE ALL ON FUNCTION private.is_current_user_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_current_user_admin() TO authenticated, service_role;

DROP POLICY IF EXISTS "Users can view own feedbacks" ON public.user_feedbacks;
CREATE POLICY "Users can view own feedbacks" ON public.user_feedbacks
  FOR SELECT USING ((select auth.uid()) = user_id OR private.is_current_user_admin());

DROP FUNCTION IF EXISTS public.is_current_user_admin();
DROP FUNCTION IF EXISTS public.get_admin_dashboard_metrics();

CREATE OR REPLACE FUNCTION private.get_admin_dashboard_metrics()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_total_users BIGINT := 0;
  v_pro_users BIGINT := 0;
  v_free_users BIGINT := 0;
  v_admin_users BIGINT := 0;
  v_today_ai_usage BIGINT := 0;
  v_total_vocab_entries BIGINT := 0;
  v_cache_entries BIGINT := 0;
  v_verified_cache_entries BIGINT := 0;
  v_total_cache_hits BIGINT := 0;
  v_wikt_refs BIGINT := 0;
  v_feedback_count BIGINT := 0;
  v_recent_feedbacks JSONB := '[]'::JSONB;
BEGIN
  IF COALESCE(auth.role(), '') <> 'service_role' AND NOT private.is_current_user_admin() THEN
    RAISE EXCEPTION 'FORBIDDEN_ADMIN_ONLY: Administrator privileges required.';
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE plan IN ('pro', 'academic')),
    COUNT(*) FILTER (WHERE plan = 'free'),
    COUNT(*) FILTER (WHERE COALESCE(is_admin, FALSE) = TRUE),
    COALESCE(SUM(CASE WHEN quota_reset_at > NOW() THEN usage_count ELSE 0 END), 0)
  INTO v_total_users, v_pro_users, v_free_users, v_admin_users, v_today_ai_usage
  FROM public.profiles;

  SELECT COUNT(*) INTO v_total_vocab_entries
  FROM public.user_vocab_entries
  WHERE is_deleted = FALSE;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE verified = TRUE),
    COALESCE(SUM(hit_count), 0)
  INTO v_cache_entries, v_verified_cache_entries, v_total_cache_hits
  FROM public.global_dictionary_cache;

  SELECT COUNT(*) INTO v_wikt_refs FROM public.wiktionary_references;
  SELECT COUNT(*) INTO v_feedback_count FROM public.user_feedbacks;

  SELECT COALESCE(jsonb_agg(row_to_json(f)), '[]'::JSONB)
  INTO v_recent_feedbacks
  FROM (
    SELECT id, category, rating, content, willingness_to_pay, active_lang, created_at
    FROM public.user_feedbacks
    ORDER BY created_at DESC
    LIMIT 10
  ) f;

  RETURN jsonb_build_object(
    'total_users', v_total_users,
    'pro_users', v_pro_users,
    'free_users', v_free_users,
    'admin_users', v_admin_users,
    'today_ai_usage', v_today_ai_usage,
    'total_vocab_entries', v_total_vocab_entries,
    'cache_entries', v_cache_entries,
    'verified_cache_entries', v_verified_cache_entries,
    'total_cache_hits', v_total_cache_hits,
    'wiktionary_refs', v_wikt_refs,
    'feedback_count', v_feedback_count,
    'recent_feedbacks', v_recent_feedbacks,
    'fetched_at', NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION private.get_admin_dashboard_metrics() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.get_admin_dashboard_metrics() TO service_role;

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

  SELECT subscription_status INTO v_status FROM public.profiles WHERE id = v_uid;
  IF v_status IN ('active', 'trialing') THEN
    RAISE EXCEPTION 'ACTIVE_SUBSCRIPTION: Active Stripe subscription detected.';
  END IF;

  DELETE FROM public.user_vocab_entries WHERE user_id = v_uid;
  DELETE FROM public.user_tombstones WHERE user_id = v_uid;
  DELETE FROM public.user_lang_watermarks WHERE user_id = v_uid;
  DELETE FROM public.user_feedbacks WHERE user_id = v_uid;
  DELETE FROM public.user_app_settings WHERE user_id = v_uid;
  DELETE FROM public.profiles WHERE id = v_uid;
  DELETE FROM auth.users WHERE id = v_uid;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO service_role;
