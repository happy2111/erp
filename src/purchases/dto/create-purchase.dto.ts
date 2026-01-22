import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
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

  @ApiProperty({ example: 10, description: 'Количество' })
  quantity: number;

  @ApiProperty({
    example: 12000,
    description: 'Цена за единицу (в валюте закупки)',
  })
  price: number;

  @ApiPropertyOptional({ example: 500, description: 'Скидка на единицу' })
  discount?: number;
}

export class CreatePurchaseDto {
  @ApiProperty({
    example: 'uuid-supplier',
    description: 'ID поставщика (обязательно)',
  })
  @IsUUID()
  supplierId: string;

  @ApiPropertyOptional({
    example: 'uuid-user',
    description: 'ID ответственного пользователя',
  })
  @IsOptional()
  @IsUUID()
  responsibleId?: string;

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
  @Type(() => CreatePurchaseItemDto)
  items: CreatePurchaseItemDto[];

  @ApiProperty({ example: 'uuid-currency', description: 'ID валюты закупки' })
  @IsUUID()
  currencyId: string;
}
