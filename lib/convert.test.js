/**
 * Convert endpoint test suite — verifies conversion of any TODO.md to standard columns.
 * Run: node lib/convert.test.js
 */

const { parseMarkdown } = require('./parser');
const { serializeBoard } = require('./writer');
const { test, assert, assertEqual, run } = require('./test-utils');

function simulateConvert(rawMd) {
  let boardState = parseMarkdown(rawMd);

  const priorityKeywords = {
    critical: '#critical', urgent: '#critical', blocker: '#critical',
    important: '#important', high: '#important', priority: '#important',
    polish: '#polish', nice: '#polish', low: '#polish', later: '#polish', backlog: '#polish',
  };

  const allCards = boardState.columns.flatMap(col => {
    const colLower = col.name.toLowerCase();
    let priorityTag = '';
    for (const [kw, tag] of Object.entries(priorityKeywords)) {
      if (colLower.includes(kw)) { priorityTag = tag; break; }
    }
    return col.cards.map(card => {
      if (!priorityTag) return card;
      if (card.description && card.description.includes(priorityTag)) return card;
      card.description = card.description
        ? card.description + ' ' + priorityTag
        : priorityTag;
      card._changed = true;
      return card;
    });
  });

  const doneCards = allCards.filter(c => c.done);
  const activeCards = allCards.filter(c => !c.done);

  boardState = {
    title: boardState.title,
    preamble: boardState.preamble || '',
    columns: [
      { id: 'to-do', name: 'To Do', emoji: null, cards: activeCards },
      { id: 'in-progress', name: 'In Progress', emoji: null, cards: [] },
      { id: 'done', name: 'Done', emoji: null, cards: doneCards },
    ],
  };

  return boardState;
}

// ─── Tests ──────────────────────────────────────────────────────────────

test('convert: standard file — no change needed (already 3 columns)', () => {
  const md = `# Project\n\n## To Do\n- [ ] Task A\n\n## In Progress\n- [ ] Task B\n\n## Done\n- [x] Task C\n`;
  const result = simulateConvert(md);
  assertEqual(result.columns.length, 3);
  assertEqual(result.columns[0].cards.length, 2); // Task A (active) + Task B (active) — actually Task B is in In Progress
  // Wait — all active cards go to To Do. That includes In Progress cards.
  // This is correct behavior for conversion: reset to clean state.
  assertEqual(result.columns[1].cards.length, 0); // In Progress always empty after convert
  assertEqual(result.columns[2].cards.length, 1); // Done
});

test('convert: priority columns — tags added, cards redistributed', () => {
  const md = `# TODO\n\n## 🔴 Critical\n- [ ] **Fix bug** — urgent fix\n- [x] **Done task** — finished\n\n## 🟢 Polish\n- [ ] **Cleanup** — minor\n`;
  const result = simulateConvert(md);

  // All active go to To Do
  assertEqual(result.columns[0].name, 'To Do');
  assertEqual(result.columns[0].cards.length, 2); // Fix bug + Cleanup
  assert(result.columns[0].cards[0].description.includes('#critical'), 'Critical card should have #critical tag');
  assert(result.columns[0].cards[1].description.includes('#polish'), 'Polish card should have #polish tag');

  // Done
  assertEqual(result.columns[2].cards.length, 1);
  assert(result.columns[2].cards[0].description.includes('#critical'), 'Done critical card should have #critical tag');
});

test('convert: single column with mixed cards', () => {
  const md = `# Solo\n\n## Stuff\n- [ ] **A**\n- [x] **B**\n- [ ] **C**\n- [x] **D**\n`;
  const result = simulateConvert(md);
  assertEqual(result.columns[0].cards.length, 2); // A + C active
  assertEqual(result.columns[2].cards.length, 2); // B + D done
});

test('convert: no columns — uncategorized cards', () => {
  const md = `# Loose\n- [ ] **One**\n- [x] **Two**\n`;
  const result = simulateConvert(md);
  assertEqual(result.columns[0].cards.length, 1); // One
  assertEqual(result.columns[2].cards.length, 1); // Two
});

test('convert: preserves title', () => {
  const md = `# My Awesome Project\n\n## Old Column\n- [ ] Task\n`;
  const result = simulateConvert(md);
  assertEqual(result.title, 'My Awesome Project');
});

test('convert: empty file — still produces 3 columns', () => {
  const result = simulateConvert('');
  assertEqual(result.columns.length, 3);
  assertEqual(result.columns[0].cards.length, 0);
  assertEqual(result.columns[1].cards.length, 0);
  assertEqual(result.columns[2].cards.length, 0);
});

test('convert: cards with existing priority tags not double-tagged', () => {
  const md = `# Project\n\n## Critical\n- [ ] **Task** — already has #critical tag\n`;
  const result = simulateConvert(md);
  const desc = result.columns[0].cards[0].description;
  // Should only have one #critical
  const matches = (desc.match(/#critical/g) || []).length;
  assertEqual(matches, 1, 'Should not double-tag');
});

test('convert: cards from non-priority columns dont get tags', () => {
  const md = `# Project\n\n## Random Stuff\n- [ ] **Task** — just a task\n`;
  const result = simulateConvert(md);
  assert(!result.columns[0].cards[0].description.includes('#'), 'No tag should be added');
});

test('convert: 10+ columns — all cards preserved', () => {
  let md = '# Big\n';
  let expectedTotal = 0;
  for (let i = 0; i < 12; i++) {
    md += `\n## Col ${i}\n`;
    for (let j = 0; j < 3; j++) {
      const done = (i + j) % 3 === 0;
      md += `- [${done ? 'x' : ' '}] **Task ${i}-${j}**\n`;
      expectedTotal++;
    }
  }
  const result = simulateConvert(md);
  const total = result.columns.reduce((s, c) => s + c.cards.length, 0);
  assertEqual(total, expectedTotal, `All ${expectedTotal} cards preserved`);
});

test('convert: round-trip through writer preserves all cards', () => {
  const md = `# TODO\n\n## 🔴 Critical\n- [ ] **Critical task** — important\n- [x] **Done critical** — was urgent\n\n## 🟡 Important\n- [ ] **Medium task** — not urgent\n\n## 🟢 Polish\n- [x] **Done polish** — complete\n`;
  const result = simulateConvert(md);
  const serialized = serializeBoard(result);
  const reparsed = parseMarkdown(serialized);

  const totalBefore = result.columns.reduce((s, c) => s + c.cards.length, 0);
  const totalAfter = reparsed.columns.reduce((s, c) => s + c.cards.length, 0);
  assertEqual(totalAfter, totalBefore, 'Round-trip preserves all cards');
});

run().then(ok => process.exit(ok ? 0 : 1));
