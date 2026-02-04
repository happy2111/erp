import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { Prisma } from '.prisma/client-tenant';
import { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';
import { AuditHelper } from '../audit-logs/audit.helper';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { StockFilterDto } from './dto/stock-filter.dto';

@Injectable()
export class StocksService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly auditHelper: AuditHelper,
  ) {}

  async getAllAdmin(tenant: Tenant, orgId: string, filter: StockFilterDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const {
      search,
      sortField = 'updatedAt',
      order = 'desc',
      page = 1,
      limit = 20,
    } = filter;

    const skip = (page - 1) * limit;

    const where: Prisma.StockWhereInput = {
      organizationId: orgId,
    };

    if (search) {
      where.product_variant = {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
          { product: { name: { contains: search, mode: 'insensitive' } } },
          { product: { code: { contains: search, mode: 'insensitive' } } },
        ],
      };
    }

    const [data, total] = await Promise.all([
      client.stock.findMany({
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
              barcode: true,
              product: {
                select: { id: true, name: true, code: true },
              },
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

  async getStockByVariant(tenant: Tenant, orgId: string, variantId: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // Проверяем принадлежность варианта к организации
    const variantExists = await client.productVariant.findFirst({
      where: {
        id: variantId,
        product: { organizationId: orgId },
      },
      select: {
        id: true,
        title: true,
        sku: true,
        barcode: true,
        product: { select: { id: true, name: true, code: true } },
      },
    });

    if (!variantExists) {
      throw new NotFoundException(
        'Вариант товара не найден или принадлежит другой организации',
      );
    }

    const stock = await client.stock.findFirst({
      where: {
        organizationId: orgId,
        productVariantId: variantId,
      },
    });

    return {
      quantity: stock ? stock.quantity : 0,
      product_variant: variantExists,
      updatedAt: stock ? stock.updatedAt : null,
    };
  }

  async adjustStock(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    dto: AdjustStockDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    return client.$transaction(async (tx) => {
      // 1. Проверяем существование варианта и принадлежность к организации
      const variant = await tx.productVariant.findFirst({
        where: {
          id: dto.productVariantId,
          product: { organizationId },
        },
        select: {
          id: true,
          title: true,
          sku: true,
          product: { select: { name: true } },
        },
      });

      if (!variant) {
        throw new NotFoundException(
          'Вариант товара не найден или принадлежит другой организации',
        );
      }

      // 2. Проверяем, чтобы при расходе не уйти в минус
      let currentQty = 0;
      const isDecrement = dto.quantityDelta < 0;

      if (isDecrement) {
        const currentStock = await tx.stock.findFirst({
          where: {
            organizationId,
            productVariantId: dto.productVariantId,
          },
          select: { quantity: true },
        });

        currentQty = currentStock?.quantity ?? 0;

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
          quantity: Math.max(0, dto.quantityDelta),
        },
        update: {
          quantity: {
            increment: dto.quantityDelta,
          },
        },
      });

      // 4. Логируем операцию
      await this.auditHelper.log(tx, organizationId, {
        userId: user.userId,
        action: isDecrement ? 'DECREMENT' : 'INCREMENT',
        entity: 'Stock',
        entityId: updatedStock.id,
        oldValue: { quantity: currentQty },
        newValue: { quantity: updatedStock.quantity },
        note: `${isDecrement ? 'Расход' : 'Приход'} ${Math.abs(dto.quantityDelta)} ед. товара "${variant.title}" (SKU: ${variant.sku || 'нет'}) → причина: ${dto.reason || 'корректировка'}`,
      });

      return {
        id: updatedStock.id,
        productVariantId: dto.productVariantId,
        quantity: Number(updatedStock.quantity),
        updatedAt: updatedStock.updatedAt,
      };
    });
  }

  // ─── Внутренние методы для использования в других сервисах ─────────────────

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

  async decrementStock(
    tx: Prisma.TransactionClient,
    organizationId: string,
    productVariantId: string,
    quantity: number,
  ) {
    const stock = await tx.stock.findFirst({
      where: {
        organizationId,
        productVariantId,
      },
      select: { quantity: true },
    });

    if (!stock || stock.quantity < quantity) {
      throw new BadRequestException(
        `Недостаточно товара на складе. Требуется: ${quantity}, доступно: ${stock?.quantity ?? 0}`,
      );
    }

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

  async getCurrentQuantity(
    tx: Prisma.TransactionClient,
    organizationId: string,
    productVariantId: string,
  ): Promise<number> {
    const stock = await tx.stock.findFirst({
      where: { organizationId, productVariantId },
      select: { quantity: true },
    });
    return stock?.quantity ?? 0;
  }
}
