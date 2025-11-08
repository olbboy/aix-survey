import { IsOptional, IsString, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GetAuditLogsDto {
  @ApiProperty({
    description: 'Query type (statistics or default list)',
    required: false,
  })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({
    description: 'Filter by audit action',
    required: false,
  })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiProperty({
    description: 'Filter by user ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({
    description: 'Filter by organization ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({
    description: 'Filter by resource type',
    required: false,
  })
  @IsOptional()
  @IsString()
  resourceType?: string;

  @ApiProperty({
    description: 'Filter by success status',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  success?: boolean;

  @ApiProperty({
    description: 'Filter logs after this date',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  startDate?: Date;

  @ApiProperty({
    description: 'Filter logs before this date',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  endDate?: Date;

  @ApiProperty({
    description: 'Search query',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Page number for pagination',
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Page size for pagination',
    default: 50,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number = 50;
}
