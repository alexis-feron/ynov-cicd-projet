import { describe, it, expect, vi, beforeEach } from "vitest";
import { PrismaHealthIndicator } from "./prisma.health-indicator";
import { PrismaService } from "../../../prisma/prisma.service";

const makePrisma = (overrides?: Partial<PrismaService>) =>
  ({
    $queryRaw: vi.fn(),
    ...overrides,
  }) as unknown as PrismaService;

describe("PrismaHealthIndicator", () => {
  let indicator: PrismaHealthIndicator;
  let prisma: PrismaService;

  beforeEach(() => {
    prisma = makePrisma();
    indicator = new PrismaHealthIndicator(prisma);
  });

  it("returns ok when SELECT 1 succeeds", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([{ "?column?": 1 }]);

    const result = await indicator.check();

    expect(result.status).toBe("ok");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.error).toBeUndefined();
  });

  it("returns error when database is unreachable", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(
      new Error("Connection refused"),
    );

    const result = await indicator.check();

    expect(result.status).toBe("error");
    expect(result.error).toBe("Connection refused");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("includes latency measurement in both success and error cases", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([]);

    const result = await indicator.check();

    expect(typeof result.latencyMs).toBe("number");
  });
});
