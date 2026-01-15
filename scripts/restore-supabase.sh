#!/bin/bash

# Supabase Database Restore Script
# バックアップファイルからデータベースを復旧

set -e

# 設定
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログ関数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 使用方法の表示
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS] <BACKUP_FILE>

Supabase database restore script for emergency recovery.

ARGUMENTS:
    BACKUP_FILE         Path to backup file (.sql or .sql.gz)

OPTIONS:
    -h, --help          Show this help message
    -u, --url URL       Target database URL (if not set in environment)
    --dry-run           Show restore commands without executing
    --force             Skip confirmation prompts (dangerous!)
    --verify            Verify restore by checking table counts
    --clean             Drop existing data before restore (dangerous!)

ENVIRONMENT VARIABLES:
    SUPABASE_DB_URL     PostgreSQL connection URL for target database
    POSTGRES_URL        Alternative name for database URL

EXAMPLES:
    # Basic restore with confirmation
    $0 backups/portfolio_backup_20250712_170219.sql.gz

    # Restore to different database
    $0 --url "postgresql://user:pass@host:port/testdb" backup.sql.gz

    # Dry run to see what would happen
    $0 --dry-run backup.sql.gz

    # Force restore without confirmation (use with caution!)
    $0 --force --clean backup.sql.gz

WARNINGS:
    - This will OVERWRITE existing data in the target database
    - Always verify the target database URL before proceeding
    - Consider creating a backup of the target database first
    - Use --clean with extreme caution as it drops existing data

EOF
}

# 引数解析
BACKUP_FILE=""
DB_URL=""
DRY_RUN=false
FORCE=false
VERIFY=false
CLEAN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_usage
            exit 0
            ;;
        -u|--url)
            DB_URL="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --verify)
            VERIFY=true
            shift
            ;;
        --clean)
            CLEAN=true
            shift
            ;;
        -*)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
        *)
            if [[ -z "$BACKUP_FILE" ]]; then
                BACKUP_FILE="$1"
            else
                log_error "Multiple backup files specified"
                show_usage
                exit 1
            fi
            shift
            ;;
    esac
done

# バックアップファイル確認
if [[ -z "$BACKUP_FILE" ]]; then
    log_error "Backup file not specified"
    show_usage
    exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

# データベースURL取得
if [[ -z "$DB_URL" ]]; then
    if [[ -n "$SUPABASE_DB_URL" ]]; then
        DB_URL="$SUPABASE_DB_URL"
    elif [[ -n "$POSTGRES_URL" ]]; then
        DB_URL="$POSTGRES_URL"
    else
        log_error "Database URL not provided. Set SUPABASE_DB_URL environment variable or use --url option."
        exit 1
    fi
fi

# PostgreSQLツールの確認
if ! command -v psql &> /dev/null; then
    log_error "psql not found. Please install PostgreSQL client tools."
    log_info "On macOS: brew install postgresql@17"
    log_info "On Ubuntu: sudo apt-get install postgresql-client"
    exit 1
fi

# バックアップファイル形式判定
BACKUP_TYPE=""
if [[ "$BACKUP_FILE" == *.gz ]]; then
    BACKUP_TYPE="compressed"
    RESTORE_CMD="gunzip -c \"$BACKUP_FILE\" | psql \"$DB_URL\""
elif [[ "$BACKUP_FILE" == *.sql ]]; then
    BACKUP_TYPE="plain"
    RESTORE_CMD="psql \"$DB_URL\" < \"$BACKUP_FILE\""
else
    log_error "Unknown backup file format. Expected .sql or .sql.gz"
    exit 1
fi

# ファイルサイズ表示
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log_info "Backup file: $BACKUP_FILE ($BACKUP_SIZE)"

# ドライランモード
if [[ "$DRY_RUN" == "true" ]]; then
    log_info "DRY RUN MODE - No actual restore will be performed"
    echo
    log_info "Configuration:"
    echo "  Backup file: $BACKUP_FILE"
    echo "  Backup type: $BACKUP_TYPE"
    echo "  Target DB: ${DB_URL:0:30}..."
    echo "  Clean mode: $CLEAN"
    echo "  Verify: $VERIFY"
    echo
    log_info "Would execute restore command:"
    echo "  $RESTORE_CMD"
    
    if [[ "$VERIFY" == "true" ]]; then
        log_info "Would verify restore by checking table counts"
    fi
    exit 0
fi

# 危険性警告・確認
if [[ "$FORCE" != "true" ]]; then
    echo
    log_warning "⚠️  DANGER: Database Restore Operation"
    echo
    echo "This operation will restore data to the target database:"
    echo "  Target: ${DB_URL:0:50}..."
    echo "  Source: $BACKUP_FILE"
    echo "  Size: $BACKUP_SIZE"
    echo
    if [[ "$CLEAN" == "true" ]]; then
        log_error "CLEAN MODE: This will DROP EXISTING DATA before restore!"
    else
        log_warning "This may overwrite existing data in the database"
    fi
    echo
    echo "Please verify the target database URL is correct."
    echo
    read -p "Do you want to proceed? (type 'yes' to continue): " -r
    if [[ ! "$REPLY" == "yes" ]]; then
        log_info "Restore cancelled by user"
        exit 0
    fi
fi

# 実際の復旧実行
log_info "Starting database restore..."
log_info "Target database: ${DB_URL:0:50}..."
log_info "Backup file: $BACKUP_FILE"

# データベース接続テスト
log_info "Testing database connection..."
if ! psql "$DB_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    log_error "Cannot connect to target database"
    log_info "Please check the database URL and ensure the database is accessible"
    exit 1
fi
log_success "Database connection successful"

# 復旧前のテーブル数取得（比較用）
if [[ "$VERIFY" == "true" ]]; then
    log_info "Collecting pre-restore statistics..."
    TABLES_BEFORE=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")
    log_info "Tables in public schema before restore: $TABLES_BEFORE"
fi

# 復旧実行
log_info "Executing database restore..."
log_info "This may take several minutes depending on backup size..."

if [[ "$BACKUP_TYPE" == "compressed" ]]; then
    # 圧縮ファイルの復旧
    log_info "Decompressing and restoring from $BACKUP_FILE..."
    if gunzip -c "$BACKUP_FILE" | psql "$DB_URL"; then
        log_success "Restore completed successfully"
    else
        log_error "Restore failed"
        exit 1
    fi
else
    # 非圧縮ファイルの復旧
    log_info "Restoring from $BACKUP_FILE..."
    if psql "$DB_URL" < "$BACKUP_FILE"; then
        log_success "Restore completed successfully"
    else
        log_error "Restore failed"
        exit 1
    fi
fi

# 復旧後の検証
if [[ "$VERIFY" == "true" ]]; then
    log_info "Verifying restore..."
    
    # テーブル数チェック
    TABLES_AFTER=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0")
    log_info "Tables in public schema after restore: $TABLES_AFTER"
    
    # 主要テーブルの存在確認
    log_info "Checking critical tables..."
    CONTACT_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM public.contact;" 2>/dev/null || echo "ERROR")
    PERSON_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM public.person;" 2>/dev/null || echo "ERROR")
    
    if [[ "$CONTACT_COUNT" == "ERROR" ]] || [[ "$PERSON_COUNT" == "ERROR" ]]; then
        log_warning "Could not verify critical tables (they may not exist yet)"
    else
        log_info "Contact records: $CONTACT_COUNT"
        log_info "Person records: $PERSON_COUNT"
    fi
    
    log_success "Verification completed"
fi

# 完了サマリー
echo
log_success "=== Restore Summary ==="
echo "  Source file: $BACKUP_FILE"
echo "  File size: $BACKUP_SIZE"
echo "  Target database: ${DB_URL:0:50}..."
echo "  Restore type: $BACKUP_TYPE"
if [[ "$VERIFY" == "true" ]]; then
    echo "  Tables before: $TABLES_BEFORE"
    echo "  Tables after: $TABLES_AFTER"
    if [[ "$CONTACT_COUNT" != "ERROR" ]]; then
        echo "  Contact records: $CONTACT_COUNT"
        echo "  Person records: $PERSON_COUNT"
    fi
fi
echo

log_success "Database restore completed successfully!"
log_info "Please verify your application is working correctly with the restored data"