import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString, IsUppercase, Length,
  MaxLength
} from "class-validator";
import { UserRole } from "@prisma/client";


export class CreateTenantUserDto {
  @IsString()
  @Length(1, 255, { message: 'First name must be between 1 and 255 characters' })
  firstName: string;
  @IsString()
  @Length(1, 255, { message: 'Last name must be between 1 and 255 characters' })
  lastName: string;
  @IsString()
  @MaxLength(255)
  @IsPhoneNumber("UZ", {message: 'Phone number must be in Uzbekistan format',})
  phone: string;
  @IsOptional()
  @IsEmail({}, {message: 'Invalid email'})
  email: string;
  @IsString()
  @Length(8, 255, {message: 'Password must be between 8 and 255 characters'})
  password: string;
  @IsOptional()
  @IsEnum(UserRole, { message: 'Role must be one of: PLATFORM_OWNER, ADMIN, OWNER' })
  role?: UserRole;
}
