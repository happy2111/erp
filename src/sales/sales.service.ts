import {
  BadRequestException,
  ConflictException,
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
  SaleStatus,
} from '.prisma/client-tenant';
import { KassasService } from '../kassas/kassas.service';
import { StocksService } from '../stocks/stocks.service';
import { InstallmentsService } from '../installments/installments.service';
import { TransactionsService } from '../transactions/transactions.service';
import { AuditHelper } from '../audit-logs/audit.helper';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SaleFilterDto } from './dto/sale-filter.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { CodeGeneratorService } from '../code-generater/code-generater.service';
import { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';
import { InstallmentWithCustomer } from '../installments/types/installment';

@Injectable()
export class SalesService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly codeGenerator: CodeGeneratorService,
    private readonly kassasService: KassasService,
    private readonly stocksService: StocksService,
    private readonly installmentsService: InstallmentsService,
    private readonly transactionsService: TransactionsService,
    private readonly auditHelper: AuditHelper,
  ) {}

  async create(tenant: Tenant, user: JwtAuthenticatedUser, dto: CreateSaleDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    // 1. Проверяем валюту
    const currency = await client.currency.findUnique({
      where: { id: dto.currencyId },
    });
    if (!currency) throw new BadRequestException('Валюта не найдена');

    // 2. Проверяем клиента (если указан)
    if (dto.customerId) {
      const customer = await client.organizationCustomer.findFirst({
        where: { id: dto.customerId, organizationId },
      });
      if (!customer)
        throw new NotFoundException('Клиент не найден в этой организации');
    }

    // 3. Проверяем ответственного (если указан)
    if (dto.responsibleId) {
      const responsible = await client.organizationUser.findFirst({
        where: { id: dto.responsibleId, organizationId },
      });
      if (!responsible)
        throw new BadRequestException(
          'Ответственный не найден в этой организации',
        );
    }

    // 4. Генерируем номер накладной
    const invoiceNumber = await this.codeGenerator.generateNextCode(tenant, {
      prefix: 'INV',
      modelName: 'sale',
      sequenceLength: 6,
    });

    // 5. Собираем позиции + проверяем товары
    const saleItemsData = await Promise.all(
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
            `Вариант товара ${item.productVariantId} не найден или принадлежит другой организации`,
          );

        if (variant.currencyId && variant.currencyId !== dto.currencyId) {
          throw new BadRequestException(
            `Валюта варианта (${variant.currency?.code}) не совпадает с валютой продажи (${currency.code})`,
          );
        }

        const total = new Prisma.Decimal(item.quantity).mul(item.price);

        return {
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          price: new Prisma.Decimal(item.price),
          total,
          currencyId: dto.currencyId,
        };
      }),
    );

    // 6. Считаем общую сумму продажи
    const totalAmount = saleItemsData.reduce(
      (sum, item) => sum.add(item.total),
      new Prisma.Decimal(0),
    );

    return client.$transaction(async (tx) => {
      // Создаём продажу
      const sale = await tx.sale.create({
        data: {
          organizationId,
          customerId: dto.customerId,
          responsibleId: dto.responsibleId || user.orgUserId, // по умолчанию текущий пользователь
          kassaId: dto.kassaId,
          invoiceNumber,
          saleDate: new Date(),
          totalAmount,
          paidAmount: new Prisma.Decimal(0),
          currencyId: dto.currencyId,
          status: dto.status || SaleStatus.DRAFT,
          notes: dto.notes,
          items: {
            create: saleItemsData,
          },
        },
        include: {
          items: {
            include: {
              product_variant: { select: { title: true, sku: true } },
            },
          },
          currency: { select: { code: true, symbol: true } },
          customer: {
            select: { firstName: true, lastName: true, phone: true },
          },
          responsible: { select: { email: true } },
        },
      });

      // Списываем со склада
      for (const item of saleItemsData) {
        await this.stocksService.decrementStock(
          tx,
          organizationId,
          item.productVariantId,
          item.quantity,
        );
      }

      // Логируем создание продажи
      await this.auditHelper.log(tx, organizationId, {
        userId: user.userId,
        action: 'CREATE',
        entity: 'Sale',
        entityId: sale.id,
        newValue: {
          invoiceNumber,
          customerId: dto.customerId,
          totalAmount: Number(totalAmount),
          status: sale.status,
        },
        note: `Создана новая продажа ${invoiceNumber}`,
      });

      // === Создание рассрочки (если передан объект installment) ===
      let installment: InstallmentWithCustomer | null = null;

      if (dto.installment) {
        if (!dto.customerId) {
          throw new BadRequestException(
            'Для создания рассрочки необходимо указать клиента (customerId)',
          );
        }

        const installmentTotal = new Prisma.Decimal(
          dto.installment.totalAmount,
        );
        const initialPayment = new Prisma.Decimal(
          dto.installment.initialPayment,
        );

        if (!installmentTotal.add(initialPayment).equals(totalAmount)) {
          throw new BadRequestException(
            'Сумма рассрочки + первоначальный взнос не равны общей сумме продажи',
          );
        }

        const monthlyPayment = installmentTotal.div(
          dto.installment.totalMonths,
        );

        const dueDate = dto.installment.dueDate
          ? new Date(dto.installment.dueDate)
          : (() => {
              const date = new Date();
              date.setMonth(date.getMonth() + dto.installment.totalMonths);
              return date;
            })();

        installment = await tx.installment.create({
          data: {
            saleId: sale.id,
            customerId: dto.customerId,
            totalAmount: installmentTotal,
            initialPayment,
            paidAmount: initialPayment,
            remaining: installmentTotal,
            totalMonths: dto.installment.totalMonths,
            monthsLeft: dto.installment.totalMonths,
            monthlyPayment,
            dueDate,
            status: InstallmentStatus.PENDING,
            notes: dto.installment.notes,
          },
          include: {
            customer: {
              select: { firstName: true, lastName: true, phone: true },
            },
          },
        });

        // Если продажа сразу PAID и есть kassaId + initialPayment > 0 → создаём платёж на взнос
        if (
          dto.kassaId &&
          sale.status === SaleStatus.PAID &&
          initialPayment.greaterThan(0)
        ) {
          const initialPaymentObj = await tx.payment.create({
            data: {
              organizationId,
              userId: user.orgUserId,
              customerId: dto.customerId,
              kassaId: dto.kassaId,
              amount: initialPayment,
              currencyId: dto.currencyId,
              type: PaymentType.INCOME,
              description: `Первоначальный взнос по рассрочке для продажи ${invoiceNumber}`,
              saleId: sale.id,
            },
          });

          await this.kassasService.updateBalance(
            tx,
            dto.kassaId,
            Number(initialPayment),
          );

          await this.transactionsService.createFromPayment(tx, organizationId, {
            customerId: dto.customerId,
            relatedType: RelatedType.PAYMENT,
            relatedId: initialPaymentObj.id,
            amount: Number(initialPayment),
            type: PaymentType.INCOME,
            currencyId: dto.currencyId,
            description: `Первоначальный взнос по рассрочке для продажи ${invoiceNumber}`,
            createdById: user.orgUserId,
          });

          // Логируем взнос
          await this.auditHelper.log(tx, organizationId, {
            userId: user.userId,
            action: 'PAYMENT',
            entity: 'Payment',
            entityId: initialPaymentObj.id,
            newValue: {
              amount: Number(initialPayment),
              type: PaymentType.INCOME,
              saleId: sale.id,
            },
            note: `Первоначальный взнос по рассрочке для продажи ${invoiceNumber}`,
          });
        }
      }

      return {
        ...sale,
        totalAmount: Number(sale.totalAmount),
        paidAmount: Number(sale.paidAmount),
        installment: installment
          ? {
              ...installment,
              totalAmount: Number(installment.totalAmount),
              initialPayment: Number(installment.initialPayment),
              paidAmount: Number(installment.paidAmount),
              remaining: Number(installment.remaining),
              monthlyPayment: Number(installment.monthlyPayment),
            }
          : null,
      };
    });
  }

  async findAll(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    filter: SaleFilterDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    const { page = 1, limit = 20, search, status } = filter;

    const where: Prisma.SaleWhereInput = { organizationId };

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      client.sale.findMany({
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
          customer: { select: { firstName: true, lastName: true } },
          kassa: { select: { name: true } },
        },
      }),
      client.sale.count({ where }),
    ]);

    const transformed = data.map((sale) => ({
      ...sale,
      totalAmount: Number(sale.totalAmount),
      paidAmount: Number(sale.paidAmount),
    }));

    return { data: transformed, total, page, limit };
  }

  async findOne(tenant: Tenant, user: JwtAuthenticatedUser, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    const sale = await client.sale.findFirst({
      where: { id, organizationId },
      include: {
        items: {
          include: {
            product_variant: {
              select: { title: true, sku: true, barcode: true },
            },
            currency: true,
          },
        },
        currency: true,
        customer: true,
        responsible: true,
        kassa: true,
        payments: true,
        installments: true,
      },
    });

    if (!sale) {
      throw new NotFoundException(
        'Продажа не найдена или принадлежит другой организации',
      );
    }

    return {
      ...sale,
      totalAmount: Number(sale.totalAmount),
      paidAmount: Number(sale.paidAmount),
    };
  }

  async update(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    id: string,
    dto: UpdateSaleDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    const existing = await client.sale.findFirst({
      where: { id, organizationId },
      include: { payments: true },
    });
    if (!existing)
      throw new NotFoundException(
        'Продажа не найдена или принадлежит другой организации',
      );

    // Запрещаем менять статус/сумму если уже есть оплаты
    if (existing.paidAmount.greaterThan(0) && dto.status) {
      throw new BadRequestException(
        'Нельзя менять статус продажи с существующими платежами',
      );
    }

    return client.$transaction(async (tx) => {
      const updated = await tx.sale.update({
        where: { id },
        data: dto,
        include: {
          currency: true,
          customer: true,
        },
      });

      // Логируем изменение
      await this.auditHelper.log(tx, organizationId, {
        userId: user.userId,
        action: 'UPDATE',
        entity: 'Sale',
        entityId: id,
        oldValue: {
          status: existing.status,
          customerId: existing.customerId,
        },
        newValue: {
          status: updated.status,
          customerId: updated.customerId,
        },
        note: `Обновлена продажа ${updated.invoiceNumber || id}`,
      });

      return updated;
    });
  }

  async remove(tenant: Tenant, user: JwtAuthenticatedUser, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    const sale = await client.sale.findFirst({
      where: { id, organizationId },
      include: { payments: true },
    });

    if (!sale)
      throw new NotFoundException(
        'Продажа не найдена или принадлежит другой организации',
      );
    if (sale.payments.length > 0) {
      throw new ConflictException(
        'Невозможно удалить продажу — есть связанные платежи',
      );
    }

    return client.$transaction(async (tx) => {
      // Логируем удаление
      await this.auditHelper.log(tx, organizationId, {
        userId: user.userId,
        action: 'DELETE',
        entity: 'Sale',
        entityId: id,
        oldValue: {
          invoiceNumber: sale.invoiceNumber,
          totalAmount: Number(sale.totalAmount),
        },
        note: `Удалена продажа ${sale.invoiceNumber || id}`,
      });

      await tx.sale.delete({ where: { id } });
    });
  }

  async confirmSale(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    saleId: string,
    kassaId: string,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    return client.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: saleId, organizationId },
        include: { items: true },
      });

      if (!sale)
        throw new NotFoundException(
          'Продажа не найдена или принадлежит другой организации',
        );
      if (sale.status === SaleStatus.PAID) {
        throw new BadRequestException('Продажа уже подтверждена');
      }

      // Списываем со склада
      for (const item of sale.items) {
        await this.stocksService.decrementStock(
          tx,
          organizationId,
          item.productVariantId,
          item.quantity,
        );
      }

      await tx.payment.create({
        data: {
          organizationId,
          userId: user.orgUserId,
          kassaId,
          amount: sale.totalAmount,
          currencyId: sale.currencyId,
          type: PaymentType.INCOME,
          description: `Полная оплата продажи ${sale.invoiceNumber}`,
          saleId: sale.id,
          customerId: sale.customerId,
        },
      });

      // Зачисляем в кассу
      await this.kassasService.updateBalance(
        tx,
        kassaId,
        Number(sale.totalAmount),
      );

      // Создаём транзакцию
      if (sale.customerId) {
        await this.transactionsService.createFromPayment(tx, organizationId, {
          customerId: sale.customerId,
          relatedType: RelatedType.SALE,
          relatedId: sale.id,
          amount: Number(sale.totalAmount),
          type: PaymentType.INCOME,
          currencyId: sale.currencyId,
          description: `Оплата продажи ${sale.invoiceNumber}`,
          createdById: user.orgUserId,
        });
      }

      // Обновляем статус продажи
      const updatedSale = await tx.sale.update({
        where: { id: saleId },
        data: {
          status: SaleStatus.PAID,
          kassaId,
        },
      });

      // Логируем подтверждение
      await this.auditHelper.log(tx, organizationId, {
        userId: user.userId,
        action: 'CONFIRM',
        entity: 'Sale',
        entityId: saleId,
        oldValue: { status: sale.status },
        newValue: { status: SaleStatus.PAID },
        note: `Продажа ${sale.invoiceNumber || saleId} подтверждена как оплаченная`,
      });

      return { message: 'Продажа успешно подтверждена', sale: updatedSale };
    });
  }
}
