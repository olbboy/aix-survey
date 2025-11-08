import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsDate,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

enum GoalType {
  OVERALL_SCORE = 'OVERALL_SCORE',
  MATURITY_LEVEL = 'MATURITY_LEVEL',
  DOMAIN_SCORE = 'DOMAIN_SCORE',
  ITEM_SCORE = 'ITEM_SCORE',
  BENCHMARK_RANK = 'BENCHMARK_RANK',
}

enum GoalPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * DTO for creating a goal for an organization
 * organizationId comes from URL parameter
 */
export class CreateOrganizationGoalDto {
  @ApiProperty({
    description: 'Goal type',
    enum: GoalType,
    example: 'OVERALL_SCORE',
  })
  @IsEnum(GoalType)
  goalType: GoalType;

  @ApiProperty({
    description: 'Goal title',
    maxLength: 200,
    example: 'Reach 80% overall maturity score',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    description: 'Goal description',
    maxLength: 1000,
    example: 'Improve overall AI maturity score to 80% by end of Q4',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Target value to achieve',
    example: 80,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  targetValue: number;

  @ApiProperty({
    description: 'Target date to achieve goal',
    example: '2025-12-31T00:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  targetDate: Date;

  @ApiPropertyOptional({
    description: 'Goal priority',
    enum: GoalPriority,
    example: 'HIGH',
    default: 'MEDIUM',
  })
  @IsOptional()
  @IsEnum(GoalPriority)
  priority?: GoalPriority;

  @ApiPropertyOptional({
    description: 'Domain code (required for DOMAIN_SCORE goals)',
    example: 'TECH',
  })
  @IsOptional()
  @IsString()
  domainCode?: string;

  @ApiPropertyOptional({
    description: 'Item code (required for ITEM_SCORE goals)',
    example: 'ITEM001',
  })
  @IsOptional()
  @IsString()
  itemCode?: string;

  @ApiPropertyOptional({
    description: 'Benchmark ID (required for BENCHMARK_RANK goals)',
    example: 'benchmark-123',
  })
  @IsOptional()
  @IsString()
  benchmarkId?: string;
}
