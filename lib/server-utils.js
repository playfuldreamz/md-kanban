/**
 * Shared utilities for the md-kanban server.
 *
 * Card lookup, creation, and the format-guide preamble. Used by both
 * server.js and lib/routes.js.
 */

const { parseMarkdown } = require('./parser');
const { serializeBoard } = require('./writer');
const fs = require('fs');

/** Format guide prepended to every TODO.md. */
const FORMAT_GUIDE = `<!--
  This file powers a live Kanban board (npx md-kanban).

  STRUCTURE:
    ## To Do
    ## In Progress
    ## Done
  Non-standard columns trigger an auto-conversion prompt.

  CARD FORMAT:
    - [ ] **Title** — Description with #tags
    - [x] **Title** — Description   (x = done → strikethrough)

  SUB-TASKS (nested checkboxes):
    - [ ] **Parent task** — Description
      - [x] Completed sub-task
      - [ ] Pending sub-task
        - [ ] Third-level sub-task
    Indent with 2 spaces per level. Unlimited nesting depth.
    The board renders up to 4 visual levels with progress badges.

  TAGS (any #tag renders as a colored badge):
    #critical (red)  #important (amber)  #polish (green)
    #bug  #feature  #docs  #frontend  #backend — any tag works
    Auto-assigned colors for unknown tags. Custom colors via @priorities block.

  RULES FOR AI AGENTS:
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

/**
 * Serialize and write board state to disk.
 * @param {object} boardState
 * @param {string} absFilePath
 */
function writeBoard(boardState, absFilePath) {
  const output = serializeBoard(boardState);
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
  let doneColumn = board.columns.find(c =>
    c.id === 'done' || c.id.includes('done') || c.name.toLowerCase().includes('done')
  );
  if (!doneColumn) {
    doneColumn = { id: 'done', name: 'Done', emoji: null, cards: [] };
    board.columns.push(doneColumn);
  }

  const todoColumn = board.columns.find(c => !isColumnDone(c));
  if (!todoColumn) return; // no non-Done column to move things to

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

  // Move [ ] cards from Done → first non-Done column
  const undoneInDone = doneColumn.cards.filter(c => !c.done);
  if (undoneInDone.length > 0) {
    todoColumn.cards.push(...undoneInDone);
    doneColumn.cards = doneColumn.cards.filter(c => c.done);
    corrected = true;
  }

  return corrected;
}

function isColumnDone(col) {
  const id = (col.id || '').toLowerCase();
  const name = (col.name || '').toLowerCase();
  return id === 'done' || id.includes('done') || name.includes('done');
}

module.exports = { FORMAT_GUIDE, readAndParse, writeBoard, findCard, findCardInChildren, createCard, validateBoardColumns };
