# 環境構成

現在のプロジェクトは以下の4つの環境で構成されています：

| 環境                           | Next.js           | PostgreSQL                | Notion | Slack |
| ------------------------------ | ----------------- | ------------------------- | ------ | ----- |
| **ローカル開発環境**           | ローカル          | ローカル (localhost:5432) | 開発   | 開発  |
| **ローカル統合/E2Eテスト環境** | なし              | ローカル (localhost:5433) | 開発   | 開発  |
| **プレビュー環境**             | Vercel Preview    | Supabase (preview schema) | 開発   | 開発  |
| **本番環境**                   | Vercel Production | Supabase (public schema)  | 本番   | 本番  |

## 環境の特徴

### ローカル開発環境

- フルスタック開発環境
- Dockerコンテナを使用したローカルPostgreSQL
- 開発用外部サービス接続

### ローカル統合/E2Eテスト環境

- バックエンドテスト専用（Next.jsなし）
- 別ポート（5433）のPostgreSQLインスタンス
- Vitestによる自動管理

### プレビュー環境

- Vercel Previewデプロイメント
- Supabaseのpreviewスキーマ使用
- 開発用外部サービス接続

### 本番環境

- Vercel Productionデプロイメント
- Supabaseのpublicスキーマ使用
- 本番用外部サービス接続

## データベース切り替え

データベースクライアントは環境に応じて自動的にドライバーを切り替えます：

- **ローカル環境**: `postgres-js` ドライバー
- **本番環境**: `@vercel/postgres` ドライバー（エッジ最適化）

環境検出は `POSTGRES_URL` の値（localhost/127.0.0.1 含有）により自動判定されます。

## 環境変数の切り替え方法

各環境への切り替えは以下の方法で行います：

| 環境                           | 切り替え方法                                                                 |
| ------------------------------ | ---------------------------------------------------------------------------- |
| **ローカル開発環境**           | `.envrc` ファイルによる環境変数設定                                          |
| **ローカル統合/E2Eテスト環境** | `.envrc` + テスト用セットアップスクリプトで `TEST_` 接頭辞付き環境変数を使用 |
| **プレビュー環境**             | Vercelダッシュボードの環境変数設定から                                       |
| **本番環境**                   | Vercelダッシュボードの環境変数設定から                                       |

### 詳細

- **ローカル開発**: `direnv` を使用して `.envrc` から環境変数を自動読み込み
- **テスト環境**: テスト実行時に `TEST_POSTGRES_URL`, `TEST_NOTION_API_TOKEN` 等の変数を優先使用
- **Vercel環境**: Preview/Production それぞれで異なる環境変数セットを設定

## 環境変数一覧

### 共通環境変数

| 変数名         | 説明                          | 例                                       |
| -------------- | ----------------------------- | ---------------------------------------- |
| `AUTH_SECRET`  | better-auth用認証シークレット | base64エンコードされた32バイトランダム値 |
| `POSTGRES_URL` | PostgreSQL接続文字列          | `postgresql://user:pass@host:port/db`    |

### ローカル開発環境 (.envrc)

| 変数名                  | 値               | 説明                       |
| ----------------------- | ---------------- | -------------------------- |
| `DB_HOST`               | `localhost`      | ローカルDockerコンテナ     |
| `DB_PORT`               | `5432`           | 開発用ポート               |
| `DB_NAME`               | `postgres`       | データベース名             |
| `DB_USER`               | Keychainから取得 | データベースユーザー       |
| `DB_PASSWORD`           | Keychainから取得 | データベースパスワード     |
| `SLACK_WEBHOOK_URL`     | Keychainから取得 | 開発用Slack Webhook        |
| `NOTION_API_TOKEN`      | Keychainから取得 | 開発用Notion APIトークン   |
| `NOTION_PARENT_PAGE_ID` | Keychainから取得 | 開発用NotionデータベースID |

### ローカル統合/E2Eテスト環境 (.envrc)

基本的にローカル開発環境と同じだが、以下が異なる：

| 変数名                       | 値                                               | 説明                                                            |
| ---------------------------- | ------------------------------------------------ | --------------------------------------------------------------- |
| `TEST_DB_PORT`               | `5433`                                           | テスト用ポート、DB_PORTを置き換える                             |
| `TEST_POSTGRES_URL`          | `postgresql://user:pass@localhost:5433/postgres` | テスト用DB接続文字列、POSTGRES_URLを置き換える                  |
| `ENABLE_REAL_API_TESTS`      | `true/false`                                     | E2Eテストで実際のAPI呼び出しを有効化                            |
| `NOTION_TEST_API_TOKEN`      | Keychainから取得                                 | テスト用Notion APIトークン、NOTION_API_TOKENを置き換える        |
| `NOTION_TEST_PARENT_PAGE_ID` | Keychainから取得                                 | テスト用NotionデータベースID、NOTION_PARENT_PAGE_IDを置き換える |
| `SLACK_TEST_WEBHOOK_URL`     | Keychainから取得                                 | テスト用Slack Webhook、SLACK_WEBHOOK_URLを置き換える            |

### プレビュー環境 (Vercelダッシュボード)

| 変数名                  | 値                                | 説明                                                                          |
| ----------------------- | --------------------------------- | ----------------------------------------------------------------------------- |
| `POSTGRES_URL`          | Supabase preview schema接続文字列 | `postgresql://user:pass@host:6543/postgres?workaround=supabase-pooler.vercel` |
| `AUTH_SECRET`           | 本番用シークレット                | base64エンコードされた値                                                      |
| `SLACK_WEBHOOK_URL`     | 開発用Webhook                     | 開発チャンネル向け                                                            |
| `NOTION_API_TOKEN`      | 開発用トークン                    | 開発ワークスペース向け                                                        |
| `NOTION_PARENT_PAGE_ID` | 開発用データベースID              | 開発データベース                                                              |

### 本番環境 (Vercelダッシュボード)

| 変数名                  | 値                               | 説明                                                                          |
| ----------------------- | -------------------------------- | ----------------------------------------------------------------------------- |
| `POSTGRES_URL`          | Supabase public schema接続文字列 | `postgresql://user:pass@host:6543/postgres?workaround=supabase-pooler.vercel` |
| `AUTH_SECRET`           | 本番用シークレット               | base64エンコードされた値                                                      |
| `SLACK_WEBHOOK_URL`     | 本番用Webhook                    | 本番チャンネル向け                                                            |
| `NOTION_API_TOKEN`      | 本番用トークン                   | 本番ワークスペース向け                                                        |
| `NOTION_PARENT_PAGE_ID` | 本番用データベースID             | 本番データベース                                                              |
