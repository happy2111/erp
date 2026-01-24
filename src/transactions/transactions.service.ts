import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { PaymentType, Prisma, RelatedType } from '.prisma/client-tenant';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionFilterDto } from './dto/transaction-filter.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}

  async create(
    tenant: Tenant,
    organizationId: string,
    dto: CreateTransactionDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // Проверяем клиента
    const customer = await client.organizationCustomer.findFirst({
      where: {
        id: dto.customerId,
        organizationId,
      },
    });
    if (!customer)
      throw new NotFoundException('Клиент не найден в этой организации');

    // Проверяем валюту
    const currency = await client.currency.findUnique({
      where: { id: dto.currencyId },
    });
    if (!currency) throw new NotFoundException('Валюта не найдена');

    // Получаем последний баланс клиента
    const lastTransaction = await client.transaction.findFirst({
      where: {
        customerId: dto.customerId,
        currencyId: dto.currencyId,
      },
      orderBy: { date: 'desc' },
    });

    const previousBalance = lastTransaction
      ? lastTransaction.balanceAfter
      : new Prisma.Decimal(0);

    const debit = dto.debit
      ? new Prisma.Decimal(dto.debit)
      : new Prisma.Decimal(0);
    const credit = dto.credit
      ? new Prisma.Decimal(dto.credit)
      : new Prisma.Decimal(0);

    const balanceAfter = previousBalance.add(debit).sub(credit);

    return client.transaction.create({
      data: {
        organizationId,
        customerId: dto.customerId,
        relatedType: dto.relatedType,
        relatedId: dto.relatedId,
        date: new Date(),
        debit,
        credit,
        balanceAfter,
        currencyId: dto.currencyId,
        description: dto.description,
      },
      include: {
        currency: { select: { code: true, symbol: true } },
        customer: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async findAll(
    tenant: Tenant,
    organizationId: string,
    filter: TransactionFilterDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const {
      page = 1,
      limit = 20,
      customerId,
      relatedType,
      fromDate,
      toDate,
    } = filter;

    const where: Prisma.TransactionWhereInput = {
      organizationId,
    };

    if (customerId) where.customerId = customerId;
    if (relatedType) where.relatedType = relatedType;
    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date.gte = new Date(fromDate);
      if (toDate) where.date.lte = new Date(toDate);
    }

    const [data, total] = await Promise.all([
      client.transaction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          currency: { select: { code: true, symbol: true } },
          customer: {
            select: { firstName: true, lastName: true, phone: true },
          },
        },
      }),
      client.transaction.count({ where }),
    ]);

    const transformed = data.map((t) => ({
      ...t,
      debit: Number(t.debit),
      credit: Number(t.credit),
      balanceAfter: Number(t.balanceAfter),
    }));

    return { data: transformed, total, page, limit };
  }

  /**
   * Универсальный метод для создания транзакции из платежа/рассрочки/возврата и т.д.
   * Используется другими сервисами (Payments, Installments и т.д.)
   */
  async createFromPayment(
    tx: Prisma.TransactionClient,
    organizationId: string,
    dto: {
      customerId: string;
      relatedType: RelatedType;
      relatedId: string;
      amount: number;
      type: PaymentType | 'REFUND' | 'ADJUSTMENT'; // добавляем REFUND и ADJUSTMENT
      currencyId: string;
      description: string;
      createdById?: string;
    },
  ) {
    // 1. Проверяем клиента
    const customer = await tx.organizationCustomer.findFirst({
      where: {
        id: dto.customerId,
        organizationId,
      },
    });
    if (!customer) {
      throw new NotFoundException('Клиент не найден в этой организации');
    }

    // 2. Получаем последний баланс
    const lastTransaction = await tx.transaction.findFirst({
      where: {
        customerId: dto.customerId,
        currencyId: dto.currencyId,
      },
      orderBy: { date: 'desc' },
    });

    const previousBalance = lastTransaction
      ? lastTransaction.balanceAfter
      : new Prisma.Decimal(0);

    // 3. Определяем debit/credit в зависимости от типа
    let debit = new Prisma.Decimal(0);
    let credit = new Prisma.Decimal(0);

    switch (dto.type) {
      case PaymentType.INCOME:
      case 'REFUND': // возврат — тоже увеличивает баланс клиента
        debit = new Prisma.Decimal(dto.amount);
        break;
      case PaymentType.EXPENSE:
        credit = new Prisma.Decimal(dto.amount);
        break;
      case 'ADJUSTMENT':
        // для ручной корректировки можно передавать положительное/отрицательное amount
        if (dto.amount > 0) debit = new Prisma.Decimal(dto.amount);
        else credit = new Prisma.Decimal(Math.abs(dto.amount));
        break;
      default:
        throw new BadRequestException('Неподдерживаемый тип операции');
    }

    const balanceAfter = previousBalance.add(debit).sub(credit);

    // 4. Создаём транзакцию
    return tx.transaction.create({
      data: {
        organizationId,
        customerId: dto.customerId,
        relatedType: dto.relatedType,
        relatedId: dto.relatedId,
        date: new Date(),
        debit,
        credit,
        balanceAfter,
        currencyId: dto.currencyId,
        description: dto.description,
        createdById: dto.createdById,
      },
      include: {
        currency: { select: { code: true, symbol: true } },
      },
    });
  }

  // Метод для получения баланса (уже есть, но оставим)
  async getCustomerBalance(
    tenant: Tenant,
    organizationId: string,
    customerId: string,
    currencyId: string,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const last = await client.transaction.findFirst({
      where: { organizationId, customerId, currencyId },
      orderBy: { date: 'desc' },
      select: { balanceAfter: true },
    });

    return Number(last?.balanceAfter || 0);
  }
}
