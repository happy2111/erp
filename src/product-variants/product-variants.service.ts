import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { Prisma } from '.prisma/client-tenant';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { ProductVariantFilterDto } from './dto/filter-product-variant.dto';

// Вспомогательный интерфейс для чистого атрибута
export interface CleanAttribute {
  key: string;
  name: string;
  value: string;
}

export interface CleanProductVariant {
  // ...
  attributes: CleanAttribute[];
}

export interface PaginatedProductVariants { // <-- Это ключевой экспорт
  data: CleanProductVariant[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ProductVariantsService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}

  async create(tenant: Tenant, dto: CreateProductVariantDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const existing = await client.productVariant.findFirst({
      where: {
        OR: [{ sku: dto.sku ?? undefined }, { barcode: dto.barcode ?? undefined }],
      },
    });

    if (existing) {
      throw new ConflictException('Вариант с таким SKU или штрихкодом уже существует');
    }

    return client.productVariant.create({ data: dto });
  }

  async findAll(tenant: Tenant, filter: ProductVariantFilterDto): Promise<PaginatedProductVariants> {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const { search, page = 1, limit = 10 } = filter;

    const where: Prisma.ProductVariantWhereInput = {};
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    // --- 1. Выполняем запрос с вложенными связями ---

    // Определяем тип для данных, которые возвращает Prisma
    const includeAttributes = {
      product_variant_attribute: {
        include: {
          value: {
            select: {
              id: true,
              value: true,
              attribute: {
                select: {
                  id: true,
                  name: true,
                  key: true,
                },
              },
            },
          },
        },
      },
      // Включаем другие нужные связи
      product: true,
      currency: true,
    };

    const [rawVariants, total] = await Promise.all([
      client.productVariant.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: includeAttributes,
      }),
      client.productVariant.count({ where }),
    ]);

    // --- 2. Трансформация данных (Маппинг) ---

    const transformedData: CleanProductVariant[] = rawVariants.map(variant => {
      // 2.1. Создаем "плоский" массив атрибутов
      const attributes: CleanAttribute[] = variant.product_variant_attribute.map(pva => ({
        key: pva.value.attribute.key,
        name: pva.value.attribute.name,
        value: pva.value.value,
      }));

      // 2.2. Удаляем сложный и ненужный массив Prisma
      // Создаем новый объект, исключая 'product_variant_attribute'
      // Используем деструктуризацию для исключения поля
      const { product_variant_attribute, ...restOfVariant } = variant;

      // 2.3. Возвращаем очищенный объект
      return {
        ...restOfVariant,
        attributes, // Добавляем новый, чистый массив атрибутов
      } as CleanProductVariant;
    });

    // --- 3. Возвращаем финальный ответ ---

    return {
      data: transformedData,
      total,
      page,
      limit
    };
  }

  async findOne(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const variant = await client.productVariant.findUnique({
      where: { id },
      include: { product: true, currency: true },
    });

    if (!variant) throw new NotFoundException('Вариант товара не найден');
    return variant;
  }

  async update(tenant: Tenant, id: string, dto: UpdateProductVariantDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const exists = await client.productVariant.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('Вариант товара не найден');

    return client.productVariant.update({ where: { id }, data: dto });
  }

  async remove(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const exists = await client.productVariant.findUnique({ where: { id } });

    if (!exists) throw new NotFoundException('Вариант товара не найден');

    await client.productVariant.delete({ where: { id } });
    return { message: 'Вариант успешно удалён' };
  }
}
