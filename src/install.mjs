#!/usr/bin/env node

// ────────────────────────────────────────────────────────────
// Jarvis Installer — Modular cross-platform setup
// Zero external dependencies. Uses Node.js stdlib only.
//
// Flow:
//   1. Welcome + environment detection
//   2. Profile selection (Lite / Standard / Full / Custom)
//   3. Customize modules (if Custom chosen or after profile)
//   4. Provider + API key + GitHub token + autonomy prompts
//   5. Installation plan summary + confirmation
//   6. Execute: opencode → npm packages → config → templates → shell → tools
//   7. Verification + next steps
// ────────────────────────────────────────────────────────────

import fs from "node:fs"
import path from "node:path"
import os from "node:os"
import { createInterface } from "node:readline"
import { spawn, execSync } from "node:child_process"
import { fileURLToPath } from "node:url"

import { MODULES, PROFILES, resolveModules, getModuleNpmDeps, getModuleTemplateFiles, summarizeSelection } from "./modules.mjs"
import { buildConfig } from "./config-builder.mjs"

// ── Paths ──────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, "..")
const CONFIG_DIR = path.join(os.homedir(), ".config", "opencode")
const NODE_BIN_DIR = path.join(CONFIG_DIR, "node_modules", ".bin")
const TEMPLATE_DIR = path.join(REPO_ROOT, "template")
const BACKUP_DIR = path.join(CONFIG_DIR, ".jarvis-backup")

// ── CLI Flags ──────────────────────────────────────────────

const FLAGS = {
  dryRun: process.argv.includes("--dry-run"),
  yes: process.argv.includes("--yes") || process.argv.includes("-y"),
}

// ── ANSI Colors ────────────────────────────────────────────

const c = {}
if (process.stdout.isTTY) {
  c.g = "\x1b[32m"; c.r = "\x1b[31m"; c.y = "\x1b[33m"
  c.c = "\x1b[36m"; c.m = "\x1b[35m"; c.b = "\x1b[1m"; c.n = "\x1b[0m"
  c.d = "\x1b[2m"   // dim
} else {
  Object.assign(c, { g: "", r: "", y: "", c: "", m: "", b: "", n: "", d: "" })
}

// ── Logging ────────────────────────────────────────────────

function ok(msg)    { console.log(`  ${c.g}✓${c.n} ${msg}`) }
function info(msg)  { console.log(`  ${c.c}ℹ${c.n} ${msg}`) }
function warn(msg)  { console.log(`  ${c.y}⚠${c.n} ${msg}`) }
function fail(msg)  { console.log(`  ${c.r}✗${c.n} ${msg}`) }
function title(msg) { console.log(`\n${c.b}${msg}${c.n}`) }
function line()     { console.log() }

// ── Input ──────────────────────────────────────────────────

function ask(query) {
  return new Promise((resolve) => {
    const i = createInterface({ input: process.stdin, output: process.stdout })
    i.question(query, (ans) => { i.close(); resolve(ans.trim()) })
  })
}

async function _maskedInput(prompt) {
  if (process.platform === "win32") {
    const script = `$sec = Read-Host -Prompt ${JSON.stringify(prompt)} -AsSecureString; $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec); [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)`
    try {
      const buf = execSync(`powershell -NoProfile -Command "${script.replace(/"/g, '\\"')}"`, {
        stdio: ["inherit", "pipe", "pipe"], timeout: 30000, windowsHide: true,
      })
      return buf.toString("utf-8").trim()
    } catch { return ask(prompt) }
  } else {
    try {
      execSync("stty -echo", { stdio: "pipe" })
      const val = await ask(prompt)
      execSync("stty echo", { stdio: "pipe" })
      console.log()
      return val
    } catch { return ask(prompt) }
  }
}

function askMasked(query) { return _maskedInput(query) }

function pressEnter(msg) {
  return ask(msg ? `  ${msg} ` : "  Press Enter to continue, or Ctrl+C to cancel. ")
}

async function confirm(prompt, defaultYes = true) {
  if (FLAGS.yes) return true
  const hint = defaultYes ? "[Y/n]" : "[y/N]"
  const ans = (await ask(`  ${prompt} ${hint} `)).toLowerCase()
  if (ans === "") return defaultYes
  return ans === "y" || ans === "yes"
}

async function menu(prompt, items, defaultIdx = 0) {
  console.log(`\n  ${c.b}${prompt}${c.n}`)
  for (let i = 0; i < items.length; i++) {
    const marker = i === defaultIdx ? ` ${c.d}(default)${c.n}` : ""
    console.log(`    ${i + 1}. ${items[i]}${marker}`)
  }
  const ans = await ask(`  Enter [1-${items.length}]: `)
  const num = parseInt(ans, 10)
  if (num >= 1 && num <= items.length) return num - 1
  return defaultIdx
}

async function checklist(title, items, defaults) {
  // items: Array<{id: string, label: string}>
  // defaults: Set<string> of pre-selected IDs
  // Returns: Set<string> of selected IDs
  const selected = new Set(defaults || [])

  console.log(`\n  ${c.b}${title}${c.n}`)
  console.log(`  ${c.d}Use numbers to toggle. Press Enter when done.${c.n}\n`)

  // Display items in pages
  const pageSize = 10
  let offset = 0
  let done = false

  while (!done) {
    const page = items.slice(offset, offset + pageSize)
    const showNav = items.length > pageSize

    for (let i = 0; i < page.length; i++) {
      const idx = offset + i
      const item = items[idx]
      const check = selected.has(item.id) ? "●" : "○"
      console.log(`    ${idx + 1}. ${check} ${item.label}`)
    }

    if (showNav) {
      console.log(``)
      if (offset > 0) console.log(`    p. Previous page`)
      if (offset + pageSize < items.length) console.log(`    n. Next page`)
    }

    const ans = await ask(`  Enter number to toggle, or Enter to finish: `)
    if (ans === "") {
      done = true
    } else if (ans === "n" && showNav && offset + pageSize < items.length) {
      offset += pageSize
    } else if (ans === "p" && showNav && offset > 0) {
      offset -= pageSize
    } else {
      const num = parseInt(ans, 10)
      if (num >= 1 && num <= items.length) {
        const item = items[num - 1]
        if (selected.has(item.id)) selected.delete(item.id)
        else selected.add(item.id)
      }
    }
  }

  return selected
}

// ── Spinner ────────────────────────────────────────────────

let _spinnerInterval = null

function startSpinner(text) {
  if (!process.stdout.isTTY) { console.log(`  ${text}...`); return }
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
    clearInterval(_spinnerInterval); _spinnerInterval = null
    process.stdout.write("\r")
    console.log(success ? `  ${c.g}✓${c.n}` : `  ${c.r}✗${c.n}`)
  }
}

// ── Utility ────────────────────────────────────────────────

function exec(cmd, args = [], opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "pipe", windowsHide: true, ...opts,
    })
    let stdout = "", stderr = ""
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

function backupDir(src) {
  if (!fileExists(src)) return false
  const ts = Date.now()
  const dest = `${BACKUP_DIR}-${ts}`
  fs.mkdirSync(dest, { recursive: true })
  // Copy recursively
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name)
    const d = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      fs.cpSync(s, d, { recursive: true })
    } else {
      fs.copyFileSync(s, d)
    }
  }
  return dest
}

function readDirRecursive(dir) {
  const entries = []
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) entries.push(...readDirRecursive(full))
      else entries.push(full)
    }
  } catch { /* skip */ }
  return entries
}

// ── Detection ──────────────────────────────────────────────

function detectShell() {
  if (process.platform === "win32") return "powershell"
  const fromEnv = process.env.SHELL || ""
  if (fromEnv.includes("zsh"))  return "zsh"
  if (fromEnv.includes("fish")) return "fish"
  return "bash"
}

function hasTool(name) {
  try {
    if (process.platform === "win32") execSync(`where ${name}`, { stdio: "pipe" })
    else execSync(`command -v ${name}`, { stdio: "pipe" })
    return true
  } catch { return false }
}

function detectLanguages() {
  const langs = {}
  langs.typescript = hasTool("tsc") || hasTool("node")
  langs.python = hasTool("python") || hasTool("python3")
  langs.html = true   // always include
  langs.css = true
  langs.json = true
  langs.yaml = hasTool("yq") || hasTool("yamllint")
  langs.bash = process.platform !== "win32" || hasTool("bash")
  langs.docker = hasTool("docker")
  langs.eslint = hasTool("eslint")
  langs.php = hasTool("php")
  langs.sql = hasTool("sqlite3") || hasTool("sqlcmd")
  langs.ansible = hasTool("ansible")
  langs.prisma = hasTool("prisma")
  return langs
}

function detectExistingConfig() {
  const configPath = path.join(CONFIG_DIR, "opencode.jsonc")
  if (!fileExists(configPath)) return null
  try {
    const raw = fs.readFileSync(configPath, "utf-8")
    return { path: configPath, raw }
  } catch { return null }
}

function findNpm() {
  if (process.platform === "win32") {
    try {
      const where = execSync("where npm", { stdio: "pipe" }).toString().trim().split("\n")[0]
      return where
    } catch { return "npm" }
  }
  return "npm"
}

// ── Phase Runner ──────────────────────────────────────────

async function runPhase(num, total, name, fn) {
  process.stdout.write(`  [${num}/${total}] ${name}... `)
  try {
    await fn()
    console.log(`${c.g}✓${c.n}`)
    return true
  } catch (err) {
    console.log(`${c.r}✗${c.n}`)
    fail(err.message || String(err))
    return false
  }
}

// ════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════

async function main() {
  // ── Welcome ────────────────────────────────────────────
  console.log(`
${c.m}╔══════════════════════════════════════════╗${c.n}
${c.m}║${c.n}  ${c.b}JARVIS Terminal Setup${c.n}              ${c.m}║${c.n}
${c.m}║${c.n}  One AI to rule your terminal          ${c.m}║${c.n}
${c.m}╚══════════════════════════════════════════╝${c.n}
${c.d}  Version 1.0.0 • Cross-platform${c.n}
`)

  if (FLAGS.dryRun) {
    warn(`Running in ${c.b}--dry-run${c.n} mode. No changes will be made.\n`)
  }

  // ── Detect environment ────────────────────────────────
  title("Detecting Environment")
  const env = {
    platform: process.platform,
    shell: detectShell(),
    nodeVersion: process.versions.node,
    configDir: CONFIG_DIR,
    homeDir: os.homedir(),
    detectedLangs: detectLanguages(),
    hasGit: hasTool("git"),
    hasPython: hasTool("python3") || hasTool("python"),
    existingConfig: detectExistingConfig(),
  }

  info(`Platform: ${env.platform}`)
  info(`Shell: ${env.shell}`)
  info(`Node.js: v${env.nodeVersion}`)
  info(`Config: ${CONFIG_DIR}`)
  if (env.existingConfig) info("Existing config detected — will offer backup")

  // ── Profile selection ─────────────────────────────────
  title("Choose Your Setup")

  const profileKeys = Object.keys(PROFILES)
  const profileNames = profileKeys.map((k) => {
    const p = PROFILES[k]
    return `${c.b}${p.name}${c.n} — ${p.tagline}\n             ${c.d}${p.description}${c.n}`
  })

  const profileIdx = await menu(
    "Which profile fits you best?",
    [
      `${profileNames[0]}`,
      `${profileNames[1]}`,
      `${profileNames[2]}`,
      `${c.b}Custom${c.n} — Pick individual modules yourself`,
    ],
    profileKeys.indexOf("standard") // default to Standard
  )

  let selectedModules

  if (profileIdx === 3) {
    // Custom — show module checklist
    const allModuleItems = Object.values(MODULES)
      .filter((m) => m.id !== "core") // core is auto-included
      .map((m) => ({
        id: m.id,
        label: `${c.b}${m.name}${c.n}\n             ${c.d}${m.description}${c.n}`,
      }))

    const customSelected = await checklist(
      "Select modules to install (core is always included):",
      allModuleItems,
      new Set(PROFILES.standard.modules.filter((m) => m !== "core"))
    )

    selectedModules = resolveModules(["core", ...customSelected])
  } else {
    selectedModules = resolveModules(profileKeys[profileIdx])
  }

  // ── Show summary ──────────────────────────────────────
  const summary = summarizeSelection(selectedModules)
  line()
  console.log(`  ${c.b}Selected modules (${summary.moduleCount}):${c.n}`)
  for (const m of summary.modules) {
    console.log(`    ${c.c}◆${c.n} ${m.name}${c.d} — ${m.desc}${c.n}`)
  }
  console.log(`  ${c.d}└─ npm packages: ${summary.npmCount}  •  template files: ${summary.fileCount}  •  config sections: ${summary.sectionCount}${c.n}`)

  // ── Provider selection ────────────────────────────────
  title("AI Provider Setup")
  info("Jarvis needs an AI provider to function. Your API key is stored as an environment variable — never in config files.")

  const providerTypes = [
    `${c.b}OpenAI${c.n} — GPT-4o, GPT-4o-mini, o3, etc.`,
    `${c.b}Anthropic${c.n} — Claude Sonnet 4, Claude Haiku 3.5, etc.`,
    `${c.b}Ollama${c.n} — Local, free, runs on your machine`,
    `${c.b}Custom${c.n} — Any OpenAI-compatible endpoint`,
  ]

  const providerIdx = await menu("Which AI provider?", providerTypes, 0)

  const providerTypes_map = ["openai", "anthropic", "ollama", "custom"]
  const providerType = providerTypes_map[providerIdx]

  // Model selection per provider
  const defaultModels = {
    openai: { primary: "gpt-4o", fast: "gpt-4o-mini" },
    anthropic: { primary: "claude-sonnet-4-20250514", fast: "claude-haiku-3-5-20241022" },
    ollama: { primary: "llama3", fast: "llama3" },
    custom: { primary: "gpt-4o", fast: "gpt-4o-mini" },
  }

  const models = { ...defaultModels[providerType] }

  if (providerType !== "ollama") {
    const modelAns = await ask(`  Primary (powerful) model [${models.primary}]: `)
    if (modelAns.trim()) models.primary = modelAns.trim()
    const fastAns = await ask(`  Fast (cheap) model for subagents [${models.fast}]: `)
    if (fastAns.trim()) models.fast = fastAns.trim()
  }

  // API key
  let apiKey = ""
  const envVarName = providerType === "openai" ? "OPENAI_API_KEY"
    : providerType === "anthropic" ? "ANTHROPIC_API_KEY"
    : providerType === "custom" ? "CUSTOM_API_KEY"
    : ""

  if (providerType === "ollama") {
    info("Ollama runs fully local — no API key needed.")
  } else {
    if (process.env[envVarName]) {
      const useExisting = await confirm(`Use existing ${envVarName} environment variable?`, true)
      if (useExisting) {
        apiKey = `\${${envVarName}}`
      }
    }

    if (!apiKey) {
      apiKey = await askMasked(`  Enter your ${providerType} API key: `)
      apiKey = `\${${envVarName}}`
      info(`Key stored as ${envVarName} environment variable reference.`)
    }
  }

  // Optional: custom endpoint
  let customEndpoint = ""
  if (providerType === "custom") {
    customEndpoint = await ask("  Custom API endpoint URL (e.g., https://api.example.com/v1): ")
  }

  // ── GitHub token ──────────────────────────────────────
  let hasGithubToken = false
  if (selectedModules.includes("mcp-github") || selectedModules.includes("mcp-github")) {
    // Note: mcp-github could be selected
    title("GitHub Integration")
    if (process.env.GITHUB_TOKEN) {
      hasGithubToken = await confirm("GitHub token found in environment. Enable GitHub MCP?", true)
    } else {
      const addGithub = await confirm("Enable GitHub integration? (requires a GitHub personal access token)", false)
      if (addGithub) {
        // MCP is already selected — just note the token
        info("You'll need a GitHub token. Set it later as: export GITHUB_TOKEN=ghp_...")
        hasGithubToken = true
      } else {
        // Remove GitHub MCP from selection
        selectedModules = resolveModules(selectedModules.filter((m) => m !== "mcp-github"))
        info("GitHub MCP removed from selection.")
      }
    }
  }

  // ── Autonomy ──────────────────────────────────────────
  title("Autonomy Level")
  const autonomyIdx = await menu(
    "How much freedom should Jarvis have?",
    [
      `${c.b}Full autonomy${c.n} — Jarvis can read, edit, execute any command without asking. ${c.d}(Recommended for power users)${c.n}`,
      `${c.b}Safe mode${c.n} — Jarvis asks before editing files or running commands. ${c.d}(Safer, more verbose)${c.n}`,
    ],
    0
  )
  const autonomy = autonomyIdx === 0 ? "full" : "safe"

  // ── Dry-run check ─────────────────────────────────────
  if (FLAGS.dryRun) {
    line()
    info(`${c.b}Dry run complete — no changes made.${c.n}`)
    line()

    // Show what would be installed
    const npmDeps = getModuleNpmDeps(selectedModules, {})
    // Read package.json for versions
    let pkgVersions = {}
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf-8"))
      pkgVersions = pkg.dependencies || {}
    } catch {}
    const depsWithVersions = getModuleNpmDeps(selectedModules, pkgVersions)

    console.log(`  ${c.b}Would install:${c.n}`)
    console.log(`    • npm packages:  ${depsWithVersions.length > 0 ? depsWithVersions.join(", ") : "(none)"}`)
    console.log(`    • template files:  ${getModuleTemplateFiles(selectedModules).length}`)
    console.log(`    • config sections: ${summary.sectionCount}`)
    console.log(`    • shell alias:  jarvis`)
    console.log(`    • system tools:  rg, fd, jq (if missing)`)
    line()
    return
  }

  // ── Final confirmation ────────────────────────────────
  line()
  console.log(`  ${c.m}════════════════════════════════════════${c.n}`)
  console.log(`  ${c.b}Installation Plan${c.n}`)

  // Read package versions
  let pkgVersions = {}
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf-8"))
    pkgVersions = pkg.dependencies || {}
  } catch {}

  const npmDeps = getModuleNpmDeps(selectedModules, pkgVersions)
  const templateFiles = getModuleTemplateFiles(selectedModules)

  console.log(`  Provider: ${c.b}${providerType}${c.n} → ${models.primary} / ${models.fast}`)
  console.log(`  Autonomy: ${c.b}${autonomy}${c.n}`)
  console.log(`  Modules:  ${c.b}${summary.moduleCount}${c.n} selected`)
  console.log(`  npm:      ${npmDeps.length > 0 ? npmDeps.length + " packages" : "(none)"}`)
  if (npmDeps.length > 0) {
    for (const dep of npmDeps) {
      console.log(`            ${c.d}• ${dep}${c.n}`)
    }
  }
  console.log(`  Templates:${templateFiles.length > 0 ? " " + templateFiles.length + " files" : " (none)"}`)
  if (templateFiles.length > 0) {
    for (const f of templateFiles.slice(0, 8)) {
      console.log(`            ${c.d}• ${f}${c.n}`)
    }
    if (templateFiles.length > 8) {
      console.log(`            ${c.d}• ... and ${templateFiles.length - 8} more${c.n}`)
    }
  }
  console.log(`  Shell:    ${c.b}jarvis${c.n} alias in ${env.shell} profile`)
  console.log(`  ${c.m}════════════════════════════════════════${c.n}`)
  line()

  const proceed = await confirm("Proceed with installation?", true)
  if (!proceed) {
    warn("Installation cancelled.")
    process.exit(0)
  }

  line()

  // ── Backup existing config ───────────────────────────
  let backupPath = null
  if (env.existingConfig) {
    title("Backing Up Existing Config")
    backupPath = backupDir(CONFIG_DIR)
    if (backupPath) {
      ok(`Backup created at: ${backupPath}`)
      info("Run uninstall.sh to restore if needed.")
    } else {
      warn("Could not create backup.")
    }
    line()
  }

  // ── Phases ────────────────────────────────────────────
  const totalPhases = 8
  let phase = 0
  let allSuccess = true

  // Phase 1: Install opencode globally
  phase++
  const phase1_ok = await runPhase(phase, totalPhases, "Installing opencode globally", async () => {
    if (hasTool("opencode")) {
      info("opencode already installed.")
      const upgrade = await confirm("Upgrade to latest version?", false)
      if (!upgrade) return
    }
    const npmCmd = findNpm()
    await exec(npmCmd, ["install", "-g", "@opencode-ai/opencode@latest"])
  })
  if (!phase1_ok) allSuccess = false

  // Phase 2: Install selected npm packages
  phase++
  const phase2_ok = await runPhase(phase, totalPhases, "Installing npm packages", async () => {
    if (npmDeps.length === 0) {
      info("No npm packages to install.")
      return
    }
    const npmCmd = findNpm()
    // Install into config dir so they're co-located with the config
    fs.mkdirSync(CONFIG_DIR, { recursive: true })
    // Batch install for speed
    await exec(npmCmd, ["install", "--prefix", CONFIG_DIR, ...npmDeps])
  })
  if (!phase2_ok) allSuccess = false

  // Phase 3: Generate config
  phase++
  const phase3_ok = await runPhase(phase, totalPhases, "Generating opencode configuration", async () => {
    const ctx = {
      platform: env.platform,
      shell: env.shell,
      nodeBinDir: NODE_BIN_DIR,
      homeDir: env.homeDir,
      configDir: CONFIG_DIR,
      provider: { type: providerType, primary: models.primary, fast: models.fast },
      apiKey: apiKey,
      customEndpoint: customEndpoint,
      autonomy: autonomy,
      selectedModules: new Set(selectedModules),
      hasGithubToken: hasGithubToken,
      langs: env.detectedLangs,
    }

    const config = buildConfig(ctx)
    const configPath = path.join(CONFIG_DIR, "opencode.jsonc")
    writeFile(configPath, JSON.stringify(config, null, 2))

    // Also write as JS for reference (for import)
    writeFile(path.join(CONFIG_DIR, "opencode.json"), JSON.stringify(config, null, 2))
  })
  if (!phase3_ok) allSuccess = false

  // Phase 4: Copy template files
  phase++
  const phase4_ok = await runPhase(phase, totalPhases, "Copying agent, skill, and plugin files", async () => {
    if (templateFiles.length === 0) {
      info("No template files to copy.")
      return
    }

    for (const relPath of templateFiles) {
      const src = path.join(TEMPLATE_DIR, relPath)
      const dst = path.join(CONFIG_DIR, relPath)
      if (fileExists(src)) {
        // Backup existing file
        if (fileExists(dst) && !FLAGS.yes) {
          const backupFile = dst + ".jarvis-backup"
          fs.copyFileSync(dst, backupFile)
        }
        copyFile(src, dst)
      } else {
        warn(`Template not found: ${relPath}`)
      }
    }
  })
  if (!phase4_ok) allSuccess = false

  // Phase 5: Shell integration
  phase++
  const phase5_ok = await runPhase(phase, totalPhases, "Adding jarvis alias to shell profile", async () => {
    const aliasLine = `alias jarvis='opencode --agent jarvis'`
    let profilePath = ""

    if (env.platform === "win32") {
      // PowerShell profile — write a temp script to avoid quoting hell
      const psScript = [
        "$profilePath = Join-Path $HOME 'Documents/PowerShell/Microsoft.PowerShell_profile.ps1'",
        "$aliasLine = 'function jarvis { opencode --agent jarvis @args }'",
        "if (-not (Test-Path $profilePath)) {",
        "  New-Item -ItemType File -Path $profilePath -Force | Out-Null",
        "}",
        "$content = Get-Content $profilePath -Raw",
        "if ($content -notmatch [regex]::Escape($aliasLine)) {",
        '  Add-Content $profilePath "`r`n$aliasLine"',
        "  Write-Host 'Added jarvis alias to PowerShell profile: ' $profilePath",
        "} else {",
        "  Write-Host 'jarvis alias already exists in profile'",
        "}"
      ].join(";`n")

      const tmpScript = path.join(os.tmpdir(), "jarvis-add-alias.ps1")
      fs.writeFileSync(tmpScript, psScript, "utf-8")
      execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tmpScript}"`, { stdio: "pipe" })
      fs.unlinkSync(tmpScript)
      ok("jarvis function added to PowerShell profile")
    } else {
      // Unix: bash/zsh/fish
      const rcFiles = {
        bash: path.join(env.homeDir, ".bashrc"),
        zsh: path.join(env.homeDir, ".zshrc"),
        fish: path.join(env.homeDir, ".config", "fish", "config.fish"),
      }

      const target = rcFiles[env.shell]
      if (target && fileExists(target)) {
        const content = readFile(target) || ""
        if (!content.includes(aliasLine)) {
          writeFile(target, content + "\n" + aliasLine + "\n")
          ok(`Alias added to ${target}`)
        } else {
          info("jarvis alias already exists in profile.")
        }
      } else if (target) {
        writeFile(target, aliasLine + "\n")
        ok(`Created ${target} with jarvis alias`)
      }

      // Also try bashrc/zshrc as fallback
      for (const [shell, rcPath] of Object.entries(rcFiles)) {
        if (rcPath === target) continue // already handled
        if (fileExists(rcPath)) {
          const content = readFile(rcPath) || ""
          if (!content.includes(aliasLine)) {
            writeFile(rcPath, content + "\n" + aliasLine + "\n")
            ok(`Alias also added to ${rcPath} (fallback)`)
          }
        }
      }
    }
  })
  if (!phase5_ok) allSuccess = false

  // Phase 6: Install system tools (rg, fd, jq)
  phase++
  const phase6_ok = await runPhase(phase, totalPhases, "Checking system tools (rg, fd, jq)", async () => {
    const missing = []
    if (!hasTool("rg")) missing.push("rg (ripgrep)")
    if (!hasTool("fd")) missing.push("fd")
    if (!hasTool("jq")) missing.push("jq")

    if (missing.length === 0) {
      info("All system tools found.")
      return
    }

    warn(`Missing: ${missing.join(", ")}`)
    const installNow = await confirm("Attempt to install missing tools?", true)
    if (!installNow) {
      warn("Skipping system tool installation.")
      return
    }

    // Tries best-effort install (won't fail phase)
    if (env.platform === "win32") {
      for (const tool of ["ripgrep", "fd", "jq"]) {
        const isMissing = (tool === "ripgrep" && !hasTool("rg")) ||
                          (tool === "fd" && !hasTool("fd")) ||
                          (tool === "jq" && !hasTool("jq"))
        if (isMissing) {
          try {
            if (hasTool("winget")) {
              const pkgName = tool === "ripgrep" ? "BurntSushi.ripgrep.MSVC" : tool === "fd" ? "sharkdp.fd" : "stedolan.jq"
              await exec("winget", ["install", pkgName, "--silent", "--accept-package-agreements"], { timeout: 60000 })
            } else if (hasTool("scoop")) {
              await exec("scoop", ["install", tool], { timeout: 60000 })
            }
          } catch { /* best effort */ }
        }
      }
    } else {
      for (const tool of ["ripgrep", "fd", "jq"]) {
        const isMissing = (tool === "ripgrep" && !hasTool("rg")) ||
                          (tool === "fd" && !hasTool("fd")) ||
                          (tool === "jq" && !hasTool("jq"))
        if (isMissing) {
          try {
            if (hasTool("brew")) {
              await exec("brew", ["install", tool], { timeout: 60000 })
            } else if (hasTool("apt-get")) {
              const aptPkg = tool === "ripgrep" ? "ripgrep" : tool === "fd" ? "fd-find" : "jq"
              await exec("sudo", ["apt-get", "install", "-y", aptPkg], { timeout: 60000 })
            }
          } catch { /* best effort */ }
        }
      }
    }

    // Report results
    const stillMissing = []
    if (!hasTool("rg")) stillMissing.push("rg")
    if (!hasTool("fd")) stillMissing.push("fd")
    if (!hasTool("jq")) stillMissing.push("jq")
    if (stillMissing.length > 0) {
      warn(`Still missing: ${stillMissing.join(", ")}. Install manually for full functionality.`)
    } else {
      ok("All system tools are available.")
    }
  })
  if (!phase6_ok) allSuccess = false

  // Phase 7: Verify installation
  phase++
  const phase7_ok = await runPhase(phase, totalPhases, "Verifying installation", async () => {
    const checks = []

    // Check opencode
    try {
      const ver = execSync("opencode --version", { stdio: "pipe" }).toString().trim()
      checks.push({ name: "opencode", ok: true, detail: ver })
    } catch {
      checks.push({ name: "opencode", ok: false, detail: "not found" })
    }

    // Check config file
    const configPath = path.join(CONFIG_DIR, "opencode.jsonc")
    checks.push({ name: "config file", ok: fileExists(configPath), detail: configPath })

    // Check npm installed packages
    for (const dep of npmDeps) {
      const pkgName = dep.split("@")[0]
      const pkgPath = path.join(CONFIG_DIR, "node_modules", pkgName)
      checks.push({ name: `npm: ${pkgName}`, ok: fileExists(pkgPath), detail: pkgPath })
    }

    // Check template files
    for (const relPath of templateFiles) {
      const dst = path.join(CONFIG_DIR, relPath)
      checks.push({ name: `file: ${relPath}`, ok: fileExists(dst), detail: dst })
    }

    // Count results
    const failed = checks.filter((c) => !c.ok)
    const passed = checks.filter((c) => c.ok)

    if (failed.length > 0) {
      warn(`${failed.length} check(s) failed:`)
      for (const f of failed) {
        console.log(`         ${c.r}✗${c.n} ${f.name} — ${f.detail}`)
      }
      return false
    }

    ok(`All ${checks.length} checks passed.`)
    return true
  })
  if (!phase7_ok) allSuccess = false

  // ── Success / Failure ─────────────────────────────────
  line()
  if (allSuccess) {
    console.log(`  ${c.m}╔══════════════════════════════════════════╗${c.n}`)
    console.log(`  ${c.m}║${c.n}  ${c.g}${c.b}Installation Complete!${c.n}                 ${c.m}║${c.n}`)
    console.log(`  ${c.m}╚══════════════════════════════════════════╝${c.n}`)
    line()
    console.log(`  ${c.b}Quick start:${c.n}`)
    console.log(`    ${c.c}1.${c.n} Close and re-open your terminal (or source your profile)`)
    console.log(`    ${c.c}2.${c.n} Type: ${c.b}jarvis${c.n}`)
    console.log(`    ${c.c}3.${c.n} Start asking!`)
    line()

    if (selectedModules.includes("mcp-browser")) {
      console.log(`  ${c.y}Note:${c.n} For browser automation, install Playwright browser binaries:`)
      console.log(`    npx playwright install chromium`)
      line()
    }

    console.log(`  ${c.d}Config:       ~/.config/opencode/opencode.jsonc${c.n}`)
    console.log(`  ${c.d}Agents:       ~/.config/opencode/agents/*.md${c.n}`)
    console.log(`  ${c.d}Plugins:      ~/.config/opencode/plugins/jarvis-optimizer.ts${c.n}`)
    console.log(`  ${c.d}Uninstall:    cd Jarvis && bash uninstall.sh${c.n}`)
    if (backupPath) {
      console.log(`  ${c.d}Backup:       ${backupPath}${c.n}`)
    }
  } else {
    console.log(`  ${c.r}╔══════════════════════════════════════════╗${c.n}`)
    console.log(`  ${c.r}║${c.n}  ${c.b}Installation incomplete — some phases failed${c.n}  ${c.r}║${c.n}`)
    console.log(`  ${c.r}╚══════════════════════════════════════════╝${c.n}`)
    line()
    console.log(`  Re-run the installer to retry failed phases.`)
    console.log(`  It will detect existing files and offer to upgrade.`)
    if (backupPath) {
      console.log(`  Backup: ${backupPath}`)
    }
  }

  line()
  process.exit(allSuccess ? 0 : 1)
}

main().catch((err) => {
  console.error(`\n  ${c.r}✗${c.n} Fatal error:`, err.message)
  process.exit(1)
})
