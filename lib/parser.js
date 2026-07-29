/**
 * TODO.md → BoardState parser.
 *
 * Parses a Markdown TODO file into structured board state.
 * Columns are H2 sections. Cards are - [ ] / - [x] list items.
 *
 * @typedef {Object} Card
 * @property {string}  id          - Stable hash of (title + column)
 * @property {boolean} done        - Checkbox state
 * @property {string}  title       - Text inside **...** or first sentence
 * @property {string}  description - Text after — (em dash), or empty
 * @property {string}  rawLine     - Original markdown line for round-trip fidelity
 *
 * @typedef {Object} Column
 * @property {string}      id     - Slugified header text (e.g. "critical")
 * @property {string}      name   - Raw header text without ## prefix (e.g. "🔴 Critical")
 * @property {string|null} emoji  - Leading emoji extracted from name
 * @property {Card[]}      cards  - Cards in this column
 *
 * @typedef {Object} BoardState
 * @property {string}   title      - From first H1, or filename
 * @property {string}   preamble   - Leading HTML comments / blank lines preserved for format guide
 * @property {Object<string, {label: string, color: string, ring: string}>} priorities - Priority indicator definitions
 * @property {Column[]} columns    - Parsed columns
 */

/**
 * Simple DJB2 hash for stable card IDs.
 * @param {string} str
 * @returns {string} hex hash
 */
function djb2(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}

/**
 * Slugify a string for use as a column/card identifier.
 * Lowercase, replace non-alphanumeric with hyphens, collapse hyphens.
 * @param {string} text
 * @returns {string}
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'untitled';
}

/**
 * Extract a leading emoji from text. Returns [emoji, rest] or [null, text].
 * Matches common emoji patterns: regional indicators, symbols, pictograms.
 * @param {string} text
 * @returns {[string|null, string]}
 */
function extractEmoji(text) {
  const trimmed = text.trimStart();
  // Match a single emoji sequence at the start
  const emojiRe = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{2702}-\u{27B0}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}])\s*/u;
  const match = trimmed.match(emojiRe);
  if (match) {
    return [match[1], trimmed.slice(match[0].length)];
  }
  return [null, trimmed];
}

/**
 * Parse a single card line. A card line looks like:
 *   - [ ] **Title** — Description
 *   - [x] **Title** — Description
 *   - [ ] Title — Description
 *   - [ ] Title
 *
 * @param {string} line - The raw line from the file
 * @param {string} columnId - The parent column's ID (for id generation)
 * @param {number} index - Position in the column (for duplicate resolution)
 * @returns {Card|null} Parsed card, or null if line isn't a checkbox
 */
function parseCardLine(line, columnId, index) {
  // Must start with "- [ ]" or "- [x]"
  const checkboxRe = /^- \[( |x)\]\s+(.*)$/;
  const match = line.replace(/\r$/, '').match(checkboxRe);
  if (!match) return null;

  const done = match[1] === 'x';
  let rest = match[2].trim();

  // Extract bold title: **Title** or **Title** — Description
  let title = '';
  let description = '';

  const boldMatch = rest.match(/^\*\*(.+?)\*\*/);
  if (boldMatch) {
    title = boldMatch[1].trim();
    rest = rest.slice(boldMatch[0].length).trim();
    // After bold, a description may follow: — desc
    if (rest.startsWith('—')) {
      description = rest.slice(1).trim();
    }
  } else {
    // No bold: split on — for title / description
    const emDashIdx = rest.indexOf('—');
    if (emDashIdx === -1) {
      title = rest;
    } else {
      title = rest.slice(0, emDashIdx).trim();
      description = rest.slice(emDashIdx + 1).trim();
    }
  }

  // Generate stable ID
  const hashInput = (title + '::' + columnId).toLowerCase().trim();
  let id = djb2(hashInput);

  // Handle duplicate titles in same column: append index suffix
  // (checked by caller via seenIds set)

  return {
    id,
    done,
    title: title || 'Untitled',
    description,
    rawLine: line,
  };
}

/**
 * Resolve duplicate card IDs within a column by appending an index suffix.
 * Modifies cards in place.
 * @param {Card[]} cards
 */
function resolveDuplicateIds(cards) {
  const seen = new Map(); // id → count
  for (const card of cards) {
    if (seen.has(card.id)) {
      const count = seen.get(card.id) + 1;
      seen.set(card.id, count);
      card.id = card.id + '-' + count;
    } else {
      seen.set(card.id, 1);
    }
  }
}

/** Default priority indicators */
const DEFAULT_PRIORITIES = {
  critical: { label: 'Critical', color: 'bg-red-500', ring: 'ring-red-500/30' },
  important: { label: 'Important', color: 'bg-amber-500', ring: 'ring-amber-500/30' },
  polish:   { label: 'Polish',   color: 'bg-emerald-500', ring: 'ring-emerald-500/30' },
};

/**
 * Extract custom priorities from preamble text.
 * Looks for @priorities {...} JSON block within HTML comments.
 * @param {string} preamble
 * @returns {Object<string, {label: string, color: string, ring: string}>}
 */
function parsePriorities(preamble) {
  const match = preamble.match(/@priorities\s*(\{[^}]+\})/);
  if (!match) return { ...DEFAULT_PRIORITIES };
  try {
    const parsed = JSON.parse(match[1]);
    // Merge: parsed overrides defaults, but defaults provide base
    const merged = { ...DEFAULT_PRIORITIES };
    for (const [k, v] of Object.entries(parsed)) {
      merged[k] = v;
    }
    return merged;
  } catch {
    return { ...DEFAULT_PRIORITIES };
  }
}

/**
 * Serialize priorities into a @priorities JSON string for embedding in the preamble.
 * @param {Object<string, {label: string, color: string, ring: string}>} priorities
 * @returns {string}
 */
function serializePriorities(priorities) {
  const obj = {};
  for (const [k, v] of Object.entries(priorities)) {
    obj[k] = { label: v.label, color: v.color, ring: v.ring };
  }
  return '@priorities ' + JSON.stringify(obj);
}
function parseMarkdown(markdown) {
  const lines = markdown.split('\n');
  const columns = [];
  let title = '';
  let currentColumn = null;
  let uncategorizedCards = [];
  let foundFirstH1 = false;

  // Extract preamble: HTML comments and blank lines before the first content
  const preambleLines = [];
  let preambleDone = false;
  let inComment = false;

  for (const line of lines) {
    // Stop collecting preamble once we hit actual content
    if (!preambleDone) {
      const trimmed = line.trim();
      if (inComment) {
        preambleLines.push(line);
        if (trimmed.includes('-->')) inComment = false;
        continue;
      }
      if (trimmed === '') {
        preambleLines.push(line);
        continue;
      }
      if (trimmed.startsWith('<!--')) {
        preambleLines.push(line);
        if (!trimmed.includes('-->')) inComment = true;
        continue;
      }
      preambleDone = true;
    }
    // H1: Board title (first one wins)
    if (/^#\s+/.test(line) && !foundFirstH1) {
      title = line.replace(/^#\s+/, '').trim();
      foundFirstH1 = true;
      continue;
    }

    // H2: New column
    if (/^##\s+/.test(line)) {
      // Save previous column if it has cards
      if (currentColumn && currentColumn.cards.length > 0) {
        resolveDuplicateIds(currentColumn.cards);
        columns.push(currentColumn);
      } else if (currentColumn) {
        // Push empty columns too — they might be placeholders
        columns.push(currentColumn);
      }

      const rawName = line.replace(/^##\s+/, '').trim();
      const [emoji, nameWithoutEmoji] = extractEmoji(rawName);
      const columnName = nameWithoutEmoji || rawName;

      currentColumn = {
        id: slugify(columnName),
        name: rawName,
        emoji,
        cards: [],
      };
      continue;
    }

    // Card line: - [ ] or - [x]
    if (/^- \[[ x]\]/.test(line)) {
      const parentId = currentColumn ? currentColumn.id : 'uncategorized';
      const cardArray = currentColumn ? currentColumn.cards : uncategorizedCards;
      const card = parseCardLine(line, parentId, cardArray.length);

      if (card) {
        cardArray.push(card);
      }
      continue;
    }

    // Everything else: ignored (paragraphs, blank lines, code blocks, H3+)
  }

  // Push last column
  if (currentColumn) {
    resolveDuplicateIds(currentColumn.cards);
    columns.push(currentColumn);
  }

  // If there are uncategorized cards (before any H2), add them as a column
  if (uncategorizedCards.length > 0) {
    resolveDuplicateIds(uncategorizedCards);
    columns.unshift({
      id: 'uncategorized',
      name: '📋 Uncategorized',
      emoji: '📋',
      cards: uncategorizedCards,
    });
  }

  // If no columns and no cards at all, return empty state
  // If there are columns but no title, title stays empty string

  return {
    title: title || '',
    preamble: preambleLines.join('\n'),
    priorities: parsePriorities(preambleLines.join('\n')),
    columns,
  };
}

module.exports = { parseMarkdown, parseCardLine, slugify, extractEmoji, djb2, resolveDuplicateIds, parsePriorities, serializePriorities, DEFAULT_PRIORITIES };
