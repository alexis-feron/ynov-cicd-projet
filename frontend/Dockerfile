# ═══════════════════════════════════════════════════════════
#  Multi-stage production Dockerfile - Next.js frontend
#
#  Requires next.config.js: output: 'standalone'
#
#  Stages:
#    base        → shared node:20-alpine with dumb-init
#    deps        → npm install
#    builder     → next build (produces .next/standalone)
#    production  → minimal image with standalone bundle
# ═══════════════════════════════════════════════════════════

# ── Stage 1: base ──────────────────────────────────────────
FROM node:20-alpine3.21 AS base

WORKDIR /app

RUN apk add --no-cache dumb-init

# ── Stage 2: deps ──────────────────────────────────────────
FROM base AS deps

COPY package*.json ./

# Remove the Windows-specific SWC binary from package.json before install:
# it is listed under "dependencies" but is a win32-only build-time binary
# (~60 Mo) that npm would attempt to install in the Linux container.
# npm ci requires package.json and package-lock.json to be in sync, so we
# patch the lock file as well via `npm install --package-lock-only` after
# deleting the entry, then run a clean install without optional platform deps.
RUN npm pkg delete 'dependencies.@next/swc-win32-x64-msvc' \
 && npm install --package-lock-only --ignore-scripts \
 && npm ci --omit=optional

# ── Stage 3: builder ───────────────────────────────────────
FROM deps AS builder

COPY . .

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Stage 4: production ────────────────────────────────────
# Pin to alpine:3.21 (ships Node 22.x, fixes CVEs present in 3.20) for reproducible builds.
# No npm needed: the standalone server is invoked directly via `node server.js`.
FROM alpine:3.21 AS production

RUN apk add --no-cache nodejs dumb-init

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 1001 -S nodejs \
 && adduser  -S nextjs -u 1001 -G nodejs

# next build --output=standalone writes a self-contained server to .next/standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static   ./.next/static
# public/ is served by the standalone server via the static file handler
COPY --from=builder --chown=nextjs:nodejs /app/public         ./public

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3000 || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
