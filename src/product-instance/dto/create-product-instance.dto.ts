import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ProductStatus } from '.prisma/client-tenant';

export class CreateProductInstanceDto {
  @ApiPropertyOptional({ example: 'uuid-product-variant' })
  @IsOptional()
  @IsUUID()
  productVariantId?: string;

  @ApiProperty({ example: 'SN-ABC-123456' })
  @IsString()
  serialNumber: string;

  @ApiPropertyOptional({ enum: ProductStatus, example: ProductStatus.IN_STOCK })
  @IsOptional()
  @IsEnum(ProductStatus)
  currentStatus?: ProductStatus;

  @ApiPropertyOptional({ example: 'uuid-customer' })
  @IsOptional()
  @IsUUID()
  currentOwnerId?: string;
}
