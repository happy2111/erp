import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { Prisma, PaymentType, RelatedType, Kassa } from '.prisma/client-tenant';
import { KassasService } from '../kassas/kassas.service';
import { TransactionsService } from '../transactions/transactions.service';
import { AuditHelper } from '../audit-logs/audit.helper';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentFilterDto } from './dto/payment-filter.dto';
import { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly kassasService: KassasService,
    private readonly transactionsService: TransactionsService,
    private readonly auditHelper: AuditHelper,
  ) {}

  async create(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    dto: CreatePaymentDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    // 1. Проверяем кассу и её принадлежность организации
    const kassa = await client.kassa.findFirst({
      where: { id: dto.kassaId, organizationId },
    });
    if (!kassa)
      throw new NotFoundException(
        'Касса не найдена или принадлежит другой организации',
      );

    // 2. Проверяем валюту
    const currency = await client.currency.findUnique({
      where: { id: dto.currencyId },
    });
    if (!currency) throw new NotFoundException('Валюта не найдена');

    // 3. Валидация перевода (TRANSFER)
    let toKassa: Kassa | null = null;
    if (dto.type === PaymentType.TRANSFER) {
      if (!dto.toKassaId)
        throw new BadRequestException('Для перевода нужна касса-получатель');
      if (dto.toKassaId === dto.kassaId)
        throw new BadRequestException('Нельзя переводить на ту же кассу');

      toKassa = await client.kassa.findFirst({
        where: { id: dto.toKassaId, organizationId },
      });
      if (!toKassa)
        throw new NotFoundException(
          'Касса-получатель не найдена или принадлежит другой организации',
        );
    }

    // 4. Проверка связи с продажей/закупкой
    if (dto.type === PaymentType.INCOME && dto.saleId) {
      const sale = await client.sale.findFirst({
        where: { id: dto.saleId, organizationId },
      });
      if (!sale)
        throw new NotFoundException(
          'Продажа не найдена или принадлежит другой организации',
        );
    }

    if (dto.type === PaymentType.EXPENSE && dto.purchaseId) {
      const purchase = await client.purchase.findFirst({
        where: { id: dto.purchaseId, organizationId },
      });
      if (!purchase)
        throw new NotFoundException(
          'Закупка не найдена или принадлежит другой организации',
        );
    }

    // 5. Проверка баланса кассы при расходе/переводе
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
          organizationId,
          userId: user.orgUserId, // кто провёл платёж
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
      if (dto.customerId) {
        await this.transactionsService.createFromPayment(tx, organizationId, {
          customerId: dto.customerId,
          relatedType: RelatedType.PAYMENT,
          relatedId: payment.id,
          amount: Number(amountDecimal),
          type: dto.type,
          currencyId: dto.currencyId,
          description: dto.description || `Платёж #${payment.id}`,
          createdById: user.orgUserId,
        });
      }

      // Логируем платёж в AuditLog
      await this.auditHelper.log(tx, organizationId, {
        userId: user.userId,
        action: 'CREATE',
        entity: 'Payment',
        entityId: payment.id,
        newValue: {
          type: payment.type,
          amount: Number(payment.amount),
          currency: payment.currency.code,
          kassa: payment.kassa.name,
          description: payment.description,
        },
        note: `Создан платёж ${payment.type} на сумму ${payment.amount.toString()} ${payment.currency.code}`,
      });

      return {
        ...payment,
        amount: Number(payment.amount),
      };
    });
  }

  async findAll(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    filter: PaymentFilterDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    const {
      page = 1,
      limit = 20,
      type,
      kassaId,
      customerId,
      fromDate,
      toDate,
    } = filter;

    const where: Prisma.PaymentWhereInput = { organizationId };

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

  async findOne(tenant: Tenant, user: JwtAuthenticatedUser, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    const payment = await client.payment.findFirst({
      where: { id, organizationId },
      include: {
        kassa: true,
        currency: true,
        customer: true,
        sale: true,
        purchase: true,
      },
    });

    if (!payment) {
      throw new NotFoundException(
        'Платёж не найден или принадлежит другой организации',
      );
    }

    return {
      ...payment,
      amount: Number(payment.amount),
    };
  }
}
