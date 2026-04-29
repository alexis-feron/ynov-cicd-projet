import { defineConfig, devices } from "@playwright/test";

/**
 * Config Playwright pour les tests E2E.
 * Requiert que le backend (3001) et le frontend (3000) soient démarrés.
 * En CI : lancés via docker-compose avant les tests.
 * En local : `docker-compose up -d` puis `npm run test:e2e`.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // séquentiel pour éviter les conflits de données
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: process.env.FRONTEND_URL ?? "http://localhost:3000",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Lance les serveurs en local si pas déjà démarrés
  webServer: process.env.CI
    ? undefined
    : [
        {
          command: "cd ../backend && npm run start:dev",
          url: "http://localhost:3001/health",
          reuseExistingServer: true,
          timeout: 30_000,
        },
        {
          command: "npm run dev",
          url: "http://localhost:3000",
          reuseExistingServer: true,
          timeout: 30_000,
        },
      ],
});
