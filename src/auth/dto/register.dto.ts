import { IsEmail, IsString, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  password: string;
}
