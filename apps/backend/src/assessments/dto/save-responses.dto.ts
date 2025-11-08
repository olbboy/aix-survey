import { Type } from 'class-transformer';
import { IsObject, ValidateNested, IsInt, Min, Max, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResponseItemDto {
  @ApiProperty({
    description: 'Score for this item (1-5, null if not answered)',
    example: 3,
    minimum: 1,
    maximum: 5,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  score?: number | null;

  @ApiProperty({
    description: 'Current state description for this item',
    example: 'Currently using manual processes',
    required: false,
  })
  @IsOptional()
  @IsString()
  currentState?: string;
}

export class SaveResponsesDto {
  @ApiProperty({
    description: 'Map of item IDs to their responses',
    type: 'object',
    example: {
      'item-123': { score: 3, currentState: 'Manual process' },
      'item-456': { score: 4, currentState: 'Semi-automated' },
    },
  })
  @IsObject()
  @ValidateNested()
  @Type(() => ResponseItemDto)
  responses: Record<string, ResponseItemDto>;
}
