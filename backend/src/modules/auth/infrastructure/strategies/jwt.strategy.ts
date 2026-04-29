import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UsersService } from "../../../users/application/users.service";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

/**
 * Strategy JWT : valide le Bearer token sur chaque requête protégée.
 * Pas d'appel Redis - l'accès token est stateless (durée courte).
 * On vérifie quand même que l'utilisateur existe toujours en DB.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? "dev-secret",
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.usersService
      .findById(payload.sub)
      .catch(() => null);

    if (!user || !user.isActive) {
      throw new UnauthorizedException("User not found or disabled");
    }

    // Retourné par Passport dans req.user
    return { sub: payload.sub, email: payload.email, role: payload.role };
  }
}
