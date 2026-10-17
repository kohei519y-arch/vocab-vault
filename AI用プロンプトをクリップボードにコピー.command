#!/bin/bash
# Vocab Vault — AI監査パック一発コピーランチャー
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROMPTS_DIR="${DIR}/ai_audit_prompts"

clear
echo "=========================================================="
echo "  Vocab Vault — AI再監査プロンプト選択メニュー (全32ファイル)"
echo "=========================================================="
echo ""
echo " 送信先のAI（ChatGPT / Claude / Gemini）に合わせて番号を入力してください:"
echo ""
echo " [1] 【最推奨】Finder でフォルダを開く（.txt ファイルをドラッグ＆ドロップ）"
echo "     -> AIが100%読める「Part1」「Part2」「Part3」の.txtファイルが入った"
echo "        フォルダを開きます。チャット画面に放り込むだけでOK！"
echo ""
echo " [2] Part 1: バックエンド・DB・Stripe・同期（約367KB）をクリップボードにコピー"
echo "     -> チャット欄にテキストとして直接貼り付けたい場合（1通目）"
echo ""
echo " [3] Part 2: フロントエンドコア・FSRS忘却曲線・復習UI（約358KB）をコピー"
echo "     -> チャット欄にテキストとして直接貼り付けたい場合（2通目）"
echo ""
echo " [4] Part 3: 語源ネットワーク・系統樹・英検カタログ・OCR（約566KB）をコピー"
echo "     -> チャット欄にテキストとして直接貼り付けたい場合（3通目）"
echo ""
echo " [5] 全量オールインワン版（約1.2MB）をコピー"
echo "     -> Google AI Studio / Gemini 2.0 Pro 等の超長文対応AI向け"
echo ""
echo " [6] 指示文のみ（約19KB）をクリップボードにコピー"
echo ""
echo " [7] 語源ネットワーク単体レビュープロンプト（約254KB）をコピー"
echo ""
read -p " 選択番号を入力してください [1-7] (初期値: 1): " CHOICE

if [ -z "$CHOICE" ]; then
  CHOICE="1"
fi

case "$CHOICE" in
  1)
    open "$PROMPTS_DIR"
    osascript -e 'display notification "フォルダを開きました。Part1, Part2, Part3の.txtファイルをチャット画面にドラッグ＆ドロップしてください。" with title "Vocab Vault AI監査" sound name "Glass"' 2>/dev/null
    echo ""
    echo " [完了] Finder で ai_audit_prompts フォルダを開きました！"
    echo ""
    echo " --- 送信手順（AIが100%確実に読み取れます）---"
    echo " 1. 「Part1_Backend_DB_Sync.txt」をチャット画面にドラッグ＆ドロップして送信"
    echo " 2. 続けて「Part2_Frontend_Logic_FSRS.txt」をドラッグ＆ドロップして送信"
    echo " 3. 続けて「Part3_Graph_Catalog_Suite.txt」をドラッグ＆ドロップして送信"
    echo "    （Claudeなら3つ同時にドラッグ＆ドロップでもOKです）"
    echo " --------------------------------------------"
    ;;
  2)
    TARGET="${PROMPTS_DIR}/Part1_Backend_DB_Sync.txt"
    if [ -f "$TARGET" ]; then
      pbcopy < "$TARGET"
      echo ""
      echo " [完了] Part 1: バックエンド編（約367KB）をコピーしました！"
      echo " AIのチャット欄で [Cmd + V] を押して送信してください。"
    fi
    ;;
  3)
    TARGET="${PROMPTS_DIR}/Part2_Frontend_Logic_FSRS.txt"
    if [ -f "$TARGET" ]; then
      pbcopy < "$TARGET"
      echo ""
      echo " [完了] Part 2: フロントエンドコア編（約358KB）をコピーしました！"
      echo " AIのチャット欄で [Cmd + V] を押して送信してください。"
    fi
    ;;
  4)
    TARGET="${PROMPTS_DIR}/Part3_Graph_Catalog_Suite.txt"
    if [ -f "$TARGET" ]; then
      pbcopy < "$TARGET"
      echo ""
      echo " [完了] Part 3: 語源ネットワーク・系統樹・カタログ編（約566KB）をコピーしました！"
      echo " AIのチャット欄で [Cmd + V] を押して送信してください。"
    fi
    ;;
  5)
    TARGET="${PROMPTS_DIR}/VocabVault_All_In_One.txt"
    if [ -f "$TARGET" ]; then
      pbcopy < "$TARGET"
      echo ""
      echo " [完了] 全量オールインワン版（約1.2MB）をコピーしました！"
      echo " Google AI Studio / Gemini 2.0 Pro 等のチャット欄で [Cmd + V] を押して送信してください。"
    fi
    ;;
  6)
    TARGET="${PROMPTS_DIR}/RE_AUDIT_INSTRUCTION_ONLY.txt"
    if [ -f "$TARGET" ]; then
      pbcopy < "$TARGET"
      echo ""
      echo " [完了] 指示文のみ（約19KB）をコピーしました！"
      echo " AIのチャット欄で [Cmd + V] を押して送信してください。"
    fi
    ;;
  7)
    TARGET="${PROMPTS_DIR}/ETYMOLOGY_GRAPH_REVIEW_PROMPT.txt"
    if [ -f "$TARGET" ]; then
      pbcopy < "$TARGET"
      echo ""
      echo " [完了] 語源ネットワーク単体レビュープロンプト（約254KB）をコピーしました！"
      echo " AIのチャット欄で [Cmd + V] を押して送信してください。"
    fi
    ;;
  *)
    echo "[エラー] 無効な選択です。"
    ;;
esac

echo ""
echo "=========================================================="
read -p " Enterキーを押すと終了します..." DUMMY
