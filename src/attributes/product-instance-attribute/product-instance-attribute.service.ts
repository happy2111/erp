import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaTenantService } from '../../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { Prisma } from '.prisma/client-tenant';
import { JwtAuthenticatedUser } from '../../tenant-auth/interfaces/jwt.interface';
import { CreateProductInstanceAttributeDto } from './dto/create-product-instance-attribute.dto';
import { UpdateProductInstanceAttributeDto } from './dto/update-product-instance-attribute.dto';
import { GetProductInstanceAttributeQueryDto } from './dto/get-product-instance-attribute.dto';

@Injectable()
export class ProductInstanceAttributeService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}
  //
  // async getAllAdmin(
  //   tenant: Tenant,
  //   user: JwtAuthenticatedUser,
  //   query: GetProductInstanceAttributeQueryDto,
  // ): Promise<{ items: any[]; total: number }> {
  //   const client = this.prismaTenant.getTenantPrismaClient(tenant);
  //
  //   const {
  //     search,
  //     productInstanceId,
  //     attributeValueId,
  //     sortField = 'id',
  //     order = 'desc',
  //     page = 1,
  //     limit = 50,
  //   } = query;
  //
  //   const where: Prisma.ProductInstanceAttributeWhereInput = {};
  //
  //   if (search) {
  //     where.value = {
  //       value: { contains: search, mode: 'insensitive' },
  //     };
  //   }
  //
  //   if (productInstanceId) {
  //     where.productInstanceId = productInstanceId;
  //   }
  //
  //   if (attributeValueId) {
  //     where.attributeValueId = attributeValueId;
  //   }
  //
  //   const [items, total] = await Promise.all([
  //     client.productInstanceAttribute.findMany({
  //       where,
  //       include: {
  //         instance: {
  //           select: {
  //             id: true,
  //             serialNumber: true,
  //             productVariantId: true,
  //           },
  //         },
  //         value: {
  //           select: {
  //             id: true,
  //             value: true,
  //             attribute: {
  //               select: { id: true, key: true, name: true },
  //             },
  //           },
  //         },
  //       },
  //       skip: (page - 1) * limit,
  //       take: limit,
  //       orderBy: { [sortField]: order },
  //     }),
  //     client.productInstanceAttribute.count({ where }),
  //   ]);
  //
  //   return { items, total };
  // }
  //
  // async getByIdAdmin(tenant: Tenant, user: JwtAuthenticatedUser, id: string) {
  //   const client = this.prismaTenant.getTenantPrismaClient(tenant);
  //
  //   const link = await client.productInstanceAttribute.findUnique({
  //     where: { id },
  //     include: {
  //       instance: true,
  //       value: {
  //         include: { attribute: true },
  //       },
  //     },
  //   });
  //
  //   if (!link) {
  //     throw new NotFoundException(
  //       'Связь экземпляра товара и атрибута не найдена',
  //     );
  //   }
  //
  //   return link;
  // }
  //
  // async create(
  //   tenant: Tenant,
  //   user: JwtAuthenticatedUser,
  //   dto: CreateProductInstanceAttributeDto,
  // ) {
  //   const client = this.prismaTenant.getTenantPrismaClient(tenant);
  //
  //   const [instanceExists, valueExists] = await Promise.all([
  //     client.productInstance.findUnique({
  //       where: { id: dto.productInstanceId },
  //     }),
  //     client.attributeValue.findUnique({
  //       where: { id: dto.attributeValueId },
  //     }),
  //   ]);
  //
  //   if (!instanceExists) {
  //     throw new NotFoundException(
  //       `Экземпляр товара ${dto.productInstanceId} не найден`,
  //     );
  //   }
  //
  //   if (!valueExists) {
  //     throw new NotFoundException(
  //       `Значение атрибута ${dto.attributeValueId} не найдено`,
  //     );
  //   }
  //
  //   const exists = await client.productInstanceAttribute.findUnique({
  //     where: {
  //       productInstanceId_attributeValueId: {
  //         productInstanceId: dto.productInstanceId,
  //         attributeValueId: dto.attributeValueId,
  //       },
  //     },
  //   });
  //
  //   if (exists) {
  //     throw new ConflictException(
  //       'Эта связь экземпляра и значения атрибута уже существует',
  //     );
  //   }
  //
  //   return client.productInstanceAttribute.create({
  //     data: {
  //       productInstanceId: dto.productInstanceId,
  //       attributeValueId: dto.attributeValueId,
  //     },
  //   });
  // }
  //
  // async update(
  //   tenant: Tenant,
  //   user: JwtAuthenticatedUser,
  //   id: string,
  //   dto: UpdateProductInstanceAttributeDto,
  // ) {
  //   const client = this.prismaTenant.getTenantPrismaClient(tenant);
  //
  //   const existing = await client.productInstanceAttribute.findUnique({
  //     where: { id },
  //   });
  //
  //   if (!existing) {
  //     throw new NotFoundException('Связь не найдена');
  //   }
  //
  //   if (dto.productInstanceId || dto.attributeValueId) {
  //     const newInstanceId = dto.productInstanceId ?? existing.productInstanceId;
  //     const newValueId = dto.attributeValueId ?? existing.attributeValueId;
  //
  //     const conflict = await client.productInstanceAttribute.findUnique({
  //       where: {
  //         productInstanceId_attributeValueId: {
  //           productInstanceId: newInstanceId,
  //           attributeValueId: newValueId,
  //         },
  //       },
  //     });
  //
  //     if (conflict && conflict.id !== id) {
  //       throw new ConflictException('Такая связь уже существует');
  //     }
  //
  //     if (dto.productInstanceId) {
  //       const instance = await client.productInstance.findUnique({
  //         where: { id: dto.productInstanceId },
  //       });
  //       if (!instance) throw new NotFoundException('Новый экземпляр не найден');
  //     }
  //
  //     if (dto.attributeValueId) {
  //       const value = await client.attributeValue.findUnique({
  //         where: { id: dto.attributeValueId },
  //       });
  //       if (!value)
  //         throw new NotFoundException('Новое значение атрибута не найдено');
  //     }
  //   }
  //
  //   return client.productInstanceAttribute.update({
  //     where: { id },
  //     data: dto,
  //   });
  // }
  //
  // async hardDelete(
  //   tenant: Tenant,
  //   user: JwtAuthenticatedUser,
  //   id: string,
  // ): Promise<void> {
  //   const client = this.prismaTenant.getTenantPrismaClient(tenant);
  //
  //   const link = await client.productInstanceAttribute.findUnique({
  //     where: { id },
  //   });
  //
  //   if (!link) {
  //     throw new NotFoundException('Связь не найдена');
  //   }
  //
  //   await client.productInstanceAttribute.delete({
  //     where: { id },
  //   });
  // }
}
