import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminService } from './admin.service';
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

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Get system health status
   * GET /admin/health
   */
  @Get('health')
  @ApiOperation({
    summary: 'Get system health status',
    description: 'Monitor system health including database, resources, and active alerts',
  })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved successfully',
    schema: {
      example: {
        health: { status: 'healthy', timestamp: '2025-01-08T00:00:00.000Z' },
        database: { users: 100, organizations: 50, assessments: 200, connectionStatus: 'connected' },
        resources: { cpu: { usage: 45, cores: 4 }, memory: { used: 2048, total: 8192, percentage: 25 } },
        alerts: [],
        timestamp: '2025-01-08T00:00:00.000Z',
      },
    },
  })
  async getHealth(@Query() query: GetHealthDto, @CurrentUser() user: any) {
    return this.adminService.getSystemHealth(query);
  }

  /**
   * List all users with filtering
   * GET /admin/users
   */
  @Get('users')
  @ApiOperation({
    summary: 'List all users',
    description: 'Get all users with optional filtering, pagination, and special queries (statistics, most-active, inactive)',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    schema: {
      example: {
        users: [
          {
            id: 'user-123',
            email: 'user@example.com',
            name: 'John Doe',
            role: 'USER',
            status: 'ACTIVE',
            lastLoginAt: '2025-01-08T00:00:00.000Z',
            createdAt: '2025-01-01T00:00:00.000Z',
            _count: { organizations: 2, assessments: 5 },
          },
        ],
        pagination: { page: 1, pageSize: 20, total: 100, totalPages: 5 },
      },
    },
  })
  async listUsers(@Query() query: GetUsersDto, @CurrentUser() user: any) {
    return this.adminService.listUsers(query);
  }

  /**
   * Get user details
   * GET /admin/users/:id
   */
  @Get('users/:id')
  @ApiOperation({
    summary: 'Get user details',
    description: 'Get detailed information about a specific user, optionally including activity data',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User details retrieved successfully',
    schema: {
      example: {
        user: {
          id: 'user-123',
          email: 'user@example.com',
          name: 'John Doe',
          role: 'USER',
          status: 'ACTIVE',
          lastLoginAt: '2025-01-08T00:00:00.000Z',
          createdAt: '2025-01-01T00:00:00.000Z',
          organizations: [],
          assessments: [],
          _count: { organizations: 2, assessments: 5, goals: 3 },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserDetails(
    @Param('id') userId: string,
    @Query() query: GetUserDetailsDto,
    @CurrentUser() user: any
  ) {
    return this.adminService.getUserDetails(userId, query);
  }

  /**
   * Update user
   * PATCH /admin/users/:id
   */
  @Patch('users/:id')
  @ApiOperation({
    summary: 'Update user',
    description: 'Update user information (currently supports role updates)',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    schema: {
      example: {
        user: {
          id: 'user-123',
          email: 'user@example.com',
          name: 'John Doe',
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(@Param('id') userId: string, @Body() dto: UpdateUserDto, @CurrentUser() user: any) {
    return this.adminService.updateUser(userId, dto);
  }

  /**
   * Delete or deactivate user
   * DELETE /admin/users/:id
   */
  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete or deactivate user',
    description: 'Permanently delete user or deactivate based on permanent query parameter',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User deleted/deactivated successfully',
    schema: {
      example: {
        success: true,
        message: 'User deactivated',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(@Param('id') userId: string, @Query() query: DeleteUserDto, @CurrentUser() user: any) {
    return this.adminService.deleteUser(userId, query);
  }

  /**
   * Get platform analytics
   * GET /admin/analytics
   */
  @Get('analytics')
  @ApiOperation({
    summary: 'Get platform analytics',
    description: 'Retrieve comprehensive platform analytics including statistics, usage, and performance metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'Analytics retrieved successfully',
    schema: {
      example: {
        statistics: { users: 100, organizations: 50, assessments: 200, goals: 75 },
        usage: { timeframe: '30 days', newUsers: 10, newAssessments: 50, newGoals: 20 },
        performance: { averageResponseTime: 150, requestsPerSecond: 100, errorRate: 0.5 },
        timestamp: '2025-01-08T00:00:00.000Z',
      },
    },
  })
  async getAnalytics(@Query() query: GetAnalyticsDto, @CurrentUser() user: any) {
    return this.adminService.getAnalytics(query);
  }

  /**
   * Get error logs
   * GET /admin/errors
   */
  @Get('errors')
  @ApiOperation({
    summary: 'Get error logs',
    description: 'Retrieve error logs with filtering and statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Error logs retrieved successfully',
    schema: {
      example: {
        errors: [
          {
            id: 'error-123',
            type: 'DATABASE_ERROR',
            message: 'Connection timeout',
            statusCode: 500,
            userId: 'user-123',
            organizationId: 'org-123',
            requestUrl: '/api/users',
            requestMethod: 'GET',
            createdAt: '2025-01-08T00:00:00.000Z',
          },
        ],
      },
    },
  })
  async getErrors(@Query() query: GetErrorsDto, @CurrentUser() user: any) {
    return this.adminService.getErrors(query);
  }

  /**
   * Log error manually
   * POST /admin/errors
   */
  @Post('errors')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Log error manually',
    description: 'Manually log an error for tracking and monitoring',
  })
  @ApiResponse({
    status: 201,
    description: 'Error logged successfully',
    schema: {
      example: { success: true },
    },
  })
  async logError(@Body() dto: LogErrorDto, @CurrentUser() user: any) {
    return this.adminService.logError(dto);
  }

  /**
   * Get audit logs
   * GET /admin/audit-logs
   */
  @Get('audit-logs')
  @ApiOperation({
    summary: 'Get audit logs',
    description: 'Retrieve audit logs with filtering, pagination, and statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit logs retrieved successfully',
    schema: {
      example: {
        logs: [
          {
            id: 'log-123',
            action: 'USER_UPDATED',
            resourceType: 'User',
            resourceId: 'user-123',
            userId: 'admin-123',
            organizationId: 'org-123',
            success: true,
            metadata: {},
            createdAt: '2025-01-08T00:00:00.000Z',
          },
        ],
        pagination: { page: 1, pageSize: 50, total: 200, totalPages: 4 },
      },
    },
  })
  async getAuditLogs(@Query() query: GetAuditLogsDto, @CurrentUser() user: any) {
    return this.adminService.getAuditLogs(query);
  }

  /**
   * Seed database
   * POST /admin/seed
   */
  @Post('seed')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Seed database',
    description: 'Seed the database with initial assessment templates, domains, and items',
  })
  @ApiResponse({
    status: 201,
    description: 'Database seeded successfully',
    schema: {
      example: {
        message: 'Database seeded successfully',
        data: { templates: 1, domains: 5, items: 25 },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Database already seeded',
    schema: {
      example: {
        message: 'Database already seeded',
        data: { templates: 1, domains: 5, items: 25 },
      },
    },
  })
  async seedDatabase(@CurrentUser() user: any) {
    return this.adminService.seedDatabase();
  }
}
