import { useState, useRef, useCallback } from 'react';
import type { BoardState } from '../types';

const MAX_HISTORY = 20;

export function useUndoRedo() {
  const history = useRef<{ past: BoardState[]; future: BoardState[] }>({ past: [], future: [] });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateFlags = useCallback(() => {
    setCanUndo(history.current.past.length > 0);
    setCanRedo(history.current.future.length > 0);
  }, []);

  /** Push current state to history before a user action. */
  const pushState = useCallback((state: BoardState) => {
    history.current.past.push(JSON.parse(JSON.stringify(state)));
    if (history.current.past.length > MAX_HISTORY) {
      history.current.past.shift();
    }
    history.current.future = [];
    updateFlags();
  }, [updateFlags]);

  /** Pop the last state from history (undo). Returns the state to restore, or null. */
  const undo = useCallback(
    (current: BoardState): BoardState | null => {
      if (history.current.past.length === 0) return null;
      const prev = history.current.past.pop()!;
      history.current.future.push(JSON.parse(JSON.stringify(current)));
      updateFlags();
      return prev;
    },
    [updateFlags],
  );

  /** Pop from the redo stack. Returns the state to restore, or null. */
  const redo = useCallback(
    (current: BoardState): BoardState | null => {
      if (history.current.future.length === 0) return null;
      const next = history.current.future.pop()!;
      history.current.past.push(JSON.parse(JSON.stringify(current)));
      updateFlags();
      return next;
    },
    [updateFlags],
  );

  /** Clear history (e.g. on full board sync from server). */
  const clearHistory = useCallback(() => {
    history.current = { past: [], future: [] };
    updateFlags();
  }, [updateFlags]);

  return { pushState, undo, redo, clearHistory, canUndo, canRedo };
}
