import { Injectable } from '@nestjs/common';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import {PrismaService} from "../prisma/prisma.service";
import {PrismaTenantService} from "../prisma_tenant/prisma_tenant.service";
import { Tenant } from "@prisma/client";
import {CreateTenantUserDto} from "../tenant-user/dto/create-tenant-user.dto";
import {TenantUserService} from "../tenant-user/tenant-user.service";
import {
  CreateOrganizationUserDto
} from "../organization-user/dto/create-org-user.dto";

@Injectable()
export class OrganizationService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    ) {
  }

  create(tenant: Tenant, createOrganizationDto: CreateOrganizationDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    return client.organization.create({
      data: createOrganizationDto,
    })
  }



  findAll(tenant: Tenant) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant)

    return client.organization.findMany()
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
