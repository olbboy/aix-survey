import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@aix-survey/database';
import { GoalsService } from '../goals/goals.service';
import { GetOrganizationGoalsDto, CreateOrganizationGoalDto } from './dto';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly goalsService: GoalsService
  ) {}

  /**
   * Get all goals for an organization with optional filters
   */
  async getOrganizationGoals(organizationId: string, userId: string, filters: GetOrganizationGoalsDto) {
    const { status, priority, goalType, includeStats } = filters;

    // Verify organization exists and user has access
    await this.verifyOrganizationAccess(organizationId, userId);

    // Build where clause
    const where: any = {
      organizationId,
      OR: [
        { userId },
        { organization: { users: { some: { userId } } } },
      ],
    };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (goalType) where.goalType = goalType;

    // Fetch goals
    const goals = await this.prisma.goal.findMany({
      where,
      include: {
        milestones: {
          orderBy: { targetDate: 'asc' },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate statistics if requested
    let statistics;
    if (includeStats) {
      statistics = await this.getGoalStatistics(organizationId, userId);
    }

    return {
      goals,
      ...(statistics && { statistics }),
    };
  }

  /**
   * Create a new goal for an organization
   */
  async createOrganizationGoal(
    organizationId: string,
    userId: string,
    dto: CreateOrganizationGoalDto
  ) {
    // Verify organization exists and user has access
    await this.verifyOrganizationAccess(organizationId, userId);

    // Validate goal type specific fields
    if (dto.goalType === 'DOMAIN_SCORE' && !dto.domainCode) {
      throw new BadRequestException('domainCode is required for DOMAIN_SCORE goals');
    }

    if (dto.goalType === 'ITEM_SCORE' && !dto.itemCode) {
      throw new BadRequestException('itemCode is required for ITEM_SCORE goals');
    }

    if (dto.goalType === 'BENCHMARK_RANK' && !dto.benchmarkId) {
      throw new BadRequestException('benchmarkId is required for BENCHMARK_RANK goals');
    }

    // Create goal using Goals service
    const goal = await this.prisma.goal.create({
      data: {
        organizationId,
        userId,
        goalType: dto.goalType,
        title: dto.title,
        description: dto.description,
        targetValue: dto.targetValue,
        targetDate: dto.targetDate,
        priority: dto.priority || 'MEDIUM',
        status: 'ACTIVE',
        domainId: dto.domainCode || null,
        itemId: dto.itemCode || null,
        benchmarkId: dto.benchmarkId || null,
      },
      include: {
        milestones: true,
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return goal;
  }

  /**
   * Get comprehensive progress tracking data for an organization
   */
  async getOrganizationProgress(organizationId: string, userId: string) {
    // Verify organization access
    await this.verifyOrganizationAccess(organizationId, userId);

    // Get all finalized assessments for this organization
    const assessments = await this.prisma.assessment.findMany({
      where: {
        organizationId,
        status: 'FINALIZED',
      },
      include: {
        responses: true,
        snapshot: true,
      },
      orderBy: {
        finalizedAt: 'asc',
      },
    });

    if (assessments.length === 0) {
      throw new NotFoundException(
        'No finalized assessments found for this organization'
      );
    }

    // Calculate overall progress
    const progress = this.calculateOverallProgress(assessments);

    // Calculate domain-level progress
    const domainProgress = await this.calculateDomainProgress(organizationId, assessments);

    // Calculate achievement summary
    const achievements = this.calculateAchievements(assessments);

    return {
      progress,
      domainProgress,
      achievements,
    };
  }

  /**
   * Verify user has access to organization
   * Private helper method
   */
  private async verifyOrganizationAccess(organizationId: string, userId: string) {
    const organization = await this.prisma.organization.findFirst({
      where: {
        id: organizationId,
        users: {
          some: { userId },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException(
        `Organization ${organizationId} not found or access denied`
      );
    }

    return organization;
  }

  /**
   * Get goal statistics for an organization
   * Private helper method
   */
  private async getGoalStatistics(organizationId: string, userId: string) {
    const goals = await this.prisma.goal.findMany({
      where: {
        organizationId,
        OR: [
          { userId },
          { organization: { users: { some: { userId } } } },
        ],
      },
    });

    const total = goals.length;
    const active = goals.filter((g) => g.status === 'ACTIVE').length;
    const achieved = goals.filter((g) => g.status === 'ACHIEVED').length;
    const missed = goals.filter((g) => g.status === 'MISSED').length;
    const cancelled = goals.filter((g) => g.status === 'CANCELLED').length;

    const achievementRate = total > 0 ? (achieved / total) * 100 : 0;

    return {
      total,
      active,
      achieved,
      missed,
      cancelled,
      achievementRate: Math.round(achievementRate * 100) / 100,
    };
  }

  /**
   * Calculate overall progress metrics
   * Private helper method
   */
  private calculateOverallProgress(assessments: any[]) {
    const total = assessments.length;
    const first = assessments[0];
    const last = assessments[assessments.length - 1];

    const firstScore = first.snapshot?.overallScore || 0;
    const lastScore = last.snapshot?.overallScore || 0;
    const improvement = lastScore - firstScore;

    const firstDate = new Date(first.finalizedAt);
    const lastDate = new Date(last.finalizedAt);
    const daysBetween = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
    const frequency = total > 1 ? daysBetween / (total - 1) : 0;

    return {
      organizationId: first.organizationId,
      totalAssessments: total,
      firstAssessmentDate: firstDate,
      lastAssessmentDate: lastDate,
      overallImprovement: Math.round(improvement * 100) / 100,
      averageImprovementRate: total > 1 ? Math.round((improvement / (total - 1)) * 100) / 100 : 0,
      assessmentFrequency: Math.round(frequency),
      currentScore: lastScore,
      currentLevel: this.getMaturityLevel(lastScore),
    };
  }

  /**
   * Calculate domain-level progress
   * Private helper method
   */
  private async calculateDomainProgress(organizationId: string, assessments: any[]) {
    // Group responses by domain
    const domainMap = new Map<string, any[]>();

    for (const assessment of assessments) {
      for (const response of assessment.responses) {
        const domainCode = response.domainCode || 'UNKNOWN';
        if (!domainMap.has(domainCode)) {
          domainMap.set(domainCode, []);
        }
        domainMap.get(domainCode)!.push({
          assessmentId: assessment.id,
          date: assessment.finalizedAt,
          score: response.score,
        });
      }
    }

    const domainProgress: any[] = [];
    for (const [domainCode, history] of domainMap.entries()) {
      const scores = history.map((h) => h.score);
      const firstScore = scores[0];
      const lastScore = scores[scores.length - 1];
      const improvement = lastScore - firstScore;

      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (improvement > 0.1) trend = 'improving';
      if (improvement < -0.1) trend = 'declining';

      domainProgress.push({
        domainCode,
        domainName: domainCode,
        history,
        improvement: Math.round(improvement * 100) / 100,
        trend,
      });
    }

    return domainProgress;
  }

  /**
   * Calculate achievement summary
   * Private helper method
   */
  private calculateAchievements(assessments: any[]) {
    const total = assessments.length;
    const improvements = assessments.length > 1 ? assessments.length - 1 : 0;

    return {
      totalAssessments: total,
      improvementCount: improvements,
      consecutiveImprovements: this.calculateConsecutiveImprovements(assessments),
    };
  }

  /**
   * Calculate consecutive improvements
   * Private helper method
   */
  private calculateConsecutiveImprovements(assessments: any[]): number {
    let consecutive = 0;
    for (let i = 1; i < assessments.length; i++) {
      const prevScore = assessments[i - 1].snapshot?.overallScore || 0;
      const currScore = assessments[i].snapshot?.overallScore || 0;
      if (currScore > prevScore) {
        consecutive++;
      } else {
        break;
      }
    }
    return consecutive;
  }

  /**
   * Get maturity level from score
   * Private helper method
   */
  private getMaturityLevel(score: number): string {
    if (score < 1.6) return 'Sơ khai';
    if (score < 2.6) return 'Khởi đầu';
    if (score < 3.6) return 'Phát triển';
    if (score < 4.6) return 'Trưởng thành';
    return 'Tối ưu';
  }
}
