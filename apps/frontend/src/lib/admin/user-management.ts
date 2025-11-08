/**
 * User Management Service
 * Admin functions for managing users and permissions
 *
 * Phase 5C: Admin Dashboard
 */

import { prisma } from '@/lib/db/prisma';

// ============================================================================
// TYPES
// ============================================================================

export type UserRole = 'OWNER' | 'ADMIN' | 'REVIEWER' | 'RESPONDENT' | 'VIEWER';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface UserWithDetails {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  lastLoginAt: Date | null;

  // Organization memberships
  organizations: Array<{
    organizationId: string;
    organizationName: string;
    role: UserRole;
    joinedAt: Date;
  }>;

  // Activity metrics
  activity: {
    totalLogins: number;
    assessmentsCreated: number;
    assessmentsReviewed: number;
    responsesSubmitted: number;
    lastActivityAt: Date | null;
  };

  // Profile info
  profileComplete: boolean;
  emailVerified: boolean;
}

export interface UserListFilters {
  role?: UserRole;
  status?: UserStatus;
  organizationId?: string;
  searchQuery?: string; // Search by email or name
  lastLoginBefore?: Date;
  lastLoginAfter?: Date;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface UserStatistics {
  total: number;
  active: number;
  inactive: number;
  suspended: number;

  byRole: {
    owner: number;
    admin: number;
    reviewer: number;
    respondent: number;
    viewer: number;
  };

  newThisMonth: number;
  newThisWeek: number;
  activeThisWeek: number; // Logged in within last 7 days
  activeThisMonth: number; // Logged in within last 30 days
}

export interface UserActivityLog {
  userId: string;
  userName: string;
  email: string;
  activities: Array<{
    type: 'LOGIN' | 'ASSESSMENT_CREATED' | 'ASSESSMENT_FINALIZED' | 'RESPONSE_SUBMITTED' | 'GOAL_CREATED';
    timestamp: Date;
    details?: string;
  }>;
}

// ============================================================================
// USER LISTING AND SEARCH
// ============================================================================

/**
 * Get paginated list of users with detailed information
 */
export async function listUsers(
  filters: UserListFilters = {},
  pagination: { page?: number; pageSize?: number } = {}
): Promise<{
  users: UserWithDetails[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = pagination.page || 1;
  const pageSize = pagination.pageSize || 20;
  const skip = (page - 1) * pageSize;

  // Build where clause
  const where: any = {};

  if (filters.role) {
    where.role = filters.role;
  }

  if (filters.searchQuery) {
    where.OR = [
      { email: { contains: filters.searchQuery, mode: 'insensitive' } },
      { name: { contains: filters.searchQuery, mode: 'insensitive' } },
    ];
  }

  if (filters.lastLoginAfter) {
    where.lastLoginAt = { gte: filters.lastLoginAfter };
  }

  if (filters.lastLoginBefore) {
    where.lastLoginAt = { lte: filters.lastLoginBefore };
  }

  if (filters.createdAfter) {
    where.createdAt = { gte: filters.createdAfter };
  }

  if (filters.createdBefore) {
    where.createdAt = { lte: filters.createdBefore };
  }

  // If filtering by organization, use organizationMemberships relation
  if (filters.organizationId) {
    where.organizationMemberships = {
      some: {
        organizationId: filters.organizationId,
      },
    };
  }

  // Get users and total count in parallel
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        organizationMemberships: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        sessions: {
          select: {
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 100, // Get recent sessions for activity calculation
        },
        assessments: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
        responses: {
          select: {
            id: true,
            createdAt: true,
          },
        },
      },
      skip,
      take: pageSize,
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.user.count({ where }),
  ]);

  // Transform to UserWithDetails format
  const usersWithDetails: UserWithDetails[] = users.map((user: any) => {
    // Calculate activity metrics
    const totalLogins = user.sessions.length;
    const assessmentsCreated = user.assessments.length;
    const assessmentsFinalized = user.assessments.filter(
      (a: any) => a.status === 'FINALIZED'
    ).length;
    const responsesSubmitted = user.responses.length;

    // Last activity is most recent of: last login, last assessment, last response
    const lastActivityDates = [
      user.lastLoginAt,
      user.assessments[0]?.createdAt,
      user.responses[0]?.createdAt,
    ].filter((d): d is Date => d !== null);

    const lastActivityAt = lastActivityDates.length > 0
      ? new Date(Math.max(...lastActivityDates.map(d => d.getTime())))
      : null;

    // Profile completeness check
    const profileComplete = !!(user.name && user.email);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      status: 'ACTIVE' as UserStatus, // Would need to add status field to User model
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      organizations: user.organizationMemberships.map((om: any) => ({
        organizationId: om.organizationId,
        organizationName: om.organization.name,
        role: om.role as UserRole,
        joinedAt: om.createdAt,
      })),
      activity: {
        totalLogins,
        assessmentsCreated,
        assessmentsReviewed: assessmentsFinalized,
        responsesSubmitted,
        lastActivityAt,
      },
      profileComplete,
      emailVerified: !!user.emailVerified,
    };
  });

  const totalPages = Math.ceil(total / pageSize);

  return {
    users: usersWithDetails,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Get single user with full details
 */
export async function getUserDetails(userId: string): Promise<UserWithDetails | null> {
  const result = await listUsers({ searchQuery: '' }, { page: 1, pageSize: 1 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      organizationMemberships: {
        include: {
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      sessions: {
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
      },
      assessments: {
        select: {
          id: true,
          status: true,
          createdAt: true,
        },
      },
      responses: {
        select: {
          id: true,
          createdAt: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  // Calculate activity metrics
  const totalLogins = user.sessions.length;
  const assessmentsCreated = user.assessments.length;
  const assessmentsFinalized = user.assessments.filter(
    (a: any) => a.status === 'FINALIZED'
  ).length;
  const responsesSubmitted = user.responses.length;

  const lastActivityDates = [
    user.lastLoginAt,
    user.assessments[0]?.createdAt,
    user.responses[0]?.createdAt,
  ].filter((d): d is Date => d !== null);

  const lastActivityAt = lastActivityDates.length > 0
    ? new Date(Math.max(...lastActivityDates.map(d => d.getTime())))
    : null;

  const profileComplete = !!(user.name && user.email);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    status: 'ACTIVE' as UserStatus,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
    organizations: user.organizationMemberships.map((om: any) => ({
      organizationId: om.organizationId,
      organizationName: om.organization.name,
      role: om.role as UserRole,
      joinedAt: om.createdAt,
    })),
    activity: {
      totalLogins,
      assessmentsCreated,
      assessmentsReviewed: assessmentsFinalized,
      responsesSubmitted,
      lastActivityAt,
    },
    profileComplete,
    emailVerified: !!user.emailVerified,
  };
}

// ============================================================================
// USER STATISTICS
// ============================================================================

/**
 * Get comprehensive user statistics
 */
export async function getUserStatistics(): Promise<UserStatistics> {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstOfWeek = new Date(now.getTime() - now.getDay() * 24 * 60 * 60 * 1000);

  const [
    total,
    owners,
    admins,
    reviewers,
    respondents,
    viewers,
    newThisMonth,
    newThisWeek,
    activeThisWeek,
    activeThisMonth,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'OWNER' } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({ where: { role: 'REVIEWER' } }),
    prisma.user.count({ where: { role: 'RESPONDENT' } }),
    prisma.user.count({ where: { role: 'VIEWER' } }),
    prisma.user.count({ where: { createdAt: { gte: firstOfMonth } } }),
    prisma.user.count({ where: { createdAt: { gte: firstOfWeek } } }),
    prisma.user.count({ where: { lastLoginAt: { gte: oneWeekAgo } } }),
    prisma.user.count({ where: { lastLoginAt: { gte: oneMonthAgo } } }),
  ]);

  return {
    total,
    active: activeThisMonth,
    inactive: total - activeThisMonth,
    suspended: 0, // Would need to add suspended field
    byRole: {
      owner: owners,
      admin: admins,
      reviewer: reviewers,
      respondent: respondents,
      viewer: viewers,
    },
    newThisMonth,
    newThisWeek,
    activeThisWeek,
    activeThisMonth,
  };
}

// ============================================================================
// USER ROLE MANAGEMENT
// ============================================================================

/**
 * Update user's global role
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
  });
}

/**
 * Update user's role in a specific organization
 */
export async function updateOrganizationRole(
  userId: string,
  organizationId: string,
  newRole: UserRole
): Promise<void> {
  await prisma.organizationMembership.updateMany({
    where: {
      userId,
      organizationId,
    },
    data: {
      role: newRole,
    },
  });
}

/**
 * Add user to organization
 */
export async function addUserToOrganization(
  userId: string,
  organizationId: string,
  role: UserRole = 'VIEWER'
): Promise<void> {
  // Check if membership already exists
  const existing = await prisma.organizationMembership.findFirst({
    where: {
      userId,
      organizationId,
    },
  });

  if (existing) {
    throw new Error('User is already a member of this organization');
  }

  await prisma.organizationMembership.create({
    data: {
      userId,
      organizationId,
      role,
    },
  });
}

/**
 * Remove user from organization
 */
export async function removeUserFromOrganization(
  userId: string,
  organizationId: string
): Promise<void> {
  // Check if user is the last owner
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      members: {
        where: { role: 'OWNER' },
      },
    },
  });

  if (!organization) {
    throw new Error('Organization not found');
  }

  const userMembership = organization.members.find((m: any) => m.userId === userId);
  if (userMembership && userMembership.role === 'OWNER' && organization.members.length === 1) {
    throw new Error('Cannot remove the last owner from an organization');
  }

  await prisma.organizationMembership.deleteMany({
    where: {
      userId,
      organizationId,
    },
  });
}

// ============================================================================
// USER ACTIVITY TRACKING
// ============================================================================

/**
 * Get recent activity for a user
 */
export async function getUserActivity(
  userId: string,
  limit: number = 50
): Promise<UserActivityLog> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Fetch recent activities from various sources
  const [sessions, assessments, responses, goals] = await Promise.all([
    prisma.session.findMany({
      where: { userId },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.assessment.findMany({
      where: { createdBy: userId },
      select: {
        id: true,
        status: true,
        createdAt: true,
        finalizedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.response.findMany({
      where: { userId },
      select: {
        id: true,
        createdAt: true,
        assessment: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.progressGoal.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
  ]);

  // Combine and sort all activities
  const activities: Array<{
    type: 'LOGIN' | 'ASSESSMENT_CREATED' | 'ASSESSMENT_FINALIZED' | 'RESPONSE_SUBMITTED' | 'GOAL_CREATED';
    timestamp: Date;
    details?: string;
  }> = [];

  // Add login activities
  sessions.forEach((session: any) => {
    activities.push({
      type: 'LOGIN',
      timestamp: session.createdAt,
    });
  });

  // Add assessment activities
  assessments.forEach((assessment: any) => {
    activities.push({
      type: 'ASSESSMENT_CREATED',
      timestamp: assessment.createdAt,
      details: `Assessment ${assessment.id.substring(0, 8)}`,
    });

    if (assessment.finalizedAt) {
      activities.push({
        type: 'ASSESSMENT_FINALIZED',
        timestamp: assessment.finalizedAt,
        details: `Assessment ${assessment.id.substring(0, 8)}`,
      });
    }
  });

  // Add response activities
  responses.forEach((response: any) => {
    activities.push({
      type: 'RESPONSE_SUBMITTED',
      timestamp: response.createdAt,
      details: `Assessment ${response.assessment.id.substring(0, 8)}`,
    });
  });

  // Add goal activities
  goals.forEach((goal: any) => {
    activities.push({
      type: 'GOAL_CREATED',
      timestamp: goal.createdAt,
      details: goal.title,
    });
  });

  // Sort by timestamp descending and limit
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const limitedActivities = activities.slice(0, limit);

  return {
    userId,
    userName: user.name || '',
    email: user.email,
    activities: limitedActivities,
  };
}

/**
 * Get most active users
 */
export async function getMostActiveUsers(
  limit: number = 10,
  timeframe: 'week' | 'month' | 'all' = 'month'
): Promise<Array<{
  userId: string;
  userName: string;
  email: string;
  activityScore: number;
  assessmentsCreated: number;
  responsesSubmitted: number;
  lastActivityAt: Date;
}>> {
  const now = new Date();
  let startDate: Date | undefined;

  if (timeframe === 'week') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (timeframe === 'month') {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // Fetch users with their activity counts
  const users = await prisma.user.findMany({
    where: startDate ? {
      OR: [
        { assessments: { some: { createdAt: { gte: startDate } } } },
        { responses: { some: { createdAt: { gte: startDate } } } },
        { sessions: { some: { createdAt: { gte: startDate } } } },
      ],
    } : undefined,
    include: {
      assessments: {
        where: startDate ? { createdAt: { gte: startDate } } : undefined,
        select: { id: true, createdAt: true },
      },
      responses: {
        where: startDate ? { createdAt: { gte: startDate } } : undefined,
        select: { id: true, createdAt: true },
      },
      sessions: {
        where: startDate ? { createdAt: { gte: startDate } } : undefined,
        select: { createdAt: true },
      },
    },
    take: 100, // Get top 100 candidates
  });

  // Calculate activity scores
  const userScores = users.map((user: any) => {
    const assessmentsCreated = user.assessments.length;
    const responsesSubmitted = user.responses.length;
    const logins = user.sessions.length;

    // Activity score: weighted sum
    // Assessments are most valuable, then responses, then logins
    const activityScore = (assessmentsCreated * 10) + (responsesSubmitted * 5) + logins;

    // Find most recent activity
    const activityDates = [
      ...user.assessments.map((a: any) => a.createdAt),
      ...user.responses.map((r: any) => r.createdAt),
      ...user.sessions.map((s: any) => s.createdAt),
    ];

    const lastActivityAt = activityDates.length > 0
      ? new Date(Math.max(...activityDates.map((d: Date) => d.getTime())))
      : new Date(0);

    return {
      userId: user.id,
      userName: user.name || 'Unknown',
      email: user.email,
      activityScore,
      assessmentsCreated,
      responsesSubmitted,
      lastActivityAt,
    };
  });

  // Sort by activity score and take top N
  return userScores
    .sort((a: any, b: any) => b.activityScore - a.activityScore)
    .slice(0, limit);
}

// ============================================================================
// USER DELETION AND DEACTIVATION
// ============================================================================

/**
 * Soft delete user (mark as inactive)
 */
export async function deactivateUser(userId: string): Promise<void> {
  // For now, we'll just update the user's email to mark them as deactivated
  // In a full implementation, you'd add a 'status' or 'isActive' field
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Check if user owns any organizations
  const ownerships = await prisma.organizationMembership.findMany({
    where: {
      userId,
      role: 'OWNER',
    },
    include: {
      organization: {
        include: {
          members: {
            where: { role: 'OWNER' },
          },
        },
      },
    },
  });

  // Check if user is the sole owner of any organization
  const soleOwnerships = ownerships.filter(
    (om: any) => om.organization.members.length === 1
  );

  if (soleOwnerships.length > 0) {
    throw new Error(
      'User is the sole owner of one or more organizations. Transfer ownership before deactivating.'
    );
  }

  // Mark email as deactivated (append timestamp)
  await prisma.user.update({
    where: { id: userId },
    data: {
      email: `${user.email}.deactivated.${Date.now()}`,
    },
  });
}

/**
 * Permanently delete user and all associated data
 * WARNING: This is irreversible!
 */
export async function deleteUserPermanently(userId: string): Promise<void> {
  // Check if user is sole owner of any organizations
  const ownerships = await prisma.organizationMembership.findMany({
    where: {
      userId,
      role: 'OWNER',
    },
    include: {
      organization: {
        include: {
          members: {
            where: { role: 'OWNER' },
          },
        },
      },
    },
  });

  const soleOwnerships = ownerships.filter(
    (om: any) => om.organization.members.length === 1
  );

  if (soleOwnerships.length > 0) {
    throw new Error(
      'User is the sole owner of one or more organizations. Delete organizations or transfer ownership first.'
    );
  }

  // Delete user (cascading deletes will handle related records)
  await prisma.user.delete({
    where: { id: userId },
  });
}

/**
 * Get list of inactive users (haven't logged in for X days)
 */
export async function getInactiveUsers(
  daysSinceLastLogin: number = 90
): Promise<Array<{
  userId: string;
  email: string;
  name: string | null;
  lastLoginAt: Date | null;
  daysSinceLogin: number | null;
  organizationCount: number;
}>> {
  const cutoffDate = new Date(Date.now() - daysSinceLastLogin * 24 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { lastLoginAt: { lt: cutoffDate } },
        { lastLoginAt: null },
      ],
    },
    include: {
      organizationMemberships: {
        select: {
          organizationId: true,
        },
      },
    },
    orderBy: {
      lastLoginAt: 'asc',
    },
  });

  return users.map((user: any) => {
    const daysSinceLogin = user.lastLoginAt
      ? Math.floor((Date.now() - user.lastLoginAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      lastLoginAt: user.lastLoginAt,
      daysSinceLogin,
      organizationCount: user.organizationMemberships.length,
    };
  });
}
