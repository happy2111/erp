import { Injectable } from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { InstallmentStatus, PaymentType, Prisma } from '.prisma/client-tenant';
import { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';
import { SalesReportFilterDto } from './dto/sales-report.dto';
import { StockReportFilterDto } from './dto/stock-report.dto';
import DebtReportFilterDto from './dto/debt-report.dto';
import { DateRangeFilterDto } from './dto/report-common.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}

  // ============================================================
  // ОТЧЁТ ПО ПРОДАЖАМ
  // ============================================================
  async getSalesReport(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    filter: SalesReportFilterDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    const {
      page = 1,
      limit = 20,
      fromDate,
      toDate,
      customerId,
      status,
      productVariantId,
      responsibleId,
    } = filter;

    const where: Prisma.SaleWhereInput = { organizationId };

    if (fromDate || toDate) {
      where.saleDate = {};
      if (fromDate) where.saleDate.gte = new Date(fromDate);
      if (toDate) where.saleDate.lte = new Date(toDate);
    }
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;
    if (responsibleId) where.responsibleId = responsibleId;

    // Если фильтр по товару — ищем через items
    if (productVariantId) {
      where.items = {
        some: { productVariantId },
      };
    }

    const [sales, total] = await Promise.all([
      client.sale.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { saleDate: 'desc' },
        include: {
          customer: { select: { firstName: true, lastName: true } },
          responsible: { select: { email: true } },
          items: {
            select: {
              quantity: true,
              price: true,
              total: true,
              product_variant: { select: { title: true, sku: true } },
            },
          },
          currency: { select: { code: true, symbol: true } },
        },
      }),
      client.sale.count({ where }),
    ]);

    // Агрегация: общая сумма, оплачено, долг
    const summary = await client.sale.aggregate({
      where,
      _sum: {
        totalAmount: true,
        paidAmount: true,
      },
      _count: { id: true },
    });

    const transformed = sales.map((sale) => ({
      ...sale,
      totalAmount: Number(sale.totalAmount),
      paidAmount: Number(sale.paidAmount),
      debt: Number(sale.totalAmount.sub(sale.paidAmount)),
    }));

    return {
      data: transformed,
      summary: {
        totalSales: Number(summary._sum.totalAmount || 0),
        totalPaid: Number(summary._sum.paidAmount || 0),
        totalDebt:
          Number(summary._sum.totalAmount || 0) -
          Number(summary._sum.paidAmount || 0),
        count: summary._count.id,
      },
      total,
      page,
      limit,
    };
  }

  // ============================================================
  // ОТЧЁТ ПО ОСТАТКАМ НА СКЛАДЕ
  // ============================================================
  async getStockReport(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    filter: StockReportFilterDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    const {
      page = 1,
      limit = 20,
      fromDate,
      toDate,
      productVariantId,
      minQuantity,
      maxQuantity,
    } = filter;

    const where: Prisma.StockWhereInput = { organizationId };

    if (productVariantId) where.productVariantId = productVariantId;
    if (minQuantity) where.quantity = { gte: +minQuantity };
    if (maxQuantity) where.quantity = { lte: +maxQuantity };

    // Можно добавить фильтр по дате обновления (updatedAt)
    if (fromDate || toDate) {
      where.updatedAt = {};
      if (fromDate) where.updatedAt.gte = new Date(fromDate);
      if (toDate) where.updatedAt.lte = new Date(toDate);
    }

    const [stocks, total] = await Promise.all([
      client.stock.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { quantity: 'asc' }, // сначала низкие остатки
        include: {
          product_variant: {
            select: {
              title: true,
              sku: true,
              barcode: true,
              product: { select: { name: true, code: true } },
            },
          },
        },
      }),
      client.stock.count({ where }),
    ]);

    // Можно добавить низкие остатки (например, < 10)
    const lowStock = stocks.filter((s) => s.quantity < 10);

    return {
      data: stocks,
      lowStockCount: lowStock.length,
      total,
      page,
      limit,
    };
  }

  // ============================================================
  // ОТЧЁТ ПО ДОЛГАМ КЛИЕНТОВ (рассрочки + общий долг)
  // ============================================================
  async getDebtReport(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    filter: DebtReportFilterDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    const {
      page = 1,
      limit = 20,
      fromDate,
      toDate,
      customerId,
      status,
    } = filter;

    const where: Prisma.InstallmentWhereInput = {
      sale: { organizationId },
    };

    if (customerId) where.customerId = customerId;
    if (status) where.status = status;
    if (fromDate || toDate) {
      where.dueDate = {};
      if (fromDate) where.dueDate.gte = new Date(fromDate);
      if (toDate) where.dueDate.lte = new Date(toDate);
    }

    const [installments, total] = await Promise.all([
      client.installment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { remaining: 'desc' }, // сначала большие долги
        include: {
          customer: {
            select: { firstName: true, lastName: true, phone: true },
          },
          sale: { select: { invoiceNumber: true, totalAmount: true } },
        },
      }),
      client.installment.count({ where }),
    ]);

    // Агрегация: общий долг, просроченные
    const summary = await client.installment.aggregate({
      where,
      _sum: { remaining: true },
      _count: { id: true },
    });

    const overdue = await client.installment.count({
      where: {
        ...where,
        status: InstallmentStatus.OVERDUE,
      },
    });

    const transformed = installments.map((i) => ({
      ...i,
      totalAmount: Number(i.totalAmount),
      remaining: Number(i.remaining),
      monthlyPayment: Number(i.monthlyPayment),
    }));

    return {
      data: transformed,
      summary: {
        totalDebt: Number(summary._sum.remaining || 0),
        totalInstallments: summary._count.id,
        overdueCount: overdue,
      },
      total,
      page,
      limit,
    };
  }

  // ============================================================
  // ФИНАНСОВЫЙ ОТЧЁТ (приходы/расходы по кассам)
  // ============================================================
  async getFinanceReport(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    filter: DateRangeFilterDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    const { page = 1, limit = 20, fromDate, toDate } = filter;

    const where: Prisma.PaymentWhereInput = {
      organizationId,
    };

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
          kassa: { select: { name: true } },
          currency: { select: { code: true } },
          customer: { select: { firstName: true, lastName: true } },
        },
      }),
      client.payment.count({ where }),
    ]);

    // Агрегация по типам
    const income = await client.payment.aggregate({
      where: { ...where, type: PaymentType.INCOME },
      _sum: { amount: true },
    });

    const expense = await client.payment.aggregate({
      where: { ...where, type: PaymentType.EXPENSE },
      _sum: { amount: true },
    });

    const transfers = await client.payment.aggregate({
      where: { ...where, type: PaymentType.TRANSFER },
      _sum: { amount: true },
    });

    const transformed = payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
    }));

    return {
      data: transformed,
      summary: {
        totalIncome: Number(income._sum.amount || 0),
        totalExpense: Number(expense._sum.amount || 0),
        totalTransfers: Number(transfers._sum.amount || 0),
        netProfit:
          Number(income._sum.amount || 0) - Number(expense._sum.amount || 0),
      },
      total,
      page,
      limit,
    };
  }
}
