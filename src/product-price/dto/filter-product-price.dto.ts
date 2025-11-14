import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum, IsNumber } from 'class-validator';
import { PriceType, CustomerType } from '.prisma/client-tenant';

export class ProductPriceFilterDto {
  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  productId?: string;

  @ApiProperty({ required: false })
  @IsEnum(PriceType)
  @IsOptional()
  priceType?: PriceType;

  @ApiProperty({ required: false })
  @IsEnum(CustomerType)
  @IsOptional()
  customerType?: CustomerType;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiProperty({ required: false })
  @IsNumber()
  @IsOptional()
  limit?: number;
}
