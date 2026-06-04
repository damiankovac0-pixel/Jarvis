#!/usr/bin/env bash
set -euo pipefail

# ────────────────────────────────────────────────────────────
# Jarvis Terminal — Unix/macOS uninstaller
# Safely removes all Jarvis files and shell integration.
# Does NOT remove system tools (rg, fd, jq), Node.js, Python,
# or Git.
# ────────────────────────────────────────────────────────────

RED='\033[31m'
GREEN='\033[32m'
YELLOW='\033[33m'
CYAN='\033[36m'
MAGENTA='\033[35m'
BOLD='\033[1m'
NC='\033[0m'

CONFIG_DIR="$HOME/.config/opencode"

echo -e "\n${RED}╔══════════════════════════════════════════════╗${NC}"
echo -e "${RED}║${NC}          ${BOLD}JARVIS — Uninstall${NC}              ${RED}║${NC}"
echo -e "${RED}║${NC}                                          ${RED}║${NC}"
echo -e "${RED}║${NC}  This will remove:                         ${RED}║${NC}"
echo -e "${RED}║${NC}    • ~/.config/opencode/ (config + agents)  ${RED}║${NC}"
echo -e "${RED}║${NC}    • 'jarvis' alias from shell profile      ${RED}║${NC}"
echo -e "${RED}║${NC}                                          ${RED}║${NC}"
echo -e "${RED}║${NC}  This will NOT remove:                      ${RED}║${NC}"
echo -e "${RED}║${NC}    • Node.js / npm                          ${RED}║${NC}"
echo -e "${RED}║${NC}    • Python / pip                           ${RED}║${NC}"
echo -e "${RED}║${NC}    • ripgrep / fd / jq                      ${RED}║${NC}"
echo -e "${RED}║${NC}    • Git                                    ${RED}║${NC}"
echo -e "${RED}╚══════════════════════════════════════════════╝${NC}"

if [ ! -d "$CONFIG_DIR" ]; then
  echo -e "\n  ${YELLOW}⚠${NC} No Jarvis installation found at $CONFIG_DIR"
  echo -e "  Nothing to remove.\n"
  exit 0
fi

# ── Confirm ────────────────────────────────────────────────

echo ""
read -p "  Type \"REMOVE\" to confirm uninstall: " CONFIRM
if [ "$CONFIRM" != "REMOVE" ]; then
  echo -e "  ${YELLOW}Uninstall cancelled.${NC}\n"
  exit 0
fi

echo ""

# ── Helper: has command ───────────────────────────────────

has_cmd() { command -v "$1" >/dev/null 2>&1; }

# ── Remove config directory ───────────────────────────────

echo -n "  [1/4] Removing configuration directory..."
if [ -d "$CONFIG_DIR" ]; then
  if rm -rf "$CONFIG_DIR" 2>/dev/null; then
    echo -e " ${GREEN}OK${NC}"
  else
    echo -e " ${RED}FAILED${NC}"
    echo -e "  ${YELLOW}⚠${NC} Could not remove $CONFIG_DIR"
  fi
else
  echo -e " ${YELLOW}SKIPPED (not found)${NC}"
fi

# ── Remove jarvis alias from shell profiles ───────────────

echo -n "  [2/4] Removing 'jarvis' alias from shell profiles..."

# Determine which profiles exist
PROFILES=""
if [ -f "$HOME/.bashrc" ];        then PROFILES="$PROFILES $HOME/.bashrc"; fi
if [ -f "$HOME/.bash_profile" ];  then PROFILES="$PROFILES $HOME/.bash_profile"; fi
if [ -f "$HOME/.zshrc" ];         then PROFILES="$PROFILES $HOME/.zshrc"; fi
if [ -f "$HOME/.config/fish/config.fish" ]; then
  PROFILES="$PROFILES $HOME/.config/fish/config.fish"
fi
if [ -f "$HOME/.config/fish/functions/jarvis.fish" ]; then
  PROFILES="$PROFILES $HOME/.config/fish/functions/jarvis.fish"
fi

FOUND=false
for PROFILE in $PROFILES; do
  if [ -f "$PROFILE" ]; then
    # Check if it contains Jarvis lines
    if grep -q "# Jarvis Terminal\|alias jarvis=\|function jarvis" "$PROFILE" 2>/dev/null; then
      # Backup
      cp "$PROFILE" "$PROFILE.jarvis-backup" 2>/dev/null

      # Remove lines containing Jarvis indicators
      grep -v "# Jarvis Terminal" "$PROFILE" | grep -v "alias jarvis='opencode" | grep -v "function jarvis {" > "${PROFILE}.tmp" 2>/dev/null
      mv "${PROFILE}.tmp" "$PROFILE" 2>/dev/null
      FOUND=true
    fi
  fi
done

# Also remove fish function file
if [ -f "$HOME/.config/fish/functions/jarvis.fish" ]; then
  rm -f "$HOME/.config/fish/functions/jarvis.fish" 2>/dev/null
  FOUND=true
fi

if [ "$FOUND" = true ]; then
  echo -e " ${GREEN}OK${NC}"
  echo -e "  ${CYAN}Backups saved with .jarvis-backup suffix${NC}"
else
  echo -e " ${YELLOW}NOT FOUND${NC}"
fi

# ── Optional: uninstall opencode ──────────────────────────

echo -n "  [3/4] Global opencode..."
if has_cmd opencode; then
  echo -e " ${GREEN}FOUND${NC}"
  echo ""
  read -p "  Also uninstall opencode globally? [y/N] " REMOVE_OPENCODE
  if [ "$REMOVE_OPENCODE" = "y" ] || [ "$REMOVE_OPENCODE" = "Y" ]; then
    echo -n "  Uninstalling opencode..."
    npm uninstall -g @opencode-ai/opencode 2>/dev/null
    echo -e " ${GREEN}OK${NC}"
  fi
else
  echo -e " ${YELLOW}NOT INSTALLED${NC}"
fi

# ── Peek at remaining artifacts ───────────────────────────
echo -e "  [4/4] ${GREEN}Cleanup complete.${NC}"
echo ""

echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}       ✅  Jarvis has been removed            ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                          ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  Left intact (system):                     ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}    • Node.js $(node --version 2>/dev/null || echo '')              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}    • Python                                ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}    • ripgrep / fd / jq                     ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}    • Git                                   ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                          ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  Restart your terminal to complete removal. ${GREEN}║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
