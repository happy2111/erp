import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  ValidateNested,
  IsArray,
  ArrayUnique,
  Length, Matches
} from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateTenantUserProfileDto } from './update-tenant-user-profile.dto';
import { CreateTenantUserPhoneItemDto, UpdateTenantUserPhoneItemDto } from './update-tenant-user-phone.dto';
import {ApiProperty} from "@nestjs/swagger";

export class UpdateTenantUserDto {
  @ApiProperty({ example: 'user@example.com', required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'SecureP@ss123', required: false })
  @IsString()
  @Length(8, 255, { message: 'Пароль должен быть длиной от 8 до 255 символов' })
  @Matches(/^(?=.*[A-Z])(?=.*\d).{8,255}$/, {
    message: 'Пароль должен содержать минимум одну заглавную букву (A-Z) и минимум одну цифру (0-9).',
  })
  @IsOptional()
  password?: string; // если приходит — хэшируем перед сохранением

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  // Profile (все поля опциональны внутри)
  @ApiProperty({ type: () => UpdateTenantUserProfileDto ,  required: false})
  @ValidateNested()
  @Type(() => UpdateTenantUserProfileDto)
  @IsOptional()
  profile?: UpdateTenantUserProfileDto;

  @ApiProperty({ type: () => [CreateTenantUserPhoneItemDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTenantUserPhoneItemDto)
  @IsOptional()
  phonesToAdd?: CreateTenantUserPhoneItemDto[];

  @ApiProperty({ type: () => [UpdateTenantUserPhoneItemDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateTenantUserPhoneItemDto)
  @IsOptional()
  phonesToUpdate?: UpdateTenantUserPhoneItemDto[];

  @ApiProperty({ type: () => [String], required: false })
  @IsArray()
  @ArrayUnique()
  @IsOptional()
  phonesToDelete?: string[]; // массив id записей UserPhone
}