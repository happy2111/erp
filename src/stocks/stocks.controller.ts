import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../guards/tenant-roles.guard';
import { Roles } from '../decorators/tenant-roles.decorator';
import { OrgUserRole } from '.prisma/client-tenant';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import { CurrentTenantUser } from '../tenant-auth/decorators/current-tenant-user.decorator';
import type { Tenant } from '@prisma/client';
import type { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';

import { StocksService } from './stocks.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { StockFilterDto } from './dto/stock-filter.dto';

@ApiTags('stocks')
@ApiSecurity('x-tenant-key')
@ApiBearerAuth()
@Controller('stocks')
export class StocksController {
  constructor(private readonly service: StocksService) {}

  @Get('admin/all')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({
    summary: 'Список всех остатков на складе организации (админ-панель)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Поиск по названию / SKU / коду',
  })
  @ApiQuery({ name: 'sortField', required: false, example: 'updatedAt' })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async getAllAdmin(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Query() filter: StockFilterDto,
  ) {
    return this.service.getAllAdmin(tenant, user.orgId, filter);
  }

  @Get('variant/:variantId')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({
    summary: 'Получить текущий остаток по конкретному варианту товара',
  })
  @ApiParam({ name: 'variantId', description: 'ID варианта товара' })
  async getStockByVariant(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('variantId') variantId: string,
  ) {
    return this.service.getStockByVariant(tenant, user.orgId, variantId);
  }

  @Post('adjust')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(
    OrgUserRole.ADMIN,
    OrgUserRole.MANAGER,
    OrgUserRole.OWNER,
    OrgUserRole.ACCOUNTANT,
  )
  @ApiOperation({
    summary: 'Изменить остаток на складе (приход / расход / корректировка)',
  })
  async adjustStock(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Body() dto: AdjustStockDto,
  ) {
    const result = await this.service.adjustStock(tenant, user, dto);
    return { data: result };
  }
}
