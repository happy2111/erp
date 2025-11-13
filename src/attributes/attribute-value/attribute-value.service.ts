import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaTenantService } from '../../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import {Prisma} from '.prisma/client-tenant';
import { CreateAttributeValueDto } from './dto/create-attribute-value.dto';
import { UpdateAttributeValueDto } from './dto/update-attribute-value.dto';
import { FilterAttributeValueDto } from './dto/filter-attribute-value.dto';

@Injectable()
export class AttributeValueService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}

  async create(tenant: Tenant, dto: CreateAttributeValueDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // Проверка уникальности для комбинации attributeId + value
    const exists = await client.attributeValue.findUnique({
      where: {
        attributeId_value: { attributeId: dto.attributeId, value: dto.value },
      },
    });
    if (exists) throw new ConflictException('Значение атрибута уже существует');

    return client.attributeValue.create({ data: dto });
  }

  async findAll(tenant: Tenant, filter: FilterAttributeValueDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const { search, page = 1, limit = 10 } = filter;

    const where: Prisma.AttributeValueWhereInput = search
      ? { value: { contains: search, mode: 'insensitive' } }
      : {};

    const [data, total] = await Promise.all([
      client.attributeValue.findMany({
        where,
        include: { attribute: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { value: 'asc' },
      }),
      client.attributeValue.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const value = await client.attributeValue.findUnique({
      where: { id },
      include: { attribute: true },
    });
    if (!value) throw new NotFoundException('Значение атрибута не найдено');
    return value;
  }

  async update(tenant: Tenant, id: string, dto: UpdateAttributeValueDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    if (dto.attributeId && dto.value) {
      const exists = await client.attributeValue.findUnique({
        where: { attributeId_value: { attributeId: dto.attributeId, value: dto.value } },
      });
      if (exists && exists.id !== id) throw new ConflictException('Значение атрибута уже существует');
    }

    return client.attributeValue.update({ where: { id }, data: dto });
  }

  async remove(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    return client.attributeValue.delete({ where: { id } });
  }
}
