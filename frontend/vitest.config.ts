import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "tests/e2e/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
});
