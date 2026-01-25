import { ApiProperty } from '@nestjs/swagger';

export class LoginOrganizationDto {
  @ApiProperty({ example: 'org_user_123' })
  orgUserId: string;

  @ApiProperty({ example: 'org_456' })
  orgId: string;

  @ApiProperty({ example: 'ADMIN' })
  role: string;
}

export class LoginRequiresOrgSelectionResponseDto {
  @ApiProperty({ example: true })
  requiresOrgSelection: true;

  @ApiProperty({ type: [LoginOrganizationDto] })
  organizations: LoginOrganizationDto[];

  @ApiProperty({ example: 'tenant_api_key_123' })
  apiKey: string;
}

export class LoginSuccessResponseDto {
  @ApiProperty({ example: false })
  requiresOrgSelection: false;

  @ApiProperty({ example: 'user_123' })
  userId: string;

  @ApiProperty({ example: 'org_456' })
  organizationId: string;

  @ApiProperty({ example: 'ADMIN' })
  role: string;
}
