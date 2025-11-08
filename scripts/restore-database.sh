#!/bin/bash

# Database Restore Script
# Restores PostgreSQL database from backup files
# Supports: Schema-only, Data-only, Full restore
# Features: Safety checks, verification, rollback support

set -e  # Exit on error
set -u  # Exit on undefined variable

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="${PROJECT_ROOT}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${BACKUP_DIR}/restore_${TIMESTAMP}.log"

# Database configuration
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-aix_survey}"
DB_USER="${POSTGRES_USER:-postgres}"

# ===================================================================
# LOGGING FUNCTIONS
# ===================================================================

log() {
    echo -e "${1}" | tee -a "${LOG_FILE}"
}

log_info() {
    log "${BLUE}[INFO] ${1}${NC}"
}

log_success() {
    log "${GREEN}[SUCCESS] ${1}${NC}"
}

log_warning() {
    log "${YELLOW}[WARNING] ${1}${NC}"
}

log_error() {
    log "${RED}[ERROR] ${1}${NC}"
}

# ===================================================================
# SAFETY CHECKS
# ===================================================================

confirm_restore() {
    local backup_file=$1

    log_warning "=============================================="
    log_warning "  DESTRUCTIVE OPERATION WARNING"
    log_warning "=============================================="
    log_warning "You are about to restore database: ${DB_NAME}"
    log_warning "From backup: $(basename ${backup_file})"
    log_warning ""
    log_warning "This will:"
    log_warning "  - DROP existing tables and data"
    log_warning "  - REPLACE with backup data"
    log_warning "  - CANNOT be undone"
    log_warning "=============================================="

    read -p "$(echo -e ${YELLOW}Type 'YES' to confirm: ${NC})" confirmation

    if [ "${confirmation}" != "YES" ]; then
        log_error "Restore cancelled by user"
        exit 1
    fi

    log_info "Restore confirmed by user"
}

check_backup_file() {
    local backup_file=$1

    if [ ! -f "${backup_file}" ]; then
        log_error "Backup file not found: ${backup_file}"
        exit 1
    fi

    # Verify gzip integrity
    if ! gunzip -t "${backup_file}" 2>&1; then
        log_error "Backup file is corrupted: ${backup_file}"
        exit 1
    fi

    log_success "Backup file verified: $(basename ${backup_file})"
}

# ===================================================================
# PRE-RESTORE BACKUP
# ===================================================================

create_pre_restore_backup() {
    log_info "Creating pre-restore backup (safety measure)..."

    local pre_restore_file="${BACKUP_DIR}/pre_restore_${TIMESTAMP}.sql"

    if command -v pg_dump &> /dev/null; then
        pg_dump \
            --host="${DB_HOST}" \
            --port="${DB_PORT}" \
            --username="${DB_USER}" \
            --dbname="${DB_NAME}" \
            --no-owner \
            --no-privileges \
            --clean \
            --if-exists \
            --file="${pre_restore_file}" 2>&1 || log_warning "Pre-restore backup failed (database may be empty)"

        if [ -f "${pre_restore_file}" ]; then
            gzip -f "${pre_restore_file}"
            log_success "Pre-restore backup created: $(basename ${pre_restore_file}.gz)"
            echo "${pre_restore_file}.gz"
        else
            log_warning "Pre-restore backup not created (database may not exist yet)"
            echo ""
        fi
    else
        log_warning "pg_dump not found, skipping pre-restore backup"
        echo ""
    fi
}

# ===================================================================
# RESTORE FUNCTIONS
# ===================================================================

restore_from_backup() {
    local backup_file=$1

    log_info "Restoring database from: $(basename ${backup_file})"

    # Decompress and restore
    gunzip -c "${backup_file}" | psql \
        --host="${DB_HOST}" \
        --port="${DB_PORT}" \
        --username="${DB_USER}" \
        --dbname="${DB_NAME}" \
        --quiet \
        2>&1 | tee -a "${LOG_FILE}"

    log_success "Database restored successfully"
}

# ===================================================================
# POST-RESTORE VERIFICATION
# ===================================================================

verify_restore() {
    log_info "Verifying database after restore..."

    # Check if database exists and is accessible
    if psql --host="${DB_HOST}" --port="${DB_PORT}" --username="${DB_USER}" --dbname="${DB_NAME}" -c "SELECT 1" &> /dev/null; then
        log_success "Database connection verified"
    else
        log_error "Database connection failed after restore"
        return 1
    fi

    # Count tables
    local table_count=$(psql --host="${DB_HOST}" --port="${DB_PORT}" --username="${DB_USER}" --dbname="${DB_NAME}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null | tr -d ' ')

    if [ -z "${table_count}" ] || [ "${table_count}" -eq 0 ]; then
        log_warning "No tables found in database (schema may be empty)"
    else
        log_success "Database contains ${table_count} table(s)"
    fi

    # Get total row count (estimate)
    log_info "Estimating total row count..."
    local total_rows=0

    while IFS= read -r table; do
        local count=$(psql --host="${DB_HOST}" --port="${DB_PORT}" --username="${DB_USER}" --dbname="${DB_NAME}" -t -c "SELECT COUNT(*) FROM ${table}" 2>/dev/null | tr -d ' ')
        total_rows=$((total_rows + count))
    done < <(psql --host="${DB_HOST}" --port="${DB_PORT}" --username="${DB_USER}" --dbname="${DB_NAME}" -t -c "SELECT tablename FROM pg_tables WHERE schemaname='public'" 2>/dev/null)

    log_success "Total rows in database: ${total_rows}"
}

# ===================================================================
# LIST AVAILABLE BACKUPS
# ===================================================================

list_backups() {
    log_info "Available backups:"
    echo ""

    if [ ! -d "${BACKUP_DIR}" ]; then
        log_warning "No backup directory found"
        return
    fi

    log_info "Schema backups:"
    find "${BACKUP_DIR}/schema" -name "*.sql.gz" -type f 2>/dev/null | while read -r file; do
        local size=$(du -h "$file" | cut -f1)
        local date=$(basename "$file" | sed 's/schema_\(.*\)\.sql\.gz/\1/')
        echo "  - $(basename $file) (${size})"
    done || echo "  None found"

    echo ""
    log_info "Data backups:"
    find "${BACKUP_DIR}/data" -name "*.sql.gz" -type f 2>/dev/null | while read -r file; do
        local size=$(du -h "$file" | cut -f1)
        echo "  - $(basename $file) (${size})"
    done || echo "  None found"

    echo ""
    log_info "Full backups:"
    find "${BACKUP_DIR}/full" -name "*.sql.gz" -type f 2>/dev/null | while read -r file; do
        local size=$(du -h "$file" | cut -f1)
        echo "  - $(basename $file) (${size})"
    done || echo "  None found"

    echo ""
}

# ===================================================================
# FIND LATEST BACKUP
# ===================================================================

find_latest_backup() {
    local backup_type=${1:-full}
    local backup_subdir="${BACKUP_DIR}/${backup_type}"

    if [ ! -d "${backup_subdir}" ]; then
        log_error "No ${backup_type} backup directory found"
        return 1
    fi

    local latest=$(find "${backup_subdir}" -name "*.sql.gz" -type f 2>/dev/null | sort -r | head -n 1)

    if [ -z "${latest}" ]; then
        log_error "No ${backup_type} backups found"
        return 1
    fi

    echo "${latest}"
}

# ===================================================================
# USAGE
# ===================================================================

show_usage() {
    cat << EOF
Database Restore Utility

Usage:
  $(basename $0) [OPTIONS]

Options:
  -f, --file FILE       Restore from specific backup file
  -t, --type TYPE       Restore latest backup of type (schema|data|full)
  -l, --list            List available backups
  -h, --help            Show this help message

Examples:
  # List available backups
  $(basename $0) --list

  # Restore from specific file
  $(basename $0) --file backups/full/full_20241108_120000.sql.gz

  # Restore latest full backup
  $(basename $0) --type full

  # Restore latest schema backup
  $(basename $0) --type schema

EOF
}

# ===================================================================
# MAIN EXECUTION
# ===================================================================

main() {
    local backup_file=""
    local backup_type=""
    local list_only=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--file)
                backup_file="$2"
                shift 2
                ;;
            -t|--type)
                backup_type="$2"
                shift 2
                ;;
            -l|--list)
                list_only=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    log_info "=============================================="
    log_info "  Database Restore Utility"
    log_info "=============================================="
    log_info "Database: ${DB_NAME}"
    log_info "Timestamp: ${TIMESTAMP}"
    log_info "=============================================="
    echo ""

    # List backups if requested
    if [ "${list_only}" = true ]; then
        list_backups
        exit 0
    fi

    # Determine backup file
    if [ -n "${backup_file}" ]; then
        if [ ! -f "${backup_file}" ]; then
            log_error "Backup file not found: ${backup_file}"
            exit 1
        fi
    elif [ -n "${backup_type}" ]; then
        backup_file=$(find_latest_backup "${backup_type}")
        if [ $? -ne 0 ]; then
            exit 1
        fi
        log_info "Using latest ${backup_type} backup: $(basename ${backup_file})"
    else
        log_error "No backup file or type specified"
        show_usage
        exit 1
    fi

    # Check prerequisites
    if ! command -v psql &> /dev/null; then
        log_error "psql command not found. Install PostgreSQL client tools."
        exit 1
    fi

    # Safety checks
    check_backup_file "${backup_file}"

    echo ""
    confirm_restore "${backup_file}"

    # Create pre-restore backup
    echo ""
    pre_restore_backup=$(create_pre_restore_backup)

    # Perform restore
    echo ""
    restore_from_backup "${backup_file}"

    # Verify restore
    echo ""
    verify_restore

    # Final summary
    echo ""
    log_success "=============================================="
    log_success "  Restore Complete!"
    log_success "=============================================="
    log_info "Restored from: $(basename ${backup_file})"
    if [ -n "${pre_restore_backup}" ]; then
        log_info "Pre-restore backup: $(basename ${pre_restore_backup})"
    fi
    log_info "Log file: ${LOG_FILE}"
    echo ""
    log_success "✨ Database restored successfully!"
}

# Run main function
main "$@"
