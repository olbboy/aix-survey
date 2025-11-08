import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { PrismaService } from '@aix-survey/database';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { CheckProgressDto } from './dto/check-progress.dto';

describe('GoalsService', () => {
  let service: GoalsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    goal: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    organization: {
      findFirst: jest.fn(),
    },
    assessment: {
      findUnique: jest.fn(),
    },
    milestone: {
      findMany: jest.fn(),
    },
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  };

  const mockOrganization = {
    id: 'org-123',
    name: 'Test Organization',
  };

  const mockGoal = {
    id: 'goal-123',
    organizationId: 'org-123',
    userId: 'user-123',
    goalType: 'OVERALL_SCORE',
    title: 'Reach 80% maturity',
    description: 'Improve overall score to 80%',
    targetValue: 80,
    currentValue: 60,
    targetDate: new Date('2025-12-31'),
    priority: 'HIGH',
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
    milestones: [],
    organization: mockOrganization,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoalsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<GoalsService>(GoalsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all goals accessible to user', async () => {
      const goals = [mockGoal];
      mockPrismaService.goal.findMany.mockResolvedValue(goals);

      const result = await service.findAll(mockUser.id);

      expect(result).toEqual(goals);
      expect(mockPrismaService.goal.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { userId: mockUser.id },
            { organization: { users: { some: { userId: mockUser.id } } } },
          ],
        },
        include: {
          milestones: { orderBy: { targetDate: 'asc' } },
          organization: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no goals found', async () => {
      mockPrismaService.goal.findMany.mockResolvedValue([]);

      const result = await service.findAll(mockUser.id);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a goal by id with calculated progress', async () => {
      mockPrismaService.goal.findFirst.mockResolvedValue(mockGoal);

      const result = await service.findOne(mockGoal.id, mockUser.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockGoal.id);
      expect(result.progress).toBeDefined();
      expect(result.progress.currentValue).toBe(60);
      expect(result.progress.targetValue).toBe(80);
      expect(result.progress.percentComplete).toBe(75);
      expect(mockPrismaService.goal.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockGoal.id,
          OR: [
            { userId: mockUser.id },
            { organization: { users: { some: { userId: mockUser.id } } } },
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
    });

    it('should throw NotFoundException when goal not found', async () => {
      mockPrismaService.goal.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id', mockUser.id)).rejects.toThrow(
        NotFoundException
      );
      await expect(service.findOne('nonexistent-id', mockUser.id)).rejects.toThrow(
        'Goal with ID nonexistent-id not found'
      );
    });

    it('should throw NotFoundException when user not authorized', async () => {
      mockPrismaService.goal.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockGoal.id, 'unauthorized-user')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should calculate progress correctly when current value is 0', async () => {
      const goalWithZeroProgress = { ...mockGoal, currentValue: 0 };
      mockPrismaService.goal.findFirst.mockResolvedValue(goalWithZeroProgress);

      const result = await service.findOne(mockGoal.id, mockUser.id);

      expect(result.progress.currentValue).toBe(0);
      expect(result.progress.percentComplete).toBe(0);
    });

    it('should cap progress at 100% when exceeded', async () => {
      const goalExceeded = { ...mockGoal, currentValue: 100, targetValue: 80 };
      mockPrismaService.goal.findFirst.mockResolvedValue(goalExceeded);

      const result = await service.findOne(mockGoal.id, mockUser.id);

      expect(result.progress.percentComplete).toBe(100);
    });
  });

  describe('create', () => {
    const createDto: CreateGoalDto = {
      organizationId: 'org-123',
      goalType: 'OVERALL_SCORE' as any,
      title: 'Reach 80% maturity',
      description: 'Improve overall score to 80%',
      targetValue: 80,
      targetDate: new Date('2025-12-31'),
      priority: 'HIGH' as any,
      domainId: null,
      itemId: null,
      benchmarkId: null,
    };

    it('should create a goal with valid organization access', async () => {
      mockPrismaService.organization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaService.goal.create.mockResolvedValue(mockGoal);

      const result = await service.create(createDto, mockUser.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockGoal.id);
      expect(mockPrismaService.organization.findFirst).toHaveBeenCalledWith({
        where: {
          id: createDto.organizationId,
          users: { some: { userId: mockUser.id } },
        },
      });
      expect(mockPrismaService.goal.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          userId: mockUser.id,
          priority: createDto.priority || 'MEDIUM',
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
    });

    it('should throw ForbiddenException when user not member of organization', async () => {
      mockPrismaService.organization.findFirst.mockResolvedValue(null);

      await expect(service.create(createDto, mockUser.id)).rejects.toThrow(
        ForbiddenException
      );
      await expect(service.create(createDto, mockUser.id)).rejects.toThrow(
        'Not authorized to create goals for this organization'
      );
    });

    it('should default priority to MEDIUM if not provided', async () => {
      const dtoWithoutPriority = { ...createDto, priority: undefined };
      mockPrismaService.organization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaService.goal.create.mockResolvedValue(mockGoal);

      await service.create(dtoWithoutPriority as any, mockUser.id);

      expect(mockPrismaService.goal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            priority: 'MEDIUM',
            status: 'ACTIVE',
          }),
        })
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateGoalDto = {
      title: 'Updated goal title',
      targetValue: 90,
    };

    it('should update a goal when user is authorized', async () => {
      const updatedGoal = { ...mockGoal, ...updateDto };
      mockPrismaService.goal.findFirst.mockResolvedValue(mockGoal);
      mockPrismaService.goal.update.mockResolvedValue(updatedGoal);

      const result = await service.update(mockGoal.id, updateDto, mockUser.id);

      expect(result).toBeDefined();
      expect(result.title).toBe(updateDto.title);
      expect(mockPrismaService.goal.update).toHaveBeenCalledWith({
        where: { id: mockGoal.id },
        data: updateDto,
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
    });

    it('should throw NotFoundException when goal not found', async () => {
      mockPrismaService.goal.findFirst.mockResolvedValue(null);

      await expect(
        service.update('nonexistent-id', updateDto, mockUser.id)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user not authorized', async () => {
      mockPrismaService.goal.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockGoal.id, updateDto, 'unauthorized-user')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a goal when user is authorized', async () => {
      mockPrismaService.goal.findFirst.mockResolvedValue(mockGoal);
      mockPrismaService.goal.delete.mockResolvedValue(mockGoal);

      const result = await service.delete(mockGoal.id, mockUser.id);

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.goal.delete).toHaveBeenCalledWith({
        where: { id: mockGoal.id },
      });
    });

    it('should throw NotFoundException when goal not found', async () => {
      mockPrismaService.goal.findFirst.mockResolvedValue(null);

      await expect(service.delete('nonexistent-id', mockUser.id)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw NotFoundException when user not authorized', async () => {
      mockPrismaService.goal.findFirst.mockResolvedValue(null);

      await expect(
        service.delete(mockGoal.id, 'unauthorized-user')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAchieved', () => {
    it('should mark goal as achieved with timestamp', async () => {
      const achievedGoal = {
        ...mockGoal,
        status: 'ACHIEVED',
        achievedValue: 85,
        achievedAt: new Date(),
      };
      mockPrismaService.goal.findFirst.mockResolvedValue(mockGoal);
      mockPrismaService.goal.update.mockResolvedValue(achievedGoal);

      const result = await service.markAchieved(mockGoal.id, 85, mockUser.id);

      expect(result.status).toBe('ACHIEVED');
      expect(result.achievedValue).toBe(85);
      expect(mockPrismaService.goal.update).toHaveBeenCalledWith({
        where: { id: mockGoal.id },
        data: {
          status: 'ACHIEVED',
          achievedValue: 85,
          currentValue: 85,
          achievedAt: expect.any(Date),
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
    });

    it('should throw NotFoundException when goal not found', async () => {
      mockPrismaService.goal.findFirst.mockResolvedValue(null);

      await expect(
        service.markAchieved('nonexistent-id', 85, mockUser.id)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    it('should cancel a goal', async () => {
      const cancelledGoal = { ...mockGoal, status: 'CANCELLED' };
      mockPrismaService.goal.findFirst.mockResolvedValue(mockGoal);
      mockPrismaService.goal.update.mockResolvedValue(cancelledGoal);

      const result = await service.cancel(mockGoal.id, mockUser.id);

      expect(result.status).toBe('CANCELLED');
      expect(mockPrismaService.goal.update).toHaveBeenCalledWith({
        where: { id: mockGoal.id },
        data: { status: 'CANCELLED' },
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
    });

    it('should throw NotFoundException when goal not found', async () => {
      mockPrismaService.goal.findFirst.mockResolvedValue(null);

      await expect(service.cancel('nonexistent-id', mockUser.id)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('checkProgress', () => {
    const checkProgressDto: CheckProgressDto = {
      organizationId: 'org-123',
      assessmentId: 'assessment-123',
    };

    const mockAssessment = {
      id: 'assessment-123',
      organizationId: 'org-123',
      overallScore: 75,
      maturityLevel: 4,
    };

    it('should check progress and update relevant goals', async () => {
      const goals = [
        { ...mockGoal, goalType: 'OVERALL_SCORE', targetValue: 70 },
        { ...mockGoal, id: 'goal-456', goalType: 'MATURITY_LEVEL', targetValue: 5 },
      ];

      mockPrismaService.organization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaService.assessment.findUnique.mockResolvedValue(mockAssessment);
      mockPrismaService.goal.findMany.mockResolvedValue(goals);
      mockPrismaService.goal.update.mockResolvedValue(goals[0]);

      const result = await service.checkProgress(checkProgressDto, mockUser.id);

      expect(result).toBeDefined();
      expect(mockPrismaService.goal.findMany).toHaveBeenCalledWith({
        where: {
          organizationId: checkProgressDto.organizationId,
          status: 'ACTIVE',
        },
      });
    });

    it('should throw ForbiddenException when user not member of organization', async () => {
      mockPrismaService.organization.findFirst.mockResolvedValue(null);

      await expect(
        service.checkProgress(checkProgressDto, mockUser.id)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when assessment not found', async () => {
      mockPrismaService.organization.findFirst.mockResolvedValue(mockOrganization);
      mockPrismaService.assessment.findUnique.mockResolvedValue(null);

      await expect(
        service.checkProgress(checkProgressDto, mockUser.id)
      ).rejects.toThrow(NotFoundException);
    });
  });
});
