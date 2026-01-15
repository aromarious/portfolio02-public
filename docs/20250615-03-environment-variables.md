# T3 Turbo 環境変数ガイド

## 🚀 クイックスタート

新しくプロジェクトをセットアップする場合：

```bash
# 1. direnvをインストール（未インストールの場合）
# macOS
brew install direnv
# Ubuntu/Debian
sudo apt install direnv
# Windows
winget install direnv

# 2. シェル設定を追加（.zshrcまたは.bashrc）
echo 'eval "$(direnv hook zsh)"' >> ~/.zshrc

# 3. 自分の環境に合った.envrcファイルにシンボリックリンクを張る
# macOS
ln -sf tooling/direnv/.envrc.macos .envrc
# Linux
ln -sf tooling/direnv/.envrc.linux .envrc
# Windows
mklink .envrc tooling\direnv\.envrc.windows

# 4. .envrcファイルを有効化
direnv allow

# 5. 必須項目を各OSの認証ストアで設定
# macOS (Keychain)
security add-generic-password -a portfolio02 -s AUTH_SECRET -w "$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")"
security add-generic-password -a portfolio02 -s AUTH_DISCORD_ID -w "your_discord_app_id"
security add-generic-password -a portfolio02 -s AUTH_DISCORD_SECRET -w "your_discord_app_secret"

# Linux (pass)
pass insert portfolio02/AUTH_SECRET
pass insert portfolio02/AUTH_DISCORD_ID
pass insert portfolio02/AUTH_DISCORD_SECRET

# Windows (Credential Manager)
cmdkey /generic:portfolio02-AUTH_SECRET /user:portfolio02 /pass:your_auth_secret
cmdkey /generic:portfolio02-AUTH_DISCORD_ID /user:portfolio02 /pass:your_discord_id
cmdkey /generic:portfolio02-AUTH_DISCORD_SECRET /user:portfolio02 /pass:your_discord_secret

# 6. 環境変数を再読み込み
direnv reload

# 7. 開発開始
pnpm dev
```

## 概要

T3 Turboは環境に応じて異なる環境変数管理システムを使用します：

| 環境               | 管理方法            | 設定場所                       | 用途                     |
| ------------------ | ------------------- | ------------------------------ | ------------------------ |
| **ローカル開発**   | direnv+OS認証ストア | `.envrc`(Git管理)+OS認証ストア | Docker + Next.js統合環境 |
| **Vercelデプロイ** | ダッシュボード      | Vercel設定画面                 | 本番・プレビュー環境     |

## 1. 環境変数一覧

### 必須環境変数

| 変数名                | 必須 | 用途                 | 設定場所                     |
| --------------------- | ---- | -------------------- | ---------------------------- |
| `POSTGRES_URL`        | ✅   | データベース接続     | `.envrc` (自動構築) / Vercel |
| `AUTH_SECRET`         | ✅   | 認証秘密キー         | OS認証ストア / Vercel        |
| `AUTH_DISCORD_ID`     | ✅   | Discord OAuth ID     | OS認証ストア / Vercel        |
| `AUTH_DISCORD_SECRET` | ✅   | Discord OAuth Secret | OS認証ストア / Vercel        |

### オプション環境変数

| 変数名               | デフォルト | 用途                |
| -------------------- | ---------- | ------------------- |
| `AUTH_GITHUB_ID`     | -          | GitHub OAuth ID     |
| `AUTH_GITHUB_SECRET` | -          | GitHub OAuth Secret |

### Docker用環境変数

| 変数名         | デフォルト         | 用途                   |
| -------------- | ------------------ | ---------------------- |
| `APP_NAME`     | `portfolio02`      | Docker プロジェクト名  |
| `DB_HOST`      | `localhost`        | データベースホスト     |
| `DB_PORT`      | `5432`             | データベースポート     |
| `DB_NAME`      | `portfolio02`      | データベース名         |
| `DB_USER`      | `postgres`         | データベースユーザー   |
| `DB_PASSWORD`  | `your-db-password` | データベースパスワード |
| `PGADMIN_PORT` | `5050`             | pgAdminアクセスポート  |

## 2. ファイル構成

### `.envrc` (Git管理 ✅)

direnvによる環境変数自動読み込み設定（OS認証ストアから取得）
秘密情報は各OSの認証ストア（macOS: Keychain、Linux: pass、Windows: Credential Manager）に保存されるため、ファイル自体は安全にgit管理可能

### `.env.example` (Git管理 ✅)

新しい開発者向けのテンプレート・ドキュメント（direnv + OS認証ストア使用時の設定手順も含む）

```bash
# Development Environment Variables
APP_NAME="portfolio02"

# 認証設定
AUTH_SECRET='supersecret' # openssl rand -base64 32 で生成
AUTH_DISCORD_ID=''        # Discord Developer Portalから取得
AUTH_DISCORD_SECRET=''    # Discord Developer Portalから取得
AUTH_GITHUB_ID=''         # GitHub Developer Settingsから取得
AUTH_GITHUB_SECRET=''     # GitHub Developer Settingsから取得


# Database設定
DB_HOST=localhost
DB_PORT=5432
DB_NAME=portfolio02
DB_USER=postgres
DB_PASSWORD=your-password

# 自動構築される変数
POSTGRES_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# pgAdmin設定
PGADMIN_PORT=5050
PGADMIN_DEFAULT_EMAIL="your-email@example.com"
PGADMIN_DEFAULT_PASSWORD="${DB_PASSWORD}"
```

### `.env` (Git管理 ❌)

実際の開発環境設定（Docker Compose + Next.js統合）

```bash
# アプリケーション設定
APP_NAME="portfolio02"

# 認証設定（ダミー値）
AUTH_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
AUTH_DISCORD_ID='123456789012345678'
AUTH_DISCORD_SECRET='abcdef1234567890abcdef1234567890'
AUTH_GITHUB_ID='Iv1.abcdef123456'
AUTH_GITHUB_SECRET='abcdef1234567890abcdef1234567890abcdef12'

# Database設定
DB_HOST=localhost
DB_PORT=5432
DB_NAME=portfolio02
DB_USER=postgres
DB_PASSWORD=your-secure-password

# 自動構築される変数
POSTGRES_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# pgAdmin設定
PGADMIN_PORT=5050
PGADMIN_DEFAULT_EMAIL="your-email@example.com"
PGADMIN_DEFAULT_PASSWORD="${DB_PASSWORD}"
```

## 3. 環境別セットアップ

### ローカル開発環境

```bash
# 1. 環境変数ファイル作成
cp .env.example .env

# 2. 必要な設定を編集
# - AUTH_SECRET: openssl rand -base64 32 で生成
# - AUTH_DISCORD_ID/SECRET: Discord Developer Portalで取得

# 3. Docker環境起動（オプション）
pnpm docker:up

# 4. 開発開始
pnpm dev
```

### Vercel本番環境

1. **Vercelダッシュボード**にアクセス
2. **プロジェクト設定 → Environment Variables**
3. **Production環境**に設定：

```bash
POSTGRES_URL=postgres://postgres.[USERNAME]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
AUTH_SECRET=your-production-secret-key
AUTH_DISCORD_ID=your_production_discord_id
AUTH_DISCORD_SECRET=your_production_discord_secret
```

## 4. 特殊機能

### 🔧 POSTGRES_URL自動構築

個別のDB変数から自動的にPOSTGRES_URLを構築：

```bash
DB_HOST=localhost
DB_PORT=5432
DB_NAME=portfolio02
DB_USER=postgres
DB_PASSWORD=your-secure-password

# 自動的に構築される
POSTGRES_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
# → postgresql://postgres:your-secure-password@localhost:5432/portfolio02
```

### 🔄 変数の再利用

```bash
DB_PASSWORD=your-secure-password
PGADMIN_DEFAULT_PASSWORD="${DB_PASSWORD}"  # 同じパスワードを再利用
```

## 5. アーキテクチャ詳細

### Next.js環境変数の読み込み順序

1. `.env.${NODE_ENV}.local` (例: `.env.development.local`)
2. `.env.local` (テスト環境以外)
3. `.env.${NODE_ENV}` (例: `.env.development`)
4. `.env`

### 型安全性 (env.ts)

```typescript
// apps/nextjs/src/env.ts
export const env = createEnv({
  extends: [authEnv(), vercel()],
  server: {
    POSTGRES_URL: z.string().url(),
  },
  shared: {
    NODE_ENV: z.enum(['development', 'production', 'test']),
  },
})

// packages/auth/env.ts
export function authEnv() {
  return createEnv({
    server: {
      AUTH_DISCORD_ID: z.string().min(1),
      AUTH_DISCORD_SECRET: z.string().min(1),
      AUTH_SECRET: z.string().min(1),
    },
  })
}
```

### Turbo.json環境変数管理

```json
{
  "globalEnv": [
    "POSTGRES_URL", // DB接続変更時に再ビルド
    "AUTH_DISCORD_ID", // 認証設定変更時に再ビルド
    "AUTH_DISCORD_SECRET",
    "AUTH_SECRET",
    "PORT"
  ],
  "globalPassThroughEnv": [
    "NODE_ENV", // 実行環境判定
    "CI",
    "VERCEL",
    "VERCEL_ENV",
    "VERCEL_URL"
  ]
}
```

## 6. Expo環境変数の制限

### 現在の仕様

Expoアプリは`EXPO_PUBLIC_`変数を使わず、動的にローカル開発サーバーを検出：

```typescript
// apps/expo/src/utils/base-url.ts
export const getBaseUrl = () => {
  const debuggerHost = Constants.expoConfig?.hostUri
  const localhost = debuggerHost?.split(':')[0]

  if (!localhost) {
    throw new Error('Failed to get localhost.')
  }
  return `http://${localhost}:3000` // Next.jsサーバーに接続
}
```

### セキュリティ注意点

- `EXPO_PUBLIC_`付きの変数はクライアントサイドに含まれる
- 秘密情報は設定しない
- ビルド時に静的に埋め込まれる

## 7. トラブルシューティング

### よくある問題と解決方法

#### 🔍 環境変数が読み込まれない

```bash
# ❌ ファイル名のスペルミス
.env.developement

# ✅ 正しいファイル名
.env.development
.env  # 本プロジェクトで使用
```

#### 📱 Expo→Next.js接続エラー

```typescript
// エラー: Failed to get localhost
// 解決方法:
// 1. Expo開発サーバーを正しく起動: npx expo start
// 2. Next.jsサーバーが起動中: pnpm dev
// 3. ファイアウォール設定を確認
```

#### 🐳 Docker Composeで環境変数が反映されない

```bash
# ❌ 間違った実行場所
cd tooling/docker
docker compose up  # .envが見つからない

# ✅ 正しい実行方法
cd /project-root
pnpm docker:up
# または
docker compose -f tooling/docker/docker-compose.yml up
```

### デバッグ方法

```bash
# 環境変数の確認
pnpm typecheck  # env.tsのバリデーション

# Docker設定の確認
docker compose -f tooling/docker/docker-compose.yml config

# Vercel環境変数のプル
vercel env pull .env.local
```

## 8. ベストプラクティス

### 🔒 セキュリティ原則

```bash
# ❌ 絶対に避ける
# Git管理対象ファイルに秘密情報
AUTH_SECRET=supersecret  # 危険！

# ✅ 正しい方法
# .env（Git管理対象外）に秘密情報
AUTH_SECRET=your-actual-secret
```

### 🚀 開発環境セットアップ

```bash
# 標準的なセットアップフロー
cp .env.example .env
# .envを編集（実際の値を設定）
pnpm dev
```

### 📋チーム開発

- 新しい環境変数は`.env.example`に追加
- 秘密情報の共有は`.env.example`のコメントで説明
- ドキュメントで取得方法を明記

## まとめ

T3 Turboプロジェクトの環境変数管理：

- **統合開発環境**: `.env`ファイルで全設定を管理
- **本番環境**: Vercelダッシュボードで設定
- **セキュリティ**: Git管理対象外ファイルで秘密情報を保護
- **型安全性**: `env.ts`でバリデーション
- **Docker統合**: 同じ変数でDockerとNext.jsを制御

この構成により、セキュリティを保ちながら効率的な開発が可能です。
