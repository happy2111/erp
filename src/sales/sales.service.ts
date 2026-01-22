// sales/sales.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { PaymentType, Prisma, SaleStatus } from '.prisma/client-tenant';
import { KassasService } from '../kassas/kassas.service';
// TODO импортировать, если нужны фильтры по продажам
import { StocksService } from '../stocks/stocks.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { CodeGeneratorService } from '../code-generater/code-generater.service';
import { SaleFilterDto } from '../product-transaction/dto/sale-filter.dto';
import { UpdateSaleDto } from '../product-transaction/dto/update-sale.dto';

@Injectable()
export class SalesService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly codeGenerator: CodeGeneratorService,
    private readonly kassasService: KassasService,
    private readonly stocksService: StocksService,
  ) {}

  async create(tenant: Tenant, dto: CreateSaleDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // 1. Проверяем валюту
    const currency = await client.currency.findUnique({
      where: { id: dto.currencyId },
    });
    if (!currency) throw new BadRequestException('Валюта не найдена');

    // 2. Генерируем номер накладной
    const invoiceNumber = await this.codeGenerator.generateNextCode(tenant, {
      prefix: 'INV',
      modelName: 'sale',
      sequenceLength: 6,
    });

    // 3. Проверяем и собираем данные по позициям
    const saleItemsData = await Promise.all(
      dto.items.map(async (item) => {
        const variant = await client.productVariant.findUnique({
          where: { id: item.productVariantId },
          include: { currency: true },
        });

        if (!variant)
          throw new NotFoundException(
            `Вариант товара ${item.productVariantId} не найден`,
          );

        // Проверяем, что валюта позиции совпадает с валютой продажи
        if (variant.currencyId && variant.currencyId !== dto.currencyId) {
          throw new BadRequestException(
            `Валюта варианта товара (${variant.currency?.code}) не совпадает с валютой продажи (${currency.code})`,
          );
        }

        const total = new Prisma.Decimal(item.quantity).mul(item.price);

        // Опционально: проверка остатка на складе
        // const stock = await client.stock.findFirst({
        //   where: { organizationId: tenant.id, productVariantId: item.productVariantId },
        // });
        // if (!stock || stock.quantity < item.quantity) {
        //   throw new BadRequestException(`Недостаточно товара ${variant.title} на складе`);
        // }

        return {
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          price: new Prisma.Decimal(item.price),
          total,
          currencyId: dto.currencyId,
        };
      }),
    );

    // 4. Считаем общую сумму
    const totalAmount = saleItemsData.reduce(
      (sum, item) => sum.add(item.total),
      new Prisma.Decimal(0),
    );

    // 5. Создаём продажу и позиции в транзакции
    return client.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          organizationId: tenant.id,
          customerId: dto.customerId,
          responsibleId: dto.responsibleId,
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
              product_variant: {
                select: { title: true, sku: true },
              },
            },
          },
          currency: { select: { code: true, symbol: true } },
          customer: {
            select: { firstName: true, lastName: true, phone: true },
          },
          responsible: { select: { email: true } },
        },
      });

      // Если статус сразу PAID и указана касса — можно сразу зачислить оплату
      // Но лучше это делать отдельно через PaymentsModule

      return {
        ...sale,
        totalAmount: Number(sale.totalAmount),
        paidAmount: Number(sale.paidAmount),
      };
    });
  }

  async findAll(tenant: Tenant, filter: SaleFilterDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const { page = 1, limit = 20, search, status } = filter;

    const where: Prisma.SaleWhereInput = { organizationId: tenant.id };

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

  async findOne(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const sale = await client.sale.findFirst({
      where: { id, organizationId: tenant.id },
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
      },
    });

    if (!sale) throw new NotFoundException('Продажа не найдена');

    return {
      ...sale,
      totalAmount: Number(sale.totalAmount),
      paidAmount: Number(sale.paidAmount),
    };
  }

  async update(tenant: Tenant, id: string, dto: UpdateSaleDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const existing = await client.sale.findFirst({
      where: { id, organizationId: tenant.id },
    });
    if (!existing) throw new NotFoundException('Продажа не найдена');

    // Запрещаем менять статус/сумму если уже есть оплаты
    if (existing.paidAmount.greaterThan(0) && dto.status) {
      throw new BadRequestException(
        'Нельзя менять статус продажи с существующими платежами',
      );
    }

    return client.sale.update({
      where: { id },
      data: dto,
      include: {
        currency: true,
        customer: true,
      },
    });
  }

  async remove(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const sale = await client.sale.findFirst({
      where: { id, organizationId: tenant.id },
      include: { payments: true },
    });

    if (!sale) throw new NotFoundException('Продажа не найдена');
    if (sale.payments.length > 0) {
      throw new ConflictException(
        'Невозможно удалить продажу — есть связанные платежи',
      );
    }

    return client.sale.delete({ where: { id } });
  }

  // Дополнительно: метод для подтверждения продажи (перевод в PAID + списание со склада + зачисление в кассу)
  async confirmSale(tenant: Tenant, saleId: string, kassaId: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    return client.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: saleId, organizationId: tenant.id },
        include: { items: true },
      });

      if (!sale) throw new NotFoundException('Продажа не найдена');
      if (sale.status === SaleStatus.PAID) {
        throw new BadRequestException('Продажа уже подтверждена');
      }

      for (const item of sale.items) {
        await this.stocksService.decrementStock(
          tx,
          tenant.id,
          item.productVariantId,
          item.quantity,
        );
      }

      await tx.payment.create({
        data: {
          organizationId: tenant.id,
          kassaId,
          amount: sale.totalAmount,
          currencyId: sale.currencyId,
          type: PaymentType.INCOME,
          saleId: sale.id,
          description: `Оплата продажи ${sale.invoiceNumber}`,
        },
      });

      // Зачисляем в кассу (если указана)
      if (kassaId) {
        await this.kassasService.updateBalance(
          tx,
          kassaId,
          Number(sale.totalAmount),
        );
        await tx.sale.update({
          where: { id: saleId },
          data: {
            kassaId,
            status: SaleStatus.PAID,
            paidAmount: sale.totalAmount,
          },
        });
      } else {
        await tx.sale.update({
          where: { id: saleId },
          data: { status: SaleStatus.PAID },
        });
      }

      return { message: 'Продажа успешно подтверждена' };
    });
  }
}
