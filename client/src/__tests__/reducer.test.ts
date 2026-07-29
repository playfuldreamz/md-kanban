import { describe, it, expect } from 'vitest';
import { boardReducer, initialBoard } from '../reducer';
import type { BoardState } from '../types';

const sampleBoard: BoardState = {
  title: 'Test',
  columns: [
    {
      id: 'todo',
      name: '📋 To Do',
      emoji: '📋',
      cards: [
        { id: '1', done: false, title: 'Task A', description: '', rawLine: '- [ ] **Task A**' },
        { id: '2', done: false, title: 'Task B', description: 'desc', rawLine: '- [ ] **Task B** — desc' },
      ],
    },
    {
      id: 'done',
      name: '✅ Done',
      emoji: '✅',
      cards: [
        { id: '3', done: true, title: 'Task C', description: '', rawLine: '- [x] **Task C**' },
      ],
    },
  ],
};

describe('boardReducer', () => {
  it('BOARD_SYNC replaces the entire board', () => {
    const next = boardReducer(initialBoard, { type: 'BOARD_SYNC', board: sampleBoard });
    expect(next).toEqual(sampleBoard);
  });

  it('CARD_TOGGLE flips done state', () => {
    const next = boardReducer(sampleBoard, { type: 'CARD_TOGGLE', cardId: '1' });
    expect(next.columns[0].cards[0].done).toBe(true);
    expect(next.columns[0].cards[0]._changed).toBe(true);
  });

  it('CARD_TOGGLE toggles back', () => {
    const next = boardReducer(sampleBoard, { type: 'CARD_TOGGLE', cardId: '3' });
    expect(next.columns[1].cards[0].done).toBe(false);
  });

  it('CARD_TOGGLE with unknown id does nothing', () => {
    const next = boardReducer(sampleBoard, { type: 'CARD_TOGGLE', cardId: 'nonexistent' });
    expect(next).toEqual(sampleBoard);
  });

  it('CARD_DELETE removes a card', () => {
    const next = boardReducer(sampleBoard, { type: 'CARD_DELETE', cardId: '1' });
    expect(next.columns[0].cards).toHaveLength(1);
    expect(next.columns[0].cards[0].id).toBe('2');
  });

  it('CARD_DELETE with unknown id does nothing', () => {
    const next = boardReducer(sampleBoard, { type: 'CARD_DELETE', cardId: 'nope' });
    expect(next).toEqual(sampleBoard);
  });

  it('CARD_ADD appends to column', () => {
    const newCard = { id: '4', done: false, title: 'New', description: '', rawLine: '- [ ] **New**' };
    const next = boardReducer(sampleBoard, { type: 'CARD_ADD', columnId: 'todo', card: newCard });
    expect(next.columns[0].cards).toHaveLength(3);
    expect(next.columns[0].cards[2].id).toBe('4');
  });

  it('CARD_EDIT updates title and description', () => {
    const next = boardReducer(sampleBoard, {
      type: 'CARD_EDIT',
      cardId: '1',
      title: 'Updated',
      description: 'New desc',
    });
    expect(next.columns[0].cards[0].title).toBe('Updated');
    expect(next.columns[0].cards[0].description).toBe('New desc');
    expect(next.columns[0].cards[0]._changed).toBe(true);
  });

  it('CARD_MOVE moves card between columns', () => {
    const next = boardReducer(sampleBoard, {
      type: 'CARD_MOVE',
      cardId: '1',
      toColumnId: 'done',
      toIndex: 0,
    });
    expect(next.columns[0].cards).toHaveLength(1); // todo lost one
    expect(next.columns[1].cards).toHaveLength(2); // done gained one
    expect(next.columns[1].cards[0].id).toBe('1'); // at index 0
  });

  it('CARD_MOVE reorders within same column', () => {
    const next = boardReducer(sampleBoard, {
      type: 'CARD_MOVE',
      cardId: '1',
      toColumnId: 'todo',
      toIndex: 1,
    });
    expect(next.columns[0].cards[0].id).toBe('2'); // B moved to top
    expect(next.columns[0].cards[1].id).toBe('1'); // A moved to index 1
  });

  it('CARD_MOVE to end of column', () => {
    const next = boardReducer(sampleBoard, {
      type: 'CARD_MOVE',
      cardId: '1',
      toColumnId: 'done',
      toIndex: 1,
    });
    expect(next.columns[1].cards[1].id).toBe('1');
  });

  // ─── Sub-task tests ────────────────────────────────────────────────

  it('SUBTASK_TOGGLE flips child done state', () => {
    const boardWithChildren: BoardState = {
      title: 'Test',
      columns: [{
        id: 'todo',
        name: 'To Do',
        emoji: null,
        cards: [{
          id: 'parent1',
          done: false,
          title: 'Parent',
          description: '',
          rawLine: '- [ ] **Parent**',
          children: [
            { id: 'child1', done: false, title: 'Child A', description: '', rawLine: '  - [ ] Child A' },
            { id: 'child2', done: true, title: 'Child B', description: '', rawLine: '  - [x] Child B' },
          ],
        }],
      }],
    };

    const next = boardReducer(boardWithChildren, { type: 'SUBTASK_TOGGLE', parentId: 'parent1', childId: 'child1' });
    expect(next.columns[0].cards[0].children![0].done).toBe(true);
    expect(next.columns[0].cards[0].children![0]._changed).toBe(true);
    // Other child unchanged
    expect(next.columns[0].cards[0].children![1].done).toBe(true);
  });

  it('SUBTASK_ADD appends child to parent', () => {
    const boardWithParent: BoardState = {
      title: 'Test',
      columns: [{
        id: 'todo',
        name: 'To Do',
        emoji: null,
        cards: [{
          id: 'parent1',
          done: false,
          title: 'Parent',
          description: '',
          rawLine: '- [ ] **Parent**',
        }],
      }],
    };

    const next = boardReducer(boardWithParent, { type: 'SUBTASK_ADD', parentId: 'parent1', title: 'New child' });
    expect(next.columns[0].cards[0].children).toBeDefined();
    expect(next.columns[0].cards[0].children!).toHaveLength(1);
    expect(next.columns[0].cards[0].children![0].title).toBe('New child');
    expect(next.columns[0].cards[0].children![0].done).toBe(false);
    expect(next.columns[0].cards[0]._changed).toBe(true);
  });

  it('SUBTASK_DELETE removes child from parent', () => {
    const boardWithChildren: BoardState = {
      title: 'Test',
      columns: [{
        id: 'todo',
        name: 'To Do',
        emoji: null,
        cards: [{
          id: 'parent1',
          done: false,
          title: 'Parent',
          description: '',
          rawLine: '- [ ] **Parent**',
          children: [
            { id: 'child1', done: false, title: 'Child A', description: '', rawLine: '  - [ ] Child A' },
            { id: 'child2', done: true, title: 'Child B', description: '', rawLine: '  - [x] Child B' },
          ],
        }],
      }],
    };

    const next = boardReducer(boardWithChildren, { type: 'SUBTASK_DELETE', parentId: 'parent1', childId: 'child1' });
    expect(next.columns[0].cards[0].children!).toHaveLength(1);
    expect(next.columns[0].cards[0].children![0].id).toBe('child2');
    expect(next.columns[0].cards[0]._changed).toBe(true);
  });

  it('SUBTASK_DELETE with unknown child does nothing', () => {
    const boardWithChildren: BoardState = {
      title: 'Test',
      columns: [{
        id: 'todo',
        name: 'To Do',
        emoji: null,
        cards: [{
          id: 'parent1',
          done: false,
          title: 'Parent',
          description: '',
          rawLine: '- [ ] **Parent**',
          children: [
            { id: 'child1', done: false, title: 'Child A', description: '', rawLine: '  - [ ] Child A' },
          ],
        }],
      }],
    };

    const next = boardReducer(boardWithChildren, { type: 'SUBTASK_DELETE', parentId: 'parent1', childId: 'nope' });
    expect(next.columns[0].cards[0].children!).toHaveLength(1);
  });
});
