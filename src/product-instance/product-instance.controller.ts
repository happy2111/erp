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
import { ProductInstanceService } from './product-instance.service';
import { CreateProductInstanceDto } from './dto/create-producti-instance.dto';
import { UpdateProductInstanceDto } from './dto/update-product-instance.dto';
import { FindAllProductInstanceDto } from './dto/filter-instace.dto';
import { SellInstanceDto } from './dto/sell-instance.dto';
import { ReturnInstanceDto } from './dto/return-instance.dto';
import { TransferInstanceDto } from './dto/transfer-instance.dto';
import { ResellInstanceDto } from './dto/resell-instance.dto';
import { MarkLostDto } from './dto/mark-lost.dto';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../guards/tenant-roles.guard';
import { Roles } from '../decorators/tenant-roles.decorator';
import { OrgUserRole } from '.prisma/client-tenant';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import type { Tenant } from '@prisma/client';

@ApiTags('Product Instances')
@ApiSecurity('x-tenant-key')
@ApiSecurity('Authorization')
@Controller('product-instances')
export class ProductInstanceController {
  constructor(
    private readonly productInstanceService: ProductInstanceService,
  ) {}

  // -------------------------
  // CREATE
  // -------------------------
  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Создать новую экземпляр продукта (серийный номер)' })
  @ApiResponse({ status: 201, description: 'Экземпляр успешно создан' })
  create(
    @CurrentTenant() tenant: Tenant,
    @Body() dto: CreateProductInstanceDto,
  ) {
    return this.productInstanceService.create(tenant, dto);
  }

  // -------------------------
  // LIST / FILTER
  // -------------------------
  @Post('filter')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Фильтрация и пагинация экземпляров продуктов' })
  @ApiResponse({
    status: 200,
    description: 'Список экземпляров успешно получен',
  })
  findAll(
    @CurrentTenant() tenant: Tenant,
    @Body() filter: FindAllProductInstanceDto,
  ) {
    return this.productInstanceService.findAll(tenant, filter);
  }

  // -------------------------
  // GET ONE
  // -------------------------
  @Get(':id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Получить экземпляр продукта по ID' })
  @ApiParam({ name: 'id', description: 'UUID экземпляра продукта' })
  @ApiResponse({ status: 200, description: 'Экземпляр найден' })
  @ApiResponse({ status: 404, description: 'Экземпляр не найден' })
  findOne(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.productInstanceService.findOne(tenant, id);
  }

  // -------------------------
  // UPDATE
  // -------------------------
  @Patch('update/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Обновить экземпляр продукта' })
  @ApiParam({ name: 'id', description: 'UUID экземпляра продукта' })
  @ApiResponse({ status: 200, description: 'Экземпляр успешно обновлён' })
  @ApiResponse({ status: 404, description: 'Экземпляр не найден' })
  update(
    @CurrentTenant() tenant: Tenant,
    @Param('id') id: string,
    @Body() dto: UpdateProductInstanceDto,
  ) {
    return this.productInstanceService.update(tenant, id, dto);
  }

  // -------------------------
  // DELETE
  // -------------------------
  @Delete('remove/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Удалить экземпляр продукта' })
  @ApiParam({ name: 'id', description: 'UUID экземпляра продукта' })
  @ApiResponse({ status: 200, description: 'Экземпляр успешно удалён' })
  @ApiResponse({ status: 404, description: 'Экземпляр не найден' })
  remove(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.productInstanceService.delete(tenant, id);
  }

  // -------------------------
  // SELL
  // -------------------------
  @Post('sell')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Продать экземпляр продукта покупателю' })
  @ApiResponse({ status: 200, description: 'Экземпляр успешно продан' })
  @ApiResponse({ status: 404, description: 'Экземпляр не найден' })
  @ApiResponse({ status: 400, description: 'Экземпляр уже продан' })
  sell(@CurrentTenant() tenant: Tenant, @Body() dto: SellInstanceDto) {
    return this.productInstanceService.sell(tenant, dto);
  }

  // -------------------------
  // RETURN
  // -------------------------
  @Post('return')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Вернуть экземпляр продукта на склад' })
  @ApiResponse({ status: 200, description: 'Экземпляр успешно возвращён' })
  return(@CurrentTenant() tenant: Tenant, @Body() dto: ReturnInstanceDto) {
    return this.productInstanceService.return(tenant, dto);
  }

  // -------------------------
  // TRANSFER BETWEEN ORGANIZATIONS
  // -------------------------
  @Post('transfer')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Переместить экземпляр между организациями' })
  @ApiResponse({ status: 200, description: 'Экземпляр успешно перемещён' })
  transfer(
    @CurrentTenant() tenant: Tenant,
    @Body() dto: TransferInstanceDto,
  ) {
    return this.productInstanceService.transfer(tenant, dto);
  }

  // -------------------------
  // RESELL
  // -------------------------
  @Post('resell')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Перепродать возвращённый/отремонтированный экземпляр' })
  @ApiResponse({ status: 200, description: 'Экземпляр успешно перепродан' })
  resell(@CurrentTenant() tenant: Tenant, @Body() dto: ResellInstanceDto) {
    return this.productInstanceService.resell(tenant, dto);
  }

  // -------------------------
  // MARK LOST
  // -------------------------
  @Post('mark-lost')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Пометить экземпляр как утерянный/списанный' })
  @ApiResponse({ status: 200, description: 'Экземпляр помечен как утерянный' })
  markLost(@CurrentTenant() tenant: Tenant, @Body() dto: MarkLostDto) {
    return this.productInstanceService.markLost(tenant, dto);
  }

  // -------------------------
  // HISTORY
  // -------------------------
  @Get('history/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Получить историю транзакций экземпляра' })
  @ApiParam({ name: 'id', description: 'UUID экземпляра продукта' })
  @ApiResponse({ status: 200, description: 'История успешно получена' })
  getHistory(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.productInstanceService.getHistory(tenant, id);
  }
}