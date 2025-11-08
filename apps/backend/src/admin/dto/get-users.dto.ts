import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum UserQueryType {
  STATISTICS = 'statistics',
  MOST_ACTIVE = 'most-active',
  INACTIVE = 'inactive',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum UserTimeframe {
  WEEK = 'week',
  MONTH = 'month',
  ALL = 'all',
}

export class GetUsersDto {
  @ApiProperty({
    description: 'Query type for special queries',
    enum: UserQueryType,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserQueryType)
  type?: UserQueryType;

  @ApiProperty({
    description: 'Filter by user role',
    required: false,
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({
    description: 'Filter by user status',
    enum: UserStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiProperty({
    description: 'Filter by organization ID',
    required: false,
  })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({
    description: 'Search query (email, name)',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Filter users with last login after this date',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  lastLoginAfter?: Date;

  @ApiProperty({
    description: 'Filter users with last login before this date',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  lastLoginBefore?: Date;

  @ApiProperty({
    description: 'Limit for most-active query',
    default: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({
    description: 'Timeframe for most-active query',
    enum: UserTimeframe,
    default: UserTimeframe.MONTH,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserTimeframe)
  timeframe?: UserTimeframe = UserTimeframe.MONTH;

  @ApiProperty({
    description: 'Days of inactivity for inactive query',
    default: 90,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number = 90;

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
    default: 20,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
