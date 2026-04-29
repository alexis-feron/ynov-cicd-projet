import { describe, it, expect, beforeEach, vi } from "vitest";
import { NotFoundException, ConflictException } from "@nestjs/common";
import { UsersService } from "./users.service";
import { IUserRepository } from "../domain/repositories/user.repository.interface";
import { User, Role } from "../domain/entities/user.entity";

const makeUser = (
  overrides: Partial<ConstructorParameters<typeof User>[0]> = {},
): User =>
  new User({
    id: "user-1",
    email: "user@test.com",
    password: "hashed",
    username: "user_one",
    displayName: "User One",
    avatar: null,
    role: Role.READER,
    isActive: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

const makeRepositoryMock = (): IUserRepository => ({
  findById: vi.fn(),
  findByEmail: vi.fn(),
  findByUsername: vi.fn(),
  create: vi.fn(),
  emailExists: vi.fn(),
  usernameExists: vi.fn(),
});

describe("UsersService", () => {
  let service: UsersService;
  let repository: IUserRepository;

  beforeEach(() => {
    repository = makeRepositoryMock();
    service = new UsersService(repository);
  });

  describe("findById", () => {
    it("returns the user when found", async () => {
      const user = makeUser();
      vi.mocked(repository.findById).mockResolvedValue(user);

      const result = await service.findById("user-1");

      expect(result).toBe(user);
    });

    it("throws NotFoundException when user does not exist", async () => {
      vi.mocked(repository.findById).mockResolvedValue(null);

      await expect(service.findById("unknown")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findByEmail", () => {
    it("returns the user when found", async () => {
      const user = makeUser();
      vi.mocked(repository.findByEmail).mockResolvedValue(user);

      const result = await service.findByEmail("user@test.com");

      expect(result).toBe(user);
    });

    it("returns null when not found", async () => {
      vi.mocked(repository.findByEmail).mockResolvedValue(null);

      const result = await service.findByEmail("ghost@test.com");

      expect(result).toBeNull();
    });
  });

  describe("assertUnique", () => {
    it("resolves when both email and username are available", async () => {
      vi.mocked(repository.emailExists).mockResolvedValue(false);
      vi.mocked(repository.usernameExists).mockResolvedValue(false);

      await expect(
        service.assertUnique("new@test.com", "newuser"),
      ).resolves.not.toThrow();
    });

    it("throws ConflictException when email is taken", async () => {
      vi.mocked(repository.emailExists).mockResolvedValue(true);
      vi.mocked(repository.usernameExists).mockResolvedValue(false);

      await expect(
        service.assertUnique("taken@test.com", "newuser"),
      ).rejects.toThrow(ConflictException);
    });

    it("throws ConflictException when username is taken", async () => {
      vi.mocked(repository.emailExists).mockResolvedValue(false);
      vi.mocked(repository.usernameExists).mockResolvedValue(true);

      await expect(
        service.assertUnique("new@test.com", "taken_user"),
      ).rejects.toThrow(ConflictException);
    });

    it("checks email and username in parallel", async () => {
      vi.mocked(repository.emailExists).mockResolvedValue(false);
      vi.mocked(repository.usernameExists).mockResolvedValue(false);

      await service.assertUnique("new@test.com", "newuser");

      // Les deux appels doivent avoir eu lieu
      expect(repository.emailExists).toHaveBeenCalledWith("new@test.com");
      expect(repository.usernameExists).toHaveBeenCalledWith("newuser");
    });
  });
});
