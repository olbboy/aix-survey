import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@aix-survey/database';
import {
  CreateGoalDto,
  UpdateGoalDto,
  CheckProgressDto,
  GoalStatus,
} from './dto';

/**
 * Goals Service
 * Handles business logic for progress goals and milestones
 *
 * Features:
 * - CRUD operations for goals
 * - Progress calculation
 * - Authorization checks
 * - Milestone management
 */
@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find all goals for a user
   * Returns goals the user owns or has access to via organization
   */
  async findAll(userId: string) {
    return this.prisma.goal.findMany({
      where: {
        OR: [
          { userId },
          { organization: { users: { some: { userId } } } },
        ],
      },
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
  }

  /**
   * Find a single goal by ID
   * @throws NotFoundException if goal not found
   * @throws ForbiddenException if user not authorized
   */
  async findOne(id: string, userId: string) {
    const goal = await this.prisma.goal.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { organization: { users: { some: { userId } } } },
        ],
      },
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
    });

    if (!goal) {
      throw new NotFoundException(`Goal with ID ${id} not found`);
    }

    return this.calculateProgress(goal);
  }

  /**
   * Create a new goal
   */
  async create(dto: CreateGoalDto, userId: string) {
    // Verify user has access to organization
    const organization = await this.prisma.organization.findFirst({
      where: {
        id: dto.organizationId,
        users: { some: { userId } },
      },
    });

    if (!organization) {
      throw new ForbiddenException(
        'Not authorized to create goals for this organization'
      );
    }

    // Create goal with default priority
    const goal = await this.prisma.goal.create({
      data: {
        ...dto,
        userId,
        priority: dto.priority || 'MEDIUM',
        status: 'ACTIVE',
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

    return this.calculateProgress(goal);
  }

  /**
   * Update an existing goal
   * @throws NotFoundException if goal not found
   * @throws ForbiddenException if user not authorized
   */
  async update(id: string, dto: UpdateGoalDto, userId: string) {
    // Verify ownership/access
    await this.findOne(id, userId);

    const goal = await this.prisma.goal.update({
      where: { id },
      data: dto,
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
    });

    return this.calculateProgress(goal);
  }

  /**
   * Delete a goal
   * @throws NotFoundException if goal not found
   * @throws ForbiddenException if user not authorized
   */
  async delete(id: string, userId: string) {
    // Verify ownership/access
    await this.findOne(id, userId);

    await this.prisma.goal.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * Mark goal as achieved
   */
  async markAchieved(id: string, achievedValue: number, userId: string) {
    await this.findOne(id, userId);

    const goal = await this.prisma.goal.update({
      where: { id },
      data: {
        status: GoalStatus.ACHIEVED,
        achievedAt: new Date(),
        achievedValue,
        currentValue: achievedValue,
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

    return this.calculateProgress(goal);
  }

  /**
   * Cancel a goal
   */
  async cancel(id: string, userId: string) {
    await this.findOne(id, userId);

    const goal = await this.prisma.goal.update({
      where: { id },
      data: {
        status: GoalStatus.CANCELLED,
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

    return this.calculateProgress(goal);
  }

  /**
   * Check and update goal progress based on latest assessment
   * This should be called automatically when an assessment is finalized
   */
  async checkProgress(dto: CheckProgressDto, userId: string) {
    const { organizationId, assessmentId } = dto;

    // Verify user has access to organization
    const organization = await this.prisma.organization.findFirst({
      where: {
        id: organizationId,
        users: { some: { userId } },
      },
    });

    if (!organization) {
      throw new ForbiddenException(
        'Not authorized to check progress for this organization'
      );
    }

    // Get the assessment
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
    });

    if (!assessment) {
      throw new NotFoundException(
        `Assessment with ID ${assessmentId} not found`
      );
    }

    // Get all active goals for this organization
    const goals = await this.prisma.goal.findMany({
      where: {
        organizationId,
        status: 'ACTIVE',
      },
    });

    // Update each goal's progress based on assessment results
    // This is a simplified version - actual logic would depend on goal type
    const updatedGoals = [];
    for (const goal of goals) {
      // TODO: Implement actual progress calculation based on goal type
      // For now, just mark as checked
      updatedGoals.push(goal);
    }

    return {
      success: true,
      checkedGoals: updatedGoals.length,
      assessmentId,
    };
  }

  /**
   * Calculate progress for a goal
   * Returns goal with computed progress metrics
   */
  private calculateProgress(goal: any) {
    const currentValue = goal.currentValue || 0;
    const targetValue = goal.targetValue;
    const percentComplete = Math.min(
      100,
      Math.round((currentValue / targetValue) * 100)
    );

    const now = new Date();
    const targetDate = new Date(goal.targetDate);
    const daysRemaining = Math.ceil(
      (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Simple on-track calculation
    // Goal is on track if progress >= expected progress based on time
    const createdDate = new Date(goal.createdAt);
    const totalDays = Math.ceil(
      (targetDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysPassed = totalDays - daysRemaining;
    const expectedProgress = totalDays > 0 ? (daysPassed / totalDays) * 100 : 0;
    const isOnTrack =
      percentComplete >= expectedProgress || goal.status === 'ACHIEVED';

    return {
      ...goal,
      progress: {
        currentValue,
        targetValue,
        percentComplete,
        isOnTrack,
        daysRemaining,
      },
    };
  }
}
