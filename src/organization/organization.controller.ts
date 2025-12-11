import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards, Query
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
import {
  CurrentUser
} from "../tenant-auth/decorators/current-tenant-user.decorator";
import {GetOrganizationsQueryDto} from "./dto/get-organizations-query.dto";

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


  @Get("admin/all")
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  adminfindAll(
    @CurrentTenant() tenant: Tenant,
    @Query() query: GetOrganizationsQueryDto
  ) {
    return this.organizationService.findAll(tenant, query);
  }


  @Get('admin/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  adminfindOne(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.organizationService.findById(tenant, id);
  }


  @Get("all")
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  findAll(
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: { sub: string },
  ) {
    return this.organizationService.findAllForUser(tenant, user.sub);
  }

  @Get(':id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  async findOne(
    @CurrentTenant() tenant: Tenant,
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
  ) {
    return this.organizationService.findOneForUser(tenant, user.sub, id);
  }




  @Patch('update/:id')
  @ApiOperation({ summary: 'Update organization partially' })
  @ApiParam({ name: 'id', type: String, description: 'Organization ID' })
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  update(@CurrentTenant() tenant: Tenant, @Param('id') id: string, @Body() updateOrganizationDto: UpdateOrganizationDto) {
    return this.organizationService.update(tenant, id, updateOrganizationDto);
  }

  @Delete('remove/:id/hard')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.OWNER)
  remove(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.organizationService.remove(tenant, id);
  }
}
