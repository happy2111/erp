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
import { PurchasesService } from './purchases.service';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../guards/tenant-roles.guard';
import { Roles } from '../decorators/tenant-roles.decorator';
import { OrgUserRole, PurchaseStatus } from '.prisma/client-tenant';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import type { Tenant } from '@prisma/client';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PurchaseFilterDto } from './dto/purchase-filter.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';

@ApiTags('Purchases')
@ApiSecurity('x-tenant-key')
@ApiBearerAuth()
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(
    OrgUserRole.ADMIN,
    OrgUserRole.MANAGER,
    OrgUserRole.OWNER,
    OrgUserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Создать новую закупку (черновик или сразу)' })
  create(@CurrentTenant() tenant: Tenant, @Body() dto: CreatePurchaseDto) {
    return this.purchasesService.create(tenant, dto);
  }

  @Get()
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Список закупок с фильтрацией и пагинацией' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, enum: PurchaseStatus })
  @ApiQuery({ name: 'supplierId', required: false })
  findAll(@CurrentTenant() tenant: Tenant, @Query() filter: PurchaseFilterDto) {
    return this.purchasesService.findAll(tenant, filter);
  }

  @Get(':id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Получить закупку по ID со всеми позициями' })
  @ApiParam({ name: 'id' })
  findOne(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.purchasesService.findOne(tenant, id);
  }

  @Patch('update/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Обновить закупку' })
  update(
    @CurrentTenant() tenant: Tenant,
    @Param('id') id: string,
    @Body() dto: UpdatePurchaseDto,
  ) {
    return this.purchasesService.update(tenant, id, dto);
  }

  @Delete('remove/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Удалить закупку (только если нет платежей)' })
  remove(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.purchasesService.remove(tenant, id);
  }

  @Post(':id/confirm')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(
    OrgUserRole.ADMIN,
    OrgUserRole.MANAGER,
    OrgUserRole.OWNER,
    OrgUserRole.ACCOUNTANT,
  )
  @ApiOperation({
    summary: 'Подтвердить закупку (перевод в PAID + списание с кассы)',
  })
  confirm(
    @CurrentTenant() tenant: Tenant,
    @Param('id') id: string,
    @Body('kassaId') kassaId?: string,
  ) {
    return this.purchasesService.confirmPurchase(tenant, id, kassaId);
  }
}
