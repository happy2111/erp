import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SaleStatus } from '.prisma/client-tenant';

export class CreateSellInstallmentDto {
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

export class CreateSaleItemDto {
  @ApiProperty({
    example: 'uuid-product-variant',
    description: 'ID варианта товара',
  })
  @IsUUID()
  productVariantId: string;

  @ApiProperty({ example: 3, description: 'Количество' })
  @IsNumber()
  quantity: number;

  @ApiProperty({
    example: 2500000,
    description: 'Цена за единицу (в валюте продажи)',
  })
  @IsNumber()
  price: number;

  @IsOptional()
  @IsUUID()
  instanceId?: string;
}

export class CreateSaleDto {
  @ApiPropertyOptional({
    example: 'uuid-customer',
    description: 'ID клиента (опционально)',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty({
    example: 'uuid-kassa',
    description: 'ID кассы (если оплата сразу)',
  })
  @IsOptional()
  @IsUUID()
  kassaId?: string;

  @ApiProperty({
    enum: SaleStatus,
    example: SaleStatus.DRAFT,
    description: 'Статус продажи (по умолчанию DRAFT)',
  })
  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @ApiProperty({ example: 'Скидка 5% постоянному клиенту', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    type: [CreateSaleItemDto],
    description: 'Список позиций продажи (обязательно хотя бы одна)',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];

  @ApiProperty({ example: 'UZS', description: 'ID валюты продажи' })
  @IsUUID()
  currencyId: string;

  @ApiPropertyOptional({
    type: CreateSellInstallmentDto,
    description: 'Данные для создания рассрочки (если нужна)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateSellInstallmentDto)
  installment?: CreateSellInstallmentDto;
}
