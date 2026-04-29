import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

/**
 * Guard JWT réutilisable - appliqué via @UseGuards(JwtAuthGuard).
 * Délègue la validation à JwtStrategy.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
