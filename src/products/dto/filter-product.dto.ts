import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class ProductFilterDto {
  @ApiPropertyOptional({
    example: 'iPhone',
    description: 'Поиск по названию товара',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 1, description: 'Номер страницы' })
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, description: 'Количество записей на страницу' })
  @IsOptional()
  @IsNumber()
  limit?: number = 10;
}
