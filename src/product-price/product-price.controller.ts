import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';

import { CreateProductPriceDto } from './dto/create-product-price.dto';
import { UpdateProductPriceDto } from './dto/update-product-price.dto';
import { ProductPriceFilterDto } from './dto/filter-product-price.dto';

import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../guards/tenant-roles.guard';
import { Roles } from '../decorators/tenant-roles.decorator';
import { OrgUserRole } from '.prisma/client-tenant';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import type { Tenant } from '@prisma/client';
import {ProductPricesService} from "./product-price.service";

@ApiTags('Product Prices')
@ApiSecurity('x-tenant-key')
@ApiSecurity('Authorization')
@Controller('product-prices')
export class ProductPricesController {
  constructor(private readonly pricesService: ProductPricesService) {}

  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Создать цену для товара' })
  @ApiResponse({ status: 201, description: 'Цена успешно создана' })
  create(@CurrentTenant() tenant: Tenant, @Body() dto: CreateProductPriceDto) {
    return this.pricesService.create(tenant, dto);
  }

  @Post('filter')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Получить список цен (фильтрация + пагинация)' })
  findAll(
    @CurrentTenant() tenant: Tenant,
    @Body() filter: ProductPriceFilterDto,
  ) {
    return this.pricesService.findAll(tenant, filter);
  }

  @Get(':id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Получить цену по ID' })
  @ApiParam({ name: 'id', description: 'ID цены' })
  findOne(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.pricesService.findOne(tenant, id);
  }

  @Patch('update/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Обновить цену' })
  update(
    @CurrentTenant() tenant: Tenant,
    @Param('id') id: string,
    @Body() dto: UpdateProductPriceDto,
  ) {
    return this.pricesService.update(tenant, id, dto);
  }

  @Delete('remove/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Удалить цену' })
  remove(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.pricesService.remove(tenant, id);
  }
}
