import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ProductStatus } from '.prisma/client-tenant';

export class FindAllProductInstanceDto {
  @ApiPropertyOptional({ example: 'uuid-product-variant' })
  @IsOptional()
  @IsUUID()
  productVariantId?: string;

  @ApiPropertyOptional({ example: 'SN-ABC' })
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiPropertyOptional({ example: 'uuid-customer' })
  @IsOptional()
  @IsUUID()
  currentOwnerId?: string;

  @ApiPropertyOptional({ example: 1 })
  page?: number = 1;

  @ApiPropertyOptional({ example: 20 })
  limit?: number = 20;
}
