import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

// Native browser EventSource can't send an Authorization header, so this
// route accepts the JWT as a query param instead and verifies it
// manually — same token, same secret, just a different transport for
// this one route. Deliberately not folded into the shared JwtStrategy,
// which would widen every route to accept query-param tokens.
@Injectable()
export class SseAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const token = req.query.token;
    if (!token) throw new UnauthorizedException();

    try {
      jwt.verify(token, process.env.JWT_SECRET ?? 'dev-secret-change-me');
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
