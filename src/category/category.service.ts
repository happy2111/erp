import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Prisma } from '.prisma/client-tenant';
import { Tenant } from '@prisma/client';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryFilterDto } from './dto/filter-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}

  async create(tenant: Tenant, dto: CreateCategoryDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const exists = await client.category.findUnique({ where: { name: dto.name } });
    if (exists) {
      throw new ConflictException(`Категория с именем "${dto.name}" уже существует`);
    }

    return client.category.create({
      data: { name: dto.name },
    });
  }

  async findAll(tenant: Tenant, filter: CategoryFilterDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const take = filter.limit;
    const skip = (filter.page - 1) * filter.limit;

    const where: Prisma.CategoryWhereInput = {};

    if (filter.search) {
      where.name = { contains: filter.search, mode: 'insensitive' };
    }

    const [data, total] = await client.$transaction([
      client.category.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      client.category.count({ where }),
    ]);

    return {
      data,
      total,
      page: filter.page,
      limit: filter.limit,
    };
  }

  async findOne(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const category = await client.category.findUnique({
      where: { id },
      include: { products: true },
    });

    if (!category) throw new NotFoundException('Категория не найдена');
    return category;
  }

  async update(tenant: Tenant, id: string, dto: UpdateCategoryDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const category = await client.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Категория не найдена');

    if (dto.name) {
      const existing = await client.category.findUnique({ where: { name: dto.name } });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Категория с именем "${dto.name}" уже существует`);
      }
    }

    return client.category.update({
      where: { id },
      data: { ...dto },
    });
  }

  async remove(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const category = await client.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Категория не найдена');

    try {
      await client.category.delete({ where: { id } });
      return { message: 'Категория успешно удалена' };
    } catch (e: any) {
      if (e.code === 'P2003') {
        throw new BadRequestException('Невозможно удалить категорию: существуют связанные товары');
      }
      throw e;
    }
  }
}
