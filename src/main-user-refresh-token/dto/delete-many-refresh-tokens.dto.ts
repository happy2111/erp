import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty, IsUUID } from 'class-validator';

export class DeleteManyRefreshTokensDto {
  @ApiProperty({
    type: [String],
    example: [
      'b7d8a9f0-1c2d-3e4f-5a6b-7c8d9e0f1a2b',
      'd1e2f3a4-b5c6-7890-d123-456789abcdef',
    ],
    description: 'Список ID токенов для массового удаления',
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  ids: string[];
}
