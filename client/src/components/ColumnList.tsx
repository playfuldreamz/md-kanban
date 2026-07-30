import { useState } from 'react';
import { Button } from '@appica/ui-react/button';
import { Input } from '@appica/ui-react/input';
import { Plus, Check, X } from '@appica/icons-react';
import type { Column } from '../types';
import ColumnView from './Column';

interface ColumnListProps {
  columns: Column[];
  showCompleted: boolean;
  priorities?: Record<string, { label: string; color: string; ring: string }>;
  onToggle: (cardId: string) => void;
  onDelete: (cardId: string) => void;
  onAdd: (columnId: string, title: string, description: string) => void;
  onEdit: (cardId: string, title: string, description: string) => void;
  onMove: (cardId: string, toColumnId: string, toIndex: number) => void;
  onAddColumn: (name: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onToggleSubTask: (parentId: string, childId: string) => void;
  onAddSubTask: (parentId: string, title: string, description?: string) => void;
  onEditSubTask: (parentId: string, childId: string, title: string, description: string) => void;
  onDeleteSubTask: (parentId: string, childId: string) => void;
  boardAssignees?: Record<string, { label: string; color: string; ring: string }>;
  dragCardId: string | null;
  dragColumnId: string | null;
  onDragStart: (cardId: string, columnId: string) => void;
  onDragEnd: () => void;
}

export default function ColumnList({
  columns, showCompleted, priorities, onToggle, onDelete, onAdd, onEdit,
  onMove, onAddColumn, onDeleteColumn, onToggleSubTask, onAddSubTask, onEditSubTask, onDeleteSubTask,
  boardAssignees, dragCardId, dragColumnId, onDragStart, onDragEnd,
}: ColumnListProps) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  if (columns.length === 0 && !adding) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-foreground-muted text-sm">No columns yet.</p>
          <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
            <Plus className="w-3.5 h-3.5" />
            Add Column
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-x-auto overflow-y-hidden">
      <div className="flex gap-6 p-6 h-full items-start justify-center">
        {columns.map((col) => (
          <ColumnView
            key={col.id}
            column={col}
            showCompleted={showCompleted}
            priorities={priorities}
            onToggle={onToggle}
            onDelete={onDelete}
            onAdd={onAdd}
            onEdit={onEdit}
            onMove={onMove}
            onDeleteColumn={onDeleteColumn}
            onToggleSubTask={onToggleSubTask}
            onAddSubTask={onAddSubTask}
            onEditSubTask={onEditSubTask}
            onDeleteSubTask={onDeleteSubTask}
            boardAssignees={boardAssignees}
            dragCardId={dragCardId}
            dragColumnId={dragColumnId}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}

        {/* Add column button / form */}
        {adding ? (
          <div className="w-72 flex-shrink-0 rounded-xl border-2 border-dashed border-border-muted bg-background-subtle p-3 flex flex-col gap-2">
            <Input
              placeholder="Column name..."
              value={name}
              onChange={e => setName(e.target.value)}
              className="text-sm"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter' && name.trim()) {
                  onAddColumn(name.trim());
                  setName('');
                  setAdding(false);
                }
                if (e.key === 'Escape') { setName(''); setAdding(false); }
              }}
            />
            <div className="flex gap-1.5">
              <Button
                variant="primary"
                size="sm"
                disabled={!name.trim()}
                onClick={() => {
                  if (name.trim()) {
                    onAddColumn(name.trim());
                    setName('');
                    setAdding(false);
                  }
                }}
              >
                <Check className="w-3.5 h-3.5" />
                Add
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setName(''); setAdding(false); }}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-72 flex-shrink-0 h-32 rounded-xl border-2 border-dashed border-border-muted bg-background-subtle hover:bg-background-muted hover:border-border transition-colors flex flex-col items-center justify-center gap-2 group"
          >
            <Plus className="w-5 h-5 text-foreground-muted group-hover:text-foreground transition-colors" />
            <span className="text-sm text-foreground-muted group-hover:text-foreground transition-colors font-medium">
              Add Column
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
