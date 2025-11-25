import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {ProductStatus} from ".prisma/client-tenant";



export class FindAllProductInstanceDto {
  // Параметры фильтрации
  // ---------------------

  @ApiProperty({ required: false, description: 'Filter by Product Variant UUID' })
  @IsOptional()
  @IsString()
  @IsUUID()
  @Type(() => String)
  productVariantId?: string;

  @ApiProperty({ required: false, description: 'Filter by Serial Number' })
  @IsOptional()
  @IsString()
  @Type(() => String)
  serialNumber?: string;

  @ApiProperty({ required: false, enum: ProductStatus, description: 'Filter by current status' })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @ApiProperty({ required: false, description: 'Filter by current Owner UUID' })
  @IsOptional()
  @IsString()
  @IsUUID()
  @Type(() => String)
  currentOwnerId?: string;

  @ApiProperty({ required: false, description: 'Filter by Organization UUID' })
  @IsOptional()
  @IsString()
  @IsUUID()
  @Type(() => String)
  organizationId?: string;

  // Параметры пагинации
  // -------------------

  @ApiProperty({ required: false, default: 1, description: 'Page number for pagination' })
  @IsOptional()
  @Type(() => Number) // !!! ОБЯЗАТЕЛЬНО для преобразования строки из Query в число
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 10, description: 'Number of items per page (limit)' })
  @IsOptional()
  @Type(() => Number) // !!! ОБЯЗАТЕЛЬНО для преобразования строки из Query в число
  @IsInt()
  @Min(1)
  limit?: number = 10;
}