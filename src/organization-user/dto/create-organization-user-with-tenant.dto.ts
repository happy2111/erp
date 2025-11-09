import { ApiProperty } from '@nestjs/swagger';
import { OrgUserRole } from '.prisma/client-tenant';
import { IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateTenantUserDto } from '../../tenant-user/dto/create-tenant-user.dto';

export class CreateOrganizationUserWithTenantDto {
  @ApiProperty({
    description: 'Роль пользователя в организации',
    example: 'OWNER',
    enum: OrgUserRole,
  })
  @IsEnum(OrgUserRole)
  role: OrgUserRole;

  @ApiProperty({
    description: 'Должность пользователя',
    example: 'Главный бухгалтер',
    required: false,
  })
  @IsOptional()
  position?: string;

  @ApiProperty({
    type: () => CreateTenantUserDto,
    description: 'Данные создаваемого пользователя',
  })
  @ValidateNested()
  @Type(() => CreateTenantUserDto)
  user: CreateTenantUserDto;
}
