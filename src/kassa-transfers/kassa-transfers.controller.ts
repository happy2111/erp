// kassa-transfers/kassa-transfers.controller.ts
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { KassaTransfersService } from './kassa-transfers.service';
import { CreateKassaTransferDto } from './dto/create-kassa-transfer.dto';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../guards/tenant-roles.guard';
import { Roles } from '../decorators/tenant-roles.decorator';
import { OrgUserRole } from '.prisma/client-tenant';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import type { Tenant } from '@prisma/client';

@ApiTags('Kassa Transfers')
@ApiSecurity('x-tenant-key')
@ApiBearerAuth()
@Controller('kassa-transfers')
export class KassaTransfersController {
  constructor(private readonly transfersService: KassaTransfersService) {}

  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(
    OrgUserRole.ADMIN,
    OrgUserRole.MANAGER,
    OrgUserRole.OWNER,
    OrgUserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Создать перевод между кассами' })
  create(@CurrentTenant() tenant: Tenant, @Body() dto: CreateKassaTransferDto) {
    return this.transfersService.create(tenant, dto);
  }

  @Get()
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Получить список переводов с пагинацией' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  findAll(
    @CurrentTenant() tenant: Tenant,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.transfersService.findAll(tenant, {
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
    });
  }
}
