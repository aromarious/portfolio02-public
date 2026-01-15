# Docker 開発環境設定

このディレクトリには、開発環境で使用するDockerコンテナの設定ファイルが含まれています。

## 関連ファイル

- `docker-compose.yml`: PostgreSQLとpgAdminのDocker Compose設定
- `postgres.conf`: PostgreSQL設定ファイル
- `.env`(プロジェクトルート): Docker Compose用環境変数（プロジェクト名、DB設定など）

## 使用方法

### データベースサービスの起動

```bash
# ルートディレクトリから実行
pnpm docker:up

# または直接実行
cd tooling/docker
docker-compose up -d
```

### サービスの停止

```bash
pnpm docker:down
```

### ログの確認

```bash
pnpm docker:logs
```

## コンテナ名

Docker Composeは自動的に以下の命名規則でコンテナを作成します：
- PostgreSQL: `portfolio02_postgres_1`
- pgAdmin: `portfolio02_pgadmin_1`

プロジェクト名（`portfolio02`）は `.env` の `APP_NAME` で設定されています。

### データベース接続情報

- **PostgreSQL**:
  - Host: `localhost`
  - Port: `5432`
  - Database: `portfolio02`
  - Username: `postgres`
  - Password: `password`

- **pgAdmin**:
  - URL: http://localhost:5050
  - Email: `admin@portfolio02.local`
  - Password: `admin`

### 環境変数の設定

開発環境での使用に合わせて、ルートディレクトリの`.env`ファイルを以下のように設定してください：

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/portfolio02"
POSTGRES_URL="postgresql://postgres:password@localhost:5432/portfolio02"
```

**注意**: `.env`ファイルはNext.jsアプリケーションとDocker環境の両方で共有されます。

## 注意事項

- 本設定は開発環境専用です
- 本番環境では適切なセキュリティ設定を行ってください
- データは`postgres_data`ボリュームに永続化されます
