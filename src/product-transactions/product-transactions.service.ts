import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { ProductTransactionFilterDto } from './dto/product-transaction-filter.dto';
import { Prisma, ProductAction, ProductStatus } from '.prisma/client-tenant';

@Injectable()
export class ProductTransactionsService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}

  // ─────────────────────────────────────────────────────────────
  // CREATE — универсальный метод для создания транзакции товара
  // Вызывается из SalesService, PurchasesService, ReturnsService и т.д.
  // ─────────────────────────────────────────────────────────────
  async create(
    tx: Prisma.TransactionClient,
    organizationId: string,
    dto: {
      productInstanceId: string;
      action: ProductAction;
      fromCustomerId?: string | null;
      toCustomerId?: string | null;
      toOrganizationId?: string | null;
      saleId?: string | null;
      description?: string;
    },
  ) {
    // 1. Проверяем существование экземпляра и принадлежность организации
    const instance = await tx.productInstance.findFirst({
      where: {
        id: dto.productInstanceId,
        organizationId,
      },
    });

    if (!instance) {
      throw new NotFoundException(
        'Экземпляр товара не найден или принадлежит другой организации',
      );
    }

    // 2. Определяем новый статус и владельца экземпляра
    let newStatus: ProductStatus = instance.currentStatus;
    let newOwnerId: string | null = instance.currentOwnerId;

    switch (dto.action) {
      case ProductAction.PURCHASED:
        newStatus = ProductStatus.IN_STOCK;
        newOwnerId = null;
        break;
      case ProductAction.SOLD:
      case ProductAction.RESOLD:
        newStatus = ProductStatus.SOLD;
        newOwnerId = dto.toCustomerId || null;
        break;
      case ProductAction.RETURNED:
        newStatus = ProductStatus.RETURNED;
        newOwnerId = null; // или dto.fromCustomerId, если нужно
        break;
      case ProductAction.TRANSFERRED:
        newStatus = ProductStatus.IN_STOCK;
        newOwnerId = null;
        break;
      default:
        break;
    }

    // 3. Обновляем статус и владельца экземпляра
    await tx.productInstance.update({
      where: { id: dto.productInstanceId },
      data: {
        currentStatus: newStatus,
        currentOwnerId: newOwnerId,
      },
    });

    // 4. Создаём запись транзакции
    return tx.productTransaction.create({
      data: {
        productInstanceId: dto.productInstanceId,
        fromCustomerId: dto.fromCustomerId,
        toCustomerId: dto.toCustomerId,
        toOrganizationId: dto.toOrganizationId,
        saleId: dto.saleId,
        action: dto.action,
        date: new Date(),
        description: dto.description,
      },
      include: {
        product_instance: {
          select: {
            serialNumber: true,
            currentStatus: true,
            productVariant: { select: { title: true, sku: true } },
          },
        },
        from_customer: { select: { firstName: true, lastName: true } },
        to_customer: { select: { firstName: true, lastName: true } },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // FIND ALL — список всех транзакций с фильтрами и пагинацией
  // ─────────────────────────────────────────────────────────────
  async findAll(
    tenant: Tenant,
    organizationId: string,
    filter: ProductTransactionFilterDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const {
      page = 1,
      limit = 20,
      productInstanceId,
      productVariantId,
      action,
      fromDate,
      toDate,
    } = filter;

    // 1. Создаем отдельный объект для фильтрации ProductInstance
    const productInstanceWhere: Prisma.ProductInstanceWhereInput = {
      organizationId,
    };

    // 2. Добавляем productVariantId, если он есть
    if (productVariantId) {
      productInstanceWhere.productVariantId = productVariantId;
    }

    // 3. Собираем основной where
    const where: Prisma.ProductTransactionWhereInput = {
      product_instance: productInstanceWhere,
    };

    // Добавляем остальные фильтры
    if (productInstanceId) where.productInstanceId = productInstanceId;
    if (action) where.action = action;

    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date.gte = new Date(fromDate);
      if (toDate) where.date.lte = new Date(toDate);
    }

    const [data, total] = await Promise.all([
      client.productTransaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          product_instance: {
            select: {
              serialNumber: true,
              currentStatus: true,
              productVariant: { select: { title: true, sku: true } },
            },
          },
          from_customer: { select: { firstName: true, lastName: true } },
          to_customer: { select: { firstName: true, lastName: true } },
        },
      }),
      client.productTransaction.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
  // ─────────────────────────────────────────────────────────────
  // FIND BY INSTANCE — полная история по конкретному экземпляру
  // ─────────────────────────────────────────────────────────────
  async findByInstance(
    tenant: Tenant,
    organizationId: string,
    productInstanceId: string,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // Проверяем существование экземпляра
    const instance = await client.productInstance.findFirst({
      where: { id: productInstanceId, organizationId },
      select: { serialNumber: true, currentStatus: true },
    });

    if (!instance) {
      throw new NotFoundException('Экземпляр товара не найден');
    }

    const transactions = await client.productTransaction.findMany({
      where: {
        productInstanceId,
        product_instance: { organizationId },
      },
      orderBy: { date: 'desc' },
      include: {
        product_instance: {
          select: {
            serialNumber: true,
            currentStatus: true,
            productVariant: { select: { title: true, sku: true } },
          },
        },
        from_customer: { select: { firstName: true, lastName: true } },
        to_customer: { select: { firstName: true, lastName: true } },
      },
    });

    return {
      instance: {
        id: productInstanceId,
        serialNumber: instance.serialNumber,
        currentStatus: instance.currentStatus,
      },
      transactions,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // GET LAST TRANSACTIONS — последние N транзакций по экземпляру
  // ─────────────────────────────────────────────────────────────
  async getLastTransactions(
    tenant: Tenant,
    organizationId: string,
    productInstanceId: string,
    limit: number = 5,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const transactions = await client.productTransaction.findMany({
      where: {
        productInstanceId,
        product_instance: { organizationId },
      },
      take: limit,
      orderBy: { date: 'desc' },
      include: {
        product_instance: { select: { serialNumber: true } },
        from_customer: { select: { firstName: true, lastName: true } },
        to_customer: { select: { firstName: true, lastName: true } },
      },
    });

    return transactions;
  }

  // ─────────────────────────────────────────────────────────────
  // GET STATISTICS — статистика по экземпляру/товару
  // ─────────────────────────────────────────────────────────────
  async getStatistics(
    tenant: Tenant,
    organizationId: string,
    productInstanceId?: string,
    productVariantId?: string,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // 1. Формируем условия для product_instance отдельно
    const productInstanceWhere: Prisma.ProductInstanceWhereInput = {
      organizationId,
    };

    // Добавляем productVariantId в условия, если он передан
    if (productVariantId) {
      productInstanceWhere.productVariantId = productVariantId;
    }

    // 2. Создаем основной объект where, используя готовый фильтр
    const where: Prisma.ProductTransactionWhereInput = {
      product_instance: productInstanceWhere,
    };

    // Добавляем условие по ID самого инстанса, если оно есть
    if (productInstanceId) {
      where.productInstanceId = productInstanceId;
    }

    // Выполняем запросы
    const stats = await client.productTransaction.groupBy({
      by: ['action'],
      where,
      _count: { _all: true },
    });

    const total = await client.productTransaction.count({ where });

    return {
      totalTransactions: total,
      byAction: stats.map((s) => ({
        action: s.action,
        count: s._count._all,
      })),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // DELETE TRANSACTION (редко, только для админов)
  // ─────────────────────────────────────────────────────────────
  async remove(tenant: Tenant, organizationId: string, transactionId: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const transaction = await client.productTransaction.findFirst({
      where: {
        id: transactionId,
        product_instance: { organizationId },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Транзакция не найдена');
    }

    return client.productTransaction.delete({
      where: { id: transactionId },
    });
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE DESCRIPTION (если нужно исправить описание)
  // ─────────────────────────────────────────────────────────────
  async updateDescription(
    tenant: Tenant,
    organizationId: string,
    transactionId: string,
    description: string,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const transaction = await client.productTransaction.findFirst({
      where: {
        id: transactionId,
        product_instance: { organizationId },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Транзакция не найдена');
    }

    return client.productTransaction.update({
      where: { id: transactionId },
      data: { description },
    });
  }
}
