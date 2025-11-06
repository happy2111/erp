import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrgUserRole } from '.prisma/client-tenant';

@Injectable()
export class TenantRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<OrgUserRole[]>('orgUserRoles', context.getHandler());
    if (!roles) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!roles.includes(user.orgRole)) {
      throw new ForbiddenException('You do not have permission for this action');
    }
    return true;
  }
}
