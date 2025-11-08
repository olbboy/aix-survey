import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@aix-survey/database';
import {
  GetHealthDto,
  GetUsersDto,
  GetUserDetailsDto,
  UpdateUserDto,
  DeleteUserDto,
  GetAnalyticsDto,
  GetErrorsDto,
  LogErrorDto,
  GetAuditLogsDto,
} from './dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get system health status
   * Monitors database, resources, and active alerts
   */
  async getSystemHealth(query: GetHealthDto) {
    const { type, level, category } = query;

    try {
      // Database-only metrics
      if (type === 'database') {
        const dbMetrics = await this.getDatabaseMetrics();
        return { database: dbMetrics };
      }

      // System resources
      if (type === 'resources') {
        const resources = await this.getSystemResources();
        return { resources };
      }

      // Active alerts
      if (type === 'alerts') {
        const alerts = await this.getActiveAlerts({ level, category });
        return { alerts };
      }

      // Health check - create alerts if needed
      if (type === 'check') {
        const alerts = await this.checkSystemHealth();
        return { alerts };
      }

      // Comprehensive health data (default)
      const [healthCheck, dbMetrics, resources, alerts] = await Promise.all([
        this.performHealthCheck(),
        this.getDatabaseMetrics(),
        this.getSystemResources(),
        this.getActiveAlerts(),
      ]);

      return {
        health: healthCheck,
        database: dbMetrics,
        resources,
        alerts,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get system health', error);
      throw error;
    }
  }

  /**
   * List users with filtering and pagination
   */
  async listUsers(query: GetUsersDto) {
    const { type, limit, timeframe, days, page, pageSize, ...filters } = query;

    try {
      // User statistics
      if (type === 'statistics') {
        const statistics = await this.getUserStatistics();
        return { statistics };
      }

      // Most active users
      if (type === 'most-active') {
        const activeUsers = await this.getMostActiveUsers(limit!, timeframe!);
        return { users: activeUsers };
      }

      // Inactive users
      if (type === 'inactive') {
        const inactiveUsers = await this.getInactiveUsers(days!);
        return { users: inactiveUsers };
      }

      // Standard user list with filters
      const where: any = {};

      if (filters.role) {
        where.role = filters.role;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.organizationId) {
        where.organizations = {
          some: {
            organizationId: filters.organizationId,
          },
        };
      }

      if (filters.search) {
        where.OR = [
          { email: { contains: filters.search, mode: 'insensitive' } },
          { name: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      if (filters.lastLoginAfter || filters.lastLoginBefore) {
        where.lastLoginAt = {};
        if (filters.lastLoginAfter) {
          where.lastLoginAt.gte = filters.lastLoginAfter;
        }
        if (filters.lastLoginBefore) {
          where.lastLoginAt.lte = filters.lastLoginBefore;
        }
      }

      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          skip: (page! - 1) * pageSize!,
          take: pageSize,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            lastLoginAt: true,
            createdAt: true,
            _count: {
              select: {
                organizations: true,
                assessments: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.user.count({ where }),
      ]);

      return {
        users,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize!),
        },
      };
    } catch (error) {
      this.logger.error('Failed to list users', error);
      throw error;
    }
  }

  /**
   * Get user details with optional activity
   */
  async getUserDetails(userId: string, query: GetUserDetailsDto) {
    const { include, limit } = query;

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          organizations: {
            include: {
              organization: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          assessments: {
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              status: true,
              createdAt: true,
              finalizedAt: true,
            },
          },
          _count: {
            select: {
              organizations: true,
              assessments: true,
              goals: true,
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException(`User ${userId} not found`);
      }

      // Include activity data if requested
      if (include === 'activity') {
        const activity = await this.getUserActivity(userId, limit!);
        return { user, activity };
      }

      return { user };
    } catch (error) {
      this.logger.error(`Failed to get user details for ${userId}`, error);
      throw error;
    }
  }

  /**
   * Update user role
   */
  async updateUser(userId: string, dto: UpdateUserDto) {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { role: dto.role },
        include: {
          organizations: {
            include: {
              organization: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      this.logger.log(`Updated user ${userId} role to ${dto.role}`);
      return { user };
    } catch (error) {
      this.logger.error(`Failed to update user ${userId}`, error);
      throw new NotFoundException(`User ${userId} not found`);
    }
  }

  /**
   * Delete or deactivate user
   */
  async deleteUser(userId: string, query: DeleteUserDto) {
    const { permanent } = query;

    try {
      if (permanent) {
        // Permanent deletion
        await this.prisma.user.delete({
          where: { id: userId },
        });

        this.logger.warn(`Permanently deleted user ${userId}`);
        return {
          success: true,
          message: 'User permanently deleted',
        };
      } else {
        // Soft delete - deactivate
        await this.prisma.user.update({
          where: { id: userId },
          data: { status: 'INACTIVE' },
        });

        this.logger.log(`Deactivated user ${userId}`);
        return {
          success: true,
          message: 'User deactivated',
        };
      }
    } catch (error) {
      this.logger.error(`Failed to delete user ${userId}`, error);
      throw new NotFoundException(`User ${userId} not found`);
    }
  }

  /**
   * Get platform analytics
   */
  async getAnalytics(query: GetAnalyticsDto) {
    const { type, days } = query;

    try {
      // Statistics only
      if (type === 'statistics') {
        const statistics = await this.getPlatformStatistics();
        return { statistics };
      }

      // Usage metrics only
      if (type === 'usage') {
        const usage = await this.getUsageMetrics(days!);
        return { usage };
      }

      // Performance metrics only
      if (type === 'performance') {
        const performance = await this.getPerformanceMetrics();
        return { performance };
      }

      // All analytics data (default)
      const [statistics, usage, performance] = await Promise.all([
        this.getPlatformStatistics(),
        this.getUsageMetrics(days!),
        this.getPerformanceMetrics(),
      ]);

      return {
        statistics,
        usage,
        performance,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to get analytics', error);
      throw error;
    }
  }

  /**
   * Get error logs with filtering
   */
  async getErrors(query: GetErrorsDto) {
    const { type, limit, errorType, userId, statusCode, startDate, endDate } = query;

    try {
      // Error statistics
      if (type === 'statistics') {
        const statistics = await this.getErrorStatistics(startDate, endDate);
        return { statistics };
      }

      // Recent errors with filters
      const where: any = {};

      if (errorType) {
        where.type = errorType;
      }

      if (userId) {
        where.userId = userId;
      }

      if (statusCode) {
        where.statusCode = statusCode;
      }

      if (startDate) {
        where.createdAt = { gte: startDate };
      }

      const errors = await this.prisma.errorLog.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          message: true,
          statusCode: true,
          userId: true,
          organizationId: true,
          requestUrl: true,
          requestMethod: true,
          createdAt: true,
        },
      });

      return { errors };
    } catch (error) {
      this.logger.error('Failed to get errors', error);
      throw error;
    }
  }

  /**
   * Log error manually
   */
  async logError(dto: LogErrorDto) {
    try {
      await this.prisma.errorLog.create({
        data: {
          type: dto.type || 'UNKNOWN',
          message: dto.message,
          stack: dto.stack,
          userId: dto.userId,
          organizationId: dto.organizationId,
          requestUrl: dto.requestUrl,
          requestMethod: dto.requestMethod,
          statusCode: dto.statusCode,
          metadata: dto.metadata,
        },
      });

      this.logger.log(`Logged error: ${dto.type} - ${dto.message}`);
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to log error', error);
      throw error;
    }
  }

  /**
   * Get audit logs with filtering
   */
  async getAuditLogs(query: GetAuditLogsDto) {
    const { type, page, pageSize, ...filters } = query;

    try {
      // Audit statistics
      if (type === 'statistics') {
        const statistics = await this.getAuditLogStatistics(filters.startDate, filters.endDate);
        return { statistics };
      }

      // Standard audit log query
      const where: any = {};

      if (filters.action) {
        where.action = filters.action;
      }

      if (filters.userId) {
        where.userId = filters.userId;
      }

      if (filters.organizationId) {
        where.organizationId = filters.organizationId;
      }

      if (filters.resourceType) {
        where.resourceType = filters.resourceType;
      }

      if (filters.success !== undefined) {
        where.success = filters.success;
      }

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
          where.createdAt.gte = filters.startDate;
        }
        if (filters.endDate) {
          where.createdAt.lte = filters.endDate;
        }
      }

      if (filters.search) {
        where.OR = [
          { action: { contains: filters.search, mode: 'insensitive' } },
          { resourceType: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const [logs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          skip: (page! - 1) * pageSize!,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            action: true,
            resourceType: true,
            resourceId: true,
            userId: true,
            organizationId: true,
            success: true,
            metadata: true,
            createdAt: true,
          },
        }),
        this.prisma.auditLog.count({ where }),
      ]);

      return {
        logs,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize!),
        },
      };
    } catch (error) {
      this.logger.error('Failed to get audit logs', error);
      throw error;
    }
  }

  /**
   * Seed database with assessment data
   */
  async seedDatabase() {
    try {
      // Check if already seeded
      const existingTemplates = await this.prisma.assessmentTemplate.count({
        where: { isActive: true },
      });

      if (existingTemplates > 0) {
        const domainCount = await this.prisma.domain.count();
        const itemCount = await this.prisma.item.count();

        return {
          message: 'Database already seeded',
          data: {
            templates: existingTemplates,
            domains: domainCount,
            items: itemCount,
          },
        };
      }

      // TODO: Import TEMPLATE_VERSION, domains, items from seed data
      // For now, return a placeholder response
      throw new BadRequestException('Seed data not available. Please implement seed data import.');
    } catch (error) {
      this.logger.error('Failed to seed database', error);
      throw error;
    }
  }

  // =================================================================
  // PRIVATE HELPER METHODS
  // =================================================================

  private async performHealthCheck() {
    // Basic health check - database connectivity
    const isDbHealthy = await this.prisma.$queryRaw`SELECT 1 as healthy`;
    return {
      status: isDbHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
    };
  }

  private async getDatabaseMetrics() {
    const [userCount, orgCount, assessmentCount] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.organization.count(),
      this.prisma.assessment.count(),
    ]);

    return {
      users: userCount,
      organizations: orgCount,
      assessments: assessmentCount,
      connectionStatus: 'connected',
    };
  }

  private async getSystemResources() {
    // TODO: Implement system resource monitoring (CPU, memory, disk)
    return {
      cpu: { usage: 0, cores: 1 },
      memory: { used: 0, total: 0, percentage: 0 },
      disk: { used: 0, total: 0, percentage: 0 },
    };
  }

  private async getActiveAlerts(filters?: { level?: string; category?: string }) {
    const where: any = { resolved: false };

    if (filters?.level) {
      where.level = filters.level;
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    const alerts = await this.prisma.systemAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return alerts;
  }

  private async checkSystemHealth() {
    // TODO: Implement health checks and create alerts if needed
    return [];
  }

  private async getUserStatistics() {
    const [total, active, inactive, admin] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { status: 'INACTIVE' } }),
      this.prisma.user.count({ where: { role: 'ADMIN' } }),
    ]);

    return {
      total,
      active,
      inactive,
      admin,
    };
  }

  private async getMostActiveUsers(limit: number, timeframe: string) {
    // TODO: Implement most active users based on timeframe
    return [];
  }

  private async getInactiveUsers(days: number) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { lastLoginAt: { lt: cutoffDate } },
          { lastLoginAt: null },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        lastLoginAt: true,
        createdAt: true,
      },
      take: 100,
      orderBy: { lastLoginAt: 'asc' },
    });

    return users;
  }

  private async getUserActivity(userId: string, limit: number) {
    // Get recent assessments and goals as activity
    const [assessments, goals] = await Promise.all([
      this.prisma.assessment.findMany({
        where: { userId },
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          createdAt: true,
          finalizedAt: true,
        },
      }),
      this.prisma.goal.findMany({
        where: { userId },
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      assessments,
      goals,
    };
  }

  private async getPlatformStatistics() {
    const [users, organizations, assessments, goals] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.organization.count(),
      this.prisma.assessment.count(),
      this.prisma.goal.count(),
    ]);

    return {
      users,
      organizations,
      assessments,
      goals,
    };
  }

  private async getUsageMetrics(days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [recentUsers, recentAssessments, recentGoals] = await Promise.all([
      this.prisma.user.count({
        where: { createdAt: { gte: startDate } },
      }),
      this.prisma.assessment.count({
        where: { createdAt: { gte: startDate } },
      }),
      this.prisma.goal.count({
        where: { createdAt: { gte: startDate } },
      }),
    ]);

    return {
      timeframe: `${days} days`,
      newUsers: recentUsers,
      newAssessments: recentAssessments,
      newGoals: recentGoals,
    };
  }

  private async getPerformanceMetrics() {
    // TODO: Implement performance metrics (response time, throughput, etc.)
    return {
      averageResponseTime: 0,
      requestsPerSecond: 0,
      errorRate: 0,
    };
  }

  private async getErrorStatistics(startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    const [total, byType] = await Promise.all([
      this.prisma.errorLog.count({ where }),
      this.prisma.errorLog.groupBy({
        by: ['type'],
        where,
        _count: true,
      }),
    ]);

    return {
      total,
      byType: byType.map((item) => ({
        type: item.type,
        count: item._count,
      })),
    };
  }

  private async getAuditLogStatistics(startDate?: Date, endDate?: Date) {
    const where: any = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    const [total, successful, failed, byAction] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.count({ where: { ...where, success: true } }),
      this.prisma.auditLog.count({ where: { ...where, success: false } }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: true,
      }),
    ]);

    return {
      total,
      successful,
      failed,
      byAction: byAction.map((item) => ({
        action: item.action,
        count: item._count,
      })),
    };
  }
}
