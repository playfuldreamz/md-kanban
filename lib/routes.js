/**
 * Express route handlers for the md-kanban REST API.
 *
 * All routes accept a `?file=` query parameter to target a specific board.
 * If omitted, the first registered file is used as default.
 *
 * @param {import('express').Express} app
 * @param {object} ctx
 * @param {Map<string, { boardRef: { current: object } }>} ctx.boards  — file path → board state
 * @param {Function} ctx.readAndParse     — (absPath) => re-read and re-parse
 * @param {Function} ctx.writeBoard       — (board, absPath) => serialize + write
 * @param {Function} ctx.findCard         — (board, cardId) => recursive lookup
 * @param {Function} ctx.createCard       — (title, desc, colId) => new card
 * @param {Function} ctx.broadcast        — (file, board) => push to WS clients
 * @param {Function} ctx.getDefaultFile   — () => first registered file path
 */

const fs = require('fs');

function registerRoutes(app, ctx) {
  const { boards, readAndParse, writeBoard, findCard, createCard, broadcast, getDefaultFile } = ctx;

  /** Resolve the file path from ?file= query param, falling back to default. */
  function resolveFile(req) {
    const file = req.query.file;
    if (file && boards.has(file)) return file;
    if (file) return null; // unknown file
    const def = getDefaultFile();
    return def && boards.has(def) ? def : null;
  }

  // ─── Files ──────────────────────────────────────────────────────────────

  app.get('/api/files', (_req, res) => {
    const list = [];
    for (const [abs, entry] of boards) {
      const b = entry.boardRef.current;
      list.push({
        file: abs,
        title: b.title || abs.split(/[/\\]/).pop().replace('.md', ''),
        columns: b.columns.length,
        cards: b.columns.reduce((s, c) => s + c.cards.length, 0),
      });
    }
    res.json(list);
  });

  // ─── Board ──────────────────────────────────────────────────────────────

  app.get('/api/board', (req, res) => {
    try {
      const file = resolveFile(req);
      if (!file) return res.status(400).json({ error: 'Invalid or missing file parameter' });
      res.json(boards.get(file).boardRef.current);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Cards ──────────────────────────────────────────────────────────────

  app.post('/api/cards', (req, res) => {
    try {
      const file = resolveFile(req);
      if (!file) return res.status(400).json({ error: 'Invalid file' });
      const board = boards.get(file).boardRef.current;
      const { columnId, title, description } = req.body;
      if (!columnId || !title || !title.trim()) {
        return res.status(400).json({ error: 'columnId and title are required' });
      }
      const column = board.columns.find(c => c.id === columnId);
      if (!column) return res.status(404).json({ error: `Column "${columnId}" not found` });
      const card = createCard(title.trim(), (description || '').trim(), columnId);
      column.cards.push(card);
      writeBoard(board, file);
      readAndParse(file);
      res.status(201).json(card);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/cards/:id', (req, res) => {
    try {
      const file = resolveFile(req);
      if (!file) return res.status(400).json({ error: 'Invalid file' });
      const board = boards.get(file).boardRef.current;
      const found = findCard(board, req.params.id);
      if (!found) return res.status(404).json({ error: 'Card not found' });
      const { title, description, done, children } = req.body;
      const card = found.card;
      if (title !== undefined) card.title = String(title).trim() || card.title;
      if (description !== undefined) card.description = String(description).trim();
      if (done !== undefined && !found.parentCard) {
        const newDone = Boolean(done);
        const oldDone = card.done;
        card.done = newDone;
        if (newDone && !oldDone && !isDoneColumn(found.column)) {
          moveCardToColumn(board, card, found.column, found.index, 'done');
        } else if (!newDone && oldDone && isDoneColumn(found.column)) {
          const todo = board.columns.find(c => !isDoneColumn(c));
          moveCardToColumn(board, card, found.column, found.index, todo ? todo.id : found.column.id);
        }
      } else if (done !== undefined) {
        card.done = Boolean(done);
      }
      if (children !== undefined) {
        card.children = children;
        if (card.children) for (const child of card.children) child._changed = true;
      }
      card._changed = true;
      writeBoard(board, file);
      readAndParse(file);
      const refound = findCard(board, card.id);
      res.json(refound ? refound.card : card);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/cards/:id/move', (req, res) => {
    try {
      const file = resolveFile(req);
      if (!file) return res.status(400).json({ error: 'Invalid file' });
      const board = boards.get(file).boardRef.current;
      const { columnId, index } = req.body;
      if (!columnId) return res.status(400).json({ error: 'columnId is required' });
      const found = findCard(board, req.params.id);
      if (!found) return res.status(404).json({ error: 'Card not found' });
      const targetColumn = board.columns.find(c => c.id === columnId);
      if (!targetColumn) return res.status(404).json({ error: `Column "${columnId}" not found` });
      const card = found.card;
      const sourceColumn = found.column;
      if (isDoneColumn(targetColumn) && !isDoneColumn(sourceColumn)) setDoneRecursive(card, true);
      else if (!isDoneColumn(targetColumn) && isDoneColumn(sourceColumn)) setDoneRecursive(card, false);
      sourceColumn.cards.splice(found.index, 1);
      const insertAt = (index !== undefined && index >= 0) ? Math.min(index, targetColumn.cards.length) : targetColumn.cards.length;
      targetColumn.cards.splice(insertAt, 0, card);
      writeBoard(board, file);
      readAndParse(file);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/cards/:id', (req, res) => {
    try {
      const file = resolveFile(req);
      if (!file) return res.status(400).json({ error: 'Invalid file' });
      const board = boards.get(file).boardRef.current;
      const found = findCard(board, req.params.id);
      if (!found) return res.status(404).json({ error: 'Card not found' });
      found.column.cards.splice(found.index, 1);
      writeBoard(board, file);
      readAndParse(file);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Columns ────────────────────────────────────────────────────────────

  app.post('/api/columns', (req, res) => {
    try {
      const file = resolveFile(req);
      if (!file) return res.status(400).json({ error: 'Invalid file' });
      const board = boards.get(file).boardRef.current;
      const { name } = req.body;
      if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
      const id = name.trim().toLowerCase().replace(/[^\w\s-]/g,'').replace(/[\s_]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'') || 'untitled';
      board.columns.push({ id, name: name.trim(), emoji: null, cards: [] });
      writeBoard(board, file);
      readAndParse(file);
      res.status(201).json({ id, name: name.trim() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/columns/:id', (req, res) => {
    try {
      const file = resolveFile(req);
      if (!file) return res.status(400).json({ error: 'Invalid file' });
      const board = boards.get(file).boardRef.current;
      const col = board.columns.find(c => c.id === req.params.id);
      if (!col) return res.status(404).json({ error: 'Column not found' });
      if (isMandatoryColumn(col)) return res.status(400).json({ error: 'Cannot delete a mandatory column' });
      const todoCol = board.columns.find(c => !isDoneColumn(c) && !isMandatoryColumn(c)) || board.columns[0];
      if (todoCol && col.cards.length > 0) todoCol.cards.push(...col.cards);
      board.columns = board.columns.filter(c => c.id !== col.id);
      writeBoard(board, file);
      broadcast(file, board);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Convert ────────────────────────────────────────────────────────────

  app.post('/api/convert', (req, res) => {
    try {
      const file = resolveFile(req);
      if (!file) return res.status(400).json({ error: 'Invalid file' });
      const board = boards.get(file).boardRef.current;
      const priorityKeywords = {
        critical: '#critical', urgent: '#critical', blocker: '#critical',
        important: '#important', high: '#important', priority: '#important',
        polish: '#polish', nice: '#polish', low: '#polish', later: '#polish', backlog: '#polish',
      };
      const allCards = board.columns.flatMap(col => {
        const colLower = col.name.toLowerCase();
        let tag = '';
        for (const [kw, t] of Object.entries(priorityKeywords)) {
          if (colLower.includes(kw)) { tag = t; break; }
        }
        return col.cards.map(card => {
          if (!tag) return card;
          if (card.description && card.description.includes(tag)) return card;
          card.description = card.description ? card.description + ' ' + tag : tag;
          card._changed = true;
          return card;
        });
      });
      const doneCards = allCards.filter(c => c.done);
      const activeCards = allCards.filter(c => !c.done);
      boards.get(file).boardRef.current = {
        title: board.title, preamble: board.preamble || '', priorities: board.priorities || {},
        columns: [
          { id: 'to-do', name: 'To Do', emoji: null, cards: activeCards },
          { id: 'in-progress', name: 'In Progress', emoji: null, cards: [] },
          { id: 'done', name: 'Done', emoji: null, cards: doneCards },
        ],
      };
      writeBoard(boards.get(file).boardRef.current, file);
      broadcast(file, boards.get(file).boardRef.current);
      res.json({ ok: true, columns: 3, cards: allCards.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Priorities ─────────────────────────────────────────────────────────

  app.put('/api/priorities', (req, res) => {
    try {
      const file = resolveFile(req);
      if (!file) return res.status(400).json({ error: 'Invalid file' });
      const board = boards.get(file).boardRef.current;
      const { priorities } = req.body;
      if (!priorities || typeof priorities !== 'object') return res.status(400).json({ error: 'priorities object is required' });
      board.priorities = priorities;
      writeBoard(board, file);
      broadcast(file, board);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Health ─────────────────────────────────────────────────────────────

  app.get('/api/health', (req, res) => {
    const file = resolveFile(req) || getDefaultFile();
    const entry = file ? boards.get(file) : null;
    const board = entry ? entry.boardRef.current : { columns: [] };
    res.json({
      status: 'ok',
      files: boards.size,
      file,
      fileExists: file ? fs.existsSync(file) : false,
      columns: board.columns.length,
      cards: board.columns.reduce((sum, c) => sum + c.cards.length, 0),
    });
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function isDoneColumn(col) {
  if (!col) return false;
  const id = (col.id || '').toLowerCase();
  const name = (col.name || '').toLowerCase();
  return id === 'done' || id.includes('done') || name.includes('done');
}

function isMandatoryColumn(col) {
  const name = col.name.toLowerCase();
  return name.includes('to do') || name.includes('progress') || name.includes('done');
}

function setDoneRecursive(card, done) {
  card.done = done; card._changed = true;
  if (card.children) for (const child of card.children) setDoneRecursive(child, done);
}

function moveCardToColumn(board, card, sourceColumn, sourceIndex, targetHint) {
  let target = board.columns.find(c => c.id === targetHint || c.id.includes(targetHint) || c.name.toLowerCase().includes(targetHint));
  if (!target && targetHint === 'done') {
    target = { id: 'done', name: 'Done', emoji: null, cards: [] };
    board.columns.push(target);
  }
  if (!target) return;
  sourceColumn.cards.splice(sourceIndex, 1);
  target.cards.push(card);
}

module.exports = { registerRoutes };
