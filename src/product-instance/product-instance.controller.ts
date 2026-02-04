import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
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
import { ProductInstanceService } from './product-instance.service';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../tenant-auth/guards/jwt.guard';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import { CurrentTenantUser } from '../tenant-auth/decorators/current-tenant-user.decorator';
import type { Tenant } from '@prisma/client';
import type { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';
import { OrgUserRole, ProductStatus } from '.prisma/client-tenant';
import { TenantRolesGuard } from '../guards/tenant-roles.guard';
import { Roles } from '../decorators/tenant-roles.decorator';
import { CreateProductInstanceDto } from './dto/create-product-instance.dto';
import { FindAllProductInstanceDto } from './dto/filter-instace.dto';
import { UpdateProductInstanceDto } from './dto/update-product-instance.dto';
import { SellInstanceDto } from './dto/sell-instance.dto';
import { ReturnInstanceDto } from './dto/return-instance.dto';
import { TransferInstanceDto } from './dto/transfer-instance.dto';
import { ResellInstanceDto } from './dto/resell-instance.dto';
import { MarkLostDto } from './dto/mark-lost.dto';

@ApiTags('Product Instances')
@ApiSecurity('x-tenant-key')
@ApiBearerAuth()
@Controller('product-instances')
export class ProductInstanceController {
  constructor(
    private readonly productInstanceService: ProductInstanceService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────────────
  @Post()
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Создание нового экземпляра товара' })
  create(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Body() dto: CreateProductInstanceDto,
  ) {
    return this.productInstanceService.create(tenant, user.orgId, dto);
  }

  // ─────────────────────────────────────────────────────────────
  // FIND ALL
  // ─────────────────────────────────────────────────────────────
  @Get('admin/all')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Список всех экземпляров товаров организации' })
  @ApiQuery({ name: 'productVariantId', required: false })
  @ApiQuery({ name: 'serialNumber', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ProductStatus })
  @ApiQuery({ name: 'currentOwnerId', required: false })
  @ApiQuery({ name: 'sortField', required: false, example: 'createdAt' })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async findAll(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Query() filter: FindAllProductInstanceDto,
  ) {
    return this.productInstanceService.findAll(tenant, user.orgId, filter);
  }
  // ─────────────────────────────────────────────────────────────
  // FIND ONE
  // ─────────────────────────────────────────────────────────────
  @Get(':id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Детальная информация по экземпляру товара' })
  @ApiParam({ name: 'id' })
  findOne(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.productInstanceService.findOne(tenant, user.orgId, id);
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE
  // ─────────────────────────────────────────────────────────────
  @Patch(':id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Обновление экземпляра товара' })
  @ApiParam({ name: 'id' })
  update(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateProductInstanceDto,
  ) {
    return this.productInstanceService.update(tenant, user.orgId, id, dto);
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────────────────────
  @Delete(':id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Удаление экземпляра товара' })
  @ApiParam({ name: 'id' })
  remove(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.productInstanceService.remove(tenant, user.orgId, id);
  }

  // ─────────────────────────────────────────────────────────────
  // SELL
  // ─────────────────────────────────────────────────────────────
  @Post('sell')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Продажа экземпляра товара' })
  sell(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Body() dto: SellInstanceDto,
  ) {
    return this.productInstanceService.sell(tenant, user.orgId, dto);
  }

  // ─────────────────────────────────────────────────────────────
  // RETURN
  // ─────────────────────────────────────────────────────────────
  @Post('return')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Возврат экземпляра товара' })
  return(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Body() dto: ReturnInstanceDto,
  ) {
    return this.productInstanceService.return(tenant, user.orgId, dto);
  }

  // ─────────────────────────────────────────────────────────────
  // TRANSFER
  // ─────────────────────────────────────────────────────────────
  @Post('transfer')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Передача экземпляра между организациями' })
  transfer(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Body() dto: TransferInstanceDto,
  ) {
    return this.productInstanceService.transfer(tenant, user.orgId, dto);
  }

  // ─────────────────────────────────────────────────────────────
  // RESELL
  // ─────────────────────────────────────────────────────────────
  @Post('resell')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Перепродажа экземпляра товара' })
  resell(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Body() dto: ResellInstanceDto,
  ) {
    return this.productInstanceService.resell(tenant, user.orgId, dto);
  }

  // ─────────────────────────────────────────────────────────────
  // MARK LOST
  // ─────────────────────────────────────────────────────────────
  @Post('mark-lost')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Списание / утеря экземпляра товара' })
  markLost(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Body() dto: MarkLostDto,
  ) {
    return this.productInstanceService.markLost(tenant, user.orgId, dto);
  }
}
