import { describe, it, expect, vi, beforeEach } from "vitest";
import { HealthController } from "./health.controller";
import { PrismaHealthIndicator } from "./indicators/prisma.health-indicator";
import { RedisHealthIndicator } from "./indicators/redis.health-indicator";

const makeReply = () => ({
  status: vi.fn().mockReturnThis(),
  statusCode: 200,
});

const makePrismaIndicator = (status: "ok" | "error") =>
  ({
    check: vi.fn().mockResolvedValue({ status, latencyMs: 5 }),
  }) as unknown as PrismaHealthIndicator;

const makeRedisIndicator = (status: "ok" | "error") =>
  ({
    check: vi.fn().mockResolvedValue({ status }),
  }) as unknown as RedisHealthIndicator;

describe("HealthController", () => {
  describe("when all checks pass", () => {
    let controller: HealthController;

    beforeEach(() => {
      controller = new HealthController(
        makePrismaIndicator("ok"),
        makeRedisIndicator("ok"),
      );
    });

    it("returns status ok", async () => {
      const result = await controller.check(makeReply() as never);
      expect(result.status).toBe("ok");
    });

    it("includes uptime and timestamp", async () => {
      const result = await controller.check(makeReply() as never);
      expect(typeof result.uptime).toBe("number");
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("does not set 503 status code", async () => {
      const reply = makeReply();
      await controller.check(reply as never);
      expect(reply.status).not.toHaveBeenCalledWith(503);
    });
  });

  describe("when database is down", () => {
    let controller: HealthController;

    beforeEach(() => {
      controller = new HealthController(
        makePrismaIndicator("error"),
        makeRedisIndicator("ok"),
      );
    });

    it("returns status error", async () => {
      const result = await controller.check(makeReply() as never);
      expect(result.status).toBe("error");
    });

    it("sets HTTP 503", async () => {
      const reply = makeReply();
      await controller.check(reply as never);
      expect(reply.status).toHaveBeenCalledWith(503);
    });

    it("exposes the failing check", async () => {
      const result = await controller.check(makeReply() as never);
      expect(result.checks.database.status).toBe("error");
    });
  });

  describe("when redis is down", () => {
    it("returns status error and sets 503", async () => {
      const controller = new HealthController(
        makePrismaIndicator("ok"),
        makeRedisIndicator("error"),
      );
      const reply = makeReply();
      const result = await controller.check(reply as never);

      expect(result.status).toBe("error");
      expect(reply.status).toHaveBeenCalledWith(503);
    });
  });

  describe("when all checks fail", () => {
    it("returns status error", async () => {
      const controller = new HealthController(
        makePrismaIndicator("error"),
        makeRedisIndicator("error"),
      );
      const result = await controller.check(makeReply() as never);
      expect(result.status).toBe("error");
      expect(result.checks.database.status).toBe("error");
      expect(result.checks.redis.status).toBe("error");
    });
  });
});
