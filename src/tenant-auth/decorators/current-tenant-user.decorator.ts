import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthenticatedUser, JwtUser } from '../interfaces/jwt.interface';

export function CurrentTenantUser(): ParameterDecorator;
export function CurrentTenantUser<K extends keyof JwtAuthenticatedUser>(
  key: K,
): ParameterDecorator;

export function CurrentTenantUser(key?: any): ParameterDecorator {
  return createParamDecorator((_, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<{ user: JwtUser }>();
    const user = req.user;

    if (!user || !('orgId' in user)) {
      throw new UnauthorizedException('Organization context required');
    }

    return key ? user[key] : user;
  })();
}
