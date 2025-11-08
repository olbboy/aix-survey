import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

enum GoalStatus {
  ACTIVE = 'ACTIVE',
  ACHIEVED = 'ACHIEVED',
  MISSED = 'MISSED',
  CANCELLED = 'CANCELLED',
}

enum GoalPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

enum GoalType {
  OVERALL_SCORE = 'OVERALL_SCORE',
  MATURITY_LEVEL = 'MATURITY_LEVEL',
  DOMAIN_SCORE = 'DOMAIN_SCORE',
  ITEM_SCORE = 'ITEM_SCORE',
  BENCHMARK_RANK = 'BENCHMARK_RANK',
}

/**
 * DTO for getting organization goals with optional filters
 */
export class GetOrganizationGoalsDto {
  @ApiPropertyOptional({
    description: 'Filter by goal status',
    enum: GoalStatus,
    example: 'ACTIVE',
  })
  @IsOptional()
  @IsEnum(GoalStatus)
  status?: GoalStatus;

  @ApiPropertyOptional({
    description: 'Filter by goal priority',
    enum: GoalPriority,
    example: 'HIGH',
  })
  @IsOptional()
  @IsEnum(GoalPriority)
  priority?: GoalPriority;

  @ApiPropertyOptional({
    description: 'Filter by goal type',
    enum: GoalType,
    example: 'OVERALL_SCORE',
  })
  @IsOptional()
  @IsEnum(GoalType)
  goalType?: GoalType;

  @ApiPropertyOptional({
    description: 'Include goal statistics in response',
    example: false,
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeStats?: boolean = false;
}
