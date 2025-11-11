import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';

export class CurrencyRateFilterDto {
  @ApiProperty({ required: false, example: 'USD', description: 'Фильтр по базовой валюте' })
  @IsOptional()
  @IsString()
  baseCurrency?: string;

  @ApiProperty({ required: false, example: 'UZS', description: 'Фильтр по целевой валюте' })
  @IsOptional()
  @IsString()
  targetCurrency?: string;

  @ApiProperty({ required: false, example: 1, description: 'Номер страницы' })
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @ApiProperty({ required: false, example: 10, description: 'Количество записей на странице' })
  @IsOptional()
  @IsNumber()
  limit?: number = 10;
}
