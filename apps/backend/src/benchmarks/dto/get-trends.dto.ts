import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for getting historical benchmark trends
 */
export class GetTrendsDto {
  @ApiProperty({
    description: 'Industry segment',
    example: 'Technology',
  })
  @IsString()
  @IsNotEmpty()
  industry: string;

  @ApiProperty({
    description: 'Company size segment',
    example: 'Small (1-50)',
  })
  @IsString()
  @IsNotEmpty()
  size: string;

  @ApiPropertyOptional({
    description: 'Geographic region (optional)',
    example: 'North America',
  })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({
    description: 'Number of months of historical data (1-60)',
    example: 12,
    default: 12,
    minimum: 1,
    maximum: 60,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  months?: number = 12;
}
