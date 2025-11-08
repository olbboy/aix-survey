/**
 * Progress Tracking Service
 * Tracks assessment history and calculates improvements over time
 *
 * Phase 5B: Progress Tracking
 */

import { prisma } from '@/lib/db/prisma';
import { calculateAssessmentScore, calculateDomainScore } from '@/lib/scoring/scoring-engine';

// ============================================================================
// TYPES
// ============================================================================

export interface AssessmentProgressData {
  assessmentId: string;
  assessmentNumber: number;
  finalizedAt: Date;
  overallScore: number;
  maturityLevel: string;
  domainScores: Record<string, number>;

  // Change metrics
  scoreChange?: number;
  levelChange?: number;
  improvementRate?: number;
  daysSincePrevious?: number;

  // Comparison to previous
  previousAssessmentId?: string;
}

export interface OrganizationProgress {
  organizationId: string;
  organizationName: string;
  totalAssessments: number;
  firstAssessmentDate: Date;
  lastAssessmentDate: Date;

  // Overall trajectory
  overallImprovement: number; // Total score improvement from first to last
  averageImprovementRate: number; // Average % improvement per assessment
  assessmentFrequency: number; // Average days between assessments

  // Current state
  currentScore: number;
  currentLevel: string;
  currentPercentile?: number; // From Phase 5A if available

  // History
  assessments: AssessmentProgressData[];

  // Predictions
  predictedNextScore?: number;
  predictedTimeToNextLevel?: number; // Days to next maturity level
}

export interface DomainProgress {
  domainCode: string;
  domainName: string;
  history: Array<{
    assessmentId: string;
    date: Date;
    score: number;
  }>;
  improvement: number;
  trend: 'improving' | 'stable' | 'declining';
}

// ============================================================================
// MATURITY LEVEL MAPPING
// ============================================================================

const MATURITY_LEVELS = [
  { level: 'Sơ khai', minScore: 0, maxScore: 1.6, numericValue: 1 },
  { level: 'Khởi đầu', minScore: 1.6, maxScore: 2.6, numericValue: 2 },
  { level: 'Phát triển', minScore: 2.6, maxScore: 3.6, numericValue: 3 },
  { level: 'Trưởng thành', minScore: 3.6, maxScore: 4.6, numericValue: 4 },
  { level: 'Tối ưu', minScore: 4.6, maxScore: 5.0, numericValue: 5 },
];

export function getMaturityLevel(score: number): string {
  const level = MATURITY_LEVELS.find(l => score >= l.minScore && score < l.maxScore);
  return level ? level.level : score >= 4.6 ? 'Tối ưu' : 'Sơ khai';
}

export function getMaturityLevelNumeric(level: string): number {
  const match = MATURITY_LEVELS.find(l => l.level === level);
  return match ? match.numericValue : 0;
}

function calculateLevelChange(previousLevel: string, currentLevel: string): number {
  const prevNumeric = getMaturityLevelNumeric(previousLevel);
  const currNumeric = getMaturityLevelNumeric(currentLevel);
  return currNumeric - prevNumeric;
}

// ============================================================================
// ASSESSMENT HISTORY CREATION
// ============================================================================

/**
 * Create assessment history entry when an assessment is finalized
 * This should be called automatically when an assessment is finalized
 */
export async function createAssessmentHistory(assessmentId: string): Promise<void> {
  // Fetch the assessment with all data
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
      snapshot: true,
    },
  });

  if (!assessment || assessment.status !== 'FINALIZED') {
    throw new Error('Assessment must be finalized before creating history');
  }

  if (!assessment.organizationId) {
    // Guest assessments don't have progress tracking
    return;
  }

  // Check if history already exists
  const existingHistory = await prisma.assessmentHistory.findUnique({
    where: { assessmentId },
  });

  if (existingHistory) {
    // Already created
    return;
  }

  // Get organization's previous assessments
  const previousHistories = await prisma.assessmentHistory.findMany({
    where: {
      organizationId: assessment.organizationId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const assessmentNumber = previousHistories.length + 1;
  const previousHistory = previousHistories[0]; // Most recent

  // Calculate domain scores
  const responsesMap: Record<string, number> = {};
  assessment.responses.forEach((response: any) => {
    responsesMap[response.itemId] = response.score;
  });

  const domainScoresObj: Record<string, number> = {};
  assessment.template.domains.forEach((domain: any) => {
    const domainItems = domain.items.map((item: any) => ({
      score: responsesMap[item.id] || 0,
      weight: item.weight,
    }));
    domainScoresObj[domain.code] = calculateDomainScore(domainItems);
  });

  // Calculate overall score
  const domainData = assessment.template.domains.map((domain: any) => {
    const domainItems = domain.items.map((item: any) => ({
      itemCode: item.itemCode,
      itemId: item.id,
      itemName: item.itemName,
      score: responsesMap[item.id] || 0,
      weight: item.weight,
      domainCode: domain.code,
    }));

    return {
      domainCode: domain.code,
      domainId: domain.id,
      domainName: domain.domainName,
      domainWeight: domain.domainWeight,
      totalItems: domain.items.length,
      items: domainItems,
    };
  });

  const scoringResult = calculateAssessmentScore(domainData);
  const overallScore = scoringResult.totalScore;
  const maturityLevel = scoringResult.maturityLevel;

  // Calculate changes from previous
  let scoreChange: number | undefined;
  let levelChange: number | undefined;
  let improvementRate: number | undefined;
  let daysSincePrevious: number | undefined;
  let previousAssessmentId: string | undefined;

  if (previousHistory) {
    scoreChange = overallScore - previousHistory.overallScore;
    levelChange = calculateLevelChange(previousHistory.maturityLevel, maturityLevel);
    improvementRate = (scoreChange / previousHistory.overallScore) * 100;

    // Calculate days since previous
    const previousAssessment = await prisma.assessment.findUnique({
      where: { id: previousHistory.assessmentId },
      select: { finalizedAt: true },
    });

    if (previousAssessment?.finalizedAt && assessment.finalizedAt) {
      const diff = new Date(assessment.finalizedAt).getTime() - new Date(previousAssessment.finalizedAt).getTime();
      daysSincePrevious = Math.round(diff / (1000 * 60 * 60 * 24));
    }

    previousAssessmentId = previousHistory.id;
  }

  // Create history entry
  await prisma.assessmentHistory.create({
    data: {
      organizationId: assessment.organizationId,
      assessmentId,
      overallScore,
      maturityLevel,
      domainScores: domainScoresObj,
      previousAssessmentId,
      scoreChange,
      levelChange,
      improvementRate,
      daysSincePrevious,
      assessmentNumber,
    },
  });
}

// ============================================================================
// PROGRESS RETRIEVAL
// ============================================================================

/**
 * Get complete progress data for an organization
 */
export async function getOrganizationProgress(
  organizationId: string
): Promise<OrganizationProgress | null> {
  // Fetch organization
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    return null;
  }

  // Fetch all assessment histories
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

  if (histories.length === 0) {
    return null;
  }

  // Build assessment progress data
  const assessments: AssessmentProgressData[] = histories.map((history: any) => ({
    assessmentId: history.assessmentId,
    assessmentNumber: history.assessmentNumber,
    finalizedAt: history.assessment.finalizedAt || history.createdAt,
    overallScore: history.overallScore,
    maturityLevel: history.maturityLevel,
    domainScores: history.domainScores as Record<string, number>,
    scoreChange: history.scoreChange || undefined,
    levelChange: history.levelChange || undefined,
    improvementRate: history.improvementRate || undefined,
    daysSincePrevious: history.daysSincePrevious || undefined,
    previousAssessmentId: history.previousAssessmentId || undefined,
  }));

  // Calculate overall metrics
  const firstAssessment = assessments[0];
  const lastAssessment = assessments[assessments.length - 1];

  const overallImprovement = lastAssessment.overallScore - firstAssessment.overallScore;

  // Calculate average improvement rate (excluding first assessment)
  const improvementRates = assessments
    .slice(1)
    .map(a => a.improvementRate)
    .filter((r): r is number => r !== undefined);
  const averageImprovementRate =
    improvementRates.length > 0
      ? improvementRates.reduce((sum, r) => sum + r, 0) / improvementRates.length
      : 0;

  // Calculate assessment frequency
  const daysArray = assessments
    .slice(1)
    .map(a => a.daysSincePrevious)
    .filter((d): d is number => d !== undefined);
  const assessmentFrequency =
    daysArray.length > 0
      ? daysArray.reduce((sum, d) => sum + d, 0) / daysArray.length
      : 0;

  // Predict next score using linear regression
  let predictedNextScore: number | undefined;
  if (assessments.length >= 2) {
    const scores = assessments.map(a => a.overallScore);
    const n = scores.length;
    const xSum = (n * (n + 1)) / 2; // Sum of 1, 2, 3, ..., n
    const ySum = scores.reduce((sum, s) => sum + s, 0);
    const xySum = scores.reduce((sum, s, i) => sum + s * (i + 1), 0);
    const xSquareSum = (n * (n + 1) * (2 * n + 1)) / 6;

    const slope = (n * xySum - xSum * ySum) / (n * xSquareSum - xSum * xSum);
    const intercept = (ySum - slope * xSum) / n;

    predictedNextScore = slope * (n + 1) + intercept;
    predictedNextScore = Math.min(Math.max(predictedNextScore, 0), 5); // Clamp to 0-5
    predictedNextScore = Math.round(predictedNextScore * 100) / 100;
  }

  // Predict time to next level
  let predictedTimeToNextLevel: number | undefined;
  if (predictedNextScore && assessmentFrequency > 0) {
    const currentLevel = getMaturityLevelNumeric(lastAssessment.maturityLevel);
    const nextLevelConfig = MATURITY_LEVELS.find(l => l.numericValue === currentLevel + 1);

    if (nextLevelConfig && lastAssessment.overallScore < nextLevelConfig.minScore) {
      const scoreGap = nextLevelConfig.minScore - lastAssessment.overallScore;
      const scorePerAssessment = averageImprovementRate > 0
        ? (lastAssessment.overallScore * averageImprovementRate) / 100
        : (predictedNextScore - lastAssessment.overallScore);

      if (scorePerAssessment > 0) {
        const assessmentsNeeded = Math.ceil(scoreGap / scorePerAssessment);
        predictedTimeToNextLevel = Math.round(assessmentsNeeded * assessmentFrequency);
      }
    }
  }

  return {
    organizationId,
    organizationName: organization.name,
    totalAssessments: assessments.length,
    firstAssessmentDate: new Date(firstAssessment.finalizedAt),
    lastAssessmentDate: new Date(lastAssessment.finalizedAt),
    overallImprovement,
    averageImprovementRate,
    assessmentFrequency,
    currentScore: lastAssessment.overallScore,
    currentLevel: lastAssessment.maturityLevel,
    assessments,
    predictedNextScore,
    predictedTimeToNextLevel,
  };
}

/**
 * Get domain-level progress for an organization
 */
export async function getDomainProgress(
  organizationId: string
): Promise<DomainProgress[]> {
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

  if (histories.length === 0) {
    return [];
  }

  // Extract domain scores
  const domainMap = new Map<string, DomainProgress>();

  // Domain names
  const domainNames: Record<string, string> = {
    data: 'Dữ liệu',
    infra: 'Hạ tầng',
    tech: 'Công nghệ',
    org: 'Tổ chức',
    policy: 'Chính sách',
  };

  histories.forEach((history: any) => {
    const domainScores = history.domainScores as Record<string, number>;

    Object.entries(domainScores).forEach(([domainCode, score]) => {
      if (!domainMap.has(domainCode)) {
        domainMap.set(domainCode, {
          domainCode,
          domainName: domainNames[domainCode] || domainCode,
          history: [],
          improvement: 0,
          trend: 'stable',
        });
      }

      const domain = domainMap.get(domainCode)!;
      domain.history.push({
        assessmentId: history.assessmentId,
        date: history.assessment.finalizedAt || history.createdAt,
        score,
      });
    });
  });

  // Calculate improvement and trend for each domain
  const domainProgress: DomainProgress[] = [];

  domainMap.forEach((domain) => {
    if (domain.history.length > 0) {
      const firstScore = domain.history[0].score;
      const lastScore = domain.history[domain.history.length - 1].score;
      domain.improvement = lastScore - firstScore;

      // Determine trend (looking at last 3 assessments if available)
      const recentScores = domain.history.slice(-3).map(h => h.score);
      if (recentScores.length >= 2) {
        const recentImprovement = recentScores[recentScores.length - 1] - recentScores[0];
        if (recentImprovement > 0.1) {
          domain.trend = 'improving';
        } else if (recentImprovement < -0.1) {
          domain.trend = 'declining';
        } else {
          domain.trend = 'stable';
        }
      }

      domainProgress.push(domain);
    }
  });

  return domainProgress;
}

/**
 * Get achievement summary for an organization
 */
export async function getAchievementSummary(organizationId: string): Promise<{
  totalAssessments: number;
  totalImprovement: number;
  levelIncreases: number;
  currentStreak: number; // Consecutive assessments with improvement
  bestImprovement: {
    assessmentId: string;
    scoreChange: number;
    date: Date;
  } | null;
}> {
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

  if (histories.length === 0) {
    return {
      totalAssessments: 0,
      totalImprovement: 0,
      levelIncreases: 0,
      currentStreak: 0,
      bestImprovement: null,
    };
  }

  const totalImprovement = histories.length > 1
    ? histories[histories.length - 1].overallScore - histories[0].overallScore
    : 0;

  const levelIncreases = histories.filter((h: any) => (h.levelChange || 0) > 0).length;

  // Calculate current streak
  let currentStreak = 0;
  for (let i = histories.length - 1; i > 0; i--) {
    if ((histories[i].scoreChange || 0) > 0) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Find best improvement
  const improvementHistories = histories.filter((h: any) => h.scoreChange !== null);
  let bestImprovement: any = null;

  if (improvementHistories.length > 0) {
    const best = improvementHistories.reduce((max: any, h: any) =>
      (h.scoreChange || 0) > (max.scoreChange || 0) ? h : max
    );

    bestImprovement = {
      assessmentId: best.assessmentId,
      scoreChange: best.scoreChange,
      date: best.assessment.finalizedAt || best.createdAt,
    };
  }

  return {
    totalAssessments: histories.length,
    totalImprovement,
    levelIncreases,
    currentStreak,
    bestImprovement,
  };
}
