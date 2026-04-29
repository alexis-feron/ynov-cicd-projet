#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Validate GitHub Actions workflow files
#
#  Tests performed:
#    1. YAML syntax (python3 yaml.safe_load)
#    2. Required top-level fields (name, on, jobs)
#    3. Job dependency graph (all 'needs' reference existing jobs)
#    4. Required secrets documentation
#    5. Static analysis with actionlint (if installed)
#
#  Usage:
#    ./.github/scripts/validate-workflows.sh
#    ./.github/scripts/validate-workflows.sh lint    # actionlint only
#    ./.github/scripts/validate-workflows.sh syntax  # YAML syntax only
#    ./.github/scripts/validate-workflows.sh graph   # dependency graph only
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORKFLOWS_DIR="$ROOT/.github/workflows"
PASS=0
FAIL=0

# ── Helpers ───────────────────────────────────────────────────────────────────
green()  { printf '\033[0;32m✔ %s\033[0m\n' "$*"; }
red()    { printf '\033[0;31m✘ %s\033[0m\n' "$*"; }
yellow() { printf '\033[0;33m● %s\033[0m\n' "$*"; }
header() { printf '\n\033[1;34m=== %s ===\033[0m\n' "$*"; }

pass() { green  "$1"; ((PASS++)); }
fail() { red    "$1"; ((FAIL++)); }

require_python3() {
  if ! command -v python3 &>/dev/null; then
    yellow "python3 not found - skipping YAML checks"
    return 1
  fi
  return 0
}

# ── Test 1: YAML syntax ───────────────────────────────────────────────────────
test_yaml_syntax() {
  header "YAML Syntax"

  require_python3 || return

  for wf in "$WORKFLOWS_DIR"/*.yml; do
    name="$(basename "$wf")"
    result=$(python3 - "$wf" <<'PYEOF'
import sys, yaml
try:
    with open(sys.argv[1]) as f:
        yaml.safe_load(f)
    print("ok")
except yaml.YAMLError as e:
    print(f"error: {e}")
PYEOF
)
    if [ "$result" = "ok" ]; then
      pass "YAML syntax valid: $name"
    else
      fail "YAML syntax error in $name: $result"
    fi
  done
}

# ── Test 2: Required top-level fields ─────────────────────────────────────────
test_required_fields() {
  header "Required Fields"

  require_python3 || return

  for wf in "$WORKFLOWS_DIR"/*.yml; do
    name="$(basename "$wf")"
    result=$(python3 - "$wf" <<'PYEOF'
import sys, yaml
with open(sys.argv[1]) as f:
    doc = yaml.safe_load(f)
missing = [k for k in ('name', 'on', 'jobs') if k not in (doc or {})]
print(','.join(missing) if missing else 'ok')
PYEOF
)
    if [ "$result" = "ok" ]; then
      pass "Required fields present: $name"
    else
      fail "Missing fields [$result] in $name"
    fi
  done
}

# ── Test 3: Job dependency graph ──────────────────────────────────────────────
test_job_graph() {
  header "Job Dependency Graph"

  require_python3 || return

  for wf in "$WORKFLOWS_DIR"/*.yml; do
    name="$(basename "$wf")"
    result=$(python3 - "$wf" <<'PYEOF'
import sys, yaml

with open(sys.argv[1]) as f:
    doc = yaml.safe_load(f)

jobs = doc.get('jobs', {}) or {}
job_names = set(jobs.keys())
errors = []

for job_name, job in jobs.items():
    if not isinstance(job, dict):
        continue
    needs = job.get('needs', [])
    if isinstance(needs, str):
        needs = [needs]
    for dep in (needs or []):
        if dep not in job_names:
            errors.append(f"{job_name} needs unknown job '{dep}'")

print('\n'.join(errors) if errors else 'ok')
PYEOF
)
    if [ "$result" = "ok" ]; then
      pass "Job graph valid: $name"
    else
      fail "Dependency errors in $name:"
      echo "  $result"
    fi
  done
}

# ── Test 4: concurrency defined in CI ─────────────────────────────────────────
test_concurrency() {
  header "Concurrency (cancel-in-progress)"

  ci_file="$WORKFLOWS_DIR/ci.yml"
  if [ ! -f "$ci_file" ]; then
    fail "ci.yml not found"
    return
  fi

  if grep -q "cancel-in-progress: true" "$ci_file"; then
    pass "cancel-in-progress set in ci.yml"
  else
    fail "cancel-in-progress missing in ci.yml (wastes CI minutes on stale runs)"
  fi
}

# ── Test 5: CD only deploys on CI success ─────────────────────────────────────
test_cd_guard() {
  header "CD deployment guard"

  cd_file="$WORKFLOWS_DIR/cd.yml"
  if [ ! -f "$cd_file" ]; then
    fail "cd.yml not found"
    return
  fi

  # CD must trigger on workflow_run completion
  if grep -q "workflow_run" "$cd_file"; then
    pass "cd.yml triggers on workflow_run"
  else
    fail "cd.yml does not wait for CI (workflow_run trigger missing)"
  fi

  # Must check CI conclusion == success
  if grep -q "conclusion.*success" "$cd_file"; then
    pass "cd.yml checks CI conclusion == success"
  else
    fail "cd.yml does not verify CI success - may deploy on failed CI"
  fi
}

# ── Test 6: Rollback workflow has workflow_dispatch ───────────────────────────
test_rollback_trigger() {
  header "Rollback workflow"

  rb_file="$WORKFLOWS_DIR/rollback.yml"
  if [ ! -f "$rb_file" ]; then
    fail "rollback.yml not found"
    return
  fi

  if grep -q "workflow_dispatch" "$rb_file"; then
    pass "rollback.yml uses workflow_dispatch (manual trigger)"
  else
    fail "rollback.yml missing workflow_dispatch trigger"
  fi

  if grep -q "confirm" "$rb_file"; then
    pass "rollback.yml requires confirmation input"
  else
    fail "rollback.yml has no confirmation guard (dangerous)"
  fi
}

# ── Test 7: Secrets documentation ─────────────────────────────────────────────
test_secrets_documented() {
  header "Secrets Documentation"

  # Collect all secret references used across workflows
  used_secrets=$(grep -h 'secrets\.' "$WORKFLOWS_DIR"/*.yml | \
    grep -oP 'secrets\.\K[A-Z_]+' | sort -u || true)

  # Known built-in secrets that don't need documentation
  builtins="GITHUB_TOKEN"

  undocumented=()
  for secret in $used_secrets; do
    if echo "$builtins" | grep -qw "$secret"; then
      continue
    fi
    # Check if documented in the workflow file itself (comment or description)
    if grep -qr "# *$secret" "$WORKFLOWS_DIR"/ 2>/dev/null || \
       grep -qr "$secret:" "$ROOT/.github/workflows/cd.yml" 2>/dev/null; then
      pass "Secret documented: $secret"
    else
      undocumented+=("$secret")
    fi
  done

  if [ ${#undocumented[@]} -eq 0 ]; then
    pass "All non-builtin secrets appear documented"
  else
    for s in "${undocumented[@]}"; do
      yellow "Secret used but not commented in workflow: $s"
    done
  fi
}

# ── Test 8: actionlint (static analysis) ──────────────────────────────────────
test_actionlint() {
  header "actionlint"

  if ! command -v actionlint &>/dev/null; then
    yellow "actionlint not installed - skipping"
    yellow "Install: https://github.com/rhysd/actionlint#installation"
    return
  fi

  if actionlint "$WORKFLOWS_DIR"/*.yml; then
    pass "actionlint: no errors"
  else
    fail "actionlint reported errors"
  fi
}

# ── Main ──────────────────────────────────────────────────────────────────────
MODE="${1:-all}"

case "$MODE" in
  syntax)  test_yaml_syntax ;;
  graph)   test_job_graph ;;
  lint)    test_actionlint ;;
  all)
    test_yaml_syntax
    test_required_fields
    test_job_graph
    test_concurrency
    test_cd_guard
    test_rollback_trigger
    test_secrets_documented
    test_actionlint
    ;;
  *)
    echo "Usage: $0 [all|syntax|graph|lint]"
    exit 1
    ;;
esac

echo ""
echo "────────────────────────"
printf "Results: \033[0;32m%d passed\033[0m, \033[0;31m%d failed\033[0m\n" \
  "$PASS" "$FAIL"
echo "────────────────────────"

[ "$FAIL" -eq 0 ]
