import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { randomUUID } from "crypto";
import { LoggerModule } from "nestjs-pino";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { AuthModule } from "./modules/auth/auth.module";
import { HealthModule } from "./modules/health/health.module";
import { MetricsModule } from "./modules/metrics/metrics.module";
import { PostsModule } from "./modules/posts/posts.module";
import { UsersModule } from "./modules/users/users.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";

const isProduction = process.env.NODE_ENV === "production";

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        // Generate a unique requestId for every inbound request
        genReqId: (req) => {
          const existing = req.headers["x-request-id"] as string | undefined;
          return existing ?? randomUUID();
        },

        // Assign the requestId to the response header as well
        customProps: (req) => ({
          requestId: (req as import("http").IncomingMessage & { id: string })
            .id,
        }),

        // In production → JSON; in dev → pretty-print via pino-pretty
        transport: isProduction
          ? undefined
          : {
              target: "pino-pretty",
              options: {
                colorize: true,
                singleLine: true,
                translateTime: "SYS:HH:MM:ss.l",
                ignore: "pid,hostname",
              },
            },

        // Minimal level in production, verbose in dev
        level: isProduction ? "info" : "debug",

        // Serialise only the fields we care about
        serializers: {
          req: (req) => ({
            method: req.method,
            url: req.url,
          }),
          res: (res) => ({
            statusCode: res.statusCode,
          }),
        },

        // Suppress pino-http's own automatic "request completed" log
        // because our LoggingInterceptor provides richer info (duration, etc.)
        autoLogging: false,
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000, // fenêtre de 60 secondes (en ms)
        limit: 100, // 100 requêtes max par IP par fenêtre
      },
    ]),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    PostsModule,
    HealthModule,
    MetricsModule, // registers /metrics + global HttpMetricsInterceptor
  ],
  providers: [
    // LoggingInterceptor is stateless - register here, not inside MetricsModule
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
