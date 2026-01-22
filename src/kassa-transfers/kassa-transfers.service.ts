// kassa-transfers/kassa-transfers.service.ts
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

@Injectable()
export class KassaTransfersService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly kassasService: KassasService,
  ) {}

  async create(tenant: Tenant, dto: CreateKassaTransferDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    if (dto.fromKassaId === dto.toKassaId) {
      throw new BadRequestException('Нельзя переводить на ту же самую кассу');
    }

    const [fromKassa, toKassa] = await Promise.all([
      client.kassa.findFirst({
        where: { id: dto.fromKassaId, organizationId: tenant.id },
      }),
      client.kassa.findFirst({
        where: { id: dto.toKassaId, organizationId: tenant.id },
      }),
    ]);

    if (!fromKassa) throw new NotFoundException('Касса-источник не найдена');
    if (!toKassa) throw new NotFoundException('Касса-получатель не найдена');

    const amountDecimal = new Prisma.Decimal(dto.amount);
    const rateDecimal = new Prisma.Decimal(dto.rate);
    const convertedAmount = amountDecimal.mul(rateDecimal);

    if (fromKassa.balance.lessThan(amountDecimal)) {
      throw new BadRequestException('Недостаточно средств на кассе-источнике');
    }

    return client.$transaction(async (tx) => {
      // Создаём запись перевода
      const transfer = await tx.kassaTransfer.create({
        data: {
          organizationId: tenant.id,
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
        },
      });

      // Снимаем с источника
      await this.kassasService.updateBalance(tx, dto.fromKassaId, -dto.amount);

      // Зачисляем на получателя
      await this.kassasService.updateBalance(
        tx,
        dto.toKassaId,
        Number(convertedAmount),
      );

      return {
        ...transfer,
        amount: Number(transfer.amount),
        convertedAmount: Number(transfer.convertedAmount),
        rate: Number(transfer.rate),
      };
    });
  }

  async findAll(tenant: Tenant, filter?: { page?: number; limit?: number }) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const { page = 1, limit = 20 } = filter || {};

    const [data, total] = await Promise.all([
      client.kassaTransfer.findMany({
        where: { organizationId: tenant.id },
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
      client.kassaTransfer.count({ where: { organizationId: tenant.id } }),
    ]);

    const transformed = data.map((t) => ({
      ...t,
      amount: Number(t.amount),
      convertedAmount: Number(t.convertedAmount),
      rate: Number(t.rate),
    }));

    return { data: transformed, total, page, limit };
  }
}
