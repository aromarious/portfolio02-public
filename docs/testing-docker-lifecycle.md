# テスト環境でのDocker管理

## 統合テストでのDockerライフサイクル管理

統合テスト実行時のDockerコンテナの管理方法について説明します。

### 基本的な流れ

統合テストは以下のライフサイクルで実行されます：

1. **テスト開始前**: テスト用PostgreSQLコンテナを起動
2. **テスト実行**: データベースを使用したテストを実行
3. **テスト終了後**: コンテナを**停止**（削除はしない）

### なぜコンテナを削除しないのか

テスト終了後にコンテナを停止のみにしている理由：

- **デバッグ目的**: テスト実行後にデータベースの中身を確認できる
- **データ永続化**: テストで作成されたデータを検査できる
- **トラブルシューティング**: テスト失敗時の原因調査が容易

### 利用可能なコマンド

#### テスト実行コマンド

```bash
# 統合テストを実行（テスト後はコンテナ停止のみ）
pnpm test:integration

# 統合テスト（ウォッチモード）
pnpm test:integration:watch
```

#### Docker管理コマンド

```bash
# テスト用DBコンテナの起動
pnpm docker:test:up

# テスト用DBコンテナの停止（データ保持）
pnpm docker:test:stop

# テスト用DBコンテナの完全削除（データも削除）
pnpm docker:test:down

# 統合テスト後のクリーンアップ（手動実行用）
pnpm test:integration:cleanup
```

### データベース接続方法

テスト実行後にデータベースの中身を確認する方法：

#### 1. コマンドラインからの接続

```bash
# テスト用データベースに接続
psql postgresql://postgres:password@localhost:5433/postgres
```

#### 2. Prisma Studioの使用

```bash
# テスト用データベースでPrisma Studioを起動
TEST_POSTGRES_URL="postgresql://postgres:password@localhost:5433/postgres" pnpm db:studio
```

#### 3. 外部ツールの使用

- **pgAdmin**: ホスト `localhost`, ポート `5433`
- **DBeaver**: 同様の設定
- **TablePlus**: 同様の設定

### 設定の詳細

#### 環境変数

- `TEST_DB_PORT`: テスト用データベースのポート（デフォルト: 5433）
- `DB_USER`: データベースユーザー（デフォルト: postgres）
- `DB_PASSWORD`: データベースパスワード（デフォルト: password）
- `DB_NAME`: データベース名（デフォルト: postgres）

#### Docker Compose Profile

テスト用コンテナは `test` プロファイルで管理されています：

```yaml
postgres-test:
  image: postgres:16-alpine
  profiles:
    - test # 統合テスト環境でのみ起動
```

### ベストプラクティス

1. **定期的なクリーンアップ**: 不要になったテストデータは定期的に削除
2. **開発環境との分離**: テスト用DB（ポート5433）と開発用DB（ポート5432）は独立
3. **データ検査**: テスト失敗時は必ずデータベース状態を確認
4. **リソース管理**: 長期間使わない場合は `pnpm test:integration:cleanup` でリソース解放

### トラブルシューティング

#### コンテナが起動しない場合

```bash
# Docker状態の確認
docker ps -a

# ログの確認
pnpm docker:logs

# 強制リセット
pnpm docker:test:down
pnpm docker:test:up
```

#### データベース接続エラー

```bash
# データベースの準備状態確認
pg_isready -h localhost -p 5433 -U postgres -d postgres

# ポート競合の確認
lsof -i :5433
```
