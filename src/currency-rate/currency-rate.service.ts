import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { Prisma } from '.prisma/client-tenant';
import { CreateCurrencyRateDto } from './dto/create-currency-rate.dto';
import { UpdateCurrencyRateDto } from './dto/update-currency-rate.dto';
import { CurrencyRateFilterDto } from './dto/filter-currency-rate.dto';

@Injectable()
export class CurrencyRateService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}

  async create(tenant: Tenant, dto: CreateCurrencyRateDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    return client.currencyRate.create({ data: { ...dto, rate: new Prisma.Decimal(dto.rate) } });
  }

  async findAll(tenant: Tenant, filter: CurrencyRateFilterDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const take = filter.limit ?? 10;
    const skip = ((filter.page ?? 1) - 1) * take;

    const where: Prisma.CurrencyRateWhereInput = {};
    if (filter.baseCurrency) where.baseCurrency = filter.baseCurrency;
    if (filter.targetCurrency) where.targetCurrency = filter.targetCurrency;

    const [data, total] = await client.$transaction([
      client.currencyRate.findMany({ where, take, skip, orderBy: { date: 'desc' } }),
      client.currencyRate.count({ where }),
    ]);

    return { data, total, page: filter.page ?? 1, limit: take };
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
    return client.currencyRate.update({ where: { id }, data: { ...dto, rate: dto.rate ? new Prisma.Decimal(dto.rate) : undefined } });
  }

  async remove(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const exists = await client.currencyRate.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Курс не найден');
    await client.currencyRate.delete({ where: { id } });
    return { message: 'Курс успешно удалён' };
  }
}
