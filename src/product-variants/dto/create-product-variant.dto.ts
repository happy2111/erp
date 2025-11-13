import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateProductVariantDto {
  @ApiProperty({ example: 'uuid-product', description: 'ID товара, к которому принадлежит вариант' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 'SKU-RED-XL', description: 'Артикул варианта (SKU)', required: false })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ example: '1234567890123', description: 'Штрихкод варианта', required: false })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ example: 'iPhone 15 Pro 256GB Silver', description: 'Название варианта товара' })
  @IsString()
  title: string;

  @ApiProperty({ example: 1299.99, description: 'Цена по умолчанию', required: false })
  @IsOptional()
  @IsNumber()
  defaultPrice?: number;

  @ApiProperty({ example: 'uuid-currency', description: 'ID валюты для цены', required: false })
  @IsOptional()
  @IsString()
  currencyId?: string;
}
