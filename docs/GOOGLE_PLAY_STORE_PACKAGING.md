# Google Play ストア アプリ化 ＆ パッケージング完全マニュアル
## （TWA: Trusted Web Activity による Android アプリ化）

Vocab Vault は、Google が推奨する公式規格 **TWA (Trusted Web Activity)** に完全対応しています。
これにより、ソースコードを書き換えることなく、**Google Play ストアにネイティブ Android アプリ（.aab / .apk）として公開・配布** できます。

---

## 1. TWA の仕組みとメリット

- **Google Play ストアに本物のアプリとして掲載**: ユーザーは Google Play ストアで検索し、通常のアプリと全く同様にワンタップでインストールできます。
- **ブラウザ枠（Chrome UI）の完全非表示**: アドレスバーやタブは一切表示されず、ネイティブアプリそのものの全画面として動作します。
- **最新版の自動反映**: Webアプリを更新するだけで、Playストア側でアプリの再審査を通さずとも、ユーザーの手元で常に最新版のコードが自動動作します。
- **オフライン動作**: 内蔵の Service Worker により、電波が届かない場所（飛行機や地下鉄）でも完全オフラインで単語帳・復習が動作します。

---

## 2. Android パッケージ（.aab / .apk）のビルド手順

Google 公式の CLI ツール **Bubblewrap (`@bubblewrap/cli`)** を使用します。

### ステップ 1: Bubblewrap のインストール（Node.js 環境）
```bash
npm install -g @bubblewrap/cli
```

### ステップ 2: 本番公開URLからのプロジェクト自動初期化
公開予定のドメイン（例: `https://vocabvault.app`）を指定して初期化します：
```bash
# manifest.json から Android プロジェクトを自動生成
bubblewrap init --manifest https://vocabvault.app/manifest.json
```
*(※ローカルに同梱されている `twa-manifest.json` を使用して直接ビルドすることも可能です)*

### ステップ 3: 署名キーストアの生成と AAB ビルド
```bash
# Android App Bundle (.aab) をビルド
bubblewrap build
```
ビルドが完了すると、`app-release-bundle.aab`（Playストア提出用ファイル）と `app-release-signed.apk`（実機テスト用ファイル）が生成されます。

---

## 3. Google Play ストア（Google Play Console）への公開手順

1. **Google Play Console**（https://play.google.com/console/）にログイン。
2. **「アプリを作成」** をクリック：
   - **アプリ名**: `Vocab Vault — 語源・概念史・単語帳`
   - **デフォルトの言語**: `日本語`
   - **アプリまたはゲーム**: `アプリ`
   - **無料または有料**: `無料`（アプリ内サブスクリプションあり）
3. **App Bundle のアップロード**:
   - 「本番」または「オープンテスト」から、先ほどビルドした `app-release-bundle.aab` をアップロード。
4. **Digital Asset Links の設定（必須）**:
   - Play Console の「設定」>「アプリの署名」から **SHA-256 証明書のフィンガープリント** をコピー。
   - 本リポジトリの `.well-known/assetlinks.json` にそのハッシュ値を貼り付け、公開Webサーバーにアップロードします。
   - これにより、Google は「この Web サイトと Android アプリが同一所有者である」と検証し、ブラウザのURLバーが完全に消えてネイティブアプリ化されます。
5. **審査に提出**:
   - プライバシーポリシーURL（`docs/PRIVACY_POLICY.md`）とスクリーンショットを設定し、審査へ提出します。
   - 通常 1〜3 営業日で Google Play ストアに正式公開されます！

---

## 4. Mac デスクトップでの即時アプリ起動

PC（Mac）環境では、Playストアを介さずとも **今すぐネイティブアプリとして単体起動** できます：

- **Finder で `Vocab Vault.app` をダブルクリックするだけ！**
  - アドレスバーやタブが一切ない、独立した macOS ネイティブアプリウィンドウとして瞬時に立ち上がります。
  - Dock に配置すれば、いつでもワンクリックで起動可能です。
