import {
  Body,
  Controller,
  Delete,
  Param, Patch,
  Post,
  Res,
  UseGuards
} from '@nestjs/common';
import { OrganizationCustomerService } from './organization-customer.service';
import {ApiKeyGuard} from "../guards/api-key.guard";
import {JwtAuthGuard} from "../tenant-auth/guards/jwt.guard";
import {TenantRolesGuard} from "../guards/tenant-roles.guard";
import {Roles} from "../decorators/tenant-roles.decorator";
import {OrgUserRole} from ".prisma/client-tenant";
import {CurrentTenant} from "../decorators/currectTenant.decorator";
import type {Tenant} from "@prisma/client";
import {CreateOrgCustomerDto} from "./dto/create-org-customer.dto";
import type {Response} from "express";
import {ConvertCustomerToUserDto} from "./dto/convert-customer-to-user.dto";
import {ApiSecurity} from "@nestjs/swagger";
import {OrganizationCustomerFilterDto} from "./dto/filter-org-customer.dto";
import {UpdateOrgCustomerDto} from "./dto/update-org-customer.dto";

@ApiSecurity('x-tenant-key')
@Controller('organization-customer')
class OrganizationCustomerController {
  constructor(private readonly organizationCustomerService: OrganizationCustomerService) {}

  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  async create(
    @CurrentTenant() tenant: Tenant,
    @Body() dto: CreateOrgCustomerDto,
    @Res() res: Response
  ) {
    try {
      const customer = await this.organizationCustomerService.create(tenant, dto);
      return res.status(201).json({ success: true, customer });
    }catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }
  }

  @Post('convert-to-user')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  async convertToOrgUser(
    @CurrentTenant() tenant: Tenant,
    @Body() dto : ConvertCustomerToUserDto,
    @Res() res: Response
  ) {
    try {
      return this.organizationCustomerService.convertCustomerToUser(tenant, dto)
    }catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }
  }


  @Post('filter')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  async filter(@CurrentTenant() tenant: Tenant, @Body() dto: OrganizationCustomerFilterDto) {
    return this.organizationCustomerService.filter(tenant, dto);
  }

  @Delete(':id')
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  async deleteCustomer(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.organizationCustomerService.delete(tenant, id);
  }

  @Patch(':id')
  @UseGuards(ApiKeyGuard)
  async update(
    @CurrentTenant() tenant: Tenant,
    @Param('id') id: string,
    @Body() dto: UpdateOrgCustomerDto,
  ) {
    return this.organizationCustomerService.update(tenant, id, dto);
  }

}

export default OrganizationCustomerController
