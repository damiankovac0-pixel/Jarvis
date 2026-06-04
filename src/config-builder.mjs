// ────────────────────────────────────────────────────────────
// config-builder.mjs — Generates opencode.jsonc from context
// Pure function: takes detected state + user choices, returns
// the complete config object. No I/O, no side effects.
// ────────────────────────────────────────────────────────────

import path from "node:path"

/**
 * @param {import('./install.mjs').InstallContext} ctx
 * @returns {object} The complete opencode.jsonc configuration
 */
export function buildConfig(ctx) {
  return {
    $schema: "https://opencode.ai/config.json",
    default_agent: "jarvis",
    small_model: ctx.models.fast,
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

    plugin: ["./plugins/jarvis-optimizer.ts"],

    lsp: buildLspSection(ctx),
    permission: buildPermissionSection(ctx),
    provider: buildProviderSection(ctx),
    mcp: buildMcpSection(ctx),
    skills: buildSkillsSection(ctx),
    agent: buildAgentSection(ctx),
  }
}

// ────────────────────────────────────────────────────────────
// Binary path resolver — cross-platform
// Returns absolute path to an npm binary in node_modules/.bin
// ────────────────────────────────────────────────────────────

function binPath(name, ctx) {
  const ext = ctx.platform === "win32" ? ".cmd" : ""
  return path.join(ctx.nodeBinDir, `${name}${ext}`)
}

// ────────────────────────────────────────────────────────────
// LSP section — only activated for detected/toggled languages
// ────────────────────────────────────────────────────────────

function buildLspSection(ctx) {
  /** @type {Record<string, {command: string[], extensions: string[]}>} */
  const lsp = {}

  // These are always available (the packages are installed)
  // Only add the entry if the user toggled the language on

  if (ctx.langs.typescript) {
    lsp.typescript = {
      command: [binPath("typescript-language-server", ctx), "--stdio"],
      extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"],
    }
  }

  if (ctx.langs.python) {
    lsp.pyright = {
      command: [binPath("pyright-langserver", ctx), "--stdio"],
      extensions: [".py"],
    }
  }

  if (ctx.langs.html) {
    lsp.html = {
      command: [binPath("vscode-html-language-server", ctx), "--stdio"],
      extensions: [".html", ".htm", ".xhtml"],
    }
  }

  if (ctx.langs.css) {
    lsp.css = {
      command: [binPath("vscode-css-language-server", ctx), "--stdio"],
      extensions: [".css", ".scss", ".less"],
    }
  }

  if (ctx.langs.json) {
    lsp.json = {
      command: [binPath("vscode-json-language-server", ctx), "--stdio"],
      extensions: [".json", ".jsonc", ".json5"],
    }
  }

  if (ctx.langs.yaml) {
    lsp.yaml = {
      command: [binPath("yaml-language-server", ctx), "--stdio"],
      extensions: [".yaml", ".yml"],
    }
  }

  if (ctx.langs.bash) {
    lsp.bash = {
      command: [binPath("bash-language-server", ctx), "start"],
      extensions: [".sh", ".bash", ".zsh"],
    }
  }

  if (ctx.langs.docker) {
    lsp.dockerfile = {
      command: [binPath("docker-langserver", ctx), "--stdio"],
      extensions: ["Dockerfile", "Dockerfile.*"],
    }
  }

  if (ctx.langs.eslint) {
    lsp.eslint = {
      command: [binPath("vscode-eslint-language-server", ctx), "--stdio"],
      extensions: [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"],
    }
  }

  if (ctx.langs.php) {
    lsp.php = {
      command: [binPath("intelephense", ctx), "--stdio"],
      extensions: [".php"],
    }
  }

  if (ctx.langs.sql) {
    lsp.sql = {
      command: [binPath("sql-language-server", ctx), "up", "--stdio"],
      extensions: [".sql"],
    }
  }

  if (ctx.langs.ansible) {
    lsp.ansible = {
      command: [binPath("ansible-language-server", ctx), "--stdio"],
      extensions: [".yml", ".yaml"],
    }
  }

  if (ctx.langs.prisma) {
    lsp.prisma = {
      command: [binPath("prisma-language-server", ctx), "--stdio"],
      extensions: [".prisma"],
    }
  }

  return lsp
}

// ────────────────────────────────────────────────────────────
// Permission section — based on autonomy choice
// ────────────────────────────────────────────────────────────

function buildPermissionSection(ctx) {
  if (ctx.autonomy === "full") {
    return {
      read: "allow",
      edit: "allow",
      glob: "allow",
      grep: "allow",
      list: "allow",
      bash: "allow",
      task: "allow",
      external_directory: { "*": "allow" },
      todowrite: "allow",
      question: "allow",
      webfetch: "allow",
      websearch: "allow",
      skill: "allow",
      doom_loop: "allow",
      repo_clone: "allow",
      repo_overview: "allow",
      lsp: "allow",
    }
  }

  // Safe mode — destructive actions ask for confirmation
  return {
    read: "allow",
    glob: "allow",
    grep: "allow",
    list: "allow",
    todowrite: "allow",
    skill: "allow",
    lsp: "allow",
    external_directory: { "*": "ask" },
    edit: "ask",
    bash: "ask",
    task: "ask",
    question: "ask",
    webfetch: "ask",
    websearch: "ask",
    doom_loop: "ask",
    repo_clone: "ask",
    repo_overview: "ask",
  }
}

// ────────────────────────────────────────────────────────────
// Provider section — varies by provider type
// ────────────────────────────────────────────────────────────

function buildProviderSection(ctx) {
  const { provider } = ctx

  switch (provider.type) {
    case "openai":
      return {
        openai: {
          ...(provider.apiKeyRef ? { apiKey: provider.apiKeyRef } : {}),
          options: { baseURL: provider.baseURL },
        },
      }

    case "anthropic": {
      const cfg = {
        anthropic: {
          apiKey: provider.apiKeyRef,
        },
      }
      // Only add custom baseURL if it differs from default
      if (
        provider.baseURL &&
        provider.baseURL !== "https://api.anthropic.com"
      ) {
        cfg.anthropic.options = { baseURL: provider.baseURL }
      }
      return cfg
    }

    case "ollama":
      return {
        openai: {
          options: { baseURL: "http://localhost:11434/v1" },
        },
      }

    case "custom":
      return {
        openai: {
          ...(provider.apiKeyRef ? { apiKey: provider.apiKeyRef } : {}),
          options: { baseURL: provider.baseURL },
        },
      }

    default:
      return {
        openai: {
          options: { baseURL: "http://localhost:11434/v1" },
        },
      }
  }
}

// ────────────────────────────────────────────────────────────
// MCP section — conditional servers
// ────────────────────────────────────────────────────────────

function buildMcpSection(ctx) {
  /** @type {Record<string, any>} */
  const mcp = {
    playwright: {
      type: "local",
      command: [binPath("playwright-mcp", ctx)],
      enabled: true,
      timeout: 10000,
    },
    filesystem: {
      type: "local",
      command: [
        binPath("mcp-server-filesystem", ctx),
        ctx.homeDir,
      ],
      enabled: true,
      timeout: 8000,
    },
    memory: {
      type: "local",
      command: [binPath("mcp-server-memory", ctx)],
      enabled: true,
      timeout: 5000,
    },
    sqlite: {
      type: "local",
      command: [binPath("mcp-sqlite-server", ctx)],
      enabled: true,
      timeout: 5000,
    },
    "sequential-thinking": {
      type: "local",
      command: [binPath("mcp-server-sequential-thinking", ctx)],
      enabled: true,
      timeout: 8000,
    },
  }

  // GitHub — only if token was provided
  if (ctx.mcp.github.enabled && ctx.mcp.github.tokenRef) {
    mcp.github = {
      type: "local",
      command: [binPath("mcp-server-github", ctx)],
      enabled: true,
      environment: {
        GITHUB_TOKEN: ctx.mcp.github.tokenRef,
      },
      timeout: 8000,
    }
  }

  // Headroom — only if Python is available
  if (ctx.headroom.enabled && ctx.pythonPath) {
    mcp.headroom = {
      type: "local",
      command: [ctx.pythonPath, "-m", "headroom.cli", "mcp", "serve"],
      enabled: true,
      environment: {
        HEADROOM_DIR: path.join(ctx.homeDir, ".headroom"),
      },
      timeout: 8000,
    }
  }

  return mcp
}

// ────────────────────────────────────────────────────────────
// Skills section — points to config-relative paths
// ────────────────────────────────────────────────────────────

function buildSkillsSection(ctx) {
  return {
    paths: [path.join(ctx.configDir, "skills")],
  }
}

// ────────────────────────────────────────────────────────────
// Agent section — all subagents pinned to fast model
// ────────────────────────────────────────────────────────────

function buildAgentSection(ctx) {
  const baseAgent = {
    mode: "subagent",
    model: ctx.models.fast,
  }

  return {
    sysadmin: {
      ...baseAgent,
      steps: 12,
      permission: {
        bash: "allow",
        edit: "allow",
        read: "allow",
        glob: "allow",
        grep: "allow",
        list: "allow",
        external_directory: { "*": "allow" },
      },
    },
    webnav: {
      ...baseAgent,
      steps: 12,
      permission: {
        webfetch: "allow",
        websearch: "allow",
        bash: "allow",
      },
    },
    automation: {
      ...baseAgent,
      steps: 12,
      permission: {
        bash: "allow",
        edit: "allow",
        read: "allow",
      },
    },
    "memory-keeper": {
      ...baseAgent,
      steps: 8,
      permission: { bash: "allow" },
    },
    explore: {
      ...baseAgent,
      steps: 12,
    },
    general: {
      ...baseAgent,
      steps: 12,
    },
    summary: {
      ...baseAgent,
    },
    title: {
      ...baseAgent,
    },
    compaction: {
      ...baseAgent,
    },
  }
}
