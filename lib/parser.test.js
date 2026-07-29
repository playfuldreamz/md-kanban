/**
 * Parser test suite.
 * Run: node lib/parser.test.js
 */

const { parseMarkdown, parseCardLine, slugify, extractEmoji, djb2, resolveDuplicateIds } = require('./parser');
const { test, assert, assertEqual, assertDeepEqual, run } = require('./test-utils');

// ─── Utility tests ───

test('slugify: basic', () => {
  assertEqual(slugify('Critical'), 'critical');
  assertEqual(slugify('🔴 Critical'), 'critical');
  assertEqual(slugify('My Important Tasks!'), 'my-important-tasks');
  assertEqual(slugify('  spaces  '), 'spaces');
  assertEqual(slugify(''), 'untitled');
});

test('extractEmoji: single emoji', () => {
  const [emoji, rest] = extractEmoji('🔴 Critical');
  assertEqual(emoji, '🔴');
  assertEqual(rest, 'Critical');
});

test('extractEmoji: no emoji', () => {
  const [emoji, rest] = extractEmoji('Critical Tasks');
  assertEqual(emoji, null);
  assertEqual(rest, 'Critical Tasks');
});

test('extractEmoji: emoji without space', () => {
  const [emoji, rest] = extractEmoji('🟡Important');
  assertEqual(emoji, '🟡');
  assertEqual(rest, 'Important');
});

test('djb2: deterministic', () => {
  assertEqual(djb2('hello'), djb2('hello'));
  assert(djb2('hello') !== djb2('world'), 'Different strings should have different hashes');
});

test('djb2: case sensitive', () => {
  assert(djb2('Hello') !== djb2('hello'));
});

test('resolveDuplicateIds: no duplicates', () => {
  const cards = [
    { id: 'abc', title: 'One' },
    { id: 'def', title: 'Two' },
  ];
  resolveDuplicateIds(cards);
  assertEqual(cards[0].id, 'abc');
  assertEqual(cards[1].id, 'def');
});

test('resolveDuplicateIds: duplicates get suffixes', () => {
  const cards = [
    { id: 'abc', title: 'One' },
    { id: 'abc', title: 'Two' },
    { id: 'abc', title: 'Three' },
  ];
  resolveDuplicateIds(cards);
  assertEqual(cards[0].id, 'abc');
  assertEqual(cards[1].id, 'abc-2');
  assertEqual(cards[2].id, 'abc-3');
});

// ─── Card line parsing tests ───

test('parseCardLine: open card with bold title and description', () => {
  const card = parseCardLine('- [ ] **Fix login bug** — Users on Safari get a blank screen', 'critical', 0);
  assert(card !== null, 'Should parse');
  assertEqual(card.done, false);
  assertEqual(card.title, 'Fix login bug');
  assertEqual(card.description, 'Users on Safari get a blank screen');
  assertEqual(card.rawLine, '- [ ] **Fix login bug** — Users on Safari get a blank screen');
});

test('parseCardLine: done card', () => {
  const card = parseCardLine('- [x] **Rate limiting** — Added middleware', 'critical', 0);
  assert(card !== null);
  assertEqual(card.done, true);
  assertEqual(card.title, 'Rate limiting');
  assertEqual(card.description, 'Added middleware');
});

test('parseCardLine: no bold, with description', () => {
  const card = parseCardLine('- [ ] Some task — with a description', 'general', 0);
  assert(card !== null);
  assertEqual(card.title, 'Some task');
  assertEqual(card.description, 'with a description');
});

test('parseCardLine: bold but no description', () => {
  const card = parseCardLine('- [ ] **Just a title**', 'general', 0);
  assert(card !== null);
  assertEqual(card.title, 'Just a title');
  assertEqual(card.description, '');
});

test('parseCardLine: no bold, no description', () => {
  const card = parseCardLine('- [ ] Plain task', 'general', 0);
  assert(card !== null);
  assertEqual(card.title, 'Plain task');
  assertEqual(card.description, '');
});

test('parseCardLine: bold title with em dash in title', () => {
  const card = parseCardLine('- [ ] **Foo — bar** — real description', 'general', 0);
  assert(card !== null);
  assertEqual(card.title, 'Foo — bar');
  assertEqual(card.description, 'real description');
});

test('parseCardLine: empty title defaults to Untitled', () => {
  const card = parseCardLine('- [ ] ', 'general', 0);
  assert(card !== null);
  assertEqual(card.title, 'Untitled');
  assertEqual(card.description, '');
});

test('parseCardLine: not a checkbox returns null', () => {
  assertEqual(parseCardLine('Just a regular line', 'col', 0), null);
  assertEqual(parseCardLine('* [ ] asterisk list', 'col', 0), null);
});

test('parseCardLine: indented card parses as sub-task', () => {
  const card = parseCardLine('  - [ ] indented task', 'col', 0);
  assert(card !== null, 'Should parse indented checkbox');
  assertEqual(card.title, 'indented task');
  assertEqual(card.indentLevel, 1);
});

test('parseCardLine: deeply indented card', () => {
  const card = parseCardLine('    - [x] deep child', 'col', 0);
  assert(card !== null);
  assertEqual(card.done, true);
  assertEqual(card.indentLevel, 2);
  assertEqual(card.title, 'deep child');
});

test('parseCardLine: extracts createdAt from HTML comment', () => {
  const card = parseCardLine('- [ ] **Task** — Description <!-- created:2026-07-28 -->', 'col', 0);
  assert(card !== null);
  assertEqual(card.createdAt, '2026-07-28');
  assertEqual(card.description, 'Description'); // comment stripped
});

test('parseCardLine: no createdAt when no comment present', () => {
  const card = parseCardLine('- [ ] **Task** — Description', 'col', 0);
  assert(card !== null);
  assertEqual(card.createdAt, undefined);
});

test('parseCardLine: createdAt with no description', () => {
  const card = parseCardLine('- [ ] **Task** <!-- created:2026-01-15 -->', 'col', 0);
  assert(card !== null);
  assertEqual(card.createdAt, '2026-01-15');
  assertEqual(card.description, '');
});

// ─── Full document parsing tests ───

test('parseMarkdown: full document', () => {
  const md = `# My Project

## 🔴 Critical
- [ ] **Fix login bug** — Safari OAuth redirect blank screen
- [x] **Rate limiting** — Added express-rate-limit

## 🟡 Important
- [ ] **i18n extraction** — Phase 2, batch 3
- [ ] **Notifications delivery** — Push/email/in-app
`;

  const board = parseMarkdown(md);
  assertEqual(board.title, 'My Project');
  assertEqual(board.columns.length, 2);

  assertEqual(board.columns[0].name, '🔴 Critical');
  assertEqual(board.columns[0].emoji, '🔴');
  assertEqual(board.columns[0].id, 'critical');
  assertEqual(board.columns[0].cards.length, 2);
  assertEqual(board.columns[0].cards[0].title, 'Fix login bug');
  assertEqual(board.columns[0].cards[0].done, false);
  assertEqual(board.columns[0].cards[1].title, 'Rate limiting');
  assertEqual(board.columns[0].cards[1].done, true);

  assertEqual(board.columns[1].name, '🟡 Important');
  assertEqual(board.columns[1].emoji, '🟡');
  assertEqual(board.columns[1].cards.length, 2);
});

test('parseMarkdown: empty file', () => {
  const board = parseMarkdown('');
  assertEqual(board.title, '');
  assertEqual(board.columns.length, 0);
});

test('parseMarkdown: no H2 sections — cards go to Uncategorized', () => {
  const md = `# Just Tasks
- [ ] **Task one** — First thing
- [x] **Task two** — Second thing
`;
  const board = parseMarkdown(md);
  assertEqual(board.title, 'Just Tasks');
  assertEqual(board.columns.length, 1);
  assertEqual(board.columns[0].id, 'uncategorized');
  assertEqual(board.columns[0].cards.length, 2);
});

test('parseMarkdown: cards before first H2 are uncategorized', () => {
  const md = `# Project
- [ ] **Pre-column task** — Before any section

## 🔴 Critical
- [ ] **In column task** — In a section
`;
  const board = parseMarkdown(md);
  assertEqual(board.columns.length, 2);
  assertEqual(board.columns[0].id, 'uncategorized');
  assertEqual(board.columns[0].cards[0].title, 'Pre-column task');
  assertEqual(board.columns[1].id, 'critical');
  assertEqual(board.columns[1].cards[0].title, 'In column task');
});

test('parseMarkdown: multiple H1s — only first is title', () => {
  const md = `# First Title

## Section
- [ ] Task

# Second Title (should be ignored)
`;
  const board = parseMarkdown(md);
  assertEqual(board.title, 'First Title');
});

test('parseMarkdown: trailing blank lines are fine', () => {
  const md = `# Project

## Section
- [ ] Task


`;
  const board = parseMarkdown(md);
  assertEqual(board.columns.length, 1);
  assertEqual(board.columns[0].cards.length, 1);
});

test('parseMarkdown: empty columns are preserved', () => {
  const md = `# Project

## Empty Column

## Column With Cards
- [ ] Task
`;
  const board = parseMarkdown(md);
  assertEqual(board.columns.length, 2);
  assertEqual(board.columns[0].name, 'Empty Column');
  assertEqual(board.columns[0].cards.length, 0);
  assertEqual(board.columns[1].name, 'Column With Cards');
  assertEqual(board.columns[1].cards.length, 1);
});

test('parseMarkdown: duplicate titles get unique IDs', () => {
  const md = `## Section
- [ ] **Same title** — First
- [ ] **Same title** — Second
`;
  const board = parseMarkdown(md);
  assertEqual(board.columns[0].cards.length, 2);
  assert(board.columns[0].cards[0].id !== board.columns[0].cards[1].id,
    'Duplicate titles should get different IDs');
});

test('parseMarkdown: ignores H3 headers and other content', () => {
  const md = `# Project

## Section
- [ ] Task one

### Sub-section (ignored)
- [ ] This should NOT be a card under sub-section
- [x] This should be in "Section" column

Some paragraph text here.

\`\`\`
code block
\`\`\`
`;
  const board = parseMarkdown(md);
  assertEqual(board.columns.length, 1);
  // H3 does NOT create a new column, so cards under ### still belong to ## Section
  assertEqual(board.columns[0].cards.length, 3);
  assertEqual(board.columns[0].cards[0].title, 'Task one');
  assertEqual(board.columns[0].cards[1].title, 'This should NOT be a card under sub-section');
  assertEqual(board.columns[0].cards[2].title, 'This should be in "Section" column');
});

test('parseMarkdown: no title at all', () => {
  const md = `## Section
- [ ] Task
`;
  const board = parseMarkdown(md);
  assertEqual(board.title, '');
  assertEqual(board.columns.length, 1);
});

test('parseMarkdown: complex descriptions with markdown', () => {
  const md = `## Section
- [ ] **Task** — Description with \`code\` and [link](https://example.com)
`;
  const board = parseMarkdown(md);
  assertEqual(board.columns[0].cards[0].description, 'Description with `code` and [link](https://example.com)');
});

test('parseMarkdown: preamble — HTML comments preserved', () => {
  const md = `<!-- Format guide -->

# My Project

## Section
- [ ] Task
`;
  const board = parseMarkdown(md);
  assert(board.preamble.includes('<!-- Format guide -->'), 'Should preserve HTML comment preamble');
  assertEqual(board.title, 'My Project');
  assertEqual(board.columns.length, 1);
  assertEqual(board.columns[0].cards.length, 1);
});

test('parseMarkdown: preamble — multi-line HTML comments', () => {
  const md = `<!--
  Format guide
  line 2
  line 3
-->

# Project

## Section
- [ ] Task
`;
  const board = parseMarkdown(md);
  assert(board.preamble.includes('Format guide'), 'Should capture multi-line comment body');
  assert(board.preamble.includes('line 3'), 'Should capture all comment lines');
  assert(board.preamble.includes('-->'), 'Should include closing tag');
  assertEqual(board.title, 'Project');
  assertEqual(board.columns.length, 1);
});

test('parseMarkdown: preamble — no preamble returns empty string', () => {
  const md = `# Project

## Section
- [ ] Task
`;
  const board = parseMarkdown(md);
  assertEqual(board.preamble, '');
});

test('parseMarkdown: preamble — content before preamble ends it', () => {
  const md = `<!-- This is preamble -->

Some text

# Project

## Section
- [ ] Task
`;
  const board = parseMarkdown(md);
  assert(board.preamble.includes('This is preamble'), 'Should capture comment before text');
  // The text line "Some text" should end preamble collection
  assert(!board.preamble.includes('Some text'), 'Should NOT include non-comment, non-blank lines in preamble');
});

test('parsePriorities: extracts from preamble with nested JSON', () => {
  const { parsePriorities } = require('./parser');
  const preamble = '<!--\n  FORMAT\n  @priorities {"critical":{"label":"Critical","color":"bg-red-500","ring":"ring-red-500/30"},"test":{"label":"Test","color":"bg-purple-500","ring":"ring-purple-500/30"}}\n-->';
  const priorities = parsePriorities(preamble);
  assert(priorities.critical, 'Should have critical');
  assert(priorities.test, 'Should have custom test priority');
  assertEqual(priorities.test.label, 'Test');
  assertEqual(priorities.test.color, 'bg-purple-500');
});

test('parsePriorities: no @priorities returns defaults', () => {
  const { parsePriorities } = require('./parser');
  const priorities = parsePriorities('<!-- just a comment -->');
  assertEqual(Object.keys(priorities).length, 3);
});

// ─── Sub-task (nested checkbox) tests ───

test('parseMarkdown: nested sub-tasks — single level', () => {
  const md = `## Column
- [ ] **Parent** — Description
  - [x] Child 1
  - [ ] Child 2
  - [ ] Child 3
- [ ] **Sibling** — No children
`;
  const board = parseMarkdown(md);
  assertEqual(board.columns.length, 1);
  assertEqual(board.columns[0].cards.length, 2);

  const parent = board.columns[0].cards[0];
  assertEqual(parent.title, 'Parent');
  assert(parent.children, 'Parent should have children');
  assertEqual(parent.children.length, 3);
  assertEqual(parent.children[0].title, 'Child 1');
  assertEqual(parent.children[0].done, true);
  assertEqual(parent.children[1].title, 'Child 2');
  assertEqual(parent.children[1].done, false);
  assertEqual(parent.children[2].title, 'Child 3');

  const sibling = board.columns[0].cards[1];
  assertEqual(sibling.title, 'Sibling');
  assert(!sibling.children || sibling.children.length === 0, 'Sibling should have no children');
});

test('parseMarkdown: nested sub-tasks — two levels deep', () => {
  const md = `## Column
- [ ] **Grandparent**
  - [ ] Parent 1
    - [x] Child A
    - [ ] Child B
  - [ ] Parent 2
`;
  const board = parseMarkdown(md);
  const gp = board.columns[0].cards[0];
  assertEqual(gp.children.length, 2);
  assertEqual(gp.children[0].title, 'Parent 1');
  assert(gp.children[0].children, 'Parent 1 should have grandchildren');
  assertEqual(gp.children[0].children.length, 2);
  assertEqual(gp.children[0].children[0].title, 'Child A');
  assertEqual(gp.children[0].children[0].done, true);
  assertEqual(gp.children[1].title, 'Parent 2');
});

test('parseMarkdown: sub-tasks reset on new column', () => {
  const md = `## Col A
- [ ] **Card A**
  - [ ] Child of A

## Col B
- [ ] **Card B**
  - [ ] Child of B
`;
  const board = parseMarkdown(md);
  assertEqual(board.columns.length, 2);
  const cardA = board.columns[0].cards[0];
  assert(cardA.children, 'Card A should have children');
  assertEqual(cardA.children[0].title, 'Child of A');
  const cardB = board.columns[1].cards[0];
  assert(cardB.children, 'Card B should have children');
  assertEqual(cardB.children[0].title, 'Child of B');
});

test('parseMarkdown: NoteAPP-style TODO.md', () => {
  const md = `# TODO

## 🔴 Critical
- [ ] **Testing** — Zero tests anywhere.
- [x] **Rate Limiting Middleware** — express-rate-limit added.

## 🟡 Important
- [x] **User Data Import** — JSON import via Settings → Data tab.
- [ ] **Notifications Delivery** — No backend push/email/in-app system.

## 🟢 Polish
- [ ] **Landing Page** — App goes straight to login.
- [ ] **Accessibility Audit** — No systematic ARIA labels.
- [x] **Toast Library Duplication** — Removed react-hot-toast.
`;
  const board = parseMarkdown(md);

  assertEqual(board.title, 'TODO');
  assertEqual(board.columns.length, 3);

  assertEqual(board.columns[0].name, '🔴 Critical');
  assertEqual(board.columns[0].cards.length, 2);
  assertEqual(board.columns[0].cards[0].done, false);
  assertEqual(board.columns[0].cards[1].done, true);

  assertEqual(board.columns[1].name, '🟡 Important');
  assertEqual(board.columns[1].cards.length, 2);

  assertEqual(board.columns[2].name, '🟢 Polish');
  assertEqual(board.columns[2].cards.length, 3);
});

run().then(ok => process.exit(ok ? 0 : 1));
