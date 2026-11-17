/**
 * Vocab Vault — Supabase Edge Function: feedback
 * ステップ0: フィードバック・ヒアリング応募受付
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

const feedbackRateMap = new Map<string, { count: number; resetAt: number }>();

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";
    const nowMs = Date.now();
    const bucket = feedbackRateMap.get(clientIp) || { count: 0, resetAt: nowMs + 60_000 };
    if (nowMs > bucket.resetAt) {
      bucket.count = 1;
      bucket.resetAt = nowMs + 60_000;
    } else {
      bucket.count++;
    }
    feedbackRateMap.set(clientIp, bucket);
    if (bucket.count > 10) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 認証情報があればユーザーID取得（匿名でも可）
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();
      if (token) {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) userId = user.id;
      }
    }

    const body = await req.json();
    const category = String(body?.category || "opinion").slice(0, 50);
    const parsedRating = Number(body?.rating);
    const rating = Number.isFinite(parsedRating) ? Math.min(5, Math.max(1, Math.round(parsedRating))) : 5;
    const content = typeof body?.content === "string" ? body.content.trim().slice(0, 5000) : "";
    const email = typeof body?.email === "string" && body.email.trim() ? body.email.trim().slice(0, 255) : null;
    const willingnessToPay = typeof body?.willingnessToPay === "string" ? body.willingnessToPay.slice(0, 50) : null;
    const appVersion = typeof body?.appVersion === "string" && body.appVersion.trim() ? body.appVersion.trim().slice(0, 50) : "unknown";
    const activeLang = typeof body?.activeLang === "string" && body.activeLang.trim() ? body.activeLang.trim().slice(0, 20) : "en";

    if (!content && !email) {
      return new Response(JSON.stringify({ error: "Feedback content or email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase.from("user_feedbacks").insert({
      user_id: userId,
      category,
      rating,
      content,
      email,
      willingness_to_pay: willingnessToPay,
      app_version: appVersion,
      active_lang: activeLang,
    }).select();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, feedback: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
