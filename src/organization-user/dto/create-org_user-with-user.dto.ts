import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { OrgUserRole } from ".prisma/client-tenant";
import { CreateTenantUserDto } from "../../tenant-user/dto/create-tenant-user.dto";

export class CreateOrgUserWithUserDto {
  @ApiProperty({
    description: "ID организации",
    example: "b24c7d4a-1e2b-43a7-9c8b-123456789abc"
  })
  @IsUUID("4")
  organizationId: string;

  @ApiProperty({
    description: "Роль пользователя inside organization",
    example: "MANAGER",
    enum: OrgUserRole,
  })
  @IsEnum(OrgUserRole)
  role: OrgUserRole;

  @ApiProperty({
    description: "Должность",
    example: "Главный бухгалтер",
    required: false,
  })
  @IsOptional()
  position?: string;

  @ApiProperty({
    description: "Данные нового пользователя",
    type: () => CreateTenantUserDto,
  })
  @ValidateNested()
  @Type(() => CreateTenantUserDto)
  user: CreateTenantUserDto;
}
