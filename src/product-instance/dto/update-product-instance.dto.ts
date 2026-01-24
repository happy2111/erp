import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ProductStatus } from '.prisma/client-tenant';

export class UpdateProductInstanceDto {
  @ApiPropertyOptional({ example: 'uuid-product-variant' })
  @IsOptional()
  @IsUUID()
  productVariantId?: string;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  currentStatus?: ProductStatus;

  @ApiPropertyOptional({ example: 'uuid-customer' })
  @IsOptional()
  @IsUUID()
  currentOwnerId?: string;
}
