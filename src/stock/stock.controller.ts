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
  ApiTags,
  ApiOperation,
  ApiSecurity,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';

import { StockService } from './stock.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { StockFilterDto } from './dto/filter-stock.dto';

import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../guards/tenant-roles.guard';
import { Roles } from '../decorators/tenant-roles.decorator';
import { OrgUserRole } from '.prisma/client-tenant';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import type { Tenant } from '@prisma/client';

@ApiTags('Stocks')
@ApiSecurity('x-tenant-key')
@ApiSecurity('Authorization')
@Controller('stocks')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Создать запись складского остатка' })
  @ApiResponse({ status: 201, description: 'Создано успешно' })
  create(@CurrentTenant() tenant: Tenant, @Body() dto: CreateStockDto) {
    return this.stockService.create(tenant, dto);
  }

  @Post('filter')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Получить складские остатки (фильтр + пагинация)' })
  findAll(@CurrentTenant() tenant: Tenant, @Body() filter: StockFilterDto) {
    return this.stockService.findAll(tenant, filter);
  }

  @Get(':id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Получить складской остаток по ID' })
  @ApiParam({ name: 'id', description: 'ID складской записи' })
  findOne(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.stockService.findOne(tenant, id);
  }

  @Patch('update/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Обновить складской остаток' })
  update(
    @CurrentTenant() tenant: Tenant,
    @Param('id') id: string,
    @Body() dto: UpdateStockDto,
  ) {
    return this.stockService.update(tenant, id, dto);
  }

  @Delete('remove/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Удалить запись складского остатка' })
  remove(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.stockService.remove(tenant, id);
  }
}
