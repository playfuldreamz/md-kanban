import { useState, useRef } from 'react';
import { Input } from '@appica/ui-react/input';
import { Plus } from '@appica/icons-react';

interface AddCardFormProps {
  columnId: string;
  columnName: string;
  onAdd: (columnId: string, title: string, description: string) => void;
}

export default function AddCardForm({ columnId, columnName, onAdd }: AddCardFormProps) {
  const [title, setTitle] = useState('');
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setExpanded(false);
      setTitle('');
      return;
    }
    onAdd(columnId, trimmed, '');
    setTitle('');
    setExpanded(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setTitle('');
      setExpanded(false);
    }
  };

  if (!expanded) {
    return (
      <button
        data-add-card-trigger
        className="w-full flex items-center gap-1.5 px-3 py-2 text-xs text-foreground-muted hover:text-foreground hover:bg-background-muted rounded-b-xl transition-colors"
        onClick={() => {
          setExpanded(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
      >
        <Plus className="w-3.5 h-3.5" />
        Add task
      </button>
    );
  }

  return (
    <div className="px-2 pb-2 pt-1">
      <Input
        ref={inputRef}
        placeholder={`Add to ${columnName}...`}
        className="text-sm"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (!title.trim()) {
            setExpanded(false);
          }
        }}
        aria-label={`Add task to ${columnName}`}
      />
    </div>
  );
}
