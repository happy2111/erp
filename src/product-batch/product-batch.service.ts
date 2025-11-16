import {
  Injectable,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { Tenant } from '@prisma/client';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';

import { CreateProductBatchDto } from './dto/create-product-batch.dto';
import { UpdateProductBatchDto } from './dto/update-product-batch.dto';
import { FilterProductBatchDto } from './dto/filter-product-batch.dto';

@Injectable()
export class ProductBatchService {
  constructor(private prismaTenant: PrismaTenantService) {}

  // ============================================================
  // CREATE
  // ============================================================
  async create(tenant: Tenant, dto: CreateProductBatchDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // Проверяем существование VARIANT
    const variant = await client.productVariant.findUnique({
      where: { id: dto.productVariantId }, // теперь здесь variantId
      include: { product: { select: { organizationId: true } } }
    });

    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    if (dto.quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than zero');
    }

    // Создаём партию
    const batch = await client.productBatch.create({
      data: {
        productVariantId: dto.productVariantId,
        batchNumber: dto.batchNumber,
        quantity: dto.quantity,
        expiryDate: dto.expiryDate
      }
    });

    // Обновляем остаток
    await this.updateStockOnCreate(
      client,
      variant.product.organizationId,
      variant.id,
      dto.quantity
    );

    return batch;
  }

  // ============================================================
  // FIND ALL (с пагинацией)
  // ============================================================
  async findAll(tenant: Tenant, query: FilterProductBatchDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const { page = 1, limit = 20, search, productVariantId, isValid } = query;
    const skip = (page - 1) * limit;

    const batches = await client.productBatch.findMany({
      skip,
      take: limit,
      where: {
        AND: [
          search
            ? { batchNumber: { contains: search, mode: 'insensitive' } }
            : {},
          productVariantId
            ? { productVariantId }
            : {},
          isValid !== undefined
            ? { isValid: isValid === 'true' }
            : {}
        ]
      },
      include: {
        product_variant: {
          select: {
            id: true,
            title: true,
            sku: true,
            product: { select: { name: true, code: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const total = await client.productBatch.count({
      where: {
        productVariantId
      }
    });

    return {
      data: batches,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    };
  }

  // ============================================================
  // FIND ONE
  // ============================================================
  async findOne(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const batch = await client.productBatch.findUnique({
      where: { id },
      include: {
        product_variant: {
          select: {
            id: true,
            title: true,
            sku: true,
            product: { select: { name: true, code: true } }
          }
        }
      }
    });

    if (!batch) throw new NotFoundException('Batch not found');

    return batch;
  }

  // ============================================================
  // UPDATE
  // ============================================================
  async update(tenant: Tenant, id: string, dto: UpdateProductBatchDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const existing = await client.productBatch.findUnique({
      where: { id },
      include: {
        product_variant: {
          include: {
            product: { select: { organizationId: true } }
          }
        }
      }
    });

    if (!existing) throw new NotFoundException('Batch not found');

    // Если меняем количество — пересчитываем stock
    if (dto.quantity !== undefined) {
      const diff = dto.quantity - existing.quantity;
      await this.updateStockOnUpdate(
        client,
        existing.product_variant.id,
        existing.product_variant.product.organizationId,
        diff
      );
    }

    return client.productBatch.update({
      where: { id },
      data: dto
    });
  }

  // ============================================================
  // DELETE
  // ============================================================
  async delete(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const existing = await client.productBatch.findUnique({
      where: { id },
      include: {
        product_variant: {
          include: {
            product: { select: { organizationId: true } }
          }
        }
      }
    });

    if (!existing) throw new NotFoundException('Batch not found');

    await this.updateStockOnDelete(
      client,
      existing.product_variant.id,
      existing.product_variant.product.organizationId,
      existing.quantity
    );

    return client.productBatch.delete({
      where: { id }
    });
  }

  // ============================================================
  // STOCK LOGIC
  // ============================================================
  private async updateStockOnCreate(
    client:any,
    organizationId: string,
    variantId: string,
    qty: number
  ) {
    return client.stock.upsert({
      where: {
        organizationId_productVariantId: {
          organizationId,
          productVariantId: variantId
        }
      },
      create: {
        organizationId,
        productVariantId: variantId,
        quantity: qty
      },
      update: {
        quantity: { increment: qty }
      }
    });
  }

  private async updateStockOnUpdate(
    client: any,
    variantId: string,
    organizationId: string,
    diff: number
  ) {
    if (diff === 0) return;

    return client.stock.update({
      where: {
        organizationId_productVariantId: {
          productVariantId: variantId,
          organizationId
        }
      },
      data: {
        quantity: { increment: diff }
      }
    });
  }

  private async updateStockOnDelete(
    client: any,
    variantId: string,
    organizationId: string,
    qty: number
  ) {
    return client.stock.update({
      where: {
        organizationId_productVariantId: {
          productVariantId: variantId,
          organizationId
        }
      },
      data: {
        quantity: { decrement: qty }
      }
    });
  }

  // ============================================================
  // ANALYTICS
  // ============================================================
  async getStats(tenant: Tenant, variantId: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const batches = await client.productBatch.findMany({
      where: { productVariantId: variantId }
    });

    const totalQuantity = batches.reduce((s, b) => s + b.quantity, 0);


    const earliestExpiry = batches
      .filter(b => b.expiryDate != null)
      .sort((a, b) => (a.expiryDate as Date).getTime() - (b.expiryDate as Date).getTime())[0];

    return {
      totalBatches: batches.length,
      totalQuantity,
      nearestExpiry: earliestExpiry || null
    };
  }

  async sumQuantity(tenant: Tenant, variantId: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const sum = await client.productBatch.aggregate({
      where: { productVariantId: variantId },
      _sum: { quantity: true }
    });

    return sum._sum.quantity || 0;
  }
}
