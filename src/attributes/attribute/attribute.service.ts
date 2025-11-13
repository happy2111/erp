import {ConflictException, Injectable} from '@nestjs/common';
import { PrismaTenantService } from '../../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { FilterAttributeDto } from './dto/filter-attribute.dto';
import { Prisma } from '.prisma/client-tenant';

@Injectable()
export class AttributeService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}

  async create(tenant: Tenant, dto: CreateAttributeDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const ex = await client.attribute.findFirst({ where: { OR: [{ name: dto.name }, { key: dto.key}] } });
    if (ex) {
      throw new ConflictException('Attribute with this name or key already exists.');
    }
    return client.attribute.create({ data: dto });
  }

  async findAll(tenant: Tenant, filter: FilterAttributeDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const { search, page = 1, limit = 10 } = filter;

    const where: Prisma.AttributeWhereInput = search
      ? { name: { contains: search, mode: 'insensitive' } }
      : {};

    const [data, total] = await Promise.all([
      client.attribute.findMany({
        where,
        include: { values: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      client.attribute.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    return client.attribute.findUnique({
      where: { id },
      include: { values: true },
    });
  }

  async update(tenant: Tenant, id: string, dto: UpdateAttributeDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    return client.attribute.update({ where: { id }, data: dto });
  }

  async remove(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    return client.attribute.delete({ where: { id } });
  }
}
