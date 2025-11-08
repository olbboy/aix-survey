import { IsString, IsInt, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateUploadUrlDto {
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
    minimum: 1,
    maximum: 10485760, // 10MB
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10485760)
  fileSize: number;

  @ApiProperty({
    description: 'Item code this evidence is for',
    example: 'DATA_01',
    required: false,
  })
  @IsOptional()
  @IsString()
  itemCode?: string;

  @ApiProperty({
    description: 'Evidence description',
    example: 'Data governance policy document',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
