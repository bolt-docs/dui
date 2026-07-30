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
#   - (no flag) — If both files exist and are byte-identical → exit 0.
#     If they differ → copy .opencode → .agents, exit 0.
#     If destination is missing → create dir + copy, exit 0.
#   - `--check` — exit 0 when files are equal, exit 1 when they drift.
#     Fails fast if either file is missing.
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

# ─── Both files must exist in check mode ───
if [[ "$CHECK_ONLY" == "true" ]]; then
	if [[ ! -f "$SRC" ]]; then
		echo "Source skill missing: $SRC" >&2
		exit 1
	fi
	if [[ ! -f "$DST" ]]; then
		echo "Destination skill missing: $DST" >&2
		exit 1
	fi

	# cmp -s is POSIX and works on GNU/Linux, macOS, BusyBox, and BSD.
	# cmp --silent is a GNU extension that fails on macOS.
	if cmp -s "$SRC" "$DST"; then
		echo "in sync: $SRC ≡ $DST"
		exit 0
	else
		echo "drift: $SRC ≠ $DST" >&2
		exit 1
	fi
fi

# ─── Copy mode (default) ───

# Source is mandatory even in copy mode — we have nothing to sync from.
if [[ ! -f "$SRC" ]]; then
	echo "Source skill missing: $SRC" >&2
	exit 1
fi

# Destination may be missing on first run — create the directory silently.
mkdir -p "$(dirname "$DST")"

if [[ ! -f "$DST" ]]; then
	# First-time setup: destination doesn't exist yet → just copy.
	cp "$SRC" "$DST"
	echo "created: $SRC → $DST"
	exit 0
fi

# Both exist — copy only when they differ (spares unnecessary inode writes).
if cmp -s "$SRC" "$DST"; then
	echo "in sync: $SRC ≡ $DST"
	exit 0
fi

cp "$SRC" "$DST"
echo "synced: $SRC → $DST"
