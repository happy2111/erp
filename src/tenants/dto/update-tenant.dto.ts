import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { TenantStatus } from '@prisma/client';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @IsOptional()
  @IsString()
  hostname?: string;

  @IsOptional()
  @IsString()
  dbName?: string;

  @IsOptional()
  @IsString()
  dbHost?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  dbPort?: number;

  @IsOptional()
  @IsString()
  dbUser?: string;

  @IsOptional()
  @IsString()
  dbPassword?: string;
}
