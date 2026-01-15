# @aromarious/textlint-config

GarageHub プロジェクト用の textlint 設定パッケージです。AI生成テキストの品質向上と日本語の技術文書の統一を目的としています。

## 特徴

- AI生成テキストの最適化: `@textlint-ja/textlint-rule-preset-ai-writing` でAI特有の表現パターンを検出・改善
- 日本語の技術文書: `preset-ja-technical-writing` で技術文書に適した日本語表現をチェック
- 表記ゆれの統一: 専門用語辞書で開発関連用語の統一

## 使用方法

### package.json で設定

```json
{
  "textlint": {
    "extends": ["@aromarious/textlint-config"]
  }
}
```

### .textlintrc.js で設定

```js
module.exports = {
  extends: ['@aromarious/textlint-config'],
}
```

## 含まれるルール

### AI生成テキスト向け

- 機械的なリスト表現の検出
- 誇張表現の抑制
- 不自然な強調パターンの修正
- コロン使用法の改善

### 日本語の技術文書向け

- 一文の長さ制限（100文字）
- 冗長な敬語表現の回避
- 助詞の連続使用制限
- 半角カナの禁止

### 表記ゆれ統一

- AI/CLI/TypeScript などの技術用語
- ワークスペース/パッケージ/モノレポ などの開発用語
- ドキュメント/プロジェクト/ファイル などの基本用語

## 対象ファイル

- Markdownドキュメント（`docs/` 配下）
- セッションジャーナル
- プロジェクトドキュメント

## MCPサーバとして使用

このパッケージをインストール後、textlintをMCPサーバとして起動できます。

```bash
# パッケージをインストール
npm install textlint @aromarious/textlint-config

# MCPサーバとして起動
npx textlint --mcp
```

Claude Code での設定例（`.claude/settings.json`）です。

```json
{
  "mcpServers": {
    "textlint": {
      "command": "npx",
      "args": ["textlint", "--mcp"],
      "cwd": "/path/to/your/project"
    }
  }
}
```

## 利用可能な機能

MCPサーバとして実行すると、以下の機能が利用できます。

- `textlint_lint`: ファイルまたはテキストをチェック
- `textlint_fix`: 自動修正可能な問題を修正
- `textlint_config`: 設定情報の表示

## カスタマイズ

独自の表記ゆれルールは `prh-rules.yml` を編集してください。
