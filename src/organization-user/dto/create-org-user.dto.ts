import {OrgUserRole} from ".prisma/client-tenant";
import {IsEnum, IsOptional, IsUUID} from "class-validator";
import {ApiProperty} from "@nestjs/swagger";

export class CreateOrganizationUserDto {
  @ApiProperty({
    description: 'Organization Id',
    example: "b24c7d4a-1e2b-43a7-9c8b-.........."
  })
  @IsUUID("4")
  organizationId: string;
  @ApiProperty({
    description: 'User Id',
    example: "b24c7d4a-1e2b-43a7-9c8b-.........."
  })
  @IsUUID("4")
  userId: string;
  @ApiProperty({
    description: 'Role',
    example: 'MANAGER',
    enum: OrgUserRole,
  })
  @IsEnum(OrgUserRole, {message: 'Invalid role'})
  role: OrgUserRole;
  @ApiProperty({
    description: 'Position',
    example: 'Manager',
    required: false,
  })
  @IsOptional()
  position?: string;
}