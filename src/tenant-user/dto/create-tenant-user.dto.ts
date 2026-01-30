import {
  IsEmail,
  IsOptional,
  IsString,
  ValidateNested,
  IsBoolean,
  IsArray,
  ArrayMinSize,
  Length,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateTenantUserProfileDto } from './create-tenant-user-profile.dto';
import { CreateUserPhoneDto } from './create-tenant-user-phone.dto';

export class CreateTenantUserDto {
  @ApiProperty({ example: 'user@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'SecureP@ss123' })
  @IsString()
  @Length(8, 255, { message: 'Пароль должен быть длиной от 8 до 255 символов' })
  @Matches(/^(?=.*[A-Z])(?=.*\d).{8,255}$/, {
    message:
      'Пароль должен содержать минимум одну заглавную букву (A-Z) и минимум одну цифру (0-9).',
  })
  password: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiProperty({ type: () => CreateTenantUserProfileDto })
  @ValidateNested()
  @Type(() => CreateTenantUserProfileDto)
  profile: CreateTenantUserProfileDto;

  @ApiProperty({
    type: () => [CreateUserPhoneDto], // Указываем Swagger, что это массив CreateUserPhoneDto
    description:
      'Список номеров телефонов пользователя. Должен содержать хотя бы один основной номер.',
  })
  @IsArray()
  @ArrayMinSize(1) // Требуем хотя бы один номер
  @ValidateNested({ each: true }) // <--- Валидируем каждый элемент массива
  @Type(() => CreateUserPhoneDto) // <--- Трансформируем каждый элемент массива в CreateUserPhoneDto
  phone_numbers: CreateUserPhoneDto[];
}
