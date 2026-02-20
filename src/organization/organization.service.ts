import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { Prisma } from '.prisma/client-tenant';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { GetOrganizationsQueryDto } from './dto/get-organizations-query.dto';
import { AuditHelper } from '../audit-logs/audit.helper';
import { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly auditHelper: AuditHelper,
  ) {}

  async create(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    dto: CreateOrganizationDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // 1. Проверяем уникальность email и phone
    const existing = await client.organization.findFirst({
      where: {
        OR: [{ email: dto.email }, { phone: dto.phone }],
      },
    });

    if (existing) {
      const field = existing.email === dto.email ? 'email' : 'phone';
      throw new ConflictException(
        `Организация с таким ${field} уже существует`,
      );
    }

    return client.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          ...dto,
        },
      });

      // 2. Автоматически привязываем текущего пользователя как OWNER
      await tx.organizationUser.create({
        data: {
          organizationId: organization.id,
          userId: user.userId,
          role: 'OWNER',
          position: 'Владелец',
        },
      });
      this.logger.debug('Creating Organization Settings...');
      await tx.settings.create({
        data: {
          organizationId: organization.id,
        },
      });
      this.logger.debug('Creating Organization Installment Settings...');
      await tx.installmentSetting.create({
        data: {
          organizationId: organization.id,
          isActive: false,
        },
      });
      // 3. Логируем создание организации
      await this.auditHelper.log(tx, organization.id, {
        userId: user.userId,
        action: 'CREATE',
        entity: 'Organization',
        entityId: organization.id,
        newValue: {
          name: organization.name,
          email: organization.email,
          phone: organization.phone,
        },
        note: `Создана новая организация "${organization.name}"`,
      });

      return organization;
    });
  }

  async createWithoutUser(tenant: Tenant, dto: CreateOrganizationDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const organization = await client.organization.create({
      data: {
        ...dto,
      },
    });
    return organization;
  }

  async findAllForUser(tenant: Tenant, user: JwtAuthenticatedUser) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    return client.organization.findMany({
      where: {
        org_users: {
          some: {
            userId: user.userId,
          },
        },
      },
      include: {
        org_users: {
          where: { userId: user.userId },
          select: { id: true, role: true, position: true },
        },
        settings: true,
        kassas: {
          select: { id: true, name: true, type: true, balance: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForUser(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    orgId: string,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const organization = await client.organization.findFirst({
      where: {
        id: orgId,
        org_users: {
          some: {
            userId: user.userId,
          },
        },
      },
      include: {
        org_users: {
          where: { userId: user.userId },
          select: { role: true, position: true },
        },
        settings: true,
        kassas: {
          select: {
            id: true,
            name: true,
            type: true,
            balance: true,
            currency: true,
          },
        },
        products: {
          select: { id: true, name: true, code: true },
          take: 5, // последние 5 товаров
        },
      },
    });

    if (!organization) {
      throw new NotFoundException(
        'Организация не найдена или у вас нет доступа',
      );
    }

    return organization;
  }

  async findAll(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    query: GetOrganizationsQueryDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const {
      search,
      order = 'desc',
      sortField = 'createdAt',
      page = 1,
      limit = 10,
    } = query;

    const where: Prisma.OrganizationWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      client.organization.findMany({
        where,
        orderBy: { [sortField]: order },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          org_users: {
            select: { userId: true, role: true },
            take: 3,
          },
          settings: true,
        },
      }),
      client.organization.count({ where }),
    ]);

    return { items, total };
  }

  async findById(tenant: Tenant, user: JwtAuthenticatedUser, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const org = await client.organization.findUnique({
      where: { id },
      include: {
        org_users: true,
        settings: true,
        kassas: true,
        products: true,
      },
    });

    if (!org) {
      throw new NotFoundException('Организация не найдена');
    }

    return org;
  }

  async update(
    tenant: Tenant,
    user: JwtAuthenticatedUser,
    id: string,
    dto: UpdateOrganizationDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const existing = await client.organization.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Организация не найдена');
    }

    return client.$transaction(async (tx) => {
      const updated = await tx.organization.update({
        where: { id },
        data: dto,
      });

      // Логируем обновление
      await this.auditHelper.log(tx, id, {
        userId: user.userId,
        action: 'UPDATE',
        entity: 'Organization',
        entityId: id,
        oldValue: {
          name: existing.name,
          email: existing.email,
          phone: existing.phone,
        },
        newValue: {
          name: updated.name,
          email: updated.email,
          phone: updated.phone,
        },
        note: `Обновлена организация "${updated.name}"`,
      });

      return updated;
    });
  }

  async remove(tenant: Tenant, user: JwtAuthenticatedUser, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const organization = await client.organization.findUnique({
      where: { id },
      include: { org_users: true },
    });

    if (!organization) {
      throw new NotFoundException('Организация не найдена');
    }

    // Проверяем, что пользователь — OWNER этой организации
    const userRole = organization.org_users.find(
      (u) => u.userId === user.userId,
    )?.role;
    if (userRole !== 'OWNER') {
      throw new ForbiddenException('Только владелец может удалить организацию');
    }

    return client.$transaction(async (tx) => {
      // Логируем удаление
      await this.auditHelper.log(tx, id, {
        userId: user.userId,
        action: 'DELETE',
        entity: 'Organization',
        entityId: id,
        oldValue: {
          name: organization.name,
          email: organization.email,
        },
        note: `Удалена организация "${organization.name}"`,
      });

      // Удаляем связанные записи (кассы, товары, клиенты и т.д.)
      await Promise.all([
        tx.organizationUser.deleteMany({ where: { organizationId: id } }),
        tx.organizationCustomer.deleteMany({ where: { organizationId: id } }),
        tx.kassa.deleteMany({ where: { organizationId: id } }),
        tx.product.deleteMany({ where: { organizationId: id } }),
        // ... другие связанные таблицы
        tx.organization.delete({ where: { id } }),
      ]);

      return { message: 'Организация успешно удалена' };
    });
  }
}
