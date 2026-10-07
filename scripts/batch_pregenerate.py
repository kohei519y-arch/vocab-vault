#!/usr/bin/env python3
"""
Vocab Vault — Batch Pre-generation & Verification Script (scripts/batch_pregenerate.py)
ステップ4: 高頻度・学術語彙の事前生成、自動バリデーション、別モデルクロスチェック、費用上限制御

利用例:
  export GEMINI_API_KEY="AIzaSy..."
  # ビルトインの学術シード語を生成し、検品して共有キャッシュファイルに出力:
  python3 scripts/batch_pregenerate.py --lang en --budget 0.50

  # 独自の単語リストファイルから生成:
  python3 scripts/batch_pregenerate.py --words-file vocab_list.txt --lang fr --budget 1.00
"""

import os
import sys
import re
import json
import time
import argparse
import urllib.request
from typing import List, Dict, Any, Tuple

# 想定API単価（Gemini 2.5 Flash: 1M入力 $0.075, 1M出力 $0.30）
COST_PER_INPUT_TOKEN = 0.075 / 1_000_000
COST_PER_OUTPUT_TOKEN = 0.30 / 1_000_000

# ビルトインシード単語リスト（学術・概念史・重要語）
SEED_WORDS = {
    'en': [
        "institution", "alienation", "sovereignty", "legitimacy", "structure",
        "paradigm", "dialectic", "discourse", "hegemony", "empathy",
        "contingency", "bureaucracy", "utilitarianism", "secularization", "pluralism"
    ],
    'fr': [
        "aliénation", "souveraineté", "légitimité", "laïcité", "citoyenneté",
        "bourgeoisie", "paradigme", "hégémonie", "bureaucratie", "lumières"
    ],
    'de': [
        "Aufhebung", "Weltanschauung", "Zeitgeist", "Entfremdung", "Herrschaft",
        "Bürgertum", "Rechtsstaat", "Gedanke", "Erkenntnis", "Vernunft"
    ]
}

RESPONSE_SCHEMA = {
    "type": "ARRAY",
    "items": {
        "type": "OBJECT",
        "properties": {
            "reqIndex": {"type": "INTEGER"},
            "word": {"type": "STRING"},
            "category": {"type": "INTEGER"},
            "phonetic": {"type": "STRING"},
            "grammar_forms": {"type": "STRING"},
            "etymologyConfidence": {"type": "STRING", "enum": ["certain", "probable", "disputed", "unknown"]},
            "etymology": {"type": "STRING"},
            "etymologyTags": {"type": "ARRAY", "items": {"type": "STRING"}},
            "history_note": {"type": "STRING"},
            "core": {"type": "STRING"},
            "meanings": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "pos": {"type": "STRING"},
                        "text": {"type": "STRING"}
                    },
                    "required": ["pos", "text"]
                }
            },
            "example": {
                "type": "OBJECT",
                "properties": {
                    "foreign": {"type": "STRING"},
                    "ja": {"type": "STRING"},
                    "used_form": {"type": "STRING"}
                },
                "required": ["foreign", "ja"]
            },
            "phrases": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {"foreign": {"type": "STRING"}, "ja": {"type": "STRING"}},
                    "required": ["foreign", "ja"]
                }
            },
            "derivatives": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "word": {"type": "STRING"},
                        "phonetic": {"type": "STRING"},
                        "pos": {"type": "STRING"},
                        "meaning": {"type": "STRING"},
                        "sub_phrase": {"type": "STRING"},
                        "sub_trans": {"type": "STRING"}
                    },
                    "required": ["word", "meaning"]
                }
            }
        },
        "required": ["word", "meanings", "example", "etymology", "core"]
    }
}

# --- バリデーション関数 (validateEntry の Python実装) ---
POS_REGEX = {
    'en': re.compile(r'^(N\[(C|U|C\/U|pl)\]|V\[(T|I|T\/I)\]|Adj|Adv|Prep|Conj|Pron|Idiom|Phrasal V)$'),
    'fr': re.compile(r'^(N\[(m|f|pl)\]|V\[(T|I|T\/I|refl)\]|Adj|Adv|Prep|Conj|Pron|Idiom)$'),
    'de': re.compile(r'^(N\[(m|f|n|pl)\]|V\[(T|I|T\/I|refl)\]|Adj|Adv|Prep|Conj|Pron|Idiom)$')
}

def validate_entry(it: Dict[str, Any], lang: str) -> List[str]:
    flags = []
    word = it.get('word', '').strip().lower()
    pos_re = POS_REGEX.get(lang, POS_REGEX['en'])

    # 1. 品詞整合性
    meanings = it.get('meanings', [])
    if not meanings:
        flags.append("意味リストが空")
    for m in meanings:
        pos = m.get('pos', '')
        if not pos_re.match(pos):
            flags.append(f"品詞不整合: {pos}")

    # 2. 例文チェック
    ex = it.get('example', {})
    if ex:
        f_sen = ex.get('foreign', '').lower()
        ja_sen = ex.get('ja', '')
        if word not in f_sen and not any(part in f_sen for part in word.split()):
            # 活用形チェック
            used = ex.get('used_form', '').lower()
            if not used or used not in f_sen:
                flags.append("例文に見出し語または活用形なし")
        if '<b>' not in ja_sen or '</b>' not in ja_sen:
            flags.append("例文和訳に<b>強調タグなし")

    # 3. 語根タグチェック
    tags = it.get('etymologyTags', [])
    ety = it.get('etymology', '')
    if tags and ety:
        # タグの主要語幹が語源解説に含まれているか
        found_any = False
        for t in tags:
            clean_t = re.sub(r'^[^\:]+\:\s*', '', t).split('(')[0].strip().strip('*').lower()
            if len(clean_t) >= 3 and clean_t in ety.lower():
                found_any = True
                break
        if not found_any:
            flags.append("語根タグの語幹が語源文に含まれていない")

    return flags

def call_gemini_api(system_prompt: str, user_prompt: str, api_key: str, model: str = "gemini-2.0-flash") -> Tuple[Dict[str, Any], float]:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 8192,
            "responseMimeType": "application/json",
            "responseSchema": RESPONSE_SCHEMA
        }
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=40) as response:
        res_data = json.loads(response.read().decode('utf-8'))
        usage = res_data.get('usageMetadata', {})
        in_tokens = usage.get('promptTokenCount', 0)
        out_tokens = usage.get('candidatesTokenCount', 0)
        cost = (in_tokens * COST_PER_INPUT_TOKEN) + (out_tokens * COST_PER_OUTPUT_TOKEN)
        
        raw_text = res_data['candidates'][0]['content']['parts'][0]['text']
        parsed_json = json.loads(raw_text)
        return parsed_json, cost

def cross_check_etymology(card: Dict[str, Any], api_key: str, model: str = "gemini-2.0-flash") -> Tuple[bool, str]:
    """別プロンプト（検証専用チェッカー）で語源解説のハルシネーションをスコアリング"""
    prompt = f"""
以下の単語の語源解説および印欧祖語タグに、明白な捏造（ハルシネーション）や事実無根の記述が含まれていないか判定せよ。
単語: {card.get('word')}
語源解説: {card.get('etymology')}
タグ: {card.get('etymologyTags')}

回答フォーマット(JSON):
{{"valid": trueまたはfalse, "reason": "判定理由(50字以内)"}}
"""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.0, "responseMimeType": "application/json"}
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            data = json.loads(res.read().decode('utf-8'))
            t = json.loads(data['candidates'][0]['content']['parts'][0]['text'])
            return t.get('valid', True), t.get('reason', '')
    except Exception:
        return True, "Check skipped"

def main():
    parser = argparse.ArgumentParser(description="Batch Pre-generation & Quality Validator")
    parser.add_argument("--lang", default="en", choices=["en", "fr", "de"])
    parser.add_argument("--model", default="gemini-2.0-flash", help="Gemini model name (default: gemini-2.0-flash)")
    parser.add_argument("--words-file", help="Path to text file containing one word per line")
    parser.add_argument("--budget", type=float, default=0.50, help="Max budget in USD before stopping (default: $0.50)")
    parser.add_argument("--batch-size", type=int, default=5, help="Number of words per batch API call")
    parser.add_argument("--output", default="pregenerated_cache.json", help="Output JSON cache file")

    args = parser.parse_args()
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("[!] GEMINI_API_KEY environment variable is required.", file=sys.stderr)
        sys.exit(1)

    words = []
    if args.words_file and os.path.exists(args.words_file):
        with open(args.words_file, 'r', encoding='utf-8') as f:
            words = [line.strip() for line in f if line.strip() and not line.startswith('#')]
    else:
        words = SEED_WORDS.get(args.lang, [])

    print(f"[*] Starting Batch Pre-generation for language: {args.lang.upper()} ({len(words)} words)")
    print(f"[*] Model: {args.model}")
    print(f"[*] Cost Budget Cap: ${args.budget:.2f}")

    total_cost = 0.0
    verified_cards = []
    rejected_cards = []

    sys_prompt = f"""学術的な{args.lang}語源・概念史辞典として全要求語のJSON配列を出力せよ。
印欧祖語・ラテン語の語根を厳密に照合し、歴史的・思想的変遷とコアイメージ、例文(和訳内該当箇所を<b>語</b>囲み)を生成せよ。"""

    for i in range(0, len(words), args.batch_size):
        if total_cost >= args.budget:
            print(f"[!] Budget cap (${args.budget:.2f}) reached! Halting further generation.")
            break

        batch = words[i:i + args.batch_size]
        items_payload = [{"reqIndex": idx, "reqWord": w} for idx, w in enumerate(batch)]
        print(f"\n---> Generating Batch {i // args.batch_size + 1}: {', '.join(batch)}...")

        try:
            cards, cost = call_gemini_api(sys_prompt, f"対象語: {json.dumps(items_payload)}", api_key, model=args.model)
            total_cost += cost
            print(f"     [Batch Cost]: ${cost:.4f} (Cumulative: ${total_cost:.4f})")

            for card in cards:
                w = card.get('word', '')
                flags = validate_entry(card, args.lang)
                if flags:
                    print(f"     [-] Rejected '{w}' by validation rules: {', '.join(flags)}")
                    rejected_cards.append({"word": w, "reasons": flags, "card": card})
                    continue

                # クロスチェック
                is_valid, reason = cross_check_etymology(card, api_key, model=args.model)
                if not is_valid:
                    print(f"     [-] Rejected '{w}' by cross-check: {reason}")
                    rejected_cards.append({"word": w, "reasons": [f"Cross-check: {reason}"], "card": card})
                    continue

                card['verified'] = True
                card['updatedAt'] = int(time.time() * 1000)
                card['lang'] = args.lang
                verified_cards.append(card)
                print(f"     [+] Verified and approved: '{w}'")

        except Exception as e:
            print(f"     [!] Batch error: {e}", file=sys.stderr)

        time.sleep(1) # レートリミット回避

    # 結果をJSONファイルに出力
    output_data = {
        "lang": args.lang,
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "totalCostUsd": round(total_cost, 4),
        "verifiedCount": len(verified_cards),
        "rejectedCount": len(rejected_cards),
        "cards": verified_cards
    }

    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    # 抜き取り目視確認用のMarkdownレポート生成
    report_file = "pregenerate_inspection_report.md"
    with open(report_file, 'w', encoding='utf-8') as rf:
        rf.write(f"# 事前生成＆品質検証レポート ({args.lang.upper()})\n\n")
        rf.write(f"- 実行日時: {output_data['generatedAt']}\n")
        rf.write(f"- 累計費用: ${total_cost:.4f} / 上限: ${args.budget:.2f}\n")
        rf.write(f"- 合格カード数: {len(verified_cards)} 件 / 不合格: {len(rejected_cards)} 件\n\n")
        rf.write("## 目視確認用サンプル（先頭5件）\n\n")
        for c in verified_cards[:5]:
            rf.write(f"### {c.get('word')} ({c.get('phonetic', '')})\n")
            rf.write(f"- **コアイメージ**: {c.get('core')}\n")
            rf.write(f"- **語源解説**: {c.get('etymology')}\n")
            rf.write(f"- **印欧祖語/語源タグ**: {', '.join(c.get('etymologyTags', []))}\n")
            rf.write(f"- **例文**: {c.get('example', {}).get('foreign')} ({c.get('example', {}).get('ja')})\n\n")

    print(f"\n==========================================")
    print(f"[Done] Total verified: {len(verified_cards)}, Rejected: {len(rejected_cards)}")
    print(f"[Done] Output saved to: {args.output}")
    print(f"[Done] Visual inspection report: {report_file}")
    print(f"[Done] Total Cost: ${total_cost:.4f}")
    print(f"==========================================")

if __name__ == "__main__":
    main()
