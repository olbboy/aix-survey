# AI Maturity Assessment Platform - Architecture Design

## Documentation Index

**Core Architecture Documents:**
- 📄 **[DATABASE_DESIGN.md](./DATABASE_DESIGN.md)** - Complete database schema, ERD diagrams, and entity documentation
- 📄 **[SEQUENCE_DIAGRAMS.md](./SEQUENCE_DIAGRAMS.md)** - Detailed sequence diagrams for all system flows
- 📄 **[ARCHITECTURE.md](./ARCHITECTURE.md)** - This document: System architecture and component design

**Additional Documentation:**
- [README.md](./README.md) - Project overview and setup
- [DATABASE_SETUP.md](./DATABASE_SETUP.md) - Database configuration guide
- [TROUBLESHOOTING-FINALIZE-ERROR.md](./TROUBLESHOOTING-FINALIZE-ERROR.md) - Common issues and solutions

---

## 1. System Architecture Overview

### 1.1 Tech Stack
- **Frontend**: Next.js 14 (App Router), TypeScript, React 18
- **UI**: Tailwind CSS, Shadcn/ui, Recharts (radar/charts)
- **Backend**: Next.js API Routes (Node.js)
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Cache**: Redis (session, draft autosave)
- **Storage**: S3-compatible (evidence files)
- **Auth**: NextAuth.js v5 (email/password, magic link, OIDC/SAML)
- **Testing**: Jest, React Testing Library, Playwright
- **CI/CD**: GitHub Actions
- **Monitoring**: OpenTelemetry, Prometheus metrics

### 1.2 Architecture Principles
- **Security-first**: OWASP ASVS, row-level security, audit logging
- **Performance**: p95 page load < 2.5s, autosave < 200ms
- **Scalability**: Multi-tenant architecture, horizontal scaling
- **Reliability**: 99.9% uptime, RPO ≤ 1h, RTO ≤ 1h
- **Testability**: >80% code coverage, E2E critical paths

---

## 2. Directory Structure

```
aix-survey/
├── prisma/
│   ├── schema.prisma              # Database schema
│   ├── seed.ts                    # Seed data (37 assessment items)
│   └── migrations/
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (public)/
│   │   │   ├── assessment/       # Guest assessment flow
│   │   │   │   ├── start/
│   │   │   │   ├── [id]/         # Assessment form
│   │   │   │   └── results/[id]/ # Results (guest watermarked)
│   │   │   └── auth/             # Login/register/magic-link
│   │   ├── (dashboard)/          # Protected routes (logged-in)
│   │   │   ├── layout.tsx        # Dashboard layout with nav
│   │   │   ├── assessments/      # My assessments list
│   │   │   ├── results/[id]/     # Full results + export
│   │   │   └── admin/            # Admin panel
│   │   │       ├── templates/    # Template builder
│   │   │       ├── domains/      # Domain management
│   │   │       ├── items/        # Item management
│   │   │       └── users/        # User/RBAC management
│   │   ├── api/                  # API Routes
│   │   │   ├── auth/[...nextauth]/ # NextAuth handlers
│   │   │   ├── assessments/      # Assessment CRUD
│   │   │   ├── responses/        # Autosave responses
│   │   │   ├── scoring/          # Scoring engine
│   │   │   ├── export/           # PDF/PPTX/CSV/JSON
│   │   │   └── admin/            # Admin APIs
│   │   └── layout.tsx            # Root layout
│   ├── components/
│   │   ├── ui/                   # Shadcn/ui base components
│   │   ├── forms/
│   │   │   ├── AssessmentForm.tsx
│   │   │   ├── ItemQuestion.tsx  # Single question with level 1-5
│   │   │   └── EvidenceUpload.tsx
│   │   ├── charts/
│   │   │   ├── RadarChart.tsx    # Domain maturity radar
│   │   │   ├── DomainBarChart.tsx
│   │   │   └── HeatMap.tsx
│   │   ├── results/
│   │   │   ├── ResultsDashboard.tsx
│   │   │   ├── GapAnalysis.tsx
│   │   │   └── Roadmap.tsx
│   │   └── admin/
│   │       ├── TemplateBuilder.tsx
│   │       └── ItemEditor.tsx
│   ├── lib/
│   │   ├── db/
│   │   │   ├── prisma.ts         # Prisma client singleton
│   │   │   └── seed-data.ts      # 37 items seed data
│   │   ├── auth/
│   │   │   ├── auth.config.ts    # NextAuth config
│   │   │   └── rbac.ts           # Role-based access control
│   │   ├── scoring/
│   │   │   ├── scoring-engine.ts # Calculate scores
│   │   │   ├── maturity-levels.ts # Level classification
│   │   │   └── gap-analysis.ts   # Gap + roadmap generator
│   │   ├── export/
│   │   │   ├── pdf-export.ts     # PDF generation
│   │   │   ├── pptx-export.ts    # PowerPoint export
│   │   │   └── csv-export.ts     # CSV export
│   │   ├── storage/
│   │   │   ├── s3-client.ts      # Evidence storage
│   │   │   └── virus-scan.ts     # File validation
│   │   ├── audit/
│   │   │   └── audit-logger.ts   # Audit trail
│   │   ├── redis/
│   │   │   └── redis-client.ts   # Redis for autosave
│   │   └── utils/
│   │       ├── validation.ts
│   │       └── constants.ts
│   ├── types/
│   │   ├── assessment.ts
│   │   ├── scoring.ts
│   │   └── api.ts
│   └── middleware.ts             # Auth + tenant middleware
├── tests/
│   ├── unit/
│   │   ├── scoring.test.ts
│   │   └── validation.test.ts
│   ├── integration/
│   │   ├── api/
│   │   └── db/
│   └── e2e/
│       ├── guest-flow.spec.ts    # UJ-1: Guest assessment
│       ├── auth-flow.spec.ts     # UJ-3: Link guest to account
│       └── export.spec.ts
├── public/
│   └── images/
├── .env.example
├── .env.local
├── docker-compose.yml            # Local dev (Postgres + Redis)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```

---

## 3. Database Schema (Prisma)

### 3.1 Core Entities

```prisma
// Multi-tenant
model Organization {
  id        String   @id @default(cuid())
  name      String
  industry  String?
  size      String?  // small, medium, large, enterprise
  region    String?
  createdAt DateTime @default(now())
  users     User[]
  assessments Assessment[]
}

// Users with RBAC
model User {
  id             String   @id @default(cuid())
  email          String   @unique
  name           String?
  role           Role     @default(RESPONDENT)
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id])
  assessments    Assessment[]
  auditLogs      AuditLog[]
  createdAt      DateTime @default(now())
}

enum Role {
  OWNER
  ADMIN
  REVIEWER
  RESPONDENT
  VIEWER
}

// Assessment Template (versioned)
model AssessmentTemplate {
  id          String   @id @default(cuid())
  version     String   @unique
  name        String
  description String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  domains     Domain[]
  assessments Assessment[]
}

// Domain (5 domains)
model Domain {
  id         String   @id @default(cuid())
  code       String   // data, infra, tech, org, policy
  name       String   // Dữ liệu, Hạ tầng, etc.
  nameEn     String?
  weight     Float    @default(1.0)
  templateId String
  template   AssessmentTemplate @relation(fields: [templateId], references: [id])
  items      Item[]

  @@unique([templateId, code])
}

// Item (37 assessment items)
model Item {
  id           String   @id @default(cuid())
  itemCode     String   // 1.1, 1.2, ..., 5.2
  itemName     String
  itemNameEn   String?
  domainId     String
  domain       Domain   @relation(fields: [domainId], references: [id])

  // Level descriptions (1-5)
  level1       String   @db.Text
  level2       String   @db.Text
  level3       String   @db.Text
  level4       String   @db.Text
  level5       String   @db.Text

  weight       Float    @default(1.0)

  // Evidence rules
  evidenceRequired      Boolean @default(false)
  evidenceRequiredIfLe  Int?    // Require evidence if score <= this
  allowedFileTypes      String[] // pdf, docx, png, url

  createdAt    DateTime @default(now())
  responses    Response[]

  @@unique([domainId, itemCode])
}

// Assessment (draft or finalized)
model Assessment {
  id             String   @id @default(cuid())
  sessionId      String?  // For guest drafts
  userId         String?  // Null if guest
  user           User?    @relation(fields: [userId], references: [id])
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id])

  templateId     String
  template       AssessmentTemplate @relation(fields: [templateId], references: [id])

  status         AssessmentStatus @default(DRAFT)

  // Metadata
  industry       String?
  size           String?
  region         String?

  // Timestamps
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  finalizedAt    DateTime?

  // Relations
  responses      Response[]
  evidences      Evidence[]
  snapshot       AssessmentSnapshot?
  auditLogs      AuditLog[]

  @@index([sessionId])
  @@index([userId])
  @@index([status])
}

enum AssessmentStatus {
  DRAFT
  IN_PROGRESS
  PENDING_REVIEW
  FINALIZED
}

// Response (user answers)
model Response {
  id            String   @id @default(cuid())
  assessmentId  String
  assessment    Assessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)
  itemId        String
  item          Item     @relation(fields: [itemId], references: [id])

  score         Int      // 1-5
  currentState  String?  @db.Text  // User's description of current state

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  evidences     Evidence[]

  @@unique([assessmentId, itemId])
  @@index([assessmentId])
}

// Evidence (file metadata)
model Evidence {
  id           String   @id @default(cuid())
  assessmentId String
  assessment   Assessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)
  responseId   String?
  response     Response? @relation(fields: [responseId], references: [id])

  fileName     String
  fileType     String
  fileSize     Int
  storageUrl   String
  checksum     String   // SHA-256

  uploadedAt   DateTime @default(now())

  @@index([assessmentId])
}

// Immutable snapshot for finalized assessments
model AssessmentSnapshot {
  id            String   @id @default(cuid())
  assessmentId  String   @unique
  assessment    Assessment @relation(fields: [assessmentId], references: [id])

  // Calculated scores
  itemScores    Json     // {itemCode: score}
  domainScores  Json     // {domainCode: avgScore}
  totalScore    Float
  maturityLevel String   // Sơ khai, Khởi đầu, etc.

  // Full data snapshot
  snapshotData  Json     // Complete assessment data
  checksum      String   // SHA-256 of snapshotData

  createdAt     DateTime @default(now())
}

// Audit log (immutable)
model AuditLog {
  id            String   @id @default(cuid())
  userId        String?
  user          User?    @relation(fields: [userId], references: [id])
  assessmentId  String?
  assessment    Assessment? @relation(fields: [assessmentId], references: [id])

  action        String   // CREATE, UPDATE, DELETE, LOGIN, EXPORT, etc.
  entityType    String   // Assessment, Response, User, etc.
  entityId      String?

  changes       Json?    // Before/after values
  ipAddress     String?
  userAgent     String?

  createdAt     DateTime @default(now())

  @@index([userId])
  @@index([assessmentId])
  @@index([createdAt])
}

// Benchmark data (anonymized)
model BenchmarkData {
  id         String   @id @default(cuid())
  industry   String
  size       String
  region     String?

  domainCode String
  avgScore   Float
  p25        Float
  p50        Float
  p75        Float

  sampleSize Int
  updatedAt  DateTime @updatedAt

  @@unique([industry, size, domainCode])
}
```

---

## 4. Key Flows

### 4.1 Guest Assessment Flow (UJ-1)
1. User visits `/assessment/start`
2. Generates `sessionId` (UUID) stored in cookie + localStorage
3. Creates `Assessment` with `status=DRAFT`, `sessionId`, `userId=null`
4. User fills form → autosave every 3-5s to Redis + DB
5. On complete → calculate scores → show results with watermark
6. Prompt "Login to save permanently"

### 4.2 Link Guest to Account (UJ-3)
1. Guest clicks "Save Results" → redirect to `/auth/login`
2. User logs in / registers / SSO
3. Backend finds `Assessment` by `sessionId`
4. Updates `userId`, changes `status=FINALIZED`
5. Creates `AssessmentSnapshot` (immutable)
6. Clears `sessionId`, audit log "GUEST_LINKED"

### 4.3 Scoring Engine
```typescript
// Item score: 1-5 (direct from user)
// Domain score: weighted average
domainScore = Σ(weight_i × score_i) / Σ(weight_i)

// Total score: average of domain scores
totalScore = Σ(domainScore) / numDomains

// Maturity level classification:
// 1.0-1.5 → "Sơ khai"
// 1.6-2.5 → "Khởi đầu"
// 2.6-3.5 → "Phát triển"
// 3.6-4.5 → "Trưởng thành"
// 4.6-5.0 → "Tối ưu"
```

### 4.4 Export Flow
1. User clicks "Export PDF"
2. API `/api/export?assessmentId=xxx&format=pdf`
3. Load `AssessmentSnapshot` + verify checksum
4. Generate report:
   - Executive summary
   - Radar chart (5 domains)
   - Domain breakdown table
   - Top strengths/weaknesses
   - Gap analysis + roadmap
   - Audit appendix (evidence checklist)
5. Return signed file (SHA-256 in metadata)

---

## 5. Security Considerations

### 5.1 Authentication & Authorization
- NextAuth v5 with JWT sessions
- Row-level security in Prisma (tenant isolation)
- RBAC middleware for API routes
- Rate limiting: 10 login attempts / 15 min
- CSRF protection via NextAuth

### 5.2 Data Protection
- TLS 1.3 in production
- AES-256 encryption at rest (DB + S3)
- Evidence files: virus scan, MIME validation, max 100MB
- Guest draft TTL: 30 days, auto-purge

### 5.3 Audit & Compliance
- All mutations logged to `AuditLog` (immutable)
- Checksum verification for snapshots
- GDPR: data minimization, DSAR support, retention policies
- PDPD VN: data localization options

---

## 6. Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Page Load (p95) | < 2.5s | Lighthouse, Web Vitals |
| Autosave (p95) | < 200ms | API monitoring |
| TTFB (p95) | < 300ms | CDN metrics |
| Concurrent Users | 5,000/tenant | Load testing (k6) |
| DB Query (p95) | < 100ms | Prisma metrics |
| Export PDF | < 8s (50 pages) | Integration tests |

---

## 7. Testing Strategy

### 7.1 Unit Tests (>80% coverage)
- Scoring engine
- Validation logic
- Utility functions

### 7.2 Integration Tests
- API routes
- Database operations
- Auth flows

### 7.3 E2E Tests (Playwright)
- Guest assessment flow
- Login + link guest draft
- Export reports
- Admin template builder

### 7.4 Security Tests
- OWASP Top 10 checks
- SQL injection attempts
- XSS prevention
- CSRF validation
- Rate limiting

---

## 8. Monitoring & Observability

- **Logs**: Structured JSON logs (Winston/Pino)
- **Metrics**: Prometheus + Grafana
  - Request latency (p50, p95, p99)
  - Error rates
  - Active sessions
  - Draft autosave success rate
- **Tracing**: OpenTelemetry
- **Alerts**: PagerDuty for P0/P1 incidents
- **SLIs/SLOs**:
  - Availability: 99.9%
  - API success rate: 99.5%
  - Autosave success: 99.8%

---

## 9. Deployment Strategy

### 9.1 Local Development
```bash
docker-compose up -d  # Postgres + Redis
npm run dev           # Next.js dev server
npm run db:migrate    # Prisma migrations
npm run db:seed       # Seed 37 assessment items
```

### 9.2 Production (MVP)
- **Platform**: Vercel / AWS ECS / GCP Cloud Run
- **Database**: Managed PostgreSQL (RDS/Cloud SQL)
- **Cache**: Redis Cloud / ElastiCache
- **Storage**: S3 / GCS
- **CDN**: CloudFront / Cloudflare
- **Secrets**: AWS Secrets Manager / Vault

### 9.3 CI/CD Pipeline
```yaml
# .github/workflows/ci.yml
1. Lint + Type check
2. Unit tests
3. Integration tests
4. Build Docker image
5. Security scan (Trivy)
6. Deploy to staging
7. E2E tests on staging
8. Manual approval → Production
```

---

## 10. MVP Scope (T0 - T+8 weeks)

**In Scope:**
✅ Assessment Builder (admin CRUD)
✅ Guest assessment flow with autosave
✅ Scoring engine (item/domain/total + maturity levels)
✅ Results dashboard (radar, tables)
✅ Guest → logged-in linking
✅ Evidence upload (S3, checksum)
✅ Export: PDF, CSV
✅ RBAC (5 roles)
✅ Audit logging
✅ SSO (OIDC)

**Out of Scope (v1):**
❌ PPTX/JSON export (Beta)
❌ Benchmark comparison (Beta)
❌ Roadmap generator (Beta)
❌ Multi-rater consensus
❌ SCIM provisioning
❌ Advanced analytics

---

## 11. Next Steps

1. ✅ **This document** - Architecture approved
2. ⏳ Initialize Next.js project + dependencies
3. ⏳ Setup Prisma schema + migrations
4. ⏳ Seed 37 assessment items
5. ⏳ Build authentication
6. ⏳ Implement core flows (guest assessment, scoring, export)
7. ⏳ Add tests
8. ⏳ Security hardening
9. ⏳ Performance optimization
10. ⏳ UAT + Go-live

---

**Document Version:** 1.0
**Last Updated:** 2025-11-07
**Status:** ✅ Ready for Implementation
