import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({
    description: 'New role for the user',
    example: 'ADMIN',
  })
  @IsString()
  @IsNotEmpty()
  role: string;
}
