import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaymentType } from 'node_modules/.prisma/client-tenant';

export class CreatePaymentDto {
  @ApiProperty({
    enum: PaymentType,
    example: PaymentType.INCOME,
    description: 'Тип платежа',
  })
  @IsEnum(PaymentType)
  @IsNotEmpty()
  type: PaymentType;

  @ApiProperty({ example: 500000, description: 'Сумма платежа' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 'uuid-currency', description: 'ID валюты платежа' })
  @IsUUID()
  @IsNotEmpty()
  currencyId: string;

  @ApiProperty({
    example: 'uuid-kassa',
    description: 'ID кассы (обязательно для всех типов)',
  })
  @IsUUID()
  @IsNotEmpty()
  kassaId: string;

  @ApiPropertyOptional({
    example: 'uuid-customer',
    description: 'ID клиента/поставщика (для INCOME/EXPENSE)',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({
    example: 'uuid-sale',
    description: 'ID продажи (для INCOME от клиента)',
  })
  @IsOptional()
  @IsUUID()
  saleId?: string;

  @ApiPropertyOptional({
    example: 'uuid-purchase',
    description: 'ID закупки (для EXPENSE поставщику)',
  })
  @IsOptional()
  @IsUUID()
  purchaseId?: string;

  @ApiPropertyOptional({
    example: 'uuid-kassa-to',
    description: 'ID кассы-получателя (только для TRANSFER)',
  })
  @IsOptional()
  @IsUUID()
  toKassaId?: string;

  @ApiProperty({ example: 'Оплата по счёту №1234', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
