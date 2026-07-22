#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# DUI — AI Agent Skill Installer
# ─────────────────────────────────────────────────────────────
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/bolt-docs/dui/master/scripts/install-ai-agent.sh | bash
#   bash scripts/install-ai-agent.sh [--agent <agent>] [--yes]
#
# Supported agents:
#   claude-code   → CLAUDE.md (project instructions)
#   claude-skill  → .claude/skills/dui/SKILL.md (modular skill)
#   cursor        → .cursor/rules/dui.mdc (system rules)
#   opencode      → .opencode/skills/dui/SKILL.md (modular skill)
#   .agents       → .agents/skills/dui/SKILL.md & .agents/skill/dui/SKILL.md (universal)
#   all           → all of the above
#
# Options:
#   --agent <name>  Skip interactive prompt
#   --yes           Overwrite without prompting
# ─────────────────────────────────────────────────────────────

SKILL_SOURCE_URL="https://raw.githubusercontent.com/bolt-docs/dui/master/.opencode/skills/dui/SKILL.md"
SKILL_LOCAL="./.opencode/skills/dui/SKILL.md"

# ─── Colors ───
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()  { echo -e "${CYAN}ℹ${NC} $1"; }
ok()    { echo -e "${GREEN}✔${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠${NC} $1"; }
err()   { echo -e "${RED}✖${NC} $1" >&2; }
header(){ echo -e "\n${BOLD}━━━ $1 ━━━${NC}\n"; }

# ─── Get skill content ───
fetch_skill() {
	if [[ -f "$SKILL_LOCAL" ]]; then
		cat "$SKILL_LOCAL"
		return 0
	fi

	# Prefer curl, but fall through to wget even if curl IS installed but the
	# network request itself failed. Using `if curl ... then return 0; fi`
	# (instead of `&&`) keeps the chain alive on request failure.
	if command -v curl &>/dev/null; then
		if curl -fsSL "$SKILL_SOURCE_URL" 2>/dev/null; then
			return 0
		fi
	fi

	if command -v wget &>/dev/null; then
		if wget -qO- "$SKILL_SOURCE_URL" 2>/dev/null; then
			return 0
		fi
	fi

	err "Could not fetch the skill from:\n  $SKILL_SOURCE_URL\n  Make sure you have curl or wget installed, or run the script from the repository root."
	exit 1
}

# ─── Install at destination ───
# Assumes $SKILL_CONTENT has already been populated by `fetch_skill`.
install_skill() {
	local dest="$1"
	local label="$2"

	if [[ -f "$dest" ]]; then
		if [[ "$FORCE_YES" != "true" ]]; then
			echo -n "  ${dest} already exists. Overwrite? [y/N] "
			# Read from the controlling terminal so the script works
			# correctly when piped via `curl ... | bash` (where stdin
			# is the script body itself, not user input).
			read -r answer < /dev/tty
			if [[ ! "$answer" =~ ^[Yy]$ ]]; then
				warn "Skipped: ${dest}"
				return
			fi
		fi
	fi

	mkdir -p "$(dirname "$dest")"
	# `printf` preserves backslashes / special bytes that `echo -e`
	# would otherwise interpret.
	printf "%s\n" "$SKILL_CONTENT" > "$dest"
	ok "Installed for ${label}: ${dest}"
}

# ─── Parse arguments ───
FORCE_YES="false"
SELECTED_AGENT=""

while [[ $# -gt 0 ]]; do
	case "$1" in
		--agent) SELECTED_AGENT="$2"; shift 2 ;;
		--yes) FORCE_YES="true"; shift ;;
		--help|-h)
			echo "Usage: bash scripts/install-ai-agent.sh [--agent <agent>] [--yes]"
			echo ""
			echo "Agents: claude-code, claude-skill, cursor, opencode, .agents, all"
			exit 0
			;;
		*) err "Unknown option: $1"; exit 1 ;;
	esac
done

# ─── Banner ───
header "DUI — AI Agent Skill Installer"
info "This script will install the DUI skill so your AI agent"
info "knows the complete API of @bdocs/dui (colors, prompts,"
info "spinners, tables, themes, etc.)."
echo ""

# ─── Interactive prompt ───
if [[ -z "$SELECTED_AGENT" ]]; then
	echo "${BOLD}For which AI agent do you want to install the skill?${NC}"
	echo "  1) claude-code   → CLAUDE.md (project instructions)"
	echo "  2) claude-skill  → .claude/skills/dui/SKILL.md (modular skill)"
	echo "  3) cursor        → .cursor/rules/dui.mdc (system rules)"
	echo "  4) opencode      → .opencode/skills/dui/SKILL.md (modular skill)"
	echo "  5) .agents       → .agents/skills/dui/SKILL.md & .agents/skill/dui/SKILL.md (universal)"
	echo "  6) all           → all of the above"
	echo ""
	echo -n "Select an option [1-6]: "
	# See comment in install_skill() above re: /dev/tty.
	read -r opt < /dev/tty
	echo ""

	case "$opt" in
		1) SELECTED_AGENT="claude-code" ;;
		2) SELECTED_AGENT="claude-skill" ;;
		3) SELECTED_AGENT="cursor" ;;
		4) SELECTED_AGENT="opencode" ;;
		5) SELECTED_AGENT=".agents" ;;
		6) SELECTED_AGENT="all" ;;
		*) err "Invalid option: $opt"; exit 1 ;;
	esac
fi

# ─── Fetch content ONCE before branching ───
SKILL_CONTENT=$(fetch_skill)
if [[ -z "${SKILL_CONTENT:-}" ]]; then
	err "Could not retrieve the skill content."
	exit 1
fi

# ─── Run installation ───
case "$SELECTED_AGENT" in
	claude-code)
		install_skill "CLAUDE.md" "Claude Code (project instructions)"
		;;

	claude-skill)
		install_skill ".claude/skills/dui/SKILL.md" "Claude Skill"
		;;

	cursor)
		install_skill ".cursor/rules/dui.mdc" "Cursor"
		;;

	opencode)
		install_skill ".opencode/skills/dui/SKILL.md" "OpenCode"
		;;

	.agents)
		install_skill ".agents/skills/dui/SKILL.md" ".agents (standard)"
		install_skill ".agents/skill/dui/SKILL.md" ".agents (alternative)"
		;;

	all|todos)
		install_skill "CLAUDE.md" "Claude Code (project instructions)"
		install_skill ".claude/skills/dui/SKILL.md" "Claude Skill"
		install_skill ".cursor/rules/dui.mdc" "Cursor"
		install_skill ".opencode/skills/dui/SKILL.md" "OpenCode"
		install_skill ".agents/skills/dui/SKILL.md" ".agents (standard)"
		install_skill ".agents/skill/dui/SKILL.md" ".agents (alternative)"
		;;

	*)
		err "Unknown agent: $SELECTED_AGENT"
		echo "  Valid agents: claude-code, claude-skill, cursor, opencode, .agents, all"
		exit 1
		;;
esac

echo ""
ok "Installation completed! Your AI agent now knows the DUI API."
echo "  Try asking it: 'give me an example of select with @bdocs/dui'"
echo ""
