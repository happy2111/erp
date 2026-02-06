import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, isString, IsString, IsUUID } from 'class-validator';

export enum KassaType {
  CASH = 'наличные',
  BANK = 'банк',
  ELECTRONIC = 'электронная',
  CARD = 'карточная',
  OTHER = 'другая',
}

export class CreateKassaDto {
  @ApiProperty({ example: 'Наличные UZS', description: 'Название кассы' })
  @IsString()
  @IsNotEmpty()
  name: string;
  //
  // @ApiProperty({
  //   enum: KassaType,
  //   example: KassaType.CASH,
  //   description: 'Тип кассы',
  // })
  // @IsEnum(KassaType)
  @IsString()
  type: string;

  @ApiProperty({ example: 'uuid-currency', description: 'ID валюты' })
  @IsUUID()
  @IsNotEmpty()
  currencyId: string;
}

export class UpdateKassaDto {
  @ApiProperty({ example: 'Наличные UZS - обновлено', required: false })
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsString()
  type?: string;
}
