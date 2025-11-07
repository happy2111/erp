import {Body, Controller, Post, UseGuards} from '@nestjs/common';
import { OrganizationUserService } from './organization-user.service';
import {ApiSecurity} from "@nestjs/swagger";
import {JwtAuthGuard} from "../tenant-auth/guards/jwt.guard";
import {TenantRolesGuard} from "../guards/tenant-roles.guard";
import {Roles} from "../decorators/tenant-roles.decorator";
import {OrgUserRole} from ".prisma/client-tenant";
import {CurrentTenant} from "../decorators/currectTenant.decorator";
import type {Tenant} from "@prisma/client";
import {CreateOrganizationUserDto} from "./dto/create-org-user.dto";
import {ApiKeyGuard} from "../guards/api-key.guard";
import {OrgUserFilterDto} from "./dto/org-user-filter.dto";

@ApiSecurity('x-tenant-key')
@ApiSecurity('Authorization')
@Controller('organization-user')
export class OrganizationUserController {
  constructor(private readonly organizationUserService: OrganizationUserService) {}

  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER)
  async create(@CurrentTenant() tenant: Tenant, @Body() dto: CreateOrganizationUserDto) {
    return await this.organizationUserService.create(tenant, dto);
  }

  @Post('filter')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  async filter(@CurrentTenant() tenant: Tenant, @Body() dto: OrgUserFilterDto) {
    return this.organizationUserService.filter(tenant, dto);
  }
}
