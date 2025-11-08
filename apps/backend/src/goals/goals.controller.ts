import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GoalsService } from './goals.service';
import { CreateGoalDto, UpdateGoalDto, CheckProgressDto } from './dto';

/**
 * Goals Controller
 * Handles HTTP requests for goal management
 *
 * All routes are protected by JWT authentication
 */
@ApiTags('goals')
@Controller('goals')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all goals',
    description: 'Retrieve all goals accessible to the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Goals retrieved successfully',
  })
  async findAll(@CurrentUser() user: any) {
    return this.goalsService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get goal by ID',
    description: 'Retrieve a specific goal with progress calculation',
  })
  @ApiParam({ name: 'id', description: 'Goal UUID' })
  @ApiResponse({
    status: 200,
    description: 'Goal found',
  })
  @ApiResponse({
    status: 404,
    description: 'Goal not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to access this goal',
  })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.goalsService.findOne(id, user.id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new goal',
    description: 'Create a new progress goal for an organization',
  })
  @ApiResponse({
    status: 201,
    description: 'Goal created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to create goals for this organization',
  })
  async create(@Body() createGoalDto: CreateGoalDto, @CurrentUser() user: any) {
    return this.goalsService.create(createGoalDto, user.id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a goal',
    description: 'Update an existing goal',
  })
  @ApiParam({ name: 'id', description: 'Goal UUID' })
  @ApiResponse({
    status: 200,
    description: 'Goal updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Goal not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to update this goal',
  })
  async update(
    @Param('id') id: string,
    @Body() updateGoalDto: UpdateGoalDto,
    @CurrentUser() user: any
  ) {
    return this.goalsService.update(id, updateGoalDto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a goal',
    description: 'Delete an existing goal',
  })
  @ApiParam({ name: 'id', description: 'Goal UUID' })
  @ApiResponse({
    status: 204,
    description: 'Goal deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Goal not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to delete this goal',
  })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    await this.goalsService.delete(id, user.id);
  }

  @Post('check-progress')
  @ApiOperation({
    summary: 'Check goal progress',
    description:
      'Check and update goal progress based on latest assessment results',
  })
  @ApiResponse({
    status: 200,
    description: 'Progress checked successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to check progress for this organization',
  })
  @ApiResponse({
    status: 404,
    description: 'Assessment not found',
  })
  async checkProgress(
    @Body() checkProgressDto: CheckProgressDto,
    @CurrentUser() user: any
  ) {
    return this.goalsService.checkProgress(checkProgressDto, user.id);
  }
}
