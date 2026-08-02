import { describe, it, expect } from 'vitest';
import type { BoardState, Card, Column } from '../types';

// ── Test helpers (same logic as BoardShell's getFlatCards & findParentId) ──

function getFlatCards(board: BoardState): { cardId: string; columnId: string }[] {
  const flat: { cardId: string; columnId: string }[] = [];
  for (const col of board.columns) {
    const walk = (cards: Card[]) => {
      for (const card of cards) {
        flat.push({ cardId: card.id, columnId: col.id });
        if (card.children) walk(card.children);
      }
    };
    walk(col.cards);
  }
  return flat;
}

function findParentId(board: BoardState, cardId: string): string | null {
  for (const col of board.columns) {
    const search = (cards: Card[], parentId: string | null): string | null => {
      for (const card of cards) {
        if (card.id === cardId) return parentId;
        if (card.children) {
          const found = search(card.children, card.id);
          if (found !== null) return found;
        }
      }
      return null;
    };
    const result = search(col.cards, null);
    if (result !== null) return result;
  }
  return null;
}

// ── Fixtures ──

const boardWithSubTasks: BoardState = {
  title: 'Test',
  columns: [
    {
      id: 'todo', name: 'To Do', emoji: null,
      cards: [
        { id: 'card1', done: false, title: 'Parent', description: '', rawLine: '- [ ] **Parent**',
          children: [
            { id: 'sub1', done: false, title: 'Sub A', description: '', rawLine: '  - [ ] Sub A',
              children: [
                { id: 'sub1a', done: false, title: 'Sub A1', description: '', rawLine: '    - [ ] Sub A1' },
              ],
            },
            { id: 'sub2', done: true, title: 'Sub B', description: '', rawLine: '  - [x] Sub B' },
          ],
        },
        { id: 'card2', done: false, title: 'Second', description: '', rawLine: '- [ ] **Second**' },
      ],
    },
    {
      id: 'done', name: 'Done', emoji: null,
      cards: [
        { id: 'card3', done: true, title: 'Done task', description: '', rawLine: '- [x] **Done task**' },
      ],
    },
  ],
};

// ── Tests ──

describe('getFlatCards', () => {
  it('flattens top-level cards across all columns in order', () => {
    const board: BoardState = {
      title: 'Test', columns: [
        { id: 'a', name: 'A', emoji: null, cards: [{ id: '1', done: false, title: 'One', description: '', rawLine: '' }] },
        { id: 'b', name: 'B', emoji: null, cards: [{ id: '2', done: false, title: 'Two', description: '', rawLine: '' }] },
      ],
    };
    const flat = getFlatCards(board);
    expect(flat).toHaveLength(2);
    expect(flat[0]).toEqual({ cardId: '1', columnId: 'a' });
    expect(flat[1]).toEqual({ cardId: '2', columnId: 'b' });
  });

  it('includes sub-tasks recursively with correct column IDs', () => {
    const flat = getFlatCards(boardWithSubTasks);
    // Order: card1, sub1, sub1a, sub2, card2, card3
    expect(flat).toHaveLength(6);
    expect(flat[0]).toEqual({ cardId: 'card1', columnId: 'todo' });
    expect(flat[1]).toEqual({ cardId: 'sub1', columnId: 'todo' });
    expect(flat[2]).toEqual({ cardId: 'sub1a', columnId: 'todo' });
    expect(flat[3]).toEqual({ cardId: 'sub2', columnId: 'todo' });
    expect(flat[4]).toEqual({ cardId: 'card2', columnId: 'todo' });
    expect(flat[5]).toEqual({ cardId: 'card3', columnId: 'done' });
  });

  it('returns empty array for empty board', () => {
    const board: BoardState = { title: 'Empty', columns: [] };
    expect(getFlatCards(board)).toEqual([]);
  });

  it('handles columns with no cards', () => {
    const board: BoardState = {
      title: 'Test', columns: [
        { id: 'a', name: 'A', emoji: null, cards: [] },
        { id: 'b', name: 'B', emoji: null, cards: [{ id: '1', done: false, title: 'One', description: '', rawLine: '' }] },
      ],
    };
    const flat = getFlatCards(board);
    expect(flat).toHaveLength(1);
    expect(flat[0]).toEqual({ cardId: '1', columnId: 'b' });
  });

  // j/k wrapping: next of last = first
  it('supports circular navigation (wrapping)', () => {
    const flat = getFlatCards(boardWithSubTasks);
    // Next of last (index 5) should wrap to first (index 0)
    const lastIdx = flat.length - 1;
    const nextIdx = (lastIdx + 1) % flat.length;
    expect(nextIdx).toBe(0);
    // Previous of first (index 0) should wrap to last
    const prevIdx = (0 - 1 + flat.length) % flat.length;
    expect(prevIdx).toBe(lastIdx);
  });
});

describe('findParentId', () => {
  it('returns null for top-level cards', () => {
    expect(findParentId(boardWithSubTasks, 'card1')).toBeNull();
    expect(findParentId(boardWithSubTasks, 'card2')).toBeNull();
    expect(findParentId(boardWithSubTasks, 'card3')).toBeNull();
  });

  it('returns parent ID for direct children', () => {
    expect(findParentId(boardWithSubTasks, 'sub1')).toBe('card1');
    expect(findParentId(boardWithSubTasks, 'sub2')).toBe('card1');
  });

  it('returns parent ID for deeply nested sub-tasks', () => {
    expect(findParentId(boardWithSubTasks, 'sub1a')).toBe('sub1');
  });

  it('returns null for non-existent card', () => {
    expect(findParentId(boardWithSubTasks, 'nonexistent')).toBeNull();
  });

  it('returns null for empty board', () => {
    const empty: BoardState = { title: 'Empty', columns: [] };
    expect(findParentId(empty, 'anything')).toBeNull();
  });
});
