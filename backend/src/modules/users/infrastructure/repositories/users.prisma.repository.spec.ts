import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "../../domain/entities/user.entity";
import { UsersPrismaRepository } from "./users.prisma.repository";

const makePrisma = () => ({
  user: {
    findFirst: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
  },
});

const makePrismaRecord = (overrides = {}) => ({
  id: "user-1",
  email: "user@test.com",
  password: "hashed",
  username: "user_one",
  displayName: "User One",
  avatar: null,
  role: "READER",
  isActive: true,
  deletedAt: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  ...overrides,
});

describe("UsersPrismaRepository", () => {
  let repository: UsersPrismaRepository;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    repository = new UsersPrismaRepository(prisma as never);
  });

  describe("findById", () => {
    it("returns a User entity when found", async () => {
      const record = makePrismaRecord();
      prisma.user.findFirst.mockResolvedValue(record);

      const user = await repository.findById("user-1");

      expect(user).not.toBeNull();
      expect(user!.id).toBe("user-1");
      expect(user!.email).toBe("user@test.com");
      expect(user!.role).toBe(Role.READER);
    });

    it("returns null when not found", async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const user = await repository.findById("unknown");

      expect(user).toBeNull();
    });

    it("filters by deletedAt: null", async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await repository.findById("user-1");

      expect(prisma.user.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: "user-1", deletedAt: null }),
        }),
      );
    });
  });

  describe("findByEmail", () => {
    it("returns a User entity when found", async () => {
      const record = makePrismaRecord();
      prisma.user.findFirst.mockResolvedValue(record);

      const user = await repository.findByEmail("user@test.com");

      expect(user).not.toBeNull();
      expect(user!.email).toBe("user@test.com");
    });

    it("returns null when not found", async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const user = await repository.findByEmail("ghost@test.com");

      expect(user).toBeNull();
    });
  });

  describe("findByUsername", () => {
    it("returns a User entity when found", async () => {
      const record = makePrismaRecord();
      prisma.user.findFirst.mockResolvedValue(record);

      const user = await repository.findByUsername("user_one");

      expect(user).not.toBeNull();
      expect(user!.username).toBe("user_one");
    });

    it("returns null when not found", async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const user = await repository.findByUsername("ghost");

      expect(user).toBeNull();
    });
  });

  describe("create", () => {
    it("creates and maps the record to a User entity", async () => {
      const record = makePrismaRecord({ role: "AUTHOR" });
      prisma.user.create.mockResolvedValue(record);

      const user = await repository.create({
        email: "new@test.com",
        password: "hashed",
        username: "newuser",
        displayName: "New User",
      });

      expect(user.email).toBe("user@test.com");
      expect(user.role).toBe(Role.AUTHOR);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: "new@test.com", role: "READER" }),
        }),
      );
    });

    it("uses provided role when given", async () => {
      const record = makePrismaRecord({ role: "ADMIN" });
      prisma.user.create.mockResolvedValue(record);

      await repository.create({
        email: "admin@test.com",
        password: "hashed",
        username: "admin",
        displayName: "Admin",
        role: Role.ADMIN,
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: Role.ADMIN }),
        }),
      );
    });
  });

  describe("emailExists", () => {
    it("returns true when count > 0", async () => {
      prisma.user.count.mockResolvedValue(1);

      expect(await repository.emailExists("user@test.com")).toBe(true);
    });

    it("returns false when count is 0", async () => {
      prisma.user.count.mockResolvedValue(0);

      expect(await repository.emailExists("new@test.com")).toBe(false);
    });
  });

  describe("usernameExists", () => {
    it("returns true when count > 0", async () => {
      prisma.user.count.mockResolvedValue(1);

      expect(await repository.usernameExists("user_one")).toBe(true);
    });

    it("returns false when count is 0", async () => {
      prisma.user.count.mockResolvedValue(0);

      expect(await repository.usernameExists("newuser")).toBe(false);
    });
  });
});
