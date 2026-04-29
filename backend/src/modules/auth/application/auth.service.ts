import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { RedisService } from "../../../redis/redis.service";
import { UsersService } from "../../users/application/users.service";
import { User } from "../../users/domain/entities/user.entity";
import {
  IUserRepository,
  USER_REPOSITORY,
} from "../../users/domain/repositories/user.repository.interface";
import { AuthResponseDto, RefreshResponseDto } from "./dto/auth-response.dto";
import { RegisterDto } from "./dto/register.dto";

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL_SEC = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL_SEC = 7 * 24 * 3600; // 7 jours

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

interface RefreshPayload {
  sub: string;
  jti: string; // JWT ID - identifiant unique du refresh token
}

/**
 * Stratégie de refresh tokens :
 * - Access token : JWT signé, durée courte (15 min), stateless
 * - Refresh token : JWT signé, durée longue (7j), JTI stocké en Redis
 *   → permet la révocation (logout, rotation)
 *   → si le JTI n'est plus en Redis → token révoqué → 401
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
  ) {}

  // ── Validation (appelée par LocalStrategy) ────────────────────────────────

  async validateCredentials(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.isActive) {
      throw new ForbiddenException("Account is disabled");
    }

    return user;
  }

  // ── Register ──────────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    await this.usersService.assertUnique(dto.email, dto.username);

    const hashed = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.userRepository.create({
      email: dto.email,
      password: hashed,
      username: dto.username,
      displayName: dto.displayName,
    });

    return this.buildTokenPair(user);
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  async login(user: User): Promise<AuthResponseDto> {
    return this.buildTokenPair(user);
  }

  // ── Refresh ───────────────────────────────────────────────────────────────

  async refresh(rawRefreshToken: string): Promise<RefreshResponseDto> {
    let payload: RefreshPayload;

    try {
      payload = this.jwtService.verify<RefreshPayload>(rawRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const redisKey = this.refreshKey(payload.sub, payload.jti);
    const stored = await this.redis.exists(redisKey);

    if (!stored) {
      // Token déjà révoqué ou réutilisé → possible token theft
      throw new UnauthorizedException("Refresh token has been revoked");
    }

    // Rotation : on invalide l'ancien JTI avant d'en émettre un nouveau
    await this.redis.del(redisKey);

    const user = await this.usersService.findById(payload.sub);
    const { accessToken, refreshToken } = await this.issueTokens(user);

    return { accessToken, refreshToken };
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  async logout(userId: string, rawRefreshToken: string): Promise<void> {
    try {
      const payload = this.jwtService.verify<RefreshPayload>(rawRefreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      await this.redis.del(this.refreshKey(userId, payload.jti));
    } catch {
      // Token déjà expiré ou invalide : considéré comme déjà déconnecté
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async buildTokenPair(user: User): Promise<AuthResponseDto> {
    const { accessToken, refreshToken } = await this.issueTokens(user);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
    };
  }

  private async issueTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const jti = uuidv4();

    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const refreshPayload: RefreshPayload = { sub: user.id, jti };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: process.env.JWT_SECRET,
        expiresIn: ACCESS_TOKEN_TTL_SEC,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: REFRESH_TOKEN_TTL_SEC,
      }),
    ]);

    // Stocke le JTI en Redis avec le même TTL que le refresh token
    await this.redis.set(
      this.refreshKey(user.id, jti),
      "1",
      REFRESH_TOKEN_TTL_SEC,
    );

    return { accessToken, refreshToken };
  }

  private refreshKey(userId: string, jti: string): string {
    return `refresh:${userId}:${jti}`;
  }
}
