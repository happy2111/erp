import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString, Length,
  MaxLength
} from "class-validator";
import { UserRole } from "@prisma/client";
import {ApiProperty} from "@nestjs/swagger";


export class CreateMainUserDto {
  @ApiProperty({ example: 'John', description: 'First name of the user' })
  @IsString()
  @Length(1, 255, { message: 'First name must be between 1 and 255 characters' })
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name of the user' })
  @IsString()
  @Length(1, 255, { message: 'Last name must be between 1 and 255 characters' })
  lastName: string;

  @ApiProperty({ example: '+998901234567', description: 'Phone number of the user' })
  @IsString()
  @MaxLength(255)
  @IsPhoneNumber("UZ", {message: 'Phone number must be in Uzbekistan format',})
  phone: string;

  @ApiProperty({required: false})
  @IsOptional()
  @IsEmail({}, {message: 'Invalid email'})
  email?: string;

  @ApiProperty({ example: 'SecureP@ss123', description: 'Password of the user' })
  @IsString()
  @Length(8, 255, {message: 'Password must be between 8 and 255 characters'})
  password: string;

  @ApiProperty({ example: 'PLATFORM_OWNER', description: 'Role of the user', enum: UserRole , required: false},)
  @IsOptional()
  @IsEnum(UserRole, { message: 'Role must be one of: PLATFORM_OWNER, ADMIN, OWNER' })
  role?: UserRole;
}
