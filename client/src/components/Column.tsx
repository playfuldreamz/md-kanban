import { useState, useRef, useCallback } from 'react';
import { Badge } from '@appica/ui-react/badge';
import { Button } from '@appica/ui-react/button';
import { ClipboardCheck, Clock, CircleCheck, LayoutKanban, AlertTriangle, Sparkles, Trash } from '@appica/icons-react';
import type { Column } from '../types';
import KanbanCard from './KanbanCard';
import AddCardForm from './AddCardForm';

// Map column IDs/names to Appica icons — with priority-aware coloring
function columnIcon(col: Column): { icon: React.ReactNode; priority: string | null } {
  const id = col.id.toLowerCase();
  const name = displayName(col).toLowerCase();

  // Workflow columns
  if (id === 'todo' || id === 'to-do' || name.includes('to do')) return { icon: <ClipboardCheck className="w-4 h-4" />, priority: null };
  if (id === 'in-progress' || name.includes('progress') || name.includes('doing') || name.includes('active')) return { icon: <Clock className="w-4 h-4" />, priority: null };
  if (id === 'done' || name.includes('done') || name.includes('complete')) return { icon: <CircleCheck className="w-4 h-4" />, priority: null };

  // Priority columns: map to appropriate icons with colored accents
  if (name.includes('critical') || name.includes('urgent') || name.includes('blocker'))
    return { icon: <AlertTriangle className="w-4 h-4 text-red-500" />, priority: 'critical' };
  if (name.includes('important') || name.includes('high') || name.includes('priority'))
    return { icon: <AlertTriangle className="w-4 h-4 text-amber-500" />, priority: 'important' };
  if (name.includes('polish') || name.includes('nice') || name.includes('low') || name.includes('later') || name.includes('backlog'))
    return { icon: <Sparkles className="w-4 h-4 text-emerald-500" />, priority: 'polish' };
  if (name.includes('review') || name.includes('testing') || name.includes('qa'))
    return { icon: <Sparkles className="w-4 h-4 text-blue-500" />, priority: null };

  return { icon: <LayoutKanban className="w-4 h-4" />, priority: null };
}

// Strip emoji from column name for display
function displayName(col: Column): string {
  return col.name.replace(/^[\p{Emoji_Presentation}\p{Emoji}\uFE0F\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{2702}-\u{27B0}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]\s*/u, '').trim() || col.name;
}

interface ColumnViewProps {
  column: Column;
  showCompleted: boolean;
  priorities?: Record<string, { label: string; color: string; ring: string }>;
  onToggle: (cardId: string) => void;
  onDelete: (cardId: string) => void;
  onAdd: (columnId: string, title: string, description: string) => void;
  onEdit: (cardId: string, title: string, description: string) => void;
  onMove: (cardId: string, toColumnId: string, toIndex: number) => void;
  onDeleteColumn?: (columnId: string) => void;
  dragCardId: string | null;
  dragColumnId: string | null;
  onDragStart: (cardId: string, columnId: string) => void;
  onDragEnd: () => void;
}

export default function ColumnView({
  column, showCompleted, priorities, onToggle, onDelete, onAdd, onEdit,
  onMove, onDeleteColumn, dragCardId, dragColumnId, onDragStart, onDragEnd,
}: ColumnViewProps) {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const cardListRef = useRef<HTMLDivElement>(null);

  const { icon, priority: colPriority } = columnIcon(column);

  const isDragOver = dragCardId !== null && dragOverIndex !== null;
  const isSource = dragCardId !== null && dragColumnId === column.id;
  const isMandatory = column.id.includes('to-do') || column.name.toLowerCase().includes('to do') ||
    column.id.includes('progress') || column.name.toLowerCase().includes('progress') ||
    column.id.includes('done') || column.name.toLowerCase().includes('done');
  const visibleCards = showCompleted ? column.cards : column.cards.filter(c => !c.done);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!cardListRef.current || !dragCardId) return;
    const cards = cardListRef.current.querySelectorAll('[data-card-id]');
    if (cards.length === 0) { setDragOverIndex(0); return; }
    const mouseY = e.clientY;
    let insertIndex = cards.length;
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      if (mouseY < rect.top + rect.height / 2) { insertIndex = i; break; }
    }
    setDragOverIndex(insertIndex);
  }, [dragCardId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!dragCardId || dragOverIndex === null) return;
    const currentIndex = column.cards.findIndex(c => c.id === dragCardId);
    if (dragColumnId === column.id && currentIndex === dragOverIndex) { setDragOverIndex(null); return; }
    if (dragColumnId === column.id && currentIndex < dragOverIndex) {
      onMove(dragCardId, column.id, dragOverIndex - 1);
    } else {
      onMove(dragCardId, column.id, dragOverIndex);
    }
    setDragOverIndex(null);
    onDragEnd();
  }, [dragCardId, dragOverIndex, dragColumnId, column, onMove, onDragEnd]);

  return (
    <div
      className={`w-[42rem] flex-shrink-0 flex flex-col max-h-full rounded-xl border shadow-sm transition-colors ${
        isDragOver && !isSource ? 'border-primary bg-primary-subtle/20' : 'border-border bg-background-subtle'
      }`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOverIndex(null); }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border flex-shrink-0 group">
        {icon}
        <span className="text-sm font-medium text-foreground truncate flex-1">
          {displayName(column)}
        </span>
        <Badge variant="secondary" className="flex-shrink-0">{visibleCards.length}</Badge>
        {!isMandatory && onDeleteColumn && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete column ${displayName(column)}`}
            className="flex-shrink-0 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onDeleteColumn(column.id)}
          >
            <Trash className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Cards */}
      <div ref={cardListRef} className="flex-1 overflow-y-auto p-2 pr-4 space-y-1.5">
        {visibleCards.length === 0 && (
          <div className={`h-20 flex items-center justify-center border-2 border-dashed rounded-lg transition-colors ${
            isDragOver ? 'border-primary bg-primary-subtle/10' : 'border-border-muted'
          }`}>
            <p className={`text-xs ${isDragOver ? 'text-primary' : 'text-foreground-subtle'}`}>
              {isDragOver ? 'Drop here' : 'No tasks'}
            </p>
          </div>
        )}
        {visibleCards.map((card, index) => (
          <div key={card.id}>
            {dragOverIndex === index && dragCardId !== card.id && (
              <div className="h-0.5 bg-primary rounded-full mx-1 mb-1" />
            )}
            <KanbanCard
              card={card}
              columnName={column.name}
              priorities={priorities}
              isDragging={dragCardId === card.id}
              onToggle={() => onToggle(card.id)}
              onDelete={() => onDelete(card.id)}
              onEdit={onEdit}
              onDragStart={() => onDragStart(card.id, column.id)}
              onDragEnd={onDragEnd}
            />
          </div>
        ))}
        {dragOverIndex === visibleCards.length && visibleCards.length > 0 && (
          <div className="h-0.5 bg-primary rounded-full mx-1 mt-1" />
        )}
      </div>

      {/* Add card */}
      <AddCardForm columnId={column.id} columnName={column.name} onAdd={onAdd} />
    </div>
  );
}
