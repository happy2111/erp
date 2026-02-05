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
import { KassaTransfersService } from './kassa-transfers.service';
import { CreateKassaTransferDto } from './dto/create-kassa-transfer.dto';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../guards/tenant-roles.guard';
import { Roles } from '../decorators/tenant-roles.decorator';
import { OrgUserRole } from '.prisma/client-tenant';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import { CurrentTenantUser } from '../tenant-auth/decorators/current-tenant-user.decorator';
import type { Tenant } from '@prisma/client';
import type { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';
import { GetKassaTransferQueryDto } from './dto/get-kassa-transfer-query.dto';

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
  create(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Body() dto: CreateKassaTransferDto,
  ) {
    return this.transfersService.create(tenant, user, dto);
  }

  @Get('/all')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Список всех переводов между кассами организации' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Поиск по описанию',
  })
  @ApiQuery({ name: 'fromKassaId', required: false })
  @ApiQuery({ name: 'toKassaId', required: false })
  @ApiQuery({ name: 'sortField', required: false, example: 'createdAt' })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async getAllAdmin(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Query() query: GetKassaTransferQueryDto,
  ) {
    return this.transfersService.getAllAdmin(tenant, user.orgId, query);
  }

  @Get(':id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Получить детальную информацию по одному переводу' })
  @ApiParam({ name: 'id', description: 'ID перевода' })
  findOne(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.transfersService.findOne(tenant, user, id);
  }
}
