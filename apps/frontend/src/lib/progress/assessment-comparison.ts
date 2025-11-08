/**
 * Assessment Comparison Engine
 * Compare two assessments to identify changes and improvements
 *
 * Phase 5B: Progress Tracking
 */

import { prisma } from '@/lib/db/prisma';
import { calculateDomainScore } from '@/lib/scoring/scoring-engine';

// ============================================================================
// TYPES
// ============================================================================

export interface AssessmentComparisonResult {
  // Assessment IDs
  fromAssessmentId: string;
  toAssessmentId: string;

  // Metadata
  fromDate: Date;
  toDate: Date;
  daysBetween: number;

  // Overall comparison
  overallComparison: {
    fromScore: number;
    toScore: number;
    change: number;
    changePercent: number;
    fromLevel: string;
    toLevel: string;
    levelChange: number;
  };

  // Domain comparisons
  domainComparisons: Array<{
    domainCode: string;
    domainName: string;
    fromScore: number;
    toScore: number;
    change: number;
    changePercent: number;
    status: 'improved' | 'declined' | 'stable';
  }>;

  // Item comparisons (only items that changed)
  itemChanges: Array<{
    itemCode: string;
    itemName: string;
    domainCode: string;
    fromScore: number;
    toScore: number;
    change: number;
    status: 'improved' | 'declined' | 'stable';
  }>;

  // Top improvements and regressions
  topImprovements: Array<{
    itemCode: string;
    itemName: string;
    change: number;
  }>;

  topRegressions: Array<{
    itemCode: string;
    itemName: string;
    change: number;
  }>;

  // Summary statistics
  summary: {
    totalItemsImproved: number;
    totalItemsDeclined: number;
    totalItemsStable: number;
    averageImprovement: number;
    largestImprovement: number;
    largestRegression: number;
  };
}

// ============================================================================
// COMPARISON LOGIC
// ============================================================================

/**
 * Compare two assessments
 */
export async function compareAssessments(
  fromAssessmentId: string,
  toAssessmentId: string
): Promise<AssessmentComparisonResult | null> {
  // Fetch both assessments
  const [fromAssessment, toAssessment] = await Promise.all([
    prisma.assessment.findUnique({
      where: { id: fromAssessmentId },
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
        history: true,
      },
    }),
    prisma.assessment.findUnique({
      where: { id: toAssessmentId },
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
        history: true,
      },
    }),
  ]);

  if (!fromAssessment || !toAssessment) {
    return null;
  }

  if (fromAssessment.status !== 'FINALIZED' || toAssessment.status !== 'FINALIZED') {
    return null;
  }

  // Verify both use the same template (or compatible versions)
  if (fromAssessment.templateId !== toAssessment.templateId) {
    // Could support cross-template comparison in the future
    return null;
  }

  // Build response maps
  const fromResponsesMap: Record<string, number> = {};
  const toResponsesMap: Record<string, number> = {};

  fromAssessment.responses.forEach((r: any) => {
    fromResponsesMap[r.itemId] = r.score;
  });

  toAssessment.responses.forEach((r: any) => {
    toResponsesMap[r.itemId] = r.score;
  });

  // Build item code maps
  const itemCodeToId: Record<string, string> = {};
  const itemIdToCode: Record<string, string> = {};
  const itemIdToName: Record<string, string> = {};
  const itemIdToDomain: Record<string, string> = {};

  fromAssessment.template.domains.forEach((domain: any) => {
    domain.items.forEach((item: any) => {
      itemCodeToId[item.itemCode] = item.id;
      itemIdToCode[item.id] = item.itemCode;
      itemIdToName[item.id] = item.itemName;
      itemIdToDomain[item.id] = domain.code;
    });
  });

  // ========================================================================
  // OVERALL COMPARISON
  // ========================================================================

  const fromOverallScore = fromAssessment.history?.overallScore || 0;
  const toOverallScore = toAssessment.history?.overallScore || 0;
  const fromLevel = fromAssessment.history?.maturityLevel || 'N/A';
  const toLevel = toAssessment.history?.maturityLevel || 'N/A';

  const overallChange = toOverallScore - fromOverallScore;
  const overallChangePercent = fromOverallScore > 0
    ? (overallChange / fromOverallScore) * 100
    : 0;

  const levelChange = fromAssessment.history && toAssessment.history
    ? (toAssessment.history.levelChange || 0)
    : 0;

  // ========================================================================
  // DOMAIN COMPARISONS
  // ========================================================================

  const domainNames: Record<string, string> = {
    data: 'Dữ liệu',
    infra: 'Hạ tầng',
    tech: 'Công nghệ',
    org: 'Tổ chức',
    policy: 'Chính sách',
  };

  const domainComparisons = fromAssessment.template.domains.map((domain: any) => {
    // Calculate domain scores
    const fromDomainItems = domain.items.map((item: any) => ({
      score: fromResponsesMap[item.id] || 0,
      weight: item.weight,
    }));
    const toDomainItems = domain.items.map((item: any) => ({
      score: toResponsesMap[item.id] || 0,
      weight: item.weight,
    }));

    const fromScore = calculateDomainScore(fromDomainItems);
    const toScore = calculateDomainScore(toDomainItems);
    const change = toScore - fromScore;
    const changePercent = fromScore > 0 ? (change / fromScore) * 100 : 0;

    let status: 'improved' | 'declined' | 'stable';
    if (change > 0.1) status = 'improved';
    else if (change < -0.1) status = 'declined';
    else status = 'stable';

    return {
      domainCode: domain.code,
      domainName: domainNames[domain.code] || domain.name,
      fromScore: Math.round(fromScore * 100) / 100,
      toScore: Math.round(toScore * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 10) / 10,
      status,
    };
  });

  // ========================================================================
  // ITEM COMPARISONS
  // ========================================================================

  const itemChanges: Array<{
    itemCode: string;
    itemName: string;
    domainCode: string;
    fromScore: number;
    toScore: number;
    change: number;
    status: 'improved' | 'declined' | 'stable';
  }> = [];

  Object.keys(fromResponsesMap).forEach((itemId) => {
    const fromScore = fromResponsesMap[itemId];
    const toScore = toResponsesMap[itemId] || 0;
    const change = toScore - fromScore;

    if (change !== 0) {
      let status: 'improved' | 'declined' | 'stable';
      if (change > 0) status = 'improved';
      else if (change < 0) status = 'declined';
      else status = 'stable';

      itemChanges.push({
        itemCode: itemIdToCode[itemId] || itemId,
        itemName: itemIdToName[itemId] || itemId,
        domainCode: itemIdToDomain[itemId] || 'unknown',
        fromScore,
        toScore,
        change,
        status,
      });
    }
  });

  // Sort by absolute change
  itemChanges.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  // ========================================================================
  // TOP IMPROVEMENTS & REGRESSIONS
  // ========================================================================

  const improvements = itemChanges.filter(i => i.change > 0);
  const regressions = itemChanges.filter(i => i.change < 0);

  const topImprovements = improvements.slice(0, 10).map(i => ({
    itemCode: i.itemCode,
    itemName: i.itemName,
    change: i.change,
  }));

  const topRegressions = regressions
    .sort((a, b) => a.change - b.change)
    .slice(0, 10)
    .map(i => ({
      itemCode: i.itemCode,
      itemName: i.itemName,
      change: i.change,
    }));

  // ========================================================================
  // SUMMARY STATISTICS
  // ========================================================================

  const totalItemsImproved = improvements.length;
  const totalItemsDeclined = regressions.length;
  const totalItemsStable = itemChanges.filter(i => i.change === 0).length;

  const averageImprovement = itemChanges.length > 0
    ? itemChanges.reduce((sum, i) => sum + i.change, 0) / itemChanges.length
    : 0;

  const largestImprovement = improvements.length > 0
    ? Math.max(...improvements.map(i => i.change))
    : 0;

  const largestRegression = regressions.length > 0
    ? Math.min(...regressions.map(i => i.change))
    : 0;

  // ========================================================================
  // CALCULATE TIME BETWEEN
  // ========================================================================

  const fromDate = fromAssessment.finalizedAt || fromAssessment.createdAt;
  const toDate = toAssessment.finalizedAt || toAssessment.createdAt;
  const daysBetween = Math.round(
    (new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  // ========================================================================
  // BUILD RESULT
  // ========================================================================

  return {
    fromAssessmentId,
    toAssessmentId,
    fromDate: new Date(fromDate),
    toDate: new Date(toDate),
    daysBetween,
    overallComparison: {
      fromScore: Math.round(fromOverallScore * 100) / 100,
      toScore: Math.round(toOverallScore * 100) / 100,
      change: Math.round(overallChange * 100) / 100,
      changePercent: Math.round(overallChangePercent * 10) / 10,
      fromLevel,
      toLevel,
      levelChange,
    },
    domainComparisons,
    itemChanges,
    topImprovements,
    topRegressions,
    summary: {
      totalItemsImproved,
      totalItemsDeclined,
      totalItemsStable,
      averageImprovement: Math.round(averageImprovement * 100) / 100,
      largestImprovement,
      largestRegression,
    },
  };
}

/**
 * Get suggested comparison pairs for an organization
 * Returns pairs of assessments that would be interesting to compare
 */
export async function getSuggestedComparisons(organizationId: string): Promise<Array<{
  fromAssessmentId: string;
  toAssessmentId: string;
  description: string;
  fromDate: Date;
  toDate: Date;
}>> {
  const histories = await prisma.assessmentHistory.findMany({
    where: { organizationId },
    include: {
      assessment: {
        select: {
          id: true,
          finalizedAt: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  if (histories.length < 2) {
    return [];
  }

  const suggestions: Array<{
    fromAssessmentId: string;
    toAssessmentId: string;
    description: string;
    fromDate: Date;
    toDate: Date;
  }> = [];

  // 1. First vs. Latest (overall progress)
  if (histories.length >= 2) {
    const first = histories[0];
    const latest = histories[histories.length - 1];
    suggestions.push({
      fromAssessmentId: first.assessmentId,
      toAssessmentId: latest.assessmentId,
      description: 'Overall Progress (First vs. Latest)',
      fromDate: first.assessment.finalizedAt || first.createdAt,
      toDate: latest.assessment.finalizedAt || latest.createdAt,
    });
  }

  // 2. Previous vs. Latest (recent progress)
  if (histories.length >= 2) {
    const previous = histories[histories.length - 2];
    const latest = histories[histories.length - 1];
    suggestions.push({
      fromAssessmentId: previous.assessmentId,
      toAssessmentId: latest.assessmentId,
      description: 'Recent Progress (Previous vs. Latest)',
      fromDate: previous.assessment.finalizedAt || previous.createdAt,
      toDate: latest.assessment.finalizedAt || latest.createdAt,
    });
  }

  // 3. Largest improvement (find consecutive assessments with biggest jump)
  if (histories.length >= 2) {
    let maxImprovement = -Infinity;
    let maxPair: any = null;

    for (let i = 0; i < histories.length - 1; i++) {
      const improvement = histories[i + 1].overallScore - histories[i].overallScore;
      if (improvement > maxImprovement) {
        maxImprovement = improvement;
        maxPair = {
          from: histories[i],
          to: histories[i + 1],
        };
      }
    }

    if (maxPair && maxImprovement > 0) {
      suggestions.push({
        fromAssessmentId: maxPair.from.assessmentId,
        toAssessmentId: maxPair.to.assessmentId,
        description: `Biggest Improvement (+${Math.round(maxImprovement * 100) / 100})`,
        fromDate: maxPair.from.assessment.finalizedAt || maxPair.from.createdAt,
        toDate: maxPair.to.assessment.finalizedAt || maxPair.to.createdAt,
      });
    }
  }

  // 4. Yearly comparisons (if assessments span multiple years)
  const yearGroups = new Map<number, any>();
  histories.forEach((h: any) => {
    const year = new Date(h.assessment.finalizedAt || h.createdAt).getFullYear();
    if (!yearGroups.has(year)) {
      yearGroups.set(year, h);
    }
  });

  if (yearGroups.size >= 2) {
    const years = Array.from(yearGroups.keys()).sort();
    for (let i = 0; i < years.length - 1; i++) {
      const fromYear = yearGroups.get(years[i]);
      const toYear = yearGroups.get(years[i + 1]);
      suggestions.push({
        fromAssessmentId: fromYear.assessmentId,
        toAssessmentId: toYear.assessmentId,
        description: `Year-over-Year (${years[i]} vs. ${years[i + 1]})`,
        fromDate: fromYear.assessment.finalizedAt || fromYear.createdAt,
        toDate: toYear.assessment.finalizedAt || toYear.createdAt,
      });
    }
  }

  return suggestions;
}
