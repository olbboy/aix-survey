import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum HealthQueryType {
  DATABASE = 'database',
  RESOURCES = 'resources',
  ALERTS = 'alerts',
  CHECK = 'check',
}

export enum AlertLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export enum AlertCategory {
  DATABASE = 'DATABASE',
  PERFORMANCE = 'PERFORMANCE',
  SECURITY = 'SECURITY',
  SYSTEM = 'SYSTEM',
}

export class GetHealthDto {
  @ApiProperty({
    description: 'Type of health check to perform',
    enum: HealthQueryType,
    required: false,
  })
  @IsOptional()
  @IsEnum(HealthQueryType)
  type?: HealthQueryType;

  @ApiProperty({
    description: 'Alert level filter (when type=alerts)',
    enum: AlertLevel,
    required: false,
  })
  @IsOptional()
  @IsEnum(AlertLevel)
  level?: AlertLevel;

  @ApiProperty({
    description: 'Alert category filter (when type=alerts)',
    enum: AlertCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(AlertCategory)
  category?: AlertCategory;
}
