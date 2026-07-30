import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogClose,
} from '@appica/ui-react/alert-dialog';
import { Search, ArrowBackUp, ArrowForwardUp, ClipboardCheck, Clock, CircleCheck, Pencil, Trash, Plus, ChevronRight, AlertTriangle } from '@appica/icons-react';

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
  { icon: AlertTriangle, label: 'Plugins', desc: 'Enable due-dates and warning-cards via @plugins in preamble. due:YYYY-MM-DD sets deadlines; - [!] marks warning cards.' },
];

export default function HelpDialog({ open, onClose }: HelpDialogProps) {
  const isMac = navigator.platform.includes('Mac');
  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <AlertDialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Help & Shortcuts</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="space-y-5 px-6 py-2">
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
