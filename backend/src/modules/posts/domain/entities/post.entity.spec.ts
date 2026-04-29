import { describe, expect, it } from "vitest";
import { Post, PostStatus } from "./post.entity";

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
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

describe("Post entity", () => {
  describe("isPublished", () => {
    it("returns true when status is PUBLISHED", () => {
      expect(makePost({ status: PostStatus.PUBLISHED }).isPublished()).toBe(
        true,
      );
    });

    it("returns false when status is DRAFT", () => {
      expect(makePost({ status: PostStatus.DRAFT }).isPublished()).toBe(false);
    });
  });

  describe("isDeleted", () => {
    it("returns true when deletedAt is set", () => {
      expect(makePost({ deletedAt: new Date() }).isDeleted()).toBe(true);
    });

    it("returns false when deletedAt is null", () => {
      expect(makePost({ deletedAt: null }).isDeleted()).toBe(false);
    });
  });

  describe("belongsTo", () => {
    it("returns true when userId matches authorId", () => {
      expect(makePost({ authorId: "user-1" }).belongsTo("user-1")).toBe(true);
    });

    it("returns false when userId does not match", () => {
      expect(makePost({ authorId: "user-1" }).belongsTo("user-2")).toBe(false);
    });
  });

  describe("canBeEditedBy", () => {
    it("returns true when user is author and post is draft", () => {
      const post = makePost({ authorId: "user-1", status: PostStatus.DRAFT });
      expect(post.canBeEditedBy("user-1")).toBe(true);
    });

    it("returns false when post is published", () => {
      const post = makePost({
        authorId: "user-1",
        status: PostStatus.PUBLISHED,
      });
      expect(post.canBeEditedBy("user-1")).toBe(false);
    });

    it("returns false when user is not the author", () => {
      const post = makePost({ authorId: "user-1", status: PostStatus.DRAFT });
      expect(post.canBeEditedBy("user-2")).toBe(false);
    });
  });
});
