import { SetMetadata } from "@nestjs/common";
import { Role } from "../../modules/users/domain/entities/user.entity";

export const ROLES_KEY = "roles";

/**
 * @Roles(Role.ADMIN, Role.AUTHOR) - utilisé avec RolesGuard.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
