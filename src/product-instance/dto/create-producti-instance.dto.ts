import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

// Пример определения ProductStatus (замените на ваше реальное определение)
export enum ProductStatus {
  IN_STOCK = 'IN_STOCK',
  SOLD = 'SOLD',
  LOST = 'LOST',
  RETURNED = 'RETURNED',
}

export class CreateProductInstanceDto {
  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @IsUUID()
  @Type(() => String)
  productVariantId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50) // Ограничение длины для серийного номера
  serialNumber: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  organizationId: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  @IsUUID()
  @Type(() => String)
  currentOwnerId?: string | null;

  @ApiProperty({
    required: false,
    enum: ProductStatus,
    description: 'Initial status of the product instance'
  })
  @IsOptional()
  @IsEnum(ProductStatus)
  currentStatus?: ProductStatus;
}