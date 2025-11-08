import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

/**
 * DTO for triggering benchmark aggregation
 * Admin-only endpoint
 */
export class AggregateBenchmarkDto {
  @ApiPropertyOptional({
    description: 'Industry segment to aggregate (required if aggregateAll is false)',
    example: 'Technology',
  })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({
    description: 'Company size segment to aggregate (required if aggregateAll is false)',
    example: 'Small (1-50)',
  })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({
    description: 'Geographic region to aggregate (optional)',
    example: 'North America',
  })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({
    description: 'Create historical snapshots for trending',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  createSnapshots?: boolean = false;

  @ApiPropertyOptional({
    description: 'Aggregate all segments (ignores industry/size/region if true)',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  aggregateAll?: boolean = false;
}
