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
  ApiResponse,
  ApiParam,
  ApiTags,
  ApiSecurity,
} from '@nestjs/swagger';
import { ProductVariantsService } from './product-variants.service';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { ProductVariantFilterDto } from './dto/filter-product-variant.dto';
import type { Tenant } from '@prisma/client';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../guards/tenant-roles.guard';
import { Roles } from '../decorators/tenant-roles.decorator';
import { OrgUserRole } from '.prisma/client-tenant';

@ApiTags('Product Variants')
@ApiSecurity('x-tenant-key')
@ApiSecurity('Authorization')
@Controller('product-variants')
export class ProductVariantsController {
  constructor(private readonly productVariantsService: ProductVariantsService) {}

  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Создать новый вариант товара' })
  @ApiResponse({ status: 201, description: 'Вариант успешно создан' })
  @ApiResponse({ status: 409, description: 'Вариант с таким SKU или штрихкодом уже существует' })
  create(@CurrentTenant() tenant: Tenant, @Body() dto: CreateProductVariantDto) {
    return this.productVariantsService.create(tenant, dto);
  }

  @Post('filter')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Получить список вариантов товара с фильтрацией и пагинацией' })
  @ApiResponse({ status: 200, description: 'Список вариантов успешно получен' })
  findAll(@CurrentTenant() tenant: Tenant, @Body() filter: ProductVariantFilterDto) {
    return this.productVariantsService.findAll(tenant, filter);
  }

  @Get(':id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Получить вариант товара по ID' })
  @ApiParam({ name: 'id', description: 'ID варианта товара' })
  @ApiResponse({ status: 200, description: 'Вариант товара найден' })
  @ApiResponse({ status: 404, description: 'Вариант не найден' })
  findOne(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.productVariantsService.findOne(tenant, id);
  }

  @Patch('update/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Обновить вариант товара' })
  @ApiResponse({ status: 200, description: 'Вариант успешно обновлён' })
  @ApiResponse({ status: 404, description: 'Вариант не найден' })
  update(
    @CurrentTenant() tenant: Tenant,
    @Param('id') id: string,
    @Body() dto: UpdateProductVariantDto,
  ) {
    return this.productVariantsService.update(tenant, id, dto);
  }

  @Delete('remove/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Удалить вариант товара' })
  @ApiResponse({ status: 200, description: 'Вариант успешно удалён' })
  @ApiResponse({ status: 404, description: 'Вариант не найден' })
  remove(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.productVariantsService.remove(tenant, id);
  }
}
