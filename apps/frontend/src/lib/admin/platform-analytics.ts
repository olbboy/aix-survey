/**
 * Platform Analytics Service
 * Provides comprehensive analytics for admin dashboard
 *
 * Phase 5C: Admin Dashboard
 */

import { prisma } from '@/lib/db/prisma';

// ============================================================================
// TYPES
// ============================================================================

export interface PlatformStatistics {
  // User metrics
  totalUsers: number;
  activeUsers: number; // Logged in within last 30 days
  newUsersThisMonth: number;
  userGrowthRate: number; // % change from previous month

  // Organization metrics
  totalOrganizations: number;
  activeOrganizations: number; // With at least 1 finalized assessment
  newOrganizationsThisMonth: number;

  // Assessment metrics
  totalAssessments: number;
  finalizedAssessments: number;
  draftAssessments: number;
  assessmentsThisMonth: number;
  averageCompletionTime: number; // Days from creation to finalization
  completionRate: number; // % of assessments that get finalized

  // Engagement metrics
  averageAssessmentsPerOrg: number;
  averageScoreImprovement: number; // Across all organizations with 2+ assessments
  totalGoalsCreated: number;
  goalAchievementRate: number;

  // Content metrics
  totalResponses: number;
  totalEvidence: number;
  totalStorageUsed: number; // In bytes
}

export interface UsageMetrics {
  // Time series data
  dailyActiveUsers: Array<{ date: string; count: number }>;
  dailyAssessments: Array<{ date: string; count: number }>;
  monthlyGrowth: Array<{ month: string; users: number; orgs: number; assessments: number }>;

  // Feature usage
  featureUsage: {
    pdfExports: number;
    csvExports: number;
    emailsSent: number;
    benchmarkComparisons: number;
    evidenceUploads: number;
  };

  // Popular metrics
  topIndustries: Array<{ industry: string; count: number; avgScore: number }>;
  topRegions: Array<{ region: string; count: number }>;
  companySizeDistribution: Array<{ size: string; count: number; percentage: number }>;
}

export interface PerformanceMetrics {
  // Response times (would need APM integration)
  averageApiResponseTime?: number;
  slowestEndpoints?: Array<{ endpoint: string; avgTime: number }>;

  // Database metrics
  totalRecords: {
    users: number;
    organizations: number;
    assessments: number;
    responses: number;
    evidences: number;
    benchmarks: number;
    goals: number;
  };

  // Error rates
  totalErrors: number;
  errorRate: number;
  recentErrors: Array<{
    timestamp: Date;
    type: string;
    message: string;
  }>;
}

// ============================================================================
// PLATFORM STATISTICS
// ============================================================================

/**
 * Get comprehensive platform statistics
 */
export async function getPlatformStatistics(): Promise<PlatformStatistics> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Run all queries in parallel
  const [
    totalUsers,
    activeUsers,
    newUsersThisMonth,
    newUsersLastMonth,
    totalOrganizations,
    activeOrganizations,
    newOrganizationsThisMonth,
    totalAssessments,
    finalizedAssessments,
    draftAssessments,
    assessmentsThisMonth,
    assessmentTimings,
    totalGoals,
    achievedGoals,
    totalResponses,
    totalEvidence,
    evidenceFiles,
  ] = await Promise.all([
    // User metrics
    prisma.user.count(),
    prisma.user.count({ where: { lastLoginAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: firstOfMonth } } }),
    prisma.user.count({
      where: {
        createdAt: { gte: firstOfLastMonth, lt: firstOfMonth },
      },
    }),

    // Organization metrics
    prisma.organization.count(),
    prisma.organization.count({
      where: {
        assessments: {
          some: {
            status: 'FINALIZED',
          },
        },
      },
    }),
    prisma.organization.count({ where: { createdAt: { gte: firstOfMonth } } }),

    // Assessment metrics
    prisma.assessment.count(),
    prisma.assessment.count({ where: { status: 'FINALIZED' } }),
    prisma.assessment.count({ where: { status: 'DRAFT' } }),
    prisma.assessment.count({ where: { createdAt: { gte: firstOfMonth } } }),
    prisma.assessment.findMany({
      where: {
        status: 'FINALIZED',
        finalizedAt: { not: null },
      },
      select: {
        createdAt: true,
        finalizedAt: true,
      },
    }),

    // Goal metrics
    prisma.progressGoal.count(),
    prisma.progressGoal.count({ where: { status: 'ACHIEVED' } }),

    // Content metrics
    prisma.response.count(),
    prisma.evidence.count(),
    prisma.evidence.findMany({
      select: {
        fileSize: true,
      },
    }),
  ]);

  // Calculate user growth rate
  const userGrowthRate =
    newUsersLastMonth > 0
      ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100
      : 0;

  // Calculate average completion time
  const completionTimes = assessmentTimings
    .filter((a: any) => a.finalizedAt)
    .map((a: any) => {
      const created = new Date(a.createdAt).getTime();
      const finalized = new Date(a.finalizedAt).getTime();
      return (finalized - created) / (1000 * 60 * 60 * 24); // Days
    });

  const averageCompletionTime =
    completionTimes.length > 0
      ? completionTimes.reduce((sum: number, t: number) => sum + t, 0) / completionTimes.length
      : 0;

  // Calculate completion rate
  const completionRate = totalAssessments > 0 ? (finalizedAssessments / totalAssessments) * 100 : 0;

  // Calculate average assessments per org
  const averageAssessmentsPerOrg =
    totalOrganizations > 0 ? totalAssessments / totalOrganizations : 0;

  // Calculate average score improvement
  const improvements = await prisma.assessmentHistory.findMany({
    where: {
      scoreChange: { gt: 0 },
    },
    select: {
      scoreChange: true,
    },
  });

  const averageScoreImprovement =
    improvements.length > 0
      ? improvements.reduce((sum: number, i: any) => sum + (i.scoreChange || 0), 0) / improvements.length
      : 0;

  // Calculate goal achievement rate
  const goalAchievementRate = totalGoals > 0 ? (achievedGoals / totalGoals) * 100 : 0;

  // Calculate total storage used
  const totalStorageUsed = evidenceFiles.reduce((sum: number, e: any) => sum + e.fileSize, 0);

  return {
    totalUsers,
    activeUsers,
    newUsersThisMonth,
    userGrowthRate: Math.round(userGrowthRate * 10) / 10,
    totalOrganizations,
    activeOrganizations,
    newOrganizationsThisMonth,
    totalAssessments,
    finalizedAssessments,
    draftAssessments,
    assessmentsThisMonth,
    averageCompletionTime: Math.round(averageCompletionTime * 10) / 10,
    completionRate: Math.round(completionRate * 10) / 10,
    averageAssessmentsPerOrg: Math.round(averageAssessmentsPerOrg * 10) / 10,
    averageScoreImprovement: Math.round(averageScoreImprovement * 100) / 100,
    totalGoalsCreated: totalGoals,
    goalAchievementRate: Math.round(goalAchievementRate * 10) / 10,
    totalResponses,
    totalEvidence,
    totalStorageUsed,
  };
}

// ============================================================================
// USAGE METRICS
// ============================================================================

/**
 * Get usage metrics and trends
 */
export async function getUsageMetrics(days: number = 30): Promise<UsageMetrics> {
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Daily active users (users who logged in each day)
  const sessions = await prisma.session.groupBy({
    by: ['createdAt'],
    where: {
      createdAt: { gte: startDate },
    },
    _count: {
      userId: true,
    },
  });

  const dailyActiveUsers = sessions.map((s: any) => ({
    date: new Date(s.createdAt).toISOString().split('T')[0],
    count: s._count.userId,
  }));

  // Daily assessments created
  const assessmentsByDay = await prisma.assessment.groupBy({
    by: ['createdAt'],
    where: {
      createdAt: { gte: startDate },
    },
    _count: true,
  });

  const dailyAssessments = assessmentsByDay.map((a: any) => ({
    date: new Date(a.createdAt).toISOString().split('T')[0],
    count: a._count,
  }));

  // Monthly growth (last 12 months)
  const monthlyGrowth: Array<{ month: string; users: number; orgs: number; assessments: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

    const [users, orgs, assessments] = await Promise.all([
      prisma.user.count({
        where: {
          createdAt: { gte: monthStart, lt: monthEnd },
        },
      }),
      prisma.organization.count({
        where: {
          createdAt: { gte: monthStart, lt: monthEnd },
        },
      }),
      prisma.assessment.count({
        where: {
          createdAt: { gte: monthStart, lt: monthEnd },
        },
      }),
    ]);

    monthlyGrowth.push({
      month: monthStart.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
      users,
      orgs,
      assessments,
    });
  }

  // Feature usage (from various sources)
  const [emailsSent, evidenceCount] = await Promise.all([
    prisma.emailNotification.count({ where: { status: 'SENT' } }),
    prisma.evidence.count(),
  ]);

  // Top industries
  const industryData = await prisma.assessment.groupBy({
    by: ['industry'],
    where: {
      industry: { not: null },
      status: 'FINALIZED',
    },
    _count: true,
  });

  const industriesWithScores = await Promise.all(
    industryData.map(async (ind: any) => {
      const assessments = await prisma.assessmentHistory.aggregate({
        where: {
          assessment: {
            industry: ind.industry,
          },
        },
        _avg: {
          overallScore: true,
        },
      });

      return {
        industry: ind.industry,
        count: ind._count,
        avgScore: assessments._avg.overallScore || 0,
      };
    })
  );

  const topIndustries = industriesWithScores
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 10)
    .map((i) => ({
      ...i,
      avgScore: Math.round(i.avgScore * 100) / 100,
    }));

  // Top regions
  const regionData = await prisma.assessment.groupBy({
    by: ['region'],
    where: {
      region: { not: null },
      status: 'FINALIZED',
    },
    _count: true,
  });

  const topRegions = regionData
    .map((r: any) => ({
      region: r.region,
      count: r._count,
    }))
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 10);

  // Company size distribution
  const sizeData = await prisma.assessment.groupBy({
    by: ['size'],
    where: {
      size: { not: null },
      status: 'FINALIZED',
    },
    _count: true,
  });

  const totalFinalizedAssessments = sizeData.reduce((sum: number, s: any) => sum + s._count, 0);
  const companySizeDistribution = sizeData.map((s: any) => ({
    size: s.size,
    count: s._count,
    percentage: Math.round((s._count / totalFinalizedAssessments) * 100 * 10) / 10,
  }));

  return {
    dailyActiveUsers,
    dailyAssessments,
    monthlyGrowth,
    featureUsage: {
      pdfExports: 0, // Would need to track this
      csvExports: 0, // Would need to track this
      emailsSent,
      benchmarkComparisons: 0, // Would need to track this
      evidenceUploads: evidenceCount,
    },
    topIndustries,
    topRegions,
    companySizeDistribution,
  };
}

// ============================================================================
// PERFORMANCE METRICS
// ============================================================================

/**
 * Get system performance metrics
 */
export async function getPerformanceMetrics(): Promise<PerformanceMetrics> {
  // Get record counts for all tables
  const [
    users,
    organizations,
    assessments,
    responses,
    evidences,
    benchmarks,
    goals,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
    prisma.assessment.count(),
    prisma.response.count(),
    prisma.evidence.count(),
    prisma.benchmarkData.count(),
    prisma.progressGoal.count(),
  ]);

  // Get recent audit logs for errors (if we tracked them there)
  // For now, we'll return placeholder data
  const recentErrors: Array<{
    timestamp: Date;
    type: string;
    message: string;
  }> = [];

  return {
    totalRecords: {
      users,
      organizations,
      assessments,
      responses,
      evidences,
      benchmarks,
      goals,
    },
    totalErrors: 0,
    errorRate: 0,
    recentErrors,
  };
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Perform system health check
 */
export async function performHealthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Array<{
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
    responseTime?: number;
  }>;
}> {
  const checks: Array<{
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
    responseTime?: number;
  }> = [];

  // Database connectivity check
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - start;

    checks.push({
      name: 'Database Connection',
      status: responseTime < 100 ? 'pass' : 'warn',
      message: `Connected in ${responseTime}ms`,
      responseTime,
    });
  } catch (error) {
    checks.push({
      name: 'Database Connection',
      status: 'fail',
      message: 'Failed to connect to database',
    });
  }

  // Database size check
  try {
    const totalRecords = await prisma.assessment.count();
    checks.push({
      name: 'Database Size',
      status: totalRecords < 100000 ? 'pass' : 'warn',
      message: `${totalRecords.toLocaleString()} total assessments`,
    });
  } catch (error) {
    checks.push({
      name: 'Database Size',
      status: 'warn',
      message: 'Could not determine database size',
    });
  }

  // Determine overall status
  const hasFailures = checks.some((c) => c.status === 'fail');
  const hasWarnings = checks.some((c) => c.status === 'warn');

  const status = hasFailures ? 'unhealthy' : hasWarnings ? 'degraded' : 'healthy';

  return {
    status,
    checks,
  };
}
