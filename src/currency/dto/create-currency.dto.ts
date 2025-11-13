import { IsNotEmpty, IsString, Length } from 'class-validator';
import {ApiProperty} from "@nestjs/swagger";

export class CreateCurrencyDto {
  @ApiProperty({example: "USD"})
  @IsNotEmpty()
  @IsString()
  @Length(2, 10)
  code: string; // ISO код валюты, пример: "USD"

  @ApiProperty({example: "US Dollar"})
  @IsNotEmpty()
  @IsString()
  name: string; // Полное название валюты

  @ApiProperty({example: "$"})
  @IsNotEmpty()
  @IsString()
  symbol: string; // Символ, пример: "$" или "so’m"
}
