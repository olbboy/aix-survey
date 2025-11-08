#!/bin/bash
set -e

# Database Setup Script
# 1. Applies migrations if needed
# 2. Seeds database with initial data

DB_HOST="10.162.86.60"
DB_PORT="5432"
DB_NAME="aix_survey_db"
DB_USER="aix_survey"
DB_PASS="vgCVyb8CA0EQvJeg"

echo "========================================="
echo "Database Setup Script"
echo "========================================="
echo ""

# Check database connection
echo "🔍 Checking database connection..."
if ! PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
    echo "❌ Cannot connect to database at $DB_HOST:$DB_PORT/$DB_NAME"
    echo "   Please ensure:"
    echo "   1. Database is accessible (VPN connected if needed)"
    echo "   2. Credentials are correct"
    echo "   3. Firewall allows connection"
    exit 1
fi

echo "✅ Database connection successful"
echo ""

# Check if tables exist
echo "🔍 Checking if database is migrated..."
table_count=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assessment_templates'")

if [ "$table_count" -eq 0 ]; then
    echo "📦 Tables not found. Applying migration..."

    # Apply the initial migration
    if [ -f "prisma/migrations/20251107_init/migration.sql" ]; then
        echo "   Applying 20251107_init migration..."
        if PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f prisma/migrations/20251107_init/migration.sql > /tmp/migration_output.log 2>&1; then
            echo "✅ Migration applied successfully"

            # Create _prisma_migrations table if it doesn't exist
            PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'
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

-- Record the migration
INSERT INTO "_prisma_migrations" (
    "id",
    "checksum",
    "finished_at",
    "migration_name",
    "started_at",
    "applied_steps_count"
) VALUES (
    gen_random_uuid()::text,
    'initial_migration',
    NOW(),
    '20251107_init',
    NOW(),
    1
) ON CONFLICT DO NOTHING;
EOF

        else
            echo "❌ Migration failed!"
            cat /tmp/migration_output.log
            exit 1
        fi
    else
        echo "❌ Migration file not found!"
        exit 1
    fi
else
    echo "✅ Database already migrated"
fi

echo ""

# Check if database is seeded
echo "🔍 Checking if database is seeded..."
template_count=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM assessment_templates WHERE \"isActive\" = true")

if [ "$template_count" -eq 0 ]; then
    echo "🌱 Database not seeded. Seeding now..."
    echo ""
    echo "   Note: If this fails, you can seed via API:"
    echo "   curl -X POST http://localhost:3000/api/admin/seed"
    echo ""

    # Try to seed using Node script
    if [ -f "node_modules/.bin/tsx" ]; then
        echo "   Using tsx to run seed script..."
        npm run db:seed 2>&1 || echo "   ⚠️  Seed script failed (might need Prisma generate first)"
    else
        echo "   ⚠️  tsx not found. Please run: npm run db:seed"
    fi
else
    echo "✅ Database already seeded"

    domain_count=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM domains")
    item_count=$(PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM items")

    echo ""
    echo "📊 Current Database Status:"
    echo "   - Templates: $template_count"
    echo "   - Domains: $domain_count"
    echo "   - Items: $item_count"
fi

echo ""
echo "========================================="
echo "✅ Database setup complete!"
echo "========================================="
echo ""
echo "You can now start the application with: npm run dev"
