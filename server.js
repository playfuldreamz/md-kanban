#!/usr/bin/env node

/**
 * kanban-md server — Express + WebSocket + chokidar.
 *
 * Reads a TODO.md file, serves a Kanban board API, watches for changes,
 * and pushes live updates to connected browsers via WebSocket.
 *
 * Usage: node server.js [--file <path>] [--port <n>] [--no-open]
 */

const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');
const { parseMarkdown } = require('./lib/parser');
const { serializeBoard } = require('./lib/writer');

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let filePath = './TODO.md';
let port = 3456;
let openBrowser = true;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--file' && args[i + 1]) {
    filePath = args[++i];
  } else if (args[i] === '--port' && args[i + 1]) {
    port = parseInt(args[++i], 10);
  } else if (args[i] === '--no-open') {
    openBrowser = false;
  } else if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
  kanban-md — Interactive Kanban board for your TODO.md

  Usage: npx kanban-md [options]

  Options:
    --file <path>   Path to TODO.md (default: ./TODO.md)
    --port <n>      Port to listen on (default: 3456)
    --no-open       Don't open the browser automatically
    --help, -h      Show this help
`);
    process.exit(0);
  }
}

const absFilePath = path.resolve(filePath);

// ─── State ───────────────────────────────────────────────────────────────────

let boardState = { title: '', columns: [] };

function readAndParse() {
  if (!fs.existsSync(absFilePath)) {
    boardState = { title: '', columns: [] };
    return;
  }
  const raw = fs.readFileSync(absFilePath, 'utf-8');
  boardState = parseMarkdown(raw);
}

function writeBoard(board) {
  const output = serializeBoard(board);
  fs.writeFileSync(absFilePath, output, 'utf-8');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Find a card by ID across all columns. Returns { column, index, card } or null. */
function findCard(board, cardId) {
  for (const col of board.columns) {
    const idx = col.cards.findIndex(c => c.id === cardId);
    if (idx !== -1) return { column: col, index: idx, card: col.cards[idx] };
  }
  return null;
}

/** Generate a new card object (not yet added to any column). */
function createCard(title, description, columnId) {
  const done = false;
  const hashInput = (title + '::' + columnId).toLowerCase().trim();
  // djb2 from parser is not exported, inline it
  let h = 5381;
  for (let i = 0; i < hashInput.length; i++) {
    h = ((h << 5) + h + hashInput.charCodeAt(i)) >>> 0;
  }
  const id = h.toString(16);

  const checkbox = '- [ ]';
  const titlePart = `**${title}**`;
  const descPart = description ? ` — ${description}` : '';
  const rawLine = `${checkbox} ${titlePart}${descPart}`;

  return { id, done: false, title, description, rawLine };
}

// ─── Express app ─────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// CORS: allow any localhost origin
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ─── Routes ──────────────────────────────────────────────────────────────────

/** GET /api/board — Return the current board state. */
app.get('/api/board', (req, res) => {
  try {
    res.json(boardState);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/cards — Add a card to a column. Body: { columnId, title, description? } */
app.post('/api/cards', (req, res) => {
  try {
    const { columnId, title, description } = req.body;
    if (!columnId || !title || !title.trim()) {
      return res.status(400).json({ error: 'columnId and title are required' });
    }

    const column = boardState.columns.find(c => c.id === columnId);
    if (!column) {
      return res.status(404).json({ error: `Column "${columnId}" not found` });
    }

    const card = createCard(title.trim(), (description || '').trim(), columnId);
    column.cards.push(card);
    writeBoard(boardState);
    // Re-read to sync (chokidar will also fire, but we want immediate response)
    readAndParse();
    res.status(201).json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** PUT /api/cards/:id — Update a card's title, description, and/or done state. */
app.put('/api/cards/:id', (req, res) => {
  try {
    const found = findCard(boardState, req.params.id);
    if (!found) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const { title, description, done } = req.body;
    const card = found.card;

    if (title !== undefined) card.title = String(title).trim() || card.title;
    if (description !== undefined) card.description = String(description).trim();
    if (done !== undefined) card.done = Boolean(done);
    card._changed = true;

    writeBoard(boardState);
    readAndParse();
    // Return the updated card (re-find it since IDs may have changed after re-parse)
    const refound = findCard(boardState, card.id);
    res.json(refound ? refound.card : card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** PUT /api/cards/:id/move — Move a card to a different column and/or position. */
app.put('/api/cards/:id/move', (req, res) => {
  try {
    const { columnId, index } = req.body;
    if (!columnId) {
      return res.status(400).json({ error: 'columnId is required' });
    }

    const found = findCard(boardState, req.params.id);
    if (!found) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const targetColumn = boardState.columns.find(c => c.id === columnId);
    if (!targetColumn) {
      return res.status(404).json({ error: `Column "${columnId}" not found` });
    }

    // Remove from source
    const card = found.card;
    found.column.cards.splice(found.index, 1);

    // Insert at target position
    const insertAt = (index !== undefined && index >= 0)
      ? Math.min(index, targetColumn.cards.length)
      : targetColumn.cards.length;
    targetColumn.cards.splice(insertAt, 0, card);

    writeBoard(boardState);
    readAndParse();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** DELETE /api/cards/:id — Remove a card entirely. */
app.delete('/api/cards/:id', (req, res) => {
  try {
    const found = findCard(boardState, req.params.id);
    if (!found) {
      return res.status(404).json({ error: 'Card not found' });
    }

    found.column.cards.splice(found.index, 1);
    writeBoard(boardState);
    readAndParse();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/health — Simple health check. */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    file: absFilePath,
    fileExists: fs.existsSync(absFilePath),
    columns: boardState.columns.length,
    cards: boardState.columns.reduce((sum, c) => sum + c.cards.length, 0),
  });
});

// ─── Static files (production build of React frontend) ───────────────────────

const clientDist = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA fallback: serve index.html for any non-API route
  app.use((req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  // Dev mode: just show a message for non-API routes
  app.use((req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
    res.type('html').send(`<!doctype html>
<html><body style="font-family:system-ui;padding:2rem">
  <h1>kanban-md</h1>
  <p>Client not built yet.</p>
  <pre>cd client && npm run build</pre>
  <p>API: <a href="/api/health">/api/health</a> | <a href="/api/board">/api/board</a></p>
</body></html>`);
  });
}

// ─── HTTP + WebSocket server ─────────────────────────────────────────────────

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  // Send current state immediately on connect
  ws.send(JSON.stringify({ type: 'sync', board: boardState }));

  ws.on('error', () => {
    // Client disconnected — ignore
  });
});

/** Broadcast board state to all connected WebSocket clients. */
function broadcast(board) {
  const msg = JSON.stringify({ type: 'sync', board });
  for (const client of wss.clients) {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(msg);
    }
  }
}

// ─── File watcher ────────────────────────────────────────────────────────────

let watcherReady = false;

const watcher = chokidar.watch(absFilePath, {
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 50, pollInterval: 10 },
});

watcher.on('change', () => {
  readAndParse();
  broadcast(boardState);
});

watcher.on('unlink', () => {
  boardState = { title: '', columns: [] };
  broadcast(boardState);
});

watcher.on('add', () => {
  // File was created (or re-created after deletion)
  readAndParse();
  broadcast(boardState);
});

watcher.on('ready', () => {
  watcherReady = true;
});

// ─── Startup ─────────────────────────────────────────────────────────────────

function start(attemptPort) {
  return new Promise((resolve, reject) => {
    server.listen(attemptPort, '127.0.0.1', () => {
      resolve(attemptPort);
    });
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(null); // Port in use, caller tries next
      } else {
        reject(err);
      }
    });
  });
}

async function main() {
  // Initial read
  readAndParse();

  // Try ports
  let actualPort = null;
  for (let p = port; p <= port + 10; p++) {
    actualPort = await start(p);
    if (actualPort) break;
  }

  if (!actualPort) {
    console.error(`Error: Could not find an available port (tried ${port}-${port + 10})`);
    process.exit(1);
  }

  console.log(`\n  🏷️  kanban-md`);
  console.log(`  📄  ${absFilePath}`);
  console.log(`  🌐  http://localhost:${actualPort}`);
  console.log(`  📊  ${boardState.columns.length} columns, ${boardState.columns.reduce((s, c) => s + c.cards.length, 0)} cards`);
  console.log(`\n  Watching for changes...\n`);

  // Open browser
  if (openBrowser) {
    const url = `http://localhost:${actualPort}`;
    const platform = process.platform;
    const cmd = platform === 'darwin' ? 'open' : platform === 'win32' ? 'start' : 'xdg-open';
    require('child_process').exec(`${cmd} ${url}`);
  }
}

// ─── Graceful shutdown ───────────────────────────────────────────────────────

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  watcher.close();
  wss.close();
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  watcher.close();
  wss.close();
  server.close();
  process.exit(0);
});

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
