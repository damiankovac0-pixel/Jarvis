// ────────────────────────────────────────────────────────────
// config-builder.mjs — Generates opencode.jsonc from context
// Pure function: takes detected state + user choices + module
// selection, returns the complete config object.
// No I/O, no side effects.
// ────────────────────────────────────────────────────────────

import path from "node:path"
import { MODULES, hasModule } from "./modules.mjs"

/**
 * @param {object} ctx
 * @param {string} ctx.platform - "win32" | "linux" | "darwin"
 * @param {string} ctx.shell - detected shell
 * @param {string} ctx.nodeBinDir - path to node_modules/.bin in config dir
 * @param {string} ctx.homeDir - user's home directory
 * @param {string} ctx.configDir - ~/.config/opencode
 * @param {object} ctx.provider - { type, primary, fast }
 * @param {string} ctx.apiKey - env var reference like "${OPENAI_API_KEY}" or ""
 * @param {string} ctx.customEndpoint - custom base URL (for custom provider)
 * @param {string} ctx.autonomy - "full" | "safe"
 * @param {Set<string>} ctx.selectedModules - resolved module IDs
 * @param {boolean} ctx.hasGithubToken - whether a GitHub token is available
 * @param {object} ctx.langs - detected languages { typescript, python, ... }
 * @returns {object} The complete opencode.jsonc configuration
 */
export function buildConfig(ctx) {
  const sel = ctx.selectedModules

  const config = {
    $schema: "https://opencode.ai/config.json",
    default_agent: "jarvis",
    small_model: ctx.provider.fast,
    shell: ctx.shell,
    logLevel: "WARN",

    tool_output: {
      max_lines: 200,
      max_bytes: 16000,
    },

    compaction: {
      auto: true,
      prune: true,
      tail_turns: 3,
      preserve_recent_tokens: 12000,
      reserved: 8192,
    },

    experimental: {
      batch_tool: true,
      mcp_timeout: 8000,
    },

    attachment: {
      image: {
        auto_resize: true,
        max_width: 1600,
        max_height: 1600,
        max_base64_bytes: 3145728,
      },
    },

    watcher: {
      ignore: [
        "**/node_modules/**",
        "**/.git/**",
        "**/dist/**",
        "**/build/**",
        "**/.next/**",
        "**/.venv/**",
        "**/__pycache__/**",
      ],
    },

    permission: buildPermissionSection(ctx.autonomy),
    provider: buildProviderSection(ctx.provider, ctx.apiKey, ctx.customEndpoint),
  }

  // ── Plugin (only if module selected) ─────────────────
  if (hasModule("plugin", sel)) {
    config.plugin = ["./plugins/jarvis-optimizer.ts"]
  }

  // ── MCP Servers (only selected modules) ──────────────
  const mcp = {}
  if (hasModule("mcp-browser", sel)) {
    mcp.playwright = {
      type: "local",
      command: [binPath("playwright-mcp", ctx)],
      enabled: true,
      timeout: 10000,
    }
  }
  if (hasModule("mcp-filesystem", sel)) {
    mcp.filesystem = {
      type: "local",
      command: [binPath("mcp-server-filesystem", ctx), ctx.homeDir],
      enabled: true,
      timeout: 8000,
    }
  }
  if (hasModule("mcp-memory", sel)) {
    mcp.memory = {
      type: "local",
      command: [binPath("mcp-server-memory", ctx)],
      enabled: true,
      timeout: 5000,
    }
  }
  if (hasModule("mcp-sqlite", sel)) {
    mcp.sqlite = {
      type: "local",
      command: [binPath("mcp-sqlite-server", ctx)],
      enabled: true,
      timeout: 5000,
    }
  }
  if (hasModule("mcp-sequential-thinking", sel)) {
    mcp["sequential-thinking"] = {
      type: "local",
      command: [binPath("mcp-server-sequential-thinking", ctx)],
      enabled: true,
      timeout: 8000,
    }
  }
  if (hasModule("mcp-github", sel) && ctx.hasGithubToken) {
    mcp.github = {
      type: "local",
      command: [binPath("mcp-server-github", ctx)],
      enabled: true,
      environment: {
        GITHUB_TOKEN: "${GITHUB_TOKEN}",
      },
      timeout: 8000,
    }
  }
  if (Object.keys(mcp).length > 0) {
    config.mcp = mcp
  }

  // ── LSPs (only selected LSP modules) ─────────────────
  const lsp = {}
  if (hasModule("lsp-typescript", sel) && ctx.langs.typescript) {
    lsp.typescript = {
      command: [binPath("typescript-language-server", ctx), "--stdio"],
      extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"],
    }
  }
  if (hasModule("lsp-python", sel) && ctx.langs.python) {
    lsp.pyright = {
      command: [binPath("pyright-langserver", ctx), "--stdio"],
      extensions: [".py"],
    }
  }
  if (hasModule("lsp-html", sel)) {
    lsp.html = {
      command: [binPath("vscode-html-language-server", ctx), "--stdio"],
      extensions: [".html", ".htm", ".xhtml"],
    }
  }
  if (hasModule("lsp-css", sel)) {
    lsp.css = {
      command: [binPath("vscode-css-language-server", ctx), "--stdio"],
      extensions: [".css", ".scss", ".less"],
    }
  }
  if (hasModule("lsp-json", sel)) {
    lsp.json = {
      command: [binPath("vscode-json-language-server", ctx), "--stdio"],
      extensions: [".json", ".jsonc", ".json5"],
    }
  }
  if (hasModule("lsp-yaml", sel) && ctx.langs.yaml) {
    lsp.yaml = {
      command: [binPath("yaml-language-server", ctx), "--stdio"],
      extensions: [".yaml", ".yml"],
    }
  }
  if (hasModule("lsp-bash", sel) && ctx.langs.bash) {
    lsp.bash = {
      command: [binPath("bash-language-server", ctx), "start"],
      extensions: [".sh", ".bash", ".zsh"],
    }
  }
  if (hasModule("lsp-docker", sel) && ctx.langs.docker) {
    lsp.dockerfile = {
      command: [binPath("docker-langserver", ctx), "--stdio"],
      extensions: ["Dockerfile", "Dockerfile.*"],
    }
  }
  if (hasModule("lsp-eslint", sel) && ctx.langs.eslint) {
    lsp.eslint = {
      command: [binPath("vscode-eslint-language-server", ctx), "--stdio"],
      extensions: [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"],
    }
  }
  if (hasModule("lsp-php", sel) && ctx.langs.php) {
    lsp.php = {
      command: [binPath("intelephense", ctx), "--stdio"],
      extensions: [".php"],
    }
  }
  if (hasModule("lsp-sql", sel) && ctx.langs.sql) {
    lsp.sql = {
      command: [binPath("sql-language-server", ctx), "up", "--stdio"],
      extensions: [".sql"],
    }
  }
  if (hasModule("lsp-ansible", sel) && ctx.langs.ansible) {
    lsp.ansible = {
      command: [binPath("ansible-language-server", ctx), "--stdio"],
      extensions: [".yml", ".yaml"],
    }
  }
  if (hasModule("lsp-prisma", sel) && ctx.langs.prisma) {
    lsp.prisma = {
      command: [binPath("prisma-language-server", ctx), "--stdio"],
      extensions: [".prisma"],
    }
  }
  if (Object.keys(lsp).length > 0) {
    config.lsp = lsp
  }

  // ── Skills (only if module selected) ─────────────────
  if (hasModule("skills", sel)) {
    config.skills = {
      paths: [path.join(ctx.configDir, "skills")],
    }
  }

  // ── Agents (core always included, subagents conditional) ─
  const agent = {}
  const baseAgent = { mode: "subagent", model: ctx.provider.fast }

  // Core Jarvis agent (always present)
  if (hasModule("core", sel)) {
    agent.jarvis = { mode: "primary", model: ctx.provider.primary }
  }

  // Subagents (only if subagents module selected)
  if (hasModule("subagents", sel)) {
    agent.sysadmin = {
      ...baseAgent, steps: 12,
      permission: {
        bash: "allow", edit: "allow", read: "allow",
        glob: "allow", grep: "allow", list: "allow",
        external_directory: { "*": "allow" },
      },
    }
    agent.webnav = {
      ...baseAgent, steps: 12,
      permission: { webfetch: "allow", websearch: "allow", bash: "allow" },
    }
    agent.automation = {
      ...baseAgent, steps: 12,
      permission: { bash: "allow", edit: "allow", read: "allow" },
    }
    agent["memory-keeper"] = {
      ...baseAgent, steps: 8,
      permission: { bash: "allow" },
    }
    agent.explore = { ...baseAgent, steps: 12 }
    agent.general = { ...baseAgent, steps: 12 }
    agent.summary = { ...baseAgent }
    agent.title = { ...baseAgent }
    agent.compaction = { ...baseAgent }
  }
  config.agent = agent

  return config
}

// ── Binary path resolver ──────────────────────────────

function binPath(name, ctx) {
  const ext = ctx.platform === "win32" ? ".cmd" : ""
  return path.join(ctx.nodeBinDir, `${name}${ext}`)
}

// ── Permission section ────────────────────────────────

function buildPermissionSection(autonomy) {
  if (autonomy === "full") {
    return {
      read: "allow", edit: "allow", glob: "allow", grep: "allow",
      list: "allow", bash: "allow", task: "allow",
      external_directory: { "*": "allow" },
      todowrite: "allow", question: "allow", webfetch: "allow",
      websearch: "allow", skill: "allow", doom_loop: "allow",
      repo_clone: "allow", repo_overview: "allow", lsp: "allow",
    }
  }
  return {
    read: "allow", glob: "allow", grep: "allow", list: "allow",
    todowrite: "allow", skill: "allow", lsp: "allow",
    external_directory: { "*": "ask" },
    edit: "ask", bash: "ask", task: "ask", question: "ask",
    webfetch: "ask", websearch: "ask", doom_loop: "ask",
    repo_clone: "ask", repo_overview: "ask",
  }
}

// ── Provider section ──────────────────────────────────

function buildProviderSection(provider, apiKey, customEndpoint) {
  switch (provider.type) {
    case "openai":
      return {
        openai: {
          ...(apiKey ? { apiKey } : {}),
          options: { baseURL: customEndpoint || "https://api.openai.com/v1" },
        },
      }

    case "anthropic": {
      const cfg = { anthropic: { apiKey } }
      if (customEndpoint) {
        cfg.anthropic.options = { baseURL: customEndpoint }
      }
      return cfg
    }

    case "ollama":
      return {
        openai: {
          options: { baseURL: customEndpoint || "http://localhost:11434/v1" },
        },
      }

    case "custom":
      return {
        openai: {
          ...(apiKey ? { apiKey } : {}),
          options: { baseURL: customEndpoint || "http://localhost:11434/v1" },
        },
      }

    default:
      return {
        openai: {
          options: { baseURL: customEndpoint || "http://localhost:11434/v1" },
        },
      }
  }
}
