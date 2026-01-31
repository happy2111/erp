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
import { ApiKeyGuard } from '../../guards/api-key.guard';
import { JwtAuthGuard } from '../../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../../guards/tenant-roles.guard';
import { Roles } from '../../decorators/tenant-roles.decorator';
import { OrgUserRole } from '.prisma/client-tenant';
import { CurrentTenant } from '../../decorators/currectTenant.decorator';
import { CurrentTenantUser } from '../../tenant-auth/decorators/current-tenant-user.decorator';
import type { Tenant } from '@prisma/client';
import type { JwtAuthenticatedUser } from '../../tenant-auth/interfaces/jwt.interface';

import { AttributeService } from './attribute.service';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { GetAttributeQueryDto } from './dto/get-attribute-query.dto';

@ApiTags('attributes')
@ApiSecurity('x-tenant-key')
@ApiBearerAuth()
@Controller('attributes')
export class AttributeController {
  constructor(private readonly service: AttributeService) {}

  @Get('admin/all')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Список всех характеристик (админ-панель)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'sortField', required: false, example: 'name' })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async getAllAdmin(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Query() query: GetAttributeQueryDto,
  ) {
    return this.service.getAllAdmin(tenant, user, query);
  }

  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Создать новую характеристику' })
  async create(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Body() dto: CreateAttributeDto,
  ) {
    const attribute = await this.service.create(tenant, user, dto);
    return { data: attribute };
  }

  @Patch('update/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Обновить характеристику' })
  @ApiParam({ name: 'id' })
  async update(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAttributeDto,
  ) {
    const updated = await this.service.update(tenant, user, id, dto);
    return { data: updated };
  }

  @Delete('remove/:id/hard')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  @ApiOperation({
    summary:
      'Жёсткое удаление характеристики (только если нет связанных значений)',
  })
  @ApiParam({ name: 'id' })
  async hardDelete(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('id') id: string,
  ) {
    await this.service.hardDelete(tenant, user, id);
  }

  @Get('admin/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER, OrgUserRole.MANAGER)
  @ApiOperation({
    summary: 'Получить одну характеристику по ID (с значениями)',
  })
  async getOneAdmin(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('id') id: string,
  ) {
    const attribute = await this.service.getByIdAdmin(tenant, user, id);
    return { data: attribute };
  }
}
