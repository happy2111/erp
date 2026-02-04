import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { Prisma } from '.prisma/client-tenant';
import { CreateProductBatchDto } from './dto/create-product-batch.dto';
import { UpdateProductBatchDto } from './dto/update-product-batch.dto';
import { FilterProductBatchDto } from './dto/filter-product-batch.dto';

@Injectable()
export class ProductBatchService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}

  async getAllAdmin(
    tenant: Tenant,
    orgId: string,
    query: FilterProductBatchDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const {
      page = 1,
      limit = 20,
      search,
      productVariantId,
      isValid,
      sortField = 'createdAt',
      order = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.ProductBatchWhereInput = {
      product_variant: {
        product: { organizationId: orgId },
      },
    };

    if (productVariantId) where.productVariantId = productVariantId;
    if (search) {
      where.batchNumber = { contains: search, mode: 'insensitive' };
    }
    if (isValid !== undefined) {
      where.isValid = isValid === 'true';
    }

    const [data, total] = await Promise.all([
      client.productBatch.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortField]: order },
        include: {
          product_variant: {
            select: {
              id: true,
              title: true,
              sku: true,
              product: { select: { id: true, name: true, code: true } },
            },
          },
        },
      }),
      client.productBatch.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getByIdAdmin(tenant: Tenant, orgId: string, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const batch = await client.productBatch.findFirst({
      where: {
        id,
        product_variant: {
          product: { organizationId: orgId },
        },
      },
      include: {
        product_variant: {
          select: {
            id: true,
            title: true,
            sku: true,
            product: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    if (!batch) {
      throw new NotFoundException(
        'Партия не найдена или принадлежит другой организации',
      );
    }

    return batch;
  }

  async getBatchesByVariant(tenant: Tenant, orgId: string, variantId: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // Проверка принадлежности варианта к организации
    const variantExists = await client.productVariant.findFirst({
      where: {
        id: variantId,
        product: { organizationId: orgId },
      },
    });

    if (!variantExists) {
      throw new NotFoundException(
        'Вариант товара не найден или принадлежит другой организации',
      );
    }

    return client.productBatch.findMany({
      where: { productVariantId: variantId },
      include: {
        product_variant: {
          select: {
            id: true,
            title: true,
            sku: true,
            product: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenant: Tenant, orgId: string, dto: CreateProductBatchDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // Проверка существования варианта и принадлежности к организации
    const variant = await client.productVariant.findFirst({
      where: {
        id: dto.productVariantId,
        product: { organizationId: orgId },
      },
      select: { id: true },
    });

    if (!variant) {
      throw new NotFoundException(
        'Вариант товара не найден или принадлежит другой организации',
      );
    }

    if (dto.quantity <= 0) {
      throw new BadRequestException('Количество должно быть больше 0');
    }

    // Проверка уникальности номера партии в рамках варианта
    const batchExists = await client.productBatch.findFirst({
      where: {
        productVariantId: dto.productVariantId,
        batchNumber: dto.batchNumber,
      },
    });

    if (batchExists) {
      throw new ConflictException(
        `Партия с номером ${dto.batchNumber} уже существует для данного варианта`,
      );
    }

    const batch = await client.productBatch.create({
      data: {
        productVariantId: dto.productVariantId,
        batchNumber: dto.batchNumber,
        quantity: dto.quantity,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        isValid: true,
      },
    });

    // Обновляем остаток на складе
    await this.updateStock(client, orgId, dto.productVariantId, dto.quantity);

    return batch;
  }

  async update(
    tenant: Tenant,
    orgId: string,
    id: string,
    dto: UpdateProductBatchDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const existing = await client.productBatch.findFirst({
      where: {
        id,
        product_variant: {
          product: { organizationId: orgId },
        },
      },
      select: {
        batchNumber: true,
        quantity: true,
        productVariantId: true,
      },
    });

    if (!existing) {
      throw new NotFoundException(
        'Партия не найдена или принадлежит другой организации',
      );
    }

    // Если меняем количество — корректируем остаток
    let stockDiff = 0;
    if (dto.quantity !== undefined && dto.quantity !== existing.quantity) {
      stockDiff = dto.quantity - existing.quantity;2
    }

    // Проверка уникальности нового номера партии
    if (dto.batchNumber && dto.batchNumber !== existing.batchNumber) {
      const conflict = await client.productBatch.findFirst({
        where: {
          productVariantId: existing.productVariantId,
          batchNumber: dto.batchNumber,
        },
      });

      if (conflict) {
        throw new ConflictException(
          `Партия с номером ${dto.batchNumber} уже существует`,
        );
      }
    }

    const updated = await client.productBatch.update({
      where: { id },
      data: {
        batchNumber: dto.batchNumber,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        quantity: dto.quantity,
      },
    });

    // Обновляем остаток, если количество изменилось
    if (stockDiff !== 0) {
      await this.updateStock(
        client,
        orgId,
        existing.productVariantId,
        stockDiff,
      );
    }

    return updated;
  }

  async hardDelete(tenant: Tenant, orgId: string, id: string): Promise<void> {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const batch = await client.productBatch.findFirst({
      where: {
        id,
        product_variant: {
          product: { organizationId: orgId },
        },
      },
      select: {
        quantity: true,
        productVariantId: true,
      },
    });

    if (!batch) {
      throw new NotFoundException(
        'Партия не найдена или принадлежит другой организации',
      );
    }

    const hasMovements = await client.stock.findFirst({
      where: {
        productVariantId: batch.productVariantId,
      },
    });

    if (hasMovements) {
      throw new BadRequestException(
        'Нельзя удалить партию — по ней уже были движения (продажи, списания и т.д.)',
      );
    }

    await client.productBatch.delete({ where: { id } });

    await this.updateStock(
      client,
      orgId,
      batch.productVariantId,
      -batch.quantity,
    );
  }

  async getStats(tenant: Tenant, orgId: string, variantId: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // Проверка принадлежности варианта к организации
    const variantExists = await client.productVariant.findFirst({
      where: {
        id: variantId,
        product: { organizationId: orgId },
      },
    });

    if (!variantExists) {
      throw new NotFoundException(
        'Вариант не найден или принадлежит другой организации',
      );
    }

    const batches = await client.productBatch.findMany({
      where: { productVariantId: variantId },
      select: {
        quantity: true,
        expiryDate: true,
        isValid: true,
        createdAt: true,
      },
    });

    const totalQuantity = batches.reduce((sum, b) => sum + b.quantity, 0);

    const activeBatches = batches.filter((b) => b.isValid);
    const nearestExpiry = activeBatches
      .filter((b) => b.expiryDate)
      .sort((a, b) => a.expiryDate!.getTime() - b.expiryDate!.getTime())[0];

    return {
      totalBatches: batches.length,
      activeBatches: activeBatches.length,
      totalQuantity,
      nearestExpiry: nearestExpiry?.expiryDate ?? null,
      createdAtEarliest: batches.length
        ? batches[batches.length - 1].createdAt
        : null,
    };
  }

  // ─── Вспомогательная функция для обновления остатка ────────────────────────
  private async updateStock(
    client: any,
    organizationId: string,
    variantId: string,
    delta: number,
  ) {
    return await client.stock.upsert({
      where: {
        organizationId_productVariantId: {
          organizationId,
          productVariantId: variantId,
        },
      },
      create: {
        organizationId,
        productVariantId: variantId,
        quantity: Math.max(0, delta),
      },
      update: {
        quantity: {
          increment: delta,
        },
      },
    });
  }
}
