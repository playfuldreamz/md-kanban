import { useCallback, useState, useRef } from 'react';
import { Badge } from '@appica/ui-react/badge';
import { Button } from '@appica/ui-react/button';
import { ClipboardCheck, Clock, CircleCheck, LayoutKanban, AlertTriangle, Sparkles, Trash, Bug, Search, Wrench, Rocket, Bookmark, Eye, Book2, BookFilled } from '@appica/icons-react';
import type { Column } from '../types';
import KanbanCard from './KanbanCard';
import AddCardForm from './AddCardForm';
import VirtualCardList from './VirtualCardList';

// Map column IDs/names to Appica icons — with priority-aware coloring
function columnIcon(col: Column): { icon: React.ReactNode; priority: string | null } {
  const id = col.id.toLowerCase();
  const name = displayName(col).toLowerCase();

  // Workflow columns
  if (id === 'todo' || id === 'to-do' || name.includes('to do')) return { icon: <ClipboardCheck className="w-4 h-4" />, priority: null };
  if (id === 'in-progress' || name.includes('progress') || name.includes('doing') || name.includes('active')) return { icon: <Clock className="w-4 h-4" />, priority: null };
  if (id === 'done' || name.includes('done') || name.includes('complete')) return { icon: <CircleCheck className="w-4 h-4" />, priority: null };

  // Bug Tracker columns
  if (name.includes('reported') || name.includes('submitted'))
    return { icon: <Bug className="w-4 h-4 text-red-500" />, priority: null };
  if (name.includes('triaging') || name.includes('triage'))
    return { icon: <Search className="w-4 h-4 text-amber-500" />, priority: null };
  if (name.includes('fixing') || name.includes('fix '))
    return { icon: <Wrench className="w-4 h-4 text-blue-500" />, priority: null };
  if (name.includes('resolved'))
    return { icon: <CircleCheck className="w-4 h-4 text-green-500" />, priority: null };

  // Sprint Planning columns
  if (name.includes('backlog'))
    return { icon: <Bookmark className="w-4 h-4" />, priority: null };
  if (name.includes('sprint'))
    return { icon: <Rocket className="w-4 h-4" />, priority: null };

  // Review column (overrides the generic Sparkles-blue mapping above)
  if (name.includes('review') || name.includes('testing') || name.includes('qa'))
    return { icon: <Eye className="w-4 h-4 text-blue-500" />, priority: null };

  // Reading List columns
  if (name.includes('to read') || name.includes('want to read'))
    return { icon: <Book2 className="w-4 h-4" />, priority: null };
  if (name.includes('reading'))
    return { icon: <BookFilled className="w-4 h-4" />, priority: null };
  if (name.includes('finished'))
    return { icon: <CircleCheck className="w-4 h-4 text-green-500" />, priority: null };

  // Priority columns: map to appropriate icons with colored accents
  if (name.includes('critical') || name.includes('urgent') || name.includes('blocker'))
    return { icon: <AlertTriangle className="w-4 h-4 text-red-500" />, priority: 'critical' };
  if (name.includes('important') || name.includes('high') || name.includes('priority'))
    return { icon: <AlertTriangle className="w-4 h-4 text-amber-500" />, priority: 'important' };
  if (name.includes('polish') || name.includes('nice') || name.includes('low') || name.includes('later'))
    return { icon: <Sparkles className="w-4 h-4 text-emerald-500" />, priority: 'polish' };

  return { icon: <LayoutKanban className="w-4 h-4" />, priority: null };
}

// Strip emoji from column name for display
function displayName(col: Column): string {
  return col.name.replace(/^[\p{Emoji_Presentation}\p{Emoji}\uFE0F\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{2702}-\u{27B0}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]\s*/u, '').trim() || col.name;
}

function isDoneColumn(col: Column): boolean {
  const id = col.id.toLowerCase();
  const name = col.name.toLowerCase();
  return id === 'done' || id.includes('done') || name.includes('done');
}

interface ColumnViewProps {
  column: Column;
  showCompleted: boolean;
  priorities?: Record<string, { label: string; color: string; ring: string }>;
  onToggle: (cardId: string) => void;
  onDelete: (cardId: string) => void;
  onAdd: (columnId: string, title: string, description: string) => void;
  onEdit: (cardId: string, title: string, description: string) => void;
  onMove: (cardId: string, toColumnId: string, toIndex: number) => void;
  onDeleteColumn?: (columnId: string) => void;
  onToggleSubTask: (parentId: string, childId: string) => void;
  onAddSubTask: (parentId: string, title: string, description?: string) => void;
  onEditSubTask: (parentId: string, childId: string, title: string, description: string) => void;
  onDeleteSubTask: (parentId: string, childId: string) => void;
  togglePin: (cardId: string) => void;
  boardAssignees?: Record<string, { label: string; color: string; ring: string }>;
  dragCardId: string | null;
  dragColumnId: string | null;
  onDragStart: (cardId: string, columnId: string) => void;
  onDragEnd: () => void;
  focusedCardId: string | null;
  editDialogCardId: string | null;
  deleteDialogCardId: string | null;
  onSetEditDialogCardId: (id: string | null) => void;
  onSetDeleteDialogCardId: (id: string | null) => void;
}

export default function ColumnView({
  column, showCompleted, priorities, onToggle, onDelete, onAdd, onEdit,
  onMove, onDeleteColumn, onToggleSubTask, onAddSubTask, onEditSubTask, onDeleteSubTask,
  togglePin, boardAssignees, dragCardId, dragColumnId, onDragStart, onDragEnd,
  focusedCardId, editDialogCardId, deleteDialogCardId, onSetEditDialogCardId, onSetDeleteDialogCardId,
}: ColumnViewProps) {
  const [droppedCardId, setDroppedCardId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<{ index: number; y: number } | null>(null);
  const cardsAreaRef = useRef<HTMLDivElement>(null);
  const { icon, priority: colPriority } = columnIcon(column);

  const isSource = dragCardId !== null && dragColumnId === column.id;
  const isDragOver = dragCardId !== null && dragColumnId !== column.id;
  const showDropLine = dragCardId !== null && dragOverIndex !== null;
  const isMandatory = column.id.includes('to-do') || column.name.toLowerCase().includes('to do') ||
    column.id.includes('progress') || column.name.toLowerCase().includes('progress') ||
    column.id.includes('done') || column.name.toLowerCase().includes('done');
  const visibleCards = (showCompleted ? column.cards : column.cards.filter(c => !c.done))
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return 0; // preserve relative order within pinned/unpinned groups
    });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragCardId) return;

    const container = e.currentTarget;
    const containerRect = container.getBoundingClientRect();
    const mouseY = e.clientY;
    const HEADER_H = 48; // column header height

    // Auto-scroll when near edges
    const scrollZone = 40;
    if (mouseY < containerRect.top + scrollZone) container.scrollTop -= 10;
    else if (mouseY > containerRect.bottom - scrollZone) container.scrollTop += 10;

    // Calculate insertion index from visible card elements
    const cards = container.querySelectorAll('[data-card-id]');
    let insertIdx = column.cards.length;
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      if (mouseY < rect.top + rect.height / 2) {
        const id = cards[i].getAttribute('data-card-id');
        const ai = column.cards.findIndex(c => c.id === id);
        insertIdx = ai >= 0 ? ai : i;
        break;
      }
    }
    // Adjust for same-column drag
    if (dragColumnId === column.id) {
      const cur = column.cards.findIndex(c => c.id === dragCardId);
      if (cur >= 0 && cur < insertIdx) insertIdx--;
    }

    // Drop line Y: at midpoint between cards (skipping the dragged card itself)
    let dropY = HEADER_H;
    // Get the list of cards excluding the one being dragged (for same-column)
    const effectiveCards = dragColumnId === column.id
      ? column.cards.filter(c => c.id !== dragCardId)
      : column.cards;
    if (insertIdx === 0 && cards.length > 0) {
      const firstEl = cards[0] as HTMLElement;
      dropY = firstEl.getBoundingClientRect().top - containerRect.top - 4;
    } else if (insertIdx > 0) {
      const prevCard = effectiveCards[insertIdx - 1];
      const currCard = insertIdx < effectiveCards.length ? effectiveCards[insertIdx] : undefined;
      const prevEl = prevCard ? Array.from(cards).find(e => e.getAttribute('data-card-id') === prevCard.id) as HTMLElement | undefined : undefined;
      const currEl = currCard ? Array.from(cards).find(e => e.getAttribute('data-card-id') === currCard.id) as HTMLElement | undefined : undefined;
      if (prevEl && currEl) {
        dropY = (prevEl.getBoundingClientRect().bottom + currEl.getBoundingClientRect().top) / 2 - containerRect.top;
      } else if (prevEl) {
        dropY = prevEl.getBoundingClientRect().bottom - containerRect.top + 4;
      } else if (currEl) {
        dropY = currEl.getBoundingClientRect().top - containerRect.top - 4;
      }
    }

    setDragOverIndex({ index: insertIdx, y: dropY });
  }, [dragCardId, dragColumnId, column]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!dragCardId || !dragOverIndex) return;
    // Unpin if dropped below the pinned section
    const draggedCard = column.cards.find(c => c.id === dragCardId);
    const pinnedCount = column.cards.filter(c => c.pinned).length;
    if (draggedCard?.pinned && dragOverIndex.index >= pinnedCount) {
      togglePin(dragCardId);
    }
    onMove(dragCardId, column.id, dragOverIndex.index);
    setDragOverIndex(null);
    onDragEnd();
    console.log('[drop]', dragCardId, '→', column.id);
    // Double rAF: commit position change first, THEN trigger animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        console.log('[drop] animating', dragCardId);
        setDroppedCardId(dragCardId);
      });
    });
    setTimeout(() => setDroppedCardId(null), 2300);
  }, [dragCardId, dragOverIndex, column, onMove, onDragEnd]);

  return (
    <div
      data-column-id={column.id}
      className={`relative flex-1 min-w-[288px] max-w-[36rem] flex-shrink-0 flex flex-col max-h-full rounded-xl border shadow-sm transition-all duration-200 ${
        isDragOver && !isSource ? 'border-primary bg-primary-subtle/10 shadow-lg scale-[1.03]' : 
        isSource ? 'border-border-muted opacity-90' : 'border-border bg-background-subtle'
      }`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border flex-shrink-0 group">
        {icon}
        <span className="text-sm font-medium text-foreground truncate flex-1">
          {displayName(column)}
        </span>
        <Badge variant="secondary" className="flex-shrink-0">{visibleCards.length}</Badge>
        {!isMandatory && onDeleteColumn && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete column ${displayName(column)}`}
            className="flex-shrink-0 -mr-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onDeleteColumn(column.id)}
          >
            <Trash className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Cards */}
      {dragOverIndex !== null && showDropLine && (
        <div
          className="absolute left-2 right-4 h-0.5 bg-primary rounded-full z-10 pointer-events-none transition-all duration-100"
          style={{ top: `${dragOverIndex.y}px` }}
        />
      )}
      {visibleCards.length === 0 ? (
        <div className={`flex-1 flex flex-col items-center justify-center m-2 border-2 border-dashed rounded-lg transition-all duration-200 ${
          showDropLine ? 'border-primary bg-primary-subtle/10 scale-[1.02]' : 'border-border-muted'
        }`}>
          <p className={`text-xs font-medium ${showDropLine ? 'text-primary' : 'text-foreground-subtle'}`}>
            {showDropLine ? 'Drop here' : isDoneColumn(column) ? 'Drag completed tasks here' : column.id.includes('progress') ? 'Move active tasks here' : 'Add your first task below'}
          </p>
          {!showDropLine && (
            <p className="text-[10px] text-foreground-subtle mt-1">Press <kbd className="text-[9px] bg-background-muted border border-border-muted rounded px-1 py-px">N</kbd> to focus the input</p>
          )}
        </div>
      ) : (
        <div ref={cardsAreaRef} className="flex-1 overflow-y-auto kanban-scroll-area">
        <VirtualCardList
          items={visibleCards}
          itemKey={(card) => card.id}
          estimatedItemHeight={90}
          threshold={30}
          className="p-2 pr-4"
          renderItem={(card) => (
            <div className="pb-1.5">
              <KanbanCard
                isFocused={card.id === focusedCardId}
                focusedCardId={focusedCardId}
                editDialogOpen={card.id === editDialogCardId}
                deleteDialogOpen={card.id === deleteDialogCardId}
                onEditDialogClose={() => onSetEditDialogCardId(null)}
                onDeleteDialogClose={() => onSetDeleteDialogCardId(null)}
                card={card}
                columnName={column.name}
                priorities={priorities}
                isDragging={dragCardId === card.id}
                isJustDropped={droppedCardId === card.id}
                onToggle={() => onToggle(card.id)}
                onDelete={() => onDelete(card.id)}
                onEdit={onEdit}
                onToggleSubTask={onToggleSubTask}
                onAddSubTask={onAddSubTask}
                onEditSubTask={onEditSubTask}
                onDeleteSubTask={onDeleteSubTask}
                onTogglePin={() => togglePin(card.id)}
                boardAssignees={boardAssignees}
                onDragStart={() => onDragStart(card.id, column.id)}
                onDragEnd={onDragEnd}
              />
            </div>
          )}
        />
        </div>
      )}

      {/* Add card */}
      <AddCardForm columnId={column.id} columnName={column.name} onAdd={onAdd} />
    </div>
  );
}
