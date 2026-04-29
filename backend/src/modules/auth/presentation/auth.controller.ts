import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { User } from "../../users/domain/entities/user.entity";
import { AuthService } from "../application/auth.service";
import {
  AuthResponseDto,
  RefreshResponseDto,
} from "../application/dto/auth-response.dto";
import { RegisterDto } from "../application/dto/register.dto";
import { JwtPayload } from "../infrastructure/strategies/jwt.strategy";

class RefreshDto {
  refreshToken!: string;
}

class LogoutDto {
  refreshToken!: string;
}

/**
 * Couche présentation - HTTP uniquement, aucune logique métier.
 */
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  /**
   * LocalStrategy valide email/password et attache l'utilisateur à req.user.
   * Le controller reçoit directement l'entité User via req.user.
   */
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard("local"))
  login(@CurrentUser() user: User): Promise<AuthResponseDto> {
    return this.authService.login(user);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto): Promise<RefreshResponseDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  logout(
    @CurrentUser() user: JwtPayload,
    @Body() dto: LogoutDto,
  ): Promise<void> {
    return this.authService.logout(user.sub, dto.refreshToken);
  }
}
