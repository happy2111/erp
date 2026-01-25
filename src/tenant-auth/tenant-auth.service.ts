import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { SignOptions } from 'jsonwebtoken';
import { JwtPayload, JwtUser } from './interfaces/jwt.interface';
import { PrismaTenantService } from '../prisma_tenant/prisma_tenant.service';
import type { Response, Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OrgUserRole, Prisma } from '.prisma/client-tenant';
import { TenantLoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { Tenant } from '@prisma/client';
import {
  OrganizationUserWithRelations,
  UserForSerialization,
  UserWithAuthRelations,
} from './types/user';

@Injectable()
export class TenantAuthService {
  private readonly JWT_ACCESS_TOKEN_TTL: SignOptions['expiresIn'];
  private readonly JWT_REFRESH_TOKEN_TTL: SignOptions['expiresIn'];
  private readonly COOKIE_DOMAIN: string;

  constructor(
    private readonly prismaTenant: PrismaTenantService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.JWT_ACCESS_TOKEN_TTL = configService.getOrThrow(
      'TENANT_JWT_ACCESS_TOKEN_TTL',
    );
    this.JWT_REFRESH_TOKEN_TTL = configService.getOrThrow(
      'TENANT_JWT_REFRESH_TOKEN_TTL',
    );
    this.COOKIE_DOMAIN = configService.getOrThrow('COOKIE_DOMAIN');
  }

  async login(res: Response, tenant: Tenant, dto: TenantLoginDto) {
    const client = await this.prismaTenant.getTenantClientById(tenant.id);
    const loginType = this.determineLoginType(dto.login);

    const user = await this.findUser(client, dto, loginType);

    if (!user) {
      throw new NotFoundException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const orgUsers = user.org_links; // TS теперь знает, что это массив OrganizationUser[]

    if (orgUsers.length === 0) {
      throw new NotFoundException('User has no organizations');
    }

    if (orgUsers.length > 1) {
      const tempToken = this.jwtService.sign(
        {
          sub: user.id,
          tenantId: tenant.id,
          purpose: 'ORG_SELECTION',
        },
        { expiresIn: '5m' },
      );
      this.setAccessCookie(
        res,
        tempToken,
        new Date(Date.now() + 5 * 60 * 1000),
      );

      const orgsWithNames = await Promise.all(
        orgUsers.map(async (ou) => {
          const org = await client.organization.findUnique({
            where: { id: ou.organizationId },
            select: { name: true },
          });

          return {
            orgName: org?.name || 'Unknown',
            orgUserId: ou.id,
            orgId: ou.organizationId,
            role: ou.role,
          };
        }),
      );

      return {
        requiresOrgSelection: true,
        organizations: orgsWithNames,
        apiKey: tenant.apiKey,
      };
    }

    return this.authWithOrgUser(res, user, tenant, orgUsers[0]);
  }

  async refresh(res: Response, req: Request, tenant: Tenant) {
    const token = req.cookies?.refreshToken as string | undefined;
    if (!token) {
      throw new UnauthorizedException('No refresh token provided');
    }

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.purpose === 'ORG_SELECTION') {
      throw new UnauthorizedException(
        'ORG_SELECTION token cannot be refreshed',
      );
    }

    if (!payload.orgUserId || !payload.orgId) {
      throw new UnauthorizedException('Invalid refresh token payload');
    }

    const client = await this.prismaTenant.getTenantClientById(tenant.id);

    const orgUser = await client.organizationUser.findUnique({
      where: { id: payload.orgUserId },
      include: {
        user: {
          include: {
            profile: true,
            phone_numbers: true,
          },
        },
      },
    });

    if (!orgUser || !orgUser.user.isActive) {
      throw new UnauthorizedException();
    }

    return this.authWithOrgUser(res, orgUser.user, tenant, orgUser);
  }

  async validate(payload: JwtPayload): Promise<JwtUser> {
    const userBase = {
      userId: payload.sub,
      tenantId: payload.tenantId,
    };

    if (payload.purpose === 'ORG_SELECTION') {
      return {
        ...userBase,
        purpose: payload.purpose,
      };
    }

    if (!payload.orgId || !payload.orgUserId || !payload.role) {
      throw new UnauthorizedException('Invalid token payload structure');
    }

    const client = await this.prismaTenant.getTenantClientById(
      payload.tenantId,
    );

    const orgUser = await client.organizationUser.findUnique({
      where: { id: payload.orgUserId }, // Здесь TS может еще ругаться, см. ниже
      include: { user: true },
    });

    if (!orgUser || !orgUser.user.isActive) {
      throw new UnauthorizedException();
    }

    return {
      ...userBase,
      orgId: payload.orgId,
      orgUserId: payload.orgUserId,
      role: payload.role,
    } as JwtUser;
  }

  private authWithOrgUser(
    res: Response,
    user: UserForSerialization,
    tenant: Tenant,
    orgUser: OrganizationUserWithRelations,
  ) {
    const payload: JwtPayload = {
      sub: user.id,
      tenantId: tenant.id,
      orgId: orgUser.organizationId,
      orgUserId: orgUser.id,
      role: orgUser.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.JWT_ACCESS_TOKEN_TTL,
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.JWT_REFRESH_TOKEN_TTL,
    });

    this.setAccessCookie(
      res,
      accessToken,
      new Date(Date.now() + 15 * 60 * 1000),
    );
    this.setRefreshCookie(
      res,
      refreshToken,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );

    return {
      user: this.serializeUser(user, orgUser.role),
      organizationId: orgUser.organizationId,
      apiKey: tenant.apiKey,
    };
  }

  private setAccessCookie(res: Response, value: string, expires: Date) {
    res.cookie('accessToken', value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      domain: this.COOKIE_DOMAIN,
      path: '/',
      expires,
    });
  }

  private setRefreshCookie(res: Response, value: string, expires: Date) {
    res.cookie('refreshToken', value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      domain: this.COOKIE_DOMAIN,
      path: '/tenant-auth/refresh', // 🔥 важно
      expires,
    });
  }

  private determineLoginType(login: string): 'email' | 'phone' | 'unknown' {
    // Очень простая проверка на наличие символа '@'
    if (login.includes('@')) {
      return 'email';
    }

    const phoneRegex = /^\+?[0-9\s-]+$/;
    if (phoneRegex.test(login)) {
      return 'phone';
    }

    return 'unknown';
  }

  private serializeUser(user: UserForSerialization, role: OrgUserRole) {
    return {
      id: user.id,
      firstName: user.profile?.firstName ?? null,
      lastName: user.profile?.lastName ?? null,
      role,
      phoneNumbers: user.phone_numbers.map((p) => ({
        id: p.id,
        phone: p.phone,
        isPrimary: p.isPrimary,
      })),
    };
  }

  private async findUser(
    client: Prisma.TransactionClient,
    dto: TenantLoginDto,
    loginType: 'email' | 'phone' | 'unknown',
  ): Promise<UserWithAuthRelations | null> {
    const commonInclude: Prisma.UserInclude = {
      profile: true,
      phone_numbers: true,
      org_links: true,
    };

    if (loginType === 'email') {
      return (await client.user.findUnique({
        where: { email: dto.login },
        include: commonInclude,
      })) as UserWithAuthRelations | null;
    }

    if (loginType === 'phone') {
      const phoneEntry = await client.userPhone.findFirst({
        where: { phone: dto.login },
        include: {
          user: {
            include: commonInclude,
          },
        },
      });

      return (phoneEntry?.user as UserWithAuthRelations) ?? null;
    }

    return null;
  }

  async switchOrganization(
    res: Response,
    tenant: Tenant,
    userId: string,
    orgUserId: string,
  ) {
    const client = await this.prismaTenant.getTenantClientById(tenant.id);

    const orgUser = await client.organizationUser.findUnique({
      where: { id: orgUserId },
      include: {
        user: {
          include: {
            profile: true,
            phone_numbers: true,
          },
        },
      },
    });

    if (!orgUser || orgUser.userId !== userId) {
      throw new UnauthorizedException();
    }

    if (!orgUser || orgUser.userId !== userId) {
      throw new UnauthorizedException();
    }

    return this.authWithOrgUser(res, orgUser.user, tenant, orgUser);
  }
}
