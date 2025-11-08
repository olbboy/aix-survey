import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDate,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum GoalType {
  OVERALL_SCORE = 'OVERALL_SCORE',
  MATURITY_LEVEL = 'MATURITY_LEVEL',
  DOMAIN_SCORE = 'DOMAIN_SCORE',
  ITEM_SCORE = 'ITEM_SCORE',
  BENCHMARK_RANK = 'BENCHMARK_RANK',
}

export enum GoalPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export class CreateGoalDto {
  @ApiProperty({ description: 'Organization ID' })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ description: 'Goal type', enum: GoalType })
  @IsEnum(GoalType)
  goalType: GoalType;

  @ApiProperty({ description: 'Goal title', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ description: 'Goal description', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: 'Target value to achieve' })
  @IsNumber()
  @Min(0)
  targetValue: number;

  @ApiProperty({ description: 'Target date to achieve goal' })
  @IsDate()
  @Type(() => Date)
  targetDate: Date;

  @ApiPropertyOptional({ description: 'Current value/progress' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentValue?: number;

  @ApiPropertyOptional({ description: 'Goal priority', enum: GoalPriority, default: GoalPriority.MEDIUM })
  @IsOptional()
  @IsEnum(GoalPriority)
  priority?: GoalPriority;

  // Type-specific fields
  @ApiPropertyOptional({ description: 'Target score (for OVERALL_SCORE type)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  targetScore?: number;

  @ApiPropertyOptional({ description: 'Target maturity level (for MATURITY_LEVEL type)' })
  @IsOptional()
  @IsString()
  targetLevel?: string;

  @ApiPropertyOptional({ description: 'Domain code (for DOMAIN_SCORE type)' })
  @IsOptional()
  @IsString()
  domainCode?: string;

  @ApiPropertyOptional({ description: 'Item code (for ITEM_SCORE type)' })
  @IsOptional()
  @IsString()
  itemCode?: string;
}
