import { useState, useRef, useCallback } from 'react';
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
import { renderInline } from '../lib/markdown';
import { PRIORITY_MAP, formatCreatedDate, extractTags, getDueColor, formatDueDate } from './card-utils';
import { SubTaskSection } from './SubTaskList';
import Tooltip from './Tooltip';
import type { Card } from '../types';

interface KanbanCardProps {
  card: Card;
  isDragging?: boolean;
  columnName?: string;
  priorities?: Record<string, { label: string; color: string; ring: string }>;
  onToggle: () => void;
  onDelete: () => void;
  onEdit?: (cardId: string, title: string, description: string) => void;
  onToggleSubTask?: (parentId: string, childId: string) => void;
  onAddSubTask?: (parentId: string, title: string, description?: string) => void;
  onEditSubTask?: (parentId: string, childId: string, title: string, description: string) => void;
  onDeleteSubTask?: (parentId: string, childId: string) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export default function KanbanCard({ card, isDragging, columnName, priorities, onToggle, onDelete, onEdit, onToggleSubTask, onAddSubTask, onEditSubTask, onDeleteSubTask, onDragStart, onDragEnd }: KanbanCardProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [childrenOpen, setChildrenOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const propsPriorities = priorities;
  const tags = extractTags(card.description || columnName || '', propsPriorities);

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
          group relative rounded-lg border bg-background p-3
          transition-shadow duration-150 hover:shadow-md
          ${card.done ? 'border-border-muted opacity-75' : 'border-border'}
          ${card.warning ? 'border-l-2 border-l-amber-500' : ''}
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
              <p
                className="text-xs text-foreground-muted mt-1 line-clamp-3"
                dangerouslySetInnerHTML={{ __html: renderInline(card.description) }}
              />
            )}
            {/* Tags + creation date */}
            {(tags.length > 0 || card.createdAt || card.dueDate) && (
              <div className="flex items-center justify-between mt-1.5 gap-2">
                <div className="flex items-center gap-1 flex-wrap">
                  {card.dueDate && (
                    <span className={`inline-flex items-center px-1.5 py-px rounded text-[10px] font-medium text-white ${getDueColor(card.dueDate)}`}>
                      {formatDueDate(card.dueDate)}
                    </span>
                  )}
                  {tags.map(({ tag, def }) => (
                    <Tooltip key={tag} label={def.label} placement="top">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-px rounded text-[10px] font-medium text-white cursor-default ${def.color}`}
                      >
                        {def.label}
                      </span>
                    </Tooltip>
                  ))}
                </div>
                {card.createdAt && (
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-foreground-subtle whitespace-nowrap">
                    {formatCreatedDate(card.createdAt)}
                  </span>
                )}
              </div>
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

        {/* Sub-tasks / children section */}
        <SubTaskSection
          parentId={card.id}
          childrenCards={card.children}
          open={childrenOpen}
          onToggleOpen={setChildrenOpen}
          onToggleSubTask={onToggleSubTask}
          onAddSubTask={onAddSubTask}
          onEditSubTask={onEditSubTask}
          onDeleteSubTask={onDeleteSubTask}
          depth={0}
        />
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

    </>
  );
}
