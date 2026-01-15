# Supabase バックアップ・復旧システム

ARO-65実装: Supabase無料プラン向けの包括的バックアップ・復旧システム

## 概要

Supabase無料プランでは自動バックアップが提供されないため、データ保護と7日間ルール対策を兼ねた自動バックアップシステムを構築。

### システム特徴

- **週2回自動実行**: 火曜・金曜 3:00 UTC（データ保護 + アクティビティ維持）
- **GitHub Releases保存**: バックアップファイルをリリースとして管理・30日間保持
- **ローカル実行対応**: 手動バックアップ・復旧スクリプト完備
- **包括的カバレッジ**: 全スキーマ（auth、public、preview、realtime、storage）対象

## ファイル構成

```
.github/workflows/supabase-backup.yml  # GitHub Actions自動バックアップ
scripts/backup-supabase.sh             # ローカル実行バックアップスクリプト
scripts/restore-supabase.sh            # 復旧スクリプト
docs/supabase-backup-recovery.md       # このドキュメント
backups/                               # ローカルバックアップ保存先
```

## 自動バックアップ（GitHub Actions）

### スケジュール

- **実行頻度**: 週2回（火曜・金曜 3:00 UTC）
- **対象**: Supabase本番データベース全体
- **保存先**: GitHub Releases（`backup-YYYYMMDD_HHMMSS`タグ）
- **保持期間**: 30日間（古いリリースは自動削除）

### 必要な設定

#### Repository Secrets

GitHub repository設定で以下のSecretを設定:

```
SUPABASE_DB_URL=postgresql://postgres.[USERNAME]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
```

**重要**: ポート5432（直接接続）を使用。6543（pooler）では制限あり。

#### 手動実行

GitHub Actions画面から「Supabase Database Backup」workflowを選択し「Run workflow」で即座実行可能。

### バックアップ内容

- **形式**: PostgreSQL dump（SQL形式）
- **圧縮**: gzip圧縮（通常85%圧縮率）
- **オプション**: `--clean --if-exists --create --no-owner --no-privileges`
- **整合性チェック**: gzipファイル検証 + SQL内容確認

## ローカルバックアップ

### 前提条件

```bash
# PostgreSQL 17クライアントツール必須
brew install postgresql@17

# PATH設定（永続化）
echo 'export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### 基本実行

```bash
# 環境変数設定
export SUPABASE_DB_URL=postgresql://postgres.[USERNAME]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres

# バックアップ実行
./scripts/backup-supabase.sh
```

### 実行オプション

```bash
# 検証付きバックアップ
./scripts/backup-supabase.sh --verify

# カスタム出力ディレクトリ
./scripts/backup-supabase.sh --output /path/to/backup/dir

# 非圧縮バックアップ
./scripts/backup-supabase.sh --no-compress

# ドライラン（実行せずに設定確認）
./scripts/backup-supabase.sh --dry-run
```

### 出力例

```
[SUCCESS] === Backup Summary ===
  Timestamp: 20250712_170219
  Output file: /path/to/backups/portfolio_backup_20250712_170219.sql.gz
  File size: 28K
  Compression: Enabled
  Verification: Completed
```

## データベース復旧

### 緊急復旧手順

```bash
# 1. バックアップファイル確認
ls -la backups/

# 2. ドライラン実行（安全確認）
./scripts/restore-supabase.sh --dry-run backup_file.sql.gz

# 3. 実際の復旧実行
./scripts/restore-supabase.sh backup_file.sql.gz
```

### 復旧オプション

```bash
# 検証付き復旧
./scripts/restore-supabase.sh --verify backup.sql.gz

# 別データベースへの復旧
./scripts/restore-supabase.sh --url "postgresql://..." backup.sql.gz

# 確認なし復旧（自動化向け - 危険）
./scripts/restore-supabase.sh --force backup.sql.gz

# 既存データ削除後復旧（完全リセット - 非常に危険）
./scripts/restore-supabase.sh --force --clean backup.sql.gz
```

### 復旧時の注意点

- **データ上書き**: 既存データが上書きされる可能性
- **URL確認**: 復旧先データベースURLを必ず確認
- **事前バックアップ**: 復旧前に現在のデータをバックアップ推奨
- **アプリケーション停止**: 復旧中はアプリケーション停止推奨

## 災害時復旧シナリオ

### シナリオ1: データ消失・破損

```bash
# 1. 最新バックアップを特定
# GitHub Releases または backups/ ディレクトリから

# 2. アプリケーション停止
# Vercelデプロイメント一時停止など

# 3. データベース復旧
./scripts/restore-supabase.sh --verify latest_backup.sql.gz

# 4. アプリケーション動作確認・再開
```

### シナリオ2: 異なる環境への移行

```bash
# 1. バックアップ作成
./scripts/backup-supabase.sh --verify

# 2. 新環境への復旧
export SUPABASE_DB_URL="postgresql://new-database-url..."
./scripts/restore-supabase.sh --verify backup.sql.gz

# 3. アプリケーション設定更新
```

### シナリオ3: 過去の状態への復旧

```bash
# 1. GitHub Releasesから特定日時のバックアップダウンロード

# 2. 現在のデータベースバックアップ（安全のため）
./scripts/backup-supabase.sh --output ./emergency-backup

# 3. 過去データへの復旧
./scripts/restore-supabase.sh --verify historical_backup.sql.gz
```

## トラブルシューティング

### よくある問題

#### 1. pg_dumpバージョン不一致

```
エラー: サーバーバージョンの不一致のため処理を中断します
```

**解決策**:

```bash
brew install postgresql@17
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
```

#### 2. GitHub Actions失敗

**確認項目**:

- Repository Secrets `SUPABASE_DB_URL` 設定確認
- Supabaseデータベース稼働状況確認
- ネットワーク接続確認

#### 3. 復旧時の権限エラー

**解決策**:

- `--no-owner --no-privileges` オプション使用（スクリプトでデフォルト設定済み）
- 復旧先データベースの権限確認

#### 4. バックアップファイル破損

**確認方法**:

```bash
# 圧縮ファイル整合性チェック
gzip -t backup_file.sql.gz

# SQL内容確認
gunzip -c backup_file.sql.gz | head -20
```

### ログ確認

#### GitHub Actions

- Actions タブ → 「Supabase Database Backup」workflow
- 失敗時は各stepの詳細ログを確認

#### ローカル実行

- スクリプトはカラー付きログ出力
- エラー詳細は標準エラー出力に表示

## 監視・メンテナンス

### 定期確認項目

1. **GitHub Actions成功率**: Actions画面で実行履歴確認
2. **Releases容量**: 30日間の累積サイズ確認
3. **バックアップサイズ推移**: データ増加量の把握
4. **復旧テスト**: 月1回程度の復旧動作確認

### アラート設定

- GitHub Actions失敗時の通知設定
- Supabase 7日間ルール監視（別システムで対応済み）

## セキュリティ考慮事項

### 機密情報保護

- **Repository Secrets**: 環境変数は暗号化保存
- **GitHub Releases**: プライベートリポジトリでのみ使用
- **ローカルバックアップ**: `backups/` ディレクトリを.gitignore設定

### アクセス制御

- バックアップファイルへのアクセスはリポジトリ権限に依存
- 復旧操作は管理者権限必須
- データベース接続情報の適切な管理

## 将来計画

### Pro Plan移行時

- 自動バックアップ機能との併用検討
- より高頻度バックアップ（日次）への変更
- Point-in-Time Recovery活用

### 拡張機能

- AWS S3への追加保存
- 暗号化バックアップ（GPG）
- 差分バックアップシステム
- Slack通知連携

---

## クイックリファレンス

### 緊急時コマンド

```bash
# 即座バックアップ
./scripts/backup-supabase.sh --verify

# 最新バックアップで復旧
./scripts/restore-supabase.sh --verify backups/portfolio_backup_*.sql.gz

# GitHub Actions手動実行
# GitHub → Actions → "Supabase Database Backup" → "Run workflow"
```

### 重要ファイル

- バックアップ: `backups/portfolio_backup_*.sql.gz`
- 復旧スクリプト: `scripts/restore-supabase.sh`
- GitHub Releases: リポジトリページの「Releases」セクション

### 連絡先

システム管理者: aromarious  
Linear Issue: ARO-65
