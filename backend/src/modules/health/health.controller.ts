import { Controller, Get, HttpCode, HttpStatus, Res } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { FastifyReply } from "fastify";
import { PrismaHealthIndicator } from "./indicators/prisma.health-indicator";
import { RedisHealthIndicator } from "./indicators/redis.health-indicator";

export interface HealthResponse {
  status: "ok" | "error";
  uptime: number;
  timestamp: string;
  checks: {
    database: ReturnType<PrismaHealthIndicator["check"]> extends Promise<
      infer T
    >
      ? T
      : never;
    redis: ReturnType<RedisHealthIndicator["check"]> extends Promise<infer T>
      ? T
      : never;
  };
}

@SkipThrottle()
@Controller("health")
export class HealthController {
  constructor(
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly redisIndicator: RedisHealthIndicator,
  ) {}

  /**
   * Liveness + readiness probe.
   * Returns 200 when all dependencies are healthy, 503 otherwise.
   * Used by Docker HEALTHCHECK, k8s probes, and smoke tests in CD pipeline.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async check(
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<HealthResponse> {
    const [database, redis] = await Promise.all([
      this.prismaIndicator.check(),
      this.redisIndicator.check(),
    ]);

    const allHealthy = database.status === "ok" && redis.status === "ok";

    if (!allHealthy) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return {
      status: allHealthy ? "ok" : "error",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks: { database, redis },
    };
  }
}
