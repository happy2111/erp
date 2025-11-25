import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import {ProductAction} from ".prisma/client-tenant";

export class CreateProductTransactionDto {
  @ApiProperty({ description: 'ID экземпляра товара' })
  @IsString()
  productInstanceId: string;

  @ApiProperty({ description: 'Клиент, от которого поступил товар', required: false })
  @IsOptional()
  @IsString()
  fromCustomerId?: string | null;

  @ApiProperty({ description: 'Клиент, которому передан товар', required: false })
  @IsOptional()
  @IsString()
  toCustomerId?: string | null;

  @ApiProperty({
    description: 'Организация, получившая товар',
    required: false,
  })
  @IsOptional()
  @IsString()
  toOrganizationId?: string | null;

  @ApiProperty({ description: 'ID продажи (если применимо)', required: false })
  @IsOptional()
  @IsString()
  saleId?: string | null;

  @ApiProperty({ enum: ProductAction, description: 'Тип действия' })
  @IsEnum(ProductAction)
  action: ProductAction;

  @ApiProperty({ description: 'Дополнительное описание', required: false })
  @IsOptional()
  @IsString()
  description?: string | null;
}
