# Sequence Diagrams - AI Maturity Assessment Platform
**Complete Flow Documentation - World-Class Technical Specification**

---

## Table of Contents

1. [Assessment Creation Flows](#1-assessment-creation-flows)
2. [Assessment Response Flows](#2-assessment-response-flows)
3. [Assessment Finalize Flow](#3-assessment-finalize-flow)
4. [Results Viewing Flow](#4-results-viewing-flow)
5. [Export Flows](#5-export-flows)
6. [Email Notification Flow](#6-email-notification-flow)
7. [Benchmark Comparison Flow](#7-benchmark-comparison-flow)
8. [Progress Tracking Flows](#8-progress-tracking-flows)

---

## 1. Assessment Creation Flows

### 1.1 Guest Assessment Creation

```mermaid
sequenceDiagram
    actor Guest
    participant UI as Assessment Form
    participant API as /api/assessments/start
    participant DB as PostgreSQL
    participant Redis as Redis Cache

    Guest->>UI: Click "Start Assessment"
    UI->>Guest: Show metadata form<br/>(industry, size, region)
    Guest->>UI: Submit metadata

    UI->>API: POST /assessments/start<br/>{industry, size, region}

    Note over API: Generate session UUID
    API->>API: Create session cookie

    API->>DB: Create Assessment<br/>{sessionId, industry, size, region}
    DB-->>API: Assessment created

    API->>DB: Load template with domains/items
    DB-->>API: Template data

    API->>Redis: Save draft<br/>{sessionId, assessmentId}
    Redis-->>API: Draft saved

    API-->>UI: {assessmentId, sessionId}<br/>Set-Cookie: assessment_session

    UI->>Guest: Redirect to /assessment/{id}

    Note over Guest,Redis: Session valid for 30 days<br/>Auto-cleanup on expiry
```

**Key Points**:
- Session ID stored in cookie (HttpOnly, Secure)
- Assessment expires in 30 days if not finalized
- Draft saved to Redis for quick recovery
- No authentication required

---

### 1.2 Authenticated User Assessment Creation

```mermaid
sequenceDiagram
    actor User
    participant UI as Assessment Form
    participant Auth as Auth Session
    participant API as /api/assessments/start
    participant DB as PostgreSQL

    User->>UI: Click "Start Assessment"
    UI->>Auth: Check authentication
    Auth-->>UI: {userId, organizationId}

    UI->>User: Show metadata form
    User->>UI: Submit metadata

    UI->>API: POST /assessments/start<br/>{industry, size, region}<br/>Authorization: Bearer token

    API->>Auth: Verify session
    Auth-->>API: {userId, organizationId}

    API->>DB: Create Assessment<br/>{userId, organizationId,<br/> industry, size, region}
    DB-->>API: Assessment created

    API->>DB: Create AuditLog<br/>{userId, action: CREATE}
    DB-->>API: Logged

    API-->>UI: {assessmentId}

    UI->>User: Redirect to /assessment/{id}

    Note over User,DB: Owned by user<br/>Visible to organization<br/>No expiration
```

**Key Points**:
- Uses authenticated session
- Linked to organization for progress tracking
- Audit trail created
- Permanent storage (no expiration)

---

## 2. Assessment Response Flows

### 2.1 Autosave Response Flow (with Score Validation)

```mermaid
sequenceDiagram
    actor User
    participant UI as Question UI
    participant Hook as useAutosave Hook
    participant API as /api/assessments/[id]/responses
    participant Validation as Zod Schema
    participant DB as PostgreSQL
    participant Redis as Redis Cache

    User->>UI: Select score (1-5)
    UI->>UI: Update local state

    User->>UI: Type currentState description
    UI->>UI: Update local state

    Note over UI,Hook: Wait 3 seconds (debounce)

    UI->>Hook: Trigger autosave
    Hook->>API: PATCH /responses<br/>{responses: {itemId: {score, currentState}}}

    API->>Validation: Validate request body

    rect rgb(255, 200, 200)
        Note over Validation: CRITICAL VALIDATION
        Validation->>Validation: Check score:<br/>- Must be 1-5 OR null<br/>- NEVER 0
    end

    alt Invalid score (e.g., 0)
        Validation-->>API: ValidationError
        API-->>UI: 400 Bad Request
        UI->>User: Show error message
    else Valid score
        Validation-->>API: Valid

        API->>DB: Load Assessment + Template
        DB-->>API: Assessment data

        rect rgb(200, 255, 200)
            Note over API: Authorization check
            API->>API: Verify ownership:<br/>userId OR sessionId
        end

        alt Unauthorized
            API-->>UI: 403 Forbidden
        else Authorized
            API->>DB: BEGIN TRANSACTION

            loop For each response
                API->>DB: UPSERT Response<br/>{assessmentId, itemId, score, currentState}
                Note over DB: score can be null<br/>(not yet answered)
            end

            API->>DB: Update Assessment.updatedAt

            rect rgb(200, 200, 255)
                Note over API: CRITICAL: Progress Calculation
                API->>DB: Count valid responses:<br/>WHERE score >= 1 AND score IS NOT NULL
                DB-->>API: answeredResponses count

                API->>DB: Count total items
                DB-->>API: totalItems count

                API->>API: progress = (answeredResponses / totalItems) × 100
            end

            API->>DB: COMMIT TRANSACTION

            alt Guest user
                API->>Redis: Save progress<br/>{sessionId, progress}
                API->>Redis: Update draft
            end

            API-->>UI: {success: true, progress: XX%}

            UI->>UI: Update progress bar
            UI->>User: Show "Đã lưu" indicator
        end
    end
```

**Critical Implementation Details**:

1. **Score Validation**:
```typescript
const responsesSchema = z.record(
  z.object({
    // Score must be 1-5 or null (never 0)
    score: z.union([
      z.number().int().min(1).max(5),
      z.null()
    ]),
    currentState: z.string().max(5000).optional(),
  })
);
```

2. **Progress Calculation** (Lines 124-134 in route.ts):
```typescript
// IMPORTANT: Only count responses with valid scores (1-5), not null or 0
const answeredResponses = await prisma.response.count({
  where: {
    assessmentId: assessment.id,
    score: {
      not: null,
      gte: 1,  // Must be >= 1
    },
  },
});

const progress = Math.round((answeredResponses / totalItems) * 100);
```

3. **Why NOT Count All Responses**:
- A Response can exist with `score = null` (draft, not answered)
- Progress should only count **actually answered** questions
- Prevents false 100% progress when questions are saved but not scored

---

### 2.2 Evidence Upload Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as Upload UI
    participant API1 as /evidence/upload-url
    participant API2 as /evidence/confirm
    participant S3 as AWS S3
    participant DB as PostgreSQL
    participant Scanner as Virus Scanner

    User->>UI: Select file
    UI->>UI: Validate file:<br/>- Type (pdf/docx/png/url)<br/>- Size (<10MB)

    UI->>API1: POST /upload-url<br/>{fileName, fileType, fileSize}

    API1->>API1: Generate S3 key
    API1->>S3: Generate pre-signed URL
    S3-->>API1: {uploadUrl, storageKey}

    API1-->>UI: {uploadUrl, storageKey}

    UI->>S3: PUT file to uploadUrl
    S3-->>UI: 200 OK

    UI->>API2: POST /confirm<br/>{storageKey, fileName, fileSize}

    API2->>S3: Verify file exists
    S3-->>API2: File confirmed

    API2->>API2: Calculate checksum (SHA-256)

    API2->>DB: Create Evidence<br/>{storageKey, checksum, uploadedBy}
    DB-->>API2: Evidence created

    API2->>Scanner: Queue virus scan
    Scanner-->>API2: Scan queued

    API2-->>UI: {evidenceId, status: uploaded}

    UI->>User: Show success message

    Note over Scanner,DB: Async scan process
    Scanner->>Scanner: Scan file
    Scanner->>DB: Update Evidence<br/>{virusScanned: true, scanResult}
```

---

## 3. Assessment Finalize Flow

### 3.1 Finalize with Validation

```mermaid
sequenceDiagram
    actor User
    participant UI as Assessment Page
    participant API as /api/assessments/[id]/finalize
    participant Engine as Scoring Engine
    participant DB as PostgreSQL
    participant Snapshot as Snapshot Creator

    User->>UI: Click "Hoàn thành đánh giá"

    UI->>UI: Check local progress
    alt Progress < 50%
        UI->>User: Button disabled<br/>"Cần trả lời ít nhất 50%"
    else Progress >= 50%
        UI->>User: Confirm dialog
        User->>UI: Confirm

        UI->>API: POST /finalize

        rect rgb(255, 230, 230)
            Note over API: DEBUG LOGGING
            API->>API: Log assessment data:<br/>- Total responses<br/>- Sample scores<br/>- Score types
        end

        API->>DB: Load Assessment with:<br/>- Template<br/>- Domains<br/>- Items<br/>- Responses
        DB-->>API: Full assessment data

        API->>API: Authorization check

        API->>API: Check if already finalized
        alt Already FINALIZED
            API-->>UI: {message: "Already finalized"}
            UI->>User: Redirect to results
        else Not finalized
            rect rgb(255, 255, 200)
                Note over API: PREPARE DATA FOR SCORING

                loop For each domain
                    loop For each item
                        API->>API: Find response for item

                        alt score < 1 OR score IS NULL
                            API->>API: Exclude this item
                        else score >= 1
                            API->>API: Include in domainData:<br/>{itemId, itemCode, score, weight}
                        end
                    end

                    API->>API: Create domain entry:<br/>{domainCode, totalItems, items[]}
                end
            end

            rect rgb(200, 255, 200)
                Note over API,Engine: CALCULATE SCORES

                API->>Engine: calculateAssessmentScore(domainData)

                Engine->>Engine: For each domain:<br/>avgScore = sum(score×weight) / sum(weight)

                Engine->>Engine: totalScore = sum(domainAvg×domainWeight) /<br/>sum(domainWeight)

                Engine->>Engine: Determine maturity level:<br/>1.0-1.9: Sơ khai<br/>2.0-2.9: Khởi đầu<br/>3.0-3.9: Phát triển<br/>4.0-4.5: Trưởng thành<br/>4.6-5.0: Tối ưu

                Engine->>Engine: Calculate completeness:<br/>(answeredItems / totalItems) × 100

                Engine-->>API: {domainScores, totalScore,<br/>maturityLevel, completeness,<br/>answeredItems, totalItems}
            end

            rect rgb(255, 200, 200)
                Note over API: VALIDATION #1: Minimum 50% Completion

                API->>API: Check completeness >= 50

                alt completeness < 50
                    API->>API: Log validation failure
                    API-->>UI: 400 Bad Request<br/>{error: "Assessment incomplete",<br/>completeness, answeredItems, totalItems,<br/>debug: {validScores, nullScores, zeroScores}}

                    UI->>User: Show error with details:<br/>"Cần trả lời ít nhất 50% câu hỏi"<br/>"Hiện tại: XX% (YY/ZZ)"

                else completeness >= 50
                    Note over API: VALIDATION #2: At least 1 answer

                    alt answeredItems === 0
                        API-->>UI: 400 Bad Request<br/>{error: "No responses"}
                    else answeredItems > 0
                        rect rgb(200, 200, 255)
                            Note over API,Snapshot: CREATE IMMUTABLE SNAPSHOT

                            API->>API: Build itemScores map:<br/>{ [itemId]: score } (only score >= 1)

                            API->>API: Build domainScores map:<br/>{ [domainCode]: avgScore }

                            API->>Snapshot: Create snapshot data
                            Snapshot->>Snapshot: Include all assessment data
                            Snapshot->>Snapshot: Calculate checksum (SHA-256)

                            API->>DB: BEGIN TRANSACTION

                            API->>DB: Create AssessmentSnapshot<br/>{itemScores, domainScores,<br/>totalScore, maturityLevel,<br/>completeness, checksum}

                            API->>DB: Update Assessment<br/>{status: FINALIZED,<br/>finalizedAt: NOW}

                            API->>DB: Create AuditLog<br/>{action: FINALIZE}

                            API->>DB: COMMIT

                            DB-->>API: Success
                        end

                        API-->>UI: {snapshotId, scores}

                        UI->>User: Redirect to /assessment/results/{id}
                    end
                end
            end
        end
    end
```

**Validation Rules** (Lines 122-170 in finalize/route.ts):

1. **Minimum 50% Completion**:
```typescript
const MINIMUM_COMPLETION_PERCENTAGE = 50;
if (scores.completeness < MINIMUM_COMPLETION_PERCENTAGE) {
  return NextResponse.json({
    error: 'Assessment incomplete',
    message: `Cần trả lời ít nhất ${MINIMUM_COMPLETION_PERCENTAGE}% câu hỏi`,
    completeness: scores.completeness,
    answeredItems: scores.answeredItems,
    totalItems: scores.totalItems,
    debug: {
      totalResponsesInDB: assessment.responses.length,
      validScores: assessment.responses.filter(r => r.score >= 1 && r.score <= 5).length,
      nullScores: assessment.responses.filter(r => r.score === null).length,
      zeroScores: assessment.responses.filter(r => r.score === 0).length,
    }
  }, { status: 400 });
}
```

2. **At Least One Answer**:
```typescript
if (scores.answeredItems === 0) {
  return NextResponse.json({
    error: 'No responses found',
    message: 'Vui lòng trả lời ít nhất một câu hỏi',
    completeness: 0,
    answeredItems: 0,
    totalItems: scores.totalItems,
    debug: {
      totalResponsesInDB: assessment.responses.length,
      sampleScores: assessment.responses.slice(0, 10).map(r => r.score),
    }
  }, { status: 400 });
}
```

**Debug Output Example**:
```
[Finalize API] Assessment ID: xxx
[Finalize API] Total responses in DB: 50
[Finalize API] Sample responses: [
  { itemId: 'xxx', score: 3, scoreType: 'number' },
  { itemId: 'yyy', score: null, scoreType: 'object' },
  ...
]
[Finalize API] Domain data: [
  { domain: 'data', totalItems: 10, answeredItems: 5 },
  ...
]
[Finalize API] Calculated scores: {
  totalScore: 3.25,
  completeness: 50,
  answeredItems: 25,
  totalItems: 50
}
```

---

## 4. Results Viewing Flow

### 4.1 Load Results with Fallback

```mermaid
sequenceDiagram
    actor User
    participant UI as Results Page
    participant API as /api/assessments/[id]/results
    participant Gap as Gap Analysis
    participant DB as PostgreSQL

    User->>UI: Navigate to /assessment/results/{id}

    UI->>API: GET /results

    API->>DB: Load Assessment with:<br/>- Snapshot<br/>- Template<br/>- Domains/Items<br/>- Responses
    DB-->>API: Assessment data

    API->>API: Authorization check

    API->>API: Check if finalized
    alt Not finalized (no snapshot)
        API-->>UI: 400 Bad Request<br/>{error: "Assessment not finalized yet"}
        UI->>User: Show error:<br/>"Vui lòng hoàn thành đánh giá trước"
    else Finalized
        rect rgb(255, 230, 230)
            Note over API: CRITICAL: Check itemScores

            API->>API: Load snapshot.itemScores

            alt itemScores is empty
                API->>API: Log warning: "itemScores empty!"

                rect rgb(255, 200, 200)
                    Note over API: FALLBACK: Rebuild from responses

                    API->>API: Rebuild itemScores from responses:<br/>WHERE score >= 1

                    alt Still empty
                        API-->>UI: 400 Bad Request<br/>{error: "No assessment data"}
                    end
                end
            end
        end

        rect rgb(200, 255, 200)
            Note over API,Gap: PREPARE DATA

            API->>API: Map items with scores:<br/>Filter out score < 1 or null

            API->>Gap: calculateItemGaps(items)
            Gap-->>API: Gap analysis data

            API->>Gap: getTopStrengths(items, 5)
            Gap-->>API: Top 5 strengths

            API->>Gap: getTopWeaknesses(items, 5)
            Gap-->>API: Top 5 weaknesses

            API->>Gap: generateRecommendations(gaps)
            Gap-->>API: Recommendations list
        end

        rect rgb(200, 200, 255)
            Note over API: PREPARE RADAR CHART DATA

            loop For each domain
                API->>API: Map domain items:<br/>- Include only items with score >= 1<br/>- NO || 0 defaulting!
            end
        end

        API-->>UI: {assessment, snapshot,<br/>domains, analysis: {<br/>  strengths, weaknesses,<br/>  gaps, recommendations<br/>}}

        UI->>User: Display:<br/>- Overall score & maturity level<br/>- 5 domain radar charts<br/>- Strengths & weaknesses<br/>- Gap analysis table<br/>- Recommendations
    end
```

**Critical Fix** (Lines 139-142 in results/route.ts):
```typescript
// CRITICAL FIX: Only include items that have actual scores
const score = itemScores[item.id];

// Skip items without scores (don't default to 0!)
if (score === undefined || score === null || score < 1) {
  return null;
}

// Return item with actual score
return {
  itemCode: item.itemCode,
  itemName: item.itemName,
  score: score,  // NOT score || 0
};
```

---

## 5. Export Flows

### 5.1 PDF Export Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as Results Page
    participant API as /api/assessments/[id]/export/pdf
    participant PDF as PDF Service
    participant S3 as AWS S3
    participant DB as PostgreSQL

    User->>UI: Click "Xuất báo cáo PDF"

    UI->>API: GET /export/pdf

    API->>DB: Load Assessment with Snapshot
    DB-->>API: Assessment data

    API->>API: Authorization check

    API->>API: Validate assessment is finalized

    API->>PDF: generatePDF({<br/>  assessment,<br/>  snapshot,<br/>  domains,<br/>  analysis<br/>})

    rect rgb(200, 200, 255)
        Note over PDF: GENERATE PDF CONTENT

        PDF->>PDF: Create PDF document
        PDF->>PDF: Add header with logo
        PDF->>PDF: Add overview section
        PDF->>PDF: Add maturity level banner
        PDF->>PDF: Add domain scores table
        PDF->>PDF: Add radar charts (5 charts)
        PDF->>PDF: Add strengths & weaknesses
        PDF->>PDF: Add gap analysis
        PDF->>PDF: Add recommendations
        PDF->>PDF: Add footer with metadata
        PDF->>PDF: Finalize document
    end

    PDF-->>API: PDF buffer

    alt Save to S3
        API->>S3: Upload PDF
        S3-->>API: {s3Url}

        API->>DB: Create AuditLog<br/>{action: EXPORT_PDF}
    end

    API-->>UI: PDF file (Content-Type: application/pdf)<br/>Content-Disposition: attachment

    UI->>UI: Trigger browser download

    UI->>User: File downloaded:<br/>"AI_Maturity_Assessment_XXX.pdf"
```

---

### 5.2 CSV Export Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as Results Page
    participant API as /api/assessments/[id]/export/csv
    participant CSV as CSV Service
    participant DB as PostgreSQL

    User->>UI: Click "Xuất CSV"
    UI->>User: Choose format (Full/Simple)
    User->>UI: Select "Full"

    UI->>API: GET /export/csv?format=full

    API->>DB: Load Assessment data
    DB-->>API: Assessment + responses

    API->>API: Authorization check

    API->>CSV: generateCSV(data, format: full)

    rect rgb(200, 255, 200)
        Note over CSV: GENERATE CSV

        alt Format: Full
            CSV->>CSV: Headers:<br/>Domain, Item Code, Item Name,<br/>Score, Current State,<br/>Maturity Level, Gap

            loop For each domain
                loop For each item with response
                    CSV->>CSV: Add row with full details
                end
            end

        else Format: Simple
            CSV->>CSV: Headers:<br/>Item Code, Score

            loop For each response
                CSV->>CSV: Add row: {itemCode, score}
            end
        end
    end

    CSV-->>API: CSV string

    API->>DB: Create AuditLog<br/>{action: EXPORT_CSV}

    API-->>UI: CSV file (Content-Type: text/csv)<br/>Content-Disposition: attachment

    UI->>User: File downloaded:<br/>"AI_Maturity_Assessment_XXX.csv"
```

---

## 6. Email Notification Flow

### 6.1 Send Results Email

```mermaid
sequenceDiagram
    actor User
    participant UI as Email Dialog
    participant API as /api/assessments/[id]/send-results
    participant PDF as PDF Service
    participant Email as Email Service (Resend)
    participant DB as PostgreSQL
    participant Queue as Email Queue

    User->>UI: Click "Gửi kết quả qua Email"
    UI->>User: Show dialog
    User->>UI: Enter recipient email & name
    User->>UI: Click "Gửi Email"

    UI->>API: POST /send-results<br/>{recipientEmail, recipientName,<br/>includePDF: true}

    API->>API: Validate email format
    API->>API: Authorization check

    API->>DB: Load Assessment + Snapshot
    DB-->>API: Assessment data

    API->>API: Check if finalized

    rect rgb(200, 200, 255)
        Note over API,PDF: GENERATE PDF ATTACHMENT

        API->>PDF: generatePDF(assessment, snapshot)
        PDF-->>API: PDF buffer

        API->>API: Encode as base64
    end

    API->>DB: Create EmailNotification<br/>{recipientEmail, status: PENDING}
    DB-->>API: {notificationId}

    rect rgb(255, 200, 200)
        Note over API,Email: SEND EMAIL

        API->>Email: send({<br/>  to: recipientEmail,<br/>  subject: "Kết quả đánh giá...",<br/>  template: "assessment_results",<br/>  attachments: [PDF],<br/>  data: {name, scores, ...}<br/>})

        alt Send success
            Email-->>API: {messageId}

            API->>DB: Update EmailNotification<br/>{status: SENT, sentAt: NOW}

            API->>DB: Create AuditLog<br/>{action: SEND_EMAIL}

            API-->>UI: {success: true, messageId}

            UI->>User: "Email đã được gửi thành công!"

        else Send failed
            Email-->>API: Error

            API->>DB: Update EmailNotification<br/>{status: FAILED, lastError}

            API-->>UI: 500 Error<br/>{error: "Failed to send"}

            UI->>User: "Không thể gửi email. Vui lòng thử lại."
        end
    end

    Note over Queue,DB: Async: Track delivery status
    Queue->>DB: Update on delivery/open/click events
```

---

## 7. Benchmark Comparison Flow

### 7.1 Load Benchmark Data

```mermaid
sequenceDiagram
    actor User
    participant UI as Results Page
    participant API as /api/assessments/[id]/benchmark
    participant BM as Benchmark Service
    participant DB as PostgreSQL

    Note over User,DB: User views results page

    UI->>UI: Check if assessment has<br/>industry + size metadata

    alt Has metadata
        UI->>API: GET /benchmark

        API->>DB: Load Assessment + Snapshot
        DB-->>API: {industry, size, domainScores}

        API->>API: Authorization check

        rect rgb(200, 255, 200)
            Note over API,BM: FETCH BENCHMARK DATA

            API->>DB: Load BenchmarkData WHERE<br/>industry = X AND size = Y
            DB-->>API: Benchmark stats for each domain

            alt Benchmark data exists
                loop For each domain
                    API->>BM: Calculate percentile rank
                    BM->>BM: Compare myScore vs<br/>{p25, p50, p75, p90}
                    BM-->>API: {rank, percentile}
                end

                API->>API: Build comparison data:<br/>- My score vs average<br/>- Percentile ranking<br/>- Gap to next level

                API-->>UI: {<br/>  domainComparisons,<br/>  overallRank,<br/>  sampleSize<br/>}

                UI->>User: Display benchmark chart:<br/>- Your score (blue)<br/>- Industry average (gray)<br/>- Percentile indicators<br/>- "Bạn ở top XX%"

            else No benchmark data
                API-->>UI: {message: "Insufficient data"}
                UI->>User: "Chưa đủ dữ liệu để so sánh"
            end
        end

    else No metadata
        UI->>User: Benchmark section hidden
    end
```

---

### 7.2 Aggregate Benchmark Data (Background Job)

```mermaid
sequenceDiagram
    participant Cron as Scheduled Job
    participant API as /api/benchmarks/aggregate
    participant DB as PostgreSQL
    participant Stats as Statistics Calculator

    Note over Cron: Runs daily at 2 AM

    Cron->>API: POST /aggregate

    API->>DB: Load all FINALIZED assessments<br/>created/updated since last run
    DB-->>API: Assessments with snapshots

    rect rgb(200, 200, 255)
        Note over API,Stats: GROUP BY industry + size

        loop For each industry/size combination
            API->>Stats: Group assessments

            loop For each domain
                Stats->>Stats: Calculate statistics:<br/>- avg, p25, p50, p75, p90<br/>- min, max, stdDev

                Stats->>Stats: Calculate maturity distribution:<br/>{Sơ khai: X, Khởi đầu: Y, ...}
            end

            Stats-->>API: Domain statistics

            API->>DB: UPSERT BenchmarkData<br/>{industry, size, domainCode,<br/>avgScore, p25, p50, p75, p90, ...}
        end
    end

    rect rgb(200, 255, 200)
        Note over API,Stats: ITEM-LEVEL AGGREGATION

        loop For each industry/size combination
            loop For each item
                Stats->>Stats: Calculate item stats:<br/>- avg score<br/>- score distribution

                API->>DB: UPSERT BenchmarkItemData<br/>{industry, size, itemCode, stats}
            end
        end
    end

    rect rgb(255, 230, 230)
        Note over API,DB: CREATE MONTHLY SNAPSHOT

        alt First day of month
            API->>DB: Create BenchmarkSnapshot<br/>{snapshotDate: TODAY,<br/>industry, size,<br/>domainScores, itemScores}
        end
    end

    API->>DB: Update aggregation metadata
    DB-->>API: Success

    API-->>Cron: {aggregated: X assessments}
```

---

## 8. Progress Tracking Flows

### 8.1 Create Progress Goal

```mermaid
sequenceDiagram
    actor User
    participant UI as Goals Page
    participant API as /api/organizations/[id]/goals
    participant DB as PostgreSQL

    User->>UI: Click "Create Goal"
    UI->>User: Show goal form

    User->>UI: Fill form:<br/>- Goal type (OVERALL_SCORE)<br/>- Target value (4.0)<br/>- Target date (Q4 2025)<br/>- Priority (HIGH)

    User->>UI: Add milestones:<br/>Q1: 3.2, Q2: 3.5, Q3: 3.8, Q4: 4.0

    User->>UI: Submit

    UI->>API: POST /goals<br/>{<br/>  goalType, targetValue,<br/>  targetDate, priority,<br/>  milestones: [...]<br/>}

    API->>API: Verify user is ADMIN/OWNER

    API->>DB: Load current assessment score
    DB-->>API: currentValue: 3.0

    API->>DB: BEGIN TRANSACTION

    API->>DB: Create ProgressGoal<br/>{<br/>  organizationId,<br/>  userId,<br/>  goalType,<br/>  currentValue: 3.0,<br/>  targetValue: 4.0,<br/>  status: ACTIVE<br/>}
    DB-->>API: {goalId}

    loop For each milestone
        API->>DB: Create ProgressMilestone<br/>{goalId, targetValue, targetDate}
    end

    API->>DB: Create AuditLog<br/>{action: CREATE_GOAL}

    API->>DB: COMMIT

    API-->>UI: {goalId, milestones}

    UI->>User: "Mục tiêu đã được tạo!"<br/>Display goal timeline
```

---

### 8.2 Check Progress on Assessment Finalize

```mermaid
sequenceDiagram
    participant Finalize as Finalize API
    participant Check as /api/goals/check-progress
    participant DB as PostgreSQL
    participant Notify as Notification Service

    Note over Finalize: After successful finalize

    Finalize->>Check: POST /check-progress<br/>{assessmentId, scores}

    Check->>DB: Load organization goals<br/>WHERE status = ACTIVE
    DB-->>Check: Active goals

    rect rgb(200, 255, 200)
        Note over Check: CHECK EACH GOAL

        loop For each goal
            alt Goal type: OVERALL_SCORE
                Check->>Check: Compare totalScore vs targetValue

                alt totalScore >= targetValue
                    Check->>DB: Update ProgressGoal<br/>{status: ACHIEVED,<br/>achievedAt: NOW,<br/>achievedValue}

                    Check->>Notify: Send notification:<br/>"Chúc mừng! Đạt mục tiêu XX"
                end

            else Goal type: DOMAIN_SCORE
                Check->>Check: Compare domainScore[code] vs targetValue

                alt domainScore >= targetValue
                    Check->>DB: Update ProgressGoal<br/>{status: ACHIEVED}
                    Check->>Notify: Send notification
                end
            end

            rect rgb(255, 230, 230)
                Note over Check: CHECK MILESTONES

                loop For each milestone
                    alt Milestone not achieved
                        Check->>Check: Compare score vs milestone target

                        alt score >= milestone target
                            Check->>DB: Update ProgressMilestone<br/>{status: ACHIEVED,<br/>achievedAt: NOW,<br/>assessmentId}

                            Check->>Notify: Send notification:<br/>"Đạt mốc XX!"
                        end
                    end
                end
            end
        end
    end

    Check->>DB: Create AuditLog<br/>{action: PROGRESS_CHECK}

    Check-->>Finalize: {<br/>  achievedGoals: [...],<br/>  achievedMilestones: [...]<br/>}
```

---

## 9. Guest to User Account Linking

### 9.1 Link Guest Assessment to Account

```mermaid
sequenceDiagram
    actor Guest
    participant UI as Assessment Page
    participant Auth as Auth System
    participant API as Link Assessment API
    participant DB as PostgreSQL
    participant Cookie as Browser Cookies

    Note over Guest: Guest has sessionId cookie<br/>and completed assessment

    Guest->>UI: Click "Lưu vào tài khoản"
    UI->>Guest: Show signup/login form

    Guest->>UI: Sign up / Log in
    UI->>Auth: Authenticate user
    Auth-->>UI: {userId, session}

    UI->>Cookie: Read assessment_session cookie
    Cookie-->>UI: {sessionId}

    UI->>API: POST /link-assessment<br/>{sessionId, userId}

    API->>DB: Find Assessment WHERE sessionId = X
    DB-->>API: Guest assessment

    API->>DB: BEGIN TRANSACTION

    rect rgb(255, 200, 200)
        Note over API,DB: LINK ASSESSMENT TO USER

        API->>DB: Update Assessment<br/>{<br/>  userId: userId,<br/>  sessionId: NULL,<br/>  expiresAt: NULL<br/>}

        Note over API: Remove expiration since<br/>now owned by user
    end

    API->>DB: Update all related data:<br/>- Responses<br/>- Evidence<br/>- Snapshot

    API->>DB: Create AuditLog<br/>{action: GUEST_LINKED,<br/>userId, assessmentId}

    API->>DB: COMMIT

    API-->>UI: {success: true}

    UI->>Cookie: Clear assessment_session cookie

    UI->>Guest: "Đánh giá đã được lưu vào tài khoản!"

    Note over Guest,DB: Assessment now permanent<br/>visible in user's dashboard
```

---

## Summary of Critical Flows

### Data Integrity Points

1. **Score Validation**: Always 1-5 or null, never 0
2. **Progress Calculation**: Count only `score >= 1 AND score IS NOT NULL`
3. **Finalize Validation**: Require >= 50% valid scores
4. **Snapshot Immutability**: Created once, never modified
5. **Audit Trail**: All actions logged (append-only)

### Performance Optimizations

1. **Autosave Debouncing**: 3-second delay to reduce API calls
2. **Transaction Batching**: Multiple responses in single transaction
3. **Index Usage**: All queries use appropriate indexes
4. **Eager Loading**: Load relations upfront to avoid N+1 queries
5. **Caching**: Redis for guest sessions and progress

### Security Considerations

1. **Authorization**: Every API checks ownership (userId or sessionId)
2. **File Upload**: Pre-signed URLs, virus scanning, checksum verification
3. **SQL Injection**: Prisma prevents via parameterized queries
4. **XSS Prevention**: Input validation, output encoding
5. **CSRF Protection**: SameSite cookies, CSRF tokens

---

**Documentation Version**: 1.0
**Last Updated**: 2025-11-07
**Maintained By**: AI Maturity Assessment Platform Team
**Quality Standard**: World-Class Production-Ready
**Total Diagrams**: 15 comprehensive sequence diagrams
