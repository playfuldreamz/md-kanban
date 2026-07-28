/**
 * Writer test suite.
 * Run: node lib/writer.test.js
 */

const { parseMarkdown } = require('./parser');
const { serializeBoard, serializeCard, cardHasChanged } = require('./writer');
const { test, assert, assertEqual, run } = require('./test-utils');

// ─── Card serialization tests ───

test('serializeCard: unchanged card uses rawLine', () => {
  const card = {
    id: 'abc',
    done: false,
    title: 'Fix login bug',
    description: 'Users on Safari get a blank screen',
    rawLine: '- [ ] **Fix login bug** — Users on Safari get a blank screen',
  };
  const result = serializeCard(card);
  assertEqual(result, card.rawLine);
});

test('serializeCard: changed card gets canonical format', () => {
  const card = {
    id: 'abc',
    done: true,
    title: 'Fix login bug',
    description: 'Users on Safari get a blank screen',
    rawLine: '- [ ] **Fix login bug** — Users on Safari get a blank screen',
    _changed: true,
  };
  const result = serializeCard(card);
  assertEqual(result, '- [x] **Fix login bug** — Users on Safari get a blank screen');
});

test('serializeCard: card with no description', () => {
  const card = {
    id: 'abc',
    done: false,
    title: 'Simple task',
    description: '',
    rawLine: '- [ ] **Simple task**',
    _changed: true,
  };
  const result = serializeCard(card);
  assertEqual(result, '- [ ] **Simple task**');
});

test('serializeCard: done card with no description', () => {
  const card = {
    id: 'abc',
    done: true,
    title: 'Completed task',
    description: '',
    rawLine: '- [ ] **Completed task**',
    _changed: true,
  };
  const result = serializeCard(card);
  assertEqual(result, '- [x] **Completed task**');
});

// ─── Change detection tests ───

test('cardHasChanged: detects changed done state', () => {
  const card = {
    done: true,
    title: 'Fix login bug',
    description: 'Users on Safari get a blank screen',
    rawLine: '- [ ] **Fix login bug** — Users on Safari get a blank screen',
  };
  assert(cardHasChanged(card), 'Should detect changed done state');
});

test('cardHasChanged: detects changed title', () => {
  const card = {
    done: false,
    title: 'Different title',
    description: 'Users on Safari get a blank screen',
    rawLine: '- [ ] **Fix login bug** — Users on Safari get a blank screen',
  };
  assert(cardHasChanged(card), 'Should detect changed title');
});

test('cardHasChanged: detects changed description', () => {
  const card = {
    done: false,
    title: 'Fix login bug',
    description: 'A new description',
    rawLine: '- [ ] **Fix login bug** — Users on Safari get a blank screen',
  };
  assert(cardHasChanged(card), 'Should detect changed description');
});

test('cardHasChanged: unchanged card returns false', () => {
  const card = {
    done: false,
    title: 'Fix login bug',
    description: 'Users on Safari get a blank screen',
    rawLine: '- [ ] **Fix login bug** — Users on Safari get a blank screen',
  };
  assert(!cardHasChanged(card), 'Unchanged card should return false');
});

test('cardHasChanged: explicit _changed flag takes priority', () => {
  const card = {
    done: false,
    title: 'Fix login bug',
    description: 'Users on Safari get a blank screen',
    rawLine: '- [ ] **Fix login bug** — Users on Safari get a blank screen',
    _changed: true,
  };
  assert(cardHasChanged(card), '_changed flag should force change');
});

// ─── Board serialization tests ───

test('serializeBoard: round-trip preserves all card data', () => {
  const md = `# TODO

## 🔴 Critical
- [ ] **Testing** — Zero tests anywhere.

- [ ] **CI/CD Pipeline** — No workflow files.

Some paragraph that should be ignored.

## 🟡 Important
- [x] **Done task** — Already finished
- [ ] **Pending task** — Not yet started
`;

  const board = parseMarkdown(md);
  const serialized = serializeBoard(board);
  const reparsed = parseMarkdown(serialized);

  assertEqual(reparsed.title, 'TODO');
  assertEqual(reparsed.columns.length, 2);

  assertEqual(reparsed.columns[0].cards.length, 2);
  assertEqual(reparsed.columns[0].cards[0].title, 'Testing');
  assertEqual(reparsed.columns[0].cards[0].done, false);
  assertEqual(reparsed.columns[0].cards[0].description, 'Zero tests anywhere.');
  assertEqual(reparsed.columns[0].cards[1].title, 'CI/CD Pipeline');

  assertEqual(reparsed.columns[1].cards.length, 2);
  assertEqual(reparsed.columns[1].cards[0].title, 'Done task');
  assertEqual(reparsed.columns[1].cards[0].done, true);

  assert(serialized.includes('# TODO'));
  assert(serialized.includes('## 🔴 Critical'));
  assert(serialized.includes('## 🟡 Important'));
  assert(serialized.includes('- [ ] **Testing**'));
  assert(serialized.includes('- [x] **Done task**'));
});

test('serializeBoard: minimal diff — only changed card is rewritten', () => {
  const md = `# Project

## Section
- [ ] **Task A** — Original desc
- [ ] **Task B** — Will change
- [ ] **Task C** — Stays
`;

  const board = parseMarkdown(md);
  board.columns[0].cards[1].title = 'Task B Modified';
  board.columns[0].cards[1]._changed = true;

  const serialized = serializeBoard(board);
  const lines = serialized.split('\n');

  const taskALine = lines.find(l => l.includes('Task A'));
  assert(taskALine.includes('Original desc'), 'Task A should keep original rawLine');

  const taskBLine = lines.find(l => l.includes('Task B Modified'));
  assert(taskBLine !== undefined, 'Task B should be present with new title');

  const taskCLine = lines.find(l => l.includes('Task C'));
  assert(taskCLine.includes('Stays'), 'Task C should keep original rawLine');
});

test('serializeBoard: handles empty board', () => {
  const board = { title: '', columns: [] };
  const result = serializeBoard(board);
  assertEqual(result, '\n');
});

test('serializeBoard: handles board with title only', () => {
  const board = { title: 'My Project', columns: [] };
  const result = serializeBoard(board);
  assert(result.startsWith('# My Project'));
});

test('serializeBoard: handles board with one column, no cards', () => {
  const board = {
    title: 'Project',
    columns: [
      { id: 'todo', name: '📋 To Do', emoji: '📋', cards: [] },
    ],
  };
  const result = serializeBoard(board);
  assert(result.includes('# Project'));
  assert(result.includes('## 📋 To Do'));
});

test('serializeBoard: handles board with multiple columns, mixed cards', () => {
  const board = {
    title: 'Sprint',
    columns: [
      {
        id: 'todo', name: '📋 To Do', emoji: '📋',
        cards: [
          { id: '1', done: false, title: 'Task 1', description: 'Desc 1', rawLine: '- [ ] **Task 1** — Desc 1' },
          { id: '2', done: false, title: 'Task 2', description: '', rawLine: '- [ ] **Task 2**' },
        ],
      },
      {
        id: 'done', name: '✅ Done', emoji: '✅',
        cards: [
          { id: '3', done: true, title: 'Task 3', description: 'Finished', rawLine: '- [x] **Task 3** — Finished' },
        ],
      },
    ],
  };
  const result = serializeBoard(board);
  const reparsed = parseMarkdown(result);

  assertEqual(reparsed.columns.length, 2);
  assertEqual(reparsed.columns[0].cards.length, 2);
  assertEqual(reparsed.columns[1].cards.length, 1);
  assertEqual(reparsed.columns[0].cards[0].done, false);
  assertEqual(reparsed.columns[1].cards[0].done, true);
});

run().then(ok => process.exit(ok ? 0 : 1));
