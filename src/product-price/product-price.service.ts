import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { Prisma, PriceType, CustomerType } from '.prisma/client-tenant';
import { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';
import { CreateProductPriceDto } from './dto/create-product-price.dto';
import { UpdateProductPriceDto } from './dto/update-product-price.dto';
import { GetProductPriceQueryDto } from './dto/get-product-price-query.dto';

@Injectable()
export class ProductPricesService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}

  async getAllAdmin(
    tenant: Tenant,
    orgId: string,
    query: GetProductPriceQueryDto,
  ): Promise<{ items: any[]; total: number }> {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const {
      productId,
      priceType,
      customerType,
      sortField = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.ProductPriceWhereInput = {
      // Важно: цены только своей организации (или общие, если organizationId null)
      OR: [{ organizationId: orgId }, { organizationId: null }],
    };

    if (productId) where.productId = productId;
    if (priceType) where.priceType = priceType;
    if (customerType) where.customerType = customerType;

    const [items, total] = await Promise.all([
      client.productPrice.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, code: true } },
          currency: { select: { id: true, code: true, name: true } },
          organization: { select: { id: true, name: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortField]: order },
      }),
      client.productPrice.count({ where }),
    ]);

    return { items, total };
  }

  async getByIdAdmin(tenant: Tenant, orgId: string, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const price = await client.productPrice.findFirst({
      where: {
        id,
        OR: [{ organizationId: orgId }, { organizationId: null }],
      },
      include: {
        product: { select: { id: true, name: true, code: true } },
        currency: { select: { id: true, code: true, name: true } },
        organization: { select: { id: true, name: true } },
      },
    });

    if (!price) {
      throw new NotFoundException(
        'Цена не найдена или принадлежит другой организации',
      );
    }

    return price;
  }

  async create(tenant: Tenant, orgId: string, dto: CreateProductPriceDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // Если передан organizationId — он должен совпадать с текущей организацией
    if (dto.organizationId && dto.organizationId !== orgId) {
      throw new ForbiddenException(
        'Нельзя создавать цену для чужой организации',
      );
    }

    // Проверка существования товара
    const product = await client.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException(`Товар ${dto.productId} не найден`);
    }

    // Проверка существования валюты
    const currency = await client.currency.findUnique({
      where: { id: dto.currencyId },
    });

    if (!currency) {
      throw new NotFoundException(`Валюта ${dto.currencyId} не найдена`);
    }

    // Можно добавить проверку уникальности комбинации (productId + priceType + customerType + currencyId + organizationId)

    return client.productPrice.create({
      data: {
        productId: dto.productId,
        organizationId: dto.organizationId || orgId, // если не указан — привязываем к текущей
        priceType: dto.priceType,
        amount: dto.amount, // строка → Prisma сама сконвертирует в Decimal
        currencyId: dto.currencyId,
        customerType: dto.customerType,
      },
    });
  }

  async update(
    tenant: Tenant,
    orgId: string,
    id: string,
    dto: UpdateProductPriceDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const existing = await client.productPrice.findFirst({
      where: {
        id,
        OR: [{ organizationId: orgId }, { organizationId: null }],
      },
    });

    if (!existing) {
      throw new NotFoundException(
        'Цена не найдена или принадлежит другой организации',
      );
    }

    // Если меняем organizationId — проверяем право
    if (dto.organizationId && dto.organizationId !== orgId) {
      throw new ForbiddenException('Нельзя привязать цену к чужой организации');
    }

    return client.productPrice.update({
      where: { id },
      data: dto,
    });
  }

  async hardDelete(tenant: Tenant, orgId: string, id: string): Promise<void> {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const price = await client.productPrice.findFirst({
      where: {
        id,
        OR: [{ organizationId: orgId }, { organizationId: null }],
      },
    });

    if (!price) {
      throw new NotFoundException(
        'Цена не найдена или принадлежит другой организации',
      );
    }

    await client.productPrice.delete({ where: { id } });
  }
}
