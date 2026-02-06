import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsDecimal, IsISO8601, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCurrencyRateDto {
  @ApiProperty({ example: 'USD', description: 'Базовая валюта' })
  @IsNotEmpty()
  @IsString()
  baseCurrency: string;

  @ApiProperty({ example: 'UZS', description: 'Целевая валюта' })
  @IsNotEmpty()
  @IsString()
  targetCurrency: string;

  @IsNotEmpty()
  @IsDecimal(
    { decimal_digits: '1,6', force_decimal: false },
    { message: 'Курс должен быть числом с максимум 6 знаками после точки' },
  )
  @Type(() => String)
  rate: string;

  @ApiProperty({ example: '2025-11-11T12:00:00Z', description: 'Дата курса' })
  @IsISO8601()
  date: string;
}
