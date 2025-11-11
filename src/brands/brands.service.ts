import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {PrismaTenantService} from "../prisma_tenant/prisma_tenant.service";
import {Prisma} from ".prisma/client-tenant";
import {Tenant} from "@prisma/client";
import {CreateBrandDto} from "./dto/create-brand.dto";
import { BrandFilterDto } from "./dto/filter-brand.dto";
import {UpdateBrandDto} from "./dto/update-brand.dto";

@Injectable()
export class BrandsService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}

  async create(tenant: Tenant, dto: CreateBrandDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const exists = await client.brand.findUnique({ where: { name: dto.name } });
    if (exists) {
      throw new ConflictException(`Бренд с именем "${dto.name}" уже существует`);
    }

    const brand = await client.brand.create({
      data: { name: dto.name },
    });

    return brand;
  }

  async findAll(tenant: Tenant, filter: BrandFilterDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const take = filter.limit;
    const skip = (filter.page - 1) * filter.limit;

    const where: Prisma.BrandWhereInput = {};

    if (filter.search) {
      where.name = {
        contains: filter.search,
        mode: 'insensitive',
      };
    }

    const [data, total] = await client.$transaction([
      client.brand.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      client.brand.count({ where }),
    ]);

    return {
      data,
      total,
      page: filter.page,
      limit: filter.limit,
    };
  }

  async findOne(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const brand = await client.brand.findUnique({
      where: { id },
      include: { products: true },
    });

    if (!brand) throw new NotFoundException('Бренд не найден');
    return brand;
  }

  async update(tenant: Tenant, id: string, dto: UpdateBrandDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const brand = await client.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('Бренд не найден');

    if (dto.name) {
      const existing = await client.brand.findUnique({ where: { name: dto.name } });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Бренд с именем "${dto.name}" уже существует`);
      }
    }

    return client.brand.update({
      where: { id },
      data: { ...dto },
    });
  }

  async remove(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const brand = await client.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('Бренд не найден');

    try {
      await client.brand.delete({ where: { id } });
      return { message: 'Бренд успешно удалён' };
    } catch (e: any) {
      if (e.code === 'P2003') {
        throw new BadRequestException('Невозможно удалить бренд: существуют связанные товары');
      }
      throw e;
    }
  }

}
