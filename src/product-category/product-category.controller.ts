import {
  Controller,
  Post,
  Body,
  Delete,
  Param,
  Get, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProductCategoryService } from './product-category.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import {CurrentTenant} from "../decorators/currectTenant.decorator";
import {ApiKeyGuard} from "../guards/api-key.guard";
import {JwtAuthGuard} from "../tenant-auth/guards/jwt.guard";
import {TenantRolesGuard} from "../guards/tenant-roles.guard";
import type {Tenant} from "@prisma/client";
import {Roles} from "../decorators/tenant-roles.decorator";
import {OrgUserRole} from ".prisma/client-tenant";

@ApiTags('Product Categories')
@Controller('product-categories')
export class ProductCategoryController {
  constructor(private readonly service: ProductCategoryService) {}

  @Post()
  @ApiOperation({ summary: 'Добавить товар в категорию' })
  @ApiResponse({ status: 201 })
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.OWNER, OrgUserRole.ADMIN, OrgUserRole.MANAGER)
  create(
    @CurrentTenant() tenant: Tenant,
    @Body() dto: CreateProductCategoryDto,
  ) {
    return this.service.create(tenant, dto);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Получить все категории конкретного товара' })
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  findAllByProduct(
    @CurrentTenant() tenant: Tenant,
    @Param('productId') productId: string,
  ) {
    return this.service.findAllByProduct(tenant, productId);
  }

  @Get('category/:categoryId')
  @ApiOperation({ summary: 'Получить все товары конкретной категории' })
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  findAllByCategory(
    @CurrentTenant() tenant: Tenant,
    @Param('categoryId') categoryId: string,
  ) {
    return this.service.findAllByCategory(tenant, categoryId);
  }

  @Delete()
  @ApiOperation({ summary: 'Удалить связь товар ↔ категория' })
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.OWNER, OrgUserRole.ADMIN, OrgUserRole.MANAGER)
  delete(
    @CurrentTenant() tenant: Tenant,
    @Body() dto: CreateProductCategoryDto,
  ) {
    return this.service.delete(tenant, dto);
  }
}
