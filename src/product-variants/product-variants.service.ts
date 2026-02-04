import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { Prisma } from '.prisma/client-tenant';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { GetProductVariantQueryDto } from './dto/get-product-variant-query.dto';
import { S3Service } from '../s3/s3.service';

export interface CleanAttribute {
  key: string;
  name: string;
  value: string;
}

export interface CleanProductVariant {
  id: string;
  productId: string;
  sku?: string | null;
  barcode?: string | null;
  title: string;
  defaultPrice?: number | null;
  currencyId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  attributes: CleanAttribute[];
}

@Injectable()
export class ProductVariantsService {
  constructor(private readonly prismaTenant: PrismaTenantService,
    private readonly s3Service: S3Service,
  ) {}

  async getAllAdmin(
    tenant: Tenant,
    orgId: string,
    query: GetProductVariantQueryDto,
  ): Promise<{ items: any[]; total: number }> {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const {
      search,
      productId,
      sortField = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.ProductVariantWhereInput = {
      product: {
        organizationId: orgId, // строго своя организация
      },
    };

    if (productId) where.productId = productId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [rawVariants, total] = await Promise.all([
      client.productVariant.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortField]: order },
        include: {
          product_variant_attribute: {
            include: {
              value: {
                include: {
                  attribute: true,
                },
              },
            },
          },
          product: { select: { id: true, name: true, code: true } },
          currency: true,
          images: true,
        },
      }),
      client.productVariant.count({ where }),
    ]);

    const transformed = await Promise.all(
      rawVariants.map(async (v) => {
        // 1. Shu variantga tegishli atributlarni tozalash
        const attributes = v.product_variant_attribute.map((pva) => ({
          key: pva.value.attribute.key,
          name: pva.value.attribute.name,
          value: pva.value.value,
        }));

        const images = await Promise.all(
          v.images.map(async (img) => ({
            id: img.id,
            isPrimary: img.isPrimary,
            key: img.key,
            url: await this.s3Service.getDownloadUrl(img.key, 3600),
          })),
        );

        const { product_variant_attribute, ...rest } = v;

        return {
          ...rest,
          attributes,
          images,
        };
      }),
    );

    return { items: transformed, total };
  }

  async getByIdAdmin(tenant: Tenant, orgId: string, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const variant = await client.productVariant.findFirst({
      where: {
        id,
        product: { organizationId: orgId },
      },
      include: {
        product_variant_attribute: {
          include: {
            value: {
              include: {
                attribute: true,
              },
            },
          },
        },
        product: { select: { id: true, name: true, code: true } },
        currency: true,
        images: true,
        product_instance: true,
        product_batches: true,
        purchase_items: true,
        sele_items: true,
        return_items: true,
      },
    });

    if (!variant) {
      throw new NotFoundException(
        'Вариант товара не найден или принадлежит другой организации',
      );
    }

    const attributes: CleanAttribute[] = variant.product_variant_attribute.map(
      (pva) => ({
        key: pva.value.attribute.key,
        name: pva.value.attribute.name,
        value: pva.value.value,
      }),
    );

    const { product_variant_attribute, ...rest } = variant;

    return {
      ...rest,
      attributes,
    } as CleanProductVariant;
  }

  async getVariantsByProduct(
    tenant: Tenant,
    orgId: string,
    productId: string,
  ): Promise<CleanProductVariant[]> {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // Проверяем, что товар принадлежит текущей организации
    const productExists = await client.product.findFirst({
      where: {
        id: productId,
        organizationId: orgId,
      },
    });

    if (!productExists) {
      throw new NotFoundException(
        'Товар не найден или принадлежит другой организации',
      );
    }

    const variants = await client.productVariant.findMany({
      where: { productId },
      include: {
        product_variant_attribute: {
          include: {
            value: {
              include: { attribute: true },
            },
          },
        },
        currency: true,
      },
      orderBy: { title: 'asc' },
    });

    return variants.map((v) => {
      const attributes = v.product_variant_attribute.map((pva) => ({
        key: pva.value.attribute.key,
        name: pva.value.attribute.name,
        value: pva.value.value,
      }));

      const { product_variant_attribute, ...rest } = v;

      return {
        ...rest,
        attributes,
      } as CleanProductVariant;
    });
  }

  async create(tenant: Tenant, orgId: string, dto: CreateProductVariantDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const product = await client.product.findFirst({
      where: {
        id: dto.productId,
        organizationId: orgId,
      },
    });

    if (!product) {
      throw new ForbiddenException(
        'Товар не найден или принадлежит другой организации',
      );
    }

    // 1. Обязательно используем эти переменные дальше!
    const sku = dto.sku?.trim() || null;
    const barcode = dto.barcode?.trim() || null;

    const conditions: Prisma.ProductVariantWhereInput[] = [];
    if (sku) conditions.push({ sku }); // Используем переменную sku
    if (barcode) conditions.push({ barcode }); // Используем переменную barcode

    if (conditions.length > 0) {
      const conflict = await client.productVariant.findFirst({
        where: {
          OR: conditions,
        },
      });

      if (conflict) {
        throw new ConflictException(
          'Вариант с таким SKU или штрихкодом уже существует',
        );
      }
    }

    return client.productVariant.create({
      data: {
        productId: dto.productId,
        sku, // Записываем null, если была пустая строка
        barcode, // Записываем null, если была пустая строка
        title: dto.title,
        defaultPrice: dto.defaultPrice,
        currencyId: dto.currencyId,
      },
    });
  }

  async update(
    tenant: Tenant,
    orgId: string,
    id: string,
    dto: UpdateProductVariantDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // 1. Проверяем существование и права доступа
    const existing = await client.productVariant.findFirst({
      where: {
        id,
        product: { organizationId: orgId },
      },
    });

    if (!existing) {
      throw new NotFoundException(
        'Вариант не найден или принадлежит другой организации',
      );
    }




    // 2. Обработка пустых строк (превращаем в null)
    // Мы проверяем undefined, чтобы не затереть данные в null, если поле вообще не пришло в PATCH-запросе
    const sku = dto.sku !== undefined ? dto.sku?.trim() || null : undefined;
    const barcode =
      dto.barcode !== undefined ? dto.barcode?.trim() || null : undefined;

    // 3. Проверка уникальности нового SKU / barcode
    const conditions: Prisma.ProductVariantWhereInput[] = [];
    if (sku) conditions.push({ sku });
    if (barcode) conditions.push({ barcode });

    if (conditions.length > 0) {
      const conflict = await client.productVariant.findFirst({
        where: {
          OR: conditions,
          NOT: { id }, // Исключаем текущую запись из поиска
        },
      });

      if (conflict) {
        throw new ConflictException(
          'Вариант с таким SKU или штрихкодом уже существует',
        );
      }
    }

    // 4. Обновление
    return client.productVariant.update({
      where: { id },
      data: {
        ...dto,
        ...(sku !== undefined && { sku }), // Обновляем только если передано
        ...(barcode !== undefined && { barcode }), // Обновляем только если передано
      },
    });
  }

  async hardDelete(tenant: Tenant, orgId: string, id: string): Promise<void> {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const variant = await client.productVariant.findFirst({
      where: { id, product: { organizationId: orgId } },
      include: {
        _count: {
          select: {
            product_instance: true, // SetNull - опасно для аналитики
            product_batches: true, // Вероятно, Restrict
            purchase_items: true, // Финансовые документы (обычно Restrict)
            sele_items: true, // Продажи (точно Restrict)
            return_items: true, // Restrict
          },
        },
      },
    });

    if (!variant) {
      throw new NotFoundException('Вариант не найден');
    }

    const hasLinks = Object.values(variant._count).some((count) => count > 0);

    if (hasLinks) {
      throw new BadRequestException(
        "Siz variantni o'chira olmaysiz: u operatsiyalarda (savdo, xarid yoki qoldiq) ishtirok etadi.",
      );
    }

    await client.productVariant.delete({ where: { id } });
  }
}
