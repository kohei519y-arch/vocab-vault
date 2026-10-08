# 🛡️ Vocab Vault — Cloudflare WAF & DoS 保護設定ガイド
本ドキュメントは、Vocab Vault の商用運用において、AIプロキシエンドポイント（`vocab-generate`）および認証基盤を DDoS / 秒間スクリプト連打から完全防護するための Cloudflare WAF レート制限設定手順書です。

Cloudflare の無料プラン（Free Tier）で利用可能な機能のみで完全防護が可能です。

---

## 1. 概要 & 防御アーキテクチャ

```
[クライアント (Browser / PWA)]
        │
        ▼ (HTTPS)
┌──────────────────────────────────────────────┐
│ Cloudflare Edge Network (WAF レイヤー)       │
│  - ルール1: vocab-generate 毎分20リクエスト/IP  │ ──> 超過時: Cloudflare Edge で 429 即時遮断
│  - ルール2: ボット・異常User-Agent遮断       │
└──────────────────────────────────────────────┘
        │ (正常トラフィックのみ通過)
        ▼
┌──────────────────────────────────────────────┐
│ Supabase Edge Functions                      │
│  - インメモリ秒間バースト遮断 (2秒5回)         │
│  - PostgreSQL アトミックRPC クォータ判定      │
│  - 共有辞書キャッシュ (90%ヒット)            │
└──────────────────────────────────────────────┘
```

---

## 2. Cloudflare ダッシュボード設定手順

### Step 1: レート制限ルール（Rate Limiting Rule）の作成
1. Cloudflare ダッシュボードにログインし、該当ドメインを選択。
2. 左メニュー **「セキュリティ (Security)」 > 「WAF」 > 「レート制限ルール (Rate Limiting Rules)」** を開く。
3. **「ルールを作成 (Create rule)」** をクリック。

#### 設定パラメータ:
* **ルール名**: `Vocab Vault - AI Proxy Protection`
* **受信リクエストが一致する場合 (If incoming requests match)**:
  * フィールド: `URI パス (URI Path)`
  * 演算子: `次に一致する (equals)` または `次で始まる (starts with)`
  * 値: `/functions/v1/vocab-generate`
* **リクエスト頻度のしきい値 (Rate limit threshold)**:
  * **リクエスト数**: `20`
  * **期間**: `1 分 (1 minute)`
* **追跡基準 (Track requests by)**: `IP アドレス (IP address)`
* **しきい値を超えた場合のアクション (Action when rate exceeds)**:
  * アクション: `ブロック (Block)`
  * 期間: `60 秒 (60 seconds)`
  * レスポンス形式: `カスタム JSON (Custom JSON)`
  * レスポンスコード: `429`
  * レスポンス本文:
    ```json
    {
      "error": "リクエスト回数の制限を超過しました。1分後に再度お試しください。(Protected by Cloudflare)"
    }
    ```

---

### Step 2: セキュリティレベル & ボット対策
1. 左メニュー **「セキュリティ」 > 「設定 (Settings)」** を開く。
2. **セキュリティレベル (Security Level)**: `標準 (Medium)` または `高 (High)` に設定。
3. **ボットファイトモード (Bot Fight Mode)**: `オン (On)` に設定（無料）。悪意あるスクレイパーや既知の攻撃ツールを自動検知してブロックします。

---

### Step 3: IPヘッダー透過の確認
Vocab Vault の Edge Functions (`vocab-generate`) は、Cloudflare の透過ヘッダー `cf-connecting-ip` を最優先で参照するように実装されています。
プロキシ（オレンジ色の雲アイコン ☁️）を有効にするだけで、クライアントの真のIPアドレスが自動的に安全に伝達されます。

---

## 3. 設定後の検証方法
ターミナルから以下の curl コマンドで高頻度リクエストを送信し、21回目のリクエストで Cloudflare から `429 Too Many Requests` が返却されることを確認してください。

```bash
for i in {1..25}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST "https://your-domain.com/functions/v1/vocab-generate" \
    -H "Content-Type: application/json" \
    -d '{"items":[]}'
done
```
* **期待される結果**: 20回目までは `400`（ペイロード不正など関数の正常応答）、21回目以降は即座に `429` が返却される。
