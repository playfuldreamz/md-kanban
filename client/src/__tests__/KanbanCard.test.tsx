import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import KanbanCard from '../components/KanbanCard';
import type { Card } from '../types';

const baseCard: Card = {
  id: 'abc123',
  done: false,
  title: 'Fix login bug',
  description: 'Users on Safari get a blank screen',
  rawLine: '- [ ] **Fix login bug** — Users on Safari get a blank screen',
};

describe('KanbanCard', () => {
  it('renders title and description', () => {
    render(
      <KanbanCard
        card={baseCard}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText('Fix login bug')).toBeInTheDocument();
    expect(screen.getByText('Users on Safari get a blank screen')).toBeInTheDocument();
  });

  it('shows strikethrough when done', () => {
    const doneCard = { ...baseCard, done: true };
    render(
      <KanbanCard
        card={doneCard}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    const title = screen.getByText('Fix login bug');
    expect(title.className).toContain('line-through');
  });

  it('calls onToggle when checkbox is clicked', () => {
    const onToggle = vi.fn();
    render(
      <KanbanCard
        card={baseCard}
        onToggle={onToggle}
        onDelete={vi.fn()}
      />
    );
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows delete confirmation when trash is clicked', () => {
    const onDelete = vi.fn();
    render(
      <KanbanCard
        card={baseCard}
        onToggle={vi.fn()}
        onDelete={onDelete}
      />
    );
    const deleteBtn = screen.getByLabelText('Delete Fix login bug');
    fireEvent.click(deleteBtn);
    // AlertDialog renders in a portal; verify the confirmation text exists anywhere in the document
    expect(document.body.textContent).toContain('Are you sure you want to delete');
  });

  it('renders without description gracefully', () => {
    const noDesc = { ...baseCard, description: '' };
    render(
      <KanbanCard
        card={noDesc}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText('Fix login bug')).toBeInTheDocument();
  });

  it('has draggable attribute when onDragStart is provided', () => {
    const { container } = render(
      <KanbanCard
        card={baseCard}
        onToggle={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
      />
    );
    const card = container.querySelector('[data-card-id="abc123"]');
    expect(card).toHaveAttribute('draggable', 'true');
  });
});
