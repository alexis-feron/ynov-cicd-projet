import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "../../modules/users/domain/entities/user.entity";
import { ROLES_KEY } from "../decorators/roles.decorator";

/**
 * Guard de rôles - vérifie que req.user.role figure dans les rôles autorisés.
 * À utiliser APRÈS JwtAuthGuard (req.user doit déjà être peuplé).
 *
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(Role.ADMIN)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Pas de @Roles → accessible à tout utilisateur authentifié
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context
      .switchToHttp()
      .getRequest<{ user: { role: string } }>();

    if (!requiredRoles.includes(user.role as Role)) {
      throw new ForbiddenException(
        `Requires one of: ${requiredRoles.join(", ")}`,
      );
    }

    return true;
  }
}
