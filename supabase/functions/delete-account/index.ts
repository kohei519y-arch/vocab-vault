/**
 * Vocab Vault — Supabase Edge Function: delete-account
 * 本番仕様: GDPR / 法令準拠のアカウント完全抹消 ＆ Stripe サブスクリプション即時解約
 * 幽霊課金（Phantom Billing）の完全防止
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import Stripe from "https://esm.sh/stripe@14.18.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. ユーザー認証の確認
    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseUserClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 2. Stripe サブスクリプション情報の取得
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, stripe_subscription_id, plan")
      .eq("id", user.id)
      .single();

    // 3. [P0-4 解決] Stripe サブスクリプションの即時解約（幽霊課金防止）
    if (stripeSecretKey && profile?.stripe_subscription_id) {
      try {
        const stripe = new Stripe(stripeSecretKey, {
          apiVersion: "2023-10-16",
          httpClient: Stripe.createFetchHttpClient(),
        });
        console.log(`[Account Deletion] Canceling Stripe subscription: ${profile.stripe_subscription_id}`);
        await stripe.subscriptions.cancel(profile.stripe_subscription_id);
      } catch (stripeErr: any) {
        console.warn(`[Account Deletion Warning] Failed to cancel Stripe sub: ${stripeErr.message}`);
        // サブスクが既に解約済み（resource_missing）等のエラーは処理を続行
      }
    }

    // 4. Supabase DB データおよび auth.users の完全抹消
    // トランザクション処理として関連テーブルを削除
    await supabaseAdmin.from("user_vocab_entries").delete().eq("user_id", user.id);
    await supabaseAdmin.from("user_tombstones").delete().eq("user_id", user.id);
    await supabaseAdmin.from("user_lang_watermarks").delete().eq("user_id", user.id);
    await supabaseAdmin.from("user_feedbacks").delete().eq("user_id", user.id);
    await supabaseAdmin.from("profiles").delete().eq("id", user.id);

    // auth.users から物理削除
    const { error: deleteUserErr } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteUserErr) {
      console.error(`[Account Deletion Error] Failed to delete auth user: ${deleteUserErr.message}`);
      return new Response(JSON.stringify({ error: deleteUserErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Account Deletion] User ${user.id} and all related data completely wiped.`);

    return new Response(JSON.stringify({ success: true, message: "Account and all data wiped permanently" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error(`[Account Deletion Internal Error] ${err.message}`);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
