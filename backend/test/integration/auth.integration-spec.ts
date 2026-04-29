import { type INestApplication } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import supertest from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp } from "../helpers/app.helper";
import { startTestDatabase, stopTestDatabase } from "../helpers/db.helper";
import { createAuthor, TEST_PASSWORD } from "../helpers/factories";
import { startTestRedis, stopTestRedis } from "../helpers/redis.helper";

/**
 * Tests d'intégration Auth - full stack HTTP → service → DB réelle.
 * Chaque suite est indépendante : elle crée ses propres utilisateurs.
 */
describe("Auth (integration)", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let request: ReturnType<typeof supertest>;

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
    prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    request = supertest(app.getHttpServer());
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
    await Promise.all([stopTestDatabase(), stopTestRedis()]);
  });

  // ── Register ────────────────────────────────────────────────────────────────

  describe("POST /auth/register", () => {
    it("201 - creates a user and returns tokens", async () => {
      const res = await request.post("/auth/register").send({
        email: "newuser@test.com",
        username: "newuser",
        displayName: "New User",
        password: "Password1!",
      });

      expect(res.status).toBe(201);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.email).toBe("newuser@test.com");
      expect(res.body.user).not.toHaveProperty("password");
    });

    it("409 - returns conflict when email already exists", async () => {
      await request.post("/auth/register").send({
        email: "duplicate@test.com",
        username: "first_user",
        displayName: "First",
        password: "Password1!",
      });

      const res = await request.post("/auth/register").send({
        email: "duplicate@test.com",
        username: "second_user",
        displayName: "Second",
        password: "Password1!",
      });

      expect(res.status).toBe(409);
    });

    it("400 - rejects weak passwords", async () => {
      const res = await request.post("/auth/register").send({
        email: "weak@test.com",
        username: "weakpass",
        displayName: "Weak",
        password: "simple",
      });

      expect(res.status).toBe(400);
    });

    it("400 - rejects invalid username format", async () => {
      const res = await request.post("/auth/register").send({
        email: "valid@test.com",
        username: "Invalid-Username!",
        displayName: "Bad",
        password: "Password1!",
      });

      expect(res.status).toBe(400);
    });
  });

  // ── Login ───────────────────────────────────────────────────────────────────

  describe("POST /auth/login", () => {
    it("200 - returns tokens for valid credentials", async () => {
      const author = await createAuthor(prisma);

      const res = await request.post("/auth/login").send({
        email: author.email,
        password: TEST_PASSWORD,
      });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it("401 - rejects wrong password", async () => {
      const author = await createAuthor(prisma);

      const res = await request.post("/auth/login").send({
        email: author.email,
        password: "WrongPassword1!",
      });

      expect(res.status).toBe(401);
    });

    it("401 - rejects unknown email", async () => {
      const res = await request.post("/auth/login").send({
        email: "ghost@test.com",
        password: "Password1!",
      });

      expect(res.status).toBe(401);
    });
  });

  // ── Refresh ─────────────────────────────────────────────────────────────────

  describe("POST /auth/refresh", () => {
    it("200 - issues new tokens and rotates refresh token", async () => {
      // Login pour obtenir un refresh token valide
      const author = await createAuthor(prisma);
      const loginRes = await request.post("/auth/login").send({
        email: author.email,
        password: TEST_PASSWORD,
      });
      const { refreshToken } = loginRes.body;

      const res = await request.post("/auth/refresh").send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      // Le nouveau refresh token doit être différent (rotation)
      expect(res.body.refreshToken).not.toBe(refreshToken);
    });

    it("401 - rejects a refresh token used twice (rotation)", async () => {
      const author = await createAuthor(prisma);
      const loginRes = await request.post("/auth/login").send({
        email: author.email,
        password: TEST_PASSWORD,
      });
      const { refreshToken } = loginRes.body;

      // Premier refresh - OK
      await request.post("/auth/refresh").send({ refreshToken });

      // Deuxième refresh avec le même token - doit échouer
      const res = await request.post("/auth/refresh").send({ refreshToken });
      expect(res.status).toBe(401);
    });
  });

  // ── Logout ──────────────────────────────────────────────────────────────────

  describe("POST /auth/logout", () => {
    it("204 - revokes the refresh token", async () => {
      const author = await createAuthor(prisma);
      const loginRes = await request.post("/auth/login").send({
        email: author.email,
        password: TEST_PASSWORD,
      });
      const { accessToken, refreshToken } = loginRes.body;

      const logoutRes = await request
        .post("/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ refreshToken });

      expect(logoutRes.status).toBe(204);

      // Le refresh token ne doit plus fonctionner après logout
      const refreshRes = await request
        .post("/auth/refresh")
        .send({ refreshToken });
      expect(refreshRes.status).toBe(401);
    });

    it("401 - rejects logout without access token", async () => {
      const res = await request
        .post("/auth/logout")
        .send({ refreshToken: "any-token" });

      expect(res.status).toBe(401);
    });
  });
});
