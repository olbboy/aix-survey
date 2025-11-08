/**
 * Benchmark Comparison Service
 * Compares individual assessments against industry benchmarks
 *
 * Phase 5A: Benchmark Comparison
 */

import { prisma } from '@/lib/db/prisma';
import { calculateDomainScore } from '@/lib/scoring/scoring-engine';
import { getMaturityLevel } from './benchmark-aggregation';

// ============================================================================
// TYPES
// ============================================================================

export interface PercentileRanking {
  percentile: number; // 0-100, where higher is better
  ranking: 'Top 10%' | 'Top 25%' | 'Top 50%' | 'Below Average' | 'Bottom 25%';
  comparedTo: {
    industry: string;
    size: string;
    region?: string;
  };
}

export interface DomainComparison {
  domainCode: string;
  domainName: string;
  userScore: number;
  industryAverage: number;
  industryMedian: number;
  industryP25: number;
  industryP75: number;
  industryP90: number;
  percentileRank: number;
  gap: number; // userScore - industryAverage (positive = above average)
  ranking: string;
  maturityLevel: string;
  industryMaturityDistribution?: Record<string, number>;
}

export interface ItemComparison {
  itemCode: string;
  itemName: string;
  userScore: number;
  industryAverage: number;
  industryMedian: number;
  percentileRank: number;
  gap: number;
  scoreDistribution?: Record<string, number>;
}

export interface BenchmarkComparisonResult {
  assessmentId: string;
  organizationName: string;
  industry: string;
  size: string;
  region?: string;

  // Overall comparison
  overallScore: number;
  industryOverallAverage: number;
  overallPercentileRank: number;
  overallRanking: string;

  // Domain comparisons
  domainComparisons: DomainComparison[];

  // Item comparisons (top gaps)
  topStrengths: ItemComparison[]; // Top 5 items above industry average
  topWeaknesses: ItemComparison[]; // Top 5 items below industry average

  // Peer insights
  peerInsights: {
    totalPeers: number; // Number of assessments in same segment
    betterThanPercent: number; // % of peers this assessment is better than
    maturityLevel: string;
    industryMaturityBreakdown: Record<string, number>;
  };

  // Historical trends (if snapshots available)
  trends?: {
    domainCode: string;
    historicalAverages: Array<{ date: string; average: number }>;
  }[];
}

// ============================================================================
// PERCENTILE CALCULATIONS
// ============================================================================

/**
 * Calculate percentile rank for a score given benchmark statistics
 */
export function calculatePercentileRank(
  score: number,
  p25: number,
  p50: number,
  p75: number,
  p90: number,
  min: number,
  max: number
): number {
  // Handle edge cases
  if (score <= min) return 0;
  if (score >= max) return 100;

  // Linear interpolation between known percentiles
  if (score <= p25) {
    return (score - min) / (p25 - min) * 25;
  } else if (score <= p50) {
    return 25 + (score - p25) / (p50 - p25) * 25;
  } else if (score <= p75) {
    return 50 + (score - p50) / (p75 - p50) * 25;
  } else if (score <= p90) {
    return 75 + (score - p75) / (p90 - p75) * 15;
  } else {
    return 90 + (score - p90) / (max - p90) * 10;
  }
}

/**
 * Get ranking label from percentile
 */
export function getRankingLabel(percentile: number): string {
  if (percentile >= 90) return 'Top 10%';
  if (percentile >= 75) return 'Top 25%';
  if (percentile >= 50) return 'Top 50%';
  if (percentile >= 25) return 'Below Average';
  return 'Bottom 25%';
}

// ============================================================================
// COMPARISON LOGIC
// ============================================================================

/**
 * Compare assessment against industry benchmarks
 */
export async function compareAssessmentToBenchmarks(
  assessmentId: string
): Promise<BenchmarkComparisonResult | null> {
  // Fetch assessment with all related data
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
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

  if (!assessment || assessment.status !== 'FINALIZED') {
    return null;
  }

  if (!assessment.industry || !assessment.size) {
    return null;
  }

  const { industry, size, region } = assessment;

  // Build response maps
  const responsesMap: Record<string, { score: number; itemCode: string }> = {};
  const itemCodeToName: Record<string, string> = {};

  assessment.template.domains.forEach((domain: any) => {
    domain.items.forEach((item: any) => {
      itemCodeToName[item.itemCode] = item.itemName;
    });
  });

  assessment.responses.forEach((response: any) => {
    const item = assessment.template.domains
      .flatMap((d: any) => d.items)
      .find((i: any) => i.id === response.itemId);
    if (item) {
      responsesMap[response.itemId] = {
        score: response.score,
        itemCode: item.itemCode,
      };
    }
  });

  // ========================================================================
  // DOMAIN COMPARISONS
  // ========================================================================

  const domainComparisons: DomainComparison[] = [];
  const domainScores: number[] = [];

  for (const domain of assessment.template.domains) {
    // Calculate user's domain score
    const domainItems = (domain as any).items.map((item: any) => ({
      score: responsesMap[item.id]?.score || 0,
      weight: item.weight,
    }));

    const userDomainScore = calculateDomainScore(domainItems);
    domainScores.push(userDomainScore);

    // Fetch industry benchmark for this domain
    const benchmark = await prisma.benchmarkData.findUnique({
      where: {
        industry_size_domainCode: {
          industry,
          size,
          domainCode: (domain as any).code,
        },
      },
    });

    if (benchmark) {
      const percentileRank = calculatePercentileRank(
        userDomainScore,
        benchmark.p25,
        benchmark.p50,
        benchmark.p75,
        benchmark.p90,
        benchmark.minScore,
        benchmark.maxScore
      );

      domainComparisons.push({
        domainCode: (domain as any).code,
        domainName: (domain as any).name,
        userScore: Math.round(userDomainScore * 100) / 100,
        industryAverage: benchmark.avgScore,
        industryMedian: benchmark.p50,
        industryP25: benchmark.p25,
        industryP75: benchmark.p75,
        industryP90: benchmark.p90,
        percentileRank: Math.round(percentileRank),
        gap: Math.round((userDomainScore - benchmark.avgScore) * 100) / 100,
        ranking: getRankingLabel(percentileRank),
        maturityLevel: getMaturityLevel(userDomainScore),
        industryMaturityDistribution: benchmark.maturityDistribution as Record<string, number> | undefined,
      });
    }
  }

  // ========================================================================
  // ITEM COMPARISONS (TOP STRENGTHS & WEAKNESSES)
  // ========================================================================

  const itemComparisons: ItemComparison[] = [];

  for (const [itemId, response] of Object.entries(responsesMap)) {
    const { score, itemCode } = response;

    // Fetch industry benchmark for this item
    const benchmark = await prisma.benchmarkItemData.findUnique({
      where: {
        industry_size_itemCode: {
          industry,
          size,
          itemCode,
        },
      },
    });

    if (benchmark) {
      const percentileRank = calculatePercentileRank(
        score,
        benchmark.p25,
        benchmark.p50,
        benchmark.p75,
        benchmark.p90,
        benchmark.minScore,
        benchmark.maxScore
      );

      itemComparisons.push({
        itemCode,
        itemName: itemCodeToName[itemCode] || itemCode,
        userScore: score,
        industryAverage: benchmark.avgScore,
        industryMedian: benchmark.p50,
        percentileRank: Math.round(percentileRank),
        gap: Math.round((score - benchmark.avgScore) * 100) / 100,
        scoreDistribution: benchmark.scoreDistribution as Record<string, number> | undefined,
      });
    }
  }

  // Sort and get top 5 strengths and weaknesses
  const sortedByGap = [...itemComparisons].sort((a, b) => b.gap - a.gap);
  const topStrengths = sortedByGap.filter((i) => i.gap > 0).slice(0, 5);
  const topWeaknesses = sortedByGap.filter((i) => i.gap < 0).slice(-5).reverse();

  // ========================================================================
  // OVERALL COMPARISON
  // ========================================================================

  const overallScore = domainScores.reduce((sum, s) => sum + s, 0) / domainScores.length;
  const industryOverallAverage =
    domainComparisons.reduce((sum, d) => sum + d.industryAverage, 0) / domainComparisons.length;

  // Calculate overall percentile rank (average of domain percentiles)
  const overallPercentileRank =
    domainComparisons.reduce((sum, d) => sum + d.percentileRank, 0) / domainComparisons.length;

  // ========================================================================
  // PEER INSIGHTS
  // ========================================================================

  // Count total peers in same segment
  const totalPeers = await prisma.assessment.count({
    where: {
      status: 'FINALIZED',
      industry,
      size,
      ...(region && { region }),
      id: { not: assessmentId }, // Exclude current assessment
    },
  });

  // Calculate maturity breakdown
  const maturityBreakdown: Record<string, number> = {};
  domainComparisons.forEach((dc) => {
    if (dc.industryMaturityDistribution) {
      Object.entries(dc.industryMaturityDistribution).forEach(([level, count]) => {
        maturityBreakdown[level] = (maturityBreakdown[level] || 0) + count;
      });
    }
  });

  // ========================================================================
  // HISTORICAL TRENDS
  // ========================================================================

  const trends: Array<{
    domainCode: string;
    historicalAverages: Array<{ date: string; average: number }>;
  }> = [];

  // Fetch historical snapshots (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const snapshots = await prisma.benchmarkSnapshot.findMany({
    where: {
      industry,
      size,
      ...(region && { region }),
      snapshotDate: {
        gte: twelveMonthsAgo,
      },
    },
    orderBy: {
      snapshotDate: 'asc',
    },
  });

  if (snapshots.length > 0) {
    // Extract trends for each domain
    domainComparisons.forEach((dc) => {
      const historicalAverages = snapshots
        .map((snapshot: any) => {
          const domainScores = snapshot.domainScores as Record<string, any>;
          const domainData = domainScores[dc.domainCode];
          if (domainData) {
            return {
              date: snapshot.snapshotDate.toISOString().split('T')[0],
              average: domainData.avg,
            };
          }
          return null;
        })
        .filter((item: any): item is { date: string; average: number } => item !== null);

      if (historicalAverages.length > 0) {
        trends.push({
          domainCode: dc.domainCode,
          historicalAverages,
        });
      }
    });
  }

  // ========================================================================
  // BUILD RESULT
  // ========================================================================

  return {
    assessmentId: assessment.id,
    organizationName: assessment.organizationName || 'Organization',
    industry,
    size,
    region: region || undefined,
    overallScore: Math.round(overallScore * 100) / 100,
    industryOverallAverage: Math.round(industryOverallAverage * 100) / 100,
    overallPercentileRank: Math.round(overallPercentileRank),
    overallRanking: getRankingLabel(overallPercentileRank),
    domainComparisons,
    topStrengths,
    topWeaknesses,
    peerInsights: {
      totalPeers: totalPeers + 1, // Include current assessment
      betterThanPercent: Math.round(overallPercentileRank),
      maturityLevel: getMaturityLevel(overallScore),
      industryMaturityBreakdown: maturityBreakdown,
    },
    trends: trends.length > 0 ? trends : undefined,
  };
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Get benchmark data for display (without full comparison)
 */
export async function getBenchmarkData(
  industry: string,
  size: string,
  region?: string
): Promise<{
  domainBenchmarks: any[];
  itemBenchmarks: any[];
} | null> {
  const domainBenchmarks = await prisma.benchmarkData.findMany({
    where: {
      industry,
      size,
      ...(region && { region }),
    },
    orderBy: {
      domainCode: 'asc',
    },
  });

  const itemBenchmarks = await prisma.benchmarkItemData.findMany({
    where: {
      industry,
      size,
      ...(region && { region }),
    },
    orderBy: {
      itemCode: 'asc',
    },
  });

  if (domainBenchmarks.length === 0) {
    return null;
  }

  return {
    domainBenchmarks,
    itemBenchmarks,
  };
}

/**
 * Get historical trends for a segment
 */
export async function getHistoricalTrends(
  industry: string,
  size: string,
  region?: string,
  months: number = 12
): Promise<any[]> {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  return await prisma.benchmarkSnapshot.findMany({
    where: {
      industry,
      size,
      ...(region && { region }),
      snapshotDate: {
        gte: startDate,
      },
    },
    orderBy: {
      snapshotDate: 'asc',
    },
  });
}
