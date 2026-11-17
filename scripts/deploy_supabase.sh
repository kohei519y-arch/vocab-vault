#!/usr/bin/env bash
set -euo pipefail

# Vocab Vault — Supabase Migration & Edge Function Deployment Helper
# Prerequisites:
#   1) npx supabase login
#   2) npx supabase link --project-ref adeujoftwnoognfnyfuw
#   3) Configure required external secrets before enabling Stripe / Resend flows:
#      npx supabase secrets set \
#        GEMINI_API_KEY=... \
#        STRIPE_SECRET_KEY=sk_live_or_test_... \
#        STRIPE_WEBHOOK_SECRET=whsec_... \
#        STRIPE_PRO_PRICE_ID=price_... \
#        STRIPE_PRO_PRICE_ID_YEARLY=price_... \
#        RESEND_API_KEY=re_... \
#        SEND_EMAIL_HOOK_SECRET=v1,whsec_... \
#        MAIL_FROM="Vocab Vault <no-reply@yourdomain>"

PROJECT_REF="${SUPABASE_PROJECT_REF:-adeujoftwnoognfnyfuw}"

echo "[1/3] Pushing SQL migrations..."
npx supabase db push --project-ref "$PROJECT_REF"

echo "[2/3] Deploying authenticated Edge Functions (verify_jwt = true)..."
for fn in vocab-generate admin-metrics delete-account stripe-checkout stripe-portal; do
  echo "  -> Deploying $fn"
  npx supabase functions deploy "$fn" --project-ref "$PROJECT_REF"
done

echo "[3/3] Deploying webhook / anonymous Edge Functions (--no-verify-jwt)..."
for fn in feedback stripe-webhook send-auth-email; do
  echo "  -> Deploying $fn (--no-verify-jwt)"
  npx supabase functions deploy "$fn" --no-verify-jwt --project-ref "$PROJECT_REF"
done

echo "Done. Also enable 'Leaked Password Protection' in Supabase Dashboard -> Auth -> Providers -> Email."
