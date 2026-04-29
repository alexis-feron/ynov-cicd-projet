import { defineConfig } from 'prisma/config'

// Prisma 7 no longer auto-loads .env for prisma.config.ts
try { process.loadEnvFile() } catch { /* no .env present (e.g. Docker with injected env) */ }

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
})
