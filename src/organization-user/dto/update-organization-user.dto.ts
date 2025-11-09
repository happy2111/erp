import { ApiProperty } from '@nestjs/swagger';
import { OrgUserRole } from '.prisma/client-tenant';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateOrganizationUserDto {
  @ApiProperty({
    description: 'Роль пользователя в организации',
    example: 'MANAGER',
    enum: OrgUserRole,
    required: false,
  })
  @IsOptional()
  @IsEnum(OrgUserRole, { message: 'Invalid role' })
  role?: OrgUserRole;

  @ApiProperty({
    description: 'Должность пользователя в организации',
    example: 'Главный бухгалтер',
    required: false,
  })
  @IsOptional()
  @IsString()
  position?: string;
}
