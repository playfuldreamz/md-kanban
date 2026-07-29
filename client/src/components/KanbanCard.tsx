import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@appica/ui-react/button';
import { Trash, Pencil } from '@appica/icons-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogClose,
} from '@appica/ui-react/alert-dialog';
import EditCardDialog from './EditCardDialog';
import type { Card } from '../types';

const PRIORITY_MAP: Record<string, { label: string; color: string; ring: string }> = {
  critical: { label: 'Critical', color: 'bg-red-500', ring: 'ring-red-500/30' },
  important: { label: 'Important', color: 'bg-amber-500', ring: 'ring-amber-500/30' },
  polish: { label: 'Polish', color: 'bg-emerald-500', ring: 'ring-emerald-500/30' },
};

function extractPriority(text: string, priorities?: Record<string, { label: string; color: string; ring: string }>): { label: string; color: string; ring: string } | null {
  const map = priorities || PRIORITY_MAP;
  const lower = text.toLowerCase();
  for (const [key, val] of Object.entries(map)) {
    if (lower.includes(`#${key}`) || lower.includes(key)) return val;
  }
  return null;
}

interface KanbanCardProps {
  card: Card;
  isDragging?: boolean;
  columnName?: string;
  priorities?: Record<string, { label: string; color: string; ring: string }>;
  onToggle: () => void;
  onDelete: () => void;
  onEdit?: (cardId: string, title: string, description: string) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export default function KanbanCard({ card, isDragging, columnName, priorities, onToggle, onDelete, onEdit, onDragStart, onDragEnd }: KanbanCardProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const priority = card.description ? extractPriority(card.description, priorities) : extractPriority(columnName || '', priorities);

  const startEdit = useCallback(() => {
    if (!onEdit) return;
    setEditTitle(card.title);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [card.title, onEdit]);

  const commitEdit = useCallback(() => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== card.title && onEdit) {
      onEdit(card.id, trimmed, card.description);
    }
    setEditing(false);
    setEditTitle(card.title);
  }, [editTitle, card, onEdit]);

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
    if (e.key === 'Escape') { setEditing(false); setEditTitle(card.title); }
  };

  return (
    <>
      <div
        className={`
          group rounded-lg border bg-background p-3
          transition-shadow duration-150 hover:shadow-md
          ${card.done ? 'border-border-muted opacity-75' : 'border-border'}
          ${isDragging ? 'opacity-50 shadow-lg' : ''}
          ${!editing && onDragStart ? 'cursor-grab active:cursor-grabbing' : ''}
        `}
        data-card-id={card.id}
        draggable={!editing && !!onDragStart}
        onDragStart={(e) => {
          if (editing) return;
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', card.id);
          onDragStart?.();
        }}
        onDragEnd={() => onDragEnd?.()}
      >
        <div className="flex items-start gap-2.5">
          {priority && (
            <div
              className="flex-shrink-0 mt-1.5 cursor-default"
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 8, label: priority.label });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <span className={`block w-2.5 h-2.5 rounded-full ${priority.color} ring-2 ${priority.ring}`} />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                ref={inputRef}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={handleEditKeyDown}
                className="w-full text-sm bg-background border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            ) : (
              <p
                className={`text-sm break-words cursor-text ${card.done ? 'line-through text-foreground-muted' : 'text-foreground'}`}
                onDoubleClick={startEdit}
                title={onEdit ? 'Double-click to edit' : undefined}
              >
                {card.title}
              </p>
            )}
            {card.description && (
              <p className="text-xs text-foreground-muted mt-1 line-clamp-3">{card.description}</p>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Edit ${card.title}`}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 -mr-1 -mt-0.5"
            onClick={(e) => { e.stopPropagation(); setEditDialogOpen(true); }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${card.title}`}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 -mr-1 -mt-0.5"
            onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }}
          >
            <Trash className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task</AlertDialogTitle>
            <AlertDialogDescription>
              Remove "{card.title}" from the TODO.md file?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-background-muted transition-colors">
              Cancel
            </AlertDialogClose>
            <AlertDialogClose
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-strong transition-colors"
              onClick={() => { onDelete(); setDeleteOpen(false); }}
            >
              Delete
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditCardDialog
        open={editDialogOpen}
        title={card.title}
        description={card.description}
        priorities={priorities || PRIORITY_MAP}
        onSave={(newTitle, newDesc) => {
          if (onEdit) onEdit(card.id, newTitle, newDesc);
        }}
        onClose={() => setEditDialogOpen(false)}
      />

      {tooltip && createPortal(
        <div
          className="fixed z-[9999] px-1.5 py-0.5 rounded text-[10px] font-medium bg-background-inverse text-foreground-inverse shadow pointer-events-none whitespace-nowrap"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
        >
          {tooltip.label}
        </div>,
        document.body
      )}
    </>
  );
}
