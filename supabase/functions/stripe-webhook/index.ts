/**
 * Vocab Vault — Supabase Edge Function: stripe-webhook
 * 本番仕様: process_stripe_webhook_atomic による完全アトミック処理
 * 順序逆転ガード、invoice.payment_failed (Grace Period)、invoice.paid 対応
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import Stripe from "https://esm.sh/stripe@14.18.0?target=deno";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

    if (!stripeSecretKey || !stripeWebhookSecret) {
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing signature header", { status: 400 });
    }

    const body = await req.text();
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const eventCreated = event.created || Math.floor(Date.now() / 1000);

    let userId: string | null = null;
    let customerId: string | null = null;
    let subscriptionId: string | null = null;
    let plan = "free";
    let subStatus = "inactive";
    let cancelAtPeriodEnd = false;
    let periodEndIso: string | null = null;
    let gracePeriodUntilIso: string | null = null;

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        userId = session.client_reference_id || session.metadata?.supabase_user_id || null;
        customerId = (session.customer as string) || null;
        subscriptionId = (session.subscription as string) || null;
        plan = "pro";
        subStatus = "active";
        cancelAtPeriodEnd = false;

        if (subscriptionId) {
          try {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            subStatus = sub.status;
            if (sub.current_period_end) {
              periodEndIso = new Date(sub.current_period_end * 1000).toISOString();
            }
          } catch (e: any) {
            console.warn(`[Stripe] Could not fetch sub ${subscriptionId}:`, e.message);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        customerId = (subscription.customer as string) || null;
        subscriptionId = subscription.id;
        subStatus = subscription.status;
        cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);
        if (subscription.current_period_end) {
          periodEndIso = new Date(subscription.current_period_end * 1000).toISOString();
        }

        // active または trialing なら Pro
        if (subStatus === "active" || subStatus === "trialing") {
          plan = "pro";
        } else if (subStatus === "past_due") {
          // past_due の場合は 3 日間の猶予期間を付与して Pro を維持
          plan = "pro";
          gracePeriodUntilIso = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
        } else {
          plan = "free";
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        customerId = (subscription.customer as string) || null;
        subscriptionId = subscription.id;
        plan = "free";
        subStatus = "canceled";
        cancelAtPeriodEnd = false;
        periodEndIso = null;
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        customerId = (invoice.customer as string) || null;
        subscriptionId = (invoice.subscription as string) || null;
        subStatus = "past_due";
        plan = "pro";
        // 支払い失敗時は 3 日間の猶予期間を付与
        gracePeriodUntilIso = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
        if (invoice.lines?.data?.[0]?.period?.end) {
          periodEndIso = new Date(invoice.lines.data[0].period.end * 1000).toISOString();
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        customerId = (invoice.customer as string) || null;
        subscriptionId = (invoice.subscription as string) || null;
        subStatus = "active";
        plan = "pro";
        gracePeriodUntilIso = null; // 支払い成功により猶予期間クリア
        if (invoice.lines?.data?.[0]?.period?.end) {
          periodEndIso = new Date(invoice.lines.data[0].period.end * 1000).toISOString();
        }
        break;
      }

      default:
        console.log(`[Stripe] Unhandled event type: ${event.type}`);
        return new Response(JSON.stringify({ received: true, ignored: true }), {
          headers: { "Content-Type": "application/json" },
          status: 200,
        });
    }

    // [P0-3 解決] 単一トランザクション内で stripe_events 記録 ＆ 順序逆転ガード ＆ profiles 更新を実行
    const { data: result, error: rpcError } = await supabaseAdmin.rpc("process_stripe_webhook_atomic", {
      p_event_id: event.id,
      p_event_type: event.type,
      p_event_created: eventCreated,
      p_user_id: userId,
      p_stripe_customer_id: customerId,
      p_stripe_subscription_id: subscriptionId,
      p_plan: plan,
      p_subscription_status: subStatus,
      p_cancel_at_period_end: cancelAtPeriodEnd,
      p_current_period_end: periodEndIso,
      p_grace_period_until: gracePeriodUntilIso,
    });

    if (rpcError) {
      console.error(`[Stripe Webhook RPC Error] ${rpcError.message}`);
      return new Response(JSON.stringify({ error: rpcError.message }), {
        headers: { "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log(`[Stripe Webhook Processed] Event: ${event.id} -> Result:`, result);

    return new Response(JSON.stringify({ received: true, result }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error(`Webhook processing error: ${err.message}`);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
