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
import { ApiKeyGuard } from '../../guards/api-key.guard';
import { JwtAuthGuard } from '../../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../../guards/tenant-roles.guard';
import { Roles } from '../../decorators/tenant-roles.decorator';
import { OrgUserRole } from '.prisma/client-tenant';
import { CurrentTenant } from '../../decorators/currectTenant.decorator';
import { CurrentTenantUser } from '../../tenant-auth/decorators/current-tenant-user.decorator';
import type { Tenant } from '@prisma/client';
import type { JwtAuthenticatedUser } from '../../tenant-auth/interfaces/jwt.interface';

import { ProductVariantAttributeService } from './product-variant-attribute.service';
import { CreateProductVariantAttributeDto } from './dto/create-product-variant-attribute.dto';
import { UpdateProductVariantAttributeDto } from './dto/update-product-variant-attribute.dto';
import { GetProductVariantAttributeQueryDto } from './dto/get-product-variant-attribute-query.dto';

@ApiTags('product-variant-attributes')
@ApiSecurity('x-tenant-key')
@ApiBearerAuth()
@Controller('product-variant-attributes')
export class ProductVariantAttributeController {
  constructor(private readonly service: ProductVariantAttributeService) {}

  @Get('admin/all')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({
    summary: 'Список всех связей вариант ↔ значение атрибута (админ-панель)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Поиск по значению атрибута',
  })
  @ApiQuery({ name: 'productVariantId', required: false })
  @ApiQuery({ name: 'attributeValueId', required: false })
  @ApiQuery({ name: 'sortField', required: false, example: 'createdAt' })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  async getAllAdmin(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Query() query: GetProductVariantAttributeQueryDto,
  ) {
    return this.service.getAllAdmin(tenant, user, query);
  }

  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({
    summary: 'Создать связь варианта товара с значением атрибута',
  })
  async create(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Body() dto: CreateProductVariantAttributeDto,
  ) {
    const link = await this.service.create(tenant, user, dto);
    return { data: link };
  }

  @Patch('update/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({
    summary: 'Обновить связь (редко используется, но оставляем)',
  })
  @ApiParam({ name: 'id' })
  async update(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductVariantAttributeDto,
  ) {
    const updated = await this.service.update(tenant, user, id, dto);
    return { data: updated };
  }

  @Delete('remove/:id/hard')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Жёсткое удаление связи вариант ↔ атрибут' })
  @ApiParam({ name: 'id' })
  async hardDelete(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.service.hardDelete(tenant, user, id);
  }

  @Get('admin/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Получить одну связь по ID' })
  async getOneAdmin(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('id') id: string,
  ) {
    const link = await this.service.getByIdAdmin(tenant, user, id);
    return { data: link };
  }
}
