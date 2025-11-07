# Phase 3: Assessment Flow & Results - Architecture Design

**Date:** 2025-11-07
**Status:** 🚧 In Progress
**Quality Standard:** World-Class

---

## 🎯 Overview

Phase 3 implements the core assessment experience:
1. **Assessment Flow** - 37 questions with autosave
2. **Guest Support** - Start without login, save later
3. **Results Dashboard** - Scores, charts, recommendations
4. **Guest Linking** - Merge guest draft when user logs in

---

## 🏗️ System Architecture

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER JOURNEY                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  1. START ASSESSMENT (/assessment/start)                    │
│     - Select industry, size, region                         │
│     - Create Assessment record (DB)                         │
│     - Generate sessionId (guest) or use userId              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  2. ASSESSMENT FORM (/assessment/[id])                      │
│     - Load template + 37 items (5 domains)                  │
│     - Render domain tabs                                    │
│     - Show progress indicator                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  3. USER ANSWERS QUESTIONS                                  │
│     - Select score (1-5)                                    │
│     - Enter current state                                   │
│     - Upload evidence (optional)                            │
│     - Autosave every 3-5 seconds                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  4. AUTOSAVE MECHANISM                                      │
│     Guest: Redis + localStorage backup                      │
│     Logged-in: Direct to Prisma DB                         │
│     TTL: 30 days for guest drafts                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  5. FINALIZE ASSESSMENT                                     │
│     - Validate completeness                                 │
│     - Calculate scores (item, domain, total)               │
│     - Determine maturity level                             │
│     - Create immutable snapshot                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  6. RESULTS DASHBOARD (/assessment/results/[id])           │
│     - Radar chart (5 domains)                              │
│     - Domain breakdown table                               │
│     - Top strengths/weaknesses                             │
│     - Gap analysis                                         │
│     - Roadmap recommendations                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  7. GUEST → LOGGED-IN LINKING (if applicable)              │
│     - Prompt guest to login/register                       │
│     - Merge draft (sessionId → userId)                     │
│     - Transfer ownership                                   │
│     - Enable full features (export, save)                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Component Architecture

### Component Hierarchy

```
src/app/assessment/
├── start/
│   └── page.tsx                     # Start page (industry/size)
├── [id]/
│   └── page.tsx                     # Assessment form
└── results/[id]/
    └── page.tsx                     # Results dashboard

src/components/assessment/
├── AssessmentStartForm.tsx          # Industry/size selection
├── AssessmentForm.tsx               # Main form container
├── DomainTabs.tsx                   # 5 domain navigation
├── QuestionList.tsx                 # List of questions by domain
├── QuestionItem.tsx                 # Single question component
│   ├── ScoreSelector.tsx            # 1-5 radio/slider
│   ├── LevelTooltip.tsx             # Hover to see level descriptions
│   └── EvidenceUpload.tsx           # File upload for evidence
├── ProgressIndicator.tsx            # % complete
├── AutosaveIndicator.tsx            # Saving status
└── results/
    ├── ResultsDashboard.tsx         # Main results container
    ├── RadarChart.tsx               # 5-domain radar (Recharts)
    ├── DomainBreakdown.tsx          # Table by domain
    ├── MaturityBadge.tsx            # Level badge with color
    ├── StrengthsWeaknesses.tsx      # Top 5 each
    ├── GapAnalysis.tsx              # Gap visualization
    └── Roadmap.tsx                  # Timeline recommendations
```

---

## 🔄 State Management Strategy

### Local State (React)
```typescript
// Assessment form state
interface AssessmentState {
  assessmentId: string;
  templateVersion: string;
  industry?: string;
  size?: string;
  region?: string;

  // Responses by item
  responses: {
    [itemId: string]: {
      score: number | null;
      currentState: string;
      evidences: string[]; // Evidence IDs
    }
  };

  // UI state
  currentDomain: string;
  isAutosaving: boolean;
  lastSavedAt: Date | null;
  progress: number; // 0-100
}
```

### Autosave Strategy
```typescript
// Debounced autosave hook
useAutosave({
  data: responses,
  onSave: async (data) => {
    if (isGuest) {
      // Save to Redis + localStorage backup
      await saveToRedis(sessionId, data);
      localStorage.setItem(`draft:${sessionId}`, JSON.stringify(data));
    } else {
      // Save to DB via API
      await api.saveResponses(assessmentId, data);
    }
  },
  delay: 3000, // 3 seconds
});
```

### Progress Calculation
```typescript
function calculateProgress(responses: Responses, totalItems: number): number {
  const answeredCount = Object.values(responses).filter(
    r => r.score !== null
  ).length;
  return Math.round((answeredCount / totalItems) * 100);
}
```

---

## 🗄️ Database Schema Usage

### Assessment Creation
```typescript
// Guest assessment
const assessment = await prisma.assessment.create({
  data: {
    sessionId: generateSessionId(), // UUID
    templateId: template.id,
    industry,
    size,
    region,
    status: 'DRAFT',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  },
});

// Logged-in assessment
const assessment = await prisma.assessment.create({
  data: {
    userId: session.user.id,
    templateId: template.id,
    industry,
    size,
    region,
    status: 'IN_PROGRESS',
  },
});
```

### Response Upsert (Bulk)
```typescript
// Upsert multiple responses at once for performance
await prisma.$transaction(
  Object.entries(responses).map(([itemId, response]) =>
    prisma.response.upsert({
      where: {
        assessmentId_itemId: { assessmentId, itemId },
      },
      update: {
        score: response.score,
        currentState: response.currentState,
      },
      create: {
        assessmentId,
        itemId,
        score: response.score,
        currentState: response.currentState,
      },
    })
  )
);
```

### Snapshot Creation
```typescript
// On finalize, create immutable snapshot
const scores = calculateAllScores(responses, items, domains);

const snapshot = await prisma.assessmentSnapshot.create({
  data: {
    assessmentId,
    itemScores: scores.itemScores,
    domainScores: scores.domainScores,
    totalScore: scores.totalScore,
    maturityLevel: scores.maturityLevel,
    templateVersion: template.version,
    numResponses: Object.keys(responses).length,
    completeness: scores.completeness,
    snapshotData: {
      assessment,
      responses,
      items,
      domains,
      timestamp: new Date().toISOString(),
    },
    checksum: generateChecksum({
      assessmentId,
      scores,
      timestamp: new Date().toISOString(),
    }),
  },
});
```

---

## 🚀 API Endpoints

### 1. Start Assessment
```typescript
POST /api/assessments/start

Request:
{
  industry?: string,
  size?: string,
  region?: string
}

Response:
{
  assessmentId: string,
  sessionId?: string, // For guests
  templateVersion: string
}
```

### 2. Get Assessment
```typescript
GET /api/assessments/[id]

Response:
{
  assessment: {
    id, status, industry, size, region, templateVersion
  },
  template: {
    domains: [...],
    items: [...]
  },
  responses: {
    [itemId]: { score, currentState, evidences }
  }
}
```

### 3. Save Responses (Autosave)
```typescript
PATCH /api/assessments/[id]/responses

Request:
{
  responses: {
    [itemId]: { score, currentState }
  }
}

Response:
{
  success: true,
  savedAt: timestamp,
  progress: number
}
```

### 4. Upload Evidence
```typescript
POST /api/evidence/upload

Request: FormData with file

Response:
{
  evidenceId: string,
  fileName: string,
  fileSize: number,
  storageUrl: string,
  checksum: string
}
```

### 5. Finalize Assessment
```typescript
POST /api/assessments/[id]/finalize

Response:
{
  snapshotId: string,
  scores: {
    itemScores: {...},
    domainScores: {...},
    totalScore: number,
    maturityLevel: string
  }
}
```

### 6. Get Results
```typescript
GET /api/assessments/[id]/results

Response:
{
  snapshot: {
    scores: {...},
    maturityLevel: string,
    completeness: number
  },
  strengths: [...], // Top 5
  weaknesses: [...], // Bottom 5
  gaps: [...],
  recommendations: [...]
}
```

### 7. Link Guest to User
```typescript
POST /api/assessments/link-guest

Request:
{
  sessionId: string
}

Response:
{
  assessmentId: string,
  success: true
}
```

---

## 🎨 UI/UX Design Patterns

### Question Item Layout
```
┌────────────────────────────────────────────────────────┐
│ 1.1 Tính chính xác và độ tin cậy của dữ liệu   [i]    │
├────────────────────────────────────────────────────────┤
│                                                        │
│ Điểm: ○ 1   ○ 2   ○ 3   ○ 4   ○ 5                    │
│       [Hover để xem mô tả từng mức]                   │
│                                                        │
│ Hiện trạng của tổ chức:                               │
│ ┌────────────────────────────────────────────────┐   │
│ │ [Textarea - multi-line input]                  │   │
│ │                                                │   │
│ └────────────────────────────────────────────────┘   │
│                                                        │
│ Bằng chứng (tùy chọn):                                │
│ [📎 Upload file] document.pdf (2.3 MB) [x]            │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Level Tooltip (Hover)
```
┌─────────────────────────────────────────┐
│ Mức 3: Phát triển                       │
├─────────────────────────────────────────┤
│ Có quy trình kiểm tra và xác thực      │
│ dữ liệu được áp dụng định kỳ. Chất     │
│ lượng dữ liệu ở mức chấp nhận được     │
│ cho hầu hết các mục đích.              │
└─────────────────────────────────────────┘
```

### Progress Indicator
```
┌────────────────────────────────────────────────────────┐
│ Tiến độ: 15/37 câu hỏi (41%)                          │
│ ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░               │
│                                                        │
│ ✓ Dữ liệu (9/9)                                       │
│ ⚠ Hạ tầng (3/3)                                       │
│ ○ Công nghệ (3/6) - Đang làm                         │
│ ○ Tổ chức (0/14)                                     │
│ ○ Chính sách (0/5)                                   │
└────────────────────────────────────────────────────────┘
```

### Autosave Indicator
```
┌──────────────────────────────┐
│ ✓ Đã lưu 2 phút trước        │ (success state)
│ ⟳ Đang lưu...                │ (saving state)
│ ⚠ Lưu thất bại - Thử lại     │ (error state)
└──────────────────────────────┘
```

---

## 📈 Results Dashboard Layout

### Radar Chart
```
        Dữ liệu
            /|\
           / | \
          /  |  \
    Chính /  |  \ Hạ tầng
    sách /   |   \
        /____|____\
         \   |   /
          \  |  /
    Tổ chức \|/ Công nghệ
```

### Domain Breakdown Table
```
┌────────────┬────────┬──────────┬────────┬──────────────┐
│ Lĩnh vực   │ Câu hỏi│ Tổng điểm│ Điểm TB│ Mức độ       │
├────────────┼────────┼──────────┼────────┼──────────────┤
│ Dữ liệu    │   9    │   27     │  3.0   │ 🟡 Phát triển│
│ Hạ tầng    │   3    │   12     │  4.0   │ 🟢 Trưởng thành
│ Công nghệ  │   6    │   15     │  2.5   │ 🟠 Khởi đầu  │
│ Tổ chức    │  14    │   42     │  3.0   │ 🟡 Phát triển│
│ Chính sách │   5    │   10     │  2.0   │ 🟠 Khởi đầu  │
├────────────┼────────┼──────────┼────────┼──────────────┤
│ TỔNG       │  37    │  106     │  2.86  │ 🟡 Phát triển│
└────────────┴────────┴──────────┴────────┴──────────────┘
```

---

## ⚡ Performance Optimizations

### 1. Lazy Loading
```typescript
// Lazy load results dashboard
const ResultsDashboard = lazy(() => import('@/components/assessment/results/ResultsDashboard'));

// Lazy load Recharts (heavy library)
const RadarChart = lazy(() => import('@/components/assessment/results/RadarChart'));
```

### 2. Debounced Autosave
```typescript
// Prevent excessive API calls
const debouncedSave = useMemo(
  () => debounce(saveResponses, 3000),
  [saveResponses]
);
```

### 3. Optimistic UI Updates
```typescript
// Update UI immediately, sync in background
const updateScore = (itemId: string, score: number) => {
  // Optimistic update
  setResponses(prev => ({
    ...prev,
    [itemId]: { ...prev[itemId], score }
  }));

  // Background sync
  debouncedSave({ [itemId]: { score } });
};
```

### 4. Virtual Scrolling (if needed)
```typescript
// For long question lists
import { FixedSizeList } from 'react-window';
```

### 5. Memoization
```typescript
// Memoize expensive calculations
const progress = useMemo(
  () => calculateProgress(responses, totalItems),
  [responses, totalItems]
);

const scores = useMemo(
  () => calculateScores(responses, items, domains),
  [responses, items, domains]
);
```

---

## 🔒 Security Considerations

### 1. Guest Draft Protection
- Store sessionId in HTTP-only cookie
- localStorage backup (client-side only)
- Redis TTL: 30 days auto-cleanup
- No PII in Redis (only assessment data)

### 2. Evidence File Upload
```typescript
// Validation
- Max file size: 100 MB
- Allowed types: pdf, docx, xlsx, png, jpg, jpeg
- Virus scan (ClamAV in production)
- Checksum verification (SHA-256)
- Sanitize filename

// Storage
- S3 bucket with private access
- Pre-signed URLs for download (1-hour expiration)
- File metadata in DB (not file content)
```

### 3. Rate Limiting
```typescript
// Autosave endpoint
- Max 100 requests / 5 minutes per session
- Prevents abuse

// Evidence upload
- Max 10 files / assessment
- Max 5 uploads / minute per session
```

### 4. Data Validation
```typescript
// All inputs validated with Zod
const responseSchema = z.object({
  itemId: z.string().cuid(),
  score: z.number().int().min(1).max(5),
  currentState: z.string().max(5000).optional(),
});
```

---

## 🧪 Testing Strategy

### Unit Tests
```typescript
// Scoring engine (already done ✓)
// Autosave mechanism
// Progress calculation
// Guest linking logic
```

### Integration Tests
```typescript
// API endpoints
- Create assessment
- Save responses
- Upload evidence
- Finalize assessment
- Get results
- Link guest
```

### E2E Tests (Playwright)
```typescript
test('Guest completes assessment and links to account', async ({ page }) => {
  // 1. Start as guest
  await page.goto('/assessment/start');
  await page.fill('[name="industry"]', 'finance');
  await page.click('button:has-text("Bắt đầu")');

  // 2. Answer questions
  await page.click('[data-score="3"]'); // Score question
  await page.fill('[name="currentState"]', 'Test state');

  // 3. Check autosave
  await page.waitForSelector('text=Đã lưu', { timeout: 5000 });

  // 4. Complete and view results
  await page.click('button:has-text("Hoàn tất")');
  await expect(page).toHaveURL(/\/results\//);

  // 5. Prompt to login
  await expect(page.locator('text=Đăng nhập để lưu')).toBeVisible();

  // 6. Login
  await page.click('button:has-text("Đăng nhập")');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button:has-text("Đăng nhập")');

  // 7. Verify linked
  await expect(page.locator('button:has-text("Xuất PDF")')).toBeVisible();
});
```

---

## 📝 Implementation Checklist

### Phase 3A: Basic Flow
- [ ] Redis client setup
- [ ] API: Start assessment
- [ ] API: Get assessment
- [ ] API: Save responses
- [ ] Start page UI
- [ ] Assessment form UI
- [ ] Question item component
- [ ] Autosave mechanism
- [ ] Progress indicator

### Phase 3B: Results
- [ ] API: Finalize assessment
- [ ] API: Get results
- [ ] Scoring calculation
- [ ] Radar chart (Recharts)
- [ ] Domain breakdown table
- [ ] Strengths/weaknesses
- [ ] Gap analysis
- [ ] Roadmap visualization

### Phase 3C: Guest Linking
- [ ] API: Link guest
- [ ] Guest prompt UI
- [ ] Merge logic
- [ ] Transfer ownership
- [ ] Audit logging

### Phase 3D: Evidence Upload
- [ ] API: Upload evidence
- [ ] File validation
- [ ] S3 integration
- [ ] Evidence list UI
- [ ] Download/preview

---

## 🎯 Success Criteria

- [ ] Guest can start assessment without login
- [ ] Autosave works every 3-5 seconds
- [ ] Progress indicator updates correctly
- [ ] All 37 questions render with level tooltips
- [ ] Evidence upload works (max 100MB)
- [ ] Results dashboard shows accurate scores
- [ ] Radar chart renders correctly
- [ ] Guest can link to account and keep data
- [ ] No data loss on page refresh
- [ ] Performance: p95 autosave < 200ms
- [ ] All E2E tests pass

---

**Next:** Start implementation with Redis client and API endpoints.
