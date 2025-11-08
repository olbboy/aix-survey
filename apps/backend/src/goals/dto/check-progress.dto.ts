import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckProgressDto {
  @ApiProperty({ description: 'Organization ID to check goals for' })
  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @ApiProperty({ description: 'Assessment ID that triggered progress check' })
  @IsString()
  @IsNotEmpty()
  assessmentId: string;
}
