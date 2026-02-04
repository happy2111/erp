import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { CreateKassaDto, UpdateKassaDto } from './dto/create-kassa.dto';
import { Prisma, PaymentType } from '.prisma/client-tenant';
import { AuditHelper } from '../audit-logs/audit.helper';
import { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';
import { KassaTransferWithRelations } from '../kassa-transfers/types/kassa-transfer.type';
import { GetKassaQueryDto } from './dto/get-kassa-query.dto';

@Injectable()
export class KassasService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly auditHelper: AuditHelper,
  ) {}

  async create(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    dto: CreateKassaDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    // 1. Проверка валюты
    const currency = await client.currency.findUnique({
      where: { id: dto.currencyId },
    });
    if (!currency) {
      throw new BadRequestException('Указанная валюта не найдена');
    }

    return client.$transaction(async (tx) => {
      // 2. Создаём кассу
      const kassa = await tx.kassa.create({
        data: {
          ...dto,
          organizationId,
          balance: new Prisma.Decimal(0),
        },
        include: {
          currency: {
            select: { code: true, name: true, symbol: true },
          },
        },
      });

      // 3. Логируем создание кассы
      await this.auditHelper.log(tx, organizationId, {
        userId: user.userId,
        action: 'CREATE',
        entity: 'Kassa',
        entityId: kassa.id,
        newValue: {
          name: kassa.name,
          type: kassa.type,
          currency: kassa.currency.code,
        },
        note: `Создана новая касса "${kassa.name}"`,
      });

      return {
        ...kassa,
        balance: Number(kassa.balance),
      };
    });
  }

  async getAllAdmin(tenant: Tenant, orgId: string, query: GetKassaQueryDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const {
      search,
      sortField = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.KassaWhereInput = {
      organizationId: orgId,
    };

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      client.kassa.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortField]: order },
        include: {
          currency: {
            select: {
              id: true,
              code: true,
              name: true,
              symbol: true,
            },
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
      items: transformed,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(tenant: Tenant, user: JwtAuthenticatedUser, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    const kassa = await client.kassa.findFirst({
      where: { id, organizationId },
      include: {
        currency: {
          select: { id: true, code: true, name: true, symbol: true },
        },
      },
    });

    if (!kassa) {
      throw new NotFoundException(
        'Касса не найдена или принадлежит другой организации',
      );
    }

    return {
      ...kassa,
      balance: Number(kassa.balance),
    };
  }

  async update(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    id: string,
    dto: UpdateKassaDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    const existing = await client.kassa.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(
        'Касса не найдена или принадлежит другой организации',
      );
    }

    return client.$transaction(async (tx) => {
      const updated = await tx.kassa.update({
        where: { id },
        data: dto,
        include: {
          currency: { select: { code: true, name: true } },
        },
      });

      // Логируем изменение
      await this.auditHelper.log(tx, organizationId, {
        userId: user.userId,
        action: 'UPDATE',
        entity: 'Kassa',
        entityId: id,
        oldValue: {
          name: existing.name,
          type: existing.type,
          balance: Number(existing.balance),
        },
        newValue: {
          name: updated.name,
          type: updated.type,
          balance: Number(updated.balance),
        },
        note: `Обновлена касса "${updated.name}"`,
      });

      return {
        ...updated,
        balance: Number(updated.balance),
      };
    });
  }

  async remove(tenant: Tenant, user: JwtAuthenticatedUser, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    const kassa = await client.kassa.findFirst({
      where: { id, organizationId },
    });

    if (!kassa) {
      throw new NotFoundException(
        'Касса не найдена или принадлежит другой организации',
      );
    }

    return client.$transaction(async (tx) => {
      // Логируем удаление
      await this.auditHelper.log(tx, organizationId, {
        userId: user.userId,
        action: 'DELETE',
        entity: 'Kassa',
        entityId: id,
        oldValue: {
          name: kassa.name,
          type: kassa.type,
          balance: Number(kassa.balance),
        },
        note: `Удалена касса "${kassa.name}"`,
      });

      try {
        return await tx.kassa.delete({ where: { id } });
      } catch (e) {
        console.error(e);
        throw new ConflictException(
          'Невозможно удалить кассу — есть связанные операции (платежи, переводы и т.д.)',
        );
      }
    });
  }

  // Вспомогательный метод для других модулей (обновление баланса)
  async updateBalance(
    tx: Prisma.TransactionClient,
    kassaId: string,
    delta: number,
  ) {
    const updated = await tx.kassa.update({
      where: { id: kassaId },
      data: { balance: { increment: new Prisma.Decimal(delta) } },
      select: { id: true, name: true, balance: true },
    });

    return {
      ...updated,
      balance: Number(updated.balance),
    };
  }

  // История операций по кассе (платежи + переводы)
  async getKassaHistory(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
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
    const organizationId = user.orgId;
    const { page = 1, limit = 20, type, fromDate, toDate } = filter;

    // Проверяем существование кассы
    const kassa = await client.kassa.findFirst({
      where: { id: kassaId, organizationId },
    });
    if (!kassa) {
      throw new NotFoundException(
        'Касса не найдена или принадлежит другой организации',
      );
    }

    // 1. Платежи по кассе
    const paymentWhere: Prisma.PaymentWhereInput = {
      kassaId,
      organizationId,
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

    // 2. Переводы, где касса — источник ИЛИ получатель
    const transferWhere: Prisma.KassaTransferWhereInput = {
      organizationId,
      OR: [{ fromKassaId: kassaId }, { toKassaId: kassaId }],
    };

    if (fromDate || toDate) {
      transferWhere.createdAt = {};
      if (fromDate) transferWhere.createdAt.gte = new Date(fromDate);
      if (toDate) transferWhere.createdAt.lte = new Date(toDate);
    }

    let transfers: KassaTransferWithRelations[] = [];
    if (!type || type === 'TRANSFER') {
      transfers = await client.kassaTransfer.findMany({
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
    }

    // 3. Объединяем платежи и переводы
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

    // 4. Сортировка и пагинация
    allOperations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

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
}
