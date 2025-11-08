import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartAssessmentDto {
  @ApiProperty({
    description: 'Industry classification',
    example: 'Technology',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @ApiProperty({
    description: 'Company size category',
    example: 'Medium (50-250)',
    required: false,
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  size?: string;

  @ApiProperty({
    description: 'Geographic region',
    example: 'Southeast Asia',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;
}
