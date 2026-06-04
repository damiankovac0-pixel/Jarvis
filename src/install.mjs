#!/usr/bin/env node

// ────────────────────────────────────────────────────────────
// Jarvis Installer — 8-phase setup
// Zero external dependencies. Uses Node.js stdlib only.
// ────────────────────────────────────────────────────────────

import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import { createInterface } from "node:readline"
import { spawn, execSync } from "node:child_process"
import { fileURLToPath } from "node:url"

// ── Paths ──────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, "..")
const CONFIG_DIR = path.join(os.homedir(), ".config", "opencode")
const NODE_BIN_DIR = path.join(CONFIG_DIR, "node_modules", ".bin")
const TEMPLATE_DIR = path.join(REPO_ROOT, "template")

// ── ANSI Colors ────────────────────────────────────────────

/** @type {{ [k: string]: string }} */
const c = { g: "", r: "", y: "", c: "", m: "", b: "", n: "" }
if (process.stdout.isTTY) {
  c.g = "\x1b[32m" // green
  c.r = "\x1b[31m" // red
  c.y = "\x1b[33m" // yellow
  c.c = "\x1b[36m" // cyan
  c.m = "\x1b[35m" // magenta
  c.b = "\x1b[1m"  // bold
  c.n = "\x1b[0m"  // reset
}

// ── Logging ────────────────────────────────────────────────

function ok(msg)    { console.log(`  ${c.g}✓${c.n} ${msg}`) }
function info(msg)  { console.log(`  ${c.c}ℹ${c.n} ${msg}`) }
function warn(msg)  { console.log(`  ${c.y}⚠${c.n} ${msg}`) }
function fail(msg)  { console.log(`  ${c.r}✗${c.n} ${msg}`) }
function title(msg) { console.log(`\n${c.b}${msg}${c.n}`) }
function step(n, msg) { process.stdout.write(`  [${n}/8] ${msg}... `) }

// ── Readline helpers ───────────────────────────────────────

function ask(query) {
  return new Promise((resolve) => {
    const i = rl()
    i.question(query, (ans) => { i.close(); resolve(ans.trim()) })
  })
}

function askMasked(query) {
  return _maskedInput(query)
}

async function _maskedInput(prompt) {
  if (process.platform === "win32") {
    // PowerShell trick: Read-Host -AsSecureString
    const script = `$sec = Read-Host -Prompt ${JSON.stringify(prompt)} -AsSecureString; $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec); [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)`
    try {
      const buf = execSync(`powershell -NoProfile -Command "${script.replace(/"/g, '\\"')}"`, {
        stdio: ["inherit", "pipe", "pipe"],
        timeout: 30000,
        windowsHide: true,
      })
      return buf.toString("utf-8").trim()
    } catch {
      // Fallback to regular input
      return ask(prompt)
    }
  } else {
    // Unix: stty -echo
    try {
      execSync("stty -echo", { stdio: "pipe" })
      const val = await ask(prompt)
      execSync("stty echo", { stdio: "pipe" })
      console.log() // newline since echo was off
      return val
    } catch {
      return ask(prompt)
    }
  }
}

function pressEnter() {
  return ask("  Press Enter to continue, or Ctrl+C to cancel.")
}

async function confirm(prompt, defaultYes = true) {
  const hint = defaultYes ? "[Y/n]" : "[y/N]"
  const ans = (await ask(`  ${prompt} ${hint} `)).toLowerCase()
  if (ans === "") return defaultYes
  return ans === "y" || ans === "yes"
}

async function menuQuestion(prompt, items, defaultIdx = 0) {
  console.log(`\n  ${prompt}`)
  for (let i = 0; i < items.length; i++) {
    const marker = i === defaultIdx ? " (default)" : ""
    console.log(`    ${i + 1}) ${items[i]}${marker}`)
  }
  const ans = await ask(`  Enter [1-${items.length}]: `)
  const num = parseInt(ans, 10)
  if (num >= 1 && num <= items.length) return num - 1
  return defaultIdx
}

// ── Spinner ────────────────────────────────────────────────

let _spinnerInterval = null

function startSpinner(text) {
  if (!process.stdout.isTTY) {
    console.log(`  ${text}...`)
    return
  }
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
  let i = 0
  process.stdout.write(`  ${c.c}${frames[0]}${c.n} ${text}... `)
  _spinnerInterval = setInterval(() => {
    i = (i + 1) % frames.length
    process.stdout.write(`\r  ${c.c}${frames[i]}${c.n} ${text}... `)
  }, 80)
}

function stopSpinner(success = true) {
  if (_spinnerInterval) {
    clearInterval(_spinnerInterval)
    _spinnerInterval = null
    process.stdout.write("\r")
    if (success) {
      console.log(`  ${c.g}✓${c.n}`)
    } else {
      console.log(`  ${c.r}✗${c.n}`)
    }
  }
}

// ── Utility ────────────────────────────────────────────────

function exec(cmd, args = [], opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "pipe",
      windowsHide: true,
      ...opts,
    })
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (d) => { stdout += d.toString() })
    child.stderr.on("data", (d) => { stderr += d.toString() })
    child.on("close", (code) => {
      if (code === 0) resolve(stdout.trim())
      else reject(new Error(stderr.trim() || `exit code ${code}`))
    })
    child.on("error", reject)
  })
}

function fileExists(p) {
  try { fs.accessSync(p); return true } catch { return false }
}

function readFile(p) {
  try { return fs.readFileSync(p, "utf-8") } catch { return null }
}

function writeFile(p, content) {
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, content, "utf-8")
}

function copyFile(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true })
  fs.copyFileSync(src, dst)
}

function readDirRecursive(dir) {
  const entries = []
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        entries.push(...readDirRecursive(full))
      } else {
        entries.push(full)
      }
    }
  } catch { /* skip */ }
  return entries
}

// ── Detect helpers ─────────────────────────────────────────

function detectShell() {
  if (process.platform === "win32") return "powershell"
  const fromEnv = process.env.SHELL || ""
  if (fromEnv.includes("zsh"))    return "zsh"
  if (fromEnv.includes("fish"))   return "fish"
  return "bash"
}

function detectWsl() {
  try {
    const v = fs.readFileSync("/proc/version", "utf-8")
    return v.includes("Microsoft") || v.includes("WSL")
  } catch { return false }
}

// Check if a tool is available in PATH
function hasTool(name) {
  try {
    if (process.platform === "win32") {
      execSync(`where ${name}`, { stdio: "pipe" })
    } else {
      execSync(`command -v ${name}`, { stdio: "pipe" })
    }
    return true
  } catch { return false }
}

// Check Python version
function checkPython() {
  for (const cmd of ["python3", "python"]) {
    try {
      const v = execSync(`${cmd} --version`, { stdio: "pipe" }).toString()
      if (v.match(/Python (\d+)\.(\d+)/)) {
        const major = parseInt(RegExp.$1, 10)
        const minor = parseInt(RegExp.$2, 10)
        if (major > 3 || (major === 3 && minor >= 10)) {
          return cmd
        }
      }
    } catch { /* try next */ }
  }
  return null
}

// ────────────────────────────────────────────────────────────
// Context type (exported for config-builder)
// ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} InstallContext
 * @property {string} platform
 * @property {string} arch
 * @property {string} shell
 * @property {string} homeDir
 * @property {string} configDir
 * @property {string} nodeBinDir
 * @property {object} models
 * @property {string} models.primary
 * @property {string} models.fast
 * @property {object} langs
 * @property {object} tools
 * @property {object} provider
 * @property {string} provider.type
 * @property {string} provider.baseURL
 * @property {string|null} provider.apiKeyRef
 * @property {object} mcp
 * @property {{enabled: boolean, tokenRef: string|null}} mcp.github
 * @property {object} headroom
 * @property {boolean} headroom.enabled
 * @property {string|null} pythonPath
 * @property {string} autonomy
 */

// ────────────────────────────────────────────────────────────
// Phase 1: Environment Detection
// ────────────────────────────────────────────────────────────

async function detectEnvironment() {
  /** @type {InstallContext} */
  const ctx = {
    platform: process.platform,
    arch: process.arch,
    shell: detectShell(),
    homeDir: os.homedir(),
    configDir: CONFIG_DIR,
    nodeBinDir: NODE_BIN_DIR,
    models: { primary: "", fast: "" },
    langs: {
      typescript: false,
      python: false,
      html: true,    // always available
      css: true,     // always available
      json: true,    // always available
      yaml: true,    // always available
      bash: detectShell() !== "powershell", // available on Unix
      docker: false,
      eslint: false,
      php: false,
      sql: false,
      ansible: false,
      prisma: false,
    },
    tools: {
      rg: hasTool("rg"),
      fd: hasTool("fd"),
      jq: hasTool("jq"),
      uv: hasTool("uv"),
      git: hasTool("git"),
    },
    provider: {
      type: "openai",
      baseURL: "https://api.openai.com/v1",
      apiKeyRef: null,
    },
    mcp: {
      github: {
        enabled: false,
        tokenRef: null,
      },
    },
    headroom: {
      enabled: false,
      pythonPath: null,
    },
    autonomy: "full",
  }

  // Detect languages
  ctx.langs.typescript = hasTool("node")
  ctx.langs.python = hasTool("python3") || hasTool("python")
  ctx.langs.docker = hasTool("docker")
  ctx.langs.eslint = ctx.langs.typescript // eslint requires node
  ctx.langs.php = hasTool("php")
  ctx.langs.sql = hasTool("sqlite3") || hasTool("sqlite")
  ctx.langs.ansible = hasTool("ansible") || hasTool("ansible-playbook")
  ctx.langs.prisma = hasTool("prisma")

  // On Windows, bash LSP is still useful (Git Bash, WSL)
  if (process.platform === "win32") {
    ctx.langs.bash = hasTool("bash") || detectWsl()
  }

  // Detect Python for headroom
  ctx.pythonPath = checkPython()
  ctx.headroom.enabled = ctx.pythonPath !== null
  ctx.headroom.pythonPath = ctx.pythonPath

  // Check for existing install
  ctx.hasExisting = fileExists(path.join(CONFIG_DIR, "opencode.jsonc"))
  if (ctx.hasExisting) {
    try {
      const existing = JSON.parse(readFile(path.join(CONFIG_DIR, "opencode.jsonc")))
      ctx.existingConfig = existing
      // Extract existing provider info for reuse
      if (existing.provider?.openai?.apiKey) {
        ctx.existingApiKeyRef = existing.provider.openai.apiKey
      }
      if (existing.provider?.anthropic?.apiKey) {
        ctx.existingApiKeyRef = existing.provider.anthropic.apiKey
      }
      // Extract existing GitHub token
      if (existing.mcp?.github?.environment?.GITHUB_TOKEN) {
        ctx.existingGithubRef = existing.mcp.github.environment.GITHUB_TOKEN
      }
    } catch { /* ignore parse errors */ }
  }

  // Check if opencode is installed globally
  ctx.hasOpencode = hasTool("opencode")

  return ctx
}

// ────────────────────────────────────────────────────────────
// Phase 2: User Prompts
// ────────────────────────────────────────────────────────────

async function promptProvider(ctx) {
  if (ctx.hasExisting) {
    const reuse = await confirm(
      `Existing config found. Reuse provider settings?`,
      true
    )
    if (reuse) {
      // Keep existing config — skip all prompts
      ctx.skipPrompts = true
      return
    }
  }

  const providerNames = [
    "OpenAI — GPT-4o, GPT-4o-mini (requires API key)",
    "Anthropic — Claude Sonnet 4, Haiku 3.5 (requires API key)",
    "Ollama — Free, runs locally (no API key)",
    "Custom — Any OpenAI-compatible endpoint",
  ]
  const idx = await menuQuestion("Which AI provider?", providerNames, 0)

  const providerTypes = ["openai", "anthropic", "ollama", "custom"]
  ctx.provider.type = providerTypes[idx]

  // Set model defaults per provider
  const modelDefaults = {
    openai:  { primary: "gpt-4o",             fast: "gpt-4o-mini" },
    anthropic: { primary: "claude-sonnet-4-20250514", fast: "claude-haiku-3-5" },
    ollama:  { primary: "llama3.1:70b",         fast: "llama3.1:8b" },
    custom:  { primary: "",                     fast: "" },
  }
  const defaults = modelDefaults[ctx.provider.type]

  // Custom provider: ask for base URL first
  if (ctx.provider.type === "custom") {
    const url = await ask(`  Enter your API endpoint URL:\n  (e.g. http://localhost:8787/v1) `)
    ctx.provider.baseURL = url || "http://localhost:8787/v1"
  } else if (ctx.provider.type === "ollama") {
    ctx.provider.baseURL = "http://localhost:11434/v1"
  } else if (ctx.provider.type === "openai") {
    ctx.provider.baseURL = "https://api.openai.com/v1"
  } else if (ctx.provider.type === "anthropic") {
    ctx.provider.baseURL = "https://api.anthropic.com"
  }

  // Model selection
  const primaryHint = defaults.primary ? ` (default: ${defaults.primary})` : ""
  const fastHint = defaults.fast ? ` (default: ${defaults.fast})` : ""

  const primaryModel = await ask(`  Model for complex reasoning (primary):${primaryHint} `)
  ctx.models.primary = primaryModel || defaults.primary

  const fastModel = await ask(`  Model for fast tasks (subagents):${fastHint} `)
  ctx.models.fast = fastModel || defaults.fast
}

async function promptApiKey(ctx) {
  if (ctx.skipPrompts) return
  if (ctx.provider.type === "ollama") {
    info("Ollama runs locally — no API key needed.")
    return
  }

  const envVarName = {
    openai: "OPENAI_API_KEY",
    anthropic: "ANTHROPIC_API_KEY",
    custom: "CUSTOM_API_KEY",
  }[ctx.provider.type]

  // Check if already set in environment
  const envKey = process.env[envVarName]
  if (envKey) {
    ctx.provider.apiKeyRef = `\${${envVarName}}`
    ok(`${envVarName} found in environment.`)
    return
  }

  // Check if we have a key reference from existing config
  if (ctx.existingApiKeyRef) {
    const reuse = await confirm(
      `Reuse existing API key reference (${ctx.existingApiKeyRef})?`,
      true
    )
    if (reuse) {
      ctx.provider.apiKeyRef = ctx.existingApiKeyRef
      return
    }
  }

  console.log(`\n  Enter your ${ctx.provider.type} API key:`)
  console.log(`  (Leave blank to use ${envVarName} environment variable)`)
  const key = await _maskedInput("  API key: ")

  if (!key) {
    ctx.provider.apiKeyRef = `\${${envVarName}}`
    warn(`No key entered. Set ${envVarName}=your_key in your environment.`)
    return
  }

  // Validate format
  if (ctx.provider.type === "openai" && !key.startsWith("sk-")) {
    warn("Key doesn't start with 'sk-'. OpenAI keys usually do.")
  }
  if (ctx.provider.type === "anthropic" && !key.startsWith("sk-ant-")) {
    warn("Key doesn't start with 'sk-ant-'. Anthropic keys usually do.")
  }

  const store = await confirm(
    "Store key as system environment variable? (Recommended)",
    true
  )

  if (store) {
    try {
      if (process.platform === "win32") {
        execSync(
          `setx ${envVarName} "${key}" /M`,
          { stdio: "pipe", timeout: 10000 }
        )
      } else {
        const profileFile = path.join(os.homedir(), ".profile")
        const line = `\nexport ${envVarName}="${key}"\n`
        fs.appendFileSync(profileFile, line, "utf-8")
      }
      ctx.provider.apiKeyRef = `\${${envVarName}}`
      ok(`Stored as ${envVarName}.`)
    } catch (e) {
      warn(`Could not store env var: ${e.message}`)
      ctx.provider.apiKeyRef = `\${${envVarName}}`
    }
  } else {
    // User chose not to store in env — store key reference anyway
    ctx.provider.apiKeyRef = `\${${envVarName}}`
    warn(`Set ${envVarName}=your_key in your environment before using Jarvis.`)
  }
}

async function promptLangs(ctx) {
  if (ctx.skipPrompts) return

  const langLabels = {
    typescript: "TypeScript/JavaScript",
    python: "Python",
    html: "HTML",
    css: "CSS/Sass/Less",
    json: "JSON/JSONC",
    yaml: "YAML",
    bash: "Shell script",
    docker: "Dockerfile",
    eslint: "ESLint",
    php: "PHP",
    sql: "SQL",
    ansible: "Ansible",
    prisma: "Prisma",
  }

  console.log(`\n  Language server support — detected on your system:`)
  const langKeys = Object.keys(ctx.langs)
  for (const key of langKeys) {
    const detected = ctx.langs[key] ? `${c.g}detected${c.n}` : `${c.y}optional${c.n}`
    const toggled = ctx.langs[key] ? `${c.g}*${c.n}` : ` `
    console.log(`  [${toggled}] ${langLabels[key]} (${detected})`)
  }

  const edit = await confirm(
    `\n  Toggle selections? (currently ${
      Object.values(ctx.langs).filter(Boolean).length
    } active)`,
    false
  )

  if (edit) {
    for (const key of langKeys) {
      const current = ctx.langs[key]
      const label = langLabels[key]
      const ans = await confirm(`  ${label}?`, current)
      ctx.langs[key] = ans
    }
  }
}

async function promptGithub(ctx) {
  if (ctx.skipPrompts) return

  const envToken = process.env.GITHUB_TOKEN
  if (envToken) {
    ctx.mcp.github.enabled = true
    ctx.mcp.github.tokenRef = "${GITHUB_TOKEN}"
    ok("GITHUB_TOKEN found in environment.")
    return
  }

  if (ctx.existingGithubRef) {
    const reuse = await confirm(
      `Reuse existing GitHub token reference?`,
      true
    )
    if (reuse) {
      ctx.mcp.github.enabled = true
      ctx.mcp.github.tokenRef = ctx.existingGithubRef
      return
    }
  }

  const add = await confirm(
    "Enable GitHub integration? (repo search, PRs, issues)",
    false
  )
  if (!add) {
    ctx.mcp.github.enabled = false
    return
  }

  console.log(`\n  Enter GitHub token (or press Enter to skip):`)
  console.log(`  (Create at: https://github.com/settings/tokens)`)
  const token = await _maskedInput("  Token: ")

  if (!token) {
    ctx.mcp.github.enabled = false
    warn("GitHub MCP disabled — no token provided.")
    return
  }

  const store = await confirm(
    "Store token as GITHUB_TOKEN environment variable?",
    true
  )

  if (store) {
    try {
      if (process.platform === "win32") {
        execSync(`setx GITHUB_TOKEN "${token}"`, { stdio: "pipe", timeout: 10000 })
      } else {
        const profileFile = path.join(os.homedir(), ".profile")
        const line = `\nexport GITHUB_TOKEN="${token}"\n`
        fs.appendFileSync(profileFile, line, "utf-8")
      }
      ctx.mcp.github.tokenRef = "${GITHUB_TOKEN}"
    } catch (e) {
      warn(`Could not store: ${e.message}`)
      ctx.mcp.github.tokenRef = "${GITHUB_TOKEN}"
    }
  } else {
    ctx.mcp.github.tokenRef = "${GITHUB_TOKEN}"
  }
  ctx.mcp.github.enabled = true
  ok("GitHub integration configured.")
}

async function promptAutonomy(ctx) {
  if (ctx.skipPrompts) return

  const choice = await menuQuestion(
    `${c.b}Autonomy level:${c.n}`,
    [
      `${c.g}FULL${c.n} — Jarvis edits files, runs commands, browses the web without asking. (Your call.)`,
      `${c.y}SAFE${c.n} — Jarvis asks before destructive actions. (Recommended for first-time users.)`,
    ],
    0
  )

  if (choice === 0) {
    console.log(`\n  ${c.r}${c.b}⚠  Full autonomy means Jarvis can modify your system without confirmation.${c.n}`)
    const confirm_text = await ask(`  ${c.b}Type "YES" to confirm:${c.n} `)
    if (confirm_text === "YES") {
      ctx.autonomy = "full"
    } else {
      info("Falling back to SAFE mode.")
      ctx.autonomy = "safe"
    }
  } else {
    ctx.autonomy = "safe"
  }
}

// ────────────────────────────────────────────────────────────
// Phase 3: Dependency Installation
// ────────────────────────────────────────────────────────────

async function installDependencies(ctx) {
  step(1, "Installing npm packages (18 dependencies)")

  // Ensure config directory exists
  fs.mkdirSync(CONFIG_DIR, { recursive: true })

  // Copy package.json to config dir
  const srcPkg = path.join(REPO_ROOT, "package.json")
  const dstPkg = path.join(CONFIG_DIR, "package.json")
  if (fileExists(srcPkg)) {
    copyFile(srcPkg, dstPkg)
  }

  // Run npm install
  try {
    const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm"
    const pkgLock = path.join(CONFIG_DIR, "package-lock.json")
    const installCmd = fileExists(pkgLock) ? "ci" : "install"

    startSpinner("npm dependencies")
    await exec(npmCmd, [installCmd, "--no-audit", "--no-fund"], {
      cwd: CONFIG_DIR,
      timeout: 300000, // 5 min timeout
    })
    stopSpinner(true)
    ok("Packages installed.")
  } catch (e) {
    stopSpinner(false)
    const msg = e.message || "unknown error"
    fail(`npm install failed: ${msg}`)
    warn("You can retry manually: cd ~/.config/opencode && npm install")
    warn("Check your network connection and proxy settings.")
    const retry = await confirm("Retry npm install?", true)
    if (retry) return installDependencies(ctx)
    throw new Error("npm install failed")
  }

  // Install opencode globally
  if (!ctx.hasOpencode) {
    step(1, "Installing opencode globally")
    try {
      startSpinner("npm install -g @opencode-ai/opencode")
      const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm"
      await exec(npmCmd, ["install", "-g", "@opencode-ai/opencode", "--no-audit", "--no-fund"], {
        timeout: 120000,
      })
      stopSpinner(true)
      ok("opencode installed globally.")
    } catch (e) {
      stopSpinner(false)
      warn(`Could not install opencode globally: ${e.message}`)
      warn("You can install manually: npm install -g @opencode-ai/opencode")
    }
  } else {
    info("opencode already installed globally.")
  }

  // Install headroom if Python available
  if (ctx.headroom.enabled && ctx.pythonPath) {
    step(1, "Installing headroom (output compression)")
    try {
      startSpinner("pip install headroom")
      if (ctx.tools.uv) {
        await exec("uv", ["pip", "install", "headroom"], { timeout: 60000 })
      } else {
        await exec(ctx.pythonPath, ["-m", "pip", "install", "headroom"], { timeout: 60000 })
      }
      stopSpinner(true)
      ok("headroom installed.")
    } catch (e) {
      stopSpinner(false)
      warn(`headroom install failed: ${e.message}`)
      ctx.headroom.enabled = false
    }
  } else if (!ctx.headroom.enabled) {
    info("Python not found — headroom compression skipped (optional).")
  }
}

// ────────────────────────────────────────────────────────────
// Phase 4: Config Generation
// ────────────────────────────────────────────────────────────

async function generateConfig(ctx) {
  step(2, "Generating configuration")

  // Import config-builder dynamically (ESM, URL-based for cross-platform)
  const configBuilderUrl = new URL("config-builder.mjs", import.meta.url).href
  const { buildConfig } = await import(configBuilderUrl)
  const config = buildConfig(ctx)

  // Write as formatted JSON
  const configPath = path.join(CONFIG_DIR, "opencode.jsonc")
  writeFile(configPath, JSON.stringify(config, null, 2) + "\n")

  ok("Configuration written.")
}

// ────────────────────────────────────────────────────────────
// Phase 5: File Operations
// ────────────────────────────────────────────────────────────

async function copyFiles() {
  step(3, "Copying agent files, plugins, and skills")

  // Walk template directory and copy all files to config dir
  const templateFiles = readDirRecursive(TEMPLATE_DIR)

  let copied = 0
  let skipped = 0
  for (const src of templateFiles) {
    const rel = path.relative(TEMPLATE_DIR, src)
    const dst = path.join(CONFIG_DIR, rel)

    // Check if file already exists with same content
    if (fileExists(dst)) {
      const existingContent = readFile(dst)
      const newContent = readFile(src)
      if (existingContent === newContent) {
        skipped++
        continue
      }
      // Content differs — back up the existing file
      const backupPath = dst + ".bak." + new Date().toISOString().replace(/[:.]/g, "-")
      fs.copyFileSync(dst, backupPath)
    }

    fs.mkdirSync(path.dirname(dst), { recursive: true })
    fs.copyFileSync(src, dst)
    copied++
  }

  if (copied > 0) ok(`${copied} files copied (${skipped} unchanged).`)
  else ok(`${skipped} files up-to-date.`)
}

// ────────────────────────────────────────────────────────────
// Phase 6: Shell Integration
// ────────────────────────────────────────────────────────────

async function setupShellIntegration(ctx) {
  step(4, "Adding 'jarvis' command to shell")

  const aliasLine = "alias jarvis='opencode --agent jarvis'"
  const funcLine = "function jarvis { opencode --agent jarvis @args }"
  const header = "# Jarvis Terminal — one AI to rule your terminal"

  let added = false

  if (ctx.shell === "powershell" && process.platform === "win32") {
    // Check all PowerShell profiles
    const profilePaths = [
      path.join(os.homedir(), "Documents", "WindowsPowerShell", "Microsoft.PowerShell_profile.ps1"),
      path.join(os.homedir(), "Documents", "PowerShell", "Microsoft.PowerShell_profile.ps1"),
    ]

    for (const profilePath of profilePaths) {
      const profileDir = path.dirname(profilePath)
      fs.mkdirSync(profileDir, { recursive: true })

      let content = readFile(profilePath) || ""
      if (content.includes("function jarvis")) {
        info(`jarvis function already in ${path.basename(profilePath)}`)
        continue
      }

      // Backup
      if (fileExists(profilePath)) {
        copyFile(profilePath, profilePath + ".jarvis-backup")
      }

      content += `\n${header}\n${funcLine}\n`
      writeFile(profilePath, content)
      added = true
    }
  } else {
    // Unix: bash / zsh / fish
    const profiles = []
    if (ctx.shell === "zsh") {
      profiles.push(path.join(os.homedir(), ".zshrc"))
    } else if (ctx.shell === "fish") {
      const fishDir = path.join(os.homedir(), ".config", "fish")
      const funcDir = path.join(fishDir, "functions")
      fs.mkdirSync(funcDir, { recursive: true })
      const fishFunc = path.join(funcDir, "jarvis.fish")
      if (!fileExists(fishFunc)) {
        writeFile(fishFunc, `function jarvis --description "Launch Jarvis AI terminal assistant"\n    opencode --agent jarvis $argv\nend\n`)
        added = true
      } else {
        info("jarvis.fish already exists.")
      }
      // Also add to config.fish for autoload
      profiles.push(path.join(fishDir, "config.fish"))
    } else {
      // bash
      profiles.push(path.join(os.homedir(), ".bashrc"))
      // Also check .bash_profile on macOS
      if (process.platform === "darwin") {
        profiles.push(path.join(os.homedir(), ".bash_profile"))
      }
    }

    for (const profilePath of profiles) {
      fs.mkdirSync(path.dirname(profilePath), { recursive: true })
      let content = readFile(profilePath) || ""
      if (content.includes("alias jarvis=") || content.includes("function jarvis")) {
        info(`jarvis alias already in ${path.basename(profilePath)}`)
        continue
      }
      if (fileExists(profilePath)) {
        copyFile(profilePath, profilePath + ".jarvis-backup")
      }
      // Add at the end
      content += (content.endsWith("\n") ? "" : "\n") + `${header}\n${aliasLine}\n`
      writeFile(profilePath, content)
      added = true
    }
  }

  if (added) {
    ok(`'jarvis' command added to ${ctx.shell} profile.`)
    info(`Restart your terminal or 'source ~/.${ctx.shell === "zsh" ? "zshrc" : "bashrc"}' to use it.`)
    if (ctx.shell === "powershell") {
      info(`Restart PowerShell or run '. \$PROFILE' to use it.`)
    }
  }
}

// ────────────────────────────────────────────────────────────
// Phase 7: System Dependencies (optional)
// ────────────────────────────────────────────────────────────

async function installSystemTools(ctx) {
  const toolsToInstall = []

  if (!ctx.tools.rg) toolsToInstall.push("rg")
  if (!ctx.tools.fd) toolsToInstall.push("fd")
  if (!ctx.tools.jq) toolsToInstall.push("jq")

  if (toolsToInstall.length === 0) {
    ok("System tools (rg, fd, jq) — all present")
    return
  }

  step(5, `Installing system tools: ${toolsToInstall.join(", ")}`)

  const installCmds = await detectPackageManager()

  if (!installCmds) {
    console.log(`${c.y}⚠${c.n}`)
    info("No package manager found. Install manually:")
    for (const tool of toolsToInstall) {
      info(`  ${tool}: see https://github.com/BurntSushi/ripgrep#installation`)
    }
    return
  }

  let installed = 0
  for (const tool of toolsToInstall) {
    try {
      startSpinner(`Installing ${tool}`)
      await exec(installCmds.cmd, [...installCmds.args, tool], {
        timeout: 120000,
        stdio: "pipe",
      })
      stopSpinner(true)
      installed++
    } catch (e) {
      stopSpinner(false)
      warn(`Could not install ${tool}: ${e.message}`)
    }
  }

  if (installed > 0) ok(`${installed} tool(s) installed.`)
}

async function detectPackageManager() {
  if (process.platform === "win32") {
    if (hasTool("winget"))  return { cmd: "winget", args: ["install", "--silent", "--accept-package-agreements"] }
    if (hasTool("choco"))   return { cmd: "choco",  args: ["install", "-y"] }
    if (hasTool("scoop"))   return { cmd: "scoop",  args: ["install"] }
    return null
  }
  if (process.platform === "darwin") {
    if (hasTool("brew"))    return { cmd: "brew",   args: ["install"] }
    return null
  }
  // Linux
  if (hasTool("apt-get"))  return { cmd: "sudo",   args: ["apt-get", "install", "-y"] }
  if (hasTool("dnf"))      return { cmd: "sudo",   args: ["dnf", "install", "-y"] }
  if (hasTool("pacman"))   return { cmd: "sudo",   args: ["pacman", "-S", "--noconfirm"] }
  if (hasTool("apk"))      return { cmd: "apk",    args: ["add"] }
  return null
}

// ────────────────────────────────────────────────────────────
// Phase 8: Verification
// ────────────────────────────────────────────────────────────

async function verifyInstall(ctx) {
  title("Verification")

  let allGood = true

  // Check opencode
  try {
    const version = execSync("opencode --version", { stdio: "pipe", timeout: 10000 }).toString().trim()
    ok(`opencode ${version}`)
  } catch {
    warn("opencode command not found. Try: npm install -g @opencode-ai/opencode")
    allGood = false
  }

  // Check config is valid JSON
  const configPath = path.join(CONFIG_DIR, "opencode.jsonc")
  if (fileExists(configPath)) {
    try {
      JSON.parse(readFile(configPath))
      ok("Configuration is valid.")
    } catch {
      fail("Configuration has invalid JSON!")
      allGood = false
    }
  } else {
    fail("Configuration file not found!")
    allGood = false
  }

  // Check key MCP binaries exist
  const mcpBins = ["playwright-mcp", "mcp-server-filesystem", "mcp-server-memory", "mcp-sqlite-server", "mcp-server-sequential-thinking"]
  for (const bin of mcpBins) {
    const binPath = path.join(NODE_BIN_DIR, bin + (process.platform === "win32" ? ".cmd" : ""))
    if (fileExists(binPath)) {
      ok(`MCP ${bin} found.`)
    } else {
      warn(`MCP ${bin} not found at ${binPath}`)
      allGood = false
    }
  }

  // Check headroom
  if (ctx.headroom.enabled && ctx.pythonPath) {
    try {
      execSync(`${ctx.pythonPath} -c "import headroom; print(headroom.__version__)"`, { stdio: "pipe", timeout: 10000 })
      ok("headroom ready.")
    } catch {
      warn("headroom not found. Python MCP disabled.")
    }
  }

  // Check jarvis alias
  if (process.platform === "win32") {
    try {
      execSync("Get-Command jarvis -ErrorAction SilentlyContinue", { stdio: "pipe", shell: "powershell" })
      ok("'jarvis' command resolves.")
    } catch {}
  } else {
    try {
      execSync("command -v jarvis", { stdio: "pipe" })
      ok("'jarvis' command resolves.")
    } catch {
      // Alias might not be in current shell session yet
      info("'jarvis' alias will be available after terminal restart.")
    }
  }

  return allGood
}

// ────────────────────────────────────────────────────────────
// Success Screen
// ────────────────────────────────────────────────────────────

function printSuccess(ctx) {
  const mcpCount = 5 + (ctx.mcp.github.enabled ? 1 : 0) + (ctx.headroom.enabled ? 1 : 0)
  const langCount = Object.values(ctx.langs).filter(Boolean).length

  console.log(`
${c.g}╔══════════════════════════════════════════════════════════╗${c.n}
${c.g}║${c.n}          ${c.b}${c.m}⚡  JARVIS — terminal AI ready  ${c.n}${c.g}              ║${c.n}
${c.g}║${c.n}                                                      ${c.g}║${c.n}
${c.g}║${c.n}  Type:  ${c.b}jarvis${c.n}                                          ${c.g}║${c.n}
${c.g}║${c.n}                                                      ${c.g}║${c.n}
${c.g}║${c.n}  Config:  ~/.config/opencode/                          ${c.g}║${c.n}
${c.g}║${c.n}  Provider: ${ctx.provider.type} (${ctx.models.primary})               ${c.g}║${c.n}
${c.g}║${c.n}  MCPs:    ${mcpCount} servers enabled                        ${c.g}║${c.n}
${c.g}║${c.n}  LSPs:    ${langCount} languages active                       ${c.g}║${c.n}
${c.g}║${c.n}  Subagents: 6                                           ${c.g}║${c.n}
${c.g}║${c.n}  Autonomy: ${ctx.autonomy === "full" ? "FULL" : "SAFE"} ${ctx.autonomy === "full" ? c.r : c.y}${ctx.autonomy === "full" ? "⚠" : "🛡"}${c.n}                              ${c.g}║${c.n}
${c.g}║${c.n}                                                      ${c.g}║${c.n}
${c.g}║${c.n}  ${c.y}Post-install:${c.n}                                     ${c.g}║${c.n}
${c.g}║${c.n}    Web automation: npx playwright install chromium     ${c.g}║${c.n}
${c.g}║${c.n}    (requires ~300MB for browser binaries)              ${c.g}║${c.n}
${c.g}║${c.n}                                                      ${c.g}║${c.n}
${c.g}║${c.n}  ${c.c}Update:${c.n}  git pull && bash install.sh               ${c.g}║${c.n}
${c.g}║${c.n}  ${c.r}Remove:${c.n}  bash uninstall.sh                           ${c.g}║${c.n}
${c.g}║${c.n}                                                      ${c.g}║${c.n}
${c.g}╚══════════════════════════════════════════════════════════╝${c.n}
`)
}

// ────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────

async function main() {
  // Welcome
  console.log(`
${c.m}╔══════════════════════════════════════════════╗${c.n}
${c.m}║${c.n}          ${c.b}JARVIS Terminal Setup${c.n}              ${c.m}║${c.n}
${c.m}║${c.n}  One AI to rule your terminal.             ${c.m}║${c.n}
${c.m}║${c.n}  Let's configure it for your machine.       ${c.m}║${c.n}
${c.m}╚══════════════════════════════════════════════╝${c.n}
`)

  if (!process.stdout.isTTY) {
    fail("This installer requires an interactive terminal.")
    process.exit(1)
  }

  await pressEnter()

  // Phase 1: Detect
  title("Detecting your environment...")
  const ctx = await detectEnvironment()
  console.log(`  OS:      ${process.platform} / ${process.arch}${detectWsl() ? " (WSL)" : ""}`)
  console.log(`  Shell:   ${ctx.shell}`)
  console.log(`  Home:    ${ctx.homeDir}`)
  console.log(`  Python:  ${ctx.pythonPath || "not found"}`)
  if (ctx.hasExisting) info("Existing Jarvis config detected.")
  if (ctx.hasOpencode) info("opencode already installed globally.")

  // Phase 2: Prompts
  title("Configuration")
  await promptProvider(ctx)
  await promptApiKey(ctx)
  await promptLangs(ctx)
  await promptGithub(ctx)
  await promptAutonomy(ctx)

  // Show summary and confirm
  const providerLabel = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    ollama: "Ollama (local)",
    custom: `Custom (${ctx.provider.baseURL})`,
  }[ctx.provider.type]

  const langActive = Object.entries(ctx.langs)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(", ")

  const mcpCount = 5 + (ctx.mcp.github.enabled ? 1 : 0) + (ctx.headroom.enabled ? 1 : 0)

  console.log(`\n${c.b}Installation Summary:${c.n}`)
  console.log(`  Provider:  ${providerLabel}`)
  console.log(`  Primary:   ${ctx.models.primary}`)
  console.log(`  Fast:      ${ctx.models.fast}`)
  console.log(`  LSPs:      ${langActive || "none"}`)
  console.log(`  MCPs:      ${mcpCount} servers`)
  console.log(`  Autonomy:  ${ctx.autonomy.toUpperCase()}`)
  console.log(`  GitHub:    ${ctx.mcp.github.enabled ? "yes" : "no"}`)
  console.log(`  Headroom:  ${ctx.headroom.enabled ? "yes" : "no"}`)
  console.log(`  Config:    ${CONFIG_DIR}`)

  const proceed = await confirm(`\nProceed with installation?`, true)
  if (!proceed) {
    info("Installation cancelled.")
    process.exit(0)
  }

  // Phase 3-7: Install
  await installDependencies(ctx)
  await generateConfig(ctx)
  await copyFiles()
  await setupShellIntegration(ctx)
  await installSystemTools(ctx)

  // Phase 8: Verify
  await verifyInstall(ctx)

  // Success
  printSuccess(ctx)
}

main().catch((err) => {
  console.error(`\n${c.r}Installation failed: ${err.message}${c.n}`)
  console.error(`  You can re-run the installer to resume from where it left off.`)
  process.exit(1)
})
