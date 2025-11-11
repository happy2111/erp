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
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { BrandFilterDto } from './dto/filter-brand.dto';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../guards/tenant-roles.guard';
import { Roles } from '../decorators/tenant-roles.decorator';
import { OrgUserRole } from '.prisma/client-tenant';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import type { Tenant } from '@prisma/client';

@ApiTags('Brands')
@ApiSecurity('x-tenant-key')
@ApiSecurity('Authorization')
@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Создать новый бренд' })
  @ApiResponse({
    status: 201,
    description: 'Бренд успешно создан',
    example: { id: 'uuid-brand', name: 'Apple', createdAt: '2025-11-06T12:00:00Z' },
  })
  @ApiResponse({ status: 409, description: 'Бренд с таким именем уже существует' })
  create(@CurrentTenant() tenant: Tenant, @Body() dto: CreateBrandDto) {
    return this.brandsService.create(tenant, dto);
  }

  @Post('filter')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Фильтрация и пагинация брендов' })
  @ApiResponse({
    status: 200,
    description: 'Список брендов успешно получен',
    example: {
      data: [
        { id: 'uuid-1', name: 'Apple' },
        { id: 'uuid-2', name: 'Samsung' },
      ],
      total: 2,
      page: 1,
      limit: 10,
    },
  })
  findAll(@CurrentTenant() tenant: Tenant, @Body() filter: BrandFilterDto) {
    return this.brandsService.findAll(tenant, filter);
  }

  @Get(':id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Получить бренд по ID' })
  @ApiParam({ name: 'id', description: 'ID бренда' })
  @ApiResponse({
    status: 200,
    description: 'Бренд найден',
    example: {
      id: 'uuid-brand',
      name: 'Samsung',
      products: [
        { id: 'uuid-product', name: 'Galaxy S25', price: 1200 },
      ],
    },
  })
  @ApiResponse({ status: 404, description: 'Бренд не найден' })
  findOne(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.brandsService.findOne(tenant, id);
  }

  @Patch('update/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Обновить данные бренда' })
  @ApiParam({ name: 'id', description: 'ID бренда' })
  @ApiResponse({
    status: 200,
    description: 'Бренд успешно обновлён',
    example: { id: 'uuid-brand', name: 'Updated Brand' },
  })
  @ApiResponse({ status: 404, description: 'Бренд не найден' })
  @ApiResponse({ status: 409, description: 'Бренд с таким именем уже существует' })
  update(
    @CurrentTenant() tenant: Tenant,
    @Param('id') id: string,
    @Body() dto: UpdateBrandDto,
  ) {
    return this.brandsService.update(tenant, id, dto);
  }

  @Delete('remove/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Удалить бренд' })
  @ApiParam({ name: 'id', description: 'ID бренда' })
  @ApiResponse({ status: 200, description: 'Бренд успешно удалён' })
  @ApiResponse({ status: 404, description: 'Бренд не найден' })
  @ApiResponse({ status: 400, description: 'Невозможно удалить бренд (есть связанные товары)' })
  remove(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.brandsService.remove(tenant, id);
  }
}
