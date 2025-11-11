import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CategoryFilterDto {
  @ApiPropertyOptional({ example: 'смартфон', description: 'Поиск по названию' , required: false})
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1, description: 'Номер страницы' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Количество записей на странице' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 10;
}
