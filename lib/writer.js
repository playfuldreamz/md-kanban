/**
 * BoardState → TODO.md serializer.
 *
 * Converts structured board state back into a Markdown TODO file.
 * Unchanged cards preserve their rawLine for minimal diffs.
 * Changed cards are written in canonical format.
 *
 * A card is considered "changed" if its title, description, or done
 * state differs from what's encoded in its rawLine. The caller marks
 * changed cards by setting card._changed = true before serialization,
 * or the writer detects changes by comparing fields against rawLine.
 */

const { parseCardLine, DEFAULT_PRIORITIES } = require('./parser');
const { serializePriorities } = require('./parser');

/**
 * Detect if a card's fields differ from its rawLine.
 * Re-parses the rawLine and compares title, description, done.
 *
 * @param {import('./parser').Card} card
 * @returns {boolean}
 */
function cardHasChanged(card) {
  // If explicitly marked as changed by the API layer
  if (card._changed) return true;

  // Parse the original line to see what it would produce
  const reparsed = parseCardLine(card.rawLine, '', 0);
  if (!reparsed) return true; // Can't parse original → treat as changed

  return (
    card.title !== reparsed.title ||
    card.description !== reparsed.description ||
    card.done !== reparsed.done
  );
}

/**
 * Serialize a single card to its canonical Markdown line.
 *
 * @param {import('./parser').Card} card
 * @returns {string}
 */
function serializeCard(card) {
  if (!cardHasChanged(card)) {
    return card.rawLine;
  }

  const checkbox = card.done ? '- [x]' : '- [ ]';
  const titlePart = `**${card.title}**`;
  const descPart = card.description ? ` — ${card.description}` : '';

  return `${checkbox} ${titlePart}${descPart}`;
}

/**
 * Serialize the full board state to a Markdown string.
 *
 * @param {import('./parser').BoardState} board
 * @returns {string}
 */
function serializeBoard(board) {
  const lines = [];

  // Preamble (format guide, HTML comments)
  if (board.preamble && board.preamble.trim()) {
    let preamble = board.preamble.trimEnd();
    if (board.priorities) {
      // Check if priorities differ from defaults
      const defaultKeys = Object.keys(DEFAULT_PRIORITIES).sort();
      const currentKeys = Object.keys(board.priorities).sort();
      const isCustom = defaultKeys.join(',') !== currentKeys.join(',') ||
        currentKeys.some(k => {
          const d = DEFAULT_PRIORITIES[k];
          const c = board.priorities[k];
          return !d || d.label !== c.label || d.color !== c.color;
        });
      if (isCustom) {
      const prioStr = serializePriorities(board.priorities);
      if (preamble.includes('@priorities')) {
        // Remove old @priorities entirely, then re-add before -->
        const idx = preamble.indexOf('@priorities');
        const endIdx = preamble.indexOf('-->', idx);
        if (endIdx !== -1) {
          preamble = preamble.slice(0, idx) + preamble.slice(endIdx);
        }
        preamble = preamble.replace(/-->/, '  ' + prioStr + '\n-->');
      } else {
        preamble = preamble.replace(/-->/, '  ' + prioStr + '\n-->');
      }
      }
    }
    lines.push(preamble);
    lines.push('');
  }

  // Title
  if (board.title) {
    lines.push(`# ${board.title}`);
    lines.push('');
  }

  // Columns
  for (let i = 0; i < board.columns.length; i++) {
    const column = board.columns[i];

    // Column header
    lines.push(`## ${column.name}`);

    // Cards
    if (column.cards.length > 0) {
      for (const card of column.cards) {
        lines.push(serializeCard(card));
      }
    }

    // Blank line between columns
    if (i < board.columns.length - 1) {
      lines.push('');
      lines.push('');
    }
  }

  // Build output and ensure trailing newline
  let output = lines.join('\n');
  if (output === '') return '\n';
  if (!output.endsWith('\n')) output += '\n';
  return output;
}

module.exports = { serializeBoard, serializeCard, cardHasChanged };
