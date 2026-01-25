import {
  Body,
  Controller,
  NotFoundException,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { TenantAuthService } from './tenant-auth.service';
import { PrismaService } from '../prisma/prisma.service';
import type { Request, Response } from 'express';
import { TenantLoginDto } from './dto/login.dto';
import type { JwtAuthenticatedUser, JwtUser } from './interfaces/jwt.interface';
import { JwtAuthGuard } from './guards/jwt.guard';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { CurrentTenant } from '../decorators/currectTenant.decorator';
import type { Tenant } from '@prisma/client';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import {
  CurrentTenantUser,
  CurrentUser,
} from './decorators/current-tenant-user.decorator';
import {
  LoginRequiresOrgSelectionResponseDto,
  LoginSuccessResponseDto,
} from './dto/doc.dto';

@ApiSecurity('x-tenant-key')
@Controller('tenant-auth')
export class TenantAuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: TenantAuthService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Tenant login' })
  @ApiBody({ type: TenantLoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful (single organization)',
    type: LoginSuccessResponseDto,
  })
  @ApiResponse({
    status: 200,
    description: 'User must select organization',
    type: LoginRequiresOrgSelectionResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant not found or user has no organizations',
  })
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
    @CurrentUser() user: JwtUser,
  ) {
    const userId = (user as any).userId || (user as any).sub;

    return this.authService.switchOrganization(
      res,
      tenant,
      userId,
      body.orgUserId,
    );
  }

  @Post('me')
  @UseGuards(ApiKeyGuard, JwtAuthGuard)
  @ApiOperation({ summary: 'Получить текущего пользователя' })
  me(
    @CurrentTenant() tenant: Tenant,
    @CurrentTenantUser() user: JwtAuthenticatedUser,
  ) {
    return this.authService.me(tenant, user);
  }
}
