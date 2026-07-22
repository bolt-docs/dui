#!/usr/bin/env bash
#
# scripts/sync-skills.sh
#
# Keep `.opencode/skills/dui/SKILL.md` and `.agents/skills/dui/SKILL.md`
# byte-identical. The skill installer (`scripts/install-ai-agent.sh`)
# fetches from the `.opencode/...` copy and the `.agents/...` copy is used
# as a universal fallback by some agent hosts, so any drift between them
# silently produces inconsistent DUI guidance per-tool.
#
# Behavior:
#   - If both files exist and are byte-identical → exit 0, print "in sync".
#   - If they differ → copy .opencode → .agents, print "synced", exit 0.
#   - If either file is missing → exit 1 with a clear error.
#
# Use as a release-time hook (`pnpm sync-skills`); a CI step can run it
# with `--check` to enforce parity without writing.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${REPO_ROOT}/.opencode/skills/dui/SKILL.md"
DST="${REPO_ROOT}/.agents/skills/dui/SKILL.md"

usage() {
	echo "Usage: $0 [--check]" >&2
	echo "  (no flag)   cp .opencode/.../SKILL.md to .agents/.../SKILL.md if they differ." >&2
	echo "  --check     exit 0 if equal, exit 1 if different. Do not write." >&2
}

CHECK_ONLY="false"
if [[ "${1:-}" == "--check" ]]; then
	CHECK_ONLY="true"
elif [[ "$#" -gt 0 ]]; then
	usage
	exit 2
fi

if [[ ! -f "$SRC" ]]; then
	echo "Source skill missing: $SRC" >&2
	exit 1
fi
if [[ ! -f "$DST" ]]; then
	echo "Destination skill missing: $DST" >&2
	exit 1
fi

if diff -q "$SRC" "$DST" >/dev/null 2>&1; then
	echo "in sync: $SRC ≡ $DST"
	exit 0
fi

if [[ "$CHECK_ONLY" == "true" ]]; then
	echo "drift: $SRC ≠ $DST" >&2
	exit 1
fi

cp "$SRC" "$DST"
echo "synced: $SRC → $DST"
