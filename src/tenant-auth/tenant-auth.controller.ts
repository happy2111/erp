import {
  Body,
  Controller,
  NotFoundException,
  Post,
  Req,
  Res
} from '@nestjs/common';
import { TenantAuthService } from './tenant-auth.service';
import {PrismaService} from "../prisma/prisma.service";
import type {Request, Response} from 'express';
import {TenantLoginDto} from "./dto/login.dto";

@Controller('tenant-auth')
export class TenantAuthController {
  constructor(
    private readonly tenantAuthService: TenantAuthService,
    private readonly prisma: PrismaService,
    private readonly authService: TenantAuthService,) {

  }

  @Post('login')
  async login(
    @Req() req: Request,
    @Body() dto: TenantLoginDto,
    @Res({ passthrough: true }) res: Response
  ) {
    const hostname = req.hostname;
    const tenant = await this.prisma.tenant.findFirst({ where: { hostname } });

    if (!tenant) throw new NotFoundException(`Tenant not found for hostname: ${hostname}`);

    return this.authService.login(res, tenant, dto);
  }

  @Post("refresh")
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const hostname = req.hostname;
    const tenant = await this.prisma.tenant.findFirst({ where: { hostname } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return this.authService.refresh(res, req, tenant)
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refreshToken');
    return { message: 'Logout successful' };
  }
}
