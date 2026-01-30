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
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { OrganizationUserService } from './organization-user.service';
import { CreateOrganizationUserDto } from './dto/create-org-user.dto';
import { UpdateOrganizationUserDto } from './dto/update-organization-user.dto';
import { GetOrgUsersQueryDto } from './dto/get-org-users-query.dto'; // ← новый DTO
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../guards/tenant-roles.guard';
import { Roles } from '../decorators/tenant-roles.decorator';
import { OrgUserRole } from '.prisma/client-tenant';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import { CurrentTenantUser } from '../tenant-auth/decorators/current-tenant-user.decorator';
import type { Tenant } from '@prisma/client';
import type { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';

@ApiTags('Organization Users')
@ApiSecurity('x-tenant-key')
@ApiBearerAuth()
@Controller('organization-user')
@UseInterceptors(/* ваш TransformInterceptor уже глобально или здесь */)
export class OrganizationUserController {
  constructor(
    private readonly organizationUserService: OrganizationUserService,
  ) {}

  // 1. Список для админки (универсальный формат)
  @Get('admin/all')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({
    summary: 'Получить список всех пользователей организации (админка)',
  })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'sortField', required: false })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllAdmin(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Query() query: GetOrgUsersQueryDto,
  ) {
    return this.organizationUserService.getAllAdmin(tenant, user, query);
  }

  // 2. Создание (привязка существующего пользователя к организации)
  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({
    summary: 'Привязать существующего пользователя к организации',
  })
  async create(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Body() dto: CreateOrganizationUserDto,
  ) {
    return this.organizationUserService.create(tenant, user, dto);
  }

  // 3. Обновление роли / должности
  @Patch('update/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({
    summary: 'Обновить роль или должность пользователя в организации',
  })
  @ApiParam({ name: 'id', description: 'ID записи OrganizationUser' })
  async update(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationUserDto,
  ) {
    return this.organizationUserService.update(tenant, user, id, dto);
  }

  // 4. Жёсткое удаление
  @Delete('remove/:id/hard')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Жёсткое удаление пользователя из организации' })
  async hardDelete(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.organizationUserService.hardDelete(tenant, user, id);
  }

  // 5. Получение одной записи (для редактирования)
  @Get('admin/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Получить одного пользователя организации по ID' })
  async findOneAdmin(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.organizationUserService.getByIdAdmin(tenant, user, id);
  }

}
