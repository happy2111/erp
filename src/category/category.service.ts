import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { Prisma } from '.prisma/client-tenant';
import { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { GetCategoryQueryDto } from './dto/get-category-query.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}

  async getAllAdmin(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    query: GetCategoryQueryDto,
  ): Promise<{ items: any[]; total: number }> {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const {
      search,
      sortField = 'name',
      order = 'asc',
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.CategoryWhereInput = search
      ? { name: { contains: search, mode: 'insensitive' } }
      : {};

    // В будущем здесь можно добавить: organizationId: user.orgId

    const [items, total] = await Promise.all([
      client.category.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortField]: order },
      }),
      client.category.count({ where }),
    ]);

    return { items, total };
  }

  async getByIdAdmin(tenant: Tenant, user: JwtAuthenticatedUser, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const category = await client.category.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            product: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Категория не найдена');
    }

    return category;
  }

  async create(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    dto: CreateCategoryDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const existing = await client.category.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Категория "${dto.name}" уже существует`);
    }

    return client.category.create({
      data: {
        name: dto.name,
        // organizationId: user.orgId,  ← добавить при необходимости
      },
    });
  }

  async update(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    id: string,
    dto: UpdateCategoryDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const category = await client.category.findUnique({ where: { id } });

    if (!category) {
      throw new NotFoundException('Категория не найдена');
    }

    if (dto.name) {
      const conflict = await client.category.findUnique({
        where: { name: dto.name },
      });

      if (conflict && conflict.id !== id) {
        throw new ConflictException(`Категория "${dto.name}" уже существует`);
      }
    }

    return client.category.update({
      where: { id },
      data: dto,
    });
  }

  async hardDelete(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    id: string,
  ): Promise<void> {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const category = await client.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Категория не найдена');
    }

    if (category._count.products > 0) {
      throw new BadRequestException(
        'Нельзя удалить категорию — существуют связанные товары',
      );
    }

    await client.category.delete({ where: { id } });
  }
}
