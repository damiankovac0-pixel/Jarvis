# Jarvis — One AI to rule your terminal

> A zero-friction, maximum-power AI assistant for your terminal.  
> One command installs everything: subagents, MCP servers, language servers, and shell integration.

---

## Quick start

```bash
git clone https://github.com/<your-org>/Jarvis
cd Jarvis

# Windows:
.\install.ps1

# macOS / Linux:
bash install.sh
```

That's it. Answer 5 questions about your preferences, then type `jarvis` and you're talking to your terminal AI.

---

## What you get

### 6 specialized AI subagents

| Subagent | Purpose | Delegation trigger |
|----------|---------|-------------------|
| `sysadmin` | System administration, OS-level tasks | "check system", "install package", "disk usage" |
| `webnav` | Browser automation, web scraping, form filling | "go to website", "scrape data", "fill form" |
| `automation` | Scripting, batch jobs, API integration | "write a script", "automate task", "cron job" |
| `memory-keeper` | Persistent cross-session knowledge | "remember that", "what did we do last time" |
| `explore` | Read-only codebase search | "find where", "how does this module work" |
| `general` | Anything that doesn't fit above | Everything else |

Each subagent runs on your configured fast model (cheap) while Jarvis itself uses your primary model (powerful) for orchestration and complex reasoning.

### 7 MCP servers

| Server | What it enables |
|--------|----------------|
| **Playwright** | Web navigation, screenshots, form automation |
| **Filesystem** | Full file system access, read/write/glob |
| **GitHub** | Repo search, PR creation, issue tracking (optional, needs token) |
| **Memory** | Knowledge graph for cross-session persistence |
| **SQLite** | Database queries and management |
| **Sequential Thinking** | Structured multi-step reasoning |
| **Headroom** | Output compression to save context tokens |

### Language support (auto-detected)

LSP servers are installed for all languages; only the ones detected on your system are activated:

TypeScript/JS · Python · HTML · CSS/SCSS · JSON · YAML · Shell  
Dockerfile · ESLint · PHP · SQL · Ansible · Prisma

### All baked in

- `opencode` as the AI terminal interface
- Output compaction (no context-window flooding)
- Auto-compaction and pruning for long sessions
- Batch tool execution for efficiency
- Cross-platform: Windows, macOS, Linux (including WSL)

---

## Install walkthrough

The installer detects your environment then asks 5 questions:

```
1/5  Which AI provider?        OpenAI / Anthropic / Ollama / Custom
2/5  API key                   Masked input → stored as env var
3/5  Language servers          Toggle detected languages
4/5  GitHub integration        Optional token for MCP
5/5  Autonomy level            Full (no ask) / Safe (ask before actions)
```

Then it installs everything, generates your config, copies agent files, adds `jarvis` to your shell, and verifies the setup.

---

## Usage

```bash
# Start a session
jarvis

# Quick command
jarvis "find all unused variables in this project"

# Show version
jarvis --help
```

Once inside, Jarvis dispatches work to the right subagent automatically. You don't need to think about which tool to use — just describe what you want.

---

## Customization

### After install, edit what you want:

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

### Or re-run the installer to reconfigure:

```bash
git pull
bash install.sh
```

It detects your existing config and offers to upgrade or reconfigure.

---

## Updating

```bash
cd Jarvis
git pull
bash install.sh
```

The installer will:
1. Detect your existing configuration
2. Offer to upgrade npm packages (`npm update`)
3. Update agent files (backing up any you've modified)
4. Preserve your API keys and provider settings

---

## Uninstalling

```bash
# From the repo directory:
.\uninstall.ps1          # Windows
bash uninstall.sh        # macOS / Linux
```

### Or manually:

```bash
# Remove config and agents
rm -rf ~/.config/opencode

# Remove jarvis alias from your shell profile
# (edit ~/.bashrc, ~/.zshrc, or PowerShell $PROFILE)

# Optional: uninstall opencode
npm uninstall -g @opencode-ai/opencode
```

**What stays:** Node.js, Python, Git, ripgrep, fd, jq — these are system tools, not Jarvis-specific.  
**What goes:** Everything in `~/.config/opencode/` and the `jarvis` shell alias.

---

## FAQ

### Can I use this for free?

**Yes, two ways:**
1. **Ollama** — The installer offers Ollama as a provider. It's fully local and free. You need a reasonably powerful machine for the larger models.
2. **OpenCode's free model** — `opencode/deepseek-v4-flash-free` is available for basic tasks. Limited but functional.

### Do I need an API key?

- **OpenAI / Anthropic** — Yes, you need a paid API key from the provider.
- **Ollama** — No, it runs locally.
- **Custom endpoint** — Depends on your setup.

The installer masks your input and stores the key as an environment variable. It never ends up in your config file.

### Is my data private?

- **Ollama** — Fully local. Nothing leaves your machine.
- **OpenAI / Anthropic** — Your prompts are sent to their API. Check their privacy policies.
- **Custom endpoint** — Depends on where you point it (could be local, could be a VPS, etc.)

### Web automation doesn't work

The Playwright MCP is installed, but the browser binaries aren't. Run:

```bash
npx playwright install chromium
```

This downloads ~300MB for browser automation. The installer tells you this at the end.

### Can I add my own tools?

Yes. Jarvis is built on opencode, which supports:
- **Custom MCP servers** — Add them to `~/.config/opencode/opencode.jsonc`
- **Custom agents** — Add `.md` files to `~/.config/opencode/agents/`
- **Custom skills** — Add to `~/.config/opencode/skills/`
- **Environment variables** — Access them via `${VAR_NAME}` in config

### Can I use this in CI/CD or non-interactive mode?

Not currently. The installer is interactive. But the generated config can be copied to other machines.

### What if I break something?

Re-run the installer. It's idempotent — backs up modified files, detects existing config, and can repair itself.

---

## Architecture

```
┌─ You ─────────────────────────────────────┐
│  $ jarvis "find the bug in api handler"   │
└────────────────┬──────────────────────────┘
                 │
┌────────────────▼──────────────────────────┐
│  Jarvis (primary agent, strong model)     │
│  • Understands intent                     │
│  • Delegates to specialists               │
│  • Synthesizes results                    │
└───┬────────┬────────┬────────┬────────────┘
    │        │        │        │
    ▼        ▼        ▼        ▼
┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐
│explore│ │webnav│ │sysadm│ │automation│
│flash  │ │flash │ │flash │ │flash     │
│read-  │ │browse│ │manage│ │script    │
│only   │ │web   │ │system│ │& automate│
└──────┘ └──────┘ └──────┘ └──────────┘
```

Jarvis routes work to specialized subagents (running your cheap model) while handling orchestration and complex reasoning itself (running your strong model). This saves tokens and keeps responses fast.

---

## What's installed

| Category | Count | Details |
|----------|-------|---------|
| npm packages | 18 | MCP servers + LSP servers |
| Python packages | 1 | headroom (output compression) |
| Agent files | 6 | Subagent instruction sets |
| Skills | 3 | Development, system, web automation |
| Plugin | 1 | Efficiency optimizer |

Total download: ~150MB (npm) + ~300MB optional (Playwright browsers)

---

## Requirements

- **Node.js** >= 18 (installed automatically if missing)
- **Git** (to clone the repo)
- **Python** >= 3.10 (optional, for headroom compression)
- An **AI provider** (OpenAI, Anthropic, Ollama, or custom endpoint)

---

## License

MIT — do whatever you want with it.
