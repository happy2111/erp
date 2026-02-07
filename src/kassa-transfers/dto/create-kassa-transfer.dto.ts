import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer'; // Добавь этот импорт

export class CreateKassaTransferDto {
  @ApiProperty({ example: 'uuid-from-kassa' })
  @IsUUID()
  fromKassaId: string;

  @ApiProperty({ example: 'uuid-to-kassa' })
  @IsUUID()
  toKassaId: string;

  @ApiProperty({ example: 500000 })
  @Type(() => Number) // Принудительное преобразование строки в число
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 12500 })
  @Type(() => Number) // Принудительное преобразование строки в число
  @IsNumber()
  @IsPositive()
  rate: number;

  @ApiPropertyOptional({ example: 'Перевод на зарплату' })
  @IsString()
  @IsOptional()
  description?: string;
}
