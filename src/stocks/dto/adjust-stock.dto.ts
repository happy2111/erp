import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class AdjustStockDto {
  @ApiProperty({ example: 'uuid-product-variant' })
  @IsUUID()
  @IsNotEmpty()
  productVariantId: string;

  @ApiProperty({
    example: 50,
    description: 'Положительное — приход, отрицательное — расход',
  })
  @IsInt()
  @IsNotEmpty()
  quantityDelta: number;

  @ApiPropertyOptional({ example: 'Поступление по накладной INV-2025-001' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ example: 'uuid-batch' })
  @IsOptional()
  @IsUUID()
  batchId?: string;
}
