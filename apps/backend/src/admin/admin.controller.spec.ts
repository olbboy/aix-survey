import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

describe('AdminController', () => {
  let controller: AdminController;
  let service: AdminService;

  const mockAdminService = {
    getSystemHealth: jest.fn(),
    listUsers: jest.fn(),
    getUserDetails: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    getAnalytics: jest.fn(),
    getErrors: jest.fn(),
    logError: jest.fn(),
    getAuditLogs: jest.fn(),
    seedDatabase: jest.fn(),
  };

  const mockUser = {
    id: 'admin-1',
    email: 'admin@test.com',
    role: 'ADMIN',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: mockAdminService,
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    service = module.get<AdminService>(AdminService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return system health status', async () => {
      const mockHealth = {
        health: { status: 'healthy', timestamp: new Date().toISOString() },
        database: { users: 100, organizations: 50 },
        resources: { cpu: { usage: 45 } },
        alerts: [],
        timestamp: new Date().toISOString(),
      };
      mockAdminService.getSystemHealth.mockResolvedValue(mockHealth);

      const result = await controller.getHealth({}, mockUser);

      expect(result).toEqual(mockHealth);
      expect(mockAdminService.getSystemHealth).toHaveBeenCalledWith({});
    });

    it('should pass query parameters to service', async () => {
      const query = { type: 'database' as any };
      mockAdminService.getSystemHealth.mockResolvedValue({ database: {} });

      await controller.getHealth(query, mockUser);

      expect(mockAdminService.getSystemHealth).toHaveBeenCalledWith(query);
    });
  });

  describe('listUsers', () => {
    it('should return paginated user list', async () => {
      const mockResult = {
        users: [
          {
            id: 'user-1',
            email: 'user@test.com',
            name: 'Test User',
            role: 'USER',
          },
        ],
        pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      };
      mockAdminService.listUsers.mockResolvedValue(mockResult);

      const result = await controller.listUsers({ page: 1, pageSize: 20 }, mockUser);

      expect(result).toEqual(mockResult);
      expect(mockAdminService.listUsers).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
    });

    it('should handle statistics query', async () => {
      const mockStats = {
        statistics: { total: 100, active: 80, inactive: 15, admin: 5 },
      };
      mockAdminService.listUsers.mockResolvedValue(mockStats);

      const result = await controller.listUsers({ type: 'statistics' as any }, mockUser);

      expect(result).toEqual(mockStats);
    });
  });

  describe('getUserDetails', () => {
    it('should return user details', async () => {
      const mockUserDetails = {
        user: {
          id: 'user-1',
          email: 'user@test.com',
          name: 'Test User',
          role: 'USER',
        },
      };
      mockAdminService.getUserDetails.mockResolvedValue(mockUserDetails);

      const result = await controller.getUserDetails('user-1', {}, mockUser);

      expect(result).toEqual(mockUserDetails);
      expect(mockAdminService.getUserDetails).toHaveBeenCalledWith('user-1', {});
    });

    it('should include activity when requested', async () => {
      const mockWithActivity = {
        user: { id: 'user-1' },
        activity: { assessments: [], goals: [] },
      };
      mockAdminService.getUserDetails.mockResolvedValue(mockWithActivity);

      const result = await controller.getUserDetails(
        'user-1',
        { include: 'activity', limit: 50 },
        mockUser
      );

      expect(result).toEqual(mockWithActivity);
      expect(mockAdminService.getUserDetails).toHaveBeenCalledWith('user-1', {
        include: 'activity',
        limit: 50,
      });
    });
  });

  describe('updateUser', () => {
    it('should update user role', async () => {
      const mockUpdated = {
        user: {
          id: 'user-1',
          email: 'user@test.com',
          role: 'ADMIN',
        },
      };
      mockAdminService.updateUser.mockResolvedValue(mockUpdated);

      const result = await controller.updateUser('user-1', { role: 'ADMIN' }, mockUser);

      expect(result).toEqual(mockUpdated);
      expect(mockAdminService.updateUser).toHaveBeenCalledWith('user-1', { role: 'ADMIN' });
    });
  });

  describe('deleteUser', () => {
    it('should deactivate user by default', async () => {
      const mockResponse = {
        success: true,
        message: 'User deactivated',
      };
      mockAdminService.deleteUser.mockResolvedValue(mockResponse);

      const result = await controller.deleteUser('user-1', { permanent: false }, mockUser);

      expect(result).toEqual(mockResponse);
      expect(mockAdminService.deleteUser).toHaveBeenCalledWith('user-1', { permanent: false });
    });

    it('should permanently delete user when permanent=true', async () => {
      const mockResponse = {
        success: true,
        message: 'User permanently deleted',
      };
      mockAdminService.deleteUser.mockResolvedValue(mockResponse);

      const result = await controller.deleteUser('user-1', { permanent: true }, mockUser);

      expect(result).toEqual(mockResponse);
      expect(mockAdminService.deleteUser).toHaveBeenCalledWith('user-1', { permanent: true });
    });
  });

  describe('getAnalytics', () => {
    it('should return all analytics data', async () => {
      const mockAnalytics = {
        statistics: { users: 100, organizations: 50 },
        usage: { timeframe: '30 days', newUsers: 10 },
        performance: { averageResponseTime: 150 },
        timestamp: new Date().toISOString(),
      };
      mockAdminService.getAnalytics.mockResolvedValue(mockAnalytics);

      const result = await controller.getAnalytics({ type: 'all', days: 30 }, mockUser);

      expect(result).toEqual(mockAnalytics);
      expect(mockAdminService.getAnalytics).toHaveBeenCalledWith({ type: 'all', days: 30 });
    });

    it('should return statistics only when type=statistics', async () => {
      const mockStats = {
        statistics: { users: 100, organizations: 50, assessments: 200, goals: 75 },
      };
      mockAdminService.getAnalytics.mockResolvedValue(mockStats);

      const result = await controller.getAnalytics({ type: 'statistics' }, mockUser);

      expect(result).toEqual(mockStats);
    });
  });

  describe('getErrors', () => {
    it('should return error logs', async () => {
      const mockErrors = {
        errors: [
          {
            id: 'error-1',
            type: 'DATABASE_ERROR',
            message: 'Connection timeout',
            statusCode: 500,
          },
        ],
      };
      mockAdminService.getErrors.mockResolvedValue(mockErrors);

      const result = await controller.getErrors({ limit: 50 }, mockUser);

      expect(result).toEqual(mockErrors);
      expect(mockAdminService.getErrors).toHaveBeenCalledWith({ limit: 50 });
    });

    it('should handle error statistics query', async () => {
      const mockStats = {
        statistics: { total: 100, byType: [{ type: 'DATABASE_ERROR', count: 50 }] },
      };
      mockAdminService.getErrors.mockResolvedValue(mockStats);

      const result = await controller.getErrors({ type: 'statistics' }, mockUser);

      expect(result).toEqual(mockStats);
    });
  });

  describe('logError', () => {
    it('should log error manually', async () => {
      const mockResponse = { success: true };
      mockAdminService.logError.mockResolvedValue(mockResponse);

      const errorDto = {
        type: 'VALIDATION_ERROR',
        message: 'Invalid input',
        userId: 'user-1',
      };

      const result = await controller.logError(errorDto, mockUser);

      expect(result).toEqual(mockResponse);
      expect(mockAdminService.logError).toHaveBeenCalledWith(errorDto);
    });
  });

  describe('getAuditLogs', () => {
    it('should return paginated audit logs', async () => {
      const mockLogs = {
        logs: [
          {
            id: 'log-1',
            action: 'USER_UPDATED',
            resourceType: 'User',
            userId: 'admin-1',
            success: true,
          },
        ],
        pagination: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
      };
      mockAdminService.getAuditLogs.mockResolvedValue(mockLogs);

      const result = await controller.getAuditLogs({ page: 1, pageSize: 50 }, mockUser);

      expect(result).toEqual(mockLogs);
      expect(mockAdminService.getAuditLogs).toHaveBeenCalledWith({ page: 1, pageSize: 50 });
    });

    it('should handle audit statistics query', async () => {
      const mockStats = {
        statistics: {
          total: 100,
          successful: 90,
          failed: 10,
          byAction: [{ action: 'USER_UPDATED', count: 50 }],
        },
      };
      mockAdminService.getAuditLogs.mockResolvedValue(mockStats);

      const result = await controller.getAuditLogs({ type: 'statistics' }, mockUser);

      expect(result).toEqual(mockStats);
    });
  });

  describe('seedDatabase', () => {
    it('should seed database successfully', async () => {
      const mockResponse = {
        message: 'Database seeded successfully',
        data: { templates: 1, domains: 5, items: 25 },
      };
      mockAdminService.seedDatabase.mockResolvedValue(mockResponse);

      const result = await controller.seedDatabase(mockUser);

      expect(result).toEqual(mockResponse);
      expect(mockAdminService.seedDatabase).toHaveBeenCalled();
    });

    it('should return already seeded message', async () => {
      const mockResponse = {
        message: 'Database already seeded',
        data: { templates: 1, domains: 5, items: 25 },
      };
      mockAdminService.seedDatabase.mockResolvedValue(mockResponse);

      const result = await controller.seedDatabase(mockUser);

      expect(result).toEqual(mockResponse);
    });
  });

  describe('Swagger metadata', () => {
    it('should have ApiTags decorator', () => {
      const metadata = Reflect.getMetadata('swagger/apiUseTags', AdminController);
      expect(metadata).toEqual(['admin']);
    });

    it('should have ApiBearerAuth decorator', () => {
      const metadata = Reflect.getMetadata('swagger/apiSecurity', AdminController);
      expect(metadata).toBeDefined();
    });
  });
});
