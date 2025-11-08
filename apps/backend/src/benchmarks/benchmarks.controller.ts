import { Controller, Get, Post, Body, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { BenchmarksService } from './benchmarks.service';
import { GetBenchmarkDto, GetTrendsDto, AggregateBenchmarkDto } from './dto';

@ApiTags('benchmarks')
@Controller('benchmarks')
export class BenchmarksController {
  constructor(private readonly benchmarksService: BenchmarksService) {}

  /**
   * Get benchmark data for a specific industry/size/region segment
   * Public endpoint - no authentication required
   */
  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get benchmark data',
    description: 'Retrieve benchmark statistics for a specific industry/size/region segment',
  })
  @ApiQuery({ name: 'industry', required: true, example: 'Technology' })
  @ApiQuery({ name: 'size', required: true, example: 'Small (1-50)' })
  @ApiQuery({ name: 'region', required: false, example: 'North America' })
  @ApiResponse({
    status: 200,
    description: 'Benchmark data retrieved successfully',
    schema: {
      example: {
        domainBenchmarks: [
          {
            domainCode: 'TECH',
            avgScore: 75.5,
            p25: 60,
            p50: 75,
            p75: 88,
            p90: 95,
            sampleSize: 150,
          },
        ],
        itemBenchmarks: [],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'No benchmark data found for this segment' })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  async getBenchmarkData(@Query() query: GetBenchmarkDto) {
    return this.benchmarksService.getBenchmarkData(query);
  }

  /**
   * Get historical benchmark trends
   * Public endpoint - no authentication required
   */
  @Get('trends')
  @Public()
  @ApiOperation({
    summary: 'Get benchmark trends',
    description: 'Retrieve historical benchmark trends for a specific segment',
  })
  @ApiQuery({ name: 'industry', required: true, example: 'Technology' })
  @ApiQuery({ name: 'size', required: true, example: 'Small (1-50)' })
  @ApiQuery({ name: 'region', required: false, example: 'North America' })
  @ApiQuery({
    name: 'months',
    required: false,
    example: 12,
    description: 'Number of months of historical data (1-60)',
  })
  @ApiResponse({
    status: 200,
    description: 'Historical trends retrieved successfully',
    schema: {
      example: {
        industry: 'Technology',
        size: 'Small (1-50)',
        region: 'North America',
        months: 12,
        snapshots: [
          {
            snapshotDate: '2024-01-01',
            domainCode: 'TECH',
            avgScore: 70,
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  async getHistoricalTrends(@Query() query: GetTrendsDto) {
    return this.benchmarksService.getHistoricalTrends(query);
  }

  /**
   * Trigger benchmark aggregation
   * Admin-only endpoint - requires ADMIN role
   */
  @Post('aggregate')
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Aggregate benchmarks',
    description:
      'Trigger benchmark aggregation for all segments or a specific segment. Admin-only endpoint.',
  })
  @ApiResponse({
    status: 200,
    description: 'Benchmarks aggregated successfully',
    schema: {
      example: {
        success: true,
        message: 'All benchmarks aggregated successfully',
        segmentsProcessed: 15,
        duration: 5432,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'No finalized assessments found for segment' })
  async aggregateBenchmarks(@Body() dto: AggregateBenchmarkDto) {
    return this.benchmarksService.aggregateBenchmarks(dto);
  }
}
