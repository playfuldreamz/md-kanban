/**
 * Express route handlers for the md-kanban REST API.
 *
 * Receives a shared context object so routes can read/write board state
 * and trigger file syncs without importing server internals directly.
 *
 * @param {import('express').Express} app
 * @param {object} ctx
 * @param {{ current: object }} ctx.boardRef  — mutable ref { current: BoardState }
 * @param {string} ctx.absFilePath            — absolute path to TODO.md
 * @param {Function} ctx.readAndParse         — re-read and re-parse the file
 * @param {Function} ctx.writeBoard           — serialize + write to disk
 * @param {Function} ctx.findCard             — recursive card lookup
 * @param {Function} ctx.createCard           — new card factory
 * @param {Function} ctx.broadcast            — push state to all WS clients
 */

const fs = require('fs');

function registerRoutes(app, ctx) {
  const { boardRef, absFilePath, readAndParse, writeBoard, findCard, createCard, broadcast } = ctx;

  // ─── Board ──────────────────────────────────────────────────────────────

  app.get('/api/board', (_req, res) => {
    try {
      res.json(boardRef.current);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Cards ──────────────────────────────────────────────────────────────

  app.post('/api/cards', (req, res) => {
    try {
      const { columnId, title, description } = req.body;
      if (!columnId || !title || !title.trim()) {
        return res.status(400).json({ error: 'columnId and title are required' });
      }
      const column = boardRef.current.columns.find(c => c.id === columnId);
      if (!column) {
        return res.status(404).json({ error: `Column "${columnId}" not found` });
      }
      const card = createCard(title.trim(), (description || '').trim(), columnId);
      column.cards.push(card);
      writeBoard(boardRef.current, absFilePath);
      readAndParse();
      res.status(201).json(card);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/cards/:id', (req, res) => {
    try {
      const found = findCard(boardRef.current, req.params.id);
      if (!found) {
        return res.status(404).json({ error: 'Card not found' });
      }
      const { title, description, done, children } = req.body;
      const card = found.card;
      if (title !== undefined) card.title = String(title).trim() || card.title;
      if (description !== undefined) card.description = String(description).trim();
      if (done !== undefined) card.done = Boolean(done);
      if (children !== undefined) {
        card.children = children;
        if (card.children) {
          for (const child of card.children) child._changed = true;
        }
      }
      card._changed = true;
      writeBoard(boardRef.current, absFilePath);
      readAndParse();
      const refound = findCard(boardRef.current, card.id);
      res.json(refound ? refound.card : card);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/cards/:id/move', (req, res) => {
    try {
      const { columnId, index } = req.body;
      if (!columnId) {
        return res.status(400).json({ error: 'columnId is required' });
      }
      const found = findCard(boardRef.current, req.params.id);
      if (!found) {
        return res.status(404).json({ error: 'Card not found' });
      }
      const targetColumn = boardRef.current.columns.find(c => c.id === columnId);
      if (!targetColumn) {
        return res.status(404).json({ error: `Column "${columnId}" not found` });
      }
      const card = found.card;
      found.column.cards.splice(found.index, 1);
      const insertAt = (index !== undefined && index >= 0)
        ? Math.min(index, targetColumn.cards.length)
        : targetColumn.cards.length;
      targetColumn.cards.splice(insertAt, 0, card);
      writeBoard(boardRef.current, absFilePath);
      readAndParse();
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/cards/:id', (req, res) => {
    try {
      const found = findCard(boardRef.current, req.params.id);
      if (!found) {
        return res.status(404).json({ error: 'Card not found' });
      }
      found.column.cards.splice(found.index, 1);
      writeBoard(boardRef.current, absFilePath);
      readAndParse();
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Columns ────────────────────────────────────────────────────────────

  app.post('/api/columns', (req, res) => {
    try {
      const { name } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'name is required' });
      }
      const id = name.trim().toLowerCase()
        .replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-')
        .replace(/-+/g, '-').replace(/^-|-$/g, '') || 'untitled';
      boardRef.current.columns.push({ id, name: name.trim(), emoji: null, cards: [] });
      writeBoard(boardRef.current, absFilePath);
      readAndParse();
      res.status(201).json({ id, name: name.trim() });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/columns/:id', (req, res) => {
    try {
      const col = boardRef.current.columns.find(c => c.id === req.params.id);
      if (!col) return res.status(404).json({ error: 'Column not found' });
      const name = col.name.toLowerCase();
      if (name.includes('to do') || name.includes('progress') || name.includes('done')) {
        return res.status(400).json({ error: 'Cannot delete a mandatory column' });
      }
      const todoCol = boardRef.current.columns.find(
        c => c.name.toLowerCase().includes('to do') || c.id.includes('to-do')
      );
      if (todoCol && col.cards.length > 0) {
        todoCol.cards.push(...col.cards);
      }
      boardRef.current.columns = boardRef.current.columns.filter(c => c.id !== col.id);
      writeBoard(boardRef.current, absFilePath);
      broadcast(boardRef.current);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Convert ────────────────────────────────────────────────────────────

  app.post('/api/convert', (req, res) => {
    try {
      const priorityKeywords = {
        critical: '#critical', urgent: '#critical', blocker: '#critical',
        important: '#important', high: '#important', priority: '#important',
        polish: '#polish', nice: '#polish', low: '#polish', later: '#polish', backlog: '#polish',
      };
      const allCards = boardRef.current.columns.flatMap(col => {
        const colLower = col.name.toLowerCase();
        let priorityTag = '';
        for (const [kw, tag] of Object.entries(priorityKeywords)) {
          if (colLower.includes(kw)) { priorityTag = tag; break; }
        }
        return col.cards.map(card => {
          if (!priorityTag) return card;
          if (card.description && card.description.includes(priorityTag)) return card;
          card.description = card.description ? card.description + ' ' + priorityTag : priorityTag;
          card._changed = true;
          return card;
        });
      });
      const doneCards = allCards.filter(c => c.done);
      const activeCards = allCards.filter(c => !c.done);
      boardRef.current = {
        title: boardRef.current.title,
        preamble: boardRef.current.preamble || '',
        priorities: boardRef.current.priorities || {},
        columns: [
          { id: 'to-do', name: 'To Do', emoji: null, cards: activeCards },
          { id: 'in-progress', name: 'In Progress', emoji: null, cards: [] },
          { id: 'done', name: 'Done', emoji: null, cards: doneCards },
        ],
      };
      writeBoard(boardRef.current, absFilePath);
      broadcast(boardRef.current);
      res.json({ ok: true, columns: 3, cards: allCards.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Priorities ─────────────────────────────────────────────────────────

  app.put('/api/priorities', (req, res) => {
    try {
      const { priorities } = req.body;
      if (!priorities || typeof priorities !== 'object') {
        return res.status(400).json({ error: 'priorities object is required' });
      }
      boardRef.current.priorities = priorities;
      writeBoard(boardRef.current, absFilePath);
      broadcast(boardRef.current);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── Health ─────────────────────────────────────────────────────────────

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      file: absFilePath,
      fileExists: fs.existsSync(absFilePath),
      columns: boardRef.current.columns.length,
      cards: boardRef.current.columns.reduce((sum, c) => sum + c.cards.length, 0),
    });
  });
}

module.exports = { registerRoutes };
