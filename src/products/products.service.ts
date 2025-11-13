import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFilterDto } from './dto/filter-product.dto';
import { Prisma } from '.prisma/client-tenant';
import {CodeGeneratorService} from "../code-generater/code-generater.service";

@Injectable()
export class ProductsService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly codeGenerator: CodeGeneratorService
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

    const [data, total] = await Promise.all([
      client.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          variants: true
        }
      }),
      client.product.count({ where }),
    ]);

    return { data, total, page, limit };
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
      throw new ConflictException('Невозможно удалить товар — есть связанные записи');
    }
  }
}
