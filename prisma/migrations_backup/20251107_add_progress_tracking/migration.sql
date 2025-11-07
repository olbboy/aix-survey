-- Phase 5B: Progress Tracking Migration
-- Adds goal tracking, milestones, and assessment history

-- Add organizationName to assessments for denormalization
ALTER TABLE "assessments" ADD COLUMN "organizationName" TEXT;

-- Add finalizedAt index for progress tracking queries
CREATE INDEX "assessments_finalizedAt_idx" ON "assessments"("finalizedAt");

-- Create GoalType enum
CREATE TYPE "GoalType" AS ENUM ('OVERALL_SCORE', 'MATURITY_LEVEL', 'DOMAIN_SCORE', 'ITEM_SCORE', 'BENCHMARK_RANK');

-- Create GoalStatus enum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'ACHIEVED', 'MISSED', 'CANCELLED');

-- Create GoalPriority enum
CREATE TYPE "GoalPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- Create progress_goals table
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

-- Create indexes for progress_goals
CREATE INDEX "progress_goals_organizationId_idx" ON "progress_goals"("organizationId");
CREATE INDEX "progress_goals_userId_idx" ON "progress_goals"("userId");
CREATE INDEX "progress_goals_status_idx" ON "progress_goals"("status");
CREATE INDEX "progress_goals_targetDate_idx" ON "progress_goals"("targetDate");

-- Create progress_milestones table
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

-- Create indexes for progress_milestones
CREATE INDEX "progress_milestones_goalId_idx" ON "progress_milestones"("goalId");
CREATE INDEX "progress_milestones_status_idx" ON "progress_milestones"("status");

-- Create assessment_history table
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

-- Create unique constraint for assessment_history
CREATE UNIQUE INDEX "assessment_history_assessmentId_key" ON "assessment_history"("assessmentId");

-- Create indexes for assessment_history
CREATE INDEX "assessment_history_organizationId_idx" ON "assessment_history"("organizationId");
CREATE INDEX "assessment_history_assessmentId_idx" ON "assessment_history"("assessmentId");
CREATE INDEX "assessment_history_previousAssessmentId_idx" ON "assessment_history"("previousAssessmentId");

-- Add foreign key constraints
ALTER TABLE "progress_goals" ADD CONSTRAINT "progress_goals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "progress_goals" ADD CONSTRAINT "progress_goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "progress_milestones" ADD CONSTRAINT "progress_milestones_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "progress_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "progress_milestones" ADD CONSTRAINT "progress_milestones_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "assessment_history" ADD CONSTRAINT "assessment_history_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_history" ADD CONSTRAINT "assessment_history_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assessment_history" ADD CONSTRAINT "assessment_history_previousAssessmentId_fkey" FOREIGN KEY ("previousAssessmentId") REFERENCES "assessment_history"("id") ON DELETE SET NULL ON UPDATE CASCADE;
