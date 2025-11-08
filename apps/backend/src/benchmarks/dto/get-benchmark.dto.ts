import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * DTO for getting benchmark data for a specific industry/size/region segment
 */
export class GetBenchmarkDto {
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
    enum: ['Small (1-50)', 'Medium (51-200)', 'Large (201-1000)', 'Enterprise (1000+)'],
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
}
