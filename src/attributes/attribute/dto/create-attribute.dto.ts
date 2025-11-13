import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateAttributeDto {
  @ApiProperty({ example: 'color', description: 'Уникальный ключ характеристики' })
  @IsString()
  key: string;

  @ApiProperty({ example: 'Цвет', description: 'Название характеристики' })
  @IsString()
  @MinLength(2)
  name: string;
}
