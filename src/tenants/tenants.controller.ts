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
import {Tenant, UserRole} from '@prisma/client';
import {hostname} from "node:os";
import {JwtAuthGuard} from "../auth/guards/jwt-auth.guard";
import {RolesGuard} from "../auth/guards/roles.guard";
import {Roles} from "../auth/decorators/roles.decorator";
import {UserId} from "../auth/decorators/user-id.decorator";
import {ApiBearerAuth, ApiSecurity} from "@nestjs/swagger";

@ApiBearerAuth()
@Controller('tenant')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly PrismaTenantService: PrismaTenantService,
  ) {}

  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PLATFORM_OWNER)
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.createTenant(dto.name, dto.ownerId, dto.hostname);
  }

  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PLATFORM_OWNER)
  findAll() {
    return this.tenantsService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PLATFORM_OWNER, UserRole.OWNER)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Delete(':id/soft')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PLATFORM_OWNER)
  deleteTenant(
    @Param('id') id: string,
    @UserId() userId: string,
  ) {
    return this.tenantsService.deleteTenant(id, userId);
  }

  @Delete(':id/hard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_OWNER)
  hardDeleteTenant(
    @Param('id') id: string,
    @UserId() userId: string,
  ) {
    return this.tenantsService.hardDeleteTenant(id, userId);
  }


  @Post('migrate-all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_OWNER)
  async migrateAllTenants() {
    return this.tenantsService.updateAllTenantDatabases();
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