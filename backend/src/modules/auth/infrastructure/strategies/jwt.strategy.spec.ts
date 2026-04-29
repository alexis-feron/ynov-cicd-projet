import { UnauthorizedException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role, User } from "../../../users/domain/entities/user.entity";
import { JwtStrategy } from "./jwt.strategy";

const makeUser = (overrides = {}): User =>
  new User({
    id: "user-1",
    email: "user@test.com",
    password: "hashed",
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

describe("JwtStrategy", () => {
  let strategy: JwtStrategy;
  const usersService = { findById: vi.fn() };

  beforeEach(() => {
    strategy = new JwtStrategy(usersService as never);
    vi.clearAllMocks();
  });

  it("returns the payload when user exists and is active", async () => {
    usersService.findById.mockResolvedValue(makeUser());

    const result = await strategy.validate({
      sub: "user-1",
      email: "user@test.com",
      role: "AUTHOR",
    });

    expect(result).toEqual({
      sub: "user-1",
      email: "user@test.com",
      role: "AUTHOR",
    });
  });

  it("throws UnauthorizedException when user is not found", async () => {
    usersService.findById.mockRejectedValue(new Error("not found"));

    await expect(
      strategy.validate({ sub: "ghost", email: "x@x.com", role: "READER" }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException when user is inactive", async () => {
    usersService.findById.mockResolvedValue(makeUser({ isActive: false }));

    await expect(
      strategy.validate({
        sub: "user-1",
        email: "user@test.com",
        role: "AUTHOR",
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
