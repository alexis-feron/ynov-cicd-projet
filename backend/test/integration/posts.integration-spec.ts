import { type INestApplication } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import supertest from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/app.helper";
import { startTestDatabase, stopTestDatabase } from "../helpers/db.helper";
import { createAuthor, createPost, TEST_PASSWORD } from "../helpers/factories";
import { startTestRedis, stopTestRedis } from "../helpers/redis.helper";

describe("Posts (integration)", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let request: ReturnType<typeof supertest>;
  let accessToken: string;
  let authorId: string;

  beforeAll(async () => {
    const [databaseUrl, redisUrl] = await Promise.all([
      startTestDatabase(),
      startTestRedis(),
    ]);

    process.env.DATABASE_URL = databaseUrl;
    process.env.REDIS_URL = redisUrl;
    process.env.JWT_SECRET = "integration-test-secret";
    process.env.JWT_REFRESH_SECRET = "integration-test-refresh-secret";

    app = await createTestApp();
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl }),
    });
    request = supertest(app.getHttpServer());
  });

  beforeEach(async () => {
    // Crée un auteur frais + un token pour chaque test
    const author = await createAuthor(prisma);
    authorId = author.id;

    const res = await request.post("/auth/login").send({
      email: author.email,
      password: TEST_PASSWORD,
    });
    accessToken = res.body.accessToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
    await Promise.all([stopTestDatabase(), stopTestRedis()]);
  });

  // ── GET /posts ───────────────────────────────────────────────────────────────

  describe("GET /posts", () => {
    it("200 - returns paginated posts", async () => {
      await createPost(prisma, authorId, { status: "PUBLISHED" });

      const res = await request.get("/posts").query({ status: "PUBLISHED" });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.meta).toMatchObject({
        page: 1,
        limit: 10,
        total: expect.any(Number),
        totalPages: expect.any(Number),
      });
    });

    it("200 - paginates correctly", async () => {
      // Sequential to avoid slug collisions - factories key slugs off Date.now()
      await createPost(prisma, authorId, { slug: `paginate-1-${authorId}` });
      await createPost(prisma, authorId, { slug: `paginate-2-${authorId}` });
      await createPost(prisma, authorId, { slug: `paginate-3-${authorId}` });

      const res = await request.get("/posts").query({ page: 1, limit: 2 });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
      expect(res.body.meta.limit).toBe(2);
    });
  });

  // ── POST /posts ──────────────────────────────────────────────────────────────

  describe("POST /posts", () => {
    it("201 - creates a draft post", async () => {
      const res = await request
        .post("/posts")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ title: "My First Post", content: "Hello World content" });

      expect(res.status).toBe(201);
      expect(res.body.slug).toBe("my-first-post");
      expect(res.body.status).toBe("DRAFT");
    });

    it("201 - auto-suffixes slug when base slug is taken", async () => {
      const body = { title: "Duplicate Title", content: "Content" };

      const first = await request
        .post("/posts")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(body);

      const second = await request
        .post("/posts")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(body);

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
      expect(first.body.slug).toBe("duplicate-title");
      expect(second.body.slug).toBe("duplicate-title-2");
    });

    it("400 - rejects title shorter than 3 chars", async () => {
      const res = await request
        .post("/posts")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ title: "Hi", content: "Content" });

      expect(res.status).toBe(400);
    });

    it("401 - rejects unauthenticated requests", async () => {
      const res = await request
        .post("/posts")
        .send({ title: "My Post", content: "Content" });

      expect(res.status).toBe(401);
    });
  });

  // ── GET /posts/:id ───────────────────────────────────────────────────────────

  describe("GET /posts/:id", () => {
    it("200 - returns the post", async () => {
      const post = await createPost(prisma, authorId);

      const res = await request.get(`/posts/${post.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(post.id);
    });

    it("404 - returns not found for unknown id", async () => {
      const res = await request.get("/posts/unknown-id");

      expect(res.status).toBe(404);
    });
  });

  // ── GET /posts/slug/:slug ────────────────────────────────────────────────────

  describe("GET /posts/slug/:slug", () => {
    it("200 - returns the post by slug", async () => {
      const post = await createPost(prisma, authorId);

      const res = await request.get(`/posts/slug/${post.slug}`);

      expect(res.status).toBe(200);
      expect(res.body.slug).toBe(post.slug);
    });

    it("404 - returns not found for unknown slug", async () => {
      const res = await request.get("/posts/slug/does-not-exist");

      expect(res.status).toBe(404);
    });
  });

  // ── PUT /posts/:id ───────────────────────────────────────────────────────────

  describe("PUT /posts/:id", () => {
    it("200 - updates a post owned by the requester", async () => {
      const post = await createPost(prisma, authorId);

      const res = await request
        .put(`/posts/${post.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ title: "Updated Title" });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Updated Title");
    });

    it("401 - rejects unauthenticated updates", async () => {
      const post = await createPost(prisma, authorId);

      const res = await request
        .put(`/posts/${post.id}`)
        .send({ title: "Updated" });

      expect(res.status).toBe(401);
    });
  });

  // ── DELETE /posts/:id ────────────────────────────────────────────────────────

  describe("DELETE /posts/:id", () => {
    it("204 - soft-deletes the post", async () => {
      const post = await createPost(prisma, authorId);

      const res = await request
        .delete(`/posts/${post.id}`)
        .set("Authorization", `Bearer ${accessToken}`);

      expect(res.status).toBe(204);

      // Le post ne doit plus être accessible
      const getRes = await request.get(`/posts/${post.id}`);
      expect(getRes.status).toBe(404);
    });

    it("401 - rejects unauthenticated deletion", async () => {
      const post = await createPost(prisma, authorId);

      const res = await request.delete(`/posts/${post.id}`);

      expect(res.status).toBe(401);
    });
  });
});
