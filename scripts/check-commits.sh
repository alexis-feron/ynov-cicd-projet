#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  Validate commit messages against Conventional Commits spec.
#
#  Usage:
#    ./scripts/check-commits.sh          # all commits since last tag
#    ./scripts/check-commits.sh 5        # last 5 commits
#    ./scripts/check-commits.sh HEAD~3   # commits since HEAD~3
#
#  Exit code: 0 = all valid, 1 = violations found
# ─────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PASS=0
FAIL=0

# ── Regex ─────────────────────────────────────────────────────
# Conventional Commits: type(scope)!: description
# Breaking change marker (!) is optional
readonly CC_REGEX='^(feat|fix|docs|style|refactor|test|chore|ci|perf|revert)(\([a-z-]+\))?(!)?: .{1,100}$'

# ── Helpers ───────────────────────────────────────────────────
green()  { printf '\033[0;32m✔ %s\033[0m\n' "$*"; }
red()    { printf '\033[0;31m✘ %s\033[0m\n' "$*"; }
yellow() { printf '\033[0;33m● %s\033[0m\n' "$*"; }

# ── Determine commit range ────────────────────────────────────
if [ -n "${1:-}" ] && [[ "$1" =~ ^[0-9]+$ ]]; then
  # Integer: validate last N commits
  RANGE="HEAD~${1}..HEAD"
  echo "Checking last $1 commits..."
elif [ -n "${1:-}" ]; then
  # Git ref: validate commits since that ref
  RANGE="${1}..HEAD"
  echo "Checking commits since $1..."
else
  # Default: since last tag (or all commits if no tag)
  LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
  if [ -n "$LAST_TAG" ]; then
    RANGE="${LAST_TAG}..HEAD"
    echo "Checking commits since tag $LAST_TAG..."
  else
    RANGE="HEAD"
    echo "No tag found - checking all commits..."
    RANGE="$(git rev-list --max-parents=0 HEAD)..HEAD"
  fi
fi

# ── Validate each commit ──────────────────────────────────────
while IFS= read -r line; do
  sha="${line:0:7}"
  msg="${line:8}"

  # Skip merge commits
  if [[ "$msg" == Merge* ]]; then
    yellow "skip (merge): $sha $msg"
    continue
  fi

  if echo "$msg" | grep -qP "$CC_REGEX"; then
    green "$sha $msg"
    ((PASS++))
  else
    red "$sha $msg"
    echo "     Expected format: type(scope): description"
    echo "     Valid types: feat fix docs style refactor test chore ci perf revert"
    ((FAIL++))
  fi
done < <(git log "$RANGE" --pretty=format:"%h %s" 2>/dev/null || true)

# ── Summary ───────────────────────────────────────────────────
echo ""
echo "────────────────────────"
printf "Results: \033[0;32m%d valid\033[0m, \033[0;31m%d invalid\033[0m\n" "$PASS" "$FAIL"
echo "────────────────────────"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Fix invalid commits before pushing:"
  echo "  git rebase -i HEAD~N  (then reword)"
  echo ""
  echo "Reference: docs/contributing.md"
  exit 1
fi
