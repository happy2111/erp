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
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { GetAttributeQueryDto } from './dto/get-attribute-query.dto';

@Injectable()
export class AttributeService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}

  async getAllAdmin(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    query: GetAttributeQueryDto,
  ): Promise<{ items: any[]; total: number }> {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const {
      search,
      sortField = 'name',
      order = 'asc',
      page = 1,
      limit = 10,
    } = query;

    const where: Prisma.AttributeWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { key: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    // В будущем здесь можно добавить: organizationId: user.orgId

    const [items, total] = await Promise.all([
      client.attribute.findMany({
        where,
        include: {
          values: {
            orderBy: { value: 'asc' },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortField]: order },
      }),
      client.attribute.count({ where }),
    ]);

    return { items, total };
  }

  async getByIdAdmin(tenant: Tenant, user: JwtAuthenticatedUser, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const attribute = await client.attribute.findUnique({
      where: { id },
      include: {
        values: {
          orderBy: { value: 'asc' },
        },
      },
    });

    if (!attribute) {
      throw new NotFoundException('Характеристика не найдена');
    }

    // В будущем: проверка organizationId

    return attribute;
  }

  async create(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    dto: CreateAttributeDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const existing = await client.attribute.findFirst({
      where: {
        OR: [{ key: dto.key }, { name: dto.name }],
      },
    });

    if (existing) {
      throw new ConflictException(
        `Характеристика с ключом "${dto.key}" или названием "${dto.name}" уже существует`,
      );
    }

    return client.attribute.create({
      data: {
        key: dto.key,
        name: dto.name,
        // organizationId: user.orgId,  ← добавить при необходимости
      },
    });
  }

  async update(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    id: string,
    dto: UpdateAttributeDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const attribute = await client.attribute.findUnique({ where: { id } });

    if (!attribute) {
      throw new NotFoundException('Характеристика не найдена');
    }

    if (dto.key || dto.name || dto.isRequired) {
      const conflict = await client.attribute.findFirst({
        where: {
          OR: [
            dto.key ? { key: dto.key } : {},
            dto.name ? { name: dto.name } : {},
            dto.isRequired !== null ? { isRequired: dto.isRequired } : {},
          ],
          id: { not: id },
        },
      });

      if (conflict) {
        throw new ConflictException(
          `Характеристика с ключом "${dto.key || attribute.key}" или названием "${
            dto.name || attribute.name
          }" уже существует`,
        );
      }
    }

    return client.attribute.update({
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

    const attribute = await client.attribute.findUnique({
      where: { id },
      include: {
        _count: {
          select: { values: true },
        },
      },
    });

    if (!attribute) {
      throw new NotFoundException('Характеристика не найдена');
    }

    if (attribute._count.values > 0) {
      throw new BadRequestException(
        'Нельзя удалить характеристику — существуют связанные значения',
      );
    }

    await client.attribute.delete({ where: { id } });
  }
}
