import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaTenantService } from '../../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { CreateProductVariantAttributeDto } from './dto/create-product-variant-attribute.dto';
import { UpdateProductVariantAttributeDto } from './dto/update-product-variant-attribute.dto';
import { FilterProductVariantAttributeDto } from './dto/filter-product-variant-attribute.dto';

@Injectable()
export class ProductVariantAttributeService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}

  async create(tenant: Tenant, dto: CreateProductVariantAttributeDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // Проверка уникальности сочетания variant + attributeValue
    const exists = await client.productVariantAttribute.findFirst({
      where: {
        productVariantId: dto.productVariantId,
        attributeValueId: dto.attributeValueId,
      },
    });

    if (exists) throw new ConflictException('Данный вариант уже имеет это значение атрибута');

    return client.productVariantAttribute.create({ data: dto });
  }

  async findAll(tenant: Tenant, filter: FilterProductVariantAttributeDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const { page = 1, limit = 10 } = filter;

    const [data, total] = await Promise.all([
      client.productVariantAttribute.findMany({
        include: { variant: true, value: true },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { id: 'asc' },
      }),
      client.productVariantAttribute.count(),
    ]);

    return { data, total, page, limit };
  }

  async findOne(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const item = await client.productVariantAttribute.findUnique({
      where: { id },
      include: { variant: true, value: true },
    });
    if (!item) throw new NotFoundException('Связь варианта и атрибута не найдена');
    return item;
  }

  async update(tenant: Tenant, id: string, dto: UpdateProductVariantAttributeDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    if (dto.productVariantId && dto.attributeValueId) {
      const exists = await client.productVariantAttribute.findFirst({
        where: {
          productVariantId: dto.productVariantId,
          attributeValueId: dto.attributeValueId,
        },
      });

      if (exists && exists.id !== id) throw new ConflictException('Данный вариант уже имеет это значение атрибута');
    }

    return client.productVariantAttribute.update({ where: { id }, data: dto });
  }

  async remove(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    return client.productVariantAttribute.delete({ where: { id } });
  }
}
