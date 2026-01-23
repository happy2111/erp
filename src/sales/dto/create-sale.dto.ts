import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SaleStatus } from '.prisma/client-tenant';

// Импортируем из InstallmentsModule
import { CreateInstallmentDto } from '../../installments/dto/create-installment.dto';

export class CreateSaleItemDto {
  @ApiProperty({
    example: 'uuid-product-variant',
    description: 'ID варианта товара',
  })
  @IsUUID()
  productVariantId: string;

  @ApiProperty({ example: 3, description: 'Количество' })
  quantity: number;

  @ApiProperty({
    example: 2500000,
    description: 'Цена за единицу (в валюте продажи)',
  })
  price: number;
}

export class CreateSaleDto {
  @ApiPropertyOptional({
    example: 'uuid-customer',
    description: 'ID клиента (опционально)',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty({
    example: 'uuid-kassa',
    description: 'ID кассы (если оплата сразу)',
  })
  @IsOptional()
  @IsUUID()
  kassaId?: string;

  @ApiProperty({
    example: 'uuid-user',
    description: 'ID ответственного пользователя',
  })
  @IsUUID()
  responsibleId: string;

  @ApiProperty({
    enum: SaleStatus,
    example: SaleStatus.DRAFT,
    description: 'Статус продажи (по умолчанию DRAFT)',
  })
  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @ApiProperty({ example: 'Скидка 5% постоянному клиенту', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    type: [CreateSaleItemDto],
    description: 'Список позиций продажи (обязательно хотя бы одна)',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSaleItemDto)
  items: CreateSaleItemDto[];

  @ApiProperty({ example: 'UZS', description: 'ID валюты продажи' })
  @IsUUID()
  currencyId: string;

  // НОВОЕ ПОЛЕ — опциональная рассрочка
  @ApiPropertyOptional({
    type: CreateInstallmentDto,
    description: 'Данные для создания рассрочки (если нужна)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateInstallmentDto)
  installment?: CreateInstallmentDto;
}
