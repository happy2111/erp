import { ApiProperty } from '@nestjs/swagger';
import { PriceType, CustomerType } from '.prisma/client-tenant';
import { IsEnum, IsNotEmpty, IsOptional, IsUUID, IsNumberString } from 'class-validator';

export class CreateProductPriceDto {
  @ApiProperty({ example: 'uuid-product', description: 'ID товара' })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 'uuid-org', description: 'ID организации', required: false })
  @IsUUID()
  @IsOptional()
  organizationId?: string;

  @ApiProperty({
    example: PriceType.CASH,
    enum: PriceType,
    description: 'Тип цены'
  })
  @IsEnum(PriceType)
  priceType: PriceType;

  @ApiProperty({ example: '1299.99', description: 'Цена товара (decimal as string)' })
  @IsNumberString()
  amount: string;

  @ApiProperty({ example: 'uuid-currency', description: 'ID валюты' })
  @IsUUID()
  currencyId: string;

  @ApiProperty({
    example: CustomerType.CLIENT,
    enum: CustomerType,
    required: false,
    description: 'Тип клиента'
  })
  @IsEnum(CustomerType)
  @IsOptional()
  customerType?: CustomerType;
}
