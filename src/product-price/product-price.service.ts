import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProductPriceDto } from './dto/create-product-price.dto';
import { UpdateProductPriceDto } from './dto/update-product-price.dto';
import { ProductPriceFilterDto } from './dto/filter-product-price.dto';
import type { Tenant } from '@prisma/client';
import {PrismaTenantService} from "../prisma_tenant/prisma_tenant.service";

@Injectable()
export class ProductPricesService {
  constructor(private prismaTenant: PrismaTenantService) {}

  async create(tenant: Tenant, dto: CreateProductPriceDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    return client.productPrice.create({
      data: {
        ...dto,
        amount: dto.amount, // decimal as string
      },
    });
  }

  async findAll(tenant: Tenant, filter: ProductPriceFilterDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const { page = 1, limit = 10, ...rest } = filter;

    const where = { ...rest };

    const [data, total] = await Promise.all([
      client.productPrice.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: true,
          currency: true,
          organization: true,
        },
      }),

      client.productPrice.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const price = await client.productPrice.findUnique({
      where: { id },
      include: {
        product: true,
        currency: true,
        organization: true,
      },
    });

    if (!price) throw new NotFoundException('Цена не найдена');

    return price;
  }

  async update(tenant: Tenant, id: string, dto: UpdateProductPriceDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    await this.findOne(tenant, id);

    return client.productPrice.update({
      where: { id },
      data: dto,
    });
  }

  async remove(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    await this.findOne(tenant, id);

    return client.productPrice.delete({ where: { id } });
  }
}
