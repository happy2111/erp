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
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { CurrencyService } from './currency.service';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../guards/tenant-roles.guard';
import { Roles } from '../decorators/tenant-roles.decorator';
import { OrgUserRole } from '.prisma/client-tenant';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import type { Tenant } from '@prisma/client';

@ApiTags('Currencies')
@ApiSecurity('x-tenant-key')
@Controller('currencies')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Создать новую валюту' })
  @ApiResponse({
    status: 201,
    description: 'Валюта успешно создана',
    example: {
      id: 'uuid-currency',
      code: 'USD',
      name: 'Доллар США',
      symbol: '$',
      createdAt: '2025-11-06T12:00:00Z',
      updatedAt: '2025-11-06T12:00:00Z',
    },
  })
  create(@CurrentTenant() tenant: Tenant, @Body() dto: CreateCurrencyDto) {
    return this.currencyService.create(tenant, dto);
  }

  @Get()
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Получить список всех валют' })
  @ApiResponse({
    status: 200,
    description: 'Список валют успешно получен',
    example: [
      { id: 'uuid-1', code: 'USD', name: 'Доллар США', symbol: '$' },
      { id: 'uuid-2', code: 'UZS', name: 'Узбекский сум', symbol: "so'm" },
    ],
  })
  findAll(@CurrentTenant() tenant: Tenant) {
    return this.currencyService.findAll(tenant);
  }

  @Get(':id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Получить валюту по ID' })
  @ApiParam({ name: 'id', description: 'ID валюты' })
  @ApiResponse({
    status: 200,
    description: 'Валюта найдена',
    example: {
      id: 'uuid-currency',
      code: 'USD',
      name: 'Доллар США',
      symbol: '$',
    },
  })
  @ApiResponse({ status: 404, description: 'Валюта не найдена' })
  findOne(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.currencyService.findOne(tenant, id);
  }

  @Patch('update/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Обновить валюту' })
  @ApiParam({ name: 'id', description: 'ID валюты' })
  @ApiResponse({
    status: 200,
    description: 'Валюта успешно обновлена',
    example: {
      id: 'uuid-currency',
      code: 'EUR',
      name: 'Евро',
      symbol: '€',
    },
  })
  @ApiResponse({ status: 404, description: 'Валюта не найдена' })
  update(
    @CurrentTenant() tenant: Tenant,
    @Param('id') id: string,
    @Body() dto: UpdateCurrencyDto,
  ) {
    return this.currencyService.update(tenant, id, dto);
  }

  @Delete('remove/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Удалить валюту' })
  @ApiParam({ name: 'id', description: 'ID валюты' })
  @ApiResponse({ status: 200, description: 'Валюта успешно удалена' })
  @ApiResponse({ status: 404, description: 'Валюта не найдена' })
  remove(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.currencyService.remove(tenant, id);
  }
}
