import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards, Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AttributeService } from './attribute.service';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { FilterAttributeDto } from './dto/filter-attribute.dto';
import type { Tenant } from '@prisma/client';
import {CurrentTenant} from "../../decorators/currectTenant.decorator";
import {JwtAuthGuard} from "../../tenant-auth/guards/jwt.guard";
import {TenantRolesGuard} from "../../guards/tenant-roles.guard";
import {ApiKeyGuard} from "../../guards/api-key.guard";
import {Roles} from "../../decorators/tenant-roles.decorator";
import {OrgUserRole} from ".prisma/client-tenant";

@ApiTags('Attributes')
@Controller('attributes')
export class AttributeController {
  constructor(private readonly attributeService: AttributeService) {}

  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.OWNER, OrgUserRole.ADMIN, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Создать новую характеристику' })
  @ApiResponse({ status: 201, description: 'Характеристика успешно создана' })
  @ApiResponse({ status: 409, description: 'Attribute with this name or key already exists.'})
  create(@CurrentTenant() tenant: Tenant, @Body() dto: CreateAttributeDto) {
    return this.attributeService.create(tenant, dto);
  }

  @Get('filter')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.OWNER, OrgUserRole.ADMIN, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Получить список характеристик' })
  findAll(@CurrentTenant() tenant: Tenant, @Query() filter: FilterAttributeDto) {
    return this.attributeService.findAll(tenant, filter);
  }

  @Get(':id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.OWNER, OrgUserRole.ADMIN, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Получить характеристику по ID' })
  findOne(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.attributeService.findOne(tenant, id);
  }

  @Put('update/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.OWNER, OrgUserRole.ADMIN, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Обновить характеристику' })
  update(@CurrentTenant() tenant: Tenant, @Param('id') id: string, @Body() dto: UpdateAttributeDto) {
    return this.attributeService.update(tenant, id, dto);
  }

  @Delete('remove/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.OWNER, OrgUserRole.ADMIN, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Удалить характеристику' })
  remove(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.attributeService.remove(tenant, id);
  }
}
