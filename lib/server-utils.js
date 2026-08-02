/**
 * Shared utilities for the md-kanban server.
 *
 * Card lookup, creation, and the format-guide preamble. Used by both
 * server.js and lib/routes.js.
 */

const { parseMarkdown } = require('./parser');
const { serializeBoard } = require('./writer');
const { loadPlugins, parsePluginConfig } = require('./plugin-runner');
const fs = require('fs');

/** Format guide prepended to every TODO.md. */
const FORMAT_GUIDE = `<!--
  This file powers a live Kanban board (npx md-kanban).

  @plugins due-dates, warning-cards, assignees

  ============================================================================
  STRUCTURE
  ============================================================================
    ## To Do
    ## In Progress
    ## Done
  Only H2 (##) sections become columns. Drag cards between them to change status.
  Non-standard columns (e.g. "🔴 Critical") trigger an auto-conversion prompt
  offering to migrate to the standard workflow above.

  ============================================================================
  CARD FORMAT
  ============================================================================
    - [ ] **Title** — Description with #tags
    - [x] **Title** — Description   (x = done → strikethrough)
  Every task MUST start with "- [ ]" or "- [x]" at the beginning of the line.
  Bold the title with **double asterisks**. Use an em dash (—) before the
  description, details, and #tags.

  ============================================================================
  SUB-TASKS (nested checkboxes)
  ============================================================================
    - [ ] **Parent task** — Description
      - [x] Completed sub-task
      - [ ] Pending sub-task
        - [ ] Third-level sub-task
    Indent with 2 spaces per level. Unlimited nesting depth in the data model.
    The board renders up to 4 visual levels with progress badges (e.g. "▸ 2/5").

  ============================================================================
  TAGS
  ============================================================================
  Any #tag in a description renders as a colored badge in the board:
    #critical (red)    #important (amber)    #polish (green)
    #bug  #feature  #docs  #frontend  #backend — any custom tag works
  Unknown tags get auto-assigned colors from a 16-color palette.
  Custom colors via @priorities in the preamble:
    @priorities {"critical":{"label":"Critical","color":"bg-red-500","ring":"ring-red-500/30"}}

  ============================================================================
  PLUGINS
  ============================================================================
  Enable plugins with @plugins in the preamble (comma-separated names):
    @plugins due-dates, warning-cards, assignees

  ── due-dates ──
  Add a due date to any card using either format:
    due:YYYY-MM-DD   (keyword — e.g. due:2026-08-15)
    📅 YYYY-MM-DD     (emoji — e.g. 📅 2026-08-15)
  Renders a colored badge: blue (upcoming), amber (today/soon), red (overdue).
  Overdue badges pulse to draw attention. Press Cmd+K for a "Due Soon" filter.

  ── warning-cards ──
  Prefix a card with - [!] instead of - [ ] to add an amber left border:
    - [!] **Urgent fix** — Needs immediate attention
  Toggle warning on/off in the card's edit dialog.

  ── assignees ──
  Mention @username in descriptions to assign people:
    - [ ] **Fix bug** — @alice @bob review the login flow
  Renders as colored initial chips (Ⓐ Alice, Ⓑ Bob) on the card.
  Configure display names and colors in the preamble:
    @assignees {"alice":{"label":"Alice","color":"bg-pink-500","ring":"ring-pink-500/30"}}

  ============================================================================
  PINNED CARDS
  ============================================================================
  Pin a card to the top of its column by adding <!-- pinned -- > anywhere
  in the card line. Toggle via the hover-revealed pin icon in the board.
    - [ ] **Important reference** — Keep at top <!-- pinned -- >

  ============================================================================
  CREATION DATES
  ============================================================================
  Every new card gets an auto-stamped creation date:
    <!-- created:2026-07-29 -- >
  Visible in the board as "Created 3 days ago" on card hover.
  Handled automatically — no manual editing needed.

  ============================================================================
  AUTO-CORRECT BEHAVIOR
  ============================================================================
  The board automatically keeps your columns organized:
    • Cards marked [x] (done) are moved to the "Done" column.
    • Cards un-marked back to [ ] in Done are moved to the first active column.
    • Cards with - [!] (warning) stay in Done even when undone.
  This only applies to boards using the standard To Do / In Progress / Done
  workflow. Custom columns (🔴 Critical, etc.) are left as-is.

  ============================================================================
  KEYBOARD SHORTCUTS (in the browser)
  ============================================================================
    ?         Open this help reference
    Cmd+K     Search all tasks (Ctrl+K on Windows)
    n         Focus the first "Add task" input
    Ctrl+Z    Undo last action
    Ctrl+Shift+Z  Redo
  Click the Download button in the header to export as JSON, CSV, or HTML.

  ============================================================================
  RULES FOR AI AGENTS
  ============================================================================
  • Every task MUST start with "- [ ]" or "- [x]" at the beginning of the line
  • Bold the title with **double asterisks**
  • Use an em dash (—) before description, details, and #tags
  • Only H2 (##) sections become columns — H3+ are ignored
  • Drag cards between columns to change status
  • Indent sub-tasks with 2 spaces and use - [ ] / - [x] syntax
  • This comment block is invisible to the board
-->`;

/**
 * Read, auto-create, and parse the TODO.md file. Mutates boardState in place.
 * @param {string} absFilePath
 * @param {object} boardStateRef — { current: BoardState }
 */
function readAndParse(absFilePath, boardStateRef) {
  if (!fs.existsSync(absFilePath)) {
    const starter = `${FORMAT_GUIDE}

# TODO

## To Do
- [ ] **Welcome to md-kanban** — Drag cards between columns to track progress. Add #critical, #important, or #polish tags for priority indicators.

## In Progress

## Done
`;
    fs.writeFileSync(absFilePath, starter, 'utf-8');
    boardStateRef.current = parseMarkdown(starter);
    return;
  }
  let raw = fs.readFileSync(absFilePath, 'utf-8');

  if (raw.trim().length > 0 && !raw.includes('<!--') && !raw.startsWith('<!--')) {
    raw = `${FORMAT_GUIDE}

${raw}`;
    try {
      fs.writeFileSync(absFilePath, raw, 'utf-8');
    } catch {
      // File might be locked — that's fine
    }
  }

  boardStateRef.current = parseMarkdown(raw);
  const preamble = boardStateRef.current.preamble || '';

  // Load and apply plugins from @plugins config
  const pluginNames = parsePluginConfig(preamble);
  if (pluginNames.length > 0) {
    const cacheKey = absFilePath + '::' + pluginNames.join(',');
    let plugins = pluginCache.get(cacheKey);
    if (!plugins) {
      plugins = loadPlugins(pluginNames);
      pluginCache.set(cacheKey, plugins);
    }
    // Re-parse with plugins
    boardStateRef.current = parseMarkdown(raw, { plugins });
    // Store plugins on the board for the writer
    boardStateRef.current._plugins = plugins;
  }

  // Auto-correct: move done cards to Done, move undone cards out of Done
  if (validateBoardColumns(boardStateRef.current)) {
    const output = serializeBoard(boardStateRef.current);
    try {
      fs.writeFileSync(absFilePath, output, 'utf-8');
    } catch {
      // File might be locked — correction will re-apply on next read
    }
  }
}

// Track loaded plugins per-file so we don't reload on every change
const pluginCache = new Map();

/**
 * Serialize and write board state to disk.
 * @param {object} boardState
 * @param {string} absFilePath
 */
function writeBoard(boardState, absFilePath) {
  // Re-derive plugins from preamble in case _plugins was lost
  let plugins = boardState._plugins;
  if (!plugins) {
    const preamble = boardState.preamble || '';
    const pluginNames = parsePluginConfig(preamble);
    if (pluginNames.length > 0) {
      const cacheKey = absFilePath + '::' + pluginNames.join(',');
      plugins = pluginCache.get(cacheKey) || loadPlugins(pluginNames);
      if (plugins) pluginCache.set(cacheKey, plugins);
    }
  }
  const output = serializeBoard(boardState, { plugins });
  fs.writeFileSync(absFilePath, output, 'utf-8');
}

/**
 * Find a card by ID across all columns, recursively searching children.
 * @returns {{ column, index, card, parentCard } | null}
 */
function findCard(board, cardId) {
  for (const col of board.columns) {
    const idx = col.cards.findIndex(c => c.id === cardId);
    if (idx !== -1) return { column: col, index: idx, card: col.cards[idx], parentCard: null };
    for (const card of col.cards) {
      const result = findCardInChildren(card, cardId);
      if (result) return { ...result, column: col };
    }
  }
  return null;
}

/** Recursively search children of a card for a matching ID. */
function findCardInChildren(card, cardId) {
  if (!card.children) return null;
  for (let i = 0; i < card.children.length; i++) {
    if (card.children[i].id === cardId) {
      return { index: i, card: card.children[i], parentCard: card };
    }
    const deeper = findCardInChildren(card.children[i], cardId);
    if (deeper) return deeper;
  }
  return null;
}

/**
 * Generate a new card object (not yet added to any column).
 * @returns {import('./parser').Card}
 */
function createCard(title, description, columnId) {
  const hashInput = (title + '::' + columnId).toLowerCase().trim();
  let h = 5381;
  for (let i = 0; i < hashInput.length; i++) {
    h = ((h << 5) + h + hashInput.charCodeAt(i)) >>> 0;
  }
  const id = h.toString(16);
  const titlePart = `**${title}**`;
  const descPart = description ? ` — ${description}` : '';
  const today = new Date().toISOString().slice(0, 10);
  const rawLine = `- [ ] ${titlePart}${descPart} <!-- created:${today} -->`;
  return { id, done: false, title, description, rawLine, createdAt: today };
}

/**
 * Auto-correct card placement: done cards belong in Done, undone cards
 * belong outside Done. This catches manual file edits that violate the
 * Kanban convention.
 * @param {object} board
 */
function validateBoardColumns(board) {
  // Only auto-correct boards that already use standard workflow columns.
  // Custom columns (e.g. "🔴 Critical") are intentionally non-standard and
  // shouldn't get a Done column injected.
  if (!boardUsesStandardColumns(board)) return false;

  const todoColumn = board.columns.find(c => !isColumnDone(c));
  if (!todoColumn) return false; // no non-Done column to move things to

  let doneColumn = board.columns.find(c =>
    c.id === 'done' || c.id.includes('done') || c.name.toLowerCase().includes('done')
  );
  if (!doneColumn) {
    doneColumn = { id: 'done', name: 'Done', emoji: null, cards: [] };
    board.columns.push(doneColumn);
  }

  let corrected = false;

  // Move [x] cards from non-Done columns → Done
  for (const col of board.columns) {
    if (isColumnDone(col)) continue;
    const misplaced = col.cards.filter(c => c.done);
    if (misplaced.length > 0) {
      doneColumn.cards.push(...misplaced);
      col.cards = col.cards.filter(c => !c.done);
      corrected = true;
    }
  }

  // Move [ ] cards from Done → first non-Done column (warning cards stay)
  const undoneInDone = doneColumn.cards.filter(c => !c.done && !c.warning);
  if (undoneInDone.length > 0) {
    todoColumn.cards.push(...undoneInDone);
    doneColumn.cards = doneColumn.cards.filter(c => c.done || c.warning);
    corrected = true;
  }

  return corrected;
}

function isColumnDone(col) {
  const id = (col.id || '').toLowerCase();
  const name = (col.name || '').toLowerCase();
  return id === 'done' || id.includes('done') || name.includes('done');
}

/** Returns true if the board has at least one standard workflow column. */
function boardUsesStandardColumns(board) {
  return board.columns.some(c => {
    const name = c.name.toLowerCase();
    const id = (c.id || '').toLowerCase();
    return name.includes('to do') || name.includes('in progress') || name.includes('progress') ||
      name.includes('done') || id.includes('to-do') || id.includes('in-progress') ||
      id.includes('progress') || id.includes('done');
  });
}

module.exports = { FORMAT_GUIDE, readAndParse, writeBoard, findCard, findCardInChildren, createCard, validateBoardColumns };
