import { beforeEach, describe, expect, it, vi } from "vitest";
import { Role, User } from "../../users/domain/entities/user.entity";
import { AuthService } from "../application/auth.service";
import { AuthController } from "./auth.controller";

const makeUser = (overrides: Partial<ConstructorParameters<typeof User>[0]> = {}): User =>
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

const makeAuthResponse = () => ({
  accessToken: "access-token",
  refreshToken: "refresh-token",
  user: {
    id: "user-1",
    email: "user@test.com",
    username: "user_one",
    displayName: "User One",
    role: Role.AUTHOR,
  },
});

const makeAuthService = (): AuthService =>
  ({
    register: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
  }) as unknown as AuthService;

const makeJwtPayload = (userId = "user-1") => ({
  sub: userId,
  email: "user@test.com",
  role: "AUTHOR",
});

describe("AuthController", () => {
  let controller: AuthController;
  let service: AuthService;

  beforeEach(() => {
    service = makeAuthService();
    controller = new AuthController(service);
  });

  describe("register", () => {
    it("calls authService.register and returns tokens", async () => {
      const response = makeAuthResponse();
      vi.mocked(service.register).mockResolvedValue(response);

      const result = await controller.register({
        email: "new@test.com",
        username: "newuser",
        displayName: "New User",
        password: "Password1",
      });

      expect(result.accessToken).toBe("access-token");
      expect(result.refreshToken).toBe("refresh-token");
      expect(service.register).toHaveBeenCalledWith({
        email: "new@test.com",
        username: "newuser",
        displayName: "New User",
        password: "Password1",
      });
    });
  });

  describe("login", () => {
    it("calls authService.login with the user entity and returns tokens", async () => {
      const user = makeUser();
      const response = makeAuthResponse();
      vi.mocked(service.login).mockResolvedValue(response);

      const result = await controller.login(user);

      expect(result.accessToken).toBe("access-token");
      expect(service.login).toHaveBeenCalledWith(user);
    });
  });

  describe("refresh", () => {
    it("calls authService.refresh and returns new tokens", async () => {
      vi.mocked(service.refresh).mockResolvedValue({
        accessToken: "new-access",
        refreshToken: "new-refresh",
      });

      const result = await controller.refresh({ refreshToken: "old-refresh-token" } as never);

      expect(result.accessToken).toBe("new-access");
      expect(service.refresh).toHaveBeenCalledWith("old-refresh-token");
    });
  });

  describe("logout", () => {
    it("calls authService.logout with userId and refreshToken", async () => {
      vi.mocked(service.logout).mockResolvedValue(undefined);
      const payload = makeJwtPayload();

      await controller.logout(payload as never, { refreshToken: "token-to-revoke" } as never);

      expect(service.logout).toHaveBeenCalledWith("user-1", "token-to-revoke");
    });
  });
});
