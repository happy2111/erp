import {
  BadRequestException,
  Injectable,
  InternalServerErrorException
} from '@nestjs/common';
import {PrismaTenantService} from "../prisma_tenant/prisma_tenant.service";
import {Tenant} from "@prisma/client";
import {CreateOrgCustomerDto} from "./dto/create-org-customer.dto";
import {ConvertCustomerToUserDto} from "./dto/convert-customer-to-user.dto";
import  { Prisma } from '.prisma/client-tenant';
import * as bcrypt from 'bcrypt';
import {OrganizationCustomerFilterDto} from "./dto/filter-org-customer.dto";

@Injectable()
export class OrganizationCustomerService {
  constructor(
    private readonly prismaTenant: PrismaTenantService
  ) {}

  async create(tenant: Tenant, dto: CreateOrgCustomerDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // 0) Ensure organization exists in THIS tenant DB
    const org = await client.organization.findUnique({ where: { id: dto.organizationId } });
    if (!org) {
      throw new BadRequestException(`Organization not found by id ${dto.organizationId}`);
    }

    // 1) Optional userId: ensure user exists (still optional)
    if (dto.userId) {
      const user = await client.user.findUnique({ where: { id: dto.userId } });
      if (!user) {
        throw new BadRequestException(`User not found by id ${dto.userId}`);
      }

      const orgCustomer = await client.organizationCustomer.findFirst({
        where: { userId: dto.userId },
      });
      if (orgCustomer) {
        throw new BadRequestException('Customer with this userId already exists');
      }
    }

    // 2) Check duplicate phone among organization customers (you already do this)
    const existingByPhone = await client.organizationCustomer.findFirst({
      where: { phone: dto.phone },
    });
    if (existingByPhone) {
      throw new BadRequestException(`Customer with phone ${dto.phone} already exists`);
    }

    // 3) Create with robust error handling
    try {
      return await client.organizationCustomer.create({
        data: {
          organizationId: dto.organizationId,
          userId: dto.userId ?? null,
          firstName: dto.firstName,
          lastName: dto.lastName,
          patronymic: dto.patronymic ?? null,
          phone: dto.phone,
          type: dto.type,
          isBlacklisted: dto.isBlacklisted ?? false,
        },
      });
    } catch (e: any) {
      // Map Prisma errors to readable messages
      if (e?.code === 'P2003') {
        // Which FK? Check based on provided fields
        const reason = dto.userId
          ? 'organizationId or userId does not exist in this tenant database'
          : 'organizationId does not exist in this tenant database';
        throw new BadRequestException(`Foreign key constraint failed: ${reason}.`);
      }
      if (e?.code === 'P2002') {
        // If you later add unique constraints (e.g., phone), handle here
        const target = (e.meta && (e.meta as any).target) ? (e.meta as any).target.join(', ') : 'unknown';
        throw new BadRequestException(`Unique constraint failed on: ${target}`);
      }
      // Don’t hide the real error type
      throw e;
    }
  }


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
          throw new BadRequestException('Customer not found or already converted to user');
        }

        // 2) Доп. проверка существующих пользователей по email/phone внутри транзакции
        const orConditions: Prisma.UserWhereInput[] = [];
        if (dto.user.email) orConditions.push({ email: dto.user.email });
        if (orgCustomer.phone) orConditions.push({ phone_numbers: { some: { phone: orgCustomer.phone } } });
        for (const p of phonesToAdd) {
          if (p.phone) orConditions.push({ phone_numbers: { some: { phone: p.phone } } });
        }

        if (orConditions.length > 0) {
          const existing = await tx.user.findFirst({ where: { OR: orConditions }, include: { phone_numbers: true } });

          if (existing) {
            const conflicts: string[] = [];

            if (dto.user.email && existing.email === dto.user.email) {
              conflicts.push(`email: ${dto.user.email}`);
            }

            // Проверяем основной телефон клиента
            if (orgCustomer.phone && existing.phone_numbers.some(p => p.phone === orgCustomer.phone)) {
              conflicts.push(`phone: ${orgCustomer.phone}`);
            }

            // Проверяем телефоны из dto
            if (dto.phonesToAdd && dto.phonesToAdd.length > 0) {
              for (const p of dto.phonesToAdd) {
                if (existing.phone_numbers.some(ep => ep.phone === p.phone)) {
                  conflicts.push(`phone: ${p.phone}`);
                }
              }
            }

            console.log('Conflict fields:', conflicts);
            throw new BadRequestException(`User already exists with ${conflicts.join(', ')}`);
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
          const target = (e.meta && (e.meta as any).target) ? (e.meta as any).target.join(', ') : 'unknown';
          throw new BadRequestException(`Unique constraint failed on the fields: ${target}`);
        }
      }

      if (e instanceof BadRequestException) throw e;

      console.error('convertCustomerToUser unexpected error:', e);
      new InternalServerErrorException('Error converting customer to user');
    }
  }

  async filter(tenant: Tenant, dto: OrganizationCustomerFilterDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const take = dto.limit;
    const skip = (dto.page - 1) * dto.limit;

    // 1️⃣ Build WHERE
    const where: Prisma.OrganizationCustomerWhereInput = {};

    if (dto.isBlacklisted !== undefined) {
      where.isBlacklisted = dto.isBlacklisted;
    }

    if (dto.organizationId) {
      where.organizationId = dto.organizationId;
    }

    // 2️⃣ Поиск по имени, фамилии, телефону
    if (dto.search) {
      const searchFilter = {
        contains: dto.search,
        mode: 'insensitive' as const,
      };
      where.OR = [
        { firstName: searchFilter },
        { lastName: searchFilter },
        { patronymic: searchFilter },
        { phone: { contains: dto.search } },
      ];
    }

    // 3️⃣ Сортировка (просто по любому полю)
    const orderBy: Prisma.OrganizationCustomerOrderByWithRelationInput = {
      [dto.sortBy ?? 'createdAt']: dto.sortOrder ?? 'desc',
    };

    // 4️⃣ Выполняем запрос
    const [data, total] = await client.$transaction([
      client.organizationCustomer.findMany({
        where,
        take,
        skip,
        orderBy,
      }),
      client.organizationCustomer.count({ where }),
    ]);

    return {
      data,
      total,
      page: dto.page,
      limit: dto.limit,
    };
  }




}
