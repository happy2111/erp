import {Injectable} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString, IsUppercase, Length,
  MaxLength
} from "class-validator";

@Injectable()
export class CreateTenantUserDto {
  @IsString()
  @MaxLength(255)
  name: string;
  @IsString()
  @MaxLength(255)
  @IsPhoneNumber("UZ", {message: 'Phone number must be in Uzbekistan format',})
  phone: string;

  @IsEmail({}, {message: 'Invalid email'})
  email: string;
  @IsString()
  @Length(8, 255, {message: 'Password must be between 8 and 255 characters'})
  password: string;
  @IsOptional()
  @IsEnum(UserRole, {message: 'Invalid role'})
  role?: UserRole;
}
