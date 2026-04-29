# ═══════════════════════════════════════════════════════════
#  Multi-stage production Dockerfile - NestJS backend
#
#  Stages:
#    base        → shared node:20-alpine with dumb-init
#    deps        → install ALL deps + generate Prisma client
#    builder     → compile TypeScript
#    prod-deps   → prune to production-only dependencies
#    production  → final minimal image (non-root user)
# ═══════════════════════════════════════════════════════════

# ── Stage 1: base ──────────────────────────────────────────
FROM node:20-alpine AS base

WORKDIR /app

# dumb-init ensures Node is not PID 1 → proper SIGTERM forwarding
RUN apk add --no-cache dumb-init

# ── Stage 2: deps (full install + prisma generate) ─────────
FROM base AS deps

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

# Install everything (dev deps needed for prisma CLI + ts compilation)
RUN npm ci

# Generate the Prisma client (writes to node_modules/.prisma)
RUN npx prisma generate

# ── Stage 3: builder (TypeScript → JavaScript) ─────────────
FROM deps AS builder

COPY . .

RUN rm -f tsconfig.build.tsbuildinfo && npm run build

# ── Stage 4: prod-deps (production-only node_modules) ──────
FROM base AS prod-deps

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN npm ci --omit=dev
RUN npx prisma generate

# ── Stage 5: production ────────────────────────────────────
# alpine:3.21 (fixes CVEs in 3.20) + nodejs/npm (~60 Mo) vs node:20-alpine (~135 Mo) → -75 Mo
FROM alpine:3.21 AS production

WORKDIR /app

# dumb-init for proper PID 1 signal handling + minimal node runtime
# npm is required for `npx prisma migrate deploy` in the entrypoint
RUN apk add --no-cache dumb-init nodejs

ENV NODE_ENV=production

# Non-root user for security
RUN addgroup -g 1001 -S nodejs \
 && adduser  -S nestjs -u 1001 -G nodejs

# Copy production node_modules (includes .prisma generated client)
COPY --from=prod-deps --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy compiled application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Prisma schema and config needed at runtime for migrate deploy
COPY --chown=nestjs:nodejs prisma ./prisma
COPY --chown=nestjs:nodejs prisma.config.ts ./

# Copy entrypoint (handles optional migration on startup)
COPY --chown=nestjs:nodejs docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nestjs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

ENTRYPOINT ["dumb-init", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/main"]
