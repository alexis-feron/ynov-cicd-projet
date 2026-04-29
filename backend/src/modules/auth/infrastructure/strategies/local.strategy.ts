import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import { User } from "../../../users/domain/entities/user.entity";
import { AuthService } from "../../application/auth.service";

/**
 * Strategy locale : valide email + password.
 * Passport attache le résultat à req.user avant d'appeler le controller.
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: "email" }); // passport-local attend "username" par défaut
  }

  async validate(email: string, password: string): Promise<User> {
    return this.authService.validateCredentials(email, password);
  }
}
