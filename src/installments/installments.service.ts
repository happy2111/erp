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
import { TransactionsService } from '../transactions/transactions.service';
import { CreateInstallmentDto } from './dto/create-installment.dto';
import { CreateInstallmentPaymentDto } from './dto/create-installment-payment.dto';
import { CancelInstallmentDto } from './dto/cancel-installment.dto';
import { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';
import { GetInstallmentQueryDto } from './dto/get-installment-query.dto';

@Injectable()
export class InstallmentsService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly paymentsService: PaymentsService,
    private readonly kassasService: KassasService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async create(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    dto: CreateInstallmentDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    // 1. Проверяем продажу и её принадлежность организации
    const sale = await client.sale.findFirst({
      where: { id: dto.saleId, organizationId },
    });
    if (!sale) {
      throw new NotFoundException(
        'Продажа не найдена или принадлежит другой организации',
      );
    }

    // 2. Проверяем клиента и его принадлежность организации
    const customer = await client.organizationCustomer.findFirst({
      where: { id: dto.customerId, organizationId },
    });
    if (!customer) {
      throw new NotFoundException('Клиент не найден в этой организации');
    }

    // 3. Проверяем сумму
    const installmentAmount = new Prisma.Decimal(dto.totalAmount);
    const initialPayment = new Prisma.Decimal(dto.initialPayment);
    if (!installmentAmount.add(initialPayment).equals(sale.totalAmount)) {
      throw new BadRequestException(
        'Сумма рассрочки + взнос не равна общей сумме продажи',
      );
    }

    // 4. Рассчитываем ежемесячный платёж
    const monthlyPayment = installmentAmount.div(dto.totalMonths);

    // 5. Крайний срок
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
        paidAmount: initialPayment,
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
    user: JwtAuthenticatedUser,
    dto: CreateInstallmentPaymentDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    return client.$transaction(async (tx) => {
      // 1. Находим рассрочку и проверяем организацию
      const installment = await tx.installment.findFirst({
        where: {
          id: dto.installmentId,
          sale: { organizationId },
        },
        include: { sale: true },
      });

      if (!installment) {
        throw new NotFoundException(
          'Рассрочка не найдена или принадлежит другой организации',
        );
      }

      const amountDecimal = new Prisma.Decimal(dto.amount);

      if (amountDecimal.greaterThan(installment.remaining)) {
        throw new BadRequestException('Сумма платежа превышает остаток');
      }

      const kassa = await tx.kassa.findFirst({ where: { id: dto.kassaId } });
      if (kassa?.currencyId !== installment.sale.currencyId) {
        throw new BadRequestException(
          'Валюта кассы не совпадает с валютой продажи',
        );
      } else {
        await this.kassasService.updateBalance(
          tx,
          dto.kassaId,
          amountDecimal.toNumber(),
        );
      }

      // 2. Платёж по рассрочке
      const installmentPayment = await tx.installmentPayment.create({
        data: {
          installmentId: dto.installmentId,
          amount: amountDecimal,
          paymentMethod: dto.paymentMethod,
          createdById: user.userId,
          note: dto.note,
        },
      });

      // 3. Основной платёж (приход в кассу)
      const payment = await tx.payment.create({
        data: {
          organizationId,
          userId: user.userId,
          customerId: installment.customerId,
          saleId: installment.saleId,
          kassaId: dto.kassaId,
          currencyId: installment.sale.currencyId,
          amount: amountDecimal,
          type: PaymentType.INCOME,
          description: `Платёж по рассрочке #${installment.id}`,
        },
      });

      // 4. Обновляем рассрочку
      const newPaid = new Prisma.Decimal(installment.paidAmount).add(
        amountDecimal,
      );
      const newRemaining = new Prisma.Decimal(installment.remaining).sub(
        amountDecimal,
      );

      const paidWithoutInitial = newPaid.sub(installment.initialPayment);

      const fullyPaidMonths = paidWithoutInitial
        .div(installment.monthlyPayment)
        .floor()
        .toNumber();


      // Новый monthsLeft = сколько месяцев осталось
      const newMonthsLeft = Math.max(
        0,
        installment.totalMonths - fullyPaidMonths,
      );

      let newStatus: InstallmentStatus = InstallmentStatus.PENDING;
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

      // 5. Транзакция через TransactionsService
      await this.transactionsService.createFromPayment(tx, organizationId, {
        customerId: installment.customerId,
        relatedType: RelatedType.PAYMENT,
        relatedId: payment.id,
        amount: amountDecimal.toNumber(),
        type: PaymentType.INCOME,
        currencyId: installment.sale.currencyId,
        description: `Платёж по рассрочке #${installment.id}`,
        createdById: user.userId,
      });

      return installmentPayment;
    });
  }

  async getAllAdmin(
    tenant: Tenant,
    orgId: string,
    query: GetInstallmentQueryDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const {
      search,
      customerId,
      status,
      overdue,
      sortField = 'dueDate',
      order = 'asc',
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.InstallmentWhereInput = {
      sale: { organizationId: orgId },
    };

    if (search) {
      where.OR = [
        { sale: { invoiceNumber: { contains: search, mode: 'insensitive' } } },
        {
          customer: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
            ],
          },
        },
      ];
    }

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
        orderBy: { [sortField]: order },
        include: {
          sale: {
            include: {
              currency: true,
            },
          },
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          payments: {
            orderBy: { paidAt: 'desc' },
            take: 5,
          },
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

    const installment = await client.installment.findFirst({
      where: { id, sale: { organizationId } },
      include: {
        sale: {
          include: { currency: true },
        },
        customer: true,
        payments: {
          include: {
            created_by: { select: { id: true, email: true } },
            payment: true,
          },
        },
      },
    });

    if (!installment)
      throw new NotFoundException(
        'Рассрочка не найдена или принадлежит другой организации',
      );

    return {
      ...installment,
      totalAmount: Number(installment.totalAmount),
      initialPayment: Number(installment.initialPayment),
      paidAmount: Number(installment.paidAmount),
      remaining: Number(installment.remaining),
      monthlyPayment: Number(installment.monthlyPayment),
    };
  }

  async cancel(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    installmentId: string,
    dto: CancelInstallmentDto = {},
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    return client.$transaction(async (tx) => {
      // 1. Находим рассрочку и проверяем организацию
      const installment = await tx.installment.findFirst({
        where: {
          id: installmentId,
          sale: { organizationId },
        },
        include: {
          sale: { select: { id: true, invoiceNumber: true, currencyId: true } },
          customer: { select: { id: true } },
          payments: true,
        },
      });

      if (!installment) {
        throw new NotFoundException(
          'Рассрочка не найдена или принадлежит другой организации',
        );
      }

      // 2. Проверяем возможность отмены
      if (installment.status === InstallmentStatus.COMPLETED) {
        throw new BadRequestException(
          'Нельзя отменить полностью выплаченную рассрочку',
        );
      }

      if (installment.status === InstallmentStatus.CANCELLED) {
        throw new BadRequestException('Рассрочка уже отменена');
      }

      // 3. Меняем статус
      const updatedInstallment = await tx.installment.update({
        where: { id: installmentId },
        data: {
          status: InstallmentStatus.CANCELLED,
          notes: dto.reason
            ? `${installment.notes ? installment.notes + '\n' : ''}Отменена: ${dto.reason}`
            : installment.notes,
        },
      });

      // 4. Корректируем баланс клиента (если были платежи)
      if (installment.paidAmount.greaterThan(0)) {
        await this.transactionsService.createFromPayment(tx, organizationId, {
          customerId: installment.customerId,
          relatedType: RelatedType.ADJUSTMENT,
          relatedId: installmentId,
          amount: Number(installment.paidAmount),
          type: 'ADJUSTMENT',
          currencyId: installment.sale.currencyId,
          description: `Отмена рассрочки #${installmentId}${dto.reason ? `: ${dto.reason}` : ''}`,
        });
      }

      return {
        ...updatedInstallment,
        totalAmount: Number(updatedInstallment.totalAmount),
        initialPayment: Number(updatedInstallment.initialPayment),
        paidAmount: Number(updatedInstallment.paidAmount),
        remaining: Number(updatedInstallment.remaining),
        monthlyPayment: Number(updatedInstallment.monthlyPayment),
      };
    });
  }
}
