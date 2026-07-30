import { useState, useEffect } from 'react';
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
import { extractTags, getTagDef } from './card-utils';
import type { TagDef } from './card-utils';

interface EditCardDialogProps {
  open: boolean;
  title: string;
  description: string;
  priorities: Record<string, TagDef>;
  onSave: (title: string, description: string) => void;
  onClose: () => void;
}

export default function EditCardDialog({ open, title, description, priorities, onSave, onClose }: EditCardDialogProps) {
  const [editTitle, setEditTitle] = useState(title);
  const [editDesc, setEditDesc] = useState(description);

  useEffect(() => {
    if (!open) return;
    setEditTitle(title);
    setEditDesc(description);
  }, [open, title, description]);

  const toggleTag = (tag: string) => {
    if (editDesc.includes(`#${tag}`)) {
      setEditDesc(editDesc.replace(new RegExp('\\s*#' + tag + '\\s*', 'g'), ' ').replace(/\s+/g, ' ').trim());
    } else {
      setEditDesc((editDesc + ' #' + tag).trim());
    }
  };

  // Merge known priority tags with any tags found in the description
  const existingTags = extractTags(editDesc, priorities);
  const activeTags = new Set(existingTags.map((t) => t.tag));
  const priorityTagSet = new Set(Object.keys(priorities));
  const allToggleTags = [...new Set([...priorityTagSet, ...activeTags])];

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
            <label className="text-xs font-medium text-foreground-muted block mb-1">
              Description
              <span className="text-foreground-subtle font-normal ml-1">— use #tag for labels</span>
            </label>
            <textarea
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              className="w-full min-h-[80px] text-sm bg-background border border-border rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Details, notes, or #bug #feature #frontend..."
            />
          </div>

          {allToggleTags.length > 0 && (
            <div>
              <label className="text-xs font-medium text-foreground-muted block mb-2">Quick-toggle tags</label>
              <div className="flex flex-wrap gap-2">
                {allToggleTags.map((tag) => {
                  const def = getTagDef(tag, priorities);
                  const isActive = activeTags.has(tag);
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
              </div>
            </div>
          )}
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
