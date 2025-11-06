import {Body, Controller, Get, Post, UseGuards} from '@nestjs/common';
import { TenantUserService } from './tenant-user.service';
import {CreateTenantUserDto} from "./dto/create-tenant-user.dto";
import {ApiKeyGuard} from "../guards/api-key.guard";
import {CurrentTenant} from "../decorators/currectTenant.decorator";
import type {Tenant} from "@prisma/client";
import {TenantRolesGuard} from "../guards/tenant-roles.guard";
import {Roles} from "../decorators/tenant-roles.decorator";
import {OrgUserRole} from ".prisma/client-tenant";
import {JwtAuthGuard} from "../tenant-auth/guards/jwt.guard";
import {ApiSecurity} from "@nestjs/swagger";

@ApiSecurity('x-tenant-key')
@Controller('tenant-user')
export class TenantUserController {
  constructor(private readonly tenantUserService: TenantUserService) {}

  @Post("create")
  // @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  // @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER)
  @UseGuards(ApiKeyGuard)
  async create(@CurrentTenant() tenant: Tenant, @Body() dto: CreateTenantUserDto) {
    return this.tenantUserService.create(tenant, dto);
  }



}
