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
import { CreateProductVariantAttributeDto } from './dto/create-product-variant-attribute.dto';
import { UpdateProductVariantAttributeDto } from './dto/update-product-variant-attribute.dto';
import { GetProductVariantAttributeQueryDto } from './dto/get-product-variant-attribute-query.dto';

@Injectable()
export class ProductVariantAttributeService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}

  async getAllAdmin(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    query: GetProductVariantAttributeQueryDto,
  ): Promise<{ items: any[]; total: number }> {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const {
      search,
      productVariantId,
      attributeValueId,
      sortField = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 50,
    } = query;

    const where: Prisma.ProductVariantAttributeWhereInput = {};

    if (search) {
      where.value = {
        value: { contains: search, mode: 'insensitive' },
      };
    }

    if (productVariantId) {
      where.productVariantId = productVariantId;
    }

    if (attributeValueId) {
      where.attributeValueId = attributeValueId;
    }

    // В будущем: where.variant: { product: { organizationId: user.orgId } }

    const [items, total] = await Promise.all([
      client.productVariantAttribute.findMany({
        where,
        include: {
          variant: {
            select: {
              id: true,
              sku: true,
              // можно добавить product: { select: { name: true } }
            },
          },
          value: {
            select: {
              id: true,
              value: true,
              attribute: { select: { id: true, key: true, name: true } },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortField]: order },
      }),
      client.productVariantAttribute.count({ where }),
    ]);

    return { items, total };
  }

  async getByIdAdmin(tenant: Tenant, user: JwtAuthenticatedUser, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const link = await client.productVariantAttribute.findUnique({
      where: { id },
      include: {
        variant: true,
        value: {
          include: { attribute: true },
        },
      },
    });

    if (!link) {
      throw new NotFoundException('Связь варианта и атрибута не найдена');
    }

    return link;
  }

  async create(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    dto: CreateProductVariantAttributeDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // Проверка существования варианта и значения атрибута
    const [variantExists, valueExists] = await Promise.all([
      client.productVariant.findUnique({ where: { id: dto.productVariantId } }),
      client.attributeValue.findUnique({ where: { id: dto.attributeValueId } }),
    ]);

    if (!variantExists) {
      throw new NotFoundException(
        `Вариант товара ${dto.productVariantId} не найден`,
      );
    }
    if (!valueExists) {
      throw new NotFoundException(
        `Значение атрибута ${dto.attributeValueId} не найдено`,
      );
    }

    const exists = await client.productVariantAttribute.findUnique({
      where: {
        productVariantId_attributeValueId: {
          productVariantId: dto.productVariantId,
          attributeValueId: dto.attributeValueId,
        },
      },
    });

    if (exists) {
      throw new ConflictException(
        'Эта связь варианта и значения атрибута уже существует',
      );
    }

    return client.productVariantAttribute.create({
      data: {
        productVariantId: dto.productVariantId,
        attributeValueId: dto.attributeValueId,
      },
    });
  }

  async update(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    id: string,
    dto: UpdateProductVariantAttributeDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const existing = await client.productVariantAttribute.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Связь не найдена');
    }

    if (dto.productVariantId || dto.attributeValueId) {
      const newVariantId = dto.productVariantId ?? existing.productVariantId;
      const newValueId = dto.attributeValueId ?? existing.attributeValueId;

      const conflict = await client.productVariantAttribute.findUnique({
        where: {
          productVariantId_attributeValueId: {
            productVariantId: newVariantId,
            attributeValueId: newValueId,
          },
        },
      });

      if (conflict && conflict.id !== id) {
        throw new ConflictException('Такая связь уже существует');
      }

      // Проверяем существование новых сущностей
      if (dto.productVariantId) {
        const v = await client.productVariant.findUnique({
          where: { id: dto.productVariantId },
        });
        if (!v) throw new NotFoundException('Новый вариант товара не найден');
      }
      if (dto.attributeValueId) {
        const av = await client.attributeValue.findUnique({
          where: { id: dto.attributeValueId },
        });
        if (!av)
          throw new NotFoundException('Новое значение атрибута не найдено');
      }
    }

    return client.productVariantAttribute.update({
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

    const link = await client.productVariantAttribute.findUnique({
      where: { id },
    });

    if (!link) {
      throw new NotFoundException('Связь не найдена');
    }

    // Здесь обычно нет каскадных зависимостей, поэтому просто удаляем
    await client.productVariantAttribute.delete({ where: { id } });
  }
}
