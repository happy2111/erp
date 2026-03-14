import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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

import { ProductVariantsService } from './product-variants.service';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { GetProductVariantQueryDto } from './dto/get-product-variant-query.dto';

@ApiTags('product-variants')
@ApiSecurity('x-tenant-key')
@ApiBearerAuth()
@Controller('product-variants')
export class ProductVariantsController {
  constructor(private readonly service: ProductVariantsService) {}

  @Get('admin/all')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Список всех вариантов товаров (админ-панель)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'productId', required: false })
  @ApiQuery({ name: 'attributes', required: false })
  @ApiQuery({ name: 'sortField', required: false, example: 'title' })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async getAllAdmin(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Query() query: GetProductVariantQueryDto,
  ) {
    console.log('RAW QUERY:', query);
    return this.service.getAllAdmin(tenant, user.orgId, query);
  }

  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Создать новый вариант товара' })
  async create(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Body() dto: CreateProductVariantDto,
  ) {
    const variant = await this.service.create(tenant, user.orgId, dto);
    return { data: variant };
  }

  @Patch('update/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Обновить вариант товара' })
  @ApiParam({ name: 'id' })
  async update(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductVariantDto,
  ) {
    const updated = await this.service.update(tenant, user.orgId, id, dto);
    return { data: updated };
  }

  @Delete('remove/:id/hard')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Жёсткое удаление варианта товара' })
  @ApiParam({ name: 'id' })
  async hardDelete(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.service.hardDelete(tenant, user.orgId, id);
  }

  @Get('admin/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Получить один вариант товара по ID' })
  async getOneAdmin(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('id') id: string,
  ) {
    const variant = await this.service.getByIdAdmin(tenant, user.orgId, id);
    return { data: variant };
  }

  // Дополнительный удобный эндпоинт — все варианты конкретного товара
  @Get('product/:productId')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Получить все варианты конкретного товара' })
  async getVariantsByProduct(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('productId') productId: string,
    @Query() query: GetProductVariantQueryDto,
  ) {
    return this.service.getVariantsByProduct(
      tenant,
      user.orgId,
      productId,
      query,
    );
  }
}
