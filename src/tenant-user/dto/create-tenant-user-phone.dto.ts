// src/tenant-user/dto/create-user-phone.dto.ts
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  IsNotEmpty,

} from 'class-validator';
import {ApiProperty} from "@nestjs/swagger";

export class CreateUserPhoneDto {
  @ApiProperty({
    example: '+998901234567',
    description: 'Уникальный номер телефона в международном формате',
  })
  @IsString()
  @IsNotEmpty()
  // Опционально: можно добавить более строгую проверку формата телефона
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Телефон должен быть в формате E.164 (например, +998901234567)'
  })
  phone: string;

  @ApiProperty({
    example: true,
    description: 'Является ли этот номер основным',
  })
  @IsBoolean()
  isPrimary: boolean;

  @ApiProperty({
    example: 'Рабочий номер',
    required: false,
    description: 'Необязательное примечание к номеру'
  })
  @IsOptional()
  @IsString()
  note?: string; // Добавим note из вашей модели Prisma
}