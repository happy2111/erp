import {
  IsOptional,
  IsString,
  IsBoolean,
  IsUUID,
  IsEnum,
  IsNumber,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ThemeType } from '.prisma/client-tenant';

export class UpdateSettingsDto {
  @IsOptional()
  @IsUUID()
  baseCurrencyId?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  dateFormat?: string;

  @IsOptional()
  @IsBoolean()
  enableNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  enableAutoRateUpdate?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  taxPercent?: number;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @IsEnum(ThemeType)
  theme?: ThemeType;
}
