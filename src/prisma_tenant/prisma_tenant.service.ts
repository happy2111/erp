import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient as TenantPrismaClient } from '.prisma/client-tenant';
import { PrismaService } from '../prisma/prisma.service';
import { Tenant } from '@prisma/client';

@Injectable()
export class PrismaTenantService {
  private tenantClients = new Map<string, TenantPrismaClient>();

  constructor(private prisma: PrismaService) {}

  /**
   * Получить Prisma клиент для конкретного тенанта
   */
  getTenantPrismaClient(tenant: Tenant): TenantPrismaClient {
    // Проверяем кэш
    const cached = this.tenantClients.get(tenant.id);
    if (cached) {
      return cached;
    }

    // Создаем новый клиент
    const url = `postgresql://${tenant.dbUser}:${tenant.dbPassword}@${tenant.dbHost}:${tenant.dbPort}/${tenant.dbName}?schema=public`;

    const client = new TenantPrismaClient({
      datasources: {
        db: { url }
      }
    });

    // Кэшируем для переиспользования
    this.tenantClients.set(tenant.id, client);

    return client;
  }

  /**
   * Получить клиент по ID тенанта
   */
  async getTenantClientById(tenantId: string): Promise<TenantPrismaClient> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (tenant.status !== 'ACTIVE') {
      throw new NotFoundException('Tenant is not active');
    }

    return this.getTenantPrismaClient(tenant);
  }

  /**
   * Очистить кэш клиента (при удалении/обновлении тенанта)
   */
  async clearTenantClient(tenantId: string) {
    const client = this.tenantClients.get(tenantId);
    if (client) {
      await client.$disconnect();
      this.tenantClients.delete(tenantId);
    }
  }

  /**
   * Закрыть все соединения при завершении работы
   */
  async onModuleDestroy() {
    for (const [id, client] of this.tenantClients.entries()) {
      await client.$disconnect();
    }
    this.tenantClients.clear();
  }

}
