import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { CreateKassaDto, UpdateKassaDto } from './dto/create-kassa.dto';
import { Prisma } from '.prisma/client-tenant';

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
  async updateBalance(client: any, kassaId: string, delta: number) {
    return client.kassa.update({
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

    const where: Prisma.PaymentWhereInput = {
      kassaId,
      organizationId: tenant.id,
    };

    if (type) where.type = type;
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const [payments, total] = await Promise.all([
      client.payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          currency: { select: { code: true, symbol: true } },
          customer: {
            select: { firstName: true, lastName: true, phone: true },
          },
          sale: {
            select: { id: true, invoiceNumber: true, totalAmount: true },
          },
          purchase: {
            select: { id: true, invoiceNumber: true, totalAmount: true },
          },
          // TODO
          // Если нужно — можно добавить связь с KassaTransfer
          // from_transfers: true,
          // to_transfers: true,
        },
      }),
      client.payment.count({ where }),
    ]);

    // Преобразуем Decimal → number
    const transformed = payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
      // Если есть sale/purchase — тоже преобразуем суммы
      sale: p.sale
        ? { ...p.sale, totalAmount: Number(p.sale.totalAmount) }
        : null,
      purchase: p.purchase
        ? { ...p.purchase, totalAmount: Number(p.purchase.totalAmount) }
        : null,
    }));

    return {
      data: transformed,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
