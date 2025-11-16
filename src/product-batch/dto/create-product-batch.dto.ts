import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID
} from 'class-validator';

export class CreateProductBatchDto {
  @ApiProperty({ example: "uuid-product", description: "ID товара" })
  @IsUUID()
  @IsNotEmpty()
  productVariantId: string;

  @ApiProperty({ example: "BATCH-2025-001", description: "Номер партии" })
  @IsString()
  @IsNotEmpty()
  batchNumber: string;

  @ApiProperty({ example: 500, description: "Количество в партии" })
  @IsInt()
  quantity: number;

  @ApiProperty({
    example: "2026-05-30T00:00:00Z",
    description: "Срок годности (необязательно)",
    required: false
  })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}
