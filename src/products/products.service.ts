import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { Prisma } from '.prisma/client-tenant';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetProductQueryDto } from './dto/get-product-query.dto';
import { CodeGeneratorService } from '../code-generater/code-generater.service';
import { S3Service } from '../s3/s3.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly codeGenerator: CodeGeneratorService,
    private readonly s3Service: S3Service,
  ) {}

  async getAllAdmin(
    tenant: Tenant,
    orgId: string,
    query: GetProductQueryDto,
  ): Promise<{ items: any[]; total: number }> {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const {
      search,
      sortField = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.ProductWhereInput = {
      organizationId: orgId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      client.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortField]: order },
        include: {
          brand: { select: { id: true, name: true } },
          categories: {
            include: {
              category: { select: { id: true, name: true } },
            },
          },
          prices: true,
          images: {
            select: {
              id: true,
              key: true,
              isPrimary: true,
            },
          },
          variants: {
            include: {
              images: true,
            },
          },
        },
      }),
      client.product.count({ where }),
    ]);

    // Преобразование изображений (генерация публичных URL)
    const transformedData = await Promise.all(
      data.map(async (product) => {
        const images = await Promise.all(
          product.images.map(async (img) => ({
            id: img.id,
            isPrimary: img.isPrimary,
            key: img.key,
            url: await this.s3Service.getDownloadUrl(img.key, 3600),
          })),
        );

        const categories = product.categories.map((pc) => ({
          id: pc.categoryId,
          name: pc.category.name,
        }));

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { categories: _, images: __, ...rest } = product;

        return {
          ...rest,
          categories,
          images,
        };
      }),
    );

    return { items: transformedData, total };
  }

  async getByIdAdmin(tenant: Tenant, orgId: string, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const product = await client.product.findFirst({
      where: {
        id,
        organizationId: orgId,
      },
      include: {
        brand: { select: { id: true, name: true } },
        categories: {
          include: {
            category: { select: { id: true, name: true } },
          },
        },
        prices: {
          include: {
            currency: {
              select: { symbol: true },
            },
          },
        },
        images: {
          select: {
            id: true,
            key: true,
            isPrimary: true,
          },
        },

        variants: {
          include: {
            images: true,
            currency: {
              select: {
                symbol: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(
        'Товар не найден или принадлежит другой организации',
      );
    }

    // Преобразование изображений
    const images = await Promise.all(
      product.images.map(async (img) => ({
        id: img.id,
        isPrimary: img.isPrimary,
        key: img.key,
        url: await this.s3Service.getDownloadUrl(img.key, 3600),
      })),
    );

    // 1. Map over each variant, then map over its images
    const variantImagesNested = await Promise.all(
      product.variants.map(async (variant) => {
        return Promise.all(
          variant.images.map(async (img) => ({
            id: img.id,
            variantId: variant.id, // Helpful to know which variant it belongs to
            isPrimary: img.isPrimary,
            key: img.key,
            url: await this.s3Service.getDownloadUrl(img.key, 3600),
          })),
        );
      }),
    );

    // 2. Flatten the array of arrays into a single list
    const variantImages = variantImagesNested.flat();

    const categories = product.categories.map((pc) => ({
      id: pc.categoryId,
      name: pc.category.name,
    }));

    const { categories: _, images: __, variants, ...rest } = product;

    const formattedVariants = variants.map(({ images, ...v }) => v);

    return {
      ...rest,
      categories,
      images,
      variantImages,
      variants: formattedVariants,
    };
  }

  async create(tenant: Tenant, orgId: string, dto: CreateProductDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // Генерация уникального кода
    const code = await this.codeGenerator.generateNextCode(tenant, {
      prefix: 'PRD',
      modelName: 'product',
      sequenceLength: 4,
    });

    // Проверка уникальности кода (на всякий случай)
    const codeExists = await client.product.findUnique({ where: { code } });
    if (codeExists) {
      throw new ConflictException('Сгенерированный код уже существует');
    }

    return client.product.create({
      data: {
        ...dto,
        code,
        organizationId: orgId, // берём из токена, НЕ из DTO
      },
    });
  }

  async update(
    tenant: Tenant,
    orgId: string,
    id: string,
    dto: UpdateProductDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const existing = await client.product.findFirst({
      where: {
        id,
        organizationId: orgId,
      },
    });

    if (!existing) {
      throw new NotFoundException(
        'Товар не найден или принадлежит другой организации',
      );
    }

    // Если пытаются обновить code — проверяем уникальность
    if (dto.code && dto.code !== existing.code) {
      const codeConflict = await client.product.findUnique({
        where: { code: dto.code },
      });
      if (codeConflict) {
        throw new ConflictException(
          `Товар с кодом "${dto.code}" уже существует`,
        );
      }
    }

    return client.product.update({
      where: { id },
      data: dto,
    });
  }

  async hardDelete(tenant: Tenant, orgId: string, id: string): Promise<void> {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const product = await client.product.findFirst({
      where: {
        id,
        organizationId: orgId,
      },
      include: {
        _count: {
          select: {
            variants: true,
            prices: true,
            images: true,
            categories: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(
        'Товар не найден или принадлежит другой организации',
      );
    }

    if (
      product._count.variants > 0 ||
      product._count.prices > 0 ||
      product._count.images > 0 ||
      product._count.categories > 0
    ) {
      throw new BadRequestException(
        'Невозможно удалить товар — существуют связанные записи (варианты, цены, изображения, категории)',
      );
    }

    await client.product.delete({ where: { id } });
  }
}
