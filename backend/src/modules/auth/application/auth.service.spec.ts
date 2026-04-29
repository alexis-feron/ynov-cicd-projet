import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role, User } from "../../users/domain/entities/user.entity";
import { AuthService } from "./auth.service";

// ── Factories ─────────────────────────────────────────────────────────────────

const makeUser = (
  overrides: Partial<ConstructorParameters<typeof User>[0]> = {},
): User =>
  new User({
    id: "user-1",
    email: "user@test.com",
    password: bcrypt.hashSync("Password1", 10),
    username: "user_one",
    displayName: "User One",
    avatar: null,
    role: Role.AUTHOR,
    isActive: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

// ── Mocks ─────────────────────────────────────────────────────────────────────

const makeUsersService = () => ({
  findById: vi.fn(),
  findByEmail: vi.fn(),
  assertUnique: vi.fn(),
});

const makeUserRepository = () => ({
  findById: vi.fn(),
  findByEmail: vi.fn(),
  findByUsername: vi.fn(),
  create: vi.fn(),
  emailExists: vi.fn(),
  usernameExists: vi.fn(),
});

const makeJwtService = () => ({
  signAsync: vi.fn().mockResolvedValue("signed-token"),
  verify: vi.fn(),
});

const makeRedis = () => ({
  set: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
  exists: vi.fn(),
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("AuthService", () => {
  let service: AuthService;
  let usersService: ReturnType<typeof makeUsersService>;
  let userRepository: ReturnType<typeof makeUserRepository>;
  let jwtService: ReturnType<typeof makeJwtService>;
  let redis: ReturnType<typeof makeRedis>;

  beforeEach(() => {
    usersService = makeUsersService();
    userRepository = makeUserRepository();
    jwtService = makeJwtService();
    redis = makeRedis();
    service = new AuthService(
      usersService as never,
      userRepository as never,
      jwtService as never,
      redis as never,
    );
  });

  describe("validateCredentials", () => {
    it("returns user when credentials are valid", async () => {
      const user = makeUser();
      usersService.findByEmail.mockResolvedValue(user);

      const result = await service.validateCredentials(
        "user@test.com",
        "Password1",
      );

      expect(result).toBe(user);
    });

    it("throws UnauthorizedException when user not found", async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.validateCredentials("unknown@test.com", "pass"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws UnauthorizedException when password is wrong", async () => {
      usersService.findByEmail.mockResolvedValue(makeUser());

      await expect(
        service.validateCredentials("user@test.com", "WrongPass"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("throws ForbiddenException when account is inactive", async () => {
      usersService.findByEmail.mockResolvedValue(makeUser({ isActive: false }));

      await expect(
        service.validateCredentials("user@test.com", "Password1"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("register", () => {
    it("creates a user and returns tokens", async () => {
      const user = makeUser();
      usersService.assertUnique.mockResolvedValue(undefined);
      userRepository.create.mockResolvedValue(user);
      redis.set.mockResolvedValue(undefined);

      const result = await service.register({
        email: "new@test.com",
        username: "newuser",
        displayName: "New User",
        password: "Password1",
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe("user@test.com");
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: "new@test.com" }),
      );
    });

    it("hashes the password before storing", async () => {
      const user = makeUser();
      usersService.assertUnique.mockResolvedValue(undefined);
      userRepository.create.mockResolvedValue(user);
      redis.set.mockResolvedValue(undefined);

      await service.register({
        email: "new@test.com",
        username: "newuser",
        displayName: "New User",
        password: "PlainPassword1",
      });

      const createCall = userRepository.create.mock.calls[0][0];
      expect(createCall.password).not.toBe("PlainPassword1");
      expect(createCall.password).toMatch(/^\$2[ab]\$/); // bcrypt prefix ($2a$ or $2b$)
    });

    it("propagates ConflictException when assertUnique throws", async () => {
      usersService.assertUnique.mockRejectedValue(
        new ConflictException("Email already in use"),
      );

      await expect(
        service.register({
          email: "taken@test.com",
          username: "taken",
          displayName: "Taken",
          password: "Password1",
        }),
      ).rejects.toThrow(ConflictException);

      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("refresh", () => {
    it("rotates the refresh token when valid", async () => {
      const user = makeUser();
      jwtService.verify.mockReturnValue({ sub: "user-1", jti: "old-jti" });
      redis.exists.mockResolvedValue(true);
      usersService.findById.mockResolvedValue(user);
      redis.del.mockResolvedValue(undefined);
      redis.set.mockResolvedValue(undefined);

      const result = await service.refresh("valid-refresh-token");

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      // L'ancien JTI doit être supprimé (rotation)
      expect(redis.del).toHaveBeenCalledWith("refresh:user-1:old-jti");
    });

    it("throws UnauthorizedException when JTI not in Redis", async () => {
      jwtService.verify.mockReturnValue({ sub: "user-1", jti: "revoked-jti" });
      redis.exists.mockResolvedValue(false);

      await expect(service.refresh("revoked-token")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("throws UnauthorizedException when token signature is invalid", async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error("invalid");
      });

      await expect(service.refresh("bad-token")).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("logout", () => {
    it("deletes the JTI from Redis", async () => {
      jwtService.verify.mockReturnValue({ sub: "user-1", jti: "active-jti" });
      redis.del.mockResolvedValue(undefined);

      await service.logout("user-1", "valid-refresh-token");

      expect(redis.del).toHaveBeenCalledWith("refresh:user-1:active-jti");
    });

    it("does not throw when token is already expired", async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error("expired");
      });

      await expect(
        service.logout("user-1", "expired-token"),
      ).resolves.not.toThrow();
    });
  });
});
