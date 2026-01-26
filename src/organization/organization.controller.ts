import {
  Body,
  Controller,
  Delete,
  Get,
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
import { OrganizationService } from './organization.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { GetOrganizationsQueryDto } from './dto/get-organizations-query.dto';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../guards/tenant-roles.guard';
import { Roles } from '../decorators/tenant-roles.decorator';
import { OrgUserRole } from '.prisma/client-tenant';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import { CurrentTenantUser } from '../tenant-auth/decorators/current-tenant-user.decorator';
import type { Tenant } from '@prisma/client';
import type { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';

@ApiTags('Organizations')
@ApiSecurity('x-tenant-key')
@ApiBearerAuth()
@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Создать новую организацию' })
  create(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.organizationService.create(tenant, user, dto);
  }

  @Get('all')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({
    summary: 'Получить список всех организаций текущего пользователя',
  })
  findAllForUser(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
  ) {
    return this.organizationService.findAllForUser(tenant, user);
  }

  @Get('admin/all')
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @ApiOperation({ summary: 'Получить список всех организаций (для админа)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'sortField', required: false })
  findAllAdmin(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Query() query: GetOrganizationsQueryDto,
  ) {
    console.log('start');
    console.log(JSON.stringify(query, null, 2));
    console.log(JSON.stringify(user, null, 2));

    return this.organizationService.findAll(tenant, user, query);
  }

  @Get('admin/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Получить организацию по ID (для админа)' })
  @ApiParam({ name: 'id' })
  findOneAdmin(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.organizationService.findById(tenant, user, id);
  }

  @Patch('update/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Обновить организацию' })
  @ApiParam({ name: 'id' })
  update(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationService.update(tenant, user, id, dto);
  }

  @Delete('remove/:id/hard')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.OWNER, OrgUserRole.ADMIN)
  @ApiOperation({ summary: 'Жёсткое удаление организации (только OWNER)' })
  @ApiParam({ name: 'id' })
  remove(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.organizationService.remove(tenant, user, id);
  }

  @Get(':id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({
    summary: 'Получить организацию по ID (только если есть доступ)',
  })
  @ApiParam({ name: 'id', description: 'ID организации' })
  findOneForUser(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.organizationService.findOneForUser(tenant, user, id);
  }
}
