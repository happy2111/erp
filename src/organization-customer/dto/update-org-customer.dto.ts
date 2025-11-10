import { IsBoolean, IsEnum, IsOptional, IsPhoneNumber, IsString, Length } from 'class-validator';
import { CustomerType } from '.prisma/client-tenant';

export class UpdateOrgCustomerDto {
  @IsOptional()
  @IsString()
  @Length(1, 255)
  firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  lastName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  patronymic?: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  @IsEnum(CustomerType)
  type?: CustomerType;

  @IsOptional()
  @IsBoolean()
  isBlacklisted?: boolean;
}
