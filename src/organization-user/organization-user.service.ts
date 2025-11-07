import { Injectable} from '@nestjs/common';
import {PrismaTenantService} from "../prisma_tenant/prisma_tenant.service";
import {Tenant} from "@prisma/client";
import {Prisma} from ".prisma/client-tenant"
import {CreateOrganizationUserDto} from "./dto/create-org-user.dto";
import {OrgUserFilterDto} from "./dto/org-user-filter.dto";

@Injectable()
export class OrganizationUserService {
  constructor(
    private readonly prismaTenant: PrismaTenantService
  ) {
  }

  async create(tenant: Tenant, dto: CreateOrganizationUserDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    return client.organizationUser.create({
      data: {
        ...dto
      }
    })
  }

  async filter(tenant: Tenant, dto: OrgUserFilterDto) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);

    const take = dto.page;
    const skip = (dto.page - 1) * dto.limit;


    const where: Prisma.OrganizationUserWhereInput = {};

    if (dto.organizationId) {
      where.organizationId = dto.organizationId;
    }

    if (dto.role) {
      where.role = dto.role;
    }

    const [data, total] = await client.$transaction([
      client.organizationUser.findMany({
        where,
        take,
        skip,
        // Optional: Include related data like 'organization' and 'user'
        include: {
          organization: true,
          user: true,
        },
        orderBy: {
          createdAt: 'desc', // Example: Order by creation date descending
        }
      }),
      client.organizationUser.count({
        where,
      }),
    ]);


  }
}
