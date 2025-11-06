// create-tenant-user.dto.ts
import {
  IsEmail,
  IsOptional,
  IsString,
  ValidateNested,
  IsBoolean,
  IsArray, // <-- Нужен для валидации массива
  ArrayMinSize, // <-- Полезно, если требуется хотя бы один номер
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {CreateTenantUserProfileDto} from './create-tenant-user-profile.dto'
import {CreateUserPhoneDto} from "./create-tenant-user-phone.dto";

export class CreateTenantUserDto {
  @ApiProperty({ example: 'user@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  password: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiProperty({ type: () => CreateTenantUserProfileDto })
  @ValidateNested()
  @Type(() => CreateTenantUserProfileDto)
  profile: CreateTenantUserProfileDto;

  // 🔑 Правильное определение массива DTO:
  @ApiProperty({
    type: () => [CreateUserPhoneDto], // Указываем Swagger, что это массив CreateUserPhoneDto
    description: 'Список номеров телефонов пользователя. Должен содержать хотя бы один основной номер.'
  })
  @IsArray()
  @ArrayMinSize(1) // Требуем хотя бы один номер
  @ValidateNested({ each: true }) // <--- Валидируем каждый элемент массива
  @Type(() => CreateUserPhoneDto) // <--- Трансформируем каждый элемент массива в CreateUserPhoneDto
  phone_numbers: CreateUserPhoneDto[]; // <--- Используем новый DTO
}


// export class CreateTenantUserDto {
//   @ApiProperty({
//     example: 'b24c7d4a-1e2b-43a7-9c8b-123456789abc',
//     description: 'ID организации',
//   })
//   @IsUUID()
//   organizationId: string;
//
//   @ApiProperty({
//     example: 'MANAGER',
//     description: 'Роль пользователя внутри организации',
//   })
//   @IsString()
//   role: string;
//
//   @ApiProperty({
//     example: 'Главный бухгалтер',
//     required: false,
//   })
//   @IsOptional()
//   position?: string;
//
//   @ApiProperty({ type: () => CreateUserDto })
//   @ValidateNested()
//   @Type(() => CreateUserDto)
//   user: CreateUserDto;
// }
