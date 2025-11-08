import { IsString, IsOptional, IsInt, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LogErrorDto {
  @ApiProperty({
    description: 'Error type',
    default: 'UNKNOWN',
    required: false,
  })
  @IsOptional()
  @IsString()
  type?: string = 'UNKNOWN';

  @ApiProperty({
    description: 'Error message',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Error stack trace',
    required: false,
  })
  @IsOptional()
  @IsString()
  stack?: string;

  @ApiProperty({
    description: 'User ID associated with error',
    required: false,
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({
    description: 'Organization ID associated with error',
    required: false,
  })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({
    description: 'Request URL where error occurred',
    required: false,
  })
  @IsOptional()
  @IsString()
  requestUrl?: string;

  @ApiProperty({
    description: 'Request HTTP method',
    required: false,
  })
  @IsOptional()
  @IsString()
  requestMethod?: string;

  @ApiProperty({
    description: 'HTTP status code',
    required: false,
  })
  @IsOptional()
  @IsInt()
  statusCode?: number;

  @ApiProperty({
    description: 'Additional error metadata',
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: any;
}
