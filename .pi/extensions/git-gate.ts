/**
 * Git Gate Extension
 *
 * Prompts for confirmation before `git commit` or `git push`.
 * After a confirmed push succeeds, updates CHANGELOG.md with all
 * commits pushed since the last push. Multiple pushes in the same
 * pi session append to one session entry (no duplicate entries).
 *
 * Uses ctx.ui.confirm for a simple yes/no prompt — avoids select() rendering issues.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isBashToolResult } from "@earendil-works/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";

const GIT_COMMIT_PATTERN = /\bgit\s+commit\b/i;
const GIT_PUSH_PATTERN = /\bgit\s+push\b/i;
const GIT_WRITE_PATTERNS = [GIT_COMMIT_PATTERN, GIT_PUSH_PATTERN];

interface PendingPush {
  oldRemoteHead: string | null; // null if we couldn't determine it
  branch: string;
}

export default function (pi: ExtensionAPI) {
  // ── per-session state ──
  let sessionId: string | null = null;
  const pendingPushes = new Map<string, PendingPush>();

  pi.on("session_start", (_event, ctx) => {
    sessionId = ctx.sessionManager.getSessionFile() ?? `session-${Date.now()}`;
    pendingPushes.clear();
  });

  // ── intercept git commit / push ──
  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "bash") return undefined;

    const command = event.input.command as string;
    if (!GIT_WRITE_PATTERNS.some((p) => p.test(command))) return undefined;

    if (!ctx.hasUI) {
      return {
        block: true,
        reason: "git commit/push blocked (headless mode). Run manually.",
      };
    }

    const ok = await ctx.ui.confirm(
      "Git write operation",
      `Allow?\n\n  ${command}`,
    );

    if (!ok) {
      return { block: true, reason: "git commit/push blocked by user" };
    }

    // ── for pushes: capture remote HEAD so we can diff after success ──
    if (GIT_PUSH_PATTERN.test(command)) {
      try {
        const { stdout: branchOut } = await pi.exec("git", [
          "branch",
          "--show-current",
        ]);
        const branch = branchOut.trim();
        let oldRemoteHead: string | null = null;
        if (branch) {
          try {
            const { stdout: remoteOut } = await pi.exec("git", [
              "rev-parse",
              `origin/${branch}`,
            ]);
            oldRemoteHead = remoteOut.trim();
          } catch {
            // remote tracking branch doesn't exist yet (first push)
            oldRemoteHead = null;
          }
        }
        pendingPushes.set(event.toolCallId, { oldRemoteHead, branch });
      } catch {
        // not a git repo or branch detection failed — skip changelog
      }
    }

    return undefined;
  });

  // ── after push succeeds, update changelog ──
  pi.on("tool_result", async (event, ctx) => {
    const pending = pendingPushes.get(event.toolCallId);
    if (!pending) return undefined;
    pendingPushes.delete(event.toolCallId);

    // Only act on successful bash executions
    if (!isBashToolResult(event)) return undefined;
    if (event.isError) return undefined;

    // Determine which commits were pushed
    let range: string | null = null;
    if (pending.oldRemoteHead) {
      range = `${pending.oldRemoteHead}..HEAD`;
    } else {
      // First push — grab all commits on this branch
      range = `HEAD`;
    }

    let commitMessages: string[] = [];
    try {
      // Get commits that were pushed (max 20 to be safe)
      const { stdout: logOut } = await pi.exec("git", [
        "log",
        "--oneline",
        "-20",
        range,
      ]);
      const lines = logOut.trim().split("\n").filter(Boolean);
      // Parse "abc1234 Commit message here" → "Commit message here"
      commitMessages = lines.map((line) =>
        line.replace(/^[0-9a-f]+\s+/, "").trim(),
      );
    } catch {
      // Couldn't get log — skip changelog update
      return undefined;
    }

    if (commitMessages.length === 0) return undefined;

    // Update CHANGELOG.md
    const changelogPath = path.join(ctx.cwd, "CHANGELOG.md");
    try {
      updateChangelog(changelogPath, sessionId!, commitMessages);
      if (ctx.hasUI) {
        ctx.ui.notify(
          `Changelog updated (${commitMessages.length} commit${commitMessages.length > 1 ? "s" : ""})`,
          "info",
        );
      }
    } catch (err) {
      // Non-fatal: changelog update failed, but push succeeded
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

function updateChangelog(
  changelogPath: string,
  sessionId: string,
  messages: string[],
): void {
  const sessionMarker = `<!-- pi-session: ${sessionId} -->`;

  let content: string;
  try {
    content = fs.readFileSync(changelogPath, "utf-8");
  } catch {
    // No changelog yet — create one
    content = "# Changelog\n";
  }

  if (content.includes(sessionMarker)) {
    // Append new bullets to the existing session section
    const newBullets = messages.map((m) => `- ${m}`).join("\n");
    // Insert after the session marker line
    const markerIndex = content.indexOf(sessionMarker);
    const insertAt = content.indexOf("\n", markerIndex);
    content =
      content.slice(0, insertAt + 1) + newBullets + "\n" + content.slice(insertAt + 1);
  } else {
    // Create a new session section
    const today = new Date().toISOString().split("T")[0];
    const bullets = messages.map((m) => `- ${m}`).join("\n");
    const newSection = [
      "",
      `## [Session] — ${today}`,
      sessionMarker,
      "",
      bullets,
      "",
    ].join("\n");

    // Insert after "# Changelog" header, before any versioned entries
    const headerLine = content.indexOf("\n");
    if (headerLine === -1) {
      content += newSection;
    } else {
      content =
        content.slice(0, headerLine + 1) +
        newSection +
        content.slice(headerLine + 1);
    }
  }

  fs.writeFileSync(changelogPath, content, "utf-8");
}
