import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReturnStatus } from '../types/returns.type';

export class ReturnItemDto {
  @ApiProperty({ example: 'uuid-product-variant' })
  @IsUUID()
  productVariantId: string;

  @ApiProperty({ example: 2 })
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({ example: 'uuid-sale-item' })
  @IsOptional()
  @IsUUID()
  saleItemId?: string;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber()
  price?: number;
}

export class CreateReturnDto {
  @ApiProperty({ example: 'uuid-sale' })
  @IsOptional()
  @IsUUID()
  saleId?: string;

  @ApiProperty({ example: 'uuid-customer' })
  @IsUUID()
  customerId: string;

  @ApiProperty({ enum: ReturnStatus, default: ReturnStatus.PENDING })
  @IsOptional()
  @IsEnum(ReturnStatus)
  status?: ReturnStatus;

  @ApiPropertyOptional({ example: 'Брак / не подошёл размер' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ type: [ReturnItemDto] })
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
