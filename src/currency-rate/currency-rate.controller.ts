import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CurrencyRateService } from './currency-rate.service';
import { CreateCurrencyRateDto } from './dto/create-currency-rate.dto';
import { UpdateCurrencyRateDto } from './dto/update-currency-rate.dto';
import { CurrencyRateFilterDto } from './dto/filter-currency-rate.dto';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../guards/tenant-roles.guard';
import { Roles } from '../decorators/tenant-roles.decorator';
import { OrgUserRole } from '.prisma/client-tenant';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import type { Tenant } from '@prisma/client';

@ApiTags('Currency Rates')
@ApiSecurity('x-tenant-key')
@ApiSecurity('Authorization')
@Controller('currency-rates')
export class CurrencyRateController {
  constructor(private readonly currencyRateService: CurrencyRateService) {}

  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Создать новый курс валют' })
  create(@CurrentTenant() tenant: Tenant, @Body() dto: CreateCurrencyRateDto) {
    return this.currencyRateService.create(tenant, dto);
  }

  @Post('filter')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Фильтрация и пагинация курсов валют' })
  filter(@CurrentTenant() tenant: Tenant, @Body() dto: CurrencyRateFilterDto) {
    return this.currencyRateService.findAll(tenant, dto);
  }

  @Get(':id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Получить курс валют по ID' })
  @ApiParam({ name: 'id', description: 'ID курса валют' })
  findOne(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.currencyRateService.findOne(tenant, id);
  }

  @Patch('update/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Обновить курс валют' })
  @ApiParam({ name: 'id', description: 'ID курса валют' })
  update(@CurrentTenant() tenant: Tenant, @Param('id') id: string, @Body() dto: UpdateCurrencyRateDto) {
    return this.currencyRateService.update(tenant, id, dto);
  }

  @Delete('remove/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Удалить курс валют' })
  @ApiParam({ name: 'id', description: 'ID курса валют' })
  remove(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.currencyRateService.remove(tenant, id);
  }
}
