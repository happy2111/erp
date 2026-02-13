import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Prisma, Tenant } from '@prisma/client';
import { UpdateInstallmentSettingDto } from './dto/update-installment-setting.dto';
import { CreateInstallmentPlanDto } from './dto/create-installment-plan.dto';
import { UpdateInstallmentPlanDto } from './dto/update-installment-plan.dto';

interface LimitData {
  minInitialPayment?: Prisma.Decimal;
  maxAmount?: Prisma.Decimal;
}

@Injectable()
export class InstallmentSettingsService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}

  async getMySettings(tenant: Tenant, orgId: string, currencyId?: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const settings = await client.installmentSetting.findUnique({
      where: { organizationId: orgId },
      include: {
        plans: {
          orderBy: { months: 'asc' },
        },
        installment_limits: currencyId
          ? {
              where: { currencyId },
              include: {
                currency: { select: { symbol: true } },
              },
            }
          : {
              include: {
                currency: { select: { symbol: true } },
              },
            },
      },
    });

    if (!settings) {
      return {
        isActive: false,
        plans: [],
        installment_limits: [],
      };
    }

    return settings;
  }

  async updateMySettings(
    tenant: Tenant,
    orgId: string,
    dto: UpdateInstallmentSettingDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const existing = await client.installmentSetting.findUnique({
      where: { organizationId: orgId },
    });

    if (!existing) {
      throw new NotFoundException(
        'Настройки рассрочки для организации не найдены',
      );
    }

    return client.installmentSetting.update({
      where: { organizationId: orgId },
      data: dto,
      include: {
        plans: true,
      },
    });
  }

  async createPlan(
    tenant: Tenant,
    orgId: string,
    dto: CreateInstallmentPlanDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const setting = await client.installmentSetting.findUnique({
      where: { organizationId: orgId },
    });

    if (!setting) {
      throw new NotFoundException(
        'Настройки рассрочки для организации не найдены',
      );
    }

    // Проверка уникальности количества месяцев
    const existingPlan = await client.installmentPlan.findFirst({
      where: {
        installmentSettingId: setting.id,
        months: dto.months,
      },
    });

    if (existingPlan) {
      throw new ConflictException(
        `План рассрочки на ${dto.months} месяцев уже существует`,
      );
    }

    return client.installmentPlan.create({
      data: {
        installmentSettingId: setting.id,
        months: dto.months,
        coefficient: dto.coefficient,
      },
    });
  }

  async updatePlan(
    tenant: Tenant,
    orgId: string,
    planId: string,
    dto: UpdateInstallmentPlanDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const plan = await client.installmentPlan.findFirst({
      where: {
        id: planId,
        installmentSetting: { organizationId: orgId },
      },
    });

    if (!plan) {
      throw new NotFoundException(
        'План рассрочки не найден или принадлежит другой организации',
      );
    }

    // Если меняем количество месяцев — проверяем уникальность
    if (dto.months && dto.months !== plan.months) {
      const conflict = await client.installmentPlan.findFirst({
        where: {
          installmentSettingId: plan.installmentSettingId,
          months: dto.months,
        },
      });

      if (conflict) {
        throw new ConflictException(
          `План на ${dto.months} месяцев уже существует`,
        );
      }
    }

    return client.installmentPlan.update({
      where: { id: planId },
      data: dto,
    });
  }

  async deletePlan(
    tenant: Tenant,
    orgId: string,
    planId: string,
  ): Promise<void> {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const plan = await client.installmentPlan.findFirst({
      where: {
        id: planId,
        installmentSetting: { organizationId: orgId },
      },
    });

    if (!plan) {
      throw new NotFoundException(
        'План рассрочки не найден или принадлежит другой организации',
      );
    }

    await client.installmentPlan.delete({ where: { id: planId } });
  }

  async upsertLimit(
    tenant: Tenant,
    orgId: string,
    currencyId: string,
    minInitialPayment?: number,
    maxAmount?: number,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const setting = await client.installmentSetting.findUnique({
      where: { organizationId: orgId },
    });
    if (!setting) {
      throw new NotFoundException(
        'Настройки рассрочки для организации не найдены',
      );
    }

    const currency = await client.currency.findUnique({
      where: { id: currencyId },
    });

    if (!currency) {
      throw new NotFoundException('Valuta topilmadi');
    }

    const limitData: LimitData = {};

    if (minInitialPayment != null)
      limitData.minInitialPayment = new Prisma.Decimal(minInitialPayment);
    if (maxAmount != null) limitData.maxAmount = new Prisma.Decimal(maxAmount);

    return client.installmentLimit.upsert({
      where: {
        installmentSettingId_currencyId: {
          installmentSettingId: setting.id,
          currencyId,
        },
      },
      create: {
        installmentSettingId: setting.id,
        currencyId,
        ...limitData,
      },
      update: {
        ...limitData,
      },
    });
  }

  async deleteLimit(tenant: Tenant, orgId: string, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const limit = await client.installmentLimit.findFirst({
      where: { id, installmentSetting: { organizationId: orgId } },
    });

    if (!limit) throw new NotFoundException('Limit Topilmadi');

    await client.installmentLimit.delete({ where: { id } });
  }
}
