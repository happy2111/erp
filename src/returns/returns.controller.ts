// returns/returns.controller.ts
import {
  Body,
  Controller,
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
import { ReturnsService } from './returns.service';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../guards/tenant-roles.guard';
import { Roles } from '../decorators/tenant-roles.decorator';
import { OrgUserRole } from '.prisma/client-tenant';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import { CurrentTenantUser } from '../tenant-auth/decorators/current-tenant-user.decorator';
import type { Tenant } from '@prisma/client';
import type { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';
import { UpdateReturnDto } from './dto/update-return.dto';
import { ReturnFilterDto } from './dto/return-filter.dto';
import { CreateReturnDto } from './dto/create-returns.dto';
import { ReturnStatus } from './types/returns.type';

@ApiTags('Returns')
@ApiSecurity('x-tenant-key')
@ApiBearerAuth()
@Controller('returns')
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(
    OrgUserRole.ADMIN,
    OrgUserRole.MANAGER,
    OrgUserRole.OWNER,
    OrgUserRole.SELLER,
  )
  @ApiOperation({ summary: 'Создать заявку на возврат товаров' })
  create(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Body() dto: CreateReturnDto,
  ) {
    return this.returnsService.create(tenant, user, dto);
  }

  @Get()
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Список всех возвратов с фильтрами' })
  @ApiQuery({ name: 'status', required: false, enum: ReturnStatus })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'saleId', required: false })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  findAll(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Query() filter: ReturnFilterDto,
  ) {
    return this.returnsService.findAll(tenant, user, filter);
  }

  @Get(':id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Получить возврат по ID' })
  @ApiParam({ name: 'id' })
  findOne(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.returnsService.findOne(tenant, user, id);
  }

  @Patch(':id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Обновить возврат (статус, заметки)' })
  @ApiParam({ name: 'id' })
  update(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateReturnDto,
  ) {
    return this.returnsService.update(tenant, user, id, dto);
  }

  // returns/returns.controller.ts
  @Post(':id/confirm')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(
    OrgUserRole.ADMIN,
    OrgUserRole.MANAGER,
    OrgUserRole.OWNER,
    OrgUserRole.ACCOUNTANT,
  )
  @ApiOperation({
    summary: 'Подтвердить возврат (REFUNDED + возврат денег и товаров)',
  })
  @ApiParam({ name: 'id' })
  confirmReturn(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('id') id: string,
    @Body('refundKassaId') refundKassaId: string, // ← добавляем обязательное поле
    @Body('refundAmount') refundAmount?: number,
  ) {
    return this.returnsService.confirmReturn(
      tenant,
      user,
      id,
      refundKassaId,
      refundAmount,
    );
  }
}
