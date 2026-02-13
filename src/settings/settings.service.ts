import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}

  async getMySettings(tenant: Tenant, orgId: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const settings = await client.settings.findUnique({
      where: { organizationId: orgId },
      include: {
        baseCurrency: {
          select: { id: true, code: true, name: true, symbol: true },
        },
      },
    });

    if (!settings) {
      return {
        language: 'ru',
        dateFormat: 'DD.MM.YYYY',
        enableNotifications: false,
        enableAutoRateUpdate: false,
        taxPercent: 0,
        theme: 'LIGHT',
        logoUrl: null,
        baseCurrency: null,
      };
    }

    return settings;
  }

  async updateMySettings(
    tenant: Tenant,
    orgId: string,
    dto: UpdateSettingsDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // Проверяем существование записи
    const existing = await client.settings.findUnique({
      where: { organizationId: orgId },
    });

    if (!existing) {
      throw new NotFoundException('Настройки организации не найдены');
    }

    return client.settings.update({
      where: { organizationId: orgId },
      data: dto,
      include: {
        baseCurrency: {
          select: { id: true, code: true, name: true, symbol: true },
        },
      },
    });
  }
}
