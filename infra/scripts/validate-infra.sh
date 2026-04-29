#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  IaC validation tests
#
#  Tests:
#    1. Terraform: file structure + fmt check + validate (offline)
#    2. Ansible: YAML syntax + playbook syntax check + lint
#    3. Local simulation: Dockerfile syntax
#
#  Usage:
#    ./infra/scripts/validate-infra.sh           # all tests
#    ./infra/scripts/validate-infra.sh terraform # Terraform only
#    ./infra/scripts/validate-infra.sh ansible   # Ansible only
#
#  Requirements: terraform, ansible (optional: ansible-lint, hadolint)
# ─────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
INFRA="$ROOT/infra"
PASS=0
FAIL=0

# ── Helpers ───────────────────────────────────────────────────
green()  { printf '\033[0;32m✔ %s\033[0m\n' "$*"; }
red()    { printf '\033[0;31m✘ %s\033[0m\n' "$*"; }
yellow() { printf '\033[0;33m● %s\033[0m\n' "$*"; }
header() { printf '\n\033[1;34m=== %s ===\033[0m\n' "$*"; }

pass() { green  "$1"; ((PASS++)); }
fail() { red    "$1"; ((FAIL++)); }

assert_file() {
  if [ -f "$1" ]; then
    pass "File exists: ${1#$ROOT/}"
  else
    fail "Missing file: ${1#$ROOT/}"
  fi
}

# ── Tests: file structure ─────────────────────────────────────
test_structure() {
  header "File Structure"

  # Terraform
  assert_file "$INFRA/terraform/providers.tf"
  assert_file "$INFRA/terraform/variables.tf"
  assert_file "$INFRA/terraform/main.tf"
  assert_file "$INFRA/terraform/outputs.tf"

  # Ansible
  assert_file "$INFRA/ansible/inventory.ini"
  assert_file "$INFRA/ansible/group_vars/all.yml"
  assert_file "$INFRA/ansible/playbooks/setup.yml"
  assert_file "$INFRA/ansible/playbooks/deploy.yml"
  assert_file "$INFRA/ansible/roles/base/tasks/main.yml"
  assert_file "$INFRA/ansible/roles/base/handlers/main.yml"
  assert_file "$INFRA/ansible/roles/docker/tasks/main.yml"
  assert_file "$INFRA/ansible/roles/app/tasks/main.yml"
  assert_file "$INFRA/ansible/roles/app/templates/env.j2"

  # Local simulation
  assert_file "$INFRA/local/docker-compose.yml"
  assert_file "$INFRA/local/Dockerfile.target"
}

# ── Tests: Terraform ──────────────────────────────────────────
test_terraform() {
  header "Terraform"

  if ! command -v terraform &>/dev/null; then
    yellow "terraform not installed - skipping"
    yellow "Install: https://developer.hashicorp.com/terraform/install"
    return
  fi

  cd "$INFRA/terraform"

  # terraform init -backend=false: resolve providers without connecting
  if terraform init -backend=false -input=false > /dev/null 2>&1; then
    pass "terraform init (no backend)"
  else
    fail "terraform init failed"
    return
  fi

  # fmt check: all .tf files must be properly formatted
  if terraform fmt -check -recursive > /dev/null 2>&1; then
    pass "terraform fmt: files are properly formatted"
  else
    fail "terraform fmt: formatting issues (run: terraform fmt -recursive)"
  fi

  # validate: type-check without cloud credentials
  if terraform validate > /dev/null 2>&1; then
    pass "terraform validate"
  else
    fail "terraform validate failed"
    terraform validate  # print the error
  fi

  cd "$ROOT"
}

# ── Tests: Ansible YAML syntax ────────────────────────────────
test_ansible_syntax() {
  header "Ansible YAML Syntax"

  if ! command -v python3 &>/dev/null; then
    yellow "python3 not found - skipping YAML syntax"
    return
  fi

  # Check all YAML files under ansible/
  find "$INFRA/ansible" -name "*.yml" | while read -r f; do
    result=$(python3 -c "
import yaml, sys
try:
    yaml.safe_load(open(sys.argv[1]))
    print('ok')
except Exception as e:
    print(f'error: {e}')
" "$f")
    if [ "$result" = "ok" ]; then
      pass "YAML syntax: ${f#$ROOT/}"
    else
      fail "YAML syntax error: ${f#$ROOT/} - $result"
    fi
  done
}

# ── Tests: Ansible playbook syntax-check ─────────────────────
test_ansible_playbook() {
  header "Ansible Playbook Syntax"

  if ! command -v ansible-playbook &>/dev/null; then
    yellow "ansible-playbook not installed - skipping"
    yellow "Install: pip install ansible"
    return
  fi

  for playbook in setup.yml deploy.yml; do
    if ansible-playbook \
        -i "$INFRA/ansible/inventory.ini" \
        "$INFRA/ansible/playbooks/$playbook" \
        --syntax-check \
        > /dev/null 2>&1; then
      pass "ansible syntax-check: $playbook"
    else
      fail "ansible syntax-check failed: $playbook"
    fi
  done
}

# ── Tests: ansible-lint ───────────────────────────────────────
test_ansible_lint() {
  header "ansible-lint"

  if ! command -v ansible-lint &>/dev/null; then
    yellow "ansible-lint not installed - skipping"
    yellow "Install: pip install ansible-lint"
    return
  fi

  if ansible-lint "$INFRA/ansible/playbooks/" \
      --exclude "$INFRA/ansible/roles/docker/tasks/main.yml" \
      -q 2>/dev/null; then
    pass "ansible-lint: no errors"
  else
    fail "ansible-lint reported issues"
  fi
}

# ── Tests: Dockerfile (local target) ─────────────────────────
test_local_dockerfile() {
  header "Local Simulation Dockerfile"

  if ! command -v hadolint &>/dev/null; then
    yellow "hadolint not installed - skipping"
    return
  fi

  if hadolint --ignore DL3008 --ignore DL3009 \
      "$INFRA/local/Dockerfile.target" > /dev/null 2>&1; then
    pass "hadolint: Dockerfile.target"
  else
    fail "hadolint: Dockerfile.target has issues"
  fi
}

# ── Tests: Ansible variables coverage ────────────────────────
test_vault_vars_documented() {
  header "Vault Variables Coverage"

  # All vault_ variables referenced in templates must be documented
  vault_vars=$(grep -rh 'vault_' "$INFRA/ansible/" | \
    grep -oP 'vault_[a-z_]+' | sort -u || true)

  if [ -z "$vault_vars" ]; then
    pass "No vault_ variables found"
    return
  fi

  for var in $vault_vars; do
    # Each vault var should appear in env.j2 or group_vars
    if grep -qr "$var" "$INFRA/ansible/roles/app/templates/" \
                        "$INFRA/ansible/group_vars/" 2>/dev/null; then
      pass "vault var referenced: $var"
    else
      yellow "vault var not in templates: $var (add to group_vars/staging/vault.yml)"
    fi
  done
}

# ── Main ──────────────────────────────────────────────────────
MODE="${1:-all}"

case "$MODE" in
  terraform) test_structure; test_terraform ;;
  ansible)   test_structure; test_ansible_syntax; test_ansible_playbook; test_ansible_lint ;;
  all)
    test_structure
    test_terraform
    test_ansible_syntax
    test_ansible_playbook
    test_ansible_lint
    test_local_dockerfile
    test_vault_vars_documented
    ;;
  *)
    echo "Usage: $0 [all|terraform|ansible]"
    exit 1
    ;;
esac

echo ""
echo "────────────────────────"
printf "Results: \033[0;32m%d passed\033[0m, \033[0;31m%d failed\033[0m\n" "$PASS" "$FAIL"
echo "────────────────────────"

[ "$FAIL" -eq 0 ]
