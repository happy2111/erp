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
import { ProductVariantAttributeService } from './product-variant-attribute.service';
import { CreateProductVariantAttributeDto } from './dto/create-product-variant-attribute.dto';
import { UpdateProductVariantAttributeDto } from './dto/update-product-variant-attribute.dto';
import { FilterProductVariantAttributeDto } from './dto/filter-product-variant-attribute.dto';
import type { Tenant } from '@prisma/client';
import { CurrentTenant } from '../../decorators/currectTenant.decorator';
import { JwtAuthGuard } from '../../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../../guards/tenant-roles.guard';
import { ApiKeyGuard } from '../../guards/api-key.guard';
import { Roles } from '../../decorators/tenant-roles.decorator';
import { OrgUserRole } from '.prisma/client-tenant';

@ApiTags('Product Variant Attributes')
@Controller('product-variant-attributes')
export class ProductVariantAttributeController {
  constructor(private readonly service: ProductVariantAttributeService) {}

  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.OWNER, OrgUserRole.ADMIN, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Создать связь варианта товара и значения атрибута' })
  create(@CurrentTenant() tenant: Tenant, @Body() dto: CreateProductVariantAttributeDto) {
    return this.service.create(tenant, dto);
  }

  @Get('filter')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.OWNER, OrgUserRole.ADMIN, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Получить список связей вариантов и значений атрибутов' })
  findAll(@CurrentTenant() tenant: Tenant, @Body() filter: FilterProductVariantAttributeDto) {
    return this.service.findAll(tenant, filter);
  }

  @Get(':id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.OWNER, OrgUserRole.ADMIN, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Получить связь варианта товара и значения атрибута по ID' })
  findOne(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.service.findOne(tenant, id);
  }

  @Put('update/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.OWNER, OrgUserRole.ADMIN, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Обновить связь варианта и значения атрибута' })
  update(
    @CurrentTenant() tenant: Tenant,
    @Param('id') id: string,
    @Body() dto: UpdateProductVariantAttributeDto,
  ) {
    return this.service.update(tenant, id, dto);
  }

  @Delete('remove/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.OWNER, OrgUserRole.ADMIN, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Удалить связь варианта и значения атрибута' })
  remove(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.service.remove(tenant, id);
  }
}
