import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Ноутбуки', description: 'Новое название категории', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;
}
