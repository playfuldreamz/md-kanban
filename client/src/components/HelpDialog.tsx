import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogClose,
} from '@appica/ui-react/alert-dialog';
import { Search, ArrowBackUp, ArrowForwardUp, ClipboardCheck, Clock, CircleCheck, Pencil, Trash, Plus, ChevronRight, AlertTriangle, Filter, LayoutKanban } from '@appica/icons-react';

/**
 * Help dialog shown when pressing `?`.
 *
 * ⚠️ MAINTENANCE: When adding new keyboard shortcuts or major features,
 * update the SHORTCUTS and FEATURES arrays below so the help dialog
 * stays accurate.
 */

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = (mod: string) => [
  { keys: ['J'], desc: 'Next card', icon: null },
  { keys: ['K'], desc: 'Previous card', icon: null },
  { keys: ['Enter'], desc: 'Edit focused card', icon: null },
  { keys: ['Space'], desc: 'Toggle done/undone', icon: null },
  { keys: ['D'], desc: 'Delete focused card', icon: null },
  { keys: ['P'], desc: 'Pin/unpin', icon: null },
  { keys: ['C'], desc: 'Add task in column', icon: null },
  { keys: ['Esc'], desc: 'Clear focus', icon: null },
  { keys: [mod, 'K'], desc: 'Search all tasks', icon: Search },
  { keys: [mod, 'Z'], desc: 'Undo last action', icon: ArrowBackUp },
  { keys: [mod, '⇧', 'Z'], desc: 'Redo', icon: ArrowForwardUp },
  { keys: ['N'], desc: 'Focus first Add Task input', icon: Plus },
  { keys: ['?'], desc: 'Open this help dialog', icon: null },
];

const FEATURES = [
  { icon: ClipboardCheck, label: 'To Do', desc: 'Create tasks with - [ ] and drag between columns' },
  { icon: Clock, label: 'In Progress', desc: 'Move active tasks here — your standard workflow columns' },
  { icon: CircleCheck, label: 'Done', desc: 'Drag here to auto-check. Drag back to re-open.' },
  { icon: ChevronRight, label: 'Sub-tasks', desc: 'Indent 2 spaces for nested checkboxes. Up to 4 visual levels with progress badges.' },
  { icon: Pencil, label: 'Tags', desc: 'Type #bug #feature #critical in descriptions — any #tag becomes a colored badge.' },
  { icon: Trash, label: 'Dates', desc: 'Cards auto-stamp creation dates. Hover any card or sub-task to see "Created 3 days ago".' },
  { icon: AlertTriangle, label: 'Plugins', desc: 'Enable due-dates, warning-cards, and assignees via @plugins in preamble.' },
  { icon: Pencil, label: 'Assignees', desc: 'Mention @username in descriptions — renders as colored initial chips (Ⓐ). Toggle in EditCardDialog.' },
  { icon: Filter, label: 'Due Soon', desc: 'Filter command palette to tasks due within 7 days. Press Due Soon chip in Cmd+K search.' },
  { icon: LayoutKanban, label: 'Templates', desc: 'Scaffold a board with md-kanban init --template <name>. Available: kanban, bug-tracker, sprint-planning, reading-list. Use --list to see all.' },
];

export default function HelpDialog({ open, onClose }: HelpDialogProps) {
  const isMac = navigator.platform.includes('Mac');
  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <AlertDialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <AlertDialogHeader>
          <AlertDialogTitle>Help & Shortcuts</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="overflow-y-auto flex-1 px-6 py-2 space-y-5">
          {/* Keyboard shortcuts */}
          <div>
            <h3 className="text-xs font-semibold text-foreground-muted uppercase tracking-wide mb-2">Keyboard Shortcuts</h3>
            <div className="space-y-1.5">
              {SHORTCUTS(isMac ? '⌘' : 'Ctrl').map((s) => (
                <div key={s.desc} className="flex items-center justify-between text-sm">
                  <span className="text-foreground flex items-center gap-2">
                    {s.icon && <s.icon className="w-3.5 h-3.5 text-foreground-muted" />}
                    {s.desc}
                  </span>
                  <span className="flex items-center gap-0.5">
                    {s.keys.map((k, i) => (
                      <kbd key={i} className="text-[10px] bg-background-muted border border-border rounded px-1.5 py-0.5 text-foreground-muted font-mono">
                        {k}
                      </kbd>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Features overview */}
          <div>
            <h3 className="text-xs font-semibold text-foreground-muted uppercase tracking-wide mb-2">Features</h3>
            <div className="space-y-2">
              {FEATURES.map((f) => (
                <div key={f.label} className="flex items-start gap-2.5">
                  <f.icon className="w-4 h-4 text-foreground-muted mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-sm font-medium text-foreground">{f.label}</span>
                    <p className="text-xs text-foreground-muted">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Format reference */}
          <div>
            <h3 className="text-xs font-semibold text-foreground-muted uppercase tracking-wide mb-2">Card Format</h3>
            <div className="bg-background-muted rounded-lg p-2.5">
              <code className="text-xs text-foreground block">
                - [ ] <strong>**Title**</strong> — Description #tag
              </code>
              <code className="text-xs text-foreground-muted block mt-1">
                &nbsp;&nbsp;- [x] <strong>**Sub-task**</strong> — Done
              </code>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogClose
            className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-background-muted transition-colors"
            onClick={onClose}
          >
            Close
          </AlertDialogClose>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
