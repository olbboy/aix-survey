import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsController', () => {
  let controller: OrganizationsController;
  let service: OrganizationsService;

  const mockOrganizationsService = {
    getOrganizationGoals: jest.fn(),
    createOrganizationGoal: jest.fn(),
    getOrganizationProgress: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [
        {
          provide: OrganizationsService,
          useValue: mockOrganizationsService,
        },
      ],
    }).compile();

    controller = module.get<OrganizationsController>(OrganizationsController);
    service = module.get<OrganizationsService>(OrganizationsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getOrganizationGoals', () => {
    it('should return goals with statistics', async () => {
      const mockResult = {
        goals: [{ id: 'goal-1', title: 'Test Goal' }],
        statistics: { total: 1, active: 1 },
      };
      mockOrganizationsService.getOrganizationGoals.mockResolvedValue(mockResult);

      const result = await controller.getOrganizationGoals('org-123', mockUser as any, {
        includeStats: true,
      });

      expect(result).toEqual(mockResult);
      expect(mockOrganizationsService.getOrganizationGoals).toHaveBeenCalledWith(
        'org-123',
        mockUser.id,
        { includeStats: true }
      );
    });

    it('should handle filter parameters', async () => {
      mockOrganizationsService.getOrganizationGoals.mockResolvedValue({ goals: [] });

      await controller.getOrganizationGoals('org-123', mockUser as any, {
        status: 'ACTIVE' as any,
        priority: 'HIGH' as any,
      });

      expect(mockOrganizationsService.getOrganizationGoals).toHaveBeenCalledWith(
        'org-123',
        mockUser.id,
        { status: 'ACTIVE', priority: 'HIGH' }
      );
    });
  });

  describe('createOrganizationGoal', () => {
    const createDto = {
      goalType: 'OVERALL_SCORE' as any,
      title: 'Test Goal',
      targetValue: 80,
      targetDate: new Date('2025-12-31'),
    };

    it('should create goal successfully', async () => {
      const createdGoal = { id: 'goal-123', ...createDto };
      mockOrganizationsService.createOrganizationGoal.mockResolvedValue(createdGoal);

      const result = await controller.createOrganizationGoal('org-123', mockUser as any, createDto);

      expect(result).toEqual(createdGoal);
      expect(mockOrganizationsService.createOrganizationGoal).toHaveBeenCalledWith(
        'org-123',
        mockUser.id,
        createDto
      );
    });

    it('should throw BadRequestException for invalid goal type data', async () => {
      mockOrganizationsService.createOrganizationGoal.mockRejectedValue(
        new BadRequestException('domainCode is required for DOMAIN_SCORE goals')
      );

      await expect(
        controller.createOrganizationGoal('org-123', mockUser as any, {
          ...createDto,
          goalType: 'DOMAIN_SCORE' as any,
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getOrganizationProgress', () => {
    it('should return comprehensive progress data', async () => {
      const mockProgress = {
        progress: {
          organizationId: 'org-123',
          totalAssessments: 5,
          overallImprovement: 15.5,
          currentScore: 75.5,
          currentLevel: 'Trưởng thành',
        },
        domainProgress: [
          { domainCode: 'TECH', improvement: 10, trend: 'improving' },
        ],
        achievements: {
          totalAssessments: 5,
          improvementCount: 4,
        },
      };

      mockOrganizationsService.getOrganizationProgress.mockResolvedValue(mockProgress);

      const result = await controller.getOrganizationProgress('org-123', mockUser as any);

      expect(result).toEqual(mockProgress);
      expect(mockOrganizationsService.getOrganizationProgress).toHaveBeenCalledWith(
        'org-123',
        mockUser.id
      );
    });

    it('should throw NotFoundException when no assessments', async () => {
      mockOrganizationsService.getOrganizationProgress.mockRejectedValue(
        new NotFoundException('No finalized assessments found')
      );

      await expect(
        controller.getOrganizationProgress('org-123', mockUser as any)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Authentication & Authorization', () => {
    it('should require JWT authentication', () => {
      const metadata = Reflect.getMetadata('__guards__', OrganizationsController);
      expect(metadata).toBeDefined();
    });
  });

  describe('API Documentation', () => {
    it('should have Swagger API tags', () => {
      const metadata = Reflect.getMetadata('swagger/apiUseTags', OrganizationsController);
      expect(metadata).toBeDefined();
    });
  });
});
