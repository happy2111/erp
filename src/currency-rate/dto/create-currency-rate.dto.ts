import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsDecimal, IsISO8601, IsString } from 'class-validator';

export class CreateCurrencyRateDto {
  @ApiProperty({ example: 'USD', description: 'Базовая валюта' })
  @IsNotEmpty()
  @IsString()
  baseCurrency: string;

  @ApiProperty({ example: 'UZS', description: 'Целевая валюта' })
  @IsNotEmpty()
  @IsString()
  targetCurrency: string;

  @ApiProperty({ example: 11350.5, description: 'Курс обмена' })
  @IsNotEmpty()
  @IsDecimal()
  rate: number;

  @ApiProperty({ example: '2025-11-11T12:00:00Z', description: 'Дата курса' })
  @IsISO8601()
  date: string;
}
