import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Post, PostStatus } from "../domain/entities/post.entity";
import { IPostRepository } from "../domain/repositories/post.repository.interface";
import { PostsService } from "./posts.service";

const makePost = (
  overrides: Partial<ConstructorParameters<typeof Post>[0]> = {},
): Post =>
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

const makeRepositoryMock = (): IPostRepository => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  findBySlug: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  softDelete: vi.fn(),
  slugExists: vi.fn(),
});

describe("PostsService", () => {
  let service: PostsService;
  let repository: IPostRepository;

  beforeEach(() => {
    repository = makeRepositoryMock();
    service = new PostsService(repository);
  });

  describe("findById", () => {
    it("returns the post when found", async () => {
      const post = makePost();
      vi.mocked(repository.findById).mockResolvedValue(post);

      const result = await service.findById("post-1");

      expect(result).toBe(post);
      expect(repository.findById).toHaveBeenCalledWith("post-1");
    });

    it("throws NotFoundException when post does not exist", async () => {
      vi.mocked(repository.findById).mockResolvedValue(null);

      await expect(service.findById("unknown")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findBySlug", () => {
    it("returns the post when found", async () => {
      const post = makePost();
      vi.mocked(repository.findBySlug).mockResolvedValue(post);

      await expect(service.findBySlug("hello-world")).resolves.toBe(post);
    });

    it("throws NotFoundException when slug does not exist", async () => {
      vi.mocked(repository.findBySlug).mockResolvedValue(null);

      await expect(service.findBySlug("unknown-slug")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("create", () => {
    it("creates a post with a slug generated from the title", async () => {
      const post = makePost();
      vi.mocked(repository.slugExists).mockResolvedValue(false);
      vi.mocked(repository.create).mockResolvedValue(post);

      await service.create(
        { title: "Hello World", content: "Content" },
        "user-1",
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "hello-world", authorId: "user-1" }),
      );
    });

    it("strips accents when generating the slug", async () => {
      vi.mocked(repository.slugExists).mockResolvedValue(false);
      vi.mocked(repository.create).mockResolvedValue(makePost());

      await service.create(
        { title: "Leçon de Français", content: "Content" },
        "user-1",
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "lecon-de-francais" }),
      );
    });

    it("defaults status to DRAFT", async () => {
      vi.mocked(repository.slugExists).mockResolvedValue(false);
      vi.mocked(repository.create).mockResolvedValue(makePost());

      await service.create(
        { title: "Hello World", content: "Content" },
        "user-1",
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: PostStatus.DRAFT }),
      );
    });

    it("appends a numeric suffix when the base slug is taken", async () => {
      vi.mocked(repository.slugExists)
        .mockResolvedValueOnce(true) // base slug taken
        .mockResolvedValueOnce(false); // base-2 free
      vi.mocked(repository.create).mockResolvedValue(makePost());

      await service.create(
        { title: "Hello World", content: "Content" },
        "user-1",
      );

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: "hello-world-2" }),
      );
    });
  });

  describe("update", () => {
    it("updates when user is the author", async () => {
      const post = makePost({ authorId: "user-1" });
      const updated = makePost({ title: "Updated", authorId: "user-1" });
      vi.mocked(repository.findById).mockResolvedValue(post);
      vi.mocked(repository.update).mockResolvedValue(updated);

      const result = await service.update(
        "post-1",
        { title: "Updated" },
        "user-1",
      );

      expect(result).toBe(updated);
    });

    it("sets publishedAt when transitioning to PUBLISHED", async () => {
      const draftPost = makePost({
        authorId: "user-1",
        status: PostStatus.DRAFT,
      });
      vi.mocked(repository.findById).mockResolvedValue(draftPost);
      vi.mocked(repository.update).mockResolvedValue(
        makePost({ status: PostStatus.PUBLISHED }),
      );

      await service.update(
        "post-1",
        { status: PostStatus.PUBLISHED },
        "user-1",
      );

      expect(repository.update).toHaveBeenCalledWith(
        "post-1",
        expect.objectContaining({ publishedAt: expect.any(Date) }),
      );
    });

    it("does not set publishedAt when post is already published", async () => {
      const publishedPost = makePost({
        authorId: "user-1",
        status: PostStatus.PUBLISHED,
        publishedAt: new Date("2024-01-01"),
      });
      vi.mocked(repository.findById).mockResolvedValue(publishedPost);
      vi.mocked(repository.update).mockResolvedValue(publishedPost);

      await service.update(
        "post-1",
        { status: PostStatus.PUBLISHED },
        "user-1",
      );

      expect(repository.update).toHaveBeenCalledWith(
        "post-1",
        expect.not.objectContaining({ publishedAt: expect.any(Date) }),
      );
    });

    it("throws ForbiddenException when user is not the author", async () => {
      vi.mocked(repository.findById).mockResolvedValue(
        makePost({ authorId: "user-1" }),
      );

      await expect(
        service.update("post-1", { title: "Updated" }, "user-2"),
      ).rejects.toThrow(ForbiddenException);

      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe("delete", () => {
    it("soft-deletes the post when user is the author", async () => {
      vi.mocked(repository.findById).mockResolvedValue(
        makePost({ authorId: "user-1" }),
      );
      vi.mocked(repository.softDelete).mockResolvedValue();

      await service.delete("post-1", "user-1");

      expect(repository.softDelete).toHaveBeenCalledWith("post-1");
    });

    it("throws ForbiddenException when user is not the author", async () => {
      vi.mocked(repository.findById).mockResolvedValue(
        makePost({ authorId: "user-1" }),
      );

      await expect(service.delete("post-1", "user-2")).rejects.toThrow(
        ForbiddenException,
      );

      expect(repository.softDelete).not.toHaveBeenCalled();
    });
  });
});
