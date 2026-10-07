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
    const { priceId = "price_pro_monthly", returnUrl } = body;

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // ユーザープロファイル確認（既存のstripe_customer_idがあるか）
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, email")
      .eq("id", user.id)
      .single();

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
    }

    const envPriceId = Deno.env.get("STRIPE_PRO_PRICE_ID") ?? "";
    const effectivePriceId = (priceId && priceId.startsWith("price_") && priceId !== "price_pro_monthly") 
      ? priceId 
      : (envPriceId || null);

    const lineItems = effectivePriceId
      ? [{ price: effectivePriceId, quantity: 1 }]
      : [
          {
            price_data: {
              currency: "jpy",
              product_data: {
                name: "Vocab Vault Pro プラン",
                description: "AI新規生成・概念史深掘り無制限、長文/画像OCR抽出無制限、複数端末リアルタイム同期",
              },
              unit_amount: 480,
              recurring: { interval: "month" },
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
      success_url: `${returnUrl || "https://vocabvault.app"}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl || "https://vocabvault.app"}?checkout=cancel`,
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
