# Vocab Vault Quick Collector (Browser Extension)

Web閲覧中に選択した英単語・仏単語・独単語を1クリックで Vocab Vault のキューに収集できる公式ブラウザ拡張機能（Manifest V3 準拠）です。

---

## 1. 機能概要

1. **画面上のテキスト選択から1クリック登録**:
   - 英文ニュースや論文、Webページ上の英単語をダブルクリックまたは範囲選択すると、フローティングボタン `[Vaultに追加]` が出現。タップするだけで拡張機能のローカルキューへ即時保存されます。
2. **右クリック・コンテキストメニュー**:
   - 選択文字列の右クリックメニューから「Vocab Vault に追加」または「Vocab Vault で語源を検索」を選択可能。
3. **ポップアップ管理**:
   - 拡張機能アイコンをクリックすると、収集した単語一覧、件数バッジ、手動入力、一括クリップボードコピー（Vocab Vaultの抽出インポート画面へ直接貼り付け可能）が利用可能。

---

## 2. インストール手順

### Google Chrome / Brave / Microsoft Edge
1. Chromeブラウザで `chrome://extensions/` （Edgeの場合は `edge://extensions/`）を開く。
2. 右上の **「デベロッパーモード」** をオンにする。
3. **「パッケージ化されていない拡張機能を読み込む」**（Load unpacked）をクリック。
4. 本リポジトリの `extension` フォルダを選択して読み込み完了。

### Safari (macOS / iOS)
Safari Web Extensions は標準の WebExtensions API (Manifest V3) と互換性があります。
Xcodeのコマンドラインツールを使用してSafari拡張機能プロジェクトへ即時変換可能です：

```bash
xcrun safari-web-extension-converter ./extension --project-location ./safari-extension --app-name "Vocab Vault Collector"
```
生成された Xcode プロジェクトを開き、署名を行ってビルドすることで Safari 拡張機能として動作します。
