# データベーススキーマ変更ワークフロー

このドキュメントでは、データベーススキーマ変更時のローカル開発環境とVercelデプロイ環境での手順を説明します。

## 概要

本プロジェクトではDrizzle ORMとDrizzle Kitを使用してデータベーススキーマを管理しています。環境に応じて適切なコマンドを使い分ける必要があります。

### 利用可能なコマンド

- `pnpm db:generate` - マイグレーションファイル生成
- `pnpm db:migrate` - マイグレーション実行（本番向け）
- `pnpm db:push` - スキーマ直接適用（開発向け）
- `pnpm db:studio` - データベース管理UI

## ローカル開発環境での手順

### 🔧 開発中の迅速ワークフロー（推奨）

```bash
# 1. Dockerデータベース起動
pnpm docker:dev:up

# 2. スキーマファイルを編集
# packages/db/src/schema.ts を変更

# 3. 直接データベースに適用（マイグレーションファイルなし）
pnpm db:push

# 4. 確認（必要に応じて）
pnpm db:studio
```

**特徴**：

- ✅ 瞬時にスキーマ変更を適用
- ✅ 開発中の試行錯誤に最適
- ✅ マイグレーションファイル管理不要
- ❌ マイグレーション履歴は残らない

### 📋 本番準備ワークフロー（PR作成前）

```bash
# 1. Dockerデータベース起動
pnpm docker:dev:up

# 2. スキーマファイルを編集
# packages/db/src/schema.ts を変更

# 3. マイグレーションファイル生成
pnpm db:generate

# 4. ローカルでマイグレーション実行
pnpm db:migrate

# 5. 動作確認
pnpm db:studio

# 6. ビルドテスト
pnpm build
```

**重要**：PR作成前は必ずマイグレーションファイルを生成してください。

## Vercelデプロイ環境での動作

### 自動実行される処理

Vercelデプロイ時は以下が自動実行されます：

```bash
# Next.jsビルドスクリプト内で実行
pnpm --filter @aromarious/db migrate && next build
```

**設定場所**：`apps/nextjs/package.json`

```json
{
  "scripts": {
    "build": "pnpm --filter @aromarious/db migrate && next build"
  }
}
```

### デプロイ要件

✅ **必須**：マイグレーションファイルがリポジトリに含まれていること

- `packages/db/drizzle/` ディレクトリ内の `.sql` ファイル
- `pnpm db:generate` で生成される

✅ **必須**：本番環境変数の設定

- `POSTGRES_URL` - PostgreSQL接続文字列
- その他環境依存変数

## トラブルシューティング

### よくある問題と解決方法

#### 1. ビルド時のPostgreSQL接続エラー

```bash
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**原因**：ローカルDockerが起動していない
**解決**：`pnpm docker:dev:up`

#### 2. マイグレーションファイルが見つからない

```bash
No migration files found
```

**原因**：`pnpm db:generate` を実行していない
**解決**：

```bash
pnpm db:generate
git add packages/db/drizzle/
git commit
```

#### 3. スキーマとデータベースの不整合

**解決（開発環境）**：

```bash
# データベースリセット
pnpm docker:dev:down
pnpm docker:dev:up
pnpm db:push  # または pnpm db:migrate
```

## ベストプラクティス

### 開発フロー

1. **開発中**: `pnpm db:push` で迅速反復
2. **機能完成**: `pnpm db:generate` でマイグレーション作成
3. **PR作成前**: `pnpm build` で本番動作確認
4. **デプロイ**: Vercelが自動的に `db:migrate` 実行

### 注意事項

- ⚠️ `db:push` は開発専用（本番使用禁止）
- ⚠️ マイグレーションファイルは必ずコミット
- ⚠️ 破壊的変更は事前に影響範囲を確認
- ⚠️ 本番データベースの直接操作は避ける

### ファイル管理

```
packages/db/
├── src/schema.ts          # スキーマ定義
├── drizzle/              # 生成されたマイグレーション
│   ├── 0000_xxx.sql
│   ├── 0001_yyy.sql
│   └── meta/
└── drizzle.config.ts     # Drizzle設定
```

**重要**：`drizzle/` ディレクトリ全体をGit管理に含める

## 関連コマンドリファレンス

### データベース操作

```bash
pnpm db:generate    # マイグレーションファイル生成
pnpm db:migrate     # マイグレーション実行
pnpm db:push        # スキーマ直接適用（開発用）
pnpm db:studio      # データベース管理UI起動
```

### Docker操作

```bash
pnpm docker:dev:up    # 開発用PostgreSQL起動
pnpm docker:dev:down  # 開発用PostgreSQL停止
pnpm docker:logs      # ログ確認
```

### 開発・ビルド

```bash
pnpm dev            # 開発サーバー起動
pnpm build          # 本番ビルド（マイグレーション含む）
pnpm typecheck      # 型チェック
```
