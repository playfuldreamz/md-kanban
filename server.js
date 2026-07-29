#!/usr/bin/env node

/**
 * md-kanban server — Express + WebSocket + chokidar.
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
const { registerRoutes } = require('./lib/routes');
const { readAndParse, writeBoard, findCard, createCard } = require('./lib/server-utils');

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
  md-kanban — Interactive Kanban board for your TODO.md

  Usage: npx md-kanban [options]

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

// ─── Mutable board state ─────────────────────────────────────────────────────

const boardRef = { current: { title: '', columns: [] } };

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

// ─── HTTP + WebSocket server ─────────────────────────────────────────────────

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

function broadcast(board) {
  const msg = JSON.stringify({ type: 'sync', board });
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(msg);
  }
}

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'sync', board: boardRef.current }));
  ws.on('error', () => {});
});

// Suppress EADDRINUSE on the WS server — handled by the HTTP fallback loop
wss.on('error', () => {});

// ─── Routes ──────────────────────────────────────────────────────────────────

registerRoutes(app, {
  boardRef,
  absFilePath,
  readAndParse: () => readAndParse(absFilePath, boardRef),
  writeBoard: (board) => writeBoard(board, absFilePath),
  findCard: (board, id) => findCard(board, id),
  createCard: (title, desc, colId) => createCard(title, desc, colId),
  broadcast,
});

// ─── Static files ────────────────────────────────────────────────────────────

const clientDist = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.use((req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
    res.type('html').send(`<!doctype html>
<html><body style="font-family:system-ui;padding:2rem">
  <h1>md-kanban</h1>
  <p>Client not built yet.</p>
  <pre>cd client && npm run build</pre>
  <p>API: <a href="/api/health">/api/health</a> | <a href="/api/board">/api/board</a></p>
</body></html>`);
  });
}

// ─── File watcher ────────────────────────────────────────────────────────────

const watcher = chokidar.watch(absFilePath, {
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 50, pollInterval: 10 },
});

watcher.on('change', () => {
  readAndParse(absFilePath, boardRef);
  broadcast(boardRef.current);
});

watcher.on('unlink', () => {
  boardRef.current = { title: '', columns: [] };
  broadcast(boardRef.current);
});

watcher.on('add', () => {
  readAndParse(absFilePath, boardRef);
  broadcast(boardRef.current);
});

watcher.on('ready', () => {});

// ─── Startup ─────────────────────────────────────────────────────────────────

function start(attemptPort) {
  return new Promise((resolve, reject) => {
    server.listen(attemptPort, '127.0.0.1', () => resolve(attemptPort));
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') resolve(null);
      else reject(err);
    });
  });
}

async function main() {
  readAndParse(absFilePath, boardRef);

  let actualPort = null;
  for (let p = port; p <= port + 10; p++) {
    actualPort = await start(p);
    if (actualPort) break;
  }
  if (!actualPort) {
    console.error(`Error: Could not find an available port (tried ${port}-${port + 10})`);
    process.exit(1);
  }

  const totalCards = boardRef.current.columns.reduce((s, c) => s + c.cards.length, 0);
  console.log(`\n  🏷️  md-kanban`);
  console.log(`  📄  ${absFilePath}`);
  console.log(`  🌐  http://localhost:${actualPort}`);
  console.log(`  📊  ${boardRef.current.columns.length} columns, ${totalCards} cards`);
  console.log(`\n  Watching for changes...\n`);

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
