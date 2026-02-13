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
import { InstallmentsService } from './installments.service';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../guards/tenant-roles.guard';
import { Roles } from '../decorators/tenant-roles.decorator';
import { InstallmentStatus, OrgUserRole } from '.prisma/client-tenant';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import { CurrentTenantUser } from '../tenant-auth/decorators/current-tenant-user.decorator';
import type { Tenant } from '@prisma/client';
import type { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';
import { CreateInstallmentPaymentDto } from './dto/create-installment-payment.dto';
import { CreateInstallmentDto } from './dto/create-installment.dto';
import { CancelInstallmentDto } from './dto/cancel-installment.dto';
import { GetInstallmentQueryDto } from './dto/get-installment-query.dto';

@ApiTags('Installments')
@ApiSecurity('x-tenant-key')
@ApiBearerAuth()
@Controller('installments')
export class InstallmentsController {
  constructor(private readonly installmentsService: InstallmentsService) {}

  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(
    OrgUserRole.ADMIN,
    OrgUserRole.MANAGER,
    OrgUserRole.OWNER,
    OrgUserRole.ACCOUNTANT,
    OrgUserRole.SELLER,
  )
  @ApiOperation({ summary: 'Создать рассрочку по продаже' })
  create(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Body() dto: CreateInstallmentDto,
  ) {
    return this.installmentsService.create(tenant, user, dto);
  }

  @Post('payment')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(
    OrgUserRole.ADMIN,
    OrgUserRole.MANAGER,
    OrgUserRole.OWNER,
    OrgUserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Добавить платёж по рассрочке' })
  addPayment(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Body() dto: CreateInstallmentPaymentDto,
  ) {
    return this.installmentsService.addPayment(tenant, user, dto);
  }

  @Get('admin/all')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(
    OrgUserRole.ADMIN,
    OrgUserRole.OWNER,
    OrgUserRole.MANAGER,
    OrgUserRole.ACCOUNTANT,
  )
  @ApiOperation({
    summary: 'Список всех рассрочек организации с фильтрацией и пагинацией',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Поиск по номеру продажи / имени клиента',
  })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: InstallmentStatus })
  @ApiQuery({
    name: 'overdue',
    required: false,
    description: 'true — только просроченные',
  })
  @ApiQuery({ name: 'sortField', required: false, example: 'dueDate' })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async getAllAdmin(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Query() query: GetInstallmentQueryDto,
  ) {
    return this.installmentsService.getAllAdmin(tenant, user.orgId, query);
  }

  @Get(':id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Получить рассрочку по ID со всеми платежами' })
  @ApiParam({ name: 'id' })
  findOne(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.installmentsService.findOne(tenant, user, id);
  }

  @Post(':id/cancel')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Отменить рассрочку' })
  @ApiParam({ name: 'id', description: 'ID рассрочки' })
  cancel(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelInstallmentDto,
  ) {
    return this.installmentsService.cancel(tenant, user, id, dto);
  }
}
