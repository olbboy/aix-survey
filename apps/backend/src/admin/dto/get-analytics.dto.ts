import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum AnalyticsType {
  ALL = 'all',
  STATISTICS = 'statistics',
  USAGE = 'usage',
  PERFORMANCE = 'performance',
}

export class GetAnalyticsDto {
  @ApiProperty({
    description: 'Type of analytics data to retrieve',
    enum: AnalyticsType,
    default: AnalyticsType.ALL,
    required: false,
  })
  @IsOptional()
  @IsString()
  type?: string = AnalyticsType.ALL;

  @ApiProperty({
    description: 'Number of days for usage metrics',
    default: 30,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number = 30;
}
