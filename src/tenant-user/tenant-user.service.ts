import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { $Enums, Prisma } from '.prisma/client-tenant';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto';
import { UpdateTenantUserDto } from './dto/update-tenant-user.dto';
import {
  GetTenantUsersQueryDto,
  TenantUserSortField,
} from './dto/get-tenant-users-query.dto';
import { AuditHelper } from '../audit-logs/audit.helper'; // если у вас есть
import { JwtAuthenticatedUser } from '../tenant-auth/interfaces/jwt.interface';

@Injectable()
export class TenantUserService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly auditHelper?: AuditHelper, // опционально
  ) {}

  private readonly SALT_ROUNDS = 10;

  async getAllAdmin(
    tenant: Tenant,
    currentUser: JwtAuthenticatedUser,
    query: GetTenantUsersQueryDto,
  ): Promise<{ items: any[]; total: number }> {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const {
      search,
      sortField = TenantUserSortField.createdAt,
      order = 'desc',
      page = 1,
      limit = 10,
    } = query;

    const where: Prisma.UserWhereInput = {
      org_links: { some: { organizationId: currentUser.orgId } },
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { profile: { firstName: { contains: search, mode: 'insensitive' } } },
        { profile: { lastName: { contains: search, mode: 'insensitive' } } },
        {
          phone_numbers: {
            some: { phone: { contains: search, mode: 'insensitive' } },
          },
        },
      ];
    }

    let orderBy: Prisma.UserOrderByWithRelationInput;

    if (
      sortField === TenantUserSortField['profile.firstName'] ||
      sortField === TenantUserSortField['profile.lastName']
    ) {
      const profileField =
        sortField === TenantUserSortField['profile.firstName']
          ? 'firstName'
          : 'lastName';
      orderBy = { profile: { [profileField]: order } };
    } else {
      orderBy = { [sortField]: order };
    }

    const [items, total] = await Promise.all([
      client.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: {
          profile: true,
          phone_numbers: true,
          org_links: {
            select: {
              organization: { select: { id: true, name: true } },
              role: true,
            },
          },
        },
      }),
      client.user.count({ where }),
    ]);

    return { items, total };
  }

  async getByIdAdmin(
    tenant: Tenant,
    currentUser: JwtAuthenticatedUser,
    id: string,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const user = await client.user.findUnique({
      where: { id },
      include: {
        profile: true,
        phone_numbers: true,
        org_links: {
          select: {
            organization: { select: { id: true, name: true } },
            role: true,
          },
        },
        cutomer_links: {
          select: {
            organization: { select: { id: true, name: true } },
            type: true,
            isBlacklisted: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return { data: user };
  }

  async create(
    tenant: Tenant,
    currentUser: JwtAuthenticatedUser,
    dto: CreateTenantUserDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const { profile, phone_numbers, email, password, isActive, ...userRest } =
      dto;

    // Проверка наличия хотя бы одного основного телефона
    const hasPrimaryPhone = phone_numbers?.some((p) => p.isPrimary);
    if (!hasPrimaryPhone) {
      throw new BadRequestException(
        'Хотя бы один телефон должен быть основным',
      );
    }

    if (phone_numbers.filter((p) => p.isPrimary).length > 1) {
      throw new BadRequestException('Только один телефон может быть основным');
    }

    const result = await client.$transaction(async (tx) => {
      // 1. Проверка уникальности email
      if (email) {
        const existing = await tx.user.findUnique({ where: { email } });
        if (existing) {
          throw new ConflictException(
            'Пользователь с таким email уже существует',
          );
        }
      }

      // 2. Проверка уникальности телефонов
      const inputPhones = phone_numbers.map((p) => p.phone);
      const existingPhones = await tx.userPhone.findMany({
        where: { phone: { in: inputPhones } },
        select: { phone: true },
      });

      if (existingPhones.length) {
        throw new ConflictException(
          `Номера уже используются: ${existingPhones.map((p) => p.phone).join(', ')}`,
        );
      }

      // 3. Создание пользователя
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          isActive: isActive ?? true,
          ...userRest,
          profile: {
            create: {
              firstName: profile.firstName,
              lastName: profile.lastName,
              patronymic: profile.patronymic,
              gender: profile.gender as $Enums.Gender,
              dateOfBirth: profile.dateOfBirth
                ? new Date(profile.dateOfBirth)
                : null,
              passportSeries: profile.passportSeries,
              passportNumber: profile.passportNumber,
              issuedBy: profile.issuedBy,
              issuedDate: profile.issuedDate
                ? new Date(profile.issuedDate)
                : null,
              expiryDate: profile.expiryDate
                ? new Date(profile.expiryDate)
                : null,
              country: profile.country,
              region: profile.region,
              city: profile.city,
              address: profile.address,
              registration: profile.registration,
              district: profile.district,
            },
          },
        },
      });

      // 4. Создание телефонов
      await tx.userPhone.createMany({
        data: phone_numbers.map((p) => ({
          userId: user.id,
          phone: p.phone,
          isPrimary: p.isPrimary,
          note: p.note,
        })),
      });

      // 5. Логирование (если есть AuditHelper)
      if (this.auditHelper) {
        await this.auditHelper.log(tx, currentUser.orgId, {
          userId: currentUser.userId,
          action: 'CREATE',
          entity: 'User',
          entityId: user.id,
          newValue: {
            email: user.email,
            profile: {
              firstName: profile.firstName,
              lastName: profile.lastName,
            },
          },
          note: `Создан новый пользователь ${profile.firstName} ${profile.lastName}`,
        });
      }

      return tx.user.findUnique({
        where: { id: user.id },
        include: { profile: true, phone_numbers: true },
      });
    });

    return { data: result };
  }

  async createWithOutAuth(tenant: Tenant, dto: CreateTenantUserDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const { profile, phone_numbers, email, password, isActive, ...userRest } =
      dto;

    const hasPrimaryPhone = phone_numbers?.some((p) => p.isPrimary);
    if (!hasPrimaryPhone) {
      throw new BadRequestException(
        'At least one phone number must be marked as primary',
      );
    }

    // (опционально) запретить больше одного primary
    const primaryCount = phone_numbers.filter((p) => p.isPrimary).length;
    if (primaryCount > 1) {
      throw new BadRequestException(
        'Only one phone number can be marked as primary',
      );
    }

    const result = await client.$transaction(async (tx) => {
      // 1) Проверка дубликатов внутри запроса
      const inputPhones = phone_numbers.map((p) => p.phone);
      const duplicatesInPayload = Array.from(
        inputPhones.reduce(
          (m, x) => m.set(x, (m.get(x) ?? 0) + 1),
          new Map<string, number>(),
        ),
      )
        .filter(([, cnt]) => cnt > 1)
        .map(([phone]) => phone);

      if (duplicatesInPayload.length) {
        throw new BadRequestException(
          `Повторяющиеся номера в запросе: ${duplicatesInPayload.join(', ')}`,
        );
      }

      // 2) Проверка существующих телефонов в БД (глобально по @unique phone)
      const existing = await tx.userPhone.findMany({
        where: { phone: { in: inputPhones } },
        select: { phone: true },
      });
      if (existing.length) {
        const list = existing.map((e) => e.phone).join(', ');
        throw new BadRequestException(`Номера уже существуют: ${list}`);
      }

      const existingUser = await client.user.findUnique({
        where: { email: dto.email },
      });
      if (existingUser) {
        throw new ConflictException('Email уже зарегистрирован');
      }

      // 3) Создание пользователя
      const user = await tx.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          isActive: dto.isActive,
          ...userRest,
          profile: {
            create: {
              firstName: profile.firstName,
              lastName: profile.lastName,
              ...(profile.patronymic !== undefined
                ? { patronymic: profile.patronymic }
                : {}),

              ...(profile.gender
                ? { gender: profile.gender as $Enums.Gender }
                : {}),

              ...(profile.passportSeries !== undefined
                ? { passportSeries: profile.passportSeries }
                : {}),
              ...(profile.passportNumber !== undefined
                ? { passportNumber: profile.passportNumber }
                : {}),
              ...(profile.issuedBy !== undefined
                ? { issuedBy: profile.issuedBy }
                : {}),

              ...(profile.country !== undefined
                ? { country: profile.country }
                : {}),
              ...(profile.region !== undefined
                ? { region: profile.region }
                : {}),
              ...(profile.city !== undefined ? { city: profile.city } : {}),
              ...(profile.address !== undefined
                ? { address: profile.address }
                : {}),
              ...(profile.registration !== undefined
                ? { registration: profile.registration }
                : {}),
              ...(profile.district !== undefined
                ? { district: profile.district }
                : {}),

              dateOfBirth: profile.dateOfBirth
                ? new Date(profile.dateOfBirth)
                : null,
              issuedDate: profile.issuedDate
                ? new Date(profile.issuedDate)
                : null,
              expiryDate: profile.expiryDate
                ? new Date(profile.expiryDate)
                : null,
            },
          },
        },
      });

      // 4) Вставка телефонов — без skipDuplicates (пусть падает на реальном конфликте)
      const phoneData = phone_numbers.map((p) => ({
        userId: user.id,
        phone: p.phone,
        isPrimary: p.isPrimary,
        note: p.note,
      }));

      try {
        await tx.userPhone.createMany({ data: phoneData });
      } catch (e: any) {
        // Гонка: между проверкой и вставкой телефон мог появиться
        if (e?.code === 'P2002') {
          throw new BadRequestException(
            'Нарушение уникальности номера телефона',
          );
        }
        throw e;
      }

      // 5) Вернуть пользователя с профилем и телефонами
      return tx.user.findUnique({
        where: { id: user.id },
        include: { profile: true, phone_numbers: true, org_links: true },
      });
    });

    return result;
  }

  // ─── Обновление пользователя ─────────────────────────────────────
  async update(
    tenant: Tenant,
    currentUser: JwtAuthenticatedUser,
    id: string,
    dto: UpdateTenantUserDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const existing = await client.user.findUnique({
      where: { id },
      include: { profile: true, phone_numbers: true },
    });

    if (!existing) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Проверка уникальности email
    if (dto.email && dto.email !== existing.email) {
      const conflict = await client.user.findUnique({
        where: { email: dto.email },
      });
      if (conflict) {
        throw new ConflictException('Email уже используется');
      }
    }

    const result = await client.$transaction(async (tx) => {
      // 1. Обновление базовых полей пользователя
      const userData: Prisma.UserUpdateInput = {};
      if (dto.email) userData.email = dto.email;
      if (dto.password)
        userData.password = await bcrypt.hash(dto.password, this.SALT_ROUNDS);
      if (dto.isActive !== undefined) userData.isActive = dto.isActive;

      // 2. Обновление профиля
      if (dto.profile) {
        userData.profile = {
          update: {
            firstName: dto.profile.firstName,
            lastName: dto.profile.lastName,
            patronymic: dto.profile.patronymic,
            gender: dto.profile.gender as $Enums.Gender,
            dateOfBirth: dto.profile.dateOfBirth
              ? new Date(dto.profile.dateOfBirth)
              : undefined,
            // ... остальные поля профиля аналогично
          },
        };
      }

      await tx.user.update({ where: { id }, data: userData });

      // 3. Обработка телефонов
      if (dto.phonesToDelete?.length) {
        await tx.userPhone.deleteMany({
          where: { id: { in: dto.phonesToDelete }, userId: id },
        });
      }

      if (dto.phonesToUpdate?.length) {
        for (const phone of dto.phonesToUpdate) {
          await tx.userPhone.update({
            where: { id: phone.id },
            data: {
              phone: phone.phone,
              isPrimary: phone.isPrimary,
              note: phone.note,
            },
          });
        }
      }

      if (dto.phonesToAdd?.length) {
        await tx.userPhone.createMany({
          data: dto.phonesToAdd.map((p) => ({
            userId: id,
            phone: p.phone,
            isPrimary: p.isPrimary,
            note: p.note,
          })),
        });
      }

      // 4. Логирование
      if (this.auditHelper) {
        await this.auditHelper.log(tx, currentUser.orgId, {
          userId: currentUser.userId,
          action: 'UPDATE',
          entity: 'User',
          entityId: id,
          note: `Обновлён пользователь ${existing.profile?.firstName} ${existing.profile?.lastName}`,
        });
      }

      return tx.user.findUnique({
        where: { id },
        include: { profile: true, phone_numbers: true },
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

    const user = await client.user.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    // Нельзя удалять самого себя
    if (user.id === currentUser.userId) {
      throw new BadRequestException('Нельзя удалить самого себя');
    }

    await client.$transaction(async (tx) => {
      await tx.user.delete({ where: { id } });

      if (this.auditHelper) {
        await this.auditHelper.log(tx, currentUser.orgId, {
          userId: currentUser.userId,
          action: 'DELETE',
          entity: 'User',
          entityId: id,
          oldValue: {
            email: user.email,
            name: `${user.profile?.firstName} ${user.profile?.lastName}`,
          },
          note: `Удалён пользователь ${user.profile?.firstName} ${user.profile?.lastName}`,
        });
      }
    });

    return { message: 'Пользователь успешно удалён' };
  }

  async checkExistence(tenant: Tenant, identifier: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // 1. Ищем пользователя либо по email, либо через таблицу телефонов
    const user = await client.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          {
            phone_numbers: {
              some: { phone: identifier },
            },
          },
        ],
      },
      select: {
        id: true,
        email: true,
        org_links: {
          select: {
            role: true,
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(
        'Пользователь с таким email или телефоном не найден',
      );
    }

    // 2. Формируем удобный ответ
    return {
      userId: user.id,
      email: user.email,
      organizations: user.org_links.map((link) => ({
        organizationId: link.organization.id,
        organizationName: link.organization.name,
        role: link.role,
      })),
    };
  }
}
