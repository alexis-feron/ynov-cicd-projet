import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

export interface HealthIndicatorResult {
  status: "ok" | "error";
  latencyMs?: number;
  error?: string;
}

@Injectable()
export class PrismaHealthIndicator {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthIndicatorResult> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ok", latencyMs: Date.now() - start };
    } catch (err) {
      return {
        status: "error",
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : "unknown",
      };
    }
  }
}
