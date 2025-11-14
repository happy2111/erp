import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { StockFilterDto } from './dto/filter-stock.dto';
import type { Tenant } from '@prisma/client';
import {PrismaTenantService} from "../prisma_tenant/prisma_tenant.service";

@Injectable()
export class StockService {
  constructor(private prismaTenant: PrismaTenantService) {}

  async create(tenant: Tenant, dto: CreateStockDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    return client.stock.create({
      data: dto,
    });
  }

  async findAll(tenant: Tenant, filter: StockFilterDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const { page = 1, limit = 10, ...where } = filter;

    const [data, total] = await Promise.all([
      client.stock.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          product: true,
          organization: true,
        },
      }),
      client.stock.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const stock = await client.stock.findUnique({
      where: { id },
      include: {
        product: true,
        organization: true,
      },
    });

    if (!stock) throw new NotFoundException('Складской остаток не найден');

    return stock;
  }

  async update(tenant: Tenant, id: string, dto: UpdateStockDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    await this.findOne(tenant, id);

    return client.stock.update({
      where: { id },
      data: dto,
    });
  }

  async remove(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    await this.findOne(tenant, id);

    return client.stock.delete({
      where: { id },
    });
  }
}
