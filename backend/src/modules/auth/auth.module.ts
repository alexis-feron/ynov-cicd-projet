import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { RedisModule } from "../../redis/redis.module";
import { UsersModule } from "../users/users.module";
import { AuthService } from "./application/auth.service";
import { JwtAuthGuard } from "./infrastructure/guards/jwt-auth.guard";
import { JwtStrategy } from "./infrastructure/strategies/jwt.strategy";
import { LocalStrategy } from "./infrastructure/strategies/local.strategy";
import { AuthController } from "./presentation/auth.controller";

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // secrets passés dynamiquement dans signAsync
    UsersModule,
    RedisModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, JwtAuthGuard],
  exports: [AuthService, JwtStrategy, JwtAuthGuard],
})
export class AuthModule {}

