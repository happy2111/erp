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
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { GetBrandQueryDto } from './dto/get-brand-query.dto';

@Injectable()
export class BrandsService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}

  async getAllAdmin(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    query: GetBrandQueryDto,
  ): Promise<{ items: any[]; total: number }> {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const {
      search,
      sortField = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 10,
    } = query;

    const where: Prisma.BrandWhereInput = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      client.brand.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortField]: order },
        include: {
          products: true,
        },
      }),
      client.brand.count({ where }),
    ]);

    return { items, total };
  }

  async getByIdAdmin(tenant: Tenant, user: JwtAuthenticatedUser, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const brand = await client.brand.findUnique({
      where: { id },
      include: {
        products: {
          select: {
            id: true,
            name: true,
            code: true,
            organization: { select: { name: true } },
          },
        },
      },
    });

    if (!brand) {
      throw new NotFoundException('Бренд не найден');
    }

    return brand;
  }

  async create(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    dto: CreateBrandDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const existing = await client.brand.findUnique({
      where: { name: dto.name },
    });

    if (existing) {
      throw new ConflictException(`Бренд "${dto.name}" уже существует`);
    }

    return client.brand.create({
      data: {
        name: dto.name,
        // organizationId: user.orgId,  ← добавить в будущем при необходимости
      },
    });
  }

  async update(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    id: string,
    dto: UpdateBrandDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const brand = await client.brand.findUnique({ where: { id } });

    if (!brand) {
      throw new NotFoundException('Бренд не найден');
    }

    if (dto.name) {
      const conflict = await client.brand.findFirst({
        where: {
          name: dto.name,
          id: { not: id },
        },
      });

      if (conflict) {
        throw new ConflictException(`Бренд "${dto.name}" уже существует`);
      }
    }

    return client.brand.update({
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

    const brand = await client.brand.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!brand) {
      throw new NotFoundException('Бренд не найден');
    }

    if (brand._count.products > 0) {
      throw new BadRequestException(
        'Нельзя удалить бренд — существуют связанные товары',
      );
    }

    await client.brand.delete({ where: { id } });
  }
}
