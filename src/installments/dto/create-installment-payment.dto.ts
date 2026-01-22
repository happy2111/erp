import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateInstallmentPaymentDto {
  @ApiProperty({ example: 'uuid-installment', description: 'ID рассрочки' })
  @IsUUID()
  @IsNotEmpty()
  installmentId: string;

  @ApiProperty({ example: 833333, description: 'Сумма платежа' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({
    example: 'cash',
    description: 'Способ оплаты: cash, click, transfer и т.д.',
  })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({
    example: 'uuid-kassa',
    description: 'ID кассы, куда поступил платёж',
  })
  @IsUUID()
  @IsNotEmpty()
  kassaId: string;

  @ApiPropertyOptional({ example: 'Платёж за декабрь' })
  @IsOptional()
  @IsString()
  note?: string;
}
