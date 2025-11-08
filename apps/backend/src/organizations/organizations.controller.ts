import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { OrganizationsService } from './organizations.service';
import { GetOrganizationGoalsDto, CreateOrganizationGoalDto } from './dto';

@ApiTags('organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  /**
   * Get all goals for an organization with optional filters
   */
  @Get(':id/goals')
  @ApiOperation({
    summary: 'Get organization goals',
    description: 'Retrieve all goals for a specific organization with optional filters',
  })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Goals retrieved successfully',
    schema: {
      example: {
        goals: [
          {
            id: 'goal-123',
            title: 'Reach 80% maturity',
            goalType: 'OVERALL_SCORE',
            targetValue: 80,
            currentValue: 60,
            status: 'ACTIVE',
            priority: 'HIGH',
          },
        ],
        statistics: {
          total: 10,
          active: 5,
          achieved: 3,
          missed: 1,
          cancelled: 1,
          achievementRate: 30,
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Organization not found or access denied' })
  async getOrganizationGoals(
    @Param('id') organizationId: string,
    @CurrentUser() user: any,
    @Query() query: GetOrganizationGoalsDto
  ) {
    return this.organizationsService.getOrganizationGoals(organizationId, user.id, query);
  }

  /**
   * Create a new goal for an organization
   */
  @Post(':id/goals')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create organization goal',
    description: 'Create a new goal for a specific organization',
  })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 201,
    description: 'Goal created successfully',
    schema: {
      example: {
        id: 'goal-123',
        organizationId: 'org-123',
        title: 'Reach 80% maturity',
        goalType: 'OVERALL_SCORE',
        targetValue: 80,
        targetDate: '2025-12-31T00:00:00.000Z',
        priority: 'HIGH',
        status: 'ACTIVE',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid goal data' })
  @ApiResponse({ status: 404, description: 'Organization not found or access denied' })
  async createOrganizationGoal(
    @Param('id') organizationId: string,
    @CurrentUser() user: any,
    @Body() dto: CreateOrganizationGoalDto
  ) {
    return this.organizationsService.createOrganizationGoal(organizationId, user.id, dto);
  }

  /**
   * Get comprehensive progress tracking data for an organization
   */
  @Get(':id/progress')
  @ApiOperation({
    summary: 'Get organization progress',
    description:
      'Retrieve comprehensive progress tracking data including assessment history and domain-level improvements',
  })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Progress data retrieved successfully',
    schema: {
      example: {
        progress: {
          organizationId: 'org-123',
          totalAssessments: 5,
          overallImprovement: 15.5,
          averageImprovementRate: 3.88,
          assessmentFrequency: 30,
          currentScore: 75.5,
          currentLevel: 'Trưởng thành',
        },
        domainProgress: [
          {
            domainCode: 'TECH',
            domainName: 'TECH',
            improvement: 12.5,
            trend: 'improving',
          },
        ],
        achievements: {
          totalAssessments: 5,
          improvementCount: 4,
          consecutiveImprovements: 3,
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found, access denied, or no finalized assessments',
  })
  async getOrganizationProgress(@Param('id') organizationId: string, @CurrentUser() user: any) {
    return this.organizationsService.getOrganizationProgress(organizationId, user.id);
  }
}
