import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import { Tenant } from '@prisma/client';
import { CreateOrgCustomerDto } from './dto/create-org-customer.dto';
import { ConvertCustomerToUserDto } from './dto/convert-customer-to-user.dto';
import { Prisma } from '.prisma/client-tenant';
import * as bcrypt from 'bcrypt';
import { OrganizationCustomerFilterDto } from './dto/filter-org-customer.dto';
import { UpdateOrgCustomerDto } from './dto/update-org-customer.dto';

@Injectable()
export class OrganizationCustomerService {
  constructor(private readonly prismaTenant: PrismaTenantService) {}

  async convertCustomerToUser(tenant: Tenant, dto: ConvertCustomerToUserDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const phonesToAdd = dto.phonesToAdd ?? [];

    try {
      const result = await client.$transaction(async (tx) => {
        // 1) Найти клиента и убедиться, что userId === null
        const orgCustomer = await tx.organizationCustomer.findFirst({
          where: { id: dto.customerId, userId: null },
        });

        if (!orgCustomer) {
          throw new BadRequestException(
            'Customer not found or already converted to user',
          );
        }

        // 2) Доп. проверка существующих пользователей по email/phone внутри транзакции
        const orConditions: Prisma.UserWhereInput[] = [];
        if (dto.user.email) orConditions.push({ email: dto.user.email });
        if (orgCustomer.phone)
          orConditions.push({
            phone_numbers: { some: { phone: orgCustomer.phone } },
          });
        for (const p of phonesToAdd) {
          if (p.phone)
            orConditions.push({ phone_numbers: { some: { phone: p.phone } } });
        }

        if (orConditions.length > 0) {
          const existing = await tx.user.findFirst({
            where: { OR: orConditions },
            include: { phone_numbers: true },
          });

          if (existing) {
            const conflicts: string[] = [];

            if (dto.user.email && existing.email === dto.user.email) {
              conflicts.push(`email: ${dto.user.email}`);
            }

            // Проверяем основной телефон клиента
            if (
              orgCustomer.phone &&
              existing.phone_numbers.some((p) => p.phone === orgCustomer.phone)
            ) {
              conflicts.push(`phone: ${orgCustomer.phone}`);
            }

            // Проверяем телефоны из dto
            if (dto.phonesToAdd && dto.phonesToAdd.length > 0) {
              for (const p of dto.phonesToAdd) {
                if (existing.phone_numbers.some((ep) => ep.phone === p.phone)) {
                  conflicts.push(`phone: ${p.phone}`);
                }
              }
            }

            console.log('Conflict fields:', conflicts);
            throw new BadRequestException(
              `User already exists with ${conflicts.join(', ')}`,
            );
          }
        }

        // 3) Хешируем пароль
        const hashedPassword = await bcrypt.hash(dto.user.password, 10);

        // 4) Создаем пользователя с профилем
        const newUser = await tx.user.create({
          data: {
            ...(dto.user.email ? { email: dto.user.email } : {}),
            password: hashedPassword,
            isActive: dto.user.isActive ?? true,
            profile: {
              create: {
                firstName: orgCustomer.firstName,
                lastName: orgCustomer.lastName,
                patronymic: orgCustomer.patronymic,
                ...dto.user.profile,
              },
            },
          },
          include: { profile: true },
        });

        // 5) Обновляем organizationCustomer.userId
        await tx.organizationCustomer.update({
          where: { id: orgCustomer.id },
          data: { userId: newUser.id },
        });

        // 6) Подготовка телефонов (только non-empty)
        const phonesData: Prisma.UserPhoneCreateManyInput[] = [];
        if (orgCustomer.phone) {
          phonesData.push({
            userId: newUser.id,
            phone: orgCustomer.phone,
            isPrimary: true,
            note: 'Converted from OrganizationCustomer',
          });
        }
        for (const p of phonesToAdd) {
          if (!p.phone) continue;
          phonesData.push({
            userId: newUser.id,
            phone: p.phone,
            isPrimary: false,
            note: p.note ?? null,
          });
        }

        // 7) Вставляем телефоны. Можно использовать skipDuplicates: true (если хочешь игнорировать дубли)
        if (phonesData.length > 0) {
          await tx.userPhone.createMany({
            data: phonesData,
            skipDuplicates: true, // опционально — в Postgres это использует ON CONFLICT DO NOTHING
          });
        }

        // 8) Возвращаем пользователя с профилем и телефонами
        const finalUser = await tx.user.findUnique({
          where: { id: newUser.id },
          include: { profile: true, phone_numbers: true },
        });

        return finalUser;
      });

      return result;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          const target =
            e.meta && (e.meta as any).target
              ? (e.meta as any).target.join(', ')
              : 'unknown';
          throw new BadRequestException(
            `Unique constraint failed on the fields: ${target}`,
          );
        }
      }

      if (e instanceof BadRequestException) throw e;

      console.error('convertCustomerToUser unexpected error:', e);
      throw new InternalServerErrorException(
        e.message || 'Error converting customer to user',
      );
    }
  }

  async getAllAdmin(
    tenant: Tenant,
    orgId: string,
    query: OrganizationCustomerFilterDto,
  ): Promise<{ items: any[]; total: number }> {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      isBlacklisted,
      type,
    } = query;

    const where: Prisma.OrganizationCustomerWhereInput = {
      organizationId: orgId,
    };

    if (isBlacklisted !== undefined) {
      where.isBlacklisted = isBlacklisted;
    }

    if (type) {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { patronymic: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      client.organizationCustomer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        // можно добавить include при необходимости
      }),
      client.organizationCustomer.count({ where }),
    ]);

    return { items, total };
  }

  async getByIdAdmin(tenant: Tenant, orgId: string, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const customer = await client.organizationCustomer.findFirst({
      where: {
        id,
        organizationId: orgId,
      },
    });

    if (!customer) {
      throw new NotFoundException(
        'Клиент не найден или принадлежит другой организации',
      );
    }

    return customer;
  }

  async create(tenant: Tenant, orgId: string, dto: CreateOrgCustomerDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const existing = await client.organizationCustomer.findFirst({
      where: { phone: dto.phone, organizationId: orgId },
    });

    if (existing) {
      throw new ConflictException(
        `Клиент с номером ${dto.phone} уже существует в этой организации`,
      );
    }

    return client.organizationCustomer.create({
      data: {
        organizationId: orgId,
        userId: dto.userId ?? null,
        firstName: dto.firstName,
        lastName: dto.lastName,
        patronymic: dto.patronymic ?? null,
        phone: dto.phone,
        type: dto.type,
        isBlacklisted: dto.isBlacklisted ?? false,
      },
    });
  }

  async update(
    tenant: Tenant,
    orgId: string,
    id: string,
    dto: UpdateOrgCustomerDto,
  ) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const existing = await client.organizationCustomer.findFirst({
      where: { id, organizationId: orgId },
      include: { user: { include: { profile: true } } },
    });

    if (!existing) {
      throw new NotFoundException(
        'Клиент не найден или принадлежит другой организации',
      );
    }

    return client.$transaction(async (tx) => {
      const updated = await tx.organizationCustomer.update({
        where: { id },
        data: dto,
      });

      // Синхронизация с user / profile, если есть связь (как в твоём текущем коде)
      if (existing.userId && existing.user) {
        const profileData: Prisma.UserProfileUpdateInput = {};
        if (dto.firstName) profileData.firstName = dto.firstName;
        if (dto.lastName) profileData.lastName = dto.lastName;
        if (dto.patronymic !== undefined)
          profileData.patronymic = dto.patronymic;

        if (Object.keys(profileData).length > 0) {
          await tx.userProfile.update({
            where: { userId: existing.userId },
            data: profileData,
          });
        }

        // телефон синхронизируется через UserPhone (как в твоём коде)
        if (dto.phone && dto.phone !== existing.phone) {
          const primaryPhone = await tx.userPhone.findFirst({
            where: { userId: existing.userId, isPrimary: true },
          });

          if (primaryPhone) {
            await tx.userPhone.update({
              where: { id: primaryPhone.id },
              data: { phone: dto.phone },
            });
          } else {
            await tx.userPhone.create({
              data: {
                userId: existing.userId,
                phone: dto.phone,
                isPrimary: true,
                note: 'Обновлено из OrganizationCustomer',
              },
            });
          }
        }
      }

      return updated;
    });
  }

  async hardDelete(tenant: Tenant, orgId: string, id: string): Promise<void> {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const customer = await client.organizationCustomer.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!customer) {
      throw new NotFoundException('Клиент не найден');
    }

    if (customer.userId) {
      throw new BadRequestException(
        'Нельзя удалить клиента, связанного с пользователем системы',
      );
    }

    await client.organizationCustomer.delete({ where: { id } });
  }
}
