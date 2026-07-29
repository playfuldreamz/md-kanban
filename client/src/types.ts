/** Shared types for the Kanban board. Mirrors the backend BoardState model. */

export interface Card {
  id: string;
  done: boolean;
  title: string;
  description: string;
  rawLine: string;
  createdAt?: string;
  children?: Card[];
  _changed?: boolean;
}

export interface Column {
  id: string;
  name: string;
  emoji: string | null;
  cards: Card[];
}

export interface BoardState {
  title: string;
  preamble?: string;
  priorities?: Record<string, { label: string; color: string; ring: string }>;
  columns: Column[];
}

/** WebSocket message from the server. */
export interface SyncMessage {
  type: 'sync';
  board: BoardState;
}
