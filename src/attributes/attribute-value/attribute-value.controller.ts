import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AttributeValueService } from './attribute-value.service';
import { CreateAttributeValueDto } from './dto/create-attribute-value.dto';
import { UpdateAttributeValueDto } from './dto/update-attribute-value.dto';
import { FilterAttributeValueDto } from './dto/filter-attribute-value.dto';
import type { Tenant } from '@prisma/client';
import { CurrentTenant } from '../../decorators/currectTenant.decorator';
import { JwtAuthGuard } from '../../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../../guards/tenant-roles.guard';
import { ApiKeyGuard } from '../../guards/api-key.guard';
import { Roles } from '../../decorators/tenant-roles.decorator';
import { OrgUserRole } from '.prisma/client-tenant';

@ApiTags('Attribute Values')
@Controller('attribute-values')
export class AttributeValueController {
  constructor(private readonly attributeValueService: AttributeValueService) {}

  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.OWNER, OrgUserRole.ADMIN, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Создать новое значение атрибута' })
  create(@CurrentTenant() tenant: Tenant, @Body() dto: CreateAttributeValueDto) {
    return this.attributeValueService.create(tenant, dto);
  }

  @Get('filter')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.OWNER, OrgUserRole.ADMIN, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Получить список значений атрибутов' })
  findAll(@CurrentTenant() tenant: Tenant, @Body() filter: FilterAttributeValueDto) {
    return this.attributeValueService.findAll(tenant, filter);
  }

  @Get(':id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.OWNER, OrgUserRole.ADMIN, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Получить значение атрибута по ID' })
  findOne(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.attributeValueService.findOne(tenant, id);
  }

  @Put('update/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.OWNER, OrgUserRole.ADMIN, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Обновить значение атрибута' })
  update(@CurrentTenant() tenant: Tenant, @Param('id') id: string, @Body() dto: UpdateAttributeValueDto) {
    return this.attributeValueService.update(tenant, id, dto);
  }

  @Delete('remove/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.OWNER, OrgUserRole.ADMIN, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Удалить значение атрибута' })
  remove(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.attributeValueService.remove(tenant, id);
  }
}
