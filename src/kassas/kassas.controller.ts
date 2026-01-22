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
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { KassasService } from './kassas.service';
import { CreateKassaDto, UpdateKassaDto } from './dto/create-kassa.dto';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../guards/tenant-roles.guard';
import { Roles } from '../decorators/tenant-roles.decorator';
import { OrgUserRole } from '.prisma/client-tenant';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import type { Tenant } from '@prisma/client';

@ApiTags('Kassas')
@ApiSecurity('x-tenant-key')
@ApiBearerAuth()
@Controller('kassas')
export class KassasController {
  constructor(private readonly kassasService: KassasService) {}

  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(
    OrgUserRole.ADMIN,
    OrgUserRole.MANAGER,
    OrgUserRole.OWNER,
    OrgUserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Создать новую кассу' })
  create(@CurrentTenant() tenant: Tenant, @Body() dto: CreateKassaDto) {
    return this.kassasService.create(tenant, dto);
  }

  @Get()
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Получить список касс с пагинацией и поиском' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'search', required: false, example: 'наличные' })
  findAll(
    @CurrentTenant() tenant: Tenant,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.kassasService.findAll(tenant, {
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
      search,
    });
  }

  @Get(':id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Получить кассу по ID' })
  @ApiParam({ name: 'id', description: 'ID кассы' })
  findOne(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.kassasService.findOne(tenant, id);
  }

  @Patch('update/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(
    OrgUserRole.ADMIN,
    OrgUserRole.MANAGER,
    OrgUserRole.OWNER,
    OrgUserRole.ACCOUNTANT,
  )
  @ApiOperation({ summary: 'Обновить кассу' })
  @ApiParam({ name: 'id', description: 'ID кассы' })
  update(
    @CurrentTenant() tenant: Tenant,
    @Param('id') id: string,
    @Body() dto: UpdateKassaDto,
  ) {
    return this.kassasService.update(tenant, id, dto);
  }

  @Delete('remove/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Удалить кассу' })
  @ApiParam({ name: 'id', description: 'ID кассы' })
  remove(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.kassasService.remove(tenant, id);
  }

  @Get(':id/history')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({
    summary:
      'Получить полную историю операций по кассе (платежи + переводы между кассами)',
  })
  @ApiParam({ name: 'id', description: 'ID кассы' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['INCOME', 'EXPENSE', 'TRANSFER'],
    description: 'Фильтр по типу операции',
  })
  @ApiQuery({ name: 'fromDate', required: false, example: '2025-01-01' })
  @ApiQuery({ name: 'toDate', required: false, example: '2025-12-31' })
  getHistory(
    @CurrentTenant() tenant: Tenant,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: 'INCOME' | 'EXPENSE' | 'TRANSFER',
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.kassasService.getKassaHistory(tenant, id, {
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
      type,
      fromDate,
      toDate,
    });
  }
}
