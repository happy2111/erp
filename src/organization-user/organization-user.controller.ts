import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards
} from '@nestjs/common';
import { OrganizationUserService } from './organization-user.service';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity
} from "@nestjs/swagger";
import {JwtAuthGuard} from "../tenant-auth/guards/jwt.guard";
import {TenantRolesGuard} from "../guards/tenant-roles.guard";
import {Roles} from "../decorators/tenant-roles.decorator";
import {OrgUserRole} from ".prisma/client-tenant";
import {CurrentTenant} from "../decorators/currectTenant.decorator";
import type {Tenant} from "@prisma/client";
import {CreateOrganizationUserDto} from "./dto/create-org-user.dto";
import {ApiKeyGuard} from "../guards/api-key.guard";
import {OrgUserFilterDto} from "./dto/org-user-filter.dto";
import {
  CreateOrganizationUserWithTenantDto
} from "./dto/create-organization-user-with-tenant.dto";
import {UpdateOrganizationUserDto} from "./dto/update-organization-user.dto";
import {
  CurrentUser
} from "../tenant-auth/decorators/current-tenant-user.decorator";

@ApiSecurity('x-tenant-key')
@ApiSecurity('Authorization')
@Controller('organization-user')
export class OrganizationUserController {
  constructor(private readonly organizationUserService: OrganizationUserService) {}

  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  async create(@CurrentTenant() tenant: Tenant, @Body() dto: CreateOrganizationUserDto) {
    return await this.organizationUserService.create(tenant, dto);
  }

  @Post('filter')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  async filter(@CurrentTenant() tenant: Tenant, @Body() dto: OrgUserFilterDto) {
    return this.organizationUserService.filter(tenant, dto);
  }

  @Post(':orgId/users')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Создать нового пользователя и привязать к организации' })
  @ApiParam({ name: 'orgId', description: 'ID организации' })
  @ApiResponse({ status: 201, description: 'Пользователь успешно создан и добавлен в организацию' , example: {
      "id": "uuid-org-user",
      "organizationId": "uuid-org",
      "userId": "uuid-user",
      "role": "MANAGER",
      "position": "Главный бухгалтер",
      "user": {
        "id": "uuid-user",
        "email": "example@mail.com",
        "profile": {
          "firstName": "Мухаммад Юсуф",
          "lastName": "Абдурахимов"
        },
        "phone_numbers": [
          { "phone": "+998901234567", "isPrimary": true }
        ]
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Неверные данные запроса' })
  @ApiResponse({ status: 403, description: 'Нет прав на выполнение операции' })
  @ApiResponse({ status: 500, description: 'Ошибка при создании пользователя' })
  async createOrganizationUserWithTenantUser(
    @CurrentTenant() tenant: Tenant,
    @Param('orgId') orgId: string,
    @Body() dto: CreateOrganizationUserWithTenantDto,
  ) {
    return this.organizationUserService.createWithTenantUser(
      tenant,
      orgId,
      dto.role,
      dto.position,
      dto.user,
    );
  }


  @Patch('update/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Обновить роль или должность пользователя в организации' })
  @ApiParam({ name: 'id', description: 'ID записи OrganizationUser' })
  @ApiResponse({ status: 200, description: 'Пользователь успешно обновлён' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  async updateOrganizationUser(
    @CurrentTenant() tenant: Tenant,
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationUserDto,
  ) {
    return this.organizationUserService.update(tenant, id, dto);
  }


  @Delete('remove/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  async deleteOrganizationUser(
    @CurrentTenant() tenant: Tenant,
    @Param('id') id: string,
    @CurrentUser('id') performedByUserId:string
  ) {
    return this.organizationUserService.delete(tenant, id, performedByUserId);
  }

}
