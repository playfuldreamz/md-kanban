import { useReducer, useEffect, useCallback, useState, useRef } from 'react';
import { boardReducer, initialBoard } from '../reducer';
import type { BoardState, Card } from '../types';
import { useWebSocket } from './useWebSocket';

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
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [undoCard, setUndoCard] = useState<{ card: Card; columnId: string } | null>(null);
  const apiBase = getApiUrl();

  // Initial fetch from REST API
  useEffect(() => {
    fetch(`${apiBase}/api/board`)
      .then((res) => res.json())
      .then((data: BoardState) => {
        dispatch({ type: 'BOARD_SYNC', board: data });
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load board');
        setLoading(false);
      });
  }, [apiBase]);

  // WebSocket for live sync
  const handleSync = useCallback((msg: { type: 'sync'; board: BoardState }) => {
    dispatch({ type: 'BOARD_SYNC', board: msg.board });
  }, []);

  useWebSocket(getWsUrl(), handleSync, setConnected);

  // Mutations
  const toggleCard = useCallback(
    async (cardId: string) => {
      dispatch({ type: 'CARD_TOGGLE', cardId });
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
          dispatch({ type: 'CARD_ADD', columnId, card });
        }
      } catch {
        // WebSocket sync will reconcile
      }
    },
    [apiBase],
  );

  const moveCard = useCallback(
    async (cardId: string, toColumnId: string, toIndex: number) => {
      dispatch({ type: 'CARD_MOVE', cardId, toColumnId, toIndex });
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
      dispatch({ type: 'CARD_DELETE', cardId });
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

  const undoDelete = useCallback(async () => {
    if (!undoCard) return;
    const { card, columnId } = undoCard;
    setUndoCard(null);
    try {
      const res = await fetch(`${apiBase}/api/cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ columnId, title: card.title, description: card.description }),
      });
      if (res.ok) {
        const created: Card = await res.json();
        dispatch({ type: 'CARD_ADD', columnId, card: created });
      }
    } catch {
      // WebSocket sync will reconcile
    }
  }, [undoCard, apiBase]);

  const editCard = useCallback(
    async (cardId: string, title: string, description: string) => {
      dispatch({ type: 'CARD_EDIT', cardId, title, description });
      try {
        await fetch(`${apiBase}/api/cards/${cardId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description }),
        });
      } catch {
        // WebSocket sync will reconcile
      }
    },
    [apiBase],
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

  // Check if board uses non-standard columns (not To Do / In Progress / Done)
  const isStandard = (col: { id: string; name: string }) => {
    const n = col.name.toLowerCase().replace(/^[^\w]*/, '');
    const i = col.id.toLowerCase();
    return i.includes('to-do') || n.includes('to do') ||
      i.includes('progress') || n.includes('progress') ||
      i.includes('done') || n.includes('done');
  };
  const needsConversion = !loading && board.columns.length > 0 &&
    board.columns.some(c => !isStandard(c));

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
  };
}

/** Find a card by ID across all columns. */
function findCard(board: BoardState, cardId: string): Card | null {
  for (const col of board.columns) {
    const card = col.cards.find((c) => c.id === cardId);
    if (card) return card;
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
