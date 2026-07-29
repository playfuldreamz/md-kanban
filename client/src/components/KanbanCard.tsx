import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@appica/ui-react/button';
import { Checkbox } from '@appica/ui-react/checkbox';
import { Trash, Pencil, ChevronRight, Plus, X } from '@appica/icons-react';
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
import type { Card } from '../types';

const PRIORITY_MAP: Record<string, { label: string; color: string; ring: string }> = {
  critical: { label: 'Critical', color: 'bg-red-500', ring: 'ring-red-500/30' },
  important: { label: 'Important', color: 'bg-amber-500', ring: 'ring-amber-500/30' },
  polish: { label: 'Polish', color: 'bg-emerald-500', ring: 'ring-emerald-500/30' },
};

/** Format an ISO date string to a human-readable relative or absolute date. */
function formatCreatedDate(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Created today';
  if (diffDays === 1) return 'Created yesterday';
  if (diffDays < 7) return `Created ${diffDays} days ago`;
  if (diffDays < 30) return `Created ${Math.floor(diffDays / 7)}w ago`;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `Created ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function extractPriorities(text: string, priorities?: Record<string, { label: string; color: string; ring: string }>): { label: string; color: string; ring: string }[] {
  const map = priorities || PRIORITY_MAP;
  const results: { label: string; color: string; ring: string }[] = [];
  const seen = new Set<string>();
  const lower = text.toLowerCase();
  for (const [key, val] of Object.entries(map)) {
    if ((lower.includes(`#${key}`) || lower.includes(key)) && !seen.has(key)) {
      seen.add(key);
      results.push(val);
    }
  }
  // Also detect from column name (for old-style files)
  if (results.length === 0 && text) {
    for (const [key, val] of Object.entries(map)) {
      if (lower.includes(key) && !seen.has(key)) { seen.add(key); results.push(val); }
    }
  }
  return results;
}

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
  onDeleteSubTask?: (parentId: string, childId: string) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export default function KanbanCard({ card, isDragging, columnName, priorities, onToggle, onDelete, onEdit, onToggleSubTask, onAddSubTask, onDeleteSubTask, onDragStart, onDragEnd }: KanbanCardProps) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null);
  const [childrenOpen, setChildrenOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const propsPriorities = priorities;
  const indicators = card.description
    ? extractPriorities(card.description, propsPriorities)
    : extractPriorities(columnName || '', propsPriorities);

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
          ${isDragging ? 'opacity-50 shadow-lg' : ''}
          ${!editing && onDragStart ? 'cursor-grab active:cursor-grabbing' : ''}
        `}
        data-card-id={card.id}
        title={card.createdAt ? formatCreatedDate(card.createdAt) : undefined}
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
            {/* Priority dots */}
            {indicators.length > 0 && (
              <div className="flex items-center gap-1 mt-1.5">
                {indicators.map((p, i) => (
                  <div
                    key={i}
                    className="cursor-default"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltip({ x: rect.left + rect.width / 2, y: rect.top - 6, label: p.label });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    <span className={`block w-2 h-2 rounded-full ${p.color} ring-1 ${p.ring}`} />
                  </div>
                ))}
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

// ─── Recursive sub-task components ──────────────────────────────────────────

const MAX_VISUAL_DEPTH = 4;

interface SubTaskSectionProps {
  parentId: string;
  childrenCards?: Card[];
  open: boolean;
  onToggleOpen: (open: boolean) => void;
  onToggleSubTask?: (parentId: string, childId: string) => void;
  onAddSubTask?: (parentId: string, title: string, description?: string) => void;
  onDeleteSubTask?: (parentId: string, childId: string) => void;
  depth: number;
}

function SubTaskSection({
  parentId, childrenCards, open, onToggleOpen,
  onToggleSubTask, onAddSubTask, onDeleteSubTask, depth,
}: SubTaskSectionProps) {
  const hasChildren = childrenCards && childrenCards.length > 0;
  const doneCount = hasChildren ? childrenCards!.filter(c => c.done).length : 0;
  const total = hasChildren ? childrenCards!.length : 0;
  const allDone = hasChildren && doneCount === total;
  const canNest = depth < MAX_VISUAL_DEPTH;

  // Don't render anything if no children and no callbacks (top-level card without sub-task support)
  if (!hasChildren && !onAddSubTask) return null;

  return (
    <div className={depth === 0 ? 'mt-2 pt-2 border-t border-border' : ''}>
      {/* Header: chevron + progress badge */}
      {hasChildren && (
        <button
          onClick={() => onToggleOpen(!open)}
          className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors w-full"
        >
          <ChevronRight
            className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`}
          />
          <span
            className={`font-medium tabular-nums ${
              allDone ? 'text-emerald-500' : doneCount > 0 ? 'text-amber-500' : 'text-foreground-muted'
            }`}
          >
            {doneCount}/{total}
          </span>
          <span className="text-foreground-subtle">
            {depth === 0 ? 'sub-tasks' : ''}
          </span>
        </button>
      )}

      {/* Children list */}
      {open && hasChildren && (
        <div className="mt-1 space-y-0.5">
          {childrenCards!.map((child) => (
            <SubTaskItem
              key={child.id}
              child={child}
              parentId={parentId}
              depth={depth + 1}
              canNest={canNest}
              onToggleSubTask={onToggleSubTask}
              onAddSubTask={onAddSubTask}
              onDeleteSubTask={onDeleteSubTask}
            />
          ))}
        </div>
      )}

      {/* Add sub-task button */}
      {canNest && onAddSubTask && (
        <AddSubTaskInline
          parentId={parentId}
          onAdd={onAddSubTask}
          onAdded={() => onToggleOpen(true)}
        />
      )}
    </div>
  );
}

interface SubTaskItemProps {
  child: Card;
  parentId: string;
  depth: number;
  canNest: boolean;
  onToggleSubTask?: (parentId: string, childId: string) => void;
  onAddSubTask?: (parentId: string, title: string, description?: string) => void;
  onDeleteSubTask?: (parentId: string, childId: string) => void;
}

function SubTaskItem({
  child, parentId, depth, canNest,
  onToggleSubTask, onAddSubTask, onDeleteSubTask,
}: SubTaskItemProps) {
  const [open, setOpen] = useState(false);
  const hasKids = child.children && child.children.length > 0;
  const doneCount = hasKids ? child.children!.filter(c => c.done).length : 0;
  const totalKids = hasKids ? child.children!.length : 0;
  const allKidsDone = hasKids && doneCount === totalKids;

  const depthColor = depth >= 3 ? 'text-foreground-subtle' : depth >= 2 ? 'text-foreground-muted' : 'text-foreground';

  const createdLabel = child.createdAt ? formatCreatedDate(child.createdAt) : undefined;

  return (
    <div>
      {/* Row: checkbox + expand chevron + title + delete */}
      <div
        className="group/child flex items-center gap-1.5 py-0.5"
        style={{ paddingLeft: `${depth * 4}px` }}
        title={createdLabel}
      >
        {/* Expand chevron (if this child has its own children) */}
        {hasKids && canNest ? (
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-0.5 flex-shrink-0"
          >
            <ChevronRight
              className={`w-2.5 h-2.5 text-foreground-muted transition-transform ${open ? 'rotate-90' : ''}`}
            />
            <span
              className={`text-[10px] font-medium tabular-nums ${
                allKidsDone ? 'text-emerald-500' : doneCount > 0 ? 'text-amber-500' : 'text-foreground-muted'
              }`}
            >
              {doneCount}/{totalKids}
            </span>
          </button>
        ) : hasKids && !canNest ? (
          /* Too deep — show count but no expansion */
          <span className="text-[10px] text-foreground-subtle tabular-nums flex-shrink-0 w-10 text-right">
            {doneCount}/{totalKids}
          </span>
        ) : (
          /* No children — spacer for alignment */
          <span className="w-2.5 flex-shrink-0" />
        )}

        <Checkbox
          checked={child.done}
          onCheckedChange={() => onToggleSubTask?.(parentId, child.id)}
          className={`h-3.5 w-3.5 flex-shrink-0 ${depth >= 3 ? 'opacity-60' : ''}`}
          aria-label={`Toggle ${child.title}`}
        />
        <div className="flex-1 min-w-0">
          <span
            className={`text-xs truncate block ${child.done ? 'line-through text-foreground-muted' : depthColor}`}
          >
            {child.title}
          </span>
          {child.description && (
            <p
              className="text-[10px] text-foreground-muted mt-0.5 line-clamp-2"
              dangerouslySetInnerHTML={{ __html: renderInline(child.description) }}
            />
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Delete sub-task ${child.title}`}
          className="opacity-0 group-hover/child:opacity-100 transition-opacity h-5 w-5 flex-shrink-0"
          onClick={() => onDeleteSubTask?.(parentId, child.id)}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      {/* Recursive children + add button */}
      {(open || !hasKids) && canNest && onAddSubTask ? (
        <div style={{ paddingLeft: `${(depth + 1) * 4}px` }}>
          <SubTaskSection
            parentId={child.id}
            childrenCards={child.children}
            open={open}
            onToggleOpen={setOpen}
            onToggleSubTask={onToggleSubTask}
            onAddSubTask={onAddSubTask}
            onDeleteSubTask={onDeleteSubTask}
            depth={depth + 1}
          />
        </div>
      ) : open && hasKids && !canNest ? (
        /* Too deep for nesting — still show children flat */
        <div style={{ paddingLeft: `${(depth + 1) * 4}px` }}>
          {child.children!.map((gc) => (
            <SubTaskItem
              key={gc.id}
              child={gc}
              parentId={child.id}
              depth={depth + 1}
              canNest={false}
              onToggleSubTask={onToggleSubTask}
              onAddSubTask={undefined}
              onDeleteSubTask={onDeleteSubTask}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Inline "Add sub-task" input with optional description. */
function AddSubTaskInline({
  parentId, onAdd, onAdded,
}: {
  parentId: string;
  onAdd: (parentId: string, title: string, description?: string) => void;
  onAdded: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  if (!adding) {
    return (
      <button
        onClick={() => {
          setAdding(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="flex items-center gap-1 mt-1 text-xs text-foreground-subtle hover:text-foreground transition-colors"
      >
        <Plus className="w-3 h-3" />
        Add sub-task
      </button>
    );
  }

  const commit = () => {
    const t = title.trim();
    if (!t) { setAdding(false); return; }
    const d = desc.trim() || undefined;
    onAdd(parentId, t, d);
    setTitle('');
    setDesc('');
    setAdding(false);
    onAdded();
  };

  return (
    <div className="mt-1 space-y-1">
      <div className="flex items-center gap-1.5">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            if (e.key === 'Escape') { setTitle(''); setDesc(''); setAdding(false); }
          }}
          placeholder="Sub-task title..."
          className="flex-1 text-xs bg-background border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          autoFocus
        />
        <Button variant="ghost" size="icon-sm" className="h-5 w-5" onClick={() => { setAdding(false); setTitle(''); setDesc(''); }}>
          <X className="w-3 h-3" />
        </Button>
      </div>
      <input
        type="text"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          if (e.key === 'Escape') { setTitle(''); setDesc(''); setAdding(false); }
        }}
        placeholder="Description (optional)..."
        className="w-full text-[10px] bg-background border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      />
    </div>
  );
}
