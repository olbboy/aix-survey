# Fix: Radar Charts Showing 0.0/5.0 for All Items

## Problem Summary
Radar charts on the results page were displaying 0.0/5.0 for all assessment items, despite users having completed assessments with actual scores.

## Root Causes Identified

### 1. **Primary Bug: Score Defaulting in Results API** (CRITICAL)
**Location:** `/src/app/api/assessments/[id]/results/route.ts:113`

**Before:**
```typescript
const score = itemScores[item.id] || 0;  // ❌ Defaults undefined to 0
```

**Issue:** When `itemScores[item.id]` returned `undefined` (item not in map), the `|| 0` operator converted it to 0, causing all radar charts to display 0.0/5.0.

**After:**
```typescript
const score = itemScores[item.id];
if (score === undefined || score === null || score <= 0) {
  return null;  // ✅ Skip items without valid scores
}
```

### 2. **Secondary Issue: Empty itemScores in Snapshots**
**Cause:** Existing assessments were finalized when older bugs existed, resulting in empty or incomplete `itemScores` maps in snapshots.

**Solution:** Added fallback logic to rebuild `itemScores` from responses if snapshot data is corrupted:

```typescript
if (!itemScores || Object.keys(itemScores).length === 0) {
  // Rebuild itemScores from responses as fallback
  itemScores = {};
  assessment.responses.forEach((response) => {
    if (response.itemId && response.score > 0) {
      itemScores[response.itemId] = response.score;
    }
  });
}
```

## Previous Fixes That Paved the Way

### Fix #1: Responses API Data Corruption
**Location:** `/src/app/api/assessments/[id]/responses/route.ts:95, 101`

**Issue:** `response.score || 0` was converting null → 0, polluting database with zero scores

**Fix:** Removed `|| 0` to preserve null values

### Fix #2: Key Mismatch in Finalize API
**Location:** `/src/app/api/assessments/[id]/finalize/route.ts:108`

**Issue:** Used `itemCode` as key instead of `itemId`, causing lookup failures

**Fix:** Changed to use `itemId` as key and added proper filtering

### Fix #3: Wrong Data Source in Results API
**Issue:** Results API was reading from `responses` instead of `snapshot.itemScores`

**Fix:** Changed to read from snapshot data

## Complete Data Flow (Fixed)

```
1. User answers questions
   ↓
2. Responses API saves to DB
   - score: number | null (no defaulting to 0)
   ↓
3. User clicks "Finalize"
   ↓
4. Finalize API creates snapshot
   - Builds itemScores: { [itemId]: score }
   - Only includes items where score > 0
   - Uses itemId as key (not itemCode)
   ↓
5. User views results
   ↓
6. Results API reads snapshot.itemScores
   - If empty: rebuilds from responses (fallback)
   - Maps items with scores only (no || 0 defaulting)
   - Returns domains with actual scored items
   ↓
7. UI renders radar charts
   - Displays actual scores per item
   - No 0.0 values shown
```

## Changes Made

### File: `/src/app/api/assessments/[id]/results/route.ts`

1. **Line 67:** Changed `const` to `let` for itemScores to allow fallback reassignment

2. **Lines 75-104:** Added comprehensive fallback logic:
   - Detects empty itemScores
   - Rebuilds from responses if needed
   - Returns error if no valid data found
   - Includes detailed debug logging

3. **Lines 132-151:** Fixed domain mapping (CRITICAL FIX):
   - Removed `|| 0` default
   - Added filtering for items without scores
   - Only returns items with valid scores > 0

## Testing Instructions

### For Existing Assessments
1. **Option A:** Re-finalize the assessment (recommended for clean data)
   - Navigate to assessment
   - Click finalize again
   - This will rebuild itemScores with fixed code

2. **Option B:** View results with automatic fallback
   - Navigate to results page
   - Fallback logic will automatically rebuild from responses
   - Check server logs for "[Results API]" messages

### For New Assessments
1. Create new assessment
2. Answer questions (select scores 1-5)
3. Finalize assessment
4. View results - should display actual scores

### Verification
- ✅ Radar charts show actual scores (not 0.0)
- ✅ Domain scores calculated correctly
- ✅ Strengths/weaknesses show real data
- ✅ Gap analysis has valid scores

## Debug Logging Added

The following logs help diagnose issues:
```
[Results API] Assessment ID: xxx
[Results API] itemScores keys count: N
[Results API] itemScores sample: [[itemId, score], ...]
[Results API] WARNING: itemScores is empty! (if applicable)
[Results API] Attempting to rebuild from responses...
[Results API] Rebuilt itemScores count: N
```

## Impact

### Before Fix
- ❌ All radar charts showed 0.0/5.0
- ❌ Strengths/weaknesses lists were empty or incorrect
- ❌ Gap analysis had invalid data
- ❌ Users couldn't see their actual assessment results

### After Fix
- ✅ Radar charts display actual item scores
- ✅ Strengths/weaknesses correctly identified
- ✅ Gap analysis shows real improvement opportunities
- ✅ Complete and accurate results visualization
- ✅ Fallback handles corrupted snapshots gracefully

## Related Files

- `/src/app/api/assessments/[id]/results/route.ts` - Main fix
- `/src/app/api/assessments/[id]/finalize/route.ts` - Snapshot creation
- `/src/app/api/assessments/[id]/responses/route.ts` - Response saving
- `/src/app/assessment/results/[id]/page.tsx` - UI rendering

## Commit Message

```
fix: Fix radar chart data - scores defaulting to 0 instead of actual values

CRITICAL: Fixed radar charts showing 0.0/5.0 for all items

Root cause: Results API was using `|| 0` to default undefined scores,
causing all items without scores in itemScores map to display as 0.0.

Changes:
- Removed score || 0 default in domains mapping
- Added fallback to rebuild itemScores from responses if empty
- Only include items with valid scores in radar chart data
- Added comprehensive debug logging

This completes the fix chain started in previous commits that addressed:
1. Response API score || 0 corruption
2. Finalize API itemCode vs itemId key mismatch
3. Results API using responses instead of snapshot

Impact: Users can now see their actual assessment scores in radar
charts instead of all zeros.
```
