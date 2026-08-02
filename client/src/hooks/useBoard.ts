import { useReducer, useEffect, useCallback, useState, useRef } from 'react';
import { boardReducer, initialBoard } from '../reducer';
import type { BoardState, Card } from '../types';
import type { BoardAction } from '../reducer';
import { useWebSocket } from './useWebSocket';
import { useUndoRedo } from './useUndoRedo';

/**
 * Determines the WebSocket URL based on the current environment.
 * In production, the Express server serves the static files, so WS is on same host.
 * In dev, Vite proxies /api but WS connects directly to :3456.
 */
function getWsUrl(): string {
  if (import.meta.env.DEV) {
    return 'ws://localhost:3456';
  }
  // Production: same origin, same port
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
}

function getApiUrl(): string {
  if (import.meta.env.DEV) {
    return 'http://localhost:3456';
  }
  return '';
}

/**
 * Main hook for board state. Connects to WebSocket for live sync,
 * fetches initial state from REST API, and exposes mutation functions.
 */
export function useBoard() {
  const [board, dispatch] = useReducer(boardReducer, initialBoard);
  const boardRef = useRef(board);
  boardRef.current = board;
  const { pushState, undo, redo, clearHistory, canUndo, canRedo } = useUndoRedo();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [undoCard, setUndoCard] = useState<{ card: Card; columnId: string } | null>(null);
  const [currentFile, setCurrentFile] = useState<string>('');
  const [files, setFiles] = useState<{ file: string; title: string; columns: number; cards: number }[]>([]);
  const apiBase = getApiUrl();

  /** Dispatch a user action, pushing current state to history first. */
  const userDispatch = useCallback((action: BoardAction) => {
    pushState(boardRef.current);
    dispatch(action);
  }, [pushState]);

  // Fetch file list, then load first board
  useEffect(() => {
    fetch(`${apiBase}/api/files`)
      .then((res) => res.json())
      .then((list: { file: string; title: string; columns: number; cards: number }[]) => {
        setFiles(list);
        if (list.length > 0) {
          setCurrentFile(list[0].file);
        } else {
          setLoading(false);
          setError('No TODO.md files found');
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load files');
        setLoading(false);
      });
  }, [apiBase]);

  // Fetch board for current file
  useEffect(() => {
    if (!currentFile) return;
    setLoading(true);
    fetch(`${apiBase}/api/board?file=${encodeURIComponent(currentFile)}`)
      .then((res) => res.json())
      .then((data: BoardState) => {
        dispatch({ type: 'BOARD_SYNC', board: data });
        clearHistory();
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load board');
        setLoading(false);
      });
  }, [currentFile, apiBase, clearHistory]);

  // WebSocket for live sync — routes by file
  const handleSync = useCallback((msg: { type: 'sync'; file?: string; board: BoardState }) => {
    if (msg.file === currentFile) {
      dispatch({ type: 'BOARD_SYNC', board: msg.board });
    }
  }, [currentFile]);

  useWebSocket(getWsUrl(), handleSync, setConnected);

  const switchFile = useCallback((file: string) => {
    setCurrentFile(file);
  }, []);

  /** Build API URL with current file param. */
  const apiUrl = useCallback((path: string) => {
    const sep = path.includes('?') ? '&' : '?';
    return `${apiBase}${path}${sep}file=${encodeURIComponent(currentFile)}`;
  }, [apiBase, currentFile]);

  // Mutations
  const toggleCard = useCallback(
    async (cardId: string) => {
      userDispatch({ type: 'CARD_TOGGLE', cardId });
      try {
        const card = findCard(board, cardId);
        if (card) {
          await fetch(`${apiBase}/api/cards/${cardId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ done: !card.done }),
          });
        }
      } catch {
        // WebSocket sync will reconcile
      }
    },
    [board, apiBase],
  );

  /** Toggle pin state on a card. */
  const togglePin = useCallback(
    async (cardId: string) => {
      userDispatch({ type: 'CARD_TOGGLE_PIN', cardId });
      try {
        const card = findCard(board, cardId);
        if (card) {
          await fetch(apiUrl(`/api/cards/${cardId}`), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pinned: !card.pinned }),
          });
        }
      } catch {}
    },
    [board, apiUrl],
  );

  const addCard = useCallback(
    async (columnId: string, title: string, description: string) => {
      try {
        const res = await fetch(`${apiBase}/api/cards`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ columnId, title, description }),
        });
        if (res.ok) {
          const card: Card = await res.json();
          userDispatch({ type: 'CARD_ADD', columnId, card });
        }
      } catch {
        // WebSocket sync will reconcile
      }
    },
    [apiBase],
  );

  const moveCard = useCallback(
    async (cardId: string, toColumnId: string, toIndex: number) => {
      userDispatch({ type: 'CARD_MOVE', cardId, toColumnId, toIndex });
      try {
        await fetch(`${apiBase}/api/cards/${cardId}/move`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ columnId: toColumnId, index: toIndex }),
        });
      } catch {
        // WebSocket sync will reconcile
      }
    },
    [apiBase],
  );

  const deleteCard = useCallback(
    async (cardId: string) => {
      const card = findCard(board, cardId);
      const columnId = findCardColumn(board, cardId);
      if (card && columnId) {
        setUndoCard({ card: { ...card }, columnId });
      }
      userDispatch({ type: 'CARD_DELETE', cardId });
      try {
        await fetch(`${apiBase}/api/cards/${cardId}`, { method: 'DELETE' });
      } catch {
        // WebSocket sync will reconcile
      }
      // Clear undo after 8 seconds
      setTimeout(() => setUndoCard(null), 8000);
    },
    [board, apiBase],
  );

  /** Undo the last user action by restoring the previous board state. */
  const doUndo = useCallback(() => {
    const prev = undo(boardRef.current);
    if (prev) dispatch({ type: 'BOARD_SYNC', board: prev });
  }, [undo]);

  /** Redo a previously undone action. */
  const doRedo = useCallback(() => {
    const next = redo(boardRef.current);
    if (next) dispatch({ type: 'BOARD_SYNC', board: next });
  }, [redo]);

  const undoDelete = useCallback(async () => {
    if (!undoCard) return;
    const { card, columnId } = undoCard;
    setUndoCard(null);
    try {
      const res = await fetch(apiUrl('/api/cards'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnId, title: card.title, description: card.description }),
      });
      if (res.ok) {
        const created: Card = await res.json();
        userDispatch({ type: 'CARD_ADD', columnId, card: created });
      }
    } catch {
      // WebSocket sync will reconcile
    }
  }, [undoCard, apiBase]);

  const editCard = useCallback(
    async (cardId: string, title: string, description: string, dueDate?: string, warning?: boolean) => {
      userDispatch({ type: 'CARD_EDIT', cardId, title, description });
      try {
        await fetch(apiUrl(`/api/cards/${cardId}`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description, warning }),
        });
      } catch {
        // WebSocket sync will reconcile
      }
    },
    [apiUrl],
  );

  // ─── Sub-task mutations ──────────────────────────────────────────────

  /** Toggle a sub-task's done state. Sends full children array to server. */
  const toggleSubTask = useCallback(
    async (parentId: string, childId: string) => {
      userDispatch({ type: 'SUBTASK_TOGGLE', parentId, childId });
      try {
        const parent = findCard(board, parentId);
        if (parent && parent.children) {
          const updatedChildren = parent.children.map((c) =>
            c.id === childId ? { ...c, done: !c.done, _changed: true } : c,
          );
          await fetch(`${apiBase}/api/cards/${parentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ children: updatedChildren }),
          });
        }
      } catch {
        // WebSocket sync will reconcile
      }
    },
    [board, apiBase],
  );

  /** Add a sub-task to a card, with optional description. */
  const addSubTask = useCallback(
    async (parentId: string, title: string, description?: string) => {
      const desc = description || '';
      userDispatch({ type: 'SUBTASK_ADD', parentId, title, description: desc });
      try {
        const parent = findCard(board, parentId);
        if (parent) {
          const today = new Date().toISOString().slice(0, 10);
          const descSuffix = desc ? ` — ${desc}` : '';
          const newChild = {
            id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            done: false,
            title: title.trim(),
            description: desc,
            rawLine: `  - [ ] ${title.trim()}${descSuffix} <!-- created:${today} -->`,
            createdAt: today,
          };
          const updatedChildren = [...(parent.children || []), newChild];
          await fetch(`${apiBase}/api/cards/${parentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ children: updatedChildren }),
          });
        }
      } catch {
        // WebSocket sync will reconcile
      }
    },
    [board, apiBase],
  );

  /** Edit a sub-task's title and description. */
  const editSubTask = useCallback(
    async (parentId: string, childId: string, title: string, description: string) => {
      userDispatch({ type: 'SUBTASK_EDIT', parentId, childId, title, description });
      try {
        const parent = findCard(board, parentId);
        if (parent && parent.children) {
          const updatedChildren = parent.children.map((c) =>
            c.id === childId ? { ...c, title, description, _changed: true } : c,
          );
          await fetch(`${apiBase}/api/cards/${parentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ children: updatedChildren }),
          });
        }
      } catch {
        // WebSocket sync will reconcile
      }
    },
    [board, apiBase],
  );

  /** Delete a sub-task from a card. */
  const deleteSubTask = useCallback(
    async (parentId: string, childId: string) => {
      userDispatch({ type: 'SUBTASK_DELETE', parentId, childId });
      try {
        const parent = findCard(board, parentId);
        if (parent && parent.children) {
          const updatedChildren = parent.children.filter((c) => c.id !== childId);
          await fetch(`${apiBase}/api/cards/${parentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ children: updatedChildren }),
          });
        }
      } catch {
        // WebSocket sync will reconcile
      }
    },
    [board, apiBase],
  );

  const addColumn = useCallback(
    async (name: string) => {
      try {
        await fetch(`${apiBase}/api/columns`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        });
        // WebSocket sync will reconcile
      } catch {
        // WebSocket sync will reconcile
      }
    },
    [apiBase],
  );

  // Check if board is missing any of the 3 standard columns
  const isStandard = (col: { id: string; name: string }) => {
    const n = col.name.toLowerCase().replace(/^[^\w]*/, '');
    const i = col.id.toLowerCase();
    return i.includes('to-do') || n.includes('to do') ||
      i.includes('progress') || n.includes('progress') ||
      i.includes('done') || n.includes('done');
  };
  const hasTodo = board.columns.some(c => c.id.includes('to-do') || c.name.toLowerCase().includes('to do'));
  const hasProgress = board.columns.some(c => c.id.includes('progress') || c.name.toLowerCase().includes('progress'));
  const hasDone = board.columns.some(c => c.id.includes('done') || c.name.toLowerCase().includes('done'));
  const needsConversion = !loading && board.columns.length > 0 &&
    !(hasTodo && hasProgress && hasDone);

  const totalCards = board.columns.reduce((sum, c) => sum + c.cards.length, 0);

  const convertBoard = useCallback(async () => {
    try {
      await fetch(`${apiBase}/api/convert`, { method: 'POST' });
      // Fetch updated board immediately (WebSocket may lag)
      const res = await fetch(`${apiBase}/api/board`);
      const data: BoardState = await res.json();
      dispatch({ type: 'BOARD_SYNC', board: data });
    } catch {
      // WebSocket sync will reconcile
    }
  }, [apiBase]);

  const deleteColumn = useCallback(async (columnId: string) => {
    try {
      await fetch(`${apiBase}/api/columns/${columnId}`, { method: 'DELETE' });
      // WebSocket sync will reconcile
    } catch {
      // WebSocket sync will reconcile
    }
  }, [apiBase]);

  return {
    board,
    connected,
    loading,
    error,
    totalCards,
    undoCard,
    toggleCard,
    addCard,
    moveCard,
    deleteCard,
    editCard,
    undoDelete,
    addColumn,
    needsConversion,
    convertBoard,
    deleteColumn,
    toggleSubTask,
    addSubTask,
    editSubTask,
    deleteSubTask,
    togglePin,
    doUndo,
    doRedo,
    canUndo,
    canRedo,
    files,
    currentFile,
    apiBase,
    switchFile,
  };
}

/** Find a card by ID across all columns, recursively searching children. */
function findCard(board: BoardState, cardId: string): Card | null {
  for (const col of board.columns) {
    const card = col.cards.find((c) => c.id === cardId);
    if (card) return card;
    // Search children
    for (const c of col.cards) {
      const found = findCardInTree(c, cardId);
      if (found) return found;
    }
  }
  return null;
}

function findCardInTree(card: Card, cardId: string): Card | null {
  if (!card.children) return null;
  for (const child of card.children) {
    if (child.id === cardId) return child;
    const deeper = findCardInTree(child, cardId);
    if (deeper) return deeper;
  }
  return null;
}

/** Find the column ID that contains a card. */
function findCardColumn(board: BoardState, cardId: string): string | null {
  for (const col of board.columns) {
    if (col.cards.some((c) => c.id === cardId)) return col.id;
  }
  return null;
}
