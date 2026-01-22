import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/filter-product.dto';
import { Prisma } from '.prisma/client-tenant';
import { CodeGeneratorService } from '../code-generater/code-generater.service';
import { S3Service } from '../s3/s3.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly codeGenerator: CodeGeneratorService,
    private readonly s3Service: S3Service,
  ) {}

  async create(tenant: Tenant, dto: CreateProductDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const generatedCode = await this.codeGenerator.generateNextCode(tenant, {
      prefix: 'PRD',
      modelName: 'product',
      sequenceLength: 4,
    });

    return client.product.create({
      data: {
        ...dto,
        code: generatedCode,
      },
    });
  }

  async findAll(tenant: Tenant, filter: ProductFilterDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const { search, page = 1, limit = 10 } = filter;

    const where: Prisma.ProductWhereInput = {};
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const includeCategories = {
      categories: {
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      brand: true,
      variants: true,
      prices: true,
      images: {
        select: {
          id: true,
          key: true,
          isPrimary: true,
        },
      },
    };

    // Получаем данные продуктов и общее количество
    const [data, total] = await Promise.all([
      client.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: includeCategories,
      }),
      client.product.count({ where }),
    ]);

    const transformedData = await Promise.all(
      data.map(async (product) => {
        // Категории
        const categories = product.categories.map((pc) => ({
          id: pc.categoryId,
          name: pc.category.name,
        }));

        // Генерация публичных URL для изображений
        const images = await Promise.all(
          product.images.map(async (img) => ({
            id: img.id,
            isPrimary: img.isPrimary,
            key: img.key,
            url: await this.s3Service.getDownloadUrl(img.key, 3600), // <- await!
          })),
        );

        const { categories: _drop, images: _dropImages, ...rest } = product;

        return {
          ...rest,
          categories,
          images,
        };
      }),
    );

    return {
      data: transformedData,
      total,
      page,
      limit,
    };
  }

  async findOne(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const product = await client.product.findUnique({
      where: { id },
      include: { brand: true, categories: true, prices: true },
    });

    if (!product) throw new NotFoundException('Товар не найден');
    return product;
  }

  async update(tenant: Tenant, id: string, dto: UpdateProductDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const existing = await client.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Товар не найден');

    return client.product.update({
      where: { id },
      data: dto,
    });
  }

  async remove(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const product = await client.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Товар не найден');

    try {
      return client.product.delete({ where: { id } });
    } catch {
      throw new ConflictException(
        'Невозможно удалить товар — есть связанные записи',
      );
    }
  }
}
