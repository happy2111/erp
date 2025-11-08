import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards
} from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import {ApiKeyGuard} from "../guards/api-key.guard";
import {CurrentTenant} from "../decorators/currectTenant.decorator";
import type {Tenant} from "@prisma/client";
import {ApiOperation, ApiParam, ApiSecurity} from "@nestjs/swagger";
import {JwtAuthGuard} from "../tenant-auth/guards/jwt.guard";
import {TenantRolesGuard} from "../guards/tenant-roles.guard";
import {Roles} from "../auth/decorators/roles.decorator";
import {OrgUserRole} from ".prisma/client-tenant";

@ApiSecurity('x-tenant-key')
@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  create(@CurrentTenant() tenant: Tenant, @Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationService.create(tenant, createOrganizationDto);
  }


  @Get("all")
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  findAll(@CurrentTenant() tenant: Tenant) {
    return this.organizationService.findAll(tenant);
  }


  @Get(':id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  findOne(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.organizationService.findById(tenant, id);
  }

  @Patch('update/:id')
  @ApiOperation({ summary: 'Update organization partially' })
  @ApiParam({ name: 'id', type: String, description: 'Organization ID' })
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  update(@CurrentTenant() tenant: Tenant, @Param('id') id: string, @Body() updateOrganizationDto: UpdateOrganizationDto) {
    return this.organizationService.update(tenant, id, updateOrganizationDto);
  }

  @Delete('remove/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.OWNER)
  remove(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.organizationService.remove(tenant, id);
  }
}
