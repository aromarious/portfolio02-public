#!/bin/bash

# Analyze existing typescript-graph.md metrics
set -e

RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "🔍 Code Metrics Analysis"
echo "========================"

# メトリクスファイルの場所を確認
METRICS_FILE="reports/metrics/latest/typescript-graph-latest.md"
if [ ! -f "$METRICS_FILE" ]; then
  METRICS_FILE="typescript-graph.md"  # fallback to root
  if [ ! -f "$METRICS_FILE" ]; then
    echo "⚠️  メトリクスファイルが見つかりません。生成中..."
    mkdir -p reports/metrics/latest
    pnpm exec tsg --tsconfig ./apps/nextjs/tsconfig.json --metrics --include "src" --exclude "node_modules" > reports/metrics/latest/typescript-graph-latest.md
    METRICS_FILE="reports/metrics/latest/typescript-graph-latest.md"
  fi
fi

echo ""
echo "📊 複雑度の高いコード TOP10"
echo "----------------------------"

# メトリクステーブルから複雑度データを抽出
# ヘッダー行をスキップして、データ行のみ処理
tail -n +5 "$METRICS_FILE" | \
  grep -E "^\|" | \
  grep -v "^\|---" | \
  sed 's/|//g' | \
  awk '{
    file=$1
    type=$2
    name=$3
    mi=$4
    cc=$5
    cog=$6
    lines=$7
    
    # Remove emoji from metrics
    gsub(/[💥🧨]/, "", mi)
    gsub(/[💥🧨]/, "", cc)
    gsub(/[💥🧨]/, "", cog)
    
    if (type == "file" || type == "function" || type == "class") {
      print cc " " cog " " mi " " lines " " file " " type " " name
    }
  }' | \
  sort -nr | \
  head -10 | \
  while read cc cog mi lines file type name; do
    echo ""
    echo -e "📄 ${file}"
    echo -e "   Type: ${type} ${name}"
    
    # Cyclomatic Complexity
    if [ "$cc" -gt 20 ]; then
      echo -e "   ${RED}Cyclomatic: ${cc} (💥 要リファクタリング)${NC}"
    elif [ "$cc" -gt 10 ]; then
      echo -e "   ${YELLOW}Cyclomatic: ${cc} (⚠️  注意)${NC}"
    else
      echo -e "   ${GREEN}Cyclomatic: ${cc} (✓)${NC}"
    fi
    
    # Cognitive Complexity
    if [ "$cog" -gt 15 ]; then
      echo -e "   ${RED}Cognitive: ${cog} (💥 要リファクタリング)${NC}"
    elif [ "$cog" -gt 5 ]; then
      echo -e "   ${YELLOW}Cognitive: ${cog} (⚠️  注意)${NC}"
    else
      echo -e "   ${GREEN}Cognitive: ${cog} (✓)${NC}"
    fi
    
    # Maintainability Index
    mi_value=$(echo "$mi" | bc 2>/dev/null || echo "0")
    if (( $(echo "$mi_value < 20" | bc -l 2>/dev/null || echo "0") )); then
      echo -e "   ${RED}Maintainability: ${mi} (💥 非常に低い)${NC}"
    elif (( $(echo "$mi_value < 50" | bc -l 2>/dev/null || echo "0") )); then
      echo -e "   ${YELLOW}Maintainability: ${mi} (⚠️  低い)${NC}"
    else
      echo -e "   ${GREEN}Maintainability: ${mi} (✓)${NC}"
    fi
    
    echo -e "   Lines: ${lines}"
  done

echo ""
echo "========================"
echo "推奨アクション:"
echo "1. Cyclomatic Complexity > 10 のファイルは関数分割を検討"
echo "2. Cognitive Complexity > 5 のファイルはロジック簡素化を検討"
echo "3. Maintainability Index < 50 のファイルは全体的なリファクタリングを検討"