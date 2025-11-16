import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiParam,
} from '@nestjs/swagger';

import { ProductBatchService } from './product-batch.service';
import { CreateProductBatchDto } from './dto/create-product-batch.dto';
import { UpdateProductBatchDto } from './dto/update-product-batch.dto';
import { FilterProductBatchDto } from './dto/filter-product-batch.dto';

import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../guards/tenant-roles.guard';
import { Roles } from '../decorators/tenant-roles.decorator';
import { OrgUserRole } from '.prisma/client-tenant';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import type { Tenant } from '@prisma/client';

@ApiTags('ProductBatches')
@ApiSecurity('x-tenant-key')
@ApiSecurity('Authorization')
@Controller('product-batches')
export class ProductBatchController {
  constructor(private readonly productBatchService: ProductBatchService) {}

  // ============================================================
  // CREATE
  // ============================================================
  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Создать новую партию продукта' })
  @ApiResponse({
    status: 201,
    description: 'Партия успешно создана',
    example: {
      id: 'uuid-batch',
      productVariantId: 'uuid-prod-variant',
      batchNumber: 'BATCH-2025-001',
      quantity: 500,
      expiryDate: '2026-05-30T00:00:00Z',
      createdAt: '2025-11-06T12:00:00Z',
    },
  })
  create(
    @CurrentTenant() tenant: Tenant,
    @Body() dto: CreateProductBatchDto,
  ) {
    return this.productBatchService.create(tenant, dto);
  }

  // ============================================================
  // FILTER / PAGINATION
  // ============================================================
  @Post('filter')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Фильтрация и пагинация партий продуктов' })
  @ApiResponse({
    status: 200,
    description: 'Список партий успешно получен',
    example: {
      data: [
        {
          id: 'uuid-batch-1',
          productVariantId: 'uuid-prod-variant-1',
          batchNumber: 'BATCH-2025-001',
          quantity: 100,
          expiryDate: '2026-01-01T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    },
  })
  findAll(
    @CurrentTenant() tenant: Tenant,
    @Query() query: FilterProductBatchDto,
  ) {
    return this.productBatchService.findAll(tenant, query);
  }

  // ============================================================
  // GET BY ID
  // ============================================================
  @Get(':id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Получить партию продукта по ID' })
  @ApiParam({ name: 'id', description: 'ID партии продукта' })
  @ApiResponse({
    status: 200,
    description: 'Партия найдена',
    example: {
      id: 'uuid-batch',
      productVariantId: 'uuid-prod-variant',
      batchNumber: 'BATCH-2025-001',
      quantity: 500,
      expiryDate: '2026-05-30T00:00:00Z',
      createdAt: '2025-11-06T12:00:00Z',
    },
  })
  @ApiResponse({ status: 404, description: 'Партия не найдена' })
  findOne(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.productBatchService.findOne(tenant, id);
  }

  // ============================================================
  // UPDATE
  // ============================================================
  @Patch('update/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Обновить партию продукта' })
  @ApiParam({ name: 'id', description: 'ID партии продукта' })
  @ApiResponse({
    status: 200,
    description: 'Партия успешно обновлена',
    example: {
      id: 'uuid-batch',
      batchNumber: 'BATCH-2025-002',
      quantity: 600,
    },
  })
  @ApiResponse({ status: 404, description: 'Партия не найдена' })
  update(
    @CurrentTenant() tenant: Tenant,
    @Param('id') id: string,
    @Body() dto: UpdateProductBatchDto,
  ) {
    return this.productBatchService.update(tenant, id, dto);
  }

  // ============================================================
  // DELETE
  // ============================================================
  @Delete('remove/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Удалить партию продукта' })
  @ApiParam({ name: 'id', description: 'ID партии продукта' })
  @ApiResponse({ status: 200, description: 'Партия успешно удалена' })
  @ApiResponse({ status: 404, description: 'Партия не найдена' })
  remove(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.productBatchService.delete(tenant, id);
  }

  // ============================================================
  // ANALYTICS / STATS
  // ============================================================
  @Get('stats/:variantId')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Статистика партий для конкретного варианта продукта' })
  @ApiParam({ name: 'variantId', description: 'ID варианта продукта' })
  getStats(@CurrentTenant() tenant: Tenant, @Param('variantId') variantId: string) {
    return this.productBatchService.getStats(tenant, variantId);
  }

  @Get('sum/:variantId')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Суммарное количество для варианта продукта' })
  @ApiParam({ name: 'variantId', description: 'ID варианта продукта' })
  sumQuantity(@CurrentTenant() tenant: Tenant, @Param('variantId') variantId: string) {
    return this.productBatchService.sumQuantity(tenant, variantId);
  }
}
