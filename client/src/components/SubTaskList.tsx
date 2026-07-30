import { useState, useRef } from 'react';
import { Button } from '@appica/ui-react/button';
import { Checkbox } from '@appica/ui-react/checkbox';
import { ChevronRight, Plus, X, Pencil } from '@appica/icons-react';
import EditCardDialog from './EditCardDialog';
import { renderInline } from '../lib/markdown';
import { PRIORITY_MAP, formatCreatedDate } from './card-utils';
import type { Card } from '../types';

// ─── Constants ──────────────────────────────────────────────────────────────

export const MAX_VISUAL_DEPTH = 4;

// ─── Props ──────────────────────────────────────────────────────────────────

export interface SubTaskSectionProps {
  parentId: string;
  childrenCards?: Card[];
  open: boolean;
  onToggleOpen: (open: boolean) => void;
  onToggleSubTask?: (parentId: string, childId: string) => void;
  onAddSubTask?: (parentId: string, title: string, description?: string) => void;
  onEditSubTask?: (parentId: string, childId: string, title: string, description: string) => void;
  onDeleteSubTask?: (parentId: string, childId: string) => void;
  depth: number;
}

interface SubTaskItemProps {
  child: Card;
  parentId: string;
  depth: number;
  canNest: boolean;
  onToggleSubTask?: (parentId: string, childId: string) => void;
  onAddSubTask?: (parentId: string, title: string, description?: string) => void;
  onEditSubTask?: (parentId: string, childId: string, title: string, description: string) => void;
  onDeleteSubTask?: (parentId: string, childId: string) => void;
}

// ─── Components ─────────────────────────────────────────────────────────────

export function SubTaskSection({
  parentId, childrenCards, open, onToggleOpen,
  onToggleSubTask, onAddSubTask, onEditSubTask, onDeleteSubTask, depth,
}: SubTaskSectionProps) {
  const hasChildren = childrenCards && childrenCards.length > 0;
  const doneCount = hasChildren ? childrenCards!.filter(c => c.done).length : 0;
  const total = hasChildren ? childrenCards!.length : 0;
  const allDone = hasChildren && doneCount === total;
  const canNest = depth < MAX_VISUAL_DEPTH;

  if (!hasChildren && !onAddSubTask) return null;

  return (
    <div className={depth === 0 ? 'mt-2 pt-2 border-t border-border' : ''}>
      {hasChildren && (
        <button
          onClick={() => onToggleOpen(!open)}
          className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors w-full"
        >
          <ChevronRight className={`w-3 h-3 transition-transform ${open ? 'rotate-90' : ''}`} />
          <span className={`font-medium tabular-nums ${
            allDone ? 'text-emerald-500' : doneCount > 0 ? 'text-amber-500' : 'text-foreground-muted'
          }`}>
            {doneCount}/{total}
          </span>
          <span className="text-foreground-subtle">{depth === 0 ? 'sub-tasks' : ''}</span>
        </button>
      )}
      {open && hasChildren && (
        <div className="mt-1 space-y-0.5">
          {childrenCards!.map((child) => (
            <SubTaskItem
              key={child.id} child={child} parentId={parentId}
              depth={depth + 1} canNest={canNest}
              onToggleSubTask={onToggleSubTask} onAddSubTask={onAddSubTask}
              onEditSubTask={onEditSubTask} onDeleteSubTask={onDeleteSubTask}
            />
          ))}
        </div>
      )}
      {canNest && onAddSubTask && (
        <AddSubTaskInline parentId={parentId} onAdd={onAddSubTask} onAdded={() => onToggleOpen(true)} />
      )}
    </div>
  );
}

function SubTaskItem({
  child, parentId, depth, canNest,
  onToggleSubTask, onAddSubTask, onEditSubTask, onDeleteSubTask,
}: SubTaskItemProps) {
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const hasKids = child.children && child.children.length > 0;
  const doneCount = hasKids ? child.children!.filter(c => c.done).length : 0;
  const totalKids = hasKids ? child.children!.length : 0;
  const allKidsDone = hasKids && doneCount === totalKids;
  const depthColor = depth >= 3 ? 'text-foreground-subtle' : depth >= 2 ? 'text-foreground-muted' : 'text-foreground';

  return (
    <div>
      <div className="group/child flex items-center gap-1.5 py-0.5" style={{ paddingLeft: `${depth * 4}px` }}>
        {hasKids && canNest ? (
          <button onClick={() => setOpen(!open)} className="flex items-center gap-0.5 flex-shrink-0">
            <ChevronRight className={`w-2.5 h-2.5 text-foreground-muted transition-transform ${open ? 'rotate-90' : ''}`} />
            <span className={`text-[10px] font-medium tabular-nums ${
              allKidsDone ? 'text-emerald-500' : doneCount > 0 ? 'text-amber-500' : 'text-foreground-muted'
            }`}>{doneCount}/{totalKids}</span>
          </button>
        ) : hasKids && !canNest ? (
          <span className="text-[10px] text-foreground-subtle tabular-nums flex-shrink-0 w-10 text-right">{doneCount}/{totalKids}</span>
        ) : (
          <span className="w-2.5 flex-shrink-0" />
        )}
        <Checkbox
          checked={child.done} onCheckedChange={() => onToggleSubTask?.(parentId, child.id)}
          className={`h-3.5 w-3.5 flex-shrink-0 ${depth >= 3 ? 'opacity-60' : ''}`}
          aria-label={`Toggle ${child.title}`}
        />
        <div className="flex-1 min-w-0">
          <span className={`text-xs truncate block ${child.done ? 'line-through text-foreground-muted' : depthColor}`}>
            {child.title}
          </span>
          {child.description && (
            <p className="text-[10px] text-foreground-muted mt-0.5 line-clamp-2"
              dangerouslySetInnerHTML={{ __html: renderInline(child.description) }} />
          )}
          {child.createdAt && (
            <span className="opacity-0 group-hover/child:opacity-100 transition-opacity text-[9px] text-foreground-subtle mt-0.5 block">
              {formatCreatedDate(child.createdAt)}
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon-sm" aria-label={`Edit sub-task ${child.title}`}
          className="opacity-0 group-hover/child:opacity-100 transition-opacity h-5 w-5 flex-shrink-0"
          onClick={() => setEditOpen(true)}>
          <Pencil className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={`Delete sub-task ${child.title}`}
          className="opacity-0 group-hover/child:opacity-100 transition-opacity h-5 w-5 flex-shrink-0"
          onClick={() => onDeleteSubTask?.(parentId, child.id)}>
          <X className="w-3 h-3" />
        </Button>
      </div>

      {/* Recursive children */}
      {(open || !hasKids) && canNest && onAddSubTask ? (
        <div style={{ paddingLeft: `${(depth + 1) * 4}px` }}>
          <SubTaskSection
            parentId={child.id} childrenCards={child.children}
            open={open} onToggleOpen={setOpen}
            onToggleSubTask={onToggleSubTask} onAddSubTask={onAddSubTask}
            onEditSubTask={onEditSubTask} onDeleteSubTask={onDeleteSubTask}
            depth={depth + 1}
          />
        </div>
      ) : open && hasKids && !canNest ? (
        <div style={{ paddingLeft: `${(depth + 1) * 4}px` }}>
          {child.children!.map((gc) => (
            <SubTaskItem key={gc.id} child={gc} parentId={child.id}
              depth={depth + 1} canNest={false}
              onToggleSubTask={onToggleSubTask} onAddSubTask={undefined}
              onEditSubTask={onEditSubTask} onDeleteSubTask={onDeleteSubTask}
            />
          ))}
        </div>
      ) : null}

      <EditCardDialog open={editOpen} title={child.title} description={child.description}
        dueDate={child.dueDate} warning={child.warning}
        priorities={PRIORITY_MAP}
        onSave={(newTitle, newDesc) => onEditSubTask?.(parentId, child.id, newTitle, newDesc)}
        onClose={() => setEditOpen(false)}
      />
    </div>
  );
}

export function AddSubTaskInline({
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
      <button onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 0); }}
        className="flex items-center gap-1 mt-1 text-xs text-foreground-subtle hover:text-foreground transition-colors">
        <Plus className="w-3 h-3" /> Add sub-task
      </button>
    );
  }

  const commit = () => {
    const t = title.trim();
    if (!t) { setAdding(false); return; }
    onAdd(parentId, t, desc.trim() || undefined);
    setTitle(''); setDesc(''); setAdding(false); onAdded();
  };

  return (
    <div className="mt-1 space-y-1">
      <div className="flex items-center gap-1.5">
        <input ref={inputRef} type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            if (e.key === 'Escape') { setTitle(''); setDesc(''); setAdding(false); }
          }}
          placeholder="Sub-task title..." autoFocus
          className="flex-1 text-xs bg-background border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
        <Button variant="ghost" size="icon-sm" className="h-5 w-5"
          onClick={() => { setAdding(false); setTitle(''); setDesc(''); }}>
          <X className="w-3 h-3" />
        </Button>
      </div>
      <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)}
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
