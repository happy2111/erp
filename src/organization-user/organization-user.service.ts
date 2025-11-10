import {
  BadRequestException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {PrismaTenantService} from "../prisma_tenant/prisma_tenant.service";
import {Tenant} from "@prisma/client";
import {OrgUserRole, Prisma} from ".prisma/client-tenant"
import {CreateOrganizationUserDto} from "./dto/create-org-user.dto";
import {OrgUserFilterDto} from "./dto/org-user-filter.dto";
import {TenantUserService} from "../tenant-user/tenant-user.service";
import {CreateTenantUserDto} from "../tenant-user/dto/create-tenant-user.dto";
import {UpdateOrganizationUserDto} from "./dto/update-organization-user.dto";

@Injectable()
export class OrganizationUserService {
  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly tenantUserService: TenantUserService
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

  async createWithTenantUser(
    tenant: Tenant,
    organizationId: string,
    role: OrgUserRole,
    position: string | undefined,
    createTenantUserDto: CreateTenantUserDto
  ) {
    try {
      // создаём пользователя в tenant DB
      const user = await this.tenantUserService.create(tenant, createTenantUserDto);
      if (!user) {
        throw new Error('User creation failed — no user returned');
      }

      if (!role) throw new BadRequestException('Role is required');

      // собираем DTO для organizationUser
      const orgUser: CreateOrganizationUserDto = {
        organizationId,
        userId: user.id,
        role,
        ...(position ? {position} : {}),
      };

      // создаём запись organizationUser
      await this.create(tenant, orgUser);

      return user;
    } catch (e) {
      console.error(e);
      throw new Error('Error creating user with organization relation');
    }
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

  async update(
    tenant: Tenant,
    id: string,
    updateDto: UpdateOrganizationUserDto,
  ) {
    const existing = await this.prismaTenant[tenant.dbName].organizationUser.findUnique({
      where: {id},
    });

    if (!existing) {
      throw new NotFoundException(`OrganizationUser with id ${id} not found`);
    }

    return this.prismaTenant[tenant.dbName].organizationUser.update({
      where: {id},
      data: {
        ...(updateDto.role ? {role: updateDto.role} : {}),
        ...(updateDto.position ? {position: updateDto.position} : {}),
      },
      include: {
        organization: true,
        user: {
          include: {
            profile: true,
            phone_numbers: true,
          },
        },
      },
    });
  }

  async delete(tenant: Tenant, id: string, performedByUserId?: string) {
    const client = this.prismaTenant.getTenantPrismaClient(tenant);
    const existingUser = await client.organizationUser.findUnique({
      where: {id},
    });

    if (!existingUser) {
      throw new NotFoundException(`Organization user with ID ${id} not found`);
    }


    await client.$transaction(async (tx) => {
      await tx.organizationUser.delete({
        where: {id},
      });

      await tx.auditLog.create({
        data: {
          organizationId: existingUser.organizationId,
          userId: performedByUserId ?? null,
          action: 'DELETE',
          entity: 'OrganizationUser',
          entityId: id,
          oldValue: existingUser,
          newValue: undefined,
          note: `Organization user deleted by user ${performedByUserId || 'system'}`,
        },
      });
    });
    return {message: 'Organization user deleted successfully'};
  }
}
