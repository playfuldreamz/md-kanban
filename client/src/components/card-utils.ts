/** Shared utilities for card rendering. */

export const PRIORITY_MAP: Record<string, { label: string; color: string; ring: string }> = {
  critical: { label: 'Critical', color: 'bg-red-500', ring: 'ring-red-500/30' },
  important: { label: 'Important', color: 'bg-amber-500', ring: 'ring-amber-500/30' },
  polish: { label: 'Polish', color: 'bg-emerald-500', ring: 'ring-emerald-500/30' },
};

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

/** Extract priority indicators from card description text and tags. */
export function extractPriorities(
  text: string,
  priorities?: Record<string, { label: string; color: string; ring: string }>,
): { label: string; color: string; ring: string }[] {
  const map = priorities || PRIORITY_MAP;
  const results: { label: string; color: string; ring: string }[] = [];
  const seen = new Set<string>();
  const lower = text.toLowerCase();
  for (const [key, val] of Object.entries(map)) {
    if ((lower.includes(`#${key}`) || lower.includes(key)) && !seen.has(key)) {
      seen.add(key);
      results.push(val);
    }
  }
  if (results.length === 0 && text) {
    for (const [key, val] of Object.entries(map)) {
      if (lower.includes(key) && !seen.has(key)) { seen.add(key); results.push(val); }
    }
  }
  return results;
}
