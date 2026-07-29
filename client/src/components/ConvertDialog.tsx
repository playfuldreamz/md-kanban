import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogClose } from '@appica/ui-react/alert-dialog';
import { Button } from '@appica/ui-react/button';
import { ArrowRight } from '@appica/icons-react';

interface ConvertDialogProps {
  open: boolean;
  columnNames: string[];
  onConfirm: () => void;
  onDismiss: () => void;
}

export default function ConvertDialog({ open, columnNames, onConfirm, onDismiss }: ConvertDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) onDismiss(); }}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Update your board structure?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              md-kanban uses a standard workflow: <strong>To Do</strong> → <strong>In Progress</strong> → <strong>Done</strong>.
            </p>
            <p className="text-foreground-muted">
              Your current columns:
            </p>
            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              {columnNames.map((name, i) => (
                <span key={i}>
                  <span className="px-2 py-0.5 rounded bg-background-muted border border-border text-foreground-muted">
                    {name}
                  </span>
                  {i < columnNames.length - 1 && (
                    <ArrowRight className="w-3 h-3 inline mx-1 text-foreground-subtle" />
                  )}
                </span>
              ))}
            </div>
            <p className="text-foreground-muted">
              Will be converted to:
            </p>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="px-2 py-0.5 rounded bg-primary-subtle border border-primary/20 text-primary font-medium">To Do</span>
              <ArrowRight className="w-3 h-3 text-foreground-subtle" />
              <span className="px-2 py-0.5 rounded bg-background-muted border border-border text-foreground-muted">In Progress</span>
              <ArrowRight className="w-3 h-3 text-foreground-subtle" />
              <span className="px-2 py-0.5 rounded bg-success-subtle border border-success-subtle text-success-foreground font-medium">Done</span>
            </div>
            <p className="text-xs text-foreground-subtle">
              All completed tasks move to Done. Everything else goes to To Do. Priority is preserved via #critical, #important, #polish tags.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose
            className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-background-muted transition-colors"
            onClick={onDismiss}
          >
            Keep current
          </AlertDialogClose>
          <Button variant="primary" onClick={onConfirm}>Convert to workflow</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
