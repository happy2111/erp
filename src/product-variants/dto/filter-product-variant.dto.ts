import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';

export class ProductVariantFilterDto {
  @ApiProperty({ example: 'iPhone', description: 'Поиск по названию варианта', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ example: 1, description: 'Номер страницы', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ example: 10, description: 'Количество записей на странице', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
