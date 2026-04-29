import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostStatus } from "../../domain/entities/post.entity";
import { PostsPrismaRepository } from "./posts.prisma.repository";

// ── Mock PrismaService ────────────────────────────────────────────────────────
// On mock uniquement les méthodes utilisées par le repository.
// Cela évite d'avoir une vraie connexion DB dans les tests unitaires.

const makePrisma = () => ({
  post: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
});

// Enregistrement Prisma simulé (avec les relations incluses)
const makePrismaRecord = (overrides = {}) => ({
  id: "post-1",
  title: "Hello World",
  slug: "hello-world",
  content: "Content",
  excerpt: null,
  status: "DRAFT",
  authorId: "user-1",
  categoryId: null,
  publishedAt: null,
  deletedAt: null,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  tags: [
    {
      tagId: "tag-1",
      postId: "post-1",
      assignedAt: new Date(),
      tag: { id: "tag-1", name: "NestJS", slug: "nestjs" },
    },
  ],
  ...overrides,
});

describe("PostsPrismaRepository", () => {
  let repository: PostsPrismaRepository;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    repository = new PostsPrismaRepository(prisma as never);
  });

  describe("findById", () => {
    it("maps a Prisma record to a Post entity", async () => {
      const record = makePrismaRecord();
      prisma.post.findFirst.mockResolvedValue(record);

      const post = await repository.findById("post-1");

      expect(post).not.toBeNull();
      expect(post!.id).toBe("post-1");
      expect(post!.tags).toHaveLength(1);
      expect(post!.tags[0].name).toBe("NestJS");
      // Vérifie que le filtre soft delete est appliqué
      expect(prisma.post.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      );
    });

    it("returns null when record not found", async () => {
      prisma.post.findFirst.mockResolvedValue(null);

      const post = await repository.findById("unknown");

      expect(post).toBeNull();
    });
  });

  describe("findAll", () => {
    it("applies pagination correctly", async () => {
      prisma.post.findMany.mockResolvedValue([makePrismaRecord()]);
      prisma.post.count.mockResolvedValue(1);

      const result = await repository.findAll({ page: 2, limit: 5 });

      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
    });

    it("filters by status", async () => {
      prisma.post.findMany.mockResolvedValue([]);
      prisma.post.count.mockResolvedValue(0);

      await repository.findAll({
        page: 1,
        limit: 10,
        status: PostStatus.PUBLISHED,
      });

      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: PostStatus.PUBLISHED }),
        }),
      );
    });

    it("excludes soft-deleted posts by default", async () => {
      prisma.post.findMany.mockResolvedValue([]);
      prisma.post.count.mockResolvedValue(0);

      await repository.findAll({ page: 1, limit: 10 });

      expect(prisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      );
    });
  });

  describe("create", () => {
    it("creates a post and maps it to a domain entity", async () => {
      const record = makePrismaRecord({ status: "PUBLISHED" });
      prisma.post.create.mockResolvedValue(record);

      const post = await repository.create({
        title: "Hello World",
        slug: "hello-world",
        content: "Content",
        status: PostStatus.PUBLISHED,
        authorId: "user-1",
      });

      expect(post.status).toBe(PostStatus.PUBLISHED);
      expect(post.authorId).toBe("user-1");
    });
  });

  describe("softDelete", () => {
    it("sets deletedAt instead of deleting the row", async () => {
      prisma.post.update.mockResolvedValue({});

      await repository.softDelete("post-1");

      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: "post-1" },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe("slugExists", () => {
    it("returns true when count > 0", async () => {
      prisma.post.count.mockResolvedValue(1);

      expect(await repository.slugExists("hello-world")).toBe(true);
    });

    it("returns false when count is 0", async () => {
      prisma.post.count.mockResolvedValue(0);

      expect(await repository.slugExists("hello-world")).toBe(false);
    });

    it("excludes the given id from the check", async () => {
      prisma.post.count.mockResolvedValue(0);

      await repository.slugExists("hello-world", "post-1");

      expect(prisma.post.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { not: "post-1" } }),
        }),
      );
    });
  });
});
