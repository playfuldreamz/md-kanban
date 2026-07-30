/**
 * File Size Guard Extension
 *
 * Blocks write/edit tool calls that would push a file past 500 lines.
 * Prompts the user: "Refactor?" → Yes blocks the edit and tells the
 * agent to create a refactor plan.  No allows the oversized file
 * (explicit user override).
 *
 * Exclusions below define which files are exempt (config, JSON, CSS, etc).
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";

// ── configuration ──

const MAX_LINES = 500;

/** Tiny skip-list of obvious non-code — everything else in any language is gated. */
const SKIP_PATTERNS: RegExp[] = [
  /\.json$/,
  /\.md$/,
  /\.css$/,
  /\.svg$/,
  /\.html$/,
  /\.d\.ts$/,
  /lock\.(json|yaml)$/,
  /\.env/,
  /\.eslintrc/,
  /\.prettierrc/,
  /CHANGELOG/,
];

function shouldSkip(filePath: string): boolean {
  return SKIP_PATTERNS.some((p) => p.test(filePath));
}

/** Count newlines in a string. */
function countLinesIn(content: string): number {
  return content.split("\n").length;
}

/**
 * Simulate applying edits to a file and return the final content.
 * Each edit replaces oldText with newText in the original content.
 */
function applyEdits(original: string, edits: { oldText: string; newText: string }[]): string {
  let result = original;
  for (const edit of edits) {
    result = result.replace(edit.oldText, edit.newText);
  }
  return result;
}

// ── extension ──

export default function (pi: ExtensionAPI) {
  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "write" && event.toolName !== "edit") return undefined;

    const filePath = event.input.path as string;
    if (!filePath || shouldSkip(filePath)) return undefined;

    let finalContent: string;

    if (event.toolName === "write") {
      finalContent = event.input.content as string;
    } else {
      // edit tool — simulate applying edits to current file
      const edits = event.input.edits as { oldText: string; newText: string }[] | undefined;
      if (!edits || edits.length === 0) return undefined;

      const absPath = path.resolve(ctx.cwd, filePath);
      let current: string;
      try {
        current = fs.readFileSync(absPath, "utf-8");
      } catch {
        // File doesn't exist yet — can't check, allow the edit
        return undefined;
      }
      finalContent = applyEdits(current, edits);
    }

    const lines = countLinesIn(finalContent);
    if (lines <= MAX_LINES) return undefined;

    // ── would exceed limit — ask user ──
    if (!ctx.hasUI) {
      return { block: true, reason: `File ${filePath} would be ${lines} lines (max ${MAX_LINES}).` };
    }

    const ok = await ctx.ui.confirm(
      "File size limit",
      `${filePath} would be ${lines} lines (max ${MAX_LINES}).\n\nProceed anyway?`,
    );

    if (!ok) {
      // User said No — block and tell agent to refactor
      return {
        block: true,
        reason: [
          `File ${filePath} would be ${lines} lines (max ${MAX_LINES}).`,
          "Create a refactor plan to split this file into smaller modules",
          "(e.g., extract helpers to lib/, split components, etc.)",
          "before implementing the change.",
        ].join("\n"),
      };
    }

    // User said Yes — accept the oversized file
    return undefined;
  });
}
