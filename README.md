# Jarvis — One AI to rule your terminal

> A zero-friction, modular AI assistant for your terminal.  
> Pick your profile, run one command, and you're talking to an AI.

---

## Quick start

```bash
git clone https://github.com/damiankovac0-pixel/Jarvis
cd Jarvis

# Windows:
.\install.ps1

# macOS / Linux:
bash install.sh
```

The installer walks you through everything. You choose your level — from a bare-bones agent to a full suite with subagents, MCP servers, and language support.

---

## Choose your profile

The installer starts by asking which profile fits you best. Everything else flows from that choice.

| Profile | What you get | Install time | Disk usage |
|---------|-------------|--------------|------------|
| **Lite** 🚀 | Core agent + provider config. No extras. | ~10s | ~10 MB |
| **Standard** ⚡ | Agent + 5 subagents + Browser/Filesystem/Memory/Sequential Thinking MCPs + Skills + Plugin | ~30s | ~50 MB |
| **Full** 💎 | Everything in Standard + all MCPs (GitHub, SQLite) + all detected language servers | ~2m | ~200 MB |
| **Custom** 🛠️ | Pick exactly which modules you want — mix and match | depends | depends |

### What's in each module

Core modules (always included with any profile):

| Module | What it adds |
|--------|-------------|
| **Core Config** | Provider setup, permissions, Jarvis agent persona, shell alias |

Optional modules you can add or remove freely:

| Module | npm packages | Template files | Config sections |
|--------|-------------|----------------|-----------------|
| **Subagents** | — | 5 agent `.md` files | `agent` entries for sysadmin, webnav, automation, memory-keeper, explore, general |
| **Skills** | — | 3 skill `.md` files | `skills` paths |
| **Plugin** | `@opencode-ai/plugin` | `jarvis-optimizer.ts` | `plugin` reference |
| **MCP: Browser** | `@modelcontextprotocol/server-playwright` | — | `mcp.playwright` |
| **MCP: Filesystem** | `@modelcontextprotocol/server-filesystem` | — | `mcp.filesystem` |
| **MCP: Memory** | `@modelcontextprotocol/server-memory` | — | `mcp.memory` |
| **MCP: Sequential Thinking** | `@modelcontextprotocol/server-sequential-thinking` | — | `mcp.sequential-thinking` |
| **MCP: GitHub** | `@modelcontextprotocol/server-github` | — | `mcp.github` (requires token) |
| **MCP: SQLite** | `mcp-server-sqlite` | — | `mcp.sqlite` |
| **LSP: TypeScript/JS** | `typescript-language-server` | — | `lsp.typescript` |
| **LSP: Python** | `pyright-langserver` | — | `lsp.pyright` |
| **LSP: HTML** | `vscode-langservers-extracted` | — | `lsp.html` |
| **LSP: CSS/SCSS** | `vscode-langservers-extracted` | — | `lsp.css` |
| **LSP: JSON** | `vscode-langservers-extracted` | — | `lsp.json` |
| **LSP: YAML** | `yaml-language-server` | — | `lsp.yaml` |
| **LSP: Shell** | `bash-language-server` | — | `lsp.bash` |
| **LSP: Dockerfile** | `dockerfile-language-server-nodejs` | — | `lsp.dockerfile` |
| **LSP: ESLint** | `vscode-eslint-language-server` | — | `lsp.eslint` |
| **LSP: PHP** | `intelephense` | — | `lsp.php` |
| **LSP: SQL** | `sql-language-server` | — | `lsp.sql` |
| **LSP: Ansible** | `ansible-language-server` | — | `lsp.ansible` |
| **LSP: Prisma** | `@prisma/language-server` | — | `lsp.prisma` |

### How the Custom flow works

Selecting **Custom** shows an interactive checklist of every optional module. Toggle them on/off by number, page through with `n`/`p`, and press Enter when done. Core is always included.

---

## What you get (Standard profile)

### 6 specialized AI subagents

| Subagent | Purpose | Delegation trigger |
|----------|---------|-------------------|
| `sysadmin` | System administration, OS-level tasks | "check system", "install package" |
| `webnav` | Browser automation, web scraping | "go to website", "scrape data" |
| `automation` | Scripting, batch jobs, API integration | "write a script", "automate task" |
| `memory-keeper` | Persistent cross-session knowledge | "remember that" |
| `explore` | Read-only codebase search | "find where", "how does this work" |
| `general` | Anything that doesn't fit above | Everything else |

Each subagent runs on your configured fast model while Jarvis itself uses your primary model for orchestration.

### 4 MCP servers (Standard)

- **Playwright** — Web navigation, screenshots, form automation
- **Filesystem** — Full file system access
- **Memory** — Knowledge graph for cross-session persistence
- **Sequential Thinking** — Structured multi-step reasoning

Full adds GitHub (optional, needs token) and SQLite.

### All baked in

- Output compaction with auto-pruning for long sessions
- Batch tool execution for efficiency
- Cross-platform: Windows, macOS, Linux (including WSL)

---

## Trust & transparency

Jarvis is designed to be trustworthy by default.

### Before installation

1. **You choose exactly what to install** — profile or custom module selection
2. **Full plan shown before any changes** — every npm package, every file, every config change is listed
3. **You confirm before anything happens** — no silent installations

### During installation

4. **Non-admin by default** — runs as your user, no `sudo` unless required for system tools
5. **Existing config is backed up** — if you already have an opencode setup, a full backup is created
6. **Every phase is tracked** — success/failure per phase, no hidden errors
7. **Verification step** — checks every expected file and package exists after install

### After installation

8. **Everything is undoable** — run `uninstall.sh` / `uninstall.ps1` from the repo
9. **API keys are environment variables** — never stored in config files
10. **All scripts are readable** — open the repo and read any file before running it

### Dry run

Pass `--dry-run` to see exactly what would happen without making any changes:

```bash
node src/install.mjs --dry-run
```

---

## Install walkthrough

```
Step 1: Welcome + environment detection
Step 2: Profile selection (Lite/Standard/Full/Custom)
Step 3: Module summary + confirmation
Step 4: Provider setup + API key (masked input)
Step 5: GitHub integration (optional)
Step 6: Autonomy level (Full / Safe)
Step 7: Installation plan review
Step 8: Execute (8 phases with progress)
Step 9: Verification + next steps
```

---

## Customization

### After install, edit what you want

```bash
# Agent instructions (how each subagent behaves)
~/.config/opencode/agents/jarvis.md
~/.config/opencode/agents/sysadmin.md
# ... etc

# Provider, models, permissions, MCPs, LSPs
~/.config/opencode/opencode.jsonc

# Efficiency plugin
~/.config/opencode/plugins/jarvis-optimizer.ts

# Skills — reusable instruction bundles
~/.config/opencode/skills/
```

### Re-run the installer to reconfigure

```bash
git pull
bash install.sh
```

It detects your existing config, backs it up, and walks you through setup again.

### Non-interactive mode

Pass `-y` or `--yes` to skip confirmations (uses defaults):

```bash
node src/install.mjs -y
```

---

## Updating

```bash
cd Jarvis
git pull
bash install.sh
```

The installer detects your existing configuration, offers to upgrade npm packages, updates agent files (backing up any modified ones), and preserves your API keys and provider settings.

---

## Uninstalling

```bash
# From the repo directory:
.\uninstall.ps1          # Windows
bash uninstall.sh        # macOS / Linux
```

**What stays:** Node.js, Python, Git, ripgrep, fd, jq, and any npm packages installed globally — these are system tools, not Jarvis-specific.  
**What goes:** Everything in `~/.config/opencode/` and the `jarvis` shell alias.  
**Safety:** Both uninstallers require typing `REMOVE` (not just Y/n) to confirm.

### Manual uninstall

```bash
rm -rf ~/.config/opencode
# Remove jarvis alias from ~/.bashrc, ~/.zshrc, or PowerShell $PROFILE
npm uninstall -g @opencode-ai/opencode  # optional
```

---

## FAQ

### Can I use this for free?

**Yes, two ways:**
1. **Ollama** — The installer offers Ollama as a provider. Fully local and free.
2. **OpenCode's free model** — `opencode/deepseek-v4-flash-free` is available for basic tasks.

### Do I need an API key?

- **OpenAI / Anthropic** — Yes, you need a paid API key.
- **Ollama** — No, it runs locally.
- **Custom endpoint** — Depends on your setup.

The installer masks your input and stores the key as an environment variable reference. It never ends up in your config file.

### Web automation doesn't work

Playwright browser binaries aren't installed by default. Run:

```bash
npx playwright install chromium
```

This downloads ~300MB for browser automation.

### Can I add my own tools?

Yes. Jarvis is built on opencode, which supports:

- **Custom MCP servers** — Add to `opencode.jsonc`
- **Custom agents** — Add `.md` files to `~/.config/opencode/agents/`
- **Custom skills** — Add to `~/.config/opencode/skills/`
- **Environment variables** — Access via `${VAR_NAME}` in config

### Can I use this in CI/CD or non-interactive mode?

With `-y` / `--yes` flag, the installer uses defaults for all prompts. You can also pre-set environment variables to skip questions entirely.

### What if I break something?

Re-run the installer. It's idempotent — backs up modified files, detects existing config, and can repair itself.

---

## Architecture

```
Jarvis/
├── src/
│   ├── install.mjs        # Interactive modular installer (8 phases)
│   ├── config-builder.mjs # Pure-function config generator
│   └── modules.mjs        # Module & profile definitions
├── install.ps1            # Windows bootstrap (Node.js check)
├── install.sh             # Unix bootstrap (Node.js check)
├── uninstall.ps1          # Windows uninstall
├── uninstall.sh           # Unix uninstall
├── package.json           # All dependencies (installer cherry-picks)
├── template/
│   ├── agents/            # Agent instruction files
│   ├── plugins/           # Optimizer plugin
│   └── skills/            # Skill instruction bundles
└── README.md
```

---

## License

MIT
