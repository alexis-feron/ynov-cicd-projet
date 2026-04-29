import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { JwtPayload } from "../../infrastructure/strategies/jwt.strategy";

/**
 * Extrait le payload JWT injecté par Passport dans req.user.
 * Usage : @CurrentUser() user: JwtPayload
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    return request.user;
  },
);
