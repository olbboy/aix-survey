import { IsString, IsInt, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmEvidenceDto {
  @ApiProperty({
    description: 'File key returned from upload URL generation',
    example: 'assessments/assess-123/evidence/file-abc.pdf',
  })
  @IsString()
  fileKey: string;

  @ApiProperty({
    description: 'File name',
    example: 'document.pdf',
  })
  @IsString()
  fileName: string;

  @ApiProperty({
    description: 'File MIME type',
    example: 'application/pdf',
  })
  @IsString()
  fileType: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1048576,
  })
  @Type(() => Number)
  @IsInt()
  fileSize: number;

  @ApiProperty({
    description: 'Item code this evidence is for',
    required: false,
  })
  @IsOptional()
  @IsString()
  itemCode?: string;

  @ApiProperty({
    description: 'Evidence description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Virus scan completed',
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  virusScanned?: boolean;

  @ApiProperty({
    description: 'Virus scan result (CLEAN, INFECTED, ERROR)',
    required: false,
  })
  @IsOptional()
  @IsString()
  scanResult?: string;
}
