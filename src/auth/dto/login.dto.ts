import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  ValidateIf
} from "class-validator";
import {ApiProperty} from "@nestjs/swagger";

export class LoginDto {
  @ApiProperty({
    description: 'Phone number or email',
    example: '+998901234567',
    required: false,
  })
  @ValidateIf((o) => !o.email) // Проверяем телефон, только если нет email
  @IsString()
  @IsNotEmpty()
  phone?: string;

  @ApiProperty({
    description: 'Email',
    example: 'example@gmail.com',
    required: false,
  })
  @ValidateIf((o) => !o.phone) // Проверяем email, только если нет телефона
  @IsEmail()
  @IsNotEmpty()
  email?: string;

  @ApiProperty({
    description: 'Password',
    example: 'password123',
  })
  @Length(8, 255)
  @IsString()
  @IsNotEmpty()
  password: string;
}