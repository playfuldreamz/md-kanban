/**
 * Server integration tests.
 *
 * Starts the server against a temporary TODO.md, tests every endpoint,
 * then cleans up. Does NOT touch the project's real TODO.md.
 *
 * Run: node lib/server.test.js
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { test, assert, assertEqual, run } = require('./test-utils');

// ─── Setup: create a temp TODO.md ───────────────────────────────────────────

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kanban-md-test-'));
const tmpFile = path.join(tmpDir, 'TODO.md');

const initialMd = `# Test Project

## 🔴 Critical
- [ ] **Fix bug** — Something broken
- [x] **Deploy** — Already shipped

## 🟡 Backlog
- [ ] **Refactor** — Clean up code
`;

fs.writeFileSync(tmpFile, initialMd, 'utf-8');

let serverProcess;
let baseUrl;

// ─── Start server ────────────────────────────────────────────────────────────

function startServer() {
  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', ['server.js', '--file', tmpFile, '--no-open'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
    });

    let started = false;
    const timeout = setTimeout(() => {
      if (!started) reject(new Error('Server startup timed out'));
    }, 5000);

    serverProcess.stdout.on('data', (data) => {
      const text = data.toString();
      // Extract port from output: "http://localhost:3456"
      const match = text.match(/localhost:(\d+)/);
      if (match && !started) {
        started = true;
        clearTimeout(timeout);
        baseUrl = `http://localhost:${match[1]}`;
        // Give it a moment to fully initialize
        setTimeout(resolve, 500);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      // Ignore normal stderr
    });

    serverProcess.on('error', reject);
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  // Clean up temp file
  try { fs.unlinkSync(tmpFile); } catch (_) {}
  try { fs.rmdirSync(tmpDir); } catch (_) {}
}

// ─── Helper: fetch wrapper ───────────────────────────────────────────────────

async function api(method, urlPath, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(baseUrl + urlPath, opts);
  const json = await res.json();
  return { status: res.status, body: json };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test('GET /api/health — returns status', async () => {
  const { status, body } = await api('GET', '/api/health');
  assertEqual(status, 200);
  assertEqual(body.status, 'ok');
  assertEqual(body.columns, 2);
  assertEqual(body.cards, 3); // 2 in critical + 1 in backlog
  assertEqual(body.fileExists, true);
});

test('GET /api/board — returns full board', async () => {
  const { status, body } = await api('GET', '/api/board');
  assertEqual(status, 200);
  assertEqual(body.title, 'Test Project');
  assertEqual(body.columns.length, 2);
  assertEqual(body.columns[0].name, '🔴 Critical');
  assertEqual(body.columns[0].cards.length, 2);
  assertEqual(body.columns[1].name, '🟡 Backlog');
  assertEqual(body.columns[1].cards.length, 1);
});

test('POST /api/cards — adds card to column', async () => {
  const { status, body } = await api('POST', '/api/cards', {
    columnId: 'backlog',
    title: 'New task',
    description: 'From test',
  });
  assertEqual(status, 201);
  assertEqual(body.title, 'New task');
  assertEqual(body.description, 'From test');
  assertEqual(body.done, false);
  assert(body.id, 'Card should have an id');

  // Verify it's in the board
  const board = await api('GET', '/api/board');
  const backlogCol = board.body.columns.find(c => c.id === 'backlog');
  assert(backlogCol.cards.some(c => c.title === 'New task'), 'Card should appear in backlog');
});

test('POST /api/cards — rejects missing title', async () => {
  const { status } = await api('POST', '/api/cards', { columnId: 'backlog', title: '' });
  assertEqual(status, 400);
});

test('POST /api/cards — rejects unknown column', async () => {
  const { status } = await api('POST', '/api/cards', { columnId: 'nonexistent', title: 'Test' });
  assertEqual(status, 404);
});

test('PUT /api/cards/:id — updates card', async () => {
  // First, find a card to update
  const board = await api('GET', '/api/board');
  const card = board.body.columns[0].cards[0];

  const { status, body } = await api('PUT', `/api/cards/${card.id}`, {
    title: 'Updated title',
    done: true,
  });
  assertEqual(status, 200);
  assertEqual(body.title, 'Updated title');
  assertEqual(body.done, true);
});

test('PUT /api/cards/:id — 404 for unknown card', async () => {
  const { status } = await api('PUT', '/api/cards/nonexistent-id', { title: 'Nope' });
  assertEqual(status, 404);
});

test('PUT /api/cards/:id/move — moves card between columns', async () => {
  // Get initial state
  const before = await api('GET', '/api/board');
  const criticalCardsBefore = before.body.columns[0].cards.length;
  const backlogCardsBefore = before.body.columns[1].cards.length;

  // Move first critical card to backlog
  const cardToMove = before.body.columns[0].cards[0];
  const { status } = await api('PUT', `/api/cards/${cardToMove.id}/move`, {
    columnId: 'backlog',
    index: 0,
  });
  assertEqual(status, 200);

  // Verify
  const after = await api('GET', '/api/board');
  assertEqual(after.body.columns[0].cards.length, criticalCardsBefore - 1);
  assertEqual(after.body.columns[1].cards.length, backlogCardsBefore + 1);
  // Card IDs change when moving columns (ID = hash(title + columnId)),
  // so verify by title, not ID.
  assertEqual(after.body.columns[1].cards[0].title, cardToMove.title, 'Card should be at index 0 in backlog');
});

test('DELETE /api/cards/:id — removes card', async () => {
  const board = await api('GET', '/api/board');
  const card = board.body.columns[0].cards[0];
  const cardsBefore = board.body.columns.reduce((s, c) => s + c.cards.length, 0);

  const { status } = await api('DELETE', `/api/cards/${card.id}`);
  assertEqual(status, 200);

  const after = await api('GET', '/api/board');
  const cardsAfter = after.body.columns.reduce((s, c) => s + c.cards.length, 0);
  assertEqual(cardsAfter, cardsBefore - 1);
});

test('DELETE /api/cards/:id — 404 for unknown card', async () => {
  const { status } = await api('DELETE', '/api/cards/nonexistent-id');
  assertEqual(status, 404);
});

test('File change detection — external edit triggers sync', () => {
  return new Promise((resolve, reject) => {
    const modifiedMd = `# Modified

## Column
- [ ] **New card from file** — External edit
`;
    fs.writeFileSync(tmpFile, modifiedMd, 'utf-8');

    setTimeout(async () => {
      try {
        const { body } = await api('GET', '/api/board');
        assertEqual(body.title, 'Modified');
        assertEqual(body.columns.length, 1);
        assertEqual(body.columns[0].cards[0].title, 'New card from file');
        resolve();
      } catch (err) {
        reject(err);
      }
    }, 600);
  });
});

test('File deletion — returns empty board', () => {
  return new Promise((resolve, reject) => {
    fs.unlinkSync(tmpFile);

    setTimeout(async () => {
      try {
        const { body } = await api('GET', '/api/board');
        assertEqual(body.columns.length, 0);
        // Recreate file for subsequent tests / cleanup
        fs.writeFileSync(tmpFile, initialMd, 'utf-8');
        resolve();
      } catch (err) {
        reject(err);
      }
    }, 600);
  });
});

// ─── Run ─────────────────────────────────────────────────────────────────────

(async () => {
  try {
    await startServer();
    console.log(`Server started on ${baseUrl}`);
    await run();
  } catch (err) {
    console.error('Test harness error:', err.message);
    process.exit(1);
  } finally {
    stopServer();
    console.log('Cleaned up.');
  }
})();
