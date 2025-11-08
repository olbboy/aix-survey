import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompareAssessmentsDto {
  @ApiProperty({
    description: 'From assessment ID',
    example: 'assess-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiProperty({
    description: 'To assessment ID',
    example: 'assess-456',
    required: false,
  })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiProperty({
    description: 'Organization ID for suggested comparisons',
    required: false,
  })
  @IsOptional()
  @IsString()
  organizationId?: string;
}
