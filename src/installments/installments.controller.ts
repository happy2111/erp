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
import type { Tenant } from '@prisma/client';
import { CreateInstallmentPaymentDto } from './dto/create-installment-payment.dto';
import { InstallmentFilterDto } from './dto/installment-filter.dto';
import { CreateInstallmentDto } from './dto/create-installment.dto';
import { CurrentTenantUser } from '../tenant-auth/decorators/current-tenant-user.decorator';
import type { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';

@ApiTags('Installments')
@ApiSecurity('x-tenant-key')
@ApiBearerAuth()
@Controller('installments')
export class InstallmentsController {
  constructor(private readonly installmentsService: InstallmentsService) {}

  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Создать рассрочку по продаже' })
  create(@CurrentTenant() tenant: Tenant, @Body() dto: CreateInstallmentDto) {
    return this.installmentsService.create(tenant, dto);
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
    @Body() dto: CreateInstallmentPaymentDto,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
  ) {
    return this.installmentsService.addPayment(tenant, dto, user);
  }

  @Get()
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Список всех рассрочек с фильтрацией' })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: InstallmentStatus })
  @ApiQuery({
    name: 'overdue',
    required: false,
    description: 'true — только просроченные',
  })
  findAll(
    @CurrentTenant() tenant: Tenant,
    @Query() filter: InstallmentFilterDto,
  ) {
    return this.installmentsService.findAll(tenant, filter);
  }

  @Get(':id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Получить рассрочку по ID со всеми платежами' })
  @ApiParam({ name: 'id' })
  findOne(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.installmentsService.findOne(tenant, id);
  }
}
