// product-transactions/product-transactions.controller.ts
import {
  Body,
  Controller,
  Get,
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
import { ProductTransactionsService } from './product-transactions.service';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../tenant-auth/guards/jwt.guard';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import { CurrentTenantUser } from '../tenant-auth/decorators/current-tenant-user.decorator';
import type { Tenant } from '@prisma/client';
import type { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';
import { OrgUserRole, ProductAction } from '.prisma/client-tenant';
import { ProductTransactionFilterDto } from './dto/product-transaction-filter.dto';
import { TenantRolesGuard } from '../guards/tenant-roles.guard';
import { Roles } from '../decorators/tenant-roles.decorator';

@ApiTags('Product Transactions')
@ApiSecurity('x-tenant-key')
@ApiBearerAuth()
@Controller('product-transactions')
export class ProductTransactionsController {
  constructor(
    private readonly productTransactionsService: ProductTransactionsService,
  ) {}

  @Get()
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Список всех перемещений товаров с фильтрацией' })
  @ApiQuery({ name: 'productInstanceId', required: false })
  @ApiQuery({ name: 'productVariantId', required: false })
  @ApiQuery({ name: 'action', required: false, enum: ProductAction })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  findAll(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Query() filter: ProductTransactionFilterDto,
  ) {
    return this.productTransactionsService.findAll(tenant, user.orgId, filter);
  }

  @Get('instance/:productInstanceId')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({
    summary: 'Получить историю перемещений по конкретному экземпляру товара',
  })
  @ApiParam({ name: 'productInstanceId' })
  findByInstance(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('productInstanceId') productInstanceId: string,
  ) {
    return this.productTransactionsService.findByInstance(
      tenant,
      user.orgId,
      productInstanceId,
    );
  }

  // @Get('variant/:productVariantId')
  // @UseGuards(ApiKeyGuard, JwtAuthGuard)
  // @ApiOperation({
  //   summary: 'История всех экземпляров конкретного варианта товара',
  // })
  // @ApiParam({ name: 'productVariantId' })
  // findByVariant(
  //   @CurrentTenant() tenant: Tenant,
  //   @CurrentTenantUser() user: JwtAuthenticatedUser,
  //   @Param('productVariantId') productVariantId: string,
  // ) {
  //   // TODO
  //   return this.productTransactionsService.findByVariant(
  //     tenant,
  //     user.orgId,
  //     productVariantId,
  //   );
  // }

  @Get('stats')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Статистика перемещений товаров' })
  @ApiQuery({ name: 'productVariantId', required: false })
  getStats(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Query('productVariantId') productVariantId?: string,
  ) {
    return this.productTransactionsService.getStatistics(
      tenant,
      user.orgId,
      undefined,
      productVariantId,
    );
  }

  @Post(':id/update-description')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Изменить описание транзакции' })
  @ApiParam({ name: 'id' })
  updateDescription(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('id') id: string,
    @Body('description') description: string,
  ) {
    return this.productTransactionsService.updateDescription(
      tenant,
      user.orgId,
      id,
      description,
    );
  }
}
