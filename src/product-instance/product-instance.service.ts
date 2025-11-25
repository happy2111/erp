// product-instance.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import type { Tenant } from '@prisma/client';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { ProductTransactionService } from '../product-transaction/product-transaction.service';
import { ProductAction, ProductStatus } from '.prisma/client-tenant';
import { UpdateProductInstanceDto } from "./dto/update-product-instance.dto";
import {SellInstanceDto} from "./dto/sell-instance.dto";
import {ReturnInstanceDto} from "./dto/return-instance.dto";
import { TransferInstanceDto} from "./dto/transfer-instance.dto";
import { ResellInstanceDto }  from './dto/resell-instance.dto';
import { MarkLostDto } from "./dto/mark-lost.dto";
import { CreateProductInstanceDto} from "./dto/create-producti-instance.dto";
import {FindAllProductInstanceDto} from "./dto/filter-instace.dto";


@Injectable()
export class ProductInstanceService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly transactionService: ProductTransactionService,
  ) {}

  // -------------------------
  // CREATE
  // -------------------------
  async create(tenant: Tenant, dto: CreateProductInstanceDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // validate serial uniqueness (redundant if db has unique constraint, but nicer error)
    const existingBySN = await client.productInstance.findUnique({
      where: { serialNumber: dto.serialNumber },
      select: { id: true },
    });
    if (existingBySN) {
      throw new ConflictException('Instance with this serialNumber already exists');
    }

    // validate variant -> product -> organization if provided
    if (dto.productVariantId) {
      await this.ensureVariantAndOrg(client, dto.productVariantId, dto.organizationId);
    }

    const status = dto.currentStatus ?? ProductStatus.IN_STOCK;

    const result = await client.$transaction(async (tx) => {
      const instance = await tx.productInstance.create({
        data: {
          productVariantId: dto.productVariantId ?? null,
          serialNumber: dto.serialNumber,
          organizationId: dto.organizationId,
          currentOwnerId: dto.currentOwnerId ?? null,
          currentStatus: status,
        },
      });

      // create transaction: PURCHASED / ADDED
      await this.transactionService.create(tx, {
        productInstanceId: instance.id,
        fromCustomerId: null,
        toCustomerId: dto.currentOwnerId ?? null,
        toOrganizationId: dto.organizationId,
        saleId: null,
        action: ProductAction.PURCHASED,
        description: 'Instance created/added to inventory',
      });

      return instance;
    });

    return result;
  }


  async findAll(
    tenant: Tenant,
    // 1. Изменяем тип второго аргумента на DTO
    filter: FindAllProductInstanceDto = {},
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 10; // Исправлено на 10, как в DTO по умолчанию
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filter.productVariantId) where.productVariantId = filter.productVariantId;

    if (filter.serialNumber) where.serialNumber = { contains: filter.serialNumber, mode: 'insensitive' };

    if (filter.status) where.currentStatus = filter.status;

    if (filter.currentOwnerId) where.currentOwnerId = filter.currentOwnerId;
    if (filter.organizationId) where.organizationId = filter.organizationId;

    const [data, total] = await Promise.all([
      client.productInstance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          productVariant: { include: { product: true } },
          current_owner: true,
          transactions: { orderBy: { date: 'desc' } },
        },
      }),
      client.productInstance.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
    };
  }


  async findOne(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const instance = await client.productInstance.findUnique({
      where: { id },
      include: {
        productVariant: { include: { product: true } },
        current_owner: true,
        transactions: { orderBy: { date: 'desc' } },
      },
    });

    if (!instance) throw new NotFoundException('ProductInstance not found');
    return instance;
  }


  async update(tenant: Tenant, id: string, dto: UpdateProductInstanceDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const existing = await client.productInstance.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('ProductInstance not found');

    if (dto.productVariantId) {
      await this.ensureVariantAndOrg(client, dto.productVariantId, existing.organizationId);
    }

    const updated = await client.$transaction(async (tx) => {
      const res = await tx.productInstance.update({
        where: { id },
        data: {
          productVariantId: dto.productVariantId ?? existing.productVariantId,
          currentStatus: dto.currentStatus ?? existing.currentStatus,
        },
      });

      // create transaction if status changed
      if (dto.currentStatus && dto.currentStatus !== existing.currentStatus) {
        const action = this.mapStatusToAction(dto.currentStatus);
        await this.transactionService.create(tx, {
          productInstanceId: id,
          action,
          description: `Status changed: ${existing.currentStatus} -> ${dto.currentStatus}`,
        });
      }

      return res;
    });

    return updated;
  }


  async delete(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const existing = await client.productInstance.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('ProductInstance not found');

    const res = await client.$transaction(async (tx) => {
      // optionally create a "deleted" transaction record (audit)
      await this.transactionService.create(tx, {
        productInstanceId: id,
        action: ProductAction.TRANSFERRED, // reuse TRANSFERRED or choose special action if you have
        description: 'Instance deleted from system',
      });

      return tx.productInstance.delete({ where: { id } });
    });

    return res;
  }


  async sell(tenant: Tenant, dto: SellInstanceDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const instance = await client.productInstance.findUnique({ where: { id: dto.instanceId } });
    if (!instance) throw new NotFoundException('ProductInstance not found');

    if (instance.currentStatus === ProductStatus.SOLD) {
      throw new BadRequestException('Instance is already sold');
    }

    const res = await client.$transaction(async (tx) => {
      // update owner & status
      const updated = await tx.productInstance.update({
        where: { id: dto.instanceId },
        data: {
          currentOwnerId: dto.customerId,
          currentStatus: ProductStatus.SOLD,
        },
      });

      // create transaction
      await this.transactionService.create(tx, {
        productInstanceId: dto.instanceId,
        fromCustomerId: instance.currentOwnerId ?? null,
        toCustomerId: dto.customerId,
        toOrganizationId: instance.organizationId,
        saleId: dto.saleId ?? null,
        action: ProductAction.SOLD,
        description: dto.description ?? 'Sold to customer',
      });

      return updated;
    });

    return res;
  }

  async return(tenant: Tenant, dto: ReturnInstanceDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const instance = await client.productInstance.findUnique({ where: { id: dto.instanceId } });
    if (!instance) throw new NotFoundException('ProductInstance not found');

    const res = await client.$transaction(async (tx) => {
      const updated = await tx.productInstance.update({
        where: { id: dto.instanceId },
        data: {
          currentOwnerId: null,
          currentStatus: ProductStatus.RETURNED,
          // optionally update organizationId if toOrganizationId provided
          organizationId: dto.toOrganizationId ?? instance.organizationId,
        },
      });

      await this.transactionService.create(tx, {
        productInstanceId: dto.instanceId,
        fromCustomerId: dto.fromCustomerId ?? instance.currentOwnerId ?? null,
        toCustomerId: null,
        toOrganizationId: dto.toOrganizationId ?? instance.organizationId,
        saleId: null,
        action: ProductAction.RETURNED,
        description: dto.description ?? 'Returned by customer',
      });

      return updated;
    });

    return res;
  }

  // -------------------------
  // TRANSFER between organizations
  // -------------------------
  async transfer(tenant: Tenant, dto: TransferInstanceDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const instance = await client.productInstance.findUnique({ where: { id: dto.instanceId } });
    if (!instance) throw new NotFoundException('ProductInstance not found');

    if (instance.organizationId === dto.toOrganizationId) {
      throw new BadRequestException('Target organization is same as current');
    }

    const res = await client.$transaction(async (tx) => {
      const updated = await tx.productInstance.update({
        where: { id: dto.instanceId },
        data: { organizationId: dto.toOrganizationId },
      });

      await this.transactionService.create(tx, {
        productInstanceId: dto.instanceId,
        fromCustomerId: null,
        toCustomerId: null,
        toOrganizationId: dto.toOrganizationId,
        saleId: null,
        action: ProductAction.TRANSFERRED,
        description: dto.description ?? 'Transfer between organizations',
      });

      return updated;
    });

    return res;
  }

  // -------------------------
  // RESELL (after return + repair)
  // -------------------------
  async resell(tenant: Tenant, dto: ResellInstanceDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const instance = await client.productInstance.findUnique({ where: { id: dto.instanceId } });
    if (!instance) throw new NotFoundException('ProductInstance not found');

    if (instance.currentStatus === ProductStatus.LOST) {
      throw new BadRequestException('Cannot resell a lost instance');
    }

    const res = await client.$transaction(async (tx) => {
      const updated = await tx.productInstance.update({
        where: { id: dto.instanceId },
        data: {
          currentOwnerId: dto.newCustomerId,
          currentStatus: ProductStatus.SOLD,
        },
      });

      await this.transactionService.create(tx, {
        productInstanceId: dto.instanceId,
        fromCustomerId: null,
        toCustomerId: dto.newCustomerId,
        toOrganizationId: instance.organizationId,
        saleId: dto.saleId ?? null,
        action: ProductAction.RESOLD,
        description: dto.description ?? 'Resold after return/repair',
      });

      return updated;
    });

    return res;
  }

  // -------------------------
  // MARK LOST / WRITE-OFF
  // -------------------------
  async markLost(tenant: Tenant, dto: MarkLostDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const instance = await client.productInstance.findUnique({ where: { id: dto.instanceId } });
    if (!instance) throw new NotFoundException('ProductInstance not found');

    const updated = await client.$transaction(async (tx) => {
      const u = await tx.productInstance.update({
        where: { id: dto.instanceId },
        data: {
          currentStatus: ProductStatus.LOST,
          currentOwnerId: null,
        },
      });

      await this.transactionService.create(tx, {
        productInstanceId: dto.instanceId,
        fromCustomerId: instance.currentOwnerId ?? null,
        toCustomerId: null,
        toOrganizationId: instance.organizationId,
        saleId: null,
        action: ProductAction.TRANSFERRED, // or add a new ProductAction.LOST if you extend enum
        description: dto.description ?? 'Marked as lost/write-off',
      });

      return u;
    });

    return updated;
  }

  // -------------------------
  // GET HISTORY (delegates to transaction service)
  // -------------------------
  async getHistory(tenant: Tenant, instanceId: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // transactionService expects client as first arg
    return this.transactionService.getHistory(client, instanceId);
  }

  // -------------------------
  // PRIVATE helpers
  // -------------------------
  private async ensureVariantAndOrg(client: any, variantId: string, organizationId?: string) {
    const variant = await client.productVariant.findUnique({
      where: { id: variantId },
      include: { product: { select: { organizationId: true } } },
    });
    if (!variant) throw new NotFoundException('ProductVariant not found');

    // if organizationId provided — ensure matches product.organizationId
    if (organizationId && variant.product.organizationId !== organizationId) {
      throw new BadRequestException('Provided organizationId does not match variant product organization');
    }

    return variant;
  }

  private mapStatusToAction(status: ProductStatus): ProductAction {
    switch (status) {
      case ProductStatus.SOLD:
        return ProductAction.SOLD;
      case ProductStatus.RETURNED:
        return ProductAction.RETURNED;
      case ProductStatus.LOST:
        return ProductAction.TRANSFERRED; // or create ProductAction.LOST if you add enum
      default:
        return ProductAction.TRANSFERRED;
    }
  }
}
