import { beforeEach, describe, expect, it, vi } from "vitest";
import { RedisService } from "./redis.service";

// Mock ioredis
const mockClient = {
  set: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
  exists: vi.fn(),
  ping: vi.fn(),
  quit: vi.fn(),
};

vi.mock("ioredis", () => ({
  default: vi.fn(() => mockClient),
}));

describe("RedisService", () => {
  let service: RedisService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RedisService();
    service.onModuleInit();
  });

  describe("onModuleDestroy", () => {
    it("calls quit on the redis client", async () => {
      mockClient.quit.mockResolvedValue("OK");

      await service.onModuleDestroy();

      expect(mockClient.quit).toHaveBeenCalled();
    });
  });

  describe("set", () => {
    it("calls redis set with EX ttl", async () => {
      mockClient.set.mockResolvedValue("OK");

      await service.set("mykey", "myvalue", 60);

      expect(mockClient.set).toHaveBeenCalledWith("mykey", "myvalue", "EX", 60);
    });
  });

  describe("get", () => {
    it("returns the stored value", async () => {
      mockClient.get.mockResolvedValue("myvalue");

      const result = await service.get("mykey");

      expect(result).toBe("myvalue");
      expect(mockClient.get).toHaveBeenCalledWith("mykey");
    });

    it("returns null when key does not exist", async () => {
      mockClient.get.mockResolvedValue(null);

      const result = await service.get("missing");

      expect(result).toBeNull();
    });
  });

  describe("del", () => {
    it("calls redis del", async () => {
      mockClient.del.mockResolvedValue(1);

      await service.del("mykey");

      expect(mockClient.del).toHaveBeenCalledWith("mykey");
    });
  });

  describe("exists", () => {
    it("returns true when count is 1", async () => {
      mockClient.exists.mockResolvedValue(1);

      const result = await service.exists("mykey");

      expect(result).toBe(true);
    });

    it("returns false when count is 0", async () => {
      mockClient.exists.mockResolvedValue(0);

      const result = await service.exists("missing");

      expect(result).toBe(false);
    });
  });

  describe("ping", () => {
    it("returns PONG", async () => {
      mockClient.ping.mockResolvedValue("PONG");

      const result = await service.ping();

      expect(result).toBe("PONG");
      expect(mockClient.ping).toHaveBeenCalled();
    });
  });
});
