#!/bin/bash

# Pre-commit metrics check - 変更されたファイルのみチェック
set -e

RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m'

# 変更されたTypeScriptファイルを取得
CHANGED_FILES=$(git diff --cached --name-only --diff-filter=ACMR | grep -E "\.(ts|tsx)$" || true)

if [ -z "$CHANGED_FILES" ]; then
  exit 0
fi

echo "🔍 Checking metrics for changed files..."
echo ""

WARNING_COUNT=0

# 各ファイルの行数をチェック
for file in $CHANGED_FILES; do
  if [ -f "$file" ]; then
    lines=$(wc -l < "$file")
    
    if [ "$lines" -gt 500 ]; then
      echo -e "${RED}⚠️  $file: $lines lines (推奨: < 300)${NC}"
      WARNING_COUNT=$((WARNING_COUNT + 1))
    elif [ "$lines" -gt 300 ]; then
      echo -e "${YELLOW}⚡ $file: $lines lines (推奨: < 300)${NC}"
    fi
  fi
done

if [ "$WARNING_COUNT" -gt 0 ]; then
  echo ""
  echo -e "${YELLOW}⚠️  大きなファイルが検出されました。リファクタリングを検討してください。${NC}"
  echo ""
  echo "ヒント:"
  echo "- 関数を小さく分割する"
  echo "- 責務ごとにファイルを分ける"
  echo "- 共通処理をユーティリティに切り出す"
  echo ""
  echo "無視してコミットする場合: git commit --no-verify"
fi

# 非ブロッキング - 警告のみ
exit 0