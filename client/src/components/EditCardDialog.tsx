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
import { AlertTriangle } from '@appica/icons-react';
import { extractTags, getTagDef, extractAssignees, getAssigneeDef, formatInitials } from './card-utils';
import type { TagDef, AssigneeDef } from './card-utils';

interface EditCardDialogProps {
  open: boolean;
  title: string;
  description: string;
  dueDate?: string;
  warning?: boolean;
  assignees?: Record<string, AssigneeDef>;
  priorities: Record<string, TagDef>;
  onSave: (title: string, description: string, dueDate?: string, warning?: boolean) => void;
  onClose: () => void;
}

export default function EditCardDialog({ open, title, description, dueDate, warning, assignees, priorities, onSave, onClose }: EditCardDialogProps) {
  const [editTitle, setEditTitle] = useState(title);
  const [editDesc, setEditDesc] = useState(description);
  const [editDueDate, setEditDueDate] = useState(dueDate || '');
  const [editWarning, setEditWarning] = useState(warning || false);
  const [customTagInput, setCustomTagInput] = useState('');
  const [assigneeInput, setAssigneeInput] = useState('');

  useEffect(() => {
    if (!open) return;
    setEditTitle(title);
    setEditDesc(description);
    setEditDueDate(dueDate || '');
    setEditWarning(warning || false);
  }, [open, title, description, dueDate, warning]);

  const toggleTag = (tag: string) => {
    if (editDesc.includes(`#${tag}`)) {
      setEditDesc(editDesc.replace(new RegExp('\\s*#' + tag + '\\s*', 'g'), ' ').replace(/\s+/g, ' ').trim());
    } else {
      setEditDesc((editDesc + ' #' + tag).trim());
    }
  };

  const handleDueDateChange = (val: string) => {
    setEditDueDate(val);
    let desc = editDesc.replace(/\s*due:\d{4}-\d{2}-\d{2}\s*/i, ' ').replace(/\s+/g, ' ').trim();
    if (val) desc = (desc + ` due:${val}`).trim();
    setEditDesc(desc);
  };

  const existingTags = extractTags(editDesc, priorities);
  const activeTags = new Set(existingTags.map((t) => t.tag));
  const priorityTagSet = new Set(Object.keys(priorities));
  const allToggleTags = [...new Set([...priorityTagSet, ...activeTags])];

  const toggleAssignee = (username: string) => {
    if (editDesc.includes(`@${username}`)) {
      setEditDesc(editDesc.replace(new RegExp('\\s*@' + username + '\\s*', 'g'), ' ').replace(/\s+/g, ' ').trim());
    } else {
      setEditDesc((editDesc + ' @' + username).trim());
    }
  };

  const existingAssignees = extractAssignees(editDesc, assignees);
  const knownAssignees = assignees ? Object.keys(assignees) : [];
  const activeUsernames = new Set(existingAssignees.map((a) => a.username));
  const allAssigneeUsers = [...new Set([...knownAssignees, ...activeUsernames])];

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

          {/* Due date + warning row */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-foreground-muted block mb-1">Due date</label>
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => handleDueDateChange(e.target.value)}
                className="w-full text-xs bg-background border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div className="pt-5">
              <button
                onClick={() => setEditWarning(!editWarning)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  editWarning
                    ? 'border-amber-500 bg-amber-500/10 text-amber-600'
                    : 'border-border text-foreground-muted hover:border-border-strong hover:text-foreground'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Warning
              </button>
            </div>
          </div>

          {/* Assignees — always show to allow adding first */}
          <div>
              <label className="text-xs font-medium text-foreground-muted block mb-2">Assignees</label>
              <div className="flex flex-wrap gap-2">
                {allAssigneeUsers.map((username) => {
                  const def = getAssigneeDef(username, assignees);
                  const isActive = activeUsernames.has(username);
                  return (
                    <button
                      key={username}
                      onClick={() => toggleAssignee(username)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                        isActive
                          ? 'border-primary bg-primary-subtle text-primary'
                          : 'border-border text-foreground-muted hover:border-border-strong hover:text-foreground'
                      }`}
                    >
                      <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[8px] font-bold text-white ${def.color}`}>
                        {formatInitials(def.label)}
                      </span>
                      {def.label}
                    </button>
                  );
                })}
                <input
                  type="text"
                  value={assigneeInput}
                  onChange={(e) => setAssigneeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && assigneeInput.trim()) {
                      toggleAssignee(assigneeInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''));
                      setAssigneeInput('');
                    }
                    if (e.key === 'Escape') setAssigneeInput('');
                  }}
                  placeholder="@ name"
                  className="w-20 text-xs bg-background border border-dashed border-border-muted rounded px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-foreground-subtle"
                />
              </div>
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
                {/* Quick-add tag input */}
                <input
                  type="text"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customTagInput.trim()) {
                      toggleTag(customTagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''));
                      setCustomTagInput('');
                    }
                    if (e.key === 'Escape') setCustomTagInput('');
                  }}
                  placeholder="+ tag"
                  className="w-16 text-xs bg-background border border-dashed border-border-muted rounded px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-foreground-subtle"
                />
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
              onSave(editTitle.trim() || title, editDesc.trim(), editDueDate || undefined, editWarning);
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
