import type { BoardState, Card } from './types';

// ─── Action types ──────────────────────────────────────────────────────────

export type BoardAction =
  | { type: 'BOARD_SYNC'; board: BoardState }
  | { type: 'CARD_TOGGLE'; cardId: string }
  | { type: 'CARD_MOVE'; cardId: string; toColumnId: string; toIndex: number }
  | { type: 'CARD_ADD'; columnId: string; card: Card }
  | { type: 'CARD_EDIT'; cardId: string; title: string; description: string }
  | { type: 'CARD_DELETE'; cardId: string }
  | { type: 'SUBTASK_TOGGLE'; parentId: string; childId: string }
  | { type: 'SUBTASK_ADD'; parentId: string; title: string; description?: string }
  | { type: 'SUBTASK_EDIT'; parentId: string; childId: string; title: string; description: string }
  | { type: 'SUBTASK_DELETE'; parentId: string; childId: string };

// ─── Reducer ───────────────────────────────────────────────────────────────

export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case 'BOARD_SYNC':
      return action.board;

    case 'CARD_TOGGLE': {
      // Find which column this card is in (top-level only — sub-tasks handled by SUBTASK_TOGGLE)
      const sourceCol = state.columns.find((col) =>
        col.cards.some((c) => c.id === action.cardId),
      );
      const isTopLevel = sourceCol !== undefined;

      let next = mapCard(state, action.cardId, (card) => ({
        ...card,
        done: !card.done,
        _changed: true,
      }));

      // Auto-move top-level cards: check → Done, uncheck → out of Done
      if (isTopLevel && sourceCol) {
        const card = sourceCol.cards.find((c) => c.id === action.cardId)!;
        const newDone = !card.done;
        if (newDone && !isDoneColumn(sourceCol)) {
          // Card was checked in non-Done column → move to Done
          next = moveCardBetweenColumns(next, action.cardId, findDoneColumn(next)?.id || sourceCol.id, 0);
        } else if (!newDone && isDoneColumn(sourceCol)) {
          // Card was unchecked in Done → move to first non-Done column
          const todo = next.columns.find((c) => !isDoneColumn(c)) || next.columns[0];
          next = moveCardBetweenColumns(next, action.cardId, todo.id, 0);
        }
      }

      return next;
    }

    case 'CARD_MOVE': {
      // Find card and remove from source
      let movedCard: Card | null = null;
      const sourceColumn = state.columns.find((col) =>
        col.cards.some((c) => c.id === action.cardId),
      );
      const stripped = state.columns.map((col) => {
        const idx = col.cards.findIndex((c) => c.id === action.cardId);
        if (idx !== -1) {
          movedCard = col.cards[idx];
          return { ...col, cards: [...col.cards.slice(0, idx), ...col.cards.slice(idx + 1)] };
        }
        return col;
      });

      if (!movedCard) return state;

      // Auto-complete when moving to Done, auto-reopen when moving out
      const targetColumn = state.columns.find((c) => c.id === action.toColumnId);
      const toDone = isDoneColumn(targetColumn);
      const fromDone = isDoneColumn(sourceColumn);
      if (toDone && !fromDone) {
        movedCard = setDoneRecursive(movedCard, true);
      } else if (!toDone && fromDone) {
        movedCard = setDoneRecursive(movedCard, false);
      }

      // Insert into target
      return {
        ...state,
        columns: stripped.map((col) => {
          if (col.id === action.toColumnId) {
            const cards = [...col.cards];
            cards.splice(action.toIndex, 0, movedCard!);
            return { ...col, cards };
          }
          return col;
        }),
      };
    }

    case 'CARD_ADD': {
      return {
        ...state,
        columns: state.columns.map((col) => {
          if (col.id === action.columnId) {
            return { ...col, cards: [...col.cards, action.card] };
          }
          return col;
        }),
      };
    }

    case 'CARD_EDIT': {
      return mapCard(state, action.cardId, (card) => ({
        ...card,
        title: action.title,
        description: action.description,
        _changed: true,
      }));
    }

    case 'CARD_DELETE': {
      return {
        ...state,
        columns: state.columns.map((col) => ({
          ...col,
          cards: col.cards.filter((c) => c.id !== action.cardId),
        })),
      };
    }

    case 'SUBTASK_TOGGLE': {
      return mapCard(state, action.parentId, (card) => ({
        ...card,
        children: card.children?.map((child) =>
          child.id === action.childId
            ? { ...child, done: !child.done, _changed: true }
            : child,
        ),
        _changed: true,
      }));
    }

    case 'SUBTASK_ADD': {
      return mapCard(state, action.parentId, (card) => {
        const desc = action.description || '';
        const today = new Date().toISOString().slice(0, 10);
        const descSuffix = desc ? ` — ${desc}` : '';
        const child: Card = {
          id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          done: false,
          title: action.title,
          description: desc,
          rawLine: `  - [ ] ${action.title}${descSuffix} <!-- created:${today} -->`,
          createdAt: today,
        };
        return {
          ...card,
          children: [...(card.children || []), child],
          _changed: true,
        };
      });
    }

    case 'SUBTASK_EDIT': {
      return mapCard(state, action.parentId, (card) => ({
        ...card,
        children: card.children?.map((child) =>
          child.id === action.childId
            ? { ...child, title: action.title, description: action.description, _changed: true }
            : child,
        ),
        _changed: true,
      }));
    }

    case 'SUBTASK_DELETE': {
      return mapCard(state, action.parentId, (card) => ({
        ...card,
        children: card.children?.filter((child) => child.id !== action.childId),
        _changed: true,
      }));
    }

    default:
      return state;
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Recursively search cards (including children) for a matching ID and apply fn. */
function mapCard(
  state: BoardState,
  cardId: string,
  fn: (card: Card) => Card,
): BoardState {
  return {
    ...state,
    columns: state.columns.map((col) => ({
      ...col,
      cards: mapCardsInList(col.cards, cardId, fn),
    })),
  };
}

function mapCardsInList(cards: Card[], cardId: string, fn: (card: Card) => Card): Card[] {
  return cards.map((card) => {
    if (card.id === cardId) return fn(card);
    if (card.children && card.children.length > 0) {
      return { ...card, children: mapCardsInList(card.children, cardId, fn) };
    }
    return card;
  });
}

/** Check if a column is the Done column (by id or name). */
function isDoneColumn(col: { id: string; name: string } | undefined): boolean {
  if (!col) return false;
  const id = col.id.toLowerCase();
  const name = col.name.toLowerCase();
  return id === 'done' || id.includes('done') || name.includes('done');
}

/** Recursively set done state on a card and all its children. */
function setDoneRecursive(card: Card, done: boolean): Card {
  return {
    ...card,
    done,
    _changed: true,
    children: card.children?.map((c) => setDoneRecursive(c, done)),
  };
}

/** Find the Done column, or return undefined. */
function findDoneColumn(state: BoardState) {
  return state.columns.find((c) => isDoneColumn(c));
}

/** Move a card from its current column to a target column at a given index. */
function moveCardBetweenColumns(
  state: BoardState,
  cardId: string,
  toColumnId: string,
  toIndex: number,
): BoardState {
  let movedCard: Card | null = null;
  const stripped = state.columns.map((col) => {
    const idx = col.cards.findIndex((c) => c.id === cardId);
    if (idx !== -1) {
      movedCard = col.cards[idx];
      return { ...col, cards: [...col.cards.slice(0, idx), ...col.cards.slice(idx + 1)] };
    }
    return col;
  });
  if (!movedCard) return state;
  return {
    ...state,
    columns: stripped.map((col) => {
      if (col.id === toColumnId) {
        const cards = [...col.cards];
        cards.splice(toIndex, 0, movedCard!);
        return { ...col, cards };
      }
      return col;
    }),
  };
}

export const initialBoard: BoardState = {
  title: '',
  columns: [],
};
