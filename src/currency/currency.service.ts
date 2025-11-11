import { Injectable } from '@nestjs/common';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { Tenant } from '@prisma/client';
import {PrismaTenantService} from "../prisma_tenant/prisma_tenant.service";

@Injectable()
export class CurrencyService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}

  async create(tenant: Tenant, createCurrencyDto: CreateCurrencyDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    return client.currency.create({
      data: createCurrencyDto,
    });
  }

  async findAll(tenant: Tenant) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    return client.currency.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async findOne(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    return client.currency.findUnique({
      where: { id },
    });
  }

  async update(tenant: Tenant, id: string, updateCurrencyDto: UpdateCurrencyDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    return client.currency.update({
      where: { id },
      data: updateCurrencyDto,
    });
  }

  async remove(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    return client.currency.delete({
      where: { id },
    });
  }
}
