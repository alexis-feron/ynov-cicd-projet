import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role } from "../../modules/users/domain/entities/user.entity";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { RolesGuard } from "./roles.guard";

const makeContext = (role: string) => ({
  switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
  getHandler: () => ({}),
  getClass: () => ({}),
});

describe("RolesGuard", () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = { getAllAndOverride: vi.fn() } as never;
    guard = new RolesGuard(reflector);
  });

  it("allows access when no roles are required", () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue(undefined);

    expect(guard.canActivate(makeContext("READER") as never)).toBe(true);
  });

  it("allows access when user has the required role", () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue([Role.ADMIN]);

    expect(guard.canActivate(makeContext("ADMIN") as never)).toBe(true);
  });

  it("allows access when user has one of multiple required roles", () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue([
      Role.ADMIN,
      Role.AUTHOR,
    ]);

    expect(guard.canActivate(makeContext("AUTHOR") as never)).toBe(true);
  });

  it("throws ForbiddenException when user role is insufficient", () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue([Role.ADMIN]);

    expect(() => guard.canActivate(makeContext("READER") as never)).toThrow(
      ForbiddenException,
    );
  });

  it("reads metadata from handler then class (getAllAndOverride)", () => {
    vi.mocked(reflector.getAllAndOverride).mockReturnValue([Role.AUTHOR]);
    guard.canActivate(makeContext("AUTHOR") as never);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      expect.anything(),
      expect.anything(),
    ]);
  });
});
