-- Initial Migration: AI Maturity Assessment Platform
-- Creates all base tables, enums, indexes, and constraints

-- ============================================================================
-- CREATE ENUMS
-- ============================================================================

CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'REVIEWER', 'RESPONDENT', 'VIEWER');
CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'PENDING_REVIEW', 'FINALIZED');
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENDING', 'SENT', 'DELIVERED', 'OPENED', 'CLICKED', 'FAILED', 'BOUNCED');
CREATE TYPE "GoalType" AS ENUM ('OVERALL_SCORE', 'MATURITY_LEVEL', 'DOMAIN_SCORE', 'ITEM_SCORE', 'BENCHMARK_RANK');
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'ACHIEVED', 'MISSED', 'CANCELLED');
CREATE TYPE "GoalPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- ============================================================================
-- CREATE TABLES
-- ============================================================================

-- Organizations
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "size" TEXT,
    "region" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- Users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'RESPONDENT',
    "organizationId" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Accounts (better-auth)
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "expires_at" TIMESTAMP(3),
    "password" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- Sessions (better-auth)
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- Verifications (better-auth)
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- Assessment Templates
CREATE TABLE "assessment_templates" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_templates_pkey" PRIMARY KEY ("id")
);

-- Domains
CREATE TABLE "domains" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "templateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domains_pkey" PRIMARY KEY ("id")
);

-- Items
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemNameEn" TEXT,
    "domainId" TEXT NOT NULL,
    "level1" TEXT NOT NULL,
    "level2" TEXT NOT NULL,
    "level3" TEXT NOT NULL,
    "level4" TEXT NOT NULL,
    "level5" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "evidenceRequired" BOOLEAN NOT NULL DEFAULT false,
    "evidenceRequiredIfLe" INTEGER,
    "allowedFileTypes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- Assessments
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT,
    "organizationId" TEXT,
    "templateId" TEXT NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "industry" TEXT,
    "size" TEXT,
    "region" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finalizedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "organizationName" TEXT,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- Responses
CREATE TABLE "responses" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "currentState" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "responses_pkey" PRIMARY KEY ("id")
);

-- Evidence
CREATE TABLE "evidences" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "responseId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "description" TEXT,
    "uploadedBy" TEXT,
    "itemCode" TEXT,
    "virusScanned" BOOLEAN NOT NULL DEFAULT false,
    "scanResult" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidences_pkey" PRIMARY KEY ("id")
);

-- Assessment Snapshots
CREATE TABLE "assessment_snapshots" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "itemScores" JSONB NOT NULL,
    "domainScores" JSONB NOT NULL,
    "totalScore" DOUBLE PRECISION NOT NULL,
    "maturityLevel" TEXT NOT NULL,
    "templateVersion" TEXT NOT NULL,
    "numResponses" INTEGER NOT NULL,
    "completeness" DOUBLE PRECISION NOT NULL,
    "snapshotData" JSONB NOT NULL,
    "checksum" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_snapshots_pkey" PRIMARY KEY ("id")
);

-- Audit Logs
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "assessmentId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "changes" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- Benchmark Data (Domain-level)
CREATE TABLE "benchmark_data" (
    "id" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "region" TEXT,
    "domainCode" TEXT NOT NULL,
    "avgScore" DOUBLE PRECISION NOT NULL,
    "p25" DOUBLE PRECISION NOT NULL,
    "p50" DOUBLE PRECISION NOT NULL,
    "p75" DOUBLE PRECISION NOT NULL,
    "p90" DOUBLE PRECISION NOT NULL,
    "minScore" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "stdDev" DOUBLE PRECISION NOT NULL,
    "maturityDistribution" JSONB,
    "sampleSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benchmark_data_pkey" PRIMARY KEY ("id")
);

-- Benchmark Item Data
CREATE TABLE "benchmark_item_data" (
    "id" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "region" TEXT,
    "itemCode" TEXT NOT NULL,
    "avgScore" DOUBLE PRECISION NOT NULL,
    "p25" DOUBLE PRECISION NOT NULL,
    "p50" DOUBLE PRECISION NOT NULL,
    "p75" DOUBLE PRECISION NOT NULL,
    "p90" DOUBLE PRECISION NOT NULL,
    "minScore" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL,
    "stdDev" DOUBLE PRECISION NOT NULL,
    "scoreDistribution" JSONB,
    "sampleSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "benchmark_item_data_pkey" PRIMARY KEY ("id")
);

-- Benchmark Snapshots
CREATE TABLE "benchmark_snapshots" (
    "id" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "industry" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "region" TEXT,
    "domainScores" JSONB NOT NULL,
    "itemScores" JSONB NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "templateVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "benchmark_snapshots_pkey" PRIMARY KEY ("id")
);

-- Email Notifications
CREATE TABLE "email_notifications" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "subject" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "attachments" JSONB,
    "templateData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_notifications_pkey" PRIMARY KEY ("id")
);

-- Progress Goals
CREATE TABLE "progress_goals" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "goalType" "GoalType" NOT NULL,
    "targetScore" DOUBLE PRECISION,
    "targetLevel" TEXT,
    "domainCode" TEXT,
    "itemCode" TEXT,
    "currentValue" DOUBLE PRECISION,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "achievedAt" TIMESTAMP(3),
    "achievedValue" DOUBLE PRECISION,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "GoalPriority" NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "progress_goals_pkey" PRIMARY KEY ("id")
);

-- Progress Milestones
CREATE TABLE "progress_milestones" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "achievedAt" TIMESTAMP(3),
    "achievedValue" DOUBLE PRECISION,
    "assessmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "progress_milestones_pkey" PRIMARY KEY ("id")
);

-- Assessment History
CREATE TABLE "assessment_history" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "maturityLevel" TEXT NOT NULL,
    "domainScores" JSONB NOT NULL,
    "previousAssessmentId" TEXT,
    "scoreChange" DOUBLE PRECISION,
    "levelChange" INTEGER,
    "improvementRate" DOUBLE PRECISION,
    "daysSincePrevious" INTEGER,
    "assessmentNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_history_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- CREATE UNIQUE CONSTRAINTS
-- ============================================================================

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "accounts_provider_id_account_id_key" ON "accounts"("provider_id", "account_id");
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");
CREATE UNIQUE INDEX "verifications_identifier_type_key" ON "verifications"("identifier", "type");
CREATE UNIQUE INDEX "assessment_templates_version_key" ON "assessment_templates"("version");
CREATE UNIQUE INDEX "domains_templateId_code_key" ON "domains"("templateId", "code");
CREATE UNIQUE INDEX "items_domainId_itemCode_key" ON "items"("domainId", "itemCode");
CREATE UNIQUE INDEX "assessments_sessionId_key" ON "assessments"("sessionId");
CREATE UNIQUE INDEX "responses_assessmentId_itemId_key" ON "responses"("assessmentId", "itemId");
CREATE UNIQUE INDEX "assessment_snapshots_assessmentId_key" ON "assessment_snapshots"("assessmentId");
CREATE UNIQUE INDEX "benchmark_data_industry_size_domainCode_key" ON "benchmark_data"("industry", "size", "domainCode");
CREATE UNIQUE INDEX "benchmark_item_data_industry_size_itemCode_key" ON "benchmark_item_data"("industry", "size", "itemCode");
CREATE UNIQUE INDEX "benchmark_snapshots_industry_size_snapshotDate_key" ON "benchmark_snapshots"("industry", "size", "snapshotDate");
CREATE UNIQUE INDEX "assessment_history_assessmentId_key" ON "assessment_history"("assessmentId");

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

-- Users indexes
CREATE INDEX "users_email_idx" ON "users"("email");
CREATE INDEX "users_organizationId_idx" ON "users"("organizationId");

-- Accounts indexes
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- Sessions indexes
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- Verifications indexes
CREATE INDEX "verifications_identifier_idx" ON "verifications"("identifier");

-- Domains indexes
CREATE INDEX "domains_templateId_idx" ON "domains"("templateId");

-- Items indexes
CREATE INDEX "items_domainId_idx" ON "items"("domainId");

-- Assessments indexes
CREATE INDEX "assessments_sessionId_idx" ON "assessments"("sessionId");
CREATE INDEX "assessments_userId_idx" ON "assessments"("userId");
CREATE INDEX "assessments_organizationId_idx" ON "assessments"("organizationId");
CREATE INDEX "assessments_status_idx" ON "assessments"("status");
CREATE INDEX "assessments_expiresAt_idx" ON "assessments"("expiresAt");
CREATE INDEX "assessments_finalizedAt_idx" ON "assessments"("finalizedAt");

-- Responses indexes
CREATE INDEX "responses_assessmentId_idx" ON "responses"("assessmentId");

-- Evidence indexes
CREATE INDEX "evidences_assessmentId_idx" ON "evidences"("assessmentId");
CREATE INDEX "evidences_responseId_idx" ON "evidences"("responseId");
CREATE INDEX "evidences_uploadedBy_idx" ON "evidences"("uploadedBy");

-- Assessment Snapshots indexes
CREATE INDEX "assessment_snapshots_assessmentId_idx" ON "assessment_snapshots"("assessmentId");

-- Audit Logs indexes
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX "audit_logs_assessmentId_idx" ON "audit_logs"("assessmentId");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- Benchmark Data indexes
CREATE INDEX "benchmark_data_industry_idx" ON "benchmark_data"("industry");
CREATE INDEX "benchmark_data_domainCode_idx" ON "benchmark_data"("domainCode");
CREATE INDEX "benchmark_data_region_idx" ON "benchmark_data"("region");

-- Benchmark Item Data indexes
CREATE INDEX "benchmark_item_data_industry_idx" ON "benchmark_item_data"("industry");
CREATE INDEX "benchmark_item_data_itemCode_idx" ON "benchmark_item_data"("itemCode");
CREATE INDEX "benchmark_item_data_region_idx" ON "benchmark_item_data"("region");

-- Benchmark Snapshots indexes
CREATE INDEX "benchmark_snapshots_industry_idx" ON "benchmark_snapshots"("industry");
CREATE INDEX "benchmark_snapshots_snapshotDate_idx" ON "benchmark_snapshots"("snapshotDate");
CREATE INDEX "benchmark_snapshots_region_idx" ON "benchmark_snapshots"("region");

-- Email Notifications indexes
CREATE INDEX "email_notifications_assessmentId_idx" ON "email_notifications"("assessmentId");
CREATE INDEX "email_notifications_recipientEmail_idx" ON "email_notifications"("recipientEmail");
CREATE INDEX "email_notifications_status_idx" ON "email_notifications"("status");
CREATE INDEX "email_notifications_sentAt_idx" ON "email_notifications"("sentAt");

-- Progress Goals indexes
CREATE INDEX "progress_goals_organizationId_idx" ON "progress_goals"("organizationId");
CREATE INDEX "progress_goals_userId_idx" ON "progress_goals"("userId");
CREATE INDEX "progress_goals_status_idx" ON "progress_goals"("status");
CREATE INDEX "progress_goals_targetDate_idx" ON "progress_goals"("targetDate");

-- Progress Milestones indexes
CREATE INDEX "progress_milestones_goalId_idx" ON "progress_milestones"("goalId");
CREATE INDEX "progress_milestones_status_idx" ON "progress_milestones"("status");

-- Assessment History indexes
CREATE INDEX "assessment_history_organizationId_idx" ON "assessment_history"("organizationId");
CREATE INDEX "assessment_history_assessmentId_idx" ON "assessment_history"("assessmentId");
CREATE INDEX "assessment_history_previousAssessmentId_idx" ON "assessment_history"("previousAssessmentId");

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Users foreign keys
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Accounts foreign keys
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Sessions foreign keys
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Domains foreign keys
ALTER TABLE "domains" ADD CONSTRAINT "domains_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "assessment_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Items foreign keys
ALTER TABLE "items" ADD CONSTRAINT "items_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "domains"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Assessments foreign keys
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "assessment_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Responses foreign keys
ALTER TABLE "responses" ADD CONSTRAINT "responses_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "responses" ADD CONSTRAINT "responses_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Evidence foreign keys
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evidences" ADD CONSTRAINT "evidences_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Assessment Snapshots foreign keys
ALTER TABLE "assessment_snapshots" ADD CONSTRAINT "assessment_snapshots_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Audit Logs foreign keys
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Email Notifications foreign keys
ALTER TABLE "email_notifications" ADD CONSTRAINT "email_notifications_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Progress Goals foreign keys
ALTER TABLE "progress_goals" ADD CONSTRAINT "progress_goals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "progress_goals" ADD CONSTRAINT "progress_goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Progress Milestones foreign keys
ALTER TABLE "progress_milestones" ADD CONSTRAINT "progress_milestones_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "progress_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "progress_milestones" ADD CONSTRAINT "progress_milestones_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Assessment History foreign keys
ALTER TABLE "assessment_history" ADD CONSTRAINT "assessment_history_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_history" ADD CONSTRAINT "assessment_history_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_history" ADD CONSTRAINT "assessment_history_previousAssessmentId_fkey" FOREIGN KEY ("previousAssessmentId") REFERENCES "assessment_history"("id") ON DELETE SET NULL ON UPDATE CASCADE;
