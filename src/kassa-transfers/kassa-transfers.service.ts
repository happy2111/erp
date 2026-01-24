import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { CreateKassaTransferDto } from './dto/create-kassa-transfer.dto';
import { Prisma } from '.prisma/client-tenant';
import { KassasService } from '../kassas/kassas.service';
import { AuditHelper } from '../audit-logs/audit.helper';
import { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';

@Injectable()
export class KassaTransfersService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly kassasService: KassasService,
    private readonly auditHelper: AuditHelper,
  ) {}

  async create(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    dto: CreateKassaTransferDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    if (dto.fromKassaId === dto.toKassaId) {
      throw new BadRequestException('Нельзя переводить на ту же самую кассу');
    }

    const [fromKassa, toKassa] = await Promise.all([
      client.kassa.findFirst({
        where: { id: dto.fromKassaId, organizationId },
      }),
      client.kassa.findFirst({
        where: { id: dto.toKassaId, organizationId },
      }),
    ]);

    if (!fromKassa)
      throw new NotFoundException(
        'Касса-источник не найдена или принадлежит другой организации',
      );
    if (!toKassa)
      throw new NotFoundException(
        'Касса-получатель не найдена или принадлежит другой организации',
      );

    const amountDecimal = new Prisma.Decimal(dto.amount);
    const rateDecimal = new Prisma.Decimal(dto.rate || 1);
    const convertedAmount = amountDecimal.mul(rateDecimal);

    if (fromKassa.balance.lessThan(amountDecimal)) {
      throw new BadRequestException(
        `Недостаточно средств на кассе-источнике (${fromKassa.name}). Баланс: ${fromKassa.balance}, требуется: ${dto.amount}`,
      );
    }

    return client.$transaction(async (tx) => {
      // 1. Создаём запись перевода
      const transfer = await tx.kassaTransfer.create({
        data: {
          organizationId,
          fromKassaId: dto.fromKassaId,
          toKassaId: dto.toKassaId,
          fromCurrencyId: fromKassa.currencyId,
          toCurrencyId: toKassa.currencyId,
          amount: amountDecimal,
          rate: rateDecimal,
          convertedAmount,
          description: dto.description,
        },
        include: {
          from_kassa: {
            select: { name: true, currency: { select: { code: true } } },
          },
          to_kassa: {
            select: { name: true, currency: { select: { code: true } } },
          },
          from_currency: { select: { code: true } },
          to_currency: { select: { code: true } },
        },
      });

      await this.kassasService.updateBalance(
        tx,
        dto.fromKassaId,
        -Number(amountDecimal),
      );

      await this.kassasService.updateBalance(
        tx,
        dto.toKassaId,
        Number(convertedAmount),
      );

      await this.auditHelper.log(tx, organizationId, {
        userId: user.userId,
        action: 'TRANSFER',
        entity: 'KassaTransfer',
        entityId: transfer.id,
        newValue: {
          fromKassa: transfer.from_kassa.name,
          toKassa: transfer.to_kassa.name,
          amount: dto.amount,
          convertedAmount,
          rate: dto.rate,
        },
        note: `Перевод между кассами: ${fromKassa.name} → ${toKassa.name}`,
      });

      return {
        ...transfer,
        amount: Number(transfer.amount),
        convertedAmount: Number(transfer.convertedAmount),
        rate: Number(transfer.rate),
      };
    });
  }

  async findAll(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    filter?: { page?: number; limit?: number },
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;
    const { page = 1, limit = 20 } = filter || {};

    const [data, total] = await Promise.all([
      client.kassaTransfer.findMany({
        where: { organizationId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          from_kassa: { select: { id: true, name: true } },
          to_kassa: { select: { id: true, name: true } },
          from_currency: { select: { code: true } },
          to_currency: { select: { code: true } },
        },
      }),
      client.kassaTransfer.count({ where: { organizationId } }),
    ]);

    const transformed = data.map((t) => ({
      ...t,
      amount: Number(t.amount),
      convertedAmount: Number(t.convertedAmount),
      rate: Number(t.rate),
    }));

    return { data: transformed, total, page, limit };
  }

  async findOne(tenant: Tenant, user: JwtAuthenticatedUser, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organizationId = user.orgId;

    const transfer = await client.kassaTransfer.findFirst({
      where: { id, organizationId },
      include: {
        from_kassa: {
          select: {
            id: true,
            name: true,
            currency: { select: { code: true } },
          },
        },
        to_kassa: {
          select: {
            id: true,
            name: true,
            currency: { select: { code: true } },
          },
        },
        from_currency: { select: { code: true } },
        to_currency: { select: { code: true } },
      },
    });

    if (!transfer) {
      throw new NotFoundException(
        'Перевод не найден или принадлежит другой организации',
      );
    }

    return {
      ...transfer,
      amount: Number(transfer.amount),
      convertedAmount: Number(transfer.convertedAmount),
      rate: Number(transfer.rate),
    };
  }
}
