import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { PrismaHealthIndicator } from "./indicators/prisma.health-indicator";
import { RedisHealthIndicator } from "./indicators/redis.health-indicator";

// PrismaService and RedisService are injected automatically:
// both modules are @Global() and already imported in AppModule.

@Module({
  controllers: [HealthController],
  providers: [PrismaHealthIndicator, RedisHealthIndicator],
})
export class HealthModule {}
