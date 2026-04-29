import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { JwtPayload } from "../../modules/auth/infrastructure/strategies/jwt.strategy";

/**
 * Injecte le payload JWT du token courant dans un paramètre de controller.
 *
 * @Get('me')
 * getMe(@CurrentUser() user: JwtPayload) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    return request.user;
  },
);
