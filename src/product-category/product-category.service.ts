import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { Tenant } from "@prisma/client";
import {PrismaTenantService} from "../prisma_tenant/prisma_tenant.service";

@Injectable()
export class ProductCategoryService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}

  async create(tenant: Tenant, dto: CreateProductCategoryDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // Проверяем уникальность пары
    const exists = await client.productCategory.findFirst({
      where: {
        productId: dto.productId,
        categoryId: dto.categoryId,
      },
    });

    if (exists) {
      throw new ConflictException('Этот товар уже находится в этой категории');
    }

    return client.productCategory.create({ data: dto });
  }

  async findAllByProduct(tenant: Tenant, productId: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    return client.productCategory.findMany({
      where: { productId },
      include: { category: true },
    });
  }

  async findAllByCategory(tenant: Tenant, categoryId: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    return client.productCategory.findMany({
      where: { categoryId },
      include: { product: true },
    });
  }

  async delete(tenant: Tenant, dto: CreateProductCategoryDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const exists = await client.productCategory.findFirst({
      where: {
        productId: dto.productId,
        categoryId: dto.categoryId,
      },
    });

    if (!exists) {
      throw new NotFoundException('Связь product-category не найдена');
    }

    return client.productCategory.delete({
      where: {
        productId_categoryId: {
          productId: dto.productId,
          categoryId: dto.categoryId,
        },
      },
    });
  }
}
