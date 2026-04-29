import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.e2e-spec.ts"],
    hookTimeout: 30000,
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      "@common": resolve(__dirname, "src/common"),
      "@modules": resolve(__dirname, "src/modules"),
    },
  },
});
