import { beforeEach, describe, expect, it, vi } from "vitest";
import { Post, PostStatus } from "../domain/entities/post.entity";
import { PostsService } from "../application/posts.service";
import { PostsController } from "./posts.controller";

const makePost = (overrides: Partial<ConstructorParameters<typeof Post>[0]> = {}): Post =>
  new Post({
    id: "post-1",
    title: "Hello World",
    slug: "hello-world",
    content: "Content here",
    excerpt: null,
    status: PostStatus.DRAFT,
    authorId: "user-1",
    categoryId: null,
    tags: [],
    publishedAt: null,
    deletedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  });

const makePostsService = (): PostsService =>
  ({
    findAll: vi.fn(),
    findById: vi.fn(),
    findBySlug: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }) as unknown as PostsService;

const makeJwtPayload = (userId = "user-1") => ({
  sub: userId,
  email: "user@test.com",
  role: "AUTHOR",
});

describe("PostsController", () => {
  let controller: PostsController;
  let service: PostsService;

  beforeEach(() => {
    service = makePostsService();
    controller = new PostsController(service);
  });

  describe("findAll", () => {
    it("returns paginated posts with meta", async () => {
      const post = makePost();
      vi.mocked(service.findAll).mockResolvedValue({ data: [post], total: 1 });

      const result = await controller.findAll(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ page: 1, limit: 10, total: 1, totalPages: 1 });
    });

    it("calculates totalPages correctly", async () => {
      vi.mocked(service.findAll).mockResolvedValue({
        data: [],
        total: 25,
      });

      const result = await controller.findAll(1, 10);

      expect(result.meta.totalPages).toBe(3);
    });

    it("passes filters to service", async () => {
      vi.mocked(service.findAll).mockResolvedValue({ data: [], total: 0 });

      await controller.findAll(2, 5, PostStatus.PUBLISHED, "nestjs");

      expect(service.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        status: PostStatus.PUBLISHED,
        tag: "nestjs",
      });
    });
  });

  describe("findBySlug", () => {
    it("returns a PostResponseDto from the entity", async () => {
      const post = makePost({ slug: "hello-world" });
      vi.mocked(service.findBySlug).mockResolvedValue(post);

      const result = await controller.findBySlug("hello-world");

      expect(result.slug).toBe("hello-world");
      expect(service.findBySlug).toHaveBeenCalledWith("hello-world");
    });
  });

  describe("findById", () => {
    it("returns a PostResponseDto from the entity", async () => {
      const post = makePost();
      vi.mocked(service.findById).mockResolvedValue(post);

      const result = await controller.findById("post-1");

      expect(result.id).toBe("post-1");
      expect(service.findById).toHaveBeenCalledWith("post-1");
    });
  });

  describe("create", () => {
    it("creates a post and returns the dto", async () => {
      const post = makePost();
      vi.mocked(service.create).mockResolvedValue(post);
      const user = makeJwtPayload();

      const result = await controller.create(
        { title: "Hello World", content: "Content" },
        user as never,
      );

      expect(result.id).toBe("post-1");
      expect(service.create).toHaveBeenCalledWith(
        { title: "Hello World", content: "Content" },
        "user-1",
      );
    });
  });

  describe("update", () => {
    it("updates a post and returns the dto", async () => {
      const post = makePost({ title: "Updated" });
      vi.mocked(service.update).mockResolvedValue(post);
      const user = makeJwtPayload();

      const result = await controller.update(
        "post-1",
        { title: "Updated" },
        user as never,
      );

      expect(result.title).toBe("Updated");
      expect(service.update).toHaveBeenCalledWith("post-1", { title: "Updated" }, "user-1");
    });
  });

  describe("delete", () => {
    it("deletes the post and returns void", async () => {
      vi.mocked(service.delete).mockResolvedValue(undefined);
      const user = makeJwtPayload();

      await controller.delete("post-1", user as never);

      expect(service.delete).toHaveBeenCalledWith("post-1", "user-1");
    });
  });
});
