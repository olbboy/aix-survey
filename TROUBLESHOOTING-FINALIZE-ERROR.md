# Troubleshooting: Finalize 400 Error

## Problem
When trying to finalize an assessment, you receive a `400 Bad Request` error.

## Root Causes

The 400 error from `/api/assessments/[id]/finalize` can be caused by:

### 1. **Insufficient Completion (< 50%)**
- **Error Message:** "Cần trả lời ít nhất 50% câu hỏi để hoàn thành đánh giá"
- **Cause:** Less than 50% of questions have valid answers (score 1-5)
- **Why it happens:**
  - Responses exist in database but have `score = null` or `score = 0`
  - These invalid scores are not counted toward completion
  - Progress bar may show higher % if it's counting all response records

### 2. **No Valid Responses**
- **Error Message:** "Vui lòng trả lời ít nhất một câu hỏi trước khi hoàn thành đánh giá"
- **Cause:** No responses with valid scores (1-5) found
- **Why it happens:**
  - All responses have `score = null` or `score = 0`
  - Database schema mismatch causing data corruption

### 3. **Database Schema Issue**
- **Symptom:** Responses being saved with `score = 0` instead of `null`
- **Cause:** Database has `score INTEGER NOT NULL` constraint
- **Impact:** Invalid scores get counted in UI progress but filtered out in finalize

## Diagnostic Steps

### Step 1: Check Server Logs

Look for these log messages in your server console:

```
[Finalize API] Assessment ID: xxx
[Finalize API] Total responses in DB: N
[Finalize API] Sample responses: [...]
[Finalize API] Domain data: [...]
[Finalize API] Calculated scores: {...}
[Finalize API] VALIDATION FAILED: ...
```

The logs will show:
- Total number of responses in database
- How many have valid scores (1-5)
- How many have null scores
- How many have zero scores
- Calculated completion percentage

### Step 2: Check the Error Response

Open browser DevTools → Network tab → Check the 400 response body:

```json
{
  "error": "Assessment incomplete",
  "message": "Cần trả lời ít nhất 50% câu hỏi để hoàn thành đánh giá",
  "completeness": 30,
  "answeredItems": 15,
  "totalItems": 50,
  "required": 50,
  "debug": {
    "totalResponsesInDB": 50,
    "validScores": 15,
    "nullScores": 35,
    "zeroScores": 0
  }
}
```

This shows:
- **completeness:** Actual completion percentage (30%)
- **answeredItems:** Questions with valid scores (15)
- **totalItems:** Total questions in assessment (50)
- **debug.validScores:** Responses with score 1-5
- **debug.nullScores:** Responses with null score
- **debug.zeroScores:** Responses with zero score

### Step 3: Understand the Data

**Example Scenario:**
```
totalResponsesInDB: 50    ← Database has 50 response records
validScores: 15           ← Only 15 have scores 1-5
nullScores: 35            ← 35 have null scores
completeness: 30%         ← 15/50 = 30% (BELOW 50% threshold!)
```

**Why this happens:**
- User answered all 50 questions in UI
- But only 15 were saved with valid scores (1-5)
- The other 35 were saved with `null` scores
- Finalize requires at least 50% valid scores (25 out of 50)

## Solutions

### Solution 1: Complete More Questions (Immediate)

If completeness is legitimately below 50%:
1. Go back to assessment
2. Answer more questions until you reach 50%
3. Make sure scores are selected (not just currentState text)
4. Save and try finalizing again

### Solution 2: Fix Database Schema (Root Cause)

The schema issue needs to be fixed:

#### Option A: Run Migration (Recommended)

```bash
# Run the migration to make score nullable
psql -U your_user -d aix_survey_db -f prisma/migrations/20251107_make_response_score_nullable/migration.sql
```

This will:
- Make `score` column nullable (`INTEGER` → `INTEGER NULL`)
- Convert any `score = 0` to `null`
- Prevent future data corruption

#### Option B: Manual Database Fix

If you have existing corrupted data:

```sql
-- Connect to database
psql -U your_user -d aix_survey_db

-- Check for problematic data
SELECT
    a.id,
    COUNT(r.id) as total_responses,
    COUNT(CASE WHEN r.score IS NOT NULL AND r.score >= 1 THEN 1 END) as valid_scores,
    COUNT(CASE WHEN r.score IS NULL THEN 1 END) as null_scores,
    COUNT(CASE WHEN r.score = 0 THEN 1 END) as zero_scores
FROM "Assessment" a
LEFT JOIN responses r ON r."assessmentId" = a.id
WHERE a.id = 'your-assessment-id'
GROUP BY a.id;

-- If you see zero_scores > 0, clean them up:
UPDATE responses
SET score = NULL
WHERE score = 0 AND "assessmentId" = 'your-assessment-id';
```

### Solution 3: Re-answer Questions

If responses have null scores but you thought you answered them:

1. **Go back to assessment page**
2. **Re-select scores** for questions that should be answered
3. **Wait for autosave** ("Đã lưu" indicator)
4. **Check server logs** to verify scores are being saved correctly
5. **Try finalize again**

## Prevention

To prevent this issue in the future:

### 1. Verify Scores Are Saved

After answering questions:
- Wait for "Đã lưu" (Saved) indicator
- Check browser console for any errors
- Verify progress percentage updates

### 2. Check Database Schema

Ensure your database has the correct schema:

```sql
-- Check score column
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'responses' AND column_name = 'score';

-- Should return:
-- column_name | data_type | is_nullable
-- score       | integer   | YES          ← Should be YES!
```

### 3. Monitor Application Logs

Watch for these warnings:
```
[Responses API] Failed to save responses
[Finalize API] VALIDATION FAILED
```

## Common Scenarios

### Scenario 1: "I answered all questions but still get 400 error"

**Check:**
1. Browser Network tab → Check last save request response
2. Server logs → Look for actual completeness %
3. Error response → Check `debug.validScores` count

**Likely cause:**
- Responses saved with null scores due to schema issue
- Only some questions were saved correctly

**Fix:**
- Run database migration
- Re-answer the questions with null scores
- Try finalize again

### Scenario 2: "Progress shows 100% but finalize says 30%"

**This is the exact bug we fixed!**

**Explanation:**
- Progress API was counting ALL response records (including null)
- Finalize API only counts valid scores (1-5)
- Mismatch caused confusion

**Fix:**
- Update to latest code (progress calculation fixed)
- Run database migration
- Verify both progress and finalize use same logic

### Scenario 3: "Finalize worked before, now broken"

**Possible causes:**
1. Database migration not applied after code update
2. Data corruption from older bugs
3. Changed validation rules (50% requirement added)

**Fix:**
1. Check git log for recent changes
2. Run all pending migrations
3. Verify database schema matches code expectations

## Testing After Fix

### Test 1: Fresh Assessment
1. Create new assessment
2. Answer exactly 50% of questions (e.g., 25 out of 50)
3. Save and wait for autosave
4. Click finalize
5. **Expected:** Success (redirects to results)

### Test 2: Incomplete Assessment
1. Create new assessment
2. Answer only 40% of questions (e.g., 20 out of 50)
3. Save and wait for autosave
4. Click finalize
5. **Expected:** 400 error with clear message showing 40% completion

### Test 3: Existing Corrupted Assessment
1. Open assessment with null scores
2. Re-answer questions until > 50%
3. Click finalize
4. **Expected:** Success

## API Response Reference

### Success Response (200)
```json
{
  "snapshotId": "xxx",
  "scores": {
    "itemScores": {...},
    "domainScores": {...},
    "totalScore": 3.45,
    "maturityLevel": "Phát triển",
    "maturityLevelEn": "Developing",
    "completeness": 100
  }
}
```

### Error: Below 50% (400)
```json
{
  "error": "Assessment incomplete",
  "message": "Cần trả lời ít nhất 50% câu hỏi để hoàn thành đánh giá",
  "completeness": 30,
  "answeredItems": 15,
  "totalItems": 50,
  "required": 50,
  "debug": {
    "totalResponsesInDB": 50,
    "validScores": 15,
    "nullScores": 35,
    "zeroScores": 0
  }
}
```

### Error: No Responses (400)
```json
{
  "error": "No responses found",
  "message": "Vui lòng trả lời ít nhất một câu hỏi trước khi hoàn thành đánh giá",
  "completeness": 0,
  "answeredItems": 0,
  "totalItems": 50,
  "debug": {
    "totalResponsesInDB": 0,
    "sampleScores": []
  }
}
```

## Related Files

- `/src/app/api/assessments/[id]/finalize/route.ts` - Finalize endpoint with validation
- `/src/app/api/assessments/[id]/responses/route.ts` - Save responses endpoint
- `/src/lib/scoring/scoring-engine.ts` - Score calculation logic
- `/prisma/schema.prisma` - Database schema
- `FIX-PROGRESS-VALIDATION-MISMATCH.md` - Detailed fix documentation

## Get Help

If you're still stuck:

1. **Check server logs** for `[Finalize API]` messages
2. **Check error response** in browser DevTools
3. **Share the debug info** from error response
4. **Check database** with provided SQL queries
5. **Verify migration** was applied successfully

## Quick Diagnostic Script

```bash
#!/bin/bash
# Quick diagnostic for assessment finalize issues

ASSESSMENT_ID="your-assessment-id-here"
DB_URL="postgresql://user:pass@host:port/dbname"

echo "Checking assessment: $ASSESSMENT_ID"
echo ""

psql "$DB_URL" <<EOF
SELECT
    'Assessment Status' as check_type,
    a.status,
    COUNT(r.id) as total_responses,
    COUNT(CASE WHEN r.score >= 1 THEN 1 END) as valid_responses,
    ROUND(COUNT(CASE WHEN r.score >= 1 THEN 1 END) * 100.0 / NULLIF((
        SELECT COUNT(*) FROM "Item" i
        JOIN "Domain" d ON i."domainId" = d.id
        WHERE d."templateId" = a."templateId"
    ), 0), 2) as completion_pct
FROM "Assessment" a
LEFT JOIN responses r ON r."assessmentId" = a.id
WHERE a.id = '$ASSESSMENT_ID'
GROUP BY a.id, a.status, a."templateId";

SELECT
    'Score Distribution' as check_type,
    COUNT(CASE WHEN score IS NULL THEN 1 END) as null_count,
    COUNT(CASE WHEN score = 0 THEN 1 END) as zero_count,
    COUNT(CASE WHEN score = 1 THEN 1 END) as score_1,
    COUNT(CASE WHEN score = 2 THEN 1 END) as score_2,
    COUNT(CASE WHEN score = 3 THEN 1 END) as score_3,
    COUNT(CASE WHEN score = 4 THEN 1 END) as score_4,
    COUNT(CASE WHEN score = 5 THEN 1 END) as score_5
FROM responses
WHERE "assessmentId" = '$ASSESSMENT_ID';
EOF
```

Save this as `check-assessment.sh`, make it executable, and run it to get instant diagnostics.
