/**
 * Goal Management Service
 * CRUD operations for progress goals and milestones
 *
 * Phase 5B: Progress Tracking
 */

import { prisma } from '@/lib/db/prisma';

// ============================================================================
// TYPES
// ============================================================================

export type GoalType = 'OVERALL_SCORE' | 'MATURITY_LEVEL' | 'DOMAIN_SCORE' | 'ITEM_SCORE' | 'BENCHMARK_RANK';
export type GoalStatus = 'ACTIVE' | 'ACHIEVED' | 'MISSED' | 'CANCELLED';
export type GoalPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CreateGoalRequest {
  organizationId: string;
  userId?: string;
  goalType: GoalType;
  title: string;
  description?: string;
  targetValue: number;
  targetDate: Date;
  currentValue?: number;
  priority?: GoalPriority;

  // Type-specific fields
  targetScore?: number; // For OVERALL_SCORE
  targetLevel?: string; // For MATURITY_LEVEL
  domainCode?: string; // For DOMAIN_SCORE
  itemCode?: string; // For ITEM_SCORE

  // Milestones
  milestones?: Array<{
    title: string;
    description?: string;
    targetValue: number;
    targetDate: Date;
  }>;
}

export interface UpdateGoalRequest {
  title?: string;
  description?: string;
  targetValue?: number;
  targetDate?: Date;
  priority?: GoalPriority;
  status?: GoalStatus;
}

export interface GoalWithProgress {
  id: string;
  organizationId: string;
  userId?: string;
  goalType: GoalType;
  title: string;
  description?: string;
  targetValue: number;
  targetDate: Date;
  currentValue?: number;
  status: GoalStatus;
  priority: GoalPriority;
  achievedAt?: Date;
  achievedValue?: number;
  createdAt: Date;
  updatedAt: Date;

  // Type-specific
  targetScore?: number;
  targetLevel?: string;
  domainCode?: string;
  itemCode?: string;

  // Progress calculation
  progress: {
    currentValue: number;
    targetValue: number;
    percentComplete: number;
    isOnTrack: boolean;
    daysRemaining: number;
    estimatedCompletion?: Date;
  };

  // Milestones
  milestones: Array<{
    id: string;
    title: string;
    description?: string;
    targetValue: number;
    targetDate: Date;
    status: GoalStatus;
    achievedAt?: Date;
    achievedValue?: number;
  }>;
}

// ============================================================================
// GOAL CRUD OPERATIONS
// ============================================================================

/**
 * Create a new goal
 */
export async function createGoal(request: CreateGoalRequest): Promise<GoalWithProgress> {
  const goal = await prisma.progressGoal.create({
    data: {
      organizationId: request.organizationId,
      userId: request.userId,
      goalType: request.goalType,
      title: request.title,
      description: request.description,
      targetValue: request.targetValue,
      targetDate: request.targetDate,
      currentValue: request.currentValue,
      priority: request.priority || 'MEDIUM',
      targetScore: request.targetScore,
      targetLevel: request.targetLevel,
      domainCode: request.domainCode,
      itemCode: request.itemCode,
      milestones: request.milestones
        ? {
            create: request.milestones.map((m) => ({
              title: m.title,
              description: m.description,
              targetValue: m.targetValue,
              targetDate: m.targetDate,
            })),
          }
        : undefined,
    },
    include: {
      milestones: true,
    },
  });

  return calculateGoalProgress(goal as any);
}

/**
 * Get goal by ID
 */
export async function getGoal(goalId: string): Promise<GoalWithProgress | null> {
  const goal = await prisma.progressGoal.findUnique({
    where: { id: goalId },
    include: {
      milestones: true,
    },
  });

  if (!goal) {
    return null;
  }

  return calculateGoalProgress(goal as any);
}

/**
 * Get all goals for an organization
 */
export async function getOrganizationGoals(
  organizationId: string,
  filters?: {
    status?: GoalStatus;
    priority?: GoalPriority;
    goalType?: GoalType;
  }
): Promise<GoalWithProgress[]> {
  const goals = await prisma.progressGoal.findMany({
    where: {
      organizationId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.priority && { priority: filters.priority }),
      ...(filters?.goalType && { goalType: filters.goalType }),
    },
    include: {
      milestones: true,
    },
    orderBy: [
      { priority: 'desc' },
      { targetDate: 'asc' },
    ],
  });

  return goals.map((goal: any) => calculateGoalProgress(goal));
}

/**
 * Update a goal
 */
export async function updateGoal(
  goalId: string,
  updates: UpdateGoalRequest
): Promise<GoalWithProgress | null> {
  const goal = await prisma.progressGoal.update({
    where: { id: goalId },
    data: updates,
    include: {
      milestones: true,
    },
  });

  return calculateGoalProgress(goal);
}

/**
 * Delete a goal
 */
export async function deleteGoal(goalId: string): Promise<void> {
  await prisma.progressGoal.delete({
    where: { id: goalId },
  });
}

/**
 * Mark goal as achieved
 */
export async function markGoalAchieved(
  goalId: string,
  achievedValue: number
): Promise<GoalWithProgress> {
  const goal = await prisma.progressGoal.update({
    where: { id: goalId },
    data: {
      status: 'ACHIEVED',
      achievedAt: new Date(),
      achievedValue,
    },
    include: {
      milestones: true,
    },
  });

  return calculateGoalProgress(goal as any);
}

/**
 * Cancel a goal
 */
export async function cancelGoal(goalId: string): Promise<GoalWithProgress> {
  const goal = await prisma.progressGoal.update({
    where: { id: goalId },
    data: {
      status: 'CANCELLED',
    },
    include: {
      milestones: true,
    },
  });

  return calculateGoalProgress(goal as any);
}

// ============================================================================
// MILESTONE OPERATIONS
// ============================================================================

/**
 * Add milestone to a goal
 */
export async function addMilestone(
  goalId: string,
  milestone: {
    title: string;
    description?: string;
    targetValue: number;
    targetDate: Date;
  }
): Promise<void> {
  await prisma.progressMilestone.create({
    data: {
      goalId,
      title: milestone.title,
      description: milestone.description,
      targetValue: milestone.targetValue,
      targetDate: milestone.targetDate,
    },
  });
}

/**
 * Update milestone
 */
export async function updateMilestone(
  milestoneId: string,
  updates: {
    title?: string;
    description?: string;
    targetValue?: number;
    targetDate?: Date;
    status?: GoalStatus;
  }
): Promise<void> {
  await prisma.progressMilestone.update({
    where: { id: milestoneId },
    data: updates,
  });
}

/**
 * Mark milestone as achieved
 */
export async function markMilestoneAchieved(
  milestoneId: string,
  achievedValue: number,
  assessmentId?: string
): Promise<void> {
  await prisma.progressMilestone.update({
    where: { id: milestoneId },
    data: {
      status: 'ACHIEVED',
      achievedAt: new Date(),
      achievedValue,
      assessmentId,
    },
  });
}

/**
 * Delete milestone
 */
export async function deleteMilestone(milestoneId: string): Promise<void> {
  await prisma.progressMilestone.delete({
    where: { id: milestoneId },
  });
}

// ============================================================================
// PROGRESS CALCULATION
// ============================================================================

/**
 * Calculate progress for a goal based on latest assessment data
 */
function calculateGoalProgress(goal: any): GoalWithProgress {
  // Get current value (would need to fetch from latest assessment in real implementation)
  const currentValue = goal.currentValue || 0;
  const targetValue = goal.targetValue;

  const percentComplete = Math.min(
    Math.round((currentValue / targetValue) * 100),
    100
  );

  // Calculate days remaining
  const now = new Date();
  const targetDate = new Date(goal.targetDate);
  const daysRemaining = Math.ceil(
    (targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Determine if on track (simple heuristic)
  const timeElapsed = now.getTime() - new Date(goal.createdAt).getTime();
  const totalTime = targetDate.getTime() - new Date(goal.createdAt).getTime();
  const expectedProgress = totalTime > 0 ? (timeElapsed / totalTime) * 100 : 0;
  const isOnTrack = percentComplete >= expectedProgress - 10; // 10% tolerance

  // Estimate completion date based on current rate
  let estimatedCompletion: Date | undefined;
  if (percentComplete > 0 && percentComplete < 100) {
    const progressPerDay = percentComplete / Math.max(
      (now.getTime() - new Date(goal.createdAt).getTime()) / (1000 * 60 * 60 * 24),
      1
    );
    if (progressPerDay > 0) {
      const daysToComplete = (100 - percentComplete) / progressPerDay;
      estimatedCompletion = new Date(now.getTime() + daysToComplete * 24 * 60 * 60 * 1000);
    }
  }

  return {
    id: goal.id,
    organizationId: goal.organizationId,
    userId: goal.userId,
    goalType: goal.goalType,
    title: goal.title,
    description: goal.description,
    targetValue: goal.targetValue,
    targetDate: goal.targetDate,
    currentValue: goal.currentValue,
    status: goal.status,
    priority: goal.priority,
    achievedAt: goal.achievedAt,
    achievedValue: goal.achievedValue,
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
    targetScore: goal.targetScore,
    targetLevel: goal.targetLevel,
    domainCode: goal.domainCode,
    itemCode: goal.itemCode,
    progress: {
      currentValue,
      targetValue,
      percentComplete,
      isOnTrack,
      daysRemaining,
      estimatedCompletion,
    },
    milestones: goal.milestones.map((m: any) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      targetValue: m.targetValue,
      targetDate: m.targetDate,
      status: m.status,
      achievedAt: m.achievedAt,
      achievedValue: m.achievedValue,
    })),
  };
}

/**
 * Check and update goal status based on latest assessment
 */
export async function checkGoalProgress(
  organizationId: string,
  assessmentId: string
): Promise<void> {
  // Get latest assessment data
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      history: true,
    },
  });

  if (!assessment || !assessment.history) {
    return;
  }

  // Get all active goals for this organization
  const activeGoals = await prisma.progressGoal.findMany({
    where: {
      organizationId,
      status: 'ACTIVE',
    },
    include: {
      milestones: {
        where: {
          status: 'ACTIVE',
        },
      },
    },
  });

  // Check each goal
  for (const goal of activeGoals) {
    let achieved = false;
    let achievedValue: number | undefined;

    switch (goal.goalType) {
      case 'OVERALL_SCORE':
        achievedValue = assessment.history.overallScore;
        achieved = achievedValue !== undefined && achievedValue >= goal.targetValue;
        break;

      case 'MATURITY_LEVEL':
        // Check if reached target level
        achieved = assessment.history.maturityLevel === goal.targetLevel;
        achievedValue = assessment.history.overallScore;
        break;

      case 'DOMAIN_SCORE':
        if (goal.domainCode) {
          const domainScores = assessment.history.domainScores as Record<string, number>;
          achievedValue = domainScores[goal.domainCode];
          achieved = achievedValue >= goal.targetValue;
        }
        break;

      case 'ITEM_SCORE':
        // Would need to fetch item score from responses
        break;

      case 'BENCHMARK_RANK':
        // Would need to fetch benchmark percentile from Phase 5A
        break;
    }

    if (achieved && achievedValue) {
      await markGoalAchieved(goal.id, achievedValue);
    }

    // Check milestones
    for (const milestone of goal.milestones) {
      let milestoneAchieved = false;
      let milestoneValue: number | undefined;

      switch (goal.goalType) {
        case 'OVERALL_SCORE':
          milestoneValue = assessment.history.overallScore;
          milestoneAchieved = milestoneValue !== undefined && milestoneValue >= milestone.targetValue;
          break;

        case 'DOMAIN_SCORE':
          if (goal.domainCode) {
            const domainScores = assessment.history.domainScores as Record<string, number>;
            milestoneValue = domainScores[goal.domainCode];
            milestoneAchieved = milestoneValue >= milestone.targetValue;
          }
          break;
      }

      if (milestoneAchieved && milestoneValue) {
        await markMilestoneAchieved(milestone.id, milestoneValue, assessmentId);
      }
    }
  }

  // Check for missed goals (deadline passed)
  const missedGoals = await prisma.progressGoal.findMany({
    where: {
      organizationId,
      status: 'ACTIVE',
      targetDate: {
        lt: new Date(),
      },
    },
  });

  for (const goal of missedGoals) {
    await prisma.progressGoal.update({
      where: { id: goal.id },
      data: { status: 'MISSED' },
    });
  }
}

/**
 * Get goal statistics for an organization
 */
export async function getGoalStatistics(organizationId: string): Promise<{
  total: number;
  active: number;
  achieved: number;
  missed: number;
  cancelled: number;
  achievementRate: number;
  averageDaysToAchieve: number;
}> {
  const goals = await prisma.progressGoal.findMany({
    where: { organizationId },
  });

  const total = goals.length;
  const active = goals.filter((g: any) => g.status === 'ACTIVE').length;
  const achieved = goals.filter((g: any) => g.status === 'ACHIEVED').length;
  const missed = goals.filter((g: any) => g.status === 'MISSED').length;
  const cancelled = goals.filter((g: any) => g.status === 'CANCELLED').length;

  const achievementRate = total > 0 ? (achieved / total) * 100 : 0;

  // Calculate average days to achieve
  const achievedGoals = goals.filter((g: any) => g.status === 'ACHIEVED' && g.achievedAt);
  const daysArray = achievedGoals.map((g: any) => {
    const created = new Date(g.createdAt).getTime();
    const achievedTime = g.achievedAt ? new Date(g.achievedAt).getTime() : created;
    return (achievedTime - created) / (1000 * 60 * 60 * 24);
  });

  const averageDaysToAchieve = daysArray.length > 0
    ? daysArray.reduce((sum: number, d: number) => sum + d, 0) / daysArray.length
    : 0;

  return {
    total,
    active,
    achieved,
    missed,
    cancelled,
    achievementRate: Math.round(achievementRate * 10) / 10,
    averageDaysToAchieve: Math.round(averageDaysToAchieve),
  };
}
