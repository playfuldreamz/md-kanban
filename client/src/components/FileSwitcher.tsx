import { Files } from '@appica/icons-react';

interface FileInfo {
  file: string;
  title: string;
  columns: number;
  cards: number;
}

interface FileSwitcherProps {
  files: FileInfo[];
  currentFile: string;
  onSelect: (file: string) => void;
}

export default function FileSwitcher({ files, currentFile, onSelect }: FileSwitcherProps) {
  if (files.length <= 1) return null;

  return (
    <div className="flex items-center gap-1">
      <Files className="w-3.5 h-3.5 text-foreground-muted" />
      <select
        value={currentFile}
        onChange={(e) => onSelect(e.target.value)}
        className="text-xs bg-background border border-border rounded px-1.5 py-1 text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 max-w-[200px] truncate"
      >
        {files.map((f) => (
          <option key={f.file} value={f.file}>
            {f.title} ({f.cards})
          </option>
        ))}
      </select>
    </div>
  );
}
