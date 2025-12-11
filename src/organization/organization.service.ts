import {
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import {PrismaTenantService} from "../prisma_tenant/prisma_tenant.service";
import { Tenant } from "@prisma/client";
import {GetOrganizationsQueryDto} from "./dto/get-organizations-query.dto";

@Injectable()
export class OrganizationService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    ) {
  }

  async create(tenant: Tenant, createOrganizationDto: CreateOrganizationDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    return client.organization.create({
      data: createOrganizationDto,
    })
  }

  async findAllForUser(tenant: Tenant, userId: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    return client.organization.findMany({
      where: {
        org_users: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        org_users: {
          where: { userId },
          select: { role: true, position: true },
        },
        settings: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForUser(tenant: Tenant, userId: string, orgId: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const org = await client.organization.findFirst({
      where: {
        id: orgId,
        org_users: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        org_users: {
          where: { userId },
          select: { role: true, position: true },
        },
        settings: true,
        kassas: true,
        // что нужно
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found or access denied');
    }

    return org;
  }


  async findAll(tenant: Tenant, query: GetOrganizationsQueryDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const { search, order = "desc", sortField = "createdAt" } = query;

    return client.organization.findMany({
      where: search
        ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        }
        : undefined,

      orderBy: {
        [sortField]: order,
      },
    });
  }



  findById(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant)
    const org = client.organization.findUnique({
      where: {id}
    })
    return org
  }

  async update(tenant: Tenant, id: string, updateOrganizationDto: UpdateOrganizationDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    // Проверяем, существует ли организация
    const existing = await client.organization.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Organization with id ${id} not found`);
    }

    // Обновляем только переданные поля
    return client.organization.update({
      where: { id },
      data: {
        ...updateOrganizationDto,
      },
    });
  }

  async remove(tenant: Tenant, id: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const exisiting = await client.organization.findUnique({where: {id}})
    if (!exisiting) {
      throw new Error(`Organization with id ${id} not found`)
    }

    await client.organization.delete({where: {id}})


    // await client.$transaction([
    //   client.organizationUser.deleteMany({ where: { organizationId: id } }),
    //   client.organizationCustomer.deleteMany({ where: { organizationId: id } }),
    //   client.kassa.deleteMany({ where: { organizationId: id } }),
    //   client.payment.deleteMany({ where: { organizationId: id } }),
    //   // ...
    //   client.organization.delete({ where: { id } }),
    // ]);

  }
}
