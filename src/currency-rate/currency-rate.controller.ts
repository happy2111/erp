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
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { CurrencyRateService } from './currency-rate.service';
import { CreateCurrencyRateDto } from './dto/create-currency-rate.dto';
import { UpdateCurrencyRateDto } from './dto/update-currency-rate.dto';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../guards/tenant-roles.guard';
import { Roles } from '../decorators/tenant-roles.decorator';
import { OrgUserRole } from '.prisma/client-tenant';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import type { Tenant } from '@prisma/client';
import { CurrentTenantUser } from '../tenant-auth/decorators/current-tenant-user.decorator';
import { GetCurrencyRateQueryDto } from './dto/get-currency-rate-query.dto';
import type { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';

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

  @Get('all')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({
    summary: 'Список всех курсов валют с пагинацией и фильтрацией',
  })
  @ApiQuery({ name: 'baseCurrency', required: false, example: 'USD' })
  @ApiQuery({ name: 'targetCurrency', required: false, example: 'UZS' })
  @ApiQuery({ name: 'sortField', required: false, example: 'date' })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async getAllAdmin(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Query() query: GetCurrencyRateQueryDto,
  ) {
    return this.currencyRateService.getAllAdmin(tenant, query);
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
  update(
    @CurrentTenant() tenant: Tenant,
    @Param('id') id: string,
    @Body() dto: UpdateCurrencyRateDto,
  ) {
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
