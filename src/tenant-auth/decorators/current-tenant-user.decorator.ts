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

    if (!user || !('orgUserId' in user)) {
      throw new UnauthorizedException('Organization context required');
    }

    return key ? user[key] : user;
  })();
}

export const CurrentUser = createParamDecorator(
  (data: keyof JwtUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtUser;

    if (!user) {
      throw new UnauthorizedException('No user found in request');
    }

    // Instead of forcing orgUserId, just return the user.
    // The service logic will handle the validation.
    return data ? user[data] : user;
  },
);
