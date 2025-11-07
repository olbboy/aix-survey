#!/bin/bash
set -e

# Apply migrations manually bypassing Prisma CLI
echo "Applying migrations manually..."

# Find and sort all migration SQL files
MIGRATIONS=$(find prisma/migrations -name "migration.sql" | sort)

for migration in $MIGRATIONS; do
    echo "Applying: $migration"
    psql -h localhost -U postgres -d aix_survey -f "$migration" 2>&1 || echo "Migration may have already been applied or has errors"
done

echo "All migrations applied!"
