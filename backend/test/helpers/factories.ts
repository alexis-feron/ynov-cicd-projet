import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

/**
 * Factories de données de test - créent directement en DB.
 * Chaque factory accepte des overrides pour personnaliser les champs.
 * Utilisées dans les tests d'intégration uniquement.
 */

const DEFAULT_PASSWORD = "Password1!";

export function buildUserData(overrides: Record<string, unknown> = {}) {
  const timestamp = Date.now();
  return {
    email: `user-${timestamp}@test.com`,
    password: bcrypt.hashSync(DEFAULT_PASSWORD, 4), // rounds=4 pour la vitesse en tests
    username: `user_${timestamp}`,
    displayName: `Test User ${timestamp}`,
    role: "READER",
    ...overrides,
  };
}

export async function createUser(
  prisma: PrismaClient,
  overrides: Record<string, unknown> = {},
) {
  return prisma.user.create({ data: buildUserData(overrides) as never });
}

export async function createAuthor(
  prisma: PrismaClient,
  overrides: Record<string, unknown> = {},
) {
  return createUser(prisma, { role: "AUTHOR", ...overrides });
}

export function buildPostData(
  authorId: string,
  overrides: Record<string, unknown> = {},
) {
  const timestamp = Date.now();
  return {
    title: `Test Post ${timestamp}`,
    slug: `test-post-${timestamp}`,
    content: "Test content for integration test",
    status: "DRAFT",
    authorId,
    ...overrides,
  };
}

export async function createPost(
  prisma: PrismaClient,
  authorId: string,
  overrides: Record<string, unknown> = {},
) {
  return prisma.post.create({
    data: buildPostData(authorId, overrides) as never,
  });
}

/** Retourne le mot de passe en clair utilisé par les factories */
export const TEST_PASSWORD = DEFAULT_PASSWORD;
