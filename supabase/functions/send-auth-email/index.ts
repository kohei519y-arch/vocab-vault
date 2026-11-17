/**
 * Vocab Vault — Supabase Edge Function: send-auth-email
 * Supabase Auth Send Email Hook + Resend API integration.
 * Supports signup, recovery, magiclink, invite, email_change, and reauthentication.
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

interface AuthHookUser {
  id?: string;
  email?: string;
  new_email?: string;
  user_metadata?: Record<string, unknown>;
}

interface AuthHookEmailData {
  token?: string;
  token_hash?: string;
  redirect_to?: string;
  email_action_type?: string;
  site_url?: string;
  token_new?: string;
  token_hash_new?: string;
}

interface SendEmailHookPayload {
  user: AuthHookUser;
  email_data: AuthHookEmailData;
}

interface EmailTemplateCopy {
  subject: string;
  heading: string;
  body: string;
  ctaLabel: string;
}

const TEMPLATE_COPY: Record<string, Record<"ja" | "en", EmailTemplateCopy>> = {
  signup: {
    ja: {
      subject: "[Vocab Vault] メールアドレスの確認",
      heading: "アカウント登録を完了してください",
      body: "Vocab Vault にご登録いただきありがとうございます。以下のボタンをクリックしてメールアドレスの確認を完了してください。",
      ctaLabel: "メールアドレスを確認する",
    },
    en: {
      subject: "[Vocab Vault] Confirm your email address",
      heading: "Complete your registration",
      body: "Thank you for signing up for Vocab Vault. Click the button below to confirm your email address.",
      ctaLabel: "Confirm Email",
    },
  },
  recovery: {
    ja: {
      subject: "[Vocab Vault] パスワードの再設定",
      heading: "パスワード再設定のご案内",
      body: "パスワード再設定のリクエストを受け付けました。以下のボタンから新しいパスワードを設定してください。",
      ctaLabel: "パスワードを再設定する",
    },
    en: {
      subject: "[Vocab Vault] Reset your password",
      heading: "Password Reset Request",
      body: "We received a request to reset your password. Click the button below to choose a new password.",
      ctaLabel: "Reset Password",
    },
  },
  magiclink: {
    ja: {
      subject: "[Vocab Vault] ログインリンク",
      heading: "ワンタイムログイン",
      body: "以下のボタンをクリックして Vocab Vault にログインしてください。",
      ctaLabel: "ログインする",
    },
    en: {
      subject: "[Vocab Vault] Your login link",
      heading: "One-Time Login",
      body: "Click the button below to sign in to Vocab Vault.",
      ctaLabel: "Sign In",
    },
  },
  invite: {
    ja: {
      subject: "[Vocab Vault] アカウント招待",
      heading: "Vocab Vault への招待",
      body: "Vocab Vault へ招待されました。以下のボタンからアカウント設定を完了してください。",
      ctaLabel: "招待を承認する",
    },
    en: {
      subject: "[Vocab Vault] You have been invited",
      heading: "Invitation to Vocab Vault",
      body: "You have been invited to Vocab Vault. Click the button below to accept the invitation.",
      ctaLabel: "Accept Invitation",
    },
  },
  email_change: {
    ja: {
      subject: "[Vocab Vault] メールアドレス変更の確認",
      heading: "メールアドレス変更の確認",
      body: "メールアドレス変更のリクエストを受け付けました。以下のボタンをクリックして変更を確定してください。",
      ctaLabel: "メールアドレス変更を確定",
    },
    en: {
      subject: "[Vocab Vault] Confirm email address change",
      heading: "Confirm Email Change",
      body: "We received a request to update your email address. Click the button below to confirm this change.",
      ctaLabel: "Confirm Email Change",
    },
  },
  reauthentication: {
    ja: {
      subject: "[Vocab Vault] 本人確認コード",
      heading: "本人確認",
      body: "操作を続行するため、以下の確認コードを入力してください。",
      ctaLabel: "Vocab Vault を開く",
    },
    en: {
      subject: "[Vocab Vault] Reauthentication code",
      heading: "Confirm your identity",
      body: "Enter the verification code below to continue your action.",
      ctaLabel: "Open Vocab Vault",
    },
  },
};

function escapeHtml(raw: string): string {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function errorResponse(httpCode: number, message: string): Response {
  return new Response(
    JSON.stringify({ error: { http_code: httpCode, message } }),
    { status: httpCode, headers: { "Content-Type": "application/json" } },
  );
}

function verifyWebhookPayload(
  payloadText: string,
  headers: Record<string, string>,
  rawSecret: string,
): SendEmailHookPayload {
  const secrets = rawSecret
    .split("|")
    .map((s) => s.trim().replace(/^v1,whsec_/, ""))
    .filter(Boolean);

  if (secrets.length === 0) {
    throw new Error("SEND_EMAIL_HOOK_SECRET is not configured");
  }

  let lastError: unknown;
  for (const secret of secrets) {
    try {
      const wh = new Webhook(secret);
      return wh.verify(payloadText, headers) as SendEmailHookPayload;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Invalid webhook signature");
}

function resolveLocale(user: AuthHookUser): "ja" | "en" {
  const rawLocale = String(user.user_metadata?.locale ?? user.user_metadata?.lang ?? "ja").toLowerCase();
  return rawLocale.startsWith("en") ? "en" : "ja";
}

function buildVerifyUrl(
  supabaseUrl: string,
  tokenHash: string,
  actionType: string,
  redirectTo: string,
): string {
  const base = supabaseUrl.replace(/\/+$/, "");
  const params = new URLSearchParams({
    token: tokenHash,
    type: actionType,
  });
  if (redirectTo) {
    params.set("redirect_to", redirectTo);
  }
  return `${base}/auth/v1/verify?${params.toString()}`;
}

function renderAuthEmailHtml(params: {
  copy: EmailTemplateCopy;
  actionUrl: string;
  token: string;
  locale: "ja" | "en";
}): string {
  const heading = escapeHtml(params.copy.heading);
  const body = escapeHtml(params.copy.body);
  const ctaLabel = escapeHtml(params.copy.ctaLabel);
  const safeUrl = escapeHtml(params.actionUrl);
  const safeToken = escapeHtml(params.token);
  const codeLabel = params.locale === "ja" ? "確認コード" : "Verification Code";
  const ignoreNote = params.locale === "ja"
    ? "このメールに心当たりがない場合は、このまま破棄してください。"
    : "If you did not request this email, you can safely ignore it.";

  const tokenBlock = safeToken
    ? `<p style="margin:20px 0 8px;font-size:13px;color:#64748b;">${codeLabel}</p>
       <div style="display:inline-block;padding:10px 16px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:18px;font-weight:700;letter-spacing:0.12em;color:#0f172a;">${safeToken}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="${params.locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:32px;">
    <div style="font-size:13px;font-weight:700;letter-spacing:0.06em;color:#6366f1;text-transform:uppercase;margin-bottom:12px;">Vocab Vault</div>
    <h1 style="margin:0 0 12px;font-size:20px;line-height:1.4;color:#0f172a;">${heading}</h1>
    <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#334155;">${body}</p>
    <a href="${safeUrl}" style="display:inline-block;padding:12px 22px;background:#6366f1;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">${ctaLabel}</a>
    ${tokenBlock}
    <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#64748b;">${ignoreNote}</p>
  </div>
</body>
</html>`;
}

async function sendViaResend(params: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: boolean; status: number; message: string }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: params.from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  if (res.ok) {
    return { ok: true, status: 200, message: "sent" };
  }
  const errBody = await res.text().catch(() => "");
  return {
    ok: false,
    status: res.status >= 400 ? res.status : 502,
    message: errBody || `Resend API error (HTTP ${res.status})`,
  };
}

serve(async (req) => {
  if (req.method !== "POST") {
    return errorResponse(405, "Method not allowed");
  }

  const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "";
  const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const mailFrom = Deno.env.get("MAIL_FROM") || "Vocab Vault <onboarding@resend.dev>";

  if (!resendApiKey) {
    return errorResponse(500, "RESEND_API_KEY is not configured");
  }
  if (!supabaseUrl) {
    return errorResponse(500, "SUPABASE_URL is not configured");
  }

  const payloadText = await req.text();
  const headers = Object.fromEntries(req.headers);

  let event: SendEmailHookPayload;
  try {
    event = verifyWebhookPayload(payloadText, headers, hookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Webhook verification failed";
    return errorResponse(401, msg);
  }

  const user = event.user || {};
  const emailData = event.email_data || {};
  const actionType = String(emailData.email_action_type || "signup");
  const locale = resolveLocale(user);
  const templateGroup = TEMPLATE_COPY[actionType] || TEMPLATE_COPY.signup;
  const copy = templateGroup[locale];

  const redirectTo = String(emailData.redirect_to || emailData.site_url || "");
  const recipient = actionType === "email_change" && user.new_email
    ? String(user.new_email)
    : String(user.email || "");

  if (!recipient) {
    return errorResponse(400, "Recipient email is missing");
  }

  const tokenHash = actionType === "email_change" && emailData.token_hash_new
    ? String(emailData.token_hash_new)
    : String(emailData.token_hash || "");
  const token = actionType === "email_change" && emailData.token_new
    ? String(emailData.token_new)
    : String(emailData.token || "");

  const actionUrl = tokenHash
    ? buildVerifyUrl(supabaseUrl, tokenHash, actionType, redirectTo)
    : redirectTo || supabaseUrl;

  const html = renderAuthEmailHtml({ copy, actionUrl, token, locale });
  const text = `${copy.heading}\n\n${copy.body}\n\n${actionUrl}${token ? `\n\nCode: ${token}` : ""}`;

  const result = await sendViaResend({
    apiKey: resendApiKey,
    from: mailFrom,
    to: recipient,
    subject: copy.subject,
    html,
    text,
  });

  if (!result.ok) {
    return errorResponse(result.status, result.message);
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
