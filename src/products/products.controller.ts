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
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/filter-product.dto';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../guards/tenant-roles.guard';
import { Roles } from '../decorators/tenant-roles.decorator';
import { OrgUserRole } from '.prisma/client-tenant';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import type { Tenant } from '@prisma/client';

@ApiTags('Products')
@ApiSecurity('x-tenant-key')
@ApiSecurity('Authorization')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Создать новый товар' })
  @ApiResponse({
    status: 201,
    description: 'Товар успешно создан',
    example: {
      id: 'uuid-prod',
      name: 'iPhone 15 Pro',
      createdAt: '2025-11-06T12:00:00Z',
    },
  })
  create(@CurrentTenant() tenant: Tenant, @Body() dto: CreateProductDto) {
    return this.productsService.create(tenant, dto);
  }

  @Post('filter')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Фильтрация и пагинация товаров' })
  @ApiResponse({
    status: 200,
    description: 'Список товаров успешно получен',
    example: {
      data: [
        { id: 'uuid-1', name: 'iPhone 15 Pro' },
        { id: 'uuid-2', name: 'Samsung S25 Ultra' },
      ],
      total: 2,
      page: 1,
      limit: 10,
    },
  })
  findAll(@CurrentTenant() tenant: Tenant, @Body() filter: ProductFilterDto) {
    return this.productsService.findAll(tenant, filter);
  }

  @Get(':id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Получить товар по ID' })
  @ApiParam({ name: 'id', description: 'ID товара' })
  @ApiResponse({
    status: 200,
    description: 'Товар найден',
    example: {
      id: 'uuid-prod',
      name: 'iPhone 15 Pro',
      brand: { id: 'uuid-brand', name: 'Apple' },
    },
  })
  @ApiResponse({ status: 404, description: 'Товар не найден' })
  findOne(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.productsService.findOne(tenant, id);
  }

  @Patch('update/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Обновить товар' })
  @ApiParam({ name: 'id', description: 'ID товара' })
  @ApiResponse({
    status: 200,
    description: 'Товар успешно обновлён',
    example: { id: 'uuid-prod', name: 'Updated Product' },
  })
  @ApiResponse({ status: 404, description: 'Товар не найден' })
  @ApiResponse({ status: 409, description: 'Товар с таким кодом уже существует' })
  update(
    @CurrentTenant() tenant: Tenant,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(tenant, id, dto);
  }

  @Delete('remove/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Удалить товар' })
  @ApiParam({ name: 'id', description: 'ID товара' })
  @ApiResponse({ status: 200, description: 'Товар успешно удалён' })
  @ApiResponse({ status: 404, description: 'Товар не найден' })
  @ApiResponse({ status: 400, description: 'Невозможно удалить товар (есть связи)' })
  remove(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.productsService.remove(tenant, id);
  }
}
