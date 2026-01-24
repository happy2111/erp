import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthenticatedUser, JwtUser } from '../interfaces/jwt.interface';

// export const CurrentTenantUser = createParamDecorator(
//   (
//     data: keyof JwtUser | undefined,
//     ctx: ExecutionContext,
//   ): JwtUser | JwtUser[keyof JwtUser] | undefined => {
//     const request: { user: JwtUser } = ctx.switchToHttp().getRequest();
//
//     const user = request.user as JwtUser | undefined;
//
//     if (!user) {
//       return undefined;
//     }
//
//     return data ? user[data] : user;
//   },
// );

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
