import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { RelatedType } from '.prisma/client-tenant';

export class CreateTransactionDto {
  @ApiProperty({
    example: 'uuid-customer',
    description: 'ID клиента/поставщика',
  })
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ enum: RelatedType, example: RelatedType.PAYMENT })
  @IsEnum(RelatedType)
  @IsNotEmpty()
  relatedType: RelatedType;

  @ApiProperty({
    example: 'uuid-related',
    description: 'ID связанной сущности (saleId, paymentId и т.д.)',
  })
  @IsString()
  @IsNotEmpty()
  relatedId: string;

  @ApiProperty({
    example: 500000,
    description: 'Дебет (поступление на счёт клиента)',
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  debit?: number;

  @ApiProperty({
    example: 300000,
    description: 'Кредит (списание со счёта клиента)',
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  credit?: number;

  @ApiProperty({ example: 'uuid-currency', description: 'ID валюты' })
  @IsUUID()
  @IsNotEmpty()
  currencyId: string;

  @ApiPropertyOptional({ example: 'Оплата по счёту №1234' })
  @IsOptional()
  @IsString()
  description?: string;
}
