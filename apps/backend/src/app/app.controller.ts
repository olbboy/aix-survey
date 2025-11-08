import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get('health')
  @ApiOperation({
    summary: 'Health check endpoint',
    description: 'Returns the health status of the backend service'
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2025-11-08T10:00:00.000Z',
        uptime: 3600,
        database: 'connected',
        version: '1.0.0'
      }
    }
  })
  getHealth() {
    return this.appService.getHealth();
  }

  @Public()
  @Get('status')
  @ApiOperation({
    summary: 'Service status',
    description: 'Returns detailed service status information'
  })
  @ApiResponse({ status: 200, description: 'Service status information' })
  getStatus() {
    return this.appService.getStatus();
  }
}
