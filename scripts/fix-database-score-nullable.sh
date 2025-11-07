#!/bin/bash
# Comprehensive Database Fix Script
# This script will diagnose and fix the score nullable issue

set -e

echo "===================================="
echo "AI Assessment Platform - Database Fix"
echo "===================================="
echo ""

# Database connection
DB_URL="postgresql://postgres:postgres@10.162.86.60:5432/aix_survey_db"

echo "Step 1: Checking current database schema..."
echo "------------------------------------"

# Check if score is nullable
SCORE_NULLABLE=$(psql "$DB_URL" -t -c "
SELECT is_nullable
FROM information_schema.columns
WHERE table_name = 'responses'
AND column_name = 'score';
" 2>/dev/null | tr -d ' \n')

echo "Score column nullable status: $SCORE_NULLABLE"

if [ "$SCORE_NULLABLE" = "NO" ]; then
    echo "❌ Score column is NOT NULL - Migration needed!"
    echo ""
    echo "Step 2: Running migration to make score nullable..."
    echo "------------------------------------"

    psql "$DB_URL" <<'EOF'
-- AlterTable: Make Response.score nullable
ALTER TABLE "responses" ALTER COLUMN "score" DROP NOT NULL;

-- Update any existing responses with score=0 to NULL
UPDATE "responses" SET "score" = NULL WHERE "score" = 0;

-- Report changes
SELECT 'Migration completed!' as status;
EOF

    echo "✅ Migration completed successfully!"
else
    echo "✅ Score column is already nullable - No migration needed!"
fi

echo ""
echo "Step 3: Analyzing current data..."
echo "------------------------------------"

psql "$DB_URL" <<'EOF'
-- Check for problematic data
SELECT
    'Total Responses' as metric,
    COUNT(*) as count
FROM responses
UNION ALL
SELECT
    'Responses with NULL score',
    COUNT(*)
FROM responses
WHERE score IS NULL
UNION ALL
SELECT
    'Responses with score=0',
    COUNT(*)
FROM responses
WHERE score = 0
UNION ALL
SELECT
    'Responses with valid score (1-5)',
    COUNT(*)
FROM responses
WHERE score >= 1 AND score <= 5;
EOF

echo ""
echo "Step 4: Checking assessments status..."
echo "------------------------------------"

psql "$DB_URL" <<'EOF'
-- Check assessments with potential issues
SELECT
    a.id,
    a.status,
    COUNT(r.id) as total_responses,
    COUNT(CASE WHEN r.score IS NOT NULL AND r.score >= 1 THEN 1 END) as valid_responses,
    ROUND(COUNT(CASE WHEN r.score IS NOT NULL AND r.score >= 1 THEN 1 END) * 100.0 / NULLIF(COUNT(r.id), 0), 2) as completion_pct
FROM "Assessment" a
LEFT JOIN responses r ON r."assessmentId" = a.id
WHERE a.status = 'DRAFT' OR a.status = 'IN_PROGRESS'
GROUP BY a.id, a.status
ORDER BY completion_pct DESC
LIMIT 10;
EOF

echo ""
echo "Step 5: Finding specific assessment..."
echo "------------------------------------"

ASSESSMENT_ID="cmhp6esj3000113eu37vq8aia"

psql "$DB_URL" <<EOF
-- Check specific assessment
SELECT
    a.id,
    a.status,
    COUNT(r.id) as total_responses,
    COUNT(CASE WHEN r.score IS NOT NULL AND r.score >= 1 THEN 1 END) as valid_responses,
    (SELECT COUNT(*) FROM "Item" i
     JOIN "Domain" d ON i."domainId" = d.id
     WHERE d."templateId" = a."templateId") as total_items,
    ROUND(COUNT(CASE WHEN r.score IS NOT NULL AND r.score >= 1 THEN 1 END) * 100.0 /
          (SELECT COUNT(*) FROM "Item" i
           JOIN "Domain" d ON i."domainId" = d.id
           WHERE d."templateId" = a."templateId"), 2) as completion_pct
FROM "Assessment" a
LEFT JOIN responses r ON r."assessmentId" = a.id
WHERE a.id = '$ASSESSMENT_ID'
GROUP BY a.id, a.status, a."templateId";

-- Show sample responses for this assessment
SELECT
    r.id,
    r."itemId",
    r.score,
    CASE
        WHEN r.score IS NULL THEN 'NULL'
        WHEN r.score = 0 THEN 'ZERO (Invalid)'
        WHEN r.score >= 1 AND r.score <= 5 THEN 'Valid'
        ELSE 'Out of range'
    END as score_status
FROM responses r
WHERE r."assessmentId" = '$ASSESSMENT_ID'
ORDER BY r.score IS NULL, r.score
LIMIT 20;
EOF

echo ""
echo "Step 6: Fix any NULL/0 scores for assessments in progress..."
echo "------------------------------------"

psql "$DB_URL" <<'EOF'
-- Convert score=0 to NULL (if any remain)
UPDATE responses
SET score = NULL
WHERE score = 0;

SELECT 'Data cleanup completed!' as status;
EOF

echo ""
echo "===================================="
echo "✅ Database fix script completed!"
echo "===================================="
echo ""
echo "Next steps:"
echo "1. Try finalizing your assessment again"
echo "2. If still getting 400 error, check the completeness percentage above"
echo "3. Make sure at least 50% of questions have valid scores (1-5)"
echo ""
