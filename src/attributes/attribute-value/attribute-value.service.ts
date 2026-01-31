import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaTenantService } from '../../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { Prisma } from '.prisma/client-tenant';
import { JwtAuthenticatedUser } from '../../tenant-auth/interfaces/jwt.interface';
import { CreateAttributeValueDto } from './dto/create-attribute-value.dto';
import { UpdateAttributeValueDto } from './dto/update-attribute-value.dto';
import { GetAttributeValueQueryDto } from './dto/get-attribute-value-query.dto';

@Injectable()
export class AttributeValueService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}

  async getAllAdmin(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    query: GetAttributeValueQueryDto,
  ): Promise<{ items: any[]; total: number }> {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const {
      search,
      attributeId,
      sortField = 'value',
      order = 'asc',
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.AttributeValueWhereInput = {};

    if (search) {
      where.value = { contains: search, mode: 'insensitive' };
    }

    if (attributeId) {
      where.attributeId = attributeId;
    }

    // В будущем здесь можно добавить: attribute: { organizationId: user.orgId }

    const [items, total] = await Promise.all([
      client.attributeValue.findMany({
        where,
        include: {
          attribute: {
            select: { id: true, key: true, name: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortField]: order },
      }),
      client.attributeValue.count({ where }),
    ]);

    return { items, total };
  }

  async getByIdAdmin(tenant: Tenant, user: JwtAuthenticatedUser, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const value = await client.attributeValue.findUnique({
      where: { id },
      include: {
        attribute: {
          select: { id: true, key: true, name: true },
        },
      },
    });

    if (!value) {
      throw new NotFoundException('Значение характеристики не найдено');
    }

    // В будущем: проверка принадлежности атрибута к организации

    return value;
  }

  async create(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    dto: CreateAttributeValueDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // Проверка существования атрибута
    const attributeExists = await client.attribute.findUnique({
      where: { id: dto.attributeId },
    });
    if (!attributeExists) {
      throw new NotFoundException(`Атрибут с ID ${dto.attributeId} не найден`);
    }

    // Проверка уникальности комбинации
    const exists = await client.attributeValue.findUnique({
      where: {
        attributeId_value: {
          attributeId: dto.attributeId,
          value: dto.value,
        },
      },
    });

    if (exists) {
      throw new ConflictException(
        `Значение "${dto.value}" уже существует для атрибута ${dto.attributeId}`,
      );
    }

    return client.attributeValue.create({
      data: {
        attributeId: dto.attributeId,
        value: dto.value,
      },
    });
  }

  async update(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    id: string,
    dto: UpdateAttributeValueDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const existing = await client.attributeValue.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Значение характеристики не найдено');
    }

    // Если меняем значение или атрибут — проверяем уникальность новой комбинации
    if (dto.value || dto.attributeId) {
      const newAttributeId = dto.attributeId ?? existing.attributeId;
      const newValue = dto.value ?? existing.value;

      const conflict = await client.attributeValue.findUnique({
        where: {
          attributeId_value: {
            attributeId: newAttributeId,
            value: newValue,
          },
        },
      });

      if (conflict && conflict.id !== id) {
        throw new ConflictException(
          `Значение "${newValue}" уже существует для атрибута ${newAttributeId}`,
        );
      }

      // Если меняем атрибут — проверяем, существует ли он
      if (dto.attributeId && dto.attributeId !== existing.attributeId) {
        const attrExists = await client.attribute.findUnique({
          where: { id: dto.attributeId },
        });
        if (!attrExists) {
          throw new NotFoundException(`Атрибут ${dto.attributeId} не найден`);
        }
      }
    }

    return client.attributeValue.update({
      where: { id },
      data: dto,
    });
  }

  async hardDelete(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    id: string,
  ): Promise<void> {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const value = await client.attributeValue.findUnique({
      where: { id },
      include: {
        _count: {
          select: { product_variant_attribute: true },
        },
      },
    });

    if (!value) {
      throw new NotFoundException('Значение характеристики не найдено');
    }

    if (value._count.product_variant_attribute > 0) {
      throw new BadRequestException(
        'Нельзя удалить значение — оно используется в вариантах товаров',
      );
    }

    await client.attributeValue.delete({ where: { id } });
  }
}
