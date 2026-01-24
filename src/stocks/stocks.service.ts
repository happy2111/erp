import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { Prisma } from '.prisma/client-tenant';
import { AuditHelper } from '../audit-logs/audit.helper';
import { StockFilterDto } from './dto/stock-filter.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';

@Injectable()
export class StocksService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly auditHelper: AuditHelper,
  ) {}

  // ============================================================
  // ПОЛУЧЕНИЕ ОСТАТКОВ (с пагинацией и поиском)
  // ============================================================
  async findAll(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    filter: StockFilterDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    const { page = 1, limit = 20, search } = filter;

    const where: Prisma.StockWhereInput = {
      organizationId,
    };

    if (search) {
      where.product_variant = {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
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
  async findOne(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    productVariantId: string,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    const stock = await client.stock.findFirst({
      where: {
        organizationId,
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
      const variant = await client.productVariant.findFirst({
        where: { id: productVariantId, product: { organizationId } },
        select: { id: true, title: true, sku: true, barcode: true },
      });

      if (!variant) {
        throw new NotFoundException(
          'Вариант товара не найден или принадлежит другой организации',
        );
      }

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
  async adjustStock(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    dto: AdjustStockDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    // 1. Проверяем существование варианта товара и принадлежность организации
    const variant = await client.productVariant.findFirst({
      where: {
        id: dto.productVariantId,
        product: { organizationId },
      },
      select: { id: true, title: true, sku: true },
    });

    if (!variant) {
      throw new NotFoundException(
        'Вариант товара не найден или принадлежит другой организации',
      );
    }

    return client.$transaction(async (tx) => {
      // 2. Проверяем, чтобы при расходе не уйти в минус
      let currentQty = 0;
      if (dto.quantityDelta < 0) {
        const currentStock = await tx.stock.findFirst({
          where: {
            organizationId,
            productVariantId: dto.productVariantId,
          },
          select: { quantity: true },
        });

        currentQty = currentStock ? currentStock.quantity : 0;

        if (currentQty + dto.quantityDelta < 0) {
          throw new BadRequestException(
            `Недостаточно товара на складе. Текущий остаток: ${currentQty}, требуется списать: ${Math.abs(dto.quantityDelta)}`,
          );
        }
      }

      // 3. Обновляем или создаём остаток
      const updatedStock = await tx.stock.upsert({
        where: {
          organizationId_productVariantId: {
            organizationId,
            productVariantId: dto.productVariantId,
          },
        },
        create: {
          organizationId,
          productVariantId: dto.productVariantId,
          quantity: dto.quantityDelta,
        },
        update: {
          quantity: { increment: dto.quantityDelta },
        },
      });

      // 4. Логируем изменение остатка
      await this.auditHelper.log(tx, organizationId, {
        userId: user.userId,
        action: dto.quantityDelta >= 0 ? 'INCREMENT' : 'DECREMENT',
        entity: 'Stock',
        entityId: updatedStock.id,
        oldValue: { quantity: currentQty },
        newValue: { quantity: updatedStock.quantity },
        note: `${dto.quantityDelta >= 0 ? 'Приход' : 'Расход'} ${Math.abs(dto.quantityDelta)} ед. товара "${variant.title}" (SKU: ${variant.sku})`,
      });

      return {
        ...updatedStock,
        quantity: Number(updatedStock.quantity),
      };
    });
  }

  // ============================================================
  // МЕТОДЫ ДЛЯ ВНУТРЕННЕГО ИСПОЛЬЗОВАНИЯ (в Sales, Purchases и т.д.)
  // ============================================================
  async decrementStock(
    tx: Prisma.TransactionClient,
    organizationId: string,
    productVariantId: string,
    quantity: number,
  ) {
    return tx.stock.update({
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
    tx: Prisma.TransactionClient,
    organizationId: string,
    productVariantId: string,
    quantity: number,
  ) {
    return tx.stock.upsert({
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

  async getCurrentQuantity(
    tx: Prisma.TransactionClient,
    organizationId: string,
    productVariantId: string,
  ): Promise<number> {
    const stock = await tx.stock.findFirst({
      where: { organizationId, productVariantId },
      select: { quantity: true },
    });
    return stock ? stock.quantity : 0;
  }
}
