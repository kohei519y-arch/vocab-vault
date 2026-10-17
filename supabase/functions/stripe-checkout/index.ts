/**
 * Vocab Vault — Supabase Edge Function: stripe-checkout
 * ステップ6: Stripe サブスクリプション決済セッション生成
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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ error: "Stripe secret key is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { priceId = "price_pro_monthly", returnUrl, currency = "jpy", interval = "month" } = body;

    // [セキュリティ修正] Open Redirect 防止: 許可されたオリジンまたは https URL のみ許可
    const ALLOWED_ORIGINS = [
      "https://vocabvault.app",
      "https://kohei519y-arch.github.io",
      "http://localhost:3000",
      "http://localhost:8080",
      "http://127.0.0.1:8080",
    ];
    let safeReturnUrl = "https://kohei519y-arch.github.io/vocab-vault/";
    if (typeof returnUrl === "string" && returnUrl.trim()) {
      try {
        const parsedUrl = new URL(returnUrl.trim());
        if (ALLOWED_ORIGINS.includes(parsedUrl.origin) || parsedUrl.origin.endsWith(".vercel.app")) {
          safeReturnUrl = `${parsedUrl.origin}${parsedUrl.pathname}`;
        }
      } catch {
        // 無効なURLはデフォルトへフォールバック
      }
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // ユーザープロファイル確認（既存の契約状態とstripe_customer_idがあるか）
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, email, plan, subscription_status")
      .eq("id", user.id)
      .single();

    if (profile?.plan === "pro" && ["active", "trialing"].includes(profile?.subscription_status || "")) {
      return new Response(
        JSON.stringify({ error: "既に有効なProプラン契約が存在します。設定画面の契約管理ポータルよりご確認ください。" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || profile?.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    } else {
      // Stripe 側に既に active / trialing のサブスクリプションが存在しないか直接検証（Webhook遅延時の二重課金防止）
      const existingSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 10,
      });
      const activeSub = existingSubs.data.find((s: any) => ["active", "trialing"].includes(s.status));
      if (activeSub) {
        return new Response(
          JSON.stringify({ error: "既に有効なStripeサブスクリプションが存在します。設定画面の契約管理ポータルよりご確認ください。" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const envPriceIdMonthly = Deno.env.get("STRIPE_PRO_PRICE_ID") ?? "";
    const envPriceIdYearly = Deno.env.get("STRIPE_PRO_PRICE_ID_YEARLY") ?? "";
    
    // クライアント主導のPriceID改ざん防止 & マルチカレンシー動的生成
    let selectedPriceId: string | null = null;
    const isYearly = interval === "year" || priceId === "price_pro_yearly" || (envPriceIdYearly && priceId === envPriceIdYearly);
    const isUsd = (currency || "").toLowerCase() === "usd";

    if (isYearly && envPriceIdYearly && priceId === envPriceIdYearly) {
      selectedPriceId = envPriceIdYearly;
    } else if (!isYearly && envPriceIdMonthly && priceId === envPriceIdMonthly) {
      selectedPriceId = envPriceIdMonthly;
    }

    const unitAmount = isUsd
      ? (isYearly ? 3900 : 399) // $39.00 / $3.99
      : (isYearly ? 4800 : 480); // ¥4,800 / ¥480
    const currencyCode = isUsd ? "usd" : "jpy";
    const productName = isUsd
      ? (isYearly ? "Vocab Vault Pro (Annual Plan)" : "Vocab Vault Pro (Monthly Plan)")
      : (isYearly ? "Vocab Vault Pro プラン (年額)" : "Vocab Vault Pro プラン (月額)");
    const productDesc = isUsd
      ? "Unlimited generative AI etymology, 2,000 academic roots catalog, real-time cross-device sync & full OCR extraction."
      : "AI新規生成・概念史深掘り無制限、長文/画像OCR抽出無制限、複数端末リアルタイム同期";

    const lineItems = selectedPriceId
      ? [{ price: selectedPriceId, quantity: 1 }]
      : [
          {
            price_data: {
              currency: currencyCode,
              product_data: {
                name: productName,
                description: productDesc,
              },
              unit_amount: unitAmount,
              recurring: { interval: isYearly ? "year" : "month" },
            },
            quantity: 1,
          },
        ];

    // Stripe Checkout Session 作成
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: user.id,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: lineItems,
      subscription_data: {
        metadata: { supabase_user_id: user.id, plan: "pro" },
      },
      metadata: { supabase_user_id: user.id, plan: "pro" },
      success_url: `${safeReturnUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${safeReturnUrl}?checkout=cancel`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Stripe Checkout creation failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
