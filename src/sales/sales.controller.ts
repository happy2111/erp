// sales/sales.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { SalesService } from './sales.service';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../guards/tenant-roles.guard';
import { Roles } from '../decorators/tenant-roles.decorator';
import { OrgUserRole } from '.prisma/client-tenant';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import type { Tenant } from '@prisma/client';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleFilterDto } from '../product-transaction/dto/sale-filter.dto';
import { UpdateSaleDto } from '../product-transaction/dto/update-sale.dto';

@ApiTags('Sales')
@ApiSecurity('x-tenant-key')
@ApiBearerAuth()
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(
    OrgUserRole.ADMIN,
    OrgUserRole.MANAGER,
    OrgUserRole.SELLER,
    OrgUserRole.OWNER,
  )
  @ApiOperation({ summary: 'Создать новую продажу (черновик или сразу)' })
  create(@CurrentTenant() tenant: Tenant, @Body() dto: CreateSaleDto) {
    return this.salesService.create(tenant, dto);
  }

  @Get()
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Список продаж с фильтрацией и пагинацией' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['DRAFT', 'PENDING', 'PAID', 'CANCELLED'],
  })
  findAll(@CurrentTenant() tenant: Tenant, @Query() filter: SaleFilterDto) {
    return this.salesService.findAll(tenant, filter);
  }

  @Get(':id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Получить продажу по ID со всеми позициями' })
  @ApiParam({ name: 'id' })
  findOne(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.salesService.findOne(tenant, id);
  }

  @Patch('update/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({
    summary: 'Обновить продажу (клиент, статус, примечания и т.д.)',
  })
  update(
    @CurrentTenant() tenant: Tenant,
    @Param('id') id: string,
    @Body() dto: UpdateSaleDto,
  ) {
    return this.salesService.update(tenant, id, dto);
  }

  @Delete('remove/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Удалить продажу (только если нет платежей)' })
  remove(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.salesService.remove(tenant, id);
  }

  @Post(':id/confirm')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(
    OrgUserRole.ADMIN,
    OrgUserRole.MANAGER,
    OrgUserRole.OWNER,
    OrgUserRole.SELLER,
  )
  @ApiOperation({
    summary: 'Подтвердить продажу (перевод в PAID + зачисление в кассу)',
  })
  confirm(
    @CurrentTenant() tenant: Tenant,
    @Param('id') id: string,
    @Body('kassaId') kassaId: string,
  ) {
    return this.salesService.confirmSale(tenant, id, kassaId);
  }
}
