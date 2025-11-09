# AI Maturity Self-Assessment Platform - Business Logic Analysis

**Document Version**: 1.0.0
**Last Updated**: 2025-11-09
**Author**: Distinguished Software Engineer Analysis
**Status**: Production Ready

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture Overview](#system-architecture-overview)
3. [Core Business Domains](#core-business-domains)
4. [Detailed Business Logic Flows](#detailed-business-logic-flows)
5. [Data Model & Relationships](#data-model--relationships)
6. [Authentication & Authorization](#authentication--authorization)
7. [Key Business Rules](#key-business-rules)
8. [Integration Points](#integration-points)
9. [Performance & Scalability](#performance--scalability)

---

## Executive Summary

The **AI Maturity Self-Assessment Platform** is an enterprise-grade application that enables organizations to evaluate their AI maturity across **5 core domains** (Data, Infrastructure, Technology, Organization & Investment, Policy & Governance) using **37 standardized assessment items**.

### Key Capabilities

1. **Guest & Authenticated Assessment Flow**: Support for both anonymous (guest) and registered users
2. **Multi-tenant Architecture**: Organization-based isolation with role-based access control (5 roles)
3. **Real-time Autosave**: Draft persistence with Redis caching
4. **Evidence Management**: Secure file upload/storage with checksum verification
5. **Scoring Engine**: Automated calculation with maturity level classification (5 levels)
6. **Benchmarking**: Industry comparison with anonymous aggregated data
7. **Progress Tracking**: Goal setting and milestone monitoring
8. **Audit Trail**: Complete immutable audit logging
9. **Export**: PDF and CSV report generation
10. **Email Notifications**: Results delivery and reminders

### Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: NestJS, Node.js, Passport.js (JWT Authentication)
- **API Client**: @aix-survey/api-client (Type-safe wrapper)
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Cache**: Redis (draft autosave, sessions)
- **Storage**: S3-compatible (evidence files)

---

## System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Port 3000)                     │
│  Next.js 14 App Router + React 18 + TypeScript              │
│  - Public Routes: /, /assessment/start, /assessment/[id]   │
│  - Auth Routes: /auth/login, /auth/register                │
│  - Dashboard Routes: /admin/*                               │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP/HTTPS (API Client)
                      │ JWT Token in Headers
┌─────────────────────▼───────────────────────────────────────┐
│                    Backend (Port 3001)                      │
│  NestJS API Server with Modular Architecture                │
│  - AuthModule (JWT)                                         │
│  - AssessmentsModule (15 endpoints)                         │
│  - GoalsModule (2 endpoints)                                │
│  - BenchmarksModule (3 endpoints)                           │
│  - OrganizationsModule (2 endpoints)                        │
│  - AdminModule (7 endpoints)                                │
└─────────────────────┬───────────────────────────────────────┘
                      │
            ┌─────────┴─────────┐
            │                   │
┌───────────▼──────────┐  ┌────▼──────────┐
│   PostgreSQL 15+     │  │  Redis Cache  │
│   Prisma ORM         │  │  Sessions     │
│   - 18 Tables        │  │  Drafts       │
│   - ACID Compliant   │  └───────────────┘
└──────────────────────┘
```

### Architectural Patterns

1. **Decoupled Full-Stack**: Frontend and backend are separate services communicating via REST API
2. **Multi-tenant**: Organization-based data isolation with row-level security
3. **Dual Authorization**: Support both user ID (authenticated) and session ID (guest)
4. **Immutable Snapshots**: Finalized assessments are stored as immutable snapshots with checksums
5. **Event-Driven Audit**: All critical operations logged to audit trail
6. **Type-Safe Communication**: Frontend uses generated API client for type safety

---

## Core Business Domains

### 1. Authentication & User Management (AuthModule)

**Purpose**: Secure user authentication and profile management

**Key Components**:
- User registration with email verification
- JWT-based login with token generation
- Profile retrieval
- Session management

**Endpoints**:
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Authenticate and get JWT token
- `GET /api/auth/profile` - Get current user profile
- `GET /api/auth/me` - Alias for profile

**Business Rules**:
- Email must be unique across platform
- Passwords are hashed using bcrypt
- JWT tokens expire after configured duration
- New users default to RESPONDENT role
- Email verification required before full access

---

### 2. Assessment Lifecycle (AssessmentsModule)

**Purpose**: Complete assessment workflow from start to results

#### 2.1 Assessment Start

**Endpoint**: `POST /api/assessments/start`

**Flow**:
1. Client requests new assessment (optionally with organization metadata)
2. System retrieves active assessment template
3. Creates assessment record with:
   - Status: DRAFT
   - userId (if authenticated) OR sessionId (if guest)
   - Template version snapshot
   - Organization metadata (industry, size, region)
4. Generates sessionId for guests (UUID stored in cookie)
5. Returns assessmentId and sessionId

**Business Rules**:
- Only one active template allowed at a time
- Guest assessments expire after 30 days
- Session cookies are HTTP-only and secure
- Assessment inherits organization context if user is logged in

#### 2.2 Assessment Response Saving (Autosave)

**Endpoint**: `PATCH /api/assessments/:id/responses`

**Flow**:
1. Client sends partial or complete responses
2. System validates authorization (userId OR sessionId)
3. Validates assessment is still in DRAFT status
4. For each response:
   - Upsert response record (create or update)
   - Validate score is 1-5
   - Store currentState description
5. Calculate and return progress percentage
6. Update assessment.updatedAt timestamp

**Business Rules**:
- Responses are upserted (idempotent operation)
- Cannot modify finalized assessments
- Progress = (answered items / total items) × 100
- Autosave triggers on field blur or every 30 seconds
- Guests can only access via correct sessionId
- Authenticated users can access via userId

#### 2.3 Evidence Upload

**Endpoint**: `POST /api/assessments/:id/evidence/upload-url`

**Flow**:
1. Client requests upload URL for specific item
2. System validates:
   - Assessment exists and is accessible
   - Assessment is not finalized
   - File type is allowed for this item
3. Generates presigned S3 upload URL (1-hour expiry)
4. Returns upload URL, file key, and metadata
5. Client uploads directly to S3
6. Client confirms upload via confirm endpoint

**Endpoint**: `POST /api/assessments/:id/evidence/confirm`

**Flow**:
1. Client sends file metadata and S3 key
2. System verifies file exists in storage
3. Calculates SHA-256 checksum
4. Creates evidence record:
   - Links to assessment and response
   - Stores file metadata (name, size, type)
   - Records uploader (userId or guestSessionId)
5. Optional: Triggers virus scanning

**Business Rules**:
- Maximum file size: 10MB per file
- Allowed types: PDF, DOCX, PNG, JPG, XLS, URL
- Evidence required for scores ≤ 2 on critical items
- Files are stored with unique keys: `assessments/{assessmentId}/evidence/{uuid}.{ext}`
- Checksums prevent file tampering

#### 2.4 Assessment Finalization

**Endpoint**: `POST /api/assessments/:id/finalize`

**Flow**:
1. Validate assessment completeness:
   - All required items answered
   - Required evidence uploaded
2. Calculate scores:
   - Item scores (direct from responses)
   - Domain scores (weighted average per domain)
   - Overall score (weighted average across domains)
3. Determine maturity level:
   - 1.0-1.5: "Sơ khai" (Initial)
   - 1.6-2.5: "Khởi đầu" (Beginning)
   - 2.6-3.5: "Phát triển" (Developing)
   - 3.6-4.5: "Trưởng thành" (Mature)
   - 4.6-5.0: "Tối ưu" (Optimized)
4. Create immutable snapshot:
   - Store all scores in JSON
   - Include full template snapshot
   - Calculate SHA-256 checksum
   - Record finalization timestamp
5. Update assessment status to FINALIZED
6. Create assessment history record
7. Update organization progress tracking
8. Check and update goal milestones
9. Return snapshot with calculated scores

**Business Rules**:
- Minimum completeness: 80% of items answered
- Cannot finalize twice (idempotency check)
- Snapshot is immutable after creation
- Original responses remain editable for audit purposes
- Guests can finalize but encouraged to register
- Benchmark data aggregation happens post-finalization

#### 2.5 Results Retrieval

**Endpoint**: `GET /api/assessments/:id/results`

**Flow**:
1. Validate assessment is finalized
2. Retrieve assessment snapshot
3. Calculate additional analytics:
   - Strengths (domains/items with highest scores)
   - Weaknesses (domains/items with lowest scores)
   - Recommendations (based on maturity gaps)
   - Comparison to previous assessments (if available)
4. Return comprehensive results package

**Business Rules**:
- Results only available for finalized assessments
- Guests can view results with sessionId
- Results include radar chart data
- Gap analysis highlights improvement opportunities

---

### 3. Evidence Management

**Endpoints**:
- `GET /api/assessments/:id/evidence` - List all evidence
- `GET /api/assessments/:id/evidence/:evidenceId/download` - Download file
- `DELETE /api/assessments/:id/evidence/:evidenceId` - Delete file

**Flow - Download**:
1. Validate evidence ownership
2. Generate presigned S3 download URL (1-hour expiry)
3. Return URL with metadata (filename, size, type)
4. Client downloads directly from S3

**Flow - Delete**:
1. Validate evidence ownership
2. Validate assessment is not finalized
3. Delete from S3 storage
4. Delete database record
5. Log audit trail

**Business Rules**:
- Evidence can only be deleted from draft assessments
- Finalized assessment evidence is immutable
- Download URLs are time-limited (1 hour)
- Virus scanning results affect download availability

---

### 4. Export Functionality

**Endpoints**:
- `GET /api/assessments/:id/export/pdf` - Generate PDF report
- `GET /api/assessments/:id/export/csv` - Generate CSV export

**Flow - PDF Export**:
1. Validate assessment is finalized
2. Retrieve comprehensive results data
3. Generate PDF using template engine:
   - Executive summary
   - Radar charts (domain scores)
   - Item-level breakdown
   - Strengths and weaknesses analysis
   - Recommendations
   - Evidence references
4. Return PDF as downloadable file

**Flow - CSV Export**:
1. Validate assessment is finalized
2. Export tabular data:
   - Assessment metadata
   - All responses with scores
   - Domain scores
   - Maturity levels
   - Evidence list
3. Return CSV file

**Business Rules**:
- Only finalized assessments can be exported
- PDF includes organization branding (if configured)
- CSV follows standard format for data analysis
- Export actions are logged in audit trail
- Maximum PDF size: 50 pages

---

### 5. Benchmarking (BenchmarksModule)

**Purpose**: Industry comparison and trend analysis

#### 5.1 Benchmark Data Retrieval

**Endpoint**: `GET /api/benchmarks?industry=Technology&size=Small&region=NA`

**Flow**:
1. Query benchmark database for segment
2. Return aggregated statistics:
   - Domain-level benchmarks (avg, p25, p50, p75, p90)
   - Item-level benchmarks
   - Sample size
   - Maturity distribution
3. Client compares own scores against benchmarks

**Business Rules**:
- Data is anonymous and aggregated
- Minimum sample size: 10 assessments per segment
- Updates monthly or when threshold reached
- Regional segmentation is optional

#### 5.2 Trend Analysis

**Endpoint**: `GET /api/benchmarks/trends?industry=Technology&months=12`

**Flow**:
1. Retrieve historical benchmark snapshots
2. Calculate trends over time:
   - Month-over-month changes
   - Improvement rates
   - Emerging patterns
3. Return time-series data

**Business Rules**:
- Historical data available for up to 60 months
- Snapshots created monthly
- Trend analysis requires minimum 3 data points

#### 5.3 Benchmark Aggregation (Admin)

**Endpoint**: `POST /api/benchmarks/aggregate` (Admin only)

**Flow**:
1. Query all finalized assessments by segment
2. Calculate statistical aggregates:
   - Mean, median, percentiles
   - Standard deviation
   - Maturity distribution
3. Store in benchmark tables
4. Create historical snapshot
5. Return aggregation summary

**Business Rules**:
- Only admins can trigger aggregation
- Runs automatically on schedule (monthly)
- Excludes incomplete or invalid assessments
- Preserves historical snapshots immutably

---

### 6. Goals & Progress Tracking (GoalsModule, OrganizationsModule)

**Purpose**: Track organizational improvement goals and milestones

#### 6.1 Goal Management

**Endpoints**:
- `POST /api/goals` - Create goal
- `GET /api/goals/:id` - Get goal with progress
- `PUT /api/goals/:id` - Update goal
- `DELETE /api/goals/:id` - Delete goal

**Goal Types**:
1. **OVERALL_SCORE**: Target overall assessment score
2. **MATURITY_LEVEL**: Reach specific maturity level
3. **DOMAIN_SCORE**: Improve specific domain
4. **ITEM_SCORE**: Improve specific item
5. **BENCHMARK_RANK**: Reach percentile ranking

**Flow - Create Goal**:
1. Validate organization access
2. Set baseline (current value)
3. Define target (value, date)
4. Set priority (LOW, MEDIUM, HIGH, CRITICAL)
5. Create milestone checkpoints
6. Return goal with initial status

#### 6.2 Progress Checking

**Endpoint**: `POST /api/goals/check-progress`

**Flow**:
1. Receive new finalized assessment
2. Query active goals for organization
3. For each goal:
   - Compare target vs. current value
   - Check milestone achievements
   - Update goal status:
     - ACTIVE: Still tracking
     - ACHIEVED: Target met
     - MISSED: Deadline passed
4. Create notifications for achievements
5. Return updated goals

**Business Rules**:
- Progress auto-calculated on assessment finalization
- Goals can have multiple milestones
- Milestone dates must be before goal target date
- Achieved goals remain in history
- Goal cancellation requires manual action

#### 6.3 Organization Progress Tracking

**Endpoint**: `GET /api/organizations/:id/progress`

**Flow**:
1. Retrieve all finalized assessments for organization
2. Calculate metrics:
   - Total assessments completed
   - Overall improvement trend
   - Domain-specific improvements
   - Assessment frequency
   - Current maturity level
3. Identify achievements:
   - Consecutive improvements
   - Milestone completions
   - Level advancements
4. Return comprehensive progress report

**Business Rules**:
- Requires minimum 2 finalized assessments
- Progress calculated from assessment history
- Improvement rate = (current - previous) / previous × 100
- Trend analysis uses linear regression

---

### 7. Administration (AdminModule)

**Purpose**: Platform administration and monitoring

#### 7.1 System Health

**Endpoint**: `GET /api/admin/health`

**Metrics**:
- Database connectivity
- Active connections
- CPU usage
- Memory utilization
- Active alerts
- Entity counts (users, orgs, assessments)

#### 7.2 User Management

**Endpoints**:
- `GET /api/admin/users` - List with pagination
- `GET /api/admin/users/:id` - User details
- `PATCH /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete/deactivate

**Features**:
- Search and filtering
- Role management
- Activity tracking
- Account deactivation vs. deletion

#### 7.3 Analytics

**Endpoint**: `GET /api/admin/analytics`

**Metrics**:
- User growth
- Assessment completion rate
- Average scores by segment
- Popular domains
- Evidence upload rates
- Export activity

#### 7.4 Audit Logs

**Endpoint**: `GET /api/admin/audit-logs`

**Tracked Actions**:
- User registration/login
- Assessment CRUD operations
- Response submissions
- Evidence uploads
- Goal changes
- Admin actions

**Log Structure**:
- Action type
- Entity type and ID
- User ID
- Before/after state
- IP address
- User agent
- Timestamp

**Business Rules**:
- Audit logs are immutable
- Append-only database design
- Retention: 7 years minimum
- Indexed for fast querying
- PII is encrypted at rest

---

## Data Model & Relationships

### Core Entity Relationships

```
Organization (1) ─────── (N) User
     │                         │
     │                         │
     └─────── (N) Assessment ──┘
                   │
                   ├── (1) AssessmentTemplate
                   ├── (N) Response ──── (1) Item ──── (1) Domain
                   ├── (N) Evidence
                   ├── (1) AssessmentSnapshot
                   ├── (N) AuditLog
                   ├── (N) EmailNotification
                   └── (N) ProgressMilestone

Organization (1) ─────── (N) ProgressGoal ─────── (N) ProgressMilestone
     │
     └─────── (N) AssessmentHistory
```

### Key Tables

1. **Organization**: Multi-tenant root
2. **User**: Authentication + RBAC
3. **AssessmentTemplate**: Versioned templates
4. **Domain**: 5 assessment domains
5. **Item**: 37 assessment items with level descriptions
6. **Assessment**: Draft or finalized instance
7. **Response**: User answers to items
8. **Evidence**: File attachments
9. **AssessmentSnapshot**: Immutable results
10. **BenchmarkData**: Aggregated industry data
11. **ProgressGoal**: Improvement targets
12. **AssessmentHistory**: Progress over time
13. **AuditLog**: Complete audit trail

---

## Authentication & Authorization

### Authentication Flow (JWT)

```
1. User submits email + password
2. Backend validates credentials
3. Password verified with bcrypt
4. Generate JWT token:
   - Payload: { userId, email, role, organizationId }
   - Secret: From environment variable
   - Expiry: 7 days (configurable)
5. Return token to client
6. Client stores token in localStorage/cookie
7. Include token in Authorization header: "Bearer {token}"
8. Backend validates token on each request
```

### Authorization Levels

**Public Endpoints** (No auth required):
- Assessment start, save, finalize, results
- Benchmark data retrieval
- Evidence download (with valid session)

**Authenticated Endpoints** (JWT required):
- Profile management
- Goal CRUD
- Organization data
- Email notifications

**Admin Endpoints** (ADMIN role required):
- User management
- System health
- Analytics
- Audit logs
- Benchmark aggregation
- Database seeding

### Role-Based Access Control (RBAC)

**Roles** (in order of privilege):
1. **OWNER**: Full organization control
2. **ADMIN**: Platform administration
3. **REVIEWER**: Review and approve assessments
4. **RESPONDENT**: Create and complete assessments
5. **VIEWER**: Read-only access

**Permission Matrix**:

| Action | Owner | Admin | Reviewer | Respondent | Viewer |
|--------|-------|-------|----------|------------|--------|
| Create Assessment | ✓ | ✓ | ✓ | ✓ | ✗ |
| Edit Own Assessment | ✓ | ✓ | ✓ | ✓ | ✗ |
| View All Org Assessments | ✓ | ✓ | ✓ | ✗ | ✓ |
| Finalize Assessment | ✓ | ✓ | ✓ | ✓ | ✗ |
| Manage Users | ✓ | ✓ | ✗ | ✗ | ✗ |
| Create Goals | ✓ | ✓ | ✓ | ✗ | ✗ |
| View Benchmarks | ✓ | ✓ | ✓ | ✓ | ✓ |
| Export Reports | ✓ | ✓ | ✓ | ✓ | ✓ |
| Platform Admin | ✗ | ✓ | ✗ | ✗ | ✗ |

---

## Key Business Rules

### Assessment Completeness

- Minimum 80% items answered to finalize
- Critical items (infrastructure, security) require 100% completion
- Evidence required for scores ≤ 2 on flagged items
- All domain-level summaries must be provided

### Scoring Algorithm

```typescript
// Item Score: Direct from user response (1-5)
itemScore = response.score

// Domain Score: Weighted average of items in domain
domainScore = Σ(itemScore × item.weight) / Σ(item.weight)

// Overall Score: Weighted average of domains
overallScore = Σ(domainScore × domain.weight) / Σ(domain.weight)

// Maturity Level Mapping
if (overallScore >= 4.6) return "Tối ưu" (Optimized)
else if (overallScore >= 3.6) return "Trưởng thành" (Mature)
else if (overallScore >= 2.6) return "Phát triển" (Developing)
else if (overallScore >= 1.6) return "Khởi đầu" (Beginning)
else return "Sơ khai" (Initial)
```

### Data Retention

- **Guest Assessments**: 30 days before auto-deletion
- **Draft Assessments**: No expiration for authenticated users
- **Finalized Assessments**: Permanent retention
- **Audit Logs**: 7 years minimum
- **Evidence Files**: Permanent (finalized), 90 days (draft)
- **Benchmark Snapshots**: Permanent historical record

### Benchmark Aggregation

- Minimum sample size: 10 assessments per segment
- Segments: Industry × Size × Region
- Update frequency: Monthly or when threshold reached
- Data anonymization: Remove all PII before aggregation
- Historical preservation: All snapshots kept permanently

### Guest to User Conversion

**Flow**:
1. Guest completes assessment with sessionId
2. Guest registers account
3. System links guest assessments to new user:
   - Match by sessionId in cookie
   - Transfer ownership to userId
   - Preserve all responses and evidence
   - Update audit trail with linkage event
4. Delete sessionId, set userId

**Business Rules**:
- Guest assessments expire after 30 days if not converted
- Email reminder sent at day 7, 14, 21, 28
- Conversion preserves all progress
- Cannot link to existing user with different email

---

## Integration Points

### External Services

1. **S3-Compatible Storage**: Evidence file storage
2. **Redis Cache**: Draft autosave, session management
3. **Email Service**: SMTP for notifications
4. **Virus Scanning**: Optional ClamAV integration

### Frontend API Client

**Type-Safe Wrapper**: `@aix-survey/api-client`

```typescript
import { apiClient } from '@aix-survey/api-client';

// All methods are type-safe
const result = await apiClient.assessments.start({
  organizationId: 'org-123',
  industry: 'Technology',
  size: 'Small',
});
```

**Features**:
- Automatic JWT injection from auth context
- Request/response TypeScript interfaces
- Error handling with typed exceptions
- Retry logic with exponential backoff
- Request cancellation support

---

## Performance & Scalability

### Performance Targets

| Metric | Target | Current Status |
|--------|--------|----------------|
| Page Load (p95) | < 2.5s | ✅ |
| API Response (p95) | < 300ms | ✅ |
| Autosave Latency | < 200ms | ✅ |
| Concurrent Users | 5,000/tenant | ⏳ Testing |
| DB Query Time (p95) | < 100ms | ✅ |
| PDF Export (50 pages) | < 8s | ⏳ Optimization |

### Scalability Strategies

**Database**:
- Connection pooling (max 20 connections)
- Query optimization with indexes
- Read replicas for reporting
- Partitioning on createdAt for large tables

**Caching**:
- Redis for session state
- Redis for draft autosave (TTL: 1 hour)
- In-memory cache for templates
- CDN for static assets

**API**:
- Horizontal scaling with load balancer
- Stateless backend (JWT-based)
- Rate limiting (100 req/min per IP)
- Request queuing for exports

**Storage**:
- S3 with lifecycle policies
- CloudFront CDN for downloads
- Multipart upload for large files
- Automatic compression

---

## Unresolved Questions

1. **Real-time Collaboration**: How to handle multiple users editing same assessment simultaneously?
2. **Offline Support**: Should we support offline assessment completion with sync?
3. **Data Residency**: How to handle multi-region deployment for compliance?
4. **Advanced Analytics**: Should we add predictive analytics for maturity forecasting?
5. **Mobile Apps**: Native mobile support vs. responsive web?
6. **SSO Integration**: Priority for SAML vs. OAuth providers?
7. **Internationalization**: Full translation support or English + Vietnamese only?
8. **Audit Data Export**: Format and frequency for compliance exports?

---

**End of Business Logic Analysis**
