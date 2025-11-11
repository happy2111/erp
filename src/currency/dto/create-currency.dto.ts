import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateCurrencyDto {
  @IsNotEmpty()
  @IsString()
  @Length(2, 10)
  code: string; // ISO код валюты, пример: "USD"

  @IsNotEmpty()
  @IsString()
  name: string; // Полное название валюты

  @IsNotEmpty()
  @IsString()
  symbol: string; // Символ, пример: "$" или "so’m"
}
