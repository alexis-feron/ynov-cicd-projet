import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { execSync } from "child_process";
import * as path from "path";

let container: StartedPostgreSqlContainer | null = null;

/**
 * Démarre un conteneur PostgreSQL éphémère pour les tests d'intégration.
 * Applique les migrations Prisma avant de retourner l'URL de connexion.
 *
 * Prérequis : Docker en cours d'exécution.
 */
export async function startTestDatabase(): Promise<string> {
  container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("blogdb_test")
    .withUsername("blog")
    .withPassword("blog")
    .start();

  const databaseUrl = container.getConnectionUri();

  // Migrations Prisma contre la DB de test
  execSync("npx prisma migrate deploy", {
    cwd: path.resolve(__dirname, "../../"),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "pipe",
  });

  return databaseUrl;
}

export async function stopTestDatabase(): Promise<void> {
  await container?.stop();
  container = null;
}
