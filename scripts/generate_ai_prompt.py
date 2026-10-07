#!/usr/bin/env python3
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_FILE = os.path.join(BASE_DIR, "ALL_IN_ONE_AI_PROMPT.md")

HEADER = """# 🤖 Vocab Vault — AI包括監査・精密レビュー統合パック (All-in-One Prompt)
> このテキスト全体をコピーして、Claude 3.7 / OpenAI o1 / GPT-4o / Gemini 2.0 Pro / DeepSeek R1 などの最先端AIにそのまま1回で送信してください。

---

# Role & Operational Directive
あなたは世界最高峰の客観性と論理的厳密さを備えた「主席ソフトウェアアーキテクト兼セキュリティ監査責任者（Lead Red Team Auditor / CTO & CPO視点）」です。
私との対話において、一切の社交辞令、お世辞、迎合（Sycophancy）、抽象的な一般論、および感情的配慮を完全に排除してください。
あなたの目的は、提示された設計・コードを全肯定することではなく、「どこに破綻・見落とし・バイアス・脆弱性・論理の飛躍があるか」を冷徹に暴き、第一原理（First Principles）に基づいて極限まで洗練させることです。

本プロンプトには、開発中の学術特化型単語帳SaaS「Vocab Vault」のシステム要件、ビジネスモデル、および全ソースコード（HTML, JavaScript, TypeScript Edge Functions, PostgreSQL Schema）が含まれています。
これらを全て精密に精読した上で、本番リリース時に破綻・炎上・不正利用・データ損失・赤字を招くリスクや改善点を徹底的に洗い出してください。

---

## 1. プロダクト概要 & 仕様要件
- **プロダクト名**: Vocab Vault（ヴォキャブ・ヴォールト）
- **コンセプト**: 印欧祖語(PIE)語根ネットワーク、思想・概念史、SM-2間隔反復を統合した学術・教養特化型インテリジェント単語帳
- **価格体系**:
  - Freeプラン: ¥0/月（AI新規生成 1日30語まで、共有辞書キャッシュ・オフライン機能・SM-2復習は完全無制限）
  - Proプラン: ¥480/月（Stripe月額サブスクリプション。AI生成無制限、長文・画像OCR抽出、語根グラフ、端末間同期）
  - Developer Master Edition: `dev.html` または `?dev=master` による完全無制限アクセス
- **技術スタック**:
  - フロントエンド: Vanilla JS (ES6+), PWA (Service Worker), macOS ネイティブバンドル (ブラウザ枠なし独立起動)
  - ストレージ: LocalStorage (5MB) + IndexedDB (大容量フェイルセーフ) + Supabase PostgreSQL (端末間差分同期)
  - AIプロキシ: Supabase Edge Functions (Deno / TypeScript) -> Google Gemini 3.8 Flash (`gemini-3.8-flash`) + 0.1秒共有辞書キャッシュテーブル (`global_dictionary_cache`)
  - OCRエンジン: クリップボード画像直接貼り付け (Cmd+V)、ドラッグ＆ドロップ、Gemini Vision Multimodal API (`inlineData`)
  - 決済基盤: Stripe Checkout / Billing (月額480円) + Stripe Webhooks + Customer Portal

---

## 2. 重点監査項目（Critical Review Dimensions）
1. **セキュリティ & AIタダ乗り・DoS対策**
   - Supabase Edge Functions (`vocab-generate`) に対するIPベース/ユーザーベースのレート制限、クォータ判定の抜け穴はないか？
   - プロンプトインジェクション（長文OCRや単語入力からシステムプロンプトの改変や不正出力を引き出す攻撃）に対する防壁は万全か？
2. **コスト構造 & ユニットエコノミクス (¥480/月)**
   - 月額480円の低価格設定に対し、ヘビーユーザーが毎日多数の語彙や画像を生成した場合のGemini API費用とStripe決済手数料（3.6%）で赤字転落するリスクはないか？
   - 共有キャッシュテーブル (`global_dictionary_cache`) のヒット率を高める正規化キー構造に死角はないか？
3. **データ整合性 & オフライン同期 (LWW vs Tombstone)**
   - 複数端末（Macアプリとスマホ）で同時に編集・削除・SM-2復習を行った際、Last-Write-Wins (LWW) とTombstone（削除墓石）でデータの先祖返りや消失が起きないか？
   - LocalStorageからIndexedDBへの移行時の競合やデータ整合性の破撻リスクはないか？
4. **OCR & マルチモーダル処理**
   - クリップボードからのスクショ貼り付け（Cmd+V）やCanvasでのJPEG画像圧縮処理において、メモリリークや超大容量画像でのクラッシュリスクはないか？
5. **法務・規約・ストア規約**
   - 日本の特定商取引法（定期課金の解約明示）およびApple/Googleストア審査（アカウント完全削除機能、リーダーアプリ規約）に完全に適合しているか？

---

## 3. 回答フォーマット要求
以下の形式で、具体的かつ実装コード/SQL付きで提示してください：
- **🔴 P0 (致命的・リリース阻止リスク)**: 資金流出、データ全消失、重大なセキュリティ脆弱性
- **🟠 P1 (高優先度・整合性/法務リスク)**: Webhook/同期エッジケース、法規制抵触、UX離脱要因
- **🟡 P2 (中優先度・品質/スケーラビリティ改善)**: パフォーマンス、コード保守性、CVR改善
- **💡 戦略的提言**: 今後スケールするための技術・製品ロードマップ

※「よくできています」などの褒め言葉は一切不要です。問題点と具体的な修正コード/SQLのみを提示してください。

---

## 4. 全ソースコード (Complete Source Code)
"""

FILES = [
    ("index.html", "html", "【ファイル: index.html — メインUI・PWA構造・モーダル定義】"),
    ("dev.html", "html", "【ファイル: dev.html — 開発者マスター版（課金制限完全バイパス）】"),
    ("supabase/schema.sql", "sql", "【ファイル: supabase/schema.sql — データベーススキーマ・RLS・クォータ管理・差分同期RPC】"),
    ("supabase/functions/vocab-generate/index.ts", "typescript", "【ファイル: supabase/functions/vocab-generate/index.ts — AIプロキシ・キャッシュ・クォータ制御】"),
    ("supabase/functions/delete-account/index.ts", "typescript", "【ファイル: supabase/functions/delete-account/index.ts — アカウント完全抹消・Stripe定期課金即時解約】"),
    ("js/app.js", "javascript", "【ファイル: js/app.js — コアロジック・UI制御・暗記復習・語根ネットワーク】"),
    ("js/sync.js", "javascript", "【ファイル: js/sync.js — Supabase差分同期・Stripe決済・クォータクライアント】"),
    ("js/storage.js", "javascript", "【ファイル: js/storage.js — 階層化ストレージ (LocalStorage + IndexedDB + Tombstone)】"),
    ("js/anki.js", "javascript", "【ファイル: js/anki.js — SM-2アルゴリズム・スワイプ復習・オフラインキュー】"),
]

def main():
    parts = [HEADER]
    for rel_path, lang, title in FILES:
        full_path = os.path.join(BASE_DIR, rel_path)
        if not os.path.exists(full_path):
            print(f"Warning: {full_path} not found!")
            continue
        with open(full_path, "r", encoding="utf-8") as f:
            content = f.read()
        parts.append(f"\n### {title}\n```{lang}\n{content}\n```\n")

    full_output = "\n".join(parts)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(full_output)

    print(f"Successfully generated {OUTPUT_FILE} ({len(full_output)} bytes)")

if __name__ == "__main__":
    main()
