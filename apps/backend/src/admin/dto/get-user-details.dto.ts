import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GetUserDetailsDto {
  @ApiProperty({
    description: 'Include additional data (e.g., "activity")',
    required: false,
  })
  @IsOptional()
  @IsString()
  include?: string;

  @ApiProperty({
    description: 'Limit for activity data (when include=activity)',
    default: 50,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}
