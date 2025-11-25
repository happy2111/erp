import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {ProductStatus} from ".prisma/client-tenant";


export class UpdateProductInstanceDto {
  @ApiProperty({ required: false, nullable: true, description: 'New Product Variant ID' })
  @IsOptional()
  @IsString()
  @IsUUID()
  @Type(() => String)
  productVariantId?: string | null;

  @ApiProperty({
    required: false,
    enum: ProductStatus,
    description: 'New status of the product instance'
  })
  @IsOptional()
  @IsEnum(ProductStatus)
  currentStatus?: ProductStatus;

}