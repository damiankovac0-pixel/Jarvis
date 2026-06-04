// ────────────────────────────────────────────────────────────
// Jarvis Module System — profiles & module definitions
// Each module is a self-contained feature with metadata,
// npm dependencies, template files, and config requirements.
// ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ModuleDef
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string[]} npmDeps - npm package names (keys in repo package.json)
 * @property {string[]} templateFiles - paths relative to template/ dir
 * @property {string[]} configSections - which config sections this contributes to
 * @property {string[]} dependsOn - module IDs required by this module
 */

/** @type {Record<string, ModuleDef>} */
export const MODULES = {
  // ── Core (always included) ──────────────────────────────
  core: {
    id: "core",
    name: "Core Config",
    description: "Essential opencode configuration: provider setup, permissions, and the Jarvis agent persona",
    npmDeps: [],
    templateFiles: ["agents/jarvis.md"],
    configSections: ["provider", "permission", "agent"],
    dependsOn: [],
  },

  // ── Subagents ────────────────────────────────────────────
  subagents: {
    id: "subagents",
    name: "Subagents",
    description: "5 specialized AI assistants: sysadmin (system), explore (code), webnav (browser), automation (scripts), memory-keeper (persistence)",
    npmDeps: [],
    templateFiles: [
      "agents/explore.md",
      "agents/sysadmin.md",
      "agents/webnav.md",
      "agents/automation.md",
      "agents/memory-keeper.md",
    ],
    configSections: ["agent"],
    dependsOn: ["core"],
  },

  // ── Skills ──────────────────────────────────────────────
  skills: {
    id: "skills",
    name: "Skills",
    description: "Reusable skill bundles: development (code), system-control (OS tasks), web-automation (browser)",
    npmDeps: [],
    templateFiles: [
      "skills/development/SKILL.md",
      "skills/system-control/SKILL.md",
      "skills/web-automation/SKILL.md",
    ],
    configSections: ["skills"],
    dependsOn: ["core"],
  },

  // ── Plugin ──────────────────────────────────────────────
  plugin: {
    id: "plugin",
    name: "Efficiency Plugin",
    description: "Output compression, token optimization, context management, and smart auto-compaction",
    npmDeps: ["@opencode-ai/plugin"],
    templateFiles: ["plugins/jarvis-optimizer.ts"],
    configSections: ["plugin"],
    dependsOn: ["core"],
  },

  // ── MCP Servers ─────────────────────────────────────────
  "mcp-browser": {
    id: "mcp-browser",
    name: "MCP: Browser Automation",
    description: "Web navigation, screenshots, form filling, and page interaction via Playwright",
    npmDeps: ["@modelcontextprotocol/server-playwright"],
    templateFiles: [],
    configSections: ["mcp"],
    dependsOn: [],
  },

  "mcp-filesystem": {
    id: "mcp-filesystem",
    name: "MCP: Filesystem",
    description: "Full filesystem access — read, write, search, glob, and directory operations",
    npmDeps: ["@modelcontextprotocol/server-filesystem"],
    templateFiles: [],
    configSections: ["mcp"],
    dependsOn: [],
  },

  "mcp-memory": {
    id: "mcp-memory",
    name: "MCP: Knowledge Graph Memory",
    description: "Persistent cross-session memory using a knowledge graph for long-term context",
    npmDeps: ["@modelcontextprotocol/server-memory"],
    templateFiles: [],
    configSections: ["mcp"],
    dependsOn: [],
  },

  "mcp-sequential-thinking": {
    id: "mcp-sequential-thinking",
    name: "MCP: Sequential Thinking",
    description: "Structured multi-step reasoning for complex problem-solving and planning",
    npmDeps: ["@modelcontextprotocol/server-sequential-thinking"],
    templateFiles: [],
    configSections: ["mcp"],
    dependsOn: [],
  },

  "mcp-github": {
    id: "mcp-github",
    name: "MCP: GitHub Integration",
    description: "Search repositories, create PRs, manage issues, and browse GitHub (requires token)",
    npmDeps: ["@modelcontextprotocol/server-github"],
    templateFiles: [],
    configSections: ["mcp"],
    dependsOn: [],
  },

  "mcp-sqlite": {
    id: "mcp-sqlite",
    name: "MCP: SQLite Database",
    description: "Query, create, and manage SQLite databases directly from the terminal",
    npmDeps: ["mcp-server-sqlite"],
    templateFiles: [],
    configSections: ["mcp"],
    dependsOn: [],
  },

  // ── Language Servers ────────────────────────────────────
  "lsp-typescript": {
    id: "lsp-typescript",
    name: "LSP: TypeScript / JavaScript",
    description: "TypeScript, JavaScript, JSX, TSX — diagnostics, completions, refactoring",
    npmDeps: ["typescript-language-server"],
    templateFiles: [],
    configSections: ["lsp"],
    dependsOn: [],
  },

  "lsp-python": {
    id: "lsp-python",
    name: "LSP: Python",
    description: "Python — diagnostics, completions, type checking via Pyright",
    npmDeps: ["pyright-langserver"],
    templateFiles: [],
    configSections: ["lsp"],
    dependsOn: [],
  },

  "lsp-html": {
    id: "lsp-html",
    name: "LSP: HTML",
    description: "HTML, XHTML — syntax, completion, hover info",
    npmDeps: ["vscode-langservers-extracted"],
    templateFiles: [],
    configSections: ["lsp"],
    dependsOn: [],
  },

  "lsp-css": {
    id: "lsp-css",
    name: "LSP: CSS / SCSS / Less",
    description: "CSS, SCSS, Less — styling language support",
    npmDeps: ["vscode-langservers-extracted"], // shared package, only billed once
    templateFiles: [],
    configSections: ["lsp"],
    dependsOn: [],
  },

  "lsp-json": {
    id: "lsp-json",
    name: "LSP: JSON / JSONC",
    description: "JSON, JSONC, JSON5 — validation, completion, schema support",
    npmDeps: ["vscode-langservers-extracted"],
    templateFiles: [],
    configSections: ["lsp"],
    dependsOn: [],
  },

  "lsp-yaml": {
    id: "lsp-yaml",
    name: "LSP: YAML",
    description: "YAML — validation, completion, schema-based intelligence",
    npmDeps: ["yaml-language-server"],
    templateFiles: [],
    configSections: ["lsp"],
    dependsOn: [],
  },

  "lsp-bash": {
    id: "lsp-bash",
    name: "LSP: Shell Script",
    description: "Bash, Zsh, Shell — syntax, completion, linting for shell scripts",
    npmDeps: ["bash-language-server"],
    templateFiles: [],
    configSections: ["lsp"],
    dependsOn: [],
  },

  "lsp-docker": {
    id: "lsp-docker",
    name: "LSP: Dockerfile",
    description: "Dockerfile — syntax, validation, hover info for Docker images",
    npmDeps: ["dockerfile-language-server-nodejs"],
    templateFiles: [],
    configSections: ["lsp"],
    dependsOn: [],
  },

  "lsp-eslint": {
    id: "lsp-eslint",
    name: "LSP: ESLint",
    description: "ESLint integration — real-time linting for JS/TS/JSX/TSX",
    npmDeps: ["vscode-eslint-language-server"],
    templateFiles: [],
    configSections: ["lsp"],
    dependsOn: [],
  },

  "lsp-php": {
    id: "lsp-php",
    name: "LSP: PHP",
    description: "PHP — diagnostics, completions, refactoring via Intelephense",
    npmDeps: ["intelephense"],
    templateFiles: [],
    configSections: ["lsp"],
    dependsOn: [],
  },

  "lsp-sql": {
    id: "lsp-sql",
    name: "LSP: SQL",
    description: "SQL — syntax, completion, validation for SQL queries",
    npmDeps: ["sql-language-server"],
    templateFiles: [],
    configSections: ["lsp"],
    dependsOn: [],
  },

  "lsp-ansible": {
    id: "lsp-ansible",
    name: "LSP: Ansible",
    description: "Ansible — YAML-based playbook validation, completion, module docs",
    npmDeps: ["ansible-language-server"],
    templateFiles: [],
    configSections: ["lsp"],
    dependsOn: [],
  },

  "lsp-prisma": {
    id: "lsp-prisma",
    name: "LSP: Prisma",
    description: "Prisma schema — validation, completion, quick-fixes for .prisma files",
    npmDeps: ["@prisma/language-server"],
    templateFiles: [],
    configSections: ["lsp"],
    dependsOn: [],
  },
}

// ── Profiles ──────────────────────────────────────────────

/**
 * Each profile is a curated set of modules.
 * Users can add/remove modules after picking a profile.
 *
 * @type {Record<string, {name: string, tagline: string, description: string, modules: string[]}>}
 */
export const PROFILES = {
  lite: {
    name: "Lite",
    tagline: "Just the agent — minimal footprint",
    description:
      "Core Jarvis agent + provider config. No subagents, no MCPs, no LSPs. Perfect for trying it out or adding to an existing setup.",
    modules: ["core"],
  },

  standard: {
    name: "Standard",
    tagline: "Full AI terminal — the sweet spot",
    description:
      "Jarvis + all 5 subagents + browser/filesystem/memory/sequential-thinking MCPs + skills + efficiency plugin. No language servers — keep it lean.",
    modules: [
      "core",
      "subagents",
      "skills",
      "plugin",
      "mcp-browser",
      "mcp-filesystem",
      "mcp-memory",
      "mcp-sequential-thinking",
    ],
  },

  full: {
    name: "Full",
    tagline: "Everything including language servers",
    description:
      "All modules: every subagent, every MCP, every LSP, skills, plugin. Maximum power, maximum disk usage. For the complete experience.",
    modules: [
      "core",
      "subagents",
      "skills",
      "plugin",
      "mcp-browser",
      "mcp-filesystem",
      "mcp-memory",
      "mcp-sequential-thinking",
      "mcp-github",
      "mcp-sqlite",
      "lsp-typescript",
      "lsp-python",
      "lsp-html",
      "lsp-css",
      "lsp-json",
      "lsp-yaml",
      "lsp-bash",
      "lsp-docker",
      "lsp-eslint",
      "lsp-php",
      "lsp-sql",
      "lsp-ansible",
      "lsp-prisma",
    ],
  },
}

// ── Helpers ───────────────────────────────────────────────

/**
 * Resolve a profile's module list (handles dependsOn chains).
 * @param {string} profileId
 * @returns {string[]} sorted, deduplicated module IDs
 */
export function resolveProfileModules(profileId) {
  const profile = PROFILES[profileId]
  if (!profile) throw new Error(`Unknown profile: ${profileId}`)
  return resolveModules(profile.modules)
}

/**
 * Resolve a set of module IDs with their dependency chains.
 * @param {string[]} moduleIds
 * @returns {string[]} sorted, deduplicated module IDs
 */
export function resolveModules(moduleIds) {
  const resolved = new Set()

  function add(id) {
    if (resolved.has(id)) return
    const mod = MODULES[id]
    if (!mod) return // skip unknown modules gracefully
    for (const dep of mod.dependsOn) add(dep)
    resolved.add(id)
  }

  for (const id of moduleIds) add(id)
  return [...resolved].sort()
}

/**
 * Get all npm dependencies for a set of modules.
 * Handles shared packages (e.g., vscode-langservers-extracted used by html/css/json).
 * @param {string[]} moduleIds
 * @param {Record<string, string>} packageVersions - map from pkg name to version range
 * @returns {string[]} npm install arguments (e.g., ["pkg@^1.0", ...])
 */
export function getModuleNpmDeps(moduleIds, packageVersions) {
  const seen = new Set()
  const result = []

  for (const id of moduleIds) {
    const mod = MODULES[id]
    if (!mod) continue
    for (const pkg of mod.npmDeps) {
      if (seen.has(pkg)) continue
      seen.add(pkg)
      const version = packageVersions[pkg] || "latest"
      result.push(`${pkg}@${version}`)
    }
  }

  return result
}

/**
 * Get template files for a set of modules.
 * @param {string[]} moduleIds
 * @returns {string[]} file paths relative to template/
 */
export function getModuleTemplateFiles(moduleIds) {
  const seen = new Set()
  const result = []

  for (const id of moduleIds) {
    const mod = MODULES[id]
    if (!mod) continue
    for (const file of mod.templateFiles) {
      if (seen.has(file)) continue
      seen.add(file)
      result.push(file)
    }
  }

  return result
}

/**
 * Check which config sections are needed for a set of modules.
 * @param {string[]} moduleIds
 * @returns {Set<string>}
 */
export function getModuleConfigSections(moduleIds) {
  const sections = new Set()

  for (const id of moduleIds) {
    const mod = MODULES[id]
    if (!mod) continue
    for (const s of mod.configSections) sections.add(s)
  }

  return sections
}

/**
 * Check if a specific module ID is in the selected set.
 * @param {string} moduleId
 * @param {Set<string>} selectedModules
 * @returns {boolean}
 */
export function hasModule(moduleId, selectedModules) {
  return selectedModules.has(moduleId)
}

/**
 * Get human-readable summary of what a module selection includes.
 * @param {string[]} moduleIds
 * @returns {object} summary stats
 */
export function summarizeSelection(moduleIds) {
  const modules = moduleIds.map((id) => MODULES[id]).filter(Boolean)
  const npmCount = new Set(modules.flatMap((m) => m.npmDeps)).size
  const fileCount = new Set(modules.flatMap((m) => m.templateFiles)).size
  const sectionCount = new Set(modules.flatMap((m) => m.configSections)).size

  return {
    moduleCount: modules.length,
    npmCount,
    fileCount,
    sectionCount,
    modules: modules.map((m) => ({ id: m.id, name: m.name, desc: m.description })),
  }
}
