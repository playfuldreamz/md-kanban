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
import HelpDialog from './HelpDialog';
import Tooltip from './Tooltip';
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
  const [helpOpen, setHelpOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const isMac = navigator.platform.includes('Mac');

  useEffect(() => {
    if (loading || error) return;
    // First-run onboarding
    if (!localStorage.getItem('kanban-md-onboarded')) {
      setShowOnboarding(true);
    }

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
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setHelpOpen(true);
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
            <Tooltip label={isMac ? 'Undo (⌘Z)' : 'Undo (Ctrl+Z)'}>
              <button
                onClick={doUndo}
                disabled={!canUndo}
                className="flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground transition-colors border border-border rounded px-1.5 py-1 disabled:opacity-30 disabled:cursor-default"
              >
                <ArrowBackUp className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
            <Tooltip label={isMac ? 'Redo (⌘⇧Z)' : 'Redo (Ctrl+Shift+Z)'}>
              <button
                onClick={doRedo}
                disabled={!canRedo}
                className="flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground transition-colors border border-border rounded px-1.5 py-1 disabled:opacity-30 disabled:cursor-default"
              >
                <ArrowForwardUp className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          </div>
          <Tooltip label={isMac ? 'Search (⌘K)' : 'Search (Ctrl+K)'}>
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
          </Tooltip>
          <Tooltip label="Help (?)">
            <button
              onClick={() => setHelpOpen(true)}
              className="flex items-center gap-1 text-xs text-foreground-muted hover:text-foreground transition-colors border border-border rounded px-1.5 py-1"
            >
              <span className="font-medium">?</span>
            </button>
          </Tooltip>
          {!connected && (
            <span className="flex items-center gap-1 text-xs text-foreground-muted">
              <Loader className="w-3 h-3 animate-spin" />
              Reconnecting...
            </span>
          )}
          <Tooltip label="Toggle theme">
            <span>
              <ThemeToggle />
            </span>
          </Tooltip>
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
          boardAssignees={board.assignees}
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

      <HelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* First-run onboarding overlay */}
      {showOnboarding && (
        <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-background border border-border rounded-xl shadow-2xl max-w-sm p-6 text-center space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Welcome to md-kanban 🏷️</h2>
            <div className="text-sm text-foreground-muted space-y-1.5 text-left">
              <p><kbd className="text-[10px] bg-background-muted border border-border rounded px-1 py-px">{isMac ? '⌘K' : 'Ctrl+K'}</kbd> Search all tasks</p>
              <p><kbd className="text-[10px] bg-background-muted border border-border rounded px-1 py-px">{isMac ? '⌘Z' : 'Ctrl+Z'}</kbd> Undo / <kbd className="text-[10px] bg-background-muted border border-border rounded px-1 py-px">{isMac ? '⌘⇧Z' : 'Ctrl+⇧Z'}</kbd> Redo</p>
              <p><kbd className="text-[10px] bg-background-muted border border-border rounded px-1 py-px">N</kbd> Focus add-task input</p>
              <p><kbd className="text-[10px] bg-background-muted border border-border rounded px-1 py-px">?</kbd> Open help & shortcuts</p>
              <p className="mt-2">Drag cards between columns. Type <code className="text-[11px] bg-background-muted rounded px-1">#tags</code> in descriptions.</p>
            </div>
            <button
              onClick={() => { setShowOnboarding(false); localStorage.setItem('kanban-md-onboarded', '1'); }}
              className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-strong transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <ToastNotifications error={error} connected={connected} undoCard={undoCard} onUndo={undoDelete} />
    </div>
  );
}
