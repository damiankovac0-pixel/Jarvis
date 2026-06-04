#!/usr/bin/env bash
set -euo pipefail

# ────────────────────────────────────────────────────────────
# Jarvis Terminal — Unix/macOS bootstrap
# Checks prerequisites, installs Node.js if needed, then
# hands off to the cross-platform Node.js installer.
# ────────────────────────────────────────────────────────────

MAGENTA='\033[35m'
GREEN='\033[32m'
YELLOW='\033[33m'
CYAN='\033[36m'
RED='\033[31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "\n${MAGENTA}JARVIS Terminal Setup — Bootstrap${NC}\n"

# ── Helper: check if command exists ────────────────────────

has_cmd() { command -v "$1" >/dev/null 2>&1; }

# ── Helper: get Node major version ─────────────────────────

get_node_major() {
  if has_cmd node; then
    node -e "process.stdout.write(String(process.versions.modules))" 2>/dev/null | head -c 2 || echo "0"
    # Alternative: directly parse version
    node --version 2>/dev/null | sed 's/v//' | cut -d. -f1 || echo "0"
  else
    echo "0"
  fi
}

# Actually, let's just check the version properly
get_node_version() {
  if has_cmd node; then
    node --version 2>/dev/null | sed 's/v//' | cut -d. -f1
  else
    echo "0"
  fi
}

NODE_MAJOR=$(get_node_version)

# ── Check Node.js ─────────────────────────────────────────

if [ "$NODE_MAJOR" -ge 18 ] 2>/dev/null; then
  echo -e "  ${GREEN}✓${NC} Node.js v$(node --version | sed 's/v//') found"
else
  echo -e "  ${YELLOW}⚠${NC} Node.js >= 18 required (found: $NODE_MAJOR)"

  INSTALLED=false

  # macOS: try Homebrew
  if [ "$INSTALLED" = false ] && has_cmd brew; then
    echo -e "  ${CYAN}Installing via Homebrew...${NC}"
    if brew install node 2>/dev/null; then
      NODE_MAJOR=$(get_node_version)
      if [ "$NODE_MAJOR" -ge 18 ] 2>/dev/null; then
        INSTALLED=true
      fi
    fi
  fi

  # Linux: try apt
  if [ "$INSTALLED" = false ] && has_cmd apt-get; then
    echo -e "  ${CYAN}Installing via apt...${NC}"
    if sudo apt-get update -qq && sudo apt-get install -y -qq nodejs 2>/dev/null; then
      NODE_MAJOR=$(get_node_version)
      if [ "$NODE_MAJOR" -ge 18 ] 2>/dev/null; then
        INSTALLED=true
      fi
    fi
  fi

  # Linux: try dnf
  if [ "$INSTALLED" = false ] && has_cmd dnf; then
    echo -e "  ${CYAN}Installing via dnf...${NC}"
    if sudo dnf install -y nodejs 2>/dev/null; then
      NODE_MAJOR=$(get_node_version)
      if [ "$NODE_MAJOR" -ge 18 ] 2>/dev/null; then
        INSTALLED=true
      fi
    fi
  fi

  # Try nvm as last resort
  if [ "$INSTALLED" = false ] && (has_cmd nvm || [ -f "$HOME/.nvm/nvm.sh" ]); then
    echo -e "  ${CYAN}Installing via nvm...${NC}"
    # Source nvm if available
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    if has_cmd nvm; then
      if nvm install 18 2>/dev/null; then
        nvm use 18 2>/dev/null
        NODE_MAJOR=$(get_node_version)
        if [ "$NODE_MAJOR" -ge 18 ] 2>/dev/null; then
          INSTALLED=true
        fi
      fi
    fi
  fi

  if [ "$INSTALLED" = false ]; then
    echo -e "\n  ${RED}✗${NC} Could not install Node.js automatically."
    echo -e "  ${YELLOW}Install Node.js >= 18 from: https://nodejs.org${NC}"
    echo -e "  Then re-run this installer.\n"
    exit 1
  fi

  echo -e "  ${GREEN}✓${NC} Node.js installed successfully"
fi

# ── Check npm ─────────────────────────────────────────────

if has_cmd npm; then
  echo -e "  ${GREEN}✓${NC} npm $(npm --version) found"
else
  echo -e "\n  ${RED}✗${NC} npm not found. Reinstall Node.js from: https://nodejs.org\n"
  exit 1
fi

# ── Run installer ─────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALLER="$SCRIPT_DIR/src/install.mjs"

if [ ! -f "$INSTALLER" ]; then
  echo -e "\n  ${RED}✗${NC} Installer not found at: $INSTALLER"
  echo -e "  Make sure you're running this from the Jarvis repo directory.\n"
  exit 1
fi

echo -e "\n  ${CYAN}Starting installer...${NC}\n"

node "$INSTALLER"
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo -e "\n  ${RED}✗${NC} Installation failed. Check the error above and re-run when ready.\n"
  exit 1
fi
