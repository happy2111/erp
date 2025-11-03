
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Tenant } from '@prisma/client';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const apiKey =
      (req.headers['x-tenant-key'] as string) ||
      (req.headers['api-key'] as string) ||
      req.headers['authorization']?.replace('Bearer ', '');

    if (!apiKey) {
      throw new UnauthorizedException('Tenant API key missing');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { apiKey }
    });

    if (!tenant) {
      throw new UnauthorizedException('Invalid tenant API key');
    }

    if (tenant.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tenant is not active');
    }

    // Сохраняем tenant в request для дальнейшего использования
    req.tenant = tenant;
    return true;
  }
}