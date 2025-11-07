import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from "@nestjs/swagger";

// Для обновления существующего телефона
export class UpdateTenantUserPhoneItemDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef' })
  @IsUUID()
  id!: string; // id записи UserPhone

  @ApiProperty({ example: '+998934447766', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @ApiProperty({ example: 'Рабочий номер', required: false })
  @IsString()
  @IsOptional()
  note?: string;
}

// Для добавления нового телефона
export class CreateTenantUserPhoneItemDto {
  @ApiProperty({ example: '+998934447766' }) // Обязательное поле
  @IsString()
  phone!: string;

  @ApiProperty({ example: true }) // Обязательное поле
  @IsBoolean()
  isPrimary!: boolean;

  @ApiProperty({ example: 'Рабочий номер', required: false }) // Необязательное поле
  @IsString()
  @IsOptional()
  note?: string;
}