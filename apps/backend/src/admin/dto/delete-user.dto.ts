import { IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteUserDto {
  @ApiProperty({
    description: 'Permanently delete user (true) or just deactivate (false)',
    default: false,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  permanent?: boolean = false;
}
