import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export enum TenantUserSortField {
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  email = 'email',
  'profile.firstName' = 'profile.firstName',
  'profile.lastName' = 'profile.lastName',
}

export class GetTenantUsersQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ enum: TenantUserSortField, required: false })
  @IsOptional()
  @IsEnum(TenantUserSortField)
  sortField?: TenantUserSortField = TenantUserSortField.createdAt;

  @ApiProperty({ enum: ['asc', 'desc'], required: false })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';

  @ApiProperty({ required: false, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiProperty({ required: false, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;
}
