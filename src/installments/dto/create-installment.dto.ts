import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateInstallmentDto {
  @ApiProperty({
    example: 'uuid-sale',
    description: 'ID продажи, к которой привязана рассрочка',
  })
  @IsUUID()
  @IsNotEmpty()
  saleId: string;

  @ApiProperty({ example: 'uuid-customer', description: 'ID клиента' })
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ example: 10000000, description: 'Общая сумма рассрочки' })
  @IsNumber()
  @IsPositive()
  totalAmount: number;

  @ApiProperty({ example: 2000000, description: 'Первоначальный взнос' })
  @IsNumber()
  @IsPositive()
  initialPayment: number;

  @ApiProperty({ example: 12, description: 'Срок рассрочки в месяцах' })
  @IsInt()
  @IsPositive()
  totalMonths: number;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Крайний срок погашения (опционально)',
  })
  @IsOptional()
  @IsString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 'Рассрочка на 12 месяцев без %' })
  @IsOptional()
  @IsString()
  notes?: string;
}
