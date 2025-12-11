import {
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import type { SignOptions } from 'jsonwebtoken';
import {JwtPayload} from "./interfaces/jwt.interface";
import {PrismaTenantService} from "../prisma_tenant/prisma_tenant.service";
import type {Response, Request} from "express";
import {JwtService} from "@nestjs/jwt";
import {ConfigService} from "@nestjs/config";
import { OrgUserRole } from '.prisma/client-tenant';
import {TenantLoginDto} from "./dto/login.dto";
import * as bcrypt from 'bcrypt';
import {JwtTokens} from "./interfaces/jwt-tokens.interface";
import {Tenant} from "@prisma/client";

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
    this.JWT_ACCESS_TOKEN_TTL = configService.getOrThrow("TENANT_JWT_ACCESS_TOKEN_TTL")
    this.JWT_REFRESH_TOKEN_TTL = configService.getOrThrow("TENANT_JWT_REFRESH_TOKEN_TTL")
    this.COOKIE_DOMAIN = configService.getOrThrow("COOKIE_DOMAIN")
  }

  async login(res: Response, tenant: Tenant, dto: TenantLoginDto) {
    const client = await this.prismaTenant.getTenantClientById(tenant.id)
    const loginType = this.determineLoginType(dto.login);
    let user: any;

    if (loginType === 'email') {
      user = await client.user.findUnique({
        where: { email: dto.login },
        include: {
          org_links: true,
          profile: true,
          phone_numbers: true,
        }
      });
    } else if(loginType === 'phone') {
      const userPhoneEntry = await client.userPhone.findFirst({
        where: { phone: dto.login },
        include: {
          user: {
            include: {
              org_links: true,
              profile: true,
              phone_numbers: true,
            },

          }
        }
      })
      user = userPhoneEntry?.user;
    }


    if (!user) {
      throw new NotFoundException('Invalid credentials or user not found in this organization.');
    }

    const orgUser = await client.organizationUser.findFirst({
      where: {userId: user.id}
    })

    if (!orgUser) {
      throw new NotFoundException('User not found in this organization.');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const apiKey = tenant.apiKey
    return this.auth(res, user, tenant, orgUser.role)
  }

  async refresh(res: Response, req : Request, tenant: Tenant) {
    const token = req.cookies?.refreshToken;
    if (!token) throw new UnauthorizedException('No refresh token provided');

    let payload: any;
    try {
      payload = this.jwtService.verify(token)
    }catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const userId = payload.sub;

    const client = await this.prismaTenant.getTenantClientById(tenant.id)
    const orgUser = await client.organizationUser.findFirst({
      where: {userId},
      include: {
        user: {
          include: {
            profile: true,
            phone_numbers: true,
          }
        },
      }
    })
    if (!orgUser) throw new NotFoundException('User not found in this organization.');

    return this.auth(res, orgUser.user, tenant, orgUser.role);
  }

  async validate(payload: JwtPayload) {
    const client = await this.prismaTenant.getTenantClientById(payload.tenantId)

    const orgUser = await client.organizationUser.findFirst({
      where: { userId: payload.sub },
      include:{
        user: {
          select: {isActive: true}
        }
      }
    });


    if (!orgUser) {
      throw new NotFoundException("User not found")
    }
    if (!orgUser.user.isActive) {
      // Если сам аккаунт пользователя неактивен
      throw new UnauthorizedException("User account is inactive");
    }

    return {
      id: payload.sub,
      tenantId: payload.tenantId,
      orgRole: orgUser.role,
      isActive: orgUser.user.isActive,
    };
  }

  private generateToken(sub: string, tenantId: string, role: OrgUserRole): JwtTokens {
    const payload: JwtPayload = {sub, tenantId, role};

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.JWT_ACCESS_TOKEN_TTL,
    })

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.JWT_REFRESH_TOKEN_TTL,
    })

    return {
      accessToken,
      refreshToken,
    }
  }

  private auth(res: Response, user: any, tenant: Tenant, role: OrgUserRole) {
    const { accessToken, refreshToken } = this.generateToken(user.id, tenant.id, role);
    this.setCookie(res, refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    return {
      accessToken ,
      user: this.serializeUser(user, role),
      apiKey: tenant.apiKey
    };
  }

  private setCookie(res: Response, value: string, expires: Date) {
    res.cookie('refreshToken', value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      domain: this.COOKIE_DOMAIN,
      path: '/',
      expires,
    });
  }

  private determineLoginType(login: string): 'email' | 'phone' | 'unknown' {
    // Очень простая проверка на наличие символа '@'
    if (login.includes('@')) {
      return 'email';
    }

    // Проверка, что строка состоит только из цифр и, возможно, начинается с '+'
    // Предполагаем, что телефонные номера начинаются с '+' или просто цифры
    const phoneRegex = /^\+?[0-9\s-]+$/;
    if (phoneRegex.test(login)) {
      return 'phone';
    }

    return 'unknown';
  }

  private serializeUser(user: any, role: OrgUserRole) {
    return {
      id: user.id,
      firstName: user.profile?.firstName ?? null,
      lastName: user.profile?.lastName ?? null,
      role,
      phoneNumbers: user.phone_numbers.map(p => ({
        id: p.id,
        phone: p.phone,
        isPrimary: p.isPrimary,
      })),
    };
  }
}
