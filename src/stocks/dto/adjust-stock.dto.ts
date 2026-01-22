import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class AdjustStockDto {
  @ApiProperty({
    example: 'uuid-product-variant',
    description: 'ID варианта товара',
  })
  @IsUUID()
  @IsNotEmpty()
  productVariantId: string;

  @ApiProperty({
    example: 50,
    description:
      'На сколько изменить остаток (положительное — приход, отрицательное — расход)',
  })
  @IsInt()
  @IsNotEmpty()
  quantityDelta: number;

  @ApiPropertyOptional({ example: 'Поступление от поставщика INV-2025-001' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    example: 'uuid-batch',
    description: 'ID партии, если изменение связано с партией',
  })
  @IsOptional()
  @IsUUID()
  batchId?: string;
}

export class StockAdjustmentResponseDto {
  @ApiProperty({ example: 'uuid-stock' })
  id: string;

  @ApiProperty({ example: 150 })
  quantity: number;

  @ApiProperty({ example: '2025-11-10T14:30:00Z' })
  updatedAt: Date;
}
