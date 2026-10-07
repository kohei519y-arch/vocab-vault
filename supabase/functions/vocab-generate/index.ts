/**
 * Vocab Vault — Supabase Edge Function: vocab-generate
 * ステップ2: Geminiプロキシ、共有キャッシュ照会、クォータ判定
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestItem {
  reqIndex: number;
  reqWord: string;
  homographIndex?: number;
  contextPos?: string;
  targetSenseOrMeaning?: string;
  contextSentence?: string;
  wiktionaryRef?: string;
  wiktionaryIpa?: string;
}

function cleanJsonString(str: string): string {
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ");
}

const guestRateMemory = new Map<string, number>();

// [P0-6 解決] 信頼性の高いIP取得（Cloudflare / リバースプロキシスプーフィング対策）
function getClientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",").map(s => s.trim()).filter(Boolean).pop() ||
    "unknown_guest"
  );
}

const DUMMY_OCR_SENSES = new Set([
  "文脈上の重要語",
  "重要語",
  "文脈語",
  "重要単語",
  "語彙",
  "抽出語",
  "OCR抽出",
]);

function sanitizeCard(card: any, origItem?: RequestItem) {
  const norm = (s: any) => String(s || "").normalize("NFC").trim();
  const word = norm(card?.word || origItem?.reqWord);
  const phonetic = norm(card?.phonetic);
  const grammar_forms = norm(card?.grammar_forms);
  const etymology = norm(card?.etymology);
  const core = norm(card?.core);
  const history_note = norm(card?.history_note);

  const meanings = (Array.isArray(card?.meanings) ? card.meanings : [])
    .map((m: any) => ({
      pos: norm(m?.pos || "N"),
      text: norm(m?.text),
    }))
    .filter((m: any) => m.text.length > 0);
  if (meanings.length === 0) meanings.push({ pos: "N", text: word });

  // [P1-2 解決] 外国語例文はプレーンテキストとして保持（<b>タグの強制埋め込みを撤廃）
  const exForeign = norm(card?.example?.foreign);
  const exJa = norm(card?.example?.ja);
  const exTrans = norm(card?.example?.trans || exJa);
  const usedForm = norm(card?.example?.used_form || word);

  const derivatives = (Array.isArray(card?.derivatives) ? card.derivatives : [])
    .map((d: any) => ({
      word: norm(d?.word),
      meaning: norm(d?.meaning),
      pos: d?.pos ? norm(d.pos) : undefined,
      phonetic: d?.phonetic ? norm(d.phonetic) : undefined,
      sub_phrase: d?.sub_phrase ? norm(d.sub_phrase) : undefined,
      sub_trans: d?.sub_trans ? norm(d.sub_trans) : undefined,
    }))
    .filter((d: any) => d.word.length > 0);

  const phrases = (Array.isArray(card?.phrases) ? card.phrases : [])
    .map((p: any) => ({
      foreign: norm(p?.foreign),
      ja: norm(p?.ja),
    }))
    .filter((p: any) => p.foreign.length > 0);

  const etymologyTags = (Array.isArray(card?.etymologyTags) ? card.etymologyTags : [])
    .map((t: any) => norm(t))
    .filter((t: any) => t.length > 0);

  return {
    ...card,
    reqIndex: origItem?.reqIndex ?? card?.reqIndex ?? 0,
    word,
    homographIndex: Math.max(1, parseInt(String(card?.homographIndex || origItem?.homographIndex || 1), 10) || 1),
    category: typeof card?.category === "number" ? card.category : 1,
    phonetic,
    grammar_forms,
    etymologyConfidence: ["certain", "probable", "disputed", "unknown"].includes(card?.etymologyConfidence)
      ? card.etymologyConfidence
      : "probable",
    etymology,
    etymologyTags,
    history_note,
    core,
    meanings,
    example: {
      foreign: exForeign,
      ja: exJa,
      trans: exTrans,
      used_form: usedForm,
    },
    phrases,
    derivatives,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Server misconfigured (missing Supabase keys)" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    let user = null;

    // 認証確認 (ログインユーザーはトークン検証、未ログイン時はゲストアクセスを許可)
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (!authError && authUser) {
        user = authUser;
      }
    }

    const body = await req.json();
    const {
      lang = "en",
      srcLang: rawSrc,
      targetLang: rawTgt,
      tgtLang: rawTgt2,
      useHist = true,
      fName,
      items
    } = body as {
      lang?: string;
      srcLang?: string;
      targetLang?: string;
      tgtLang?: string;
      useHist?: boolean;
      fName?: string;
      items: RequestItem[];
    };

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid items array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 批判的セキュリティ対策: 1回のリクエスト数を最大15語に制限（APIタダ乗り・DoS防止）
    if (items.length > 15) {
      return new Response(JSON.stringify({ error: "1回のリクエストあたりの生成単語数は最大15語までです。" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 言語ペアの決定（4言語: en, ja, fr, de）
    const validLangs = ["en", "ja", "fr", "de"];
    const sLang = validLangs.includes(rawSrc || "") ? (rawSrc as string) : (validLangs.includes(lang) ? lang : "en");
    const tLang = validLangs.includes(rawTgt || rawTgt2 || "") ? ((rawTgt || rawTgt2) as string) : "ja";

    // [P1-3 解決] プロンプトインジェクション防壁: fName のサニタイズ（制御文字・改行排除、英数日本語記号のみ、最大40文字）
    const safeFName = fName ? String(fName).replace(/[\r\n\x00-\x1f`]/g, " ").trim().slice(0, 40) : "";

    // 各単語のサニタイズ（100文字上限、空文字除外）
    const sanitizedItems = items
      .map(it => ({
        ...it,
        reqWord: String(it.reqWord || "").trim().slice(0, 100),
        homographIndex: Math.max(1, parseInt(String(it.homographIndex || 1), 10) || 1),
      }))
      .filter(it => it.reqWord.length > 0);

    if (sanitizedItems.length === 0) {
      return new Response(JSON.stringify({ error: "有効な単語が指定されていません。" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 言語名の多言語表記マッピング
    const LANG_INFO: Record<string, { ja: string; en: string; fr: string; de: string; pos: string }> = {
      en: { ja: "英語", en: "English", fr: "Anglais", de: "Englisch", pos: "N[C], N[U], V[T], V[I], Adj, Adv" },
      ja: { ja: "日本語", en: "Japanese", fr: "Japonais", de: "Japanisch", pos: "名詞, 動詞, 形容詞, 副詞, 熟語" },
      fr: { ja: "フランス語", en: "French", fr: "Français", de: "Französisch", pos: "N[m], N[f], V[T], V[I], Adj, Adv" },
      de: { ja: "ドイツ語", en: "German", fr: "Allemand", de: "Deutsch", pos: "N[m], N[f], N[n], V[T], V[I], Adj, Adv" },
    };

    const sInfo = LANG_INFO[sLang] || LANG_INFO.en;
    const tInfo = LANG_INFO[tLang] || LANG_INFO.ja;

    // --- [4×4 全16ペア対応] 動的システムプロンプト生成 ---
    let serverSystemPrompt = "";
    if (sLang === tLang) {
      // 同言語ペア（英英、仏仏、独独、国語・概念史）
      if (sLang === "en") {
        serverSystemPrompt = `You are an authoritative academic English monolingual etymological dictionary and conceptual history lexicon (such as Oxford English Dictionary / Merriam-Webster Unabridged).
Explain each English word STRICTLY IN ENGLISH with deep Indo-European roots, Greek/Latin cognates, philosophical/institutional evolution, and precise definitions.
Requirements:
1. Etymology: reconstruct PIE roots (*root), Proto-Germanic/Latin pathways, and semantic shifts in English.
2. Meanings: provide rigorous academic English definitions and core imagery.
3. Example: provide an authentic English sentence (example.foreign) and an explanatory English paraphrase (example.ja & example.trans). Keep example.foreign as plain text without HTML tags.
4. Part of speech: strictly follow ${sInfo.pos}.
${safeFName ? `Subject field: ${safeFName}` : ""}`;
      } else if (sLang === "fr") {
        serverSystemPrompt = `Vous êtes un dictionnaire étymologique académique et un lexique d'histoire des concepts de langue française (style Littré / Le Robert).
Expliquez chaque mot français STRICTEMENT EN FRANÇAIS avec ses racines indo-européennes, origines gréco-latines et son évolution philosophique.
1. Étymologie et image centrale (core) rédigées en français.
2. Définitions rigoureuses (meanings.text) en français.
3. Exemple en français (example.foreign) et explication/reformulation en français (example.ja & example.trans).
${safeFName ? `Domaine: ${safeFName}` : ""}`;
      } else if (sLang === "de") {
        serverSystemPrompt = `Sie sind ein maßgebliches deutsches Begriffsgeschichte- und etymologisches Wörterbuch (Stil Duden / Grimm).
Erklären Sie deutsche Stichwörter AUSSCHLIESSLICH AUF DEUTSCH mit indogermanischen Wurzeln und geistesgeschichtlichen Zusammenhängen.
1. Etymologie und semantischer Kern auf Deutsch.
2. Präzise Definitionen (meanings.text) auf Deutsch.
3. Deutsches Beispiel (example.foreign) und deutsche Paraphrase (example.ja & example.trans).
${safeFName ? `Fachbereich: ${safeFName}` : ""}`;
      } else {
        serverSystemPrompt = `あなたは学術的な日本語の語源・概念史・国語大辞典エンジンです。
各日本語の見出し語について、漢字・漢語の成り立ち、仏教・東洋思想・近代西欧語翻訳史（明治期の翻訳語形成）の変遷を深く日本語で解説してください。
1. 語源（etymology）およびコアイメージ（core）の解説。
2. 現代および歴史的な語義の解説。
3. 自然な用例・例文（example.foreign）とその現代語解説（example.ja & example.trans）。
${safeFName ? `分野: ${safeFName}` : ""}`;
      }
    } else {
      // 異言語ペア（英和、仏和、独和、和英、仏独、仏英、独英、和仏、和独など）
      if (tLang === "ja") {
        serverSystemPrompt = `あなたは最高峰の学術的${sInfo.ja}から日本語への語源・概念史辞典および高度な単語帳データ生成エンジンです。
各${sInfo.ja}の対象語について、以下の学術的基準を厳守した正確なJSON配列を出力してください。

【厳格な学術基準・ハルシネーション完全排除】
1. 印欧祖語(PIE)や古典諸語の照合:
   - 実在が言語学的に広く認められている真の語根のみを記載（Pokorny, LIV, Mallory-Adams, OED, Wiktionary Etymology準拠）。
   - 実在しない語根の捏造・無理なこじつけ（ハルシネーション）を厳禁。語根が不詳の単語（借用語、新造語、オノマトペ等）は率直に「PIE語根不明」または借用元の言語から解説し、etymologyConfidenceを "disputed" または "unknown" とすること。
   - 民間語源（俗説）を事実として解説することを厳禁。
2. etymologyTagsの厳格化:
   - 【対象見出し語自身】の真の語根のみをアスタリスク付き(例: "*sta-", "*leuk-")で出力。例文や派生語に出てくる別語の語根は絶対に含めない。
3. 【歴史的・文脈的用法の反映】:
   - 見出し語に特定の時代・歴史的出来事（例: wet＝米国禁酒法下の反禁酒派、dry＝禁酒派、dove＝冷戦期の反戦ハト派、quarantine＝ベネチアの40日検疫等）に根ざす顕著な歴史的・政治的・制度的用法がある場合、現代標準語義に加えて必ずmeaningsに歴史的語義（【歴史】や【禁酒法】等のラベル付き）を含め、history_noteに時代背景や制度的文脈を具体的に記述すること（最大70字）。特筆すべき歴史的用法がない一般的な語彙はhistory_noteを空文字""とすること。架空の歴史的事実を捏造しないこと。
4. 自然な例文(example.foreign)と日本語訳(example.ja & example.trans):
   - 例文には必ず見出し語を含めること。外国語例文(example.foreign)はHTMLタグを付与せずプレーンテキストとすること。
5. Unicode文字化け防止:
   - 発音記号(IPA)、ウムラウト、アクサン記号、長音記号などは壊れたエスケープを避け、UTF-8正規化された正確な文字で出力すること。
6. 品詞(pos)は ${sInfo.pos} 等に準拠すること。
${safeFName ? `分野の指定: ${safeFName}` : ""}`;
      } else if (tLang === "en") {
        serverSystemPrompt = `You are a high-level academic dictionary from ${sInfo.en} to English specializing in etymology, cognate networks, and conceptual history.
For each ${sInfo.en} word, provide definitions, PIE root connections, and historical context STRICTLY IN ENGLISH.
1. Etymology and core semantic concept explained in English.
2. English translation and definition (meanings.text).
3. Example in ${sInfo.en} (example.foreign) with accurate English translation (example.ja & example.trans). Keep example.foreign as plain text.
${safeFName ? `Field: ${safeFName}` : ""}`;
      } else if (tLang === "fr") {
        serverSystemPrompt = `Vous êtes un dictionnaire académique de ${sInfo.fr} vers le français, spécialisé en étymologie et histoire conceptuelle.
Expliquez les mots ${sInfo.fr} EN FRANÇAIS avec leurs racines indo-européennes et leurs équivalents français.
1. Étymologie et concept central expliqués en français.
2. Définition et traduction en français (meanings.text).
3. Exemple en ${sInfo.fr} (example.foreign) avec traduction française (example.ja & example.trans).
${safeFName ? `Domaine: ${safeFName}` : ""}`;
      } else {
        serverSystemPrompt = `Sie sind ein akademisches Wörterbuch von ${sInfo.de} ins Deutsche, spezialisiert auf Etymologie und Begriffsgeschichte.
Erklären Sie ${sInfo.de} Wörter AUF DEUTSCH mit indogermanischen Wurzeln und semantischen Vergleichen.
1. Etymologie und Kernkonzept auf Deutsch erklärt.
2. Deutsche Übersetzung und Definition (meanings.text).
3. Beispiel auf ${sInfo.de} (example.foreign) mit deutscher Übersetzung (example.ja & example.trans).
${safeFName ? `Fachbereich: ${safeFName}` : ""}`;
      }
    }

    const serverResponseSchema = {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          reqIndex: { type: "INTEGER" },
          word: { type: "STRING" },
          homographIndex: { type: "INTEGER" },
          category: { type: "INTEGER" },
          phonetic: { type: "STRING" },
          grammar_forms: { type: "STRING" },
          etymologyConfidence: { type: "STRING", enum: ["certain", "probable", "disputed", "unknown"] },
          etymology: { type: "STRING" },
          etymologyTags: { type: "ARRAY", items: { type: "STRING" } },
          history_note: { type: "STRING" },
          core: { type: "STRING" },
          meanings: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                pos: { type: "STRING" },
                text: { type: "STRING" },
              },
              required: ["pos", "text"],
            },
          },
          example: {
            type: "OBJECT",
            properties: {
              foreign: { type: "STRING" },
              ja: { type: "STRING" },
              trans: { type: "STRING" },
              used_form: { type: "STRING" },
            },
            required: ["foreign", "ja"],
          },
          phrases: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: { foreign: { type: "STRING" }, ja: { type: "STRING" } },
              required: ["foreign", "ja"],
            },
          },
          derivatives: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                word: { type: "STRING" },
                phonetic: { type: "STRING" },
                pos: { type: "STRING" },
                meaning: { type: "STRING" },
                sub_phrase: { type: "STRING" },
                sub_trans: { type: "STRING" },
              },
              required: ["word", "meaning"],
            },
          },
        },
        required: ["word", "meanings", "example", "etymology", "core"],
      },
    };

    // --- 1. 共有辞書キャッシュの検索 (Unicode NFC 正規化 & 言語ペア対応) ---
    const pairCode = `${sLang}_${tLang}`;
    const makeWordKey = (w: string, pair: string, h: number = 1) => {
      const normW = w.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
      return `${pair}:${normW}#${h > 1 ? h : 1}`;
    };

    // 共有辞書キャッシュのバッチ検索 (言語ペアごとに独立)
    const allKeys = sanitizedItems.map(it => makeWordKey(it.reqWord, pairCode, it.homographIndex || 1));
    const { data: cachedRows } = await supabaseAdmin
      .from("global_dictionary_cache")
      .select("card_data, hit_count, word_key")
      .eq("lang", sLang)
      .in("word_key", allKeys);

    const cachedMap = new Map((cachedRows || []).map((r: any) => [r.word_key, r]));
    const cachedResults: any[] = [];
    const itemsToGenerate: RequestItem[] = [];

    for (const item of sanitizedItems) {
      const hIdx = item.homographIndex || 1;
      const wk = makeWordKey(item.reqWord, pairCode, hIdx);
      const cached = cachedMap.get(wk);

      // [P0-2 解決] OCR抽出時のダミー訳語（文脈上の重要語など）はキャッシュバイパスせず共有キャッシュをヒットさせる
      const hasRealCustomSense = item.targetSenseOrMeaning && !DUMMY_OCR_SENSES.has(item.targetSenseOrMeaning.trim());

      if (cached && cached.card_data && !hasRealCustomSense) {
        cachedResults.push(sanitizeCard(cached.card_data, item));
        // hit_countをインクリメント（バックグラウンド非同期）
        supabaseAdmin
          .from("global_dictionary_cache")
          .update({ hit_count: (cached.hit_count || 0) + 1, updated_at: new Date().toISOString() })
          .eq("lang", sLang)
          .eq("word_key", wk)
          .then();
      } else {
        itemsToGenerate.push(item);
      }
    }

    let quotaRemaining = 9999;
    let generatedResults: any[] = [];
    let usedModel = "shared-cache";

    // --- 2. 未キャッシュ分のみクォータ事前予約 (Reserve) & Gemini API呼び出し ---
    if (itemsToGenerate.length > 0) {
      if (!geminiApiKey) {
        return new Response(JSON.stringify({ error: "Gemini API key is not configured on server" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // [P0-2 解決] TOCTOU排除: ログインユーザーのみアトミックにクォータを事前仮引き落とし（Reserve）
      if (user) {
        const { data: quotaReserve, error: quotaError } = await supabaseAdmin.rpc("reserve_or_refund_quota", {
          p_user_id: user.id,
          p_item_count: itemsToGenerate.length,
          p_is_refund: false,
        });

        if (quotaError || !quotaReserve?.allowed) {
          return new Response(
            JSON.stringify({
              error: `今月のAI新規生成上限に達しました（残り: ${quotaReserve?.remaining ?? 0}語）。Proプランにアップグレードすると無制限に生成できます。`,
              quotaRemaining: quotaReserve?.remaining ?? 0,
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        quotaRemaining = quotaReserve.remaining;
      } else {
        // [P0-6 解決] 未ログインゲストの日次クォータ判定（DBアトミックRPC優先 ＆ インメモリ保護）
        const clientIp = getClientIp(req);
        let guestAllowed = true;
        let currentUsage = 0;

        try {
          const { data: gqData, error: gqErr } = await supabaseAdmin.rpc("consume_guest_quota", {
            p_ip: clientIp,
            p_count: itemsToGenerate.length,
            p_daily_limit: 30,
          });

          if (!gqErr && gqData) {
            guestAllowed = Boolean(gqData.allowed);
            currentUsage = Number(gqData.usage_count) || 0;
            if (!guestAllowed) {
              return new Response(
                JSON.stringify({
                  error: `未ログインでの本日のAI新規生成上限（1日30語）に達しました（本日利用: ${currentUsage}語）。明日またご利用いただくか、ログインしてProプランをご検討ください。`,
                  quotaRemaining: 0,
                }),
                { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
        } catch {
          // RPCエラー時はインメモリフォールバック
        }

        const todayStr = new Date().toISOString().slice(0, 10);
        const rateKey = `${clientIp}_${todayStr}`;
        const currentMemoryCount = guestRateMemory.get(rateKey) || 0;
        if (currentMemoryCount + itemsToGenerate.length > 30) {
          return new Response(
            JSON.stringify({
              error: `未ログインでの本日のAI新規生成上限（1日30語）に達しました（本日利用: ${currentMemoryCount}語）。明日またご利用いただくか、ログインしてProプランをご検討ください。`,
              quotaRemaining: 0,
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        guestRateMemory.set(rateKey, currentMemoryCount + itemsToGenerate.length);
      }

      // Gemini呼び出し (Google推奨の最新フラッグシップモデル gemini-3.8-flash)
      const targetModel = "gemini-3.8-flash";
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${geminiApiKey}`;
      const userContent = `<user_request>\n対象語(${itemsToGenerate.length}件):\n${JSON.stringify(itemsToGenerate)}\n${safeFName ? `分野:${safeFName}\n` : ""}</user_request>`;

      let aiResponse: Response;
      try {
        aiResponse = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: serverSystemPrompt }] },
            contents: [{ role: "user", parts: [{ text: userContent }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 8192,
              responseMimeType: "application/json",
              responseSchema: serverResponseSchema,
            },
          }),
        });
      } catch (fetchErr: any) {
        if (user) {
          // [P0-7 解決] 返金処理の堅牢化（.catch チェーンを排除し直接 await）
          await supabaseAdmin.rpc("reserve_or_refund_quota", {
            p_user_id: user.id,
            p_item_count: itemsToGenerate.length,
            p_is_refund: true,
          });
        }
        return new Response(JSON.stringify({ error: `Gemini API fetch failed: ${fetchErr?.message || fetchErr}` }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!aiResponse.ok) {
        if (user) {
          await supabaseAdmin.rpc("reserve_or_refund_quota", {
            p_user_id: user.id,
            p_item_count: itemsToGenerate.length,
            p_is_refund: true,
          });
        }
        const errBody = await aiResponse.text();
        return new Response(JSON.stringify({ error: `Gemini API error (${aiResponse.status}): ${errBody}` }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResponse.json();
      const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
      let parsedAi: any;
      try {
        parsedAi = JSON.parse(cleanJsonString(rawText));
      } catch (parseErr: any) {
        if (user) {
          await supabaseAdmin.rpc("reserve_or_refund_quota", {
            p_user_id: user.id,
            p_item_count: itemsToGenerate.length,
            p_is_refund: true,
          });
        }
        return new Response(
          JSON.stringify({ error: "AI応答の解析に失敗しました。クォータは全額返還されました。" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const rawArr = Array.isArray(parsedAi) ? parsedAi : [parsedAi];

      // [P1-1 解決] モデル出力の配列インデックスずれ防止（reqIndex および見出し語での厳密突合）
      generatedResults = itemsToGenerate.map((origItem) => {
        let match = rawArr.find((c: any) => c?.reqIndex === origItem.reqIndex);
        if (!match) {
          const origNorm = origItem.reqWord.toLowerCase().trim();
          match = rawArr.find((c: any) => String(c?.word || "").toLowerCase().trim() === origNorm);
        }
        if (!match) {
          // 残りの配列から使用されていない要素を順次割り当て
          match = rawArr.find((c: any) => !itemsToGenerate.some(it => it !== origItem && (it.reqIndex === c?.reqIndex || it.reqWord.toLowerCase().trim() === String(c?.word || "").toLowerCase().trim())));
        }
        return sanitizeCard(match || {}, origItem);
      });
      usedModel = targetModel;

      // 部分失敗差分の自動返還 (例: 10語中8語のみ成功した場合、未生成2語分を返還)
      const failedCount = itemsToGenerate.length - generatedResults.length;
      if (user && failedCount > 0) {
        const { data: refundData } = await supabaseAdmin.rpc("reserve_or_refund_quota", {
          p_user_id: user.id,
          p_item_count: failedCount,
          p_is_refund: true,
        });
        if (refundData?.remaining !== undefined) quotaRemaining = refundData.remaining;
      }

      // [P0-4 解決] 共有辞書キャッシュへの保存（汚染防止: 特殊な文脈・カスタム意味指定のない標準語彙のみを保存）
      const cacheRows = generatedResults
        .filter((card) => {
          const orig = itemsToGenerate.find(it => it.reqIndex === card.reqIndex);
          const hasCustom = orig?.targetSenseOrMeaning && !DUMMY_OCR_SENSES.has(orig.targetSenseOrMeaning.trim());
          return !hasCustom && !orig?.contextSentence && card.word && card.meanings?.length > 0;
        })
        .map((card) => {
          const hIdx = card.homographIndex || 1;
          const wk = makeWordKey(card.word, pairCode, hIdx);
          return {
            lang: sLang,
            word: card.word,
            homograph_index: hIdx,
            word_key: wk,
            card_data: card,
            hit_count: 1,
            verified: false,
          };
        });

      if (cacheRows.length > 0) {
        supabaseAdmin
          .from("global_dictionary_cache")
          .upsert(cacheRows, { onConflict: "lang,word_key" })
          .then()
          .catch(() => {});
      }

      // ゲスト（未ログイン）の部分失敗時のクォータ返還調整（もし失敗があれば）
      if (!user && failedCount > 0) {
        const clientIp = getClientIp(req);
        try {
          // 失敗分をアトミックに差し戻し
          await supabaseAdmin.rpc("consume_guest_quota", {
            p_ip: clientIp,
            p_count: -failedCount,
            p_daily_limit: 30,
          });
        } catch {}
      }
    }

    // 全結果をマージ
    const finalItems = [...cachedResults, ...generatedResults];

    return new Response(
      JSON.stringify({
        items: finalItems,
        usedModel,
        cachedCount: cachedResults.length,
        generatedCount: generatedResults.length,
        quotaRemaining,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Unknown internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
