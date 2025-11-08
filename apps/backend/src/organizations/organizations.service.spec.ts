import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '@aix-survey/database';
import { GoalsService } from '../goals/goals.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let prisma: PrismaService;
  let goalsService: GoalsService;

  const mockPrismaService = {
    organization: {
      findFirst: jest.fn(),
    },
    goal: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    assessment: {
      findMany: jest.fn(),
    },
  };

  const mockGoalsService = {
    findAll: jest.fn(),
    create: jest.fn(),
  };

  const mockOrganization = {
    id: 'org-123',
    name: 'Test Organization',
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: GoalsService,
          useValue: mockGoalsService,
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    prisma = module.get<PrismaService>(PrismaService);
    goalsService = module.get<GoalsService>(GoalsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrganizationGoals', () => {
    it('should return filtered goals with statistics', async () => {
      const goals = [
        { id: 'goal-1', status: 'ACTIVE', priority: 'HIGH' },
        { id: 'goal-2', status: 'ACHIEVED', priority: 'MEDIUM' },
      ];

      mockPrismaService.organization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaService.goal.findMany.mockResolvedValueOnce(goals).mockResolvedValueOnce(goals);

      const result = await service.getOrganizationGoals('org-123', 'user-123', {
        status: 'ACTIVE',
        includeStats: true,
      });

      expect(result.goals).toBeDefined();
      expect(result.statistics).toBeDefined();
      expect(result.statistics.total).toBe(2);
    });

    it('should throw NotFoundException when organization not found', async () => {
      mockPrismaService.organization.findFirst.mockResolvedValue(null);

      await expect(
        service.getOrganizationGoals('org-123', 'user-123', {})
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createOrganizationGoal', () => {
    const createDto = {
      goalType: 'OVERALL_SCORE' as any,
      title: 'Test Goal',
      targetValue: 80,
      targetDate: new Date('2025-12-31'),
    };

    it('should create goal for valid organization', async () => {
      const createdGoal = { id: 'goal-123', ...createDto, organizationId: 'org-123' };
      mockPrismaService.organization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaService.goal.create.mockResolvedValue(createdGoal);

      const result = await service.createOrganizationGoal('org-123', 'user-123', createDto);

      expect(result).toEqual(createdGoal);
    });

    it('should throw BadRequestException for DOMAIN_SCORE without domainCode', async () => {
      mockPrismaService.organization.findFirst.mockResolvedValue(mockOrganization);

      await expect(
        service.createOrganizationGoal('org-123', 'user-123', {
          ...createDto,
          goalType: 'DOMAIN_SCORE' as any,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when organization not found', async () => {
      mockPrismaService.organization.findFirst.mockResolvedValue(null);

      await expect(
        service.createOrganizationGoal('org-123', 'user-123', createDto)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getOrganizationProgress', () => {
    it('should return progress data for organization with assessments', async () => {
      const assessments = [
        {
          id: 'assessment-1',
          organizationId: 'org-123',
          status: 'FINALIZED',
          finalizedAt: new Date('2024-01-01'),
          responses: [{ domainCode: 'TECH', score: 3.5 }],
          snapshot: { overallScore: 60 },
        },
        {
          id: 'assessment-2',
          organizationId: 'org-123',
          status: 'FINALIZED',
          finalizedAt: new Date('2024-06-01'),
          responses: [{ domainCode: 'TECH', score: 4.0 }],
          snapshot: { overallScore: 75 },
        },
      ];

      mockPrismaService.organization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaService.assessment.findMany.mockResolvedValue(assessments);

      const result = await service.getOrganizationProgress('org-123', 'user-123');

      expect(result.progress).toBeDefined();
      expect(result.progress.totalAssessments).toBe(2);
      expect(result.progress.overallImprovement).toBe(15);
      expect(result.domainProgress).toBeDefined();
      expect(result.achievements).toBeDefined();
    });

    it('should throw NotFoundException when no finalized assessments', async () => {
      mockPrismaService.organization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaService.assessment.findMany.mockResolvedValue([]);

      await expect(
        service.getOrganizationProgress('org-123', 'user-123')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when organization not found', async () => {
      mockPrismaService.organization.findFirst.mockResolvedValue(null);

      await expect(
        service.getOrganizationProgress('org-123', 'user-123')
      ).rejects.toThrow(NotFoundException);
    });
  });
});
