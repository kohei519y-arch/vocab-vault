#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate an isolated, self-contained AI Review Prompt text file for the
Vocab Vault Etymology Network & Skill Tree module (語源ネットワーク & スキルツリー).
"""

import os
import re

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    index_html_path = os.path.join(base_dir, 'index.html')
    css_path = os.path.join(base_dir, 'css', 'app.css')
    graph_js_path = os.path.join(base_dir, 'js', 'graph.js')
    eiken_catalog_path = os.path.join(base_dir, 'js', 'eiken_catalog.js')

    # 1. Extract HTML
    with open(index_html_path, 'r', encoding='utf-8') as f:
        html_lines = f.readlines()
    # Lines 1021 to 1145 (0-indexed: 1020 to 1145)
    html_snippet = "".join(html_lines[1020:1145])

    # 2. Extract CSS
    with open(css_path, 'r', encoding='utf-8') as f:
        css_lines = f.readlines()
    # Part 1: graph modal, tabs, drawers (949 to 1380)
    css_part1 = "".join(css_lines[948:1380])
    # Part 2: eiken drawer, cards, skill pills (2130 to 2330)
    css_part2 = "".join(css_lines[2130:2330])
    css_snippet = "/* === PART 1: Modal, Canvas, Breadcrumbs, Drawers, Tabs === */\n" + css_part1 + "\n\n/* === PART 2: Skill Tree Drawer, Pills, Cards, Unlock Buttons === */\n" + css_part2

    # 3. Read JS
    with open(graph_js_path, 'r', encoding='utf-8') as f:
        graph_js = f.read()

    with open(eiken_catalog_path, 'r', encoding='utf-8') as f:
        eiken_catalog_js = f.read()

    prompt_content = f"""# ==============================================================================
# VOCAB VAULT: 語源ネットワーク & スキルツリー (Etymology Network & RPG Skill Tree)
# 他AI向け 改善提案・コードレビュー依頼用プロンプト (AI Evaluation & Improvement Prompt)
# ==============================================================================

あなたは、世界最高峰のフロントエンドアーキテクト、ゲームUI/UXデザイナー、および認知言語学（語源・概念記憶）の専門家です。
知的語彙学習PWA/Web/Macアプリ「Vocab Vault」における最大の特徴的機能である
【語源ネットワーク & 語彙スキルツリー（Etymology Lineage & RPG Skill Tree）】
の完全なソースコード（HTML、CSS、JavaScriptエンジン、語根カタログデータ）を提示します。

この機能は、印欧祖語（PIE: Proto-Indo-European）の語根（Root）を根幹として、
古代ギリシャ・ラテン語などの古典分岐（Branch）、現代英単語（Leaf）、未習得スキル（Locked Skill Bud）、派生語・連語（Twig）の
4階層系統樹を有機的に視覚化し、ゲームのスキルツリーのように語彙アビリティを解放・覚醒・記憶定着させる仕組みです。

現在、基本機能とデザイン刷新は完了していますが、さらにユーザーをワクワクさせ、
「語彙がみるみる頭に入る」「ゲームのようにスキルツリーを埋めたくなる」「操作が直感的で圧倒的にみやすい」
体験へと昇華させるための【忌憚のない改善提案・斬新なアイデア・具体的なリファクタ/追加コード】を求めています。

--------------------------------------------------------------------------------
目次 (TABLE OF CONTENTS)
--------------------------------------------------------------------------------
1. システム概要と設計思想 (System Overview & Philosophy)
2. レビュー・改善提案を求めたい5つの重点領域 (5 Target Review Areas)
3. 厳格な技術的制約 (Technical Constraints)
4. 切り離しHTML構造 (HTML: #graphModal UI)
5. 切り離しCSSスタイル (CSS: Graph & Skill Tree)
6. 語根・語彙データカタログ (JS: VocabEikenCatalog)
7. 語源ネットワーク & スキルツリー 完全実装コード (JS: VocabGraph)
8. 回答フォーマットの指定 (Output Instructions)
--------------------------------------------------------------------------------

================================================================================
1. システム概要と設計思想 (System Overview & Philosophy)
================================================================================
【コンセプト】
・単なる「英単語の暗記帳」を脱し、古代印欧祖語（PIE語根）のコアイメージ（例: *kap- = 掴む/捉える）から
  英語・フランス語・ドイツ語・日本語の学術・抽象語彙がどのように進化したかを立体的に理解する。
・ゲームのスキルツリー（Skill Tree / Tech Tree）にインスパイアされた「語彙覚醒」システム：
  未登録の重要単語が「未習得スキル（Locked Bud）」として霧（Fog of War）の中に浮かび、
  タップすることでWeb Audioシンセのファンファーレと光波パーティクル演出とともに単語帳に追加される。
・4つの実用ビューモードを搭載：
  1) 「ネットワーク」: 力学シミュレーションによる星系クラスタ俯瞰
  2) 「系統樹ツリー」: 4階層（語根 -> 古典分岐 -> 見出し語/未習得スキル -> 派生語）の決定論的ツリー配置
  3) 「マインドマップ」: DOMアウトライナーによる高速スクロール・印刷対応
  4) 「接頭辞×語根」: 形態素マトリクス・周期表パズルグリッド

================================================================================
2. レビュー・改善提案を求めたい5つの重点領域 (5 Target Review Areas)
================================================================================
以下の5つの観点について、現状の課題の指摘と、具体的かつ革新的な改善案・アイデアを提示してください。

【観点1: ゲーム感覚のスキルツリーUI/UXとワクワク感（Gamification）】
- 現状、コズミック方眼グリッド、ルーン星屑ピン、ネクサスオーラ、黄金南京錠アイコン、Web Audio 4音チャイム、波紋パーティクルを実装しています。
- さらに「RPGのスキルツリーを解放していくような高揚感・達成感」を高めるための演出、視覚エフェクト、プログレス可視化、解放アニメーション等のアイデアはありますか？

【観点2: 圧倒的なみやすさ・視認性と直感性（Information Design & Visual Hierarchy）】
- 語根数が数十〜数百、単語数が1,000語以上にスケールした際、画面が煩雑（スパゲッティ状態）になるのを防ぎつつ、
  「一目でどの系統樹か」「どの語根が何個の単語と繋がっているか」が直感把握できるビジュアルデザインやレイアウトアルゴリズムの改善案はありますか？
- 現在実装しているSemantic Zoom（俯瞰モード -> ピル型標準モード -> ミニカード型顕微鏡モード）の閾値や表現力に対するフィードバック。

【観点3: 語源学習・認知言語学的な学習定着効果（Cognitive Linguistics & Retention）】
- 印欧祖語の「コアイメージ（原義）」と、現代英語の各単語の「意味の飛躍・転義」を、図上でより直感的に結びつける仕掛け。
- FSRS (Free Spaced Repetition Scheduler) の記憶忘却曲線データ（安定度S、想起率R）と系統樹グラフィックの連動（葉の茂り、枝の太さ、水やり復習など）をさらに効果的にするアイデア。

【観点4: Canvas 2D パフォーマンスと物理シミュレーション（Performance & Architecture）】
- 外部ライブラリ（D3.js, Pixi.js, Three.js等）を一切使わず、Pure Canvas 2Dで実装しています。
- 力学シミュレーション（斥力、引力、重力、スリープ収束）やビューポートカリングの最適化余地。
- 60fpsを維持しながらモバイルや低スペック端末でも省電力に動作するアルゴリズムの改善案。

【観点5: 新機能・新規インタラクションの提案（Innovative Feature Ideas）】
- 語源ネットワーク画面内で完結する「語源クイズ/想起ミニゲーム（Boss Battle / Skill Trial）」や、
  異なる語根同士の意外な交差点（Cognate Crossroad）の可視化など、ユーザーが夢中になる新機能の提案。

================================================================================
3. 厳格な技術的制約 (Technical Constraints)
================================================================================
提案および提示するコードは、以下のプロダクション制約を必ず厳守してください：
1. **外部依存ライブラリの完全排除（Zero External Dependencies）**:
   D3.js, Cytoscape, Vis.js, Three.js 等のライブラリは一切追加せず、ブラウザ標準の HTML5 Canvas 2D / Web Audio API / Pure CSS / Vanilla JavaScript のみで動作すること。
2. **絵文字ゼロポリシー（Strict 0% Emoji Policy）**:
   アイコンやシンボルにUnicode絵文字は一切使用せず、Canvas 2D Path または SVG ベクター描画、テキスト記号のみを使用すること。
3. **既存DOM IDおよびAPIとの互換性**:
   `VocabGraph.focusRoot()`, `VocabGraph.toggleEikenExplorer()`, `VocabGraph.unlockCurrentRootEikenWords()`, `#graphCanvas`, `#graphEikenDrawer` 等の既存ハンドラ・DOM IDを破壊しないこと。
4. **マルチデバイス対応**:
   デスクトップのマウス/トラックパッド、iOS/Androidのタッチ・ピンチズーム双方で破綻なく動作すること。

================================================================================
4. 切り離しHTML構造 (HTML: #graphModal UI)
================================================================================
```html
{html_snippet}
```

================================================================================
5. 切り離しCSSスタイル (CSS: Graph & Skill Tree)
================================================================================
```css
{css_snippet}
```

================================================================================
6. 語根・語彙データカタログ (JS: VocabEikenCatalog)
================================================================================
```javascript
{eiken_catalog_js}
```

================================================================================
7. 語源ネットワーク & スキルツリー 完全実装コード (JS: VocabGraph)
================================================================================
```javascript
{graph_js}
```

================================================================================
8. 回答フォーマットの指定 (Output Instructions)
================================================================================
回答は以下の構成で、具体的かつ論理的に記述してください：

1. **総合評価・ファーストインプレッション (Executive Summary)**
   - 現状アーキテクチャの強みと、最も改善インパクトが大きいボトルネックの指摘。

2. **5つの重点領域に対する具体的な改善提案 (Detailed Improvement Proposals)**
   - 【観点1: ゲーム感覚とスキルツリーUI/UX】具体的な演出・ゲームメカニクス案
   - 【観点2: 視認性・みやすさ】レイアウト・カラー・フォント・LODの改善案
   - 【観点3: 認知言語学・学習効果】コアイメージと転義の結びつけ・復習連動案
   - 【観点4: Canvas 2D パフォーマンス】アルゴリズム・物理演算・描画最適化案
   - 【観点5: 新機能・インタラクション】ユーザーを夢中にさせる新機能アイデア

3. **即戦力となる具体的なコード差分・拡張スニペット (Production-Ready Code Snippets)**
   - 提案した改善のうち、特に効果的なUI演出やアルゴリズムについて、そのまま適用可能な高品質なVanilla JS / CSSコードスニペットを提示してください。
"""

    output_dir = os.path.join(base_dir, 'ai_audit_prompts')
    os.makedirs(output_dir, exist_ok=True)
    
    txt_prompt_path = os.path.join(output_dir, 'ETYMOLOGY_GRAPH_REVIEW_PROMPT.txt')
    with open(txt_prompt_path, 'w', encoding='utf-8') as f:
        f.write(prompt_content)

    # Also place at root workspace for convenient copy/access
    root_txt_path = os.path.join(base_dir, 'ETYMOLOGY_GRAPH_REVIEW_PROMPT.txt')
    with open(root_txt_path, 'w', encoding='utf-8') as f:
        f.write(prompt_content)

    print(f"Generated: {txt_prompt_path} ({len(prompt_content)} chars, {os.path.getsize(txt_prompt_path)} bytes)")
    print(f"Generated: {root_txt_path} ({len(prompt_content)} chars, {os.path.getsize(root_txt_path)} bytes)")

if __name__ == '__main__':
    main()
