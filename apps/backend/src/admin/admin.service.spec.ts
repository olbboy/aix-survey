import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '@aix-survey/database';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: PrismaService;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    organization: {
      count: jest.fn(),
    },
    assessment: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    goal: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    errorLog: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      groupBy: jest.fn(),
    },
    auditLog: {
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    systemAlert: {
      findMany: jest.fn(),
    },
    assessmentTemplate: {
      count: jest.fn(),
    },
    domain: {
      count: jest.fn(),
    },
    item: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSystemHealth', () => {
    it('should return database metrics when type=database', async () => {
      mockPrismaService.user.count.mockResolvedValue(100);
      mockPrismaService.organization.count.mockResolvedValue(50);
      mockPrismaService.assessment.count.mockResolvedValue(200);

      const result = await service.getSystemHealth({ type: 'database' as any });

      expect(result).toHaveProperty('database');
      expect(result.database).toEqual({
        users: 100,
        organizations: 50,
        assessments: 200,
        connectionStatus: 'connected',
      });
    });

    it('should return resources when type=resources', async () => {
      const result = await service.getSystemHealth({ type: 'resources' as any });

      expect(result).toHaveProperty('resources');
      expect(result.resources).toHaveProperty('cpu');
      expect(result.resources).toHaveProperty('memory');
      expect(result.resources).toHaveProperty('disk');
    });

    it('should return alerts when type=alerts', async () => {
      const mockAlerts = [{ id: 'alert-1', level: 'WARNING', resolved: false }];
      mockPrismaService.systemAlert.findMany.mockResolvedValue(mockAlerts);

      const result = await service.getSystemHealth({ type: 'alerts' as any });

      expect(result).toHaveProperty('alerts');
      expect(result.alerts).toEqual(mockAlerts);
    });

    it('should return comprehensive health data by default', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ healthy: 1 }]);
      mockPrismaService.user.count.mockResolvedValue(100);
      mockPrismaService.organization.count.mockResolvedValue(50);
      mockPrismaService.assessment.count.mockResolvedValue(200);
      mockPrismaService.systemAlert.findMany.mockResolvedValue([]);

      const result = await service.getSystemHealth({});

      expect(result).toHaveProperty('health');
      expect(result).toHaveProperty('database');
      expect(result).toHaveProperty('resources');
      expect(result).toHaveProperty('alerts');
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('listUsers', () => {
    it('should return user statistics when type=statistics', async () => {
      mockPrismaService.user.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80) // active
        .mockResolvedValueOnce(15) // inactive
        .mockResolvedValueOnce(5); // admin

      const result = await service.listUsers({ type: 'statistics' as any });

      expect(result).toHaveProperty('statistics');
      expect(result.statistics).toEqual({
        total: 100,
        active: 80,
        inactive: 15,
        admin: 5,
      });
    });

    it('should return most active users when type=most-active', async () => {
      const result = await service.listUsers({
        type: 'most-active' as any,
        limit: 10,
        timeframe: 'month' as any,
      });

      expect(result).toHaveProperty('users');
      expect(Array.isArray(result.users)).toBe(true);
    });

    it('should return inactive users when type=inactive', async () => {
      const mockUsers = [
        { id: 'user-1', email: 'user1@test.com', lastLoginAt: new Date('2024-01-01') },
      ];
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.listUsers({ type: 'inactive' as any, days: 90 });

      expect(result).toHaveProperty('users');
      expect(result.users).toEqual(mockUsers);
    });

    it('should return paginated user list with filters', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'admin@test.com',
          name: 'Admin User',
          role: 'ADMIN',
          status: 'ACTIVE',
          _count: { organizations: 2, assessments: 5 },
        },
      ];
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.user.count.mockResolvedValue(1);

      const result = await service.listUsers({
        role: 'ADMIN',
        page: 1,
        pageSize: 20,
      });

      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('pagination');
      expect(result.users).toEqual(mockUsers);
      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      });
    });
  });

  describe('getUserDetails', () => {
    it('should return user details without activity', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@test.com',
        name: 'Test User',
        role: 'USER',
        organizations: [],
        assessments: [],
        _count: { organizations: 1, assessments: 3, goals: 2 },
      };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserDetails('user-1', {});

      expect(result).toHaveProperty('user');
      expect(result.user).toEqual(mockUser);
      expect(result).not.toHaveProperty('activity');
    });

    it('should return user details with activity when include=activity', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@test.com',
        name: 'Test User',
        role: 'USER',
        organizations: [],
        assessments: [],
        _count: { organizations: 1, assessments: 3, goals: 2 },
      };
      const mockAssessments = [{ id: 'assess-1', status: 'COMPLETED' }];
      const mockGoals = [{ id: 'goal-1', title: 'Test Goal', status: 'IN_PROGRESS' }];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.assessment.findMany.mockResolvedValue(mockAssessments);
      mockPrismaService.goal.findMany.mockResolvedValue(mockGoals);

      const result = await service.getUserDetails('user-1', { include: 'activity', limit: 50 });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('activity');
      expect(result.activity).toHaveProperty('assessments');
      expect(result.activity).toHaveProperty('goals');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserDetails('invalid-id', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUser', () => {
    it('should update user role successfully', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@test.com',
        role: 'ADMIN',
        organizations: [],
      };
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.updateUser('user-1', { role: 'ADMIN' });

      expect(result).toHaveProperty('user');
      expect(result.user.role).toBe('ADMIN');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { role: 'ADMIN' },
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
    });

    it('should throw NotFoundException when user not found during update', async () => {
      mockPrismaService.user.update.mockRejectedValue(new Error('Record not found'));

      await expect(service.updateUser('invalid-id', { role: 'ADMIN' })).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('deleteUser', () => {
    it('should permanently delete user when permanent=true', async () => {
      mockPrismaService.user.delete.mockResolvedValue({ id: 'user-1' });

      const result = await service.deleteUser('user-1', { permanent: true });

      expect(result).toEqual({
        success: true,
        message: 'User permanently deleted',
      });
      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should deactivate user when permanent=false', async () => {
      mockPrismaService.user.update.mockResolvedValue({ id: 'user-1', status: 'INACTIVE' });

      const result = await service.deleteUser('user-1', { permanent: false });

      expect(result).toEqual({
        success: true,
        message: 'User deactivated',
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { status: 'INACTIVE' },
      });
    });

    it('should throw NotFoundException when user not found during delete', async () => {
      mockPrismaService.user.delete.mockRejectedValue(new Error('Record not found'));

      await expect(service.deleteUser('invalid-id', { permanent: true })).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getAnalytics', () => {
    it('should return statistics when type=statistics', async () => {
      mockPrismaService.user.count.mockResolvedValue(100);
      mockPrismaService.organization.count.mockResolvedValue(50);
      mockPrismaService.assessment.count.mockResolvedValue(200);
      mockPrismaService.goal.count.mockResolvedValue(75);

      const result = await service.getAnalytics({ type: 'statistics' });

      expect(result).toHaveProperty('statistics');
      expect(result.statistics).toEqual({
        users: 100,
        organizations: 50,
        assessments: 200,
        goals: 75,
      });
    });

    it('should return usage metrics when type=usage', async () => {
      mockPrismaService.user.count.mockResolvedValue(10);
      mockPrismaService.assessment.count.mockResolvedValue(50);
      mockPrismaService.goal.count.mockResolvedValue(20);

      const result = await service.getAnalytics({ type: 'usage', days: 30 });

      expect(result).toHaveProperty('usage');
      expect(result.usage.timeframe).toBe('30 days');
      expect(result.usage.newUsers).toBe(10);
    });

    it('should return performance metrics when type=performance', async () => {
      const result = await service.getAnalytics({ type: 'performance' });

      expect(result).toHaveProperty('performance');
      expect(result.performance).toHaveProperty('averageResponseTime');
      expect(result.performance).toHaveProperty('requestsPerSecond');
      expect(result.performance).toHaveProperty('errorRate');
    });

    it('should return all analytics data by default', async () => {
      mockPrismaService.user.count.mockResolvedValue(100);
      mockPrismaService.organization.count.mockResolvedValue(50);
      mockPrismaService.assessment.count.mockResolvedValue(200);
      mockPrismaService.goal.count.mockResolvedValue(75);

      const result = await service.getAnalytics({ type: 'all', days: 30 });

      expect(result).toHaveProperty('statistics');
      expect(result).toHaveProperty('usage');
      expect(result).toHaveProperty('performance');
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('getErrors', () => {
    it('should return error statistics when type=statistics', async () => {
      mockPrismaService.errorLog.count.mockResolvedValue(100);
      mockPrismaService.errorLog.groupBy.mockResolvedValue([
        { type: 'DATABASE_ERROR', _count: 50 },
        { type: 'VALIDATION_ERROR', _count: 30 },
      ]);

      const result = await service.getErrors({ type: 'statistics' });

      expect(result).toHaveProperty('statistics');
      expect(result.statistics.total).toBe(100);
      expect(result.statistics.byType).toHaveLength(2);
    });

    it('should return filtered error logs', async () => {
      const mockErrors = [
        {
          id: 'error-1',
          type: 'DATABASE_ERROR',
          message: 'Connection timeout',
          statusCode: 500,
        },
      ];
      mockPrismaService.errorLog.findMany.mockResolvedValue(mockErrors);

      const result = await service.getErrors({
        errorType: 'DATABASE_ERROR',
        limit: 50,
      });

      expect(result).toHaveProperty('errors');
      expect(result.errors).toEqual(mockErrors);
    });
  });

  describe('logError', () => {
    it('should create error log successfully', async () => {
      mockPrismaService.errorLog.create.mockResolvedValue({ id: 'error-1' });

      const result = await service.logError({
        type: 'VALIDATION_ERROR',
        message: 'Invalid input',
        userId: 'user-1',
      });

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.errorLog.create).toHaveBeenCalledWith({
        data: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid input',
          stack: undefined,
          userId: 'user-1',
          organizationId: undefined,
          requestUrl: undefined,
          requestMethod: undefined,
          statusCode: undefined,
          metadata: undefined,
        },
      });
    });
  });

  describe('getAuditLogs', () => {
    it('should return audit statistics when type=statistics', async () => {
      mockPrismaService.auditLog.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(90) // successful
        .mockResolvedValueOnce(10); // failed
      mockPrismaService.auditLog.groupBy.mockResolvedValue([
        { action: 'USER_UPDATED', _count: 50 },
        { action: 'GOAL_CREATED', _count: 30 },
      ]);

      const result = await service.getAuditLogs({ type: 'statistics' });

      expect(result).toHaveProperty('statistics');
      expect(result.statistics.total).toBe(100);
      expect(result.statistics.successful).toBe(90);
      expect(result.statistics.failed).toBe(10);
    });

    it('should return paginated audit logs with filters', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          action: 'USER_UPDATED',
          resourceType: 'User',
          userId: 'admin-1',
          success: true,
        },
      ];
      mockPrismaService.auditLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.auditLog.count.mockResolvedValue(1);

      const result = await service.getAuditLogs({
        action: 'USER_UPDATED',
        page: 1,
        pageSize: 50,
      });

      expect(result).toHaveProperty('logs');
      expect(result).toHaveProperty('pagination');
      expect(result.logs).toEqual(mockLogs);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('seedDatabase', () => {
    it('should return already seeded message when templates exist', async () => {
      mockPrismaService.assessmentTemplate.count.mockResolvedValue(1);
      mockPrismaService.domain.count.mockResolvedValue(5);
      mockPrismaService.item.count.mockResolvedValue(25);

      const result = await service.seedDatabase();

      expect(result).toEqual({
        message: 'Database already seeded',
        data: {
          templates: 1,
          domains: 5,
          items: 25,
        },
      });
    });

    it('should throw BadRequestException when seed data not available', async () => {
      mockPrismaService.assessmentTemplate.count.mockResolvedValue(0);

      await expect(service.seedDatabase()).rejects.toThrow(BadRequestException);
    });
  });
});
