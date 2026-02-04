import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { Prisma, ProductAction, ProductStatus } from '.prisma/client-tenant';
import { ProductTransactionsService } from '../product-transactions/product-transactions.service';
import { CreateProductInstanceDto } from './dto/create-product-instance.dto';
import { UpdateProductInstanceDto } from './dto/update-product-instance.dto';
import { SellInstanceDto } from './dto/sell-instance.dto';
import { ReturnInstanceDto } from './dto/return-instance.dto';
import { TransferInstanceDto } from './dto/transfer-instance.dto';
import { ResellInstanceDto } from './dto/resell-instance.dto';
import { MarkLostDto } from './dto/mark-lost.dto';
import { FindAllProductInstanceDto } from './dto/filter-instace.dto';

@Injectable()
export class ProductInstanceService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly productTransactionsService: ProductTransactionsService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // CREATE — создание нового экземпляра товара
  // ─────────────────────────────────────────────────────────────
  async create(
    tenant: Tenant,
    organizationId: string,
    dto: CreateProductInstanceDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // 1. Проверка уникальности серийного номера
    const existing = await client.productInstance.findUnique({
      where: { serialNumber: dto.serialNumber },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(
        'Экземпляр с таким серийным номером уже существует',
      );
    }

    // 2. Проверка варианта товара (если указан)
    if (dto.productVariantId) {
      const variant = await client.productVariant.findFirst({
        where: {
          id: dto.productVariantId,
          product: { organizationId },
        },
        select: { id: true },
      });
      if (!variant) {
        throw new BadRequestException(
          'Вариант товара не найден или принадлежит другой организации',
        );
      }
    }

    const status = dto.currentStatus ?? ProductStatus.IN_STOCK;

    return client.$transaction(async (tx) => {
      const instance = await tx.productInstance.create({
        data: {
          productVariantId: dto.productVariantId ?? null,
          serialNumber: dto.serialNumber,
          organizationId,
          currentOwnerId: dto.currentOwnerId ?? null,
          currentStatus: status,
        },
      });

      // Создаём транзакцию поступления
      await this.productTransactionsService.create(tx, organizationId, {
        productInstanceId: instance.id,
        action: ProductAction.PURCHASED,
        description: 'Создан новый экземпляр / поступление на склад',
      });

      return instance;
    });
  }
  async findAll(
    tenant: Tenant,
    organizationId: string,
    filter: FindAllProductInstanceDto = {},
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductInstanceWhereInput = {
      organizationId,
    };

    if (filter.productVariantId) {
      where.productVariantId = filter.productVariantId;
    }

    if (filter.serialNumber) {
      where.serialNumber = {
        contains: filter.serialNumber,
        mode: 'insensitive',
      };
    }

    if (filter.status) {
      where.currentStatus = filter.status;
    }

    if (filter.currentOwnerId) {
      where.currentOwnerId = filter.currentOwnerId;
    }

    const [data, total] = await Promise.all([
      client.productInstance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          productVariant: {
            include: {
              product: { select: { id: true, name: true, code: true } },
            },
          },
          current_owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          transactions: {
            orderBy: { date: 'desc' },
            take: 5,
            include: {
              // можно добавить from/to если нужно
            },
          },
        },
      }),
      client.productInstance.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // FIND ONE — детальная информация по экземпляру
  // ─────────────────────────────────────────────────────────────
  async findOne(tenant: Tenant, organizationId: string, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const instance = await client.productInstance.findFirst({
      where: {
        id,
        organizationId, // Важно для безопасности, чтобы не увидеть чужой товар
      },
      include: {
        // Данные о самом товаре
        productVariant: {
          include: {
            product: true, // Название, описание базового товара
          },
        },
        // Текущий владелец (если продан)
        current_owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        // Полная история перемещений
        transactions: {
          orderBy: { date: 'desc' },
          include: {
            from_customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            to_customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!instance) {
      throw new NotFoundException('Экземпляр товара не найден');
    }

    return instance;
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE — обновление экземпляра
  // ─────────────────────────────────────────────────────────────
  async update(
    tenant: Tenant,
    organizationId: string,
    id: string,
    dto: UpdateProductInstanceDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const existing = await client.productInstance.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Экземпляр товара не найден');

    if (dto.productVariantId) {
      const variant = await client.productVariant.findFirst({
        where: { id: dto.productVariantId, product: { organizationId } },
      });
      if (!variant)
        throw new BadRequestException(
          'Вариант товара не найден или принадлежит другой организации',
        );
    }

    return client.$transaction(async (tx) => {
      const updated = await tx.productInstance.update({
        where: { id },
        data: {
          productVariantId: dto.productVariantId ?? existing.productVariantId,
          currentStatus: dto.currentStatus ?? existing.currentStatus,
          currentOwnerId: dto.currentOwnerId ?? existing.currentOwnerId,
        },
      });

      // Если изменился статус — логируем транзакцию
      if (dto.currentStatus && dto.currentStatus !== existing.currentStatus) {
        const action = this.mapStatusToAction(dto.currentStatus);
        await this.productTransactionsService.create(tx, organizationId, {
          productInstanceId: id,
          action,
          description: `Статус изменён: ${existing.currentStatus} → ${dto.currentStatus}`,
        });
      }

      return updated;
    });
  }

  async remove(tenant: Tenant, organizationId: string, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const existing = await client.productInstance.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Экземпляр товара не найден');

    return client.$transaction(async (tx) => {
      await this.productTransactionsService.create(tx, organizationId, {
        productInstanceId: id,
        action: ProductAction.TRANSFERRED, // или добавить ProductAction.DELETED
        description: 'Экземпляр удалён из системы',
      });

      return tx.productInstance.delete({ where: { id } });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // SELL — продажа экземпляра
  // ─────────────────────────────────────────────────────────────
  async sell(tenant: Tenant, organizationId: string, dto: SellInstanceDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const instance = await client.productInstance.findFirst({
      where: { id: dto.instanceId, organizationId },
    });
    if (!instance) throw new NotFoundException('Экземпляр товара не найден');

    if (instance.currentStatus === ProductStatus.SOLD) {
      throw new BadRequestException('Товар уже продан');
    }

    return client.$transaction(async (tx) => {
      const updated = await tx.productInstance.update({
        where: { id: dto.instanceId },
        data: {
          currentOwnerId: dto.customerId,
          currentStatus: ProductStatus.SOLD,
        },
      });

      await this.productTransactionsService.create(tx, organizationId, {
        productInstanceId: dto.instanceId,
        fromCustomerId: instance.currentOwnerId ?? null,
        toCustomerId: dto.customerId,
        saleId: dto.saleId ?? null,
        action: ProductAction.SOLD,
        description: dto.description ?? 'Продажа клиенту',
      });

      return updated;
    });
  }

  async return(tenant: Tenant, organizationId: string, dto: ReturnInstanceDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const instance = await client.productInstance.findFirst({
      where: { id: dto.instanceId, organizationId },
    });
    if (!instance) throw new NotFoundException('Экземпляр товара не найден');

    return client.$transaction(async (tx) => {
      const updated = await tx.productInstance.update({
        where: { id: dto.instanceId },
        data: {
          currentOwnerId: null,
          currentStatus: ProductStatus.RETURNED,
          organizationId: dto.toOrganizationId ?? instance.organizationId,
        },
      });

      await this.productTransactionsService.create(tx, organizationId, {
        productInstanceId: dto.instanceId,
        fromCustomerId: dto.fromCustomerId ?? instance.currentOwnerId ?? null,
        toCustomerId: null,
        toOrganizationId: dto.toOrganizationId ?? instance.organizationId,
        action: ProductAction.RETURNED,
        description: dto.description ?? 'Возврат от клиента',
      });

      return updated;
    });
  }

  async transfer(
    tenant: Tenant,
    organizationId: string,
    dto: TransferInstanceDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const instance = await client.productInstance.findFirst({
      where: { id: dto.instanceId, organizationId },
    });
    if (!instance) throw new NotFoundException('Экземпляр товара не найден');

    if (instance.organizationId === dto.toOrganizationId) {
      throw new BadRequestException('Целевая организация совпадает с текущей');
    }

    return client.$transaction(async (tx) => {
      const updated = await tx.productInstance.update({
        where: { id: dto.instanceId },
        data: { organizationId: dto.toOrganizationId },
      });

      await this.productTransactionsService.create(tx, organizationId, {
        productInstanceId: dto.instanceId,
        action: ProductAction.TRANSFERRED,
        toOrganizationId: dto.toOrganizationId,
        description: dto.description ?? 'Передача между организациями',
      });

      return updated;
    });
  }

  async resell(tenant: Tenant, organizationId: string, dto: ResellInstanceDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const instance = await client.productInstance.findFirst({
      where: { id: dto.instanceId, organizationId },
    });
    if (!instance) throw new NotFoundException('Экземпляр товара не найден');

    if (instance.currentStatus === ProductStatus.LOST) {
      throw new BadRequestException('Нельзя перепродать списанный товар');
    }

    return client.$transaction(async (tx) => {
      const updated = await tx.productInstance.update({
        where: { id: dto.instanceId },
        data: {
          currentOwnerId: dto.newCustomerId,
          currentStatus: ProductStatus.SOLD,
        },
      });

      await this.productTransactionsService.create(tx, organizationId, {
        productInstanceId: dto.instanceId,
        toCustomerId: dto.newCustomerId,
        saleId: dto.saleId ?? null,
        action: ProductAction.RESOLD,
        description: dto.description ?? 'Перепродажа после возврата/ремонта',
      });

      return updated;
    });
  }

  async markLost(tenant: Tenant, organizationId: string, dto: MarkLostDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const instance = await client.productInstance.findFirst({
      where: { id: dto.instanceId, organizationId },
    });
    if (!instance) throw new NotFoundException('Экземпляр товара не найден');

    return client.$transaction(async (tx) => {
      const updated = await tx.productInstance.update({
        where: { id: dto.instanceId },
        data: {
          currentStatus: ProductStatus.LOST,
          currentOwnerId: null,
        },
      });

      await this.productTransactionsService.create(tx, organizationId, {
        productInstanceId: dto.instanceId,
        action: ProductAction.TRANSFERRED, // можно добавить ProductAction.LOST
        description: dto.description ?? 'Списан / утерян',
      });

      return updated;
    });
  }

  private mapStatusToAction(status: ProductStatus): ProductAction {
    switch (status) {
      case ProductStatus.SOLD:
        return ProductAction.SOLD;
      case ProductStatus.RETURNED:
        return ProductAction.RETURNED;
      case ProductStatus.LOST:
        return ProductAction.TRANSFERRED;
      default:
        return ProductAction.TRANSFERRED;
    }
  }
}
