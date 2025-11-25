import {
  Body,
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards, Query, Patch
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { PrismaTenantService } from "../prisma_tenant/prisma_tenant.service";
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UserRole} from '@prisma/client';
import {JwtAuthGuard} from "../auth/guards/jwt-auth.guard";
import {RolesGuard} from "../auth/guards/roles.guard";
import {Roles} from "../auth/decorators/roles.decorator";
import {UserId} from "../auth/decorators/user-id.decorator";
import {ApiBearerAuth} from "@nestjs/swagger";
import {TenantFilterDto} from "./dto/filter-tenant.dto";
import {UpdateTenantDto} from "./dto/update-tenant.dto";

@ApiBearerAuth()
@Controller('tenant')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
  ) {}

  @Post('create')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PLATFORM_OWNER)
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.createTenant(dto.name, dto.ownerId, dto.hostname);
  }


  @Get('filter')
  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.PLATFORM_OWNER)
  async findAll(
    @Query() query: TenantFilterDto
  ) {
    return this.tenantsService.filterTenants(query);
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

  @Patch('update/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_OWNER)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenantsService.update(id, dto);
  }

}