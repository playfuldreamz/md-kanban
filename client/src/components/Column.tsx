import { useState, useRef, useCallback } from 'react';
import { Badge } from '@appica/ui-react/badge';
import type { Column } from '../types';
import KanbanCard from './KanbanCard';
import AddCardForm from './AddCardForm';

interface ColumnViewProps {
  column: Column;
  onToggle: (cardId: string) => void;
  onDelete: (cardId: string) => void;
  onAdd: (columnId: string, title: string, description: string) => void;
  onEdit: (cardId: string, title: string, description: string) => void;
  onMove: (cardId: string, toColumnId: string, toIndex: number) => void;
  dragCardId: string | null;
  dragColumnId: string | null;
  onDragStart: (cardId: string, columnId: string) => void;
  onDragEnd: () => void;
}

export default function ColumnView({
  column, onToggle, onDelete, onAdd, onEdit,
  onMove, dragCardId, dragColumnId, onDragStart, onDragEnd,
}: ColumnViewProps) {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const cardListRef = useRef<HTMLDivElement>(null);

  const isDragOver = dragCardId !== null && dragOverIndex !== null;
  const isSource = dragCardId !== null && dragColumnId === column.id;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (!cardListRef.current || !dragCardId) return;

    // Calculate drop index based on cursor position relative to cards
    const cards = cardListRef.current.querySelectorAll('[data-card-id]');
    if (cards.length === 0) {
      setDragOverIndex(0);
      return;
    }

    const mouseY = e.clientY;
    let insertIndex = cards.length; // default: end of list

    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (mouseY < midY) {
        insertIndex = i;
        break;
      }
    }

    setDragOverIndex(insertIndex);
  }, [dragCardId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!dragCardId || dragOverIndex === null) return;

    // Don't move to same position in same column
    const currentIndex = column.cards.findIndex(c => c.id === dragCardId);
    if (dragColumnId === column.id && currentIndex === dragOverIndex) {
      setDragOverIndex(null);
      return;
    }
    // Also handle case where dropping at end in same column (index shifts after removal)
    if (dragColumnId === column.id && currentIndex < dragOverIndex) {
      onMove(dragCardId, column.id, dragOverIndex - 1);
    } else {
      onMove(dragCardId, column.id, dragOverIndex);
    }

    setDragOverIndex(null);
    onDragEnd();
  }, [dragCardId, dragOverIndex, dragColumnId, column, onMove, onDragEnd]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if we're leaving the column entirely
    if (e.currentTarget === e.target) {
      setDragOverIndex(null);
    }
  }, []);

  return (
    <div
      className={`w-72 flex-shrink-0 flex flex-col max-h-full rounded-xl border shadow-sm transition-colors ${
        isDragOver && !isSource
          ? 'border-primary bg-primary-subtle/20'
          : 'border-border bg-background-subtle'
      }`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border flex-shrink-0">
        {column.emoji && <span className="text-sm leading-none">{column.emoji}</span>}
        <span className="text-sm font-medium text-foreground truncate">{column.name}</span>
        <Badge variant="secondary" className="ml-auto flex-shrink-0">
          {column.cards.length}
        </Badge>
      </div>

      {/* Cards */}
      <div ref={cardListRef} className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {column.cards.length === 0 && (
          <div
            className={`h-20 flex items-center justify-center border-2 border-dashed rounded-lg transition-colors ${
              isDragOver
                ? 'border-primary bg-primary-subtle/10'
                : 'border-border-muted'
            }`}
          >
            <p className={`text-xs ${isDragOver ? 'text-primary' : 'text-foreground-subtle'}`}>
              {isDragOver ? 'Drop here' : 'No tasks'}
            </p>
          </div>
        )}

        {column.cards.map((card, index) => (
          <div key={card.id}>
            {/* Drop indicator above card */}
            {dragOverIndex === index && dragCardId !== card.id && (
              <div className="h-0.5 bg-primary rounded-full mx-1 mb-1" />
            )}
            <KanbanCard
              card={card}
              isDragging={dragCardId === card.id}
              onToggle={() => onToggle(card.id)}
              onDelete={() => onDelete(card.id)}
              onEdit={onEdit}
              onDragStart={() => onDragStart(card.id, column.id)}
              onDragEnd={onDragEnd}
            />
          </div>
        ))}

        {/* Drop indicator at end of list */}
        {dragOverIndex === column.cards.length && column.cards.length > 0 && (
          <div className="h-0.5 bg-primary rounded-full mx-1 mt-1" />
        )}
      </div>

      {/* Add card */}
      <AddCardForm
        columnId={column.id}
        columnName={column.name}
        onAdd={onAdd}
      />
    </div>
  );
}
