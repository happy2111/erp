import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { Client } from 'pg';
import { execSync } from 'child_process';
import { ConfigService } from '@nestjs/config';
import { execa } from "execa";

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async createTenant(name: string, ownerId: string) {
    const exists = await this.prisma.tenant.findFirst({ where: { name } });

    if (exists) {
      throw new ConflictException('Tenant with this name already exists');
    }

    const apiKey = randomBytes(24).toString('hex');
    const dbName = `tenant_${Date.now()}_${randomBytes(4).toString('hex')}`;
    const dbHost = this.configService.get<string>('POSTGRES_HOST', 'localhost');
    const dbPort = parseInt(this.configService.get<string>('POSTGRES_PORT', '5432'), 10);
    const dbUser = this.configService.get<string>('POSTGRES_USER', 'user');
    const dbPassword = this.configService.get<string>('POSTGRES_PASSWORD', '123456');

    const tenant = await this.prisma.tenant.create({
      data: {
        name,
        dbName,
        dbUser,
        dbPassword,
        dbHost,
        dbPort,
        apiKey,
        ownerId,
        status: 'ACTIVE',
        auditTenantCreations: {
          create: {
            createdBy: ownerId,
            action: 'TENANT_CREATED',
            metadata: {
              dbHost,
              dbPort,
              dbName,
            },
          }
        }
      },
    });

    try {
      await this.createDatabase(dbName, dbUser, dbPassword, dbHost, dbPort);
      await this.runMigrations(dbName, dbUser, dbPassword, dbHost, dbPort);
    } catch (error) {
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { status: 'INACTIVE' },
      });

      throw new InternalServerErrorException(
        `Failed to create tenant database: ${error.message}`
      );
    }

    return tenant;
  }

  async findAll() {
    return this.prisma.tenant.findMany();
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  /**
   * Удалить тенанта (мягкое удаление)
   */
  async deleteTenant(tenantId: string, userId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Помечаем как удаленный в основной БД
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: 'DELETED',
        auditTenantCreations: {
          create: {
            createdBy: userId,
            action: 'TENANT_DELETED',
            metadata: {
              deletedAt: new Date().toISOString(),
              dbName: tenant.dbName,
            },
          }
        }
      },
    });

    return { message: 'Tenant marked as deleted' };
  }

  /**
   * Физическое удаление БД тенанта (опасная операция!)
   */
  async hardDeleteTenant(tenantId: string, userId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Удаляем физическую БД
    try {
      await this.dropDatabase(
        tenant.dbName,
        tenant.dbUser,
        tenant.dbPassword,
        tenant.dbHost,
        tenant.dbPort
      );
    } catch (error) {
      console.error(`Failed to drop database ${tenant.dbName}:`, error);
    }

    // Помечаем как удаленный
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: 'DELETED',
        auditTenantCreations: {
          create: {
            createdBy: userId,
            action: 'TENANT_HARD_DELETED',
            metadata: {
              deletedAt: new Date().toISOString(),
              dbName: tenant.dbName,
            },
          }
        }
      },
    });

    return { message: 'Tenant and database permanently deleted' };
  }

  private async createDatabase(
    dbName: string,
    user: string,
    password: string,
    host: string,
    port: number
  ) {
    const client = new Client({
      user,
      password,
      host,
      port,
      database: 'postgres',
    });

    try {
      await client.connect();
      await client.query(`CREATE DATABASE "${dbName}";`);
      console.log(`✅ Tenant database ${dbName} created`);
    } catch (err: any) {
      if (err.code === '42P04') {
        console.log(`⚠️ Database ${dbName} already exists`);
      } else {
        console.error(`❌ Failed to create database ${dbName}:`, err);
        throw err;
      }
    } finally {
      await client.end();
    }
  }

  private async dropDatabase(
    dbName: string,
    user: string,
    password: string,
    host: string,
    port: number
  ) {
    const client = new Client({
      user,
      password,
      host,
      port,
      database: 'postgres',
    });

    try {
      await client.connect();

      // Закрываем все активные соединения
      await client.query(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = '${dbName}'
        AND pid <> pg_backend_pid();
      `);

      // Удаляем БД
      await client.query(`DROP DATABASE IF EXISTS "${dbName}";`);
      console.log(`✅ Tenant database ${dbName} dropped`);
    } catch (err: any) {
      console.error(`❌ Failed to drop database ${dbName}:`, err);
      throw err;
    } finally {
      await client.end();
    }
  }

  private async runMigrations(
    dbName: string,
    user: string,
    password: string,
    host: string,
    port: number
  ) {
    console.log(`🚀 Running migrations for ${dbName}...`);

    const databaseUrl = `postgresql://${user}:${password}@${host}:${port}/${dbName}?schema=public`;

    try {
      await execa('npm', ['run', 'migrate:tenant:deploy'], {
        env: { ...process.env, TENANT_DATABASE_URL: databaseUrl },
        stdio: 'inherit'
      });
      console.log(`✅ Migrations applied for ${dbName}`);
    } catch (err) {
      console.error(`❌ Migration failed for ${dbName}`, err);
      throw err;
    }
  }

  /**
   * Применить миграции ко всем существующим tenant БД
   * ВАЖНО: Запускать вручную после изменения tenant.prisma
   */
  async updateAllTenantDatabases() {
    const tenants = await this.prisma.tenant.findMany({
      where: {
        status: 'ACTIVE'
      }
    });
    
    console.log(`🔄 Updating ${tenants.length} tenant databases...`);
    
    const results = [];
    
    for (const tenant of tenants) {
      try {
        await this.runMigrations(
          tenant.dbName,
          tenant.dbUser,
          tenant.dbPassword,
          tenant.dbHost,
          tenant.dbPort
        );
        // @ts-ignore
        results.push({ tenant: tenant.name, status: 'success' });
        console.log(`✅ Updated ${tenant.dbName}`);
      } catch (error) {
        // @ts-ignore
        results.push({
          tenant: tenant.name, 
          status: 'failed', 
          error: error.message 
        });
        console.error(`❌ Failed to update ${tenant.dbName}:`, error);
      }
    }
    
    return results;
  }
}