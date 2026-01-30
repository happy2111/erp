import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export enum OrgUserSortField {
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  role = 'role',
  position = 'position',
  'user.profile.firstName' = 'user.profile.firstName',
  'user.profile.lastName' = 'user.profile.lastName',
}

export class GetOrgUsersQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ enum: OrgUserSortField, required: false })
  @IsOptional()
  @IsEnum(OrgUserSortField)
  sortField?: OrgUserSortField = OrgUserSortField.createdAt;

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
