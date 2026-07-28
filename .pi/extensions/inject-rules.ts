/**
 * Inject Project Rules Extension
 *
 * Reads AGENTS.md and design.md from the project root and appends them to
 * the system prompt on every turn. This ensures the agent always has the
 * project's coding rules and design system in context, even in fresh sessions.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readFileSync } from "node:fs";
import { join } from "node:path";

let cachedRules: string | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds — re-read on file edits without restarting

export default function (pi: ExtensionAPI) {
  pi.on("before_agent_start", async (event, ctx) => {
    const now = Date.now();

    // Cache rules for 30s to avoid repeated disk reads during rapid turns
    if (!cachedRules || now - cachedAt > CACHE_TTL_MS) {
      const parts: string[] = [];

      try {
        const agents = readFileSync(join(ctx.cwd, "AGENTS.md"), "utf-8");
        parts.push("## Project AGENTS.md\n\n" + agents);
      } catch {
        // AGENTS.md missing — skip
      }

      try {
        const design = readFileSync(join(ctx.cwd, "design.md"), "utf-8");
        parts.push("## Design System (design.md)\n\n" + design);
      } catch {
        // design.md missing — skip
      }

      cachedRules = parts.length > 0 ? parts.join("\n\n---\n\n") : null;
      cachedAt = now;
    }

    if (!cachedRules) {
      ctx.ui.setStatus("rules", "");
      return;
    }

    // Visible confirmation — status bar indicator
    ctx.ui.setStatus("rules", "📋 AGENTS.md + design.md loaded");

    return {
      systemPrompt:
        event.systemPrompt +
        "\n\n<project_rules>\n" +
        "The following rules are from the project repository and MUST be followed:\n\n" +
        cachedRules +
        "\n</project_rules>",
    };
  });
}
