import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { PaymentType, Prisma, PurchaseStatus } from '.prisma/client-tenant';
import { StocksService } from '../stocks/stocks.service';
import { KassasService } from '../kassas/kassas.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { CodeGeneratorService } from '../code-generater/code-generater.service';
import { PurchaseFilterDto } from './dto/purchase-filter.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly codeGenerator: CodeGeneratorService,
    private readonly stocksService: StocksService,
    private readonly kassasService: KassasService,
  ) {}

  async create(tenant: Tenant, dto: CreatePurchaseDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // 1. Проверяем валюту
    const currency = await client.currency.findUnique({
      where: { id: dto.currencyId },
    });
    if (!currency) throw new BadRequestException('Валюта не найдена');

    // 2. Проверяем поставщика
    const supplier = await client.organizationCustomer.findFirst({
      where: {
        id: dto.supplierId,
        organizationId: tenant.id,
        type: 'SUPPLIER',
      },
    });
    if (!supplier) throw new NotFoundException('Поставщик не найден');

    // 3. Генерируем номер накладной
    const invoiceNumber = await this.codeGenerator.generateNextCode(tenant, {
      prefix: 'PUR',
      modelName: 'purchase',
      sequenceLength: 6,
    });

    // 4. Собираем позиции + проверяем товары
    const purchaseItemsData = await Promise.all(
      dto.items.map(async (item) => {
        const variant = await client.productVariant.findUnique({
          where: { id: item.productVariantId },
          include: { currency: true },
        });

        if (!variant)
          throw new NotFoundException(
            `Вариант товара ${item.productVariantId} не найден`,
          );

        if (variant.currencyId && variant.currencyId !== dto.currencyId) {
          throw new BadRequestException(
            `Валюта варианта (${variant.currency?.code}) не совпадает с валютой закупки (${currency.code})`,
          );
        }

        const total = new Prisma.Decimal(item.quantity)
          .mul(item.price)
          .sub(new Prisma.Decimal(item.discount || 0).mul(item.quantity));

        return {
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          price: new Prisma.Decimal(item.price),
          discount: new Prisma.Decimal(item.discount || 0),
          total,
        };
      }),
    );

    // 5. Считаем общую сумму
    const totalAmount = purchaseItemsData.reduce(
      (sum, item) => sum.add(item.total),
      new Prisma.Decimal(0),
    );

    // 6. Создаём закупку + позиции + приход на склад в транзакции
    return client.$transaction(async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          organizationId: tenant.id,
          supplierId: dto.supplierId,
          responsibleId: dto.responsibleId,
          kassaId: dto.kassaId,
          invoiceNumber,
          purchaseDate: new Date(),
          totalAmount,
          paidAmount: new Prisma.Decimal(0),
          currencyId: dto.currencyId,
          status: dto.status || PurchaseStatus.DRAFT,
          notes: dto.notes,
          items: {
            create: purchaseItemsData,
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

      // Приход на склад (увеличиваем остатки)
      for (const item of purchaseItemsData) {
        await this.stocksService.incrementStock(
          tx,
          tenant.id,
          item.productVariantId,
          item.quantity,
        );
      }

      return {
        ...purchase,
        totalAmount: Number(purchase.totalAmount),
        paidAmount: Number(purchase.paidAmount),
      };
    });
  }

  async findAll(tenant: Tenant, filter: PurchaseFilterDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const { page = 1, limit = 20, search, status, supplierId } = filter;

    const where: Prisma.PurchaseWhereInput = { organizationId: tenant.id };

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;
    if (supplierId) where.supplierId = supplierId;

    const [data, total] = await Promise.all([
      client.purchase.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              product_variant: { select: { title: true, sku: true } },
            },
          },
          currency: { select: { code: true, symbol: true } },
          supplier: { select: { firstName: true, lastName: true } },
          kassa: { select: { name: true } },
        },
      }),
      client.purchase.count({ where }),
    ]);

    const transformed = data.map((p) => ({
      ...p,
      totalAmount: Number(p.totalAmount),
      paidAmount: Number(p.paidAmount),
    }));

    return { data: transformed, total, page, limit };
  }

  async findOne(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const purchase = await client.purchase.findFirst({
      where: { id, organizationId: tenant.id },
      include: {
        items: {
          include: {
            product_variant: {
              select: { title: true, sku: true, barcode: true },
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

    if (!purchase) throw new NotFoundException('Закупка не найдена');

    return {
      ...purchase,
      totalAmount: Number(purchase.totalAmount),
      paidAmount: Number(purchase.paidAmount),
    };
  }

  async update(tenant: Tenant, id: string, dto: UpdatePurchaseDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const existing = await client.purchase.findFirst({
      where: { id, organizationId: tenant.id },
    });
    if (!existing) throw new NotFoundException('Закупка не найдена');

    // Запрещаем менять статус/поставщика если уже есть оплаты
    if (existing.paidAmount.greaterThan(0) && (dto.status || dto.supplierId)) {
      throw new BadRequestException(
        'Нельзя менять статус или поставщика при существующих платежах',
      );
    }

    return client.purchase.update({
      where: { id },
      data: dto,
      include: {
        currency: true,
        supplier: true,
      },
    });
  }

  async remove(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const purchase = await client.purchase.findFirst({
      where: { id, organizationId: tenant.id },
      include: { payments: true, items: true },
    });

    if (!purchase) throw new NotFoundException('Закупка не найдена');
    if (purchase.payments.length > 0) {
      throw new ConflictException(
        'Невозможно удалить закупку — есть связанные платежи',
      );
    }

    return client.$transaction(async (tx) => {
      // Возвращаем товары на склад (уменьшаем остатки)
      for (const item of purchase.items) {
        await this.stocksService.decrementStock(
          tx,
          tenant.id,
          item.productVariantId,
          item.quantity,
        );
      }

      await tx.purchase.delete({ where: { id } });
    });
  }

  // Подтверждение закупки (перевод в PAID + списание с кассы, если указана)
  async confirmPurchase(tenant: Tenant, purchaseId: string, kassaId?: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    return client.$transaction(async (tx) => {
      const purchase = await tx.purchase.findFirst({
        where: { id: purchaseId, organizationId: tenant.id },
        include: { payments: true },
      });

      if (!purchase) throw new NotFoundException('Закупка не найдена');
      if (purchase.status === PurchaseStatus.PAID) {
        throw new BadRequestException('Закупка уже подтверждена');
      }

      let paidAmount = purchase.paidAmount;

      // Если указана касса — списываем с неё всю сумму
      if (kassaId) {
        const kassa = await tx.kassa.findFirst({
          where: { id: kassaId, organizationId: tenant.id },
        });
        if (!kassa) throw new NotFoundException('Касса не найдена');

        if (kassa.balance.lessThan(purchase.totalAmount.sub(paidAmount))) {
          throw new BadRequestException(
            'Недостаточно средств на кассе для полной оплаты',
          );
        }

        await this.kassasService.updateBalance(
          tx,
          kassaId,
          -Number(purchase.totalAmount.sub(paidAmount)),
        );

        // Создаём платёж
        await tx.payment.create({
          data: {
            organizationId: tenant.id,
            kassaId,
            amount: purchase.totalAmount.sub(paidAmount),
            currencyId: purchase.currencyId,
            type: PaymentType.EXPENSE,
            description: `Оплата закупки ${purchase.invoiceNumber || purchase.id}`,
            purchaseId,
          },
        });

        paidAmount = purchase.totalAmount;
      }

      await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          status: PurchaseStatus.PAID,
          paidAmount,
          kassaId: kassaId || purchase.kassaId,
        },
      });

      return { message: 'Закупка успешно подтверждена' };
    });
  }
}
