// transactions/transactions.controller.ts
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
import { TransactionsService } from './transactions.service';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../guards/tenant-roles.guard';
import { Roles } from '../decorators/tenant-roles.decorator';
import { OrgUserRole, RelatedType } from '.prisma/client-tenant';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import { CurrentTenantUser } from '../tenant-auth/decorators/current-tenant-user.decorator';
import type { Tenant } from '@prisma/client';
import type { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionFilterDto } from './dto/transaction-filter.dto';

@ApiTags('Transactions')
@ApiSecurity('x-tenant-key')
@ApiBearerAuth()
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(
    OrgUserRole.ADMIN,
    OrgUserRole.MANAGER,
    OrgUserRole.ACCOUNTANT,
    OrgUserRole.OWNER,
  )
  @ApiOperation({ summary: 'Создать новую транзакцию (движение денег)' })
  create(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(tenant, user.orgId, dto);
  }

  @Get()
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Список транзакций с фильтрацией и пагинацией' })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'relatedType', required: false, enum: RelatedType })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  findAll(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Query() filter: TransactionFilterDto,
  ) {
    return this.transactionsService.findAll(tenant, user.orgId, filter);
  }

  @Get('balance/:customerId/:currencyId')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Получить текущий баланс клиента по валюте' })
  @ApiParam({ name: 'customerId' })
  @ApiParam({ name: 'currencyId' })
  getBalance(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('customerId') customerId: string,
    @Param('currencyId') currencyId: string,
  ) {
    return this.transactionsService.getCustomerBalance(
      tenant,
      user.orgId,
      customerId,
      currencyId,
    );
  }
}
