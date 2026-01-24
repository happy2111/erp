import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { AuditLogFilterDto } from './dto/audit-log-filter.dto';
import { Prisma } from '.prisma/client-tenant';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}

  private safeParse<T>(value: string | null | undefined): T | null {
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  private toPrismaJson(
    value: unknown,
  ): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
    if (value === null || value === undefined) return undefined; // Prisma поймет, что это nullable
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as Prisma.InputJsonValue;
      } catch {
        return undefined;
      }
    }
    return value as Prisma.InputJsonValue; // object, array, number, boolean
  }

  async create(
    tx: Prisma.TransactionClient,
    organizationId: string,
    dto: {
      userId?: string;
      action: string;
      entity: string;
      entityId?: string;
      oldValue?: any;
      newValue?: any;
      note?: string;
    },
  ) {
    return tx.auditLog.create({
      data: {
        organizationId,
        userId: dto.userId,
        action: dto.action,
        entity: dto.entity,
        entityId: dto.entityId,
        oldValue: this.toPrismaJson(dto.oldValue),
        newValue: this.toPrismaJson(dto.newValue),
        note: dto.note,
      },
    });
  }

  async findAll(
    tenant: Tenant,
    organizationId: string,
    filter: AuditLogFilterDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const {
      page = 1,
      limit = 20,
      userId,
      entity,
      action,
      entityId,
      fromDate,
      toDate,
    } = filter;

    const where: Prisma.AuditLogWhereInput = { organizationId };

    if (userId) where.userId = userId;
    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (entityId) where.entityId = entityId;
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate);
      if (toDate) where.createdAt.lte = new Date(toDate);
    }

    const [data, total] = await Promise.all([
      client.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { email: true },
            include: {
              profile: {
                select: { firstName: true, lastName: true },
              },
            },
          },
        },
      }),
      client.auditLog.count({ where }),
    ]);

    const parsed = data.map((log) => ({
      ...log,
      oldValue: log.oldValue ?? null,
      newValue: log.newValue ?? null,
    }));

    return {
      data: parsed,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // FIND ONE — детальная информация по конкретному логу
  // ─────────────────────────────────────────────────────────────
  async findOne(tenant: Tenant, organizationId: string, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const log = await client.auditLog.findFirst({
      where: { id, organizationId },
      include: {
        user: {
          select: { email: true },
          include: {
            profile: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!log) throw new NotFoundException('Запись аудита не найдена');

    return {
      ...log,
      oldValue: log.oldValue ?? null,
      newValue: log.newValue ?? null,
    };
  }
}
