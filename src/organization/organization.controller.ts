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

@ApiSecurity('x-tenant-key')
@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  create(@CurrentTenant() tenant: Tenant, @Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationService.create(tenant, createOrganizationDto);
  }

  @Get()
  @UseGuards(ApiKeyGuard)
  findAll(@CurrentTenant() tenant: Tenant) {
    return this.organizationService.findAll(tenant);
  }

  @Get(':id')
  @UseGuards(ApiKeyGuard)
  findOne(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.organizationService.findById(tenant, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update organization partially' })
  @ApiParam({ name: 'id', type: String, description: 'Organization ID' })
  @UseGuards(ApiKeyGuard)
  update(@CurrentTenant() tenant: Tenant, @Param('id') id: string, @Body() updateOrganizationDto: UpdateOrganizationDto) {
    return this.organizationService.update(tenant, id, updateOrganizationDto);
  }

  @Delete(':id')
  @UseGuards(ApiKeyGuard)
  remove(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.organizationService.remove(tenant, id);
  }
}
