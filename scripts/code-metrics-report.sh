#!/bin/bash

# Code Metrics Report Script
# 行数の多いファイルと複雑度の高いファイルを監視

set -e

# 出力ディレクトリ作成
mkdir -p reports/metrics/latest reports/metrics/history

# タイムスタンプ（測定日時）
MEASUREMENT_DATE=$(date +"%Y%m%d")
MEASUREMENT_TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_DIR="reports/metrics/latest"
HISTORY_DIR="reports/metrics/history/${MEASUREMENT_DATE}"

# 既存の最新ファイルを履歴に移動
if [ -f "${REPORT_DIR}/typescript-graph-latest.md" ]; then
  # 既存ファイルから測定日時を抽出（ファイルの更新日時を使用）
  if [ -f "${REPORT_DIR}/typescript-graph-latest.md" ]; then
    OLD_DATE=$(stat -f "%Sm" -t "%Y%m%d" "${REPORT_DIR}/typescript-graph-latest.md" 2>/dev/null || date +"%Y%m%d")
    OLD_HISTORY_DIR="reports/metrics/history/${OLD_DATE}"
    
    # 履歴ディレクトリ作成
    mkdir -p "${OLD_HISTORY_DIR}"
    
    # 既存ファイルを履歴に移動（タイムスタンプ付きで保存）
    OLD_TIMESTAMP=$(stat -f "%Sm" -t "%Y%m%d_%H%M%S" "${REPORT_DIR}/typescript-graph-latest.md" 2>/dev/null || date +"%Y%m%d_%H%M%S")
    mv "${REPORT_DIR}/typescript-graph-latest.md" "${OLD_HISTORY_DIR}/typescript-graph-${OLD_TIMESTAMP}.md"
    
    echo "📁 前回のレポートを履歴に移動: ${OLD_HISTORY_DIR}/typescript-graph-${OLD_TIMESTAMP}.md"
  fi
fi

# カラー定義
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "🔍 Code Metrics Report"
echo "===================="
echo ""

# 1. 行数TOP10 (cloc)
echo "📊 行数の多いファイル TOP10"
echo "----------------------------"
cloc apps packages --by-file-by-lang --include-lang=TypeScript,TSX,JavaScript --exclude-dir=node_modules,dist,build,.next,coverage --quiet --csv | \
  tail -n +2 | \
  grep -E "\.(ts|tsx|js|jsx)$" | \
  awk -F',' '{print $5 " " $2}' | \
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

# 2. TypeScript Graphメトリクス生成
echo "📈 複雑度メトリクス生成中..."
pnpm exec tsg --tsconfig ./apps/nextjs/tsconfig.json --metrics --include "src" --exclude "node_modules" > "${REPORT_DIR}/typescript-graph-${MEASUREMENT_TIMESTAMP}.md" 2>/dev/null || true

# 最新のレポートファイルへのリンクを作成
cp "${REPORT_DIR}/typescript-graph-${MEASUREMENT_TIMESTAMP}.md" "${REPORT_DIR}/typescript-graph-latest.md"

# 今日の履歴ディレクトリにもコピーを保存
mkdir -p "${HISTORY_DIR}"
cp "${REPORT_DIR}/typescript-graph-${MEASUREMENT_TIMESTAMP}.md" "${HISTORY_DIR}/typescript-graph-${MEASUREMENT_TIMESTAMP}.md"

# Maintainability Index (低い順 = 悪い順)
echo ""
echo "🔴 Maintainability Index ワースト10 (50未満は要改善)"
echo "------------------------------------------------"
grep -E "^<tr><th" "${REPORT_DIR}/typescript-graph-latest.md" 2>/dev/null | \
  grep -v "<thead>" | \
  sed 's/<[^>]*>//g' | \
  awk '{if ($2 == "file" || $2 == "function" || $2 == "class") print $4 " " $1 " " $2 " " $3}' | \
  grep -v "^-" | \
  sort -n | \
  head -10 | \
  while read score file type name; do
    # 絵文字を除去
    score_clean=$(echo "$score" | sed 's/[💥🧨]//g')
    if (( $(echo "$score_clean < 20" | bc -l) )); then
      echo -e "${RED}💥 ${score_clean}: ${file} (${type} ${name})${NC}"
    elif (( $(echo "$score_clean < 50" | bc -l) )); then
      echo -e "${YELLOW}⚠️  ${score_clean}: ${file} (${type} ${name})${NC}"
    else
      echo -e "${GREEN}✓  ${score_clean}: ${file} (${type} ${name})${NC}"
    fi
  done

# Cyclomatic Complexity (高い順 = 悪い順)
echo ""
echo "🔴 Cyclomatic Complexity ワースト10 (10超は要改善)"
echo "------------------------------------------------"
grep -E "^<tr><th" "${REPORT_DIR}/typescript-graph-latest.md" 2>/dev/null | \
  grep -v "<thead>" | \
  sed 's/<[^>]*>//g' | \
  awk '{if ($2 == "file" || $2 == "function" || $2 == "class") print $5 " " $1 " " $2 " " $3}' | \
  grep -v "^-" | \
  sort -nr | \
  head -10 | \
  while read complexity file type name; do
    if [ "$complexity" -gt 20 ]; then
      echo -e "${RED}💥 ${complexity}: ${file} (${type} ${name})${NC}"
    elif [ "$complexity" -gt 10 ]; then
      echo -e "${YELLOW}⚠️  ${complexity}: ${file} (${type} ${name})${NC}"
    else
      echo -e "${GREEN}✓  ${complexity}: ${file} (${type} ${name})${NC}"
    fi
  done

# Cognitive Complexity (高い順 = 悪い順)
echo ""
echo "🔴 Cognitive Complexity ワースト10 (5超は要改善)"
echo "-----------------------------------------------"
grep -E "^<tr><th" "${REPORT_DIR}/typescript-graph-latest.md" 2>/dev/null | \
  grep -v "<thead>" | \
  sed 's/<[^>]*>//g' | \
  awk '{if ($2 == "file" || $2 == "function" || $2 == "class") print $6 " " $1 " " $2 " " $3}' | \
  grep -v "^-" | \
  sort -nr | \
  head -10 | \
  while read cognitive file type name; do
    if [ "$cognitive" -gt 15 ]; then
      echo -e "${RED}💥 ${cognitive}: ${file} (${type} ${name})${NC}"
    elif [ "$cognitive" -gt 5 ]; then
      echo -e "${YELLOW}⚠️  ${cognitive}: ${file} (${type} ${name})${NC}"
    else
      echo -e "${GREEN}✓  ${cognitive}: ${file} (${type} ${name})${NC}"
    fi
  done

echo ""
echo "============================================"
echo "凡例:"
echo -e "${RED}💥 要リファクタリング${NC}"
echo -e "${YELLOW}⚠️  注意が必要${NC}"
echo -e "${GREEN}✓  良好${NC}"

# CI環境用: 問題があれば非ゼロで終了
if grep -q "💥" "${REPORT_DIR}/typescript-graph-latest.md" 2>/dev/null; then
  echo ""
  echo "⚠️  リファクタリングが必要なコードが見つかりました"
  exit 1
fi