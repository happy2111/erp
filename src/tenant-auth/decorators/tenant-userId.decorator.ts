import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the authenticated user's id from request.user populated by JwtStrategy
 * Usage: @UserId() userId: string
 */
export const UserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request?.user?.id;
  },
);
