-- Phase 5A: Enhanced Benchmark Schema Migration
-- Adds item-level benchmarks, historical snapshots, and enhanced statistics

-- Add new columns to existing benchmark_data table
ALTER TABLE "benchmark_data" ADD COLUMN "p90" DOUBLE PRECISION;
ALTER TABLE "benchmark_data" ADD COLUMN "stdDev" DOUBLE PRECISION;
ALTER TABLE "benchmark_data" ADD COLUMN "maturityDistribution" JSONB;
ALTER TABLE "benchmark_data" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Create index on region for benchmark_data
CREATE INDEX "benchmark_data_region_idx" ON "benchmark_data"("region");

-- Create benchmark_item_data table for item-level benchmarks
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

-- Create unique constraint for benchmark_item_data
CREATE UNIQUE INDEX "benchmark_item_data_industry_size_itemCode_key" ON "benchmark_item_data"("industry", "size", "itemCode");

-- Create indexes for benchmark_item_data
CREATE INDEX "benchmark_item_data_industry_idx" ON "benchmark_item_data"("industry");
CREATE INDEX "benchmark_item_data_itemCode_idx" ON "benchmark_item_data"("itemCode");
CREATE INDEX "benchmark_item_data_region_idx" ON "benchmark_item_data"("region");

-- Create benchmark_snapshots table for historical trend analysis
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

-- Create unique constraint for benchmark_snapshots
CREATE UNIQUE INDEX "benchmark_snapshots_industry_size_snapshotDate_key" ON "benchmark_snapshots"("industry", "size", "snapshotDate");

-- Create indexes for benchmark_snapshots
CREATE INDEX "benchmark_snapshots_industry_idx" ON "benchmark_snapshots"("industry");
CREATE INDEX "benchmark_snapshots_snapshotDate_idx" ON "benchmark_snapshots"("snapshotDate");
CREATE INDEX "benchmark_snapshots_region_idx" ON "benchmark_snapshots"("region");
