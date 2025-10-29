import {
  Body,
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { PrismaTenantService } from "../prisma_tenant/prisma_tenant.service";
import { CreateTenantDto } from './dto/create-tenant.dto';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import { Tenant } from '@prisma/client';

@Controller('tenant')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly PrismaTenantService: PrismaTenantService,
  ) {}

  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.createTenant(dto.name, dto.ownerId);
  }

  @Get()
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Delete(':id/soft')
  deleteTenant(
    @Param('id') id: string,
    @Body('userId') userId: string
  ) {
    return this.tenantsService.deleteTenant(id, userId);
  }

  @Delete(':id/hard')
  hardDeleteTenant(
    @Param('id') id: string,
    @Body('userId') userId: string
  ) {
    return this.tenantsService.hardDeleteTenant(id, userId);
  }

  // === Работа с данными тенанта через API Key ===

  // @Post('products')
  // @UseGuards(ApiKeyGuard)
  // addProduct(
  //   @CurrentTenant() tenant: Tenant,
  //   @Body() productData: any
  // ) {
  //   return this.PrismaTenantService.addProduct(tenant.id, productData);
  // }
  //
  // @Get('products')
  // @UseGuards(ApiKeyGuard)
  // getProducts(@CurrentTenant() tenant: Tenant) {
  //   return this.PrismaTenantService.getProducts(tenant.id);
  // }
  //
  // @Post('customers')
  // @UseGuards(ApiKeyGuard)
  // addCustomer(
  //   @CurrentTenant() tenant: Tenant,
  //   @Body() customerData: any
  // ) {
  //   return this.PrismaTenantService.addCustomer(tenant.id, customerData);
  // }
  //
  // @Get('customers')
  // @UseGuards(ApiKeyGuard)
  // getCustomers(@CurrentTenant() tenant: Tenant) {
  //   return this.PrismaTenantService.getCustomers(tenant.id);
  // }
}