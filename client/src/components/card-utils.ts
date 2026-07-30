/** Shared utilities for card rendering. */

export interface TagDef {
  label: string;
  color: string;
  ring: string;
}

export const PRIORITY_MAP: Record<string, TagDef> = {
  critical: { label: 'Critical', color: 'bg-red-500', ring: 'ring-red-500/30' },
  important: { label: 'Important', color: 'bg-amber-500', ring: 'ring-amber-500/30' },
  polish: { label: 'Polish', color: 'bg-emerald-500', ring: 'ring-emerald-500/30' },
};

/** 16-color palette for auto-assigning unknown tags. */
const TAG_PALETTE = [
  { color: 'bg-sky-500', ring: 'ring-sky-500/30' },
  { color: 'bg-violet-500', ring: 'ring-violet-500/30' },
  { color: 'bg-pink-500', ring: 'ring-pink-500/30' },
  { color: 'bg-teal-500', ring: 'ring-teal-500/30' },
  { color: 'bg-orange-500', ring: 'ring-orange-500/30' },
  { color: 'bg-indigo-500', ring: 'ring-indigo-500/30' },
  { color: 'bg-lime-500', ring: 'ring-lime-500/30' },
  { color: 'bg-rose-500', ring: 'ring-rose-500/30' },
  { color: 'bg-cyan-500', ring: 'ring-cyan-500/30' },
  { color: 'bg-fuchsia-500', ring: 'ring-fuchsia-500/30' },
  { color: 'bg-blue-500', ring: 'ring-blue-500/30' },
  { color: 'bg-purple-500', ring: 'ring-purple-500/30' },
  { color: 'bg-yellow-500', ring: 'ring-yellow-500/30' },
  { color: 'bg-green-500', ring: 'ring-green-500/30' },
  { color: 'bg-red-500', ring: 'ring-red-500/30' },
  { color: 'bg-amber-500', ring: 'ring-amber-500/30' },
];

/** Simple string hash for deterministic palette assignment. */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Get or create a tag definition — known tags use PRIORITY_MAP, unknown tags auto-assign. */
export function getTagDef(
  tag: string,
  priorities?: Record<string, TagDef>,
): TagDef {
  const map = priorities || PRIORITY_MAP;
  if (map[tag]) return map[tag];
  const palette = TAG_PALETTE[hashStr(tag) % TAG_PALETTE.length];
  return { label: tag.charAt(0).toUpperCase() + tag.slice(1), ...palette };
}

/** Extract all #tags from description text and return their definitions. */
export function extractTags(
  text: string,
  priorities?: Record<string, TagDef>,
): { tag: string; def: TagDef }[] {
  const matches = text.match(/#([a-zA-Z0-9_-]+)/g);
  if (!matches) return [];
  const seen = new Set<string>();
  const results: { tag: string; def: TagDef }[] = [];
  for (const m of matches) {
    const tag = m.slice(1).toLowerCase();
    if (seen.has(tag)) continue;
    seen.add(tag);
    results.push({ tag, def: getTagDef(tag, priorities) });
  }
  return results;
}

/**
 * Legacy: extract priority indicators for dot rendering.
 * Kept for backward compat with the priority dots.
 */
export function extractPriorities(
  text: string,
  priorities?: Record<string, TagDef>,
): TagDef[] {
  return extractTags(text, priorities).map((t) => t.def);
}

/** Format an ISO date string to a human-readable relative or absolute date. */
export function formatCreatedDate(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Created today';
  if (diffDays === 1) return 'Created yesterday';
  if (diffDays < 7) return `Created ${diffDays} days ago`;
  if (diffDays < 30) return `Created ${Math.floor(diffDays / 7)}w ago`;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `Created ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/** Get color for a due date badge: red for overdue, amber for today, blue for upcoming. */
export function getDueColor(dueDate: string): string {
  const now = new Date();
  const due = new Date(dueDate);
  if (isNaN(due.getTime())) return 'bg-foreground-muted';
  const diffDays = Math.floor((due.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0) return 'bg-red-500';
  if (diffDays === 0) return 'bg-amber-500';
  if (diffDays <= 3) return 'bg-amber-500';
  return 'bg-blue-500';
}

/** Format a due date for display: "Due Jul 28" or "Overdue" or "Due today". */
export function formatDueDate(dueDate: string): string {
  const now = new Date();
  const due = new Date(dueDate);
  if (isNaN(due.getTime())) return dueDate;
  const diffDays = Math.floor((due.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0) return `Overdue ${Math.abs(diffDays)}d`;
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `Due ${months[due.getMonth()]} ${due.getDate()}`;
}
