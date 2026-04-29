import { Injectable } from "@nestjs/common";
import { RedisService } from "../../../redis/redis.service";
import { HealthIndicatorResult } from "./prisma.health-indicator";

@Injectable()
export class RedisHealthIndicator {
  constructor(private readonly redis: RedisService) {}

  async check(): Promise<HealthIndicatorResult> {
    try {
      const response = await this.redis.ping();
      if (response === "PONG") {
        return { status: "ok" };
      }
      return {
        status: "error",
        error: `unexpected ping response: ${response}`,
      };
    } catch (err) {
      return {
        status: "error",
        error: err instanceof Error ? err.message : "unknown",
      };
    }
  }
}
