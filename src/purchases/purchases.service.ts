import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import {
  Kassa,
  PaymentType,
  Prisma,
  PurchaseStatus,
  RelatedType,
} from '.prisma/client-tenant';
import { StocksService } from '../stocks/stocks.service';
import { KassasService } from '../kassas/kassas.service';
import { AuditHelper } from '../audit-logs/audit.helper';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { CodeGeneratorService } from '../code-generater/code-generater.service';
import { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';
import { GetPurchaseQueryDto } from './dto/get-purchase-query.dto';
import { TransactionsService } from '../transactions/transactions.service';
import { PayPurchaseDto } from './dto/pay-purchase.dto';

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly codeGenerator: CodeGeneratorService,
    private readonly stocksService: StocksService,
    private readonly kassasService: KassasService,
    private readonly auditHelper: AuditHelper,
    private readonly transactionsService: TransactionsService,
  ) {}

  async create(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    dto: CreatePurchaseDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    // 1. Проверяем валюту
    const currency = await client.currency.findUnique({
      where: { id: dto.currencyId },
    });
    if (!currency) throw new BadRequestException('Valyuta topilmadi');

    let kassa: Kassa | null = null;

    if (dto.kassaId) {
      kassa = await client.kassa.findFirst({
        where: {
          id: dto.kassaId,
          organizationId,
          currencyId: dto.currencyId,
        },
      });

      if (!kassa) {
        throw new BadRequestException(
          'Kassa topilmadi yoki kassa valyutasi mos kelmaydi',
        );
      }
    }

    // 2. Проверяем поставщика и его принадлежность организации
    const supplier = await client.organizationCustomer.findFirst({
      where: {
        id: dto.supplierId,
        organizationId,
        type: 'SUPPLIER',
      },
    });
    if (!supplier)
      throw new NotFoundException(
        'Yetkazib beruvchi ushbu tashkilotda topilmadi',
      );

    // 3. Проверяем ответственного (если указан)
    if (user.orgUserId) {
      const responsible = await client.organizationUser.findFirst({
        where: { id: user.orgUserId, organizationId },
      });
      if (!responsible)
        throw new BadRequestException(
          'Mas’ul shaxs ushbu tashkilotda topilmadi',
        );
    }

    // 4. Генерируем номер накладной
    const invoiceNumber = await this.codeGenerator.generateNextCode(tenant, {
      prefix: 'PUR',
      modelName: 'purchase',
      sequenceLength: 6,
      fieldName: 'invoiceNumber',
    });

    // 5. Собираем позиции + проверяем товары
    const purchaseItemsData = await Promise.all(
      dto.items.map(async (item) => {
        const variant = await client.productVariant.findFirst({
          where: {
            id: item.productVariantId,
            product: { organizationId },
          },
          include: { currency: true },
        });

        if (!variant)
          throw new NotFoundException(
            `Tovar varianti ${item.productVariantId} topilmadi yoki boshqa tashkilotga tegishli`,
          );

        if (item.quantity <= 0) {
          throw new BadRequestException('Miqdor 0 dan katta bo‘lishi kerak');
        }

        if (item.price < 0) {
          throw new BadRequestException('Narx manfiy bo‘lishi mumkin emas');
        }

        if (item.discount && item.discount < 0) {
          throw new BadRequestException('Chegirma manfiy bo‘lishi mumkin emas');
        }

        if (item.discount && item.discount > item.price) {
          throw new BadRequestException(
            'Chegirma narxdan yuqori bo‘lishi mumkin emas',
          );
        }

        if (item.batchNumber && item.quantity <= 0) {
          throw new BadRequestException(
            'Partiya miqdori 0 dan katta bo‘lishi kerak',
          );
        }

        if (item.expiryDate && item.expiryDate <= new Date()) {
          throw new BadRequestException(
            'Partiya yaroqlilik muddati kelajakda bo‘lishi kerak',
          );
        }

        const priceDec = new Prisma.Decimal(item.price);
        const discountDec = new Prisma.Decimal(item.discount || 0);
        const quantityDec = new Prisma.Decimal(item.quantity);
        const total = priceDec.sub(discountDec).mul(quantityDec);

        return {
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          price: new Prisma.Decimal(item.price),
          discount: new Prisma.Decimal(item.discount || 0),
          total,

          _batch: item.batchNumber
            ? {
                batchNumber: item.batchNumber,
                expiryDate: item.expiryDate ?? null,
              }
            : null,
        };
      }),
    );

    // 6. Считаем общую сумму
    const totalAmount = purchaseItemsData.reduce(
      (sum, item) => sum.add(item.total),
      new Prisma.Decimal(0),
    );

    const isPaidNow =
      dto.status === PurchaseStatus.PAID ||
      dto.status === PurchaseStatus.PARTIAL;

    const paidAmount =
      dto.status === PurchaseStatus.PAID
        ? totalAmount
        : dto.status === PurchaseStatus.PARTIAL
          ? new Prisma.Decimal(dto.initialPayment ?? 0)
          : new Prisma.Decimal(0);

    if (isPaidNow && !dto.kassaId) {
      throw new BadRequestException(
        'To‘langan xarid uchun kassa ko‘rsatilishi shart',
      );
    }

    if (paidAmount.gt(totalAmount)) {
      throw new BadRequestException(
        `Boshlang‘ich to‘lov (${paidAmount.toString()}) xarid summasidan (${totalAmount.toString()}) oshib ketishi mumkin emas`,
      );
    }

    return client.$transaction(async (tx) => {
      // Создаём закупку
      const purchase = await tx.purchase.create({
        data: {
          organizationId,
          supplierId: dto.supplierId,
          responsibleId: user.userId,
          kassaId: isPaidNow ? dto.kassaId : null,
          invoiceNumber,
          purchaseDate: new Date(),
          totalAmount,
          paidAmount,
          currencyId: dto.currencyId,
          status: paidAmount.equals(0)
            ? PurchaseStatus.DRAFT
            : paidAmount.lt(totalAmount)
              ? PurchaseStatus.PARTIAL
              : PurchaseStatus.PAID,
          notes: dto.notes,
          items: {
            create: purchaseItemsData.map(({ _batch, ...item }) => item),
          },
        },
        include: {
          items: {
            include: {
              product_variant: { select: { title: true, sku: true } },
            },
          },
          currency: { select: { code: true, symbol: true } },
          supplier: {
            select: { firstName: true, lastName: true, phone: true },
          },
        },
      });

      if (isPaidNow) {
        const payment = await tx.payment.create({
          data: {
            organizationId,
            userId: user.userId,
            customerId: dto.supplierId,
            kassaId: dto.kassaId!,
            currencyId: dto.currencyId,
            amount: paidAmount,
            type: PaymentType.EXPENSE,
            purchaseId: purchase.id,
            description: `Xarid bo‘yicha to‘lov ${invoiceNumber}`,
          },
        });

        await this.kassasService.updateBalance(
          tx,
          dto.kassaId!,
          -Number(paidAmount),
        );

        await this.transactionsService.createFromPayment(tx, organizationId, {
          customerId: dto.supplierId,
          relatedType: RelatedType.PAYMENT,
          relatedId: payment.id,
          amount: Number(paidAmount),
          type: PaymentType.EXPENSE,
          currencyId: dto.currencyId,
          description: `Xarid bo‘yicha to‘lov ${invoiceNumber}`,
          createdById: user.orgUserId,
        });

        for (let i = 0; i < purchase.items.length; i++) {
          const item = purchase.items[i];
          const source = purchaseItemsData[i];

          if (source._batch) {
            await tx.productBatch.create({
              data: {
                productVariantId: item.productVariantId,
                batchNumber: source._batch.batchNumber,
                expiryDate: source._batch.expiryDate,
                quantity: item.quantity,
                purchaseItemId: item.id,
              },
            });
          }

          await this.stocksService.incrementStock(
            tx,
            organizationId,
            item.productVariantId,
            item.quantity,
          );
        }
      }

      await this.auditHelper.log(tx, organizationId, {
        userId: user.userId,
        action: 'CREATE',
        entity: 'Purchase',
        entityId: purchase.id,
        newValue: {
          invoiceNumber,
          supplierId: dto.supplierId,
          totalAmount: Number(totalAmount),
          status: purchase.status,
        },
        note: `Yangi xarid yaratildi ${invoiceNumber}`,
      });

      return {
        ...purchase,
        totalAmount: Number(purchase.totalAmount),
        paidAmount: Number(purchase.paidAmount),
      };
    });
  }

  async pay(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    purchaseId: string,
    dto: PayPurchaseDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    return client.$transaction(async (tx) => {
      const purchase = await tx.purchase.findFirst({
        where: { id: purchaseId, organizationId },
      });

      if (!purchase) {
        throw new NotFoundException('Закупка не найдена');
      }

      if (purchase.status === PurchaseStatus.CANCELLED) {
        throw new BadRequestException('Закупка отменена');
      }

      const remaining = purchase.totalAmount.sub(purchase.paidAmount);

      if (remaining.lte(0)) {
        throw new BadRequestException('Закупка уже полностью оплачена');
      }

      const payAmount = new Prisma.Decimal(dto.amount);

      if (payAmount.gt(remaining)) {
        throw new BadRequestException(
          `Сумма оплаты превышает остаток (${remaining.toNumber()})`,
        );
      }

      const kassa = await tx.kassa.findFirst({
        where: {
          id: dto.kassaId,
          organizationId,
          currencyId: purchase.currencyId,
        },
      });

      if (!kassa) {
        throw new BadRequestException(
          'Касса не найдена или валюта не совпадает',
        );
      }

      // 1. Payment
      const payment = await tx.payment.create({
        data: {
          organizationId,
          userId: user.userId,
          customerId: purchase.supplierId,
          kassaId: dto.kassaId,
          currencyId: purchase.currencyId,
          amount: payAmount,
          type: PaymentType.EXPENSE,
          purchaseId: purchase.id,
          description: dto.note ?? `Оплата закупки ${purchase.invoiceNumber}`,
        },
      });

      // 2. Обновляем кассу
      await this.kassasService.updateBalance(
        tx,
        dto.kassaId,
        -payAmount.toNumber(),
      );

      // 3. Транзакция
      await this.transactionsService.createFromPayment(tx, organizationId, {
        customerId: purchase.supplierId,
        relatedType: RelatedType.PAYMENT,
        relatedId: payment.id,
        amount: payAmount.toNumber(),
        type: PaymentType.EXPENSE,
        currencyId: purchase.currencyId,
        description: `Оплата закупки ${purchase.invoiceNumber}`,
        createdById: user.orgUserId,
      });

      // 4. Обновляем закупку
      const newPaidAmount = purchase.paidAmount.add(payAmount);

      const newStatus = newPaidAmount.equals(purchase.totalAmount)
        ? PurchaseStatus.PAID
        : PurchaseStatus.PARTIAL;

      const updatedPurchase = await tx.purchase.update({
        where: { id: purchase.id },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
          kassaId: dto.kassaId,
        },
      });

      // 5. Аудит
      await this.auditHelper.log(tx, organizationId, {
        userId: user.userId,
        action: 'PAY',
        entity: 'Purchase',
        entityId: purchase.id,
        newValue: {
          paidAmount: newPaidAmount.toNumber(),
          status: newStatus,
        },
        note: `Оплата закупки ${purchase.invoiceNumber}`,
      });

      return {
        ...updatedPurchase,
        paidAmount: newPaidAmount.toNumber(),
        totalAmount: purchase.totalAmount.toNumber(),
      };
    });
  }

  async updateStatus(
    tx: Prisma.TransactionClient,
    purchaseId: string,
    status: PurchaseStatus,
  ) {
    const purchase = await tx.purchase.findUnique({
      where: { id: purchaseId },
    });

    if (!purchase) {
      throw new NotFoundException();
    }

    if (
      status === PurchaseStatus.PAID &&
      purchase.paidAmount.lt(purchase.totalAmount)
    ) {
      throw new BadRequestException('Закупка не оплачена полностью');
    }
    if (status === PurchaseStatus.CANCELLED && purchase.paidAmount.gt(0)) {
      throw new BadRequestException('Нельзя отменить оплаченную закупку');
    }

    return tx.purchase.update({
      where: {
        id: purchaseId,
      },
      data: { status },
    });
  }

  async getAllAdmin(tenant: Tenant, orgId: string, query: GetPurchaseQueryDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const {
      search,
      status,
      supplierId,
      sortField = 'purchaseDate',
      order = 'desc',
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.PurchaseWhereInput = {
      organizationId: orgId,
    };

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        {
          supplier: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
            ],
          },
        },
      ];
    }

    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;

    const [data, total] = await Promise.all([
      client.purchase.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortField]: order },
        include: {
          items: {
            include: {
              product_variant: {
                select: { id: true, title: true, sku: true, barcode: true },
              },
            },
          },
          currency: { select: { code: true, symbol: true } },
          supplier: {
            select: { id: true, firstName: true, lastName: true, phone: true },
          },
          responsible: { select: { id: true, email: true } },
          kassa: { select: { id: true, name: true } },
        },
      }),
      client.purchase.count({ where }),
    ]);

    const transformed = data.map((purchase) => ({
      ...purchase,
      totalAmount: Number(purchase.totalAmount),
      paidAmount: Number(purchase.paidAmount),
    }));

    return {
      items: transformed,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getByIdAdmin(tenant: Tenant, orgId: string, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const purchase = await client.purchase.findFirst({
      where: {
        id,
        organizationId: orgId,
      },
      include: {
        items: {
          include: {
            product_variant: {
              select: { id: true, title: true, sku: true, barcode: true },
            },
            product_batches: true,
          },
        },
        currency: { select: { code: true, symbol: true } },
        supplier: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            user: { select: { id: true }, include: { phone_numbers: true } },
          },
        },
        responsible: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        kassa: { select: { id: true, name: true, type: true } },
        payments: true,
      },
    });

    if (!purchase) {
      throw new NotFoundException(
        'Закупка не найдена или принадлежит другой организации',
      );
    }

    return {
      ...purchase,
      totalAmount: Number(purchase.totalAmount),
      paidAmount: Number(purchase.paidAmount),
    };
  }

  async findOne(tenant: Tenant, user: JwtAuthenticatedUser, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    const purchase = await client.purchase.findFirst({
      where: { id, organizationId },
      include: {
        items: {
          include: {
            product_variant: {
              select: { id: true, title: true, sku: true, barcode: true },
            },
          },
        },
        currency: true,
        supplier: true,
        responsible: true,
        kassa: true,
        payments: true,
      },
    });

    if (!purchase) {
      throw new NotFoundException(
        'Закупка не найдена или принадлежит другой организации',
      );
    }

    return {
      ...purchase,
      totalAmount: Number(purchase.totalAmount),
      paidAmount: Number(purchase.paidAmount),
    };
  }

  async update(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    id: string,
    dto: UpdatePurchaseDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    const existing = await client.purchase.findFirst({
      where: { id, organizationId },
      include: { payments: true },
    });
    if (!existing)
      throw new NotFoundException(
        'Закупка не найдена или принадлежит другой организации',
      );

    // Запрещаем менять статус/поставщика если уже есть оплаты
    if (existing.paidAmount.greaterThan(0) && (dto.status || dto.supplierId)) {
      throw new BadRequestException(
        'Нельзя менять статус или поставщика при существующих платежах',
      );
    }

    return client.$transaction(async (tx) => {
      const updated = await tx.purchase.update({
        where: { id },
        data: dto,
        include: {
          currency: true,
          supplier: true,
        },
      });

      // Логируем изменение
      await this.auditHelper.log(tx, organizationId, {
        userId: user.userId,
        action: 'UPDATE',
        entity: 'Purchase',
        entityId: id,
        oldValue: {
          status: existing.status,
          supplierId: existing.supplierId,
        },
        newValue: {
          status: updated.status,
          supplierId: updated.supplierId,
        },
        note: `Обновлена закупка ${updated.invoiceNumber || id}`,
      });

      return updated;
    });
  }

  async remove(tenant: Tenant, user: JwtAuthenticatedUser, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    const purchase = await client.purchase.findFirst({
      where: { id, organizationId },
      include: { payments: true, items: true },
    });

    if (!purchase)
      throw new NotFoundException(
        'Закупка не найдена или принадлежит другой организации',
      );
    if (purchase.payments.length > 0) {
      throw new ConflictException(
        'Невозможно удалить закупку — есть связанные платежи',
      );
    }

    return client.$transaction(async (tx) => {
      // Возвращаем товары на склад
      for (const item of purchase.items) {
        await this.stocksService.decrementStock(
          tx,
          organizationId,
          item.productVariantId,
          item.quantity,
        );
      }

      // Логируем удаление
      await this.auditHelper.log(tx, organizationId, {
        userId: user.userId,
        action: 'DELETE',
        entity: 'Purchase',
        entityId: id,
        oldValue: {
          invoiceNumber: purchase.invoiceNumber,
          totalAmount: Number(purchase.totalAmount),
        },
        note: `Удалена закупка ${purchase.invoiceNumber || id}`,
      });

      await tx.purchase.delete({ where: { id } });
    });
  }

  async confirmPurchase(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    purchaseId: string,
    kassaId?: string,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    return client.$transaction(async (tx) => {
      const purchase = await tx.purchase.findFirst({
        where: { id: purchaseId, organizationId },
        include: { payments: true },
      });

      if (!purchase)
        throw new NotFoundException(
          'Закупка не найдена или принадлежит другой организации',
        );
      if (purchase.status === PurchaseStatus.PAID) {
        throw new BadRequestException('Закупка уже подтверждена');
      }

      let paidAmount = purchase.paidAmount;

      // Если указана касса — списываем с неё оставшуюся сумму
      if (kassaId) {
        const kassa = await tx.kassa.findFirst({
          where: { id: kassaId, organizationId },
        });
        if (!kassa)
          throw new NotFoundException(
            'Касса не найдена или принадлежит другой организации',
          );

        const remaining = purchase.totalAmount.sub(paidAmount);
        if (kassa.balance.lessThan(remaining)) {
          throw new BadRequestException(
            `Недостаточно средств на кассе ${kassa.name} для полной оплаты`,
          );
        }

        await this.kassasService.updateBalance(tx, kassaId, -Number(remaining));

        // Создаём платёж
        const payment = await tx.payment.create({
          data: {
            organizationId,
            userId: user.orgUserId,
            kassaId,
            amount: remaining,
            currencyId: purchase.currencyId,
            type: PaymentType.EXPENSE,
            description: `Полная оплата закупки ${purchase.invoiceNumber || purchase.id}`,
            purchaseId,
          },
        });

        paidAmount = purchase.totalAmount;

        // Логируем платёж
        await this.auditHelper.log(tx, organizationId, {
          userId: user.userId,
          action: 'PAYMENT',
          entity: 'Payment',
          entityId: payment.id,
          newValue: {
            amount: Number(remaining),
            type: PaymentType.EXPENSE,
            kassaId,
          },
          note: `Полная оплата закупки ${purchase.invoiceNumber || purchase.id}`,
        });
      }

      await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          status: PurchaseStatus.PAID,
          paidAmount,
          kassaId: kassaId || purchase.kassaId,
        },
      });

      // Логируем подтверждение
      await this.auditHelper.log(tx, organizationId, {
        userId: user.userId,
        action: 'CONFIRM',
        entity: 'Purchase',
        entityId: purchaseId,
        oldValue: { status: purchase.status },
        newValue: {
          status: PurchaseStatus.PAID,
          paidAmount: Number(paidAmount),
        },
        note: `Закупка ${purchase.invoiceNumber || purchase.id} подтверждена как оплаченная`,
      });

      return { message: 'Закупка успешно подтверждена' };
    });
  }
}
