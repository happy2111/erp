import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { Prisma } from '.prisma/client-tenant';
import { CreateCurrencyRateDto } from './dto/create-currency-rate.dto';
import { UpdateCurrencyRateDto } from './dto/update-currency-rate.dto';
import { GetCurrencyRateQueryDto } from './dto/get-currency-rate-query.dto';

@Injectable()
export class CurrencyRateService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}

  async create(tenant: Tenant, dto: CreateCurrencyRateDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    return client.currencyRate.create({
      data: { ...dto, rate: new Prisma.Decimal(dto.rate) },
    });
  }

  async getAllAdmin(tenant: Tenant, query: GetCurrencyRateQueryDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const {
      baseCurrency,
      targetCurrency,
      sortField = 'date',
      order = 'desc',
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.CurrencyRateWhereInput = {};

    if (baseCurrency) where.baseCurrency = baseCurrency;
    if (targetCurrency) where.targetCurrency = targetCurrency;

    const [data, total] = await Promise.all([
      client.currencyRate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortField]: order },
      }),
      client.currencyRate.count({ where }),
    ]);

    // Преобразуем Decimal → number
    const transformed = data.map((rate) => ({
      ...rate,
      rate: Number(rate.rate),
    }));

    return {
      items: transformed,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const rate = await client.currencyRate.findUnique({ where: { id } });
    if (!rate) throw new NotFoundException('Курс не найден');
    return rate;
  }

  async update(tenant: Tenant, id: string, dto: UpdateCurrencyRateDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const exists = await client.currencyRate.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Курс не найден');
    return client.currencyRate.update({
      where: { id },
      data: {
        ...dto,
        rate: dto.rate ? new Prisma.Decimal(dto.rate) : undefined,
      },
    });
  }

  async remove(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const exists = await client.currencyRate.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Курс не найден');
    await client.currencyRate.delete({ where: { id } });
    return { message: 'Курс успешно удалён' };
  }
}
