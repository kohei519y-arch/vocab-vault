# 🤖 外部AI向けコードレビュー・改善点ヒアリングガイド

Claude 3.7、ChatGPT（o1 / GPT-4o）、DeepSeek R1、Gemini 2.0 Pro など、他の最先端AIに本プロダクトのレビューを依頼するためのプロンプトおよびシステム仕様書一式を用意しました。

---

## 🚀 使い方（1ステップで完了）

1. 詳細な全アーキテクチャ・スキーマ・コード抜粋を含んだ以下のファイルを丸ごとコピー（またはチャットに添付）してください：
   👉 **[`docs/EXTERNAL_AI_REVIEW_PACK.md`](file:///Users/yoshikawakohei/Library/Mobile%20Documents/com~apple~CloudDocs/antigravity/docs/EXTERNAL_AI_REVIEW_PACK.md)**

2. 他のAIチャットの入力欄に貼り付けて送信するだけで、**CTO・セキュリティ監査役・CPOの視点から建前を排した辛口・徹底的な改善レビュー**が返ってきます。

---

## 📌 レビューの主要観点

* **セキュリティ & 権限**: Supabase RLS、Geminiプロキシ、プロンプトインジェクション、BYOK
* **決済 & Stripe**: Webhook冪等性、サブスク解約・期間満了、チャージバック対策、利益率計算
* **データ整合性 & 同期**: LocalStorage/IndexedDBのフェイルセーフ、分散差分同期、Tombstone墓石管理
* **パフォーマンス**: 数千〜万語規模のDOM描画・正規表現検索、PostgreSQLインデックス
* **法務 & ストア要件**: 特商法、GDPR、アカウント完全削除RPC、AI免責
* **UX & CVR**: 無料枠消化時のアップセル導線、オンボーディング、リテンション

---
*詳細仕様書とプロンプト本文は [`docs/EXTERNAL_AI_REVIEW_PACK.md`](file:///Users/yoshikawakohei/Library/Mobile%20Documents/com~apple~CloudDocs/antigravity/docs/EXTERNAL_AI_REVIEW_PACK.md) をご覧ください。*
