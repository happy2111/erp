import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class PayPurchaseDto {
  @ApiProperty({ example: 'uuid-kassa' })
  @IsUUID()
  kassaId: string;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ example: 'Доплата за закупку' })
  @IsOptional()
  @IsString()
  note?: string;
}
