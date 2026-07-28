import { useState, useRef, useCallback } from 'react';
import { Checkbox } from '@appica/ui-react/checkbox';
import { Button } from '@appica/ui-react/button';
import { Trash } from '@appica/icons-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogClose,
} from '@appica/ui-react/alert-dialog';
import type { Card } from '../types';

interface KanbanCardProps {
  card: Card;
  isDragging?: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onEdit?: (cardId: string, title: string, description: string) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export default function KanbanCard({ card, isDragging, onToggle, onDelete, onEdit, onDragStart, onDragEnd }: KanbanCardProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    }
    if (e.key === 'Escape') {
      setEditing(false);
      setEditTitle(card.title);
    }
  };

  return (
    <>
      <div
        className={`
          group rounded-lg border border-border bg-background p-2.5
          transition-shadow duration-150 hover:shadow-md
          ${card.done ? 'border-success-subtle bg-success-subtle/50' : ''}
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
        onDragEnd={() => {
          onDragEnd?.();
        }}
      >
        <div className="flex items-start gap-2">
          <Checkbox
            checked={card.done}
            onCheckedChange={onToggle}
            className="mt-0.5 flex-shrink-0"
            aria-label={card.done ? `Mark "${card.title}" as incomplete` : `Mark "${card.title}" as complete`}
          />
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
                className={`text-sm break-words cursor-text ${
                  card.done
                    ? 'line-through text-foreground-muted'
                    : 'text-foreground'
                }`}
                onDoubleClick={startEdit}
                title={onEdit ? 'Double-click to edit' : undefined}
              >
                {card.title}
              </p>
            )}
            {card.description && (
              <p className="text-xs text-foreground-muted mt-0.5 line-clamp-3">
                {card.description}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${card.title}`}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 -mr-1 -mt-0.5"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteOpen(true);
            }}
          >
            <Trash className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{card.title}"? This removes it from the TODO.md file.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-background-muted transition-colors">
              Cancel
            </AlertDialogClose>
            <AlertDialogClose
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-strong transition-colors"
              onClick={() => {
                onDelete();
                setDeleteOpen(false);
              }}
            >
              Delete
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
