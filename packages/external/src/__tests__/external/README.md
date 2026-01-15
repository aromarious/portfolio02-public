# External Services Integration Tests

実際のNotionとSlackAPIを使用した外部サービス統合テストです。

## 🚀 セットアップ

### 1. テスト用環境の準備

#### Notion設定

1. **テスト専用ワークスペース**を作成
2. **テスト用データベース**を作成し、以下のプロパティを設定:
   - `name` (Title) - 問い合わせ者の名前
   - `email` (Email) - メールアドレス
   - `message` (Text) - 問い合わせ内容
   - `created_at` (Date) - 受信日時
   - `status` (Select) - ステータス（`pending`, `in-progress`, `completed`）
3. **Notion Integration**を作成してAPIトークンを取得
4. データベースにIntegrationをコネクト

> **Note**: プロパティ名は英語に統一されています。これによりテーブルのカラム名と対応関係が明確になります。

#### Slack設定

1. **テスト専用チャンネル**を作成
2. **Incoming Webhook**を設定してWebhook URLを取得

### 2. External Integrationテスト設定

External Integrationテストは**ハイブリッド方式**で設定できます：

#### 方式1: 環境変数（推奨 - コマンドライン実行時）

プロジェクトの`.envrc`ファイルで管理され、macOS Keychainから認証情報を安全に読み込みます：

```bash
# テスト用のキーをKeychainに保存
security add-generic-password -a portfolio02 -s ENABLE_REAL_API_TESTS -w "true"
security add-generic-password -a portfolio02 -s NOTION_TEST_API_TOKEN -w "secret_your_test_token"
security add-generic-password -a portfolio02 -s NOTION_TEST_PARENT_PAGE_ID -w "your_test_database_id"
security add-generic-password -a portfolio02 -s SLACK_TEST_WEBHOOK_URL -w "https://hooks.slack.com/services/YOUR/TEST/WEBHOOK"

# ディレクトリに移動すると自動的に環境変数が読み込まれます
cd /path/to/portfolio02-external
```

#### 方式2: 設定ファイル（推奨 - VS Code Test Explorer実行時）

VS Code Test Explorerでは環境変数が読み込まれないため、設定ファイルを使用：

```bash
# サンプルファイルをコピー
cp packages/external/external.config.example.json packages/external/external.config.local.json

# 実際の値を設定
```

`packages/external/external.config.local.json`:

```json
{
  "enableRealApiTests": true,
  "notion": {
    "apiToken": "secret_your_token",
    "databaseId": "your_database_id"
  },
  "slack": {
    "webhookUrl": "https://hooks.slack.com/services/YOUR/TEST/WEBHOOK"
  }
}
```

> **設定の優先順位**:
>
> 1. **環境変数** (コマンドライン実行時に有効)
> 2. **設定ファイル** (VS Code Test Explorer実行時のフォールバック)
>
> 設定ファイルは以下の順序で検索されます:
>
> - `packages/external/external.config.json`
> - `packages/external/external.config.local.json` (推奨 - gitignore済み)
> - `packages/external/src/__tests__/external/external.config.json`
> - `packages/external/src/__tests__/external/external.config.local.json`

## 🧪 テスト実行

### VS Code Test Explorerから実行

設定ファイル（`external.config.local.json`）が適切に作成されていれば、VS Code Test ExplorerからExternal Integrationテストを直接実行できます。

### コマンドラインから実行

環境変数（`.envrc` + Keychain）または設定ファイルのいずれかが設定されていれば実行できます。

#### 全External Integrationテスト実行

```bash
pnpm test packages/external/src/__tests__/external --run
```

#### 個別テスト実行

```bash
# Notionのみ
pnpm test packages/external/src/__tests__/external/notion-service.external.test.ts --run

# Slackのみ
pnpm test packages/external/src/__tests__/external/slack-service.external.test.ts --run

# オーケストレーター
pnpm test packages/external/src/__tests__/external/external-notification-orchestrator.external.test.ts --run
```

### 設定ファイルなしでの実行

設定ファイルが存在しない場合、または`enableRealApiTests: false`の場合、テストは自動的にスキップされます。

## 📋 テスト項目

### NotionService External Integration Tests

- ✅ データベースへのページ作成
- ✅ ページ内容の検証（名前、メール、メッセージ、ステータス）
- ✅ ページステータス更新
- ✅ 複数ページ一括作成・検索
- ✅ エラーハンドリング（無効データベースID）
- ✅ 自動クリーンアップ（テスト後のページアーカイブ）

### SlackService External Integration Tests

- ✅ Webhook通知送信
- ✅ 日本語・絵文字メッセージ
- ✅ 長文メッセージ
- ✅ 特殊文字を含むメッセージ
- ✅ 連続送信（レート制限テスト）
- ✅ エラーハンドリング（無効Webhook URL）

### ExternalNotificationOrchestrator External Integration Tests

- ✅ 両サービス同時通知
- ✅ 複数問い合わせ一括処理
- ✅ リアルタイム処理性能測定
- ✅ サービス設定状況確認

## ⚠️ 重要な注意事項

### セキュリティ

- **本番環境では絶対に実行しないでください**
- テスト用の専用ワークスペース・チャンネルを使用
- APIトークンやWebhook URLは機密情報として管理

### データ管理

- テストデータは自動でクリーンアップされます
- 失敗時は手動でNotionページをアーカイブしてください
- Slackメッセージは自動削除されません

### CI/CD統合

```yaml
# GitHub Actions例
- name: Run External Integration Tests
  run: pnpm test packages/external/src/__tests__/external --run
  env:
    ENABLE_REAL_API_TESTS: true
    NOTION_TEST_API_TOKEN: ${{ secrets.NOTION_TEST_API_TOKEN }}
    NOTION_TEST_PARENT_PAGE_ID: ${{ secrets.NOTION_TEST_PARENT_PAGE_ID }}
    SLACK_TEST_WEBHOOK_URL: ${{ secrets.SLACK_TEST_WEBHOOK_URL }}
```

## 🐛 トラブルシューティング

### テストがスキップされる

- `ENABLE_REAL_API_TESTS=true`が設定されているか確認
- 必要な環境変数がすべて設定されているか確認

### Notion API エラー

- APIトークンが有効か確認
- データベースIDが正しいか確認
- Integrationがデータベースにコネクトされているか確認

### Slack Webhook エラー

- Webhook URLが有効か確認
- チャンネルが存在するか確認
- Webhookが有効化されているか確認

### パフォーマンス問題

- ネットワーク接続を確認
- API レート制限に注意
- 大量データテスト時は間隔を調整
