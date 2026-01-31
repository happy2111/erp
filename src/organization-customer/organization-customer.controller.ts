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
  Res,
  UseGuards,
} from '@nestjs/common';
import { OrganizationCustomerService } from './organization-customer.service';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../guards/tenant-roles.guard';
import { Roles } from '../decorators/tenant-roles.decorator';
import { OrgUserRole } from '.prisma/client-tenant';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import type { Tenant } from '@prisma/client';
import { CreateOrgCustomerDto } from './dto/create-org-customer.dto';
import type { Response } from 'express';
import { ConvertCustomerToUserDto } from './dto/convert-customer-to-user.dto';
import { ApiOperation, ApiParam, ApiQuery, ApiSecurity } from '@nestjs/swagger';
import { OrganizationCustomerFilterDto } from './dto/filter-org-customer.dto';
import { UpdateOrgCustomerDto } from './dto/update-org-customer.dto';
import { CurrentTenantUser } from '../tenant-auth/decorators/current-tenant-user.decorator';
import type { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';

@ApiSecurity('x-tenant-key')
@Controller('organization-customer')
class OrganizationCustomerController {
  constructor(
    private readonly organizationCustomerService: OrganizationCustomerService,
  ) {}
  @Get('admin/all')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({
    summary: 'Список клиентов организации (пагинация, поиск, сортировка)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Поиск по ФИО / телефону',
  })
  @ApiQuery({ name: 'sortField', required: false, example: 'createdAt' })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async getAllAdmin(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() currentUser: JwtAuthenticatedUser,
    @Query() query: OrganizationCustomerFilterDto,
  ) {
    return this.organizationCustomerService.getAllAdmin(
      tenant,
      currentUser.orgId,
      query,
    );
  }

  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Создать нового клиента организации' })
  async create(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() currentUser: JwtAuthenticatedUser,
    @Body() dto: CreateOrgCustomerDto,
  ) {
    const customer = await this.organizationCustomerService.create(
      tenant,
      currentUser.orgId,
      dto,
    );
    return { data: customer };
  }

  @Patch('update/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Обновить данные клиента' })
  @ApiParam({ name: 'id', description: 'ID записи OrganizationCustomer' })
  async update(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() currentUser: JwtAuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrgCustomerDto,
  ) {
    const updated = await this.organizationCustomerService.update(
      tenant,
      currentUser.orgId,
      id,
      dto,
    );
    return { data: updated };
  }

  @Delete('remove/:id/hard')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Жёсткое удаление клиента (hard delete)' })
  async hardDelete(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() currentUser: JwtAuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.organizationCustomerService.hardDelete(
      tenant,
      currentUser.orgId,
      id,
    );
  }

  @Get('admin/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Получить данные одного клиента по ID' })
  async getOneAdmin(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() currentUser: JwtAuthenticatedUser,
    @Param('id') id: string,
  ) {
    const customer = await this.organizationCustomerService.getByIdAdmin(
      tenant,
      currentUser.orgId,
      id,
    );
    return { data: customer };
  }

  @Post('convert-to-user')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  async convertToOrgUser(
    @CurrentTenant() tenant: Tenant,
    @Body() dto: ConvertCustomerToUserDto,
  ) {
    // Просто возвращаем результат промиса. NestJS сам отправит JSON.
    return await this.organizationCustomerService.convertCustomerToUser(
      tenant,
      dto,
    );
  }
}

export default OrganizationCustomerController;
