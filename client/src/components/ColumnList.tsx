import type { Column } from '../types';
import ColumnView from './Column';

interface ColumnListProps {
  columns: Column[];
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

export default function ColumnList({
  columns, onToggle, onDelete, onAdd, onEdit,
  onMove, dragCardId, dragColumnId, onDragStart, onDragEnd,
}: ColumnListProps) {
  if (columns.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-foreground-muted text-sm">No columns yet.</p>
          <p className="text-foreground-subtle text-xs">
            Add <code className="font-mono text-xs">## Column Name</code> sections to your TODO.md.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden">
      <div className="flex gap-4 p-4 h-full items-start justify-center min-w-max">
        {columns.map((col) => (
          <ColumnView
            key={col.id}
            column={col}
            onToggle={onToggle}
            onDelete={onDelete}
            onAdd={onAdd}
            onEdit={onEdit}
            onMove={onMove}
            dragCardId={dragCardId}
            dragColumnId={dragColumnId}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}
      </div>
    </div>
  );
}
