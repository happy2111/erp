import {
  Body,
  Controller,
  Get,
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
import { StocksService } from './stocks.service';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../guards/tenant-roles.guard';
import { Roles } from '../decorators/tenant-roles.decorator';
import { OrgUserRole } from '.prisma/client-tenant';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import { CurrentTenantUser } from '../tenant-auth/decorators/current-tenant-user.decorator';
import type { Tenant } from '@prisma/client';
import type { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';
import { StockFilterDto } from './dto/stock-filter.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@ApiTags('Stocks')
@ApiSecurity('x-tenant-key')
@ApiBearerAuth()
@Controller('stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Get()
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({
    summary: 'Получить список остатков на складе с пагинацией и поиском',
  })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Поиск по названию товара / SKU / баркоду',
  })
  findAll(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Query() filter: StockFilterDto,
  ) {
    return this.stocksService.findAll(tenant, user, filter);
  }

  @Get('variant/:productVariantId')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Получить остаток по конкретному варианту товара' })
  @ApiParam({ name: 'productVariantId', description: 'ID варианта товара' })
  findOne(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('productVariantId') productVariantId: string,
  ) {
    return this.stocksService.findOne(tenant, user, productVariantId);
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
    summary: 'Изменить остаток на складе (приход/расход/корректировка)',
  })
  adjustStock(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Body() dto: AdjustStockDto,
  ) {
    return this.stocksService.adjustStock(tenant, user, dto);
  }
}
