#!/bin/bash

# Quick Metrics Check - 主要ディレクトリのみチェック
set -e

RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "🔍 Quick Code Metrics Check"
echo "=========================="
echo ""

# 主要ディレクトリのみに限定
TARGET_DIRS="apps/nextjs/src packages/api/src packages/ui/src"

# 1. 行数TOP10 (簡易版 - wc使用)
echo "📊 行数の多いファイル TOP10"
echo "----------------------------"
find $TARGET_DIRS -name "*.ts" -o -name "*.tsx" | grep -v node_modules | \
  xargs wc -l 2>/dev/null | \
  grep -v " total$" | \
  sort -nr | \
  head -10 | \
  while read lines file; do
    if [ "$lines" -gt 500 ]; then
      echo -e "${RED}⚠️  ${lines} lines: ${file}${NC}"
    elif [ "$lines" -gt 300 ]; then
      echo -e "${YELLOW}⚡ ${lines} lines: ${file}${NC}"
    else
      echo -e "${GREEN}✓  ${lines} lines: ${file}${NC}"
    fi
  done

echo ""
echo "=========================="
echo "詳細なメトリクスレポートは以下を実行:"
echo "  pnpm exec tsg --tsconfig ./apps/nextjs/tsconfig.json --metrics --include \"src\""
echo ""
echo "または既存のレポートを確認:"
echo "  cat typescript-graph.md | grep -A 20 \"Code Metrics\""