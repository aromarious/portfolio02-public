#!/bin/bash

# Supabase Database Backup Script
# ローカル環境での手動バックアップ実行用

set -e

# 設定
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="${PROJECT_ROOT}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="portfolio_backup_${TIMESTAMP}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

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
Usage: $0 [OPTIONS]

Supabase database backup script for local execution.

OPTIONS:
    -h, --help          Show this help message
    -u, --url URL       Database URL (if not set in environment)
    -o, --output DIR    Output directory (default: ${BACKUP_DIR})
    -c, --compress      Compress backup file with gzip (default: true)
    --no-compress       Skip compression
    --verify            Verify backup integrity after creation
    --dry-run           Show what would be done without executing

ENVIRONMENT VARIABLES:
    SUPABASE_DB_URL     PostgreSQL connection URL
    POSTGRES_URL        Alternative name for database URL

EXAMPLES:
    # Basic usage (requires SUPABASE_DB_URL environment variable)
    $0

    # With custom database URL
    $0 --url "postgresql://user:pass@host:port/db"

    # Custom output directory with verification
    $0 --output ./my-backups --verify

    # Dry run to see what would happen
    $0 --dry-run

EOF
}

# 引数解析
DB_URL=""
OUTPUT_DIR="${BACKUP_DIR}"
COMPRESS=true
VERIFY=false
DRY_RUN=false

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
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -c|--compress)
            COMPRESS=true
            shift
            ;;
        --no-compress)
            COMPRESS=false
            shift
            ;;
        --verify)
            VERIFY=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

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

# 出力ディレクトリ設定
BACKUP_DIR="$OUTPUT_DIR"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"
COMPRESSED_PATH="${BACKUP_DIR}/${COMPRESSED_FILE}"

# pg_dump の存在確認
if ! command -v pg_dump &> /dev/null; then
    log_error "pg_dump not found. Please install PostgreSQL client tools."
    log_info "On macOS: brew install postgresql"
    log_info "On Ubuntu: sudo apt-get install postgresql-client"
    exit 1
fi

# ドライランモード
if [[ "$DRY_RUN" == "true" ]]; then
    log_info "DRY RUN MODE - No actual backup will be created"
    echo
    log_info "Configuration:"
    echo "  Database URL: ${DB_URL:0:20}..."
    echo "  Backup file: ${BACKUP_PATH}"
    echo "  Compress: $COMPRESS"
    echo "  Verify: $VERIFY"
    echo
    log_info "Would create directory: $BACKUP_DIR"
    log_info "Would run: pg_dump with specified options"
    if [[ "$COMPRESS" == "true" ]]; then
        log_info "Would compress: ${BACKUP_PATH} -> ${COMPRESSED_PATH}"
    fi
    if [[ "$VERIFY" == "true" ]]; then
        log_info "Would verify backup integrity"
    fi
    exit 0
fi

# 実際のバックアップ実行
log_info "Starting Supabase database backup..."
log_info "Timestamp: $TIMESTAMP"

# バックアップディレクトリ作成
log_info "Creating backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# バックアップ実行
log_info "Creating database backup: $BACKUP_FILE"
log_info "This may take a few minutes depending on database size..."

pg_dump "$DB_URL" \
    --verbose \
    --no-password \
    --format=plain \
    --clean \
    --if-exists \
    --create \
    --encoding=UTF8 \
    --no-owner \
    --no-privileges \
    > "$BACKUP_PATH"

# バックアップファイル確認
if [[ ! -f "$BACKUP_PATH" ]]; then
    log_error "Backup file was not created: $BACKUP_PATH"
    exit 1
fi

if [[ ! -s "$BACKUP_PATH" ]]; then
    log_error "Backup file is empty: $BACKUP_PATH"
    exit 1
fi

BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
log_success "Backup created successfully (Size: $BACKUP_SIZE)"

# 圧縮
if [[ "$COMPRESS" == "true" ]]; then
    log_info "Compressing backup file..."
    gzip "$BACKUP_PATH"
    
    COMPRESSED_SIZE=$(du -h "$COMPRESSED_PATH" | cut -f1)
    log_success "Backup compressed (Size: $COMPRESSED_SIZE)"
    FINAL_PATH="$COMPRESSED_PATH"
else
    FINAL_PATH="$BACKUP_PATH"
fi

# 整合性チェック
if [[ "$VERIFY" == "true" ]]; then
    log_info "Verifying backup integrity..."
    
    if [[ "$COMPRESS" == "true" ]]; then
        # 圧縮ファイルの整合性チェック
        if gzip -t "$COMPRESSED_PATH"; then
            log_success "Compressed file integrity verified"
        else
            log_error "Compressed file is corrupted"
            exit 1
        fi
        
        # SQLファイルの基本チェック
        log_info "Checking SQL content..."
        gunzip -c "$COMPRESSED_PATH" | head -10 > /dev/null
        log_success "SQL content verification completed"
    else
        # 非圧縮ファイルの基本チェック
        head -10 "$BACKUP_PATH" > /dev/null
        log_success "Backup file verification completed"
    fi
fi

# 完了サマリー
echo
log_success "=== Backup Summary ==="
echo "  Timestamp: $TIMESTAMP"
echo "  Output file: $FINAL_PATH"
echo "  File size: $(du -h "$FINAL_PATH" | cut -f1)"
echo "  Compression: $([[ "$COMPRESS" == "true" ]] && echo "Enabled" || echo "Disabled")"
echo "  Verification: $([[ "$VERIFY" == "true" ]] && echo "Completed" || echo "Skipped")"
echo

log_info "Backup completed successfully!"
log_info "To restore this backup, use: scripts/restore-supabase.sh $FINAL_PATH"