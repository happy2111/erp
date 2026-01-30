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
import { TenantUserService } from './tenant-user.service';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto';
import { UpdateTenantUserDto } from './dto/update-tenant-user.dto';
import { GetTenantUsersQueryDto } from './dto/get-tenant-users-query.dto';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../guards/tenant-roles.guard';
import { Roles } from '../decorators/tenant-roles.decorator';
import { OrgUserRole } from '.prisma/client-tenant';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import { CurrentTenantUser } from '../tenant-auth/decorators/current-tenant-user.decorator';
import type { Tenant } from '@prisma/client';
import type { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';

@ApiTags('Tenant Users')
@ApiSecurity('x-tenant-key')
@ApiBearerAuth()
@Controller('tenant-user')
export class TenantUserController {
  constructor(private readonly tenantUserService: TenantUserService) {}

  // 1. Список для админки (универсальный формат)
  @Get('admin/all')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({
    summary: 'Получить список всех пользователей тенанта (админка)',
  })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'sortField', required: false })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAllAdmin(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Query() query: GetTenantUsersQueryDto,
  ) {
    return this.tenantUserService.getAllAdmin(tenant, user, query);
  }

  // 2. Создание нового пользователя
  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Создать нового пользователя тенанта' })
  async create(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Body() dto: CreateTenantUserDto,
  ) {
    return this.tenantUserService.create(tenant, user, dto);
  }

  // 3. Обновление пользователя
  @Patch('update/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Обновить данные пользователя' })
  @ApiParam({ name: 'id' })
  async update(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTenantUserDto,
  ) {
    return this.tenantUserService.update(tenant, user, id, dto);
  }

  // 4. Жёсткое удаление
  @Delete('remove/:id/hard')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Жёсткое удаление пользователя' })
  async hardDelete(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.tenantUserService.hardDelete(tenant, user, id);
  }

  // 5. Получение одной записи (для редактирования)
  @Get('admin/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Получить пользователя по ID' })
  async findOneAdmin(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.tenantUserService.getByIdAdmin(tenant, user, id);
  }

  @Get('check-existence')
  @UseGuards(ApiKeyGuard, JwtAuthGuard) // Достаточно базовой авторизации
  @ApiOperation({
    summary:
      'Проверить существование пользователя по email или телефону и вернуть его организации',
  })
  @ApiQuery({
    name: 'identifier',
    required: true,
    description: 'Email или номер телефона',
  })
  async checkExistence(
    @CurrentTenant() tenant: Tenant,
    @Query('identifier') identifier: string,
  ) {
    return this.tenantUserService.checkExistence(tenant, identifier);
  }
}
