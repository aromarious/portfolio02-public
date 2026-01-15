# PostgreSQL 初期化スクリプト

このディレクトリにはPostgreSQLコンテナの初期化時に実行されるスクリプトを配置します。

## 使用方法

1. `.sql`, `.sql.gz`, `.sh` ファイルをこのディレクトリに配置
2. ファイルはアルファベット順で実行されます
3. 実行はデータベースが初回作成時のみ

## ファイルの種類

- `*.sql`: SQLスクリプト
- `*.sql.gz`: 圧縮されたSQLスクリプト
- `*.sh`: シェルスクリプト

## 例

```sql
-- 01-create-extensions.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";
```

```sql
-- 02-initial-data.sql
INSERT INTO users (name, email) VALUES ('Admin', 'admin@example.com');
```

## 注意事項

- スクリプトはroot権限で実行されます
- データベースが既に存在する場合は実行されません
- 開発環境でのみ使用することを推奨します
