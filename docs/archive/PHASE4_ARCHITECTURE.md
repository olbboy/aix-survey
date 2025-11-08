# Phase 4 Architecture: Export & Advanced Features

**Version:** 1.0.0
**Date:** November 7, 2025
**Status:** Design & Implementation

---

## 🎯 Phase 4 Objectives

Implement advanced features for export, evidence management, notifications, and analytics to provide complete assessment lifecycle management.

### Core Features
1. **PDF Export** - Professional assessment reports
2. **CSV Export** - Data analysis and Excel integration
3. **Evidence Upload** - File management with S3
4. **Email Notifications** - Automated result delivery
5. **Benchmark Comparison** - Industry averages (future)
6. **Historical Tracking** - Assessment history (future)

---

## 📊 Feature Breakdown

### 4A: Export Services (Priority: HIGH)

#### 1. PDF Export
**Purpose:** Generate professional assessment reports in PDF format

**Requirements:**
- Cover page with organization info
- Executive summary with maturity level
- Radar chart visualization
- Domain scores breakdown
- Top 5 strengths and weaknesses
- Gap analysis table with priorities
- Detailed recommendations
- Roadmap timeline
- Footer with generation date

**Tech Stack:**
- PDFKit for PDF generation
- Chart.js for static chart rendering
- Canvas for image generation
- Sharp for image optimization

**API Endpoint:**
```typescript
GET /api/assessments/[id]/export/pdf
Response: application/pdf (binary stream)
```

**Challenges:**
- Chart rendering in Node.js (no browser canvas)
- Vietnamese font support
- Large file size management
- Memory optimization

**Solutions:**
- Use chart.js with node-canvas for server-side rendering
- Embed Vietnamese fonts (Noto Sans)
- Compress images with Sharp
- Stream PDF generation to avoid memory issues

---

#### 2. CSV Export
**Purpose:** Export assessment data for Excel/data analysis

**Requirements:**
- Item-level responses with scores
- Domain aggregations
- Gap analysis data
- Metadata (industry, size, region)
- Multiple sheets support (overview, details, gaps)

**Format:**
```csv
# Sheet 1: Overview
Assessment ID,Industry,Size,Region,Total Score,Maturity Level,Completion Date
...

# Sheet 2: Item Responses
Item Code,Item Name,Domain,Score,Current State,Target,Gap,Priority
...

# Sheet 3: Gap Analysis
Item Code,Current Score,Target Score,Gap,Priority,Effort,Impact,Recommendation
...
```

**Tech Stack:**
- csv-stringify for CSV generation
- Support for Excel-compatible UTF-8 BOM

**API Endpoint:**
```typescript
GET /api/assessments/[id]/export/csv
Response: text/csv
```

---

### 4B: Evidence Upload System (Priority: HIGH)

#### Architecture
```
Client Upload → Presigned S3 URL → S3 Bucket → DB Record
```

**Flow:**
1. Client requests presigned URL
2. Server generates presigned URL (15 min expiry)
3. Client uploads directly to S3
4. Client confirms upload to server
5. Server creates Evidence record in DB

**S3 Bucket Structure:**
```
assessments/
  {assessmentId}/
    {itemId}/
      {evidenceId}-{filename}
```

**File Restrictions:**
- Max size: 10MB per file
- Allowed types: PDF, PNG, JPG, DOCX, XLSX
- Max 5 files per item
- Virus scanning (optional with AWS Lambda)

**API Endpoints:**
```typescript
POST /api/assessments/[id]/items/[itemId]/evidence/upload-url
→ Returns presigned URL

POST /api/assessments/[id]/items/[itemId]/evidence
→ Confirms upload and creates DB record

DELETE /api/assessments/[id]/items/[itemId]/evidence/[evidenceId]
→ Deletes file from S3 and DB

GET /api/assessments/[id]/items/[itemId]/evidence/[evidenceId]/download
→ Returns presigned download URL
```

**Database Schema:**
```prisma
model Evidence {
  id           String   @id @default(cuid())
  responseId   String
  fileName     String
  originalName String
  fileSize     Int
  mimeType     String
  storageUrl   String   // S3 URL
  storageKey   String   // S3 key for deletion
  uploadedAt   DateTime @default(now())
  uploadedBy   String?  // User ID if logged in
  response     Response @relation(fields: [responseId], references: [id])
}
```

**Security:**
- Presigned URLs with short expiry (15 min)
- File type validation on client and server
- Size validation before upload
- Sanitize filenames to prevent path traversal
- Optional: AWS Lambda for virus scanning

---

### 4C: Email Notification Service (Priority: MEDIUM)

#### Notification Types
1. **Assessment Completed** - When finalized
2. **Results Available** - With PDF attachment
3. **Guest Account Link** - Prompt to create account
4. **Reminder** - For incomplete assessments (30 days)

#### Email Templates

**1. Assessment Completed**
```html
Subject: Your AI Maturity Assessment Results

Dear {name},

Congratulations! Your AI Maturity Assessment has been completed.

Maturity Level: {maturityLevel}
Total Score: {totalScore}/5.0

Key Insights:
- Top Strength: {topStrength}
- Priority Area: {topWeakness}

View your detailed results: {resultsUrl}

Best regards,
AI Maturity Assessment Team
```

**2. Results with PDF**
```html
Subject: AI Maturity Assessment Report - {organizationName}

Dear {name},

Your comprehensive AI Maturity Assessment report is ready!

📊 Summary:
- Maturity Level: {maturityLevel}
- Overall Score: {totalScore}/5.0
- Completion: {completionPercentage}%

📎 Attached: Detailed PDF Report

Next Steps:
1. Review your gap analysis
2. Prioritize improvement areas
3. Implement recommendations

View online: {resultsUrl}

Best regards,
AI Maturity Assessment Team
```

**Tech Stack:**
- Nodemailer (already installed)
- Handlebars for email templates
- Mjml for responsive email design (optional)
- Queue system for async sending (optional: Bull + Redis)

**API Endpoint:**
```typescript
POST /api/assessments/[id]/send-results
Body: { email: string, includeAttachment: boolean }
→ Sends email with results
```

---

### 4D: Data Models & Database Changes

#### New/Updated Models

```prisma
// Evidence model (already exists, enhanced)
model Evidence {
  id           String   @id @default(cuid())
  responseId   String
  fileName     String
  originalName String
  fileSize     Int
  mimeType     String
  storageUrl   String
  storageKey   String   // S3 key
  uploadedAt   DateTime @default(now())
  uploadedBy   String?
  response     Response @relation(fields: [responseId], references: [id], onDelete: Cascade)

  @@index([responseId])
  @@map("evidences")
}

// Export history tracking
model ExportHistory {
  id           String   @id @default(cuid())
  assessmentId String
  exportType   String   // PDF, CSV, PPTX
  exportedAt   DateTime @default(now())
  exportedBy   String?  // User ID
  fileSize     Int?
  downloadUrl  String?  // Temporary URL
  expiresAt    DateTime?
  assessment   Assessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)

  @@index([assessmentId])
  @@index([exportedAt])
  @@map("export_history")
}

// Email notification tracking
model EmailNotification {
  id           String   @id @default(cuid())
  assessmentId String
  recipientEmail String
  emailType    String   // COMPLETED, RESULTS, REMINDER
  sentAt       DateTime @default(now())
  status       String   // SENT, FAILED, PENDING
  errorMessage String?
  assessment   Assessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)

  @@index([assessmentId])
  @@index([sentAt])
  @@map("email_notifications")
}
```

---

## 🏗️ Implementation Plan

### Phase 4A: Export Services (Week 1)

**Day 1-2: PDF Export**
- [ ] Set up PDFKit and dependencies
- [ ] Create PDF service with template
- [ ] Implement chart rendering with canvas
- [ ] Add Vietnamese font support
- [ ] Create PDF generation API endpoint
- [ ] Test with sample assessments

**Day 3: CSV Export**
- [ ] Create CSV service
- [ ] Implement multi-sheet export
- [ ] Add Excel compatibility (UTF-8 BOM)
- [ ] Create CSV generation API endpoint
- [ ] Test with various data sizes

**Day 4: Integration**
- [ ] Add export buttons to results page
- [ ] Implement download handling
- [ ] Add loading states
- [ ] Error handling
- [ ] Testing

### Phase 4B: Evidence Upload (Week 1)

**Day 5: S3 Setup**
- [ ] Configure AWS S3 bucket
- [ ] Set up IAM roles and policies
- [ ] Implement presigned URL generation
- [ ] Create S3 client utility

**Day 6-7: Upload System**
- [ ] Create upload API endpoints
- [ ] Implement client-side upload component
- [ ] Add file validation
- [ ] Progress tracking
- [ ] Error handling
- [ ] Testing

### Phase 4C: Email Notifications (Week 2)

**Day 1-2: Email Service**
- [ ] Create email templates (Handlebars)
- [ ] Set up email service
- [ ] Implement PDF attachment
- [ ] Create notification API
- [ ] Testing

**Day 3: Queue System (Optional)**
- [ ] Set up Bull queue with Redis
- [ ] Implement background job processing
- [ ] Add retry logic
- [ ] Monitoring

---

## 🔒 Security Considerations

### PDF/CSV Export
- ✅ Authorization: Verify ownership before export
- ✅ Rate limiting: Max 10 exports per hour
- ✅ Data sanitization: Escape user inputs
- ✅ Memory limits: Stream large files

### Evidence Upload
- ✅ File validation: Type, size, extension checks
- ✅ Presigned URLs: Short expiry (15 min)
- ✅ S3 bucket: Private with IAM policies
- ✅ Filename sanitization: Prevent path traversal
- ✅ Virus scanning: AWS Lambda (optional)
- ✅ Rate limiting: Max 20 uploads per hour

### Email Notifications
- ✅ Email validation: RFC 5322 compliant
- ✅ Rate limiting: Max 5 emails per assessment
- ✅ Content sanitization: Prevent XSS in templates
- ✅ Attachment size: Max 5MB
- ✅ SPF/DKIM: Email authentication

---

## 📊 Performance Targets

| Feature | Target | Measurement |
|---------|--------|-------------|
| PDF Generation | <5s | 37-item assessment |
| CSV Generation | <1s | All data |
| S3 Upload | <10s | 5MB file |
| Email Sending | <3s | With attachment |
| Concurrent Exports | 10 | Per minute |
| Concurrent Uploads | 20 | Per minute |

---

## 🧪 Testing Strategy

### Unit Tests
- PDF generation logic
- CSV formatting
- S3 URL generation
- Email template rendering

### Integration Tests
- Full export flow
- Upload to S3 flow
- Email sending flow

### E2E Tests
- User clicks export → receives file
- User uploads evidence → appears in S3
- Assessment completed → email sent

---

## 📈 Monitoring & Analytics

### Metrics to Track
- Export requests by type (PDF, CSV)
- Export success/failure rate
- Average export time
- Upload success/failure rate
- Email delivery rate
- Storage usage (S3)

### Logging
- Export events with user/assessment ID
- Upload events with file metadata
- Email events with delivery status
- Error logs with stack traces

---

## 🚀 Deployment Requirements

### Environment Variables
```env
# AWS S3
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=ai-assessment-evidence
AWS_S3_BUCKET_REGION=ap-southeast-1

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=...
EMAIL_FROM=noreply@aiassessment.com

# Export
MAX_EXPORT_SIZE_MB=50
MAX_FILE_UPLOAD_SIZE_MB=10
EXPORT_RATE_LIMIT=10
UPLOAD_RATE_LIMIT=20
```

### Infrastructure
- S3 bucket with lifecycle policies (delete after 90 days)
- CloudFront for S3 distribution (optional)
- SES for email sending (production)
- Redis for queue system (optional)

---

## 📋 Success Criteria

### Phase 4A: Export
- [x] PDF export generates correct report
- [x] CSV export includes all data
- [x] Charts render correctly in PDF
- [x] Vietnamese text displays properly
- [x] Downloads work on all browsers

### Phase 4B: Evidence Upload
- [x] Files upload to S3 successfully
- [x] Upload progress shows correctly
- [x] File validation works
- [x] Download URLs are secure
- [x] Delete removes from S3 and DB

### Phase 4C: Email
- [x] Emails send successfully
- [x] Templates render correctly
- [x] PDF attachments work
- [x] Email deliverability >95%

---

**Architecture Approved:** Ready for Implementation ✅
**Estimated Timeline:** 2 weeks
**Risk Level:** Medium (S3 setup, email deliverability)
