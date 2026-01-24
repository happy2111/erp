import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { Prisma, PaymentType, RelatedType } from '.prisma/client-tenant';
import { KassasService } from '../kassas/kassas.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentFilterDto } from './dto/payment-filter.dto';
import { TransactionsService } from '../transactions/transactions.service';
import { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly kassasService: KassasService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async create(
    tenant: Tenant,
    dto: CreatePaymentDto,
    user: JwtAuthenticatedUser | null,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // 1. Проверяем кассу
    const kassa = await client.kassa.findFirst({
      where: { id: dto.kassaId, organizationId: tenant.id },
    });
    if (!kassa) throw new NotFoundException('Касса не найдена');

    // 2. Проверяем валюту
    const currency = await client.currency.findUnique({
      where: { id: dto.currencyId },
    });
    if (!currency) throw new NotFoundException('Валюта не найдена');

    // 3. Валидация в зависимости от типа
    if (dto.type === PaymentType.TRANSFER) {
      if (!dto.toKassaId)
        throw new BadRequestException('Для перевода нужна касса-получатель');
      if (dto.toKassaId === dto.kassaId)
        throw new BadRequestException('Нельзя переводить на ту же кассу');

      const toKassa = await client.kassa.findFirst({
        where: { id: dto.toKassaId, organizationId: tenant.id },
      });
      if (!toKassa) throw new NotFoundException('Касса-получатель не найдена');
    }

    // 4. Для INCOME/EXPENSE проверяем связь с sale/purchase
    if (dto.type === PaymentType.INCOME && dto.saleId) {
      const sale = await client.sale.findFirst({
        where: { id: dto.saleId, organizationId: tenant.id },
      });
      if (!sale) throw new NotFoundException('Продажа не найдена');
    }

    if (dto.type === PaymentType.EXPENSE && dto.purchaseId) {
      const purchase = await client.purchase.findFirst({
        where: { id: dto.purchaseId, organizationId: tenant.id },
      });
      if (!purchase) throw new NotFoundException('Закупка не найдена');
    }

    // 5. Проверяем баланс кассы при расходе/переводе
    const amountDecimal = new Prisma.Decimal(dto.amount);
    if (dto.type === PaymentType.EXPENSE || dto.type === PaymentType.TRANSFER) {
      if (kassa.balance.lessThan(amountDecimal)) {
        throw new BadRequestException(
          `Недостаточно средств на кассе ${kassa.name}. Баланс: ${kassa.balance.toString()}, требуется: ${dto.amount}`,
        );
      }
    }

    return client.$transaction(async (tx) => {
      // Создаём платёж
      const payment = await tx.payment.create({
        data: {
          organizationId: tenant.id,
          userId: null, // можно передать из @CurrentUser()
          customerId: dto.customerId,
          kassaId: dto.kassaId,
          amount: amountDecimal,
          currencyId: dto.currencyId,
          type: dto.type,
          description: dto.description,
          saleId: dto.saleId,
          purchaseId: dto.purchaseId,
        },
        include: {
          kassa: {
            select: { name: true, currency: { select: { code: true } } },
          },
          currency: true,
          customer: { select: { firstName: true, lastName: true } },
        },
      });

      // Обновляем баланс кассы
      if (dto.type === PaymentType.INCOME) {
        await this.kassasService.updateBalance(
          tx,
          dto.kassaId,
          Number(amountDecimal),
        );
      } else if (
        dto.type === PaymentType.EXPENSE ||
        dto.type === PaymentType.TRANSFER
      ) {
        await this.kassasService.updateBalance(
          tx,
          dto.kassaId,
          -Number(amountDecimal),
        );
      }

      // Если перевод — зачисляем на вторую кассу
      if (dto.type === PaymentType.TRANSFER && dto.toKassaId) {
        await this.kassasService.updateBalance(
          tx,
          dto.toKassaId,
          Number(amountDecimal),
        );
      }

      // Обновляем paidAmount в Sale / Purchase
      if (dto.saleId) {
        await tx.sale.update({
          where: { id: dto.saleId },
          data: { paidAmount: { increment: amountDecimal } },
        });
      }

      if (dto.purchaseId) {
        await tx.purchase.update({
          where: { id: dto.purchaseId },
          data: { paidAmount: { increment: amountDecimal } },
        });
      }

      // Создаём запись в Transaction
      // let balanceAfter: Prisma.Decimal;
      // if (dto.customerId) {
      //   const lastTransaction = await tx.transaction.findFirst({
      //     where: { customerId: dto.customerId, currencyId: dto.currencyId },
      //     orderBy: { date: 'desc' },
      //   });
      //
      //   const previousBalance = lastTransaction
      //     ? lastTransaction.balanceAfter
      //     : new Prisma.Decimal(0);
      //
      //   balanceAfter =
      //     dto.type === PaymentType.INCOME
      //       ? previousBalance.add(amountDecimal)
      //       : previousBalance.sub(amountDecimal);
      //
      //   await tx.transaction.create({
      //     data: {
      //       organizationId: tenant.id,
      //       customerId: dto.customerId,
      //       relatedType: RelatedType.PAYMENT,
      //       relatedId: payment.id,
      //       date: new Date(),
      //       debit:
      //         dto.type === PaymentType.INCOME
      //           ? amountDecimal
      //           : new Prisma.Decimal(0),
      //       credit:
      //         dto.type === PaymentType.EXPENSE
      //           ? amountDecimal
      //           : new Prisma.Decimal(0),
      //       balanceAfter,
      //       currencyId: dto.currencyId,
      //       description: dto.description || `Платёж #${payment.id}`,
      //     },
      //   });
      // }

      if (dto.customerId) {
        await this.transactionsService.createFromPayment(tx, tenant.id, {
          customerId: dto.customerId,
          relatedType: RelatedType.PAYMENT,
          relatedId: payment.id,
          amount: Number(amountDecimal),
          type: dto.type,
          currencyId: dto.currencyId,
          description: dto.description || `Платёж #${payment.id}`,
          createdById: user?.orgUserId,
        });
      }

      return {
        ...payment,
        amount: Number(payment.amount),
      };
    });
  }

  async findAll(tenant: Tenant, filter: PaymentFilterDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const {
      page = 1,
      limit = 20,
      type,
      kassaId,
      customerId,
      fromDate,
      toDate,
    } = filter;

    const where: Prisma.PaymentWhereInput = { organizationId: tenant.id };

    if (type) where.type = type;
    if (kassaId) where.kassaId = kassaId;
    if (customerId) where.customerId = customerId;
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const [data, total] = await Promise.all([
      client.payment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          kassa: { select: { name: true } },
          currency: { select: { code: true, symbol: true } },
          customer: {
            select: { firstName: true, lastName: true, phone: true },
          },
          sale: { select: { invoiceNumber: true } },
          purchase: { select: { invoiceNumber: true } },
        },
      }),
      client.payment.count({ where }),
    ]);

    const transformed = data.map((p) => ({
      ...p,
      amount: Number(p.amount),
    }));

    return { data: transformed, total, page, limit };
  }

  async findOne(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const payment = await client.payment.findFirst({
      where: { id, organizationId: tenant.id },
      include: {
        kassa: true,
        currency: true,
        customer: true,
        sale: true,
        purchase: true,
      },
    });

    if (!payment) throw new NotFoundException('Платёж не найден');

    return {
      ...payment,
      amount: Number(payment.amount),
    };
  }
}
