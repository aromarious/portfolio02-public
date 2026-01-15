# External Service Integration Package

このパッケージには外部サービス（Notion、Slackなど）との統合機能が含まれています。

## E2Eテストの実行方法

### VS Codeテストエクスプローラーでの実行

E2Eテストは、テストエクスプローラーから直接実行できます。環境変数の設定は次の手順で行います：

1. `packages/external/e2e.config.local.json.example` を `packages/external/e2e.config.local.json` にコピーします
2. `e2e.config.local.json` ファイル内の設定を実際のテスト用APIキーに更新します

```json
{
  "enableRealApiTests": true,
  "notion": {
    "apiToken": "secret_your_notion_test_api_token",
    "parentPageId": "your_notion_parent_page_id"
  },
  "slack": {
    "webhookUrl": "https://hooks.slack.com/services/YOUR/TEST/WEBHOOK"
  }
}
```

### コマンドラインでの実行

コマンドラインでテストを実行する場合は、次のコマンドを使用します：

```bash
# すべてのテストを実行
cd packages/external && pnpm test

# E2Eテストのみを実行
cd packages/external && pnpm test:e2e

# 特定のE2Eテストファイルを実行
cd packages/external && pnpm exec vitest run src/__tests__/e2e/notion-service.e2e.test.ts
```

### 環境変数による設定

`e2e.config.local.json` の代わりに環境変数を直接設定することもできます：

```bash
export ENABLE_REAL_API_TESTS=true
export NOTION_TEST_API_TOKEN=secret_your_notion_test_api_token
export NOTION_TEST_PARENT_PAGE_ID=your_notion_parent_page_id
export SLACK_TEST_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/TEST/WEBHOOK

cd packages/external && pnpm test:e2e
```

## 優先順位

環境変数は次の優先順位で読み込まれます：

1. 環境変数（`process.env`）
2. `e2e.config.local.json` ファイル（VS Codeテストエクスプローラー用）
3. デフォルト値
