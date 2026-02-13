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
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../guards/tenant-roles.guard';
import { Roles } from '../decorators/tenant-roles.decorator';
import { OrgUserRole } from '.prisma/client-tenant';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import { CurrentTenantUser } from '../tenant-auth/decorators/current-tenant-user.decorator';
import type { Tenant } from '@prisma/client';
import type { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';

import { InstallmentSettingsService } from './installment-settings.service';
import { UpdateInstallmentSettingDto } from './dto/update-installment-setting.dto';
import { CreateInstallmentPlanDto } from './dto/create-installment-plan.dto';
import { UpdateInstallmentPlanDto } from './dto/update-installment-plan.dto';

@ApiTags('installment-settings')
@ApiSecurity('x-tenant-key')
@ApiBearerAuth()
@Controller('installment-settings')
export class InstallmentSettingsController {
  constructor(private readonly service: InstallmentSettingsService) {}

  @Get('my')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Получить настройки рассрочки своей организации' })
  async getMySettings(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Query('currencyId') currencyId?: string,
  ) {
    return this.service.getMySettings(tenant, user.orgId, currencyId);
  }

  @Patch('my')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Обновить настройки рассрочки своей организации' })
  async updateMySettings(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Body() dto: UpdateInstallmentSettingDto,
  ) {
    const updated = await this.service.updateMySettings(
      tenant,
      user.orgId,
      dto,
    );
    return { data: updated };
  }

  @Post('plans')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Добавить новый план рассрочки' })
  async createPlan(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Body() dto: CreateInstallmentPlanDto,
  ) {
    const plan = await this.service.createPlan(tenant, user.orgId, dto);
    return { data: plan };
  }

  @Patch('plans/:planId')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Обновить существующий план рассрочки' })
  async updatePlan(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('planId') planId: string,
    @Body() dto: UpdateInstallmentPlanDto,
  ) {
    const updated = await this.service.updatePlan(
      tenant,
      user.orgId,
      planId,
      dto,
    );
    return { data: updated };
  }

  @Delete('plans/:planId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Удалить план рассрочки' })
  async deletePlan(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('planId') planId: string,
  ) {
    await this.service.deletePlan(tenant, user.orgId, planId);
  }

  @Post('limits')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Создать или обновить лимит рассрочки для валюты' })
  async upsertLimit(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Query('currencyId') currencyId: string,
    @Body('minInitialPayment') minInitialPayment?: number,
    @Body('maxAmount') maxAmount?: number,
  ) {
    const limit = await this.service.upsertLimit(
      tenant,
      user.orgId,
      currencyId,
      minInitialPayment,
      maxAmount,
    );
    return { data: limit };
  }

  @Delete('limits/:limitId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Удалить лимит рассрочки' })
  async deleteLimit(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
    @Param('limitId') limitId: string,
  ) {
    await this.service.deleteLimit(tenant, user.orgId, limitId);
  }
}
