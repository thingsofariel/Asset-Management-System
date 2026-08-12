import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// JwtStrategy.validate() attaches { userId, email, role } to req.user.
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
