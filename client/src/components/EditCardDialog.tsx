import { useState, useEffect, useRef } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogClose,
} from '@appica/ui-react/alert-dialog';
import { Input } from '@appica/ui-react/input';
import { Button } from '@appica/ui-react/button';
import { Plus, X } from '@appica/icons-react';

interface PriorityDef {
  label: string;
  color: string;
  ring: string;
}

interface EditCardDialogProps {
  open: boolean;
  title: string;
  description: string;
  priorities: Record<string, PriorityDef>;
  onSave: (title: string, description: string) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
  'bg-lime-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500',
  'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500',
  'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500',
];

export default function EditCardDialog({ open, title, description, priorities, onSave, onClose }: EditCardDialogProps) {
  const [editTitle, setEditTitle] = useState(title);
  const [editDesc, setEditDesc] = useState(description);
  const [localPriorities, setLocalPriorities] = useState(priorities);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('bg-purple-500');
  const [newTag, setNewTag] = useState('');

  // Sync from props on open, and sync priorities whenever they change (while open)
  const prevPrioritiesRef = useRef(priorities);
  useEffect(() => {
    if (!open) return;
    setEditTitle(title);
    setEditDesc(description);
    setLocalPriorities(priorities);
    setAdding(false);
    setNewLabel('');
    setNewTag('');
  }, [open]);
  useEffect(() => {
    if (open && priorities !== prevPrioritiesRef.current) {
      setLocalPriorities(priorities);
      prevPrioritiesRef.current = priorities;
    }
  }, [open, priorities]);

  const toggleTag = (tag: string) => {
    if (editDesc.includes(`#${tag}`)) {
      setEditDesc(editDesc.replace(new RegExp('\\s*#' + tag + '\\s*', 'g'), ' ').replace(/\s+/g, ' ').trim());
    } else {
      setEditDesc((editDesc + ' #' + tag).trim());
    }
  };

  const handleAddPriority = async () => {
    if (!newTag.trim() || !newLabel.trim()) return;
    const tag = newTag.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!tag) return;
    const ring = newColor.replace('bg-', 'ring-') + '/30';
    const updated = {
      ...localPriorities,
      [tag]: { label: newLabel.trim(), color: newColor, ring },
    };
    // Optimistic update & persist
    setLocalPriorities(updated);
    await fetch('/api/priorities', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priorities: updated }),
    });
    // Close the add form — the priority list updates when WebSocket syncs
    setAdding(false);
    setNewLabel('');
    setNewTag('');
  };

  const priorityEntries = Object.entries(localPriorities);

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Edit task</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="space-y-4 px-6 py-2">
          <div>
            <label className="text-xs font-medium text-foreground-muted block mb-1">Title</label>
            <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="text-sm" autoFocus />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground-muted block mb-1">Description</label>
            <textarea
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              className="w-full min-h-[80px] text-sm bg-background border border-border rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Details, notes, or #tags..."
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground-muted block mb-2">Priority tags</label>
            <div className="flex flex-wrap gap-2">
              {priorityEntries.map(([tag, def]) => {
                const isActive = editDesc.includes(`#${tag}`);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      isActive
                        ? 'border-primary bg-primary-subtle text-primary'
                        : 'border-border text-foreground-muted hover:border-border-strong hover:text-foreground'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${def.color}`} />
                    {def.label}
                  </button>
                );
              })}

              {/* + Add button */}
              {!adding ? (
                <button
                  onClick={() => setAdding(true)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border border-dashed border-border-muted text-foreground-subtle hover:border-border hover:text-foreground transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              ) : (
                <div className="flex flex-col gap-2 w-full p-2 rounded-md border border-border bg-background-muted">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Tag (e.g. blocked)"
                      value={newTag}
                      onChange={e => setNewTag(e.target.value)}
                      className="text-xs h-7 flex-1"
                      autoFocus
                    />
                    <Input
                      placeholder="Label"
                      value={newLabel}
                      onChange={e => setNewLabel(e.target.value)}
                      className="text-xs h-7 w-24"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setNewColor(c)}
                        className={`w-5 h-5 rounded-full ${c} transition-transform ${newColor === c ? 'scale-125 ring-2 ring-offset-1 ring-offset-background ring-foreground/30' : 'hover:scale-110'}`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1.5 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
                      <X className="w-3 h-3" />
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleAddPriority} disabled={!newTag.trim() || !newLabel.trim()}>
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogClose
            className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-background-muted transition-colors"
            onClick={onClose}
          >
            Cancel
          </AlertDialogClose>
          <Button
            variant="primary"
            onClick={() => {
              onSave(editTitle.trim() || title, editDesc.trim());
              onClose();
            }}
          >
            Save
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
