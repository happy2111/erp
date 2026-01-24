import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import {
  Prisma,
  ReturnStatus,
  ProductAction,
  PaymentType,
  RelatedType,
} from '.prisma/client-tenant';
import { ProductTransactionsService } from '../product-transactions/product-transactions.service';
import { StocksService } from '../stocks/stocks.service';
import { AuditHelper } from '../audit-logs/audit.helper';
import { UpdateReturnDto } from './dto/update-return.dto';
import { ReturnFilterDto } from './dto/return-filter.dto';
import { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';
import { CreateReturnDto, ReturnItemDto } from './dto/create-returns.dto';
import { TransactionsService } from '../transactions/transactions.service';
import { SaleWithItems } from '../sales/types/sale.type';

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly productTransactionsService: ProductTransactionsService,
    private readonly stocksService: StocksService,
    private readonly auditHelper: AuditHelper,
    private readonly transactionsService: TransactionsService,
  ) {}

  // ============================================================
  // СОЗДАНИЕ ВОЗВРАТА
  // ============================================================
  // returns/returns.service.ts
  async create(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    dto: CreateReturnDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    // 1. Проверяем клиента
    const customer = await client.organizationCustomer.findFirst({
      where: { id: dto.customerId, organizationId },
    });
    if (!customer) {
      throw new NotFoundException(
        'Клиент не найден или принадлежит другой организации',
      );
    }

    // 2. Проверяем продажу (если указана)
    let sale: SaleWithItems | null = null;
    if (dto.saleId) {
      sale = await client.sale.findFirst({
        where: { id: dto.saleId, organizationId },
        include: { items: true }, // для проверки saleItemId
      });
      if (!sale) {
        throw new NotFoundException(
          'Продажа не найдена или принадлежит другой организации',
        );
      }
    }

    // 3. Проверяем товары и считаем сумму
    const returnItemsData = await Promise.all(
      dto.items.map(async (item: ReturnItemDto) => {
        // Проверяем существование варианта товара в организации
        const variant = await client.productVariant.findFirst({
          where: {
            id: item.productVariantId,
            product: { organizationId },
          },
          select: { id: true, title: true, sku: true },
        });

        if (!variant) {
          throw new NotFoundException(
            `Вариант товара ${item.productVariantId} не найден или принадлежит другой организации`,
          );
        }

        // Если указан saleItemId — проверяем, что он принадлежит этой продаже
        let saleItemPrice: Prisma.Decimal | null = null;
        if (item.saleItemId && sale) {
          const saleItem = sale.items.find((si) => si.id === item.saleItemId);
          if (!saleItem) {
            throw new BadRequestException(
              `Позиция продажи ${item.saleItemId} не найдена в указанной продаже`,
            );
          }
          saleItemPrice = saleItem.price;
        }

        const price = saleItemPrice || new Prisma.Decimal(item.price || 0); // если цена не указана — берём из продажи
        const total = new Prisma.Decimal(item.quantity).mul(price);

        return {
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          price,
          total,
          saleItemId: item.saleItemId,
        };
      }),
    );

    // 4. Считаем общую сумму возврата
    const totalAmount = returnItemsData.reduce(
      (sum, item) => sum.add(item.total),
      new Prisma.Decimal(0),
    );

    return client.$transaction(async (tx) => {
      // 5. Создаём возврат
      const returnRecord = await tx.return.create({
        data: {
          organizationId,
          saleId: dto.saleId,
          customerId: dto.customerId,
          status: dto.status || ReturnStatus.PENDING,
          reason: dto.reason,
          totalAmount,
          refundedAmount: new Prisma.Decimal(0),
          notes: dto.notes,
          approvedById: user.orgUserId,
        },
        include: {
          customer: { select: { firstName: true, lastName: true } },
        },
      });

      // 6. Создаём позиции возврата
      await tx.returnItem.createMany({
        data: returnItemsData.map((item) => ({
          returnId: returnRecord.id,
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
          saleItemId: item.saleItemId,
        })),
      });

      // 7. Логируем создание возврата
      await this.auditHelper.log(tx, organizationId, {
        userId: user.userId,
        action: 'CREATE',
        entity: 'Return',
        entityId: returnRecord.id,
        newValue: {
          totalAmount: Number(totalAmount),
          customerId: dto.customerId,
          saleId: dto.saleId,
          status: returnRecord.status,
          itemCount: returnItemsData.length,
        },
        note: `Создан возврат от клиента ${customer.firstName} ${customer.lastName} на сумму ${totalAmount.toString()}`,
      });

      return {
        ...returnRecord,
        totalAmount: Number(returnRecord.totalAmount),
        refundedAmount: Number(returnRecord.refundedAmount),
      };
    });
  }

  // ============================================================
  // СПИСОК ВОЗВРАТОВ
  // ============================================================
  async findAll(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    filter: ReturnFilterDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    const {
      page = 1,
      limit = 20,
      status,
      customerId,
      saleId,
      fromDate,
      toDate,
    } = filter;

    const where: Prisma.ReturnWhereInput = { organizationId };

    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (saleId) where.saleId = saleId;
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const [data, total] = await Promise.all([
      client.return.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { firstName: true, lastName: true, phone: true },
          },
          sale: { select: { invoiceNumber: true } },
          items: {
            include: {
              productVariant: { select: { title: true, sku: true } },
            },
          },
          approvedBy: { select: { email: true } },
        },
      }),
      client.return.count({ where }),
    ]);

    const transformed = data.map((r) => ({
      ...r,
      totalAmount: Number(r.totalAmount),
      refundedAmount: Number(r.refundedAmount),
    }));

    return { data: transformed, total, page, limit };
  }

  // ============================================================
  // ПОЛУЧЕНИЕ ВОЗВРАТА ПО ID
  // ============================================================
  async findOne(tenant: Tenant, user: JwtAuthenticatedUser, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    const returnRecord = await client.return.findFirst({
      where: { id, organizationId },
      include: {
        customer: true,
        sale: true,
        items: {
          include: {
            productVariant: true,
          },
        },
        approvedBy: true,
      },
    });

    if (!returnRecord) {
      throw new NotFoundException(
        'Возврат не найден или принадлежит другой организации',
      );
    }

    return {
      ...returnRecord,
      totalAmount: Number(returnRecord.totalAmount),
      refundedAmount: Number(returnRecord.refundedAmount),
    };
  }

  // ============================================================
  // ОБНОВЛЕНИЕ ВОЗВРАТА (статус, заметки)
  // ============================================================
  async update(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    id: string,
    dto: UpdateReturnDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    const existing = await client.return.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(
        'Возврат не найден или принадлежит другой организации',
      );
    }

    return client.$transaction(async (tx) => {
      const updated = await tx.return.update({
        where: { id },
        data: {
          status: dto.status,
          notes: dto.notes,
          approvedById: user.orgUserId,
        },
      });

      // Логируем обновление
      await this.auditHelper.log(tx, organizationId, {
        userId: user.userId,
        action: 'UPDATE',
        entity: 'Return',
        entityId: id,
        oldValue: { status: existing.status },
        newValue: { status: updated.status },
        note: `Обновлён статус возврата на ${updated.status}`,
      });

      return updated;
    });
  }

  // ============================================================
  // ПОДТВЕРЖДЕНИЕ ВОЗВРАТА (APPROVED → REFUNDED + возврат денег и товаров)
  // ============================================================
  async confirmReturn(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    returnId: string,
    refundKassaId: string,
    refundAmount?: number, // сумма возврата денег (может быть меньше totalAmount)
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    return client.$transaction(async (tx) => {
      const returnRecord = await tx.return.findFirst({
        where: { id: returnId, organizationId },
        include: { items: true, customer: true, sale: true },
      });

      if (!returnRecord) {
        throw new NotFoundException(
          'Возврат не найден или принадлежит другой организации',
        );
      }

      if (returnRecord.status !== ReturnStatus.APPROVED) {
        throw new BadRequestException('Возврат ещё не одобрен');
      }

      const refundDecimal = refundAmount
        ? new Prisma.Decimal(refundAmount)
        : returnRecord.totalAmount;

      if (refundDecimal.greaterThan(returnRecord.totalAmount)) {
        throw new BadRequestException(
          'Сумма возврата не может превышать сумму возврата товаров',
        );
      }

      // 1. Возвращаем товары на склад
      for (const item of returnRecord.items) {
        await this.stocksService.incrementStock(
          tx,
          organizationId,
          item.productVariantId,
          item.quantity,
        );

        // Создаём транзакцию возврата товара
        await this.productTransactionsService.create(tx, organizationId, {
          productInstanceId: item.productVariantId, // TODO: если есть конкретные экземпляры
          action: ProductAction.RETURNED,
          fromCustomerId: returnRecord.customerId,
          toCustomerId: null,
          description: `Возврат по заявке #${returnId}`,
        });
      }

      if (refundDecimal.greaterThan(0) && !refundKassaId) {
        throw new BadRequestException('Укажите кассу для возврата денег');
      }

      // 2. Создаём возврат денег (если сумма > 0)
      if (refundDecimal.greaterThan(0)) {
        // TODO: Здесь нужно выбрать кассу для возврата (можно добавить поле kassaId в dto)
        // Пока просто создаём платёж типа REFUND
        await tx.payment.create({
          data: {
            organizationId,
            userId: user.orgUserId,
            customerId: returnRecord.customerId,
            amount: refundDecimal,
            currencyId: returnRecord.sale?.currencyId || 'default-currency-id',
            type: PaymentType.EXPENSE, // или добавить тип REFUND
            description: `Возврат денег по заявке #${returnId}`,
            kassaId: refundKassaId,
          },
        });

        // Корректируем баланс клиента
        if (returnRecord.customerId) {
          await this.transactionsService.createFromPayment(tx, organizationId, {
            customerId: returnRecord.customerId,
            relatedType: RelatedType.REFUND,
            relatedId: returnRecord.id,
            amount: Number(refundDecimal),
            type: PaymentType.EXPENSE,
            currencyId: returnRecord.sale?.currencyId || 'default-currency-id',
            description: `Возврат по заявке #${returnId}`,
            createdById: user.orgUserId,
          });
        }
      }

      // 3. Обновляем статус возврата
      const updated = await tx.return.update({
        where: { id: returnId },
        data: {
          status: ReturnStatus.REFUNDED,
          refundedAmount: refundDecimal,
          approvedById: user.orgUserId,
        },
      });

      // 4. Логируем подтверждение
      await this.auditHelper.log(tx, organizationId, {
        userId: user.userId,
        action: 'CONFIRM',
        entity: 'Return',
        entityId: returnId,
        newValue: {
          status: ReturnStatus.REFUNDED,
          refundedAmount: Number(refundDecimal),
        },
        note: `Подтверждён возврат #${returnId} на сумму ${refundDecimal.toString()}`,
      });

      return updated;
    });
  }
}
