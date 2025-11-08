/**
 * Benchmark Aggregation Service
 * Calculates industry benchmarks from finalized assessments
 *
 * Phase 5A: Benchmark Comparison
 */

import { prisma } from '@/lib/db/prisma';
import { calculateDomainScore } from '@/lib/scoring/scoring-engine';

// ============================================================================
// TYPES
// ============================================================================

export interface BenchmarkStatistics {
  avgScore: number;
  p25: number; // 25th percentile
  p50: number; // Median
  p75: number; // 75th percentile
  p90: number; // 90th percentile
  minScore: number;
  maxScore: number;
  stdDev: number;
  sampleSize: number;
}

export interface DomainBenchmark extends BenchmarkStatistics {
  domainCode: string;
  maturityDistribution?: Record<string, number>;
}

export interface ItemBenchmark extends BenchmarkStatistics {
  itemCode: string;
  scoreDistribution?: Record<string, number>;
}

export interface AggregationFilters {
  industry?: string;
  size?: string;
  region?: string;
  startDate?: Date;
  endDate?: Date;
}

// ============================================================================
// STATISTICAL CALCULATIONS
// ============================================================================

/**
 * Calculate statistical measures from array of scores
 */
export function calculateStatistics(scores: number[]): BenchmarkStatistics {
  if (scores.length === 0) {
    return {
      avgScore: 0,
      p25: 0,
      p50: 0,
      p75: 0,
      p90: 0,
      minScore: 0,
      maxScore: 0,
      stdDev: 0,
      sampleSize: 0,
    };
  }

  // Sort scores for percentile calculations
  const sorted = [...scores].sort((a, b) => a - b);
  const n = sorted.length;

  // Calculate average
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const avgScore = sum / n;

  // Calculate standard deviation
  const variance = sorted.reduce((acc, val) => acc + Math.pow(val - avgScore, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  // Calculate percentiles using linear interpolation
  const percentile = (p: number): number => {
    const index = (p / 100) * (n - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) {
      return sorted[lower];
    }

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  };

  return {
    avgScore: Math.round(avgScore * 100) / 100,
    p25: Math.round(percentile(25) * 100) / 100,
    p50: Math.round(percentile(50) * 100) / 100,
    p75: Math.round(percentile(75) * 100) / 100,
    p90: Math.round(percentile(90) * 100) / 100,
    minScore: sorted[0],
    maxScore: sorted[n - 1],
    stdDev: Math.round(stdDev * 100) / 100,
    sampleSize: n,
  };
}

/**
 * Calculate maturity level from score
 */
export function getMaturityLevel(score: number): string {
  if (score >= 4.6) return 'Tối ưu';
  if (score >= 3.6) return 'Trưởng thành';
  if (score >= 2.6) return 'Phát triển';
  if (score >= 1.6) return 'Khởi đầu';
  return 'Sơ khai';
}

/**
 * Calculate distribution of values
 */
export function calculateDistribution(
  values: number[],
  bucketFn: (val: number) => string | number
): Record<string, number> {
  const distribution: Record<string, number> = {};

  values.forEach((val) => {
    const bucket = String(bucketFn(val));
    distribution[bucket] = (distribution[bucket] || 0) + 1;
  });

  return distribution;
}

// ============================================================================
// DOMAIN BENCHMARK AGGREGATION
// ============================================================================

/**
 * Aggregate domain-level benchmarks for a specific segment
 */
export async function aggregateDomainBenchmarks(
  industry: string,
  size: string,
  region?: string
): Promise<DomainBenchmark[]> {
  // Fetch all finalized assessments matching the segment
  const assessments = await prisma.assessment.findMany({
    where: {
      status: 'FINALIZED',
      industry,
      size,
      ...(region && { region }),
    },
    include: {
      template: {
        include: {
          domains: {
            include: {
              items: true,
            },
          },
        },
      },
      responses: true,
    },
  });

  if (assessments.length === 0) {
    return [];
  }

  // Group responses by domain
  const domainScoresMap = new Map<string, number[]>();
  const domainCodesSet = new Set<string>();

  assessments.forEach((assessment: any) => {
    // Build response map
    const responsesMap: Record<string, number> = {};
    assessment.responses.forEach((response: any) => {
      responsesMap[response.itemId] = response.score;
    });

    // Calculate domain scores for this assessment
    assessment.template.domains.forEach((domain: any) => {
      domainCodesSet.add(domain.code);

      const domainItems = domain.items.map((item: any) => ({
        score: responsesMap[item.id] || 0,
        weight: item.weight,
      }));

      const domainScore = calculateDomainScore(domainItems);

      if (!domainScoresMap.has(domain.code)) {
        domainScoresMap.set(domain.code, []);
      }
      domainScoresMap.get(domain.code)!.push(domainScore);
    });
  });

  // Calculate statistics for each domain
  const domainBenchmarks: DomainBenchmark[] = [];

  domainScoresMap.forEach((scores, domainCode) => {
    const stats = calculateStatistics(scores);

    // Calculate maturity level distribution
    const maturityDistribution = calculateDistribution(scores, getMaturityLevel);

    domainBenchmarks.push({
      domainCode,
      ...stats,
      maturityDistribution,
    });
  });

  return domainBenchmarks;
}

// ============================================================================
// ITEM BENCHMARK AGGREGATION
// ============================================================================

/**
 * Aggregate item-level benchmarks for a specific segment
 */
export async function aggregateItemBenchmarks(
  industry: string,
  size: string,
  region?: string
): Promise<ItemBenchmark[]> {
  // Fetch all finalized assessments matching the segment
  const assessments = await prisma.assessment.findMany({
    where: {
      status: 'FINALIZED',
      industry,
      size,
      ...(region && { region }),
    },
    include: {
      template: {
        include: {
          domains: {
            include: {
              items: true,
            },
          },
        },
      },
      responses: true,
    },
  });

  if (assessments.length === 0) {
    return [];
  }

  // Group responses by item code
  const itemScoresMap = new Map<string, number[]>();

  assessments.forEach((assessment: any) => {
    // Build item code to item ID map
    const itemCodeMap: Record<string, string> = {};
    assessment.template.domains.forEach((domain: any) => {
      domain.items.forEach((item: any) => {
        itemCodeMap[item.id] = item.itemCode;
      });
    });

    // Group scores by item code
    assessment.responses.forEach((response: any) => {
      const itemCode = itemCodeMap[response.itemId];
      if (itemCode) {
        if (!itemScoresMap.has(itemCode)) {
          itemScoresMap.set(itemCode, []);
        }
        itemScoresMap.get(itemCode)!.push(response.score);
      }
    });
  });

  // Calculate statistics for each item
  const itemBenchmarks: ItemBenchmark[] = [];

  itemScoresMap.forEach((scores, itemCode) => {
    const stats = calculateStatistics(scores);

    // Calculate score distribution (1-5)
    const scoreDistribution = calculateDistribution(scores, (score) => Math.round(score));

    itemBenchmarks.push({
      itemCode,
      ...stats,
      scoreDistribution,
    });
  });

  return itemBenchmarks;
}

// ============================================================================
// DATABASE PERSISTENCE
// ============================================================================

/**
 * Update domain benchmarks in database
 */
export async function updateDomainBenchmarks(
  industry: string,
  size: string,
  domainBenchmarks: DomainBenchmark[],
  region?: string
): Promise<void> {
  for (const benchmark of domainBenchmarks) {
    await prisma.benchmarkData.upsert({
      where: {
        industry_size_domainCode: {
          industry,
          size,
          domainCode: benchmark.domainCode,
        },
      },
      create: {
        industry,
        size,
        region: region || null,
        domainCode: benchmark.domainCode,
        avgScore: benchmark.avgScore,
        p25: benchmark.p25,
        p50: benchmark.p50,
        p75: benchmark.p75,
        p90: benchmark.p90,
        minScore: benchmark.minScore,
        maxScore: benchmark.maxScore,
        stdDev: benchmark.stdDev,
        maturityDistribution: benchmark.maturityDistribution || null,
        sampleSize: benchmark.sampleSize,
      },
      update: {
        avgScore: benchmark.avgScore,
        p25: benchmark.p25,
        p50: benchmark.p50,
        p75: benchmark.p75,
        p90: benchmark.p90,
        minScore: benchmark.minScore,
        maxScore: benchmark.maxScore,
        stdDev: benchmark.stdDev,
        maturityDistribution: benchmark.maturityDistribution || null,
        sampleSize: benchmark.sampleSize,
        updatedAt: new Date(),
      },
    });
  }
}

/**
 * Update item benchmarks in database
 */
export async function updateItemBenchmarks(
  industry: string,
  size: string,
  itemBenchmarks: ItemBenchmark[],
  region?: string
): Promise<void> {
  for (const benchmark of itemBenchmarks) {
    await prisma.benchmarkItemData.upsert({
      where: {
        industry_size_itemCode: {
          industry,
          size,
          itemCode: benchmark.itemCode,
        },
      },
      create: {
        industry,
        size,
        region: region || null,
        itemCode: benchmark.itemCode,
        avgScore: benchmark.avgScore,
        p25: benchmark.p25,
        p50: benchmark.p50,
        p75: benchmark.p75,
        p90: benchmark.p90,
        minScore: benchmark.minScore,
        maxScore: benchmark.maxScore,
        stdDev: benchmark.stdDev,
        scoreDistribution: benchmark.scoreDistribution || null,
        sampleSize: benchmark.sampleSize,
      },
      update: {
        avgScore: benchmark.avgScore,
        p25: benchmark.p25,
        p50: benchmark.p50,
        p75: benchmark.p75,
        p90: benchmark.p90,
        minScore: benchmark.minScore,
        maxScore: benchmark.maxScore,
        stdDev: benchmark.stdDev,
        scoreDistribution: benchmark.scoreDistribution || null,
        sampleSize: benchmark.sampleSize,
        updatedAt: new Date(),
      },
    });
  }
}

/**
 * Create benchmark snapshot for historical tracking
 */
export async function createBenchmarkSnapshot(
  industry: string,
  size: string,
  domainBenchmarks: DomainBenchmark[],
  itemBenchmarks: ItemBenchmark[],
  region?: string,
  snapshotDate?: Date
): Promise<void> {
  const date = snapshotDate || new Date();

  // Convert benchmarks to JSON format
  const domainScores: Record<string, any> = {};
  domainBenchmarks.forEach((b) => {
    domainScores[b.domainCode] = {
      avg: b.avgScore,
      p25: b.p25,
      p50: b.p50,
      p75: b.p75,
      p90: b.p90,
      min: b.minScore,
      max: b.maxScore,
      stdDev: b.stdDev,
      sampleSize: b.sampleSize,
    };
  });

  const itemScores: Record<string, any> = {};
  itemBenchmarks.forEach((b) => {
    itemScores[b.itemCode] = {
      avg: b.avgScore,
      p25: b.p25,
      p50: b.p50,
      p75: b.p75,
      p90: b.p90,
      min: b.minScore,
      max: b.maxScore,
      stdDev: b.stdDev,
      sampleSize: b.sampleSize,
    };
  });

  // Calculate overall score
  const overallScore =
    domainBenchmarks.reduce((sum, b) => sum + b.avgScore, 0) / domainBenchmarks.length;

  // Get total sample size (use max from domains)
  const sampleSize = Math.max(...domainBenchmarks.map((b) => b.sampleSize), 0);

  // Get template version (from latest assessment)
  const latestAssessment = await prisma.assessment.findFirst({
    where: {
      status: 'FINALIZED',
      industry,
      size,
      ...(region && { region }),
    },
    include: {
      template: true,
    },
    orderBy: {
      finalizedAt: 'desc',
    },
  });

  const templateVersion = latestAssessment?.template.version || 'v1.0';

  // Create or update snapshot
  await prisma.benchmarkSnapshot.upsert({
    where: {
      industry_size_snapshotDate: {
        industry,
        size,
        snapshotDate: date,
      },
    },
    create: {
      industry,
      size,
      region: region || null,
      snapshotDate: date,
      domainScores,
      itemScores,
      overallScore,
      sampleSize,
      templateVersion,
    },
    update: {
      domainScores,
      itemScores,
      overallScore,
      sampleSize,
      templateVersion,
    },
  });
}

// ============================================================================
// FULL AGGREGATION PIPELINE
// ============================================================================

/**
 * Run full benchmark aggregation for a segment
 */
export async function aggregateBenchmarksForSegment(
  industry: string,
  size: string,
  region?: string,
  createSnapshot: boolean = false
): Promise<{
  domainBenchmarks: DomainBenchmark[];
  itemBenchmarks: ItemBenchmark[];
}> {
  // Aggregate domain benchmarks
  const domainBenchmarks = await aggregateDomainBenchmarks(industry, size, region);

  // Aggregate item benchmarks
  const itemBenchmarks = await aggregateItemBenchmarks(industry, size, region);

  if (domainBenchmarks.length === 0) {
    return { domainBenchmarks: [], itemBenchmarks: [] };
  }

  // Update database
  await updateDomainBenchmarks(industry, size, domainBenchmarks, region);
  await updateItemBenchmarks(industry, size, itemBenchmarks, region);

  // Create snapshot if requested
  if (createSnapshot) {
    await createBenchmarkSnapshot(industry, size, domainBenchmarks, itemBenchmarks, region);
  }

  return { domainBenchmarks, itemBenchmarks };
}

/**
 * Run full benchmark aggregation for all segments
 */
export async function aggregateAllBenchmarks(createSnapshots: boolean = false): Promise<void> {
  // Get all unique segment combinations from finalized assessments
  const segments = await prisma.assessment.groupBy({
    by: ['industry', 'size', 'region'],
    where: {
      status: 'FINALIZED',
      industry: { not: null },
      size: { not: null },
    },
  });

  console.log(`🔄 Aggregating benchmarks for ${segments.length} segments...`);

  for (const segment of segments) {
    if (!segment.industry || !segment.size) continue;

    console.log(
      `  Processing: ${segment.industry} / ${segment.size} / ${segment.region || 'all regions'}`
    );

    await aggregateBenchmarksForSegment(
      segment.industry,
      segment.size,
      segment.region || undefined,
      createSnapshots
    );
  }

  console.log('✅ Benchmark aggregation complete');
}
