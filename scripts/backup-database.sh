#!/bin/bash

# Database Backup Script
# Creates comprehensive backups of PostgreSQL database
# Supports: Schema-only, Data-only, Full backups
# Features: Compression, retention policy, verification

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
LOG_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.log"

# Database configuration (from environment or defaults)
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-aix_survey}"
DB_USER="${POSTGRES_USER:-postgres}"

# Backup retention (days)
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

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
# SETUP
# ===================================================================

setup_backup_directory() {
    log_info "Setting up backup directory..."

    # Create backup directory if it doesn't exist
    mkdir -p "${BACKUP_DIR}"
    mkdir -p "${BACKUP_DIR}/schema"
    mkdir -p "${BACKUP_DIR}/data"
    mkdir -p "${BACKUP_DIR}/full"

    # Create .gitignore to prevent committing backups
    cat > "${BACKUP_DIR}/.gitignore" << EOF
# Ignore all backup files
*.sql
*.sql.gz
*.log

# Keep directory structure
!.gitignore
EOF

    log_success "Backup directory ready: ${BACKUP_DIR}"
}

# ===================================================================
# BACKUP FUNCTIONS
# ===================================================================

backup_schema() {
    log_info "Creating schema-only backup..."

    local schema_file="${BACKUP_DIR}/schema/schema_${TIMESTAMP}.sql"

    pg_dump \
        --host="${DB_HOST}" \
        --port="${DB_PORT}" \
        --username="${DB_USER}" \
        --dbname="${DB_NAME}" \
        --schema-only \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists \
        --file="${schema_file}"

    # Compress
    gzip -f "${schema_file}"

    local schema_size=$(du -h "${schema_file}.gz" | cut -f1)
    log_success "Schema backup created: $(basename ${schema_file}.gz) (${schema_size})"

    echo "${schema_file}.gz"
}

backup_data() {
    log_info "Creating data-only backup..."

    local data_file="${BACKUP_DIR}/data/data_${TIMESTAMP}.sql"

    pg_dump \
        --host="${DB_HOST}" \
        --port="${DB_PORT}" \
        --username="${DB_USER}" \
        --dbname="${DB_NAME}" \
        --data-only \
        --no-owner \
        --no-privileges \
        --column-inserts \
        --file="${data_file}"

    # Compress
    gzip -f "${data_file}"

    local data_size=$(du -h "${data_file}.gz" | cut -f1)
    log_success "Data backup created: $(basename ${data_file}.gz) (${data_size})"

    echo "${data_file}.gz"
}

backup_full() {
    log_info "Creating full database backup..."

    local full_file="${BACKUP_DIR}/full/full_${TIMESTAMP}.sql"

    pg_dump \
        --host="${DB_HOST}" \
        --port="${DB_PORT}" \
        --username="${DB_USER}" \
        --dbname="${DB_NAME}" \
        --no-owner \
        --no-privileges \
        --clean \
        --if-exists \
        --file="${full_file}"

    # Compress
    gzip -f "${full_file}"

    local full_size=$(du -h "${full_file}.gz" | cut -f1)
    log_success "Full backup created: $(basename ${full_file}.gz) (${full_size})"

    echo "${full_file}.gz"
}

# ===================================================================
# VERIFICATION
# ===================================================================

verify_backup() {
    local backup_file=$1
    log_info "Verifying backup: $(basename ${backup_file})"

    if [ ! -f "${backup_file}" ]; then
        log_error "Backup file not found: ${backup_file}"
        return 1
    fi

    # Check if file is readable
    if gunzip -t "${backup_file}" 2>&1; then
        log_success "Backup file integrity verified"
        return 0
    else
        log_error "Backup file is corrupted: ${backup_file}"
        return 1
    fi
}

# ===================================================================
# CLEANUP
# ===================================================================

cleanup_old_backups() {
    log_info "Cleaning up backups older than ${RETENTION_DAYS} days..."

    local deleted_count=0

    # Clean schema backups
    find "${BACKUP_DIR}/schema" -name "*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete && deleted_count=$((deleted_count + 1)) || true

    # Clean data backups
    find "${BACKUP_DIR}/data" -name "*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete && deleted_count=$((deleted_count + 1)) || true

    # Clean full backups
    find "${BACKUP_DIR}/full" -name "*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete && deleted_count=$((deleted_count + 1)) || true

    # Clean old log files
    find "${BACKUP_DIR}" -name "*.log" -type f -mtime +${RETENTION_DAYS} -delete || true

    if [ ${deleted_count} -gt 0 ]; then
        log_success "Deleted ${deleted_count} old backup(s)"
    else
        log_info "No old backups to clean"
    fi
}

# ===================================================================
# BACKUP SUMMARY
# ===================================================================

generate_summary() {
    local schema_file=$1
    local data_file=$2
    local full_file=$3

    log_info "Generating backup summary..."

    cat > "${BACKUP_DIR}/backup_${TIMESTAMP}_summary.txt" << EOF
DATABASE BACKUP SUMMARY
=======================

Backup Date: $(date '+%Y-%m-%d %H:%M:%S')
Database: ${DB_NAME}
Host: ${DB_HOST}:${DB_PORT}

BACKUP FILES
============

Schema Backup:
  File: $(basename ${schema_file})
  Size: $(du -h ${schema_file} | cut -f1)
  Path: ${schema_file}

Data Backup:
  File: $(basename ${data_file})
  Size: $(du -h ${data_file} | cut -f1)
  Path: ${data_file}

Full Backup:
  File: $(basename ${full_file})
  Size: $(du -h ${full_file} | cut -f1)
  Path: ${full_file}

VERIFICATION
============

Schema: $(verify_backup ${schema_file} && echo "✅ PASSED" || echo "❌ FAILED")
Data: $(verify_backup ${data_file} && echo "✅ PASSED" || echo "❌ FAILED")
Full: $(verify_backup ${full_file} && echo "✅ PASSED" || echo "❌ FAILED")

RESTORE INSTRUCTIONS
====================

To restore schema only:
  gunzip -c ${schema_file} | psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME}

To restore data only:
  gunzip -c ${data_file} | psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME}

To restore full database:
  gunzip -c ${full_file} | psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME}

RETENTION POLICY
================

Backup retention: ${RETENTION_DAYS} days
Backups older than ${RETENTION_DAYS} days will be automatically deleted.

EOF

    log_success "Backup summary saved: backup_${TIMESTAMP}_summary.txt"
}

# ===================================================================
# MAIN EXECUTION
# ===================================================================

main() {
    log_info "=============================================="
    log_info "  Database Backup Utility"
    log_info "=============================================="
    log_info "Database: ${DB_NAME}"
    log_info "Timestamp: ${TIMESTAMP}"
    log_info "=============================================="
    echo ""

    # Check if pg_dump is available
    if ! command -v pg_dump &> /dev/null; then
        log_error "pg_dump command not found. Install PostgreSQL client tools."
        exit 1
    fi

    # Setup
    setup_backup_directory

    # Create backups
    echo ""
    schema_file=$(backup_schema)

    echo ""
    data_file=$(backup_data)

    echo ""
    full_file=$(backup_full)

    # Verify backups
    echo ""
    verify_backup "${schema_file}"
    verify_backup "${data_file}"
    verify_backup "${full_file}"

    # Generate summary
    echo ""
    generate_summary "${schema_file}" "${data_file}" "${full_file}"

    # Cleanup old backups
    echo ""
    cleanup_old_backups

    # Final summary
    echo ""
    log_success "=============================================="
    log_success "  Backup Complete!"
    log_success "=============================================="
    log_info "Backup location: ${BACKUP_DIR}"
    log_info "Log file: ${LOG_FILE}"
    log_info ""
    log_info "📦 Backup files created:"
    log_info "  - Schema: $(basename ${schema_file})"
    log_info "  - Data: $(basename ${data_file})"
    log_info "  - Full: $(basename ${full_file})"
    echo ""
    log_success "✨ All backups verified successfully!"
}

# Run main function
main "$@"
