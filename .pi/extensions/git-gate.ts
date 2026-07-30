/**
 * Git Gate Extension
 *
 * Prompts for confirmation before `git commit` or `git push`.
 * After a confirmed push succeeds, updates CHANGELOG.md with
 * commit messages parsed from the bash command.
 * Multiple pushes in the same pi session append to one entry.
 *
 * ⚠️  PATH GOTCHA: Bash commands use Git Bash paths like /c/Users/...
 *     which path.isAbsolute() returns true for on Windows (they look
 *     like Unix absolute paths).  normalizePath() converts them to
 *     Windows C:\... before any fs operation.  Do NOT remove this —
 *     every attempt to skip it (execSync, pi.exec, -C flag) has
 *     failed because extensions run in the pi project cwd, not the
 *     bash command's cd target.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isBashToolResult } from "@earendil-works/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";

const GIT_COMMIT_PATTERN = /\bgit\s+commit\b/i;
const GIT_PUSH_PATTERN = /\bgit\s+push\b/i;
const GIT_WRITE_PATTERNS = [GIT_COMMIT_PATTERN, GIT_PUSH_PATTERN];

// ── helpers ──

/** Convert Git Bash paths (/c/foo) to Windows (C:\foo) for fs operations. */
function normalizePath(p: string): string {
  const m = p.match(/^\/([a-zA-Z])\/(.*)/);
  if (m) return `${m[1].toUpperCase()}:\\${m[2].replace(/\//g, "\\")}`;
  return p;
}

/** Extract the effective working directory from a bash command string. */
function extractCwd(command: string, projectCwd: string): string {
  const cdMatch = command.match(
    /(?:^|&&\s*|;\s*)cd\s+(['"]?)([^;&|]+?)\1(?=\s*(?:&&|;|\||$))/,
  );
  if (cdMatch) {
    const target = cdMatch[2].trim();
    const resolved = path.isAbsolute(target) ? target : path.resolve(projectCwd, target);
    return normalizePath(resolved);
  }
  return projectCwd;
}

/** Parse all `-m "message"` commit messages from a bash command.
 *  Handles multiline messages (s flag makes . match \n),
 *  multiple -m flags (git joins paragraphs with blank lines),
 *  and unquoted single-line messages as fallback. */
function parseCommitMessages(command: string): string[] {
  const messages: string[] = [];
  // Quoted messages: -m "..." or -m '...' (s flag = dotall for multiline)
  const re = /-m\s+(["'])(.*?)\1/gs;
  let match;
  while ((match = re.exec(command)) !== null) {
    messages.push(match[2]);
  }
  // Unquoted single-line fallback: -m message text
  if (messages.length === 0) {
    const unquoted = command.match(/-m\s+([^;&|]+?)(?=\s*(?:&&|;|\||$))/);
    if (unquoted) {
      let msg = unquoted[1].trim();
      // Strip surrounding quotes if present (partial quote match)
      if (/^["']/.test(msg) && /["']$/.test(msg)) {
        msg = msg.slice(1, -1);
      }
      messages.push(msg);
    }
  }
  return messages;
}

// ── extension ──

export default function (pi: ExtensionAPI) {
  let sessionId: string | null = null;
  const pendingPushes = new Map<string, { cwd: string; messages: string[] }>();

  pi.on("session_start", (_event, ctx) => {
    sessionId = ctx.sessionManager.getSessionFile() ?? `session-${Date.now()}`;
    pendingPushes.clear();
  });

  let sessionMsgs: string[] = [];

  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "bash") return undefined;
    const command = event.input.command as string;

    // Accumulate commit messages as they're made
    if (GIT_COMMIT_PATTERN.test(command)) {
      sessionMsgs.push(...parseCommitMessages(command));
    }

    if (!GIT_WRITE_PATTERNS.some((p) => p.test(command))) return undefined;
    if (!ctx.hasUI) {
      return { block: true, reason: "git commit/push blocked (headless mode)." };
    }

    const choice = await ctx.ui.select(
      `Git write operation:\n  ${command.slice(0, 120)}${command.length > 120 ? "..." : ""}`,
      ["Approve", "Block", "Send feedback →"],
    );

    if (!choice || choice === "Block") {
      return { block: true, reason: "git commit/push blocked by user" };
    }

    if (choice === "Send feedback →") {
      const feedback = await ctx.ui.input("Send feedback to the model:");
      if (!feedback) {
        return { block: true, reason: "git commit/push blocked by user" };
      }
      return { block: true, reason: feedback };
    }

    // On push: flush accumulated commit messages to changelog
    if (GIT_PUSH_PATTERN.test(command)) {
      const cwd = extractCwd(command, ctx.cwd);
      const msgs = [...new Set([...sessionMsgs, ...parseCommitMessages(command)])];
      pendingPushes.set(event.toolCallId, { cwd, messages: msgs });
    }

    return undefined;
  });

  pi.on("tool_result", async (event, ctx) => {
    const p = pendingPushes.get(event.toolCallId);
    if (!p) return undefined;
    pendingPushes.delete(event.toolCallId);

    if (!isBashToolResult(event)) return undefined;
    if (event.isError) return undefined;
    if (p.messages.length === 0) return undefined;

    sessionMsgs = [];

    const changelogPath = path.join(p.cwd, "CHANGELOG.md");
    try {
      updateChangelog(changelogPath, sessionId!, p.messages);
      if (ctx.hasUI) {
        ctx.ui.notify(
          `Changelog updated (${p.messages.length} commit${p.messages.length > 1 ? "s" : ""})`,
          "info",
        );
      }
    } catch (err) {
      if (ctx.hasUI) {
        ctx.ui.notify(
          `Changelog update failed: ${err instanceof Error ? err.message : err}`,
          "warning",
        );
      }
    }

    return undefined;
  });
}

// ── changelog helpers ──

/** Format a commit message as an indented markdown bullet.
 *  First line gets "- " prefix, continuation lines get "  " indent
 *  so they stay inside the bullet in markdown rendering. */
function formatBullet(message: string): string {
  const lines = message.split("\n");
  return lines.map((line, i) => (i === 0 ? `- ${line}` : `  ${line}`)).join("\n");
}

function updateChangelog(filePath: string, sid: string, messages: string[]): void {
  const marker = `<!-- pi-session: ${sid} -->`;
  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    content = "# Changelog\n";
  }

  if (content.includes(marker)) {
    const bullets = messages.map(formatBullet).join("\n");
    const idx = content.indexOf(marker);
    const ins = content.indexOf("\n", idx);
    content = content.slice(0, ins + 1) + bullets + "\n" + content.slice(ins + 1);
  } else {
    const today = new Date().toISOString().split("T")[0];
    const bullets = messages.map(formatBullet).join("\n");
    const section = ["", `## [Session] — ${today}`, marker, "", bullets, ""].join("\n");
    const nl = content.indexOf("\n");
    content =
      nl === -1
        ? content + section
        : content.slice(0, nl + 1) + section + content.slice(nl + 1);
  }
  fs.writeFileSync(filePath, content, "utf-8");
}
