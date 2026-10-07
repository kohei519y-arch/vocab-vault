# ステップ3：Wiktionaryデータ利用のライセンス確認書＆帰属表示ガイド

## 1. Wiktionaryのライセンス体系

Wiktionaryのコンテンツは以下のデュアルライセンス（またはCC BY-SA単独）で提供されています：
- **Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)**
- **GNU Free Documentation License (GFDL)**（※一部過去の版）

---

## 2. 商用利用における重要要件

### ① 帰属表示（Attribution）の義務
Wiktionaryのテキストや解説スニペットを利用・二次利用する場合、以下の表示が法律上義務付けられます：
- **元データの提供元**: 「Wiktionary (ウィクショナリー)」
- **ライセンス名**: 「CC BY-SA 4.0」へのリンクまたは明記
- **該当ページへのハイパーリンク**: 各単語のWiktionary元URL（例: `https://en.wiktionary.org/wiki/institution`）

### ② 継承条項（Share-Alike）とアプリ全体の保護
- **懸念点**: CC BY-SAのデータを改変してアプリのソースコードや独自コンテンツに混ぜると、「アプリ全体をCC BY-SAで公開しなければならないのか？」という疑問が生じます。
- **実務上の解決策（分離設計）**:
  1. **事実（Fact）の利用**: 発音記号（IPA）や語源の系譜関係（「ラテン語 *habere* に由来」等）は言語学的事実・データであり、著作権法上は保護対象外（著作権は創作的表現にのみ及ぶ）と解釈されます。
  2. **引用・参照の明示**: Wiktionaryの解説テキストをそのまま引用・照合する場合は、独立したデータソース（`wiktionary_references` テーブルやWiktionaryリンクボタン）として独立して管理し、**「本機能の一部辞書データはWiktionary（CC BY-SA 4.0）を利用しています」**と明記することで、アプリ本体のプロプライエタリなソースコードへの波及を防ぎます。

---

## 3. アプリ内・Webサイトでのクレジット表記文面案

### 設定画面（またはフッター）の表記
```html
<p class="license-credit">
  本サービスの発音記号および一部語源対照データは、
  <a href="https://www.wiktionary.org/" target="_blank" rel="noopener">Wiktionary</a>
  のデータを参照・加工して利用しています（<a href="https://creativecommons.org/licenses/by-sa/4.0/deed.ja" target="_blank" rel="noopener">CC BY-SA 4.0</a>）。
</p>
```

### 各単語カードの表示
各カードの「Wiktionary裏付」ピルから、当該単語のWiktionary個別記事（URL）へダイレクトにリンクを張ることで、帰属表示要件を100%充足します。
