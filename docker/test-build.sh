#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  Docker build & config validation tests
#
#  Usage:
#    ./docker/test-build.sh             # all tests
#    ./docker/test-build.sh lint        # Dockerfile lint only
#    ./docker/test-build.sh build       # image build only
#    ./docker/test-build.sh compose     # compose config only
#
#  Requirements: docker, docker compose v2
#  Optional:     hadolint (Dockerfile linter)
# ─────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0
FAIL=0

# ── Helpers ──────────────────────────────────────────────────

green()  { printf '\033[0;32m✔ %s\033[0m\n' "$*"; }
red()    { printf '\033[0;31m✘ %s\033[0m\n' "$*"; }
yellow() { printf '\033[0;33m● %s\033[0m\n' "$*"; }

pass() { green "$1"; ((PASS++)); }
fail() { red   "$1"; ((FAIL++)); }

assert_exits_zero() {
  local desc="$1"; shift
  if "$@" > /dev/null 2>&1; then
    pass "$desc"
  else
    fail "$desc"
  fi
}

# ── Tests: Dockerfile lint ────────────────────────────────────

test_lint() {
  yellow "=== Dockerfile lint ==="

  if ! command -v hadolint &> /dev/null; then
    yellow "hadolint not found - skipping lint (install: https://github.com/hadolint/hadolint)"
    return
  fi

  for df in \
    "$ROOT/backend/Dockerfile" \
    "$ROOT/backend/Dockerfile.dev" \
    "$ROOT/frontend/Dockerfile" \
    "$ROOT/frontend/Dockerfile.dev"; do
    assert_exits_zero "lint: $(basename "$(dirname "$df")")/$(basename "$df")" \
      hadolint --ignore DL3018 "$df"
  done
}

# ── Tests: Compose config ────────────────────────────────────

test_compose() {
  yellow "=== docker compose config ==="

  assert_exits_zero "docker-compose.yml is valid" \
    docker compose -f "$ROOT/docker-compose.yml" config

  assert_exits_zero "docker-compose.prod.yml is valid" \
    docker compose -f "$ROOT/docker-compose.prod.yml" config
}

# ── Tests: .dockerignore presence ────────────────────────────

test_dockerignore() {
  yellow "=== .dockerignore files ==="

  for dir in backend frontend; do
    if [ -f "$ROOT/$dir/.dockerignore" ]; then
      pass ".dockerignore present: $dir"
    else
      fail ".dockerignore missing: $dir"
    fi
  done
}

# ── Tests: Security checks ────────────────────────────────────

test_security() {
  yellow "=== Security checks ==="

  # Production Dockerfiles must not run as root
  for df in "$ROOT/backend/Dockerfile" "$ROOT/frontend/Dockerfile"; do
    name="$(basename "$(dirname "$df")")/$(basename "$df")"
    if grep -q "^USER " "$df"; then
      pass "non-root USER set: $name"
    else
      fail "no USER directive found (will run as root): $name"
    fi
  done

  # Production Dockerfiles must use dumb-init
  for df in "$ROOT/backend/Dockerfile" "$ROOT/frontend/Dockerfile"; do
    name="$(basename "$(dirname "$df")")/$(basename "$df")"
    if grep -q "dumb-init" "$df"; then
      pass "dumb-init present: $name"
    else
      fail "dumb-init missing (PID 1 problem): $name"
    fi
  done

  # Production compose must not have default JWT secret
  if grep -q "dev-secret" "$ROOT/docker-compose.prod.yml"; then
    fail "docker-compose.prod.yml contains hardcoded dev secret"
  else
    pass "no hardcoded secrets in docker-compose.prod.yml"
  fi

  # Healthchecks defined for infrastructure services
  for service in postgres redis minio; do
    if grep -A5 "^  $service:" "$ROOT/docker-compose.yml" | grep -q "healthcheck"; then
      pass "healthcheck defined: $service (dev)"
    else
      fail "no healthcheck: $service (dev)"
    fi
  done
}

# ── Tests: Image build ────────────────────────────────────────

test_build() {
  yellow "=== docker build ==="

  if ! command -v docker &> /dev/null; then
    yellow "docker not found - skipping build tests"
    return
  fi

  # Build backend dev
  assert_exits_zero "build backend:dev" \
    docker build --quiet -f "$ROOT/backend/Dockerfile.dev" "$ROOT/backend" -t blog-backend:test-dev

  # Build frontend dev
  assert_exits_zero "build frontend:dev" \
    docker build --quiet -f "$ROOT/frontend/Dockerfile.dev" "$ROOT/frontend" -t blog-frontend:test-dev

  # Build backend production (all stages)
  assert_exits_zero "build backend:production" \
    docker build --quiet --target production -f "$ROOT/backend/Dockerfile" "$ROOT/backend" -t blog-backend:test-prod

  # Build frontend production (all stages)
  assert_exits_zero "build frontend:production" \
    docker build --quiet --target production -f "$ROOT/frontend/Dockerfile" "$ROOT/frontend" -t blog-frontend:test-prod

  # Verify non-root user in production images
  for image in blog-backend:test-prod blog-frontend:test-prod; do
    uid=$(docker run --rm --entrypoint id "$image" -u 2>/dev/null || echo "error")
    if [ "$uid" != "0" ] && [ "$uid" != "error" ]; then
      pass "non-root UID in $image (uid=$uid)"
    else
      fail "image runs as root or failed: $image"
    fi
  done

  # Check production image sizes (warn if > 300 MB)
  for image in blog-backend:test-prod blog-frontend:test-prod; do
    size_bytes=$(docker inspect "$image" --format='{{.Size}}' 2>/dev/null || echo 0)
    size_mb=$((size_bytes / 1024 / 1024))
    if [ "$size_mb" -lt 300 ]; then
      pass "image size acceptable: $image (~${size_mb} MB)"
    else
      yellow "image size warning: $image is ~${size_mb} MB (target < 300 MB)"
    fi
  done

  # Cleanup test images
  docker rmi blog-backend:test-dev blog-frontend:test-dev \
             blog-backend:test-prod blog-frontend:test-prod \
             > /dev/null 2>&1 || true
}

# ── Main ──────────────────────────────────────────────────────

MODE="${1:-all}"

cd "$ROOT"

case "$MODE" in
  lint)    test_lint ;;
  compose) test_compose ;;
  build)   test_build ;;
  all)
    test_dockerignore
    test_security
    test_compose
    test_lint
    # build is slow - only run when explicitly requested
    yellow "Skipping image builds (run './docker/test-build.sh build' to include)"
    ;;
  *)
    echo "Usage: $0 [all|lint|compose|build]"
    exit 1
    ;;
esac

echo ""
echo "────────────────────────"
printf "Results: \033[0;32m%d passed\033[0m, \033[0;31m%d failed\033[0m\n" "$PASS" "$FAIL"
echo "────────────────────────"

[ "$FAIL" -eq 0 ]
