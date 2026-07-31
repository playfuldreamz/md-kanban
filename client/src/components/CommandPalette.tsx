import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Input } from '@appica/ui-react/input';
import { Badge } from '@appica/ui-react/badge';
import { Search, X, Clock } from '@appica/icons-react';
import type { BoardState, Card, Column } from '../types';
import { extractTags } from './card-utils';

interface FlatCard {
  card: Card;
  column: Column;
  depth: number;
}

interface CommandPaletteProps {
  board: BoardState;
  open: boolean;
  onClose: () => void;
  onSelect: (columnId: string, cardId: string) => void;
}

export default function CommandPalette({ board, open, onClose, onSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Flatten all cards (including sub-tasks) into a searchable list
  const allCards = flattenBoard(board);

  const [dueSoonOnly, setDueSoonOnly] = useState(false);

  // Cards with due dates within the next 7 days
  const dueSoonCardIds = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 86400000);
    const ids = new Set<string>();
    for (const fc of allCards) {
      if (!fc.card.dueDate) continue;
      const due = new Date(fc.card.dueDate);
      if (!isNaN(due.getTime()) && due >= now && due <= weekFromNow) {
        ids.add(fc.card.id);
      }
    }
    return ids;
  }, [allCards]);

  // Filter by query + optional due-soon filter
  const filtered = (() => {
    let results = allCards;
    if (dueSoonOnly) {
      results = results.filter((fc) => dueSoonCardIds.has(fc.card.id));
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      results = results.filter((fc) =>
        fc.card.title.toLowerCase().includes(q) ||
        fc.card.description.toLowerCase().includes(q) ||
        fc.column.name.toLowerCase().includes(q) ||
        extractTags(fc.card.description).some(({ tag }) => tag.includes(q))
      );
    }
    return results;
  })();

  // Reset selection when query or filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, dueSoonOnly]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setDueSoonOnly(false);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        const fc = filtered[selectedIndex];
        onSelect(fc.column.id, fc.card.id);
        onClose();
      }
    },
    [filtered, selectedIndex, onClose, onSelect],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-background border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Search input + filters */}
        <div className="flex items-center gap-2 px-3 py-3 border-b border-border">
          <Search className="w-4 h-4 text-foreground-muted flex-shrink-0" />
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks by title, description, tag, or column..."
            className="flex-1 border-none bg-transparent text-sm focus:outline-none shadow-none ring-0"
          />
          {/* Due Soon filter chip */}
          {dueSoonCardIds.size > 0 && (
            <button
              onClick={() => setDueSoonOnly(!dueSoonOnly)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors flex-shrink-0 ${
                dueSoonOnly
                  ? 'bg-blue-500 text-white'
                  : 'bg-background-muted text-foreground-muted hover:text-foreground'
              }`}
            >
              <Clock className="w-3 h-3" />
              Due Soon
            </button>
          )}
          {query && (
            <button
              onClick={() => setQuery('')}
              className="flex-shrink-0 text-foreground-muted hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results */}
        {filtered.length > 0 ? (
          <>
            {dueSoonOnly && (
              <div className="px-3 py-1.5 text-[11px] text-foreground-muted bg-background-subtle border-b border-border-muted">
                Showing {filtered.length} task{filtered.length !== 1 ? 's' : ''} due within 7 days
              </div>
            )}
            <div className="max-h-80 overflow-y-auto py-1">
            {filtered.map((fc, i) => (
              <button
                key={fc.card.id + fc.column.id}
                onClick={() => { onSelect(fc.column.id, fc.card.id); onClose(); }}
                className={`w-full text-left px-3 py-2 flex items-start gap-3 transition-colors ${
                  i === selectedIndex ? 'bg-background-muted' : 'hover:bg-background-subtle'
                }`}
              >
                {/* Checkbox indicator */}
                <span
                  className={`mt-0.5 w-3.5 h-3.5 rounded border flex-shrink-0 ${
                    fc.card.done
                      ? 'bg-primary border-primary flex items-center justify-center'
                      : 'border-border'
                  }`}
                >
                  {fc.card.done && (
                    <svg className="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-sm truncate ${fc.card.done ? 'line-through text-foreground-muted' : 'text-foreground'}`}
                    >
                      {highlightMatch(fc.card.title, query)}
                    </span>
                    {fc.depth > 0 && (
                      <span className="text-[10px] text-foreground-subtle flex-shrink-0">
                        ↳ sub
                      </span>
                    )}
                    {fc.card.pinned && (
                      <span className="text-[10px] text-amber-500 flex-shrink-0" title="Pinned">📌</span>
                    )}
                  </div>
                  {fc.card.description && (
                    <p className="text-xs text-foreground-muted mt-0.5 truncate">
                      {highlightMatch(fc.card.description, query)}
                    </p>
                  )}
                  {/* Tags */}
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] text-foreground-subtle bg-background-muted rounded px-1">
                      {fc.column.name.replace(/^[^\w]*/, '')}
                    </span>
                    {extractTags(fc.card.description).map(({ tag, def }) => (
                      <span key={tag} className={`text-[10px] text-white rounded px-1 ${def.color}`}>
                        {def.label}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
            </div>
          </>
        ) : dueSoonOnly ? (
          <div className="px-3 py-8 text-center text-sm text-foreground-muted">
            No tasks due within the next 7 days
          </div>
        ) : query ? (
          <div className="px-3 py-8 text-center text-sm text-foreground-muted">
            No tasks match "{query}"
          </div>
        ) : (
          <div className="px-3 py-8 text-center text-sm text-foreground-muted">
            Type to search across all columns and sub-tasks
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Flatten all cards (including sub-tasks) into a single searchable list. */
function flattenBoard(board: BoardState): FlatCard[] {
  const results: FlatCard[] = [];
  for (const col of board.columns) {
    for (const card of col.cards) {
      flattenCard(card, col, 0, results);
    }
  }
  return results;
}

function flattenCard(card: Card, column: Column, depth: number, out: FlatCard[]) {
  out.push({ card, column, depth });
  if (card.children) {
    for (const child of card.children) {
      flattenCard(child, column, depth + 1, out);
    }
  }
}

/** Wrap matching portions of text in a <mark> for visual highlighting. */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const q = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${q})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-warning-subtle text-foreground rounded-sm px-px">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}
