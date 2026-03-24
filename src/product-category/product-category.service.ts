import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { Prisma } from '.prisma/client-tenant';
import { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { GetProductCategoryQueryDto } from './dto/get-product-category-query.dto';

@Injectable()
export class ProductCategoryService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}

  async getAllAdmin(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    query: GetProductCategoryQueryDto,
  ): Promise<{ items: any[]; total: number }> {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const {
      productId,
      categoryId,
      search,
      sortField = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 50,
    } = query;

    const where: Prisma.ProductCategoryWhereInput = {};

    if (productId) where.productId = productId;
    if (categoryId) where.categoryId = categoryId;

    if (search) {
      where.category = {
        name: { contains: search, mode: 'insensitive' },
      };
    }

    // В будущем здесь можно добавить:
    // where.product: { organizationId: user.orgId }

    const [items, total] = await Promise.all([
      client.productCategory.findMany({
        where,
        include: {
          product: { select: { id: true, name: true } },
          category: { select: { id: true, name: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortField]: order },
      }),
      client.productCategory.count({ where }),
    ]);

    return { items, total };
  }
  //
  // async getByIdAdmin(tenant: Tenant, user: JwtAuthenticatedUser, id: string) {
  //   const client = this.prismaTenant.getTenantPrismaClient(tenant);
  //
  //   const link = await client.productCategory.findUnique({
  //     where: { productId: id },
  //     include: {
  //       product: { select: { id: true, name: true } },
  //       category: { select: { id: true, name: true } },
  //     },
  //   });
  //
  //   if (!link) {
  //     throw new NotFoundException('Связь товар-категория не найдена');
  //   }
  //
  //   return link;
  // }

  async create(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    dto: CreateProductCategoryDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const [productExists, categoryExists] = await Promise.all([
      client.product.findUnique({ where: { id: dto.productId } }),
      client.category.findUnique({ where: { id: dto.categoryId } }),
    ]);

    if (!productExists) {
      throw new NotFoundException(`Товар ${dto.productId} не найден`);
    }
    if (!categoryExists) {
      throw new NotFoundException(`Категория ${dto.categoryId} не найдена`);
    }

    const exists = await client.productCategory.findUnique({
      where: {
        productId_categoryId: {
          productId: dto.productId,
          categoryId: dto.categoryId,
        },
      },
    });

    if (exists) {
      throw new ConflictException('Товар уже находится в этой категории');
    }

    return client.productCategory.create({
      data: {
        productId: dto.productId,
        categoryId: dto.categoryId,
      },
      include: {
        product: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });
  }

  async remove(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    dto: CreateProductCategoryDto,
  ): Promise<void> {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const exists = await client.productCategory.findUnique({
      where: {
        productId_categoryId: {
          productId: dto.productId,
          categoryId: dto.categoryId,
        },
      },
    });

    if (!exists) {
      throw new NotFoundException('Связь товар-категория не найдена');
    }

    await client.productCategory.delete({
      where: {
        productId_categoryId: {
          productId: dto.productId,
          categoryId: dto.categoryId,
        },
      },
    });
  }

  async getCategoriesByProduct(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    productId: string,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // В будущем: проверка, что продукт принадлежит организации user.orgId

    return client.productCategory.findMany({
      where: { productId },
      include: {
        category: { select: { id: true, name: true } },
      },
      orderBy: { category: { name: 'asc' } },
    });
  }

  async getProductsByCategory(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    categoryId: string,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    return client.productCategory.findMany({
      where: { categoryId },
      include: {
        product: { select: { id: true, name: true } },
      },
      orderBy: { product: { name: 'asc' } },
    });
  }
}
