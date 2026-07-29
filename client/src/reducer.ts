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
  | { type: 'SUBTASK_ADD'; parentId: string; title: string }
  | { type: 'SUBTASK_DELETE'; parentId: string; childId: string };

// ─── Reducer ───────────────────────────────────────────────────────────────

export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case 'BOARD_SYNC':
      return action.board;

    case 'CARD_TOGGLE': {
      return mapCard(state, action.cardId, (card) => ({
        ...card,
        done: !card.done,
        _changed: true,
      }));
    }

    case 'CARD_MOVE': {
      // Find card and remove from source
      let movedCard: Card | null = null;
      const stripped = state.columns.map((col) => {
        const idx = col.cards.findIndex((c) => c.id === action.cardId);
        if (idx !== -1) {
          movedCard = col.cards[idx];
          return { ...col, cards: [...col.cards.slice(0, idx), ...col.cards.slice(idx + 1)] };
        }
        return col;
      });

      if (!movedCard) return state;

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
        const child: Card = {
          id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          done: false,
          title: action.title,
          description: '',
          rawLine: `  - [ ] ${action.title}`,
        };
        return {
          ...card,
          children: [...(card.children || []), child],
          _changed: true,
        };
      });
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

export const initialBoard: BoardState = {
  title: '',
  columns: [],
};
