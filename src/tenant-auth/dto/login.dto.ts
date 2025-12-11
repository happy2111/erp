import {
  IsEmail,
  IsOptional,
  IsPhoneNumber, IsString,
  Length,
  ValidateIf
} from "class-validator";
import {ApiProperty} from "@nestjs/swagger";

export class TenantLoginDto {
  @ApiProperty({
    description: 'Email или телефон',
    example: 'example@gmail.com или +998901234567',
  })
  @IsString()
  login: string;

  @ApiProperty({
    description: 'Пароль',
    example: 'password123',
  })
  @IsString()
  @Length(8, 255)
  password: string;
}
