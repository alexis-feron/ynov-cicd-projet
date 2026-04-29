#!/bin/sh
set -e

# Run pending migrations before starting the app.
# Controlled by RUN_MIGRATIONS env var (default: false) to allow
# skipping in environments where migrations are applied separately.
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "[entrypoint] Running database migrations..."
  node node_modules/prisma/build/index.js migrate deploy
  echo "[entrypoint] Migrations complete."
fi

exec "$@"
