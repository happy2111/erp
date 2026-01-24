import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import {
  InstallmentStatus,
  PaymentType,
  Prisma,
  RelatedType,
} from '.prisma/client-tenant';
import { PaymentsService } from '../payments/payments.service';
import { KassasService } from '../kassas/kassas.service';
import { CreateInstallmentDto } from './dto/create-installment.dto';
import { CreateInstallmentPaymentDto } from './dto/create-installment-payment.dto';
import { InstallmentFilterDto } from './dto/installment-filter.dto';
import { CancelInstallmentDto } from './dto/cancel-installment.dto';
import { TransactionsService } from '../transactions/transactions.service';
import { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';

@Injectable()
export class InstallmentsService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly paymentsService: PaymentsService,
    private readonly kassasService: KassasService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async create(tenant: Tenant, dto: CreateInstallmentDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // 1. Проверяем продажу
    const sale = await client.sale.findFirst({
      where: { id: dto.saleId, organizationId: tenant.id },
    });
    if (!sale) throw new NotFoundException('Продажа не найдена');

    // 2. Проверяем клиента
    const customer = await client.organizationCustomer.findFirst({
      where: { id: dto.customerId, organizationId: tenant.id },
    });
    if (!customer) throw new NotFoundException('Клиент не найден');

    // 3. Проверяем, что сумма рассрочки + взнос = сумма продажи
    const installmentAmount = new Prisma.Decimal(dto.totalAmount);
    const initialPayment = new Prisma.Decimal(dto.initialPayment);
    // Use the ! operator with .equals()
    if (!installmentAmount.add(initialPayment).equals(sale.totalAmount)) {
      throw new BadRequestException(
        'Сумма рассрочки + взнос не равна общей сумме продажи',
      );
    }
    // 4. Рассчитываем ежемесячный платёж
    const monthlyPayment = installmentAmount.div(dto.totalMonths);

    // 5. Крайний срок (если не указан — через totalMonths месяцев)
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : new Date();
    if (!dto.dueDate) {
      dueDate.setMonth(dueDate.getMonth() + dto.totalMonths);
    }

    return client.installment.create({
      data: {
        saleId: dto.saleId,
        customerId: dto.customerId,
        totalAmount: installmentAmount,
        initialPayment,
        paidAmount: initialPayment, // взнос уже оплачен
        remaining: installmentAmount,
        totalMonths: dto.totalMonths,
        monthsLeft: dto.totalMonths,
        monthlyPayment,
        dueDate,
        status: InstallmentStatus.PENDING,
        notes: dto.notes,
      },
      include: {
        sale: { select: { invoiceNumber: true } },
        customer: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async addPayment(
    tenant: Tenant,
    dto: CreateInstallmentPaymentDto,
    user: JwtAuthenticatedUser | null,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    return client.$transaction(async (tx) => {
      const installment = await tx.installment.findFirst({
        where: { id: dto.installmentId, sale: { organizationId: tenant.id } },
        include: { sale: true },
      });

      if (!installment) throw new NotFoundException('Рассрочка не найдена');

      const amountDecimal = new Prisma.Decimal(dto.amount);

      if (amountDecimal.greaterThan(installment.remaining)) {
        throw new BadRequestException('Сумма платежа превышает остаток');
      }

      // 1. Создаём платёж по рассрочке
      const installmentPayment = await tx.installmentPayment.create({
        data: {
          installmentId: dto.installmentId,
          amount: amountDecimal,
          paymentMethod: dto.paymentMethod,
          createdById: user?.orgUserId,
          note: dto.note,
        },
      });

      // 2. Создаём основной платёж (приход в кассу)
      await this.paymentsService.create(
        tenant,
        {
          type: PaymentType.INCOME,
          amount: Number(amountDecimal),
          currencyId: installment.sale.currencyId,
          kassaId: dto.kassaId,
          customerId: installment.customerId,
          saleId: installment.saleId,
          description: `Платёж по рассрочке #${installment.id} (${dto.note || 'без комментария'})`,
        },
        user,
      );

      // 3. Обновляем рассрочку
      const newPaid = new Prisma.Decimal(installment.paidAmount).add(
        amountDecimal,
      );
      const newRemaining = new Prisma.Decimal(installment.remaining).sub(
        amountDecimal,
      );
      const newMonthsLeft = Math.max(0, installment.monthsLeft - 1);

      let newStatus = installment.status;
      if (newRemaining.equals(0)) {
        newStatus = InstallmentStatus.COMPLETED;
      } else if (new Date() > installment.dueDate) {
        newStatus = InstallmentStatus.OVERDUE;
      }

      await tx.installment.update({
        where: { id: dto.installmentId },
        data: {
          paidAmount: newPaid,
          remaining: newRemaining,
          monthsLeft: newMonthsLeft,
          status: newStatus,
        },
      });

      // 4. Создаём запись в Transaction
      await this.transactionsService.createFromPayment(tx, tenant.id, {
        customerId: installment.customerId,
        relatedType: RelatedType.PAYMENT,
        relatedId: installmentPayment.id,
        amount: Number(amountDecimal),
        type: PaymentType.INCOME,
        currencyId: installment.sale.currencyId,
        description: `Платёж по рассрочке #${installment.id}`,
      });

      return installmentPayment;
    });
  }

  async findAll(tenant: Tenant, filter: InstallmentFilterDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const { page = 1, limit = 20, customerId, status, overdue } = filter;

    const where: Prisma.InstallmentWhereInput = {
      sale: { organizationId: tenant.id },
    };

    if (customerId) where.customerId = customerId;
    if (status) where.status = status;
    if (overdue === 'true') {
      where.AND = [
        { status: InstallmentStatus.PENDING },
        { dueDate: { lt: new Date() } },
      ];
    }

    const [data, total] = await Promise.all([
      client.installment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { dueDate: 'asc' },
        include: {
          sale: { select: { invoiceNumber: true, totalAmount: true } },
          customer: {
            select: { firstName: true, lastName: true, phone: true },
          },
          payments: true,
        },
      }),
      client.installment.count({ where }),
    ]);

    const transformed = data.map((i) => ({
      ...i,
      totalAmount: Number(i.totalAmount),
      initialPayment: Number(i.initialPayment),
      paidAmount: Number(i.paidAmount),
      remaining: Number(i.remaining),
      monthlyPayment: Number(i.monthlyPayment),
    }));

    return { data: transformed, total, page, limit };
  }

  async findOne(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const installment = await client.installment.findFirst({
      where: { id, sale: { organizationId: tenant.id } },
      include: {
        sale: true,
        customer: true,
        payments: {
          include: { created_by: { select: { email: true } } },
        },
      },
    });

    if (!installment) throw new NotFoundException('Рассрочка не найдена');

    return {
      ...installment,
      totalAmount: Number(installment.totalAmount),
      initialPayment: Number(installment.initialPayment),
      paidAmount: Number(installment.paidAmount),
      remaining: Number(installment.remaining),
      monthlyPayment: Number(installment.monthlyPayment),
    };
  }

  // async cancel(
  //   tenant: Tenant,
  //   installmentId: string,
  //   dto: CancelInstallmentDto = {},
  // ) {
  //   const client = this.prismaTenant.getTenantPrismaClient(tenant);
  //
  //   return client.$transaction(async (tx) => {
  //     // 1. Находим рассрочку
  //     const installment = await tx.installment.findFirst({
  //       where: {
  //         id: installmentId,
  //         // TODO тут нельзя быть tennat.id нужно orgId
  //         sale: { organizationId: tenant.id },
  //       },
  //       include: {
  //         sale: { select: { id: true, invoiceNumber: true } },
  //         customer: { select: { id: true, firstName: true, lastName: true } },
  //         payments: true,
  //       },
  //     });
  //
  //     if (!installment) {
  //       throw new NotFoundException('Рассрочка не найдена');
  //     }
  //
  //     // 2. Проверяем, можно ли отменить
  //     if (installment.status === InstallmentStatus.COMPLETED) {
  //       throw new BadRequestException(
  //         'Нельзя отменить полностью выплаченную рассрочку',
  //       );
  //     }
  //
  //     if (installment.status === InstallmentStatus.CANCELLED) {
  //       throw new BadRequestException('Рассрочка уже отменена');
  //     }
  //
  //     // 3. Меняем статус на CANCELLED
  //     const updatedInstallment = await tx.installment.update({
  //       where: { id: installmentId },
  //       data: {
  //         status: InstallmentStatus.CANCELLED,
  //         notes: dto.reason
  //           ? `${installment.notes ? installment.notes + '\n' : ''}Отменена: ${dto.reason}`
  //           : installment.notes,
  //       },
  //     });
  //
  //     // 4. (Опционально) Корректируем баланс клиента в Transaction
  //     // Если клиент уже вносил платежи — создаём обратную запись (debit уменьшается)
  //     if (installment.paidAmount.greaterThan(0)) {
  //       const lastTransaction = await tx.transaction.findFirst({
  //         where: {
  //           customerId: installment.customerId,
  //           currencyId: installment.sale.currencyId,
  //         },
  //         orderBy: { date: 'desc' },
  //       });
  //
  //       const previousBalance = lastTransaction
  //         ? lastTransaction.balanceAfter
  //         : new Prisma.Decimal(0);
  //
  //       // Обратная запись: уменьшаем долг клиента на сумму уже оплаченного
  //       await tx.transaction.create({
  //         data: {
  //           organizationId: tenant.id,
  //           customerId: installment.customerId,
  //           relatedType: RelatedType.ADJUSTMENT,
  //           relatedId: installmentId,
  //           date: new Date(),
  //           debit: new Prisma.Decimal(0),
  //           credit: installment.paidAmount, // уменьшаем дебет (долг)
  //           balanceAfter: previousBalance.sub(installment.paidAmount),
  //           currencyId: installment.sale.currencyId,
  //           description: `Отмена рассрочки #${installmentId} (${dto.reason || 'без причины'})`,
  //         },
  //       });
  //     }
  //
  //     // 5. (Опционально) Можно вернуть деньги клиенту через возвратный платёж
  //     // Но это зависит от бизнес-логики — если товар возвращён, можно создать REFUND
  //
  //     return {
  //       ...updatedInstallment,
  //       totalAmount: Number(updatedInstallment.totalAmount),
  //       initialPayment: Number(updatedInstallment.initialPayment),
  //       paidAmount: Number(updatedInstallment.paidAmount),
  //       remaining: Number(updatedInstallment.remaining),
  //       monthlyPayment: Number(updatedInstallment.monthlyPayment),
  //     };
  //   });
  // }
}
