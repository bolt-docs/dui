#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# DUI — AI Agent Skill Installer
# ─────────────────────────────────────────────────────────────
# Uso:
#   curl -fsSL https://raw.githubusercontent.com/bolt-docs/dui/master/scripts/install-ai-agent.sh | bash
#   bash scripts/install-ai-agent.sh [--agent <agente>] [--yes]
#
# Agentes soportados:
#   claude-code  → CLAUDE.md
#   cursor       → .cursor/rules/dui.mdc
#   opencode     → .opencode/skills/dui.md
#   .agents      → .agents/dui.md
#   todos        → todos los anteriores
#
# Opciones:
#   --agent <name>  Saltar prompt interactivo
#   --yes           Sobrescribir sin preguntar
# ─────────────────────────────────────────────────────────────

SKILL_SOURCE_URL="https://raw.githubusercontent.com/bolt-docs/dui/master/.opencode/skills/dui.md"
SKILL_LOCAL="./.opencode/skills/dui.md"

# ─── Colores ───
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

# ─── Obtener contenido del skill ───
fetch_skill() {
	if [[ -f "$SKILL_LOCAL" ]]; then
		cat "$SKILL_LOCAL"
		return 0
	fi

	if command -v curl &>/dev/null; then
		curl -fsSL "$SKILL_SOURCE_URL" 2>/dev/null && return 0
	fi

	if command -v wget &>/dev/null; then
		wget -qO- "$SKILL_SOURCE_URL" 2>/dev/null && return 0
	fi

	err "No se pudo obtener el skill desde:\n  $SKILL_SOURCE_URL\n  Asegúrate de tener curl o wget, o ejecuta el script desde la raíz del repo."
	exit 1
}

# ─── Instalar en destino ───
install_skill() {
	local dest="$1"
	local label="$2"

	if [[ -f "$dest" ]]; then
		if [[ "$FORCE_YES" != "true" ]]; then
			echo -n "  ${dest} ya existe. ¿Sobrescribir? [y/N] "
			read -r answer
			if [[ ! "$answer" =~ ^[Yy]$ ]]; then
				warn "Omitido: ${dest}"
				return
			fi
		fi
	fi

	mkdir -p "$(dirname "$dest")"

	# Intentar descargar; si falla, intentar copia local; si falla, salir
	if command -v curl &>/dev/null; then
		content=$(curl -fsSL "$SKILL_SOURCE_URL" 2>/dev/null) || true
	elif command -v wget &>/dev/null; then
		content=$(wget -qO- "$SKILL_SOURCE_URL" 2>/dev/null) || true
	fi

	if [[ -z "${content:-}" && -f "$SKILL_LOCAL" ]]; then
		content=$(cat "$SKILL_LOCAL")
	fi

	if [[ -z "${content:-}" ]]; then
		err "No se pudo obtener el contenido del skill."
		exit 1
	fi

	echo "$content" > "$dest"
	ok "Instalado en ${label}: ${dest}"
}

# ─── Parsear argumentos ───
FORCE_YES="false"
SELECTED_AGENT=""

while [[ $# -gt 0 ]]; do
	case "$1" in
		--agent) SELECTED_AGENT="$2"; shift 2 ;;
		--yes) FORCE_YES="true"; shift ;;
		--help|-h)
			echo "Uso: bash scripts/install-ai-agent.sh [--agent <agente>] [--yes]"
			echo ""
			echo "Agentes: claude-code, cursor, opencode, .agents, todos"
			exit 0
			;;
		*) err "Opción desconocida: $1"; exit 1 ;;
	esac
done

# ─── Banner ───
header "DUI — AI Agent Skill Installer"
info "Este script instalará la skill de DUI para que tu agente IA"
info "conozca la API completa de @bdocs/dui (colores, prompts,"
info "spinners, tablas, temas, etc.)."
echo ""

# ─── Prompt interactivo ───
if [[ -z "$SELECTED_AGENT" ]]; then
	echo "${BOLD}¿Para qué agente de IA quieres instalar la skill?${NC}"
	echo "  1) claude-code  → CLAUDE.md"
	echo "  2) cursor       → .cursor/rules/dui.mdc"
	echo "  3) opencode     → .opencode/skills/dui.md"
	echo "  4) .agents      → .agents/dui.md (formato universal)"
	echo "  5) todos        → todos los anteriores"
	echo ""
	echo -n "Número [1-5]: "
	read -r opt
	echo ""

	case "$opt" in
		1) SELECTED_AGENT="claude-code" ;;
		2) SELECTED_AGENT="cursor" ;;
		3) SELECTED_AGENT="opencode" ;;
		4) SELECTED_AGENT=".agents" ;;
		5) SELECTED_AGENT="todos" ;;
		*) err "Opción inválida: $opt"; exit 1 ;;
	esac
fi

# ─── Ejecutar instalación ───
case "$SELECTED_AGENT" in
	claude-code)
		install_skill "CLAUDE.md" "Claude Code"
		;;

	cursor)
		install_skill ".cursor/rules/dui.mdc" "Cursor"
		;;

	opencode)
		if [[ -f ".opencode/skills/dui.md" ]]; then
			ok "OpenCode ya tiene la skill en .opencode/skills/dui.md"
		else
			install_skill ".opencode/skills/dui.md" "OpenCode"
		fi
		;;

	.agents)
		install_skill ".agents/dui.md" ".agents (formato universal)"
		;;

	todos)
		install_skill "CLAUDE.md" "Claude Code"
		install_skill ".cursor/rules/dui.mdc" "Cursor"
		if [[ ! -f ".opencode/skills/dui.md" ]]; then
			install_skill ".opencode/skills/dui.md" "OpenCode"
		else
			ok "OpenCode ya tiene la skill en .opencode/skills/dui.md"
		fi
		install_skill ".agents/dui.md" ".agents (formato universal)"
		;;

	*)
		err "Agente desconocido: $SELECTED_AGENT"
		echo "  Agentes válidos: claude-code, cursor, opencode, .agents, todos"
		exit 1
		;;
esac

echo ""
ok "¡Instalación completada! Tu agente IA ya conoce la API de DUI."
echo "  Prueba preguntándole: 'dame un ejemplo de select con @bdocs/dui'"
echo ""
