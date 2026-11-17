/**
 * Vocab Vault — Supabase Edge Function: admin-metrics
 * Server-verified admin telemetry endpoint (replaces direct public RPC exposure).
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const STATIC_ALLOWED_ORIGINS = new Set([
  "https://vocab-vault-six.vercel.app",
  "http://localhost:3000",
  "http://localhost:4173",
  "http://localhost:8080",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:4173",
  "http://127.0.0.1:8080",
]);

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false;
  if (STATIC_ALLOWED_ORIGINS.has(origin)) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  if (/^chrome-extension:\/\/[a-p]{32}$/i.test(origin)) return true;
  return false;
}

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = (req.headers.get("origin") || "").trim();
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin : "https://vocab-vault-six.vercel.app",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Server configuration missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.slice(7).trim();
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appMeta = (user.app_metadata || {}) as Record<string, unknown>;
    const metaAdmin = appMeta.role === "admin" || appMeta.is_admin === true;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (!metaAdmin && !profile?.is_admin) {
      return new Response(JSON.stringify({ error: "Forbidden: administrator privileges required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const todayIso = new Date().toISOString();
    const [profilesRes, vocabCountRes, cacheRes, wiktCountRes, feedbackRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("plan, is_admin, usage_count, quota_reset_at"),
      supabaseAdmin.from("user_vocab_entries").select("id", { count: "exact", head: true }).eq("is_deleted", false),
      supabaseAdmin.from("global_dictionary_cache").select("verified, hit_count"),
      supabaseAdmin.from("wiktionary_references").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("user_feedbacks")
        .select("id, category, rating, content, willingness_to_pay, active_lang, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const profiles = profilesRes.data || [];
    const cacheRows = cacheRes.data || [];
    const recentFeedbacks = (feedbackRes.data || []).map((f: any) => ({
      id: f.id,
      category: f.category,
      rating: f.rating,
      message: f.content,
      willingness_to_pay: f.willingness_to_pay,
      active_lang: f.active_lang,
      created_at: f.created_at,
    }));

    const metrics = {
      total_users: profiles.length,
      pro_users: profiles.filter((p: any) => p.plan === "pro" || p.plan === "academic").length,
      free_users: profiles.filter((p: any) => p.plan === "free").length,
      admin_users: profiles.filter((p: any) => Boolean(p.is_admin)).length,
      today_ai_usage: profiles.reduce((acc: number, p: any) => {
        return acc + (p.quota_reset_at && p.quota_reset_at > todayIso ? Number(p.usage_count || 0) : 0);
      }, 0),
      total_vocab_entries: vocabCountRes.count || 0,
      cache_entries: cacheRows.length,
      verified_cache_entries: cacheRows.filter((c: any) => Boolean(c.verified)).length,
      total_cache_hits: cacheRows.reduce((acc: number, c: any) => acc + Number(c.hit_count || 0), 0),
      wiktionary_refs: wiktCountRes.count || 0,
      feedback_count: recentFeedbacks.length,
      recent_feedbacks: recentFeedbacks,
      fetched_at: new Date().toISOString(),
    };

    const { count: totalFeedbackCount } = await supabaseAdmin
      .from("user_feedbacks")
      .select("id", { count: "exact", head: true });
    if (typeof totalFeedbackCount === "number") {
      metrics.feedback_count = totalFeedbackCount;
    }

    return new Response(JSON.stringify(metrics), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
