import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthenticatedUser } from 'src/tenant-auth/interfaces/jwt.interface';
import { Tenant } from '@prisma/client';
import { OrgUserRole, Prisma } from '.prisma/client-tenant';
import { CreateTenantUserDto } from 'src/tenant-user/dto/create-tenant-user.dto';
import { CreateOrganizationUserDto } from './dto/create-org-user.dto';
import { PrismaTenantService } from 'src/prisma_tenant/prisma_tenant.service';
import { TenantUserService } from 'src/tenant-user/tenant-user.service';
import { AuditHelper } from 'src/audit-logs/audit.helper';
import { GetOrgUsersQueryDto } from './dto/get-org-users-query.dto';
import { UpdateOrganizationUserDto } from './dto/update-organization-user.dto';

// organization-user.service.ts
@Injectable()
export class OrganizationUserService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly tenantUserService: TenantUserService,
    private readonly auditHelper: AuditHelper,
  ) {}

  // ─── Универсальный метод для админки ─────────────────────────────
  async getAllAdmin(
    tenant: Tenant,
    currentUser: JwtAuthenticatedUser,
    query: GetOrgUsersQueryDto,
  ): Promise<{ items: any[]; total: number }> {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const { search, sortField, order, page = 1, limit = 10 } = query;

    const where: Prisma.OrganizationUserWhereInput = {
      organizationId: currentUser.orgId, // ← ТОЛЬКО своя организация!
    };

    if (search) {
      where.OR = [
        { position: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        {
          user: {
            profile: { firstName: { contains: search, mode: 'insensitive' } },
          },
        },
        {
          user: {
            profile: { lastName: { contains: search, mode: 'insensitive' } },
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      client.organizationUser.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortField as string]: order },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              isActive: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  patronymic: true,
                  gender: true,
                  dateOfBirth: true,
                },
              },
              phone_numbers: {
                select: { phone: true, isPrimary: true, note: true },
              },
            },
          },
        },
      }),
      client.organizationUser.count({ where }),
    ]);

    return { items, total };
  }

  // ─── Получение одной записи ──────────────────────────────────────
  async getByIdAdmin(
    tenant: Tenant,
    currentUser: JwtAuthenticatedUser,
    id: string,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const orgUser = await client.organizationUser.findFirst({
      where: {
        id,
        organizationId: currentUser.orgId, // ← безопасность
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
            profile: true,
            phone_numbers: true,
          },
        },
      },
    });

    if (!orgUser) {
      throw new NotFoundException('Пользователь в организации не найден');
    }

    return { data: orgUser };
  }

  // ─── Создание привязки существующего пользователя ────────────────
  async create(
    tenant: Tenant,
    currentUser: JwtAuthenticatedUser,
    dto: CreateOrganizationUserDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const existing = await client.organizationUser.findUnique({
      where: {
        organizationId_userId: {
          organizationId: currentUser.orgId,
          userId: dto.userId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'Пользователь уже привязан к этой организации',
      );
    }

    const result = await client.$transaction(async (tx) => {
      const created = await tx.organizationUser.create({
        data: { organizationId: currentUser.orgId, ...dto },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
        },
      });

      await this.auditHelper.log(tx, currentUser.orgId, {
        action: 'CREATE',
        entity: 'OrganizationUser',
        entityId: created.id,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        newValue: created as any,
      });

      return created;
    });

    return { data: result };
  }

  // ─── Обновление ──────────────────────────────────────────────────
  async update(
    tenant: Tenant,
    currentUser: JwtAuthenticatedUser,
    id: string,
    dto: UpdateOrganizationUserDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const existing = await client.organizationUser.findFirst({
      where: {
        id,
        organizationId: currentUser.orgId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Запись не найдена или недоступна');
    }

    const result = await client.$transaction(async (tx) => {
      const updated = await tx.organizationUser.update({
        where: { id },
        data: dto,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: true,
            },
          },
        },
      });

      await this.auditHelper.log(tx, currentUser.orgId, {
        action: 'UPDATE',
        entity: 'OrganizationUser',
        entityId: updated.id,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        newValue: updated as any,
      });
    });

    return { data: result };
  }

  // ─── Жёсткое удаление ────────────────────────────────────────────
  async hardDelete(
    tenant: Tenant,
    currentUser: JwtAuthenticatedUser,
    id: string,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const existing = await client.organizationUser.findFirst({
      where: {
        id,
        organizationId: currentUser.orgId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Запись не найдена');
    }

    if (existing.userId === currentUser.userId) {
      throw new BadRequestException(
        'Нельзя удалить самого себя из организации',
      );
    }

    await client.$transaction(async (tx) => {
      const deleted = await client.organizationUser.delete({ where: { id } });
      await this.auditHelper.log(tx, currentUser.orgId, {
        action: 'DELETE',
        entity: 'OrganizationUser',
        entityId: deleted.id,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        newValue: deleted as any,
      });
    });

    return { message: 'Пользователь успешно удалён из организации' };
  }

  // TODO нужно проверить работаетли корректно с tenant.serivce.ts
  async createWithTenantUser(
    tenant: Tenant,
    organizationId: string,
    role: OrgUserRole,
    position: string | undefined,
    createTenantUserDto: CreateTenantUserDto,
  ) {
    try {
      // создаём пользователя в tenant DB
      const user = await this.tenantUserService.createWithOutAuth(
        tenant,

        createTenantUserDto,
      );
      if (!user) {
        throw new Error('User creation failed — no user returned');
      }

      if (!role) throw new BadRequestException('Role is required');

      // собираем DTO для organizationUser
      const orgUser: {
        organizationId: string;
        userId: string;
        role: OrgUserRole;
        position?: string;
      } = {
        organizationId,
        userId: user.id,
        role,
        ...(position ? { position } : {}),
      };

      const client = this.prismaTenant.getTenantPrismaClient(tenant);
      const result = await client.$transaction(async (tx) => {
        const created = await tx.organizationUser.create({
          data: orgUser,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: { select: { firstName: true, lastName: true } },
              },
            },
          },
        });

        await this.auditHelper.log(tx, created.organizationId, {
          action: 'CREATE',
          entity: 'OrganizationUser',
          entityId: created.id,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          newValue: created as any,
        });
      });

      return user;
    } catch (e) {
      console.error(e);
      throw new Error('Error creating user with organization relation');
    }
  }
}
