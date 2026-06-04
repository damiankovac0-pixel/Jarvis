import path from "node:path"
import type { Plugin } from "@opencode-ai/plugin"

/**
 * Jarvis Optimizer Plugin
 *
 * Enforces efficiency defaults for all Jarvis subagents:
 * - Output compaction (truncation by chars and lines)
 * - Low temperature for subagent determinism
 * - PATH additions for npm binaries
 * - Batch tool support
 * - Efficiency layer injected into system prompt
 *
 * Model routing is handled by the generated opencode.jsonc;
 * this plugin only provides fallback defaults.
 */

const MAX_TOOL_CHARS = 12000
const MAX_TOOL_LINES = 240
const SUBAGENTS = [
  "sysadmin", "webnav", "automation", "memory-keeper",
  "explore", "general", "summary", "title", "compaction",
]

function compact(text: string) {
  if (!text) return text
  const lines = text.split(/\r?\n/)
  let out =
    lines.length > MAX_TOOL_LINES
      ? lines.slice(0, MAX_TOOL_LINES).join("\n") +
        `\n...[jarvis truncated ${lines.length - MAX_TOOL_LINES} lines]`
      : text
  if (out.length > MAX_TOOL_CHARS)
    out =
      out.slice(0, MAX_TOOL_CHARS) +
      `\n...[jarvis truncated ${out.length - MAX_TOOL_CHARS} chars]`
  return out
}

export default (async () => {
  return {
    config: async (cfg) => {
      // Sensible defaults — the generated opencode.jsonc sets these explicitly,
      // so this only fires if the user removes those settings.
      cfg.tool_output = { max_lines: 200, max_bytes: 16000, ...(cfg.tool_output ?? {}) }
      cfg.compaction = {
        auto: true,
        prune: true,
        tail_turns: 3,
        preserve_recent_tokens: 12000,
        reserved: 8192,
        ...(cfg.compaction ?? {}),
      }
      cfg.experimental = { batch_tool: true, mcp_timeout: 8000, ...(cfg.experimental ?? {}) }
    },

    "shell.env": async (_input, output) => {
      // Add node_modules/.bin to PATH so child processes can find
      // the npm-installed tools (rg, fd via npm, etc.)
      const homeDir = process.env.HOME || process.env.USERPROFILE || ""
      const nodeBinDir = path.join(homeDir, ".config", "opencode", "node_modules", ".bin")
      const currentPath = output.env.PATH || output.env.Path || process.env.PATH || ""
      const sep = process.platform === "win32" ? ";" : ":"
      if (nodeBinDir && !currentPath.toLowerCase().includes(nodeBinDir.toLowerCase())) {
        output.env.PATH = `${nodeBinDir}${sep}${currentPath}`
      }
      output.env.JARVIS_MODE = "max-efficiency"
    },

    "experimental.chat.system.transform": async (_input, output) => {
      output.system.push(
        [
          "Jarvis efficiency layer:",
          "- Use the strongest primary model for complex reasoning/final decisions.",
          "- Use the configured fast model (small_model) for subagents: parallel exploration, web extraction, automation drafts, memory, and low-risk execution to save tokens.",
          "- Batch independent tool calls; prefer glob/grep/read/rg/fd/jq over broad shell dumps.",
          "- Keep final answers concise; summarize large outputs and save full data to files when useful.",
          "- Do not load irrelevant skills or MCPs; choose the cheapest sufficient tool.",
        ].join("\n")
      )
    },

    "chat.params": async (input, output) => {
      if (SUBAGENTS.includes(input.agent)) {
        output.temperature = 0.2
        output.maxOutputTokens = Math.min(output.maxOutputTokens ?? 6000, 6000)
      }
    },

    "tool.execute.after": async (_input, output) => {
      if (typeof output.output === "string") output.output = compact(output.output)
    },
  }
}) satisfies Plugin
