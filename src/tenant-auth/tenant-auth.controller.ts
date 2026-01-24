import {
  Body,
  Controller,
  NotFoundException,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { TenantAuthService } from './tenant-auth.service';
import { PrismaService } from '../prisma/prisma.service';
import type { Request, Response } from 'express';
import { TenantLoginDto } from './dto/login.dto';
import type { JwtUser } from './interfaces/jwt.interface';
import { JwtAuthGuard } from './guards/jwt.guard';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import type { Tenant } from '@prisma/client';
import { ApiSecurity } from '@nestjs/swagger';
import { CurrentTenantUser } from './decorators/current-tenant-user.decorator';

@ApiSecurity('x-tenant-key')
@Controller('tenant-auth')
export class TenantAuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: TenantAuthService,
  ) {}

  @Post('login')
  async login(
    @Req() req: Request,
    @Body() dto: TenantLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const hostname = req.hostname;
    const tenant = await this.prisma.tenant.findFirst({ where: { hostname } });

    if (!tenant)
      throw new NotFoundException(`Tenant not found for hostname: ${hostname}`);

    return this.authService.login(res, tenant, dto);
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const hostname = req.hostname;
    const tenant = await this.prisma.tenant.findFirst({ where: { hostname } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return this.authService.refresh(res, req, tenant);
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return { message: 'Logout successful' };
  }

  @Post('switch-organization')
  @UseGuards(JwtAuthGuard, ApiKeyGuard)
  async switchOrg(
    @Body() body: { orgUserId: string },
    @Res({ passthrough: true }) res: Response,
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtUser,
  ) {
    return this.authService.switchOrganization(
      res,
      tenant,
      user.userId,
      body.orgUserId,
    );
  }
}
