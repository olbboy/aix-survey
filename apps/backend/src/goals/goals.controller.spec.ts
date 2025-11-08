import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { CheckProgressDto } from './dto/check-progress.dto';

describe('GoalsController', () => {
  let controller: GoalsController;
  let service: GoalsService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
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
    progress: {
      currentValue: 60,
      targetValue: 80,
      percentComplete: 75,
      isOnTrack: true,
      daysRemaining: 387,
    },
  };

  const mockGoalsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    markAchieved: jest.fn(),
    cancel: jest.fn(),
    checkProgress: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoalsController],
      providers: [
        {
          provide: GoalsService,
          useValue: mockGoalsService,
        },
      ],
    }).compile();

    controller = module.get<GoalsController>(GoalsController);
    service = module.get<GoalsService>(GoalsService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all goals for authenticated user', async () => {
      const goals = [mockGoal];
      mockGoalsService.findAll.mockResolvedValue(goals);

      const result = await controller.findAll(mockUser as any);

      expect(result).toEqual(goals);
      expect(mockGoalsService.findAll).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return empty array when no goals found', async () => {
      mockGoalsService.findAll.mockResolvedValue([]);

      const result = await controller.findAll(mockUser as any);

      expect(result).toEqual([]);
      expect(mockGoalsService.findAll).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('findOne', () => {
    it('should return a goal by id', async () => {
      mockGoalsService.findOne.mockResolvedValue(mockGoal);

      const result = await controller.findOne(mockGoal.id, mockUser as any);

      expect(result).toEqual(mockGoal);
      expect(mockGoalsService.findOne).toHaveBeenCalledWith(mockGoal.id, mockUser.id);
    });

    it('should throw NotFoundException when goal not found', async () => {
      mockGoalsService.findOne.mockRejectedValue(
        new NotFoundException('Goal with ID nonexistent-id not found')
      );

      await expect(
        controller.findOne('nonexistent-id', mockUser as any)
      ).rejects.toThrow(NotFoundException);
    });

    it('should include progress information in response', async () => {
      mockGoalsService.findOne.mockResolvedValue(mockGoal);

      const result = await controller.findOne(mockGoal.id, mockUser as any);

      expect(result).toHaveProperty('progress');
      expect(result.progress).toHaveProperty('currentValue');
      expect(result.progress).toHaveProperty('targetValue');
      expect(result.progress).toHaveProperty('percentComplete');
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

    it('should create a new goal', async () => {
      mockGoalsService.create.mockResolvedValue(mockGoal);

      const result = await controller.create(createDto, mockUser as any);

      expect(result).toEqual(mockGoal);
      expect(mockGoalsService.create).toHaveBeenCalledWith(createDto, mockUser.id);
    });

    it('should throw ForbiddenException when user not authorized for organization', async () => {
      mockGoalsService.create.mockRejectedValue(
        new ForbiddenException('Not authorized to create goals for this organization')
      );

      await expect(controller.create(createDto, mockUser as any)).rejects.toThrow(
        ForbiddenException
      );
    });

    it('should return goal with calculated progress', async () => {
      mockGoalsService.create.mockResolvedValue(mockGoal);

      const result = await controller.create(createDto, mockUser as any);

      expect(result).toHaveProperty('progress');
      expect(result.progress.percentComplete).toBeDefined();
    });
  });

  describe('update', () => {
    const updateDto: UpdateGoalDto = {
      title: 'Updated goal title',
      targetValue: 90,
    };

    it('should update a goal', async () => {
      const updatedGoal = { ...mockGoal, ...updateDto };
      mockGoalsService.update.mockResolvedValue(updatedGoal);

      const result = await controller.update(mockGoal.id, updateDto, mockUser as any);

      expect(result).toEqual(updatedGoal);
      expect(mockGoalsService.update).toHaveBeenCalledWith(
        mockGoal.id,
        updateDto,
        mockUser.id
      );
    });

    it('should throw NotFoundException when goal not found', async () => {
      mockGoalsService.update.mockRejectedValue(
        new NotFoundException('Goal with ID nonexistent-id not found')
      );

      await expect(
        controller.update('nonexistent-id', updateDto, mockUser as any)
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow partial updates', async () => {
      const partialUpdate = { title: 'Just updating title' };
      const updatedGoal = { ...mockGoal, title: partialUpdate.title };
      mockGoalsService.update.mockResolvedValue(updatedGoal);

      const result = await controller.update(
        mockGoal.id,
        partialUpdate,
        mockUser as any
      );

      expect(result.title).toBe(partialUpdate.title);
      expect(mockGoalsService.update).toHaveBeenCalledWith(
        mockGoal.id,
        partialUpdate,
        mockUser.id
      );
    });
  });

  describe('remove', () => {
    it('should delete a goal', async () => {
      mockGoalsService.delete.mockResolvedValue({ success: true });

      await controller.remove(mockGoal.id, mockUser as any);

      expect(mockGoalsService.delete).toHaveBeenCalledWith(mockGoal.id, mockUser.id);
    });

    it('should throw NotFoundException when goal not found', async () => {
      mockGoalsService.delete.mockRejectedValue(
        new NotFoundException('Goal with ID nonexistent-id not found')
      );

      await expect(
        controller.remove('nonexistent-id', mockUser as any)
      ).rejects.toThrow(NotFoundException);
    });

    it('should return void (204 No Content)', async () => {
      mockGoalsService.delete.mockResolvedValue({ success: true });

      const result = await controller.remove(mockGoal.id, mockUser as any);

      // Controller should not return anything for DELETE (204)
      expect(result).toBeUndefined();
    });
  });

  describe('checkProgress', () => {
    const checkProgressDto: CheckProgressDto = {
      organizationId: 'org-123',
      assessmentId: 'assessment-123',
    };

    const progressResult = {
      checkedGoals: 2,
      achievedGoals: 1,
      updatedGoals: [mockGoal],
    };

    it('should check and update goal progress', async () => {
      mockGoalsService.checkProgress.mockResolvedValue(progressResult);

      const result = await controller.checkProgress(checkProgressDto, mockUser as any);

      expect(result).toEqual(progressResult);
      expect(mockGoalsService.checkProgress).toHaveBeenCalledWith(
        checkProgressDto,
        mockUser.id
      );
    });

    it('should throw ForbiddenException when user not authorized', async () => {
      mockGoalsService.checkProgress.mockRejectedValue(
        new ForbiddenException('Not authorized to check progress for this organization')
      );

      await expect(
        controller.checkProgress(checkProgressDto, mockUser as any)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when assessment not found', async () => {
      mockGoalsService.checkProgress.mockRejectedValue(
        new NotFoundException('Assessment with ID assessment-123 not found')
      );

      await expect(
        controller.checkProgress(checkProgressDto, mockUser as any)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('JWT Authentication', () => {
    it('should require authentication for all endpoints', () => {
      // Verify that controller has @UseGuards(JwtAuthGuard) decorator
      const metadata = Reflect.getMetadata('__guards__', GoalsController);
      expect(metadata).toBeDefined();
    });
  });

  describe('API Documentation', () => {
    it('should have Swagger API tags', () => {
      const metadata = Reflect.getMetadata('swagger/apiUseTags', GoalsController);
      expect(metadata).toBeDefined();
    });
  });
});
