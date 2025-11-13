import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class CreateAttributeValueDto {
  @ApiProperty({ example: '7f6e5d4c-3b2a-1908-7654-3210abcdef98', description: 'ID атрибута' })
  @IsUUID()
  attributeId: string;

  @ApiProperty({ example: 'Черный', description: 'Значение характеристики' })
  @IsString()
  value: string;
}
