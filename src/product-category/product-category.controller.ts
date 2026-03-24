import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../guards/tenant-roles.guard';
import { Roles } from '../decorators/tenant-roles.decorator';
import { OrgUserRole } from '.prisma/client-tenant';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import { CurrentTenantUser } from '../tenant-auth/decorators/current-tenant-user.decorator';
import type { Tenant } from '@prisma/client';
import type { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';

import { ProductCategoryService } from './product-category.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { GetProductCategoryQueryDto } from './dto/get-product-category-query.dto';

@ApiTags('product-categories')
@ApiSecurity('x-tenant-key')
@ApiBearerAuth()
@Controller('product-categories')
export class ProductCategoryController {
  constructor(private readonly service: ProductCategoryService) {}

  // ─── Админ-список всех связей (пагинация, фильтры) ────────────────────────
  @Get('admin/all')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({
    summary: 'Список всех связей товар ↔ категория (админ-панель)',
  })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Поиск по названию категории',
  })
  @ApiQuery({ name: 'sortField', required: false, example: 'createdAt' })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  async getAllAdmin(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Query() query: GetProductCategoryQueryDto,
  ) {
    return this.service.getAllAdmin(tenant, user, query);
  }

  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Добавить товар в категорию' })
  async create(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Body() dto: CreateProductCategoryDto,
  ) {
    const link = await this.service.create(tenant, user, dto);
    return { data: link };
  }

  @Delete('remove')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Удалить связь товар ↔ категория' })
  async remove(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Body() dto: CreateProductCategoryDto,
  ) {
    await this.service.remove(tenant, user, dto);
  }

  // ─── Получение всех категорий товара ───────────────────────────────────────
  @Get('product/:productId')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Все категории конкретного товара' })
  @ApiParam({ name: 'productId' })
  async getCategoriesByProduct(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('productId') productId: string,
  ) {
    return this.service.getCategoriesByProduct(tenant, user, productId);
  }

  // ─── Получение всех товаров категории ──────────────────────────────────────
  @Get('category/:categoryId')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Все товары конкретной категории' })
  @ApiParam({ name: 'categoryId' })
  async getProductsByCategory(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('categoryId') categoryId: string,
  ) {
    return this.service.getProductsByCategory(tenant, user, categoryId);
  }

  // ─── Получение одной связи по ID (если понадобится) ────────────────────────
  // @Get('admin/:id')
  // @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  // @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  // @ApiOperation({ summary: 'Получить одну связь товар ↔ категория по ID' })
  // async getOneAdmin(
  //   @CurrentTenant() tenant: Tenant,
  //   @CurrentTenantUser() user: JwtAuthenticatedUser,
  //   @Param('id') id: string,
  // ) {
  //   const link = await this.service.getByIdAdmin(tenant, user, id);
  //   return { data: link };
  // }
}
