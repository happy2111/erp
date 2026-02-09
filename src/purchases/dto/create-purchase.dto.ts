import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PurchaseStatus } from '.prisma/client-tenant';

export class CreatePurchaseItemDto {
  @ApiProperty({
    example: 'uuid-product-variant',
    description: 'ID варианта товара',
  })
  @IsUUID()
  productVariantId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ example: 'BATCH-2025-001' })
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @ApiPropertyOptional({ example: '2026-05-30' })
  @IsOptional()
  @Type(() => Date)
  expiryDate?: Date;
}

export class CreatePurchaseDto {
  @ApiProperty({
    example: 'uuid-supplier',
    description: 'ID поставщика (обязательно)',
  })
  @IsUUID()
  supplierId: string;

  @ApiPropertyOptional({
    example: 'uuid-kassa',
    description: 'ID кассы (если оплата сразу)',
  })
  @IsOptional()
  @IsUUID()
  kassaId?: string;

  @ApiProperty({
    enum: PurchaseStatus,
    example: PurchaseStatus.DRAFT,
    description: 'Статус закупки (по умолчанию DRAFT)',
  })
  @IsOptional()
  @IsEnum(PurchaseStatus)
  status?: PurchaseStatus;

  @ApiPropertyOptional({ example: 'Закупка у поставщика Samsung' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    type: [CreatePurchaseItemDto],
    description: 'Список позиций закупки (обязательно хотя бы одна)',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => CreatePurchaseItemDto)
  items: CreatePurchaseItemDto[];

  @ApiProperty({ example: 'uuid-currency', description: 'ID валюты закупки' })
  @IsUUID()
  currencyId: string;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  initialPayment?: number;
}
