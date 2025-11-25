import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ResellInstanceDto {
    @ApiProperty() // Для NestJS/Swagger
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  instanceId: string;

    @ApiProperty({ required: false }) // Для NestJS/Swagger
  @IsOptional()
  @IsString()
  @IsUUID()
  @Type(() => String) // Если поле идет из Query, можно добавить Type() для надежности
  saleId?: string | null;


    @ApiProperty() // Для NestJS/Swagger
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  newCustomerId: string;


    @ApiProperty({ required: false }) // Для NestJS/Swagger
  @IsOptional()
  @IsString()
  @MaxLength(500) // Ограничим длину, чтобы не засорять базу данных
  @Type(() => String)
  description?: string | null;
}