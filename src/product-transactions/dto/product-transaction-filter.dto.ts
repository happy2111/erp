import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProductAction } from '.prisma/client-tenant';

export class ProductTransactionFilterDto {
  @ApiPropertyOptional({ example: 'uuid-product-instance' })
  @IsOptional()
  @IsString()
  productInstanceId?: string;

  @ApiPropertyOptional({ example: 'uuid-product-variant' })
  @IsOptional()
  @IsString()
  productVariantId?: string;

  @ApiPropertyOptional({ enum: ProductAction })
  @IsOptional()
  @IsEnum(ProductAction)
  action?: ProductAction;

  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsOptional()
  fromDate?: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional()
  toDate?: string;

  page?: number = 1;
  limit?: number = 20;
}
