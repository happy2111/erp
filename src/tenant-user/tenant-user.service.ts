import {
  BadRequestException,
  ConflictException,
  Injectable
} from '@nestjs/common';
import {PrismaService} from "../prisma/prisma.service";
import {CreateMainUserDto} from "../main-user/dto/create-main-user.dto";
import {CreateTenantDto} from "../tenants/dto/create-tenant.dto";
import {CreateTenantUserDto} from "./dto/create-tenant-user.dto";
import {PrismaTenantService} from "../prisma_tenant/prisma_tenant.service";
import {Tenant} from "@prisma/client";
import * as bcrypt from 'bcrypt';
import { $Enums, Prisma} from ".prisma/client-tenant";
import {TenantUserFilterDto, UserSortField} from "./dto/tenant-user-filter.dto";
import {UpdateTenantUserDto} from "./dto/update-tenant-user.dto";

@Injectable()
export class TenantUserService {
  constructor(
    private readonly prismaTenant: PrismaTenantService
  ) {}

  private readonly SALT_ROUNDS = 10;

  async create(tenant: Tenant, dto: CreateTenantUserDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const { profile, phone_numbers, email, password, isActive, ...userRest } = dto;

    const hasPrimaryPhone = phone_numbers?.some(p => p.isPrimary);
    if (!hasPrimaryPhone) {
      throw new BadRequestException('At least one phone number must be marked as primary');
    }

    // (опционально) запретить больше одного primary
    const primaryCount = phone_numbers.filter(p => p.isPrimary).length;
    if (primaryCount > 1) {
      throw new BadRequestException('Only one phone number can be marked as primary');
    }

    const result = await client.$transaction(async (tx) => {
      // 1) Проверка дубликатов внутри запроса
      const inputPhones = phone_numbers.map(p => p.phone);
      const duplicatesInPayload = Array.from(
        inputPhones.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<string, number>())
      )
        .filter(([, cnt]) => cnt > 1)
        .map(([phone]) => phone);

      if (duplicatesInPayload.length) {
        throw new BadRequestException(`Повторяющиеся номера в запросе: ${duplicatesInPayload.join(', ')}`);
      }

      // 2) Проверка существующих телефонов в БД (глобально по @unique phone)
      const existing = await tx.userPhone.findMany({
        where: { phone: { in: inputPhones } },
        select: { phone: true },
      });
      if (existing.length) {
        const list = existing.map(e => e.phone).join(', ');
        throw new BadRequestException(`Номера уже существуют: ${list}`);
      }

      const existingUser = await client.user.findUnique({ where: { email: dto.email } });
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
              ...(profile.patronymic !== undefined ? { patronymic: profile.patronymic } : {}),

              ...(profile.gender ? { gender: profile.gender as $Enums.Gender } : {}),

              ...(profile.passportSeries !== undefined ? { passportSeries: profile.passportSeries } : {}),
              ...(profile.passportNumber !== undefined ? { passportNumber: profile.passportNumber } : {}),
              ...(profile.issuedBy !== undefined ? { issuedBy: profile.issuedBy } : {}),


              ...(profile.country !== undefined ? { country: profile.country } : {}),
              ...(profile.region !== undefined ? { region: profile.region } : {}),
              ...(profile.city !== undefined ? { city: profile.city } : {}),
              ...(profile.address !== undefined ? { address: profile.address } : {}),
              ...(profile.registration !== undefined ? { registration: profile.registration } : {}),
              ...(profile.district !== undefined ? { district: profile.district } : {}),

              dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth) : null,
              issuedDate: profile.issuedDate ? new Date(profile.issuedDate) : null,
              expiryDate: profile.expiryDate ? new Date(profile.expiryDate) : null,
            },
          },
        },
      });

      // 4) Вставка телефонов — без skipDuplicates (пусть падает на реальном конфликте)
      const phoneData = phone_numbers.map(p => ({
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
          throw new BadRequestException('Нарушение уникальности номера телефона');
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

  async update(tenant: Tenant, id: string, dto: UpdateTenantUserDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // Быстрая проверка уникальности email (если меняется)
    if (dto.email) {
      const existing = await client.user.findUnique({ where: { email: dto.email } });
      if (existing && existing.id !== id) {
        throw new ConflictException('Email уже зарегистрирован');
      }
    }

    // Валидация телефонов: запретить больше одного primary в итоговом состоянии
    // Соберём флаги primary из всех операций
    const primaryAdds = dto.phonesToAdd?.filter(x => x.isPrimary) ?? [];
    const primaryUpdatesSetTrue = dto.phonesToUpdate?.filter(x => x.isPrimary === true) ?? [];
    const primaryUpdatesSetFalse = new Set((dto.phonesToUpdate?.filter(x => x.isPrimary === false).map(x => x.id)) ?? []);

    // Считаем текущее количество primary у пользователя (исключая те, что мы явно выключаем и включая те, что включаем)
    const currentPrimary = await client.userPhone.findMany({
      where: { userId: id, isPrimary: true },
      select: { id: true },
    });
    const stillPrimary = currentPrimary.filter(p => !primaryUpdatesSetFalse.has(p.id)).length;
    const willBePrimary = stillPrimary + primaryAdds.length + primaryUpdatesSetTrue.length;
    if (willBePrimary > 1) {
      throw new BadRequestException('Только один номер может быть основным (isPrimary)');
    }

    // Проверка глобальной уникальности телефонных номеров, которые мы пытаемся задать
    const phonesToCheck: string[] = [];
    if (dto.phonesToAdd?.length) phonesToCheck.push(...dto.phonesToAdd.map(x => x.phone));
    if (dto.phonesToUpdate?.length) {
      for (const u of dto.phonesToUpdate) if (u.phone) phonesToCheck.push(u.phone);
    }
    if (phonesToCheck.length) {
      const existingPhones = await client.userPhone.findMany({
        where: { phone: { in: phonesToCheck } },
        select: { phone: true },
      });
      if (existingPhones.length) {
        const list = existingPhones.map(x => x.phone).join(', ');
        throw new BadRequestException(`Номера уже существуют: ${list}`);
      }
    }

    const result = await client.$transaction(async (tx) => {
      // 1) Обновление User
      const userData: Prisma.UserUpdateInput = {};

      if (dto.email) userData.email = dto.email;
      if (dto.password) {
        const hashed = await bcrypt.hash(dto.password, this.SALT_ROUNDS);
        userData.password = hashed;
      }
      if (dto.isActive !== undefined) userData.isActive = dto.isActive;

      // 2) Обновление Profile (условные спреды)
      if (dto.profile) {
        const p = dto.profile;
        userData.profile = {
          update: {
            ...(p.firstName !== undefined ? { firstName: p.firstName } : {}),
            ...(p.lastName !== undefined ? { lastName: p.lastName } : {}),
            ...(p.patronymic !== undefined ? { patronymic: p.patronymic } : {}),
            ...(p.gender ? { gender: p.gender as unknown as $Enums.Gender } : {}),
            ...(p.passportSeries !== undefined ? { passportSeries: p.passportSeries } : {}),
            ...(p.passportNumber !== undefined ? { passportNumber: p.passportNumber } : {}),
            ...(p.issuedBy !== undefined ? { issuedBy: p.issuedBy } : {}),
            ...(p.country !== undefined ? { country: p.country } : {}),
            ...(p.region !== undefined ? { region: p.region } : {}),
            ...(p.city !== undefined ? { city: p.city } : {}),
            ...(p.address !== undefined ? { address: p.address } : {}),
            ...(p.registration !== undefined ? { registration: p.registration } : {}),
            ...(p.district !== undefined ? { district: p.district } : {}),
            ...(p.dateOfBirth ? { dateOfBirth: new Date(p.dateOfBirth) } : {}),
            ...(p.issuedDate ? { issuedDate: new Date(p.issuedDate) } : {}),
            ...(p.expiryDate ? { expiryDate: new Date(p.expiryDate) } : {}),
          },
        };
      }

      // Выполняем update пользователя (без телефонов)
      await tx.user.update({ where: { id }, data: userData });

      // 3) Телефоны: delete → update → create (надёжный порядок)
      if (dto.phonesToDelete?.length) {
        await tx.userPhone.deleteMany({ where: { id: { in: dto.phonesToDelete }, userId: id } });
      }

      if (dto.phonesToUpdate?.length) {
        for (const item of dto.phonesToUpdate) {
          const data: Prisma.UserPhoneUpdateInput = {};
          if (item.phone !== undefined) data.phone = item.phone;
          if (item.isPrimary !== undefined) data.isPrimary = item.isPrimary;
          if (item.note !== undefined) data.note = item.note;
          if (Object.keys(data).length) {
            try {
              await tx.userPhone.update({ where: { id: item.id }, data });
            } catch (e: any) {
              if (e?.code === 'P2002') {
                throw new BadRequestException('Нарушение уникальности номера телефона');
              }
              throw e;
            }
          }
        }
      }

      if (dto.phonesToAdd?.length) {
        const createData = dto.phonesToAdd.map(p => ({
          userId: id,
          phone: p.phone,
          isPrimary: p.isPrimary,
          note: p.note,
        }));
        try {
          await tx.userPhone.createMany({ data: createData });
        } catch (e: any) {
          if (e?.code === 'P2002') {
            throw new BadRequestException('Нарушение уникальности номера телефона');
          }
          throw e;
        }
      }

      // Возвращаем актуальные данные
      return tx.user.findUnique({
        where: { id },
        include: { profile: true, phone_numbers: true, org_links: true },
      });
    });

    return result;
  }


  async filter(tenant: Tenant, dto: TenantUserFilterDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const take = dto.limit;
    const skip = (dto.page - 1) * dto.limit;

    // 1. Build the dynamic WHERE clause
    const where: Prisma.UserWhereInput = {};

    if (dto.isActive !== undefined) {
      where.isActive = dto.isActive;
    }
    if (dto.roleId) {
      where.roleId = dto.roleId;
    }

    // 2. Логика сквозного поиска (search) по Email, Profile и Phone
    if (dto.search) {
      const emailFilter: Prisma.StringNullableFilter<'User'> = {
        contains: dto.search,
        mode: 'insensitive', // `'insensitive' as const` also works
      };
      const profileNameFilter: Prisma.StringFilter<'UserProfile'> = {
        contains: dto.search,
        mode: 'insensitive',
      };

      where.OR = [
        // Поиск по Email
        { email: emailFilter },

        // Поиск по UserProfile (FirstName/LastName)
        { profile: { firstName: profileNameFilter } },
        { profile: { lastName: profileNameFilter } },

        // Поиск по номеру телефона (используем `some`, т.к. телефонов может быть несколько)
        { phone_numbers: { some: { phone: { contains: dto.search } } } },
      ];
    }

    // 3. Define the ORDER BY clause
    // Если сортировка идет по полям профиля, Prisma требует специальный синтаксис.
    let orderBy: Prisma.UserOrderByWithRelationInput;
    const sortOrder = (dto.sortOrder ?? 'desc') as unknown as Prisma.SortOrder; // normalize to Prisma.SortOrder

    if (dto.sortBy === UserSortField.firstName || dto.sortBy === UserSortField.lastName) {
      const profileField = dto.sortBy === UserSortField.firstName ? 'firstName' : 'lastName';
      orderBy = {
        profile: {
          [profileField]: sortOrder,
        },
      };
    } else {
      // Only direct fields are allowed here. Narrow the key to valid User scalar keys used in your enum.
      const directKey = dto.sortBy as 'createdAt' | 'updatedAt' | 'email';
      orderBy = {
        [directKey]: sortOrder,
      } as Prisma.UserOrderByWithRelationInput; // assert the final shape
    }

    // 3) Query
    const [data, total] = await client.$transaction([
      client.user.findMany({
        where,
        take,
        skip,
        include: {
          profile: true,
          role: true,
          phone_numbers: true,
        },
        orderBy,
      }),
      client.user.count({ where }),
    ]);

    return { data, total, page: dto.page, limit: dto.limit };
  }
}
