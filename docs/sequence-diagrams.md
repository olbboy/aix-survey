# AI Maturity Self-Assessment Platform - Sequence Diagrams

**Document Version**: 1.0.0
**Last Updated**: 2025-11-09
**Author**: Distinguished Software Engineer Analysis
**Status**: Production Ready

---

## Table of Contents

1. [Guest Assessment Flow](#1-guest-assessment-flow)
2. [Authenticated Assessment Flow](#2-authenticated-assessment-flow)
3. [Evidence Upload Flow](#3-evidence-upload-flow)
4. [Assessment Finalization Flow](#4-assessment-finalization-flow)
5. [Results Retrieval Flow](#5-results-retrieval-flow)
6. [Benchmark Comparison Flow](#6-benchmark-comparison-flow)
7. [Goal Progress Tracking Flow](#7-goal-progress-tracking-flow)
8. [User Authentication Flow](#8-user-authentication-flow)
9. [Export Flow (PDF/CSV)](#9-export-flow-pdfcsv)
10. [Guest to User Conversion Flow](#10-guest-to-user-conversion-flow)
11. [Admin User Management Flow](#11-admin-user-management-flow)
12. [Benchmark Aggregation Flow](#12-benchmark-aggregation-flow)

---

## 1. Guest Assessment Flow

Complete flow for guest user starting and completing an assessment.

```mermaid
sequenceDiagram
    autonumber
    actor Guest as Guest User
    participant FE as Frontend (Next.js)
    participant API as API Client
    participant BE as Backend (NestJS)
    participant DB as PostgreSQL
    participant Redis as Redis Cache
    participant Cookie as Browser Cookie

    Guest->>FE: Navigate to /assessment/start
    FE->>FE: Render start form
    Guest->>FE: Click "Start Assessment"

    FE->>API: POST /assessments/start
    API->>BE: AssessmentsController.startAssessment()
    BE->>DB: SELECT active template
    DB-->>BE: AssessmentTemplate + Domains + Items

    BE->>BE: Generate UUID sessionId
    BE->>DB: INSERT Assessment (status: DRAFT, sessionId)
    DB-->>BE: Assessment created

    BE->>Cookie: Set assessment_session = sessionId (HttpOnly)
    BE-->>API: { assessmentId, sessionId, templateVersion }
    API-->>FE: Assessment created

    FE->>FE: Redirect to /assessment/{assessmentId}
    FE->>API: GET /assessments/{id}
    API->>BE: AssessmentsController.getAssessment()
    BE->>Cookie: Read assessment_session
    BE->>DB: SELECT Assessment WHERE id AND sessionId
    DB-->>BE: Assessment + Template + Items + Responses
    BE-->>API: Assessment data
    API-->>FE: Render assessment form

    loop For each item response
        Guest->>FE: Select score (1-5) for item
        FE->>Redis: Cache response (autosave)

        Note over FE,Redis: Debounced autosave (30s delay)

        FE->>API: PATCH /assessments/{id}/responses
        API->>BE: AssessmentsController.saveResponses()
        BE->>Cookie: Validate sessionId
        BE->>DB: SELECT Assessment WHERE id AND sessionId
        DB-->>BE: Assessment found

        BE->>DB: UPSERT Response (assessmentId, itemId, score)
        DB-->>BE: Response saved

        BE->>BE: Calculate progress %
        BE-->>API: { success: true, progress: 65 }
        API-->>FE: Update progress bar
    end

    Guest->>FE: Click "Submit Assessment"
    FE->>API: POST /assessments/{id}/finalize
    API->>BE: AssessmentsController.finalizeAssessment()

    BE->>DB: SELECT Assessment + Responses
    DB-->>BE: Assessment data

    BE->>BE: Validate completeness (>80%)

    alt Incomplete
        BE-->>API: 400 Error: Incomplete
        API-->>FE: Show validation errors
        FE-->>Guest: "Please answer remaining items"
    else Complete
        BE->>BE: Calculate scores (item, domain, overall)
        BE->>BE: Determine maturity level

        BE->>DB: BEGIN TRANSACTION
        BE->>DB: INSERT AssessmentSnapshot (scores, checksum)
        BE->>DB: UPDATE Assessment SET status=FINALIZED
        BE->>DB: INSERT AuditLog (action: FINALIZE)
        BE->>DB: COMMIT TRANSACTION

        DB-->>BE: Transaction successful
        BE-->>API: { snapshotId, scores, maturityLevel }
        API-->>FE: Finalization successful

        FE->>FE: Redirect to /assessment/results/{id}
        FE-->>Guest: Display results with radar chart
    end
```

**Key Points**:
- Guest identified by sessionId in HTTP-only cookie
- Draft saved automatically every 30 seconds
- Responses are upserted (idempotent)
- Finalization validates completeness before creating immutable snapshot
- Transaction ensures atomicity of finalization

---

## 2. Authenticated Assessment Flow

Flow for registered user with organization context.

```mermaid
sequenceDiagram
    autonumber
    actor User as Authenticated User
    participant FE as Frontend
    participant API as API Client
    participant Auth as Auth Context
    participant BE as Backend
    participant DB as PostgreSQL

    User->>FE: Login completed (JWT stored)
    Auth->>Auth: Store JWT token

    User->>FE: Navigate to /assessment/start
    FE->>API: POST /assessments/start
    API->>Auth: Get JWT token
    Auth-->>API: JWT token
    API->>BE: POST with Authorization: Bearer {JWT}

    BE->>BE: JwtAuthGuard.validateToken()
    BE->>BE: Extract userId from JWT payload

    BE->>DB: SELECT User + Organization
    DB-->>BE: User { id, organizationId, role }

    BE->>DB: SELECT active template
    DB-->>BE: AssessmentTemplate

    BE->>DB: INSERT Assessment (userId, organizationId, status: DRAFT)
    DB-->>BE: Assessment created

    BE-->>API: { assessmentId, userId, organization }
    API-->>FE: Assessment created

    FE->>FE: Redirect to /assessment/{id}

    loop Response autosave
        User->>FE: Answer items
        FE->>API: PATCH /assessments/{id}/responses
        API->>Auth: Get JWT token
        API->>BE: Request with JWT

        BE->>BE: Validate JWT → userId
        BE->>DB: SELECT Assessment WHERE id AND userId
        DB-->>BE: Assessment found (user owns it)

        BE->>DB: UPSERT Response
        DB-->>BE: Saved
        BE-->>API: Success
    end

    User->>FE: Finalize assessment
    FE->>API: POST /assessments/{id}/finalize
    API->>BE: With JWT

    BE->>DB: SELECT Assessment + Responses
    BE->>BE: Calculate scores
    BE->>DB: BEGIN TRANSACTION
    BE->>DB: INSERT AssessmentSnapshot
    BE->>DB: UPDATE Assessment SET status=FINALIZED
    BE->>DB: INSERT AssessmentHistory (organizationId)

    Note over BE,DB: Check organization goals
    BE->>DB: SELECT ProgressGoals WHERE organizationId AND status=ACTIVE
    DB-->>BE: Active goals

    loop For each active goal
        BE->>BE: Check if target achieved
        alt Target achieved
            BE->>DB: UPDATE ProgressGoal SET status=ACHIEVED
            BE->>DB: INSERT EmailNotification (achievement)
        else Milestone achieved
            BE->>DB: UPDATE ProgressMilestone SET status=ACHIEVED
        end
    end

    BE->>DB: COMMIT TRANSACTION
    BE-->>API: Finalization successful
    API-->>FE: Success

    FE->>FE: Redirect to results
```

**Key Differences from Guest Flow**:
- User identified by JWT token (userId)
- Assessment linked to organization
- Organization context provides industry/size/region metadata
- Goal progress checked automatically on finalization
- Assessment history tracked for organization

---

## 3. Evidence Upload Flow

Secure file upload with S3 presigned URLs.

```mermaid
sequenceDiagram
    autonumber
    actor User as User/Guest
    participant FE as Frontend
    participant API as API Client
    participant BE as Backend
    participant DB as PostgreSQL
    participant S3 as S3 Storage

    User->>FE: Click "Upload Evidence" for item
    FE->>FE: Open file picker
    User->>FE: Select file (e.g., policy.pdf)

    FE->>FE: Validate file (size < 10MB, type allowed)

    alt Invalid file
        FE-->>User: "File too large or invalid type"
    else Valid file
        FE->>API: POST /assessments/{id}/evidence/upload-url
        Note over API: { fileName, fileType, fileSize, itemCode }

        API->>BE: GenerateUploadUrlDto
        BE->>DB: SELECT Assessment (validate ownership)
        DB-->>BE: Assessment found

        BE->>BE: Validate assessment not finalized
        BE->>BE: Generate S3 key: assessments/{id}/evidence/{uuid}.pdf

        BE->>S3: Generate presigned upload URL (1h expiry)
        S3-->>BE: Presigned URL

        BE-->>API: { uploadUrl, fileKey, expiresIn: 3600 }
        API-->>FE: Upload URL received

        FE->>FE: Show upload progress bar
        FE->>S3: PUT to presigned URL (direct upload)
        S3-->>FE: 200 OK

        FE->>API: POST /assessments/{id}/evidence/confirm
        Note over API: { fileKey, fileName, fileSize, fileType, itemCode }

        API->>BE: ConfirmEvidenceDto
        BE->>S3: HEAD request to verify file exists
        S3-->>BE: File metadata

        BE->>S3: Download file for checksum
        S3-->>BE: File content
        BE->>BE: Calculate SHA-256 checksum

        BE->>DB: INSERT Evidence
        Note over DB: { assessmentId, fileName, fileSize, <br/>storageUrl, storageKey, checksum, <br/>uploadedBy, itemCode }

        DB-->>BE: Evidence record created

        BE->>DB: INSERT AuditLog (action: EVIDENCE_UPLOADED)

        opt Virus scanning enabled
            BE->>BE: Queue virus scan job
        end

        BE-->>API: { evidenceId, fileName, fileSize }
        API-->>FE: Upload confirmed

        FE-->>User: "Evidence uploaded successfully"
    end
```

**Security Features**:
- Presigned URLs prevent unauthorized uploads
- Direct S3 upload reduces backend load
- Checksum verification prevents tampering
- Virus scanning (optional) before finalization
- Audit trail for all uploads

---

## 4. Assessment Finalization Flow

Detailed finalization with scoring, snapshot creation, and goal tracking.

```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant FE as Frontend
    participant BE as Backend
    participant DB as PostgreSQL
    participant Calc as Scoring Engine
    participant Audit as Audit Service

    User->>FE: Click "Finalize Assessment"
    FE->>FE: Show confirmation modal
    User->>FE: Confirm finalization

    FE->>BE: POST /assessments/{id}/finalize

    BE->>DB: BEGIN TRANSACTION

    BE->>DB: SELECT Assessment + Responses + Template
    DB-->>BE: Full assessment data

    BE->>BE: Validate status = DRAFT

    alt Already finalized
        BE->>DB: ROLLBACK
        BE-->>FE: 400 Error: Already finalized
    end

    BE->>BE: Check completeness

    loop For each required item
        BE->>BE: Check response exists
        BE->>BE: If score <= 2, check evidence exists
    end

    BE->>BE: Calculate completeness %

    alt Completeness < 80%
        BE->>DB: ROLLBACK
        BE-->>FE: 400 Error: Incomplete (missing items list)
    end

    Note over BE,Calc: Scoring Calculation

    BE->>Calc: Calculate item scores
    Calc->>Calc: Extract response.score for each item

    BE->>Calc: Calculate domain scores
    loop For each domain
        Calc->>Calc: domainScore = Σ(itemScore × weight) / Σ(weight)
    end

    BE->>Calc: Calculate overall score
    Calc->>Calc: overallScore = Σ(domainScore × domainWeight) / Σ(domainWeight)

    BE->>Calc: Determine maturity level
    Calc->>Calc: Map score to level (1.0-1.5=Initial, ... 4.6-5.0=Optimized)

    Calc-->>BE: { itemScores, domainScores, overallScore, maturityLevel }

    Note over BE,DB: Snapshot Creation

    BE->>BE: Prepare snapshot data
    BE->>BE: Calculate SHA-256 checksum of snapshot JSON

    BE->>DB: INSERT AssessmentSnapshot
    Note over DB: { assessmentId, itemScores, domainScores, <br/>overallScore, maturityLevel, <br/>snapshotData, checksum }

    BE->>DB: UPDATE Assessment SET status=FINALIZED, finalizedAt=NOW()

    Note over BE,DB: History Tracking

    BE->>DB: SELECT previous AssessmentHistory for organizationId
    DB-->>BE: Previous assessment (if exists)

    opt Previous assessment exists
        BE->>BE: Calculate improvement metrics
        BE->>BE: scoreChange = current - previous
        BE->>BE: improvementRate = (scoreChange / previous) × 100
        BE->>BE: daysSincePrevious = current.date - previous.date
    end

    BE->>DB: INSERT AssessmentHistory
    Note over DB: { organizationId, assessmentId, <br/>overallScore, domainScores, <br/>scoreChange, improvementRate }

    Note over BE,DB: Goal Progress Check

    BE->>DB: SELECT ProgressGoals WHERE organizationId AND status=ACTIVE
    DB-->>BE: Active goals

    loop For each goal
        BE->>BE: Check achievement

        alt Goal type = OVERALL_SCORE
            BE->>BE: Compare overallScore >= targetValue
        else Goal type = DOMAIN_SCORE
            BE->>BE: Compare domainScore[code] >= targetValue
        else Goal type = MATURITY_LEVEL
            BE->>BE: Compare maturityLevel >= targetLevel
        end

        alt Target achieved
            BE->>DB: UPDATE ProgressGoal SET status=ACHIEVED, achievedAt=NOW()
            BE->>DB: INSERT EmailNotification (goal achievement)
        else Milestone achieved
            BE->>DB: SELECT next ProgressMilestone
            BE->>DB: UPDATE ProgressMilestone SET status=ACHIEVED
        end
    end

    Note over BE,Audit: Audit Logging

    BE->>Audit: Log finalization event
    Audit->>DB: INSERT AuditLog
    Note over DB: { action: ASSESSMENT_FINALIZED, <br/>userId, assessmentId, <br/>changes: { status: DRAFT→FINALIZED } }

    BE->>DB: COMMIT TRANSACTION

    BE-->>FE: Success { snapshotId, scores, maturityLevel, achievements }

    FE->>FE: Redirect to /assessment/results/{id}
```

**Transaction Guarantees**:
- All-or-nothing finalization (ACID)
- Snapshot creation is atomic
- Goal updates are consistent
- Audit trail is complete

**Performance Optimization**:
- Single transaction for all updates
- Batch goal checking
- Deferred email sending (async)

---

## 5. Results Retrieval Flow

Fetching comprehensive results with analytics.

```mermaid
sequenceDiagram
    autonumber
    actor User as User/Guest
    participant FE as Frontend
    participant BE as Backend
    participant DB as PostgreSQL
    participant Analytics as Analytics Engine

    User->>FE: Navigate to /assessment/results/{id}

    FE->>BE: GET /assessments/{id}/results

    BE->>DB: SELECT Assessment WHERE id
    DB-->>BE: Assessment

    BE->>BE: Validate status = FINALIZED

    alt Not finalized
        BE-->>FE: 400 Error: Assessment not finalized
        FE-->>User: "Complete assessment first"
    end

    BE->>DB: SELECT AssessmentSnapshot WHERE assessmentId
    DB-->>BE: Snapshot { scores, maturityLevel, checksum }

    BE->>BE: Verify checksum integrity

    BE->>DB: SELECT Template + Domains + Items
    DB-->>BE: Template structure

    Note over BE,Analytics: Generate Analytics

    BE->>Analytics: Analyze strengths
    Analytics->>Analytics: Identify top 3 domains by score
    Analytics->>Analytics: Identify top 5 items by score

    BE->>Analytics: Analyze weaknesses
    Analytics->>Analytics: Identify bottom 3 domains
    Analytics->>Analytics: Identify bottom 5 items with gaps

    BE->>Analytics: Generate recommendations
    loop For each weak domain
        Analytics->>Analytics: Create improvement recommendation
        Analytics->>Analytics: Suggest action items based on level gap
    end

    opt Organization has previous assessments
        BE->>DB: SELECT previous AssessmentHistory
        DB-->>BE: Previous scores

        BE->>Analytics: Calculate improvement trends
        Analytics->>Analytics: Compare current vs previous
        Analytics->>Analytics: Calculate domain-level changes
        Analytics->>Analytics: Identify improvement/decline areas
    end

    opt User authenticated
        BE->>DB: SELECT ProgressGoals WHERE organizationId
        DB-->>BE: Goals and milestones

        BE->>Analytics: Map scores to goals
        Analytics->>Analytics: Calculate progress toward each goal
        Analytics->>Analytics: Identify achieved milestones
    end

    Analytics-->>BE: Analytics package

    BE-->>FE: Results
    Note over FE: { assessment, snapshot, scores, <br/>maturityLevel, strengths, weaknesses, <br/>recommendations, trends, goals }

    FE->>FE: Render results page
    FE->>FE: Generate radar chart (Chart.js)
    FE->>FE: Display domain breakdown
    FE->>FE: Show recommendations

    FE-->>User: Comprehensive results display
```

**Analytics Components**:
- **Strengths**: Top performing domains/items
- **Weaknesses**: Areas needing improvement
- **Recommendations**: Actionable next steps
- **Trends**: Historical comparison
- **Goal Progress**: Achievement tracking

---

## 6. Benchmark Comparison Flow

Comparing assessment against industry benchmarks.

```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant FE as Frontend
    participant BE as Backend
    participant DB as PostgreSQL
    participant Stats as Statistics Engine

    User->>FE: Click "Compare to Industry"

    FE->>BE: GET /assessments/{id}/benchmark

    BE->>DB: SELECT Assessment + Snapshot
    DB-->>BE: Assessment { industry, size, region, scores }

    BE->>BE: Validate assessment finalized

    BE->>DB: SELECT BenchmarkData WHERE industry AND size AND region
    DB-->>BE: Benchmark statistics

    alt No benchmark data
        BE-->>FE: 404 Error: No benchmark data available
        FE-->>User: "Insufficient data for this segment"
    end

    Note over BE,Stats: Domain-Level Comparison

    loop For each domain
        BE->>Stats: Compare domain score
        Stats->>Stats: userScore = domainScores[domain]
        Stats->>Stats: benchmarkAvg = benchmarkData[domain].avgScore
        Stats->>Stats: percentile = calculatePercentile(userScore)

        alt userScore > benchmarkAvg
            Stats->>Stats: position = "above average"
            Stats->>Stats: gap = userScore - benchmarkAvg
        else userScore < benchmarkAvg
            Stats->>Stats: position = "below average"
            Stats->>Stats: gap = benchmarkAvg - userScore
        else
            Stats->>Stats: position = "at average"
            Stats->>Stats: gap = 0
        end

        Stats-->>BE: Domain comparison
    end

    Note over BE,Stats: Item-Level Comparison

    BE->>DB: SELECT BenchmarkItemData WHERE industry AND size
    DB-->>BE: Item-level benchmarks

    loop For each item
        BE->>Stats: Compare item score
        Stats->>Stats: Calculate percentile
        Stats->>Stats: Identify gap
    end

    Note over BE,Stats: Ranking Calculation

    BE->>Stats: Calculate overall ranking
    Stats->>Stats: overallPercentile = calculatePercentile(overallScore)
    Stats->>Stats: Rank description (e.g., "Top 25%")

    BE-->>FE: Benchmark comparison
    Note over FE: { domainComparisons, itemComparisons, <br/>overallRanking, percentile, gaps }

    FE->>FE: Render comparison charts
    FE->>FE: Show percentile badges
    FE->>FE: Highlight strengths vs industry
    FE->>FE: Show improvement opportunities

    FE-->>User: Benchmark comparison display
```

**Percentile Calculation**:
```
percentile = (number of scores below user score / total sample size) × 100
```

**Ranking Descriptions**:
- Top 10%: "Industry Leader"
- Top 25%: "Above Average"
- 25-75%: "Industry Average"
- Bottom 25%: "Below Average"
- Bottom 10%: "Needs Improvement"

---

## 7. Goal Progress Tracking Flow

Automated goal tracking on assessment finalization.

```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant FE as Frontend
    participant BE as Backend
    participant DB as PostgreSQL
    participant Goals as GoalsService
    participant Email as Email Service

    Note over User,Email: Goal Creation (Prerequisite)

    User->>FE: Navigate to /goals
    FE->>BE: GET /organizations/{id}/goals
    BE->>DB: SELECT ProgressGoals WHERE organizationId
    DB-->>BE: Existing goals
    BE-->>FE: Goals list

    User->>FE: Click "Create New Goal"
    FE->>FE: Show goal creation form

    User->>FE: Fill goal details
    Note over User,FE: Type: OVERALL_SCORE<br/>Target: 4.0<br/>Date: 2025-12-31

    FE->>BE: POST /organizations/{id}/goals
    BE->>DB: SELECT current assessment score
    DB-->>BE: currentValue = 3.2

    BE->>DB: INSERT ProgressGoal
    Note over DB: { organizationId, goalType, <br/>currentValue: 3.2, targetValue: 4.0, <br/>targetDate, status: ACTIVE }

    BE->>DB: INSERT ProgressMilestones
    Note over DB: Milestone 1: 3.5 by 2025-06-30<br/>Milestone 2: 3.75 by 2025-09-30<br/>Milestone 3: 4.0 by 2025-12-31

    BE-->>FE: Goal created with milestones

    Note over User,Email: Progress Check (On Assessment Finalization)

    User->>BE: POST /assessments/{id}/finalize
    Note over BE: (Inside finalization transaction)

    BE->>DB: Assessment finalized with score 3.6

    BE->>Goals: checkProgress({ assessmentId, organizationId })

    Goals->>DB: SELECT ProgressGoals WHERE organizationId AND status=ACTIVE
    DB-->>Goals: Active goals

    loop For each active goal
        Goals->>Goals: Extract current score based on goalType

        alt goalType = OVERALL_SCORE
            Goals->>Goals: currentScore = overallScore (3.6)
        else goalType = DOMAIN_SCORE
            Goals->>Goals: currentScore = domainScores[domainCode]
        else goalType = MATURITY_LEVEL
            Goals->>Goals: currentLevel = maturityLevel
        end

        Goals->>DB: SELECT ProgressMilestones WHERE goalId AND status=ACTIVE
        DB-->>Goals: Active milestones

        loop For each milestone
            alt currentScore >= milestone.targetValue
                Goals->>DB: UPDATE ProgressMilestone SET status=ACHIEVED, achievedAt=NOW()
                Goals->>DB: UPDATE SET achievedValue=3.6, assessmentId

                Goals->>Email: Queue achievement notification
                Email->>Email: Prepare email template
                Email->>DB: INSERT EmailNotification
            end
        end

        alt currentScore >= goal.targetValue
            Goals->>DB: UPDATE ProgressGoal SET status=ACHIEVED, achievedAt=NOW()
            Goals->>DB: UPDATE SET achievedValue=3.6

            Goals->>Email: Queue goal achievement notification
            Email->>DB: INSERT EmailNotification

        else targetDate < NOW()
            Goals->>DB: UPDATE ProgressGoal SET status=MISSED
        end

        Goals->>DB: COMMIT
    end

    Goals-->>BE: Progress check results
    Note over Goals,BE: { goalsUpdated: 1, <br/>milestonesAchieved: 1, <br/>goalsAchieved: 0 }

    BE-->>FE: Finalization complete with goal updates

    opt Email notifications
        Email->>Email: Process notification queue
        Email->>Email: Send milestone achievement email
        Email->>DB: UPDATE EmailNotification SET status=SENT
    end

    FE->>FE: Show success message
    FE->>FE: Display achievement badges

    FE-->>User: "Milestone achieved! 🎉"
```

**Goal Status Lifecycle**:
1. **ACTIVE**: Currently tracking
2. **ACHIEVED**: Target met before deadline
3. **MISSED**: Deadline passed without achievement
4. **CANCELLED**: User manually cancelled

**Milestone Tracking**:
- Milestones are sub-goals with intermediate targets
- Automatically marked as achieved when score threshold met
- Linked to specific assessment that achieved it
- Email notifications sent for each achievement

---

## 8. User Authentication Flow

Registration and login with JWT tokens.

```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant FE as Frontend
    participant BE as Backend
    participant DB as PostgreSQL
    participant Hash as Bcrypt Service
    participant JWT as JWT Service
    participant Email as Email Service

    Note over User,Email: Registration Flow

    User->>FE: Navigate to /auth/register
    FE->>FE: Render registration form

    User->>FE: Fill form (email, password, name)
    User->>FE: Submit registration

    FE->>FE: Client-side validation
    FE->>BE: POST /auth/register

    BE->>DB: SELECT User WHERE email
    DB-->>BE: Check if exists

    alt Email already exists
        BE-->>FE: 409 Conflict: Email already registered
        FE-->>User: "Email already in use"
    end

    BE->>Hash: hashPassword(password)
    Hash-->>BE: hashedPassword

    BE->>DB: BEGIN TRANSACTION
    BE->>DB: INSERT User (email, name, role: RESPONDENT)
    BE->>DB: INSERT Account (userId, password: hashedPassword)
    BE->>DB: COMMIT

    BE->>JWT: Generate verification token
    BE->>DB: INSERT Verification (identifier: email, value: token, type: 'email')

    BE->>Email: Send verification email
    Email->>Email: Render template with verification link
    Email->>Email: Send via SMTP

    BE->>JWT: Generate JWT token
    JWT->>JWT: Sign payload { userId, email, role }
    JWT-->>BE: JWT token

    BE-->>FE: { user, token, message: "Verification email sent" }

    FE->>FE: Store token in localStorage
    FE->>FE: Update auth context
    FE->>FE: Redirect to dashboard

    FE-->>User: "Registration successful!"

    Note over User,Email: Email Verification

    User->>Email: Click verification link in email
    Email->>FE: Redirect to /auth/verify-email?token={token}

    FE->>BE: POST /auth/verify-email
    BE->>DB: SELECT Verification WHERE value=token AND type='email'
    DB-->>BE: Verification record

    alt Token expired or invalid
        BE-->>FE: 400 Error: Invalid token
        FE-->>User: "Verification link expired"
    end

    BE->>DB: UPDATE User SET emailVerified=true
    BE->>DB: DELETE Verification WHERE id
    BE-->>FE: Success
    FE-->>User: "Email verified! ✓"

    Note over User,Email: Login Flow

    User->>FE: Navigate to /auth/login
    FE->>FE: Render login form

    User->>FE: Enter email + password
    User->>FE: Submit login

    FE->>BE: POST /auth/login

    BE->>DB: SELECT User + Account WHERE email
    DB-->>BE: User + hashedPassword

    alt User not found
        BE-->>FE: 401 Unauthorized: Invalid credentials
        FE-->>User: "Invalid email or password"
    end

    BE->>Hash: comparePassword(password, hashedPassword)
    Hash-->>BE: isMatch

    alt Password incorrect
        BE-->>FE: 401 Unauthorized: Invalid credentials
        FE-->>User: "Invalid email or password"
    end

    BE->>DB: UPDATE User SET lastLoginAt=NOW()

    BE->>JWT: Generate JWT token
    JWT->>JWT: Sign { userId, email, role, organizationId }
    JWT->>JWT: Set expiry (7 days)
    JWT-->>BE: JWT token

    BE->>DB: INSERT Session (userId, token, expiresAt)

    BE->>DB: INSERT AuditLog (action: LOGIN)

    BE-->>FE: { user, token }

    FE->>FE: Store token in localStorage
    FE->>FE: Update auth context
    FE->>FE: Redirect to dashboard

    FE-->>User: "Welcome back!"
```

**Security Measures**:
- Passwords hashed with bcrypt (cost factor: 10)
- JWT tokens signed with secret key
- HTTP-only cookies for session IDs
- Token expiry: 7 days (configurable)
- Rate limiting: 5 failed attempts = 15min lockout
- Verification tokens expire after 24 hours

---

## 9. Export Flow (PDF/CSV)

Generating and downloading assessment reports.

```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant FE as Frontend
    participant BE as Backend
    participant DB as PostgreSQL
    participant PDF as PDF Generator
    participant S3 as S3 Storage

    User->>FE: Click "Export as PDF"

    FE->>BE: GET /assessments/{id}/export/pdf

    BE->>DB: SELECT Assessment + Snapshot
    DB-->>BE: Assessment data

    BE->>BE: Validate status = FINALIZED

    alt Not finalized
        BE-->>FE: 400 Error: Must finalize first
        FE-->>User: "Complete assessment to export"
    end

    BE->>DB: SELECT Organization + Template + Domains + Items + Responses + Evidence
    DB-->>BE: Complete assessment package

    Note over BE,PDF: PDF Generation

    BE->>PDF: Generate report

    PDF->>PDF: Render cover page
    Note over PDF: Organization logo<br/>Assessment metadata<br/>Date, version, maturity level

    PDF->>PDF: Render executive summary
    Note over PDF: Overall score: 3.6/5.0<br/>Maturity level: Trưởng thành<br/>Key findings

    PDF->>PDF: Render radar chart
    PDF->>PDF: Convert domain scores to SVG chart

    PDF->>PDF: Render domain breakdown
    loop For each domain
        PDF->>PDF: Domain name + score
        PDF->>PDF: Item-level details
        PDF->>PDF: Evidence references
    end

    PDF->>PDF: Render strengths section
    PDF->>PDF: List top 5 items

    PDF->>PDF: Render weaknesses section
    PDF->>PDF: List bottom 5 items with gaps

    PDF->>PDF: Render recommendations
    loop For each weak area
        PDF->>PDF: Improvement recommendation
        PDF->>PDF: Action items
        PDF->>PDF: Priority level
    end

    opt Include benchmarks
        PDF->>PDF: Render benchmark comparison
        PDF->>PDF: Industry position charts
    end

    PDF->>PDF: Render appendix
    PDF->>PDF: Full response details
    PDF->>PDF: Evidence list with links

    PDF-->>BE: PDF buffer

    opt Store in S3
        BE->>S3: Upload PDF
        BE->>DB: INSERT Evidence (type: EXPORT_PDF)
    end

    BE->>DB: INSERT AuditLog (action: EXPORT_PDF)

    BE-->>FE: PDF file stream
    FE->>FE: Trigger browser download
    FE-->>User: Download starts

    Note over User,S3: CSV Export

    User->>FE: Click "Export as CSV"

    FE->>BE: GET /assessments/{id}/export/csv

    BE->>DB: SELECT Assessment + Responses
    DB-->>BE: Data

    BE->>BE: Generate CSV
    Note over BE: Headers: Item Code, Item Name, Score, <br/>Current State, Domain, Evidence

    loop For each response
        BE->>BE: Add CSV row
    end

    BE->>BE: Add summary rows
    Note over BE: Domain scores<br/>Overall score<br/>Maturity level

    BE->>DB: INSERT AuditLog (action: EXPORT_CSV)

    BE-->>FE: CSV file stream
    FE->>FE: Trigger download
    FE-->>User: CSV downloaded
```

**Export Features**:
- **PDF**: Professional report with charts, 30-50 pages
- **CSV**: Raw data for analysis, importable to Excel
- **Storage**: Optional S3 archival for compliance
- **Audit**: All exports logged
- **Performance**: Generated on-demand, cached for 1 hour

---

## 10. Guest to User Conversion Flow

Converting anonymous assessment to registered user account.

```mermaid
sequenceDiagram
    autonumber
    actor Guest as Guest User
    participant FE as Frontend
    participant BE as Backend
    participant DB as PostgreSQL
    participant Cookie as Browser Cookie

    Note over Guest,Cookie: Guest has completed assessment

    Guest->>FE: View results page
    FE->>FE: Display "Save your results" banner

    Guest->>FE: Click "Create Account"
    FE->>FE: Redirect to /auth/register
    FE->>Cookie: Read assessment_session
    Cookie-->>FE: sessionId

    Guest->>FE: Fill registration form
    Guest->>FE: Submit registration

    FE->>BE: POST /auth/register
    Note over FE,BE: Include sessionId in payload

    BE->>DB: BEGIN TRANSACTION

    BE->>DB: INSERT User (email, name, role: RESPONDENT)
    BE->>DB: INSERT Account (password hash)
    DB-->>BE: User created { userId }

    Note over BE,DB: Link Guest Assessments

    BE->>DB: SELECT Assessments WHERE sessionId
    DB-->>BE: Guest assessments

    loop For each guest assessment
        BE->>DB: UPDATE Assessment SET userId={userId}, sessionId=NULL
        BE->>DB: UPDATE Evidence SET uploadedBy={userId}
        BE->>DB: INSERT AuditLog (action: GUEST_LINKED_TO_USER)
    end

    BE->>DB: COMMIT TRANSACTION

    BE->>Cookie: Clear assessment_session cookie

    BE->>BE: Generate JWT token
    BE-->>FE: { user, token, linkedAssessments: 2 }

    FE->>FE: Store token
    FE->>FE: Clear session cookie
    FE->>FE: Show success message

    FE-->>Guest: "Account created! Your assessments have been saved."

    FE->>FE: Redirect to dashboard
    FE->>BE: GET /assessments (now with userId)

    BE->>DB: SELECT Assessments WHERE userId
    DB-->>BE: All assessments (including converted ones)

    BE-->>FE: Assessment list
    FE-->>Guest: Show all saved assessments
```

**Conversion Benefits**:
- Preserves all progress and responses
- Links evidence files to user account
- Extends draft expiration (from 30 days to unlimited)
- Enables organization features
- Allows goal tracking

**Edge Cases**:
- If email already exists → merge assessments
- Multiple guest sessions → link all to new user
- Partial completion → preserve draft state

---

## 11. Admin User Management Flow

Admin operations for user administration.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin
    participant FE as Admin Dashboard
    participant BE as Backend
    participant DB as PostgreSQL
    participant Audit as Audit Service

    Admin->>FE: Navigate to /admin/users

    FE->>BE: GET /admin/users?page=1&pageSize=20
    BE->>BE: Validate JWT → role = ADMIN

    alt Not admin
        BE-->>FE: 403 Forbidden: Admin access required
        FE-->>Admin: "Access denied"
    end

    BE->>DB: SELECT Users with pagination
    Note over DB: SELECT * FROM users<br/>LIMIT 20 OFFSET 0<br/>ORDER BY createdAt DESC

    DB-->>BE: Users + counts
    BE-->>FE: { users, pagination: { total, pages } }

    FE->>FE: Render user table
    FE-->>Admin: Display user list

    Note over Admin,Audit: View User Details

    Admin->>FE: Click user row
    FE->>BE: GET /admin/users/{userId}?includeActivity=true

    BE->>DB: SELECT User + Organization + Assessments + Goals
    DB-->>BE: User details

    BE->>DB: SELECT AuditLogs WHERE userId (last 100)
    DB-->>BE: Recent activity

    BE-->>FE: User profile with activity
    FE->>FE: Render detail modal
    FE-->>Admin: Show user details

    Note over Admin,Audit: Update User Role

    Admin->>FE: Change role to "ADMIN"
    FE->>FE: Show confirmation dialog
    Admin->>FE: Confirm change

    FE->>BE: PATCH /admin/users/{userId}
    Note over FE,BE: { role: "ADMIN" }

    BE->>DB: SELECT User WHERE id
    DB-->>BE: Current user data

    BE->>Audit: Log before state

    BE->>DB: UPDATE User SET role='ADMIN', updatedAt=NOW()
    DB-->>BE: Updated user

    BE->>Audit: Log after state
    Audit->>DB: INSERT AuditLog
    Note over DB: { action: USER_ROLE_CHANGED,<br/>userId: adminId,<br/>targetUserId: userId,<br/>changes: { role: RESPONDENT → ADMIN } }

    BE-->>FE: Updated user
    FE->>FE: Update table row
    FE-->>Admin: "Role updated successfully"

    Note over Admin,Audit: Deactivate User

    Admin->>FE: Click "Deactivate" button
    FE->>FE: Show confirmation
    Admin->>FE: Confirm deactivation

    FE->>BE: DELETE /admin/users/{userId}?permanent=false

    BE->>DB: UPDATE User SET status='INACTIVE', updatedAt=NOW()
    BE->>DB: UPDATE Assessments SET status='ARCHIVED' WHERE userId

    BE->>Audit: Log deactivation
    Audit->>DB: INSERT AuditLog (action: USER_DEACTIVATED)

    BE-->>FE: Success
    FE->>FE: Remove from active users list
    FE-->>Admin: "User deactivated"

    Note over Admin,Audit: Permanent Delete

    Admin->>FE: Click "Delete Permanently"
    FE->>FE: Show warning dialog
    Note over FE: "This action cannot be undone.<br/>All user data will be deleted."

    Admin->>FE: Type "DELETE" to confirm

    FE->>BE: DELETE /admin/users/{userId}?permanent=true

    BE->>DB: BEGIN TRANSACTION
    BE->>DB: DELETE Sessions WHERE userId
    BE->>DB: DELETE Evidence WHERE uploadedBy=userId
    BE->>DB: DELETE Responses WHERE assessment.userId
    BE->>DB: DELETE Assessments WHERE userId
    BE->>DB: DELETE ProgressGoals WHERE userId
    BE->>DB: UPDATE AuditLogs SET userId=NULL (preserve logs)
    BE->>DB: DELETE User WHERE id
    BE->>DB: COMMIT

    BE->>Audit: Log permanent deletion
    Audit->>DB: INSERT AuditLog (action: USER_DELETED_PERMANENT)

    BE-->>FE: Success
    FE->>FE: Remove from table
    FE-->>Admin: "User permanently deleted"
```

**Admin Capabilities**:
- View all users with filtering and search
- Update user roles
- Activate/deactivate accounts
- Permanent deletion (with confirmation)
- View user activity logs
- Generate user reports

**Audit Trail**:
- Every admin action is logged
- Before/after state captured
- Cannot be deleted (even when user is deleted)
- Searchable by action, user, date

---

## 12. Benchmark Aggregation Flow

Admin-triggered benchmark data aggregation.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin
    participant FE as Admin Dashboard
    participant BE as Backend
    participant DB as PostgreSQL
    participant Stats as Statistics Engine

    Admin->>FE: Navigate to /admin/benchmarks
    FE->>BE: GET /admin/benchmarks/status

    BE->>DB: SELECT COUNT(*) FROM BenchmarkData
    BE->>DB: SELECT MAX(createdAt) FROM BenchmarkSnapshots
    DB-->>BE: Current status

    BE-->>FE: { lastAggregation: "2025-10-01", segments: 15 }
    FE-->>Admin: Show benchmark status

    Admin->>FE: Click "Aggregate Benchmarks"
    FE->>FE: Show confirmation + options
    Note over FE: Aggregate all segments or<br/>specific industry/size?

    Admin->>FE: Select "All Segments"
    Admin->>FE: Confirm aggregation

    FE->>BE: POST /api/benchmarks/aggregate
    Note over BE: Admin-only endpoint

    BE->>BE: Validate role = ADMIN

    BE->>DB: SELECT DISTINCT industry, size, region FROM Assessments WHERE status=FINALIZED
    DB-->>BE: Unique segments
    Note over DB: Example: <br/>Technology / Small / North America<br/>Healthcare / Medium / Asia

    BE->>BE: Start aggregation job
    BE-->>FE: { jobId, status: "processing" }
    FE->>FE: Show progress indicator

    loop For each segment (industry, size, region)
        BE->>DB: SELECT finalized assessments for segment
        DB-->>BE: Assessment snapshots

        BE->>Stats: Validate sample size

        alt Sample size < 10
            Stats->>Stats: Skip segment (insufficient data)
            Note over Stats: Skip to next segment
        end

        Note over BE,Stats: Domain-Level Aggregation

        loop For each domain
            Stats->>Stats: Extract domain scores from all assessments
            Stats->>Stats: Calculate statistics
            Note over Stats: avg = mean(scores)<br/>p25 = 25th percentile<br/>p50 = median<br/>p75 = 75th percentile<br/>p90 = 90th percentile<br/>stdDev = standard deviation

            Stats->>Stats: Calculate maturity distribution
            Note over Stats: Count assessments by level:<br/>{ "Initial": 5, "Beginning": 12, ... }

            Stats-->>BE: Domain statistics

            BE->>DB: UPSERT BenchmarkData
            Note over DB: { industry, size, region, domainCode,<br/>avgScore, p25, p50, p75, p90,<br/>maturityDistribution, sampleSize }
        end

        Note over BE,Stats: Item-Level Aggregation

        loop For each item
            Stats->>Stats: Extract item scores
            Stats->>Stats: Calculate statistics
            Stats->>Stats: Calculate score distribution
            Note over Stats: { "1": 10, "2": 20, "3": 30, ... }

            BE->>DB: UPSERT BenchmarkItemData
        end

        Note over BE,DB: Create Historical Snapshot

        BE->>DB: INSERT BenchmarkSnapshot
        Note over DB: { snapshotDate: NOW(),<br/>industry, size, region,<br/>domainScores: { ... },<br/>itemScores: { ... },<br/>overallScore, sampleSize }
    end

    BE->>DB: UPDATE AggregationLog
    Note over DB: Record completion time, segments processed

    BE-->>FE: { success: true, segmentsProcessed: 15, duration: 5432ms }

    FE->>FE: Hide progress indicator
    FE-->>Admin: "Benchmarks aggregated successfully"

    FE->>BE: GET /api/benchmarks/status
    BE->>DB: SELECT updated benchmark data
    DB-->>BE: Latest statistics
    BE-->>FE: Updated status

    FE-->>Admin: Show updated benchmark overview
```

**Aggregation Schedule**:
- **Manual**: Admin-triggered (as shown above)
- **Automated**: Monthly cron job (1st of month, 2 AM)
- **Threshold**: When segment reaches +50 new assessments

**Performance Optimization**:
- Process segments in parallel (max 5 concurrent)
- Use database window functions for percentiles
- Cache results in Redis for 1 hour
- Background job for large aggregations

**Data Quality**:
- Minimum 10 assessments per segment
- Outlier detection (remove scores > 3 std dev)
- Anonymization verification
- Historical snapshot preservation

---

## Summary of Key Flows

| Flow | Complexity | Key Features | Performance Target |
|------|-----------|--------------|-------------------|
| Guest Assessment | Medium | Cookie-based session, autosave, conversion | < 500ms per save |
| Authenticated Assessment | Medium | JWT auth, org context, goals | < 500ms per save |
| Evidence Upload | High | S3 presigned URLs, checksums, virus scan | < 2s upload init |
| Finalization | Very High | Scoring, snapshots, goals, audit | < 3s total |
| Results Retrieval | Medium | Analytics, trends, recommendations | < 1s |
| Benchmark Comparison | Medium | Statistical analysis, percentiles | < 800ms |
| Goal Tracking | High | Auto-progress, milestones, notifications | < 1s check |
| Authentication | Low | JWT, bcrypt, sessions | < 300ms login |
| Export (PDF) | High | Chart generation, templating | < 8s for 50 pages |
| Guest Conversion | Medium | Data migration, account linking | < 2s |
| Admin Operations | Medium | RBAC, audit logging | < 500ms |
| Benchmark Aggregation | Very High | Batch processing, statistics | < 10min for all segments |

---

**End of Sequence Diagrams Documentation**
