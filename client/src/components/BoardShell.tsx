import { useState, useEffect } from 'react';
import { Badge } from '@appica/ui-react/badge';
import { Skeleton } from '@appica/ui-react/skeleton';
import { Alert } from '@appica/ui-react/alert';
import { AlertTriangle, Loader, Search, ArrowBackUp, ArrowForwardUp } from '@appica/icons-react';
import type { BoardState, Card } from '../types';
import ThemeToggle from './ThemeToggle';
import ColumnList from './ColumnList';
import FileSwitcher from './FileSwitcher';
import CommandPalette from './CommandPalette';
import ToastNotifications from './ToastNotifications';

interface BoardShellProps {
  board: BoardState;
  connected: boolean;
  loading: boolean;
  error: string | null;
  totalCards: number;
  undoCard: { card: Card; columnId: string } | null;
  toggleCard: (cardId: string) => void;
  addCard: (columnId: string, title: string, description: string) => void;
  moveCard: (cardId: string, toColumnId: string, toIndex: number) => void;
  deleteCard: (cardId: string) => void;
  editCard: (cardId: string, title: string, description: string) => void;
  addColumn: (name: string) => void;
  deleteColumn: (columnId: string) => void;
  undoDelete: () => void;
  doUndo: () => void;
  doRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  files: { file: string; title: string; columns: number; cards: number }[];
  currentFile: string;
  switchFile: (file: string) => void;
  toggleSubTask: (parentId: string, childId: string) => void;
  addSubTask: (parentId: string, title: string, description?: string) => void;
  editSubTask: (parentId: string, childId: string, title: string, description: string) => void;
  deleteSubTask: (parentId: string, childId: string) => void;
}

export default function BoardShell(props: BoardShellProps) {
  const { board, connected, loading, error, totalCards, undoCard, toggleCard, deleteCard, addCard, editCard, moveCard, addColumn, deleteColumn, undoDelete, doUndo, doRedo, canUndo, canRedo, files, currentFile, switchFile, toggleSubTask, addSubTask, editSubTask, deleteSubTask } = props;

  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [dragColumnId, setDragColumnId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    if (loading || error) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.target as HTMLElement)?.contentEditable === 'true') return;
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const firstAddBtn = document.querySelector('[data-add-card-trigger]') as HTMLElement | null;
        firstAddBtn?.click();
      }
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        doUndo();
      }
      if ((e.key === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey) || (e.key === 'y' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        doRedo();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [loading, error]);

  const handlePaletteSelect = (columnId: string, cardId: string) => {
    // Scroll to the card and briefly highlight it
    const el = document.querySelector(`[data-card-id="${cardId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
      setTimeout(() => el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2'), 2000);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <header className="h-12 flex items-center justify-between px-4 border-b border-border bg-background/80 backdrop-blur-xl">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </header>
        <div className="flex-1 flex gap-4 p-4 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="w-72 flex-shrink-0 space-y-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-background p-8">
        <Alert variant="error" className="max-w-md">
          <AlertTriangle className="w-5 h-5" />
          <div>
            <p className="font-medium">Failed to load board</p>
            <p className="text-sm text-foreground-muted mt-1">{error}</p>
            <p className="text-xs text-foreground-subtle mt-2">
              Make sure the kanban-md server is running on port 3456.
            </p>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="h-12 flex items-center justify-between px-4 border-b border-border bg-background/80 backdrop-blur-xl flex-shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-foreground">
            {board.title || 'TODO'}
          </h1>
          <Badge variant="secondary">{totalCards} tasks</Badge>
          <FileSwitcher files={files} currentFile={currentFile} onSelect={switchFile} />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={doUndo}
              disabled={!canUndo}
              className="flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground transition-colors border border-border rounded px-1.5 py-1 disabled:opacity-30 disabled:cursor-default"
              title="Undo (Ctrl+Z)"
            >
              <ArrowBackUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={doRedo}
              disabled={!canRedo}
              className="flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground transition-colors border border-border rounded px-1.5 py-1 disabled:opacity-30 disabled:cursor-default"
              title="Redo (Ctrl+Shift+Z)"
            >
              <ArrowForwardUp className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-1.5 text-xs text-foreground-muted hover:text-foreground transition-colors border border-border rounded-md px-2 py-1"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden sm:inline text-[10px] bg-background-muted rounded px-1 py-px border border-border-muted ml-1">
              {navigator.platform.includes('Mac') ? '⌘K' : 'Ctrl+K'}
            </kbd>
          </button>
          {!connected && (
            <span className="flex items-center gap-1 text-xs text-foreground-muted">
              <Loader className="w-3 h-3 animate-spin" />
              Reconnecting...
            </span>
          )}
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <ColumnList
          columns={board.columns}
          showCompleted={true}
          priorities={board.priorities}
          onToggle={toggleCard}
          onDelete={deleteCard}
          onAdd={addCard}
          onEdit={editCard}
          onMove={moveCard}
          onAddColumn={addColumn}
          onDeleteColumn={deleteColumn}
          onToggleSubTask={toggleSubTask}
          onAddSubTask={addSubTask}
          onEditSubTask={editSubTask}
          onDeleteSubTask={deleteSubTask}
          dragCardId={dragCardId}
          dragColumnId={dragColumnId}
          onDragStart={(cardId, columnId) => {
            setDragCardId(cardId);
            setDragColumnId(columnId);
          }}
          onDragEnd={() => {
            setDragCardId(null);
            setDragColumnId(null);
          }}
        />
      </div>

      <CommandPalette
        board={board}
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onSelect={handlePaletteSelect}
      />

      <ToastNotifications error={error} connected={connected} undoCard={undoCard} onUndo={undoDelete} />
    </div>
  );
}
