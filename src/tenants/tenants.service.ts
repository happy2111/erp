import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { Client } from 'pg';
import { ConfigService } from '@nestjs/config';
import { execa } from "execa";
import {
  OrganizationUserService
} from "../organization-user/organization-user.service";
import {OrganizationService} from "../organization/organization.service";
import {CreateTenantUserDto} from "../tenant-user/dto/create-tenant-user.dto";
import * as bcrypt from 'bcrypt';
import {OrgUserRole} from ".prisma/client-tenant";
import { TenantFilterDto } from "./dto/filter-tenant.dto";
import {Prisma, Tenant} from '@prisma/client'
import {UpdateTenantDto} from "./dto/update-tenant.dto";

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private readonly organization: OrganizationService,
    private readonly organizationUserService: OrganizationUserService,
  ) {}

  async createTenant(
    name: string,
    ownerId: string | undefined,
    hostname: string | undefined
  ) {
    const exists = await this.prisma.tenant.findFirst({
      where: { OR: [{ name }, { hostname }] },
    });

    if (exists) {
      throw new ConflictException('Tenant with this name already exists');
    }

    const apiKey = randomBytes(24).toString('hex');
    const dbName = `tenant_${Date.now()}_${randomBytes(4).toString('hex')}`;
    const dbHost = this.configService.get<string>('POSTGRES_HOST', 'localhost');
    const dbPort = parseInt(this.configService.get<string>('POSTGRES_PORT', '5432'), 10);
    const dbUser = this.configService.get<string>('POSTGRES_USER', 'user');
    const dbPassword = this.configService.get<string>('POSTGRES_PASSWORD', '123456');

    const tenantData: any = {
      name,
      dbName,
      dbUser,
      dbPassword,
      dbHost,
      dbPort,
      status: 'ACTIVE',
      apiKey,
      ...(hostname ? { hostname } : {}),
    };

    let owner: any = null;

    if (ownerId) {
      owner = await this.prisma.user.findUnique({ where: { id: ownerId } });
      if (!owner) throw new NotFoundException('Owner not found');

      tenantData.ownerId = ownerId;
      tenantData.auditTenantCreations = {
        create: {
          createdBy: ownerId,
          action: 'TENANT_CREATED',
          metadata: { dbHost, dbPort, dbName },
        },
      };
    }

    const tenant = await this.prisma.tenant.create({ data: tenantData });

    try {
      await this.createDatabase(dbName, dbUser, dbPassword, dbHost, dbPort);
      await this.runMigrations(dbName, dbUser, dbPassword, dbHost, dbPort);

      const organization = await this.organization.create(tenant, { name: 'Test' });

      let tenantUser:CreateTenantUserDto;
      if (owner) {
        tenantUser = {
          ...(owner.email ? { email: owner.email } : {}),
          password: owner.password,
          profile: {
            firstName: owner.firstName,
            lastName: owner.lastName,
          },
          phone_numbers: [
            {
              phone: owner.phone,
              isPrimary: true,
            },
          ],
        }
      } else {
        tenantUser = {
          email: "test@erp.uz",
          password: "12345678",
          profile: {
            firstName: "Happy",
            lastName: "Tester"
          },
          phone_numbers: [
            {
              phone: "+998991231212",
              isPrimary: true,
            }
          ]
        }
      }

      await this.organizationUserService.createWithTenantUser(
        tenant,
        organization.id,
        OrgUserRole.OWNER,
        undefined,
        tenantUser
      );

      return tenant;
    } catch (error) {
      await this.prisma.tenant.update({
        where: { id: tenant.id },
        data: { status: 'INACTIVE' },
      });

      throw new InternalServerErrorException(
        `Failed to create tenant database: ${error.message}`,
      );
    }
  }


  async findAll() {
    return this.prisma.tenant.findMany();
  }

  async filterTenants(query: TenantFilterDto) {
    const where: Prisma.TenantWhereInput = {};

    // ---- Поля ----
    if (query.name) where.name = { contains: query.name, mode: 'insensitive' };
    if (query.ownerId) where.ownerId = query.ownerId;
    if (query.apiKey) where.apiKey = { contains: query.apiKey };
    if (query.hostname) where.hostname = { contains: query.hostname };
    if (query.status) where.status = query.status;

    // ---- Поиск по тексту ----
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { apiKey: { contains: query.search } },
        { hostname: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // ---- createdAt ----
    if (query.createdFrom || query.createdTo) {
      where.createdAt = {};
      if (query.createdFrom) where.createdAt.gte = query.createdFrom;
      if (query.createdTo) where.createdAt.lte = query.createdTo;
    }

    // ---- updatedAt ----
    if (query.updatedFrom || query.updatedTo) {
      where.updatedAt = {};
      if (query.updatedFrom) where.updatedAt.gte = query.updatedFrom;
      if (query.updatedTo) where.updatedAt.lte = query.updatedTo;
    }

    // ---- Пагинация ----
    const take = query.limit ?? 20;
    const skip = (query.page - 1) * take;

    // ---- Выполнить запрос ----
    const [items, total] = await this.prisma.$transaction([
      this.prisma.tenant.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: true
        }
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return {
      total,
      page: query.page,
      limit: take,
      items,
    };
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }


  async update(tenantId: string, dto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException(`Tenant not found`);
    }

    // Обновляем только разрешенные поля
    const updatedTenant = await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        name: dto.name ?? tenant.name,
        ownerId: dto.ownerId ?? tenant.ownerId,
        status: dto.status ?? tenant.status,
        hostname: dto.hostname ?? tenant.hostname,
        dbName: dto.dbName ?? tenant.dbName,
        dbHost: dto.dbHost ?? tenant.dbHost,
        dbPort: dto.dbPort ?? tenant.dbPort,
        dbUser: dto.dbUser ?? tenant.dbUser,
        dbPassword: dto.dbPassword ?? tenant.dbPassword,
      },
    });

    return updatedTenant;
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