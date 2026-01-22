import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
  IsOptional,
} from 'class-validator';

export class CreateKassaTransferDto {
  @ApiProperty({
    example: 'uuid-from-kassa',
    description: 'ID кассы-источника',
  })
  @IsUUID()
  fromKassaId: string;

  @ApiProperty({ example: 'uuid-to-kassa', description: 'ID кассы-получателя' })
  @IsUUID()
  toKassaId: string;

  @ApiProperty({ example: 500000, description: 'Сумма в валюте источника' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 12500, description: 'Курс пересчёта (from → to)' })
  @IsNumber()
  @IsPositive()
  rate: number;

  @ApiPropertyOptional({ example: 'Перевод на зарплату' })
  @IsString()
  @IsOptional()
  description?: string;
}
