import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { Prisma } from '.prisma/client-tenant';
import { StockFilterDto } from './dto/stock-filter.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';

@Injectable()
export class StocksService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}

  // ============================================================
  // ПОЛУЧЕНИЕ ОСТАТКОВ (с пагинацией и поиском)
  // ============================================================
  async findAll(tenant: Tenant, filter: StockFilterDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const { page = 1, limit = 20, search } = filter;

    const where: Prisma.StockWhereInput = {
      organizationId: tenant.id,
    };

    if (search) {
      where.product_variant = {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { product: { name: { contains: search, mode: 'insensitive' } } },
        ],
      };
    }

    const [data, total] = await Promise.all([
      client.stock.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          product_variant: {
            select: {
              id: true,
              title: true,
              sku: true,
              barcode: true,
              product: { select: { name: true, code: true } },
            },
          },
        },
      }),
      client.stock.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ============================================================
  // ПОЛУЧЕНИЕ ОСТАТКА ПО КОНКРЕТНОМУ ВАРИАНТУ ТОВАРА
  // ============================================================
  async findOne(tenant: Tenant, productVariantId: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const stock = await client.stock.findFirst({
      where: {
        organizationId: tenant.id,
        productVariantId,
      },
      include: {
        product_variant: {
          select: {
            id: true,
            title: true,
            sku: true,
            barcode: true,
            product: { select: { name: true, code: true } },
          },
        },
      },
    });

    if (!stock) {
      // Если остатка ещё нет — возвращаем 0
      const variant = await client.productVariant.findUnique({
        where: { id: productVariantId },
        select: { title: true, sku: true },
      });

      if (!variant) throw new NotFoundException('Вариант товара не найден');

      return {
        quantity: 0,
        product_variant: variant,
      };
    }

    return stock;
  }

  // ============================================================
  // ИЗМЕНЕНИЕ ОСТАТКА (приход / расход / корректировка)
  // ============================================================
  async adjustStock(tenant: Tenant, dto: AdjustStockDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // Проверяем существование варианта товара
    const variant = await client.productVariant.findUnique({
      where: { id: dto.productVariantId },
      include: { product: { select: { organizationId: true } } },
    });

    if (!variant) throw new NotFoundException('Вариант товара не найден');

    if (variant.product.organizationId !== tenant.id) {
      throw new BadRequestException('Товар не принадлежит этой организации');
    }

    // Проверяем, чтобы при расходе не уйти в минус
    if (dto.quantityDelta < 0) {
      const current = await client.stock.findFirst({
        where: {
          organizationId: tenant.id,
          productVariantId: dto.productVariantId,
        },
      });

      const currentQty = current ? current.quantity : 0;
      if (currentQty + dto.quantityDelta < 0) {
        throw new BadRequestException(
          `Недостаточно товара на складе. Текущий остаток: ${currentQty}, требуется списать: ${Math.abs(dto.quantityDelta)}`,
        );
      }
    }

    // Обновляем или создаём остаток
    const updatedStock = await client.stock.upsert({
      where: {
        organizationId_productVariantId: {
          organizationId: tenant.id,
          productVariantId: dto.productVariantId,
        },
      },
      create: {
        organizationId: tenant.id,
        productVariantId: dto.productVariantId,
        quantity: dto.quantityDelta,
      },
      update: {
        quantity: { increment: dto.quantityDelta },
      },
    });

    // Можно добавить запись в историю (будущую таблицу stock_movements)
    // await client.stockMovement.create({...})

    return {
      ...updatedStock,
      quantity: Number(updatedStock.quantity), // int → number
    };
  }

  // ============================================================
  // МЕТОДЫ ДЛЯ ВНУТРЕННЕГО ИСПОЛЬЗОВАНИЯ (в Sales, Purchases и т.д.)
  // ============================================================
  async decrementStock(
    client: any,
    organizationId: string,
    productVariantId: string,
    quantity: number,
  ) {
    return client.stock.update({
      where: {
        organizationId_productVariantId: {
          organizationId,
          productVariantId,
        },
      },
      data: {
        quantity: { decrement: quantity },
      },
    });
  }

  async incrementStock(
    client: any,
    organizationId: string,
    productVariantId: string,
    quantity: number,
  ) {
    return client.stock.upsert({
      where: {
        organizationId_productVariantId: {
          organizationId,
          productVariantId,
        },
      },
      create: {
        organizationId,
        productVariantId,
        quantity,
      },
      update: {
        quantity: { increment: quantity },
      },
    });
  }

  // Получить текущий остаток (для проверок)
  async getCurrentQuantity(
    client: any,
    organizationId: string,
    productVariantId: string,
  ): Promise<number> {
    const stock = await client.stock.findFirst({
      where: { organizationId, productVariantId },
      select: { quantity: true },
    });
    return stock ? stock.quantity : 0;
  }
}
