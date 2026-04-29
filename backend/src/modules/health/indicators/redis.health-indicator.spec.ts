import { describe, it, expect, vi, beforeEach } from "vitest";
import { RedisHealthIndicator } from "./redis.health-indicator";
import { RedisService } from "../../../redis/redis.service";

const makeRedis = (overrides?: Partial<RedisService>) =>
  ({
    ping: vi.fn(),
    ...overrides,
  }) as unknown as RedisService;

describe("RedisHealthIndicator", () => {
  let indicator: RedisHealthIndicator;
  let redis: RedisService;

  beforeEach(() => {
    redis = makeRedis();
    indicator = new RedisHealthIndicator(redis);
  });

  it("returns ok when Redis responds PONG", async () => {
    vi.mocked(redis.ping).mockResolvedValueOnce("PONG");

    const result = await indicator.check();

    expect(result.status).toBe("ok");
    expect(result.error).toBeUndefined();
  });

  it("returns error when Redis is unreachable", async () => {
    vi.mocked(redis.ping).mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const result = await indicator.check();

    expect(result.status).toBe("error");
    expect(result.error).toBe("ECONNREFUSED");
  });

  it("returns error when ping response is unexpected", async () => {
    vi.mocked(redis.ping).mockResolvedValueOnce("LOADING" as "PONG");

    const result = await indicator.check();

    expect(result.status).toBe("error");
    expect(result.error).toContain("LOADING");
  });
});
