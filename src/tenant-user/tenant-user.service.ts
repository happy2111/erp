import {BadRequestException, Injectable} from '@nestjs/common';
import {PrismaService} from "../prisma/prisma.service";
import {CreateMainUserDto} from "../main-user/dto/create-main-user.dto";
import {CreateTenantDto} from "../tenants/dto/create-tenant.dto";
import {CreateTenantUserDto} from "./dto/create-tenant-user.dto";
import {PrismaTenantService} from "../prisma_tenant/prisma_tenant.service";
import {Tenant} from "@prisma/client";
import * as bcrypt from 'bcrypt';
import {use} from "passport";
import { $Enums} from ".prisma/client-tenant";

@Injectable()
export class TenantUserService {
  constructor(
    private readonly prismaTenant: PrismaTenantService
  ) {}

  private readonly SALT_ROUNDS = 10;

  async create(tenant: Tenant, dto: CreateTenantUserDto) {
    const client =  this.prismaTenant.getTenantPrismaClient(tenant);

    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    const {
      profile,
      phone_numbers,
      email,
      password, // Игнорируем исходный пароль
      isActive,
      ...userRest // Другие поля User, если есть
    } = dto;

    const hasPrimaryPhone = phone_numbers.some(p => p.isPrimary);

    if (!hasPrimaryPhone) {
      throw new BadRequestException('At least one phone number must be marked as primary');
    }

    const result = await client.$transaction(async (tx) => {
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
              patronymic: profile.patronymic,

              ...(profile.gender ? { gender: profile.gender as $Enums.Gender } : {}),

              dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth) : null,
              issuedDate: profile.issuedDate ? new Date(profile.issuedDate) : null,
              expiryDate: profile.expiryDate ? new Date(profile.expiryDate) : null,

              country: profile.country,
              city: profile.city,
            }
          }
        }


      })

      const phoneData = phone_numbers.map(p => ({
        userId: user.id,
        phone: p.phone,
        isPrimary: p.isPrimary,
        note: p.note,
      }))

      await tx.userPhone.createMany({
        data: phoneData,
        skipDuplicates: true, // Игнорировать дубликаты, если они есть (основано на @unique phone)
      });

      return tx.user.findUnique({
        where: { id: user.id },
        include: {
          profile: true,
          phone_numbers: true,
          org_links: true, // Чтобы знать, к какой организации он принадлежит
        }
      });
    })

    return result;

  }

}
