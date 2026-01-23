import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtUser } from '../interfaces/jwt.interface';

export const CurrentTenantUser = createParamDecorator(
  (
    data: keyof JwtUser | undefined,
    ctx: ExecutionContext,
  ): JwtUser | JwtUser[keyof JwtUser] | undefined => {
    const request: { user: JwtUser } = ctx.switchToHttp().getRequest();

    const user = request.user as JwtUser | undefined;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);
