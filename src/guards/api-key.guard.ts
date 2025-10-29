import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const apiKey = req.headers['x-tenant-key'] || req.headers['api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    if (!apiKey) throw new UnauthorizedException('Tenant API key missing');

    const tenant = await this.prisma.tenant.findUnique({ where: { api_key: apiKey } });
    if (!tenant) throw new UnauthorizedException('Invalid tenant API key');

    // сохраняем tenant в req для дальнейшего использования
    req.tenant = tenant;
    return true;
  }
}
