import {
  IsArray, IsBoolean, IsEmail,
  IsEnum,
  IsOptional,
  IsString, IsUUID, Length, Matches,
  ValidateNested
} from "class-validator";
import {
  GenderDtoEnum
} from "../../tenant-user/dto/create-tenant-user-profile.dto";
import {Type} from "class-transformer";
import {ApiProperty} from "@nestjs/swagger";
import {
  CreateTenantUserPhoneItemDto
} from "../../tenant-user/dto/update-tenant-user-phone.dto";

export class CustomerToUserProfileDto {
  @ApiProperty({ example: '2003-05-14T00:00:00Z', required: false })
  @IsOptional()
  @Type(() => Date)
  dateOfBirth?: Date;

  @ApiProperty({ example: 'MALE', required: false, enum: GenderDtoEnum })
  @IsOptional()
  @IsEnum(GenderDtoEnum)
  gender?: GenderDtoEnum;

  @IsString()
  @IsOptional()
  passportSeries?: string;

  @IsString()
  @IsOptional()
  passportNumber?: string;

  @IsString()
  @IsOptional()
  issuedBy?: string;

  @ApiProperty({ example: '2025-05-14T00:00:00Z', required: false })
  @IsOptional()
  issuedDate?: Date;

  @ApiProperty({ example: '2025-05-14T00:00:00Z', required: false })
  @IsOptional()
  expiryDate?: Date;

  @ApiProperty({ example: 'Узбекистан', required: false })
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  region?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({
    description: "Propiska addressi",
    example: "123 Main St, Anytown, Uzbekistan",
    required: false
  })
  @IsString()
  @IsOptional()
  registration?: string;

  @ApiProperty({
    description: "Hudud, Rayon",
    example: "Мирзо-Улугбекский район",
    required: false
  })
  @IsString()
  @IsOptional()
  district?: string;
}

export class CustomerToUserDto {
  @ApiProperty({example: "example@gmail.com", required: false})
  @IsString()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'SecureP@123' })
  @IsString()
  @Length(8, 255, { message: 'Пароль должен быть длиной от 8 до 255 символов' })
  @Matches(/^(?=.*[A-Z])(?=.*\d).{8,255}$/, {
    message: 'Пароль должен содержать минимум одну заглавную букву (A-Z) и минимум одну цифру (0-9).',
  })
  password: string;

  @ApiProperty({required: false})
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ type: () => CustomerToUserProfileDto })
  @ValidateNested()
  @Type(() => CustomerToUserProfileDto)
  profile: CustomerToUserProfileDto;
}

export class ConvertCustomerToUserDto {
  @ApiProperty({
    example: 'b24c7d4a-1e2b-43a7-9c8b-..........',
  })
  @IsUUID()
  customerId: string;

  @ApiProperty({type: () => CustomerToUserDto})
  @ValidateNested()
  @Type(() => CustomerToUserDto)
  user: CustomerToUserDto;

  @ApiProperty({ type: () => [CreateTenantUserPhoneItemDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTenantUserPhoneItemDto)
  @IsOptional()
  phonesToAdd?: CreateTenantUserPhoneItemDto[];
}



