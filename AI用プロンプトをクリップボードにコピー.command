#!/bin/bash
# Vocab Vault — AI監査パック一発コピーランチャー
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TARGET_FILE="${DIR}/ALL_IN_ONE_AI_PROMPT.md"

if [ -f "${TARGET_FILE}" ]; then
  pbcopy < "${TARGET_FILE}"
  osascript -e 'display notification "AI用プロンプトと全コード（約360KB）をクリップボードにコピーしました！ClaudeやChatGPTにCmd+Vで貼り付けてください。" with title "Vocab Vault AI監査パック" sound name "Glass"' 2>/dev/null
  echo "=========================================================="
  echo " [完了] クリップボードに一括コピーしました！"
  echo ""
  echo " Claude / ChatGPT / Gemini / DeepSeek などを開き、"
  echo " 入力欄で [Cmd + V] を押してそのまま送信してください。"
  echo "=========================================================="
else
  echo "[エラー] ${TARGET_FILE} が見つかりません。"
fi
sleep 2
