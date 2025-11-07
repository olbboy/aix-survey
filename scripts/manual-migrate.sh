#!/bin/bash
set -e

# Manual migration script for when Prisma CLI is blocked
# Applies migrations directly via psql

DB_HOST="10.162.86.60"
DB_PORT="5432"
DB_NAME="aix_survey_db"
DB_USER="postgres"

echo "========================================="
echo "Manual Migration Script"
echo "========================================="
echo ""

# Check if database exists
echo "Checking database connection..."
if ! PGPASSWORD=postgres psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
    echo "❌ Cannot connect to database at $DB_HOST:$DB_PORT/$DB_NAME"
    echo "   Please ensure the database is accessible"
    exit 1
fi

echo "✅ Database connection successful"
echo ""

# Create Prisma migrations table if it doesn't exist
echo "Creating _prisma_migrations table..."
PGPASSWORD=postgres psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
    "id" VARCHAR(36) NOT NULL PRIMARY KEY,
    "checksum" VARCHAR(64) NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "migration_name" VARCHAR(255) NOT NULL,
    "logs" TEXT,
    "rolled_back_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "applied_steps_count" INTEGER NOT NULL DEFAULT 0
);
EOF

echo "✅ _prisma_migrations table ready"
echo ""

# Find all migrations
MIGRATIONS=$(find prisma/migrations -name "migration.sql" -type f | sort)

for migration_file in $MIGRATIONS; do
    migration_dir=$(dirname "$migration_file")
    migration_name=$(basename "$migration_dir")

    # Check if already applied
    already_applied=$(PGPASSWORD=postgres psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM _prisma_migrations WHERE migration_name = '$migration_name'")

    if [ "$already_applied" -gt 0 ]; then
        echo "⏭️  Skipping $migration_name (already applied)"
        continue
    fi

    echo "📦 Applying migration: $migration_name"

    # Apply the migration
    if PGPASSWORD=postgres psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$migration_file" > /tmp/migration_output.log 2>&1; then
        # Calculate checksum
        checksum=$(sha256sum "$migration_file" | awk '{print $1}')
        migration_id=$(uuidgen || cat /proc/sys/kernel/random/uuid)

        # Record in migrations table
        PGPASSWORD=postgres psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF
INSERT INTO "_prisma_migrations" (
    "id",
    "checksum",
    "finished_at",
    "migration_name",
    "logs",
    "started_at",
    "applied_steps_count"
) VALUES (
    '$migration_id',
    '$checksum',
    NOW(),
    '$migration_name',
    '',
    NOW(),
    1
);
EOF

        echo "✅ Migration $migration_name applied successfully"
    else
        echo "❌ Migration $migration_name failed!"
        echo "   See /tmp/migration_output.log for details"
        cat /tmp/migration_output.log
        exit 1
    fi

    echo ""
done

echo "========================================="
echo "✅ All migrations applied successfully!"
echo "========================================="
