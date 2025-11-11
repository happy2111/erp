import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags
} from '@nestjs/swagger';
import { CategoriesService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryFilterDto } from './dto/filter-category.dto';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../tenant-auth/guards/jwt.guard';
import { TenantRolesGuard } from '../guards/tenant-roles.guard';
import { Roles } from '../decorators/tenant-roles.decorator';
import { OrgUserRole } from '.prisma/client-tenant';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import type { Tenant } from '@prisma/client';

@ApiTags('Categories')
@ApiSecurity('x-tenant-key')
@ApiSecurity('Authorization')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post('create')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Создать новую категорию' })
  @ApiResponse({ status: 201, description: 'Категория успешно создана' })
  @ApiResponse({ status: 409, description: 'Категория с таким именем уже существует' })
  async create(@CurrentTenant() tenant: Tenant, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(tenant, dto);
  }

  @Post('filter')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Получить список категорий с фильтрацией и пагинацией' })
  @ApiResponse({ status: 200, description: 'Список категорий успешно получен' })
  async filter(@CurrentTenant() tenant: Tenant, @Body() dto: CategoryFilterDto) {
    return this.categoriesService.findAll(tenant, dto);
  }

  @Get(':id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Получить категорию по ID' })
  @ApiParam({ name: 'id', description: 'ID категории' })
  @ApiResponse({ status: 200, description: 'Категория успешно найдена' })
  @ApiResponse({ status: 404, description: 'Категория не найдена' })
  async findOne(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.categoriesService.findOne(tenant, id);
  }

  @Patch('update/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER)
  @ApiOperation({ summary: 'Обновить категорию по ID' })
  @ApiParam({ name: 'id', description: 'ID категории' })
  @ApiResponse({ status: 200, description: 'Категория успешно обновлена' })
  @ApiResponse({ status: 404, description: 'Категория не найдена' })
  async update(@CurrentTenant() tenant: Tenant, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(tenant, id, dto);
  }

  @Delete('remove/:id')
  @UseGuards(ApiKeyGuard, JwtAuthGuard, TenantRolesGuard)
  @Roles(OrgUserRole.ADMIN, OrgUserRole.MANAGER, OrgUserRole.OWNER)
  @ApiOperation({ summary: 'Удалить категорию по ID' })
  @ApiParam({ name: 'id', description: 'ID категории' })
  @ApiResponse({ status: 200, description: 'Категория успешно удалена' })
  @ApiResponse({ status: 404, description: 'Категория не найдена' })
  async remove(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.categoriesService.remove(tenant, id);
  }
}
