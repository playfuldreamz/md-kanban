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
  assertEqual(parseCardLine('  - [ ] indented', 'col', 0), null);
  assertEqual(parseCardLine('* [ ] asterisk list', 'col', 0), null);
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
