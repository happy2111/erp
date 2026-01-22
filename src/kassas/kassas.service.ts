import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { CreateKassaDto, UpdateKassaDto } from './dto/create-kassa.dto';
import { PaymentType, Prisma } from '.prisma/client-tenant';

@Injectable()
export class KassasService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}

  async create(tenant: Tenant, dto: CreateKassaDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // Проверка существования валюты
    const currency = await client.currency.findUnique({
      where: { id: dto.currencyId },
    });

    if (!currency) {
      throw new BadRequestException('Указанная валюта не найдена');
    }

    return client.kassa.create({
      data: {
        ...dto,
        organizationId: tenant.id, // важно!
        balance: new Prisma.Decimal(0),
      },
      include: {
        currency: {
          select: { code: true, name: true, symbol: true },
        },
      },
    });
  }

  async findAll(
    tenant: Tenant,
    filter?: { page?: number; limit?: number; search?: string },
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const { page = 1, limit = 20, search } = filter || {};

    const where: Prisma.KassaWhereInput = {
      organizationId: tenant.id,
    };

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      client.kassa.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          currency: {
            select: { id: true, code: true, name: true, symbol: true },
          },
        },
      }),
      client.kassa.count({ where }),
    ]);

    // Преобразуем Decimal → number
    const transformed = data.map((k) => ({
      ...k,
      balance: Number(k.balance),
    }));

    return {
      data: transformed,
      total,
      page,
      limit,
    };
  }

  async findOne(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const kassa = await client.kassa.findFirst({
      where: { id, organizationId: tenant.id },
      include: {
        currency: {
          select: { id: true, code: true, name: true, symbol: true },
        },
      },
    });

    if (!kassa) throw new NotFoundException('Касса не найдена');

    return {
      ...kassa,
      balance: Number(kassa.balance),
    };
  }

  async update(tenant: Tenant, id: string, dto: UpdateKassaDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const existing = await client.kassa.findFirst({
      where: { id, organizationId: tenant.id },
    });

    if (!existing) throw new NotFoundException('Касса не найдена');

    return client.kassa.update({
      where: { id },
      data: dto,
      include: { currency: { select: { code: true, name: true } } },
    });
  }

  async remove(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const kassa = await client.kassa.findFirst({
      where: { id, organizationId: tenant.id },
    });

    if (!kassa) throw new NotFoundException('Касса не найдена');

    try {
      return await client.kassa.delete({ where: { id } });
    } catch (e) {
      throw new ConflictException(
        'Невозможно удалить кассу — есть связанные операции',
      );
    }
  }

  // Вспомогательный метод для других модулей (например, для переводов)
  async updateBalance(
    client: any,
    kassaId: string,
    delta: number,
  ) {
    return await client.kassa.update({
      where: { id: kassaId },
      data: { balance: { increment: new Prisma.Decimal(delta) } },
    });
  }

  async getKassaHistory(
    tenant: Tenant,
    kassaId: string,
    filter: {
      page?: number;
      limit?: number;
      type?: 'INCOME' | 'EXPENSE' | 'TRANSFER';
      fromDate?: string;
      toDate?: string;
    } = {},
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const { page = 1, limit = 20, type, fromDate, toDate } = filter;

    // Проверяем существование кассы
    const kassa = await client.kassa.findFirst({
      where: { id: kassaId, organizationId: tenant.id },
    });
    if (!kassa) throw new NotFoundException('Касса не найдена');

    // 1. Получаем платежи, связанные с этой кассой
    const paymentWhere: Prisma.PaymentWhereInput = {
      kassaId,
      organizationId: tenant.id,
    };

    if (type && type !== 'TRANSFER') paymentWhere.type = type;
    if (fromDate || toDate) {
      paymentWhere.createdAt = {};
      if (fromDate) paymentWhere.createdAt.gte = new Date(fromDate);
      if (toDate) paymentWhere.createdAt.lte = new Date(toDate);
    }

    const payments = await client.payment.findMany({
      where: paymentWhere,
      include: {
        currency: { select: { code: true, symbol: true } },
        customer: { select: { firstName: true, lastName: true, phone: true } },
        sale: { select: { id: true, invoiceNumber: true, totalAmount: true } },
        purchase: {
          select: { id: true, invoiceNumber: true, totalAmount: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Получаем переводы, где касса — источник ИЛИ получатель
    const transferWhere: Prisma.KassaTransferWhereInput = {
      organizationId: tenant.id,
      OR: [{ fromKassaId: kassaId }, { toKassaId: kassaId }],
    };

    if (fromDate || toDate) {
      transferWhere.createdAt = {};
      if (fromDate) transferWhere.createdAt.gte = new Date(fromDate);
      if (toDate) transferWhere.createdAt.lte = new Date(toDate);
    }

    // Если фильтр по типу — включаем только TRANSFER
    if (type && type !== 'TRANSFER') {
      // Если фильтр только INCOME/EXPENSE — переводы не включаем
    } else {
      const transfers = await client.kassaTransfer.findMany({
        where: transferWhere,
        include: {
          from_kassa: {
            select: {
              id: true,
              name: true,
              currency: { select: { code: true } },
            },
          },
          to_kassa: {
            select: {
              id: true,
              name: true,
              currency: { select: { code: true } },
            },
          },
          from_currency: { select: { code: true } },
          to_currency: { select: { code: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      // 3. Объединяем платежи и переводы в один список
      const allOperations = [
        ...payments.map((p) => ({
          type: 'PAYMENT',
          subType: p.type,
          id: p.id,
          amount: Number(p.amount),
          currency: p.currency,
          description:
            p.description ||
            `${p.type === PaymentType.INCOME ? 'Поступление' : 'Расход'} на кассу`,
          direction: p.type === PaymentType.INCOME ? 'IN' : 'OUT',
          related: p.sale || p.purchase || null,
          customer: p.customer,
          createdAt: p.createdAt,
          kassa: { id: p.kassaId, name: kassa.name },
        })),

        ...transfers.map((t) => {
          const isOutgoing = t.fromKassaId === kassaId;
          return {
            type: 'TRANSFER',
            id: t.id,
            amount: Number(isOutgoing ? t.amount : t.convertedAmount),
            currency: isOutgoing ? t.from_currency : t.to_currency,
            description:
              t.description ||
              (isOutgoing
                ? 'Перевод в другую кассу'
                : 'Поступление из другой кассы'),
            direction: isOutgoing ? 'OUT' : 'IN',
            fromKassa: t.from_kassa,
            toKassa: t.to_kassa,
            rate: Number(t.rate),
            originalAmount: Number(t.amount),
            convertedAmount: Number(t.convertedAmount),
            createdAt: t.createdAt,
          };
        }),
      ];

      // 4. Сортируем по дате (новые сверху)
      allOperations.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );

      // 5. Пагинация
      const total = allOperations.length;
      const paginated = allOperations.slice((page - 1) * limit, page * limit);

      return {
        data: paginated,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    // Если фильтр только по INCOME/EXPENSE — возвращаем только платежи
    const transformedPayments = payments.map((p) => ({
      type: 'PAYMENT',
      subType: p.type,
      id: p.id,
      amount: Number(p.amount),
      currency: p.currency,
      description: p.description,
      direction: p.type === PaymentType.INCOME ? 'IN' : 'OUT',
      related: p.sale || p.purchase || null,
      customer: p.customer,
      createdAt: p.createdAt,
      kassa: { id: p.kassaId, name: kassa.name },
    }));

    return {
      data: transformedPayments,
      total: payments.length,
      page,
      limit,
      totalPages: Math.ceil(payments.length / limit),
    };
  }
}
