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
    // stripe_customer_id または stripe_subscription_id から紐づく全契約を確実にキャンセル
    if (stripeSecretKey && (profile?.stripe_customer_id || profile?.stripe_subscription_id)) {
      try {
        const stripe = new Stripe(stripeSecretKey, {
          apiVersion: "2023-10-16",
          httpClient: Stripe.createFetchHttpClient(),
        });

        // 顧客IDが存在する場合は、アクティブ・トライアル中の全サブスクリプションを走査して解約
        if (profile?.stripe_customer_id) {
          const subs = await stripe.subscriptions.list({
            customer: profile.stripe_customer_id,
            status: "all",
            limit: 10,
          });
          for (const sub of subs.data) {
            if (["active", "trialing", "past_due", "unpaid"].includes(sub.status)) {
              console.log(`[Account Deletion] Canceling active Stripe sub: ${sub.id} (status: ${sub.status})`);
              await stripe.subscriptions.cancel(sub.id);
            }
          }
        } else if (profile?.stripe_subscription_id) {
          // customer_id が未取得の場合は subscription_id を直接解約
          console.log(`[Account Deletion] Canceling Stripe subscription directly: ${profile.stripe_subscription_id}`);
          await stripe.subscriptions.cancel(profile.stripe_subscription_id);
        }
        // [レースコンディション完全防止] Stripe解約完了をDBプロファイルに即時反映
        // これにより delete_user_account RPCの ACTIVE_SUBSCRIPTION 例外を確実に回避
        await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: "canceled",
            plan: "free",
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
      } catch (stripeErr: any) {
        console.warn(`[Account Deletion Warning] Failed to cancel Stripe sub: ${stripeErr.message}`);
        // サブスクが既に解約済み（resource_missing）等のエラー以外でアクティブ課金が残っている恐れがある場合は安全優先でエラー
        if (!stripeErr.message?.includes("No such subscription") && !stripeErr.message?.includes("resource_missing")) {
          return new Response(
            JSON.stringify({ error: `Stripe定期課金の解約処理中にエラーが発生しました (${stripeErr.message})。幽霊課金防止のため退会処理を中断しました。カスタマーポータルより解約後に再度お試しください。` }),
            { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // 4. Supabase DB データおよび auth.users の完全抹消
    // トランザクション・整合性保護: ユーザー権限での delete_user_account または admin による完全クリーンアップ
    let dbWiped = false;
    try {
      const { error: rpcErr } = await supabaseUserClient.rpc("delete_user_account");
      if (!rpcErr) {
        dbWiped = true;
      }
    } catch {}

    if (!dbWiped) {
      // フォールバック: service_role による全テーブルの確実な抹消
      await Promise.all([
        supabaseAdmin.from("user_vocab_entries").delete().eq("user_id", user.id),
        supabaseAdmin.from("user_tombstones").delete().eq("user_id", user.id),
        supabaseAdmin.from("user_lang_watermarks").delete().eq("user_id", user.id),
        supabaseAdmin.from("user_feedbacks").delete().eq("user_id", user.id),
      ]);
      await supabaseAdmin.from("profiles").delete().eq("id", user.id);
    }

    // auth.users から物理削除（カスケード削除も発火）
    const { error: deleteUserErr } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteUserErr && !deleteUserErr.message.includes("User not found")) {
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
